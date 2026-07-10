
-- Support chat
CREATE TABLE public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_admin boolean NOT NULL DEFAULT false,
  body text NOT NULL,
  read_by_user boolean NOT NULL DEFAULT false,
  read_by_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_messages TO authenticated;
GRANT ALL ON public.support_messages TO service_role;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own thread" ON public.support_messages FOR SELECT TO authenticated
  USING (thread_user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Users send in own thread" ON public.support_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_user_id = auth.uid()
    AND (
      (thread_user_id = auth.uid() AND is_admin = false)
      OR (public.has_role(auth.uid(),'admin') AND is_admin = true)
    )
  );
CREATE POLICY "Update read flags" ON public.support_messages FOR UPDATE TO authenticated
  USING (thread_user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE INDEX idx_support_thread ON public.support_messages(thread_user_id, created_at);

-- KYC documents
CREATE TABLE public.kyc_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doc_type text NOT NULL,
  storage_path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kyc_documents TO authenticated;
GRANT ALL ON public.kyc_documents TO service_role;
ALTER TABLE public.kyc_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own kyc docs" ON public.kyc_documents FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- Process transfer atomically
CREATE OR REPLACE FUNCTION public.process_transfer(_tx_id uuid, _approve boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tx public.transactions%ROWTYPE;
  sender_bal numeric;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT * INTO tx FROM public.transactions WHERE id = _tx_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'tx not found'; END IF;
  IF tx.status <> 'pending' THEN RAISE EXCEPTION 'tx not pending'; END IF;

  IF NOT _approve THEN
    UPDATE public.transactions SET status='failed', updated_at=now() WHERE id=_tx_id;
    INSERT INTO public.notifications(user_id,type,title,body)
      VALUES (tx.sender_user_id,'transfer','Transfer rejected',
              'Your transfer ' || tx.reference || ' was rejected.');
    RETURN;
  END IF;

  -- Debit sender
  IF tx.sender_account_id IS NOT NULL THEN
    UPDATE public.accounts SET balance = balance - tx.amount, updated_at=now()
      WHERE id = tx.sender_account_id AND balance >= tx.amount
      RETURNING balance INTO sender_bal;
    IF sender_bal IS NULL THEN
      UPDATE public.transactions SET status='failed', updated_at=now() WHERE id=_tx_id;
      INSERT INTO public.notifications(user_id,type,title,body)
        VALUES (tx.sender_user_id,'transfer','Transfer failed',
                'Insufficient balance for ' || tx.reference);
      RETURN;
    END IF;
  END IF;

  -- Credit receiver
  IF tx.receiver_account_id IS NOT NULL THEN
    UPDATE public.accounts SET balance = balance + tx.amount, updated_at=now()
      WHERE id = tx.receiver_account_id;
  END IF;

  UPDATE public.transactions SET status='successful', balance_after=sender_bal, updated_at=now() WHERE id=_tx_id;

  INSERT INTO public.notifications(user_id,type,title,body)
    VALUES (tx.sender_user_id,'transfer','Transfer completed',
            'Your transfer ' || tx.reference || ' was completed.');
  IF tx.receiver_user_id IS NOT NULL THEN
    INSERT INTO public.notifications(user_id,type,title,body)
      VALUES (tx.receiver_user_id,'transfer','Funds received',
              'You received a transfer: ' || tx.reference);
  END IF;
END; $$;

-- Admin deposit / adjustment
CREATE OR REPLACE FUNCTION public.admin_adjust_balance(_account_id uuid, _amount numeric, _description text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  acc public.accounts%ROWTYPE;
  new_bal numeric;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO acc FROM public.accounts WHERE id=_account_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'account not found'; END IF;
  new_bal := acc.balance + _amount;
  IF new_bal < 0 THEN RAISE EXCEPTION 'would go negative'; END IF;
  UPDATE public.accounts SET balance=new_bal, updated_at=now() WHERE id=_account_id;
  INSERT INTO public.transactions(tx_type,status,amount,currency,receiver_account_id,receiver_user_id,description,is_admin_adjustment,balance_after)
    VALUES (CASE WHEN _amount>=0 THEN 'deposit'::tx_type ELSE 'withdrawal'::tx_type END,
            'successful', abs(_amount), acc.currency, _account_id, acc.user_id,
            COALESCE(_description,'Admin adjustment'), true, new_bal);
  INSERT INTO public.notifications(user_id,type,title,body)
    VALUES (acc.user_id, CASE WHEN _amount>=0 THEN 'deposit'::notif_type ELSE 'system'::notif_type END,
            CASE WHEN _amount>=0 THEN 'Deposit received' ELSE 'Balance adjusted' END,
            COALESCE(_description,'Admin adjustment'));
END; $$;

-- Update account status / kyc admin
CREATE OR REPLACE FUNCTION public.admin_set_account_status(_account_id uuid, _status account_status)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.accounts SET status=_status, updated_at=now() WHERE id=_account_id;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_set_kyc(_user_id uuid, _status kyc_status, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.profiles SET kyc_status=_status, kyc_rejection_reason=_reason, updated_at=now() WHERE id=_user_id;
  INSERT INTO public.notifications(user_id,type,title,body)
    VALUES (_user_id,'system',
      CASE _status WHEN 'approved' THEN 'KYC approved' WHEN 'rejected' THEN 'KYC rejected' ELSE 'KYC updated' END,
      COALESCE(_reason,'Your KYC status has been updated.'));
END; $$;

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
