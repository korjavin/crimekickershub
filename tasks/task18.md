# Task 18: Prompt Studio Logic (The Mixer Wiring)

**Goal:** Connect the "Entity" and "Type" dropdowns in the Prompt Studio to the backend logic so that selecting them automatically generates the prompt text.

**Current State:** The page `PromptStudioPage.tsx` has the UI shell (Dropdowns + Textarea) but lacks the logic to fetch data or generate the text.

## 1. Frontend Data Fetching (React Query)
* **Entities:** Fetch `GET /api/admin/entities` on mount. Populate the "Entity" dropdown.
    * *Refinement:* Change the "Entity" dropdown to a **Multi-Select** (e.g., using `shadcn/ui` Command or Popover with checkboxes) so users can select "Windman" AND "Sky Isles".
* **Types:** Fetch `GET /api/admin/prompt-types` on mount. Populate the "Type" dropdown.

## 2. The "Mixer" Action
* **Add a Button:** Place a "Generate / Mix" button between the dropdowns and the textarea.
* **Event Handler:** When clicked:
    1.  Collect selected Entity IDs (e.g., `[1, 3]`).
    2.  Collect selected Type ID (e.g., `2`).
    3.  **POST** to `/api/admin/prompts/compose` (Implemented in Task 6).
        * *Payload:* `{ entity_ids: [1, 3], type_id: 2 }`
    4.  **Receive Response:** The API returns the compiled string (e.g., "[Windman desc] standing in [Sky Isles desc]...").
    5.  **Update State:** Set the `textarea` value to this received string.

## 3. Saving the Result
* **Save Logic:** The "Save as New Version" button is already there. Ensure it sends:
    * `content`: The text currently in the textarea (which might have been manually edited after generation).
    * `entity_ids`: The IDs selected in the dropdown.
    * `type_id`: The ID selected in the dropdown.
    * **Endpoint:** `POST /api/admin/prompts/save`.

## 4. UI Polish (Visual Clarity)
* **Labels:**
    * Rename "Entity" to **"Subject(s) & Location"** (since it includes heroes and places).
    * Rename "Type" to **"Generator Template"** (e.g., Flux, Sora).
* **Placeholder:** When the textarea is empty, show a ghost text: "Select subjects and a template, then click Mix."