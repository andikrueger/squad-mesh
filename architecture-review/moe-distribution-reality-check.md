# Moe — Distribution Reality Check: The Wall and What's Behind It

> *"We built 3,756 lines to solve `cat ../*/.squad/SUMMARY.md`. Then someone pointed out some of those files are on another continent. Fair point. Let's see how many lines THAT actually costs."*

**Date:** 2026-03-13  
**Context:** Round 2 challenge — local-only file convention breaks when squads span machines, orgs, and companies.

---

## The Wall We Hit (Why Local-Only Breaks for Distributed Squads)

Let's be precise about what actually breaks:

| Scenario | `cat ../*/.squad/SUMMARY.md` | What breaks |
|----------|:---:|---|
| Squad A + B on Alice's laptop | ✅ | Nothing |
| Squad A on Alice's laptop, Squad B on Bob's CI server | ❌ | Alice's filesystem doesn't contain Bob's files |
| Squad C in a different GitHub org | ❌ | No local path to that directory |
| Squad D at a different company | ❌ | No local path, possibly no shared auth |

The wall is real. I'm not going to pretend it isn't. `cat` requires a file path, file paths require a filesystem, and filesystems are local. When squads aren't co-located, the local-only convention can't physically function.

**But here's what I want everyone to notice:** the wall isn't "the convention is wrong." The wall is "the file isn't here yet." The convention — each squad writes a SUMMARY.md, others read it — is still correct. The only problem is *transport*. How does the file get from there to here?

That's a much smaller problem than "how do we build a federation protocol."

---

## How Much Complexity Does This Actually Add? (Spoiler: Less Than You Think)

Let's catalog what distribution *actually* requires, versus what people *think* it requires.

### What People Think Distribution Requires

- Service discovery protocol
- API gateway / mesh proxy
- Authentication and authorization framework
- Schema versioning and compatibility negotiation
- Health checks and circuit breakers
- Message queuing for reliability
- Conflict resolution and consensus
- SDK and client libraries
- Monitoring and observability stack

That's 10,000 lines minimum. That's what we deleted last round. That's what I will fight to keep deleted.

### What Distribution Actually Requires

One question: **How does Squad B's SUMMARY.md get onto Squad A's filesystem?**

Answer options, ranked by complexity:

| Method | Lines of code | Works for |
|--------|:---:|---|
| `git clone` a shared repo | 0 | Same org, different machines |
| `git submodule` or `git sparse-checkout` | 0 | Different repos, same git host |
| Cron job: `curl` the raw file from GitHub | 3 | Different orgs, same git host |
| CI step: pull summaries into shared artifact | 10-15 | CI servers, automated pipelines |
| Script: aggregate summaries from multiple remotes | 20-30 | Mixed environments |
| Shared S3/blob bucket with push-on-commit | 15-20 | Cross-company, cloud-native |

**Not a single one of these requires a protocol, an API, or a runtime service.**

Every solution is: "copy the file here." That's it. The transport mechanism varies. The convention doesn't.

### The Actual Complexity Cost

```bash
#!/bin/bash
# sync-summaries.sh — The entire "distributed federation layer"
# Pull SUMMARY.md from every known squad into .mesh/summaries/

MESH_DIR=".mesh/summaries"
mkdir -p "$MESH_DIR"

while IFS='|' read -r name url; do
  curl -sf "$url" > "$MESH_DIR/${name}.md" 2>/dev/null \
    || echo "# ${name} — unavailable" > "$MESH_DIR/${name}.md"
done < .mesh/sources.txt

# sources.txt looks like:
# auth-squad|https://raw.githubusercontent.com/org/auth-squad/main/.squad/SUMMARY.md
# api-squad|https://raw.githubusercontent.com/org/api-squad/main/.squad/SUMMARY.md
# partner-squad|https://partner-cdn.example.com/squad-summary.md
```

