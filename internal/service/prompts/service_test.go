package prompts

import (
	"context"
	"database/sql"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"crimekickershub/internal/db"
	"crimekickershub/internal/migrations"
	"crimekickershub/internal/repository"
)

func setupTestDB(t *testing.T) (*repository.Queries, func()) {
	// Create a temporary database
	tmpDir, err := os.MkdirTemp("", "prompt-test")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}

	dbPath := filepath.Join(tmpDir, "test.db")
	testDB, err := db.NewDB(dbPath)
	if err != nil {
		os.RemoveAll(tmpDir)
		t.Fatalf("Failed to create test DB: %v", err)
	}

	// Initialize schema from the embedded migrations (same source sqlc and production use)
	if err := migrations.RunMigrations(testDB); err != nil {
		testDB.Close()
		os.RemoveAll(tmpDir)
		t.Fatalf("Failed to run migrations: %v", err)
	}

	queries := repository.New(testDB)

	// Cleanup function
	cleanup := func() {
		testDB.Close()
		os.RemoveAll(tmpDir)
	}

	return queries, cleanup
}

func TestSaveNewVersion_VersionIncrement(t *testing.T) {
	queries, cleanup := setupTestDB(t)
	defer cleanup()

	service := NewPromptService(queries)
	ctx := context.Background()

	// Create a test entity first
	entity, err := queries.CreateEntity(ctx, repository.CreateEntityParams{
		Slug:        "test-entity",
		Name:        "Test Entity",
		Description: sql.NullString{String: "A test entity", Valid: true},
	})
	if err != nil {
		t.Fatalf("Failed to create entity: %v", err)
	}

	// Create a test prompt type
	promptType, err := queries.CreatePromptType(ctx, repository.CreatePromptTypeParams{
		Slug:         "test-type",
		TemplateText: "In a test pose",
	})
	if err != nil {
		t.Fatalf("Failed to create prompt type: %v", err)
	}

	// Test 1: First version should be 1
	t.Run("first version is 1", func(t *testing.T) {
		version, err := service.SaveNewVersion(ctx, int(entity.ID), int(promptType.ID), "First prompt", "")
		if err != nil {
			t.Fatalf("SaveNewVersion failed: %v", err)
		}
		if version.VersionNumber != 1 {
			t.Errorf("Expected version 1, got %d", version.VersionNumber)
		}
	})

	// Test 2: Second version should be 2
	t.Run("second version is 2", func(t *testing.T) {
		version, err := service.SaveNewVersion(ctx, int(entity.ID), int(promptType.ID), "Second prompt", "")
		if err != nil {
			t.Fatalf("SaveNewVersion failed: %v", err)
		}
		if version.VersionNumber != 2 {
			t.Errorf("Expected version 2, got %d", version.VersionNumber)
		}
	})

	// Test 3: Third version should be 3
	t.Run("third version is 3", func(t *testing.T) {
		version, err := service.SaveNewVersion(ctx, int(entity.ID), int(promptType.ID), "Third prompt", "")
		if err != nil {
			t.Fatalf("SaveNewVersion failed: %v", err)
		}
		if version.VersionNumber != 3 {
			t.Errorf("Expected version 3, got %d", version.VersionNumber)
		}
	})
}

func TestSaveNewVersion_DifferentEntityResets(t *testing.T) {
	queries, cleanup := setupTestDB(t)
	defer cleanup()

	service := NewPromptService(queries)
	ctx := context.Background()

	// Create two test entities
	entity1, err := queries.CreateEntity(ctx, repository.CreateEntityParams{
		Slug:        "entity-1",
		Name:        "Entity 1",
		Description: sql.NullString{String: "First entity", Valid: true},
	})
	if err != nil {
		t.Fatalf("Failed to create entity 1: %v", err)
	}

	entity2, err := queries.CreateEntity(ctx, repository.CreateEntityParams{
		Slug:        "entity-2",
		Name:        "Entity 2",
		Description: sql.NullString{String: "Second entity", Valid: true},
	})
	if err != nil {
		t.Fatalf("Failed to create entity 2: %v", err)
	}

	// Create a test prompt type
	promptType, err := queries.CreatePromptType(ctx, repository.CreatePromptTypeParams{
		Slug:         "test-type",
		TemplateText: "In a test pose",
	})
	if err != nil {
		t.Fatalf("Failed to create prompt type: %v", err)
	}

	// Create versions for entity 1
	_, err = service.SaveNewVersion(ctx, int(entity1.ID), int(promptType.ID), "Entity 1 first", "")
	if err != nil {
		t.Fatalf("Failed to save version for entity 1: %v", err)
	}
	_, err = service.SaveNewVersion(ctx, int(entity1.ID), int(promptType.ID), "Entity 1 second", "")
	if err != nil {
		t.Fatalf("Failed to save version for entity 1: %v", err)
	}

	// First version for entity 2 should be 1
	t.Run("different entity resets to 1", func(t *testing.T) {
		version, err := service.SaveNewVersion(ctx, int(entity2.ID), int(promptType.ID), "Entity 2 first", "")
		if err != nil {
			t.Fatalf("SaveNewVersion failed: %v", err)
		}
		if version.VersionNumber != 1 {
			t.Errorf("Expected version 1 for new entity, got %d", version.VersionNumber)
		}
	})
}

func TestGetPromptDiff(t *testing.T) {
	queries, cleanup := setupTestDB(t)
	defer cleanup()

	service := NewPromptService(queries)
	ctx := context.Background()

	// Create test entity and type
	entity, err := queries.CreateEntity(ctx, repository.CreateEntityParams{
		Slug:        "diff-test-entity",
		Name:        "Diff Test Entity",
		Description: sql.NullString{String: "A diff test entity", Valid: true},
	})
	if err != nil {
		t.Fatalf("Failed to create entity: %v", err)
	}

	promptType, err := queries.CreatePromptType(ctx, repository.CreatePromptTypeParams{
		Slug:         "diff-test-type",
		TemplateText: "In a diff test pose",
	})
	if err != nil {
		t.Fatalf("Failed to create prompt type: %v", err)
	}

	// Create two versions
	version1, err := service.SaveNewVersion(ctx, int(entity.ID), int(promptType.ID), "Original text", "")
	if err != nil {
		t.Fatalf("Failed to save version 1: %v", err)
	}

	version2, err := service.SaveNewVersion(ctx, int(entity.ID), int(promptType.ID), "Modified text", "")
	if err != nil {
		t.Fatalf("Failed to save version 2: %v", err)
	}

	// Test diff
	t.Run("diff shows changes", func(t *testing.T) {
		diff, err := service.GetPromptDiff(ctx, int(version1.ID), int(version2.ID))
		if err != nil {
			t.Fatalf("GetPromptDiff failed: %v", err)
		}
		// Diff should contain the original and modified text
		if diff == "" {
			t.Error("Expected non-empty diff")
		}
		// Check that it contains markers for additions and deletions
		if !strings.Contains(diff, "[-") || !strings.Contains(diff, "[+") {
			t.Errorf("Diff should contain change markers ([-] and [+]), got: %s", diff)
		}
		// Verify it contains version info
		if !strings.Contains(diff, "Diff between v1 and v2") {
			t.Errorf("Diff should contain version info, got: %s", diff)
		}
	})
}
