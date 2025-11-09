import { sqlite3Worker1Promiser } from '@sqlite.org/sqlite-wasm';

async function init() {
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

    // Update UI
    const status = document.getElementById('status');
    if (status) {
      status.innerHTML = '<p>Application loaded successfully! Database connected.</p>';
    }

    // TODO: Add application logic here

  } catch (error) {
    console.error('Error loading application:', error);
    const status = document.getElementById('status');
    if (status) {
      status.innerHTML = '<p>Error loading application: ' + (error as Error).message + '</p>';
    }
  }
}

init();