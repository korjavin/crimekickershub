# Merch Section (admin-managed promo + "I want it" interest counter)

## Overview
- Add a **Merch** section: admin-managed merch items (image + title + description), shown on a public Merch page, mirroring how Games/Heroes work today.
- Each public card has an **"I want it!"** button. Clicking it (1) increments an anonymous per-item interest counter and (2) shows a large promo banner explaining the section is still in progress, we're studying demand, and we'll plan production based on interest.
- Purpose for now is **promo + demand research**, not real sales. Admins see the interest counts per item to plan production. No personal data is collected, no checkout.
- Integrates by copying the self-contained **Games** pattern (own table, sqlc queries, handlers, admin CRUD page, public list page) and borrowing the **real R2 image-upload flow** from Heroes/Entities (Games only stores a typed URL; Merch uploads actual image files).

## Context (from discovery)
- **Stack:** Go 1.25 (`net/http` 1.22 method-pattern router), SQLite (`modernc.org/sqlite`) + Litestream, Cloudflare R2 for images, Google OAuth2 admin auth. Frontend is a React + TS (Vite) SPA with Tailwind + shadcn/ui, served by the Go binary. No server templates.
- **Closest analog — Games** (self-contained, mirror this):
  - Migration: `internal/migrations/008_add_games.sql`
  - Queries: `sql/queries/queries.sql` (Games block) → sqlc-generated into `internal/repository/{models.go,queries.sql.go,querier.go}`
  - Handlers + DTO: `internal/api/router.go` — `GameDTO` (~:2399), `gameInput` (~:2434), `handleListGames` (~:2446), `handleListGamesAdmin`, `handleCreateGame`, `handleUpdateGame`, `handleDeleteGame` (~:2555); `nullStr` helper (~:2283)
  - Route registration: `publicRoutes()` (~:112) and `adminRoutes()` (~:184)
  - API client: `frontend/src/lib/api.ts` (Game block ~:154-209)
  - Admin page: `frontend/src/pages/admin/GamesPage.tsx`
  - Public page: `frontend/src/pages/public/GamesPage.tsx`
- **Image upload (borrow from Heroes/Entities):** `frontend/src/pages/admin/EntitiesPage.tsx:140` calls `uploadMedia(file)` (`frontend/src/lib/api.ts:242`), which resizes a thumbnail (`image-utils.ts`), requests presigned PUT URLs via `POST /api/admin/upload/presigned` (`router.go handleGetPresignedUploadURL`), PUTs both files to R2, and returns `{ url, thumbnail_url }`. **No new upload endpoint needed.**
- **Migrations auto-apply:** `internal/migrations/migrations.go` embeds `*.sql` and applies by `NNN_` prefix. Latest is `010_add_story_motto.sql`, so the new file is `011_add_merch.sql` — no registration code.
- **Routing:** backend routes all in `internal/api/router.go` (`publicRoutes()` / `adminRoutes()`); frontend routes in `frontend/src/App.tsx` (public under `<PublicLayout>`, admin under `<RequireAuth><AdminLayout>`); nav in `components/layouts/{PublicLayout,AdminLayout}.tsx`.

## Development Approach
- **Testing approach:** NO unit tests. Add an integration test ONLY where it guards a real boundary that manual checking can't (see Testing Strategy). Most tasks will have none — that is expected.
- Complete each task fully before moving to the next; small, focused changes.
- **CRITICAL:** `internal/repository/*.go` is **sqlc-generated** — edit `sql/queries/queries.sql` then run `sqlc generate`; never hand-edit generated files.
- **CRITICAL:** if a task adds an integration test, it must pass before starting the next task.
- **CRITICAL:** update this plan file when scope changes during implementation.
- Maintain backward compatibility.

## Testing Strategy
- **Unit tests:** none.
- **Integration tests:** only at a real boundary. The one candidate is the public, unauthenticated `POST /api/merch/{id}/want` mutation — add a test for it **only if `internal/api/router_test.go` already provides a harness to mirror** (in-memory DB + router). Otherwise omit and rely on manual verification.
- **E2E tests:** the project has no e2e suite; do not stand one up.

## Progress Tracking
- Mark completed items with `[x]` immediately when done.
- Add newly discovered tasks with ➕ prefix; document blockers with ⚠️ prefix.
- Keep this plan in sync with actual work.

## Implementation Steps

