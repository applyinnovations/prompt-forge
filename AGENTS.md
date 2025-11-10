# Agent Guidelines for Prompt-Forge

## Build/Test Commands
- **Full build**: `npm run build` (Vite production build)
- **Dev server**: `npm run dev` (starts Vite dev server on port 5173)
- **Preview**: `npm run preview` (preview production build)
- **No tests configured**: Add test scripts to package.json when implementing tests

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