# Comic Audio + Rename

## Overview
Add two capabilities to comics (internally `stories`):

1. **Audio per comic** — upload one audio file per comic in the admin (reusing the
   existing presigned-URL R2 upload flow, exactly like images), and surface a
   **Play** control on the public comic page that plays it.
2. **Rename a comic** — let an admin change a comic's title; the URL slug is
   regenerated from the new title (per decision) with collision-safe uniqueness.

**Problem it solves:** today a comic's title can only be set at creation time
(no rename UI), and there is no way to attach narration/soundtrack audio to a
comic. The backend already accepts `title`/`slug` updates via
`PUT /api/admin/stories/{id}`, so rename is largely a UI gap; audio is a new
end-to-end capability.

**Integration:** audio is stored as a single nullable `audio_url` column on the
`stories` table (full public R2 URL, mirroring the existing `cover_image_url`
column). Upload reuses `POST /api/admin/upload/presigned` (already content-type
agnostic) — no new upload endpoint and no `media_asset` row is needed for audio.

## Context (from discovery)
- **Comics = `stories`** (`internal/migrations/001_initial.sql`), composed of ordered
  `story_items` → `media_assets` (`image` | `video` | `text`).
- **Public reader:** `frontend/src/pages/public/ComicReaderPage.tsx` →
  `frontend/src/components/ComicReader.tsx` (renders panels; consumes
  `PublicStory { title, items }`).
- **Admin editor:** `frontend/src/pages/admin/StoryEditorPage.tsx` (create story,
  publish toggle, drag/drop items, delete). **No rename UI today** — title is only
  set in the create dialog.
- **Story handlers** (`internal/api/router.go`):
  - `handleUpdateStory` (PUT `/api/admin/stories/{id}`) already accepts
    `title`/`slug`/`coverImageUrl`/`published` (preserve-or-update pattern).
  - `handleGetStory` (admin) returns story + items as a `map[string]interface{}`.
  - `handleGetStoryBySlug` (public) returns `PublicStoryResponse { Title, Items }`.
- **Image upload:** `frontend/src/lib/api.ts#uploadMedia` — presigned URL → `PUT` to
  R2. The presigned endpoint `handleGetPresignedUploadURL` accepts an arbitrary
  `contentType` and returns `{ uploadURL, key, publicURL }`. Audio reuses this.
- **sqlc** (`sqlc.yaml`) reads schema from `internal/migrations/` and queries from
  `sql/queries/queries.sql`; `sqlc` v1.30.0 is installed (`/Users/iv/go/bin/sqlc`).
- **Data model decision:** add `stories.audio_url TEXT` (NOT a `media_asset`).
- **R2:** presigned PUT carries the client's `Content-Type` (e.g. `audio/mpeg`),
  so the object is stored with a correct content type for inline `<audio>` playback.

### ⚠️ Pre-existing blocker (must fix first)
The Go test suite is **currently red**. `internal/api/router_test.go` and
`internal/service/prompts/service_test.go` call
`db.InitSchema(testDB, ".../sql/schema/001_initial.sql", ...)`, but that file/dir
**does not exist** (schema moved to `internal/migrations/`). Every DB-backed test
fails with `failed to read schema file`. We repair this in Task 0 so the suite is
green and new tests can pass against the same schema as production.

## Development Approach
- **testing approach**: Regular (implementation first, then tests in the same task).
- complete each task fully before moving to the next.
- make small, focused changes; maintain backward compatibility.
- **Backend (Go):** every backend task adds/updates tests; **all tests must pass**
  (`go test ./...`) before starting the next task.
- **Frontend (React/TS):** the project has **no unit-test framework** (only `tsc`
  typecheck + `eslint`); we will **not** add one (YAGNI). The gate for frontend
  tasks is: `npm run build` (`tsc -b && vite build`) **and** `npm run lint` pass,
  plus the manual-verification scenarios in Post-Completion.

