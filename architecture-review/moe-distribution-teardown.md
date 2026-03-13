# Moe's Distribution Teardown: Round Two

> **Agent:** Moe — Skeptic / Critic
> **Date:** 2026-03-14
> **Context:** Last round demolished everything. "cat SUMMARY.md is the whole system." The user counters: not all squads are on the same machine. How much complexity earns its way back?

---

## The Wall We Hit (why local-only breaks for distributed squads)

I said `cat ../*/.squad/SUMMARY.md` is the whole system. I was right. And now I'm wrong.

The entire teardown rested on one load-bearing assumption: **every squad directory is reachable via a filesystem path.** That's not an incidental detail. It's the foundation of every "zero lines of code" claim I made:

- "Discovery is `glob('**/.squad')`" — only if the directories exist locally
- "The filesystem IS the mesh" — only if the filesystem contains the mesh
- "Pull, don't push" — only if there's something local to pull from
- "`find ~/dev -name SUMMARY.md`" — finds exactly nothing for Squad B on Bob's CI server

When Squad A is on Alice's laptop and Squad B is on Bob's CI server, `fs.readFileSync` throws ENOENT. Not eventually. Immediately. My beautiful zero-line solution doesn't degrade gracefully — it returns empty. Total blindness. I flagged this in my own stress test (Decision 11, history.md entry 2026-03-13) and then pretended it didn't matter because "8 squads on C:\dev today."

**The specific break points:**

| Operation | Local (works) | Distributed (breaks) |
|-----------|--------------|---------------------|
| Discovery | `ls ../*/.squad/` | Directory doesn't exist |
| Read status | `cat ../squad-b/.squad/SUMMARY.md` | File doesn't exist |
| Read learnings | `grep ../squad-b/.squad/log.md` | File doesn't exist |
| Write drop | `echo > .mesh/drops/question.md` | Squad B never sees it |

This isn't a graceful degradation. It's a **total blackout** for every squad not co-located. The question isn't whether we need *something* more. We do. The question is whether that something is 10 lines or 10,000.

---

## Vindication Check: Does Distribution Justify What We Deleted?

Honest answer: **almost nothing comes back.**

Let me go through the deleted subsystems and ask: does "squads on different machines" make any of them necessary?

| Deleted Subsystem | Does Distribution Vindicate It? | Verdict |
|---|---|---|
| **Discovery engine** (449 LOC, hybrid mode, markers) | No. The problem is "how do I know Squad B exists?" A static list answers this. Scanning for `.squad/` markers across a network is *worse* than a list. | **Still dead** |
| **Knowledge classification** (local/domain/universal) | No. The LLM still doesn't need us pre-classifying learnings, regardless of where the files physically live. | **Still dead** |
| **Steering subsystem** (directives, authority, escalation) | No. "Do X" is still a line in a file. Doesn't matter if the file traveled over HTTP or was read from disk. | **Still dead** |
| **Auto-escalation timers** | No. Agents still don't ignore things. Agents on remote machines don't ignore things any harder than local agents. | **Still dead** |
| **COP/Status rollup** (295 LOC) | No. Aggregating status files is still a loop over reads. The reads change from `fs.read` to `HTTP GET`, but the aggregation logic is the same trivial concatenation. | **Still dead** |
| **Bridge API** (233 LOC, wraps fs.readFile) | Extremely tempting to say "see, you needed an API!" But no. The Bridge API was a programmatic wrapper over local file reads. Distribution needs a *transport*, not a *wrapper over local reads*. | **Still dead** |
| **Learning classification heuristics** | No. Still solving a non-problem for LLMs. | **Still dead** |
| **Backpointers / registry** | Partially. A static registry of "where are the squads?" changes from nice-to-have to necessary. But the old registry was a local file pointing to local paths. What we need is a registry pointing to URLs. That's a different (simpler) thing. | **Tiny resurrection — as a URL list, not a subsystem** |
| **Coordinator prompt injection** (15 lines) | Still the one useful feature. Now needs to fetch remote SUMMARY.md files instead of local ones. | **Still alive, minor change** |

**Scorecard: 0 of 12 deleted subsystems earn full reinstatement. 1 gets a partial resurrection as a URL list. 1 was already alive.**

The architecture we killed is still dead. Distribution doesn't vindicate complexity — it adds a thin transport layer under the same simple primitives.

---

## How Much Complexity Does This Actually Add?

Let me be precise. The local-only architecture has exactly one operation: read a local file. Distribution adds exactly one new requirement: **read a file that isn't local.**

**What this requires:**
1. A way to know *where* remote squads are (registry: a list of URLs or repo paths)
2. A way to *fetch* their SUMMARY.md / state files (transport: git clone, HTTP GET, or API call)
3. A way to *write* something they can see (transport: git push, HTTP POST, or shared repo)

