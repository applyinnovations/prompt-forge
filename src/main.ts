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

// Copy functionality
function copyPrompt() {
  const textarea = document.getElementById('prompt-editor') as HTMLTextAreaElement;
  const copyButton = document.getElementById('copy-button');
  if (textarea && copyButton) {
    navigator.clipboard.writeText(textarea.value).then(() => {
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
    });
  }
}

// Add event listeners to textarea
document.addEventListener('DOMContentLoaded', () => {
  const textarea = document.getElementById('prompt-editor') as HTMLTextAreaElement;
  const copyButton = document.getElementById('copy-button');

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
});
