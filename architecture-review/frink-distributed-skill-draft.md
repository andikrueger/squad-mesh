---
name: "distributed-communication"
description: "How squads communicate across machine and org boundaries using git and filesystem conventions"
domain: "distributed-systems"
confidence: "high"
source: "Synthesized from 6 architecture reviews by Burns, Frink, Moe across Opus 4.6, Sonnet 4.5, GPT-5.4 — all converging on the same design"
---

## Context

Squads coordinate by reading and writing files. When all squads share a filesystem, this is trivial — `cat ../squad-b/SUMMARY.md` works. When squads are on different machines, different networks, or different organizations, the files aren't local and the `cat` fails.

The distributed communication architecture solves exactly one problem: **making remote files appear as local files before the agent reads them.** The agent interface never changes. The agent always reads local paths. The only question is how those files got there.

This is a transport problem, not an architecture problem. The conventions, file formats, write partitioning, and agent behaviors are identical to the local-only design. Distribution adds plumbing underneath.

### The Three Zones

Every squad relationship falls into one of three zones:

| Zone | Description | Transport | Trust |
|------|------------|-----------|-------|
| **Zone 1 — Local** | Same host / same filesystem | Direct filesystem read | Full visibility |
| **Zone 2 — Remote-Trusted** | Different host, same org / shared auth | `git pull` from shared repo | Full visibility (after sync) |
| **Zone 3 — Remote-Opaque** | Different org, no shared auth | `curl` / HTTP fetch of published contracts | Published interfaces only |

**Zone 1** is the baseline. `cat ../squad-b/.mesh/` just works.
**Zone 2** is the common distributed case. `git pull` collapses it into Zone 1.
**Zone 3** is the edge case for cross-org partners. They publish SUMMARY.md and INTERFACES.md; you fetch them.

### The Transport Hierarchy

Prefer simpler transports. Each level adds exactly one moving part:

1. **Local filesystem read** — zero latency, zero failure modes
2. **Git pull (Zone 2)** — seconds of latency, git handles auth, already configured for code repos
3. **HTTP fetch (Zone 3)** — higher latency, read-only, requires published endpoints

### Key Files

- **`squads.yaml`** — The registry. Lists all known squads with their zone, source, and local sync path. This is the entire "discovery service."
- **`SUMMARY.md`** — What a squad does, what it's working on, what it exposes. Published by every squad. The primary communication surface.
- **`INTERFACES.md`** — Formal contracts a squad commits to (API shapes, data formats, behavioral promises). Published for Zone 3 consumers.
- **`.mesh/remotes/`** — Directory where remote squad state materializes after sync. Agent reads from here as if the files were always local.

## Patterns

### Pattern 1: Read from `.mesh/remotes/` for remote squads

After sync, remote squad state appears at `.mesh/remotes/{squad-name}/`. Read these paths the same way you'd read local squad files.

```
# Local squad (Zone 1):
cat ../auth-squad/.mesh/SUMMARY.md

# Remote squad after sync (Zone 2 or 3):
cat .mesh/remotes/ci-squad/SUMMARY.md
cat .mesh/remotes/partner-auth/SUMMARY.md
```

The agent doesn't know or care which zone the file came from. It reads a local path.

### Pattern 2: Run sync before cross-squad work

Before reading any remote squad state, ensure `sync-mesh` has run. This materializes Zone 2 files via `git pull` and Zone 3 files via `curl`.

```bash
# Agent startup sequence:
./sync-mesh.sh squads.yaml    # materialize remote state
# Now read all squad files — local and remote are both on disk
```

If sync fails for a specific remote (network down, auth expired), the script writes a stub file indicating unavailability. Stale data is better than no data. The agent proceeds with whatever state is available.

### Pattern 3: Write partitioning eliminates conflicts

Each squad writes **only** to paths containing its own name:
- `boards/{self}.md`
- `squads/{self}/state.md`
- `squads/{self}/log.md`
- `drops/{date}-{self}-{slug}.md`

No two squads write to the same file. Git push/pull never produces merge conflicts. If push fails ("your branch is behind"), the fix is always:

```bash
git pull --rebase && git push
```

One-line retry. No merge resolution needed. This is a structural guarantee, not a convention.

### Pattern 4: Publish contracts for Zone 3 consumers

When an external org needs to see your squad's capabilities, publish two files to an accessible location:

- **`SUMMARY.md`** — What you do, what you're working on, what you expose. Write this like a cross-team standup update.
- **`INTERFACES.md`** — Your API contracts, schemas, behavioral commitments. Write this like an OpenAPI spec in prose.

These go to `.mesh/published/` and are deployed to wherever Zone 3 consumers can reach them (public git repo, static URL, artifact registry).

**What contracts do NOT include:** Internal state, logs, drops, agent history, decisions-in-progress, blockers. If you wouldn't write it on a shared whiteboard visible to external partners, don't put it in the contract.

### Pattern 5: squads.yaml is the entire registry

Discovery is a YAML file, not a service. To add a new squad:

```yaml
# Add to squads.yaml:
- name: new-squad
  zone: remote-trusted
  source: git@github.com:our-org/new-squad-mesh.git
  ref: main
  sync_to: .mesh/remotes/new-squad
```

