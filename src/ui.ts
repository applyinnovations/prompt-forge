import { savePrompt, loadPromptHistory } from './prompt.js';
import type { PromptHistoryItem } from './prompt.js';
import { loadMethodologies, loadMethodologyTypes, updateMethodologyList, updateMethodologySelect } from './methodology.js';
import { executeQuery, getDatabasePromiser } from './database.js';
import { showToast } from './toast.js';
import { openSettingsModal, setupModal } from './settings.js';
import { getAvailableModels, applyMethodologyToPrompt, type AIModel } from './ai-service.js';
import { getApiKeys, updateLastUsedModel, getAllProviders } from './api-key-service.js';

let shouldStartNewLineage = false;

/**
 * Initialize UI event listeners
 */
export function initUI(): void {
  document.addEventListener('DOMContentLoaded', () => {
    setupTextarea();
    setupButtons();
    setupModal();
    setupMethodologySelect();
    setupModelSelector();
    // loadAndUpdateModelSelector() is now called after encryption key is set
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
    const content = textarea.value.trim();
    if (content === '') {
      shouldStartNewLineage = true;
    }
    updatePredictiveSaveInfo();
  });

  // Add Ctrl+Enter shortcut to save prompt
  textarea.addEventListener('keydown', (event) => {
    if (event.ctrlKey && event.key === 'Enter') {
      event.preventDefault();
      handleSavePrompt();
    }
  });

  // Initial setup
  updateCharacterCount();
  autoResizeTextarea();
  // Note: updatePredictiveSaveInfo() will be called after database initialization
}

/**
 * Setup button event listeners
 */
