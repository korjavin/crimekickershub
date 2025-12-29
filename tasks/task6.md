# Task 6: HTTP Router & API Implementation

**Goal:** Wire everything together using the standard Go 1.22+ `http.ServeMux`.

## Steps:

1.  **Router Setup:**
    * In `internal/api/router.go`, create `NewRouter(services...) *http.ServeMux`.

2.  **Public Routes (No Auth):**
    * `GET /api/heroes`: List all entities of type 'hero'.
    * `GET /api/comics`: List all stories.
    * `GET /api/comics/{slug}`: Get specific story details.

3.  **Admin Routes (Protected by Middleware from Task 5):**
    * `POST /api/admin/prompts/compose`: Trigger the mixer logic.
    * `POST /api/admin/prompts/save`: Save a new version.
    * `POST /api/admin/upload`: Handle file upload (Multipart form) -> Send to R2 Service -> Save to DB.
    * `POST /api/admin/stories`: Create/Update stories.

4.  **Wiring in Main:**
    * Update `main.go` to instantiate the Router, wrap it with standard middleware (Logging, Recovery), and start the `http.Server`.