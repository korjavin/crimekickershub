1# Task 10: Admin Authentication & Dashboard

**Goal:** Secure the admin panel using the backend's Google Auth flow.

## Steps:

1.  **Login Page:**
    * Create `src/pages/auth/LoginPage.tsx`.
    * "Sign in with Google" button.
    * **Action:** The button simply links to `/api/auth/google/login`. The browser will follow the redirect to Google, then back to the Go backend, which sets a `HttpOnly` cookie, and finally redirects to `/admin`.

2.  **Auth Context (Session State):**
    * Create `src/context/AuthContext.tsx`.
    * On mount, `fetch('/api/auth/me')` to validate the session.
    * If 401, set user to null. If 200, store user info.

3.  **Protected Route Wrapper:**
    * Create `src/components/RequireAuth.tsx`.
    * Wrap `/admin` routes.
    * Logic: If `auth.loading` return Spinner. If `!auth.user`, `<Navigate to="/login" />`.

4.  **Admin Sidebar:**
    * In `AdminLayout`, create a responsive Sidebar (collapsible on mobile).
    * Navigation: Prompt Studio, Media Library, Story Builder.