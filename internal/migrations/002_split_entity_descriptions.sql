-- Task 21: Split entity descriptions into public bio and base prompt
-- This separates the public-facing wiki bio from the AI generation prompt

-- Add base_prompt column for AI generation
ALTER TABLE entities ADD COLUMN base_prompt TEXT DEFAULT '';

-- Copy existing description to base_prompt as initial value
-- (This preserves data during migration - users can refine later)
UPDATE entities SET base_prompt = COALESCE(description, '');

-- Note: We keep the description column as-is for the public wiki bio
-- description = Public-facing bio (for website)
-- base_prompt = AI generation template (for prompt mixer)
