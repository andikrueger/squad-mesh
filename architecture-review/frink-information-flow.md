# Information Flow for AI Agents — A Systems Engineer's Reckoning

> **Author:** Frink (Systems Engineer)
> **Date:** 2026-03-13
> **Status:** This document replaces my previous protocol analysis. I was wrong about the complexity level.

---

## Information Flow Realities for AI Agents

I've spent weeks thinking about MCP federation, A2A envelopes, schema versioning, delivery guarantees. Let me now describe what actually happens when an AI agent communicates:

1. **An agent reads a file.** That's it. That's the input interface.
2. **An agent writes a file.** That's the output interface.
3. There is no step 3.

Everything I designed — the Squad Federation Protocol, the envelope layer, the notification extensions, the capability negotiation — is plumbing for a problem that doesn't exist. Agents don't have network sockets. They don't have event loops. They don't have persistent connections. They have a context window, and files get loaded into it.

Here are the realities that make most of our architecture unnecessary:

**Reality 1: No persistent process.** An agent wakes up, reads state, does work, writes state, goes away. There is no running process to push notifications to. "Real-time communication" between agents is a category error — there's nobody home to receive the message.

**Reality 2: Parse anything.** Agents don't need schemas to read structured data. They don't need type definitions to understand a document. A markdown file with clear headings is as machine-readable to an LLM as a validated JSON schema — and more human-readable too. Schema enforcement protects against bugs in parsers that don't exist.

**Reality 3: Context window is the bottleneck.** An agent can't hold the entire mesh state in context. It needs to scan quickly: glob a directory, read headers, decide what's relevant, load the full content of what matters. The information architecture must support *skimming* — not deep traversal of graph structures.

**Reality 4: Write partitioning solves concurrency.** If agent A only writes to `A/` and agent B only writes to `B/`, there are zero conflicts. Ever. No locking, no CRDTs, no merge resolution. The entire distributed systems toolkit I brought to this problem is solving a self-inflicted wound — we only get conflicts if we design shared write targets.

**Reality 5: Git already exists.** Git is a content-addressable distributed database with branch-based concurrency, merge semantics, full audit history, and a transport layer (push/pull) that works over SSH, HTTPS, and local filesystem. We have been designing a distributed state synchronization protocol while standing on top of one.

---

## The Simplest Possible Architecture

### Directory Convention

```
.mesh/
├── {squad-name}/
│   ├── state.md       # What I'm doing right now (mutable, overwritten)
│   └── log.md         # What I've learned and decided (append-only)
├── {squad-name}/
│   ├── state.md
│   └── log.md
└── ...
```

That's the entire architecture. Let me explain why nothing else is needed.

### File 1: `state.md` (per squad, mutable)

Each squad maintains exactly one state file. It contains:

```markdown
# squad-name

## Status
Working on X. 80% complete. Expected done by Friday.

## Blockers
Need auth squad to expose token refresh endpoint.

## Needs
- Has anyone implemented rate limiting for the streaming API?
- Looking for a testing pattern for concurrent webhook delivery.

## Offering
We built a retry-with-backoff utility that handles transient failures.
Available at packages/shared/retry.ts if useful.

Updated: 2026-03-13T14:30:00Z
```

This file gets **overwritten** each time the squad updates. It's a snapshot, not a history. Current state only. An agent reading this file knows exactly where this squad is *right now*.

The format is not enforced. Those headings are conventions, not schema. A squad can add sections, remove sections, write prose. The reader is an LLM — it will understand.

### File 2: `log.md` (per squad, append-only)

Each squad maintains one log. New entries go at the top:

```markdown
# squad-name — Log

## 2026-03-13: Retry logic breaks on HTTP 429 with no Retry-After header
We assumed all 429 responses include Retry-After. They don't. Our retry
utility now falls back to exponential backoff starting at 1s when the
header is missing. Cost us 4 hours to diagnose.

## 2026-03-12: Jest parallel mode causes port conflicts in integration tests
Running integration tests with --workers=4 means 4 instances trying to
bind port 3000. Fix: each worker gets port 3000 + workerIndex. Test
helper updated.

## 2026-03-11: Squad bootstrapped
Initial setup. Auth service API, token management, session handling.
```

This file is **append-only** (prepend, technically — newest first for faster scanning). It never gets overwritten, only grows. This is the squad's institutional memory.

### That's Two File Types

- `state.md` = "where are you now?" (mutable)
- `log.md` = "what have you learned?" (append-only)

Not five types. Not ten. Two.

### Where `.mesh/` Lives

**Option A — Shared parent directory (local development):**
```
~/dev/
├── .mesh/              ← mesh directory
│   ├── auth-squad/
│   ├── api-squad/
│   └── ui-squad/
├── auth-squad/         ← actual squad repos
├── api-squad/
└── ui-squad/
```

**Option B — Dedicated repo (distributed teams):**
```
github.com/org/mesh.git     ← mesh repo, cloned by all squads
├── auth-squad/
│   ├── state.md
│   └── log.md
├── api-squad/
└── ui-squad/
```

Option A is zero-setup for local work. Option B adds git push/pull as the transport layer for distributed teams. Both use the same directory convention.

