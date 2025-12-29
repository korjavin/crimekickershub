-- name: CreateEntity :one
INSERT INTO entities (slug, name, type, description, avatar_url)
VALUES (?, ?, ?, ?, ?)
RETURNING *;

-- name: GetEntityBySlug :one
SELECT * FROM entities WHERE slug = ?;

-- name: GetEntityByID :one
SELECT * FROM entities WHERE id = ?;

-- name: ListEntities :many
SELECT * FROM entities ORDER BY name;

-- name: ListEntitiesByType :many
SELECT * FROM entities WHERE type = ? ORDER BY name;

-- name: CreatePromptType :one
INSERT INTO prompt_types (slug, description, template_text)
VALUES (?, ?, ?)
RETURNING *;

-- name: GetPromptTypeBySlug :one
SELECT * FROM prompt_types WHERE slug = ?;

-- name: ListPromptTypes :many
SELECT * FROM prompt_types ORDER BY slug;

-- name: CreatePromptVersion :one
INSERT INTO prompt_versions (entity_id, type_id, version_number, prompt_text, technical_params_json)
VALUES (?, ?, ?, ?, ?)
RETURNING *;

-- name: GetPromptVersionByID :one
SELECT * FROM prompt_versions WHERE id = ?;

-- name: GetLatestPromptVersion :one
SELECT * FROM prompt_versions
WHERE entity_id = ? AND type_id = ?
ORDER BY version_number DESC
LIMIT 1;

-- name: ListPromptVersionsForEntity :many
SELECT * FROM prompt_versions WHERE entity_id = ? ORDER BY type_id, version_number DESC;

-- name: ListPromptVersionsForEntityAndType :many
SELECT * FROM prompt_versions
WHERE entity_id = ? AND type_id = ?
ORDER BY version_number DESC;

-- name: CreateMediaAsset :one
INSERT INTO media_assets (type, r2_key, youtube_id, source_prompt_version_id)
VALUES (?, ?, ?, ?)
RETURNING *;

-- name: GetMediaAsset :one
SELECT * FROM media_assets WHERE id = ?;

-- name: ListMediaByStory :many
SELECT ma.* FROM media_assets ma
JOIN story_items si ON ma.id = si.media_asset_id
WHERE si.story_id = ?
ORDER BY si.sort_order;

-- name: ListAllMediaAssets :many
SELECT * FROM media_assets ORDER BY created_at DESC;

-- name: CreateStory :one
INSERT INTO stories (title, slug, cover_image_url, published)
VALUES (?, ?, ?, ?)
RETURNING *;

-- name: GetStoryByID :one
SELECT * FROM stories WHERE id = ?;

-- name: GetStoryBySlug :one
SELECT * FROM stories WHERE slug = ?;

-- name: ListPublishedStories :many
SELECT * FROM stories WHERE published = 1 ORDER BY created_at DESC;

-- name: ListAllStories :many
SELECT * FROM stories ORDER BY created_at DESC;

-- name: ListAllPromptVersions :many
SELECT id, entity_id, type_id, version_number, prompt_text, technical_params_json, created_at FROM prompt_versions ORDER BY created_at DESC;

-- name: AddStoryItem :one
INSERT INTO story_items (story_id, media_asset_id, sort_order)
VALUES (?, ?, ?)
RETURNING *;

-- name: GetStoryWithItems :one
SELECT
    s.id AS s_id, s.title AS s_title, s.slug AS s_slug, s.cover_image_url, s.published, s.created_at,
    si.id AS si_id, si.sort_order,
    ma.id AS ma_id, ma.type AS ma_type, ma.r2_key, ma.youtube_id, ma.source_prompt_version_id, ma.created_at AS ma_created_at
FROM stories s
LEFT JOIN story_items si ON s.id = si.story_id
LEFT JOIN media_assets ma ON si.media_asset_id = ma.id
WHERE s.id = ?
ORDER BY si.sort_order;

-- name: GetStoryItems :many
SELECT si.* FROM story_items si
WHERE si.story_id = ?
ORDER BY si.sort_order;

-- name: UpdateStoryItemSortOrder :exec
UPDATE story_items SET sort_order = ? WHERE id = ?;

-- name: DeleteStoryItem :exec
DELETE FROM story_items WHERE id = ?;

-- name: GetUserByEmail :one
SELECT * FROM users WHERE email = ?;

-- name: GetUserByGoogleID :one
SELECT * FROM users WHERE google_id = ?;

-- name: UpsertUser :one
INSERT INTO users (email, google_id, role)
VALUES (?, ?, ?)
ON CONFLICT(email) DO UPDATE SET
    google_id = excluded.google_id,
    role = excluded.role
RETURNING *;

-- name: UpdateUserRole :exec
UPDATE users SET role = ? WHERE id = ?;

-- name: ListUsers :many
SELECT * FROM users ORDER BY created_at DESC;
