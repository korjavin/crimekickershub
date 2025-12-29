# Task 1: Project Initialization & Database Schema

**Goal:** Initialize the Go project, set up the SQLite database connection (with WAL mode), and define the database schema.

**Tech Stack:** Go 1.23+, SQLite (modernc.org/sqlite or github.com/mattn/go-sqlite3), SQL migration files.

## Steps:

1.  **Initialize Module:**
    * Run `go mod init crime-kickers-hub`.
    * Create a `cmd/server/main.go` entry point.

2.  **Database Connection:**
    * Create a package `internal/db`.
    * Implement a function `NewDB(filepath string) (*sql.DB, error)`.
    * **Crucial:** Configure SQLite to use **WAL mode** (Write-Ahead Logging) (`PRAGMA journal_mode=WAL;`) and `PRAGMA foreign_keys=ON;` to ensure concurrent performance and data integrity.

3.  **Schema Definition:**
    * Create a folder `sql/schema`.
    * Create a file `001_initial.sql` containing the DDL for the following tables (based on the design):
        * `entities` (id, slug, name, type, description, avatar_url, created_at).
        * `prompt_types` (id, slug, description).
        * `prompt_versions` (id, entity_id, type_id, version_number, prompt_text, technical_params_json, created_at).
        * `media_assets` (id, type, r2_key, youtube_id, source_prompt_version_id, created_at).
        * `stories` (id, title, slug, cover_image_url, published, created_at).
        * `story_items` (id, story_id, media_asset_id, sort_order).
        * `users` (id, email, google_id, role, created_at) - for whitelist admin check.

4.  **Verification:**
    * Write a small script in `main.go` that initializes the DB and creates the tables using the raw SQL string from the schema file.
    * Ensure the application starts without errors and the `.db` file is created.