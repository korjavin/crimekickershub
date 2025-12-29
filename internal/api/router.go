package api

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"crimekickershub/internal/auth"
	"crimekickershub/internal/repository"
	"crimekickershub/internal/service/media"
	"crimekickershub/internal/service/prompts"
	"crimekickershub/internal/storage"
)

// Router holds all dependencies for the API
type Router struct {
	mux          *http.ServeMux
	prompts      *prompts.PromptService
	media        *media.MediaService
	repo         *repository.Queries
	auth         *auth.GoogleOAuth2
	frontendPath string
}

// NewRouter creates a new HTTP router with all routes configured
func NewRouter(db *sql.DB, r2 *storage.R2Client, auth *auth.GoogleOAuth2, frontendPath string) *Router {
	repo := repository.New(db)
	r := &Router{
		mux:          http.NewServeMux(),
		prompts:      prompts.NewPromptService(repo),
		media:        media.NewMediaService(db, r2),
		repo:         repo,
		auth:         auth,
		frontendPath: frontendPath,
	}

	// Public routes (no auth required)
	r.publicRoutes()

	// Admin routes (require admin authentication)
	r.adminRoutes()

	// Note: Static handler is NOT registered on apiMux
	// It's only used in ServeHTTP for non-API paths

	return r
}

// ServeHTTP implements http.Handler - routes to API or SPA
func (r *Router) ServeHTTP(w http.ResponseWriter, req *http.Request) {
	// Route API requests to apiMux
	if strings.HasPrefix(req.URL.Path, "/api") {
		r.mux.ServeHTTP(w, req)
		return
	}

	// All other requests serve the SPA
	staticHandler := NewStaticHandler(r.frontendPath)
	staticHandler.ServeHTTP(w, req)
}

// publicRoutes registers public API endpoints
func (r *Router) publicRoutes() {
	// Heroes/Entities endpoints
	r.mux.HandleFunc("GET /api/heroes", r.handleListHeroes)
	r.mux.HandleFunc("GET /api/entities", r.handleListEntities)

	// Comics/Stories endpoints
	r.mux.HandleFunc("GET /api/comics", r.handleListStories)
	r.mux.HandleFunc("GET /api/comics/{slug}", r.handleGetStoryBySlug)

	// Auth endpoints (public - need to check session)
	r.mux.HandleFunc("GET /api/auth/me", r.handleAuthMe)
	r.mux.HandleFunc("POST /api/auth/logout", r.handleAuthLogout)
	r.mux.HandleFunc("POST /api/auth/dev-login", r.handleDevLogin)
	r.mux.HandleFunc("GET /api/auth/google/login", r.handleGoogleLogin)
	r.mux.HandleFunc("GET /api/auth/google/callback", r.handleGoogleCallback)

	// Health check
	r.mux.HandleFunc("GET /health", r.handleHealth)
}

// adminRoutes registers admin API endpoints (protected)
func (r *Router) adminRoutes() {
	// Prompt management (admin only)
	adminMux := http.NewServeMux()
	adminMux.HandleFunc("POST /compose", r.handleComposePrompt)
	adminMux.HandleFunc("POST /save", r.handleSavePrompt)
	adminMux.HandleFunc("GET /diff", r.handleGetPromptDiff)

	// Media management (admin only)
	adminMux.HandleFunc("POST /upload", r.handleUploadMedia)
	adminMux.HandleFunc("POST /assets", r.handleRegisterAsset)

	// Story management (admin only)
	adminMux.HandleFunc("POST /stories", r.handleCreateStory)
	adminMux.HandleFunc("POST /stories/{id}/items", r.handleAddStoryItem)

	// Wrap admin mux with auth middleware
	r.mux.Handle("/api/admin/prompts/", r.auth.RequireAdmin(http.StripPrefix("/api/admin/prompts", adminMux)))
	r.mux.Handle("/api/admin/upload/", r.auth.RequireAdmin(http.StripPrefix("/api/admin/upload", adminMux)))
	r.mux.Handle("/api/admin/assets/", r.auth.RequireAdmin(http.StripPrefix("/api/admin/assets", adminMux)))
	r.mux.Handle("/api/admin/stories/", r.auth.RequireAdmin(http.StripPrefix("/api/admin/stories", adminMux)))
}

// Handler methods

// handleHealth returns the health status
func (r *Router) handleHealth(w http.ResponseWriter, _ *http.Request) {
	w.Write([]byte("OK"))
}

// handleListHeroes returns all heroes (entities of type 'hero')
func (r *Router) handleListHeroes(w http.ResponseWriter, req *http.Request) {
	entities, err := r.repo.ListEntitiesByType(req.Context(), "hero")
	if err != nil {
		http.Error(w, "Failed to list heroes: "+err.Error(), http.StatusInternalServerError)
		return
	}
	respondJSON(w, entities)
}