To remove a squad: delete the entry. To change transport: update the zone and source fields. This file is version-controlled. Changes go through PR review.

### Pattern 6: Git auth IS the auth layer

No new auth system. Git's existing auth model provides access control:

| Access | Mechanism | Configuration |
|--------|-----------|---------------|
| Same org | Org membership + SSH key | Already done if you push code |
| Cross-org invited | Collaborator invite or deploy key | One-time GitHub UI action |
| Public | None | `git clone` with HTTPS |

If you can `git clone` a repo, you can read its mesh. If you can't, you can't. The access boundary is the git permission boundary.

### Pattern 7: Trust is binary per repo

There is no partial visibility within a mesh repo. If you can clone it, you see all squads in it. If you need selective exposure:
- Internal squads → private mesh repo (org members only)
- Partner-facing squads → partner mesh repo (invited collaborators)
- Public squads → public mesh repo

Separate repos for different audiences. The repo IS the trust boundary.

## Examples

### Example 1: Developer laptop with local + CI squads

```yaml
# squads.yaml
squads:
  - name: auth-squad
    zone: local
    path: ../auth-squad

  - name: api-squad
    zone: local
    path: ../api-squad

  - name: ci-squad
    zone: remote-trusted
    source: git@github.com:our-org/ci-squad-mesh.git
    ref: main
    sync_to: .mesh/remotes/ci-squad
```

Agent wakes up → runs `sync-mesh.sh` → git pulls ci-squad's latest results → reads `.mesh/remotes/ci-squad/SUMMARY.md` ("3 test failures in auth module") → adjusts work accordingly. Total overhead: one `git pull`.

### Example 2: Two orgs collaborating

```yaml
# squads.yaml
squads:
  - name: payment-squad
    zone: local
    path: ../payment-squad

  - name: partner-fraud-detection
    zone: remote-opaque
    source: https://partner.example.com/squad-contracts/fraud/SUMMARY.md
    sync_to: .mesh/remotes/partner-fraud
    auth: bearer
    token_env: PARTNER_FRAUD_TOKEN
```

Sync fetches partner's SUMMARY.md via curl with bearer token. Agent reads: "Risk scoring v3 API deprecated April 15. New field `device_fingerprint` required." Agent adds the field. Partner can't see payment-squad's internals — Zone 3 is one-way unless you also publish.

### Example 3: Ephemeral CI squad

CI runner spins up → clones mesh repo → runs tests → writes results to `boards/ci-squad.md` → `git push` → runner dies. Next day, auth-squad runs `git pull` → reads CI results → fixes failures. The git transport gives ephemeral squads permanence.

### Full agent lifecycle (distributed)

```
Agent wakes up
  │
  ├─ SYNC phase: ./sync-mesh.sh squads.yaml
  │    ├─ Zone 1: skip (already on disk)
  │    ├─ Zone 2: git pull --rebase --quiet
  │    └─ Zone 3: curl published contracts
  │
  ├─ READ phase: Read all squad files (local + .mesh/remotes/)
  │    ├─ cat ../local-squad/SUMMARY.md
  │    ├─ cat .mesh/remotes/*/SUMMARY.md
  │    └─ Agent sees unified view — doesn't know which are remote
  │
  ├─ WORK phase: Do the task
  │
  ├─ WRITE phase: Update own state
  │    ├─ boards/{self}.md
  │    ├─ squads/{self}/log.md
  │    └─ drops/{date}-{self}-{slug}.md (optional)
  │
  └─ PUBLISH phase: git add -A && git commit -m "..." && git push
       ├─ Zone 1: skip (peers already see your files)
       ├─ Zone 2: git push to shared repo
       └─ Zone 3: copy to published/ + deploy (if applicable)
```

## Anti-Patterns

- **Service discovery protocol** — `squads.yaml` with 10-50 entries is not a "discovery problem." A YAML file is the registry. Don't build a service to serve what a file already contains.

- **MCP for cross-squad communication** — Wrapping file reads in RPC when `git pull` already works. MCP is for tool invocation, not file distribution.

- **A2A for cross-org** — Wrapping `curl` in a capability-negotiation protocol when `curl` already works. If you need negotiation later, it's a Zone 3 concern — add it then.

- **Message queues / event systems** — Agents aren't persistent processes. There's nobody listening for events. Drops are files, not messages. Files on disk are already persistent.

- **Real-time sync / WebSockets** — Agents wake up, work, exit. "Real-time notification between non-persistent processes is a category error" (Frink). Eventual consistency via `git pull` is the correct model.

- **Schema versioning for SUMMARY.md** — Section headings yes. JSON schema with versioning no. The LLM parses markdown. If the format changes, the LLM adapts.

- **Conflict resolution logic** — Write partitioning makes conflicts structurally impossible. If you're writing conflict resolution code, your write partitioning is broken.

- **Centralized coordinator service** — A running process that serves files git already distributes. Every "simple microservice" is 2,000 lines of boilerplate, a Dockerfile, a deployment config, and an oncall rotation.

- **CRDTs / distributed consensus** — For what? Markdown files with per-squad write ownership. There are no concurrent writers to the same file.

- **"The moment you propose something that requires a running process, you've crossed the line."** — Moe (Adversarial Auditor). Files, git, curl, cron — all stateless, failure-tolerant, debuggable with `cat`.
