# The Distribution Problem

> **Author:** Frink (Systems Engineer) | **Date:** 2026-03-14
> **Constraint:** Squads may be on different machines, different networks, different organizations.
> **Starting point:** "Filesystem IS the database, git IS the transport" — now stress-tested against distribution.

---

## The Distribution Problem (What "Read a File" Means When Files Aren't Local)

The local-only design has one beautiful property: an agent wakes up, reads `.mesh/*/state.md`, and has full cross-squad context. Seven file operations. No APIs. No protocols.

That works because "read a file" means `fs.readFile()` — a syscall that completes in microseconds. The moment Squad A is on machine A and Squad B is on machine B, "read a file" becomes a distributed systems problem. Specifically:

1. **The file doesn't exist locally.** Squad B's `state.md` is on machine B's disk. Machine A has no path to it.
2. **Getting it requires a network round-trip.** HTTP, SSH, git pull, S3 GET — all require latency, auth, and failure handling.
3. **The file might be stale.** Even if you fetched it yesterday, Squad B may have updated since.
4. **The file might be unreachable.** Machine B is offline, behind a firewall, or in a different org with no shared auth.

The question isn't whether agents read files. They do. The question is: **what makes remote files appear as local files before the agent wakes up?**

This is the entire distribution problem. Every solution is a different answer to that one question.

---

## Sync vs. Fetch vs. Publish (Three Strategies for Making Remote Files Local)

There are exactly three strategies. Every distributed system picks one (or a hybrid):

### Strategy 1: Sync (Keep Local Copies Continuously Updated)

A background process watches for remote changes and mirrors them locally. The agent never knows files are remote — they're always "just there."

**Mechanisms:** rsync cron, S3 sync, Dropbox/OneDrive, filesystem watchers + SCP, Syncthing.

**Tradeoffs:**
- Agent interface unchanged. Files are always local and fresh.
- Requires a running daemon or scheduled job on every machine.
- Sync conflicts when two sides write concurrently (if not write-partitioned).
- Doesn't cross org boundaries easily — requires shared infrastructure.
- Always-on network connection or frequent polling.

**When it fits:** Teams on the same cloud/VPN. Shared NAS. Small orgs with common infra.

### Strategy 2: Fetch (Pull on Demand When Agent Wakes Up)

The agent's startup sequence includes a "hydrate" step: fetch remote state, write it locally, then proceed as normal.

**Mechanisms:** git pull, HTTP GET, API call, `gh api`, curl to known endpoints.

**Tradeoffs:**
- No background process. Fetch happens when work happens.
- Naturally crosses org boundaries (anything with a URL is fetchable).
- Latency at agent startup (blocking on network before work begins).
- Requires knowing where to fetch from (URLs, repo addresses).
- Requires auth tokens / SSH keys per remote source.
- Fails if remote is unreachable — agent starts with stale or missing context.

**When it fits:** Agents with reliable network access. Cross-org collaboration where parties publish to known locations.

### Strategy 3: Publish (Push Your State to a Shared Location Others Can Read)

Each squad pushes its state to a well-known location. Others read from that location. No direct machine-to-machine connection.

**Mechanisms:** git push, deploy to S3/GCS bucket, publish to GitHub repo, write to static file hosting.

**Tradeoffs:**
- Decoupled. Publisher doesn't need to know who reads. Reader doesn't need to know who wrote.
- Works across org boundaries — the shared location is the interface.
- Tolerates intermittent connectivity. Publish when you can, read when you can.
- Requires a shared location everyone can access (the "where").
- Eventual consistency. Reader may get stale state.
- Auth for write access to shared location.

**When it fits:** Loosely coupled squads. Cross-org. Squads that want autonomy over when they publish.

### The Hybrid That Falls Out

The natural answer is **Publish + Fetch**: each squad publishes its state somewhere reachable, and each squad fetches others' state before starting work. The "shared location" is the only new concept.

And we already have a tool that does exactly Publish + Fetch with built-in auth, branching, merge semantics, and transport: **git**.

---

## The Git-Native Answer (Can Git Repos BE the Transport? How?)

### The Core Idea

Separate the **.mesh/ directory** into its own git repository — a dedicated "mesh repo" that holds only cross-squad coordination files. Each squad:

1. **Clones** the mesh repo once (setup).
2. **Pulls** on agent wake-up (fetch phase).
3. **Writes** to its own subdirectory only (write-partitioned, no conflicts).
4. **Commits and pushes** after work (publish phase).

The mesh repo is the "shared location." Git is both the transport and the sync protocol.

