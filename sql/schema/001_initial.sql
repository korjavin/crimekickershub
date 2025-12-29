-- Initial schema for Crime Kickers Hub
-- Database: SQLite with WAL mode

-- Enable foreign key support
PRAGMA foreign_keys = ON;

-- Create entities table (characters, locations, etc.)
CREATE TABLE IF NOT EXISTS entities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'character', 'location', 'prop', etc.
    description TEXT,
    avatar_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create prompt_types table (templates like "Action Shot", "Portrait", etc.)
CREATE TABLE IF NOT EXISTS prompt_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    template_text TEXT NOT NULL -- The prompt template with placeholders
);

-- Create prompt_versions table (versioned prompts)
CREATE TABLE IF NOT EXISTS prompt_versions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_id INTEGER NOT NULL,
    type_id INTEGER NOT NULL,
    version_number INTEGER NOT NULL DEFAULT 1,
    prompt_text TEXT NOT NULL,
    technical_params_json TEXT, -- JSON blob for aspect ratio, seed, etc.
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE,
    FOREIGN KEY (type_id) REFERENCES prompt_types(id) ON DELETE CASCADE,
    UNIQUE (entity_id, type_id, version_number)
);

-- Create media_assets table (images and videos)
CREATE TABLE IF NOT EXISTS media_assets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL, -- 'image', 'video'
    r2_key TEXT, -- Cloudflare R2 key for images
    youtube_id TEXT, -- YouTube video ID
    source_prompt_version_id INTEGER, -- Link to the prompt that generated this
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (source_prompt_version_id) REFERENCES prompt_versions(id) ON DELETE SET NULL
);

-- Create stories table (comic issues)
CREATE TABLE IF NOT EXISTS stories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    cover_image_url TEXT,
    published BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create story_items table (ordered items in a story)
CREATE TABLE IF NOT EXISTS story_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    story_id INTEGER NOT NULL,
    media_asset_id INTEGER NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE,
    FOREIGN KEY (media_asset_id) REFERENCES media_assets(id) ON DELETE CASCADE,
    UNIQUE (story_id, sort_order)
);

-- Create users table (for admin whitelist)
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    google_id TEXT NOT NULL UNIQUE,
    role TEXT DEFAULT 'user', -- 'admin', 'user'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_entities_slug ON entities(slug);
CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(type);
CREATE INDEX IF NOT EXISTS idx_prompt_versions_entity ON prompt_versions(entity_id);
CREATE INDEX IF NOT EXISTS idx_prompt_versions_type ON prompt_versions(type_id);
CREATE INDEX IF NOT EXISTS idx_media_assets_prompt ON media_assets(source_prompt_version_id);
CREATE INDEX IF NOT EXISTS idx_stories_slug ON stories(slug);
CREATE INDEX IF NOT EXISTS idx_story_items_story ON story_items(story_id);
CREATE INDEX IF NOT EXISTS idx_users_google ON users(google_id);
