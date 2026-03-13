# The Distributed Reality: When the Filesystem Isn't Shared

> **Author:** Burns (Lead Architect) | **Date:** 2026-03-16
> **Constraint:** Not all squads share the same filesystem or host.
> **Prior art:** "The filesystem IS the mesh" (Opus 4.6 consensus, 2026-03-13)

---

## The Distributed Reality (What Changes)

Our previous analysis was correct — and incomplete. "The filesystem IS the mesh" holds when squads share a filesystem. That's the happy path. The unhappy path is reality:

- Squad A is on a developer's laptop in Berlin
- Squad B runs in a GitHub Actions workflow in Azure US-East
- Squad C belongs to a partner org with their own repos, their own auth, their own everything
- Squad D is an open-source project that publishes a contract but will never show you its internals

`cat ../squad-b/SUMMARY.md` fails with "No such file or directory." Not because our architecture is wrong, but because the path doesn't exist on this machine. The file is real. It's just *somewhere else.*

**What doesn't change:**
- Agents still read files. That's the interface. An agent doesn't care if the file was written by a neighbor or arrived from Mars — it reads bytes from a path.
- Pull beats push. Agents wake up, read, work, write, exit. No persistent listener.
- Write partitioning still solves concurrency. Each squad writes to its own space.
- Eventual consistency is fine. Agents don't need real-time. They need *recent enough.*
- LLMs are still the relevance engine. No filtering heuristics needed.

**What changes:**
- Discovery can't assume `ls ../`. The mesh extends beyond the filesystem horizon.
- Reading requires *fetching* when the source is remote. "Read a file" becomes "ensure the file is here, then read it."
- Writing may need *publishing* — making local state available to squads that can't see your disk.
- Trust becomes explicit. Local squads see everything. Remote-trusted squads see what you share. Remote-opaque squads see only what you publish as a contract.

The filesystem is still the mesh. But some parts of the mesh need to be *materialized locally* before agents can read them.

---

## Three Zones of Communication

Not all squad relationships are equal. The communication mechanism should match the trust and proximity:

### Zone 1: Local (Same Host / Same Filesystem)

```
Squad A ←→ Squad B    via    ../squad-b/.mesh/
```

**Reality:** Both squads can `cat` each other's files. Zero transport needed.
**Trust:** Full visibility. You're on the same machine.
**Mechanism:** Direct filesystem reads. The original solution. Nothing to add.
**Latency:** Instant (milliseconds).

This is the common case for a developer running multiple squads on their laptop, or squads in the same monorepo. The Opus 4.6 analysis covers this completely.

### Zone 2: Remote-Trusted (Different Host, Same Org / Shared Auth)

```
Squad A (laptop) ←→ Squad B (CI runner)    via    git clone/pull
```

**Reality:** The files exist but aren't on your disk. You have credentials to get them. You share a git remote, a GitHub org, an auth boundary.
**Trust:** You can see internals — `.mesh/` state, logs, boards, drops. You just need transport.
**Mechanism:** Git. The files materialize via `git pull`. Once on disk, agents read them like local files.
**Latency:** Seconds to minutes. Bounded by sync frequency, not network speed.

This is squads in the same GitHub org on different machines, or CI squads that push results to a shared repo. The key insight: **git already does this.** A `git pull` turns a Zone 2 relationship into a Zone 1 relationship. The files appear on disk, the agent reads them, done.

### Zone 3: Remote-Opaque (Different Org / No Shared Auth / Published Interfaces Only)

```
Squad A (our org) ←→ Squad D (partner org)    via    published artifact
```

**Reality:** You can't see their `.mesh/` directory. You can't clone their repo. You don't share auth. They publish a contract — an API spec, a SUMMARY, a capability manifest — and you consume it.
**Trust:** You see only what they choose to expose. Their internals are invisible by design.
**Mechanism:** Published artifacts. They put a file somewhere you can fetch it — a public git repo, a URL, an artifact registry. You pull it into your local `.mesh/remotes/`.
**Latency:** Minutes to hours. Acceptable because cross-org coordination is inherently slower.

