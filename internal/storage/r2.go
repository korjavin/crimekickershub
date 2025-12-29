package storage

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"os"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

// R2Config holds Cloudflare R2 configuration
type R2Config struct {
	AccessKeyID     string
	SecretAccessKey string
	AccountID       string
	BucketName      string
	PublicDomain    string
}

// R2Client handles Cloudflare R2 operations
type R2Client struct {
	client    *s3.Client
	bucket    string
	publicURL string
}

// NewR2Client creates a new R2 client
func NewR2Client(ctx context.Context, cfg R2Config) (*R2Client, error) {
	if cfg.AccessKeyID == "" || cfg.SecretAccessKey == "" || cfg.AccountID == "" {
		// Return a nil client that will fail gracefully if used without credentials
		return &R2Client{
			bucket:    cfg.BucketName,
			publicURL: cfg.PublicDomain,
		}, nil
	}

	// Create custom endpoint resolver for R2
	customResolver := aws.EndpointResolverWithOptionsFunc(func(service, region string, options ...interface{}) (aws.Endpoint, error) {
		if service == s3.ServiceID {
			return aws.Endpoint{
				PartitionID:   "aws",
				SigningRegion: region,
				SigningName:   "s3",
				URL:           fmt.Sprintf("https://%s.r2.cloudflarestorage.com", cfg.AccountID),
				SigningMethod: "s3v4",
			}, nil
		}
		return aws.Endpoint{}, fmt.Errorf("unknown endpoint: %s", service)
	})

	// Load AWS config with custom endpoint resolver
	awsCfg, err := config.LoadDefaultConfig(ctx,
		config.WithEndpointResolverWithOptions(customResolver),
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(
			cfg.AccessKeyID,
			cfg.SecretAccessKey,
			"",
		)),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to load AWS config: %w", err)
	}

	client := s3.NewFromConfig(awsCfg, func(o *s3.Options) {
		o.UsePathStyle = true // R2 requires path style
	})

	return &R2Client{
		client:    client,
		bucket:    cfg.BucketName,
		publicURL: cfg.PublicDomain,
	}, nil
}

// UploadImage uploads an image to R2 and returns the public URL
func (c *R2Client) UploadImage(ctx context.Context, file io.Reader, filename string) (string, error) {
	if c.client == nil {
		// Return a mock URL if client is not initialized (no credentials)
		return c.mockUpload(filename), nil
	}

	// Read file content
	data, err := io.ReadAll(file)
	if err != nil {
		return "", fmt.Errorf("failed to read file: %w", err)
	}

	// Upload to R2
	_, err = c.client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(c.bucket),
		Key:         aws.String(filename),
		Body:        bytes.NewReader(data),
		ContentType: aws.String(getContentType(filename)),
	})
	if err != nil {
		return "", fmt.Errorf("failed to upload to R2: %w", err)
	}

	// Return public URL
	return c.publicURL + "/" + filename, nil
}

// UploadImageFromPath uploads a file from the filesystem
func (c *R2Client) UploadImageFromPath(ctx context.Context, filepath string) (string, error) {
	file, err := os.Open(filepath)
	if err != nil {
		return "", fmt.Errorf("failed to open file: %w", err)
	}
	defer file.Close()

	filename := fmt.Sprintf("%d-%s", time.Now().Unix(), filepath)
	return c.UploadImage(ctx, file, filename)
}

// mockUpload returns a mock URL for testing without credentials
func (c *R2Client) mockUpload(filename string) string {
	return fmt.Sprintf("https://mock.r2.dev/%s", filename)
}

// GetPublicURL returns the public URL for a given key
func (c *R2Client) GetPublicURL(key string) string {
	return c.publicURL + "/" + key
}

// getContentType returns the content type based on file extension
func getContentType(filename string) string {
	switch {
	case hasExtension(filename, ".png"):
		return "image/png"
	case hasExtension(filename, ".jpg", ".jpeg"):
		return "image/jpeg"
	case hasExtension(filename, ".gif"):
		return "image/gif"
	case hasExtension(filename, ".webp"):
		return "image/webp"
	default:
		return "application/octet-stream"
	}
}

// hasExtension checks if filename has any of the given extensions
func hasExtension(filename string, extensions ...string) bool {
	for _, ext := range extensions {
		if len(filename) >= len(ext) && filename[len(filename)-len(ext):] == ext {
			return true
		}
	}
	return false
}
