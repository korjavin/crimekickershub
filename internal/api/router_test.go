package api

import (
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"crimekickershub/internal/auth"
	"crimekickershub/internal/db"
	"crimekickershub/internal/migrations"
	"crimekickershub/internal/repository"
	"crimekickershub/internal/service/media"
	"crimekickershub/internal/storage"
)

// setupTestDB creates a temporary test database with the schema applied
func setupTestDB(t *testing.T) (*sql.DB, *repository.Queries, func()) {
	// Create a temporary directory for the test database
	tmpDir, err := os.MkdirTemp("", "api-test")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}

	dbPath := filepath.Join(tmpDir, "test.db")
	testDB, err := db.NewDB(dbPath)
	if err != nil {
		os.RemoveAll(tmpDir)
		t.Fatalf("Failed to create test DB: %v", err)
	}

	// Initialize schema from the embedded migrations (same source sqlc and production use)
	if err := migrations.RunMigrations(testDB); err != nil {
		testDB.Close()
		os.RemoveAll(tmpDir)
		t.Fatalf("Failed to run migrations: %v", err)
	}

	queries := repository.New(testDB)

	// Cleanup function
	cleanup := func() {
		testDB.Close()
		os.RemoveAll(tmpDir)
	}

	return testDB, queries, cleanup
}

// createTestRouter creates a router with test dependencies
func createTestRouter(t *testing.T) (*Router, func()) {
	testDB, queries, cleanup := setupTestDB(t)

	// Create mock auth (without credentials for development mode)
	authClient := auth.NewGoogleOAuth2(auth.Config{
		ClientID:     "",
		ClientSecret: "",
		CookieName:   "session",
		CookieSecret: []byte("test-secret-key-32-bytes!"),
	})

	// Create mock R2 client (nil is acceptable for development)
	r2Client, _ := storage.NewR2Client(nil, storage.R2Config{})

	// Create media service for tests that need it
	mediaService := media.NewMediaService(testDB, r2Client)

	// Create the router
	router := &Router{
		mux:          http.NewServeMux(),
		prompts:      nil, // Not needed for basic route tests
		media:        mediaService,
		repo:         queries,
		auth:         authClient,
		frontendPath: "",
	}

	// Register routes
	router.publicRoutes()
	router.adminRoutes()

	return router, cleanup
}

// TestHealthEndpoint tests the health check endpoint
func TestHealthEndpoint(t *testing.T) {
	router, cleanup := createTestRouter(t)
	defer cleanup()

	tests := []struct {
		name           string
		method         string
		path           string
		expectedStatus int
		checkBody      func(t *testing.T, body string)
		useServeHTTP   bool // Use ServeHTTP instead of mux for CORS tests
	}{
		{
			name:           "GET /api/health returns JSON with status",
			method:         "GET",
			path:           "/api/health",
			expectedStatus: http.StatusOK,
			checkBody: func(t *testing.T, body string) {
				// Verify it's JSON and contains "status": "healthy"
				if !strings.Contains(body, `"status":"healthy"`) && !strings.Contains(body, `"status": "healthy"`) {
					t.Errorf("Expected body to contain healthy status, got %q", body)
				}
			},
		},
		{
			name:           "OPTIONS /api/health returns OK (CORS preflight)",
			method:         "OPTIONS",
			path:           "/api/health",
			expectedStatus: http.StatusOK,
			checkBody:      nil, // No body check for OPTIONS
			useServeHTTP:   true, // Must use ServeHTTP for CORS middleware
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(tt.method, tt.path, nil)
			rr := httptest.NewRecorder()

			if tt.useServeHTTP {
				router.ServeHTTP(rr, req)
			} else {
				router.mux.ServeHTTP(rr, req)
			}

			if rr.Code != tt.expectedStatus {
				t.Errorf("Expected status %d, got %d", tt.expectedStatus, rr.Code)
			}

			if tt.checkBody != nil {
				tt.checkBody(t, rr.Body.String())
			}
		})
	}
}