This is the hardest zone. It's also the rarest in early adoption. Most squads start local (Zone 1), grow to multi-host within an org (Zone 2), and only much later need cross-org federation (Zone 3).

### The Zone Map

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│   Zone 1: LOCAL                                     │
│   ┌─────────┐  ┌─────────┐  ┌─────────┐           │
│   │ Squad A │──│ Squad B │──│ Squad C │           │
│   └─────────┘  └─────────┘  └─────────┘           │
│        Direct filesystem reads                      │
│                                                     │
│ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │
│                                                     │
│   Zone 2: REMOTE-TRUSTED (git pull)                 │
│   ┌─────────┐           ┌─────────┐               │
│   │ Squad D │───git────│ Squad E │               │
│   │ (CI)    │           │ (cloud) │               │
│   └─────────┘           └─────────┘               │
│                                                     │
└─────────────────── org boundary ────────────────────┘
          │
          │ published artifacts only
          ▼
┌─────────────────────────────────────────────────────┐
│   Zone 3: REMOTE-OPAQUE                             │
│   ┌─────────┐                                       │
│   │ Squad F │  (partner org — sees contract only)   │
│   └─────────┘                                       │
└─────────────────────────────────────────────────────┘
```

---

## The AI-Native Distributed Answer (Simple, But Honest About Network)

The answer stays the same. One addition:

> **Agents read files. Some files need to arrive first.**

That's the entire distributed extension. Not a protocol. Not a service mesh. A *materialization step* before the read phase.

### The Agent Lifecycle (Updated)

```
Agent wakes up
  │
  ├─ SYNC phase (new): Materialize remote state into local filesystem
  │    ├─ Zone 1 peers: nothing to do (already on disk)
  │    ├─ Zone 2 peers: git pull (or equivalent)
  │    └─ Zone 3 peers: fetch published artifacts
  │
  ├─ READ phase (unchanged): Read .mesh/ — all files now local
  │
  ├─ WORK phase (unchanged): Do the task
  │
  ├─ WRITE phase (unchanged): Update own billboard, log, drops
  │
  └─ PUBLISH phase (new): Push local state to make it available to remote peers
       ├─ Zone 1 peers: nothing to do (they can already read it)
       ├─ Zone 2 peers: git push
       └─ Zone 3 peers: publish artifacts to agreed location
```

Two new phases: SYNC (before read) and PUBLISH (after write). Both are **transport only** — they move files between machines. They don't change what the files contain or how agents interpret them.

### Why This Stays Simple

The distributed version doesn't add concepts. It adds *plumbing.* The mesh is still files. The agent still reads them. The four primitives (drops, feeds, billboards, mesh file) don't change. The only question is: "how do those files get here?"

And the answer is: the same way every other file gets around in software. Git. Or a fetch. That's it.

---

## Core Primitives (Minimum for Cross-Host Sharing)

### Primitive 1: The Mesh File (Extended)

The original `mesh.yaml` listed squad names and local paths. For distributed, it needs one more field: *where to get the files from.*

```yaml
# mesh.yaml — extended for distributed squads
squads:
  # Zone 1: Local — path exists on this machine
  - name: auth-squad
    path: ../auth-squad/.mesh
    zone: local

  # Zone 2: Remote-trusted — same org, needs git sync
  - name: ci-squad
    zone: remote-trusted
    source: git@github.com:our-org/ci-squad.git
    ref: main
    sync_to: .mesh/remotes/ci-squad    # where to materialize

  # Zone 3: Remote-opaque — different org, published contract only
  - name: partner-auth
    zone: remote-opaque
    source: https://partner.dev/squad-contracts/auth/SUMMARY.md
    sync_to: .mesh/remotes/partner-auth
```

Three fields added: `zone`, `source`, `sync_to`. That's the entire distributed discovery extension.

**What `sync_to` does:** It's the local directory where remote files land. Once synced, `cat .mesh/remotes/ci-squad/boards/ci-squad.md` works exactly like `cat ../auth-squad/.mesh/boards/auth-squad.md`. The agent doesn't know or care about the zone. It reads a local path.

### Primitive 2: The Sync Script

A thin script (not a framework) that reads `mesh.yaml` and materializes remote state:

```bash
#!/bin/bash
# sync-mesh.sh — materialize remote squad state locally