**What this does NOT require:**
- Service discovery protocols
- Capability negotiation
- Schema versioning
- Authentication frameworks (unless cross-org)
- Message queues
- Delivery guarantees
- Event buses
- Real-time notification
- Distributed consensus
- CRDTs
- Any of the MCP/A2A/ACP protocol stack

### The Precise Complexity Budget

| Component | What it is | Lines of code | Justification |
|-----------|-----------|:---:|---|
| `squads.yaml` | Static registry: name → location (local path, git URL, or HTTP endpoint) | 0 (config file) | Need to know where squads live |
| `fetch-remote.sh` | Script: for each remote squad, git clone/pull or curl their SUMMARY.md | 15-30 | The actual transport |
| `sync.sh` | Script: git add + commit + push to shared repo | 5-10 | So remote squads can see your state |
| Coordinator prompt change | Read from `./remote-summaries/` in addition to `../*/` | 5 | Prompt injection includes remote context |

**Total new complexity: 25-45 lines of shell script + 1 YAML config file.**

Not 10,000 lines. Not even 100. The distributed case adds a sync script and a registry file. That's the entire delta.

---

## The 80/20 Distributed Answer (minimum machinery for maximum coverage)

There are four distribution scenarios. They don't all need the same solution:

### Scenario 1: Same org, different machines (Alice's laptop + Bob's CI server)
**Solution: Shared git repo.**
- All squads push their `.squad/SUMMARY.md` (or `.mesh/` state) to a shared repo
- Before starting work: `git pull`
- After finishing: `git commit && git push`
- Transport: SSH/HTTPS (already configured for any dev)
- Lines of new code: **0** (git already exists)

This covers **80% of the distributed use case.** Most "different machines" means "same team, same org, same GitHub." Git is the transport. It always was. Frink said it: "We've been designing a distributed state synchronization protocol while standing on top of one."

### Scenario 2: Different GitHub org, same trust level
**Solution: Shared git repo (cross-fork or shared-access).**
- Same as Scenario 1, but the repo is explicitly shared (org-to-org)
- Or: each org pushes to their own repo, the other org adds it as a remote
- `git remote add squad-c https://github.com/other-org/mesh-state.git`
- Lines of new code: **0**

### Scenario 3: Different company, limited trust
**Solution: Static HTTP endpoint.**
- Each company publishes their squad SUMMARY.md at a known URL
- Other companies `curl` it before starting work
- No auth needed for public state. Auth needed? Add a bearer token to the curl. That's 1 line.
- Lines of new code: **10-15** (a script to curl and cache remote summaries)

### Scenario 4: Air-gapped / zero-trust / regulatory constraint
**Solution: Manual export.**
- `tar -czf squad-state.tar.gz .mesh/` → email/upload/carrier pigeon
- The receiving side untars into `./remote-squads/squad-d/`
- Lines of new code: **0** (tar exists)

### Coverage Assessment

| Scenario | Frequency | Solution | New code |
|----------|----------|---------|:---:|
| Same org, different machines | ~70% of cases | git repo | 0 lines |
| Different org, same trust | ~15% of cases | git remote | 0 lines |
| Different company | ~10% of cases | curl + bearer | 15 lines |
| Air-gapped | ~5% of cases | tar + manual | 0 lines |

**95% of distributed scenarios are solved with zero new code.** The remaining 5% need a short shell script.

---

## Where Over-Engineering Starts Again (the new line)

Distribution is a seductive complexity attractor. "We need a transport" escalates into a protocol stack faster than you can say "microservices." Here's exactly where the line falls:

### Necessary (earn their place):
- ✅ A registry file listing squad locations (squads.yaml)
- ✅ A git-based sync convention (commit + push + pull)
- ✅ A fallback HTTP fetch for cross-company (curl wrapper)
- ✅ Prompt injection reading from remote-summaries/ directory

### Unnecessary (complexity theater):
- ❌ **Service discovery protocol** — A YAML file with 10 entries is not a "discovery problem"
- ❌ **MCP for cross-squad communication** — Wrapping file reads in RPC when `git pull` works
- ❌ **A2A for cross-org** — Wrapping curl in a protocol when curl works
- ❌ **ACP for human→agent** — Writing "do X" in a markdown file doesn't need a protocol
- ❌ **Authentication framework** — Git SSH keys and/or one bearer token. Not a framework.
- ❌ **Message queues / event systems** — Agents are not persistent processes. They wake, read, work, write, sleep. There's no one home to receive events.
- ❌ **Delivery guarantees** — git pull either works or it doesn't. If it doesn't, the agent reads stale data and still operates. This is already the failure mode of local-only (stale files) and nobody died.
- ❌ **Schema versioning** — SUMMARY.md is markdown. The LLM parses markdown. If the format changes, the LLM adapts. It's an LLM.
- ❌ **Centralized hub / coordinator service** — A running service that squads connect to. For what? To serve files that git already distributes?
- ❌ **Real-time sync** — Agents don't need real-time. They need "recent enough." Git pull is recent enough.
- ❌ **Conflict resolution / CRDTs** — Write partitioning (each squad writes to its own directory) eliminates conflicts. No conflicts = no conflict resolution.

