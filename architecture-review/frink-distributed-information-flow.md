# Distributed Information Flow — When `.mesh/` Crosses Machine Boundaries

> **Author:** Frink (Systems Engineer)
> **Date:** 2026-03-13
> **Status:** Extends [frink-information-flow.md](./frink-information-flow.md). That analysis assumed all squads share a filesystem. This one doesn't.
> **Prior conclusion:** 2 file types, 3 operations, git is replication.
> **New constraint:** Squads may be on different machines, different networks, different orgs.

---

## The Distribution Problem

My previous analysis was correct — and incomplete. I said "the agent reads a file" and "git handles the rest." Both true on one machine. But here's the constraint I waved away:

**An agent on machine A cannot read files on machine B.**

The `.mesh/` directory convention works because it's local. `glob .mesh/*/state.md` returns results because those files exist on the local filesystem. When squad-auth is on machine A and squad-api is on machine B, machine A's `.mesh/` doesn't contain `squad-api/state.md`. The glob returns nothing. The agent doesn't know squad-api exists.

I wrote "git push is the broadcast, git pull is the receive." True — but I didn't specify *what* gets pushed *where*, *who* pulls *from whom*, or what happens when "whom" is behind a firewall in a different organization. "Git handles it" is an architecture that works when a human is in the loop running git commands with the right remotes configured. It's not a design. It's a wish.

Here's what "read a file" actually requires across hosts:

```
LOCAL:    agent → filesystem → file contents ✓

REMOTE:   agent → filesystem → ??? → network → auth → remote filesystem → file contents
                               ^
                               This gap is the entire problem.
```

The agent interface doesn't change. The agent still reads local files. The question is: **how do remote files become local files?**

---

## Sync vs. Fetch vs. Publish

There are exactly three strategies for making remote files appear locally. Every distributed system picks one (or a combination). Let me evaluate each against our constraints.

### Strategy 1: Sync (Full Replication)

Every participant has a complete copy of all mesh state. Changes propagate to all copies.

```
Machine A:  .mesh/  ←──sync──→  .mesh/  :Machine B
              ↕                    ↕
            .mesh/  ←──sync──→  .mesh/  :Machine C
```

**How it works:** One shared git repo. Everyone clones it. `git pull` gets everyone's state. `git push` broadcasts your state. The repo IS the mesh.

**Pros:**
- Reads are always local and fast — everything is already on disk
- Works offline — you have the full snapshot from last sync
- Git already does this. No new infrastructure
- Every agent sees the same picture (after sync)

**Cons:**
- Everyone sees everything — no selective visibility within a repo
- Requires all participants to have push access to one repo
- Doesn't work across trust boundaries (org A can't push to org B's repo)
- Sync frequency is manual or needs a trigger (who runs `git pull`?)

**Verdict:** This is the right answer for **same-org, same-trust-boundary** squads. It's literally what my previous analysis described as "Option B — Dedicated repo." For single-org distribution, stop here. You're done.

### Strategy 2: Fetch (On-Demand Pull)

Each participant pulls only what it needs, when it needs it.

```
Machine A:  .mesh/squad-a/ (local)
            .mesh/squad-b/ ← fetched from Machine B's repo on read
            .mesh/squad-c/ ← fetched from Machine C's repo on read
```

**How it works:** Agent needs to read squad-b's state. A fetch layer intercepts, pulls the file from squad-b's published location (git repo, HTTP URL, etc.), writes it locally, then the agent reads it normally.

**Pros:**
- Minimal local storage — only what you've requested
- Each squad controls their own publication (no shared write access needed)
- Works across trust boundaries (read-only access to remote repos)

**Cons:**
- Requires network access at read time — offline reading only shows stale data
- Needs a registry of "where is each squad published?" (URL somewhere)
- More complex than full sync — extra layer between agent and filesystem

**Verdict:** Needed for **cross-org** visibility, but not for same-org. A squad in org-B doesn't push to org-A's repo. Instead, org-A fetches from org-B's published mesh repo.

### Strategy 3: Publish (Push to Shared Surface)

Each squad publishes its state to a known location. Readers go to that location.

```
Squad A → publishes to → shared surface (GitHub repo, S3 bucket, HTTP endpoint)
Squad B → publishes to → shared surface
Reader  → pulls from   → shared surface
```

**How it works:** Each squad pushes its `state.md` and `log.md` to a well-known location. Could be a git repo they have write access to, a branch they own, or a publicly accessible URL.

