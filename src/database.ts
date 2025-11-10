import { sqlite3Worker1Promiser, type Promiser } from '@sqlite.org/sqlite-wasm';

// Global database promiser and ID - kept internal to this module
let dbPromiser: Promiser | null = null;
let dbId: string | null = null;

export interface DatabaseConfig {
  filename: string;
  migrationsIndexUrl: string;
}

export interface MigrationResult {
  success: boolean;
  appliedMigrations: string[];
  failedMigrations: string[];
}

export interface DatabaseConnection {
  promiser: Promiser;
  dbId: string;
}

/**
 * Initialize the database with SQLite WASM and run migrations
 */
export async function initDatabase(config: DatabaseConfig = {
  filename: 'file:prompt-forge-v0.1.0.db?vfs=opfs',
  migrationsIndexUrl: '/migrations/index.json'
}): Promise<DatabaseConnection> {
  try {
    console.log('Loading and initializing SQLite3 module...');

    const promiser = await new Promise<Promiser>((resolve) => {
      const _promiser = sqlite3Worker1Promiser({
        onready: () => resolve(_promiser),
      });
    });

    console.log('Done initializing. Running SQLite3 version', (await promiser('config-get', {})).result.version.libVersion);

    const openResponse = await promiser('open', {
      filename: config.filename,
    });
    const currentDbId = openResponse.dbId;
    if (!currentDbId) {
      throw new Error('Failed to get database ID from open response');
    }
    console.log(
      'OPFS is available, database connected at',
      openResponse.result.filename.replace(/^file:(.*?)\?vfs=opfs$/, '$1'),
    );

    // Store the promiser and dbId globally for use by other functions
    dbPromiser = promiser;
    dbId = currentDbId;

    // Run migrations
    const migrationResult = await runMigrations(promiser, currentDbId, config.migrationsIndexUrl);

    if (!migrationResult.success) {
      console.warn('Some migrations failed:', migrationResult.failedMigrations);
    }

    console.log('Database initialized successfully');
    return { promiser, dbId };

  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

/**
 * Run database migrations
 */
async function runMigrations(promiser: Promiser, dbId: string, migrationsIndexUrl: string): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: true,
    appliedMigrations: [],
    failedMigrations: []
  };

  try {
    // Get list of migrations
    const indexResponse = await fetch(migrationsIndexUrl);
    const migrationFiles: string[] = await indexResponse.json();

    // Sort migrations by timestamp to ensure they run in chronological order
    migrationFiles.sort((a, b) => {
      const timestampA = a.match(/^(\d{8}_\d{6})/)?.[1] || '';
      const timestampB = b.match(/^(\d{8}_\d{6})/)?.[1] || '';
      return timestampA.localeCompare(timestampB);
    });

    // Get applied migrations
    let appliedMigrations: string[] = [];
    try {
      const appliedResponse = await promiser('exec', {
        sql: 'SELECT filename FROM migrations',
        dbId: dbId as string,
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
        await promiser('exec', { sql: 'BEGIN', dbId: dbId as string });
        try {
          await promiser('exec', { sql, dbId: dbId as string });
          await promiser('exec', {
            sql: 'INSERT INTO migrations (filename) VALUES (?)',
            dbId: dbId as string,
            bind: [filename]
          });
          await promiser('exec', { sql: 'COMMIT', dbId: dbId as string });
          console.log(`Migration applied: ${filename}`);
          result.appliedMigrations.push(filename);
        } catch (error) {
          await promiser('exec', { sql: 'ROLLBACK', dbId });
          const errorMessage = error instanceof Error ? error.message : 'Unknown migration error';
          console.error(`Migration ${filename} failed: ${errorMessage}`);
          result.failedMigrations.push(filename);
          result.success = false;

          // Handle migration failure - ask user what to do
          const wipe = confirm(`Migration ${filename} failed: ${errorMessage}. Wipe database and reload?`);
          if (wipe) {
            await wipeDatabaseInternal();
            location.reload();
            return result; // Exit early on wipe
          } else {
            console.error(`Migration ${filename} failed, continuing...`);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error running migrations:', error);
    result.success = false;
  }

  return result;
}

/**
 * Get the current database promiser
 */
export function getDatabasePromiser(): Promiser | null {
  return dbPromiser;
}

/**
 * Execute a database query
 */
export async function executeQuery(sql: string, bind?: any[], returnValue?: string): Promise<any> {
  if (!dbPromiser || !dbId) {
    throw new Error('Database not initialized');
  }

  return await dbPromiser('exec', {
    sql,
    dbId: dbId,
    bind,
    returnValue
  });
}

/**
 * Wipe the entire database
 */
export async function wipeDatabase(): Promise<void> {
  if (!dbPromiser) {
    throw new Error('Database not initialized');
  }

  const confirmed = confirm('Are you sure you want to wipe the entire database? This action cannot be undone.');
  if (!confirmed) return;

  await wipeDatabaseInternal();
}

/**
 * Internal database wiping function
 */
async function wipeDatabaseInternal(): Promise<void> {
  if (!dbPromiser) return;

  try {
    const openResponse = await dbPromiser('open', {
      filename: 'file:prompt-forge-v0.1.0.db?vfs=opfs',
    });
    const dbId = openResponse.dbId;
    if (!dbId) {
      throw new Error('Failed to get database ID');
    }

    // Drop all tables
    await dbPromiser('exec', { sql: 'DROP TABLE IF EXISTS methodologies; DROP TABLE IF EXISTS prompts; DROP TABLE IF EXISTS ai_providers; DROP TABLE IF EXISTS migrations;', dbId: dbId as string });
    console.log('Database wiped successfully');
  } catch (error) {
    console.error('Error wiping database:', error);
    throw error;
  }
}