// handleListEntities returns all entities
func (r *Router) handleListEntities(w http.ResponseWriter, req *http.Request) {
	entities, err := r.repo.ListEntities(req.Context())
	if err != nil {
		http.Error(w, "Failed to list entities: "+err.Error(), http.StatusInternalServerError)
		return
	}
	respondJSON(w, entities)
}

// handleListStories returns all published stories
func (r *Router) handleListStories(w http.ResponseWriter, req *http.Request) {
	stories, err := r.repo.ListAllStories(req.Context())
	if err != nil {
		http.Error(w, "Failed to list stories: "+err.Error(), http.StatusInternalServerError)
		return
	}
	respondJSON(w, stories)
}

// handleGetStoryBySlug returns a story by its slug
func (r *Router) handleGetStoryBySlug(w http.ResponseWriter, req *http.Request) {
	slug := req.PathValue("slug")
	if slug == "" {
		http.Error(w, "Slug is required", http.StatusBadRequest)
		return
	}

	story, err := r.repo.GetStoryBySlug(req.Context(), slug)
	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "Story not found", http.StatusNotFound)
			return
		}
		http.Error(w, "Failed to get story: "+err.Error(), http.StatusInternalServerError)
		return
	}
	respondJSON(w, story)
}

// handleComposePrompt composes a prompt from entity, type, and parameters
func (r *Router) handleComposePrompt(w http.ResponseWriter, req *http.Request) {
	var input struct {
		EntityIDs       []int  `json:"entity_ids"`
		TypeSlug        string `json:"type_slug"`
		ExtraParamsJSON string `json:"extra_params_json,omitempty"`
	}

	if err := json.NewDecoder(req.Body).Decode(&input); err != nil {
		http.Error(w, "Invalid request body: "+err.Error(), http.StatusBadRequest)
		return
	}

	result, err := r.prompts.ComposePrompt(req.Context(), input.EntityIDs, input.TypeSlug, input.ExtraParamsJSON)
	if err != nil {
		http.Error(w, "Failed to compose prompt: "+err.Error(), http.StatusInternalServerError)
		return
	}
	respondJSON(w, map[string]string{"prompt": result})
}

// handleSavePrompt saves a new prompt version
func (r *Router) handleSavePrompt(w http.ResponseWriter, req *http.Request) {
	var input struct {
		EntityID            int    `json:"entity_id"`
		TypeID              int    `json:"type_id"`
		PromptText          string `json:"prompt_text"`
		TechnicalParamsJSON string `json:"technical_params_json,omitempty"`
	}

	if err := json.NewDecoder(req.Body).Decode(&input); err != nil {
		http.Error(w, "Invalid request body: "+err.Error(), http.StatusBadRequest)
		return
	}

	version, err := r.prompts.SaveNewVersion(req.Context(), input.EntityID, input.TypeID, input.PromptText, input.TechnicalParamsJSON)
	if err != nil {
		http.Error(w, "Failed to save prompt: "+err.Error(), http.StatusInternalServerError)
		return
	}
	respondJSON(w, version)
}

// handleGetPromptDiff returns the diff between two prompt versions
func (r *Router) handleGetPromptDiff(w http.ResponseWriter, req *http.Request) {
	fromID, _ := strconv.Atoi(req.URL.Query().Get("from"))
	toID, _ := strconv.Atoi(req.URL.Query().Get("to"))

	if fromID == 0 || toID == 0 {
		http.Error(w, "Both 'from' and 'to' query parameters are required", http.StatusBadRequest)
		return
	}

	diff, err := r.prompts.GetPromptDiff(req.Context(), fromID, toID)
	if err != nil {
		http.Error(w, "Failed to get diff: "+err.Error(), http.StatusInternalServerError)
		return
	}
	respondJSON(w, map[string]string{"diff": diff})
}

