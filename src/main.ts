import { sqlite3Worker1Promiser, type Promiser } from '@sqlite.org/sqlite-wasm';

async function initDatabase(): Promise<Promiser> {
  try {
    console.log('Loading and initializing SQLite3 module...');

    const promiser = await new Promise<Promiser>((resolve) => {
      const _promiser = sqlite3Worker1Promiser({
        onready: () => resolve(_promiser),
      });
    });

    console.log('Done initializing. Running SQLite3 version', (await promiser('config-get', {})).result.version.libVersion);

    const openResponse = await promiser('open', {
      filename: 'file:prompt-forge-v0.1.0.db?vfs=opfs',
    });
    const { dbId } = openResponse;
    console.log(
      'OPFS is available, database connected at',
      openResponse.result.filename.replace(/^file:(.*?)\?vfs=opfs$/, '$1'),
    );

    // Get list of migrations
    const indexResponse = await fetch('/migrations/index.json');
    const migrationFiles: string[] = await indexResponse.json();

    // Get applied migrations
    let appliedMigrations: string[] = [];
    try {
      const appliedResponse = await promiser('exec', {
        sql: 'SELECT filename FROM migrations',
        dbId,
        returnValue: 'resultRows'
      });
      appliedMigrations = appliedResponse.result.resultRows?.map((row) => row[0]) || [];
    } catch (error) {
      // Migrations table doesn't exist yet, will be created by init
    }

    // Run pending migrations
    for (const filename of migrationFiles) {
      if (!appliedMigrations.includes(filename)) {
        console.log(`Applying migration: ${filename}`);
        const response = await fetch(`/migrations/${filename}`);
        const sql = await response.text();

        // Run migration and record in transaction
        await promiser('exec', { sql: 'BEGIN', dbId });
        try {
          await promiser('exec', { sql, dbId });
          await promiser('exec', {
            sql: 'INSERT INTO migrations (filename) VALUES (?)',
            dbId,
            bind: [filename]
          });
          await promiser('exec', { sql: 'COMMIT', dbId });
          console.log(`Migration applied: ${filename}`);
         } catch (error) {
           await promiser('exec', { sql: 'ROLLBACK', dbId });
           const errorMessage = error instanceof Error ? error.message : 'Unknown migration error';
           showToast(`Migration ${filename} failed: ${errorMessage}`, 'error');
           const wipe = confirm(`Migration ${filename} failed. Wipe database and reload?`);
           if (wipe) {
             // Wipe database by dropping all tables
             try {
               await promiser('exec', { sql: 'DROP TABLE IF EXISTS methodologies; DROP TABLE IF EXISTS prompts; DROP TABLE IF EXISTS migrations;', dbId });
               showToast('Database wiped, reloading...', 'warning');
             } catch (dropError) {
               console.error('Failed to drop tables:', dropError);
               showToast('Failed to wipe database', 'error');
             }
             location.reload();
           } else {
             console.error(`Migration ${filename} failed, continuing...`);
             showToast(`Continuing without migration ${filename}`, 'warning');
           }
         }
      }
    }

    console.log('Database initialized successfully');
    showToast('Database initialized successfully', 'success');
    return promiser;

  } catch (error) {
    console.error('Error initializing database:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
    showToast(`Database initialization failed: ${errorMessage}`, 'error');
    throw error;
  }
}

// Global database promiser
let dbPromiser: Promiser | null = null;

// Toast notification system
function showToast(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info', duration: number = 4000) {
  const toastContainer = document.getElementById('toast-container');
  if (!toastContainer) return;

  const toast = document.createElement('div');
  toast.className = `
    border border-border-primary p-3 rounded font-mono text-sm max-w-sm shadow-lg
    animate-in slide-in-from-right-2 fade-in duration-300
    ${type === 'success' ? 'bg-surface-secondary border-success text-success' :
      type === 'error' ? 'bg-surface-secondary border-error text-error' :
      type === 'warning' ? 'bg-surface-secondary border-warning text-warning' :
      'bg-surface-secondary border-info text-info'}
  `;

  // Add terminal-style prefix
  const prefix = type === 'success' ? '[OK]' :
                 type === 'error' ? '[ERROR]' :
                 type === 'warning' ? '[WARN]' : '[INFO]';

  toast.innerHTML = `
    <div class="flex items-start gap-2">
      <span class="text-text-muted">${prefix}</span>
      <span class="flex-1">${message}</span>
      <button class="text-text-muted hover:text-text-primary ml-2" onclick="this.parentElement.parentElement.remove()">×</button>
    </div>
  `;

  toastContainer.appendChild(toast);

  // Auto-remove after duration
  setTimeout(() => {
    if (toast.parentElement) {
      toast.classList.add('animate-out', 'slide-out-to-right-2', 'fade-out', 'duration-300');
      setTimeout(() => toast.remove(), 300);
    }
  }, duration);
}

// Wipe database functionality
async function wipeDatabase() {
  if (!dbPromiser) return;

  const confirmed = confirm('Are you sure you want to wipe the entire database? This action cannot be undone.');
  if (!confirmed) return;

  try {
    const openResponse = await dbPromiser('open', {
      filename: 'file:prompt-forge-v0.1.0.db?vfs=opfs',
    });
    const { dbId } = openResponse;

    // Drop all tables
    await dbPromiser('exec', { sql: 'DROP TABLE IF EXISTS methodologies; DROP TABLE IF EXISTS prompts; DROP TABLE IF EXISTS migrations;', dbId });
    showToast('Database wiped successfully, reloading...', 'warning');
    location.reload();
  } catch (error) {
    console.error('Error wiping database:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
    showToast(`Failed to wipe database: ${errorMessage}`, 'error');
  }
}

// Initialize database in background
initDatabase().then((promiser) => {
  dbPromiser = promiser;
  loadInitialData();
});

// Auto-resize textarea functionality
function autoResizeTextarea() {
  const textarea = document.getElementById('prompt-editor') as HTMLTextAreaElement;
  if (textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  }
}

// Character count functionality
function updateCharacterCount() {
  const textarea = document.getElementById('prompt-editor') as HTMLTextAreaElement;
  const characterCountElement = document.getElementById('character-count');
  if (textarea && characterCountElement) {
    const characters = textarea.value.length;
    characterCountElement.textContent = `${characters}`;
  }
}

// Copy functionality
function copyPrompt() {
  const textarea = document.getElementById('prompt-editor') as HTMLTextAreaElement;
  const copyButton = document.getElementById('copy-button');
  if (textarea && copyButton) {
    navigator.clipboard.writeText(textarea.value).then(() => {
      showToast('Prompt copied to clipboard', 'success');
      // Visual feedback - temporarily change button appearance
      const originalText = copyButton.innerHTML;
      copyButton.innerHTML = `
        <svg fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      `;
      setTimeout(() => {
        copyButton.innerHTML = originalText;
      }, 1000);
    }).catch(err => {
      console.error('Failed to copy text: ', err);
      showToast('Failed to copy prompt to clipboard', 'error');
    });
  }
}

// Save prompt functionality
async function savePrompt() {
  if (!dbPromiser) return;

  const textarea = document.getElementById('prompt-editor') as HTMLTextAreaElement;
  const saveButton = document.getElementById('save-button');

  if (!textarea || !saveButton || !textarea.value.trim()) {
    return; // Don't save empty prompts
  }

  try {
    // Generate a simple title from the first line or first 50 characters
    const content = textarea.value.trim();
    const firstLine = content.split('\n')[0] || '';
    const title = firstLine.substring(0, 50) + (firstLine.length > 50 ? '...' : '');

    // Get the latest prompt to determine versioning
    const latestPromptResponse = await dbPromiser('exec', {
      sql: 'SELECT id, version_number, lineage_root_id FROM prompts ORDER BY created_at DESC LIMIT 1',
      returnValue: 'resultRows'
    });

    const latestPrompt = latestPromptResponse.result.resultRows?.[0];

    let changeType: string;
    let versionNumber: number;
    let parentPromptId: number | null;
    let lineageRootId: number;

    if (!latestPrompt) {
      // First prompt ever - create initial version
      changeType = 'initial';
      versionNumber = 1;
      parentPromptId = null;
      lineageRootId = 1; // Temporary, will be updated to actual id
    } else {
      // Create next version in the lineage
      changeType = 'manual_edit';
      versionNumber = latestPrompt[1] + 1; // parent version_number + 1
      parentPromptId = latestPrompt[0]; // parent id
      lineageRootId = latestPrompt[2]; // same lineage_root_id as parent
    }

    // Insert the new prompt version
    await dbPromiser('exec', {
      sql: 'INSERT INTO prompts (title, content, parent_prompt_id, change_type, version_number, lineage_root_id) VALUES (?, ?, ?, ?, ?, ?)',
      bind: [title, content, parentPromptId, changeType, versionNumber, lineageRootId]
    });

    // For initial prompts, update lineage_root_id to reference itself
    if (changeType === 'initial') {
      const lastInsertResponse = await dbPromiser('exec', {
        sql: 'SELECT last_insert_rowid() as id',
        returnValue: 'resultRows'
      });

      const newPromptId = lastInsertResponse.result.resultRows?.[0]?.[0];

      if (newPromptId) {
        await dbPromiser('exec', {
          sql: 'UPDATE prompts SET lineage_root_id = ? WHERE id = ?',
          bind: [newPromptId, newPromptId]
        });
      }
    }

    // Show success toast with version info
    const versionInfo = changeType === 'initial' ? 'as initial version' : `as version ${versionNumber}`;
    showToast(`Prompt saved successfully ${versionInfo}`, 'success');

    // Visual feedback - temporarily change button appearance
    const originalText = saveButton.innerHTML;
    saveButton.innerHTML = `
      <svg fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
      </svg>
    `;
    setTimeout(() => {
      saveButton.innerHTML = originalText;
    }, 1000);

    // Refresh prompt history
    await loadPromptHistory();

  } catch (error) {
    console.error('Error saving prompt:', error);
    // Show error toast with details
    const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
    showToast(`Failed to save prompt: ${errorMessage}`, 'error');

    // Visual feedback for error
    const originalText = saveButton.innerHTML;
    saveButton.innerHTML = `
      <svg fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    `;
    setTimeout(() => {
      saveButton.innerHTML = originalText;
    }, 1000);
  }
}

// Load initial data from database
async function loadInitialData() {
  if (!dbPromiser) return;

  try {
    await loadMethodologyTypes();
    await loadPromptHistory();
  } catch (error) {
    console.error('Error loading initial data:', error);
  }
}

// Load methodologies by type
async function loadMethodologies(type: string) {
  if (!dbPromiser) return;

  try {
    const response = await dbPromiser('exec', {
      sql: 'SELECT id, name, description, path FROM methodologies WHERE type = ? ORDER BY name',
      bind: [type],
      returnValue: 'resultRows'
    });

    const methodologies = response.result.resultRows || [];
    updateMethodologyList(methodologies);
  } catch (error) {
    console.error('Error loading methodologies:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
    showToast(`Failed to load methodologies: ${errorMessage}`, 'error');
  }
}

// Load methodology types for dropdown
async function loadMethodologyTypes() {
  if (!dbPromiser) return;

  try {
    const response = await dbPromiser('exec', {
      sql: 'SELECT DISTINCT type FROM methodologies ORDER BY type',
      returnValue: 'resultRows'
    });

    const types = response.result.resultRows || [];
    const methodologySelect = document.getElementById('methodology-select') as HTMLSelectElement;
    if (!methodologySelect) return;

    methodologySelect.innerHTML = '';
    types.forEach((row: any[]) => {
      const type = row[0];
      if (type) {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type;
        methodologySelect.appendChild(option);
      }
    });

    // Load the first type if available
    if (types.length > 0) {
      loadMethodologies(types[0][0]);
    }
  } catch (error) {
    console.error('Error loading methodology types:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
    showToast(`Failed to load methodology types: ${errorMessage}`, 'error');
  }
}

// Load prompt history
async function loadPromptHistory() {
  if (!dbPromiser) return;

  try {
    const response = await dbPromiser('exec', {
      sql: 'SELECT id, title, content, version_number, created_at FROM prompts ORDER BY created_at DESC LIMIT 10',
      returnValue: 'resultRows'
    });

    const prompts = response.result.resultRows || [];
    updatePromptHistoryList(prompts);
  } catch (error) {
    console.error('Error loading prompt history:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
    showToast(`Failed to load prompt history: ${errorMessage}`, 'error');
  }
}

// Format relative timestamp
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

// Update methodology list in UI
function updateMethodologyList(methodologies: any[]) {
  const methodologyList = document.getElementById('taxonomy-list');
  if (!methodologyList) return;

  methodologyList.innerHTML = '';

  if (methodologies.length === 0) {
    methodologyList.innerHTML = '<div class="text-text-muted text-sm">No methodologies found</div>';
    return;
  }

  methodologies.forEach(methodology => {
    const item = document.createElement('div');
    item.className = 'border border-border-primary p-2 rounded cursor-pointer hover:bg-surface-secondary transition-colors';
    item.innerHTML = `
      <div class="text-text-primary text-sm font-medium">${methodology[1]}</div>
      <div class="text-text-muted text-xs mt-1">${methodology[2] || 'No description'}</div>
    `;
    item.addEventListener('click', () => {
      // TODO: Handle methodology selection
      console.log('Selected methodology:', methodology);
    });
    methodologyList.appendChild(item);
  });
}

// Update prompt history list in UI
function updatePromptHistoryList(prompts: any[]) {
  const promptHistory = document.getElementById('prompt-history');
  if (!promptHistory) return;

  promptHistory.innerHTML = '';

  if (prompts.length === 0) {
    promptHistory.innerHTML = '<div class="text-text-muted text-sm">No prompts found</div>';
    return;
  }

  prompts.forEach(prompt => {
    const item = document.createElement('div');
    item.className = 'border border-border-primary p-2 rounded cursor-pointer hover:bg-surface-secondary transition-colors';
    const title = prompt[1] || 'Untitled';
    const content = prompt[2] || '';
    const versionNumber = prompt[3];
    const createdAt = formatRelativeTime(prompt[4]);
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

// Add event listeners to textarea and other elements
document.addEventListener('DOMContentLoaded', () => {
  const textarea = document.getElementById('prompt-editor') as HTMLTextAreaElement;
  const copyButton = document.getElementById('copy-button');
  const saveButton = document.getElementById('save-button');
  const methodologySelect = document.getElementById('methodology-select') as HTMLSelectElement;
  const wipeDbButton = document.getElementById('wipe-db-button');

  if (textarea) {
    textarea.addEventListener('input', () => {
      updateCharacterCount();
      autoResizeTextarea();
    });
    // Initial setup
    updateCharacterCount();
    autoResizeTextarea();
  }

  if (copyButton) {
    copyButton.addEventListener('click', copyPrompt);
  }

  if (saveButton) {
    saveButton.addEventListener('click', savePrompt);
  }

  if (methodologySelect) {
    methodologySelect.addEventListener('change', () => {
      const type = methodologySelect.value;
      loadMethodologies(type);
    });
  }

  if (wipeDbButton) {
    wipeDbButton.addEventListener('click', wipeDatabase);
  }
});
