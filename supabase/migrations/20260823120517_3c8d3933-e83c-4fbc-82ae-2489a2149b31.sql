-- ============================================================
-- A. Lock down EXECUTE privileges on SECURITY DEFINER functions
-- ============================================================

-- Future functions must not be auto-executable by public roles
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM authenticated;

-- Existing functions: strip public/anon/authenticated execution
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Re-grant ONLY the functions the signed-in app legitimately calls.
-- admin_* / process_transfer additionally enforce has_role(auth.uid(),'admin') internally.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.support_unread_for_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_transfer(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_adjust_balance(uuid, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_adjust_balance(uuid, numeric, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_account_status(uuid, public.account_status) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_kyc(uuid, public.kyc_status, text) TO authenticated;
-- Intentionally NOT re-granted to authenticated/anon:
--   grant_admin_by_email (privilege escalation), handle_new_user, set_updated_at,
--   set_kyc_pending_on_document_change (trigger functions need no EXECUTE grant).

-- ============================================================
-- B. Private Transfer PIN store (hash never readable by clients)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.transfer_pins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  pin_hash text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.transfer_pins TO service_role;
ALTER TABLE public.transfer_pins ENABLE ROW LEVEL SECURITY;
-- No RLS policies: default deny for anon/authenticated. Only SECURITY DEFINER
-- functions (owner) and service_role can read/write PIN hashes.

-- Carry over existing PINs so users don't have to set them again
INSERT INTO public.transfer_pins (user_id, pin_hash)
SELECT id, transfer_pin_hash FROM public.profiles WHERE transfer_pin_hash IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

ALTER TABLE public.profiles DROP COLUMN IF EXISTS transfer_pin_hash;

-- ============================================================
-- C. Server-side PIN management + PIN-verified transfer submission
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_transfer_pin(_pin text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF _pin IS NULL OR _pin !~ '^\d{4,6}$' THEN RAISE EXCEPTION 'PIN must be 4-6 digits'; END IF;
  INSERT INTO public.transfer_pins (user_id, pin_hash, updated_at)
  VALUES (auth.uid(), extensions.encode(extensions.digest(_pin || auth.uid()::text, 'sha256'), 'hex'), now())
  ON CONFLICT (user_id) DO UPDATE SET pin_hash = EXCLUDED.pin_hash, updated_at = now();
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.set_transfer_pin(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_transfer_pin(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.has_transfer_pin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.transfer_pins WHERE user_id = auth.uid());
$function$;
REVOKE EXECUTE ON FUNCTION public.has_transfer_pin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_transfer_pin() TO authenticated;

CREATE OR REPLACE FUNCTION public.submit_transfer(_recipient text, _amount numeric, _description text, _pin text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  uid uuid := auth.uid();
  sender_acc public.accounts%ROWTYPE;
  recv_acc public.accounts%ROWTYPE;
  recv_profile public.profiles%ROWTYPE;
  sender_profile public.profiles%ROWTYPE;
  stored_hash text;
  new_ref text;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'Enter a valid amount'; END IF;

  -- Server-side PIN verification (hash never leaves the database)
  SELECT pin_hash INTO stored_hash FROM public.transfer_pins WHERE user_id = uid;
  IF stored_hash IS NULL THEN RAISE EXCEPTION 'Transfer PIN not set'; END IF;
  IF _pin IS NULL OR extensions.encode(extensions.digest(_pin || uid::text, 'sha256'), 'hex') <> stored_hash THEN
    RAISE EXCEPTION 'Incorrect PIN';
  END IF;

  SELECT * INTO sender_acc FROM public.accounts WHERE user_id = uid LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'Account not found'; END IF;
  IF sender_acc.status <> 'active' THEN RAISE EXCEPTION 'Your account is not active'; END IF;
  IF sender_acc.balance < _amount THEN RAISE EXCEPTION 'Insufficient balance'; END IF;

  -- Resolve recipient by account number, else by email
  SELECT * INTO recv_acc FROM public.accounts WHERE account_number = btrim(_recipient) LIMIT 1;
  IF NOT FOUND THEN
    SELECT * INTO recv_profile FROM public.profiles WHERE email = lower(btrim(_recipient)) LIMIT 1;
    IF FOUND THEN
      SELECT * INTO recv_acc FROM public.accounts WHERE user_id = recv_profile.id LIMIT 1;
    END IF;
  END IF;
  IF NOT FOUND THEN RAISE EXCEPTION 'Recipient not found'; END IF;
  IF recv_acc.user_id = uid THEN RAISE EXCEPTION 'Cannot transfer to yourself'; END IF;
  IF recv_acc.currency <> sender_acc.currency THEN RAISE EXCEPTION 'Currency mismatch with recipient account'; END IF;

  IF recv_profile.id IS NULL THEN
    SELECT * INTO recv_profile FROM public.profiles WHERE id = recv_acc.user_id;
  END IF;
  SELECT * INTO sender_profile FROM public.profiles WHERE id = uid;

  INSERT INTO public.transactions (
    tx_type, status, amount, currency,
    sender_account_id, sender_user_id, sender_name,
    receiver_account_id, receiver_user_id, receiver_name,
    description
  ) VALUES (
    'transfer', 'pending', _amount, sender_acc.currency,
    sender_acc.id, uid, COALESCE(sender_profile.full_name, sender_profile.email),
    recv_acc.id, recv_acc.user_id, COALESCE(recv_profile.full_name, recv_profile.email, 'Recipient'),
    NULLIF(_description, '')
  )
  RETURNING reference INTO new_ref;

  RETURN new_ref;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.submit_transfer(text, numeric, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_transfer(text, numeric, text, text) TO authenticated;

-- ============================================================
-- D. Close the direct client insert path for transactions
--    (transfers must go through submit_transfer; admin credits
--     go through admin_adjust_balance — both SECURITY DEFINER)
-- ============================================================
DROP POLICY IF EXISTS "tx: insert own" ON public.transactions;