# For each remote-trusted squad: git clone/pull
for squad in $(yq '.squads[] | select(.zone == "remote-trusted") | .name' mesh.yaml); do
  source=$(yq ".squads[] | select(.name == \"$squad\") | .source" mesh.yaml)
  target=$(yq ".squads[] | select(.name == \"$squad\") | .sync_to" mesh.yaml)
  
  if [ -d "$target/.git" ]; then
    git -C "$target" pull --quiet
  else
    git clone --quiet --depth 1 "$source" "$target"
  fi
done

# For each remote-opaque squad: fetch published contract
for squad in $(yq '.squads[] | select(.zone == "remote-opaque") | .name' mesh.yaml); do
  source=$(yq ".squads[] | select(.name == \"$squad\") | .source" mesh.yaml)
  target=$(yq ".squads[] | select(.name == \"$squad\") | .sync_to" mesh.yaml)
  
  mkdir -p "$target"
  curl --silent "$source" -o "$target/SUMMARY.md"
done
```

**~20 lines of bash.** Not an SDK. Not a service. A script that runs before the agent reads files.

### Primitive 3: The Published Contract

For Zone 3 (remote-opaque) squads, you can't share your `.mesh/` internals. You publish a **contract** — the subset of your state that outsiders may see:

```
.mesh/published/
  └── SUMMARY.md        # What we do, what we decided, what we need
  └── INTERFACES.md     # Our APIs, schemas, contracts others depend on
```

This is the *minimum readable surface* for an opaque squad. One or two markdown files. The consuming squad fetches them into `.mesh/remotes/{name}/` and reads them like any other file.

**What a contract does NOT include:** Internal state, logs, drops, billboards, agent history, decisions-in-progress, blockers. That's internal. The contract is what you'd put on a public README.

### Primitive 4: The Publish Step

After the agent finishes work, if it's in a shared repo:

```bash
git add .mesh/{my-squad}/
git commit -m "squad: update mesh state"
git push
```

If it publishes a contract for opaque consumers:

```bash
cp .mesh/{my-squad}/SUMMARY.md .mesh/published/SUMMARY.md
# deploy/upload to wherever Zone 3 consumers fetch from
```

That's the PUBLISH phase. Git push or file copy.

---

## The Transport Question (Git? HTTP? What Would Agents Choose?)

### Git Wins for Zone 2

Git is the right transport for remote-trusted (same org) squads. Not because it's perfect, but because:

1. **Already authenticated.** If you can clone a repo, you can sync mesh state. No new auth.
2. **Already distributed.** Git is a content-addressed distributed database with merge semantics. We don't need to build one.
3. **Already versioned.** Full audit trail for free. Who changed what, when.
4. **Already available.** Every development machine and CI runner has git. Zero new dependencies.
5. **Agents already use it.** `git commit && push` is in every agent workflow. It's not a new operation.

**Git limitations (acknowledged, not solved):**
- Requires connectivity at sync time (offline = stale data, which is fine for eventual consistency)
- Auth setup per squad (SSH keys, tokens) — annoying but one-time
- Not suitable for large binary state (but mesh state is markdown — tiny)
- Push conflicts if two agents update the same branch simultaneously

**Push conflict mitigation:** Each squad writes only to `.mesh/{its-own-name}/`. Write partitioning means conflicts are structurally impossible *within* the mesh directory. The only risk is two instances of the *same* squad running concurrently — which is a scheduling problem, not a transport problem.

### HTTP/Fetch Works for Zone 3

For opaque squads, the transport is "however they publish their contract." Could be:
- A public git repo (just the published/ directory)
- A raw URL (S3 bucket, static site, CDN)
- An artifact registry (npm, OCI)
- A GitHub Release asset

The consuming squad doesn't care. It fetches a URL, gets a file, reads it. `curl` or `git clone` — both produce a file on disk.

### What We Don't Need

- **WebSockets / real-time sync:** Agents aren't persistent. They wake up, sync, work, publish, exit. Real-time has no listener.
- **Message queues:** Drops are files, not messages. Files on disk are already persistent. No delivery guarantee needed beyond "the file is there."
- **Service discovery (DNS, mDNS, Consul):** `mesh.yaml` is the registry. It's a file. Agents read it.
- **gRPC / REST APIs:** Wrapping file reads in an API adds a network hop, a server to maintain, and a dependency. The file is the API.
- **MCP federation / A2A protocol:** These solve agent-to-agent *negotiation* — capability exchange, protocol versioning, schema validation. Our agents don't negotiate. They read each other's logs. If we need negotiation later, it's a Zone 3 concern and we'll add it then.

---

## How It Feels In Practice (Concrete Cross-Host Examples)

### Example 1: Developer Laptop + CI Squad (Zone 1 + Zone 2)

You're an auth-squad agent on a developer's laptop. Your mesh has:
- `api-squad` — local, same machine (Zone 1)
- `ci-squad` — runs in GitHub Actions, pushes results to a shared repo (Zone 2)

```
mesh.yaml:
  squads:
    - name: api-squad
      path: ../api-squad/.mesh
      zone: local
    - name: ci-squad
      zone: remote-trusted
      source: git@github.com:our-org/ci-results.git
      sync_to: .mesh/remotes/ci-squad
