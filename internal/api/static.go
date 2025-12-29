package api

import (
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

// NewStaticHandler creates an http.Handler for serving static frontend files
// with SPA fallback for non-existent paths
func NewStaticHandler(frontendPath string) http.Handler {
	return &staticHandler{
		frontendPath: frontendPath,
	}
}

type staticHandler struct {
	frontendPath string
}

// ServeHTTP implements http.Handler
func (h *staticHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Path

	// Clean the path
	path = strings.TrimPrefix(path, "/")
	if path == "" {
		path = "index.html"
	}

	// Build full filesystem path
	fullPath := filepath.Join(h.frontendPath, path)

	// Check if file exists
	info, err := os.Stat(fullPath)
	if err != nil || info.IsDir() {
		// Serve index.html for SPA routing
		h.serveIndex(w, r)
		return
	}

	// Serve the file using http.ServeFile
	http.ServeFile(w, r, fullPath)
}

// serveIndex serves the index.html file for SPA routing
func (h *staticHandler) serveIndex(w http.ResponseWriter, r *http.Request) {
	indexPath := filepath.Join(h.frontendPath, "index.html")

	content, err := os.ReadFile(indexPath)
	if err != nil {
		http.Error(w, "Frontend not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Header().Set("Cache-Control", "no-cache")
	w.Write(content)
}
