# Prompt-Forge

Prompt-Forge is an open-source tool designed for researchers, penetration testers, and ethical hackers to iteratively modify, construct, and evolve prompt injection attacks. It leverages the structured techniques and taxonomies from the Arc PI Taxonomy to facilitate the development and testing of adversarial prompts against AI systems.

## Features

- **Interactive Prompt Builder**: Step-by-step construction of prompt injection attacks using categorized techniques (intents, methods, evasions).
- **Taxonomy Integration**: Built on the Arc PI Taxonomy for comprehensive coverage of attack vectors.
- **Iterative Evolution**: Tools to refine and mutate prompts based on feedback and testing results.
- **Ethical Use Only**: Intended solely for security research and defensive purposes.

## Project Architecture

Prompt-Forge runs entirely in the browser for security and portability. The architecture is modular:

- **UI Layer (`src/ui/`)**: Vanilla web interface built with TypeScript, HTML, and CSS using Vite for development tooling. Handles user interactions and renders the application.
- **Application Logic Layer (`src/app/`)**: Core functionality implemented in Go, compiled to WebAssembly (WASM). Tested exclusively using Go's testing framework.
- **Data Layer (`src/db/`)**: Local storage using SQLite WASM with Origin Private File System (OPFS) for persistence, ensuring data remains private and client-side.

This design allows developers to build and test features in Go WASM independently before integrating with the UI.

## Installation

[Add installation instructions here, e.g., clone the repo, install dependencies]

## Usage

[Add usage examples and commands]

## Attribution

This content/methodology is based on the [Arc PI Taxonomy](https://github.com/Arcanum-Sec/arc_pi_taxonomy/) created by Jason Haddix of [Arcanum Information Security](https://arcanum-sec.com/).

## License

[Specify the license for prompt-forge, e.g., MIT or whatever applies]