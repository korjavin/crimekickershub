-- Create merch table for promo + demand research.
-- Admin manages items (image + title + description); public visitors express
-- interest via a "Я хочу!" button that increments want_count. No checkout.
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
('Шлем Фубобомена',   'Защити голову как настоящий Фубобомен! Лёгкий и стильный шлем с фирменным узором.', NULL, NULL, 'АКСЕССУАР', 'pink',    1, 1, 0),
('Вентилятор Винмана', 'Мощный карманный вентилятор — всегда свежий ветер с тобой, как у Винмана.',         NULL, NULL, 'ГАДЖЕТ',    'blue',    2, 1, 0),
('Очки Прима',         'Элегантные очки в стиле Прима. Смотри на мир с умом и лёгкой загадочностью.',       NULL, NULL, 'АКСЕССУАР', 'violet',  3, 1, 0),
('Берет Тайби',        'Мягкий тёплый берет — носи с гордостью цвета команды Тайби.',                      NULL, NULL, 'ОДЕЖДА',    'mustard', 4, 1, 0);
