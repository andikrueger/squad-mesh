# Agent Startup Integration — Specification

> **Author:** Frink (Systems Engineer)
> **Status:** Spec v1.0
> **Purpose:** Define how agent startup changes for distributed communication

---

## The Change

Two new phases are added to the agent lifecycle: **SYNC** (before read) and **PUBLISH** (after write). Both are transport only — they move files between machines. They don't change what files contain or how agents interpret them.

### Before (Local Only)

```
Agent wakes up
  ├─ READ: Read local squad files
  ├─ WORK: Do the task
  └─ WRITE: Update own state files
```

### After (Distributed)

```
Agent wakes up
  ├─ SYNC: Materialize remote state into local filesystem     ← NEW
  ├─ READ: Read all squad files (local + remotes)             ← MINOR CHANGE (additional paths)
  ├─ WORK: Do the task                                        ← UNCHANGED
  ├─ WRITE: Update own state files                            ← UNCHANGED
  └─ PUBLISH: Push local state for remote peers               ← NEW
```

---

## SYNC Phase (Before Read)

### What Happens

1. Agent (or its startup wrapper) invokes `sync-mesh.js squads.yaml`
2. Script reads `squads.yaml`, iterates over remote squads
3. Zone 2 squads: `git clone --depth 1` (first run) or `git pull --rebase` (subsequent runs)
4. Zone 3 squads: `curl` fetches published SUMMARY.md
5. Files land in `.mesh/remotes/{squad-name}/`
6. Script exits. Agent proceeds to READ phase with all files local.

### Failure Behavior

- If sync fails for a specific squad, the script logs a warning and continues
- Existing (stale) files are preserved — stale context > no context
- For Zone 3 failures, a stub SUMMARY.md is written: `# {name} — unavailable ({timestamp})`
- The agent sees the stub and knows the squad exists but is unreachable
- **Sync failure never blocks agent startup.** The agent runs with whatever context is available.

### When to Sync

- **Always at agent startup** — before reading any cross-squad files
- **Optionally via cron** — `*/5 * * * * node sync-mesh.js` if agents run frequently and want fresher data
- **Never in real-time** — agents are not persistent processes; there's no one listening for push notifications

---

## READ Phase (Minor Change)

### What's Added

The agent's read scope expands to include `.mesh/remotes/`:

```
# Local squads (unchanged):
cat ../auth-squad/SUMMARY.md
cat ../api-squad/SUMMARY.md

# Remote squads (new paths, same read pattern):
cat .mesh/remotes/ci-squad/SUMMARY.md
cat .mesh/remotes/partner-fraud/SUMMARY.md
```

### Where Remote Summaries Go on Disk

```
project-root/
├── .mesh/
│   └── remotes/                        ← ALL remote squad state lands here
│       ├── ci-squad/                   ← Zone 2: full .mesh clone
│       │   ├── SUMMARY.md
│       │   ├── INTERFACES.md
│       │   ├── boards/
│       │   │   └── ci-squad.md
│       │   └── squads/
│       │       └── ci-squad/
│       │           ├── state.md
│       │           └── log.md
│       ├── data-squad/                 ← Zone 2: full .mesh clone
│       │   ├── SUMMARY.md
│       │   └── ...
│       └── partner-fraud/              ← Zone 3: published contract only
│           └── SUMMARY.md              ← Fetched via curl, or stub if unavailable
├── squads.yaml                         ← The registry
├── sync-mesh.js                        ← The sync script
└── (squad's own code and .squad/)
```

### Agent Discovery Pattern

To see all known squads (local + remote), the agent reads `squads.yaml`. To read their state:

```
# From squads.yaml, for each squad:
#   zone: local      → read from {path}/SUMMARY.md
#   zone: remote-*   → read from {sync_to}/SUMMARY.md
```

Or, more simply, glob both locations:
```
cat ../*/SUMMARY.md              # local squads
cat .mesh/remotes/*/SUMMARY.md   # remote squads
```

The agent sees a unified view. It does not need to know which files are local vs. remote.

---

## WRITE Phase (Unchanged)

No change. The agent writes to its own paths:
- `boards/{self}.md`
- `squads/{self}/state.md`
- `squads/{self}/log.md`
- `drops/{date}-{self}-{slug}.md` (optional)

---

## PUBLISH Phase (After Write)

### What Happens

1. `git add -A` — stage all changes in the mesh directory
2. `git commit -m "{squad}: state update"` — commit with squad identifier
3. `git pull --rebase` — incorporate any concurrent pushes
4. `git push` — broadcast to shared repo

### When to Publish

- **After every work session** — the agent pushes its updated state so other squads see it on their next sync
- **On push failure** — `git pull --rebase && git push` (one-line retry; write partitioning makes this safe)
- **For Zone 3 publishing** — copy SUMMARY.md and INTERFACES.md to `.mesh/published/` and deploy to the agreed HTTP endpoint (this step is environment-specific)

### What Gets Published

Only the squad's own files. Write partitioning means the commit only contains changes under paths owned by this squad. Other squads' files are read-only.

---

## System Prompt Integration

The agent's system prompt (or charter) needs one addition:

```markdown
## Cross-Squad Context

Before starting work, remote squad state has been synced to `.mesh/remotes/`.
Read `squads.yaml` for the full list of known squads and their zones.

For each squad in squads.yaml:
- zone: local → read from the `path` field (e.g., ../auth-squad/SUMMARY.md)
- zone: remote-trusted → read from `sync_to` (e.g., .mesh/remotes/ci-squad/SUMMARY.md)
- zone: remote-opaque → read from `sync_to` (e.g., .mesh/remotes/partner-fraud/SUMMARY.md)
  Note: Zone 3 squads expose only SUMMARY.md and INTERFACES.md. Their internals are invisible.

Weight information by trust level:
- local and remote-trusted: high confidence (full mesh visibility)
- remote-opaque: informational only (published contracts, may be stale)
```

This is ~10 lines added to the system prompt. No behavioral change — the agent still reads files and reasons about them. It just reads from one more directory and understands the trust gradient.

---

## Summary of Changes

| Component | Change | Size |
|-----------|--------|------|
| Agent lifecycle | +SYNC before read, +PUBLISH after write | 2 phases |
| Startup wrapper | Invoke `sync-mesh.js` before agent starts | 1 line |
| Read paths | Add `.mesh/remotes/*/SUMMARY.md` | 1 glob |
| System prompt | Trust gradient explanation | ~10 lines |
| New files on disk | `.mesh/remotes/` directory tree | Created by sync |
| New config | `squads.yaml` | 1 file |
| New scripts | `sync-mesh.js` | 1 file (~55 lines) |
| New running services | **None** | 0 |
| New protocols | **None** | 0 |
| New dependencies | **None** (git + curl + node already present) | 0 |
