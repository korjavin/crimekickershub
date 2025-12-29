# Task 17: Prompt Types Management (CRUD & Templates)

**Goal:** Implement the backend and frontend to manage "Prompt Types". These are the templates that define *how* a prompt is constructed (e.g., "Video Cinematic", "Image Anime").

**Context:**
We need a database-driven way to store prompt templates so we don't have to hardcode technical parameters (like `--ar 16:9` or `8k resolution`) in the code.

## 1. Database Schema Update (Migration)
* **Action:** Create a new migration file `sql/schema/00X_add_templates.sql`.
* **Changes:**
    * Alter table `prompt_types` to ensure it has these columns:
        * `id` (INTEGER PRIMARY KEY)
        * `slug` (TEXT UNIQUE NOT NULL) - e.g., `video_sora_v1`
        * `name` (TEXT NOT NULL) - e.g., "Sora Video V1"
        * `description` (TEXT) - Usage notes.
        * `template` (TEXT NOT NULL) - The raw template string.
    * **Seed Data:** Insert at least one default type:
        * Slug: `standard_image`
        * Template: `High quality image of {{ENTITY}} in {{LOCATION}}. 8k, highly detailed.`

## 2. Backend API (Go)
* **File:** `internal/api/handlers/prompt_types.go`
* **Endpoints:**
    * `GET /api/admin/prompt-types`: Return list.
    * `POST /api/admin/prompt-types`: Create new.
    * `PUT /api/admin/prompt-types/{id}`: Update template/name.
    * `DELETE /api/admin/prompt-types/{id}`: Remove a type.
* **Validation:** Ensure `slug` is unique and `template` contains at least `{{ENTITY}}` (optional warning if not).

## 3. Frontend Page (React)
* **File:** `src/pages/admin/PromptTypesPage.tsx`
* **Route:** Add to `AdminLayout` at `/admin/types`.
* **UI Components:**
    * **List View:** A Grid or Table of cards showing the Name and Slug.
    * **Create/Edit Dialog:** A generic `Sheet` or `Dialog` form.
        * **Input:** Name
        * **Input:** Slug
        * **Textarea (The Template Editor):**
            * Large text area for editing the template.
            * **Helper Text:** "Use `{{ENTITY}}` and `{{LOCATION}}` as placeholders. They will be replaced by the Character and Location descriptions during generation."

## 4. Frontend Integration
* **Sidebar:** Add "Prompt Types" link to the Admin Sidebar.
* **API Client:** Update `src/lib/api.ts` with the new CRUD methods.