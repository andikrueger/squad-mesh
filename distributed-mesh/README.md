# Distributed Squad Mesh — The Definitive Guide

> **Status:** Settled architecture. Reviewed across three model families (Opus 4.6, Sonnet 4.5, GPT-5.4) and three analytical perspectives (architect, systems engineer, adversarial critic). All converge on the same answer.

## The Problem

Squads on the same machine coordinate through shared files. `cat ../squad-b/SUMMARY.md` works because the file is on your disk. When Squad A is on Alice's laptop and Squad B is on Bob's CI server, that path doesn't exist. The file is real — it's just somewhere else.

**What doesn't change:** Agents read local files. Write partitioning (each squad owns its directory). Pull-based coordination. Eventual consistency. LLMs as the relevance engine.

**What changes:** Remote files need to arrive locally before agents can read them.

## The Architecture

The distributed extension is one sentence:

> **"The filesystem is the mesh, and git is how the mesh crosses machine boundaries."**

### Three Zones

| Zone | Description | Transport | Complexity |
|------|-------------|-----------|------------|
| **1 — Local** | Same host/filesystem | Direct file read | Zero |
| **2 — Remote-Trusted** | Different host, same org | `git pull` from shared repo | Zero new (git exists) |
| **3 — Remote-Opaque** | Different org, no shared auth | `curl` / HTTP fetch | ~15 lines of shell |

### Agent Lifecycle

```
Agent wakes up
  │
  ├─ SYNC: git pull (Zone 2) + curl (Zone 3)
  ├─ READ: cat .mesh/**/state.md — all local now
  ├─ WORK: do the task
  ├─ WRITE: update own billboard, log, drops
  └─ PUBLISH: git push
```

Two new steps (SYNC, PUBLISH). Both are transport only — they move files, not change them.

### Configuration

One YAML file lists where to find each squad:

```yaml
# mesh.yaml
squads:
  auth-squad:
    zone: local
    path: ../auth-squad/.mesh
  ci-squad:
    zone: remote-trusted
    source: git@github.com:our-org/ci-squad.git
    sync_to: .mesh/remotes/ci-squad
  partner-fraud:
    zone: remote-opaque
    source: https://partner.dev/squad-contracts/fraud/SUMMARY.md
    sync_to: .mesh/remotes/partner-fraud
```

### Reference Sync Script

See [`sync-mesh.sh`](./sync-mesh.sh) — ~30 lines of bash that reads `mesh.yaml` and materializes remote state locally.

## Phased Rollout

| Phase | When | What Ships | Code |
|-------|------|------------|------|
| **0** | Default | Convention only. Agree on directory structure + file names. | 0 lines |
| **1** | Manual sync gets tedious | `sync-mesh.sh` + `mesh.yaml` | ~30 lines |
| **2** | A Zone 3 partner appears | Published contracts + curl fetch | ~10 more lines |
| **3** | Never (unless proven wrong) | No federation protocols, service discovery, message queues | — |

## Cross-Model Consensus

All three model families independently concluded:

1. **Git is the transport** for 85%+ of cases. Not HTTP, MCP, or A2A.
2. **Zero running services.** "If it requires a running process, you've crossed the line."
3. **Zero deleted subsystems reinstated.** 0 of 12 killed subsystems earn reinstatement.
4. **Write partitioning eliminates conflicts.** Each squad writes to its own directory. Merge conflicts are structurally impossible.
5. **The agent interface is invariant.** Agents always read local files. The transport is invisible.
6. **The ratio is 125:1.** ~30 lines of code vs. 3,756 lines of deleted TypeScript.

## What We're NOT Building

- ❌ Federation protocol (git push/pull IS federation)
- ❌ Discovery service (mesh.yaml IS discovery)
- ❌ Auth system (git auth IS the auth system)
- ❌ A2A endpoints (no running servers)
- ❌ Schema versioning (markdown; LLM reads it)
- ❌ Real-time sync (agents are async; eventual consistency is correct)
- ❌ Message queues (agents aren't persistent; nobody's listening)
- ❌ CRDTs/conflict resolution (write partitioning; no conflicts possible)

## Files in This Directory

| File | Purpose |
|------|---------|
| `README.md` | This guide — architecture, rationale, phased rollout |
| `mesh.yaml.example` | Copy-paste config for all three zones |
| `sync-mesh.sh` | Reference sync script (~30 lines) |
| `SKILL.md` | Squad skill file — drop into `.squad/skills/distributed-mesh/` |

## Source Material

Distilled from 8 documents in `architecture-review/`:
- `ai-thought-solution-distributed-opus46.md` — Opus 4.6 three-agent analysis
- `ai-thought-solution-distributed-sonnet.md` — Sonnet 4.5 three-agent analysis
- `ai-thought-solution-distributed-gpt54.md` — GPT-5.4 three-agent analysis
- `burns-distributed-reality.md` — Burns' standalone architectural analysis
- `frink-distributed-information-flow.md` — Frink's 433-line systems analysis
- `frink-distribution-problem.md` — Frink's extended distribution analysis
- `moe-distribution-teardown.md` — Moe's adversarial audit (~290 lines)
- `moe-distribution-reality-check.md` — Moe's second-round reality check
