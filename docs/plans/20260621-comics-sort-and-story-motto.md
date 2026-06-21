# Comics Sort Selector + Story Motto/Slogan

## Overview
Two user-facing improvements to the public comics experience:

1. **Sort selector on `/comics`** — Today the comics list is hard-sorted newest-first
   (`ORDER BY created_at DESC`), which reads as "reversed". Add a sort control with two
   options (e.g. **Chronological** = oldest first, **Recent** = newest first) and default
   to **Chronological**. Implemented client-side (the `/api/comics` endpoint already
   returns all published stories), so no DB/API change is needed for sorting.

2. **Story motto/slogan** — Add an optional `motto` field to stories. It is editable in the
   admin Story editor (offered the same way audio is), and when filled it is shown on the
   user-facing comic cards and the comic detail (reader) page. The generic
   **"Cleared for distribution." / "Pending redaction review."** status line on the comic
   cards is removed and replaced by the motto (shown only when filled). The footer and
   home-masthead "cleared for distribution" brand taglines are **kept**.

**Benefits**: clearer default ordering, an editorial flavor line per comic, and less
boilerplate status text on cards.

## Context (from discovery)
Architecture: **Go (`net/http`) API backend + React 19 / TypeScript (Vite) frontend**.
DB is SQLite via **sqlc v1.30.0** (on PATH); schema source is the embedded migrations dir.

Files/components involved:
- **Sort + cards**: `frontend/src/pages/public/ComicListPage.tsx`
  - sort: no query-param today; list fetched from `/api/comics`
  - card status text: line ~165 `{story.published ? 'Cleared for distribution.' : 'Pending redaction review.'}`
- **Home card status text**: `frontend/src/pages/public/HomePage.tsx` line ~296 (same ternary)
- **Comic detail/reader**: `frontend/src/pages/public/ComicReaderPage.tsx` (title ~L83, audio ~L87)
- **Admin editor**: `frontend/src/pages/admin/StoryEditorPage.tsx` (audio card ~L872; `updateStoryMetadata` usage)
- **DB schema/migrations**: `internal/migrations/` (last = `009_add_story_audio.sql`; runner `migrations.go`)
- **sqlc**: `sqlc.yaml` (schema: `internal/migrations`, queries: `sql/queries`, out: `internal/repository`)
- **Queries**: `sql/queries/queries.sql` (`UpdateStory` :one at ~L163; `ListPublishedStories` ~L157)
- **Model**: `internal/repository/models.go` `Story` struct (~L62, has `AudioUrl sql.NullString`)
- **API handlers**: `internal/api/router.go`
  - `handleListStories` public `StoryDTO` (~L253)
  - `handleGetStoryBySlug` public detail response (~L300, audio at ~L344/354)
  - `handleGetStory` admin single (serialized map, audio at ~L1098/1110)
  - admin list `AdminStoryDTO` (~L1015)
  - `handleUpdateStory` input + response (~L1192; audio in/out at ~L1203/1245/1282/1299)
- **Tests**: `internal/api/router_test.go` (Go `testing`, in-memory SQLite via `setupTestDB`, runs full migrations)

Related patterns found:
- The `audio_url` column (migration 009) is the **exact template** for adding `motto`:
  nullable `TEXT` column → `sql.NullString` in model → threaded through every story DTO →
  edited in the admin editor → uploaded/saved via `updateStoryMetadata` → `handleUpdateStory`.

Dependencies identified:
- `sqlc generate` regenerates `internal/repository/models.go` + `queries.sql.go` from the
  migration schema + queries. (sqlc is on PATH at `~/go/bin/sqlc`.)

## Development Approach
- **Testing approach**: **Regular** (implement, then add/update tests before next task).
- Complete each task fully before moving to the next; small, focused changes.
- **CRITICAL: every code task MUST include new/updated tests.**
  - Backend (Go): unit tests in `internal/api/router_test.go` (and a migration check) for
    success + error/edge scenarios. Must pass before next task.
  - Frontend (React/TS): **there is no frontend unit-test framework in this repo** (only Go
    tests exist). The automatable verification for frontend tasks is therefore
    `npm run build` (TypeScript typecheck) **and** `npm run lint` — both must pass before the
    next task. Behavioral UI checks are listed in Post-Completion (manual).
