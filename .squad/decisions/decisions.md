# Squad-Architecture Decisions Log

## Decision 13: SOA Analysis — File-Based Mesh Architecture Confirmed

**Date:** 2026-03-16  
**Author:** Burns (Lead Architect)  
**Status:** Proposed  
**Scope:** Architectural validation via SOA lens

### Decision

SOA analysis confirms the file-based mesh architecture is sound. The mesh is not SOA, but rather a **stigmergic coordination system** (agents communicate by modifying a shared environment). This is a valid pattern that captures SOA's valuable properties (loose coupling, service contracts, autonomous services) through file conventions rather than protocol infrastructure.

### Key Finding

Applied 8 core SOA design principles to the `.mesh/` + git architecture:
- Satisfies 5/8 principles (loose coupling, discoverability, autonomy, service contracts, composability through composition)
- Correctly ignores 2 principles (reusability/composability — inapplicable to autonomous agents)
- Intentionally violates 1 principle (statelessness — agents require memory)

### Actionable Gap

**Contract versioning:** SUMMARY.md and INTERFACES.md lack versioning conventions. For Zone 3 (cross-org) scenarios, consuming squads need to detect breaking changes, deprecation timelines, and contract version compatibility.

### Recommendation

Add optional `## Version` section to SUMMARY.md/INTERFACES.md for cross-org use:

```markdown
## Version
Contract: 1.2
Last breaking change: 2026-03-01
Deprecations: Risk scoring v2 removed April 15
```

This is a convention (3 lines of markdown), not infrastructure. Enforcement is social, not technical.

### Impact

- No architectural changes required
- No changes to agent interface, transport, write partitioning, trust zones, or "no running services" principle
- Provides framework for contract management at 15+ squad scale

---

## Decision 13b: SOA Lens Confirms No Blocking Gaps

**Date:** 2026-03-16  
**Author:** Frink (Systems Engineer)  
**Status:** Analysis complete — for team review  
**Relates to:** Decision 13

### Finding

The mesh implements SOA's valuable properties through file conventions. No blocking gaps; gaps vs. traditional SOA (no ESB, no runtime registry, no WSDL, no SLAs) are either intentional simplifications or correctly deferred to 15+ squad scale.

### Scale Triggers (Phase 2+ Concerns)

