# Session Log

---
## Session: CLI Naming Fix — squad-meta → squad-mesh
**Date:** 2025-07-25  
**Trigger:** User ran `npx squad-meta init` from C:\dev and got "Unknown command: init"

### What happened
- Diagnosed two bugs: (1) bin field in package.json still says `squad-meta` instead of `squad-mesh`, (2) `init` command defined in specs but never wired into main.ts switch
- Lenny assigned to fix all `squad-meta` → `squad-mesh` references across package.json, main.ts, cli/index.ts, README.md
- Lenny also wiring up the missing `init` command handler in main.ts

### Decisions
- Rename `META_SQUAD_COMMANDS` → `MESH_COMMANDS` for consistency
- Keep `.meta-squad/` directory name unchanged (it's the concept name, not the package name)
- Command prefix changing from `meta ` to `mesh ` in SDK integration mode

### Files touched
- packages/squad-mesh/package.json (bin field)
- packages/squad-mesh/src/cli/main.ts (init handler + rename)
- packages/squad-mesh/src/cli/index.ts (command names + constant rename)
- packages/squad-mesh/README.md (CLI examples)
