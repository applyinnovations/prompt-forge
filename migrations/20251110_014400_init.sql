-- migrations/20251110_014400_init.sql
-- Initial database schema for Prompt Forge
-- Creates all tables with proper constraints, indexes, and relationships

-- Enable foreign key support
PRAGMA foreign_keys = ON;

-- Migrations tracking table
CREATE TABLE IF NOT EXISTS migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL UNIQUE,
    applied_at DATETIME DEFAULT (DATETIME('now'))
);

-- No TaxonomyGroups table needed; paths stored directly in Methodologies

-- No TaxonomyNodes table needed; paths stored directly in Methodologies

-- Create Methodologies table (leaf nodes: narrative_smuggling, jailbreak, etc.)
CREATE TABLE IF NOT EXISTS methodologies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    path TEXT NOT NULL,  -- e.g., 'attack_intents/business_integrity/policy_overriding/discounts'
    type TEXT NOT NULL CHECK(type IN ('intent', 'technique', 'evasion')),
    examples TEXT,  -- JSON array of example attacks
    prompt_samples TEXT,  -- JSON array of sample injections
    created_at DATETIME DEFAULT (DATETIME('now')),
    updated_at DATETIME DEFAULT (DATETIME('now'))
);

-- Create Prompts table (versioned prompt snapshots)
CREATE TABLE IF NOT EXISTS prompts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    content TEXT NOT NULL,
    parent_prompt_id INTEGER,
    methodology_id INTEGER,
    change_type TEXT NOT NULL CHECK(change_type IN ('initial', 'manual_edit', 'technique_apply')),
    metadata TEXT,  -- JSON: {intent: "...", evasion: "...", status: "..."}
    version_number INTEGER NOT NULL,
    lineage_root_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT (DATETIME('now')),
    updated_at DATETIME DEFAULT (DATETIME('now')),
    FOREIGN KEY (parent_prompt_id) REFERENCES Prompts(id) ON DELETE SET NULL,
    FOREIGN KEY (methodology_id) REFERENCES Methodologies(id) ON DELETE SET NULL,
    FOREIGN KEY (lineage_root_id) REFERENCES Prompts(id) ON DELETE CASCADE,
    UNIQUE(lineage_root_id, version_number)
);

-- Indexes for performance
-- Methodologies indexes (replacing taxonomy hierarchy indexes)
CREATE INDEX IF NOT EXISTS idx_methodology_path ON methodologies(path);
CREATE INDEX IF NOT EXISTS idx_methodology_type ON methodologies(type);

-- Prompt lineage and versioning indexes
CREATE INDEX IF NOT EXISTS idx_parent_prompt ON prompts(parent_prompt_id);
CREATE INDEX IF NOT EXISTS idx_lineage_root ON prompts(lineage_root_id);
CREATE INDEX IF NOT EXISTS idx_lineage_root_version ON prompts(lineage_root_id, version_number);
CREATE INDEX IF NOT EXISTS idx_methodology ON prompts(methodology_id);
CREATE INDEX IF NOT EXISTS idx_change_type ON prompts(change_type);
CREATE INDEX IF NOT EXISTS idx_version_number ON prompts(version_number);
CREATE INDEX IF NOT EXISTS idx_created_at ON prompts(created_at DESC);

-- Methodology search indexes
CREATE INDEX IF NOT EXISTS idx_methodology_name ON methodologies(name);
CREATE INDEX IF NOT EXISTS idx_methodology_type ON methodologies(type);

-- No initial seeding needed for Methodologies; will be populated from .md files

-- Trigger to auto-update updated_at timestamp
CREATE TRIGGER IF NOT EXISTS update_methodologies_updated_at
AFTER UPDATE ON methodologies
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
    UPDATE methodologies SET updated_at = DATETIME('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_prompts_updated_at
AFTER UPDATE ON prompts
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
    UPDATE Prompts SET updated_at = DATETIME('now') WHERE id = NEW.id;
END;

-- Trigger to maintain version_number consistency within lineages
CREATE TRIGGER IF NOT EXISTS validate_prompt_version
BEFORE INSERT ON prompts
FOR EACH ROW
BEGIN
    SELECT CASE
        WHEN NEW.change_type = 'initial' AND NEW.version_number != 1 THEN
            RAISE(ABORT, 'Initial prompts must have version_number = 1')
        WHEN NEW.change_type != 'initial' AND (
            (NEW.parent_prompt_id IS NULL) OR 
            (SELECT version_number FROM Prompts WHERE id = NEW.parent_prompt_id) + 1 != NEW.version_number
        ) THEN
            RAISE(ABORT, 'version_number must be parent.version_number + 1')
        ELSE 1
    END;
END;

-- Trigger for methodology_id consistency (replaces technique_id trigger logic)
CREATE TRIGGER IF NOT EXISTS validate_prompt_methodology
BEFORE INSERT ON prompts
FOR EACH ROW
BEGIN
    SELECT CASE
        WHEN NEW.change_type = 'technique_apply' AND NEW.methodology_id IS NULL THEN
            RAISE(ABORT, 'technique_apply requires methodology_id')
        WHEN NEW.change_type != 'technique_apply' AND NEW.methodology_id IS NOT NULL THEN
            RAISE(ABORT, 'Only technique_apply can have methodology_id')
        ELSE 1
    END;
END;

-- Trigger to ensure lineage_root_id consistency
CREATE TRIGGER IF NOT EXISTS validate_prompt_lineage
BEFORE INSERT ON prompts
FOR EACH ROW
BEGIN
    SELECT CASE
        WHEN NEW.change_type = 'initial' AND NEW.lineage_root_id != NEW.id THEN
            RAISE(ABORT, 'Initial prompts must have lineage_root_id = self.id')
        WHEN NEW.change_type != 'initial' AND NEW.lineage_root_id != COALESCE(
            (SELECT lineage_root_id FROM prompts WHERE id = NEW.parent_prompt_id),
            NEW.parent_prompt_id
        ) THEN
            RAISE(ABORT, 'lineage_root_id must match parent or be parent_id for branches')
        ELSE 1
    END;
END;

-- View for easy access to latest prompts per lineage
CREATE VIEW IF NOT EXISTS latest_prompts AS
SELECT lineage_root_id, MAX(version_number) as latest_version
FROM prompts
GROUP BY lineage_root_id;

-- View for prompt history with parent titles (for UI display)
CREATE VIEW IF NOT EXISTS prompt_history AS
SELECT
    p.id,
    p.title,
    p.content,
    p.change_type,
    p.version_number,
    p.lineage_root_id,
    p.created_at,
    parent.title as parent_title,
    m.name as methodology_name,
    m.type as methodology_type,
    m.path as methodology_path
FROM prompts p
LEFT JOIN prompts parent ON p.parent_prompt_id = parent.id
LEFT JOIN methodologies m ON p.methodology_id = m.id
ORDER BY p.lineage_root_id, p.version_number;