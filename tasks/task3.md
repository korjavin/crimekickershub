# Task 3: Prompt Engine Service

**Goal:** Implement the "Business Logic" for managing prompts, versioning, and composition.

**Location:** `internal/service/prompts/`

## Steps:

1.  **Service Definition:**
    * Create a `PromptService` struct that holds the `repository.Queries` interface.

2.  **Prompt Composition Logic:**
    * Implement a function `ComposePrompt(entityIDs []int, typeID int, extraParamsJSON string) (string, error)`.
    * **Logic:**
        * Fetch the *latest* `prompt_version` for all selected `entityIDs`.
        * Fetch the `prompt_type` template.
        * Concatenate them logically (e.g., "[Entity 1 Description] + [Entity 2 Description] + [Technical Params]").
        * Return the final string.

3.  **Versioning Logic:**
    * Implement `SaveNewVersion(entityID int, typeID int, text string, technicalParams string)`.
    * **Logic:**
        * Query the current max `version_number` for this Entity+Type.
        * Increment by 1.
        * Insert into `prompt_versions`.

4.  **Diff Logic (Text Comparison):**
    * Implement `GetPromptDiff(versionA_ID, versionB_ID int) (string, error)`.
    * Use a Go library like `github.com/sergi/go-diff` to generate a text diff between two versions.

5.  **Unit Test:**
    * Write a simple test ensuring that saving a new version properly increments the version number.