```
mesh-repo/                          <-- Hosted on GitHub / GitLab / any git server
+-- mesh.yaml                       <-- Squad directory (names, purposes, contact)
+-- boards/
|   +-- auth-squad.md               <-- Written only by auth-squad
|   +-- api-squad.md                <-- Written only by api-squad
|   +-- data-squad.md               <-- Written only by data-squad
+-- drops/
|   +-- 2026-03-14-auth-jwt-rotation.md
|   +-- 2026-03-14-api-rate-limits.md
+-- squads/
    +-- auth-squad/
    |   +-- state.md                <-- Mutable snapshot, written only by auth-squad
    |   +-- log.md                  <-- Append-only, written only by auth-squad
    +-- api-squad/
    |   +-- ...
    +-- data-squad/
        +-- ...
```

### Why This Works

**Write partitioning eliminates merge conflicts.** Each squad writes only to `boards/{self}.md`, `squads/{self}/*`, and `drops/{date}-{self}-*.md`. No two squads write to the same file. Git push/pull never conflicts. This isn't a convention we hope people follow — it's a structural property: the path contains the squad name.

**Git handles auth.** SSH keys, personal access tokens, GitHub App tokens, deploy keys — git's auth model is mature and understood. Cross-org access is a GitHub collaborator invitation or a deploy key. No new auth system.

**Git handles transport.** HTTPS or SSH. Works through corporate firewalls. Works from CI/CD. Works from developer laptops. Works from cloud VMs. No custom network infrastructure.

**Git handles offline.** If the network is down, the agent reads its last-pulled local copy. Stale context is better than no context. When connectivity returns, the next pull catches up.

**Git handles history.** Every state change is a commit. "What was auth-squad doing yesterday?" is `git log -- squads/auth-squad/state.md`. Free audit trail.

**GitHub/GitLab are universal.** Every developer org already has a git hosting platform. The mesh repo is "just another repo." No new infrastructure to deploy, monitor, or pay for.

### The Agent Lifecycle (Distributed)

```
Agent wakes up
  |
  +-- cd mesh-repo && git pull --rebase --quiet
  |   (fetch: get everyone's latest state)
  |
  +-- Read mesh.yaml            --> know who exists
  +-- Read boards/*.md          --> see current work / blockers
  +-- Scan drops/               --> cross-squad comms
  +-- Read squads/*/log.md      --> institutional memory
  |
  +-- [Do actual work in squad's own code repo]
  |
  +-- Update boards/{self}.md
  +-- Append to squads/{self}/log.md
  +-- Optionally write drops/{date}-{self}-{slug}.md
  |
  +-- git add -A && git commit -m "..." && git push
      (publish: share state with everyone)
```

**Seven file reads, three file writes, two git operations.** The distributed version adds exactly `git pull` and `git push` to the local-only design. Everything else is unchanged.

### What If Push Fails?

Git push can fail if someone else pushed first. But write partitioning means there are no content conflicts — only "your branch is behind." The fix is always:

```
git pull --rebase && git push
```

This is a 1-line retry. No merge resolution. No conflict handling. Write partitioning makes this structurally safe.

### Multi-Org Topology

For squads across organizations:

**Option A: Single shared repo.** All orgs collaborate on one mesh repo. Simplest. Works if orgs trust each other enough to share a repo. GitHub supports cross-org collaborators.

**Option B: Fork-based federation.** Each org forks the mesh repo. Squads push to their org's fork. A GitHub Action (or cron) opens PRs to sync between forks. More ceremony, but enforces org boundaries.

**Option C: Repo-per-org + aggregation.** Each org has its own mesh repo. A lightweight aggregator script clones all org mesh repos into a local `mesh/` directory. Agents read the aggregated view. Publish to own org repo only.

My recommendation: **start with Option A.** Cross-org collaboration already implies enough trust to share a repo. If orgs need hard boundaries, Option C is the fallback — and it's just a shell script that runs `git clone` N times.

---

## The Minimal Network Surface (Absolute Minimum Network Infrastructure)

What's the least network infrastructure needed for distributed squads?

### The Minimum: A Git Remote

**One git repository hosted somewhere all squads can reach.** That's it.

- GitHub.com — already exists, free for public/private repos
- Self-hosted GitLab/Gitea — for air-gapped or on-prem requirements
- Any git server — even a bare repo on a shared SSH host

No API servers. No message brokers. No sync daemons. No databases. No load balancers. No service discovery.

