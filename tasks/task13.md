# Task 13: Admin Entity Management

**Goal:** Build the interface to Create, Edit, and List the "Entities" of the universe (Heroes, Villains, Locations, Items). These are the building blocks of your prompts.

**Dependencies:** Task 8 (UI Libs), Task 6 (API).

## Steps:

1.  **API Expansion (Go):**
    * Ensure the backend has endpoints for CRUD operations:
        * `POST /api/admin/entities`: Create new (Name, Slug, Type, Avatar).
        * `PUT /api/admin/entities/{id}`: Update details.
        * `DELETE /api/admin/entities/{id}`: Soft delete or hard delete.

2.  **Entity List Page:**
    * Create `src/pages/admin/EntitiesPage.tsx`.
    * **UI:** A `DataTable` (shadcn) displaying: Avatar, Name, Type (Hero/Location), and "Last Updated".
    * **Actions:** "Add New Entity" button.

3.  **Entity Editor (Drawer/Sheet):**
    * Use the `Sheet` component from shadcn/ui (a slide-out panel) for creating/editing. This keeps context without navigating away.
    * **Form Fields:**
        * **Name:** (e.g., "Windman").
        * **Type:** Select (Hero, Villain, Location, Artifact).
        * **Description:** A core "Identity" description (not the generative prompt, but the wiki bio).
        * **Avatar Upload:** A small file input to upload a reference thumbnail (sends to `/api/admin/upload`).

4.  **Integration:**
    * When saving, invalidate the "Entities" query cache so the list updates immediately.