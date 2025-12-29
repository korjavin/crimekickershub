package prompts

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"

	"crimekickershub/internal/repository"

	"github.com/sergi/go-diff/diffmatchpatch"
)

// PromptService handles prompt composition, versioning, and diffing.
type PromptService struct {
	queries repository.Querier
}

// NewPromptService creates a new PromptService with the given repository queries.
func NewPromptService(queries repository.Querier) *PromptService {
	return &PromptService{queries: queries}
}

// ComposePrompt constructs a full prompt by combining entity narratives with a prompt type template.
// entityIDs are the IDs of entities to include (characters, locations, etc.)
// typeSlug is the prompt type slug (e.g., "action-shot", "portrait")
// extraParamsJSON is optional JSON containing technical parameters
func (s *PromptService) ComposePrompt(ctx context.Context, entityIDs []int, typeSlug string, extraParamsJSON string) (string, error) {
	if len(entityIDs) == 0 {
		return "", errors.New("no entities provided")
	}

	// Fetch the prompt type template
	promptType, err := s.queries.GetPromptTypeBySlug(ctx, typeSlug)
	if err != nil {
		return "", fmt.Errorf("failed to fetch prompt type: %w", err)
	}

	var entityNarratives []string
	for _, entityID := range entityIDs {
		// Get the entity
		entity, err := s.queries.GetEntityByID(ctx, int64(entityID))
		if err != nil {
			return "", fmt.Errorf("failed to fetch entity %d: %w", entityID, err)
		}

		// Use the entity's description as the narrative
		if entity.Description.Valid {
			entityNarratives = append(entityNarratives, entity.Description.String)
		}
	}

	// Compose the final prompt: replace {{ENTITY}} placeholder in template with narratives
	var sb strings.Builder

	// Combine all entity narratives
	narrative := strings.Join(entityNarratives, " ")

	// Replace {{ENTITY}} placeholder in template with the combined narrative
	if promptType.TemplateText != "" {
		if strings.Contains(promptType.TemplateText, "{{ENTITY}}") {
			sb.WriteString(strings.Replace(promptType.TemplateText, "{{ENTITY}}", narrative, -1))
		} else {
			// Fallback: append narrative to template
			sb.WriteString(narrative)
			sb.WriteString(" ")
			sb.WriteString(promptType.TemplateText)
		}
	} else {
		// No template, just use the narrative
		 sb.WriteString(narrative)
	}

	// Add technical parameters if provided
	if extraParamsJSON != "" {
		sb.WriteString(" ")
		sb.WriteString(extraParamsJSON)
	}

	return sb.String(), nil
}

// SaveNewVersion saves a new version of a prompt for an entity and type combination.
// It increments the version number automatically.
func (s *PromptService) SaveNewVersion(ctx context.Context, entityID int, typeID int, promptText string, technicalParamsJSON string) (repository.PromptVersion, error) {
	// Get the latest version for this entity+type combination
	latest, err := s.queries.GetLatestPromptVersion(ctx, repository.GetLatestPromptVersionParams{
		EntityID: int64(entityID),
		TypeID:   int64(typeID),
	})

	// Handle case where no versions exist yet (sql.ErrNoRows is expected for first version)
	if err != nil && err != sql.ErrNoRows {
		return repository.PromptVersion{}, fmt.Errorf("failed to get latest version: %w", err)
	}

	// Determine the next version number
	newVersion := 1
	// If no error and latest has an ID > 0, it means we found a version
	if err == nil && latest.ID > 0 {
		newVersion = int(latest.VersionNumber) + 1
	}

	// Insert the new version
	result, err := s.queries.CreatePromptVersion(ctx, repository.CreatePromptVersionParams{
		EntityID:            int64(entityID),
		TypeID:              int64(typeID),
		VersionNumber:       int64(newVersion),
		PromptText:          promptText,
		TechnicalParamsJson: sql.NullString{String: technicalParamsJSON, Valid: technicalParamsJSON != ""},
	})
	if err != nil {
		return repository.PromptVersion{}, fmt.Errorf("failed to create prompt version: %w", err)
	}

	return result, nil
}

// GetPromptDiff generates a text diff between two prompt versions.
// Returns the diff as a formatted string showing additions and deletions.
func (s *PromptService) GetPromptDiff(ctx context.Context, versionAID int, versionBID int) (string, error) {
	// Fetch both versions
	versionA, err := s.queries.GetPromptVersionByID(ctx, int64(versionAID))
	if err != nil {
		return "", fmt.Errorf("failed to fetch version A: %w", err)
	}

	versionB, err := s.queries.GetPromptVersionByID(ctx, int64(versionBID))
	if err != nil {
		return "", fmt.Errorf("failed to fetch version B: %w", err)
	}

	// Use go-diff to generate the diff
	dmp := diffmatchpatch.New()
	diffs := dmp.DiffMain(versionA.PromptText, versionB.PromptText, false)

	// Format the diff
	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("Diff between v%d and v%d:\n", versionA.VersionNumber, versionB.VersionNumber))

	for _, diff := range diffs {
		switch diff.Type {
		case diffmatchpatch.DiffEqual:
			// No change - show as-is
			sb.WriteString(diff.Text)
		case diffmatchpatch.DiffInsert:
			// Addition - show in green/plus
			sb.WriteString("[+")
			sb.WriteString(diff.Text)
			sb.WriteString("]")
		case diffmatchpatch.DiffDelete:
			// Deletion - show in red/minus
			sb.WriteString("[-")
			sb.WriteString(diff.Text)
			sb.WriteString("]")
		}
	}

	return sb.String(), nil
}

// GetLatestPromptVersion retrieves the latest version for an entity and type.
func (s *PromptService) GetLatestPromptVersion(ctx context.Context, entityID int, typeID int) (repository.PromptVersion, error) {
	version, err := s.queries.GetLatestPromptVersion(ctx, repository.GetLatestPromptVersionParams{
		EntityID: int64(entityID),
		TypeID:   int64(typeID),
	})
	if err != nil {
		return repository.PromptVersion{}, fmt.Errorf("failed to get latest version: %w", err)
	}
	return version, nil
}

// ListPromptVersionsForEntity lists all versions for a specific entity.
func (s *PromptService) ListPromptVersionsForEntity(ctx context.Context, entityID int) ([]repository.PromptVersion, error) {
	versions, err := s.queries.ListPromptVersionsForEntity(ctx, int64(entityID))
	if err != nil {
		return nil, fmt.Errorf("failed to list versions: %w", err)
	}
	return versions, nil
}
