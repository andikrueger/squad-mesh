# Decision: Switch mesh config from YAML to JSON

**Author:** Lenny (Core Developer)
**Date:** 2025-07-16
**Status:** Implemented
**Triggered by:** User questioned why `yq` is required when native options exist

## Context

Both sync scripts (`sync-mesh.sh`, `sync-mesh.ps1`) used `yq` to parse `mesh.yaml`. `yq` is an uncommon tool that requires manual installation on most systems, creating an unnecessary dependency barrier.

## Decision

Switch the mesh configuration format from YAML to JSON and rewrite both sync scripts accordingly.

- **Bash script:** Replace `yq` with `jq`. The query syntax is identical (`to_entries[]`, `select()`, `//` default operator). `jq` ships pre-installed on macOS, most Linux distros, and all GitHub Actions runners.
- **PowerShell script:** Remove ALL external tool dependencies. PowerShell's native `ConvertFrom-Json` (available since PS 3.0) handles JSON parsing. `PSObject.Properties` iteration replaces `yq` filtering.

## What Changed

| File | Change |
|------|--------|
| `mesh.json.example` | **Created** — JSON equivalent of the old YAML config, same 3 zones, same example squads |
| `mesh.yaml.example` | **Deleted** — replaced by mesh.json.example |
| `sync-mesh.sh` | **Rewritten** — `yq` → `jq -r`, config default `mesh.json`, same structure and error handling |
| `sync-mesh.ps1` | **Rewritten** — `yq` → native `ConvertFrom-Json`, config default `mesh.json`, zero external deps |
| `README.md` | **Updated** — all YAML/yq references replaced with JSON/jq equivalents |

## Dependency Impact

| Script | Before | After |
|--------|--------|-------|
| `sync-mesh.sh` | yq, git, curl | **jq**, git, curl |
| `sync-mesh.ps1` | yq, git | **git** (only!) |

The PowerShell script now has zero external dependencies beyond git — the biggest win. `jq` for bash is a pragmatic improvement: far more ubiquitous than `yq`, pre-installed in most environments users already run the script in.

## Alternatives Considered

- **Keep YAML, keep yq:** Status quo. Rejected — unnecessary install friction.
- **Use Python/Node for parsing:** Heavier runtime dependency, overkill for a ~40-line sync script.
- **Bash-only JSON parsing (no jq):** Fragile regex-based parsing. Not worth the brittleness.
