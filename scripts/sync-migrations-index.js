import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const migrationsDir = path.join(__dirname, '..', 'migrations');
const files = fs.readdirSync(migrationsDir)
  .filter(f => f.endsWith('.sql'))
  .sort();

fs.writeFileSync(path.join(migrationsDir, 'index.json'), JSON.stringify(files, null, 2));
console.log('Updated migrations/index.json with:', files);