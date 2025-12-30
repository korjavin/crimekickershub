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
Task 19 (Story Builder) completed. All previous tasks and audit fixes resolved.

## Done:
- Task 1-18: Core infrastructure, Prompt Engine, Media Management, Auth, Public Presentation, Prompt Matrix, Traceability, Prompt Types.
- Audit Fix Session: Fixed critical bugs and improved stability.
- Task 19: Story Builder (Story Editor)
  - Backend: Implemented `PUT /items` for bulk reordering, `DELETE /items/{id}`, fixed `POST` slug generation.
  - Frontend: Renamed `StoryBuilderPage` to `StoryEditorPage`, implemented Media Library with Entity Filter, Story Timeline with Drag & Drop (`@dnd-kit`), and Preview Mode.
  - Integration: Verified full flow of creating story, adding/removing media, and reordering.

## Now:
Submitting Task 19.

## Next:
Review next tasks in the queue.

## Working set (files/ids/commands):
- internal/api/router.go
- frontend/src/pages/admin/StoryEditorPage.tsx
- frontend/src/lib/api.ts
- frontend/src/lib/api-types.ts
- frontend/src/App.tsx
