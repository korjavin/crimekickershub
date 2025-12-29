# Task 16: Media Linking & Traceability UI

**Goal:** Finish the loop. When you upload a video/image, you must be able to say "This came from Windman v5".

## Steps:

1.  **Enhanced Upload Modal:**
    * In `src/pages/admin/MediaPage.tsx`, refine the upload flow.
    * After the file is uploaded (or YouTube link pasted), show a **"Link Source"** form.

2.  **Smart Source Selector:**
    * Instead of a boring dropdown, build a **"Recent Prompts"** selector.
    * Fetch `GET /api/admin/prompts/recent` (Last 10 generated/edited prompts).
    * Display: "Windman (Video V5) - modified 2 mins ago".
    * Allow the user to select multiple sources (e.g., "This video contains Windman AND Roti").

3.  **Media Detail View:**
    * When clicking a Media Asset in the library:
        * Show the Image/Video.
        * **Sidebar:** "Generated from:"
        * List the linked Prompt Versions.
        * **Action:** "Copy Prompt" button (Reconstructs the full prompt text including the template used at that time).

4.  **Filter by Entity:**
    * In the Media Library, add a filter: "Show media featuring: [Windman]".
    * This uses the `story_items` or the direct prompt links to filter the query.