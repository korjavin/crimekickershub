# Crime Kickers Hub - Audit Findings

**Date:** 2025-12-29
**Auditor:** Claude Code
**Status:** Initial Assessment Complete

## Executive Summary

The Crime Kickers Hub project compiles successfully on both backend (Go) and frontend (TypeScript/React), but has several critical issues that prevent it from functioning correctly in production. The previous implementation agent appears to have created a functional skeleton but with multiple routing bugs, missing test infrastructure, and untested code paths.

## Critical Issues

### 1. **Admin API Routing Logic Error** ⚠️ CRITICAL
**File:** `internal/api/router.go:123-126`
**Impact:** Admin routes are completely broken

**Problem:**
The admin routes use the SAME `adminMux` ServeMux registered with multiple different path prefixes:
```go
r.mux.Handle("/api/admin/prompts/", r.auth.RequireAdmin(http.StripPrefix("/api/admin/prompts", adminMux)))
r.mux.Handle("/api/admin/upload/", r.auth.RequireAdmin(http.StripPrefix("/api/admin/upload", adminMux)))
r.mux.Handle("/api/admin/assets/", r.auth.RequireAdmin(http.StripPrefix("/api/admin/assets", adminMux)))
r.mux.Handle("/api/admin/stories/", r.auth.RequireAdmin(http.StripPrefix("/api/admin/stories", adminMux)))
```

**Why This is Wrong:**
- `adminMux` contains handlers like `POST /upload`, `GET /media`, `POST /entities`, etc.
- When a request comes to `/api/admin/upload/upload`, it strips `/api/admin/upload`, leaving `/upload`, which matches `POST /upload`
- But when a request comes to `/api/admin/media`, there's NO route registered for `/api/admin/media/`, so it returns 404
- The routes for media, entities, and matrix don't exist

**Severity:** CRITICAL - All admin endpoints except those explicitly prefixed correctly will return 404

---

### 2. **Health Endpoint Unreachable** 🔴 HIGH
**File:** `internal/api/router.go:54-65`
**Impact:** Health check endpoint returns SPA HTML instead of "OK"

**Problem:**
```go
func (r *Router) ServeHTTP(w http.ResponseWriter, req *http.Request) {
    if strings.HasPrefix(req.URL.Path, "/api") {
        r.mux.ServeHTTP(w, req)
        return
    }
    // All other requests serve the SPA
    staticHandler := NewStaticHandler(r.frontendPath)
    staticHandler.ServeHTTP(w, req)
}
```

The `/health` endpoint is registered in `publicRoutes()` but it's not prefixed with `/api`, so it's caught by the static handler.

**Fix:** Either change the route to `/api/health` or add special handling for `/health`

---

### 3. **Test Schema Path Issue** 🔴 HIGH
**File:** `internal/service/prompts/service_test.go:29`
**Impact:** All unit tests fail

**Problem:**
```go
schemaPath := "sql/schema/001_initial.sql"
```

When tests run from a subdirectory (e.g., `go test ./internal/service/prompts`), the relative path doesn't resolve correctly.

**Test Output:**
```
Failed to init schema: failed to read schema file: open sql/schema/001_initial.sql: no such file or directory
```

**Fix:** Use absolute path relative to project root, or embed the schema SQL in the test

---

### 4. **Go Version Mismatch** ✅ FIXED
**File:** `go.mod`
**Status:** Fixed during audit

**Problem:**
- `go.mod` specified `go 1.25.5` which doesn't exist
- Latest Go version available is 1.24.x

**Fix Applied:**
Changed to `go 1.23`, and `go mod tidy` auto-upgraded to `go 1.24.0` with `toolchain go1.24.7`

---

## Medium Priority Issues

### 5. **Missing Admin Route Registrations**
**Files:** `internal/api/router.go:88-127`

The following endpoints are defined but not properly accessible:
- `GET /api/admin/media` - Not registered on any prefix
- `GET /api/admin/entities` - Route exists but not under correct prefix
- `POST /api/admin/entities` - Same issue
- `PUT /api/admin/entities/{id}` - Same issue
- `DELETE /api/admin/entities/{id}` - Same issue
- `GET /api/admin/matrix` - Not accessible

**Impact:** Frontend admin UI cannot function

---

### 6. **No Integration Tests**
**Status:** Missing

There are only 3 unit tests in `internal/service/prompts/service_test.go`, and they all fail due to schema path issues. No integration tests exist for:
- API endpoints
- Database operations
- R2 storage operations
- OAuth flow
- Frontend-backend integration

