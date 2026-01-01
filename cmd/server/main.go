package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
	"syscall"
	"time"

	"crimekickershub/internal/api"
	"crimekickershub/internal/auth"
	"crimekickershub/internal/db"
	"crimekickershub/internal/migrations"
	"crimekickershub/internal/repository"
	"crimekickershub/internal/storage"

	"github.com/joho/godotenv"
)

func main() {
	// Load .env file if it exists (ignore error if not found)
	_ = godotenv.Load()

	log.Println("Starting Crime Kickers Hub...")

	// Determine database path from environment or use default
	dbPath := os.Getenv("DB_PATH")
	if dbPath == "" {
		dbPath = "data/crime-kickers.db"
	}

	// Ensure the data directory exists
	dataDir := filepath.Dir(dbPath)
	if err := os.MkdirAll(dataDir, 0755); err != nil {
		log.Fatalf("Failed to create data directory: %v", err)
	}

	// Initialize database connection with WAL mode
	database, err := db.NewDB(dbPath)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer database.Close()

	log.Println("Database connection established with WAL mode")

	// Run database migrations
	if err := migrations.RunMigrations(database); err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}

	log.Println("Database migrations completed")

	// Initialize repository
	queries := repository.New(database)
	log.Printf("Repository initialized: %T", queries)

	// Initialize R2 client
	r2Config := storage.R2Config{
		AccessKeyID:     os.Getenv("R2_ACCESS_KEY_ID"),
		SecretAccessKey: os.Getenv("R2_SECRET_ACCESS_KEY"),
		AccountID:       os.Getenv("R2_ACCOUNT_ID"),
		BucketName:      os.Getenv("R2_BUCKET_NAME"),
		PublicDomain:    os.Getenv("R2_PUBLIC_DOMAIN"),
	}

	r2Client, r2Status := storage.NewR2Client(context.Background(), r2Config)
	switch r2Status.State {
	case storage.R2StateReady:
		log.Printf("R2 client initialized successfully (bucket: %s, public domain: %s)", r2Config.BucketName, r2Config.PublicDomain)
	case storage.R2StateMissingCredentials:
		log.Println("WARNING: R2 credentials not configured - uploads will be disabled (degraded mode)")
	case storage.R2StateConnectionFailed:
		log.Printf("WARNING: R2 connection failed: %v - uploads will be disabled (degraded mode)", r2Status.Error)
	}

	// Initialize Google OAuth2
	adminEmailsRaw := os.Getenv("ADMIN_EMAILS")
	adminEmails := parseCSV(adminEmailsRaw)
	authConfig := auth.Config{
		ClientID:     os.Getenv("GOOGLE_CLIENT_ID"),
		ClientSecret: os.Getenv("GOOGLE_CLIENT_SECRET"),
		RedirectURL:  os.Getenv("GOOGLE_REDIRECT_URL"),
		AdminEmails:  adminEmails,
		CookieName:   "session",
		CookieSecret: []byte(os.Getenv("COOKIE_SECRET")),
	}

	googleAuth := auth.NewGoogleOAuth2(authConfig)
	log.Printf("Google OAuth2 initialized with %d admin emails: %v (raw: %q)", len(googleAuth.AdminWhitelist()), googleAuth.AdminWhitelist(), adminEmailsRaw)

	// Determine frontend path from environment or use default
	frontendPath := os.Getenv("FRONTEND_PATH")
	if frontendPath == "" {
		frontendPath = "frontend/dist"
	}

	// Create router
	router := api.NewRouter(database, r2Client, googleAuth, frontendPath)
	log.Println("API router initialized")

	// Wrap with standard middleware
	handler := loggingMiddleware(recoveryMiddleware(router))

	// Configure server
	addr := os.Getenv("SERVER_ADDR")
	if addr == "" {
		port := os.Getenv("PORT")
		if port != "" {
			addr = ":" + port
		} else {
			addr = ":8080"
		}
	}

	srv := &http.Server{
		Addr:         addr,
		Handler:      handler,
		ReadTimeout:  300 * time.Second, // 5 minutes for large file uploads
		WriteTimeout: 300 * time.Second, // 5 minutes for large file uploads
		IdleTimeout:  60 * time.Second,
	}

	// Start server in goroutine
	go func() {
		log.Printf("Server starting on %s", addr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server failed: %v", err)
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down server...")

	// Graceful shutdown
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("Server exited gracefully")
}

// parseCSV parses a CSV string into a slice of non-empty email addresses.
// It handles:
// - Trimming whitespace from each value
// - Skipping empty values
// - Stripping surrounding quotes from quoted strings
func parseCSV(s string) []string {
	if s == "" {
		return nil
	}
	parts := strings.Split(s, ",")
	var result []string
	for _, p := range parts {
		trimmed := strings.TrimSpace(p)
		trimmed = strings.Trim(trimmed, `"`)
		if trimmed != "" {
			result = append(result, trimmed)
		}
	}
	return result
}

// loggingMiddleware logs HTTP requests
func loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		next.ServeHTTP(w, r)
		log.Printf("%s %s %s", r.Method, r.URL.Path, time.Since(start))
	})
}

// recoveryMiddleware recovers from panics
func recoveryMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if err := recover(); err != nil {
				log.Printf("Panic recovered: %v", err)
				http.Error(w, "Internal Server Error", http.StatusInternalServerError)
			}
		}()
		next.ServeHTTP(w, r)
	})
}
