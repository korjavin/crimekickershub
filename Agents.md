# Project Context: Crime Kickers Hub

## Overview
This is a monorepo for "Crime Kickers Hub," a Go-based web application backed by SQLite. The application serves two roles: a public CMS for a comic book universe and an internal "Prompt Studio" for managing Generative AI workflows.

## Technical Constraints & Stack
* **Language:** Go (Golang).
* **Database:** SQLite (with WAL mode enabled). No external DB dependencies.
* **Frontend:** React/Next.js with Tailwind CSS.
* **Authentication:** Google OAuth 2.0 (Server-side validation against an admin whitelist ENV).
* **Object Storage:** Cloudflare R2 (S3-compatible API) for images.
* **Video Hosting:** YouTube (Links stored in DB, no direct upload via API initially).

## Key Architectural Concepts

### 1. The Prompt Engine (Core Logic)
* **Entities:** Reusable definitions of characters (Windman, Pho-boman, etc.) and locations.
* **Prompt Composition:** A prompt is constructed by concatenating:
    * *Entity Narrative* (Dynamic)
    * *Prompt Type Template* (e.g., "Action Shot")
    * *Common/Technical Params* (Reusable blocks for aspect ratios, seeds, renderer settings).
* **Versioning:** Prompts are **never overwritten**. Updating a prompt creates a new row in the database with a version increment.
* **Diffing:** The backend must support logic to compare two text versions and return differences.

### 2. Media Traceability
* **Asset Linking:** Every Media Asset (Image/Video) database entry must have a foreign key (or association) pointing to the specific `prompt_version_id` that generated it.
* This establishes a lineage: `Media -> Prompt Version -> Entity Definition`.

### 3. Story Structure
* A **Story** (or Issue) is an ordered collection of **StoryItems**.
* **StoryItems** are polymorphic or mixed: they can be an Image or a Video Link.
* The frontend renders these linearly (Webtoon style).
* A Story may also carry a single optional audio track via the nullable `stories.audio_url` column (a full R2 URL, parallel to `cover_image_url`); it is not a StoryItem and never renders as a panel.
* A Story may also carry an optional motto/slogan via the nullable `stories.motto` column (added in migration `010_add_story_motto.sql`, parallel to `audio_url`); when set it renders as a tagline on the public comic cards and reader page, when unset it serializes as JSON `null` and renders nothing.

## Public Anonymous-Counter Endpoint Pattern
Some features record anonymous user interest without collecting personal data (e.g. `POST /api/merch/{id}/want`). The pattern:
* **Route:** public, no auth required. Registered in `publicRoutes()`.
* **Backend:** single `UPDATE … SET counter = counter + 1 WHERE id = ? RETURNING counter`. Returns `{"want_count": N}`.
* **Client dedup:** `localStorage` disables the button per item per device after one click. No server-side dedup or rate limiting — this is a rough demand signal only.
* **Ceiling note:** if spam becomes real in production, add a per-IP or fingerprint throttle. The code comment marks this ceiling with `// ponytail: localStorage guard only`.
* **No personal data:** no user identity, no session, no analytics payload — just the counter increment.

## Testing Conventions
* DB-backed Go tests build their schema with `migrations.RunMigrations` (from `internal/migrations`), the same embedded migrations used by production and sqlc. There is no standalone `sql/schema/001_initial.sql` file.
* The frontend has no unit-test framework; `npm run build` (tsc + vite) and `npm run lint` are the gate.

## Environment Variables
Configuration is strictly via `.env`:
* `DB_PATH`: Path to the SQLite file.
* `R2_*`: Cloudflare credentials.
* `ADMIN_EMAILS`: CSV list of authorized Google accounts.
* `TG_*`: Telegram bot credentials for notifications.

## Continuity Ledger (compaction-safe)
Maintain a single Continuity Ledger for this workspace in CONTINUITY.md. The ledger is the canonical session briefing designed to survive context compaction; do not rely on earlier chat text unless it’s reflected in the ledger.

### How it works
- At the start of every assistant turn: read CONTINUITY.md, update it to reflect the latest goal/constraints/decisions/state, then proceed with the work.
- Update CONTINUITY.md again whenever any of these change: goal, constraints/assumptions, key decisions, progress state (Done/Now/Next), or important tool outcomes.
- Keep it short and stable: facts only, no transcripts. Prefer bullets. Mark uncertainty as UNCONFIRMED (never guess).
- If you notice missing recall or a compaction/summary event: refresh/rebuild the ledger from visible context, mark gapsфайла AGENTS.md ask up to 1–3 targeted questions, then continue.

### functions.update_plan vs the Ledger
- functions.update_plan is for short-term execution scaffolding while you work (a small 3–7 step plan with pending/in_progress/completed).
- CONTINUITY.md is for long-running continuity across compaction (the “what/why/current state”), not a step-by-step task list.
- Keep them consistent: when the plan or state changes, update the ledger at the intent/progress level (not every micro-step).

### In replies
- Begin with a brief “Ledger Snapshot” (Goal + Now/Next + Open Questions). Print the full ledger only when it materially changes or when the user asks.

### CONTINUITY.md format (keep headings)
- Goal (incl. success criteria):
- Constraints/Assumptions:
- Key decisions:
- State:
- Done:
- Now:
- Next:
- Open questions (UNCONFIRMED if needed):
- Working set (files/ids/commands):