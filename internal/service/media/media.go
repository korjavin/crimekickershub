package media

import (
	"bytes"
	"context"
	"database/sql"
	"fmt"
	"image"
	"image/jpeg"
	"image/png"
	"io"
	"path/filepath"
	"regexp"
	"strings"

	"crimekickershub/internal/repository"
	"crimekickershub/internal/storage"

	"github.com/nfnt/resize"
)

// MediaType constants
const (
	MediaTypeImage = "image"
	MediaTypeVideo = "video"
	MediaTypeText  = "text"
)

// MediaService handles media asset operations
type MediaService struct {
	repo *repository.Queries
	r2   *storage.R2Client
}

// NewMediaService creates a new media service
func NewMediaService(db *sql.DB, r2 *storage.R2Client) *MediaService {
	return &MediaService{
		repo: repository.New(db),
		r2:   r2,
	}
}

// RegisterAssetInput represents input for registering a media asset
type RegisterAssetInput struct {
	Type            string `json:"type"` // "image", "video", or "text"
	File            io.Reader
	Filename        string
	YouTubeURL      string `json:"youtube_url"`
	PromptVersionID *int64 `json:"prompt_version_id"`
	// Text slide fields
	Title       string `json:"title"`
	Description string `json:"description"`
	TextContent string `json:"text_content"`
}

