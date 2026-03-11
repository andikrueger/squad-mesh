# Lenny — History

## Project Context

- **Project:** squad-architecture / squad-mesh (formerly squad-holacracy)
- **Owner:** Project Owner
- **Stack:** TypeScript, Node.js ≥ 20, filesystem-based state, Squad SDK extension
- **Package:** `squad-mesh` at `packages/squad-mesh/` (v0.1.0)
- **Description:** Multi-squad coordination mesh — discover, steer, monitor, and share knowledge across Squad instances. Local-first, AI-native, non-destructive.

## Core Context

- 6 subsystems: Discovery, Status/COP, Steering, Knowledge, Coordinator, Builders
- 11 source files in `packages/squad-mesh/src/`
- 49 integration tests passing
- All state persists as JSON in `.meta-squad/` directories, git-trackable
- Error class: `MeshValidationError` (renamed from HolacracyValidationError)
- CLI binary: `squad-meta` with discover/status/help commands

## Learnings

(append new learnings below this line)
