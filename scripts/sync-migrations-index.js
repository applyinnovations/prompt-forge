const fs = require('fs');
const path = require('path');

const migrationsDir = path.join(__dirname, '..', 'migrations');
const files = fs.readdirSync(migrationsDir)
  .filter(f => f.endsWith('.sql'))
  .sort();

fs.writeFileSync(path.join(migrationsDir, 'index.json'), JSON.stringify(files, null, 2));
console.log('Updated migrations/index.json with:', files);