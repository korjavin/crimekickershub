# Task 12: Media Management & Story Builder

**Goal:** Tools to upload assets and sequence them into stories.

## Steps:

1.  **Media Library:**
    * `src/pages/admin/MediaPage.tsx`.
    * **Upload:** Drag & Drop zone.
        * On drop -> POST to `/api/admin/upload`.
    * **Metadata Modal:** After upload, popup a modal asking: "Which Prompt Version created this?".
        * Dropdown fetching recent prompt versions.

2.  **Story Builder:**
    * `src/pages/admin/StoryBuilderPage.tsx`.
    * **UI:** Two lists side-by-side (or stacked on mobile).
        * List A: Available Media (Searchable).
        * List B: Story Timeline (Sortable).
    * **Sortable Lib:** Use `@dnd-kit/core` or `react-beautiful-dnd` to reorder frames in the timeline.
    * **Save:** PUT `/api/admin/stories/{id}` with the new order of IDs.