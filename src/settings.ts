import { wipeDatabase } from './database.js';
import { showToast } from './toast.js';
import { loadAndUpdateModelSelector } from './ui.js';

/**
 * Open settings modal
 */
export function openSettingsModal(): void {
  const modal = document.getElementById('settings-modal');
  if (modal) {
    modal.classList.remove('hidden');
    loadApiKeys();
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
 * Load API keys from localStorage
 */
function loadApiKeys(): void {
  const xaiKey = localStorage.getItem('XAI_API_KEY') || '';
  const openaiKey = localStorage.getItem('OPENAI_API_KEY') || '';
  const anthropicKey = localStorage.getItem('ANTHROPIC_API_KEY') || '';

  const xaiInput = document.getElementById('xai-api-key') as HTMLInputElement;
  const openaiInput = document.getElementById('openai-api-key') as HTMLInputElement;
  const anthropicInput = document.getElementById('anthropic-api-key') as HTMLInputElement;

  if (xaiInput) xaiInput.value = xaiKey;
  if (openaiInput) openaiInput.value = openaiKey;
  if (anthropicInput) anthropicInput.value = anthropicKey;
}

/**
 * Save API keys to localStorage
 */
async function saveApiKeys(): Promise<void> {
  const xaiInput = document.getElementById('xai-api-key') as HTMLInputElement;
  const openaiInput = document.getElementById('openai-api-key') as HTMLInputElement;
  const anthropicInput = document.getElementById('anthropic-api-key') as HTMLInputElement;

  if (xaiInput) localStorage.setItem('XAI_API_KEY', xaiInput.value);
  if (openaiInput) localStorage.setItem('OPENAI_API_KEY', openaiInput.value);
  if (anthropicInput) localStorage.setItem('ANTHROPIC_API_KEY', anthropicInput.value);

  showToast('API keys saved successfully', 'success');

  // Reload models after saving API keys
  await loadAndUpdateModelSelector();

  closeSettingsModal();
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