---

## The Three Operations

### 1. READ — "What's going on?"

An agent wakes up and needs organizational awareness. Here's the entire protocol:

```
glob .mesh/*/state.md → list of squad state files
read each one → organizational picture
```

That's the Common Operational Picture. Not a generated report. Not a GraphQL query. Not a coordinator prompt injection. Just: read the files.

For deeper context (someone's solved this before?):
```
glob .mesh/*/log.md → list of squad logs
grep/scan for relevant keywords → matching learnings
```

There is no knowledge propagation system. There is no relevance classification. There is no hop-based routing. Agent reads files. Agent is an LLM. Agent determines relevance itself. **The LLM IS the relevance engine.**

### 2. WRITE — "Here's my update"

A squad agent finishes work and needs to share state:

```
write .mesh/{my-name}/state.md → overwrite with current snapshot
append to .mesh/{my-name}/log.md → prepend new learnings
git add .mesh/{my-name}/ && git commit && git push
```

Write partitioning guarantee: a squad **only** writes to `.mesh/{its-own-name}/`. Never to another squad's directory. This makes conflicts structurally impossible. Not unlikely — impossible.

Git push is the "broadcast." Git pull is the "receive." The transport protocol is `git`.

### 3. DISCOVER — "Who exists?"

```
ls .mesh/ → list of directories → list of squads
```

The directory name IS the identity. The existence of the directory IS the registration. A new squad joins the mesh by creating its directory and committing. A squad leaves by deleting its directory.

No registry file. No YAML. No manifest. No discovery service. No markers. `ls` is the discovery protocol.

---

## Cross-Squad Communication

### How Squad A's Learning Reaches Squad B

1. Squad A learns something. Agent writes to `.mesh/squad-a/log.md`.
2. Squad A does `git commit && git push` (or this happens automatically).
3. Squad B wakes up. Does `git pull`.
4. Squad B's agent reads `.mesh/*/log.md` as part of context loading.
5. Squad B's LLM notices the relevant entry because **that's what LLMs do**.

No yokoten command. No propagation heuristics. No relevance classification system. No cross-squad tags. The "propagation intelligence" is the reader's intelligence. An LLM scanning a dozen log files will find what's relevant faster and more accurately than any tag-matching heuristic we could build.

### How Squad A Asks Squad B for Help

1. Squad A writes in `.mesh/squad-a/state.md` under `## Needs`: "Need auth squad's help with token refresh."
2. Squad B's agent, reading all state files on startup, sees the request.
3. Squad B responds by updating its own state or log.

There is no tension routing. There is no directive system. There is no escalation timer. Agent A wrote what it needs. Agent B read it. If B can help, it helps. If not, it ignores it. The "protocol" is literacy.

### What About Scale?

- 10 squads × 2 files = 20 files. Trivial.
- 50 squads × 2 files = 100 files. Still trivial.
- 100 squads: state files stay small (one page each). Logs grow, but agents scan headers/dates — they don't read entire histories every time.
- 1000+ squads: now you might want subdirectories (`.mesh/domain/squad/`). But we're not there. Build for the scale you have, not the scale you imagine.

### What About Staleness?

The `Updated:` timestamp in `state.md` tells you when the squad last wrote. Git log tells you when the file last changed. An LLM can assess "this state file is 3 weeks old — this squad might be dead" without a health monitoring subsystem.

---

## What We Can Delete

Here is everything in the current squad-mesh design that becomes unnecessary:

### Configuration System — DELETE ALL

| Delete | Reason |
|--------|--------|
| `meta-squad.config.ts` | Convention replaces configuration. Directory structure IS the config. |
| `defineMetaSquad()` and all builders | No config to build. |
| `DiscoveryConfig`, `SteeringConfig`, `VisibilityConfig`, `KnowledgeConfig`, `HealthConfig` | No config types needed. |
| `MeshValidationError` | Nothing to validate. |

The config existed because we designed a complex system that needed parameterization. A simple system needs no parameters.

### Discovery System — DELETE ALL

| Delete | Reason |
|--------|--------|
| `discoverSquads()` | `ls .mesh/` replaces it. |
| Marker detection (`squad.config.ts`, `.squad/`) | Directory existence IS the marker. |
| Registry (`registry.yaml`) | `ls` IS the registry. |
| `isSquadRoot()` | A directory in `.mesh/` IS a squad. |
| Discovery modes (`local`, `registry`, `hybrid`) | One mode: list directories. |
| Scan patterns, exclude lists, refresh intervals | No scanning. Direct convention. |

### Steering System — DELETE ALL

| Delete | Reason |
|--------|--------|
| Directives (`createDirective()`, `issueDirective()`, `saveDirective()`) | Write what you need in your `state.md`. Others read it. |
| Tensions (`raiseTension()`, `routeTension()`) | Same. State your tension in your state file. |
| Directive authority (`leader-only`, `any-squad`, `designated`) | Any squad can write to its own state. Authority is a social convention, not a system enforcement. |
| Auto-escalation timers | LLMs assess urgency from language, not timers. |
| Steering persistence layer | Files persist on disk. Git persists across machines. Already handled. |

### Knowledge System — DELETE ALL

| Delete | Reason |
|--------|--------|
| `collectSquadLearnings()`, `collectAllLearnings()` | `cat .mesh/*/log.md` replaces it. |
| `filterPropagatable()` | The LLM IS the relevance filter. |
| Relevance classification (`squad-specific`, `domain`, `universal`) | Let the reader decide relevance, not the writer. |
| `promoteToPattern()` | If a learning keeps showing up in multiple logs, it's a pattern. LLMs notice this. |
| `saveLearning()`, `loadLearnings()` | Append to `log.md`. `cat log.md`. |
| Cross-squad tags | Full-text search (by an LLM) beats tagging. |
| `yokoten` command | Reading log files IS yokoten. |

### Visibility System — DELETE ALL

| Delete | Reason |
|--------|--------|
| `collectSquadStatus()`, `collectAllStatuses()` | `cat .mesh/*/state.md` replaces it. |
| `generateCOP()` | Reading all state files IS the COP. |
| `generateHealthReport()` | State files contain health information. |
| Stale-after thresholds | Timestamps in files. LLM judges staleness. |
| Reporting cadence | Agents read on startup. No scheduled reports. |

### Coordinator System — DELETE ALL

| Delete | Reason |
|--------|--------|
| `generateMetaSquadPrompt()` | Don't inject prompts. Let agents read `.mesh/` directly. |
| `generateCompactStatus()` | Agents read state files. They can compact in-context. |
| `generateTensionDetectionRules()` | LLMs detect tensions from natural language. No rules needed. |
| `generateDirectiveComplianceRules()` | Social convention, not system enforcement. |

### Bridge API — DELETE ALL

| Delete | Reason |
|--------|--------|
| `readMeshLink()` | One env var or convention (`../.mesh/`) replaces backpointers. |
| `getMeshLearnings()`, `getMeshPatterns()` | Read files directly. |
| `contributeLearning()` | Write to your own `log.md`. |
| `getMeshStatus()` | Read state files directly. |
| `MeshLink` type | Not needed. Path convention. |

### Backpointers — DELETE ALL

| Delete | Reason |
|--------|--------|
| `.squad/mesh-link.json` | Squad knows its name. `.mesh/{name}/` is its directory. Convention replaces pointers. |
| Wisdom skill files | Agents don't need a skill file to learn "read files from .mesh/". That's like writing a skill file that teaches "read README.md". |

### CLI — REDUCE TO NEAR-ZERO

| Keep | What it does |
|------|-------------|
| `mesh init` | Creates `.mesh/` and your squad's subdirectory. Maybe 10 lines of shell script. |
| `mesh sync` | `git add .mesh/ && git commit -m "mesh sync" && git pull --rebase && git push`. Alias for git. |

Every other CLI command (`discover`, `status`, `health`, `yokoten`, `init-squad`, `help`) is replaced by agents reading files directly.

### The Type System — DELETE MOST

| Delete | Reason |
|--------|--------|
| `MetaSquadConfig`, `SquadIdentity`, `SquadStatus`, `CommonOperationalPicture` | No typed objects. Markdown files. |
| `Directive`, `CrossSquadTension`, `CrossSquadLearning` | Natural language in files. |
| `DiscoveryResult`, `DiscoveryError`, `DiscoveryWarning` | `ls` doesn't need result types. |

Keep only types needed for the `mesh init` / `mesh sync` commands, if we even implement those in TypeScript.

---

## The Uncomfortable Math

**Current squad-mesh surface area:**
- 7 subsystems (Discovery, Status, Steering, Knowledge, Coordinator, Bridge, Builders)
- 30+ exported functions
- 15+ exported types
- 8 CLI commands
- 5 config builders with runtime validation
- Registry, backpointers, wisdom skills, prompt injection

**Proposed surface area:**
- 1 directory convention (`.mesh/{squad}/`)
- 2 file types (`state.md`, `log.md`)
- 3 operations (read, write, discover = read files, write files, list directories)
- 2 optional CLI aliases (`init`, `sync`)

That's a reduction from ~60 concepts to ~7.

## What This Means for the Package

`squad-mesh` as currently designed is an application framework for a problem that has a filesystem solution. The AI-native answer isn't "build a sophisticated mesh coordinator" — it's "agree on where to put files."

The remaining value of the package might be:
1. **Documentation of the convention** (this document, essentially)
2. **The `init` script** (create directories)
3. **The `sync` script** (git wrapper)
4. **Maybe** a context-loading helper that reads all mesh state and formats it for injection into an agent's context window — but even this is a convenience, not a necessity.

---

## Self-Correction Note

In my [protocol reality check](./frink-protocol-reality.md), I concluded "earn your complexity" and "build the simplest thing that works." I then proceeded to help build a system with 7 subsystems, 30+ functions, and 15+ types. I earned no complexity. I projected human systems thinking onto agents that read files.

The difference between "at-most-once" and "exactly-once" delivery IS interesting — when you have network protocols. When your transport is git and your interface is a filesystem, the question doesn't arise. Files are there or they're not. Git handles the rest.

— Frink
