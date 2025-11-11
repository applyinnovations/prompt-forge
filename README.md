# Prompt Forge

<p align="center">
  <img src="images/demo.gif" alt="Prompt Forge Demo" />
</p>

Prompt Forge is an open-source tool designed for researchers, penetration testers, and ethical hackers to iteratively modify, construct, and evolve prompt injection attacks. It leverages the structured techniques and taxonomies from the [Arc PI Taxonomy](https://github.com/Arcanum-Sec/arc_pi_taxonomy/) to facilitate the development and testing of adversarial prompts against AI systems.

## Features

- **Interactive Prompt Builder**: Real-time prompt editing with auto-resizing textarea, character counting, and keyboard shortcuts (Ctrl+Enter to save).
- **Taxonomy Integration**: Built on the Arc PI Taxonomy with categorized attack techniques, intents, methods, and evasions loaded from a comprehensive database.
- **AI-Powered Methodology Application**: Apply predefined or custom methodologies using OpenAI, Anthropic, or XAI models to evolve prompts intelligently.
- **Prompt Versioning & Lineage Tracking**: Automatic versioning system with lineage tracking, allowing you to see the evolution of your prompts over time.
- **Local Encrypted Storage**: All data stored locally using SQLite WASM with OPFS, credentials are encrypted using AES-256 with the in-memory key provided at login.
- **Model Selection**: Choose from multiple AI providers and models for methodology application.
- **Prompt History**: Browse and restore previous prompt versions with detailed metadata.
- **Ethical Use Only**: Intended solely for security research and defensive purposes.

## Database Migrations

Prompt Forge uses a migration system to manage database schema and data changes. Migrations are SQL files in the `migrations/` directory, executed in alphabetical order on app startup.

### Writing a Migration

1. Create a new SQL file in `migrations/` with timestamp naming: `YYYYMMDD_HHMMSS_description.sql`
2. Write valid SQLite SQL statements (CREATE, ALTER, INSERT, etc.)
3. Do not include `BEGIN TRANSACTION;` or `COMMIT;` - the system handles transactions
4. Run `npm run sync-migrations-index` to update the index
5. Test the migration by running the development server and loading the app in your browser

Example migration file (`20251110_014400_init.sql`):
```sql
-- Create tables
CREATE TABLE methodologies (...);
-- Add indexes
CREATE INDEX ...;
```

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/applyinnovations/prompt-forge.git
   cd prompt-forge
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
    ```bash
    npm run dev
    ```

    The application will be available at `http://localhost:5173/`.

## Available Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build for production
- `npm run preview` - Preview the production build locally

## Usage

1. **Setup**: Run `npm install` to install dependencies, then `npm run dev` to start the development server at `http://localhost:5173`.

2. **First Time Setup**:
   - The app will prompt for an encryption key to secure your API credentials
   - Configure API keys for AI providers (OpenAI, Anthropic, XAI) in the settings

3. **Creating Prompts**:
   - Enter your base prompt in the main textarea
   - Use Ctrl+Enter to save versions automatically
   - View prompt history and lineage in the sidebar

4. **Applying Methodologies**:
   - Select a methodology type from the dropdown (attack_intents, attack_techniques, etc.)
   - Click on any methodology to apply it to your current prompt using AI
   - Or enter a custom methodology in the custom editor and apply it

5. **Model Selection**:
   - Choose your preferred AI model from the model selector
   - The app remembers your last used model per provider

6. **Data Management**:
   - All data is stored locally in the browser using SQLite WASM
   - API credentials are encrypted using the key provided on page load
   - Use the wipe database option in the loading screen to reset all data

## Attribution

This content/methodology is based on the [Arc PI Taxonomy](https://github.com/Arcanum-Sec/arc_pi_taxonomy/) created by Jason Haddix of [Arcanum Information Security](https://arcanum-sec.com/).

## License

MIT