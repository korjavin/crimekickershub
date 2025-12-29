package db

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	_ "github.com/mattn/go-sqlite3"
)

// NewDB creates a new SQLite database connection with WAL mode enabled.
// WAL (Write-Ahead Logging) provides better concurrent performance.
func NewDB(filepath string) (*sql.DB, error) {
	// Ensure the directory exists
	if err := os.MkdirAll(filepath[:len(filepath)-len("data.db")], 0755); err != nil {
		return nil, fmt.Errorf("failed to create db directory: %w", err)
	}

	db, err := sql.Open("sqlite3", filepath)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	// Enable WAL mode for better concurrent performance
	if _, err := db.Exec("PRAGMA journal_mode=WAL;"); err != nil {
		return nil, fmt.Errorf("failed to set WAL mode: %w", err)
	}

	// Enable foreign keys
	if _, err := db.Exec("PRAGMA foreign_keys=ON;"); err != nil {
		return nil, fmt.Errorf("failed to enable foreign keys: %w", err)
	}

	// Set busy timeout to handle concurrent access
	if _, err := db.Exec("PRAGMA busy_timeout=30000;"); err != nil {
		return nil, fmt.Errorf("failed to set busy timeout: %w", err)
	}

	log.Printf("Database connected: %s", filepath)
	return db, nil
}

// InitSchema initializes the database schema from the provided SQL file.
func InitSchema(db *sql.DB, schemaFilePath string) error {
	schema, err := os.ReadFile(schemaFilePath)
	if err != nil {
		return fmt.Errorf("failed to read schema file: %w", err)
	}

	_, err = db.Exec(string(schema))
	if err != nil {
		return fmt.Errorf("failed to execute schema: %w", err)
	}

	log.Printf("Schema initialized from: %s", schemaFilePath)
	return nil
}
