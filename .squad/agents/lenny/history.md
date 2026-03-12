# Lenny — History

## Project Context

- **Project:** squad-architecture / squad-mesh (formerly squad-holacracy)
- **Owner:** Project Owner
- **Stack:** TypeScript, Node.js ≥ 20, filesystem-based state, Squad SDK extension
- **Package:** `squad-mesh` at `packages/squad-mesh/` (v0.1.0)
- **CLI binary:** `squad-mesh` (supports init/discover/status/health/help)
- **Description:** Multi-squad coordination mesh — discover, steer, monitor, and share knowledge across Squad instances. Local-first, AI-native, non-destructive.

## Core Context

- 6 subsystems: Discovery, Status/COP, Steering, Knowledge, Coordinator, Builders
- 11 source files in `packages/squad-mesh/src/`
- 49 integration tests passing
- All state persists as JSON in `.meta-squad/` directories, git-trackable
- Error class: `MeshValidationError` (renamed from HolacracyValidationError)
- CLI commands exported as `MESH_COMMANDS` constant

## Learnings

### 2025-01-29: CLI Binary Naming & Init Command

- **Fixed naming inconsistency**: Package name (`squad-mesh`) must match bin name. Changed from `squad-meta` → `squad-mesh` across all CLI code and docs.
- **Wired up `init` command**: Added handler that calls `initMetaSquadDir()` + `generateConfigTemplate()` to create `.meta-squad/` structure and starter config.
- **Key files**: Main CLI logic in `src/cli/main.ts`, command specs in `src/cli/index.ts`, conventions in `src/conventions.ts`.
- **Pattern**: CLI commands defined in `MESH_COMMANDS` array, handlers in switch statement in main(). SDK integration via `registerCommands()`.
- **Argument parsing**: Supports both `squad-mesh discover` and `squad mesh discover` (strips `meta`/`mesh` prefix).
- **User preference**: Andreas expects `npx squad-mesh init` to work out of the box, creating directory structure and config template.

(append new learnings below this line)