function setupButtons(): void {
  const copyButton = document.getElementById('copy-button');
  const settingsButton = document.getElementById('settings-button');

  if (copyButton) {
    copyButton.addEventListener('click', copyPrompt);
  }

   if (settingsButton) {
     settingsButton.addEventListener('click', () => openSettingsModal());
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
 * Setup model selector event listener
 */
function setupModelSelector(): void {
  const modelSelector = document.getElementById('model-selector') as HTMLSelectElement;
  if (!modelSelector) return;

  modelSelector.addEventListener('change', async () => {
    const selectedModel = modelSelector.value;
    if (selectedModel) {
      // Find the provider for this model
      const models = await getAvailableModels();
      const model = models.find(m => m.id === selectedModel);
      if (model) {
        await updateLastUsedModel(model.provider, selectedModel);
      }
    }
  });
}

/**
 * Auto-resize textarea functionality
 */
export function autoResizeTextarea(): void {
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
 * Handle save prompt (via Ctrl+Enter)
 */
async function handleSavePrompt(): Promise<void> {
  const textarea = document.getElementById('prompt-editor') as HTMLTextAreaElement;

  if (!textarea) return;

  try {
    await savePrompt(textarea.value, shouldStartNewLineage);
    shouldStartNewLineage = false;

    // Refresh prompt history and predictive save info
    await loadAndUpdatePromptHistory();
    await updatePredictiveSaveInfo();
  } catch (error) {
    // Error already handled in savePrompt
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
    item.innerHTML = formatPromptInfo(prompt);
    item.addEventListener('click', () => {
      // Load prompt into editor
      const textarea = document.getElementById('prompt-editor') as HTMLTextAreaElement;
      if (textarea) {
        textarea.value = prompt.content || '';
        shouldStartNewLineage = false; // Loading from history continues existing lineage
        updateCharacterCount();
        autoResizeTextarea();
        // Update predictive save info after loading
        updatePredictiveSaveInfo();
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

  // Adjust for timezone offset - assume database stores UTC
  // getTimezoneOffset() returns minutes, convert to milliseconds
  const timezoneOffset = now.getTimezoneOffset() * 60 * 1000;
  const adjustedDate = new Date(date.getTime() - timezoneOffset);

  const diffMs = now.getTime() - adjustedDate.getTime();
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
 * Format prompt information for display
 */
function formatPromptInfo(prompt: PromptHistoryItem): string {
  const title = prompt.title || 'Untitled';
  const versionNumber = prompt.versionNumber;
  const createdAt = formatRelativeTime(prompt.createdAt || '');
  const contentPreview = (prompt.content || '').substring(0, 150);
  const truncated = (prompt.content || '').length > 150 ? '...' : '';

  // Format change type and methodology info
  let changeInfo = '';
  if (prompt.changeType === 'methodology_apply' && prompt.methodologyName) {
    changeInfo = prompt.methodologyName;
  } else {
    changeInfo = prompt.changeType.replace('_', ' ');
    if (prompt.methodologyName) {
      changeInfo += ` (${prompt.methodologyName})`;
    }
  }

  return `
    <div class="text-text-primary text-sm truncate font-medium">${title}</div>
    <div class="text-text-muted text-xs mt-1 line-clamp-3">${contentPreview}${truncated}</div>
    <div class="text-text-muted text-xs mt-1 flex flex-wrap gap-1">
      <span>${prompt.lineageRootId}</span>
      <span>•</span>
      <span>v${versionNumber}</span>
      <span>•</span>
      <span>${createdAt}</span>
      <span>•</span>
      <span>${changeInfo}</span>
    </div>
  `;
}

/**
 * Format predictive save information
 */
async function formatPredictiveSaveInfo(): Promise<string> {
  try {
    const textarea = document.getElementById('prompt-editor') as HTMLTextAreaElement;
    const content = textarea?.value?.trim() || '';

    if (!content) {
      return '<div class="text-text-muted text-xs">Enter a prompt to see save preview</div>';
    }

    // Get the latest prompt to determine next version and lineage
    const latestPromptResponse = await executeQuery(
      'SELECT id, version_number, lineage_root_id FROM prompts ORDER BY created_at DESC LIMIT 1',
      undefined,
      'resultRows'
    );

    const latestPrompt = latestPromptResponse.result.resultRows?.[0];

    let nextVersion: number;
    let changeType: string;
    let lineageRootId: number;

    if (!latestPrompt || shouldStartNewLineage) {
      // First prompt ever or starting new lineage
      nextVersion = 1;
      changeType = 'initial';
      lineageRootId = shouldStartNewLineage && latestPrompt ? latestPrompt[2] + 1 : 1;
    } else {
      // Next version in the lineage
      nextVersion = latestPrompt[1] + 1;
      changeType = 'manual_edit';
      lineageRootId = latestPrompt[2]; // same lineage as latest
    }

    // Generate title preview
    const title = generateTitlePreview(content);

    return `<div class="text-text-muted text-xs">${lineageRootId} • v${nextVersion} • ctrl + enter to save</div>`;
  } catch (error) {
    console.error('Error generating predictive save info:', error);
    return '<div class="text-text-muted text-xs">Unable to preview save info</div>';
  }
}

/**
 * Generate title preview from content
 */
function generateTitlePreview(content: string): string {
  const firstLine = content.split('\n')[0] || '';
  return firstLine.substring(0, 50) + (firstLine.length > 50 ? '...' : '');
}

/**
 * Update predictive save info display
 */
export async function updatePredictiveSaveInfo(): Promise<void> {
  const predictiveInfo = document.getElementById('predictive-save-info');
  if (!predictiveInfo) return;

  // Check if database is initialized
  if (!getDatabasePromiser()) {
    predictiveInfo.innerHTML = '<div class="text-text-muted text-xs">Initializing...</div>';
    return;
  }

  const info = await formatPredictiveSaveInfo();
  predictiveInfo.innerHTML = info;
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

/**
 * Load and update model selector
 */
export async function loadAndUpdateModelSelector(): Promise<void> {
  try {
    const models = await getAvailableModels();
    updateModelSelector(models);

    // Check if no API keys are configured
    const apiKeys = await getApiKeys(['openai', 'anthropic', 'xai']);
    const hasAnyApiKey = !!(apiKeys.openai || apiKeys.anthropic || apiKeys.xai);

    if (!hasAnyApiKey) {
      showToast('No API keys configured. Please add API keys in settings to use AI features.', 'warning');
    } else if (models.length === 0) {
      showToast('Failed to load AI models. Please check your API keys in settings.', 'error');
    }
  } catch (error) {
    console.error('Failed to load models:', error);
    updateModelSelector([]);
    showToast('Failed to load AI models. Please check your API keys in settings.', 'error');
  }
}

/**
 * Set default model selection to most recently used model
 */
async function setDefaultModelSelection(selector: HTMLSelectElement, models: AIModel[]): Promise<void> {
  if (models.length === 0) return;

  try {
    // Get all providers with their last used models
    const providers = await getAllProviders();

    // Filter providers that have a last used model and sort by most recent updated_at
    const providersWithLastModel = providers
      .filter(provider => provider.last_used_model)
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

    // Find the most recent model that is still available
    for (const provider of providersWithLastModel) {
      const lastModel = models.find(model =>
        model.id === provider.last_used_model && model.provider === provider.provider_name
      );
      if (lastModel) {
        selector.value = lastModel.id;
        return;
      }
    }
  } catch (error) {
    console.error('Failed to get last used model:', error);
  }

  // Fallback to first available model if no last used model found
  if (models[0]) {
    selector.value = models[0].id;
  }
}

/**
 * Update model selector with available models
 */
function updateModelSelector(models: AIModel[]): void {
  const selector = document.getElementById('model-selector') as HTMLSelectElement;
  if (!selector) return;

  selector.innerHTML = '';

  if (models.length === 0) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'No models available';
    selector.appendChild(option);
    return;
  }

  // Add default option
  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = 'Select a model...';
  selector.appendChild(defaultOption);

  // Group models by provider
  const modelsByProvider: { [key: string]: AIModel[] } = {};
  models.forEach(model => {
    const provider = model.provider;
    if (provider) {
      if (!modelsByProvider[provider]) {
        modelsByProvider[provider] = [];
      }
      modelsByProvider[provider].push(model);
    }
  });

  // Add options grouped by provider
  Object.keys(modelsByProvider).forEach(provider => {
    const providerModels = modelsByProvider[provider];
    if (providerModels) {
      // Add provider group header (disabled option)
      const groupOption = document.createElement('option');
      groupOption.disabled = true;
      groupOption.textContent = `--- ${provider.toUpperCase()} ---`;
      selector.appendChild(groupOption);

      // Add provider models
      providerModels.forEach(model => {
        const option = document.createElement('option');
        option.value = model.id;
        option.textContent = model.name;
        selector.appendChild(option);
      });
    }
  });

  // Set default selection to most recently used model
  setDefaultModelSelection(selector, models);
}