**That's 8 lines of bash.** It handles:
- ✅ Different machines (curl doesn't care where the file lives)
- ✅ Different orgs (it's a URL)
- ✅ Different companies (it's a URL with whatever auth they expose)
- ✅ Failure (unavailable squads get a placeholder, not a crash)
- ✅ Heterogeneous sources (mix of GitHub raw, S3, any HTTP endpoint)

For the git-native case (same org, different repos), it's even simpler:

```bash
# Just add remotes and pull
git remote add auth-squad git@github.com:org/auth-squad.git
git fetch auth-squad main -- .squad/SUMMARY.md
```

**Zero lines of application code.**

---

## The 80/20 Answer (What Covers Most Distributed Cases with Minimum Machinery)

Let's be honest about who is actually doing multi-squad work today and what they need:

### Tier 1: Same Org, Different Machines (80% of cases)

**Solution:** Shared git repo.

Every squad writes its SUMMARY.md. A single repo (call it `squad-mesh` or `.mesh` or whatever) contains all summaries via one of:
- Direct commits (all squads have write access)
- Git submodules pointing to each squad's repo
- A CI job that aggregates summaries on push

**Complexity: 0 lines of new code.** Git is the transport. GitHub is the registry. A `git pull` is the sync mechanism. This is literally what git was built for — distributed collaboration on shared files.

### Tier 2: Different Orgs, Same Trust Level (15% of cases)

**Solution:** The 8-line curl script above, or GitHub Actions fetching from cross-org repos.

A squad publishes its SUMMARY.md to a known URL (GitHub raw URL, S3 bucket, static hosting). Other squads fetch it. The URL goes in `sources.txt` or `mesh.yaml`.

**Complexity: 8-15 lines of bash/yaml.**

### Tier 3: Cross-Company, Limited Trust (5% of cases)

**Solution:** Each company publishes a sanitized summary to an agreed-upon location (S3 bucket, API endpoint, shared git repo). The format is the same SUMMARY.md. The transport adds an auth header.

**Complexity: Add `--header "Authorization: Bearer $TOKEN"` to the curl command.** Maybe a shared schema for what the summary MUST contain so there's a contract. That's a section in a README, not a protocol.

### What This Means

For 95% of distributed cases: **git clone, git pull, or curl.** No new protocols. No runtime services. No SDKs.

The convention (SUMMARY.md with known sections) doesn't change. The transport (how the file gets here) is off-the-shelf. The only new artifact is a list of sources — where to find each squad's summary.

---

## Where Over-Engineering Starts Again (The Line We Must Not Cross)

Here's where I put my foot down. These are the proposals that WILL come up now that distribution is on the table, and every single one is a trap:

### ❌ "We need a service that aggregates summaries in real-time"

No. Agents wake up, work, sleep. They don't need real-time anything. A summary fetched 5 minutes ago is perfectly fine. A cron job running every 10 minutes is sub-second latency relative to the agent lifecycle.

### ❌ "We need a webhook so squads get notified when other squads update"

No. Pull, don't push. The agent reads all summaries when it wakes up. If a summary changed since last read, the LLM notices. It's an LLM. That's what it does. Push notifications solve a human attention problem that agents don't have.

### ❌ "We need schema validation for SUMMARY.md so cross-company squads are compatible"

Maybe. A section header convention is fine (## Current Work, ## Decisions, ## Blockers, ## Learnings). A JSON schema with validation, versioning, and compatibility negotiation is not. The LLM reads markdown. It doesn't need a formal schema to understand "## Blockers: need schema changes from data-squad."

### ❌ "We need authentication and authorization for which squads can read which summaries"

This is a transport concern, not an architecture concern. HTTPS handles auth. Git handles access control. S3 handles bucket policies. We don't need to build auth — we need to USE the auth that already exists on whatever transport we chose.

### ❌ "We need a discovery protocol so squads can find each other dynamically"

`sources.txt`. A flat list of name|url pairs. Add a line when a squad joins. Remove a line when it leaves. If you're feeling fancy, make it YAML. That's the discovery protocol. It's a file.

### ❌ "What about eventual consistency? What if summaries are stale?"

Summaries are inherently stale. They're snapshots. A 10-minute-old snapshot is fine. A 24-hour-old snapshot is usually fine. The only case where staleness matters is "Squad B just made a decision that breaks Squad A's current work" — and the answer is: Squad A finds out next time it reads the summary. If that's too slow (it probably isn't), add a git hook that triggers a re-fetch. Not a consistency protocol.

### The Line

> **The moment you propose something that requires a running process, you've crossed the line.**

Files are fine. Git is fine. Curl is fine. Cron is fine. CI jobs are fine. All of these are stateless, failure-tolerant, and debuggable with `cat`.

A running service — even a small one — requires deployment, monitoring, availability guarantees, failure handling, and operational burden. THAT is where the complexity explosion starts. Every "simple microservice" is 2,000 lines of boilerplate, a Dockerfile, a deployment config, health checks, and an oncall rotation.

---

## The Honest Architecture (The REAL Minimum Viable Distributed System)

Fine. Here's what I'd actually ship:

### Layer 0: The Convention (0 lines)

Every squad writes `.squad/SUMMARY.md` with these sections:
- Purpose (one line)
- Current Work (bullets)
- Decisions That Affect Others (bullets)
- Blockers (bullets)
- Learnings Worth Sharing (bullets)

This is the contract. It's a markdown file with headers. Not negotiable.

### Layer 1: Local Discovery (0 lines)

For squads on the same machine: `find . -maxdepth 3 -name "SUMMARY.md" -path "*/.squad/*"`

Still works. Still solves the co-located case. Nothing changes.

### Layer 2: Distributed Source List (1 file, ~10 lines)

```yaml
# .mesh/sources.yaml — where to find remote squads
squads:
  - name: auth-squad
    source: local          # on this machine
    path: ../auth-squad

  - name: api-squad
    source: git            # different machine, same org
    repo: git@github.com:org/api-squad.git
    file: .squad/SUMMARY.md

  - name: partner-squad
    source: url            # different company
    url: https://partner.example.com/squad-summary.md
    auth: bearer           # uses $PARTNER_SQUAD_TOKEN env var
```

That's the registry. It's a YAML file. It lists where to find each squad's summary.

### Layer 3: Sync Script (20-30 lines)

A bash script (or 15-line Node script) that:
1. Reads `sources.yaml`
2. For each squad: fetches SUMMARY.md via the appropriate method (local read, git fetch, curl)
3. Writes all summaries to `.mesh/summaries/{name}.md`
4. Handles failures gracefully (placeholder for unavailable squads)
5. Reports what succeeded and what didn't

Run it manually, via cron, or as a CI step. No daemon. No service.

### Layer 4: Coordinator Prompt Injection (5-10 lines)

The one legitimate feature from the original architecture: concatenate all summaries into a context block and inject it into the agent's system prompt.

```
Read these cross-squad summaries before starting work:
---
{contents of .mesh/summaries/*.md}
---
```

### Total Implementation

| Component | Size | New code |
|-----------|------|----------|
| SUMMARY.md convention | README section | 0 lines |
| sources.yaml | Config file | ~10 lines yaml |
| sync-summaries.sh | Bash script | ~25 lines |
| Prompt injection | Template snippet | ~5 lines |
| **Total** | | **~30 lines of code + 10 lines of config** |

Compare to what we deleted: **3,756 lines of TypeScript + 971 lines of tests.**

The ratio is **125:1.**

For every line in the honest architecture, the over-engineered version had 125 lines of code solving the same problem.

---

## Updated One-Sentence Test

The old sentence:
> "We built 3,756 lines of TypeScript to solve `cat ../*/.squad/SUMMARY.md`."

The new sentence:
> "Distribution means the file isn't local, so you fetch it first — that's a curl, not a protocol."

### The Full Test

If someone proposes a new component for the distributed architecture, apply this test:

1. **Can you explain what it does in one sentence?** If not, it's too complex.
2. **Does it require a running process?** If yes, you'd better have measured pain that justifies operational burden.
3. **Could curl + cron do the same thing?** If yes, use curl + cron.
4. **Does it change the convention (SUMMARY.md format)?** Almost nothing should.
5. **Does it add a dependency?** Files have zero dependencies. Every dependency is a liability.

---

## Postscript: Where I Was Wrong, and Where I'm Still Right

**Where I was wrong:** I said `cat ../*/.squad/SUMMARY.md` solves 95% of the problem. It solves 95% of the *convention* problem. For the *transport* problem, it solves only the co-located case. Fair hit.

**Where I'm still right:** The transport problem is boring and solved. Git, curl, rsync, S3 — humanity has been copying files between machines for 40 years. We don't need to invent a new way to do it. We definitely don't need 3,756 lines of TypeScript to do it.

**The real lesson:** "Not all squads are on the same machine" sounds like it blows up the architecture. It doesn't. It adds a fetch step. The convention stays. The simplicity stays. The only thing that changes is: before you `cat` the file, you `curl` it.

> *"The distance between 'read a local file' and 'fetch a remote file' is one line of curl. The distance between 'fetch a remote file' and 'build a federation protocol' is 10,000 lines of regret."*

— Moe