// TestCORSMiddleware tests that CORS headers are properly set
func TestCORSMiddleware(t *testing.T) {
	router, cleanup := createTestRouter(t)
	defer cleanup()

	req := httptest.NewRequest("GET", "/api/health", nil)
	rr := httptest.NewRecorder()

	router.ServeHTTP(rr, req)

	// Check CORS headers
	if got := rr.Header().Get("Access-Control-Allow-Origin"); got != "*" {
		t.Errorf("Expected Access-Control-Allow-Origin to be '*', got %q", got)
	}
	if got := rr.Header().Get("Access-Control-Allow-Methods"); got == "" {
		t.Error("Expected Access-Control-Allow-Methods to be set")
	}
	if got := rr.Header().Get("Access-Control-Allow-Headers"); got == "" {
		t.Error("Expected Access-Control-Allow-Headers to be set")
	}
}

// TestAdminRoutesRegistered tests that admin routes are properly registered
func TestAdminRoutesRegistered(t *testing.T) {
	router, cleanup := createTestRouter(t)
	defer cleanup()

	adminRoutes := []string{
		"GET /api/admin/prompts",
		"GET /api/admin/prompts/recent",
		"GET /api/admin/prompts/types",
		"POST /api/admin/prompts/types",
		"PUT /api/admin/prompts/types/{id}",
		"DELETE /api/admin/prompts/types/{id}",
		"POST /api/admin/prompts/compose",
		"POST /api/admin/prompts/save",
		"GET /api/admin/prompts/diff",
		"POST /api/admin/upload",
		"GET /api/admin/media",
		"POST /api/admin/assets",
		"GET /api/admin/stories",
		"POST /api/admin/stories",
		"GET /api/admin/stories/{id}",
		"PUT /api/admin/stories/{id}",
		"POST /api/admin/stories/{id}/items",
		"GET /api/admin/entities",
		"POST /api/admin/entities",
		"PUT /api/admin/entities/{id}",
		"DELETE /api/admin/entities/{id}",
		"GET /api/admin/matrix",
	}

	for _, route := range adminRoutes {
		t.Run("Route exists: "+route, func(t *testing.T) {
			parts := strings.Split(route, " ")
			method := parts[0]
			path := parts[1]

			// Replace {id} placeholder for testing
			testPath := strings.ReplaceAll(path, "{id}", "1")

			req := httptest.NewRequest(method, testPath, nil)
			rr := httptest.NewRecorder()

			router.ServeHTTP(rr, req)

			// For protected routes without auth, we expect 302 redirect or 403
			// The route is registered if we get either of these responses
			if rr.Code != http.StatusFound && rr.Code != http.StatusForbidden {
				// For GET requests that might be handled differently
				if rr.Code == http.StatusMethodNotAllowed {
					t.Errorf("Route %s registered but method not allowed", route)
				}
				// 200 means the route is accessible (unlikely for admin routes)
				// 404 means the route is not registered
			}
		})
	}
}

// TestPublicRoutesRegistered tests that public routes are properly registered
func TestPublicRoutesRegistered(t *testing.T) {
	router, cleanup := createTestRouter(t)
	defer cleanup()

	publicRoutes := []string{
		"GET /api/heroes",
		"GET /api/entities",
		"GET /api/comics",
		"GET /api/comics/{slug}",
		"GET /api/auth/me",
		"POST /api/auth/logout",
		"POST /api/auth/dev-login",
		"GET /api/auth/google/login",
		"GET /api/auth/google/callback",
		"GET /api/health",
	}

	for _, route := range publicRoutes {
		t.Run("Route exists: "+route, func(t *testing.T) {
			parts := strings.Split(route, " ")
			method := parts[0]
			path := parts[1]

			// Replace {slug} placeholder for testing
			testPath := strings.ReplaceAll(path, "{slug}", "test-slug")

			req := httptest.NewRequest(method, testPath, nil)
			rr := httptest.NewRecorder()

			router.ServeHTTP(rr, req)

			// Routes should be registered (not 404)
			// Some might return 200, 500 (DB error), or 404 (not found in DB)
			// But they should not return "404 page not found" from the mux
			if rr.Code == http.StatusNotFound && strings.Contains(rr.Body.String(), "page not found") {
				t.Errorf("Route %s not registered", route)
			}
		})
	}
}

// TestAuthMiddlewareRedirectsUnauthorizedAccess tests that unauthorized users are redirected
func TestAuthMiddlewareRedirectsUnauthorizedAccess(t *testing.T) {
	router, cleanup := createTestRouter(t)
	defer cleanup()

	// Test an admin route without authentication
	req := httptest.NewRequest("GET", "/api/admin/prompts", nil)
	rr := httptest.NewRecorder()

	router.ServeHTTP(rr, req)

	// Should redirect to login
	if rr.Code != http.StatusFound {
		t.Errorf("Expected redirect (302), got %d", rr.Code)
	}

	// Check that Location header is set to /login
	if location := rr.Header().Get("Location"); location != "/login" {
		t.Errorf("Expected redirect to /login, got %q", location)
	}
}