## Testing Strategy
- **unit tests (backend):** required for every Go task — handler/repository tests
  using the existing `setupTestDB` + `httptest` patterns in `internal/api`.
- **frontend:** no automated tests exist; treat `npm run build` + `npm run lint`
  as the required gate for each frontend task. No e2e framework is present (no
  Playwright/Cypress), so end-to-end audio playback / rename flows are covered by
  the manual checklist in Post-Completion.

## Progress Tracking
- mark completed items `[x]` immediately when done.
- add newly discovered tasks with ➕ prefix; blockers with ⚠️ prefix.
- keep this plan in sync with actual work.

## Solution Overview
- **Storage:** `stories.audio_url TEXT NULL` holds the full public R2 URL of the
  comic's single audio file (parallel to `cover_image_url`).
- **Upload:** frontend gets a presigned URL (`/api/admin/upload/presigned`) with the
  audio file's content type, `PUT`s the file to R2, then saves the returned
  `publicURL` to the story via `PUT /api/admin/stories/{id}` (`audio_url`). No
  `media_asset` / `story_item` is created for audio, so it never renders as a panel.
- **Rename:** admin edits the title; frontend regenerates the slug from the new
  title and sends `{ title, slug }`. Backend ensures the slug is unique (appends
  `-2`, `-3`, … on collision) before persisting.
- **Playback:** the public comic response includes `audio_url`; the reader page
  shows a Play control (native `<audio controls>`) when present.

### Key design decisions & rationale
- **Column over `media_asset`:** "one audio per comic" maps cleanly to one nullable
  column; avoids `story_items` plumbing and the risk of audio showing as a panel.
- **Reuse presigned upload:** the endpoint is already content-type agnostic; adding
  a bespoke audio endpoint would duplicate logic (DRY).
- **No R2 cleanup of replaced/removed audio (for now):** matches the existing
  `cover_image_url` behavior (which also never deletes from R2). Listed as an
  optional follow-up in Post-Completion rather than scope creep here.

## Technical Details
- **Migration:** `ALTER TABLE stories ADD COLUMN audio_url TEXT;` (SQLite — additive,
  nullable; safe and backward compatible).
- **sqlc:** `Story` model gains `AudioUrl sql.NullString`. `UpdateStory` query gains
  `audio_url = ?`; regenerate with `sqlc generate`.
- **DTO/JSON:** expose as `audio_url` (`string | null`) in admin GET, public GET,
  and the update response.
- **Frontend types:** add `audio_url?: string | null` to `Story`, `StoryWithItems`,
  and `PublicStory`.

## What Goes Where
- **Implementation Steps** (`[ ]`): migration, sqlc regen, Go handlers + tests,
  frontend types/API/admin UI/public UI, typecheck/lint/build.
- **Post-Completion** (no checkboxes): manual UI verification, R2/bucket
  content-type & CORS sanity, optional R2 cleanup follow-up, deployment notes.

## Implementation Steps

### Task 0: Repair the Go test harness (pre-existing blocker)

**Files:**
- Modify: `internal/api/router_test.go`
- Modify: `internal/service/prompts/service_test.go`

- [x] in `router_test.go#setupTestDB`, replace the `db.InitSchema(testDB, schemaPath, "001_initial")` call (which reads the missing `sql/schema/001_initial.sql`) with `migrations.RunMigrations(testDB)` so the test DB is built from the embedded migrations (the same source sqlc and production use)
- [x] do the same in `internal/service/prompts/service_test.go` setup
- [x] remove now-unused locals/imports (`runtime`, `schemaPath`, `db.InitSchema` if unused) and add `crimekickershub/internal/migrations`
- [x] run `go test ./...` — entire suite must be **green** (establishes a passing baseline before any feature work)

### Task 1: Add `audio_url` to the stories schema (migration + sqlc)

**Files:**
- Create: `internal/migrations/008_add_story_audio.sql`
- Modify: `sql/queries/queries.sql`
- Modify: `internal/repository/models.go`, `internal/repository/queries.sql.go` (regenerated)
- Modify: `internal/api/router_test.go` (add round-trip test)

