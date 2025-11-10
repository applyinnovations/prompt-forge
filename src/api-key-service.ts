/**
 * API Key Service for encrypted storage and retrieval
 */

import { encryptData, decryptData } from './encryption.js';
import { executeQuery } from './database.js';

export interface AIProvider {
  id: number;
  provider_name: string;
  encrypted_api_key: string;
  last_used_model: string | null;
  created_at: string;
  updated_at: string;
}

let encryptionKey: string | null = null;

/**
 * Set the encryption key (stored in memory only)
 */
export function setEncryptionKey(key: string): void {
  encryptionKey = key;
}

/**
 * Clear the encryption key from memory
 */
export function clearEncryptionKey(): void {
  encryptionKey = null;
}

/**
 * Check if encryption key is set
 */
export function hasEncryptionKey(): boolean {
  return encryptionKey !== null;
}

/**
 * Store an API key encrypted in the database
 */
export async function storeApiKey(providerName: string, apiKey: string, lastUsedModel?: string): Promise<void> {
  if (!encryptionKey) {
    throw new Error('Encryption key not set');
  }

  const encryptedKey = await encryptData(apiKey, encryptionKey);

  // Use UPSERT syntax to insert or update
  await executeQuery(
    `INSERT INTO ai_providers (provider_name, encrypted_api_key, last_used_model)
     VALUES (?, ?, ?)
     ON CONFLICT(provider_name) DO UPDATE SET
       encrypted_api_key = excluded.encrypted_api_key,
       last_used_model = excluded.last_used_model,
       updated_at = DATETIME('now')`,
    [providerName, encryptedKey, lastUsedModel || null]
  );
}

/**
 * Retrieve and decrypt API keys for multiple providers from the database
 */
export async function getApiKeys(providerNames: string[]): Promise<Record<string, string | null>> {
  if (!encryptionKey) {
    return Object.fromEntries(providerNames.map(name => [name, null]));
  }

  // Build IN clause for multiple providers
  const placeholders = providerNames.map(() => '?').join(',');
  const result = await executeQuery(
    `SELECT provider_name, encrypted_api_key FROM ai_providers WHERE provider_name IN (${placeholders})`,
    providerNames,
    'resultRows'
  );

  // Initialize result object with null for all requested providers
  const apiKeys: Record<string, string | null> = Object.fromEntries(
    providerNames.map(name => [name, null])
  );

  // Process results
  if (result.result?.resultRows?.length) {
    for (const row of result.result.resultRows) {
      const providerName = row[0];
      const encryptedKey = row[1];

      try {
        const decryptedKey = await decryptData(encryptedKey, encryptionKey);
        apiKeys[providerName] = decryptedKey;
      } catch (error) {
        console.error(`Failed to decrypt API key for ${providerName}:`, error);
        apiKeys[providerName] = null;
      }
    }
  }

  return apiKeys;
}

/**
 * Retrieve and decrypt an API key from the database
 * @deprecated Use getApiKeys() for better performance when fetching multiple keys
 */
export async function getApiKey(providerName: string): Promise<string | null> {
  const result = await getApiKeys([providerName]);
  return result[providerName] ?? null;
}

/**
 * Update the last used model for a provider
 */
export async function updateLastUsedModel(providerName: string, modelId: string): Promise<void> {
  await executeQuery(
    'UPDATE ai_providers SET last_used_model = ?, updated_at = DATETIME(\'now\') WHERE provider_name = ?',
    [modelId, providerName]
  );
}

/**
 * Get all stored providers (without decrypting keys)
 */
export async function getAllProviders(): Promise<AIProvider[]> {
  const result = await executeQuery(
    'SELECT id, provider_name, encrypted_api_key, last_used_model, created_at, updated_at FROM ai_providers ORDER BY provider_name',
    [],
    'resultRows'
  );

  if (!result.result?.resultRows?.length) {
    return [];
  }

  const providers: AIProvider[] = [];
  for (const row of result.result.resultRows) {
    const provider: AIProvider = {
      id: row[0],
      provider_name: row[1],
      encrypted_api_key: row[2],
      last_used_model: row[3],
      created_at: row[4],
      updated_at: row[5]
    };
    providers.push(provider);
  }
  return providers;
}

/**
 * Get provider info including decrypted API key
 */
export async function getProviderWithKey(providerName: string): Promise<{ provider: AIProvider; apiKey: string | null } | null> {
  const result = await executeQuery(
    'SELECT id, provider_name, encrypted_api_key, last_used_model, created_at, updated_at FROM ai_providers WHERE provider_name = ?',
    [providerName],
    'resultRows'
  );

  if (!result.result?.resultRows?.length) {
    return null;
  }

  const row = result.result.resultRows[0];
  const provider: AIProvider = {
    id: row[0],
    provider_name: row[1],
    encrypted_api_key: row[2],
    last_used_model: row[3],
    created_at: row[4],
    updated_at: row[5]
  };

  const apiKey = await getApiKey(providerName);
  return { provider, apiKey };
}

/**
 * Remove a provider and its API key
 */
export async function removeProvider(providerName: string): Promise<void> {
  await executeQuery('DELETE FROM ai_providers WHERE provider_name = ?', [providerName]);
}

/**
 * Migrate existing localStorage keys to encrypted database storage
 */
export async function migrateLocalStorageKeys(): Promise<void> {
  if (!encryptionKey) {
    throw new Error('Encryption key required for migration');
  }

  const providers = ['openai', 'anthropic', 'xai'];
  let migrated = false;

  for (const provider of providers) {
    const key = localStorage.getItem(`${provider.toUpperCase()}_API_KEY`);
    if (key) {
      await storeApiKey(provider, key);
      localStorage.removeItem(`${provider.toUpperCase()}_API_KEY`);
      migrated = true;
    }
  }

  if (migrated) {
    console.log('Migrated API keys from localStorage to encrypted database');
  }
}
