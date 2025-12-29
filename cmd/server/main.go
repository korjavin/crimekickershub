package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"
	"time"

	"crimekickershub/internal/api"
	"crimekickershub/internal/auth"
	"crimekickershub/internal/db"
	"crimekickershub/internal/repository"
	"crimekickershub/internal/storage"
)

func main() {
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

	// Initialize schema
	schemaPath := "sql/schema/001_initial.sql"
	if _, err := os.Stat(schemaPath); os.IsNotExist(err) {
		log.Fatalf("Schema file not found: %s", schemaPath)
	}

	if err := db.InitSchema(database, schemaPath); err != nil {
		log.Fatalf("Failed to initialize schema: %v", err)
	}

	log.Println("Database schema initialized")

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

	r2Client, err := storage.NewR2Client(context.Background(), r2Config)
	if err != nil {
		log.Printf("Warning: Failed to initialize R2 client: %v (uploads will be disabled)", err)
		r2Client = nil
	} else {
		log.Println("R2 client initialized")
	}

	// Initialize Google OAuth2
	authConfig := auth.Config{
		ClientID:     os.Getenv("GOOGLE_CLIENT_ID"),
		ClientSecret: os.Getenv("GOOGLE_CLIENT_SECRET"),
		RedirectURL:  os.Getenv("GOOGLE_REDIRECT_URL"),
		AdminEmails:  parseCSV(os.Getenv("ADMIN_EMAILS")),
		CookieName:   "session",
		CookieSecret: []byte(os.Getenv("COOKIE_SECRET")),
	}

	googleAuth := auth.NewGoogleOAuth2(authConfig)
	log.Printf("Google OAuth2 initialized with %d admin emails", len(googleAuth.AdminWhitelist()))

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
		addr = ":8080"
	}

	srv := &http.Server{
		Addr:         addr,
		Handler:      handler,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
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

// parseCSV parses a CSV string into a slice
func parseCSV(s string) []string {
	if s == "" {
		return nil
	}
	var result []string
	current := ""
	for _, c := range s {
		if c == ',' {
			if current != "" {
				result = append(result, current)
			}
			current = ""
		} else if c != ' ' {
			current += string(c)
		}
	}
	if current != "" {
		result = append(result, current)
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