```

**Agent wakes up:**
1. **SYNC:** `git pull` into `.mesh/remotes/ci-squad/` — 2 seconds
2. **READ:** 
   - `cat ../api-squad/.mesh/boards/api-squad.md` — local, instant
   - `cat .mesh/remotes/ci-squad/boards/ci-squad.md` — local (just synced)
   - Both look identical to the agent. It doesn't know one was remote.
3. **WORK:** Implements JWT rotation. Notices ci-squad's board says "auth tests flaky — 3 failures in last 5 runs." Adjusts approach.
4. **WRITE:** Updates own billboard, appends to log, writes a drop about the JWT change.
5. **PUBLISH:** `git push` — makes state available to ci-squad next time it syncs.

**Total overhead vs. pure-local:** One `git pull`, one `git push`. Everything else identical.

### Example 2: Two Orgs Collaborating (Zone 2 + Zone 3)

Your org's `payment-squad` integrates with a partner's `fraud-detection-squad`. You can't see their internals.

```
mesh.yaml:
  squads:
    - name: payment-squad
      path: ./.mesh
      zone: local
    - name: partner-fraud
      zone: remote-opaque
      source: https://partner-api.example.com/squad-contract/fraud-detection/SUMMARY.md
      sync_to: .mesh/remotes/partner-fraud
```

**Agent wakes up:**
1. **SYNC:** `curl` fetches partner's published SUMMARY.md — lands in `.mesh/remotes/partner-fraud/SUMMARY.md`
2. **READ:** Reads the contract. It says:
   ```
   ## Decisions That Affect Others
   - Risk scoring v3 API deprecated April 15. Use v4.
   - New field `device_fingerprint` required on all /assess calls.
   ```
3. **WORK:** Adds `device_fingerprint` to payment flow before the deadline.
4. **WRITE:** Updates own billboard noting the migration.
5. **PUBLISH:** Pushes own state. Partner can't see it (Zone 3 is one-way unless you also publish a contract).

**What the agent sees:** A markdown file with decisions. It doesn't know or care that it came from a different company. It reads the file. It acts on the content.

### Example 3: Ephemeral CI Squad Reports to Persistent Team (Zone 2)

A CI runner spins up, runs tests, needs to tell the team what happened. Dies after 10 minutes.

**CI agent workflow:**
1. `git clone` the shared mesh repo (or sparse checkout just `.mesh/`)
2. Runs tests, writes results to `.mesh/ci-squad/boards/ci-squad.md`
3. Appends failures and timings to `.mesh/ci-squad/log.md`
4. `git push`
5. Process exits. Squad is gone.

**Next day, auth-squad agent wakes up:**
1. `git pull` — CI squad's latest results appear in `.mesh/remotes/ci-squad/`
2. Reads board: "3 test failures in auth module. Stack traces below."
3. Fixes the tests.

The CI squad doesn't need to be running. It doesn't need to be alive. It wrote files to git. The files persist. Other agents read them when they're ready. **The transport (git) gives ephemeral squads permanence.**

### Example 4: Three Squads, Three Machines, One Shared Repo (Zone 2)

The simplest distributed setup: a shared git repo that holds only `.mesh/`.

```
github.com/our-org/squad-mesh-state/
  .mesh/
    mesh.yaml
    boards/
      auth-squad.md
      api-squad.md
      data-squad.md
    drops/
      2026-03-16-auth-squad-jwt-change.md
    auth-squad/
      log.md
    api-squad/
      log.md
    data-squad/
      log.md