// RegisterAsset registers a new media asset in the database
// For images: uploads to R2 and stores the key
// For videos: parses YouTube URL and stores the video ID
// For text: stores content directly
func (s *MediaService) RegisterAsset(ctx context.Context, input RegisterAssetInput) (*repository.MediaAsset, error) {
	var r2Key sql.NullString
	var youtubeID sql.NullString
	var publicURL string

	// Text slide fields
	var title sql.NullString
	var description sql.NullString
	var textContent sql.NullString

	switch input.Type {
	case MediaTypeImage:
		if input.File == nil {
			return nil, fmt.Errorf("file is required for image uploads")
		}

		// Read all bytes to process
		fileBytes, err := io.ReadAll(input.File)
		if err != nil {
			return nil, fmt.Errorf("failed to read file: %w", err)
		}

		// Upload original
		url, err := s.r2.UploadImage(ctx, bytes.NewReader(fileBytes), input.Filename)
		if err != nil {
			return nil, fmt.Errorf("failed to upload image: %w", err)
		}
		publicURL = url
		// Extract R2 key from URL
		r2Key = sql.NullString{String: extractR2Key(publicURL, s.r2), Valid: true}

		// Generate and upload thumbnail
		if err := s.generateAndUploadThumbnail(ctx, fileBytes, input.Filename); err != nil {
			// Log error but don't fail the request (soft failure)
			fmt.Printf("WARNING: Failed to generate thumbnail for %s: %v\n", input.Filename, err)
		}

	case MediaTypeVideo:
		if input.YouTubeURL == "" {
			return nil, fmt.Errorf("YouTube URL is required for video assets")
		}
		// Extract video ID from YouTube URL
		videoID, err := ExtractYouTubeID(input.YouTubeURL)
		if err != nil {
			return nil, fmt.Errorf("invalid YouTube URL: %w", err)
		}
		youtubeID = sql.NullString{String: videoID, Valid: true}
		publicURL = input.YouTubeURL

	case MediaTypeText:
		if input.Title == "" {
			return nil, fmt.Errorf("title is required for text slides")
		}
		title = sql.NullString{String: input.Title, Valid: true}
		description = sql.NullString{String: input.Description, Valid: input.Description != ""}
		textContent = sql.NullString{String: input.TextContent, Valid: input.TextContent != ""}

	default:
		return nil, fmt.Errorf("invalid media type: %s (must be 'image', 'video' or 'text')", input.Type)
	}

	// Create media asset in database
	asset, err := s.repo.CreateMediaAsset(ctx, repository.CreateMediaAssetParams{
		Type:                  input.Type,
		R2Key:                 r2Key,
		YoutubeID:             youtubeID,
		SourcePromptVersionID: nullInt64(input.PromptVersionID),
		Title:                 title,
		Description:           description,
		TextContent:           textContent,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create media asset: %w", err)
	}

	// Attach public URL to the result for convenience
	_ = publicURL

	return &asset, nil
}

// nullInt64 converts *int64 to sql.NullInt64
func nullInt64(v *int64) sql.NullInt64 {
	if v == nil {
		return sql.NullInt64{Valid: false}
	}
	return sql.NullInt64{Int64: *v, Valid: true}
}

// extractR2Key extracts the R2 object key from a public URL
func extractR2Key(url string, r2 *storage.R2Client) string {
	prefix := r2.GetPublicURL("")
	// The prefix from GetPublicURL("") already ends with "/", so just trim it directly
	if strings.HasPrefix(url, prefix) {
		return strings.TrimPrefix(url, prefix)
	}
	// Fallback: try to extract filename from URL
	parts := strings.Split(url, "/")
	if len(parts) > 0 {
		return parts[len(parts)-1]
	}
	return url
}

// YouTube URL parsing

var (
	// Regex patterns for YouTube URL formats
	youTubeURLPatterns = []*regexp.Regexp{
		// Standard: youtube.com/watch?v=VIDEO_ID
		regexp.MustCompile(`(?:youtube\.com/watch\?v=|youtu\.be/)([a-zA-Z0-9_-]{11})`),
		// Short: youtu.be/VIDEO_ID
		regexp.MustCompile(`youtu\.be/([a-zA-Z0-9_-]{11})`),
		// Embed: youtube.com/embed/VIDEO_ID
		regexp.MustCompile(`youtube\.com/embed/([a-zA-Z0-9_-]{11})`),
		// Shorts: youtube.com/shorts/VIDEO_ID
		regexp.MustCompile(`youtube\.com/shorts/([a-zA-Z0-9_-]{11})`),
	}
)

// ExtractYouTubeID extracts the video ID from various YouTube URL formats
func ExtractYouTubeID(url string) (string, error) {
	if url == "" {
		return "", fmt.Errorf("URL is empty")
	}

	// Clean up the URL
	url = strings.TrimSpace(url)

	for _, pattern := range youTubeURLPatterns {
		matches := pattern.FindStringSubmatch(url)
		if len(matches) >= 2 {
			return matches[1], nil
		}
	}

	return "", fmt.Errorf("could not extract YouTube video ID from: %s", url)
}

// IsYouTubeURL checks if the given string is a valid YouTube URL
func IsYouTubeURL(url string) bool {
	_, err := ExtractYouTubeID(url)
	return err == nil
}

// GetYouTubeEmbedURL returns an embed URL for a YouTube video
func GetYouTubeEmbedURL(videoID string) string {
	return fmt.Sprintf("https://www.youtube.com/embed/%s", videoID)
}

// GetYouTubeThumbnailURL returns the thumbnail URL for a YouTube video
func GetYouTubeThumbnailURL(videoID string, quality string) string {
	// Quality can be: default, mqdefault, hqdefault, sddefault, maxresdefault
	if quality == "" {
		quality = "mqdefault"
	}
	return fmt.Sprintf("https://img.youtube.com/vi/%s/%s.jpg", videoID, quality)
}

// ListAssets lists all media assets
func (s *MediaService) ListAssets(ctx context.Context) ([]repository.MediaAsset, error) {
	return s.repo.ListAllMediaAssets(ctx)
}

// GetAsset retrieves a media asset by ID
func (s *MediaService) GetAsset(ctx context.Context, id int64) (*repository.MediaAsset, error) {
	asset, err := s.repo.GetMediaAsset(ctx, id)
	if err != nil {
		return nil, err
	}
	return &asset, nil
}

// generateAndUploadThumbnail resizes the image and uploads a thumbnail version
func (s *MediaService) generateAndUploadThumbnail(ctx context.Context, fileBytes []byte, originalFilename string) error {
	// Decode image
	img, format, err := image.Decode(bytes.NewReader(fileBytes))
	if err != nil {
		return fmt.Errorf("failed to decode image: %w", err)
	}

	// Resize to max 256x256
	thumbnail := resize.Thumbnail(256, 256, img, resize.Lanczos3)

	// Encode to buffer
	var buf bytes.Buffer
	var ext string
	if format == "png" {
		err = png.Encode(&buf, thumbnail)
		ext = ".png" // Explicitly use .png for PNGs
	} else {
		// Default to JPEG for everything else (including jpg, jpeg, gif, etc if decoded)
		// Note: helper only imports jpeg/png, so others might list as registered but we only handle these explicit encodes
		// For safety we might want to default to jpg
		err = jpeg.Encode(&buf, thumbnail, nil)
		ext = ".jpg"
	}
	if err != nil {
		return fmt.Errorf("failed to encode thumbnail: %w", err)
	}

	// Construct thumbnail filename: name_thumb.ext
	// Utilize filepath.Ext to be safe, though we determined ext above for the OUTPUT format.
	// We want to preserve the original basename.
	extOriginal := filepath.Ext(originalFilename)
	name := strings.TrimSuffix(originalFilename, extOriginal)
	thumbFilename := fmt.Sprintf("%s_thumb%s", name, ext)

	// Upload thumbnail
	_, err = s.r2.UploadImage(ctx, &buf, thumbFilename)
	if err != nil {
		return fmt.Errorf("failed to upload thumbnail: %w", err)
	}

	return nil
}

// DeleteAsset deletes a media asset and its associated R2 files
func (s *MediaService) DeleteAsset(ctx context.Context, id int64) error {
	// 1. Get asset to find R2 key
	asset, err := s.repo.GetMediaAsset(ctx, id)
	if err != nil {
		return fmt.Errorf("failed to get asset: %w", err)
	}

	// 2. Delete from database first
	if err := s.repo.DeleteMediaAsset(ctx, id); err != nil {
		return fmt.Errorf("failed to delete asset from database: %w", err)
	}

	// 3. If it's an image, delete files from R2
	// We do this after DB deletion so if DB fails, we still have the file (dangling file is better than missing file ref)
	if asset.Type == MediaTypeImage && asset.R2Key.Valid {
		// Delete original
		if err := s.r2.DeleteObject(ctx, asset.R2Key.String); err != nil {
			fmt.Printf("WARNING: Failed to delete object %s from R2: %v\n", asset.R2Key.String, err)
		}

		// Try to delete thumbnail (file_thumb.ext) using same logic as creation
		// This is a best-effort guess since we don't store the thumbnail key explicitly
		ext := filepath.Ext(asset.R2Key.String)
		name := strings.TrimSuffix(asset.R2Key.String, ext)
		// Try both jpg and png extensions for thumbnail since we default to jpg but might have png
		thumbKeyJpg := fmt.Sprintf("%s_thumb.jpg", name)
		thumbKeyPng := fmt.Sprintf("%s_thumb.png", name)

		// Fire and forget deletions for thumbnails
		_ = s.r2.DeleteObject(ctx, thumbKeyJpg)
		_ = s.r2.DeleteObject(ctx, thumbKeyPng)
	}

	return nil
}
