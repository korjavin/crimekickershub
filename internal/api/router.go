package api

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

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
	r2           *storage.R2Client
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

	// Initialize R2 client field
	r.r2 = r2
	// It's only used in ServeHTTP for non-API paths

	return r
}

// ServeHTTP implements http.Handler - routes to API or SPA
func (r *Router) ServeHTTP(w http.ResponseWriter, req *http.Request) {
	// Apply CORS middleware to all requests
	handler := corsMiddleware(r.mux)

	// Route API requests to mux
	if strings.HasPrefix(req.URL.Path, "/api") {
		handler.ServeHTTP(w, req)
		return
	}

	// Route auth callback paths (used by OAuth, not prefixed with /api)
	if strings.HasPrefix(req.URL.Path, "/auth/") {
		handler.ServeHTTP(w, req)
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

	// OAuth endpoints (both with and without /api prefix for compatibility)
	r.mux.HandleFunc("GET /api/auth/google/login", r.handleGoogleLogin)
	r.mux.HandleFunc("GET /api/auth/google/callback", r.handleGoogleCallback)
	r.mux.HandleFunc("GET /auth/google/login", r.handleGoogleLogin)
	r.mux.HandleFunc("GET /auth/google/callback", r.handleGoogleCallback)

	// Health check
	r.mux.HandleFunc("GET /api/health", r.handleHealth)
}

// adminRoutes registers admin API endpoints (protected)
func (r *Router) adminRoutes() {
	// Prompts management (admin only)
	r.mux.Handle("GET /api/admin/prompts", r.auth.RequireAdmin(http.HandlerFunc(r.handleListPromptVersions)))
	r.mux.Handle("GET /api/admin/prompts/recent", r.auth.RequireAdmin(http.HandlerFunc(r.handleListRecentPromptVersions)))
	r.mux.Handle("GET /api/admin/prompts/types", r.auth.RequireAdmin(http.HandlerFunc(r.handleListPromptTypes)))
	r.mux.Handle("POST /api/admin/prompts/types", r.auth.RequireAdmin(http.HandlerFunc(r.handleCreatePromptType)))
	r.mux.Handle("PUT /api/admin/prompts/types/{id}", r.auth.RequireAdmin(http.HandlerFunc(r.handleUpdatePromptType)))
	r.mux.Handle("DELETE /api/admin/prompts/types/{id}", r.auth.RequireAdmin(http.HandlerFunc(r.handleDeletePromptType)))
	r.mux.Handle("POST /api/admin/prompts/compose", r.auth.RequireAdmin(http.HandlerFunc(r.handleComposePrompt)))
	r.mux.Handle("POST /api/admin/prompts/save", r.auth.RequireAdmin(http.HandlerFunc(r.handleSavePrompt)))
	r.mux.Handle("GET /api/admin/prompts/diff", r.auth.RequireAdmin(http.HandlerFunc(r.handleGetPromptDiff)))

	// Upload (admin only)
	r.mux.Handle("POST /api/admin/upload", r.auth.RequireAdmin(http.HandlerFunc(r.handleUploadMedia)))
	r.mux.Handle("POST /api/admin/upload/presigned", r.auth.RequireAdmin(http.HandlerFunc(r.handleGetPresignedUploadURL)))

	// Media management (admin only)
	r.mux.Handle("GET /api/admin/media", r.auth.RequireAdmin(http.HandlerFunc(r.handleListMedia)))

	// Assets management (admin only)
	r.mux.Handle("POST /api/admin/assets", r.auth.RequireAdmin(http.HandlerFunc(r.handleRegisterAsset)))

	// Stories management (admin only)
	r.mux.Handle("GET /api/admin/stories", r.auth.RequireAdmin(http.HandlerFunc(r.handleListStoriesAdmin)))
	r.mux.Handle("POST /api/admin/stories", r.auth.RequireAdmin(http.HandlerFunc(r.handleCreateStory)))
	r.mux.Handle("GET /api/admin/stories/{id}", r.auth.RequireAdmin(http.HandlerFunc(r.handleGetStory)))
	r.mux.Handle("PUT /api/admin/stories/{id}", r.auth.RequireAdmin(http.HandlerFunc(r.handleUpdateStory)))           // Legacy/General update
	r.mux.Handle("PUT /api/admin/stories/{id}/items", r.auth.RequireAdmin(http.HandlerFunc(r.handleUpdateStoryItems))) // Sequence update
	r.mux.Handle("POST /api/admin/stories/{id}/items", r.auth.RequireAdmin(http.HandlerFunc(r.handleAddStoryItem)))
	r.mux.Handle("DELETE /api/admin/stories/{id}/items/{itemId}", r.auth.RequireAdmin(http.HandlerFunc(r.handleDeleteStoryItem)))

	// Entities management (admin only)
	r.mux.Handle("GET /api/admin/entities", r.auth.RequireAdmin(http.HandlerFunc(r.handleListEntities)))
	r.mux.Handle("POST /api/admin/entities", r.auth.RequireAdmin(http.HandlerFunc(r.handleCreateEntity)))
	r.mux.Handle("PUT /api/admin/entities/{id}", r.auth.RequireAdmin(http.HandlerFunc(r.handleUpdateEntity)))
	r.mux.Handle("DELETE /api/admin/entities/{id}", r.auth.RequireAdmin(http.HandlerFunc(r.handleDeleteEntity)))

	// Matrix view (admin only)
	r.mux.Handle("GET /api/admin/matrix", r.auth.RequireAdmin(http.HandlerFunc(r.handleGetMatrix)))
}

// Handler methods

// handleHealth returns the health status including R2 availability
func (r *Router) handleHealth(w http.ResponseWriter, _ *http.Request) {
	r2Available := false
	if r.r2 != nil {
		r2Available = r.r2.IsAvailable()
	}
	status := map[string]interface{}{
		"status": "healthy",
		"r2": map[string]interface{}{
			"available": r2Available,
		},
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(status)
}

// handleListHeroes returns all heroes (entities of type 'hero')
func (r *Router) handleListHeroes(w http.ResponseWriter, req *http.Request) {
	entities, err := r.repo.ListEntitiesByType(req.Context(), "hero")
	if err != nil {
		http.Error(w, "Failed to list heroes: "+err.Error(), http.StatusInternalServerError)
		return
	}
	respondJSON(w, toEntityDTOs(entities))
}

// handleListEntities returns all entities (optionally filtered by type query param)
func (r *Router) handleListEntities(w http.ResponseWriter, req *http.Request) {
	// Check if filtering by type
	entityType := req.URL.Query().Get("type")
	var entities []repository.Entity
	var err error

	if entityType != "" {
		// Filter by type (case-insensitive)
		entities, err = r.repo.ListEntitiesByType(req.Context(), entityType)
	} else {
		// Return all entities
		entities, err = r.repo.ListEntities(req.Context())
	}

	if err != nil {
		http.Error(w, "Failed to list entities: "+err.Error(), http.StatusInternalServerError)
		return
	}
	respondJSON(w, toEntityDTOs(entities))
}

// handleListStories returns all published stories
func (r *Router) handleListStories(w http.ResponseWriter, req *http.Request) {
	stories, err := r.repo.ListPublishedStories(req.Context())
	if err != nil {
		http.Error(w, "Failed to list stories: "+err.Error(), http.StatusInternalServerError)
		return
	}
	if stories == nil {
		stories = []repository.Story{}
	}

	// Helper struct to flatten response
	type StoryDTO struct {
		ID            int64   `json:"id"`
		Title         string  `json:"title"`
		Slug          string  `json:"slug"`
		CoverImageURL *string `json:"cover_image_url"`
		Published     bool    `json:"published"`
		CreatedAt     string  `json:"created_at"`
	}

	dtos := make([]StoryDTO, len(stories))
	for i, s := range stories {
		dto := StoryDTO{
			ID:        s.ID,
			Title:     s.Title,
			Slug:      s.Slug,
			Published: s.Published.Bool,
		}
		if s.CoverImageUrl.Valid {
			dto.CoverImageURL = &s.CoverImageUrl.String
		}
		if s.CreatedAt.Valid {
			dto.CreatedAt = s.CreatedAt.Time.Format("2006-01-02T15:04:05Z")
		}
		dtos[i] = dto
	}

	respondJSON(w, dtos)
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

	// Get all media assets for the story using a single query
	mediaAssets, err := r.repo.ListMediaByStory(req.Context(), story.ID)
	if err != nil {
		http.Error(w, "Failed to get story media: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Build response
	type PublicStoryItemResponse struct {
		Type        string `json:"type"`
		URL         string `json:"url,omitempty"`
		YoutubeID   string `json:"youtube_id,omitempty"`
		AspectRatio string `json:"aspect_ratio,omitempty"` // Placeholder for now
	}

	type PublicStoryResponse struct {
		Title string                    `json:"title"`
		Items []PublicStoryItemResponse `json:"items"`
	}

	response := PublicStoryResponse{
		Title: story.Title,
		Items: make([]PublicStoryItemResponse, 0, len(mediaAssets)),
	}

	for _, media := range mediaAssets {
		mediaDTO := r.toMediaAssetDTO(media)
		itemResp := PublicStoryItemResponse{
			Type: mediaDTO.Type,
		}

		if mediaDTO.Type == "video" && mediaDTO.YoutubeID != nil {
			itemResp.YoutubeID = *mediaDTO.YoutubeID
			itemResp.AspectRatio = "16:9" // Default for YouTube
		} else if mediaDTO.URL != nil {
			itemResp.URL = *mediaDTO.URL
			itemResp.AspectRatio = "1:1" // Default/Placeholder for images
		}

		response.Items = append(response.Items, itemResp)
	}

	respondJSON(w, response)
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

// handleListPromptTypes returns all prompt types
func (r *Router) handleListPromptTypes(w http.ResponseWriter, req *http.Request) {
	promptTypes, err := r.repo.ListPromptTypes(req.Context())
	if err != nil {
		http.Error(w, "Failed to list prompt types: "+err.Error(), http.StatusInternalServerError)
		return
	}
	if promptTypes == nil {
		promptTypes = []repository.PromptType{}
	}
	respondJSON(w, toPromptTypeDTOs(promptTypes))
}

// handleCreatePromptType creates a new prompt type
func (r *Router) handleCreatePromptType(w http.ResponseWriter, req *http.Request) {
	var input CreatePromptTypeInput
	if err := json.NewDecoder(req.Body).Decode(&input); err != nil {
		http.Error(w, "Invalid request body: "+err.Error(), http.StatusBadRequest)
		return
	}

	promptType, err := r.repo.CreatePromptType(req.Context(), repository.CreatePromptTypeParams{
		Slug:         input.Slug,
		Description:  sql.NullString{String: input.Description, Valid: input.Description != ""},
		TemplateText: input.TemplateText,
	})
	if err != nil {
		http.Error(w, "Failed to create prompt type: "+err.Error(), http.StatusInternalServerError)
		return
	}
	respondJSON(w, toPromptTypeDTO(promptType))
}

// handleUpdatePromptType updates an existing prompt type
func (r *Router) handleUpdatePromptType(w http.ResponseWriter, req *http.Request) {
	typeID, _ := strconv.ParseInt(req.PathValue("id"), 10, 64)
	if typeID == 0 {
		http.Error(w, "Prompt type ID is required", http.StatusBadRequest)
		return
	}

	var input UpdatePromptTypeInput
	if err := json.NewDecoder(req.Body).Decode(&input); err != nil {
		http.Error(w, "Invalid request body: "+err.Error(), http.StatusBadRequest)
		return
	}

	// Get current prompt type to have values for update
	current, err := r.repo.GetPromptTypeByID(req.Context(), typeID)
	if err != nil && err != sql.ErrNoRows {
		http.Error(w, "Failed to get current prompt type: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Use provided values or fall back to current values
	slug := input.Slug
	if slug == nil {
		slug = &current.Slug
	}
	templateText := input.TemplateText
	if templateText == nil {
		templateText = &current.TemplateText
	}

	// Handle description - it's sql.NullString in the model
	var description sql.NullString
	if input.Description != nil {
		description = sql.NullString{String: *input.Description, Valid: *input.Description != ""}
	} else if current.Description.Valid {
		description = current.Description
	}

	err = r.repo.UpdatePromptType(req.Context(), repository.UpdatePromptTypeParams{
		Slug:         *slug,
		Description:  description,
		TemplateText: *templateText,
		ID:           typeID,
	})
	if err != nil {
		http.Error(w, "Failed to update prompt type: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Fetch and return the updated prompt type
	updated, err := r.repo.GetPromptTypeByID(req.Context(), typeID)
	if err != nil {
		http.Error(w, "Failed to fetch updated prompt type: "+err.Error(), http.StatusInternalServerError)
		return
	}
	respondJSON(w, toPromptTypeDTO(updated))
}

// handleDeletePromptType deletes a prompt type
func (r *Router) handleDeletePromptType(w http.ResponseWriter, req *http.Request) {
	typeID, _ := strconv.ParseInt(req.PathValue("id"), 10, 64)
	if typeID == 0 {
		http.Error(w, "Prompt type ID is required", http.StatusBadRequest)
		return
	}

	err := r.repo.DeletePromptType(req.Context(), typeID)
	if err != nil {
		http.Error(w, "Failed to delete prompt type: "+err.Error(), http.StatusInternalServerError)
		return
	}

	respondJSON(w, map[string]bool{"success": true})
}

// handleListPromptVersions returns all prompt versions
func (r *Router) handleListPromptVersions(w http.ResponseWriter, req *http.Request) {
	versions, err := r.repo.ListAllPromptVersions(req.Context())
	if err != nil {
		http.Error(w, "Failed to list prompt versions: "+err.Error(), http.StatusInternalServerError)
		return
	}
	if versions == nil {
		versions = []repository.PromptVersion{}
	}
	respondJSON(w, versions)
}

// handleListRecentPromptVersions returns the 10 most recent prompt versions
func (r *Router) handleListRecentPromptVersions(w http.ResponseWriter, req *http.Request) {
	// For now, just return the last 10 from ListAllPromptVersions
	versions, err := r.repo.ListAllPromptVersions(req.Context())
	if err != nil {
		http.Error(w, "Failed to list prompt versions: "+err.Error(), http.StatusInternalServerError)
		return
	}
	if versions == nil {
		versions = []repository.PromptVersion{}
	}
	// Return last 10 (they're already ordered by created_at DESC from the query)
	if len(versions) > 10 {
		versions = versions[:10]
	}
	respondJSON(w, versions)
}

// handleUploadMedia handles file upload to R2
func (r *Router) handleUploadMedia(w http.ResponseWriter, req *http.Request) {
	log.Printf("Upload request started from %s", req.RemoteAddr)

	// Parse multipart form
	if err := req.ParseMultipartForm(50 << 20); err != nil { // 50MB limit
		log.Printf("ERROR: Failed to parse multipart form: %v", err)
		http.Error(w, "Failed to parse form: "+err.Error(), http.StatusBadRequest)
		return
	}

	file, header, err := req.FormFile("file")
	if err != nil {
		log.Printf("ERROR: Failed to get file from form: %v", err)
		http.Error(w, "File is required", http.StatusBadRequest)
		return
	}
	defer file.Close()

	log.Printf("Uploading file: %s (size: %d bytes)", header.Filename, header.Size)

	// Read file content for the media service
	fileContent, err := io.ReadAll(file)
	if err != nil {
		log.Printf("ERROR: Failed to read file content: %v", err)
		http.Error(w, "Failed to read file: "+err.Error(), http.StatusBadRequest)
		return
	}

	// Create input for the media service
	input := media.RegisterAssetInput{
		Type:     "image",
		File:     bytes.NewReader(fileContent),
		Filename: header.Filename,
	}

	asset, err := r.media.RegisterAsset(req.Context(), input)
	if err != nil {
		log.Printf("ERROR: Failed to register asset: %v", err)
		http.Error(w, "Failed to register asset: "+err.Error(), http.StatusInternalServerError)
		return
	}

	dto := r.toMediaAssetDTO(*asset)
	log.Printf("Upload successful: ID=%d, URL=%v, Type=%s", dto.ID, dto.URL, dto.Type)
	respondJSON(w, dto)
}

// handleGetPresignedUploadURL generates a presigned URL for direct browser upload to R2
func (r *Router) handleGetPresignedUploadURL(w http.ResponseWriter, req *http.Request) {
	var input struct {
		Filename    string `json:"filename"`
		ContentType string `json:"contentType"`
	}

	if err := json.NewDecoder(req.Body).Decode(&input); err != nil {
		http.Error(w, "Invalid request body: "+err.Error(), http.StatusBadRequest)
		return
	}

	if input.Filename == "" {
		http.Error(w, "filename is required", http.StatusBadRequest)
		return
	}

	if input.ContentType == "" {
		input.ContentType = "application/octet-stream"
	}

	// Generate unique filename with timestamp
	uniqueFilename := fmt.Sprintf("%d-%s", time.Now().Unix(), input.Filename)

	// Get presigned URL (15 minute expiration)
	presignedURL, err := r.r2.GetPresignedUploadURL(req.Context(), uniqueFilename, input.ContentType, 15)
	if err != nil {
		log.Printf("ERROR: Failed to generate presigned URL: %v", err)
		http.Error(w, "Failed to generate upload URL: "+err.Error(), http.StatusInternalServerError)
		return
	}

	respondJSON(w, map[string]string{
		"uploadURL": presignedURL,
		"key":       uniqueFilename,
		"publicURL": r.r2.GetPublicURL(uniqueFilename),
	})
}

// handleRegisterAsset registers a media asset in the database
// This endpoint handles assets that were already uploaded directly to R2
func (r *Router) handleRegisterAsset(w http.ResponseWriter, req *http.Request) {
	var input struct {
		Type            string `json:"type"`
		R2Key           string `json:"r2Key"`
		URL             string `json:"url"`
		PromptVersionID *int64 `json:"promptVersionId"`
	}

	if err := json.NewDecoder(req.Body).Decode(&input); err != nil {
		http.Error(w, "Invalid request body: "+err.Error(), http.StatusBadRequest)
		return
	}

	// Validate input
	if input.Type != "image" && input.Type != "video" {
		http.Error(w, "type must be 'image' or 'video'", http.StatusBadRequest)
		return
	}

	if input.Type == "image" && input.R2Key == "" {
		http.Error(w, "r2Key is required for images", http.StatusBadRequest)
		return
	}

	// Create media asset directly in database (file already uploaded to R2)
	asset, err := r.repo.CreateMediaAsset(req.Context(), repository.CreateMediaAssetParams{
		Type:                  input.Type,
		R2Key:                 sql.NullString{String: input.R2Key, Valid: input.R2Key != ""},
		YoutubeID:             sql.NullString{}, // Not used for direct uploads
		SourcePromptVersionID: nullInt64Ptr(input.PromptVersionID),
	})
	if err != nil {
		http.Error(w, "Failed to create media asset: "+err.Error(), http.StatusInternalServerError)
		return
	}

	dto := r.toMediaAssetDTO(asset)
	respondJSON(w, dto)
}

// nullInt64Ptr converts *int64 to sql.NullInt64
func nullInt64Ptr(v *int64) sql.NullInt64 {
	if v == nil {
		return sql.NullInt64{Valid: false}
	}
	return sql.NullInt64{Int64: *v, Valid: true}
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

// handleListMedia returns all media assets
func (r *Router) handleListMedia(w http.ResponseWriter, req *http.Request) {
	assets, err := r.media.ListAssets(req.Context())
	if err != nil {
		http.Error(w, "Failed to list media assets: "+err.Error(), http.StatusInternalServerError)
		return
	}
	// Ensure we always return an array, not null
	if assets == nil {
		assets = []repository.MediaAsset{}
	}
	respondJSON(w, r.toMediaAssetDTOs(assets))
}

// handleListStoriesAdmin returns all stories (for admin)
func (r *Router) handleListStoriesAdmin(w http.ResponseWriter, req *http.Request) {
	stories, err := r.repo.ListAllStories(req.Context())
	if err != nil {
		http.Error(w, "Failed to list stories: "+err.Error(), http.StatusInternalServerError)
		return
	}
	if stories == nil {
		stories = []repository.Story{}
	}
	respondJSON(w, stories)
}

// handleGetStory returns a story with its items
func (r *Router) handleGetStory(w http.ResponseWriter, req *http.Request) {
	storyID, _ := strconv.ParseInt(req.PathValue("id"), 10, 64)
	if storyID == 0 {
		http.Error(w, "Story ID is required", http.StatusBadRequest)
		return
	}

	// Get story details
	story, err := r.repo.GetStoryByID(req.Context(), storyID)
	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "Story not found", http.StatusNotFound)
			return
		}
		http.Error(w, "Failed to get story: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Get story items with media details
	items, err := r.repo.GetStoryItems(req.Context(), storyID)
	if err != nil {
		http.Error(w, "Failed to get story items: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Build response with media details for each item
	type StoryItemResponse struct {
		ID           int64                  `json:"id"`
		StoryID      int64                  `json:"story_id"`
		MediaAssetID int64                  `json:"media_asset_id"`
		SortOrder    int64                  `json:"sort_order"`
		Media        *repository.MediaAsset `json:"media,omitempty"`
	}

	response := map[string]interface{}{
		"id":              story.ID,
		"title":           story.Title,
		"slug":            story.Slug,
		"cover_image_url": story.CoverImageUrl,
		"published":       story.Published,
		"created_at":      story.CreatedAt,
		"items":           []StoryItemResponse{},
	}

	itemResponses := make([]StoryItemResponse, 0, len(items))
	for _, item := range items {
		itemResp := StoryItemResponse{
			ID:           item.ID,
			StoryID:      item.StoryID,
			MediaAssetID: item.MediaAssetID,
			SortOrder:    item.SortOrder,
		}

		// Fetch media asset details
		if item.MediaAssetID > 0 {
			media, err := r.repo.GetMediaAsset(req.Context(), item.MediaAssetID)
			if err == nil {
				itemResp.Media = &media
			}
		}

		itemResponses = append(itemResponses, itemResp)
	}

	response["items"] = itemResponses
	respondJSON(w, response)
}

// handleUpdateStory updates story metadata (title, slug, etc) - Placeholder for now if needed
// or we can keep it for backward compatibility or general updates
func (r *Router) handleUpdateStory(w http.ResponseWriter, req *http.Request) {
	// For now, redirect to handleUpdateStoryItems if the body looks like it has itemIds
	// But ideally we should separate concerns.
	// Since the previous implementation used this for sorting, let's keep it as is or deprecate it.
	// We'll leave it but implementing handleUpdateStoryItems for the specific route.
	r.handleUpdateStoryItems(w, req)
}

// handleUpdateStoryItems updates the sequence of items in a story
func (r *Router) handleUpdateStoryItems(w http.ResponseWriter, req *http.Request) {
	storyID, _ := strconv.ParseInt(req.PathValue("id"), 10, 64)
	if storyID == 0 {
		http.Error(w, "Story ID is required", http.StatusBadRequest)
		return
	}

	var input UpdateStoryInput
	// Use item_ids from json to match task description better, but keep itemIds support
	// decoding into struct UpdateStoryInput which has ItemIDs `json:"itemIds"`
	// We might need to support snake_case too if strict.
	// Let's check the struct definition.

	if err := json.NewDecoder(req.Body).Decode(&input); err != nil {
		http.Error(w, "Invalid request body: "+err.Error(), http.StatusBadRequest)
		return
	}

	// Update sort order for each item
	for i, itemID := range input.ItemIDs {
		err := r.repo.UpdateStoryItemSortOrder(req.Context(), repository.UpdateStoryItemSortOrderParams{
			SortOrder: int64(i),
			ID:        itemID,
		})
		if err != nil {
			http.Error(w, "Failed to update item sort order: "+err.Error(), http.StatusInternalServerError)
			return
		}
	}

	// Return updated story
	r.handleGetStory(w, req)
}

// handleDeleteStoryItem removes an item from a story
func (r *Router) handleDeleteStoryItem(w http.ResponseWriter, req *http.Request) {
	// storyID := req.PathValue("id") // Not strictly needed for the delete query but good for verification if we wanted
	itemID, _ := strconv.ParseInt(req.PathValue("itemId"), 10, 64)

	if itemID == 0 {
		http.Error(w, "Item ID is required", http.StatusBadRequest)
		return
	}

	err := r.repo.DeleteStoryItem(req.Context(), itemID)
	if err != nil {
		http.Error(w, "Failed to delete story item: "+err.Error(), http.StatusInternalServerError)
		return
	}

	respondJSON(w, map[string]bool{"success": true})
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

	// Log authentication attempt
	if userInfo.IsAdmin {
		log.Printf("Admin login successful: %s", userInfo.Email)
	} else {
		log.Printf("WARNING: Non-admin user attempted to login: %s", userInfo.Email)
	}

	// Set session cookie
	r.auth.SetSessionCookie(w, userInfo)

	// Redirect based on admin status
	if userInfo.IsAdmin {
		http.Redirect(w, req, "/admin", http.StatusFound)
	} else {
		// Redirect non-admin users to public area with error message
		http.Redirect(w, req, "/?error=unauthorized", http.StatusFound)
	}
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

// handleCreateEntity creates a new entity
func (r *Router) handleCreateEntity(w http.ResponseWriter, req *http.Request) {
	var input CreateEntityInput
	if err := json.NewDecoder(req.Body).Decode(&input); err != nil {
		http.Error(w, "Invalid request body: "+err.Error(), http.StatusBadRequest)
		return
	}

	entity, err := r.repo.CreateEntity(req.Context(), repository.CreateEntityParams{
		Slug:        input.Slug,
		Name:        input.Name,
		Type:        input.Type,
		Description: sql.NullString{String: input.Description, Valid: input.Description != ""},
		AvatarUrl:   sql.NullString{String: input.AvatarURL, Valid: input.AvatarURL != ""},
	})
	if err != nil {
		http.Error(w, "Failed to create entity: "+err.Error(), http.StatusInternalServerError)
		return
	}
	respondJSON(w, toEntityDTO(entity))
}

// handleUpdateEntity updates an existing entity
func (r *Router) handleUpdateEntity(w http.ResponseWriter, req *http.Request) {
	entityID, _ := strconv.ParseInt(req.PathValue("id"), 10, 64)
	if entityID == 0 {
		http.Error(w, "Entity ID is required", http.StatusBadRequest)
		return
	}

	var input UpdateEntityInput
	if err := json.NewDecoder(req.Body).Decode(&input); err != nil {
		http.Error(w, "Invalid request body: "+err.Error(), http.StatusBadRequest)
		return
	}

	// Get current entity to have values for COALESCE
	current, err := r.repo.GetEntityByID(req.Context(), entityID)
	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "Entity not found", http.StatusNotFound)
			return
		}
		http.Error(w, "Failed to get entity: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Use current values if not provided in input
	slug := input.Slug
	if slug == nil {
		slug = &current.Slug
	}
	name := input.Name
	if name == nil {
		name = &current.Name
	}
	typeStr := input.Type
	if typeStr == nil {
		typeStr = &current.Type
	}
	description := input.Description
	if description == nil && current.Description.Valid {
		description = &current.Description.String
	}
	avatarURL := input.AvatarURL
	if avatarURL == nil && current.AvatarUrl.Valid {
		avatarURL = &current.AvatarUrl.String
	}

	entity, err := r.repo.UpdateEntity(req.Context(), repository.UpdateEntityParams{
		Slug:        *slug,
		Name:        *name,
		Type:        *typeStr,
		Description: sql.NullString{String: *description, Valid: description != nil && *description != ""},
		AvatarUrl:   sql.NullString{String: *avatarURL, Valid: avatarURL != nil && *avatarURL != ""},
		ID:          entityID,
	})
	if err != nil {
		http.Error(w, "Failed to update entity: "+err.Error(), http.StatusInternalServerError)
		return
	}
	respondJSON(w, toEntityDTO(entity))
}

// handleDeleteEntity deletes an entity
func (r *Router) handleDeleteEntity(w http.ResponseWriter, req *http.Request) {
	entityID, _ := strconv.ParseInt(req.PathValue("id"), 10, 64)
	if entityID == 0 {
		http.Error(w, "Entity ID is required", http.StatusBadRequest)
		return
	}

	err := r.repo.DeleteEntity(req.Context(), entityID)
	if err != nil {
		http.Error(w, "Failed to delete entity: "+err.Error(), http.StatusInternalServerError)
		return
	}

	respondJSON(w, map[string]bool{"success": true})
}

// handleGetMatrix returns the prompt matrix data
func (r *Router) handleGetMatrix(w http.ResponseWriter, req *http.Request) {
	// Get all entities
	entities, err := r.repo.ListEntities(req.Context())
	if err != nil {
		http.Error(w, "Failed to list entities: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Get all prompt types
	promptTypes, err := r.repo.ListPromptTypes(req.Context())
	if err != nil {
		http.Error(w, "Failed to list prompt types: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Get all prompt versions with details
	versions, err := r.repo.ListAllPromptVersions(req.Context())
	if err != nil {
		http.Error(w, "Failed to list prompt versions: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Build version map: key = "entityID_typeID", value = version data
	versionMap := make(map[string]map[string]interface{})
	for _, v := range versions {
		key := fmt.Sprintf("%d_%d", v.EntityID, v.TypeID)
		versionMap[key] = map[string]interface{}{
			"id":             v.ID,
			"entity_id":      v.EntityID,
			"type_id":        v.TypeID,
			"version_number": v.VersionNumber,
			"prompt_text":    v.PromptText,
			"created_at":     v.CreatedAt,
		}
	}

	response := map[string]interface{}{
		"entities": entities,
		"types":    promptTypes,
		"versions": versionMap,
	}

	respondJSON(w, response)
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

// UpdateStoryInput is the input for updating story item order
type UpdateStoryInput struct {
	ItemIDs []int64 `json:"item_ids"` // Changed to snake_case to match task
}

// CreateEntityInput is the input for creating an entity
type CreateEntityInput struct {
	Name        string `json:"name"`
	Slug        string `json:"slug"`
	Type        string `json:"type"`
	Description string `json:"description,omitempty"`
	AvatarURL   string `json:"avatar_url,omitempty"`
}

// UpdateEntityInput is the input for updating an entity
type UpdateEntityInput struct {
	Name        *string `json:"name,omitempty"`
	Slug        *string `json:"slug,omitempty"`
	Type        *string `json:"type,omitempty"`
	Description *string `json:"description,omitempty"`
	AvatarURL   *string `json:"avatar_url,omitempty"`
}

// CreatePromptTypeInput is the input for creating a prompt type
type CreatePromptTypeInput struct {
	Slug         string `json:"slug"`
	Description  string `json:"description"`
	TemplateText string `json:"template_text"`
}

// UpdatePromptTypeInput is the input for updating a prompt type
type UpdatePromptTypeInput struct {
	Slug         *string `json:"slug,omitempty"`
	Description  *string `json:"description,omitempty"`
	TemplateText *string `json:"template_text,omitempty"`
}

// EntityDTO is a Data Transfer Object for Entity with proper JSON serialization
type EntityDTO struct {
	ID          int64   `json:"id"`
	Slug        string  `json:"slug"`
	Name        string  `json:"name"`
	Type        string  `json:"type"`
	Description *string `json:"description"`
	AvatarURL   *string `json:"avatar_url"`
	CreatedAt   *string `json:"created_at"`
}

// toEntityDTO converts a repository.Entity to EntityDTO with proper null handling
func toEntityDTO(e repository.Entity) EntityDTO {
	dto := EntityDTO{
		ID:   e.ID,
		Slug: e.Slug,
		Name: e.Name,
		Type: e.Type,
	}
	if e.Description.Valid {
		dto.Description = &e.Description.String
	}
	if e.AvatarUrl.Valid {
		dto.AvatarURL = &e.AvatarUrl.String
	}
	if e.CreatedAt.Valid {
		timeStr := e.CreatedAt.Time.Format("2006-01-02T15:04:05Z")
		dto.CreatedAt = &timeStr
	}
	return dto
}

// toEntityDTOs converts a slice of entities to DTOs
func toEntityDTOs(entities []repository.Entity) []EntityDTO {
	dtos := make([]EntityDTO, len(entities))
	for i, e := range entities {
		dtos[i] = toEntityDTO(e)
	}
	return dtos
}

// MediaAssetDTO is a Data Transfer Object for MediaAsset with computed URL fields
type MediaAssetDTO struct {
	ID                    int64   `json:"id"`
	Type                  string  `json:"type"`
	R2Key                 *string `json:"r2_key"`
	YoutubeID             *string `json:"youtube_id"`
	SourcePromptVersionID *int64  `json:"source_prompt_version_id"`
	CreatedAt             *string `json:"created_at"`
	// Computed fields
	URL          *string `json:"url"`
	ThumbnailURL *string `json:"thumbnail_url"`
}

// toMediaAssetDTO converts a repository.MediaAsset to MediaAssetDTO
func (r *Router) toMediaAssetDTO(asset repository.MediaAsset) MediaAssetDTO {
	dto := MediaAssetDTO{
		ID:   asset.ID,
		Type: asset.Type,
	}

	// Handle nullable fields
	if asset.R2Key.Valid {
		dto.R2Key = &asset.R2Key.String
		// Compute URL from R2 key
		if r.r2 != nil {
			url := r.r2.GetPublicURL(asset.R2Key.String)
			dto.URL = &url
			dto.ThumbnailURL = &url // For images, URL and thumbnail are the same
		}
	}
	if asset.YoutubeID.Valid {
		dto.YoutubeID = &asset.YoutubeID.String
		// Compute YouTube URLs
		embedURL := fmt.Sprintf("https://www.youtube.com/embed/%s", asset.YoutubeID.String)
		thumbnailURL := fmt.Sprintf("https://img.youtube.com/vi/%s/mqdefault.jpg", asset.YoutubeID.String)
		dto.URL = &embedURL
		dto.ThumbnailURL = &thumbnailURL
	}
	if asset.SourcePromptVersionID.Valid {
		dto.SourcePromptVersionID = &asset.SourcePromptVersionID.Int64
	}
	if asset.CreatedAt.Valid {
		timeStr := asset.CreatedAt.Time.Format("2006-01-02T15:04:05Z")
		dto.CreatedAt = &timeStr
	}

	return dto
}

// toMediaAssetDTOs converts a slice of media assets to DTOs
func (r *Router) toMediaAssetDTOs(assets []repository.MediaAsset) []MediaAssetDTO {
	dtos := make([]MediaAssetDTO, len(assets))
	for i, asset := range assets {
		dtos[i] = r.toMediaAssetDTO(asset)
	}
	return dtos
}

// PromptTypeDTO is a Data Transfer Object for PromptType with proper JSON serialization
type PromptTypeDTO struct {
	ID           int64   `json:"id"`
	Slug         string  `json:"slug"`
	Description  *string `json:"description"`
	TemplateText string  `json:"template_text"`
}

// toPromptTypeDTO converts a repository.PromptType to PromptTypeDTO with proper null handling
func toPromptTypeDTO(pt repository.PromptType) PromptTypeDTO {
	dto := PromptTypeDTO{
		ID:           pt.ID,
		Slug:         pt.Slug,
		TemplateText: pt.TemplateText,
	}
	if pt.Description.Valid {
		dto.Description = &pt.Description.String
	}
	return dto
}

// toPromptTypeDTOs converts a slice of prompt types to DTOs
func toPromptTypeDTOs(promptTypes []repository.PromptType) []PromptTypeDTO {
	dtos := make([]PromptTypeDTO, len(promptTypes))
	for i, pt := range promptTypes {
		dtos[i] = toPromptTypeDTO(pt)
	}
	return dtos
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

// ValidationError represents a validation error with specific field errors
type ValidationError struct {
	MissingFields []string `json:"missing_fields"`
	Message       string   `json:"message"`
}

func (ve ValidationError) Error() string {
	return ve.Message
}

// validateRequest parses JSON body and validates required fields are present
func validateRequest(r *http.Request, requiredFields []string) error {
	// Check content type for POST/PUT requests
	if r.Method == "POST" || r.Method == "PUT" {
		contentType := r.Header.Get("Content-Type")
		if contentType != "" && !strings.Contains(contentType, "application/json") {
			return ValidationError{
				Message: "Content-Type must be application/json",
			}
		}
	}

	// Read body
	body, err := io.ReadAll(r.Body)
	if err != nil {
		return ValidationError{
			Message: "Failed to read request body: " + err.Error(),
		}
	}
	r.Body = io.NopCloser(bytes.NewReader(body))

	// Handle empty body for GET/DELETE requests
	if len(body) == 0 && (r.Method == "GET" || r.Method == "DELETE") {
		return nil
	}

	// Parse JSON to map for field checking
	var data map[string]interface{}
	if err := json.Unmarshal(body, &data); err != nil {
		return ValidationError{
			Message: "Invalid JSON: " + err.Error(),
		}
	}

	// Check required fields
	var missing []string
	for _, field := range requiredFields {
		if _, exists := data[field]; !exists {
			missing = append(missing, field)
		}
	}

	if len(missing) > 0 {
		return ValidationError{
			MissingFields: missing,
			Message:       "Missing required fields",
		}
	}

	return nil
}

// WriteValidationError writes a validation error response
func WriteValidationError(w http.ResponseWriter, err error) {
	var ve ValidationError
	if errors.As(err, &ve) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"error":          "Validation failed",
			"message":        ve.Message,
			"missing_fields": ve.MissingFields,
		})
		return
	}
	// Fallback for other errors
	http.Error(w, err.Error(), http.StatusBadRequest)
}

// corsMiddleware adds CORS headers to responses
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Set CORS headers
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.Header().Set("Access-Control-Max-Age", "86400")

		// Handle preflight OPTIONS requests
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}
