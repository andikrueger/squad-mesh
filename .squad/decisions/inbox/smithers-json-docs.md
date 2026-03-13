# Decision: Distributed Mesh Config Format — YAML → JSON (Docs)

**Author:** Smithers (Platform Engineer)
**Date:** 2025-07-18
**Status:** Implemented (docs only — script changes by Lenny in parallel)

## What Changed

All distributed-mesh documentation updated to reflect the config format switch from YAML to JSON.

### Files Modified

1. `distributed-mesh/README.md` — 9 edits across prerequisites, configuration, setup guide, cross-org setup, Windows support, files table, phased rollout, and "What We're NOT Building" sections.
2. `distributed-mesh/SKILL.md` — 4 edits: config section header + example, phased rollout, mesh state repo reference, anti-patterns.
3. `.squad/skills/distributed-mesh/SKILL.md` — identical 4 edits (must mirror source copy).

### Specific Changes

| Before | After |
|--------|-------|
| `mesh.yaml` / `mesh.yaml.example` | `mesh.json` / `mesh.json.example` |
| `yq` dependency (all scripts) | `jq` (bash only); PowerShell has zero external deps |
| `-MeshYaml` parameter | `-MeshJson` parameter |
| YAML inline config examples | JSON inline config examples |
| "One YAML file lists..." | "One JSON file lists..." |
| Single script reference | Both `sync-mesh.sh` and `sync-mesh.ps1` referenced |

### Why JSON

- `jq` is more ubiquitous than `yq` in CI environments
- PowerShell parses JSON natively (`ConvertFrom-Json`) — eliminates external dependency entirely
- JSON is the lingua franca of tooling configs in this ecosystem

### What Did NOT Change

- Architecture content, zone descriptions, trust model
- Anti-pattern list (content unchanged, only filename references updated)
- Agent lifecycle, write partitioning, phased rollout strategy
- No new sections added, no sections removed
