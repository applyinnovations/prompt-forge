import { initDatabase } from './database.js';
import { showToast } from './toast.js';
import { initUI, loadAndUpdatePromptHistory, initMethodologyUI, updatePredictiveSaveInfo, loadAndUpdateModelSelector } from './ui.js';
import { setEncryptionKey } from './api-key-service.js';





/**
 * Enable key entry in loading screen
 */
function showKeyEntry(): Promise<void> {
  return new Promise((resolve) => {
    // Update status text
    const statusText = document.getElementById('status-text');
    if (statusText) {
      statusText.textContent = 'Ready to unlock';
    }

    // Enable the input and button
    const input = document.getElementById('startup-encryption-key') as HTMLInputElement;
    const wipeButton = document.getElementById('wipe-db-startup-button') as HTMLButtonElement;

    if (input) {
      input.disabled = false;
      input.focus();
    }

    if (wipeButton) {
      wipeButton.disabled = false;
    }

    // Handle Enter key on input
    if (input) {
      input.addEventListener('keypress', async (e) => {
        if (e.key === 'Enter') {
          const key = input.value.trim();
          if (key) {
            setEncryptionKey(key);
            hideLoadingScreen();
            // Show the main application and header
            const mainApp = document.getElementById('main-app');
            const mainHeader = document.getElementById('main-header');
            if (mainApp) {
              mainApp.classList.remove('hidden');
            }
            if (mainHeader) {
              mainHeader.classList.remove('hidden');
            }
            resolve();
          }
        }
      });
    }

    // Handle wipe button
    if (wipeButton) {
      wipeButton.addEventListener('click', async () => {
        if (confirm('Are you sure you want to wipe the entire database? This will permanently delete all your data and cannot be undone.')) {
          try {
            // Import and call wipeDatabase (it has its own confirmation)
            const { wipeDatabase } = await import('./database.js');
            await wipeDatabase();
            hideLoadingScreen();
            // Show the main application and header (no key needed after wipe)
            const mainApp = document.getElementById('main-app');
            const mainHeader = document.getElementById('main-header');
            if (mainApp) {
              mainApp.classList.remove('hidden');
            }
            if (mainHeader) {
              mainHeader.classList.remove('hidden');
            }
            // Reload the page to start fresh
            location.reload();
          } catch (error) {
            showToast('Failed to wipe database', 'error');
          }
        }
      });
    }
  });
}

/**
 * Hide loading screen
 */
function hideLoadingScreen(): void {
  const loadingModal = document.getElementById('loading-modal');
  if (loadingModal) {
    document.body.removeChild(loadingModal);
  }
}

/**
 * Initialize the application
 */
async function initApp(): Promise<void> {
  try {
    // Initialize database and run migrations
    await initDatabase();

    // Show success message
    showToast('Database initialized successfully', 'success');

    // Transition to key entry
    await showKeyEntry();

    // Load initial data (encryption key is now set)
    await loadInitialData();

  } catch (error) {
    // Hide loading screen on error
    hideLoadingScreen();

    console.error('Error initializing app:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown initialization error';
    showToast(`Application initialization failed: ${errorMessage}`, 'error');
  }
}

/**
 * Load initial application data
 */
async function loadInitialData(): Promise<void> {
  try {
    // Encryption key is already set, load models
    await loadAndUpdateModelSelector();

    // Initialize methodology UI
    await initMethodologyUI();

    // Load prompt history
    await loadAndUpdatePromptHistory();

    // Initialize predictive save info
    await updatePredictiveSaveInfo();
  } catch (error) {
    console.error('Error loading initial data:', error);
  }
}

// Initialize UI components
initUI();

// Initialize the application
initApp();