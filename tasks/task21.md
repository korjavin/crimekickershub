# Task 21: Entity Schema Refinement (Bio vs. Prompt)

**Goal:** Refine the Entity system implemented in Task 13. We need to explicitly separate the text shown to the public (Wiki Bio) from the text used by the AI (Base Prompt).

**Context:**
Currently, `entities` might only have one `description` field. We need two:
1.  **Public Bio:** "Windman was born from a shard..." (For the Website).
2.  **Base Prompt:** "Male, 180cm, bandage on eyes..." (For the Prompt Mixer).

## 1. Database Schema Update (Incremental)
* **Action:** Create a new migration file `sql/schema/00X_split_entity_descriptions.sql`.
* **SQL:**
    * Add column `base_prompt` (TEXT, default empty).
    * Rename `description` to `description_public` (or keep as `description` but clarify its usage in comments).
    * *Migration Logic:* `UPDATE entities SET base_prompt = description;` (Temporary copy so we don't lose data during the transition).

## 2. Backend Updates (Go + SQLC)
* **File:** `sql/queries/queries.sql`
    * Update `CreateEntity` and `UpdateEntity` queries to accept both `description` (public) and `base_prompt` (private).
* **Action:** Run `sqlc generate` to update the Go structs and interfaces.
* **File:** `internal/api/handlers/entities.go`
    * Update the Create/Update handlers to parse the new JSON fields and pass them to the repository.

## 3. Frontend UI Refinement
* **File:** `src/pages/admin/EntitiesPage.tsx`
* **Action:** Upgrade the "Edit Entity" Sheet/Dialog to use **Tabs**.
    * **Tab 1: "Public Info"**
        * Inputs: Name, Slug, Type.
        * Input: Avatar URL.
        * Textarea: **Wiki Bio** (Mapped to `description`).
    * **Tab 2: "Generator Config"**
        * Textarea: **Base Prompt** (Mapped to `base_prompt`).
        * *Helper Text:* "Describe the physical appearance, colors, and consistent accessories here. This text is injected into the AI mixer."

## 4. Verification
* Open the "Prompt Studio" (Task 18).
* Ensure that when the Mixer fetches an entity, it is now pulling from the **`base_prompt`** field, NOT the `description