### Task 1: Merch table, seed data, and sqlc queries
- [x] create `internal/migrations/011_add_merch.sql` mirroring `008_add_games.sql`; table `merch` with columns: `id` (PK autoincrement), `title` TEXT NOT NULL, `description` TEXT, `image_url` TEXT, `thumbnail_url` TEXT, `tag` TEXT, `color` TEXT, `sort_order` INTEGER NOT NULL DEFAULT 0, `published` BOOLEAN NOT NULL DEFAULT 1, `want_count` INTEGER NOT NULL DEFAULT 0, `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
- [x] seed 4 placeholder published items (image NULL for now): Pho-boman Helmet, Windman Fan, Primm Glasses, Tiebe Beret — short kid-friendly descriptions, distinct riso colors, sort_order 1-4, want_count 0
- [x] append a Merch block to `sql/queries/queries.sql` (copy the Games block): `ListMerch` (all, admin), `ListPublishedMerch` (`WHERE published = 1` ordered by sort_order), `GetMerch`, `CreateMerch`, `UpdateMerch`, `DeleteMerch`, and `IncrementMerchWant` (`UPDATE merch SET want_count = want_count + 1 WHERE id = ? RETURNING want_count`)
- [x] run `sqlc generate` to regenerate `internal/repository/` (do not hand-edit)
- [x] `go build ./...` succeeds and migration applies on startup

### Task 2: Backend handlers and routes
- [x] in `internal/api/router.go`, add `MerchDTO` (include `want_count`, `image_url`, `thumbnail_url`) and `merchInput`, mirroring `GameDTO`/`gameInput`; reuse `nullStr`/`toGameDTOs` patterns
- [x] add admin handlers `handleListMerchAdmin`, `handleCreateMerch`, `handleUpdateMerch`, `handleDeleteMerch` (trim/validate `title`, default `published=true`) mirroring the Game handlers
- [x] add public `handleListMerch` (published only) and `handleWantMerch` (calls `IncrementMerchWant`, returns the new count as JSON)
- [x] register public routes in `publicRoutes()`: `GET /api/merch` and `POST /api/merch/{id}/want` (no auth — public visitors are anonymous)
- [x] register admin routes in `adminRoutes()`: `GET/POST /api/admin/merch` and `PUT/DELETE /api/admin/merch/{id}`, each wrapped in `r.auth.RequireAdmin(...)`
- [x] `go build ./...` and existing test suite (`go test ./...`) pass
- [x] integration test: `POST /api/merch/{id}/want` increments and needs no auth — **only if** `router_test.go` already has a harness to mirror; otherwise omit

### Task 3: Frontend API client for Merch
- [x] in `frontend/src/lib/api.ts`, add `Merch` + `MerchInput` types (with `want_count`, `image_url`, `thumbnail_url`) and `getMerch`, `getMerchAdmin`, `createMerch`, `updateMerch`, `deleteMerch`, `wantMerch(id)` — copy the Game block
- [x] `wantMerch(id)` POSTs to `/api/merch/{id}/want` and returns the new count; reuse existing `uploadMedia()` for image uploads (no new helper)

### Task 4: Admin Merch page
- [x] copy `frontend/src/pages/admin/GamesPage.tsx` → `frontend/src/pages/admin/MerchPage.tsx`; CRUD via the new api.ts functions
- [x] replace the thumbnail-**URL** `<Input>` with the **file-upload** control from `EntitiesPage.tsx` (calls `uploadMedia`, stores returned `url`→`image_url` and `thumbnail_url`); drop the Games-only `url`/external-link field
- [x] show `want_count` as a read-only column in the table (so admins see demand per item)
- [x] add the admin route in `frontend/src/App.tsx` (admin group) and a nav entry in `components/layouts/AdminLayout.tsx`

### Task 5: Public Merch page with "I want it" button and promo banner
- [x] copy `frontend/src/pages/public/GamesPage.tsx` → `frontend/src/pages/public/MerchPage.tsx`; cards render `image_url`/`thumbnail_url`, tag, title, description
- [x] replace the external-link card with an **"I want it!"** button; on click call `wantMerch(id)`, then show a large promo banner/modal: section is in progress, we're studying demand, "thanks — your vote helps us plan production"
- [x] guard double-counting per device with `localStorage` (disable/mark the button after a click for that item id). `// ponytail: localStorage guard only, no server dedup — add per-IP/fingerprint throttle only if spam becomes real`
- [x] optionally show `want_count` on the card as social proof ("N want this")
- [x] add the public route in `frontend/src/App.tsx` (under `<PublicLayout>`) and a nav entry in `components/layouts/PublicLayout.tsx`

### Task 6: Verify acceptance criteria
- [x] verify Overview requirements: admin can create/edit/delete merch with uploaded images + descriptions; published items appear on the public page; "I want it!" increments the counter and shows the promo banner; admin sees per-item counts [x] manual test (skipped - not automatable)
- [x] verify edge cases: item with no image renders a placeholder; clicking "I want it!" twice on the same device counts once; unpublished items hidden publicly but visible in admin [x] manual test (skipped - not automatable)
- [x] run existing backend tests (`go test ./...`) — must pass
- [x] run frontend lint (`npm run lint` in `frontend/`) and build (`npm run build`) — all issues fixed

### Task 7: [Final] Update documentation
- [x] update `README.md` (add Merch to Public Portal + Creative Studio feature lists)
- [x] update `Agents.md` if new patterns introduced (the `/want` public counter endpoint and its no-dedup ceiling)

*Note: ralphex automatically moves completed plans to `docs/plans/completed/`.*

## Technical Details
- **`merch` table:** `id, title, description, image_url, thumbnail_url, tag, color, sort_order, published, want_count, created_at`. Dropped vs Games: external `url` (no off-site link) and any `price` (no sales yet — YAGNI).
- **Image storage:** bytes in R2 via existing presigned-upload flow; DB stores only the public `image_url` + generated `thumbnail_url`. Same as Heroes.
- **Interest counter:** `POST /api/merch/{id}/want` → `UPDATE merch SET want_count = want_count + 1 ... RETURNING want_count`. Public/unauthenticated. Client disables the button per item via `localStorage`. No server-side dedup or rate limiting (rough demand signal only).
- **DTO shape (public `GET /api/merch`):** `{ id, title, description, image_url, thumbnail_url, tag, color, sort_order, want_count }` — published items only, ordered by `sort_order`.

## Post-Completion
*Informational only — no checkboxes.*

**Manual verification:**
- In the admin panel, create a merch item with an uploaded image, confirm it appears on the public Merch page.
- On the public page, click "I want it!", confirm the promo banner shows and the admin count increments; reload and confirm the button stays disabled for that device.
- Confirm unpublished items are hidden publicly.

**Content / ops:**
- Replace the 4 seeded placeholder items with real merch concepts and images (helmet, fan, glasses, beret, etc.).
- If the `/want` counter sees abuse/spam in production, add a per-IP or fingerprint throttle (ceiling noted in code).
- Deploy applies migration `011_add_merch.sql` automatically on startup (Litestream-backed SQLite).
