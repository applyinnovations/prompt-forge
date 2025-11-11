# Agent Guidelines for Prompt Forge

## Build/Test Commands
- **Type check**: `npm run typecheck` (TypeScript compilation check) - Use this to verify code compiles without errors
- **Full build**: `npm run build` (Vite production build) - Use this to test complete builds and deployment readiness
- **Dev server**: `npm run dev` (starts Vite dev server on port 5173) - ⚠️ NEVER RUN: runs indefinitely
- **Preview**: `npm run preview` (preview production build)
- **Sync migrations index**: `npm run sync-migrations-index` - Update migrations/index.json after adding/removing migration files
- **Type checking**: `npm run typecheck` - Run TypeScript compiler to check for type errors

### Important Rules
- **Always run `npm run typecheck`** after making TypeScript changes to ensure code compiles correctly
- **Use `npm run build`** to test that the site builds correctly for production deployment
- **NEVER MODIFY EXISTING MIGRATIONS** - Migration files are immutable once created. Create new migration files for any schema changes
- **Test database changes** with `npm run build` - Migrations run automatically on app initialization

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

## Icon Usage
- **Use Heroicons**: Copy SVG code directly from [Heroicons](https://heroicons.com) into the HTML
- **Consistent styling**: Use `fill="none"`, `viewBox="0 0 24 24"`, `stroke-width="1.5"`, `stroke="currentColor"`, and `class="w-5 h-5"`
- **Avoid external dependencies**: Never use icon libraries or CDNs - copy the SVG markup directly
- **Semantic icons**: Choose icons that clearly represent their function (e.g., save icon for saving, copy icon for copying)