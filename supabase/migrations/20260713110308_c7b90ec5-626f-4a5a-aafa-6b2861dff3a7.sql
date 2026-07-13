ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferred_language text NOT NULL DEFAULT 'en';

CREATE OR REPLACE FUNCTION public.set_kyc_pending_on_document_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.profiles
     SET kyc_status = 'pending',
         kyc_rejection_reason = NULL,
         updated_at = now()
   WHERE id = NEW.user_id
     AND kyc_status <> 'approved';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS kyc_documents_set_pending ON public.kyc_documents;
CREATE TRIGGER kyc_documents_set_pending
AFTER INSERT OR UPDATE OF storage_path ON public.kyc_documents
FOR EACH ROW
EXECUTE FUNCTION public.set_kyc_pending_on_document_change();