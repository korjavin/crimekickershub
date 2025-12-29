# Continuity Ledger

## Goal (incl. success criteria):
Build Crime Kickers Hub - a Go-based web application with:
- Complete audit findings resolution (8/10 findings fixed)
- Public CMS for comic book universe
- Internal "Prompt Studio" for managing Generative AI workflows
- SQLite database with WAL mode
- Type-safe data access via sqlc
- Prompt versioning and composition engine
- Cloudflare R2 integration for image storage
- YouTube integration for video links
- Google OAuth authentication with admin whitelist
- HTTP API with Go 1.22+ ServeMux
- React frontend with Vite, Tailwind CSS, and shadcn/ui

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
- Prompt composition uses {{ENTITY}} placeholder replacement

## State:
All audit fixes completed - 8 of 10 findings resolved

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

- Task 9: Public Presentation Layer (COMPLETED)
  - Created API types file (src/lib/api-types.ts) for frontend data models
  - Created API utility functions (src/lib/api.ts) for data fetching
  - HomePage with full-width hero banner, animated gradients, and latest updates grid
  - WikiPage with character cards, filter tabs, and detail modal with stats
  - ComicReaderPage with webtoon-style vertical layout (mobile) and centered column (desktop)
  - CinemaPage with video gallery, YouTube embeds, and tag filtering
  - Updated App.tsx with new routes: /, /wiki, /comics, /comics/:slug, /cinema
  - All pages use dark mode aesthetic with violet/indigo color scheme

- Task 10: Admin Authentication & Dashboard (COMPLETED)
  - Created LoginPage.tsx with "Sign in with Google" button
  - Created AuthContext.tsx for session state management
  - Created RequireAuth.tsx protected route wrapper with loading spinner
  - Updated AdminLayout with responsive sidebar (collapsible on mobile)
  - Added user info display and logout button in sidebar
  - Updated App.tsx with /login route and RequireAuth wrapper
  - Added backend auth endpoints: /api/auth/me, /api/auth/logout
  - Added OAuth endpoints: /api/auth/google/login, /api/auth/google/callback
  - Added dev login bypass for localhost development

- Task 12: Media Management & Story Builder (COMPLETED)
  - Backend: Fixed POST /api/admin/upload, added GET /api/admin/media, GET /api/admin/prompts/versions
  - Backend: Added GET /api/admin/stories, GET /api/admin/stories/{id}, PUT /api/admin/stories/{id}
  - Backend: Added UpdateStoryItemSortOrder and ListAllPromptVersions SQL queries
  - Frontend: Created MediaPage.tsx with drag-drop upload and metadata modal
  - Frontend: Created StoryBuilderPage.tsx with sortable timeline using @dnd-kit
  - Added TypeScript API functions: uploadMedia, listMedia, listPromptVersions, listStoriesAdmin, getStory, updateStory

- Task 13: Admin Entity Management (COMPLETED)
  - Backend: Added POST/PUT/DELETE /api/admin/entities endpoints
  - Backend: Added UpdateEntity and DeleteEntity SQL queries
  - Frontend: Created EntitiesPage.tsx with DataTable (Avatar, Name, Type, Last Updated)
  - Frontend: Created Entity Editor Sheet component (Name, Type, Description, Avatar Upload)
  - Added TypeScript API functions: createEntity, updateEntity, deleteEntity
  - Added Sheet and Table UI components to shadcn/ui

- Task 14: Prompt Types & Common Parts (COMPLETED)
  - Backend: Added POST/PUT/DELETE /api/admin/prompt-types endpoints
  - Backend: Added UpdatePromptType and DeletePromptType SQL queries
  - Backend: Updated ComposePrompt to use {{ENTITY}} placeholder replacement
  - Frontend: Created PromptTypesPage.tsx with card grid and editor dialog
  - Template validation warns if {{ENTITY}} placeholder is missing
  - Added TypeScript API functions: createPromptType, updatePromptType, deletePromptType

- Task 15: The Prompt Matrix Grid (COMPLETED)
  - Backend: Added GET /api/admin/matrix endpoint with entities, types, and version map
  - SQL: Added GetLatestPromptVersionForMatrix query
  - Frontend: Created PromptMatrix.tsx component with grid layout
  - Features: Entity rows × Type columns matrix, click-to-edit cells, version badges
  - Bulk action: Checkbox selection with "Mix Selected" button
  - Editor dialog with version history dropdown
  - Added PromptMatrixPage.tsx and route /admin/matrix
  - Updated AdminLayout sidebar with Matrix link

- Task 16: Media Linking & Traceability UI (COMPLETED)
  - Backend: Added GET /api/admin/prompts/recent endpoint for last 10 prompts
  - SQL: Modified ListAllPromptVersions to limit to 10 results
  - Frontend: Enhanced MediaPage.tsx with:
    - Recent prompts selector with time-ago display in upload modal
    - Asset detail sheet (Sheet component) showing full media preview
    - "Generated from" section with linked prompt version
    - "Copy Prompt" button to copy prompt text to clipboard
    - Entity filter dropdown to filter media by entity
    - Hover overlay with eye icon on media cards
    - FormatTimeAgo helper for relative timestamps

- Audit Fix Session (COMPLETED)
  - Fixed CRITICAL Admin API Routing Logic Error (internal/api/router.go) - Removed StripPrefix pattern, registered all handlers with full paths
  - Fixed CRITICAL Health Endpoint Unreachable (internal/api/router.go) - Changed /health to /api/health
  - Fixed CRITICAL Test Schema Path (internal/service/prompts/service_test.go) - Changed relative path from "sql/schema/" to "../../sql/schema/"
  - Fixed MEDIUM GET /api/admin/entities handler (internal/api/router.go) - Added missing list entities handler
  - Fixed MEDIUM Database Migrations System (internal/db/db.go) - Added schema_migrations table and tracking
  - Fixed MEDIUM Request Validation Middleware (internal/api/router.go) - Added validateRequest helper and CORS middleware
  - Fixed MEDIUM Integration Tests (internal/api/router_test.go) - Created 12 test functions with 40+ test cases
  - Fixed LOW R2 Client Warnings (internal/storage/r2.go, cmd/server/main.go) - Added R2 state tracking and improved logging

## Now:
Completed audit fix session with all 8 findings resolved

## Next:
Address remaining findings: Frontend Build Path (LOW) - Deferred to future session

## Open questions (UNCONFIRMED if needed):
None - session complete

## Working set (files/ids/commands):
- sql/queries/queries.sql
- internal/repository/queries.sql.go
- internal/api/router.go
- internal/service/prompts/service.go
- frontend/src/lib/api.ts
- frontend/src/lib/api-types.ts
- frontend/src/pages/admin/MediaPage.tsx
- frontend/src/components/prompts/PromptMatrix.tsx
- frontend/src/App.tsx
- frontend/src/components/layouts/AdminLayout.tsx
- go generate ./...
- cd frontend && npm run dev