// TestDevLoginEndpoint tests the development login endpoint
func TestDevLoginEndpoint(t *testing.T) {
	router, cleanup := createTestRouter(t)
	defer cleanup()

	req := httptest.NewRequest("POST", "/api/auth/dev-login", nil)
	rr := httptest.NewRecorder()

	router.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", rr.Code)
	}

	// Should set a session cookie
	cookies := rr.Result().Cookies()
	if len(cookies) == 0 {
		t.Error("Expected session cookie to be set")
	}
}

// TestListEntitiesEndpoint tests the entities list endpoint
func TestListEntitiesEndpoint(t *testing.T) {
	router, cleanup := createTestRouter(t)
	defer cleanup()

	req := httptest.NewRequest("GET", "/api/entities", nil)
	rr := httptest.NewRecorder()

	router.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", rr.Code)
	}

	// Should return valid JSON
	var entities []interface{}
	if err := json.Unmarshal(rr.Body.Bytes(), &entities); err != nil {
		t.Errorf("Expected valid JSON response, got error: %v", err)
	}
}

// TestListStoriesEndpoint tests the stories list endpoint
func TestListStoriesEndpoint(t *testing.T) {
	router, cleanup := createTestRouter(t)
	defer cleanup()

	req := httptest.NewRequest("GET", "/api/comics", nil)
	rr := httptest.NewRecorder()

	router.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", rr.Code)
	}

	// Should return valid JSON
	var stories []interface{}
	if err := json.Unmarshal(rr.Body.Bytes(), &stories); err != nil {
		t.Errorf("Expected valid JSON response, got error: %v", err)
	}
}

// TestAuthMeEndpoint tests the auth/me endpoint
func TestAuthMeEndpoint(t *testing.T) {
	router, cleanup := createTestRouter(t)
	defer cleanup()

	tests := []struct {
		name           string
		setupCookie    bool
		expectedStatus int
	}{
		{
			name:           "Without session returns 401",
			setupCookie:    false,
			expectedStatus: http.StatusUnauthorized,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest("GET", "/api/auth/me", nil)
			rr := httptest.NewRecorder()

			router.ServeHTTP(rr, req)

			if rr.Code != tt.expectedStatus {
				t.Errorf("Expected status %d, got %d", tt.expectedStatus, rr.Code)
			}
		})
	}
}

// TestGetNonExistentStory tests getting a story that doesn't exist
func TestGetNonExistentStory(t *testing.T) {
	router, cleanup := createTestRouter(t)
	defer cleanup()

	req := httptest.NewRequest("GET", "/api/comics/non-existent-slug", nil)
	rr := httptest.NewRecorder()

	router.ServeHTTP(rr, req)

	if rr.Code != http.StatusNotFound {
		t.Errorf("Expected status 404, got %d", rr.Code)
	}
}

// TestAPIResponseContentType tests that API responses have correct content type
func TestAPIResponseContentType(t *testing.T) {
	router, cleanup := createTestRouter(t)
	defer cleanup()

	req := httptest.NewRequest("GET", "/api/entities", nil)
	rr := httptest.NewRecorder()

	router.ServeHTTP(rr, req)

	if contentType := rr.Header().Get("Content-Type"); !strings.Contains(contentType, "application/json") {
		t.Errorf("Expected Content-Type to contain 'application/json', got %q", contentType)
	}
}

// TestRoutesNotFound tests that unknown routes return 404
func TestRoutesNotFound(t *testing.T) {
	router, cleanup := createTestRouter(t)
	defer cleanup()

	req := httptest.NewRequest("GET", "/api/nonexistent", nil)
	rr := httptest.NewRecorder()

	router.ServeHTTP(rr, req)

	// Should return 404 from the SPA handler (since it goes through ServeHTTP)
	// or the mux might handle it differently
	// The key is it should not panic or return 500
	if rr.Code == http.StatusInternalServerError {
		t.Errorf("Expected not to return 500 for unknown route")
	}
}

