-- name: CreateEntity :one
INSERT INTO entities (slug, name, type, entity_type_id, description, base_prompt, avatar_url, avatar_thumbnail_url)
VALUES (?, ?, ?, ?, ?, ?, ?, ?)
RETURNING *;

-- name: GetEntityBySlug :one
SELECT e.*, et.name as type_name, et.slug as type_slug 
FROM entities e
LEFT JOIN entity_types et ON e.entity_type_id = et.id
WHERE e.slug = ?;

-- name: GetEntityByID :one
SELECT e.*, et.name as type_name, et.slug as type_slug
FROM entities e
LEFT JOIN entity_types et ON e.entity_type_id = et.id
WHERE e.id = ?;

-- name: ListEntities :many
SELECT e.*, et.name as type_name, et.slug as type_slug
FROM entities e
LEFT JOIN entity_types et ON e.entity_type_id = et.id
ORDER BY e.name;

-- name: UpdateEntity :one
UPDATE entities
SET slug = COALESCE(?, slug),
    name = COALESCE(?, name),
    entity_type_id = COALESCE(?, entity_type_id),
    description = COALESCE(?, description),
    base_prompt = COALESCE(?, base_prompt),
    avatar_url = COALESCE(?, avatar_url),
    avatar_thumbnail_url = COALESCE(?, avatar_thumbnail_url)
WHERE id = ?
RETURNING *;

-- name: DeleteEntity :exec
DELETE FROM entities WHERE id = ?;

-- name: ListEntitiesByType :many
SELECT e.*, et.name as type_name, et.slug as type_slug
FROM entities e
JOIN entity_types et ON e.entity_type_id = et.id
WHERE lower(et.slug) = lower(?)
ORDER BY e.name;

-- name: ListEntityTypes :many
SELECT * FROM entity_types ORDER BY name;

-- name: CreateEntityType :one
INSERT INTO entity_types (slug, name, description)
VALUES (?, ?, ?)
RETURNING *;

-- name: UpdateEntityType :one
UPDATE entity_types
SET slug = ?, name = ?, description = ?
WHERE id = ?
RETURNING *;

-- name: DeleteEntityType :exec
DELETE FROM entity_types WHERE id = ?;

-- name: GetEntityTypeBySlug :one
SELECT * FROM entity_types WHERE slug = ?;

-- name: GetEntityTypeByID :one
SELECT * FROM entity_types WHERE id = ?;

-- name: CreatePromptType :one
INSERT INTO prompt_types (slug, description, template_text)
VALUES (?, ?, ?)
RETURNING *;

-- name: GetPromptTypeBySlug :one
SELECT * FROM prompt_types WHERE slug = ?;

-- name: GetPromptTypeByID :one
SELECT * FROM prompt_types WHERE id = ?;

-- name: ListPromptTypes :many
SELECT * FROM prompt_types ORDER BY slug;

-- name: UpdatePromptType :exec
UPDATE prompt_types SET slug = ?, description = ?, template_text = ? WHERE id = ?;

-- name: DeletePromptType :exec
DELETE FROM prompt_types WHERE id = ?;

-- name: GetLatestPromptVersionForMatrix :one
SELECT pv.*, e.name as entity_name, pt.slug as type_slug, pt.description as type_description
FROM prompt_versions pv
JOIN entities e ON pv.entity_id = e.id
JOIN prompt_types pt ON pv.type_id = pt.id
WHERE pv.entity_id = ? AND pv.type_id = ?
ORDER BY pv.version_number DESC
LIMIT 1;

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

-- name: UpdateStory :one
UPDATE stories
SET title = ?, slug = ?, cover_image_url = ?, published = ?
WHERE id = ?
RETURNING *;

-- name: DeleteStory :exec
DELETE FROM stories WHERE id = ?;

-- name: ListAllPromptVersions :many
SELECT id, entity_id, type_id, version_number, prompt_text, technical_params_json, created_at FROM prompt_versions ORDER BY created_at DESC LIMIT 10;

-- name: ListRecentPromptVersions :many
SELECT pv.*, e.name as entity_name, pt.slug as type_slug, pt.description as type_description
FROM prompt_versions pv
JOIN entities e ON pv.entity_id = e.id
JOIN prompt_types pt ON pv.type_id = pt.id
ORDER BY pv.created_at DESC LIMIT 10;

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

-- name: DeleteMediaAsset :exec
DELETE FROM media_assets WHERE id = ?;

-- name: ListRecentEntities :many
SELECT e.*, et.name as type_name, et.slug as type_slug
FROM entities e
LEFT JOIN entity_types et ON e.entity_type_id = et.id
ORDER BY e.created_at DESC LIMIT 10;

-- name: ListRecentMedia :many
SELECT * FROM media_assets ORDER BY created_at DESC LIMIT 10;

-- name: ListRecentStories :many
SELECT * FROM stories ORDER BY created_at DESC LIMIT 10;

-- name: ListPromptHistory :many
SELECT pv.*, e.name as entity_name, pt.slug as type_slug, pt.description as type_description
FROM prompt_versions pv
JOIN entities e ON pv.entity_id = e.id
JOIN prompt_types pt ON pv.type_id = pt.id
ORDER BY pv.created_at DESC;
