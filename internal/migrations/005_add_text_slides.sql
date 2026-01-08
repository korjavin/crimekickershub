-- Add text slide columns to media_assets
ALTER TABLE media_assets ADD COLUMN title TEXT;
ALTER TABLE media_assets ADD COLUMN description TEXT;
ALTER TABLE media_assets ADD COLUMN text_content TEXT;
