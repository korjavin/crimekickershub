# Task 4: Media Service & Cloudflare R2

**Goal:** Implement the service to handle file uploads to Cloudflare R2 and linking them to the database.

**Tech Stack:** `aws-sdk-go-v2` (R2 is S3-compatible).

## Steps:

1.  **R2 Client:**
    * Create `internal/storage/r2.go`.
    * Initialize an S3 client using `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, and `R2_ACCOUNT_ID` from ENVs.

2.  **Upload Logic:**
    * Implement `UploadImage(ctx context.Context, file io.Reader, filename string) (string, error)`.
    * The function should upload the file to the bucket defined in `R2_BUCKET_NAME`.
    * Return the public URL (`R2_PUBLIC_DOMAIN` + path).

3.  **Media Service:**
    * Create `internal/service/media/media.go`.
    * Implement `RegisterAsset(type string, url string, promptVersionID *int)`.
    * This function calls the DB repository to save the metadata.

4.  **YouTube Helper:**
    * Implement a simple helper to validate and format YouTube URLs (since we are pasting links manually for now).
    * Extract the Video ID from a standard YouTube URL.