-- migrations/20251110_015000_add_ai_providers.sql
-- Add encrypted AI provider storage table

-- Create ai_providers table for encrypted API key storage
CREATE TABLE IF NOT EXISTS ai_providers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    provider_name TEXT NOT NULL UNIQUE, -- 'openai', 'anthropic', 'xai'
    encrypted_api_key TEXT NOT NULL, -- AES-256 encrypted API key
    last_used_model TEXT, -- Most recently used model ID
    created_at DATETIME DEFAULT (DATETIME('now')),
    updated_at DATETIME DEFAULT (DATETIME('now'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_providers_provider_name ON ai_providers(provider_name);

-- Trigger to auto-update updated_at timestamp
CREATE TRIGGER IF NOT EXISTS update_ai_providers_updated_at
AFTER UPDATE ON ai_providers
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
    UPDATE ai_providers SET updated_at = DATETIME('now') WHERE id = NEW.id;
END;