```

Each squad on its own machine:
- **Before work:** `git pull`
- **After work:** `git add .mesh/{my-name}/ && git commit && git push`

Write partitioning ensures no merge conflicts. Each squad writes only to its own directories and its own board. Drops are append-only files with unique names (date + squad + slug).

**What this gives you:** A distributed mesh with the same file-reading agent behavior as the local case. The "distributed systems" layer is literally `git pull` and `git push`.

---

## What Burns Would Ship

### Phase 0: Convention Only (0 lines of code)

Document the zones. Document `mesh.yaml` with `zone`, `source`, `sync_to`. Tell squads to `git pull` before reading and `git push` after writing. Put it in the README.

This works for 2-10 squads across 2-3 machines. No tooling needed.

### Phase 1: A Sync Script (30 lines of bash)

When Phase 0's manual `git pull` gets tedious, write the sync script from the primitives section. It reads `mesh.yaml`, materializes remotes, done. Run it as a pre-step in the agent's workflow.

### Phase 2: Published Contracts (When a Zone 3 partner appears)

Only when a concrete cross-org need exists. Define the contract format (SUMMARY.md + INTERFACES.md). Add `curl`-based fetch to the sync script. ~10 more lines.

### Phase 3: Never (unless proven wrong)

Don't build: MCP federation, A2A negotiation, service discovery, message queues, real-time sync, capability exchange protocols. If we need these, we'll know because Phase 0-2 will have specific, measurable failures that point at specific, measurable solutions.

---

## The Honest Caveats

**1. Auth is real work.** Git auth across machines isn't trivial. SSH keys, deploy tokens, PATs — all annoying. But it's *git's* problem, not ours. We don't reinvent auth. We use git's.

**2. Sync frequency is a tuning knob.** How often do you `git pull`? Every agent run? Every hour? On a cron? This matters for freshness. But "how often to sync" is an operational decision, not an architectural one. Default: sync at agent start. Override: whenever it hurts.

**3. Git push conflicts *can* happen.** If two machines push simultaneously to the same branch, one gets a merge conflict. Mitigations:
   - Write partitioning (each squad → own files) eliminates content conflicts
   - Pull-before-push catches branch conflicts
   - Worst case: retry after pull. Not elegant, but functional.

**4. Zone 3 is inherently lossy.** You only see what they publish. If they stop publishing, you see stale data. If they change their contract URL, you break. This isn't a bug — it's the nature of cross-org trust boundaries. You solve it with communication (human-to-human), not protocols.

**5. This doesn't scale to 1000 squads.** The shared git repo approach has a ceiling. At some point, you need selective sync, topic-based namespacing, or regional mesh repos. But that's a Phase 3+ problem. Build for the scale you have.

---

## The Verdict

The filesystem is still the mesh. For distributed squads, add a materialization step: **bring the files here, then read them.** Git is the transport for trusted peers. Published contracts are the interface for opaque peers. The distributed extension to our architecture is:

1. Three fields in `mesh.yaml` (`zone`, `source`, `sync_to`)
2. A sync script that runs before agents read (~30 lines)
3. A publish step that runs after agents write (`git push`)
4. A contract convention for opaque peers (SUMMARY.md)

No new protocols. No new services. No new concepts. Just: *the files might need to travel before the agent can read them.*

> **The one-sentence version:** "The filesystem is the mesh, and git is how the mesh crosses machine boundaries."
