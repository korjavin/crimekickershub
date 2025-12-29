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

## State:
8 tasks completed (Task 8 just finished)

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

- Task 8: Frontend Config, Proxy & UI Libs (COMPLETED)
  - Initialized React + Vite + TypeScript project
  - Installed and configured Tailwind CSS v4 with @tailwindcss/vite
  - Configured path aliases (@/ → src/)
  - Configured dev server proxy for /api → http://localhost:8080
  - Installed shadcn/ui components: button, input, textarea, card, dialog, select, tabs, scroll-area, separator, badge
  - Installed and configured dark mode with next-themes
  - Installed react-router-dom v6+
  - Created PublicLayout and AdminLayout components
  - Configured routing in App.tsx with public and admin routes
  - Updated main.tsx with ThemeProvider
  - Verified build output in frontend/dist/

## Now:
Task 8 completed. Frontend is ready with:
- Development server proxy for API calls
- Production build in frontend/dist/
- All shadcn/ui components installed
- Routing configured for public and admin sections
- Dark mode toggle functional

## Next:
Task 9: API Integration & State Management or Task 10: Feature Pages

## Open questions (UNCONFIRMED if needed):
- Need to clarify next task priority (API integration vs feature pages)

## Working set (files/ids/commands):
- frontend/vite.config.ts
- frontend/tsconfig.app.json
- frontend/src/index.css
- frontend/src/App.tsx
- frontend/src/main.tsx
- frontend/src/components/layouts/
- frontend/src/components/ui/
- cd frontend && npm run dev
- cd frontend && npm run build
