# squad-mesh

Multi-squad orchestration extension for GitHub Copilot

## Overview

squad-mesh is a TypeScript MCP (Model Context Protocol) extension that enables GitHub Copilot to discover and coordinate multiple development squads within a project. It implements a mesh-based coordination model inspired by graph theory and organizational design patterns, allowing squads to interact, share context, and collaborate effectively through Copilot.

The extension provides a structured way to represent squad dependencies, capabilities, and state—treating the squad network as a graph where nodes represent teams and edges represent coordination relationships.

## Repository Structure

- **`packages/squad-mesh/`** — The core extension package containing the MCP server implementation. See `packages/squad-mesh/README.md` for detailed documentation, API reference, and development guide.

- **`.squad/`** — AI development team state and collaboration artifacts. Used by team members working with Copilot to maintain squad context and coordination metadata.

- **`architecture-review/`** — Design history, architectural decisions, and evolution summary of the squad-mesh system.

## Quick Start

```bash
cd packages/squad-mesh
npm install
npm run build
npm test
```

## License

MIT

See [LICENSE](./LICENSE) for details.
