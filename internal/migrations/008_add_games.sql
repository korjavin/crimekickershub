-- Create games table for the public "Games" tab.
-- Each game card just links out (url) to an externally hosted game and shows
-- an optional thumbnail screenshot plus a short description. Editable from
-- the admin panel (same pattern as videos / cinema).
CREATE TABLE IF NOT EXISTS games (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    tag TEXT,
    color TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    published BOOLEAN NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Seed a couple of placeholder cards so the tab is not empty on first deploy.
INSERT INTO games (title, url, description, thumbnail_url, tag, color, sort_order, published) VALUES
('Pho-boman: Broth Brawl',  'https://example.com/games/pho-boman', 'Throw scalding broth, dodge food critics.',    NULL, 'ARCADE',  'pink',    1, 1),
('Windman Updraft',         'https://example.com/games/windman',   'Surf pressure systems across the playground.', NULL, 'PLATFORM','blue',    2, 1),
('Primm: Gravity Optional', 'https://example.com/games/primm',     'Float chairs. Avoid metal lockers.',           NULL, 'PUZZLE',  'violet',  3, 1),
('Tiebe Stomp',             'https://example.com/games/tiebe',     'Grow, stomp, mind the ceilings.',              NULL, 'ACTION',  'mustard', 4, 1);
