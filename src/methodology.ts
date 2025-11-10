import { executeQuery } from './database.js';
import { applyMethodologyToPrompt } from './ai-service.js';
import { savePrompt } from './prompt.js';
import { showToast } from './toast.js';
import { autoResizeTextarea } from './ui.js';
import { getApiKeys } from './api-key-service.js';

export interface Methodology {
  id: number;
  name: string;
  description: string;
  path: string;
  type: string;
  examples?: string;
  prompt_samples?: string;
}

/**
 * Load methodology types for dropdown
 */
export async function loadMethodologyTypes(): Promise<string[]> {
  try {
    const response = await executeQuery(
      'SELECT DISTINCT type FROM methodologies ORDER BY type',
      undefined,
      'resultRows'
    );

    return (response.result.resultRows || []).map((row: any[]) => row[0]).filter(Boolean);
  } catch (error) {
    console.error('Error loading methodology types:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
    showToast(`Failed to load methodology types: ${errorMessage}`, 'error');
    throw error;
  }
}

/**
 * Load methodologies by type
 */
export async function loadMethodologies(type: string): Promise<Methodology[]> {
  try {
    const response = await executeQuery(
      'SELECT id, name, description, path, examples, prompt_samples FROM methodologies WHERE type = ? ORDER BY name',
      [type],
      'resultRows'
    );

    return (response.result.resultRows || []).map((row: any[]) => ({
      id: row[0],
      name: row[1],
      description: row[2] || '',
      path: row[3],
      type,
      examples: row[4] || '',
      prompt_samples: row[5] || ''
    }));
  } catch (error) {
    console.error('Error loading methodologies:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
    showToast(`Failed to load methodologies: ${errorMessage}`, 'error');
    throw error;
  }
}

/**
 * Update methodology select dropdown
 */
export function updateMethodologySelect(types: string[]): void {
  const methodologySelect = document.getElementById('methodology-select') as HTMLSelectElement;
  if (!methodologySelect) return;

  methodologySelect.innerHTML = '';
  types.forEach((type) => {
    const option = document.createElement('option');
    option.value = type;
    option.textContent = type;
    methodologySelect.appendChild(option);
  });
}

/**
 * Handle methodology application with AI
 */
async function handleMethodologyApplication(methodology: Methodology, onPromptBuilt?: (prompt: string) => void): Promise<void> {
  const textarea = document.getElementById('prompt-editor') as HTMLTextAreaElement;
  const modelSelector = document.getElementById('model-selector') as HTMLSelectElement;

  if (!textarea || !modelSelector) {
    showToast('UI elements not found', 'error');
    return;
  }

  const currentPrompt = textarea.value.trim();
  const selectedModel = modelSelector.value;

  if (!currentPrompt) {
    showToast('Please enter a prompt first', 'warning');
    return;
  }

  if (!selectedModel) {
    showToast('Please select an AI model', 'warning');
    return;
  }

  // Check if API keys are configured
  const apiKeys = await getApiKeys(['openai', 'anthropic', 'xai']);
  const hasAnyApiKey = !!(apiKeys.openai || apiKeys.anthropic || apiKeys.xai);

  if (!hasAnyApiKey) {
    showToast('No API keys configured. Please add API keys in settings to use AI features.', 'warning');
    return;
  }

  try {
    // Save current version as manual_edit
    await savePrompt(currentPrompt, false, 'manual_edit');

    // Show loading state
    textarea.disabled = true;
    modelSelector.disabled = true;
    textarea.value = 'Applying methodology...';
    textarea.style.opacity = '0.7';

    // Apply methodology with AI
    let isFirstChunk = true;
    const result = await applyMethodologyToPrompt(
      currentPrompt,
      methodology,
      selectedModel,
      (chunk) => {
        // Handle streaming chunks
        if (isFirstChunk) {
          // Replace the "Applying methodology..." placeholder with the first chunk
          textarea.value = chunk;
          isFirstChunk = false;
        } else {
          // Append subsequent chunks
          textarea.value += chunk;
        }
        // Auto-resize textarea as content grows
        autoResizeTextarea();
      },
      (builtPrompt) => {
        // Update recent AI prompt display with the full built prompt
        if ((window as any).updateRecentAIPrompt) {
          (window as any).updateRecentAIPrompt(builtPrompt);
        }
      }
    );

    // Save the AI-generated result
    await savePrompt(result, false, 'methodology_apply', methodology.id);

    showToast(`Applied ${methodology.name} methodology successfully`, 'success');

  } catch (error) {
    console.error('Methodology application failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    showToast(`Failed to apply methodology: ${errorMessage}`, 'error');

    // Restore original prompt on error
    textarea.value = currentPrompt;
  } finally {
    // Restore UI state
    const textarea = document.getElementById('prompt-editor') as HTMLTextAreaElement;
    const modelSelector = document.getElementById('model-selector') as HTMLSelectElement;

    if (textarea) {
      textarea.disabled = false;
      textarea.style.opacity = '1';
    }
    if (modelSelector) {
      modelSelector.disabled = false;
    }
  }
}

/**
 * Update methodology list in UI
 */
export function updateMethodologyList(methodologies: Methodology[]): void {
  const methodologyList = document.getElementById('taxonomy-list');
  if (!methodologyList) return;

  methodologyList.innerHTML = '';

  if (methodologies.length === 0) {
    methodologyList.innerHTML = '<div class="text-text-muted text-sm">No methodologies found</div>';
    return;
  }

  methodologies.forEach((methodology) => {
    const item = document.createElement('div');
    item.className = 'border border-border-primary p-2 rounded cursor-pointer hover:bg-surface-secondary transition-colors';
    item.innerHTML = `
      <div class="text-text-primary text-sm font-medium">${methodology.name}</div>
      <div class="text-text-muted text-xs mt-1">${methodology.description || 'No description'}</div>
    `;
    item.addEventListener('click', async () => {
      await handleMethodologyApplication(methodology);
    });
    methodologyList.appendChild(item);
  });
}