**Pros:**
- Publisher controls what they share (selective visibility)
- Shared surface can be read-only for consumers
- Works for public/open-source mesh scenarios

**Cons:**
- Requires a shared surface everyone agrees on
- Two-step: publish to surface, then pull from surface to local
- More moving parts than sync

**Verdict:** This is actually what Strategy 1 (Sync) does — everyone publishes to the same git repo. The distinction matters only when you CAN'T share a single repo. For cross-org, publishing to your own repo and letting others fetch is the pattern.

### The Combination

For distributed squads across trust boundaries, you need **Sync within trust boundary + Fetch across trust boundaries:**

| Relationship | Strategy | Mechanism |
|---|---|---|
| Same machine | Filesystem | Shared `.mesh/` directory |
| Same org, different machines | Sync | Single git repo, everyone clones |
| Different orgs, trust established | Fetch | Clone their mesh repo read-only |
| Different orgs, no trust | Nothing | You can't see them. That's correct. |

---

## The Git-Native Answer

Git is the transport layer. Not HTTP. Not MCP. Not A2A. Git.

Here's exactly how it works, for each distribution scenario.

### Scenario 1: Same Org, Multiple Machines

**Setup (once):**
1. Create a mesh repo: `github.com/our-org/mesh.git`
2. Each machine clones it: `git clone git@github.com:our-org/mesh.git .mesh`
3. Each squad creates its directory: `mkdir .mesh/{my-squad-name}`

**Write (after each work session):**
```bash
cd .mesh
# Write your state
echo "..." > my-squad/state.md
echo "..." >> my-squad/log.md
# Publish
git add my-squad/
git commit -m "my-squad: state update"
git pull --rebase
git push
```

**Read (at session start):**
```bash
cd .mesh
git pull
# Now .mesh/*/state.md is up to date
```

**That's it.** The mesh repo is a git repo. Push is publish. Pull is subscribe. Branch protection can enforce write partitioning (squad-a can only push changes to `squad-a/`). Merge conflicts are structurally impossible because each squad writes only to its own directory.

### Scenario 2: Different Orgs, Mutual Visibility

Org Alpha has `github.com/alpha-org/mesh.git`. Org Beta has `github.com/beta-org/mesh.git`. They want to see each other.

**Setup (once):**
```bash
# You already have your org's mesh cloned at .mesh/
# Add the remote org's mesh as a separate clone:
git clone git@github.com:beta-org/mesh.git .mesh-remote/beta-org
```

**Sync script (`mesh sync`):**
```bash
# Sync your org's mesh
cd .mesh && git pull && cd ..
# Sync remote orgs
for remote in .mesh-remote/*/; do
  cd "$remote" && git pull && cd ../..
done
```

**The directory structure on disk:**
```
project/
├── .mesh/                       ← your org's mesh (read-write)
│   ├── your-squad/
│   │   ├── state.md
│   │   └── log.md
│   ├── colleague-squad/
│   │   ├── state.md
│   │   └── log.md
│   └── .remotes                 ← file listing remote mesh repo URLs
├── .mesh-remote/                ← remote orgs' meshes (read-only)
│   └── beta-org/
│       ├── their-squad-x/
│       │   ├── state.md
│       │   └── log.md
│       └── their-squad-y/
│           ├── state.md
│           └── log.md
```

**Agent read pattern:**
```
glob .mesh/**/state.md           ← your org's squads
glob .mesh-remote/**/state.md    ← remote orgs' squads (if configured)
```

Or, if you want one unified view, `mesh sync` can symlink remote squad directories into `.mesh/`:
```
.mesh/
├── your-squad/                  ← real directory (read-write)
├── colleague-squad/             ← real directory (read-write via git)
├── @beta-org/                   ← symlink or copy (read-only)
│   ├── their-squad-x/
│   └── their-squad-y/
```

The `@` prefix convention signals "this is a remote org." The agent can read it the same way. The glob `**` handles the extra nesting.

### Scenario 3: One-Way Visibility (Public Mesh)

An org publishes their mesh repo as public. Anyone can clone and read. Nobody outside can push.

**This already works.** Public GitHub repos are publicly cloneable. A squad that wants to observe an open-source project's mesh state just clones their mesh repo. No auth, no negotiation, no trust handshake. `git clone` is the subscription.

### What About GitHub Auth?

Git remotes use SSH keys or HTTPS tokens for auth. This is already solved infrastructure:

| Access Type | Auth Mechanism | Who Configures It |
|---|---|---|
| Same org | Org membership + SSH key | Already done if you can push code |
| Cross-org invited | Collaborator invite or deploy key | One-time GitHub UI action |
| Public | None | `git clone` with HTTPS |

