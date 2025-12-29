# Task 19: Story Builder (Comics & Slides)

**Goal:** Implement the "Comic Creator". A Story is an ordered sequence of "Slides" (Media Assets).

**Context:**
We don't upload images directly to a story. We select them from the **Media Library** (Task 12/16) to encourage reuse (e.g., one establishing shot used in multiple stories).

## 1. Database Schema
* **Table:** `stories` (id, title, slug, cover_image, is_published, created_at)
* **Table:** `story_items` (id, story_id, media_id, sort_order)
    * *Note:* `media_id` links to the `media_assets` table (which holds the R2 URL or YouTube ID).

## 2. Backend API
* `GET /api/admin/stories`: List all.
* `GET /api/admin/stories/{id}`: Get story with all items (joined with media).
* `POST /api/admin/stories`: Create.
* `PUT /api/admin/stories/{id}/items`: Bulk update the sequence.
    * **Payload:** `{ item_ids: [media_id_A, media_id_B, media_id_C] }` (The order in the array determines `sort_order`).

## 3. Story Editor UI (The "Slide Manager")
* **File:** `src/pages/admin/StoryEditorPage.tsx`
* **Layout:** Two-Column Layout.
    * **Left Column (Source):** "Media Library".
        * A grid of available images/videos.
        * **Filter:** By Entity (e.g., "Show me Windman images").
        * **Action:** Click or Drag to add to the Story.
    * **Right Column (Timeline):** "The Comic Strip".
        * A vertical list of the selected slides.
        * **Drag & Drop:** Use `@dnd-kit` or `react-beautiful-dnd` to reorder slides.
        * **Remove:** Button to remove a slide from the story.
    * **Preview Mode:** A button to see how it looks on mobile.

## 4. Integration
* Ensure that when saving, the `sort_order` is strictly preserved.