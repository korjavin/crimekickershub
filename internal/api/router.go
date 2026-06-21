package api

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"crimekickershub/internal/auth"
	"crimekickershub/internal/repository"
	"crimekickershub/internal/service/media"
	"crimekickershub/internal/service/prompts"
	"crimekickershub/internal/storage"
)

// Router holds all dependencies for the API
type Router struct {
	db           *sql.DB
	mux          *http.ServeMux
	prompts      *prompts.PromptService
	media        *media.MediaService
	repo         *repository.Queries
	auth         *auth.GoogleOAuth2
	r2           *storage.R2Client
	frontendPath string

	// storyUpdateMu serializes the read-modify-write in handleUpdateStory.
	// That handler reads the current story row and rewrites every column, so
	// two concurrent metadata updates (e.g. motto vs. publish) would otherwise
	// each preserve the other's field with a stale value and silently clobber
	// it. This is the only read-modify-write site for the stories row, and the
	// app runs as a single SQLite/Litestream writer process, so a process-local
	// mutex fully removes the lost-update race.
	storyUpdateMu sync.Mutex
}

// NewRouter creates a new HTTP router with all routes configured
func NewRouter(db *sql.DB, r2 *storage.R2Client, auth *auth.GoogleOAuth2, frontendPath string) *Router {
	repo := repository.New(db)
	r := &Router{
		db:           db,
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
	r.mux.HandleFunc("GET /api/entity-types", r.handleListEntityTypes)

	// Comics/Stories endpoints
	r.mux.HandleFunc("GET /api/comics", r.handleListStories)
	r.mux.HandleFunc("GET /api/comics/{slug}", r.handleGetStoryBySlug)

	// Videos (public - published reels for the Cinema tab)
	r.mux.HandleFunc("GET /api/videos", r.handleListVideos)

	// Games (public - published game cards for the Games tab)
	r.mux.HandleFunc("GET /api/games", r.handleListGames)

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
	r.mux.Handle("GET /api/admin/prompts/history", r.auth.RequireAdmin(http.HandlerFunc(r.handleListPromptHistory)))
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
	r.mux.Handle("DELETE /api/admin/media/{id}", r.auth.RequireAdmin(http.HandlerFunc(r.handleDeleteMedia)))

	// Assets management (admin only)
	r.mux.Handle("POST /api/admin/assets", r.auth.RequireAdmin(http.HandlerFunc(r.handleRegisterAsset)))
	r.mux.Handle("POST /api/admin/media/text", r.auth.RequireAdmin(http.HandlerFunc(r.handleCreateTextSlide)))
	r.mux.Handle("PUT /api/admin/media/text/{id}", r.auth.RequireAdmin(http.HandlerFunc(r.handleUpdateTextSlide)))

	// Stories management (admin only)
	r.mux.Handle("GET /api/admin/stories", r.auth.RequireAdmin(http.HandlerFunc(r.handleListStoriesAdmin)))
	r.mux.Handle("POST /api/admin/stories", r.auth.RequireAdmin(http.HandlerFunc(r.handleCreateStory)))
	r.mux.Handle("GET /api/admin/stories/{id}", r.auth.RequireAdmin(http.HandlerFunc(r.handleGetStory)))
	r.mux.Handle("PUT /api/admin/stories/{id}", r.auth.RequireAdmin(http.HandlerFunc(r.handleUpdateStory))) // Legacy/General update
	r.mux.Handle("DELETE /api/admin/stories/{id}", r.auth.RequireAdmin(http.HandlerFunc(r.handleDeleteStory)))
	r.mux.Handle("PUT /api/admin/stories/{id}/items", r.auth.RequireAdmin(http.HandlerFunc(r.handleUpdateStoryItems))) // Sequence update
	r.mux.Handle("POST /api/admin/stories/{id}/items", r.auth.RequireAdmin(http.HandlerFunc(r.handleAddStoryItem)))
	r.mux.Handle("DELETE /api/admin/stories/{id}/items/{itemId}", r.auth.RequireAdmin(http.HandlerFunc(r.handleDeleteStoryItem)))

	// Entities management (admin only)
	r.mux.Handle("GET /api/admin/entities", r.auth.RequireAdmin(http.HandlerFunc(r.handleListEntities)))
	r.mux.Handle("POST /api/admin/entities", r.auth.RequireAdmin(http.HandlerFunc(r.handleCreateEntity)))
	r.mux.Handle("PUT /api/admin/entities/{id}", r.auth.RequireAdmin(http.HandlerFunc(r.handleUpdateEntity)))
	r.mux.Handle("DELETE /api/admin/entities/{id}", r.auth.RequireAdmin(http.HandlerFunc(r.handleDeleteEntity)))

	// Entity Types management (admin only)
	r.mux.Handle("GET /api/admin/entity-types", r.auth.RequireAdmin(http.HandlerFunc(r.handleListEntityTypes)))
	r.mux.Handle("POST /api/admin/entity-types", r.auth.RequireAdmin(http.HandlerFunc(r.handleCreateEntityType)))
	r.mux.Handle("PUT /api/admin/entity-types/{id}", r.auth.RequireAdmin(http.HandlerFunc(r.handleUpdateEntityType)))
	r.mux.Handle("DELETE /api/admin/entity-types/{id}", r.auth.RequireAdmin(http.HandlerFunc(r.handleDeleteEntityType)))

	// Videos management (admin only)
	r.mux.Handle("GET /api/admin/videos", r.auth.RequireAdmin(http.HandlerFunc(r.handleListVideosAdmin)))
	r.mux.Handle("POST /api/admin/videos", r.auth.RequireAdmin(http.HandlerFunc(r.handleCreateVideo)))
	r.mux.Handle("PUT /api/admin/videos/{id}", r.auth.RequireAdmin(http.HandlerFunc(r.handleUpdateVideo)))
	r.mux.Handle("DELETE /api/admin/videos/{id}", r.auth.RequireAdmin(http.HandlerFunc(r.handleDeleteVideo)))

	// Games management (admin only)
	r.mux.Handle("GET /api/admin/games", r.auth.RequireAdmin(http.HandlerFunc(r.handleListGamesAdmin)))
	r.mux.Handle("POST /api/admin/games", r.auth.RequireAdmin(http.HandlerFunc(r.handleCreateGame)))
	r.mux.Handle("PUT /api/admin/games/{id}", r.auth.RequireAdmin(http.HandlerFunc(r.handleUpdateGame)))
	r.mux.Handle("DELETE /api/admin/games/{id}", r.auth.RequireAdmin(http.HandlerFunc(r.handleDeleteGame)))

	// Matrix view (admin only)
	r.mux.Handle("GET /api/admin/matrix", r.auth.RequireAdmin(http.HandlerFunc(r.handleGetMatrix)))

	// Dashboard activity (admin only)
	r.mux.Handle("GET /api/admin/dashboard/activity", r.auth.RequireAdmin(http.HandlerFunc(r.handleGetDashboardActivity)))
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
// handleListHeroes returns all heroes (entities of type 'hero')
// handleListHeroes returns all heroes (entities of type 'hero')
func (r *Router) handleListHeroes(w http.ResponseWriter, req *http.Request) {
	entities, err := r.repo.ListEntitiesByType(req.Context(), "hero")
	if err != nil {
		http.Error(w, "Failed to list heroes: "+err.Error(), http.StatusInternalServerError)
		return
	}
	respondJSON(w, r.toEntityDTOsFromListByTypeRows(entities))
}

// handleListEntities returns all entities (optionally filtered by type query param)
// handleListEntities returns all entities (optionally filtered by type query param)
func (r *Router) handleListEntities(w http.ResponseWriter, req *http.Request) {
	// Check if filtering by type
	entityTypeSlug := req.URL.Query().Get("type")

	if entityTypeSlug != "" {
		// Filter by type (case-insensitive)
		entities, err := r.repo.ListEntitiesByType(req.Context(), entityTypeSlug)
		if err != nil {
			http.Error(w, "Failed to list entities: "+err.Error(), http.StatusInternalServerError)
			return
		}
		respondJSON(w, r.toEntityDTOsFromListByTypeRows(entities))
	} else {
		// Return all entities
		entities, err := r.repo.ListEntities(req.Context())
		if err != nil {
			http.Error(w, "Failed to list entities: "+err.Error(), http.StatusInternalServerError)
			return
		}
		respondJSON(w, r.toEntityDTOsFromListRows(entities))
	}
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
		Motto         *string `json:"motto"`
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

		if s.Motto.Valid {
			dto.Motto = &s.Motto.String
		}

		// Use explicit cover image if set, otherwise use first slide
		if s.CoverImageUrl.Valid {
			dto.CoverImageURL = &s.CoverImageUrl.String
		} else {
			// Get first slide's media as cover
			items, err := r.repo.GetStoryItems(req.Context(), s.ID)
			if err == nil && len(items) > 0 {
				media, err := r.repo.GetMediaAsset(req.Context(), items[0].MediaAssetID)
				if err == nil {
					mediaDTO := r.toMediaAssetDTO(media)
					if mediaDTO.ThumbnailURL != nil {
						dto.CoverImageURL = mediaDTO.ThumbnailURL
					} else if mediaDTO.URL != nil {
						dto.CoverImageURL = mediaDTO.URL
					}
				}
			}
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

	// This is a public endpoint, so unpublished/draft stories must not be reachable
	// by slug (the public list endpoint already filters on published). Respond with
	// the same 404 used for a missing story so we do not leak the existence of drafts.
	if !story.Published.Valid || !story.Published.Bool {
		http.Error(w, "Story not found", http.StatusNotFound)
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
		Type        string  `json:"type"`
		URL         string  `json:"url,omitempty"`
		YoutubeID   string  `json:"youtube_id,omitempty"`
		TextContent *string `json:"text_content,omitempty"`
		Title       *string `json:"title,omitempty"`
		AspectRatio string  `json:"aspect_ratio,omitempty"` // Placeholder for now
	}

	type PublicStoryResponse struct {
		Title    string                    `json:"title"`
		AudioURL *string                   `json:"audio_url"`
		Motto    *string                   `json:"motto"`
		Items    []PublicStoryItemResponse `json:"items"`
	}

	response := PublicStoryResponse{
		Title: story.Title,
		Items: make([]PublicStoryItemResponse, 0, len(mediaAssets)),
	}

	if story.AudioUrl.Valid {
		response.AudioURL = &story.AudioUrl.String
	}

	if story.Motto.Valid {
		response.Motto = &story.Motto.String
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
		} else if mediaDTO.Type == "text" {
			itemResp.TextContent = mediaDTO.TextContent
			itemResp.Title = mediaDTO.Title
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
	dtos := make([]map[string]interface{}, len(versions))
	for i, v := range versions {
		dto := map[string]interface{}{
			"id":             v.ID,
			"entity_id":      v.EntityID,
			"type_id":        v.TypeID,
			"version_number": v.VersionNumber,
			"prompt_text":    v.PromptText,
			"created_at":     nil,
		}
		if v.CreatedAt.Valid {
			dto["created_at"] = v.CreatedAt.Time.Format("2006-01-02T15:04:05Z")
		}
		if v.TechnicalParamsJson.Valid {
			dto["technical_params_json"] = v.TechnicalParamsJson.String
		}
		dtos[i] = dto
	}
	respondJSON(w, dtos)
}

// handleListRecentPromptVersions returns the 10 most recent prompt versions
// RecentPromptVersionDTO flattening the joined fields
type RecentPromptVersionDTO struct {
	ID                  int64   `json:"id"`
	EntityID            int64   `json:"entity_id"`
	TypeID              int64   `json:"type_id"`
	VersionNumber       int64   `json:"version_number"`
	PromptText          string  `json:"prompt_text"`
	TechnicalParamsJson *string `json:"technical_params_json"`
	CreatedAt           *string `json:"created_at"`
	EntityName          string  `json:"entity_name"`
	TypeSlug            string  `json:"type_slug"`
}

func (r *Router) handleListRecentPromptVersions(w http.ResponseWriter, req *http.Request) {
	rows, err := r.repo.ListRecentPromptVersions(req.Context())
	if err != nil {
		http.Error(w, "Failed to list prompt versions: "+err.Error(), http.StatusInternalServerError)
		return
	}

	dtos := make([]RecentPromptVersionDTO, len(rows))
	for i, row := range rows {
		dto := RecentPromptVersionDTO{
			ID:            row.ID,
			EntityID:      row.EntityID,
			TypeID:        row.TypeID,
			VersionNumber: row.VersionNumber,
			PromptText:    row.PromptText,
			EntityName:    row.EntityName,
			TypeSlug:      row.TypeSlug,
		}
		if row.TechnicalParamsJson.Valid {
			dto.TechnicalParamsJson = &row.TechnicalParamsJson.String
		}
		if row.CreatedAt.Valid {
			timeStr := row.CreatedAt.Time.Format("2006-01-02T15:04:05Z")
			dto.CreatedAt = &timeStr
		}
		dtos[i] = dto
	}

	respondJSON(w, dtos)
}

// handleListPromptHistory returns the full history of prompt versions
func (r *Router) handleListPromptHistory(w http.ResponseWriter, req *http.Request) {
	rows, err := r.repo.ListPromptHistory(req.Context())
	if err != nil {
		http.Error(w, "Failed to list prompt history: "+err.Error(), http.StatusInternalServerError)
		return
	}

	dtos := make([]RecentPromptVersionDTO, len(rows))
	for i, row := range rows {
		dto := RecentPromptVersionDTO{
			ID:            row.ID,
			EntityID:      row.EntityID,
			TypeID:        row.TypeID,
			VersionNumber: row.VersionNumber,
			PromptText:    row.PromptText,
			EntityName:    row.EntityName,
			TypeSlug:      row.TypeSlug,
		}
		if row.TechnicalParamsJson.Valid {
			dto.TechnicalParamsJson = &row.TechnicalParamsJson.String
		}
		if row.CreatedAt.Valid {
			timeStr := row.CreatedAt.Time.Format("2006-01-02T15:04:05Z")
			dto.CreatedAt = &timeStr
		}
		dtos[i] = dto
	}

	respondJSON(w, dtos)
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

// handleCreateTextSlide creates a new text slide
func (r *Router) handleCreateTextSlide(w http.ResponseWriter, req *http.Request) {
	var input struct {
		Title       string `json:"title"`
		Description string `json:"description"`
		TextContent string `json:"text_content"`
		EntityID    *int64 `json:"entity_id"`
	}

	if err := json.NewDecoder(req.Body).Decode(&input); err != nil {
		http.Error(w, "Invalid request body: "+err.Error(), http.StatusBadRequest)
		return
	}

	if input.Title == "" {
		http.Error(w, "Title is required", http.StatusBadRequest)
		return
	}

	asset, err := r.media.RegisterAsset(req.Context(), media.RegisterAssetInput{
		Type:        media.MediaTypeText,
		Title:       input.Title,
		Description: input.Description,
		TextContent: input.TextContent,
		EntityID:    input.EntityID,
	})
	if err != nil {
		http.Error(w, "Failed to create text slide: "+err.Error(), http.StatusInternalServerError)
		return
	}

	respondJSON(w, r.toMediaAssetDTO(*asset))
}

func (r *Router) handleUpdateTextSlide(w http.ResponseWriter, req *http.Request) {
	id, err := strconv.ParseInt(req.PathValue("id"), 10, 64)
	if err != nil || id == 0 {
		http.Error(w, "Invalid ID", http.StatusBadRequest)
		return
	}

	var input struct {
		Title       *string `json:"title"`
		Description *string `json:"description"`
		TextContent *string `json:"text_content"`
		EntityID    *int64  `json:"entity_id"`
	}

	if err := json.NewDecoder(req.Body).Decode(&input); err != nil {
		http.Error(w, "Invalid request body: "+err.Error(), http.StatusBadRequest)
		return
	}

	asset, err := r.media.UpdateAsset(req.Context(), media.UpdateAssetInput{
		ID:          id,
		Title:       input.Title,
		Description: input.Description,
		TextContent: input.TextContent,
		EntityID:    input.EntityID,
	})
	if err != nil {
		http.Error(w, "Failed to update text slide: "+err.Error(), http.StatusInternalServerError)
		return
	}

	respondJSON(w, r.toMediaAssetDTO(*asset))
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

	// Auto-generate slug from title if not provided
	slug := input.Slug
	if slug == "" {
		slug = generateSlug(input.Title)
	}

	// Resolve a collision-safe slug so creating two stories with the same title
	// (or an explicit slug already in use) does not violate the stories.slug
	// UNIQUE constraint and return a 500. There is no existing row yet, so pass 0
	// as the current story ID — AUTOINCREMENT starts at 1, so 0 matches no row and
	// every existing slug is treated as owned by a different story and suffixed.
	resolvedSlug, err := r.ensureUniqueSlug(req.Context(), slug, 0)
	if err != nil {
		http.Error(w, "Failed to resolve unique slug: "+err.Error(), http.StatusInternalServerError)
		return
	}
	slug = resolvedSlug

	story, err := r.repo.CreateStory(req.Context(), repository.CreateStoryParams{
		Title:         input.Title,
		Slug:          slug,
		CoverImageUrl: sql.NullString{String: input.CoverImageURL, Valid: input.CoverImageURL != ""},
		Published:     sql.NullBool{Bool: input.Published, Valid: input.Published},
	})
	if err != nil {
		// ensureUniqueSlug above checks-then-writes without a transaction, so two
		// truly-concurrent creates could each see the same slug as free and the
		// second write then violates the stories.slug UNIQUE constraint. Convert
		// that into a graceful 409 instead of a 500 so the client can retry.
		if isUniqueConstraintErr(err) {
			http.Error(w, "slug already exists, please retry", http.StatusConflict)
			return
		}
		http.Error(w, "Failed to create story: "+err.Error(), http.StatusInternalServerError)
		return
	}
	respondJSON(w, story)
}

// generateSlug creates a URL-friendly slug from a title
func generateSlug(title string) string {
	// Convert to lowercase
	slug := strings.ToLower(title)
	// Replace spaces and special characters with hyphens
	slug = strings.Map(func(r rune) rune {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') {
			return r
		}
		return '-'
	}, slug)
	// Remove consecutive hyphens
	for strings.Contains(slug, "--") {
		slug = strings.ReplaceAll(slug, "--", "-")
	}
	// Trim hyphens from start and end
	slug = strings.Trim(slug, "-")
	return slug
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

	// Calculate correct sort order
	// Ideally we could do this in SQL via subquery, but for now we'll fetch items and find max
	currentItems, err := r.repo.GetStoryItems(req.Context(), storyID)
	if err != nil {
		http.Error(w, "Failed to fetch current items: "+err.Error(), http.StatusInternalServerError)
		return
	}

	nextSortOrder := int64(1)
	if len(currentItems) > 0 {
		for _, item := range currentItems {
			if item.SortOrder >= nextSortOrder {
				nextSortOrder = item.SortOrder + 1
			}
		}
	}
	item, err := r.repo.AddStoryItem(req.Context(), repository.AddStoryItemParams{
		StoryID:      storyID,
		MediaAssetID: input.MediaAssetID,
		SortOrder:    nextSortOrder,
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

// handleDeleteMedia deletes a media asset
func (r *Router) handleDeleteMedia(w http.ResponseWriter, req *http.Request) {
	id, _ := strconv.ParseInt(req.PathValue("id"), 10, 64)
	if id == 0 {
		http.Error(w, "Media asset ID is required", http.StatusBadRequest)
		return
	}

	err := r.media.DeleteAsset(req.Context(), id)
	if err != nil {
		http.Error(w, "Failed to delete media asset: "+err.Error(), http.StatusInternalServerError)
		return
	}

	respondJSON(w, map[string]bool{"success": true})
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

	// Convert to DTOs with auto-cover support
	type AdminStoryDTO struct {
		ID            int64   `json:"id"`
		Title         string  `json:"title"`
		Slug          string  `json:"slug"`
		CoverImageURL *string `json:"cover_image_url"`
		Motto         *string `json:"motto"`
		Published     bool    `json:"published"`
		CreatedAt     *string `json:"created_at"`
	}

	dtos := make([]AdminStoryDTO, len(stories))
	for i, s := range stories {
		dto := AdminStoryDTO{
			ID:        s.ID,
			Title:     s.Title,
			Slug:      s.Slug,
			Published: s.Published.Bool,
		}

		if s.Motto.Valid {
			dto.Motto = &s.Motto.String
		}

		// Use explicit cover image if set, otherwise use first slide
		if s.CoverImageUrl.Valid {
			dto.CoverImageURL = &s.CoverImageUrl.String
		} else {
			// Get first slide's media as cover
			items, err := r.repo.GetStoryItems(req.Context(), s.ID)
			if err == nil && len(items) > 0 {
				media, err := r.repo.GetMediaAsset(req.Context(), items[0].MediaAssetID)
				if err == nil {
					mediaDTO := r.toMediaAssetDTO(media)
					if mediaDTO.ThumbnailURL != nil {
						dto.CoverImageURL = mediaDTO.ThumbnailURL
					} else if mediaDTO.URL != nil {
						dto.CoverImageURL = mediaDTO.URL
					}
				}
			}
		}

		if s.CreatedAt.Valid {
			createdAt := s.CreatedAt.Time.Format("2006-01-02T15:04:05Z")
			dto.CreatedAt = &createdAt
		}

		dtos[i] = dto
	}

	respondJSON(w, dtos)
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
		ID           int64          `json:"id"`
		StoryID      int64          `json:"story_id"`
		MediaAssetID int64          `json:"media_asset_id"`
		SortOrder    int64          `json:"sort_order"`
		Media        *MediaAssetDTO `json:"media,omitempty"`
	}

	// Serialize audio_url as a *string so it becomes null when unset rather
	// than the raw sql.NullString shape.
	var audioURLPtr *string
	if story.AudioUrl.Valid {
		audioURLPtr = &story.AudioUrl.String
	}

	// Serialize motto as a *string so it becomes null when unset rather than
	// the raw sql.NullString shape, mirroring audio_url.
	var mottoPtr *string
	if story.Motto.Valid {
		mottoPtr = &story.Motto.String
	}

	response := map[string]interface{}{
		"id":              story.ID,
		"title":           story.Title,
		"slug":            story.Slug,
		"cover_image_url": story.CoverImageUrl,
		"audio_url":       audioURLPtr,
		"motto":           mottoPtr,
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

		// Fetch media asset details and convert to DTO
		if item.MediaAssetID > 0 {
			media, err := r.repo.GetMediaAsset(req.Context(), item.MediaAssetID)
			if err == nil {
				dto := r.toMediaAssetDTO(media)
				itemResp.Media = &dto
			}
		}

		itemResponses = append(itemResponses, itemResp)
	}

	response["items"] = itemResponses
	respondJSON(w, response)
}

// isUniqueConstraintErr reports whether err is a SQLite UNIQUE constraint
// violation. We match on the driver's error string ("UNIQUE constraint failed")
// rather than importing the sqlite driver's concrete error type, keeping this
// detection dependency-free and consistent with the rest of the codebase.
func isUniqueConstraintErr(err error) bool {
	return err != nil && strings.Contains(err.Error(), "UNIQUE constraint failed")
}

// ensureUniqueSlug resolves a collision-safe slug for a story. It checks whether
// the desired slug is already taken by a *different* story (the stories.slug column
// has a UNIQUE constraint). If it is, it appends "-2", "-3", … until a free slug is
// found. The slug owned by currentStoryID itself is treated as available so a story
// can keep (or re-set) its own slug.
func (r *Router) ensureUniqueSlug(ctx context.Context, desired string, currentStoryID int64) (string, error) {
	// A title made up entirely of non-alphanumeric characters (e.g. "!!!") yields
	// an empty generated slug. Persisting an empty slug would make the comic
	// reachable only at /comics/ (which 404s) or collide on the UNIQUE constraint
	// with another empty slug. Fall back to a deterministic, non-empty default and
	// resolve uniqueness from there so rename can never persist an empty slug.
	if desired == "" {
		desired = fmt.Sprintf("comic-%d", currentStoryID)
	}

	// Cap attempts to guard against an unexpected infinite loop.
	const maxAttempts = 500
	for n := 1; n <= maxAttempts; n++ {
		candidate := desired
		if n > 1 {
			candidate = fmt.Sprintf("%s-%d", desired, n)
		}

		existing, err := r.repo.GetStoryBySlug(ctx, candidate)
		if errors.Is(err, sql.ErrNoRows) {
			// Slug is free.
			return candidate, nil
		}
		if err != nil {
			return "", err
		}
		if existing.ID == currentStoryID {
			// The slug belongs to the same story — no collision.
			return candidate, nil
		}
		// Otherwise the slug is taken by a different story; try the next suffix.
	}

	return "", fmt.Errorf("could not find a unique slug for %q after %d attempts", desired, maxAttempts)
}

// handleUpdateStory updates story metadata (title, slug, etc) - Placeholder for now if needed
// or we can keep it for backward compatibility or general updates
func (r *Router) handleUpdateStory(w http.ResponseWriter, req *http.Request) {
	storyID, _ := strconv.ParseInt(req.PathValue("id"), 10, 64)
	if storyID == 0 {
		http.Error(w, "Story ID is required", http.StatusBadRequest)
		return
	}

	var input struct {
		Title         *string `json:"title"`
		Slug          *string `json:"slug"`
		CoverImageURL *string `json:"coverImageUrl"`
		AudioURL      *string `json:"audio_url"`
		Motto         *string `json:"motto"`
		Published     *bool   `json:"published"`
	}

	if err := json.NewDecoder(req.Body).Decode(&input); err != nil {
		http.Error(w, "Invalid request body: "+err.Error(), http.StatusBadRequest)
		return
	}

	// Serialize the read-modify-write below so concurrent metadata updates to
	// the same story cannot each preserve the other's field with a stale value
	// (e.g. a motto save and a publish toggle clobbering one another). The lock
	// spans the read, the slug-uniqueness resolution, and the write.
	r.storyUpdateMu.Lock()
	defer r.storyUpdateMu.Unlock()

	// Get current story to preserve fields not being updated
	currentStory, err := r.repo.GetStoryByID(req.Context(), storyID)
	if err != nil {
		http.Error(w, "Story not found: "+err.Error(), http.StatusNotFound)
		return
	}

	// Use current values if not provided in update
	title := currentStory.Title
	if input.Title != nil {
		title = *input.Title
	}

	slug := currentStory.Slug
	if input.Slug != nil && *input.Slug != currentStory.Slug {
		// Resolve a collision-safe slug so renaming to a title whose generated
		// slug collides with another story does not violate the UNIQUE constraint.
		resolvedSlug, err := r.ensureUniqueSlug(req.Context(), *input.Slug, storyID)
		if err != nil {
			http.Error(w, "Failed to resolve unique slug: "+err.Error(), http.StatusInternalServerError)
			return
		}
		slug = resolvedSlug
	}

	coverImageURL := currentStory.CoverImageUrl
	if input.CoverImageURL != nil {
		coverImageURL = sql.NullString{String: *input.CoverImageURL, Valid: *input.CoverImageURL != ""}
	}

	// Preserve the current audio when not provided; set or clear it (empty
	// string clears to NULL) when provided.
	audioURL := currentStory.AudioUrl
	if input.AudioURL != nil {
		audioURL = sql.NullString{String: *input.AudioURL, Valid: *input.AudioURL != ""}
	}

	// Preserve the current motto when not provided; set or clear it when
	// provided. Trim first so empty/whitespace-only input clears it to NULL,
	// matching the documented "empty/whitespace input clears it" contract.
	motto := currentStory.Motto
	if input.Motto != nil {
		trimmedMotto := strings.TrimSpace(*input.Motto)
		motto = sql.NullString{String: trimmedMotto, Valid: trimmedMotto != ""}
	}

	published := currentStory.Published
	if input.Published != nil {
		published = sql.NullBool{Bool: *input.Published, Valid: true}
	}

	// Update the story
	updatedStory, err := r.repo.UpdateStory(req.Context(), repository.UpdateStoryParams{
		ID:            storyID,
		Title:         title,
		Slug:          slug,
		CoverImageUrl: coverImageURL,
		AudioUrl:      audioURL,
		Motto:         motto,
		Published:     published,
	})
	if err != nil {
		// ensureUniqueSlug above checks-then-writes without a transaction, so two
		// truly-concurrent renames could each see the same slug as free and the
		// second write then violates the stories.slug UNIQUE constraint. Convert
		// that into a graceful 409 instead of a 500 so the client can retry.
		if isUniqueConstraintErr(err) {
			http.Error(w, "slug already exists, please retry", http.StatusConflict)
			return
		}
		http.Error(w, "Failed to update story: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Format response with proper boolean handling
	type StoryUpdateResponse struct {
		ID            int64   `json:"id"`
		Title         string  `json:"title"`
		Slug          string  `json:"slug"`
		CoverImageURL *string `json:"cover_image_url"`
		AudioURL      *string `json:"audio_url"`
		Motto         *string `json:"motto"`
		Published     bool    `json:"published"`
		CreatedAt     *string `json:"created_at"`
	}

	response := StoryUpdateResponse{
		ID:        updatedStory.ID,
		Title:     updatedStory.Title,
		Slug:      updatedStory.Slug,
		Published: updatedStory.Published.Bool,
	}

	if updatedStory.CoverImageUrl.Valid {
		response.CoverImageURL = &updatedStory.CoverImageUrl.String
	}

	if updatedStory.AudioUrl.Valid {
		response.AudioURL = &updatedStory.AudioUrl.String
	}

	if updatedStory.Motto.Valid {
		response.Motto = &updatedStory.Motto.String
	}

	if updatedStory.CreatedAt.Valid {
		createdAt := updatedStory.CreatedAt.Time.Format("2006-01-02T15:04:05Z")
		response.CreatedAt = &createdAt
	}

	respondJSON(w, response)
}

// handleDeleteStory deletes a story (only if it has no items)
func (r *Router) handleDeleteStory(w http.ResponseWriter, req *http.Request) {
	storyID, _ := strconv.ParseInt(req.PathValue("id"), 10, 64)
	if storyID == 0 {
		http.Error(w, "Story ID is required", http.StatusBadRequest)
		return
	}

	// Check if the story has any items
	items, err := r.repo.GetStoryItems(req.Context(), storyID)
	if err != nil {
		http.Error(w, "Failed to check story items: "+err.Error(), http.StatusInternalServerError)
		return
	}

	if len(items) > 0 {
		http.Error(w, "Cannot delete story with items. Remove all slides first.", http.StatusBadRequest)
		return
	}

	// Delete the story
	err = r.repo.DeleteStory(req.Context(), storyID)
	if err != nil {
		http.Error(w, "Failed to delete story: "+err.Error(), http.StatusInternalServerError)
		return
	}

	respondJSON(w, map[string]bool{"success": true})
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

	// Start transaction
	tx, err := r.db.Begin()
	if err != nil {
		http.Error(w, "Failed to start transaction: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	qtx := r.repo.WithTx(tx)

	// Update sort order for each item
	// Strategy: To avoid unique constraint violation on (story_id, sort_order),
	// we first move all items to a temporary negative sort order, then move to final.

	// Pass 1: Set to negative temporary values
	for i, itemID := range input.ItemIDs {
		// specific logic: -1 * (index + 1000) to ensure uniqueness and negative sign
		tempOrder := int64(-1 * (i + 1000))
		err := qtx.UpdateStoryItemSortOrder(req.Context(), repository.UpdateStoryItemSortOrderParams{
			SortOrder: tempOrder,
			ID:        itemID,
		})
		if err != nil {
			http.Error(w, "Failed to set temp sort order: "+err.Error(), http.StatusInternalServerError)
			return
		}
	}

	// Pass 2: Set to final values
	for i, itemID := range input.ItemIDs {
		err := qtx.UpdateStoryItemSortOrder(req.Context(), repository.UpdateStoryItemSortOrderParams{
			SortOrder: int64(i),
			ID:        itemID,
		})
		if err != nil {
			http.Error(w, "Failed to set final sort order: "+err.Error(), http.StatusInternalServerError)
			return
		}
	}

	if err := tx.Commit(); err != nil {
		http.Error(w, "Failed to commit transaction: "+err.Error(), http.StatusInternalServerError)
		return
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
// handleCreateEntity creates a new entity
func (r *Router) handleCreateEntity(w http.ResponseWriter, req *http.Request) {
	var input CreateEntityInput
	if err := json.NewDecoder(req.Body).Decode(&input); err != nil {
		http.Error(w, "Invalid request body: "+err.Error(), http.StatusBadRequest)
		return
	}

	// Look up entity type by slug
	entityType, err := r.repo.GetEntityTypeBySlug(req.Context(), input.Type)
	if err != nil {
		http.Error(w, "Invalid entity type: "+err.Error(), http.StatusBadRequest)
		return
	}

	entity, err := r.repo.CreateEntity(req.Context(), repository.CreateEntityParams{
		Slug:               input.Slug,
		Name:               input.Name,
		Type:               input.Type,
		EntityTypeID:       sql.NullInt64{Int64: entityType.ID, Valid: true},
		Description:        sql.NullString{String: input.Description, Valid: input.Description != ""},
		BasePrompt:         sql.NullString{String: input.BasePrompt, Valid: input.BasePrompt != ""},
		AvatarUrl:          sql.NullString{String: input.AvatarURL, Valid: input.AvatarURL != ""},
		AvatarThumbnailUrl: sql.NullString{String: input.AvatarThumbnailURL, Valid: input.AvatarThumbnailURL != ""},
	})
	if err != nil {
		http.Error(w, "Failed to create entity: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Fetch the full entity with joined type data to return proper DTO
	fullEntity, err := r.repo.GetEntityByID(req.Context(), entity.ID)
	if err != nil {
		// Fallback to basic DTO if fetch fails (shouldn't happen)
		respondJSON(w, toEntityDTO(entity))
		return
	}

	respondJSON(w, r.toEntityDTOFromGetRow(fullEntity))
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

	// Handle Type update
	var entityTypeID sql.NullInt64
	if input.Type != nil {
		// Look up new type ID
		et, err := r.repo.GetEntityTypeBySlug(req.Context(), *input.Type)
		if err != nil {
			http.Error(w, "Invalid entity type: "+err.Error(), http.StatusBadRequest)
			return
		}
		entityTypeID = sql.NullInt64{Int64: et.ID, Valid: true}
	} else {
		entityTypeID = current.EntityTypeID
	}

	description := input.Description
	if description == nil && current.Description.Valid {
		description = &current.Description.String
	}
	basePrompt := input.BasePrompt
	if basePrompt == nil && current.BasePrompt.Valid {
		basePrompt = &current.BasePrompt.String
	}
	avatarURL := input.AvatarURL
	if avatarURL == nil && current.AvatarUrl.Valid {
		avatarURL = &current.AvatarUrl.String
	}
	avatarThumbnailURL := input.AvatarThumbnailURL
	if avatarThumbnailURL == nil && current.AvatarThumbnailUrl.Valid {
		avatarThumbnailURL = &current.AvatarThumbnailUrl.String
	}

	// Helper to safely get string value
	getString := func(s *string) string {
		if s == nil {
			return ""
		}
		return *s
	}

	entity, err := r.repo.UpdateEntity(req.Context(), repository.UpdateEntityParams{
		Slug:               *slug,
		Name:               *name,
		EntityTypeID:       entityTypeID,
		Description:        sql.NullString{String: getString(description), Valid: description != nil && *description != ""},
		BasePrompt:         sql.NullString{String: getString(basePrompt), Valid: basePrompt != nil && *basePrompt != ""},
		AvatarUrl:          sql.NullString{String: getString(avatarURL), Valid: avatarURL != nil && *avatarURL != ""},
		AvatarThumbnailUrl: sql.NullString{String: getString(avatarThumbnailURL), Valid: avatarThumbnailURL != nil && *avatarThumbnailURL != ""},
		ID:                 entityID,
	})
	if err != nil {
		http.Error(w, "Failed to update entity: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Fetch the full entity with joined type data
	fullEntity, err := r.repo.GetEntityByID(req.Context(), entity.ID)
	if err != nil {
		respondJSON(w, toEntityDTO(entity))
		return
	}

	respondJSON(w, r.toEntityDTOFromGetRow(fullEntity))
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
	versions, err := r.repo.ListLatestPromptVersionsMatrix(req.Context())
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
			"created_at":     nil,
		}
		if v.CreatedAt.Valid {
			versionMap[key]["created_at"] = v.CreatedAt.Time.Format("2006-01-02T15:04:05Z")
		}
	}

	response := map[string]interface{}{
		"entities": r.toEntityDTOsFromListRows(entities),
		"types":    toPromptTypeDTOs(promptTypes),
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
	Name               string `json:"name"`
	Slug               string `json:"slug"`
	Type               string `json:"type"`
	Description        string `json:"description,omitempty"`
	BasePrompt         string `json:"base_prompt,omitempty"`
	AvatarURL          string `json:"avatar_url,omitempty"`
	AvatarThumbnailURL string `json:"avatar_thumbnail_url,omitempty"`
}

// UpdateEntityInput is the input for updating an entity
type UpdateEntityInput struct {
	Name               *string `json:"name,omitempty"`
	Slug               *string `json:"slug,omitempty"`
	Type               *string `json:"type,omitempty"`
	Description        *string `json:"description,omitempty"`
	BasePrompt         *string `json:"base_prompt,omitempty"`
	AvatarURL          *string `json:"avatar_url,omitempty"`
	AvatarThumbnailURL *string `json:"avatar_thumbnail_url,omitempty"`
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
	ID                 int64   `json:"id"`
	Slug               string  `json:"slug"`
	Name               string  `json:"name"`
	Type               string  `json:"type"`
	Description        *string `json:"description"`
	BasePrompt         *string `json:"base_prompt"`
	AvatarURL          *string `json:"avatar_url"`
	AvatarThumbnailURL *string `json:"avatar_thumbnail_url"`
	CreatedAt          *string `json:"created_at"`
}

// toEntityDTOsFromListRows determines the type from the joined row
func (r *Router) toEntityDTOsFromListRows(rows []repository.ListEntitiesRow) []EntityDTO {
	dtos := make([]EntityDTO, len(rows))
	for i, row := range rows {
		dtos[i] = r.toEntityDTOFromListRow(row)
	}
	return dtos
}

func (r *Router) toEntityDTOFromListRow(row repository.ListEntitiesRow) EntityDTO {
	dto := EntityDTO{
		ID:   row.ID,
		Slug: row.Slug,
		Name: row.Name,
		Type: row.TypeSlug.String, // Use joined type slug
	}
	// Fallback to legacy type if joined type is missing (e.g. data inconsistency)
	if !row.TypeSlug.Valid {
		dto.Type = row.Type
	}

	if row.Description.Valid {
		dto.Description = &row.Description.String
	}
	if row.BasePrompt.Valid {
		dto.BasePrompt = &row.BasePrompt.String
	}
	if row.AvatarUrl.Valid {
		dto.AvatarURL = &row.AvatarUrl.String
	}
	if row.AvatarThumbnailUrl.Valid {
		dto.AvatarThumbnailURL = &row.AvatarThumbnailUrl.String
	}
	if row.CreatedAt.Valid {
		timeStr := row.CreatedAt.Time.Format("2006-01-02T15:04:05Z")
		dto.CreatedAt = &timeStr
	}
	return dto
}

func (r *Router) toEntityDTOFromGetRow(row repository.GetEntityByIDRow) EntityDTO {
	dto := EntityDTO{
		ID:   row.ID,
		Slug: row.Slug,
		Name: row.Name,
		Type: row.TypeSlug.String,
	}
	if !row.TypeSlug.Valid {
		dto.Type = row.Type
	}

	if row.Description.Valid {
		dto.Description = &row.Description.String
	}
	if row.BasePrompt.Valid {
		dto.BasePrompt = &row.BasePrompt.String
	}
	if row.AvatarUrl.Valid {
		dto.AvatarURL = &row.AvatarUrl.String
	}
	if row.AvatarThumbnailUrl.Valid {
		dto.AvatarThumbnailURL = &row.AvatarThumbnailUrl.String
	}
	if row.CreatedAt.Valid {
		timeStr := row.CreatedAt.Time.Format("2006-01-02T15:04:05Z")
		dto.CreatedAt = &timeStr
	}
	return dto
}

// toEntityDTOsFromListByTypeRows for ListEntitiesByType query
func (r *Router) toEntityDTOsFromListByTypeRows(rows []repository.ListEntitiesByTypeRow) []EntityDTO {
	dtos := make([]EntityDTO, len(rows))
	for i, row := range rows {
		dtos[i] = r.toEntityDTOFromListByTypeRow(row)
	}
	return dtos
}

func (r *Router) toEntityDTOFromListByTypeRow(row repository.ListEntitiesByTypeRow) EntityDTO {
	dto := EntityDTO{
		ID:   row.ID,
		Slug: row.Slug,
		Name: row.Name,
		Type: row.TypeSlug, // Use joined type slug, string
	}

	if row.Description.Valid {
		dto.Description = &row.Description.String
	}
	if row.BasePrompt.Valid {
		dto.BasePrompt = &row.BasePrompt.String
	}
	if row.AvatarUrl.Valid {
		dto.AvatarURL = &row.AvatarUrl.String
	}
	if row.AvatarThumbnailUrl.Valid {
		dto.AvatarThumbnailURL = &row.AvatarThumbnailUrl.String
	}
	if row.CreatedAt.Valid {
		timeStr := row.CreatedAt.Time.Format("2006-01-02T15:04:05Z")
		dto.CreatedAt = &timeStr
	}
	return dto
}

// toEntityDTO converts a repository.Entity to EntityDTO with proper null handling
// Note: This uses the legacy Type field since Entity struct doesn't have the joined fields
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
	if e.BasePrompt.Valid {
		dto.BasePrompt = &e.BasePrompt.String
	}
	if e.AvatarUrl.Valid {
		dto.AvatarURL = &e.AvatarUrl.String
	}
	if e.AvatarThumbnailUrl.Valid {
		dto.AvatarThumbnailURL = &e.AvatarThumbnailUrl.String
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
	// Text slide fields
	Title       *string `json:"title,omitempty"`
	Description *string `json:"description,omitempty"`
	TextContent *string `json:"text_content,omitempty"`
	EntityID    *int64  `json:"entity_id,omitempty"`
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
	if asset.Title.Valid {
		dto.Title = &asset.Title.String
	}
	if asset.Description.Valid {
		dto.Description = &asset.Description.String
	}
	if asset.TextContent.Valid {
		dto.TextContent = &asset.TextContent.String
	}
	if asset.EntityID.Valid {
		dto.EntityID = &asset.EntityID.Int64
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

// EntityTypeDTO for API responses
type EntityTypeDTO struct {
	ID          int64   `json:"id"`
	Slug        string  `json:"slug"`
	Name        string  `json:"name"`
	Description *string `json:"description"`
}

func toEntityTypeDTO(et repository.EntityType) EntityTypeDTO {
	dto := EntityTypeDTO{
		ID:   et.ID,
		Slug: et.Slug,
		Name: et.Name,
	}
	if et.Description.Valid {
		dto.Description = &et.Description.String
	}
	return dto
}

func toEntityTypeDTOs(types []repository.EntityType) []EntityTypeDTO {
	dtos := make([]EntityTypeDTO, len(types))
	for i, t := range types {
		dtos[i] = toEntityTypeDTO(t)
	}
	return dtos
}

// Entity Type Handlers

func (r *Router) handleListEntityTypes(w http.ResponseWriter, req *http.Request) {
	types, err := r.repo.ListEntityTypes(req.Context())
	if err != nil {
		http.Error(w, "Failed to list entity types: "+err.Error(), http.StatusInternalServerError)
		return
	}
	if types == nil {
		types = []repository.EntityType{}
	}
	respondJSON(w, toEntityTypeDTOs(types))
}

func (r *Router) handleCreateEntityType(w http.ResponseWriter, req *http.Request) {
	var input struct {
		Slug        string `json:"slug"`
		Name        string `json:"name"`
		Description string `json:"description"`
	}
	if err := json.NewDecoder(req.Body).Decode(&input); err != nil {
		http.Error(w, "Invalid request body: "+err.Error(), http.StatusBadRequest)
		return
	}

	et, err := r.repo.CreateEntityType(req.Context(), repository.CreateEntityTypeParams{
		Slug:        input.Slug,
		Name:        input.Name,
		Description: sql.NullString{String: input.Description, Valid: input.Description != ""},
	})
	if err != nil {
		http.Error(w, "Failed to create entity type: "+err.Error(), http.StatusInternalServerError)
		return
	}
	respondJSON(w, toEntityTypeDTO(et))
}

func (r *Router) handleUpdateEntityType(w http.ResponseWriter, req *http.Request) {
	id, _ := strconv.ParseInt(req.PathValue("id"), 10, 64)
	if id == 0 {
		http.Error(w, "ID is required", http.StatusBadRequest)
		return
	}

	var input struct {
		Slug        string `json:"slug"`
		Name        string `json:"name"`
		Description string `json:"description"`
	}
	if err := json.NewDecoder(req.Body).Decode(&input); err != nil {
		http.Error(w, "Invalid request body: "+err.Error(), http.StatusBadRequest)
		return
	}

	et, err := r.repo.UpdateEntityType(req.Context(), repository.UpdateEntityTypeParams{
		Slug:        input.Slug,
		Name:        input.Name,
		Description: sql.NullString{String: input.Description, Valid: input.Description != ""},
		ID:          id,
	})
	if err != nil {
		http.Error(w, "Failed to update entity type: "+err.Error(), http.StatusInternalServerError)
		return
	}
	respondJSON(w, toEntityTypeDTO(et))
}

func (r *Router) handleDeleteEntityType(w http.ResponseWriter, req *http.Request) {
	id, _ := strconv.ParseInt(req.PathValue("id"), 10, 64)
	if id == 0 {
		http.Error(w, "ID is required", http.StatusBadRequest)
		return
	}

	err := r.repo.DeleteEntityType(req.Context(), id)
	if err != nil {
		http.Error(w, "Failed to delete entity type: "+err.Error(), http.StatusInternalServerError)
		return
	}
	respondJSON(w, map[string]bool{"success": true})
}

// Video Handlers

// VideoDTO is the public/admin shape for a Cinema reel.
type VideoDTO struct {
	ID          int64    `json:"id"`
	Title       string   `json:"title"`
	YoutubeID   string   `json:"youtube_id"`
	Description string   `json:"description"`
	Mins        string   `json:"mins"`
	Tag         string   `json:"tag"`
	Color       string   `json:"color"`
	Tags        []string `json:"tags"`
	SortOrder   int64    `json:"sort_order"`
	Published   bool     `json:"published"`
}

func toVideoDTO(v repository.Video) VideoDTO {
	return VideoDTO{
		ID:          v.ID,
		Title:       v.Title,
		YoutubeID:   v.YoutubeID,
		Description: v.Description.String,
		Mins:        v.Mins.String,
		Tag:         v.Tag.String,
		Color:       v.Color.String,
		Tags:        splitTags(v.Tags.String),
		SortOrder:   v.SortOrder,
		Published:   v.Published,
	}
}

func toVideoDTOs(videos []repository.Video) []VideoDTO {
	dtos := make([]VideoDTO, len(videos))
	for i, v := range videos {
		dtos[i] = toVideoDTO(v)
	}
	return dtos
}

// splitTags turns a stored comma-separated tag string into a clean slice.
func splitTags(s string) []string {
	out := []string{}
	for _, part := range strings.Split(s, ",") {
		if t := strings.TrimSpace(part); t != "" {
			out = append(out, t)
		}
	}
	return out
}

// joinTags normalizes a tag slice back into the stored comma-separated form.
func joinTags(tags []string) string {
	cleaned := make([]string, 0, len(tags))
	for _, t := range tags {
		if t = strings.TrimSpace(t); t != "" {
			cleaned = append(cleaned, t)
		}
	}
	return strings.Join(cleaned, ",")
}

var youtubeIDRe = regexp.MustCompile(`(?:youtu\.be/|/v/|/embed/|watch\?v=|&v=|/shorts/)([A-Za-z0-9_-]{11})`)

// normalizeYouTubeID accepts a full YouTube URL or a bare 11-char ID and returns the ID.
func normalizeYouTubeID(input string) string {
	input = strings.TrimSpace(input)
	if m := youtubeIDRe.FindStringSubmatch(input); m != nil {
		return m[1]
	}
	return input
}

// videoInput is the request body for creating/updating a video.
type videoInput struct {
	Title       string   `json:"title"`
	YoutubeID   string   `json:"youtube_id"`
	Description string   `json:"description"`
	Mins        string   `json:"mins"`
	Tag         string   `json:"tag"`
	Color       string   `json:"color"`
	Tags        []string `json:"tags"`
	SortOrder   int64    `json:"sort_order"`
	Published   *bool    `json:"published"`
}

func nullStr(s string) sql.NullString {
	return sql.NullString{String: s, Valid: s != ""}
}

func (r *Router) handleListVideos(w http.ResponseWriter, req *http.Request) {
	videos, err := r.repo.ListPublishedVideos(req.Context())
	if err != nil {
		http.Error(w, "Failed to list videos: "+err.Error(), http.StatusInternalServerError)
		return
	}
	respondJSON(w, toVideoDTOs(videos))
}

func (r *Router) handleListVideosAdmin(w http.ResponseWriter, req *http.Request) {
	videos, err := r.repo.ListVideos(req.Context())
	if err != nil {
		http.Error(w, "Failed to list videos: "+err.Error(), http.StatusInternalServerError)
		return
	}
	respondJSON(w, toVideoDTOs(videos))
}

func (r *Router) handleCreateVideo(w http.ResponseWriter, req *http.Request) {
	var input videoInput
	if err := json.NewDecoder(req.Body).Decode(&input); err != nil {
		http.Error(w, "Invalid request body: "+err.Error(), http.StatusBadRequest)
		return
	}

	ytID := normalizeYouTubeID(input.YoutubeID)
	if strings.TrimSpace(input.Title) == "" || ytID == "" {
		http.Error(w, "title and youtube_id are required", http.StatusBadRequest)
		return
	}

	published := true
	if input.Published != nil {
		published = *input.Published
	}

	v, err := r.repo.CreateVideo(req.Context(), repository.CreateVideoParams{
		Title:       input.Title,
		YoutubeID:   ytID,
		Description: nullStr(input.Description),
		Mins:        nullStr(input.Mins),
		Tag:         nullStr(input.Tag),
		Color:       nullStr(input.Color),
		Tags:        nullStr(joinTags(input.Tags)),
		SortOrder:   input.SortOrder,
		Published:   published,
	})
	if err != nil {
		http.Error(w, "Failed to create video: "+err.Error(), http.StatusInternalServerError)
		return
	}
	respondJSON(w, toVideoDTO(v))
}

func (r *Router) handleUpdateVideo(w http.ResponseWriter, req *http.Request) {
	id, _ := strconv.ParseInt(req.PathValue("id"), 10, 64)
	if id == 0 {
		http.Error(w, "ID is required", http.StatusBadRequest)
		return
	}

	var input videoInput
	if err := json.NewDecoder(req.Body).Decode(&input); err != nil {
		http.Error(w, "Invalid request body: "+err.Error(), http.StatusBadRequest)
		return
	}

	ytID := normalizeYouTubeID(input.YoutubeID)
	if strings.TrimSpace(input.Title) == "" || ytID == "" {
		http.Error(w, "title and youtube_id are required", http.StatusBadRequest)
		return
	}

	published := true
	if input.Published != nil {
		published = *input.Published
	}

	v, err := r.repo.UpdateVideo(req.Context(), repository.UpdateVideoParams{
		Title:       input.Title,
		YoutubeID:   ytID,
		Description: nullStr(input.Description),
		Mins:        nullStr(input.Mins),
		Tag:         nullStr(input.Tag),
		Color:       nullStr(input.Color),
		Tags:        nullStr(joinTags(input.Tags)),
		SortOrder:   input.SortOrder,
		Published:   published,
		ID:          id,
	})
	if err != nil {
		http.Error(w, "Failed to update video: "+err.Error(), http.StatusInternalServerError)
		return
	}
	respondJSON(w, toVideoDTO(v))
}

func (r *Router) handleDeleteVideo(w http.ResponseWriter, req *http.Request) {
	id, _ := strconv.ParseInt(req.PathValue("id"), 10, 64)
	if id == 0 {
		http.Error(w, "ID is required", http.StatusBadRequest)
		return
	}

	if err := r.repo.DeleteVideo(req.Context(), id); err != nil {
		http.Error(w, "Failed to delete video: "+err.Error(), http.StatusInternalServerError)
		return
	}
	respondJSON(w, map[string]bool{"success": true})
}

// GameDTO is the public/admin shape for a Games tile.
type GameDTO struct {
	ID           int64  `json:"id"`
	Title        string `json:"title"`
	URL          string `json:"url"`
	Description  string `json:"description"`
	ThumbnailURL string `json:"thumbnail_url"`
	Tag          string `json:"tag"`
	Color        string `json:"color"`
	SortOrder    int64  `json:"sort_order"`
	Published    bool   `json:"published"`
}

func toGameDTO(g repository.Game) GameDTO {
	return GameDTO{
		ID:           g.ID,
		Title:        g.Title,
		URL:          g.Url,
		Description:  g.Description.String,
		ThumbnailURL: g.ThumbnailUrl.String,
		Tag:          g.Tag.String,
		Color:        g.Color.String,
		SortOrder:    g.SortOrder,
		Published:    g.Published,
	}
}

func toGameDTOs(games []repository.Game) []GameDTO {
	dtos := make([]GameDTO, len(games))
	for i, g := range games {
		dtos[i] = toGameDTO(g)
	}
	return dtos
}

// gameInput is the request body for creating/updating a game card.
type gameInput struct {
	Title        string `json:"title"`
	URL          string `json:"url"`
	Description  string `json:"description"`
	ThumbnailURL string `json:"thumbnail_url"`
	Tag          string `json:"tag"`
	Color        string `json:"color"`
	SortOrder    int64  `json:"sort_order"`
	Published    *bool  `json:"published"`
}

func (r *Router) handleListGames(w http.ResponseWriter, req *http.Request) {
	games, err := r.repo.ListPublishedGames(req.Context())
	if err != nil {
		http.Error(w, "Failed to list games: "+err.Error(), http.StatusInternalServerError)
		return
	}
	respondJSON(w, toGameDTOs(games))
}

func (r *Router) handleListGamesAdmin(w http.ResponseWriter, req *http.Request) {
	games, err := r.repo.ListGames(req.Context())
	if err != nil {
		http.Error(w, "Failed to list games: "+err.Error(), http.StatusInternalServerError)
		return
	}
	respondJSON(w, toGameDTOs(games))
}

func (r *Router) handleCreateGame(w http.ResponseWriter, req *http.Request) {
	var input gameInput
	if err := json.NewDecoder(req.Body).Decode(&input); err != nil {
		http.Error(w, "Invalid request body: "+err.Error(), http.StatusBadRequest)
		return
	}

	title := strings.TrimSpace(input.Title)
	url := strings.TrimSpace(input.URL)
	if title == "" || url == "" {
		http.Error(w, "title and url are required", http.StatusBadRequest)
		return
	}

	published := true
	if input.Published != nil {
		published = *input.Published
	}

	g, err := r.repo.CreateGame(req.Context(), repository.CreateGameParams{
		Title:        title,
		Url:          url,
		Description:  nullStr(input.Description),
		ThumbnailUrl: nullStr(input.ThumbnailURL),
		Tag:          nullStr(input.Tag),
		Color:        nullStr(input.Color),
		SortOrder:    input.SortOrder,
		Published:    published,
	})
	if err != nil {
		http.Error(w, "Failed to create game: "+err.Error(), http.StatusInternalServerError)
		return
	}
	respondJSON(w, toGameDTO(g))
}

func (r *Router) handleUpdateGame(w http.ResponseWriter, req *http.Request) {
	id, _ := strconv.ParseInt(req.PathValue("id"), 10, 64)
	if id == 0 {
		http.Error(w, "ID is required", http.StatusBadRequest)
		return
	}

	var input gameInput
	if err := json.NewDecoder(req.Body).Decode(&input); err != nil {
		http.Error(w, "Invalid request body: "+err.Error(), http.StatusBadRequest)
		return
	}

	title := strings.TrimSpace(input.Title)
	url := strings.TrimSpace(input.URL)
	if title == "" || url == "" {
		http.Error(w, "title and url are required", http.StatusBadRequest)
		return
	}

	published := true
	if input.Published != nil {
		published = *input.Published
	}

	g, err := r.repo.UpdateGame(req.Context(), repository.UpdateGameParams{
		Title:        title,
		Url:          url,
		Description:  nullStr(input.Description),
		ThumbnailUrl: nullStr(input.ThumbnailURL),
		Tag:          nullStr(input.Tag),
		Color:        nullStr(input.Color),
		SortOrder:    input.SortOrder,
		Published:    published,
		ID:           id,
	})
	if err != nil {
		http.Error(w, "Failed to update game: "+err.Error(), http.StatusInternalServerError)
		return
	}
	respondJSON(w, toGameDTO(g))
}

func (r *Router) handleDeleteGame(w http.ResponseWriter, req *http.Request) {
	id, _ := strconv.ParseInt(req.PathValue("id"), 10, 64)
	if id == 0 {
		http.Error(w, "ID is required", http.StatusBadRequest)
		return
	}

	if err := r.repo.DeleteGame(req.Context(), id); err != nil {
		http.Error(w, "Failed to delete game: "+err.Error(), http.StatusInternalServerError)
		return
	}
	respondJSON(w, map[string]bool{"success": true})
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

// handleGetDashboardActivity returns a combined feed of recent activity
func (r *Router) handleGetDashboardActivity(w http.ResponseWriter, req *http.Request) {
	ctx := req.Context()

	// 1. Fetch recent entities
	entities, err := r.repo.ListRecentEntities(ctx)
	if err != nil {
		log.Printf("Error fetching recent entities: %v", err)
	}

	// 2. Fetch recent prompt versions
	prompts, err := r.repo.ListRecentPromptVersions(ctx)
	if err != nil {
		log.Printf("Error fetching recent prompts: %v", err)
	}

	// 3. Fetch recent stories
	stories, err := r.repo.ListRecentStories(ctx)
	if err != nil {
		log.Printf("Error fetching recent stories: %v", err)
	}

	// 4. Fetch recent media
	mediaAssets, err := r.repo.ListRecentMedia(ctx)
	if err != nil {
		log.Printf("Error fetching recent media: %v", err)
	}

	// Combine into ActivityItems
	var activities []ActivityItem

	// Process Entities
	for _, e := range entities {
		ts := ""
		if e.CreatedAt.Valid {
			ts = e.CreatedAt.Time.Format(time.RFC3339)
		}
		item := ActivityItem{
			ID:        e.ID,
			Type:      "entity",
			Title:     e.Name,
			Subtitle:  "Created new entity (" + e.TypeSlug.String + ")",
			CreatedAt: ts,
			Link:      "/admin/entities",
		}
		activities = append(activities, item)
	}

	// Process Prompts
	for _, p := range prompts {
		ts := ""
		if p.CreatedAt.Valid {
			ts = p.CreatedAt.Time.Format(time.RFC3339)
		}
		item := ActivityItem{
			ID:        p.ID,
			Type:      "prompt",
			Title:     fmt.Sprintf("%s - %s", p.EntityName, p.TypeSlug),
			Subtitle:  fmt.Sprintf("v%d: %s...", p.VersionNumber, truncateText(p.PromptText, 30)),
			CreatedAt: ts,
			Link:      "/admin/matrix",
		}
		activities = append(activities, item)
	}

	// Process Stories
	for _, s := range stories {
		ts := ""
		if s.CreatedAt.Valid {
			ts = s.CreatedAt.Time.Format(time.RFC3339)
		}
		status := "Draft"
		if s.Published.Bool {
			status = "Published"
		}
		item := ActivityItem{
			ID:        s.ID,
			Type:      "story",
			Title:     s.Title,
			Subtitle:  status,
			CreatedAt: ts,
			Link:      "/admin/stories",
		}
		activities = append(activities, item)
	}

	// Process Media
	for _, m := range mediaAssets {
		ts := ""
		if m.CreatedAt.Valid {
			ts = m.CreatedAt.Time.Format(time.RFC3339)
		}
		title := "Media Asset"
		if m.Type == "image" {
			title = "Image Upload"
		} else if m.Type == "video" {
			title = "Video Link"
		}

		item := ActivityItem{
			ID:        m.ID,
			Type:      "media",
			Title:     title,
			Subtitle:  m.Type,
			CreatedAt: ts,
			Link:      "/admin/media",
		}
		activities = append(activities, item)
	}

	// Sort by CreatedAt descending
	sort.Slice(activities, func(i, j int) bool {
		return activities[i].CreatedAt > activities[j].CreatedAt
	})

	// Limit to 50
	if len(activities) > 50 {
		activities = activities[:50]
	}

	respondJSON(w, activities)
}

// ActivityItem represents a generic activity feed item
type ActivityItem struct {
	ID        int64  `json:"id"`
	Type      string `json:"type"` // "entity", "prompt", "media", "story"
	Title     string `json:"title"`
	Subtitle  string `json:"subtitle,omitempty"`
	CreatedAt string `json:"created_at"`
	Link      string `json:"link"`
}

func truncateText(s string, max int) string {
	if len(s) > max {
		return s[:max]
	}
	return s
}
