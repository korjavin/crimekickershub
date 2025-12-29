package api

import (
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

// StaticHandler serves static frontend files with SPA fallback
type StaticHandler struct {
	frontendPath string
}

// NewStaticHandler creates a new static file handler
func NewStaticHandler(frontendPath string) *StaticHandler {
	return &StaticHandler{
		frontendPath: frontendPath,
	}
}

// ServeHTTP implements http.Handler
func (h *StaticHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Path

	log.Printf("StaticHandler: path=%q, frontendPath=%q", path, h.frontendPath)

	// Only handle GET requests
	if r.Method != http.MethodGet {
		http.NotFound(w, r)
		return
	}

	// Clean the path
	path = strings.TrimPrefix(path, "/")

	// Build full path - always join with frontendPath
	var fullPath string
	if path == "" {
		fullPath = filepath.Join(h.frontendPath, "index.html")
	} else {
		fullPath = filepath.Join(h.frontendPath, path)
	}

	log.Printf("StaticHandler: fullPath=%q", fullPath)

	// Check if file exists
	info, err := os.Stat(fullPath)
	if err != nil {
		log.Printf("StaticHandler: file not found, err=%v", err)
		// Serve index.html for SPA routing
		h.serveIndex(w, r)
		return
	}

	if info.IsDir() {
		log.Printf("StaticHandler: path is directory")
		h.serveIndex(w, r)
		return
	}

	log.Printf("StaticHandler: serving file")
	// Serve the file using http.ServeFile
	http.ServeFile(w, r, fullPath)
}

// serveIndex serves the index.html file for SPA routing
func (h *StaticHandler) serveIndex(w http.ResponseWriter, r *http.Request) {
	indexPath := filepath.Join(h.frontendPath, "index.html")

	log.Printf("StaticHandler: serveIndex, indexPath=%q", indexPath)

	content, err := os.ReadFile(indexPath)
	if err != nil {
		log.Printf("StaticHandler: failed to read index.html, err=%v", err)
		http.Error(w, "Frontend not found", http.StatusNotFound)
		return
	}

	log.Printf("StaticHandler: serving index.html, size=%d", len(content))
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Header().Set("Cache-Control", "no-cache")
	w.Write(content)
}
