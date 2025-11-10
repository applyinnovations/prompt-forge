import { executeQuery } from './database.js';
import { showToast } from './toast.js';

export interface Methodology {
  id: number;
  name: string;
  description: string;
  path: string;
  type: string;
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
      'SELECT id, name, description, path FROM methodologies WHERE type = ? ORDER BY name',
      [type],
      'resultRows'
    );

    return (response.result.resultRows || []).map((row: any[]) => ({
      id: row[0],
      name: row[1],
      description: row[2] || '',
      path: row[3],
      type
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
    item.addEventListener('click', () => {
      // TODO: Handle methodology selection
      console.log('Selected methodology:', methodology);
    });
    methodologyList.appendChild(item);
  });
}