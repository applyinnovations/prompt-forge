# Agent Guidelines for Prompt Forge

## Build/Test Commands
- **Full build**: `npm run build` (Vite production build) - Use this to test builds
- **Dev server**: `npm run dev` (starts Vite dev server on port 5173) - ⚠️ NEVER RUN: runs indefinitely
- **Preview**: `npm run preview` (preview production build)
- **Sync migrations index**: `npm run sync-migrations-index` - Update migrations/index.json after adding/removing migration files
- **No tests configured**: Add test scripts to package.json when implementing tests

### Important Rules
- **Never run `npm run dev`** - It runs indefinitely and causes developer experience issues
- **Always use `npm run build`** to test that the site builds correctly

## Database Migrations

When modifying database schema or seeding data:

1. Create timestamped SQL file in `migrations/` (e.g., `20251110_014400_new_feature.sql`)
2. Write SQLite-compatible SQL without transaction statements
3. Run `npm run sync-migrations-index` to update the index
4. Test with `npm run build` - migrations auto-run on app load

## Code Style Guidelines

### TypeScript (src/)
- Use modern TypeScript with strict mode enabled
- Prefer `async/await` over Promises for async operations
- Use `const`/`let` appropriately, avoid `var`
- Handle errors with try-catch blocks and proper error typing
- Use ES6 imports with named imports preferred
- 2-space indentation, no semicolons
- Use TailwindCSS for styling, follow utility-first approach
- Keep components modular and under 100 lines

### General
- Use descriptive variable/function names in camelCase
- Add JSDoc/TSDoc comments for public APIs and complex logic
- Follow modular architecture: UI and application logic with SQLite WASM data layer
- Test SQLite WASM functionality in browser environment
- Use custom CSS variables for terminal color theme