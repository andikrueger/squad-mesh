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

### 2025-07-16: PowerShell sync-mesh.ps1

- **Built:** `distributed-mesh/sync-mesh.ps1` — direct functional port of `sync-mesh.sh` for Windows/cross-platform PowerShell.
- **Key translations:** `curl` → `Invoke-WebRequest` with splatting; `$LASTEXITCODE` checks for git non-fatal failures (native commands don't throw in PS 5.1); `UseBasicParsing` for PS 5.1 compat; backtick-escaped quotes for yq expressions.
- **Design choice:** Used `$LASTEXITCODE` pattern for git (Zone 2) instead of try/catch since native command errors don't respect `$ErrorActionPreference` in PS 5.1. Used try/catch for `Invoke-WebRequest` (Zone 3) since it's a cmdlet that does throw.
- **Compatibility:** Works in PS 5.1+ (Windows PowerShell) and PS 7+ (cross-platform). `param()` block first, then `$ErrorActionPreference = "Stop"`.
- **44 lines** total including header comments and blank lines.

### 2025-07-16: YAML→JSON config migration (yq elimination)

- **Switched** mesh config from YAML (`mesh.yaml`) to JSON (`mesh.json`). Motivation: eliminate `yq` dependency, which is uncommon and requires manual install.
- **Bash (`sync-mesh.sh`):** Replaced all `yq` calls with `jq -r`. Identical query syntax (`to_entries[]`, `select`, `//` default operator). `jq` is pre-installed on macOS, most Linux distros, and GitHub Actions runners.
- **PowerShell (`sync-mesh.ps1`):** Removed ALL external tool dependencies. Native `ConvertFrom-Json` parses JSON; `PSObject.Properties` + `Where-Object` replaces yq filtering. Now requires only `git` — the big win.
- **Key pattern:** `$config.squads.PSObject.Properties | Where-Object { $_.Value.zone -eq "..." }` replaces yq iteration. Property access via `$entry.Value.source` instead of yq string interpolation with backtick-escaped quotes.
- **Deleted** `mesh.yaml.example`, created `mesh.json.example` with identical data.
- **Updated** README.md and verified SKILL.md — zero remaining `yq` or `mesh.yaml` references.
- **47 lines** (PS1) and **46 lines** (sh) including headers and blanks.
