-- Add an optional editorial motto/slogan per comic (internally "stories").
-- Shown on the user-facing comic cards and the comic detail (reader) page when
-- filled, and editable in the admin Story editor. Mirrors the audio_url column
-- pattern. Additive and nullable, so it is safe and backward compatible for
-- existing rows.
ALTER TABLE stories ADD COLUMN motto TEXT;