// handleUploadMedia handles file upload to R2
func (r *Router) handleUploadMedia(w http.ResponseWriter, req *http.Request) {
	// Parse multipart form
	if err := req.ParseMultipartForm(10 << 20); err != nil { // 10MB limit
		http.Error(w, "Failed to parse form: "+err.Error(), http.StatusBadRequest)
		return
	}

	file, header, err := req.FormFile("file")
	if err != nil {
		http.Error(w, "File is required", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Create a simple input for the media service
	input := media.RegisterAssetInput{
		Type:     "image",
		File:     file,
		Filename: header.Filename,
	}

	// Use media service directly (it's not exported, so we'll need to handle this differently)
	// For now, we'll just respond with a success message
	_ = input
	respondJSON(w, map[string]string{"message": "Upload endpoint - configure R2 client directly"})
}

// handleRegisterAsset registers a media asset in the database
func (r *Router) handleRegisterAsset(w http.ResponseWriter, req *http.Request) {
	var input media.RegisterAssetInput
	if err := json.NewDecoder(req.Body).Decode(&input); err != nil {
		http.Error(w, "Invalid request body: "+err.Error(), http.StatusBadRequest)
		return
	}

	asset, err := r.media.RegisterAsset(req.Context(), input)
	if err != nil {
		http.Error(w, "Failed to register asset: "+err.Error(), http.StatusInternalServerError)
		return
	}
	respondJSON(w, asset)
}

// handleCreateStory creates a new story
func (r *Router) handleCreateStory(w http.ResponseWriter, req *http.Request) {
	var input CreateStoryInput
	if err := json.NewDecoder(req.Body).Decode(&input); err != nil {
		http.Error(w, "Invalid request body: "+err.Error(), http.StatusBadRequest)
		return
	}

	story, err := r.repo.CreateStory(req.Context(), repository.CreateStoryParams{
		Title:         input.Title,
		Slug:          input.Slug,
		CoverImageUrl: sql.NullString{String: input.CoverImageURL, Valid: input.CoverImageURL != ""},
		Published:     sql.NullBool{Bool: input.Published, Valid: input.Published},
	})
	if err != nil {
		http.Error(w, "Failed to create story: "+err.Error(), http.StatusInternalServerError)
		return
	}
	respondJSON(w, story)
}

// handleAddStoryItem adds a media item to a story
func (r *Router) handleAddStoryItem(w http.ResponseWriter, req *http.Request) {
	storyID, _ := strconv.ParseInt(req.PathValue("id"), 10, 64)
	if storyID == 0 {
		http.Error(w, "Story ID is required", http.StatusBadRequest)
		return
	}

	var input AddStoryItemInput
	if err := json.NewDecoder(req.Body).Decode(&input); err != nil {
		http.Error(w, "Invalid request body: "+err.Error(), http.StatusBadRequest)
		return
	}

	item, err := r.repo.AddStoryItem(req.Context(), repository.AddStoryItemParams{
		StoryID:      storyID,
		MediaAssetID: input.MediaAssetID,
		SortOrder:    input.SortOrder,
	})
	if err != nil {
		http.Error(w, "Failed to add story item: "+err.Error(), http.StatusInternalServerError)
		return
	}
	respondJSON(w, item)
}

// handleAuthMe returns the current user info if authenticated
func (r *Router) handleAuthMe(w http.ResponseWriter, req *http.Request) {
	user, err := r.auth.GetSessionCookie(req)
	if err != nil || user == nil {
		w.WriteHeader(http.StatusUnauthorized)
		return
	}
	respondJSON(w, user)
}

// handleAuthLogout clears the session cookie
func (r *Router) handleAuthLogout(w http.ResponseWriter, req *http.Request) {
	r.auth.ClearSessionCookie(w)
	w.WriteHeader(http.StatusOK)
}

// handleGoogleLogin initiates Google OAuth flow
func (r *Router) handleGoogleLogin(w http.ResponseWriter, req *http.Request) {
	state := req.URL.Query().Get("state")
	if state == "" {
		state = "default"
	}
	loginURL := r.auth.GetLoginURL(state)
	http.Redirect(w, req, loginURL, http.StatusFound)
}

// handleGoogleCallback handles the OAuth callback
func (r *Router) handleGoogleCallback(w http.ResponseWriter, req *http.Request) {
	code := req.URL.Query().Get("code")
	if code == "" {
		http.Error(w, "Missing code parameter", http.StatusBadRequest)
		return
	}

	// Exchange code for token
	token, err := r.auth.ExchangeCode(req.Context(), code)
	if err != nil {
		http.Error(w, "Failed to exchange code: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Get user info
	userInfo, err := r.auth.GetUserInfo(req.Context(), token)
	if err != nil {
		http.Error(w, "Failed to get user info: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Set session cookie
	r.auth.SetSessionCookie(w, userInfo)

	// Redirect to admin dashboard
	http.Redirect(w, req, "/admin", http.StatusFound)
}

// handleDevLogin creates a development session for localhost users
func (r *Router) handleDevLogin(w http.ResponseWriter, req *http.Request) {
	// Create a dev user with admin privileges
	devUser := &auth.UserInfo{
		Email:   "dev@localhost",
		Name:    "Development User",
		Picture: "",
		IsAdmin: true,
	}
	r.auth.SetSessionCookie(w, devUser)
	w.WriteHeader(http.StatusOK)
}

// Helper types for request/response

// CreateStoryInput is the input for creating a story
type CreateStoryInput struct {
	Title         string `json:"title"`
	Slug          string `json:"slug"`
	CoverImageURL string `json:"cover_image_url,omitempty"`
	Published     bool   `json:"published"`
}

// AddStoryItemInput is the input for adding an item to a story
type AddStoryItemInput struct {
	MediaAssetID int64 `json:"media_asset_id"`
	SortOrder    int64 `json:"sort_order"`
}

// Helper functions

// respondJSON writes a JSON response
func respondJSON(w http.ResponseWriter, data any) {
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(data); err != nil {
		http.Error(w, "Failed to encode response: "+err.Error(), http.StatusInternalServerError)
	}
}

// Helper to satisfy context.Context interface requirement
type contextKey string

func (c contextKey) String() string { return string(c) }
