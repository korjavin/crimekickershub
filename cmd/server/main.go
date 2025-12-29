package main

import (
	"log"
	"os"
	"path/filepath"

	"crimekickershub/internal/db"
	"crimekickershub/internal/repository"
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

	// Initialize repository
	queries := repository.New(database)
	log.Printf("Repository initialized: %T", queries)

	log.Println("Crime Kickers Hub initialized successfully!")
	log.Println("Server is ready to accept connections.")
}
