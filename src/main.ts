import { initDatabase } from './database.js';
import { showToast } from './toast.js';
import { initUI, loadAndUpdatePromptHistory, initMethodologyUI } from './ui.js';

/**
 * Initialize the application
 */
async function initApp(): Promise<void> {
  try {
    // Initialize database and run migrations
    await initDatabase();

    // Show success message
    showToast('Database initialized successfully', 'success');

    // Load initial data
    await loadInitialData();

  } catch (error) {
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
    // Initialize methodology UI
    await initMethodologyUI();

    // Load prompt history
    await loadAndUpdatePromptHistory();
  } catch (error) {
    console.error('Error loading initial data:', error);
  }
}

// Initialize UI components
initUI();

// Initialize the application
initApp();