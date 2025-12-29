package api

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
)

func TestStaticHandler_ServeHTTP(t *testing.T) {
	// Create a temporary test directory
	tmpDir := t.TempDir()

	// Create test files
	indexHTML := `<!DOCTYPE html><html><body><h1>Test</h1></body></html>`
	testCSS := `body { color: red; }`

	if err := os.WriteFile(filepath.Join(tmpDir, "index.html"), []byte(indexHTML), 0644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(tmpDir, "test.css"), []byte(testCSS), 0644); err != nil {
		t.Fatal(err)
	}

	handler := NewStaticHandler(tmpDir)

	tests := []struct {
		name       string
		path       string
		wantStatus int
		wantBody   string
	}{
		{
			name:       "root path serves index.html",
			path:       "/",
			wantStatus: http.StatusOK,
			wantBody:   indexHTML,
		},
		{
			name:       "non-existent path serves index.html (SPA fallback)",
			path:       "/nonexistent",
			wantStatus: http.StatusOK,
			wantBody:   indexHTML,
		},
		{
			name:       "existing file is served correctly",
			path:       "/test.css",
			wantStatus: http.StatusOK,
			wantBody:   testCSS,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest("GET", tt.path, nil)
			rr := httptest.NewRecorder()
			handler.ServeHTTP(rr, req)

			if rr.Code != tt.wantStatus {
				t.Errorf("got status %d, want %d", rr.Code, tt.wantStatus)
			}

			if tt.wantBody != "" && rr.Body.String() != tt.wantBody {
				t.Errorf("got body %q, want %q", rr.Body.String(), tt.wantBody)
			}
		})
	}
}

func TestStaticHandler_NonGET(t *testing.T) {
	tmpDir := t.TempDir()
	handler := NewStaticHandler(tmpDir)

	req := httptest.NewRequest("POST", "/", nil)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusNotFound {
		t.Errorf("POST to / got status %d, want %d", rr.Code, http.StatusNotFound)
	}
}

func TestStaticHandler_MissingIndex(t *testing.T) {
	tmpDir := t.TempDir()
	handler := NewStaticHandler(tmpDir)

	req := httptest.NewRequest("GET", "/", nil)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	// Should return 404 when index.html doesn't exist
	if rr.Code != http.StatusNotFound {
		t.Errorf("got status %d, want %d", rr.Code, http.StatusNotFound)
	}
}
