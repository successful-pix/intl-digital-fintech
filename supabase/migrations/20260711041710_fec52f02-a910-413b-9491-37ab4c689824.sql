
CREATE TABLE public.email_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  user_id UUID,
  purpose TEXT NOT NULL CHECK (purpose IN ('signup','login','reset')),
  code TEXT NOT NULL,
  pending_session JSONB,
  attempts INT NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.email_otps TO service_role;
ALTER TABLE public.email_otps ENABLE ROW LEVEL SECURITY;
CREATE INDEX email_otps_email_purpose_idx ON public.email_otps(email, purpose, created_at DESC);

ALTER TABLE public.support_messages ADD COLUMN IF NOT EXISTS image_url TEXT;

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS external_recipient_name TEXT,
  ADD COLUMN IF NOT EXISTS external_recipient_account TEXT,
  ADD COLUMN IF NOT EXISTS external_recipient_iban TEXT,
  ADD COLUMN IF NOT EXISTS external_recipient_bank TEXT;

ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS agency_code TEXT;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $function$
DECLARE
  chosen_currency public.account_currency;
  acct_num TEXT;
  agency TEXT;
BEGIN
  chosen_currency := COALESCE(NULLIF(NEW.raw_user_meta_data->>'currency','')::public.account_currency,'USD');
  CASE chosen_currency
    WHEN 'BRL' THEN
      agency := lpad((floor(random()*9000)+1000)::text, 4, '0');
      acct_num := lpad((floor(random()*900000)+100000)::text, 6, '0') || '-' || (floor(random()*10))::text;
    WHEN 'VND' THEN
      agency := 'ID' || lpad((floor(random()*900)+100)::text, 3, '0');
      acct_num := lpad((floor(random()*9000000000000)+1000000000000)::text, 13, '0');
    WHEN 'CAD' THEN
      agency := lpad((floor(random()*90000)+10000)::text, 5, '0');
      acct_num := lpad((floor(random()*9000000)+1000000)::text, 7, '0');
    ELSE
      agency := '021000021';
      acct_num := lpad((floor(random()*900000000)+100000000)::text, 10, '0');
  END CASE;
  INSERT INTO public.profiles(id, email, full_name, phone)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'phone');
  INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, 'user');
  INSERT INTO public.accounts(user_id, currency, account_number, agency_code)
    VALUES (NEW.id, chosen_currency, acct_num, agency);
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.admin_adjust_balance(_account_id uuid, _amount numeric, _description text, _sender_name text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $function$
DECLARE acc public.accounts%ROWTYPE; new_bal numeric;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO acc FROM public.accounts WHERE id=_account_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'account not found'; END IF;
  new_bal := acc.balance + _amount;
  IF new_bal < 0 THEN RAISE EXCEPTION 'would go negative'; END IF;
  UPDATE public.accounts SET balance=new_bal, updated_at=now() WHERE id=_account_id;
  INSERT INTO public.transactions(tx_type,status,amount,currency,receiver_account_id,receiver_user_id,description,is_admin_adjustment,balance_after,sender_name,external_recipient_name)
    VALUES (CASE WHEN _amount>=0 THEN 'deposit'::tx_type ELSE 'withdrawal'::tx_type END,
            'successful', abs(_amount), acc.currency, _account_id, acc.user_id,
            COALESCE(_description,'Transfer'), true, new_bal,
            COALESCE(NULLIF(_sender_name,''),'International Digital'),
            NULLIF(_sender_name,''));
  INSERT INTO public.notifications(user_id,type,title,body)
    VALUES (acc.user_id, CASE WHEN _amount>=0 THEN 'deposit'::notif_type ELSE 'system'::notif_type END,
            CASE WHEN _amount>=0 THEN 'Funds received' ELSE 'Balance updated' END,
            COALESCE(_description, CASE WHEN _amount>=0 THEN 'A transfer was credited to your account.' ELSE 'Your balance was updated.' END));
END; $function$;

CREATE OR REPLACE FUNCTION public.support_unread_for_user(_user_id uuid)
RETURNS int LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COUNT(*)::int FROM public.support_messages
   WHERE thread_user_id = _user_id AND is_admin = true AND read_by_user = false;
$$;
GRANT EXECUTE ON FUNCTION public.support_unread_for_user(uuid) TO authenticated;
