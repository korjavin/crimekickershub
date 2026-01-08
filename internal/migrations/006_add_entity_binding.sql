-- Add entity_id to media_assets
ALTER TABLE media_assets ADD COLUMN entity_id INTEGER REFERENCES entities(id) ON DELETE SET NULL;
