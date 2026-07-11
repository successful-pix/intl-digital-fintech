
CREATE POLICY "support images: user reads own"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id='support-images' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(),'admin')));
CREATE POLICY "support images: user uploads own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id='support-images' AND auth.uid()::text = (storage.foldername(name))[1]);
