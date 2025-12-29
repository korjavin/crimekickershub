# Task 7: Frontend Integration (Embed)

**Goal:** Serve the frontend (HTML/JS) directly from the Go binary.

**Tech Stack:** Go `embed` package.

## Steps:

1.  **Frontend Placeholder:**
    * Create a directory `frontend/dist`.
    * Place a dummy `index.html` there (e.g., `<h1>Crime Kickers Hub Loading...</h1>`).

2.  **Embed Logic:**
    * In `internal/api/router.go` (or a new file `internal/api/static.go`), use the `//go:embed` directive:
        ```go
        //go:embed frontend/dist/*
        var frontendFS embed.FS
        ```

3.  **SPA Handling:**
    * Implement a handler that serves files from `frontendFS`.
    * **Crucial:** For a Single Page Application (SPA), if a requested path does NOT exist (and isn't an `/api/` call), it must serve `index.html` so the frontend router can handle the URL.

4.  **Final Polish:**
    * Ensure `/api/` routes take precedence over the static file handler.