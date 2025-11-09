# Prompt-Forge

Prompt-Forge is an open-source tool designed for researchers, penetration testers, and ethical hackers to iteratively modify, construct, and evolve prompt injection attacks. It leverages the structured techniques and taxonomies from the Arc PI Taxonomy to facilitate the development and testing of adversarial prompts against AI systems.

## Features

- **Interactive Prompt Builder**: Step-by-step construction of prompt injection attacks using categorized techniques (intents, methods, evasions).
- **Taxonomy Integration**: Built on the Arc PI Taxonomy for comprehensive coverage of attack vectors.
- **Iterative Evolution**: Tools to refine and mutate prompts based on feedback and testing results.
- **Ethical Use Only**: Intended solely for security research and defensive purposes.

## Project Architecture

Prompt-Forge runs entirely in the browser for security and portability. The architecture is modular:

- **UI Layer**: Vanilla web interface built with TypeScript, HTML, and CSS using Vite for development tooling. Handles user interactions and renders the application.
- **Application Logic Layer**: Core functionality implemented in JavaScript using SQLite WASM for database operations.
- **Data Layer**: SQLite database with Origin Private File System (OPFS) for persistent local storage in the browser.

This design ensures all logic runs client-side with no server dependencies.

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

## Usage

- Run `npm run dev` to start the development server.
- The UI provides a basic interface for now; future features will include prompt builder, taxonomy viewer, and attack simulator.
- All data is stored locally in the browser using SQLite with OPFS for persistence.

## Attribution

This content/methodology is based on the [Arc PI Taxonomy](https://github.com/Arcanum-Sec/arc_pi_taxonomy/) created by Jason Haddix of [Arcanum Information Security](https://arcanum-sec.com/).

## License

MIT