- **CRITICAL: all checks must pass before starting the next task** — no exceptions.
- **CRITICAL: update this plan file if scope changes during implementation.**
- Maintain backward compatibility: the new column is nullable/additive; empty motto renders nothing.

## Testing Strategy
- **Unit tests (Go)**: required for backend tasks (Tasks 1–2). Use `setupTestDB` pattern.
  - Migration: assert `stories` has a `motto` column after migrations.
  - API: round-trip a motto via the admin update endpoint; assert it appears in the public
    slug + list responses; assert an unset motto serializes as `null` (not `""`).
- **Frontend typecheck/lint**: required for frontend tasks (Tasks 3–5) — `npm run build` + `npm run lint`.
- **No e2e framework** present (no Playwright/Cypress); manual UI checks go in Post-Completion.

## Progress Tracking
- Mark completed items with `[x]` immediately when done.
- Add newly discovered tasks with ➕ prefix; document blockers with ⚠️ prefix.
- Keep this plan in sync with the actual work.

## What Goes Where
- **Implementation Steps** (`[ ]`): code, migrations, Go tests, typecheck/lint — all agent-automatable.
- **Post-Completion** (no checkboxes): manual UI/UX verification and deployment notes.

## Implementation Steps

### Task 1: Add `motto` column to stories and regenerate the DB layer
- [x] create `internal/migrations/010_add_story_motto.sql` with a comment header (mirroring `009`) and `ALTER TABLE stories ADD COLUMN motto TEXT;` (nullable, additive)
- [x] update `sql/queries/queries.sql` `UpdateStory` to include `motto = ?` in the `SET` clause (keep `RETURNING *`)
- [x] run `sqlc generate` and confirm `internal/repository/models.go` `Story` now has `Motto sql.NullString` and `UpdateStoryParams` includes `Motto`
- [x] run `go build ./...` — must compile (added `Motto: currentStory.Motto` at the existing `UpdateStory(...)` call site to keep the build green; Task 2 wires the input/output)
- [x] add a Go test (e.g. in `internal/api/router_test.go` or a new `internal/migrations` test) that runs migrations on a fresh DB and asserts via `PRAGMA table_info(stories)` that a `motto` column exists
- [x] run `go test ./...` — must pass before Task 2

### Task 2: Thread `motto` through the API handlers
- [x] `handleUpdateStory` (router.go ~L1192): add `Motto *string` to the input struct; build `motto := sql.NullString{...}` mirroring the `audio_url` logic (null when empty); pass it into the `UpdateStory` params; add `Motto *string` to the response struct and populate it
- [x] `handleGetStoryBySlug` (router.go ~L300): add `Motto *string` to the response struct and set it from `story.Motto` (null when `!Valid`), mirroring `AudioURL`
- [x] `handleListStories` public `StoryDTO` (router.go ~L253): add a `Motto *string` JSON field and populate it in the loop
- [x] `handleGetStory` admin single (router.go ~L1098): add `motto` to the serialized response map as a `*string` (null when unset), mirroring `audio_url`
- [x] admin list `AdminStoryDTO` (router.go ~L1015): add `Motto *string` and populate it (keeps the editor list consistent)
- [x] add/extend Go tests in `router_test.go`: PUT a story with a motto via the admin update endpoint, then assert it is returned by the public slug endpoint and the public list endpoint; assert that omitting/clearing motto serializes as JSON `null`
- [x] run `go test ./...` — must pass before Task 3

### Task 3: Admin editor — add the motto/slogan input ("offer to fill" like audio)
- [x] locate the frontend API client types that carry `audio_url` (`frontend/src/lib/api-types.ts` + `frontend/src/lib/api.ts`) and add `motto?: string | null` to the `Story` type (inherited by `StoryWithItems`) and `motto?: string` to the `updateStoryMetadata` payload type
- [x] in `frontend/src/pages/admin/StoryEditorPage.tsx`, add a "Motto / Slogan" `Card` (right after the Comic Audio card): a short optional single-line `Input` (maxLength 120), prefilled from the loaded story's `motto`, with a "Save motto" action that calls `updateStoryMetadata(storyId, { motto })` (trimmed; empty string clears it), with the same loading/disabled pattern as audio
- [x] update local editor state/types so the motto field reflects the saved value after update (render-phase reset keyed on `storyWithItems.id`; handler updates both `storyWithItems.motto` and the draft from the API response)
- [x] run `npm run build` (TypeScript typecheck) — passes
- [x] run `npm run lint` — introduces 0 new problems (repo baseline is 42 pre-existing problems, unchanged by this task; lint fails repo-wide on a newly-enforced `react-hooks/set-state-in-effect` rule in 14 untouched files — the motto sync deliberately uses a render-phase reset to avoid adding to that count)

