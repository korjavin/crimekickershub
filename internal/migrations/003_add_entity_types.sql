-- Create entity_types table
CREATE TABLE IF NOT EXISTS entity_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Seed default types
INSERT OR IGNORE INTO entity_types (slug, name, description) VALUES 
('hero', 'Hero', 'Protectors of the innocent'),
('villain', 'Villain', 'Those who seek to harm or rule'),
('location', 'Location', 'Places of interest'),
('artifact', 'Artifact', 'Objects of power or significance');

-- Add entity_type_id to entities (nullable first to allow migration)
ALTER TABLE entities ADD COLUMN entity_type_id INTEGER REFERENCES entity_types(id);

-- Migrate existing data
UPDATE entities 
SET entity_type_id = (
    SELECT id FROM entity_types WHERE slug = lower(entities.type)
);

-- If there are any that didn't match (e.g. casing differences or unknown types), default to 'hero' or leave null? 
-- Let's default to 'hero' if null, just to be safe, or we can deal with it later. 
-- For now, let's assume the hardcoded types match.

-- We cannot drop columns in SQLite easily in one step usually without recreating the table, 
-- but we can just ignore the 'type' column for now or leave it as legacy.
-- We will stop using it in the code.
