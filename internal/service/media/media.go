package media

import (
	"context"
	"database/sql"
	"fmt"
	"io"
	"regexp"
	"strings"

	"crimekickershub/internal/repository"
	"crimekickershub/internal/storage"
)

// MediaType constants
const (
	MediaTypeImage = "image"
	MediaTypeVideo = "video"
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
	Type            string `json:"type"` // "image" or "video"
	File            io.Reader
	Filename        string
	YouTubeURL      string `json:"youtube_url"`
	PromptVersionID *int64 `json:"prompt_version_id"`
}

// RegisterAsset registers a new media asset in the database
// For images: uploads to R2 and stores the key
// For videos: parses YouTube URL and stores the video ID
func (s *MediaService) RegisterAsset(ctx context.Context, input RegisterAssetInput) (*repository.MediaAsset, error) {
	var r2Key sql.NullString
	var youtubeID sql.NullString
	var publicURL string

	switch input.Type {
	case MediaTypeImage:
		if input.File == nil {
			return nil, fmt.Errorf("file is required for image uploads")
		}
		// Upload to R2
		url, err := s.r2.UploadImage(ctx, input.File, input.Filename)
		if err != nil {
			return nil, fmt.Errorf("failed to upload image: %w", err)
		}
		publicURL = url
		// Extract R2 key from URL (remove public domain prefix)
		r2Key = sql.NullString{String: extractR2Key(publicURL, s.r2), Valid: true}

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

	default:
		return nil, fmt.Errorf("invalid media type: %s (must be 'image' or 'video')", input.Type)
	}

	// Create media asset in database
	asset, err := s.repo.CreateMediaAsset(ctx, repository.CreateMediaAssetParams{
		Type:                  input.Type,
		R2Key:                 r2Key,
		YoutubeID:             youtubeID,
		SourcePromptVersionID: nullInt64(input.PromptVersionID),
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
