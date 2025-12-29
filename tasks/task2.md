# Task 2: Data Access Layer (SQLC)

**Goal:** Implement the Type-Safe Data Access Layer using `sqlc`. We will write raw SQL queries and generate Go interfaces.

**Tools:** `sqlc` (install via `go install github.com/sqlc-dev/sqlc/cmd/sqlc@latest`).

## Steps:

1.  **Configure SQLC:**
    * Create `sqlc.yaml` in the root.
    * Configure it to look at `sql/schema` and output Go code to `internal/repository`.
    * Enable `emit_json_tags` and `emit_interface`.

2.  **Write Queries:**
    * Create a file `sql/queries/queries.sql`.
    * Write SQL queries for the following operations (annotate them with `-- name: FunctionName :one/:many`):
        * **Entities:** `CreateEntity`, `GetEntityBySlug`, `ListEntities`.
        * **Prompts:** `CreatePromptVersion`, `GetLatestPromptVersion`, `ListPromptVersionsForEntity`.
        * **Media:** `CreateMediaAsset`, `GetMediaAsset`, `ListMediaByStory`.
        * **Stories:** `CreateStory`, `AddStoryItem`, `GetStoryWithItems`.
        * **Auth:** `GetUserByEmail`, `UpsertUser`.

3.  **Generate Code:**
    * Run `sqlc generate`.
    * Verify that `internal/repository` is populated with `models.go`, `db.go`, and `queries.sql.go`.

4.  **Integration:**
    * Update `main.go` to initialize the `repository.New(db)` using the DB connection from Task 1.