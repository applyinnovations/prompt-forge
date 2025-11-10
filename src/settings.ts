import { wipeDatabase } from './database.js';
import { showToast } from './toast.js';
import { loadAndUpdateModelSelector } from './ui.js';
import { storeApiKey, getApiKeys, hasEncryptionKey } from './api-key-service.js';

/**
 * Open settings modal
 */
export async function openSettingsModal(): Promise<void> {
  const modal = document.getElementById('settings-modal');
  if (modal) {
    modal.classList.remove('hidden');
    await loadApiKeys();
  }
}

/**
 * Close settings modal
 */
export function closeSettingsModal(): void {
  const modal = document.getElementById('settings-modal');
  if (modal) {
    modal.classList.add('hidden');
  }
}

/**
 * Load API keys from encrypted database
 */
async function loadApiKeys(): Promise<void> {
  if (!hasEncryptionKey()) {
    // Clear inputs if no encryption key
    const xaiInput = document.getElementById('xai-api-key') as HTMLInputElement;
    const openaiInput = document.getElementById('openai-api-key') as HTMLInputElement;
    const anthropicInput = document.getElementById('anthropic-api-key') as HTMLInputElement;

    if (xaiInput) xaiInput.value = '';
    if (openaiInput) openaiInput.value = '';
    if (anthropicInput) anthropicInput.value = '';
    return;
  }

  const apiKeys = await getApiKeys(['xai', 'openai', 'anthropic']);

  const xaiInput = document.getElementById('xai-api-key') as HTMLInputElement;
  const openaiInput = document.getElementById('openai-api-key') as HTMLInputElement;
  const anthropicInput = document.getElementById('anthropic-api-key') as HTMLInputElement;

  if (xaiInput) xaiInput.value = apiKeys.xai || '';
  if (openaiInput) openaiInput.value = apiKeys.openai || '';
  if (anthropicInput) anthropicInput.value = apiKeys.anthropic || '';
}

/**
 * Save API keys to encrypted database
 */
async function saveApiKeys(): Promise<void> {
  if (!hasEncryptionKey()) {
    showToast('Encryption key not set. Please enter your encryption key first.', 'error');
    return;
  }

  const xaiInput = document.getElementById('xai-api-key') as HTMLInputElement;
  const openaiInput = document.getElementById('openai-api-key') as HTMLInputElement;
  const anthropicInput = document.getElementById('anthropic-api-key') as HTMLInputElement;

  try {
    if (xaiInput && xaiInput.value.trim()) {
      await storeApiKey('xai', xaiInput.value.trim());
    }
    if (openaiInput && openaiInput.value.trim()) {
      await storeApiKey('openai', openaiInput.value.trim());
    }
    if (anthropicInput && anthropicInput.value.trim()) {
      await storeApiKey('anthropic', anthropicInput.value.trim());
    }

    showToast('API keys saved successfully', 'success');

    // Reload models after saving API keys
    await loadAndUpdateModelSelector();

    closeSettingsModal();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    showToast(`Failed to save API keys: ${errorMessage}`, 'error');
  }
}

/**
 * Handle wipe database from modal
 */
async function handleWipeDatabaseModal(): Promise<void> {
  try {
    await wipeDatabase();
    showToast('Database wiped successfully, reloading...', 'warning');
    closeSettingsModal();
    location.reload();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
    showToast(`Failed to wipe database: ${errorMessage}`, 'error');
  }
}

/**
 * Setup modal event listeners
 */
export function setupModal(): void {
  const closeButton = document.getElementById('close-settings-modal');
  const apiKeysForm = document.getElementById('api-keys-form');
  const wipeDbModalButton = document.getElementById('wipe-db-modal-button');
  const modal = document.getElementById('settings-modal');

  if (closeButton) {
    closeButton.addEventListener('click', closeSettingsModal);
  }

  if (apiKeysForm) {
    apiKeysForm.addEventListener('submit', (e) => {
      e.preventDefault();
      saveApiKeys();
    });
  }

  if (wipeDbModalButton) {
    wipeDbModalButton.addEventListener('click', handleWipeDatabaseModal);
  }

  // Close modal when clicking outside
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeSettingsModal();
      }
    });
  }
}