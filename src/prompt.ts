import { executeQuery } from './database.js';
import { showToast } from './toast.js';

export interface Prompt {
  id: number;
  title: string;
  content: string;
  versionNumber: number;
  createdAt: string;
  parentPromptId?: number;
  changeType: string;
  lineageRootId: number;
}

export interface PromptHistoryItem {
  id: number;
  title: string;
  content: string;
  versionNumber: number;
  createdAt: string;
}

/**
 * Save a prompt with versioning
 */
export async function savePrompt(content: string): Promise<void> {
  if (!content.trim()) {
    return; // Don't save empty prompts
  }

  try {
    // Generate a simple title from the first line or first 50 characters
    const title = generatePromptTitle(content);

    // Get versioning information
    const versioningInfo = await getVersioningInfo();

    // Insert the new prompt version
    await executeQuery(
      'INSERT INTO prompts (title, content, parent_prompt_id, change_type, version_number, lineage_root_id) VALUES (?, ?, ?, ?, ?, ?)',
      [title, content, versioningInfo.parentPromptId, versioningInfo.changeType, versioningInfo.versionNumber, versioningInfo.lineageRootId]
    );

    // For initial prompts, update lineage_root_id to reference itself
    if (versioningInfo.changeType === 'initial') {
      await updateInitialPromptLineage();
    }

    // Show success toast with version info
    const versionInfo = versioningInfo.changeType === 'initial' ? 'as initial version' : `as version ${versioningInfo.versionNumber}`;
    showToast(`Prompt saved successfully ${versionInfo}`, 'success');

  } catch (error) {
    console.error('Error saving prompt:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
    showToast(`Failed to save prompt: ${errorMessage}`, 'error');
    throw error;
  }
}

/**
 * Generate a title from prompt content
 */
function generatePromptTitle(content: string): string {
  const firstLine = content.split('\n')[0] || '';
  return firstLine.substring(0, 50) + (firstLine.length > 50 ? '...' : '');
}

/**
 * Get versioning information for a new prompt
 */
async function getVersioningInfo(): Promise<{
  changeType: string;
  versionNumber: number;
  parentPromptId: number | null;
  lineageRootId: number;
}> {
  // Get the latest prompt to determine versioning
  const latestPromptResponse = await executeQuery(
    'SELECT id, version_number, lineage_root_id FROM prompts ORDER BY created_at DESC LIMIT 1',
    undefined,
    'resultRows'
  );

  const latestPrompt = latestPromptResponse.result.resultRows?.[0];

  if (!latestPrompt) {
    // First prompt ever - create initial version
    return {
      changeType: 'initial',
      versionNumber: 1,
      parentPromptId: null,
      lineageRootId: 1, // Temporary, will be updated to actual id
    };
  } else {
    // Create next version in the lineage
    return {
      changeType: 'manual_edit',
      versionNumber: latestPrompt[1] + 1, // parent version_number + 1
      parentPromptId: latestPrompt[0], // parent id
      lineageRootId: latestPrompt[2], // same lineage_root_id as parent
    };
  }
}

/**
 * Update lineage_root_id for initial prompts
 */
async function updateInitialPromptLineage(): Promise<void> {
  const lastInsertResponse = await executeQuery('SELECT last_insert_rowid() as id', undefined, 'resultRows');
  const newPromptId = lastInsertResponse.result.resultRows?.[0]?.[0];

  if (newPromptId) {
    await executeQuery(
      'UPDATE prompts SET lineage_root_id = ? WHERE id = ?',
      [newPromptId, newPromptId]
    );
  }
}

/**
 * Load prompt history
 */
export async function loadPromptHistory(limit: number = 10): Promise<PromptHistoryItem[]> {
  try {
    const response = await executeQuery(
      'SELECT id, title, content, version_number, created_at FROM prompts ORDER BY created_at DESC LIMIT ?',
      [limit],
      'resultRows'
    );

    return (response.result.resultRows || []).map((row: any[]) => ({
      id: row[0],
      title: row[1] || 'Untitled',
      content: row[2] || '',
      versionNumber: row[3],
      createdAt: row[4]
    }));
  } catch (error) {
    console.error('Error loading prompt history:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
    showToast(`Failed to load prompt history: ${errorMessage}`, 'error');
    throw error;
  }
}

/**
 * Load a specific prompt by ID
 */
export async function loadPrompt(id: number): Promise<Prompt | null> {
  try {
    const response = await executeQuery(
      'SELECT id, title, content, version_number, created_at, parent_prompt_id, change_type, lineage_root_id FROM prompts WHERE id = ?',
      [id],
      'resultRows'
    );

    const row = response.result.resultRows?.[0];
    if (!row) return null;

    return {
      id: row[0],
      title: row[1],
      content: row[2],
      versionNumber: row[3],
      createdAt: row[4],
      parentPromptId: row[5],
      changeType: row[6],
      lineageRootId: row[7]
    };
  } catch (error) {
    console.error('Error loading prompt:', error);
    throw error;
  }
}