### Task 4: Comics list — add the sort selector (default Chronological)
- [ ] in `frontend/src/pages/public/ComicListPage.tsx`, add sort state `useState<'chronological' | 'recent'>('chronological')`
- [ ] derive the displayed list with `useMemo`, sorting by `created_at` (`new Date(a.created_at).getTime() - new Date(b.created_at).getTime()` for chronological; reverse for recent); render from the sorted list instead of the raw fetch order
- [ ] add a small sort control (native `<select>` or existing UI control) labeled e.g. "Sort: Chronological / Recent", styled to match the page
- [ ] run `npm run build` — must pass
- [ ] run `npm run lint` — must pass before Task 5

### Task 5: Show motto on public pages and remove the card status text
- [ ] `ComicListPage.tsx` (~L165): replace the `{story.published ? 'Cleared for distribution.' : 'Pending redaction review.'}` line with the motto — render the motto element only when `story.motto` is non-empty, otherwise render nothing
- [ ] `HomePage.tsx` (~L296): apply the same replacement (motto when filled, else nothing) on the "Latest dossiers" cards
- [ ] `ComicReaderPage.tsx` (~L84, under the title): render the motto when `story.motto` is non-empty (e.g. a tagline/italic line), else nothing
- [ ] confirm the footer (`PublicLayout.tsx:59`) and home masthead eyebrow (`HomePage.tsx:52`) "cleared for distribution" taglines are left untouched
- [ ] run `npm run build` — must pass
- [ ] run `npm run lint` — must pass before Task 6

### Task 6: Verify acceptance criteria
- [ ] verify `/comics` defaults to chronological (oldest first) and the selector switches to recent (newest first)
- [ ] verify a story with a motto shows it on the list card, home card, and reader page; a story without a motto shows no status/motto line there
- [ ] verify motto is editable in the admin editor and persists (round-trips through the API)
- [ ] run full Go test suite `go test ./...` — must pass
- [ ] run `npm run build` and `npm run lint` — must pass
- [ ] verify `go build ./...` produces a clean build

### Task 7: [Final] Update documentation
- [ ] update `README.md` / project docs if they enumerate story fields or migrations (add `motto`)
- [ ] note the new migration `010_add_story_motto.sql` if migrations are documented anywhere

*Note: ralphex automatically moves completed plans to `docs/plans/completed/`.*

## Technical Details
- **Migration**: `internal/migrations/010_add_story_motto.sql` →
  `ALTER TABLE stories ADD COLUMN motto TEXT;` (nullable; existing rows get `NULL`).
- **Model** (sqlc-generated): `Story.Motto sql.NullString`; `UpdateStoryParams.Motto sql.NullString`.
- **Query**: `UpdateStory` SET list gains `motto = ?` (param order set by sqlc — re-check the
  generated `UpdateStoryParams` field order when wiring the call site).
- **JSON contract**: `motto` is serialized as `*string` so an unset value is JSON `null`
  (not `""`), matching how `audio_url` is handled. Empty/whitespace input clears it.
- **Sort**: purely client-side over the already-fetched list; `created_at` is an ISO string,
  compared via `new Date(...).getTime()`. Default `'chronological'` (ascending).
- **Display rule**: motto renders only when non-empty; it replaces the removed per-card
  status line; footer + masthead brand taglines are unchanged.

## Post-Completion
*Manual / external — no checkboxes, informational only.*

**Manual verification**:
- On `https://hub.wandergeek.org/comics`: confirm default order is oldest→newest, the
  selector flips to newest→oldest, and the choice updates the grid immediately.
- In the admin Story editor: enter a motto, save, reload, and confirm it persists; clear it
  and confirm the public line disappears.
- Visually confirm the motto placement reads well on cards and the reader page, and that the
  footer/masthead "cleared for distribution" taglines still appear.

**Deployment**:
- Migration `010` runs automatically at startup (embedded, transactional, tracked in
  `app_schema_migrations`) — no manual DB step needed.
- Frontend change requires a normal frontend build/deploy.
