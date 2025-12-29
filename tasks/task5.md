# Task 5: Authentication (Google OAuth)

**Goal:** Secure the "Admin" routes using Google OAuth and an email whitelist.

**Tech Stack:** `golang.org/x/oauth2/google`.

## Steps:

1.  **OAuth Setup:**
    * Create `internal/auth/google.go`.
    * Configure `oauth2.Config` using `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
    * Implement `GetLoginURL(state string)` and `ExchangeCode(code string)`.

2.  **Admin Whitelist Logic:**
    * Parse `ADMIN_EMAILS` env var (CSV string) into a map/slice on startup.
    * Implement a check: `IsAdmin(email string) bool`.

3.  **Session/Cookie Management:**
    * Create a simple secure cookie mechanism (using `http.SetCookie`) to store a JWT or a session token after successful Google Login.

4.  **Middleware:**
    * Create `RequireAdmin(next http.Handler) http.Handler`.
    * This middleware should check the cookie. If invalid, redirect to `/login`. If valid but email is not in whitelist, return 403 Forbidden.