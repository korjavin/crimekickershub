-- Add a single optional audio track per comic (internally "stories").
-- Holds the full public R2 URL of the comic's audio file, mirroring the
-- existing cover_image_url column. Additive and nullable, so it is safe and
-- backward compatible for existing rows.
ALTER TABLE stories ADD COLUMN audio_url TEXT;