### The precise line:
**If it requires a running process, it's over-engineered.** The distributed answer is still files + conventions + existing tools (git, curl). The moment someone says "we need a server," challenge them to explain what that server does that `git pull` doesn't.

---

## The Honest Architecture (real minimum viable distributed system)

```
# squads.yaml — the entire "distributed registry"
squads:
  auth-squad:
    location: local          # same machine
    path: ../auth-squad
  api-squad:
    location: git            # different machine, same org
    repo: git@github.com:our-org/api-squad-mesh.git
  partner-squad:
    location: http           # different company
    url: https://partner.example.com/squad-state/SUMMARY.md
    token_env: PARTNER_TOKEN # optional auth
```

```bash
#!/bin/bash
# sync-mesh.sh — the entire "transport layer" (30 lines)

MESH_DIR=".mesh/remote"
mkdir -p "$MESH_DIR"

# Read registry
yq '.squads | to_entries[]' squads.yaml | while read -r squad; do
  name=$(echo "$squad" | yq '.key')
  location=$(echo "$squad" | yq '.value.location')

  case "$location" in
    local)
      # Just read the local path directly — no sync needed
      ;;
    git)
      repo=$(echo "$squad" | yq '.value.repo')
      if [ -d "$MESH_DIR/$name" ]; then
        git -C "$MESH_DIR/$name" pull --quiet
      else
        git clone --quiet --depth 1 "$repo" "$MESH_DIR/$name"
      fi
      ;;
    http)
      url=$(echo "$squad" | yq '.value.url')
      token_env=$(echo "$squad" | yq '.value.token_env')
      auth_header=""
      if [ -n "$token_env" ] && [ -n "${!token_env}" ]; then
        auth_header="-H 'Authorization: Bearer ${!token_env}'"
      fi
      mkdir -p "$MESH_DIR/$name"
      curl -sf $auth_header "$url" -o "$MESH_DIR/$name/SUMMARY.md"
      ;;
  esac
done

echo "Mesh synced: $(ls $MESH_DIR | wc -l) remote squads"
```

```
# Agent startup sequence (unchanged from local, plus one step)

1. Run sync-mesh.sh                          # NEW: fetch remote state
2. Read local squads: cat ../*/.squad/SUMMARY.md
3. Read remote squads: cat .mesh/remote/*/SUMMARY.md  # NEW: include remote
4. Do work
5. Update own SUMMARY.md
6. git commit && git push                    # Already doing this
```

**That's the entire distributed architecture.** A YAML file, a shell script, and one new line in the agent startup. Everything else — the primitives, the conventions, the SUMMARY.md format, the pull-based model — stays exactly the same.

### What changed from the local-only architecture:
- Added: `squads.yaml` (registry pointing to URLs, not just paths)
- Added: `sync-mesh.sh` (~30 lines, fetches remote state)
- Added: One `cat` line reading `.mesh/remote/*/SUMMARY.md`
- Changed: Nothing else

### What did NOT change:
- SUMMARY.md format: same
- Agent behavior: same (read all summaries, work, write own state)
- Coordinator prompt injection: same (now reads from one more directory)
- Drops / billboards / state files: same format, same conventions
- Write partitioning: still each squad writes only its own state
- Discovery model: still a static list (now in YAML instead of `ls ../`)

---

## Updated One-Sentence Test

**Old:** "Each squad maintains a billboard and log in a shared directory; agents read what's relevant when they wake up."

**New:**

> Each squad maintains a SUMMARY.md; local squads read it from the filesystem, remote squads are fetched via git pull or curl from a list of URLs, and agents read all of them before starting work.

### The Complexity Audit

| Claim | Evidence |
|-------|---------|
| Lines of actual new code | ~30 (sync script) |
| New config files | 1 (squads.yaml) |
| New concepts | 1 (remote squad location types: local/git/http) |
| New running services | 0 |
| New protocols | 0 |
| New dependencies | 0 (git + curl are standard) |
| Subsystems resurrected from the dead | 0 |
| Original protocol stack (MCP/A2A/ACP) justified | No |
| Percentage of deleted code that should come back | 0% |

### The Bottom Line

Distribution doesn't vindicate the architecture we killed. It vindicates **git**, which we were already using. The gap between "local only" and "distributed" is not a protocol stack — it's a 30-line shell script that runs `git pull` and `curl` in a loop.

The Three-Protocol Vision (ACP + MCP + A2A) is still dead. The Org Context Hub is still dead. The 3,756 lines of TypeScript are still dead. The Bridge API, the Knowledge Propagation Engine, the Learning Classification System, the Steering Subsystem with Auto-Escalation — all still dead.

We don't need to rebuild the cathedral. We need to add a mail slot to the cottage.

---

*"They said distributed systems are hard. They're right — if you insist on building distributed systems. But 'fetch a file from another machine' isn't a distributed system. It's `curl`."*

— Moe
