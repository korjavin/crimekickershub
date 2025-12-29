# Continuity Ledger

## Goal (incl. success criteria):
Build Crime Kickers Hub - a Go-based web application with:
- Public CMS for comic book universe
- Internal "Prompt Studio" for managing Generative AI workflows
- SQLite database with WAL mode
- Type-safe data access via sqlc
- Prompt versioning and composition engine
- Cloudflare R2 integration for image storage
- YouTube integration for video links
- Google OAuth authentication with admin whitelist
- HTTP API with Go 1.22+ ServeMux

## Constraints/Assumptions:
- Go 1.25.5, module: crimekickershub
- SQLite with WAL mode (no external DB)
- Google OAuth 2.0 with admin whitelist
- Cloudflare R2 for image storage
- YouTube for video hosting

## Key decisions:
- Use sqlc for type-safe SQL queries (not gorm/raw SQL)
- Prompts are never overwritten - version increment on update
- Media assets link to prompt_version_id for traceability
- Stories contain ordered StoryItems (images/video links)
- Auth uses secure cookies with base64 encoding
- Use standard Go 1.22+ http.ServeMux (no chi/gin)

## State:
7 tasks completed

## Done:
- Task 1: Project Initialization & Database Schema
  - Go module initialized (crimekickershub)
  - SQLite DB with WAL mode configured
  - 7 tables: entities, prompt_types, prompt_versions, media_assets, stories, story_items, users

- Task 2: Data Access Layer (SQLC)
  - sqlc.yaml configured for SQLite
  - 30+ queries in sql/queries/queries.sql
  - Generated repository package with interfaces

- Task 3: Prompt Engine Service
  - PromptService with ComposePrompt, SaveNewVersion, GetPromptDiff
  - Unit tests for version increment logic
  - go-diff library for text comparison

- Task 4: Media Service & Cloudflare R2
  - R2Client with UploadImage and UploadImageFromPath
  - MediaService with RegisterAsset for image/video assets
  - YouTube URL parsing (ExtractYouTubeID, IsYouTubeURL)
  - Helper functions for embeds and thumbnails

- Task 5: Authentication (Google OAuth)
  - GoogleOAuth2 with oauth2.Config
  - Admin whitelist from ADMIN_EMAILS env var
  - Session cookie management (Set/Get/ClearSessionCookie)
  - RequireAdmin middleware for route protection
  - Context-based user info retrieval

- Task 6: HTTP Router & API Implementation
  - Router with public routes (/api/heroes, /api/entities, /api/comics)
  - Admin routes protected by RequireAdmin middleware
  - POST /compose, POST /save, GET /diff for prompts
  - POST /upload, POST /assets for media
  - POST /stories, POST /stories/{id}/items for story management
  - Main server with logging, recovery middleware
  - Graceful shutdown with signal handling

- Task 7: Frontend Integration (http.Dir)
  - StaticHandler serving frontend files from filesystem (not embed)
  - SPA fallback serving index.html for non-existent paths
  - FRONTEND_PATH env var (default: frontend/dist)
  - Works seamlessly with Docker deployments
  - Dual-mux architecture: API mux for /api/*, static for everything else
  - Fixes Go 1.22+ ServeMux pattern conflicts by routing at request time

## Now:
All 7 tasks completed. Ready for production or next phase.

## Next:
Task 7: Docker & Deployment (likely)

## Open questions (UNCONFIRMED if needed):
- Need to clarify deployment requirements

## Working set (files/ids/commands):
- cmd/server/main.go
- internal/api/router.go
- go build ./...
- go run cmd/server/main.go
