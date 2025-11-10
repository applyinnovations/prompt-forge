import { sqlite3Worker1Promiser } from '@sqlite.org/sqlite-wasm';

async function initDatabase() {
  try {
    console.log('Loading and initializing SQLite3 module...');

    const promiser = await new Promise<any>((resolve) => {
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

    console.log('Database initialized successfully');

  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

// Initialize database in background
initDatabase();

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

// Add event listeners to textarea
document.addEventListener('DOMContentLoaded', () => {
  const textarea = document.getElementById('prompt-editor') as HTMLTextAreaElement;
  if (textarea) {
    textarea.addEventListener('input', () => {
      updateCharacterCount();
      autoResizeTextarea();
    });
    // Initial setup
    updateCharacterCount();
    autoResizeTextarea();
  }
});
