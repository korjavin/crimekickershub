# Task 14: Prompt Types & Common Parts

**Goal:** Manage the *columns* of your Prompt Matrix. This is where you define "Video Long", "Midjourney Portrait", etc., and their *technical* templates.

**Concept:** A "Prompt Type" isn't just a label. It includes a **Template** (Common Part) that wraps the character description.

## Steps:

1.  **Database Update (if needed):**
    * Ensure the `prompt_types` table has a `template` text field.
    * *Example Template:* "Cinematic shot of {{ENTITY}}, 8k resolution, unreal engine 5 render, --ar 16:9"

2.  **Type Manager UI:**
    * Create `src/pages/admin/PromptTypesPage.tsx`.
    * **List:** Simple card grid of available types.
    * **Editor:**
        * **Slug:** `video_sora_v1`
        * **Label:** "Sora Video (Cinematic)"
        * **Template / Common Part:** A textarea.
        * *Instruction:* "Use `{{ENTITY}}` as the placeholder for where the character description will go."

3.  **API Integration:**
    * Implement `GET/POST/PUT /api/admin/prompt-types`.

4.  **Mixer Logic Update (Backend):**
    * Update the "Mixer" logic in the Go backend (from Task 3) to strictly respect these templates.
    * When composing: `Template.Replace("{{ENTITY}}", EntityVersionText)`.