- [x] create `008_add_story_audio.sql` with `ALTER TABLE stories ADD COLUMN audio_url TEXT;`
- [x] update the `UpdateStory` query in `queries.sql` to set `audio_url = ?` (keep `RETURNING *`)
- [x] run `sqlc generate` and confirm `Story.AudioUrl sql.NullString` + `UpdateStoryParams.AudioUrl` are generated (if sqlc were unavailable, hand-edit the generated files to match)
- [x] write a Go test (in `internal/api/router_test.go`, reusing `setupTestDB`) that creates a story, calls `queries.UpdateStory` with a non-null `AudioUrl`, reads it back via `GetStoryByID`, and asserts the value round-trips
- [x] write a test asserting an existing story with no audio reads back `AudioUrl.Valid == false` (backward-compat / nullable)
- [x] run `go test ./...` — must pass before next task

### Task 2: Backend — accept & return `audio_url` in story handlers

**Files:**
- Modify: `internal/api/router.go` (`handleUpdateStory`, `handleGetStory`, `handleGetStoryBySlug`)
- Modify: `internal/api/router_test.go`

- [x] `handleUpdateStory`: add `AudioURL *string \`json:"audio_url"\`` to the input struct; preserve current value when nil, set/clear via `sql.NullString{String: *input.AudioURL, Valid: *input.AudioURL != ""}` when provided; pass it into `UpdateStoryParams`; include `audio_url` in the response struct
- [x] `handleGetStory` (admin): add `"audio_url"` to the response map (string or null)
- [x] `handleGetStoryBySlug` (public): add `AudioURL *string \`json:"audio_url"\`` to `PublicStoryResponse` and populate it from the story
- [x] write handler test: `PUT /api/admin/stories/{id}` with `audio_url` set persists and is returned; a follow-up `PUT` omitting `audio_url` preserves it; `audio_url:""` clears it
- [x] write handler test: public `GET /api/comics/{slug}` includes `audio_url` (null when unset, the URL when set)
- [x] run `go test ./...` — must pass before next task

### Task 3: Backend — collision-safe slug on rename

**Files:**
- Modify: `internal/api/router.go` (`handleUpdateStory` + a small slug-uniqueness helper)
- Modify: `internal/api/router_test.go`

- [x] add a helper (e.g. `ensureUniqueSlug(ctx, desired, currentStoryID) string`) that, when the desired slug differs from the story's current slug, checks `GetStoryBySlug`; if taken by a *different* story, appends `-2`, `-3`, … until free
- [x] call it in `handleUpdateStory` only when `input.Slug` is provided and changes; persist the resolved slug; return the resolved slug in the response
- [x] write handler test: renaming a story to a title whose slug collides with another story yields a suffixed unique slug (no UNIQUE-constraint 500)
- [x] write handler test: renaming with a non-colliding slug keeps the generated slug unchanged
- [x] run `go test ./...` — must pass before next task

### Task 4: Frontend — API types & client helpers

**Files:**
- Modify: `frontend/src/lib/api-types.ts`
- Modify: `frontend/src/lib/api.ts`

- [x] add `audio_url?: string | null` to `Story`, `StoryWithItems`, and `PublicStory`
- [x] add `uploadAudio(file: File): Promise<{ url: string }>` in `api.ts`: request a presigned URL (`/admin/upload/presigned` with `filename`, `contentType: file.type`), `PUT` the file to R2, return `{ url: presigned.publicURL }` (no thumbnail, no `/admin/assets` registration)
- [x] extend `updateStoryMetadata` to accept `audio_url?: string | null` in its payload
- [x] verify `npm run build` (tsc typecheck) and `npm run lint` pass (no TS unit-test framework exists — typecheck/lint is the gate)

### Task 5: Frontend admin — Rename UI in Story Editor

