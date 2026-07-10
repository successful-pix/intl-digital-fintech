-- =========================================================
-- ENUMS
-- =========================================================
CREATE TYPE public.account_currency AS ENUM ('USD','CAD','VND','BRL');
CREATE TYPE public.account_status   AS ENUM ('active','suspended','closed');
CREATE TYPE public.app_role         AS ENUM ('admin','user');
CREATE TYPE public.kyc_status       AS ENUM ('not_submitted','pending','approved','rejected');
CREATE TYPE public.tx_type          AS ENUM ('deposit','transfer','withdrawal');
CREATE TYPE public.tx_status        AS ENUM ('pending','successful','failed');
CREATE TYPE public.notif_type       AS ENUM ('deposit','transfer','security','support','system');

-- =========================================================
-- updated_at helper
-- =========================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- =========================================================
-- PROFILES
-- =========================================================
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  phone text,
  avatar_url text,
  transfer_pin_hash text,
  kyc_status public.kyc_status NOT NULL DEFAULT 'not_submitted',
  kyc_rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- USER_ROLES (separate table for security)
-- =========================================================
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- =========================================================
-- ACCOUNTS
-- =========================================================
CREATE TABLE public.accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  currency public.account_currency NOT NULL,
  balance numeric(18,2) NOT NULL DEFAULT 0,
  status public.account_status NOT NULL DEFAULT 'active',
  account_number text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, currency)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounts TO authenticated;
GRANT ALL ON public.accounts TO service_role;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_accounts_updated_at BEFORE UPDATE ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- TRANSACTIONS
-- =========================================================
CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE DEFAULT ('ID-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,12))),
  tx_type public.tx_type NOT NULL,
  status public.tx_status NOT NULL DEFAULT 'pending',
  currency public.account_currency NOT NULL,
  amount numeric(18,2) NOT NULL CHECK (amount > 0),
  description text,
  sender_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  receiver_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  receiver_account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  sender_name text,
  receiver_name text,
  balance_after numeric(18,2),
  is_admin_adjustment boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_tx_sender ON public.transactions(sender_user_id, created_at DESC);
CREATE INDEX idx_tx_receiver ON public.transactions(receiver_user_id, created_at DESC);
CREATE TRIGGER trg_tx_updated_at BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- NOTIFICATIONS
-- =========================================================
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type public.notif_type NOT NULL,
  title text NOT NULL,
  body text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_notif_user ON public.notifications(user_id, created_at DESC);

-- =========================================================
-- POLICIES
-- =========================================================
-- profiles
CREATE POLICY "profiles: read own or admin" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "profiles: insert self" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());
CREATE POLICY "profiles: update own or admin" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- user_roles: users can read own; only admins can modify
CREATE POLICY "roles: read own or admin" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "roles: admin manage" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- accounts
CREATE POLICY "accounts: read own or admin" ON public.accounts FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "accounts: insert self" ON public.accounts FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "accounts: admin update" ON public.accounts FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- transactions
CREATE POLICY "tx: read own or admin" ON public.transactions FOR SELECT TO authenticated
  USING (sender_user_id = auth.uid() OR receiver_user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "tx: insert own" ON public.transactions FOR INSERT TO authenticated
  WITH CHECK (sender_user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "tx: admin update" ON public.transactions FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- notifications
CREATE POLICY "notif: read own" ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "notif: update own" ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "notif: admin insert" ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR user_id = auth.uid());

-- =========================================================
-- New-user handler: create profile + account (currency from metadata)
-- =========================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  chosen_currency public.account_currency;
  acct_num text;
BEGIN
  chosen_currency := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'currency','')::public.account_currency,
    'USD'::public.account_currency
  );
  acct_num := 'ID' || to_char(now(),'YYMMDD') || upper(substr(replace(NEW.id::text,'-',''),1,8));

  INSERT INTO public.profiles(id, email, full_name, phone)
    VALUES (NEW.id, NEW.email,
            NEW.raw_user_meta_data->>'full_name',
            NEW.raw_user_meta_data->>'phone');

  INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, 'user');

  INSERT INTO public.accounts(user_id, currency, account_number)
    VALUES (NEW.id, chosen_currency, acct_num);

  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================
-- Admin bootstrap helper (call with an email to promote)
-- =========================================================
CREATE OR REPLACE FUNCTION public.grant_admin_by_email(_email text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid;
BEGIN
  SELECT id INTO uid FROM auth.users WHERE email = _email LIMIT 1;
  IF uid IS NULL THEN RAISE EXCEPTION 'No user with email %', _email; END IF;
  INSERT INTO public.user_roles(user_id, role) VALUES (uid, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
END; $$;
REVOKE ALL ON FUNCTION public.grant_admin_by_email(text) FROM public, authenticated, anon;