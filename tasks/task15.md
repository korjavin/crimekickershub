# Task 15: The Prompt Matrix Grid (The Core View)

**Goal:** Build the ultimate "God View" for your prompt engineering. Instead of a simple list, we want a **Matrix**.

**Layout:**
* **Rows:** Entities (Windman, Pho-boman, Sky Isles).
* **Columns:** Prompt Types (Video, Image, Short).
* **Cells:** The specific Prompt Version status (e.g., "v3", "Empty", or the start of the text).

## Steps:

1.  **Matrix Data Fetching:**
    * Create an endpoint `GET /api/admin/matrix`.
    * Response structure: `{ entities: [...], types: [...], versions: { "entityID_typeID": { version: 5, text: "..." } } }`
    * This requires an efficient SQL join query.

2.  **The Grid UI:**
    * Create `src/components/PromptMatrix.tsx`.
    * Render a table where headers are Types and the first column is Entities.
    * **Cell Logic:**
        * If a prompt exists: Show `v{version}` badge and the first 50 chars of text.
        * If empty: Show a ghost "+" button.

3.  **Interaction (The "Click-to-Edit"):**
    * Clicking a Cell opens the **Prompt Editor Dialog** for *that specific Entity + Type combination*.
    * Inside the dialog:
        * **History:** Dropdown to see previous versions.
        * **Editor:** Textarea to write the specific description for *this* context.
        * **Save:** Creates a new Version (v+1).

4.  **Bulk Action (The Mixer Link):**
    * Add checkboxes to the Entity rows.
    * A floating "Mix Selected" button at the bottom. Clicking it takes the selected IDs and sends them to the "Scene Builder" (Task 11) with their *Default* or *Selected* prompt types pre-filled.