**Files:**
- Modify: `frontend/src/pages/admin/StoryEditorPage.tsx`

- [x] add a Rename control for the selected story (a small dialog or inline title `Input` + "Rename" button), prefilled with the current title
- [x] on save, call `updateStoryMetadata(id, { title, slug: generateSlug(title) })`; on success update both `storyWithItems.title` and the matching entry in the `stories` list (so the selector relabels); toast success/error
- [x] reflect the server-resolved slug from the response (in case it was suffixed for uniqueness)
- [x] verify `npm run build` and `npm run lint` pass

### Task 6: Frontend admin — Audio upload UI in Story Editor

**Files:**
- Modify: `frontend/src/pages/admin/StoryEditorPage.tsx`

- [ ] add an Audio section for the selected story: a file input with `accept="audio/*"`; on select call `uploadAudio(file)` then `updateStoryMetadata(id, { audio_url })`, with an uploading/disabled state and success/error toasts
- [ ] when `storyWithItems.audio_url` is set, render a native `<audio controls src={audio_url}>` preview plus a **Remove audio** button (calls `updateStoryMetadata(id, { audio_url: '' })`)
- [ ] keep local `storyWithItems.audio_url` state in sync after upload/remove
- [ ] verify `npm run build` and `npm run lint` pass

### Task 7: Frontend public — Play button on the comic page

**Files:**
- Modify: `frontend/src/pages/public/ComicReaderPage.tsx`
- Modify: `frontend/src/components/ComicReader.tsx` (only if the control lives inside the reader)

- [ ] when the loaded `story.audio_url` is present, render a Play control near the dossier title (native `<audio controls>` styled to the Riso theme, or a Play button that toggles an `<audio>` element) — keep it accessible and mobile-friendly
- [ ] render nothing audio-related when `audio_url` is absent (no empty player)
- [ ] verify `npm run build` and `npm run lint` pass

### Task 8: Verify acceptance criteria
- [ ] verify Overview requirements: audio uploads like images, one audio per comic, Play on the public comic page; comics can be renamed (title + regenerated, unique slug)
- [ ] verify edge cases: comic with no audio (no player), replacing audio, removing audio, rename causing slug collision
- [ ] run full backend suite: `go test ./...`
- [ ] run frontend gate: `npm run build` && `npm run lint` (no project e2e suite exists)

### Task 9: [Final] Update documentation & archive plan
- [ ] update `README.md` (Story Builder / Comic Reader sections) to mention per-comic audio + rename, if warranted
- [ ] update `CLAUDE.md`/`Agents.md` only if a new convention was introduced (e.g. test harness now builds schema via `migrations.RunMigrations`)
- [ ] move this plan to `docs/plans/completed/`

## Post-Completion
*Items requiring manual intervention or external systems — informational only.*

**Manual verification:**
- Admin: create/select a comic → upload an `.mp3`/`.m4a` → confirm the preview player works → open the public comic page → confirm Play works on desktop and mobile.
- Admin: rename a comic → confirm the selector + public title update and the new slug resolves (and a deliberately colliding title produces a suffixed slug).
- Replace audio with a new file, then Remove audio → confirm the public page drops the player.
- Confirm the public comic still loads correctly for comics that have **no** audio.

**External / infra checks:**
- Confirm the R2 bucket serves uploaded audio with the correct `Content-Type` and any CORS/range-request headers needed for inline `<audio>` seeking; large files rely on HTTP range support from R2.
- Presigned PUT uses the browser-provided `Content-Type`; verify common audio types upload cleanly (`audio/mpeg`, `audio/mp4`, `audio/ogg`).

**Optional follow-ups (out of scope):**
- Delete the previous audio object from R2 when audio is replaced/removed (the
  existing `cover_image_url` has the same "no cleanup" behavior; revisit together).
- Note: changing the slug on rename changes the public comic URL — old bookmarks/
  links 404. If this becomes a problem, consider redirects or decoupling slug from title.