---

### 7. **No Error Handling in parseCSV**
**File:** `cmd/server/main.go:142-163`

The CSV parsing function is overly simplistic and doesn't handle:
- Quoted strings with commas
- Escaped characters
- Empty values
- Whitespace variations

Not critical for admin emails but could cause issues.

---

## Low Priority Issues

### 8. **Frontend Build Output Path Hardcoded**
**File:** Multiple locations

While `FRONTEND_PATH` environment variable exists, the system assumes `frontend/dist` structure in multiple places without validation.

---

### 9. **R2 Client Warnings Not Logged Properly**
**File:** `cmd/server/main.go:71`

When R2 client initialization fails, it logs a warning but sets client to nil. This is fine, but there's no graceful degradation message shown to users trying to upload.

---

### 10. **No Database Migrations System**
**Current:** Schema is applied once on startup
**Issue:** No way to handle schema updates without manual intervention

---

## Testing Status

### What Compiles ✅
- ✅ Backend (Go) compiles successfully
- ✅ Frontend (TypeScript/React) builds without errors
- ✅ No TypeScript type errors
- ✅ No linting errors in Go code

### What Works ✅
- ✅ Database initialization with WAL mode
- ✅ Server starts successfully
- ✅ Public API endpoints accessible (`/api/entities`, `/api/heroes`, `/api/comics`)
- ✅ SPA static file serving works
- ✅ Environment variable loading
- ✅ R2 client initialization (with valid credentials)
- ✅ Google OAuth client initialization

### What's Broken ❌
- ❌ All admin API routes (routing logic error)
- ❌ Health check endpoint returns HTML instead of "OK"
- ❌ All unit tests fail (schema path issue)
- ❌ No integration tests exist
- ❌ Media upload endpoints unreachable
- ❌ Entity management endpoints unreachable
- ❌ Story builder endpoints unreachable
- ❌ Prompt matrix endpoints unreachable

---

## Required Fixes Priority List

### P0 - Critical (Blocking)
1. **Fix admin route registration** - Complete rewrite of adminRoutes()
2. **Fix test schema paths** - Make tests runnable
3. **Fix health endpoint** - Move to `/api/health` or special case

### P1 - High (Needed for MVP)
4. Create integration tests for all API endpoints
5. Test OAuth flow end-to-end
6. Test R2 upload flow
7. Test frontend API calls

### P2 - Medium (Quality)
8. Add request validation middleware
9. Add proper error logging
10. Add database migration system

### P3 - Low (Nice to have)
11. Improve CSV parsing
12. Add metrics/monitoring
13. Add rate limiting

---

## Architecture Assessment

### Good Decisions ✅
- SQLite with WAL mode - good choice for this scale
- sqlc for type-safe queries - excellent choice
- Go 1.22+ ServeMux with pattern matching - modern approach
- Separation of concerns (services, repository, API)
- Comprehensive database schema with proper foreign keys

### Questionable Decisions ⚠️
- Admin route registration pattern (overly complex, broken)
- No migration system
- Schema applied on every startup (should be idempotent)
- Frontend served directly from Go (embedding would be better for production)

### Missing Components ❌
- Tests
- Logging infrastructure
- Error handling middleware
- Request validation
- Rate limiting
- CORS configuration
- Database connection pooling
- Graceful error recovery

---

## Recommendations

1. **Immediate Actions:**
   - Fix admin routing completely (rewrite adminRoutes function)
   - Fix test infrastructure
   - Add comprehensive API integration tests
   - Test all admin UI flows manually

2. **Short Term:**
   - Add proper logging with structured logs
   - Add request validation middleware
   - Implement database migrations
   - Add E2E tests for critical user flows

3. **Medium Term:**
   - Add monitoring and metrics
   - Implement rate limiting
   - Add caching layer for public endpoints
   - Optimize database queries
   - Add proper CORS configuration

4. **Code Quality:**
   - Add doc comments for all exported functions
   - Add more comprehensive unit tests
   - Add integration tests
   - Add E2E tests
   - Set up CI/CD pipeline

---

## Next Steps

Would you like me to:
1. **Fix all P0 critical issues** and get the app working?
2. **Create a comprehensive test suite** to prevent regressions?
3. **Add detailed inline documentation** to the codebase?
4. **Refactor the routing** to a cleaner, more maintainable structure?
5. **All of the above** in a systematic approach?

Please advise on priority and I'll proceed with fixes.
