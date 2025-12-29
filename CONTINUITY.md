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

- Task 17: Prompt Types Sidebar Integration (COMPLETED)
  - Added "Prompt Types" link to AdminLayout sidebar navigation
  - Route /admin/types now accessible from admin sidebar
  - Resolves final missing item from Task 17 requirements

- Task 18: Prompt Studio Logic (The Mixer Wiring) (COMPLETED)
  - Connected PromptMixer to backend compose API via onPromptGenerated callback
  - Updated callback signature to pass (prompt, entityIds, typeSlug)
  - Connected PromptMixer selected entities to PromptResult component
  - State flows: Mixer → PromptStudioPage → PromptResult
  - Renamed labels: "Entity" → "Subject(s) & Location", "Type" → "Generator Template"
  - Added Villains section to entity selection (Heroes, Villains, Locations)
  - Updated button text: "Generate Prompt" → "✨ Mix Prompt"
  - Added placeholder text: "Select subjects and a template, then click Mix."
  - Added selected subjects display badge in Result Editor
  - Added isGenerating state for better loading UX

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
Manual testing session complete - 6 critical bugs fixed and committed

## Next:
Continue manual testing to find any remaining issues

## Manual Testing Session (2025-12-29):

### Issue #1: MediaPage null reference error (FIXED)
**Found:** MediaPage (/admin/media) shows empty page with console error: "Cannot read properties of null (reading 'filter')"

**Root Cause:** Backend API returns `null` instead of empty array `[]` when no media assets exist in database

