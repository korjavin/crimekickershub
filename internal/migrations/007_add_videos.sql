-- Create videos table for the public "Cinema" / "The Reels" tab.
-- Replaces the previously hardcoded VIDEOS list that lived in the frontend
-- (frontend/src/components/wimpy/data.ts) and could not be edited at runtime.
CREATE TABLE IF NOT EXISTS videos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    youtube_id TEXT NOT NULL,
    description TEXT,
    mins TEXT,
    tag TEXT,
    color TEXT,
    tags TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    published BOOLEAN NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Seed with the previously hardcoded reels so the tab stays populated and the
-- admin has editable starting rows (the YouTube IDs below are placeholders).
INSERT INTO videos (title, youtube_id, description, mins, tag, color, tags, sort_order, published) VALUES
('Pho-boman trailer',      'dQw4w9WgXcQ', 'Broth as a weapon. The official trailer.',           '1:24', 'TRAILER', 'pink',    'trailer,action',  1, 1),
('How we drew Windman',    '9bZkp7q19f0', 'Inks, pencils, and one very annoyed art teacher.',   '3:08', 'PROCESS', 'blue',    'process,drawing', 2, 1),
('Tiebe''s giant moment',  'JGwWNGJdvx8', 'She did not need to be that tall, but here we are.', '0:42', 'CLIP',    'mustard', 'clip,action',     3, 1),
('Primm field test',       'kJQP7kiw5Fk', 'Subject CK-003 in unsupervised gravity conditions.', '2:11', 'CLIP',    'violet',  'clip,powers',     4, 1),
('Dossier 04 assembled',   '9bZkp7q19f0', 'Full reel — case file 04 from start to mop-up.',     '4:55', 'EPISODE', 'teal',    'episode,team',    5, 1),
('Origin: the lunch lady', 'JGwWNGJdvx8', 'Where did the broth actually come from? Yikes.',     '1:50', 'LORE',    'coral',   'lore,origin',     6, 1);
