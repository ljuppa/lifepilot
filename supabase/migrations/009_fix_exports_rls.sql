-- Fix: object path inside the exports bucket is `exports/{userId}/{timestamp}.json`,
-- so foldername[1] = 'exports' (a literal folder), not the userId.
-- foldername[2] is the actual userId segment.
DROP POLICY IF EXISTS "Users can read their own exports" ON storage.objects;

CREATE POLICY "Users can read their own exports"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'exports'
    AND auth.uid()::text = (storage.foldername(name))[2]
  );
