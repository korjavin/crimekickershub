package db

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	_ "github.com/mattn/go-sqlite3"
)

// Migration represents a database migration.
type Migration struct {
	Name string
	SQL  string
}

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

// initMigrationsTable creates the schema_migrations table if it doesn't exist.
func initMigrationsTable(db *sql.DB) error {
	createTableSQL := `
		CREATE TABLE IF NOT EXISTS schema_migrations (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			migration_name TEXT UNIQUE NOT NULL,
			applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
		);
	`
	_, err := db.Exec(createTableSQL)
	if err != nil {
		return fmt.Errorf("failed to create schema_migrations table: %w", err)
	}
	return nil
}

// isMigrationApplied checks if a migration has already been applied.
func isMigrationApplied(db *sql.DB, name string) (bool, error) {
	var count int
	err := db.QueryRow(
		"SELECT COUNT(*) FROM schema_migrations WHERE migration_name = ?",
		name,
	).Scan(&count)
	if err != nil {
		return false, fmt.Errorf("failed to check migration %s: %w", name, err)
	}
	return count > 0, nil
}

// recordMigration records a migration as applied in the schema_migrations table.
func recordMigration(db *sql.DB, name string) error {
	_, err := db.Exec(
		"INSERT INTO schema_migrations (migration_name) VALUES (?)",
		name,
	)
	if err != nil {
		return fmt.Errorf("failed to record migration %s: %w", name, err)
	}
	return nil
}

// InitSchema initializes the database schema from the provided SQL file.
// It uses a migrations table to track which migrations have been applied,
// ensuring idempotent schema updates.
func InitSchema(db *sql.DB, schemaFilePath string, migrationName string) error {
	// Initialize the migrations tracking table
	if err := initMigrationsTable(db); err != nil {
		return err
	}

	// Check if this migration has already been applied
	applied, err := isMigrationApplied(db, migrationName)
	if err != nil {
		return err
	}

	if applied {
		log.Printf("Migration %s already applied, skipping", migrationName)
		return nil
	}

	// Apply the schema
	schema, err := os.ReadFile(schemaFilePath)
	if err != nil {
		return fmt.Errorf("failed to read schema file: %w", err)
	}

	_, err = db.Exec(string(schema))
	if err != nil {
		return fmt.Errorf("failed to execute schema: %w", err)
	}

	// Record the migration as applied
	if err := recordMigration(db, migrationName); err != nil {
		return err
	}

	log.Printf("Schema initialized from: %s (migration: %s)", schemaFilePath, migrationName)
	return nil
}
