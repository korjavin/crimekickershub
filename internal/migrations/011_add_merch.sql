-- Create merch table for promo + demand research.
-- Admin manages items (image + title + description); public visitors express
-- interest via an "I want it!" button that increments want_count. No checkout.
CREATE TABLE IF NOT EXISTS merch (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    thumbnail_url TEXT,
    tag TEXT,
    color TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    published BOOLEAN NOT NULL DEFAULT 1,
    want_count INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Seed 4 placeholder published items (images to be added by admins later).
INSERT INTO merch (title, description, image_url, thumbnail_url, tag, color, sort_order, published, want_count) VALUES
('Pho-boman Helmet', 'Guard your head like a true Pho-boman! A light, stylish helmet with the signature pattern.', NULL, NULL, 'ACCESSORY', 'pink',    1, 1, 0),
('Windman Fan',      'A powerful pocket fan — a fresh breeze with you at all times, just like Windman.',           NULL, NULL, 'GADGET',    'blue',    2, 1, 0),
('Primm Glasses',    'Elegant Primm-style glasses. Look at the world with wit and a touch of mystery.',           NULL, NULL, 'ACCESSORY', 'violet',  3, 1, 0),
('Tiebe Beret',      'A soft, warm beret — wear the Tiebe team colors with pride.',                               NULL, NULL, 'APPAREL',   'mustard', 4, 1, 0);
