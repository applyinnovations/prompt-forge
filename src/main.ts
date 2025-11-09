import { sqlite3Worker1Promiser } from '@sqlite.org/sqlite-wasm';

async function init() {
  try {
    console.log('Loading and initializing SQLite3 module...');

    const promiser = await new Promise<any>((resolve) => {
      const _promiser = sqlite3Worker1Promiser({
        onready: () => resolve(_promiser),
      });
    });

    console.log('Done initializing. Running demo...');

    const configResponse = await promiser('config-get', {});
    console.log('Running SQLite3 version', configResponse.result.version.libVersion);

    const openResponse = await promiser('open', {
      filename: 'file:prompt-forge.db?vfs=opfs',
    });
    const { dbId } = openResponse;
    console.log(
      'OPFS is available, created persisted database at',
      openResponse.result.filename.replace(/^file:(.*?)\?vfs=opfs$/, '$1'),
    );

    // Create tables
    await promiser('exec', {
      dbId,
      sql: `
        CREATE TABLE IF NOT EXISTS techniques (
          id INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          category TEXT NOT NULL,
          description TEXT
        );

        CREATE TABLE IF NOT EXISTS prompts (
          id INTEGER PRIMARY KEY,
          technique_id INTEGER,
          content TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (technique_id) REFERENCES techniques(id)
        );
      `,
    });

    // Update UI
    const status = document.getElementById('status');
    if (status) {
      status.innerHTML = '<p>Application loaded successfully!</p>';
    }

    // Example usage
    console.log('Prompt-Forge initialized with SQLite WASM');

    // Add a sample technique
    const addResult = await promiser('exec', {
      dbId,
      sql: "INSERT INTO techniques (name, category, description) VALUES (?, ?, ?)",
      bind: ['Base64 Encoding', 'evasion', 'Encode prompts using Base64 to bypass filters'],
    });
    console.log('Add technique result:', addResult);

    // Get techniques
    const getResult = await promiser('exec', {
      dbId,
      sql: "SELECT id, name, category, description FROM techniques",
      returnValue: 'resultRows',
    });
    console.log('Techniques:', getResult.result);

  } catch (error) {
    console.error('Error loading application:', error);
    const status = document.getElementById('status');
    if (status) {
      status.innerHTML = '<p>Error loading application: ' + (error as Error).message + '</p>';
    }
  }
}

init();