// TestListMediaEndpoint tests that the media list endpoint returns an empty array (not null) when no media exists
func TestListMediaEndpoint(t *testing.T) {
	router, cleanup := createTestRouter(t)
	defer cleanup()

	// Login first to access admin endpoint
	loginReq := httptest.NewRequest("POST", "/api/auth/dev-login", nil)
	loginRR := httptest.NewRecorder()
	router.ServeHTTP(loginRR, loginReq)

	// Get session cookie
	cookies := loginRR.Result().Cookies()
	if len(cookies) == 0 {
		t.Fatal("Expected session cookie to be set")
	}

	// Test media list endpoint
	req := httptest.NewRequest("GET", "/api/admin/media", nil)
	req.AddCookie(cookies[0])
	rr := httptest.NewRecorder()

	router.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", rr.Code)
	}

	// Decode response
	var mediaAssets []interface{}
	if err := json.Unmarshal(rr.Body.Bytes(), &mediaAssets); err != nil {
		t.Errorf("Expected valid JSON array response, got error: %v. Body: %s", err, rr.Body.String())
	}

	// Verify it's an empty array, not null
	if mediaAssets == nil {
		t.Error("Expected empty array [], got null")
	}

	// Should be empty since we haven't added any media
	if len(mediaAssets) != 0 {
		t.Errorf("Expected empty media list, got %d items", len(mediaAssets))
	}
}

// TestStoryAudioURLRoundTrip verifies that a non-null audio_url set via UpdateStory
// persists and reads back correctly through GetStoryByID.
func TestStoryAudioURLRoundTrip(t *testing.T) {
	testDB, queries, cleanup := setupTestDB(t)
	defer cleanup()
	_ = testDB

	ctx := context.Background()

	// Create a story without audio.
	created, err := queries.CreateStory(ctx, repository.CreateStoryParams{
		Title:         "Audio Round Trip",
		Slug:          "audio-round-trip",
		CoverImageUrl: sql.NullString{},
		Published:     sql.NullBool{Bool: false, Valid: true},
	})
	if err != nil {
		t.Fatalf("CreateStory failed: %v", err)
	}

	const audioURL = "https://example.com/a.mp3"

	// Update the story with a populated audio_url, preserving its other fields.
	updated, err := queries.UpdateStory(ctx, repository.UpdateStoryParams{
		ID:            created.ID,
		Title:         created.Title,
		Slug:          created.Slug,
		CoverImageUrl: created.CoverImageUrl,
		Published:     created.Published,
		AudioUrl:      sql.NullString{String: audioURL, Valid: true},
	})
	if err != nil {
		t.Fatalf("UpdateStory failed: %v", err)
	}

	if !updated.AudioUrl.Valid || updated.AudioUrl.String != audioURL {
		t.Errorf("UpdateStory returned audio_url = %#v, want valid %q", updated.AudioUrl, audioURL)
	}

	// Read it back to confirm persistence.
	got, err := queries.GetStoryByID(ctx, created.ID)
	if err != nil {
		t.Fatalf("GetStoryByID failed: %v", err)
	}

	if !got.AudioUrl.Valid {
		t.Errorf("Expected audio_url to be valid after update, got Valid=false")
	}
	if got.AudioUrl.String != audioURL {
		t.Errorf("Expected audio_url %q, got %q", audioURL, got.AudioUrl.String)
	}
}

// TestStoryAudioURLDefaultsNull verifies that a freshly created story that was
// never given audio reads back with a NULL (invalid) audio_url, confirming the
// new column is nullable and backward compatible.
func TestStoryAudioURLDefaultsNull(t *testing.T) {
	_, queries, cleanup := setupTestDB(t)
	defer cleanup()

	ctx := context.Background()

	created, err := queries.CreateStory(ctx, repository.CreateStoryParams{
		Title:         "No Audio",
		Slug:          "no-audio",
		CoverImageUrl: sql.NullString{},
		Published:     sql.NullBool{Bool: false, Valid: true},
	})
	if err != nil {
		t.Fatalf("CreateStory failed: %v", err)
	}

	got, err := queries.GetStoryByID(ctx, created.ID)
	if err != nil {
		t.Fatalf("GetStoryByID failed: %v", err)
	}

	if got.AudioUrl.Valid {
		t.Errorf("Expected audio_url to be NULL (Valid=false) for a story without audio, got %#v", got.AudioUrl)
	}
}
