# Task 11: The Prompt Studio UI

**Goal:** Build the IDE for prompts using the API we built in backend tasks.

## Steps:

1.  **Prompt Matrix (List):**
    * `src/pages/admin/PromptStudioPage.tsx`.
    * TanStack Table listing all Prompts.

2.  **The "Mixer" (Prompt Builder):**
    * **Left Panel:**
        * Entity Selector (Multi-select Checkboxes).
        * Location Selector (Radio/Select).
        * Prompt Type (Select: "Sora Video", "Midjourney").
        * "Generate" Button -> POST `/api/admin/prompts/compose`.
    * **Right Panel:**
        * Large `Textarea` displaying the result.
        * "Save as New Version" button.

3.  **Entity Editor:**
    * A form to edit the "Base Prompts" of an entity.
    * Tabs for "Appearance", "Powers", "Origin".