The "network surface" is:
- **One URL** (the mesh repo's clone URL)
- **Git protocol** (HTTPS or SSH, already supported everywhere)
- **Auth** (SSH keys or tokens, already provisioned for code repos)

### What About Real-Time?

There is no real-time. Agents are not persistent processes. They wake up, pull, work, push, exit. The "polling interval" is "whenever an agent runs." This is not a bug — it's the architecture. Real-time notification between non-persistent processes is a category error.

If someone wants notification when the mesh repo changes: **GitHub webhooks.** Configure a webhook that triggers a CI job, sends a Slack message, or pokes an agent. But this is optional infrastructure, not required infrastructure. The baseline works without it.

### What About Large Meshes?

Shallow clones. `git clone --depth 1` gives you latest state without history. `git pull --depth 1` stays shallow. A mesh repo with 50 squads has ~150 small markdown files. Even with full history, it's tiny. Git was designed to handle Linux kernel history. Your mesh repo will never be a bottleneck.

### What About Latency?

An agent reads the mesh state as of its last `git pull`. If another squad pushed 30 seconds ago, the agent sees it. If the push was 1 second after the pull, the agent doesn't see it until next time. This is eventual consistency with a convergence window of "how often agents run."

For most squad coordination, this is fine. Squads aren't making split-second decisions based on each other's state. They're sharing learnings, posting blockers, reading context. Stale-by-minutes is acceptable. Stale-by-days means agents aren't running — that's a different problem entirely.

---

## Trust Boundaries and Visibility (What Squads Share Publicly vs. Privately)

### The Three Tiers

Not everything a squad knows should be visible to all other squads. Trust maps naturally to file location:

**Tier 1 — Public (mesh repo):** What you're working on, what you've learned, what you need. This is the billboard. Any squad (or org) with repo access reads it.

- `boards/{squad}.md` — current work, blockers, offerings
- `drops/` — learnings, questions, heads-ups
- `squads/{squad}/log.md` — curated institutional memory

**Tier 2 — Private (squad's own repo):** Internal deliberation, draft decisions, task breakdowns, agent history, implementation details. Stays in the squad's code repo under `.squad/`. Never pushed to the mesh repo.

- `.squad/agents/*/history.md` — agent work logs
- `.squad/decisions/` — internal decision records
- `.squad/tasks/` — sprint/kanban tracking
- Source code, tests, configs

**Tier 3 — Negotiated (contracts directory in mesh repo):** API schemas, interface contracts, shared type definitions. These are agreements between specific squads. Lives in the mesh repo under a `contracts/` directory.

- `contracts/auth-api-squad-token-format.md`
- `contracts/data-api-squad-schema-v2.md`

### How Trust Boundaries Map to Git

| Tier | Where It Lives | Who Reads | Who Writes |
|------|---------------|-----------|------------|
| Public | Mesh repo | All squads | Each squad writes own files |
| Private | Squad's code repo | Only that squad | Only that squad |
| Negotiated | Mesh repo `/contracts/` | Parties to the contract | Parties to the contract |

This is elegant because **git's permission model IS the trust model.** Repo access = read trust. Write access (plus CODEOWNERS) = write trust. Branch protection = change control. Pull requests = negotiated changes.

### Cross-Org Trust

When squads span organizations:

- **Public mesh repo:** Readable by all orgs. Writeable by each squad to own subdirectory. Enforce with CODEOWNERS: `/squads/auth-squad/** @auth-org/auth-team`.
- **Private stays private:** Each org's internal repos are invisible to others. The trust boundary is the org's git hosting.
- **Negotiated contracts:** PRs against `/contracts/` require approval from both parties. Git's review workflow IS the negotiation protocol.

### What About Secrets?

The mesh repo should **never** contain secrets, credentials, or sensitive internal state. The trust model is:

- Mesh repo = things you'd say in a cross-team standup
- Private repo = things you'd say in your team's private channel
- If you wouldn't write it on a shared whiteboard, don't put it in the mesh repo

This isn't a limitation. It's a feature. The trust boundary is explicit and enforceable.

---

## What Changes from the Local-Only Design (And What Stays the Same)

### What Stays the Same (Almost Everything)

| Concept | Local-Only | Distributed | Change? |
|---------|-----------|------------|---------|
| Agent reads files at startup | Yes | Yes | **None** |
| Agent writes to own subdirectory | Yes | Yes | **None** |
| Billboard per squad | `boards/{squad}.md` | `boards/{squad}.md` | **None** |
| Drops for cross-squad comms | `drops/*.md` | `drops/*.md` | **None** |
| Squad state + log | `squads/{squad}/state.md`, `log.md` | Same paths | **None** |
| Write partitioning | Convention | Convention | **None** |
| mesh.yaml for discovery | Lists local paths | Lists squad names (paths are implicit) | **Minor** |
| File formats | Markdown + YAML | Markdown + YAML | **None** |

The agent's read/write interface is **identical.** An agent running in the distributed model reads and writes the exact same files, in the exact same format, at the exact same paths. It has no idea whether the other squad's files were placed there by a local write or a git pull from another continent.

### What Changes (Two Things)

**Change 1: The mesh directory is a separate git repo.**

In the local-only design, `.mesh/` lives inside the squad's code repo (or a shared parent directory). In the distributed design, the mesh is its own repo, cloned alongside the squad's code repo.

```
~/dev/
  my-squad-code/          <-- squad's code repo
    .squad/               <-- private squad state
    src/
    ...
  mesh/                   <-- mesh repo (separate clone)
    mesh.yaml
    boards/
    drops/
    squads/
```

The agent's prompt tells it where the mesh directory is. That's the only configuration change.

**Change 2: Agent lifecycle includes git pull/push.**

The agent's startup now begins with `git pull` in the mesh repo (fetch phase), and its shutdown includes `git commit && git push` (publish phase). This is two shell commands added to the agent lifecycle wrapper.

If the agent has no network access (air-gapped, offline), it reads the last-pulled state. Graceful degradation is built in.

### What We Don't Need

| Thing We Might Have Built | Why We Don't Need It |
|--------------------------|---------------------|
| REST API for state queries | Git pull gives you the state files. Read them. |
| Message broker for cross-squad events | Drops directory + git push. Eventual consistency. |
| Service discovery | mesh.yaml in the repo. Updated by adding a line. |
| Health checking endpoints | Read the board's timestamp. If stale, squad hasn't run. |
| WebSocket notifications | Agents aren't persistent. Nobody's listening. |
| Sync daemon / sidecar | Git pull at agent startup. No daemon needed. |
| Custom auth system | Git's auth (SSH keys, tokens). Already works. |
| Schema registry | Markdown files. The LLM parses them. |
| Conflict resolution logic | Write partitioning. No conflicts possible. |

### The One Sentence

> The distributed extension is: the `.mesh/` directory becomes its own git repo, and agent startup/shutdown includes `git pull` / `git push`.

Everything else — the file conventions, the agent interface, the trust model, the write partitioning, the operational semantics — is unchanged.

---

## Summary: The Distribution Stack

```
Layer 4: Agent reads/writes files          <-- UNCHANGED from local-only
Layer 3: .mesh/ directory conventions      <-- UNCHANGED from local-only
Layer 2: Git (pull on wake, push on exit)  <-- THE ONLY NEW THING
Layer 1: Git hosting (GitHub/GitLab)       <-- ALREADY EXISTS
```

**New concepts introduced: 1** (mesh directory is a separate repo).
**New infrastructure required: 0** (git hosting already exists).
**New protocols designed: 0.**
**New network services deployed: 0.**
**Lines of agent code changed: 2** (add `git pull` to startup, `git push` to shutdown).

### Self-Correction

> *In my protocol reality check, I designed a 4-layer protocol stack: git knowledge sharing, REST coordination hub, task cards, cross-org A2A. I now observe that layers 2-4 were solving distribution problems that git already solves. A REST hub is a centralized state store with an HTTP interface. A git repo with a hosting platform is a distributed state store with an HTTPS interface — plus auth, history, offline support, and merge semantics for free. I was reinventing git with more steps.*
>
> *The entire distribution problem reduces to: "put the coordination files in a shared repo." That's not an architecture. It's a README paragraph. Which is exactly the right size for a problem this simple.*

### Open Questions

1. **Garbage collection for drops.** Drops accumulate. When do old ones get archived or deleted? Proposal: a `drops/archive/` directory. Monthly cron moves drops older than 30 days. Or just let them accumulate — they're small markdown files.

2. **mesh.yaml governance.** Who adds new squads? Proposal: PR to mesh repo. Approval from any existing squad lead. Low ceremony.

3. **Mono-mesh vs. multi-mesh.** Does a 100-squad organization use one mesh repo or several? Proposal: one until it hurts. Partition by domain (platform-mesh, product-mesh) if needed. But this is a scale problem we don't have.

4. **Bootstrap.** How does a new squad join? Proposal: (a) clone mesh repo, (b) add entry to mesh.yaml, (c) create `boards/{self}.md` and `squads/{self}/`, (d) push. Four commands. Could be a shell script, but probably shouldn't be automated — joining a mesh is a deliberate act.

5. **What if a squad dies?** Its board goes stale. Other agents notice the timestamp. That's sufficient signal. If the squad is permanently dead, someone removes its entry from mesh.yaml via PR. The files remain in git history.

---

*Filed by Frink, Systems Engineer. The distribution problem is smaller than it looks. The answer was already in the toolchain.*