At 15-30 squads, three SOA governance gaps may become painful:
1. No contract versioning protocol (breaking changes to SUMMARY.md sections)
2. No deprecation lifecycle (removing a squad's published interfaces)
3. No SLA mechanism (expected freshness/availability of state files)

### Impact on Team

- Burns: Phased approach confirmed correct — SOA governance is Phase 2+ concern
- Moe: Minimalism validated — SOA lens found no missing primitives
- Chalmers: SOA service contracts map cleanly to holacratic role contracts

---

## Decision 13c: SOA Vocabulary Adoption, Framework Rejection

**Date:** 2026-03-16  
**Author:** Chalmers (Org Pattern Specialist)  
**Status:** Proposed — informational, no architectural changes  
**Relates to:** Decision 3 (Holacracy Endgame), Decision 4b (Evidence-Based)

### Decision

Adopt SOA **vocabulary** (contracts, service boundaries, loose coupling, interface segregation) for enterprise communication. Reject SOA **framework** (ESB, UDDI, governance, runtime orchestration).

### Rationale

Filesystem + git naturally provide what SOA had to engineer artificially. Using SOA vocabulary with external architects makes our architecture immediately recognizable. The framework is unnecessary overhead.

### Specific Recommendations

1. **Use SOA vocabulary externally** — Map: squad = service, `.mesh/` = service registry, `INTERFACES.md` = service contract, write partitioning = service boundary enforcement.

2. **Do NOT import SOA governance** — Our tension-processing loop + git decisions.md is faster and more auditable than design-time review boards and SLA monitoring.

3. **Resist service registry proposals** — `.remotes` file + `ls .mesh/` IS the registry. Do not replace with infrastructure until measured pain requires it.

4. **Monitor for ESB emergence** — If any component becomes mandatory routing for all inter-squad communication, flag as anti-pattern.

### Anti-Patterns to Watch

| SOA Anti-Pattern | Our Risk | Defense |
|---|---|---|
| ESB as God Object | Meta-squad becomes mandatory routing | Keep meta-squad read-only; peer-to-peer mesh |
| SOAP/WS-* bloat | mesh.yaml gains 50+ fields | Delete anything unused after 30 days |
| Governance theater | Tension protocol becomes bureaucratic | Measure resolution time; simplify if >1 cycle avg |
| Shared database | Squads writing to same files | Write partitioning is structural |

---

## Decision 11: Meta-Squad Infrastructure Bootstrap

**Date:** 2026-03-13  
**Author:** Burns (Lead Architect)  
**Status:** Implemented  
**Triggered by:** The project owner's request to test squad-holacracy extension live today  

### Decision

Bootstrapped `.meta-squad/` directory and `meta-squad.config.ts` at the repo root to enable live testing of the squad-holacracy extension against the project owner's 8 local squads.

### Key Choices

1. **Config imports from local package** (`./packages/squad-holacracy/dist/index.js`) rather than npm — avoids publish cycle during development.

2. **Hybrid discovery mode** scanning `C:\dev` — combines registry (for explicit overrides) with filesystem scan (for auto-detection). This matches Decision 6's meta-circle pattern.

3. **Leader-only steering with rejection** — The project owner is the sole directive authority, but squads can push back. Matches holacracy's sovereignty principle (Article 1 of the endgame spec).

4. **3-day auto-escalation** — tensions unresolved after 3 days auto-escalate to leader. Conservative threshold for initial testing.

5. **1-day stale threshold** — status reports older than 24 hours are considered stale. Appropriate for active development squads.

### Validation

Live test (`test-my-squads.mjs`) confirmed 8 squads discovered, status collected for all, COP generated successfully. System health: yellow (3 squads with stale activity).

### Impact

- Enables the project owner to iterate on the holacracy extension with real data
- `.meta-squad/` directory structure matches Decision 6 (meta-circle pattern) and the conventions.ts canonical layout
- No changes to existing code or architecture

---

## Decision 12: Communication Pattern for All Agents

**Date:** 2026-03-12T09:12Z  
**Author:** Project Owner (via Copilot)  
**Status:** Active  
**Scope:** All squad agents and holacracy extension  

### Decision

Adopt a new communication pattern across all squad agents and the holacracy extension as the standard for inter-agent and user-facing communication.

### Pattern Rules

1. **Outcome over verbosity** — Deliver artifacts not explanations
2. **Radical clarity** — Separate Fact / Interpretation / Opinion
3. **Multi-level thinking** — Technical + Strategic
4. **No generic consulting language** — Be direct and specific
5. **Structure is mandatory** — Use consistent formats
6. **Copy-paste ready outputs** — Minimal post-processing needed
7. **Assume high domain expertise** — Don't over-explain
8. **Don't ask unnecessary questions** — Assume and label
9. **Be opinionated when asked** — Provide stance, not neutral fence-sitting
10. **No meta commentary** — Focus on substance

### Application

This pattern defines how all agents communicate with each other and with users. It is the canonical speech model for the holacracy extension.

### Impact

- Standardizes communication across the squad ecosystem
- Enables more efficient inter-agent coordination
- Sets baseline for holacracy agent speech implementations

---

## Decision 12b: SOA Does Not Apply to Mesh Architecture

**Date:** 2026-03-16  
**Author:** Moe (Skeptic / Critic)  
**Status:** Proposed  
**Scope:** Architecture methodology — whether SOA concepts, vocabulary, or infrastructure should influence the mesh

### Decision

SOA thinking adds zero value to the mesh architecture. Do not adopt SOA infrastructure or patterns. The file-based architecture captures every useful SOA insight (boundaries, contracts, autonomy) without overhead.

### Rationale — Complexity Analysis

1. **Convergence on minimalism:** Three rounds of blank-slate analysis converged on 30 lines of shell + 1 config file. SOA "best practices" cost 2,000-5,000 lines minimum — a **67:1 to 167:1 complexity ratio**.

2. **No middle ground:** Every SOA concept maps to either (a) something we already do with files, or (b) unnecessary machinery. There is no third option that adds value.

3. **Better contracts:** SUMMARY.md is a better contract than WSDL/OpenAPI for LLM consumers. Formalizing contracts beyond markdown adds tooling dependencies with zero benefit.

4. **Historical failure:** Middleware that costs more than the services it connects — precisely the pattern our architecture was designed to avoid.

5. **Cross-model consensus:** "The moment you propose something that requires a running process, you've crossed the line." SOA infrastructure requires running processes.

### Evidence

- Round 1: 3,756 lines deleted, replaced by file conventions
- Round 2: 30 lines of shell + 1 config file for distributed case
- Round 3: Cross-model consensus (Sonnet, GPT-5.4) — zero of 12 deleted subsystems justified by any framing
- SOA audit: 11 of 11 known SOA anti-patterns avoided; SOA vocabulary would re-invite ≥5

### What This Means

- **No service registry** — `squads.yaml` is the registry
- **No service bus / ESB** — `git pull` and `curl` are the bus
- **No contract validation framework** — LLMs parse markdown
- **No orchestration engine** — agents read files and decide
- **No SOA governance framework** — `SUMMARY.md` conventions in a README
- **No canonical data model** — each squad writes its own SUMMARY.md; LLM normalizes

### Activation Criteria for Revisit (90-day window)

- A concrete scenario where SUMMARY.md contracts demonstrably fail and formal contracts would have prevented the failure
- A concrete scenario where service discovery beyond `squads.yaml` is needed (>50 squads?)
- A concrete scenario where message routing beyond `git pull` is needed (real-time, <1s latency requirement proven by measurement)

If none trigger within 90 days, this decision is permanent.

---

## Decision 12c: AI-Native Communication — Radical Simplification

**Date:** 2026-03-16  
**Author:** Burns (Lead Architect)  
**Status:** Proposal — radical simplification of squad-mesh coordination model  
**Scope:** squad-mesh subsystem redesign

### The AI Communication Problem

Strip away every framework and organizational theory. An AI agent waking to a task needs:

1. **What do I need to know right now?** — Context relevant to my current task
2. **What have others learned?** — Wisdom from agents who've been here before
3. **I'm stuck — who has the answer?** — A way to surface a need and get a response

**Everything else exists because humans need coordination. Agents don't.**

### Why Human Patterns Fail for AI

- **Steering with authority levels** — Agents don't have politics. Share relevant info or don't. No "permission" problem.
- **Tension escalation timers** — Escalation exists because humans forget. Agents process every input. Nothing to escalate.
- **Common Operational Picture with staleness thresholds** — Agents read 50 files in milliseconds. They need files, not dashboards.
- **Knowledge propagation with relevance classification** — Agents filter by task relevance faster and more accurately than classification heuristics.
- **Backpointers, registry, mesh topology** — Agents don't maintain relationships. They need to find files *right now*.

### The AI-Native Answer: Shared Filesystem with Conventions

Four primitives. Everything else is deletable.

#### 1. The Drop

A markdown file in `.mesh/drops/` written by any agent, readable by all.

```yaml
---
from: auth-squad
tags: [jwt, security, rotation]
kind: learning        # learning | question | heads-up
---
We discovered that rotating JWT signing keys requires a 2-key overlap window...
```

#### 2. The Feed

Before starting work, scan `.mesh/drops/` for anything relevant. No subscription. No filtering service.

#### 3. The Billboard

One file per squad (`.mesh/boards/auth-squad.md`) with current work, recent decisions, and what help is offered. Plain text, updated when things change.

#### 4. The Mesh File

```yaml
# .mesh/mesh.yaml
name: platform-engineering
squads:
  - name: auth-squad
    path: ../auth-squad
  - name: api-squad
    path: ../api-squad
```

One list. One source of truth. No markers, no hybrid modes, no refresh intervals.

### What We Delete

- Discovery (marker scanning, hybrid mode, registry) → Replace with `mesh.yaml` list
- Steering (directives, authority levels, escalation) → Delete
- Tension routing → Delete
- COP / Status rollup → Replace with billboards
- Knowledge classification → Delete (tags are enough)
- Bridge API → Delete (agents can read files)
- Health monitoring → Delete (read the billboard)
- Backpointers (mesh-link.json) → Replace with `mesh.yaml`

### Impact

- `squad-mesh` today: ~2,000 lines of human organizational patterns
- AI-native replacement: ~200 lines of helper code + file conventions
- **10x reduction — not from cutting corners, but from solving problems that don't exist for agents**

### Recommendation

Build as `squad-mesh v0.3` alongside existing subsystems. Let real squads use both. Measure which patterns agents actually use vs. ignore. The four primitives will likely cover 95% of actual coordination needs.

---

## Decision 12d: AI-Native Distribution Pattern

**Date:** 2026-03-14  
**Author:** Frink (Systems Engineer)  
**Status:** Proposed  
**Scope:** Cross-machine, cross-org information flow

### Decision

Distributed mesh coordination uses git repos — not servers, APIs, or new protocols — as the transport layer between squads on different machines and different orgs.

### Key Design

- **Same org:** One mesh git repo, everyone clones. `git push` = publish, `git pull` = subscribe.
- **Cross org:** Separate mesh repo per trust boundary. Remote repos cloned read-only.
- **Sync:** `git pull` before reading, `git push` after writing. Agent can do this directly.
- **Trust model:** Git repo permissions ARE the trust boundary. Can clone = can see. Can't clone = invisible.

### What Doesn't Change

Agent interface is unchanged: read local files, write local files, discover via `ls`. The distribution tax is one flat file (`.remotes`) and one git command (`git pull`).

### What We're NOT Building

No federation protocol, no discovery service, no auth system, no HTTP APIs, no running servers, no MCP federation layer, no A2A endpoints.

---

## Decision 14: Architecture Review Consolidation for Public Release

**Date:** 2026-03-15  
**Author:** Burns (Lead Architect)  
**Status:** Implemented  
**Scope:** `architecture-review/` directory

### Context

The `architecture-review/` directory contained 31 markdown files from development — agent analyses, spec drafts, iterations, reviews, plans, stress tests, audits. These were verbose development artifacts unsuitable for a public repository.

### Decision

1. **Consolidated** all 31 files into a single `architecture-review/SUMMARY.md` (~280 lines)
2. **Preserved** `package-architecture.mmd` (Mermaid system diagram — clean reference artifact)
3. **Deleted** all 30 other files

### What SUMMARY.md Captures

- The 4-phase development journey (hub-and-spoke → evidence-based → holacracy-first → mesh rebrand)
- 6 key architectural decisions with rationales
- 9 rejected approaches with reasons
- Final 6-pillar architecture (Discovery, Status/COP, Steering, Knowledge, Coordinator, Builders)
- Review team contributions and convergence/divergence points
- Lessons for contributors

### Rationale

- Public repos should have clean, navigable documentation — not development archaeology
- The conclusions matter more than the exploratory process
- Key decisions and rationales are preserved; only verbose deliberation is removed
- PII was scrubbed

### Impact

- 31 files → 2 files (SUMMARY.md + package-architecture.mmd)
- ~15,000+ lines → ~280 lines
- No information loss for architectural understanding

---

## Decision 15: CLI Rename — squad-meta → squad-mesh

**Date:** 2026-01-29  
**Author:** Lenny (Core Developer)  
**Status:** Implemented

### Decision

1. **Rename binary**: Changed `"squad-meta"` → `"squad-mesh"` in `package.json` bin field
2. **Update all references**: Changed all CLI references from `squad-meta` to `squad-mesh` across specs and documentation
3. **Wire up `init` command** in main.ts CLI handler

### Rationale

- **Consistency**: Package name and binary name should match
- **Discoverability**: Users expect `npx squad-mesh` to work
- **Completeness**: The `init` command was advertised but non-functional

### Files Changed

- `packages/squad-mesh/package.json` — bin name
- `packages/squad-mesh/src/cli/main.ts` — init handler, references, imports
- `packages/squad-mesh/README.md` — all CLI examples

### Verification

✅ TypeScript compilation passed

---

## Decision 16: Distributed Mesh Architecture Is Settled

**Date:** 2026-03-13  
**Author:** Burns (Lead Architect)  
**Status:** Complete — architectural review concluded  
**Scope:** Distributed squad communication across machines, orgs, and companies

### The Verdict

After reviewing all 8 source documents across three model families (Opus 4.6, Sonnet 4.5, GPT-5.4), three analytical perspectives (architect, systems engineer, adversarial critic), and two rounds of independent team analysis (Frink, Moe, Burns), this is settled.

**The distributed extension to squad communication is a transport upgrade, not an architecture change.**

The agent interface is invariant — agents read local files. The distributed layer materializes remote files locally before the agent reads them. Git is the transport for 85%+ of cases. The remaining cases need ~15 lines of curl. Total new code: ~30 lines of shell + 1 YAML config.

### Load-Bearing Conclusions (All Models Agree)

1. **Git IS the transport.** Not HTTP, not MCP, not A2A. Git handles auth, sync, conflict resolution, audit, and offline operation.
2. **Three zones of trust.** Local (filesystem), Remote-Trusted (git pull), Remote-Opaque (curl). Every model family independently derived this taxonomy.
3. **Zero running services.** The architecture stays files + conventions + existing tools.
4. **Zero deleted subsystems reinstated.** 0 of 12 subsystems killed in the local-only round earn reinstatement.
5. **Write partitioning eliminates conflicts.** Each squad writes only to its own directory.
6. **Phased rollout.** Convention → sync script → published contracts → never (no protocols).

### Cosmetic Disagreements (All Models)

- **Config format:** Opus uses flat `.remotes` file; Sonnet/GPT use YAML. → Decision: YAML (mesh.yaml). Richer, still simple.
- **Directory naming:** Varying names (boards/drops/squads vs state.md/log.md). → Decision: Defer to whatever Squad adopts; the pattern matters, not the names.
- **Trust labels:** own/partner/external vs zones 1/2/3. → Decision: Use descriptive zone names (local, remote-trusted, remote-opaque).

### Simplest Integration Into Squad

**One file: a SKILL.md.** Drop it into `.squad/skills/distributed-mesh/SKILL.md` in the Squad repo. The skill teaches agents the three zones, the mesh.yaml format, the sync convention, and the anti-patterns.

No code changes to Squad. No new CLI commands. No new templates. The skill IS the integration.

### Deliverables Produced

```
distributed-mesh/
├── README.md              — One-page architecture guide for humans
├── mesh.yaml.example      — Copy-paste config showing all three zones
├── sync-mesh.sh           — Reference ~30-line sync script
└── SKILL.md               — Squad skill file (the integration artifact)
```

Four files, 273 lines total. Each justified.

### Impact on Team

- **Frink:** His distribution-problem.md and information-flow.md are the deepest technical source. Both confirmed and absorbed.
- **Moe:** His 125:1 ratio and "0 of 12 reinstated" findings are the quality gate. Both preserved.
- **Smithers:** No platform work needed. Git is the platform.

---

## Decision 16b: Distributed Communication — Packaging Simplicity Audit

**Date:** 2026-03-13  
**Author:** Moe (Skeptic / Critic)  
**Status:** Complete — packaging risks prevented  
**Scope:** Preventing the "packaging more complex than payload" anti-pattern

### The Irony Problem

Eight documents totaling 2,377 lines converge on a single conclusion: distribution costs ~30 lines of shell + 1 config file. The 125:1 ratio (deleted complexity vs. new complexity) is the headline.

If the packaging exceeds what it describes, we've become the thing we warned about.

### Overengineering Audit: Verdict NO (Simplification Applied)

**Proposed inventory:** 9+ files explaining why you only need 2 files (registry + script).

**Recommendation:** Cut ruthlessly. Minimum viable adoption:

```
distributed-mesh/
├── README.md            (~80 lines)
├── mesh.yaml.example    (~20 lines)
└── sync-mesh.sh         (~30 lines)
```

**Total: 3 files, ~130 lines.**

### What Gets Cut

- ❌ contracts/ directory — No consensus, premature
- ❌ published/ directory — Only Burns proposes, no consensus
- ❌ .remotes flat file — squads.yaml does the same job, pick one
- ❌ Extended mesh.yaml schema — Conflicts with squads.yaml registry
- ❌ Separate spec documents — README covers the spec
- ❌ Mermaid diagrams — Analysis artifacts, not adoption
- ❌ Phase-by-phase guides — Fits in README (10 lines), not separate doc

### Conditional Approval: SKILL.md

Created `.squad/skills/distributed-mesh/SKILL.md` **under 60 lines including frontmatter**. Teaches agents the sync-read-work-write-publish lifecycle. Justified because Squad uses skills as the agent-teaching mechanism, but only if kept tight.

### Adoption Friction: Step Count Validation

**Same-org case (git transport):** 4 steps  
**Cross-org case (git, different trust):** 5 steps  
**Cross-company case (HTTP/published contracts):** 5 steps (remote org's burden, not yours)

All under or at ceiling. ✅

### Final Recommendation

**Create 3 files, not a folder of documentation.** The packaging test: 3 files, ~130 lines total, 4-5 adoption steps. The content-to-ceremony ratio is honest.

**Do NOT create:**
- Separate spec documents
- Phase-by-phase guides (put phases in README)
- Multiple registry formats (pick squads.yaml, kill .remotes)
- Published contracts directory (premature)
- Mermaid diagrams or architecture docs

### Key Constraint Honored

"The moment you propose something that requires a running process, you've crossed the line." Zero running services. Zero new dependencies.

---

## Decision 16c: Distributed Communication Technical Specification

**Date:** 2026-03-13  
**Author:** Frink (Systems Engineer)  
**Status:** Complete — specification produced  
**Scope:** Distributed squad communication — skill, schema, sync script, agent startup

### Specification Deliverables

1. **SKILL.md** — Teaches the three-zone model, transport hierarchy, read patterns, write partitioning, and anti-patterns
2. **squads.yaml schema** — Exact YAML schema with field reference (7 fields total, 3 required)
3. **sync-mesh script spec** — Cross-platform design (Node.js recommended with bash fallback)
4. **Agent startup spec** — Two new lifecycle phases (SYNC before read, PUBLISH after write)

### Key Technical Decisions

**1. Transport: Git + curl**
- Git handles auth, sync, conflict resolution, audit, offline
- Recommended for 85%+ of cases
- curl (~15 lines) for cross-org HTTP scenarios
- Zone 3 failures (remote-opaque) are non-fatal

**2. Registry Format: Flat squads.yaml with zone field**
- Simpler to parse and extend than nested zone groupings
- One YAML block per squad, not finding the right zone section
- Sync script filters by `zone` field

**3. Materialization Directory: .mesh/remotes/**
- All remote state lands under one well-known path
- Agent globs `.mesh/remotes/*/SUMMARY.md` to see all remote squads
- Zone 2 gets full mesh clones; Zone 3 gets contract files only

**4. Contract Surface: SUMMARY.md + INTERFACES.md**
- Two files, not a protocol
- SUMMARY.md = what you're doing
- INTERFACES.md = what you commit to
- "Mail slot" outputs for cross-org communication

### What This Does NOT Cover

- Actual implementation of the sync script
- CI/CD integration for automated sync
- Mesh repo creation workflow
- Garbage collection for stale drops
- mesh.yaml governance

These are implementation concerns, addressed when spec is approved and someone builds it.

---

## Decision 16d: Distributed Tooling Design — Convention-First Adoption

**Date:** 2026-03-13  
**Author:** Smithers (Platform Engineer)  
**Status:** Complete — design and adoption path settled  
**Scope:** Setup experience, tooling assessment, Squad skill integration, adoption friction

### Design Philosophy

User directive: "Choose the most simple implementation path." Every decision filtered through this constraint.

### Key Decisions

**1. Script Language: Bash Only**

30-line script doesn't warrant cross-platform maintenance. Document PowerShell equivalent as reference, don't maintain it. All operations work identically in bash environments.

**2. CLI Integration: Deferred (Convention First)**

No `squad sync` command or `--distributed` flag yet. Distributed pattern has zero production users. Earn the PR to Squad CLI after 3+ teams validate the convention.

**3. Adoption Path: Template Files + Documentation**

Not scaffolding or CLI magic. Three files users copy and edit:
- `squads.yaml.example`
- `sync-mesh.sh.example`
- `.squad/skills/distributed-mesh/SKILL.md`

Template files eliminate transcription errors; documentation tells you what to type.

**4. Skill Integration: distributed-mesh/SKILL.md**

Location: `.squad/skills/distributed-mesh/SKILL.md`  
Teaching: sync-read-work-write-publish lifecycle, zone trust model, write partitioning, anti-patterns  
Maintained under 60 lines including frontmatter

### 4-Step Setup Guide

1. Create shared mesh repo (once per org)
2. Register your squad (echo to state.md)
3. Add squads.yaml listing known squads
4. Sync before work, push after work

**Step count: 4.** No daemon, no server, no config service.

### Error Cases Handled

- git pull auth failures → SSH key troubleshooting
- git push non-fast-forward → rebase guidance
- curl 404 for Zone 3 → contact partner (human problem)
- Missing .mesh directory → clone command
- Stale data → sync guidance
- yq not found → install guidance or simplified script variant

### Phased Graduation to CLI

**Phase 0 (now):** Convention + templates + skill  
**Phase 1 (3+ teams validating):** `squad mesh init` command to Squad CLI  
**Phase 2 (cross-org appears):** Zone 3 HTTP support in sync script  

### Impact

Entire distributed tooling layer: **3 template files, 1 skill, 0 new dependencies, 0 running services.**

Users copy files, edit YAML, and run git pull. That's the platform.