No new auth layer needed. Git auth IS the auth layer. If you can `git clone` a repo, you can read its mesh. If you can't, you can't. The access boundary is the git permission boundary.

---

## The Minimal Network Surface

What is the absolute minimum network infrastructure needed?

### For Same-Org Distribution: Zero

Not "almost zero." **Zero.**

You need:
- A git hosting service (you already have one — you're writing code)
- A git repo (one `git init` + `git remote add`)
- SSH or HTTPS auth (you already have this — you're pushing code)

No servers. No APIs. No running processes. No ports to open. No DNS entries. No TLS certificates (beyond what git hosting provides). No docker containers. No cloud services.

The mesh repo is just another repo in your org. It's hosted where your code is hosted. It uses the same auth. The same CI/CD can trigger on pushes to it if you want automation.

### For Cross-Org Distribution: Still Zero New Infrastructure

You need:
- Read access to the other org's mesh repo (a GitHub collaborator invite or a public repo)
- A local clone of their repo
- A sync script that runs `git pull` on it

No federation servers. No A2A endpoints. No capability negotiation services. No discovery APIs.

### The Automation Question

"Who runs `git pull`?" is the real infrastructure question. Options, from zero to minimal:

1. **The agent does it.** Before reading mesh state, the agent runs `git pull` in the mesh directory. This is a shell command. Agents can run shell commands. Done.

2. **A cron job / scheduled task.** `*/5 * * * * cd /path/to/.mesh && git pull` — mesh state refreshes every 5 minutes. No agent involvement.

3. **A git hook.** On the mesh repo, a post-receive hook triggers a webhook. The webhook triggers... what? There's no server to receive it. So this only works if you have CI/CD that can write to your local filesystem (GitHub Actions + self-hosted runner, for example).

4. **GitHub Actions as automation.** A workflow that runs on push to the mesh repo and triggers... nothing useful unless you're cloud-based. But for cloud squads (Codespaces, cloud VMs), the Action could be the sync mechanism.

**My recommendation: Option 1.** The agent runs `git pull` as part of its startup. This is one line of shell. It requires no infrastructure, no scheduled tasks, no hooks. The staleness window is "since the agent last woke up," which is acceptable because agents process asynchronously anyway.

If staleness becomes painful (agents running continuously, needing fresher data), graduate to Option 2. But earn that complexity.

---

## Trust Boundaries and Visibility

### The Trust Model

Trust is binary per mesh repo: **you can clone it, or you can't.**

There is no partial visibility within a mesh repo. If you can clone `github.com/alpha-org/mesh.git`, you can see all squads in alpha-org's mesh. If alpha-org wants to hide some squads from you, they put those squads in a different (private) mesh repo.

```
alpha-org/
├── mesh-public.git          ← public mesh: anyone can see
│   ├── open-source-squad/
│   └── docs-squad/
├── mesh-internal.git        ← internal mesh: org members only
│   ├── core-api-squad/
│   ├── auth-squad/
│   └── infra-squad/
└── mesh-partner.git         ← partner mesh: alpha + invited partners
    ├── integration-squad/
    └── shared-api-squad/
```

Each mesh repo is a trust boundary. You subscribe to the ones you have access to. The `.remotes` file lists them:

```
# .mesh/.remotes
# Lines: <name> <git-url> <trust-level>
alpha-internal  git@github.com:alpha-org/mesh-internal.git   own
alpha-partner   git@github.com:alpha-org/mesh-partner.git    own
beta-public     https://github.com/beta-org/mesh-public.git  external
gamma-partner   git@github.com:gamma-org/mesh-partner.git    partner
```

Trust levels are advisory labels for the reading agent, not access controls:
- `own` — this is our org's mesh, we write to it
- `partner` — negotiated cross-org access, generally trusted
- `external` — public or loosely-coupled, treat as informational

The agent sees trust level when reading. It can weight information accordingly ("squad-x says the API is stable, but they're `external` — verify independently").

### Negotiating Cross-Org Access

How does org A get access to org B's mesh?

1. **Org B makes their mesh repo public.** Done. Org A clones it.
2. **Org B invites org A as a collaborator** on their mesh repo (read-only). Standard GitHub flow.
3. **Both orgs create a shared mesh repo** that both have write access to. This is the "partner mesh" pattern.

No protocol negotiation. No capability exchange. No A2A handshake. Git repository permissions ARE the trust negotiation. The conversation is:

> "Hey, can you add our bot account as a read-only collaborator on your mesh repo?"
> "Sure, done."

That's the federation protocol.

### What About Sensitive Information in State Files?

If squad-auth's `state.md` says "Working on fixing the token validation bypass vulnerability" — should that be visible to external orgs?

**Answer: write accordingly.** State files in a partner-visible mesh repo should contain what you'd put in a shared Slack channel. State files in an internal mesh repo can be more candid. This is the same judgment humans make about what to write where. Agents can make it too, especially if their charter says "the partner mesh is visible to external orgs."

The architecture doesn't solve information classification. It provides the containers (separate repos for different audiences) and lets humans/agents decide what goes where.

---

## What Changes from Local-Only

### What Changes

| Aspect | Local-Only | Distributed |
|---|---|---|
| `.mesh/` location | Shared parent directory | Git repo, cloned per machine |
| Read freshness | Instant (filesystem) | Last `git pull` (seconds to minutes stale) |
| Write broadcast | Instant (filesystem) | `git push` (requires network, can fail) |
| Discovery | `ls .mesh/` | `ls .mesh/` + `ls .mesh-remote/*/` |
| Cross-org visibility | N/A (one org) | Clone remote mesh repos (read-only) |
| Auth | Filesystem permissions | Git auth (SSH keys, tokens) |
| New files | `.remotes` file listing repo URLs | None otherwise |
| New commands | `mesh sync` does `git pull` on all remotes | Agent can do this directly |

### What Stays the Same

| Aspect | Still True |
|---|---|
| Agent interface | Read local files. Always. |
| File types | `state.md` (mutable) + `log.md` (append-only) |
| Operations | Read, write, discover — files on disk |
| Write partitioning | Each squad writes only to its own directory |
| No running servers | Git hosting is the only infrastructure |
| No schemas | Markdown. LLM reads it. |
| No protocols | Git push/pull. That's the protocol. |
| Conflict avoidance | Write partitioning makes conflicts structurally impossible |
| LLM is relevance engine | Agent scans files, determines what matters |

### The One New Concept: `.remotes`

The only new artifact is a `.remotes` file in the mesh directory. It lists git repo URLs to pull from. This is the equivalent of `/etc/hosts` — a flat file that maps names to addresses.

```
# .mesh/.remotes — one line per remote mesh
# Format: <name> <git-url> [trust-level]
our-org   git@github.com:our-org/mesh.git       own
partner   git@github.com:partner-org/mesh.git   partner
oss-proj  https://github.com/oss-org/mesh.git   external
```

`mesh sync` reads this file and does `git pull` on each. An agent can do it too. The file is optional — if it doesn't exist, you have a single-repo mesh. Local-only still works with zero configuration.

---

## Summary: The Thinnest Possible Layer

The distribution layer is:

1. **A git repo per trust boundary** (your org's mesh, partner mesh, public mesh)
2. **A `.remotes` file** listing which repos to pull from
3. **`git pull` before reading, `git push` after writing**

That's the entire distributed mesh architecture. No servers. No APIs. No new protocols. No running infrastructure. Git is the transport, the auth layer, the sync mechanism, and the audit log.

The agent interface is unchanged: read `.mesh/**/state.md`, write `.mesh/{my-name}/state.md`, discover via `ls`. The only difference is that before reading, you might need to `git pull`. That's one shell command.

### Updated Count

**Previous (local-only):**
- 1 directory convention, 2 file types, 3 operations, 2 optional CLI commands

**Distributed:**
- 1 directory convention, 2 file types + 1 config file (`.remotes`), 3 operations + 1 sync operation (`git pull`), 2 optional CLI commands

The distribution tax is: **one flat file and one git command.**

### What I'm NOT Building

- ❌ Federation protocol (git push/pull IS federation)
- ❌ Discovery service (`.remotes` file + `ls` IS discovery)
- ❌ Auth system (git auth IS the auth system)
- ❌ Capability negotiation (you can read the files or you can't)
- ❌ A2A endpoints (no running servers)
- ❌ MCP federation layer (no running servers)
- ❌ HTTP APIs (no running servers)
- ❌ Schema versioning (markdown doesn't have a schema)
- ❌ Message delivery guarantees (files are there after pull, or they're not)
- ❌ Real-time sync (agents are asynchronous; eventual consistency via `git pull` is correct)

Every one of these was in my original protocol analysis. Every one is unnecessary. The distribution problem is a git problem, and git already solved it.

— Frink
