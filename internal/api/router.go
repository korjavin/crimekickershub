package api

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"io"
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
	adminMux.HandleFunc("GET /types", r.handleListPromptTypes)
	adminMux.HandleFunc("POST /types", r.handleCreatePromptType)
	adminMux.HandleFunc("PUT /types/{id}", r.handleUpdatePromptType)
	adminMux.HandleFunc("DELETE /types/{id}", r.handleDeletePromptType)
	adminMux.HandleFunc("GET /", r.handleListPromptVersions)
	adminMux.HandleFunc("POST /compose", r.handleComposePrompt)
	adminMux.HandleFunc("POST /save", r.handleSavePrompt)
	adminMux.HandleFunc("GET /diff", r.handleGetPromptDiff)

	// Media management (admin only)
	adminMux.HandleFunc("GET /media", r.handleListMedia)
	adminMux.HandleFunc("POST /upload", r.handleUploadMedia)
	adminMux.HandleFunc("POST /assets", r.handleRegisterAsset)

	// Story management (admin only)
	adminMux.HandleFunc("GET /stories", r.handleListStoriesAdmin)
	adminMux.HandleFunc("POST /stories", r.handleCreateStory)
	adminMux.HandleFunc("GET /stories/{id}", r.handleGetStory)
	adminMux.HandleFunc("PUT /stories/{id}", r.handleUpdateStory)
	adminMux.HandleFunc("POST /stories/{id}/items", r.handleAddStoryItem)

	// Entity management (admin only)
	adminMux.HandleFunc("POST /entities", r.handleCreateEntity)
	adminMux.HandleFunc("PUT /entities/{id}", r.handleUpdateEntity)
	adminMux.HandleFunc("DELETE /entities/{id}", r.handleDeleteEntity)

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

// handleListPromptTypes returns all prompt types
func (r *Router) handleListPromptTypes(w http.ResponseWriter, req *http.Request) {
	promptTypes, err := r.repo.ListPromptTypes(req.Context())
	if err != nil {
		http.Error(w, "Failed to list prompt types: "+err.Error(), http.StatusInternalServerError)
		return
	}
	respondJSON(w, promptTypes)
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
	respondJSON(w, promptType)
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
	respondJSON(w, updated)
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
	respondJSON(w, versions)
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

	// Read file content for the media service
	fileContent, err := io.ReadAll(file)
	if err != nil {
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
		http.Error(w, "Failed to register asset: "+err.Error(), http.StatusInternalServerError)
		return
	}

	respondJSON(w, asset)
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

// handleListMedia returns all media assets
func (r *Router) handleListMedia(w http.ResponseWriter, req *http.Request) {
	assets, err := r.media.ListAssets(req.Context())
	if err != nil {
		http.Error(w, "Failed to list media assets: "+err.Error(), http.StatusInternalServerError)
		return
	}
	respondJSON(w, assets)
}

// handleListStoriesAdmin returns all stories (for admin)
func (r *Router) handleListStoriesAdmin(w http.ResponseWriter, req *http.Request) {
	stories, err := r.repo.ListAllStories(req.Context())
	if err != nil {
		http.Error(w, "Failed to list stories: "+err.Error(), http.StatusInternalServerError)
		return
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

// handleUpdateStory updates story item order
func (r *Router) handleUpdateStory(w http.ResponseWriter, req *http.Request) {
	storyID, _ := strconv.ParseInt(req.PathValue("id"), 10, 64)
	if storyID == 0 {
		http.Error(w, "Story ID is required", http.StatusBadRequest)
		return
	}

	var input UpdateStoryInput
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
	respondJSON(w, entity)
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
	respondJSON(w, entity)
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
	ItemIDs []int64 `json:"itemIds"`
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