**Fix Applied:**
1. Frontend ([MediaPage.tsx:62-64](frontend/src/pages/admin/MediaPage.tsx#L62-L64)): Added null coalescing to ensure state always has arrays
   ```typescript
   setMediaAssets(mediaData || []);
   setRecentVersions(versionsData || []);
   setEntities(entitiesData || []);
   ```

2. Backend ([router.go:501-504](internal/api/router.go#L501-L504)): Added null check in `handleListMedia`
   ```go
   if assets == nil {
       assets = []repository.MediaAsset{}
   }
   ```

3. Test ([router_test.go:434-476](internal/api/router_test.go#L434-L476)): Created `TestListMediaEndpoint` to prevent regression
   - Verifies endpoint returns empty array, not null
   - Tests with authenticated admin user
   - All API tests passing ✓

**Verified:** Page now loads correctly with empty state message

### Issue #2: Image upload fails with 500 error (FIXED)
**Found:** Uploading avatar in EntitiesPage returns "Upload Error: 500 Internal Server Error"

**Root Cause:** Application wasn't loading `.env` file, so R2 credentials weren't being read from environment

**Fix Applied:**
1. Added godotenv package ([main.go:20,24-25](cmd/server/main.go#L20,L24-L25))
   ```go
   import "github.com/joho/godotenv"

   // Load .env file if it exists (ignore error if not found)
   _ = godotenv.Load()
   ```

2. Created [.env.example](.env.example) with R2 credential placeholders and setup instructions

3. Installed dependency: `go get github.com/joho/godotenv`

**Next Steps for User:**
1. Fill in R2 credentials in `.env` file:
   - Get credentials from https://dash.cloudflare.com/ -> R2
   - Create a bucket and API token
   - Set up custom domain for public access
   - Update these variables in `.env`:
     - `R2_ACCESS_KEY_ID`
     - `R2_SECRET_ACCESS_KEY`
     - `R2_ACCOUNT_ID`
     - `R2_BUCKET_NAME`
     - `R2_PUBLIC_DOMAIN`
2. Restart the server to load credentials

**Note:** Server will run in "degraded mode" without R2 credentials (uploads disabled but everything else works)

**Verified:** R2 uploads now working, credentials loaded successfully

### Issue #3: WikiPage crashes with "Objects are not valid as React child" (FIXED)
**Found:** Public wiki page (/wiki) shows empty page with React error about rendering object with `{String, Valid}` keys

**Root Cause:** Backend was returning `sql.NullString` objects directly in JSON instead of serializing them properly to `string | null`

**Fix Applied:**
1. Created DTOs for proper JSON serialization ([router.go:885-982](internal/api/router.go#L885-L982)):
   - `EntityDTO` with proper null handling for description, avatar_url, created_at
   - `MediaAssetDTO` with computed url and thumbnail_url fields
   - Helper functions: `toEntityDTO`, `toEntityDTOs`, `toMediaAssetDTO`, `toMediaAssetDTOs`

2. Updated all entity endpoints to use DTOs:
   - `handleListHeroes` ([router.go:158](internal/api/router.go#L158))
   - `handleListEntities` ([router.go:168](internal/api/router.go#L168))
   - `handleCreateEntity` ([router.go:704](internal/api/router.go#L704))
   - `handleUpdateEntity` ([router.go:766](internal/api/router.go#L766))

3. Updated media endpoints to use DTOs with computed URLs:
   - `handleUploadMedia` ([router.go:428](internal/api/router.go#L428))
   - `handleListMedia` ([router.go:505](internal/api/router.go#L505))

**Impact:**
- WikiPage now renders correctly with proper string values
- Avatar preview works in EntitiesPage after upload (url field now included)
- All entity/media APIs return properly formatted JSON

**Verified:** WikiPage loads, entities display with descriptions, avatars show after upload

### Issue #4: Hero filter not working & avatar images not showing (FIXED)
**Found:**
1. WikiPage shows Windman in "All" category but not in "Hero" category despite type='Hero'
2. Avatar images not displaying (broken image link)

**Root Cause:**
1. SQL query was case-sensitive: searching for type='hero' but entity has type='Hero'
2. R2_PUBLIC_DOMAIN in .env was missing `https://` protocol prefix

**Fix Applied:**
1. Made entity type filter case-insensitive ([queries.sql:29](sql/queries/queries.sql#L29)):
   ```sql
   SELECT * FROM entities WHERE LOWER(type) = LOWER(?) ORDER BY name;
   ```
   Regenerated repository with `go generate ./...`

2. Updated .env file to include `https://` in R2_PUBLIC_DOMAIN:
   ```
   R2_PUBLIC_DOMAIN=https://img.cc.wandergeek.org
   ```

3. Updated [.env.example](.env.example#L29-L30) with note about protocol requirement

**Verified:**
- Hero filter now shows entities with any case (Hero, hero, HERO) after regenerating sqlc code
- Avatar images display correctly with proper HTTPS URLs
- **Note:** Required running `sqlc generate` manually as `go generate` didn't regenerate repository code

### Issue #5: Double URL prefix in avatar_url & missing Windman avatar (FIXED)
**Found:**
1. Pho-boman avatar_url has double prefix: `https://img.cc.wandergeek.org/https://img.cc.wandergeek.org/...`
2. Windman has null avatar_url despite upload

**Root Cause:**
- Database was storing inconsistent data in avatar_url field:
  - Pho-boman had doubled URL prefix from earlier incorrect DTO logic
  - Windman's avatar was uploaded but never set on entity record
- EntityDTO was already correct (just passes through avatar_url value)
- Upload system stores media in media_assets table but doesn't auto-link to entities

**Decision Made:**
Option B - Store full URL in avatar_url field, no computation in EntityDTO

**Fix Applied:**
1. Verified EntityDTO ([router.go:907-909](internal/api/router.go#L907-L909)) already correct - just passes through stored value
2. Fixed corrupted data in database:
   ```sql
   -- Fixed Pho-boman's double URL
   UPDATE entities SET avatar_url = 'https://img.cc.wandergeek.org/ElevenLabs_image_gpt-image-1-5_Pho-boman __..._2025-12-29T17_24_39.png' WHERE id = 2;

   -- Set Windman's avatar URL from media_assets
   UPDATE entities SET avatar_url = 'https://img.cc.wandergeek.org/ElevenLabs_image_flux-2-pro_Windman_Over..._2025-12-29T17_32_38.png' WHERE id = 1;
   ```

**Verified:**
- API endpoint `/api/heroes` returns both heroes with proper avatar URLs
- API endpoint `/api/entities?type=Hero` returns both heroes (case-insensitive filter working)
- Avatar URLs have proper `https://` prefix
- No double URL prefix issue
- EntityDTO correctly passes through stored URLs without computation

### Issue #6: Location/Villain category filters not working (FIXED)
**Found:** Created "Sky Isles" entity with type="Location", but it only shows in "All" category, not in "Locations" category

**Root Cause:** Frontend WikiPage was doing case-sensitive comparison between filter button value (lowercase: `'location'`) and entity type (proper case: `'Location'`)

**Fix Applied:**
Changed WikiPage.tsx ([WikiPage.tsx:39](frontend/src/pages/public/WikiPage.tsx#L39)) to use case-insensitive comparison:
```typescript
: entities.filter(e => e.type.toLowerCase() === filter.toLowerCase());
```

**Impact:**
- All category filters now work: All, Heroes, Villains, Locations
- Frontend filter matches backend case-insensitive SQL query pattern
- Consistent case-insensitive behavior across entire application

**Verified:**
- Location filter shows "Sky Isles" entity
- Hero filter shows "Windman" and "Pho-boman" entities
- Case-insensitive filtering works for all entity types

### Issue #7: Roti villain avatar not showing & API filter not working (FIXED)
**Found:**
1. Created "Roti" villain entity with uploaded image, visible in R2 bucket but not showing in admin or public pages
2. API endpoint `/api/entities?type=Villain` returning all entities instead of just villains

**Root Cause:**
1. `extractR2Key()` function had bug: was looking for prefix with double slash `"https://img.cc.wandergeek.org//"` instead of single slash
2. This caused r2_key field to store full URLs instead of just filenames
3. When `toMediaAssetDTO` computed URL, it added domain prefix again → double URL
4. `handleListEntities` didn't implement the `type` query parameter filtering

**Fix Applied:**
1. Fixed `extractR2Key()` in [media.go:111-112](internal/service/media/media.go#L111-L112):
   ```go
   // The prefix from GetPublicURL("") already ends with "/", so just trim it directly
   if strings.HasPrefix(url, prefix) {
       return strings.TrimPrefix(url, prefix)
   }
   ```

2. Added type filtering to [router.go:162-181](internal/api/router.go#L162-L181):
   ```go
   func (r *Router) handleListEntities(w http.ResponseWriter, req *http.Request) {
       // Check if filtering by type
       entityType := req.URL.Query().Get("type")
       if entityType != "" {
           entities, err = r.repo.ListEntitiesByType(req.Context(), entityType)
       } else {
           entities, err = r.repo.ListEntities(req.Context())
       }
       ...
   }
   ```

3. Fixed corrupted data in database:
   ```sql
   -- Fixed all media_assets r2_key to store only filename
   UPDATE media_assets SET r2_key = REPLACE(r2_key, 'https://img.cc.wandergeek.org/', '');

   -- Fixed Roti's double URL in entities
   UPDATE entities SET avatar_url = 'https://img.cc.wandergeek.org/ElevenLabs_image_flux-2-pro_Roti – _Body..._2025-12-29T20_58_36.png' WHERE id = 4;
   ```

**Impact:**
- All future uploads will now store only R2 key (filename) in media_assets table
- `toMediaAssetDTO` correctly computes full URL from R2 key
- No more double URL prefix issues
- API filtering by type now works correctly

**Verified:**
- `/api/entities?type=Villain` returns only Roti (correct filtering)
- `/api/entities?type=Hero` returns only Windman and Pho-boman
- `/api/entities?type=Location` returns only Sky Isles
- All avatar URLs are correct with single domain prefix
- Roti villain avatar displays correctly in both admin and public pages

### Issue #8: PromptStudioPage null reference error (FIXED)
**Found:** Navigating to `/admin/prompts` shows error: "Cannot read properties of null (reading 'map')" in PromptMixer.tsx:118

**Root Cause:** Same pattern as Issue #1 - backend API endpoints returning `null` instead of empty arrays `[]` when no data exists, and frontend not handling null responses

**Fix Applied:**
1. Frontend ([PromptMixer.tsx:26-27](frontend/src/components/prompts/PromptMixer.tsx#L26-L27)): Added null coalescing
   ```typescript
   setEntities(entitiesData || []);
   setPromptTypes(typesData || []);
   ```

2. Backend: Added null checks to all list endpoints in router.go:
   - `handleListPromptTypes` (lines 281-283)
   - `handleListStories` (lines 190-192)
   - `handleListPromptVersions` (lines 393-395)
   - `handleListRecentPromptVersions` (lines 407-409)
   - `handleListStoriesAdmin` (lines 539-541)

**Impact:**
- Consistent null safety across all API list endpoints
- Frontend components handle null API responses gracefully
- No more React rendering errors from null data

**Verified:**
- PromptStudioPage now loads correctly with empty state
- All list endpoints return empty arrays instead of null
- No console errors when navigating to admin pages with empty data

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
