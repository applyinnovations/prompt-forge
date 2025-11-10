-- Fix the validate_prompt_lineage trigger to not enforce lineage_root_id = id check for initial prompts on INSERT
-- since the id is auto-assigned and lineage_root_id will be updated after insert

DROP TRIGGER IF EXISTS validate_prompt_lineage;

CREATE TRIGGER IF NOT EXISTS validate_prompt_lineage
BEFORE INSERT ON prompts
FOR EACH ROW
BEGIN
    SELECT CASE
        WHEN NEW.change_type != 'initial' AND NEW.lineage_root_id != COALESCE(
            (SELECT lineage_root_id FROM prompts WHERE id = NEW.parent_prompt_id),
            NEW.parent_prompt_id
        ) THEN
            RAISE(ABORT, 'lineage_root_id must match parent or be parent_id for branches')
        ELSE 1
    END;
END;