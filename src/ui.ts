import { savePrompt, loadPromptHistory } from './prompt.js';
import type { PromptHistoryItem } from './prompt.js';
import { loadMethodologies, loadMethodologyTypes, updateMethodologyList, updateMethodologySelect } from './methodology.js';
import { wipeDatabase } from './database.js';
import { showToast } from './toast.js';

/**
 * Initialize UI event listeners
 */
export function initUI(): void {
  document.addEventListener('DOMContentLoaded', () => {
    setupTextarea();
    setupButtons();
    setupMethodologySelect();
  });
}

/**
 * Setup textarea functionality
 */
function setupTextarea(): void {
  const textarea = document.getElementById('prompt-editor') as HTMLTextAreaElement;
  if (!textarea) return;

  textarea.addEventListener('input', () => {
    updateCharacterCount();
    autoResizeTextarea();
  });

  // Initial setup
  updateCharacterCount();
  autoResizeTextarea();
}

/**
 * Setup button event listeners
 */
function setupButtons(): void {
  const copyButton = document.getElementById('copy-button');
  const saveButton = document.getElementById('save-button');
  const wipeDbButton = document.getElementById('wipe-db-button');

  if (copyButton) {
    copyButton.addEventListener('click', copyPrompt);
  }

  if (saveButton) {
    saveButton.addEventListener('click', handleSavePrompt);
  }

  if (wipeDbButton) {
    wipeDbButton.addEventListener('click', handleWipeDatabase);
  }
}

/**
 * Setup methodology select event listener
 */
function setupMethodologySelect(): void {
  const methodologySelect = document.getElementById('methodology-select') as HTMLSelectElement;
  if (!methodologySelect) return;

  methodologySelect.addEventListener('change', () => {
    const type = methodologySelect.value;
    loadMethodologies(type).then(updateMethodologyList);
  });
}

/**
 * Auto-resize textarea functionality
 */
function autoResizeTextarea(): void {
  const textarea = document.getElementById('prompt-editor') as HTMLTextAreaElement;
  if (textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  }
}

/**
 * Character count functionality
 */
function updateCharacterCount(): void {
  const textarea = document.getElementById('prompt-editor') as HTMLTextAreaElement;
  const characterCountElement = document.getElementById('character-count');
  if (textarea && characterCountElement) {
    const characters = textarea.value.length;
    characterCountElement.textContent = `${characters}`;
  }
}

/**
 * Copy functionality
 */
function copyPrompt(): void {
  const textarea = document.getElementById('prompt-editor') as HTMLTextAreaElement;
  const copyButton = document.getElementById('copy-button');
  if (!textarea || !copyButton) return;

  navigator.clipboard.writeText(textarea.value).then(() => {
    showToast('Prompt copied to clipboard', 'success');
    // Visual feedback - temporarily change button appearance
    showButtonSuccess(copyButton);
  }).catch(err => {
    console.error('Failed to copy text: ', err);
    showToast('Failed to copy prompt to clipboard', 'error');
  });
}

/**
 * Handle save prompt button click
 */
async function handleSavePrompt(): Promise<void> {
  const textarea = document.getElementById('prompt-editor') as HTMLTextAreaElement;
  const saveButton = document.getElementById('save-button');

  if (!textarea || !saveButton) return;

  try {
    await savePrompt(textarea.value);
    showButtonSuccess(saveButton);

    // Refresh prompt history
    await loadAndUpdatePromptHistory();
  } catch (error) {
    showButtonError(saveButton);
  }
}

/**
 * Handle wipe database button click
 */
async function handleWipeDatabase(): Promise<void> {
  try {
    await wipeDatabase();
    showToast('Database wiped successfully, reloading...', 'warning');
    location.reload();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
    showToast(`Failed to wipe database: ${errorMessage}`, 'error');
  }
}

/**
 * Show success state on button
 */
function showButtonSuccess(button: HTMLElement): void {
  const originalText = button.innerHTML;
  button.innerHTML = `
    <svg fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
      <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  `;
  setTimeout(() => {
    button.innerHTML = originalText;
  }, 1000);
}

/**
 * Show error state on button
 */
function showButtonError(button: HTMLElement): void {
  const originalText = button.innerHTML;
  button.innerHTML = `
    <svg fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
      <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  `;
  setTimeout(() => {
    button.innerHTML = originalText;
  }, 1000);
}

/**
 * Load and update prompt history in UI
 */
export async function loadAndUpdatePromptHistory(): Promise<void> {
  try {
    const prompts = await loadPromptHistory();
    updatePromptHistoryList(prompts);
  } catch (error) {
    // Error already handled in loadPromptHistory
  }
}

/**
 * Update prompt history list in UI
 */
function updatePromptHistoryList(prompts: PromptHistoryItem[]): void {
  const promptHistory = document.getElementById('prompt-history');
  if (!promptHistory) return;

  promptHistory.innerHTML = '';

  if (prompts.length === 0) {
    promptHistory.innerHTML = '<div class="text-text-muted text-sm">No prompts found</div>';
    return;
  }

  prompts.forEach((prompt) => {
    const item = document.createElement('div');
    item.className = 'border border-border-primary p-2 rounded cursor-pointer hover:bg-surface-secondary transition-colors';
    const title = prompt.title || 'Untitled';
    const content = prompt.content || '';
    const versionNumber = prompt.versionNumber;
    const createdAt = formatRelativeTime(prompt.createdAt || '');
    item.innerHTML = `
      <div class="text-text-primary text-sm truncate">${title}</div>
      <div class="text-text-muted text-xs mt-1 truncate">${content.substring(0, 50)}${content.length > 50 ? '...' : ''}</div>
      <div class="text-text-muted text-xs mt-1">v${versionNumber} • ${createdAt}</div>
    `;
    item.addEventListener('click', () => {
      // Load prompt into editor
      const textarea = document.getElementById('prompt-editor') as HTMLTextAreaElement;
      if (textarea) {
        textarea.value = content;
        updateCharacterCount();
        autoResizeTextarea();
      }
    });
    promptHistory.appendChild(item);
  });
}

/**
 * Format relative timestamp
 */
function formatRelativeTime(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) {
    return 'now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else {
    return `${diffDays}d ago`;
  }
}

/**
 * Initialize methodology UI
 */
export async function initMethodologyUI(): Promise<void> {
  try {
    const types = await loadMethodologyTypes();
    updateMethodologySelect(types);

    // Load the first type if available
    if (types.length > 0 && types[0]) {
      const methodologies = await loadMethodologies(types[0]);
      updateMethodologyList(methodologies);
    }
  } catch (error) {
    // Error already handled in the functions
  }
}