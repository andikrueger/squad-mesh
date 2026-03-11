# Architecture Review Summary

> This document consolidates 31 development artifacts from the squad-mesh architecture review process.
> It captures the design journey, key decisions, rejected alternatives, and the final architecture.
> For the system diagram, see [`package-architecture.mmd`](./package-architecture.mmd).

---

## Table of Contents

1. [What We Set Out to Build](#1-what-we-set-out-to-build)
2. [How the Thinking Evolved](#2-how-the-thinking-evolved)
3. [The Rebrand: holacracy → mesh](#3-the-rebrand-holacracy--mesh)
4. [Key Architectural Decisions](#4-key-architectural-decisions)
5. [What Was Rejected and Why](#5-what-was-rejected-and-why)
6. [The Final Architecture: squad-mesh](#6-the-final-architecture-squad-mesh)
7. [Review Team and Their Contributions](#7-review-team-and-their-contributions)
8. [Lessons for New Contributors](#8-lessons-for-new-contributors)

---

## 1. What We Set Out to Build

The project began as a design for **multi-squad AI agent coordination** — a "squad-of-squads" system where
autonomous agent teams could discover each other, share knowledge, resolve conflicts, and operate under
shared governance. The original vision used MCP (Model Context Protocol) as internal federation protocol
and A2A (Agent-to-Agent) for cross-organization communication, organized around a central hub.

**The core problem:** At 8+ squads, coordination breaks down. Squads duplicate work, make conflicting
decisions, lose institutional knowledge, and lack visibility into each other's state. The project owner
needed to steer multiple squads, see aggregated status, route issues, and capture cross-squad learnings.

**Initial constraints:**
- Local-first (all squads on one machine, filesystem-based)
- Git as substrate (every governance decision is a commit)
- Zero external dependencies for the core package
- AI-native (agents are first-class participants, not afterthoughts)

---

## 2. How the Thinking Evolved

The architecture went through four distinct phases over five days:

### Phase 1: Hub-and-Spoke (Day 1)

The original design proposed a centralized Org Context Hub coordinating squads via three protocol layers:
ACP (human→agent), MCP (agent→agent), and A2A (cross-org). Five reviewers validated the concept but
flagged critical risks: hub as single point of failure, "lossless MCP" being a fiction (MCP is
client-server RPC with no delivery guarantees), governance surface essentially unspecified, and a scale
ceiling around 10-15 squads.

**Key insight from this phase:** "90% of the hub could be a git repo" (Moe). Most coordination needs
are documentation problems (shared markdown), contract problems (schemas in git), or communication
problems. Only the remaining 10% requiring real-time queries justifies runtime infrastructure.

### Phase 2: Evidence-Based Reorientation (Day 2)

Real-world practitioner feedback demolished assumptions. Practitioners were already running multi-squad
coordination successfully with simple approaches:
- One ran 8 squads via REST APIs
- Another coordinated through natural language instructions
- A third used OneDrive sync for shared state

**Critical revision:** The correct sequence is bottom-up (independent squads → local discovery → organic
hub emergence → federation), not top-down (design hub → assign squads). The hub is a **data plane**
(git repo, API, database), not a **control plane** (active MCP server).

### Phase 3: Holacracy-First Endgame (Day 3)

Rather than phased rollout, the project owner directed the team to design the governance endgame
directly. The architecture adopted holacracy's core insight — distributed authority via tension sensing —
while discarding most holacracy ceremony:

| Holacracy Concept | Kept? | Rationale |
|---|---|---|
| Roles as contracts (purpose/domain/accountabilities) | ✅ Yes | Load-bearing — defines organizational structure |
| Tensions as machine-detectable signals | ✅ Yes | Load-bearing — sole mechanism for organizational change |
| Distributed authority | ✅ Yes | Load-bearing — squads own their domains |
| Governance loop (propose→object→integrate→adopt) | ✅ Yes | Load-bearing — processes tensions into structure |
| Constitution as meta-contract | ⚠️ Simplified | Useful for anti-thrash rules; formalism reduced |
| Circles (nested organizational units) | ❌ Deferred | Adds complexity without proven value at current scale |
| Link roles (lead/rep/facilitator/secretary) | ❌ Cut | Exist because humans are slow; agents don't need them |
| Governance meetings | ❌ Cut | All changes are git commits; no meetings needed |
| Four-round objection integration | ❌ Cut | Over-engineered for agent organizations |

Three independent reviewers converged: the tension-processing loop is the load-bearing mechanism;
everything else is optional scaffolding.

### Phase 4: Multi-Squad Coordination + Rebrand (Days 4-5)

The single-squad governance model was extended to multi-squad orchestration via:
- **`.meta-squad/` directory** for org-level coordination (registry, status, directives, learnings)
- **Directive tension type** for top-down steering through the same governance system
- **Common Operational Picture (COP)** aggregating health/status across all squads (NATO-inspired)
- **Knowledge propagation (yokoten)** for lateral learning transfer between squads

Simultaneously, the package was rebranded from `squad-holacracy` to `squad-mesh` (see §3).

---

## 3. The Rebrand: holacracy → mesh

### Why the Name Changed

The original package name `squad-holacracy` was an adoption blocker across three audiences:
- **Enterprise:** "Holacracy is a cult model; we're not doing that."
- **Startups:** "We tried holacracy. It didn't work."
- **Developers:** "Do I need to learn organizational theory to use your library?"

Analysis revealed the implementation was only ~40% holacracy and ~60% original architecture. The team
kept holacracy's core insights (role contracts, tension sensing, distributed authority) but ignored
most of its ceremony (circles, link roles, formal constitution, governance meetings) and added
AI-native concepts not present in holacracy (system prompt injection, agent autonomy as primitive,
filesystem-based discovery, NATO COP pattern, Toyota yokoten).

### Why "mesh"

Seven alternative names were evaluated:

| Name | Score | Verdict |
|---|---|---|
| **squad-mesh** | 9/10 | Winner — "like service mesh for squads," immediate DevOps recognition |
| squad-lattice | 7/10 | Too academic |
| squad-nexus | 7/10 | Overloaded term |
| squad-fabric | 6/10 | Conflicts with Microsoft Fabric |
| squad-graph | 8/10 | Valid for v1.0+ if graph analytics ship; aspirational today |
| squad-sync | 5/10 | Implies synchronization, not coordination |
| squad-weave | 6/10 | Too metaphorical |

"Mesh" captured the actual topology: distributed, peer-to-peer, no central authority, every node
connected to relevant neighbors. `squad-graph` was flagged as a future rebrand candidate (v1.0+)
conditional on shipping actual graph analytics (centrality algorithms, traversal, knowledge graphs).

### What Changed in the Rebrand

- Package name, description, keywords in `package.json`
- README rewritten: "what organizational theory is this?" → "what does this tool do for me?"
- All code references: `HolacracyValidationError` → `MeshValidationError`, etc.
- Directory convention: `.holacracy/` never shipped; `.squad/` retained as the standard
- Zero holacracy references remain in user-facing surfaces

---

## 4. Key Architectural Decisions

### Decision 1: Tension Loop as Sole Mechanism

**What:** One mechanism (tension processing) replaces four (phased triggers). Tensions are
machine-detectable gaps between what contracts promise and what reality delivers. The governance
loop transforms tensions into structural changes.

**Why:** Simpler AND more powerful. Phases were pre-computed tension resolutions. The tension loop
handles everything phases were designed for, but dynamically.

### Decision 2: Hub Dissolves into Git Artifacts

**What:** No runtime hub service. Organization state lives in `.squad/` and `.meta-squad/` directories
in git. A runtime service emerges only when a tension demonstrates file-based governance is too slow.

**Why:** Practitioners proved git-based coordination works at current scale (8 squads, 1 machine).
Runtime hub earns its existence through measured pain, not theoretical need.

### Decision 3: Local-First Until Proven Otherwise

**What:** All modules are 100% filesystem-based. Zero HTTP. API contracts deferred until discovery
returns empty because a squad is genuinely unreachable via filesystem.

**Why:** For local squads, every API capability loses to local filesystem reads. Adding APIs costs
~200-400 engineering hours for zero measurable benefit at current scale. An I/O abstraction layer
enables future API backends without premature investment.

### Decision 4: Security as Constitutional Hard Limits

Seven non-negotiable constraints (proposed by the governance reviewer):
1. No autonomous cross-org code modification — human review mandatory
2. No autonomous org creation — human approval required
3. No capability delegation beyond one hop (A→B allowed, A→B→C not)
4. Security-critical systems off-limits (identity, crypto, PKI, infrastructure)
5. Max federation depth of 2
6. 24-hour quarantine for cross-org-initiated changes
7. Annual federation recertification — stale relationships auto-suspend

These are constitutional constraints, not configuration. They can be relaxed as AI safety matures
but cannot be absent at launch.

### Decision 5: Evidence-Based Feature Activation

No feature ships without a measured trigger. No feature survives without measured usage.

| Trigger | Threshold | Action |
|---|---|---|
| Squad unreachable via filesystem | `discoverSquads()` returns 0 | Add remote discovery |
| >15 squads | Filesystem scan >5s | Add indexed registry |
| Concurrent write corruption | Data loss reported | Add file locking |
| Feature unused after 30 days | Zero adoption | Delete it |

### Decision 6: Directive Tension Type for Top-Down Steering

**What:** Human-originated directives flow through the same governance system as bottom-up tensions.
Directives require acknowledgment within 1 cycle; squads may object via standard governance.

**Why:** Top-down steering shouldn't bypass governance. The directive type routes work down through
the same mechanism that routes tensions up. Authority is clear; audit trail is complete.

---

## 5. What Was Rejected and Why

| Rejected Approach | Reason |
|---|---|
| **Holacracy naming** | ~40% overlap with actual holacracy; name was adoption blocker across enterprise, startup, and developer audiences. Rebranded to `squad-mesh`. |
| **Phased rollout (Phase 0→1→2→3)** | Phases were pre-computed tension resolutions. One mechanism (tension loop) replaces four (phase triggers) — simpler and more adaptable. |
| **API-first approach** | All squads are local (1 machine). APIs add latency, auth debt, availability concerns with zero functional benefit. Local filesystem wins for every capability at current scale. |
| **Three-protocol architecture (ACP/MCP/A2A)** | Collapsed to one contract model. Transport is irrelevant to the governance model. A2A survives only as a cross-trust-boundary option. |
| **Hub-and-spoke topology** | Hub is a SPOF that must earn its existence. Dissolved into git artifacts. Runtime service deferred until measured need. |
| **Squad Federation Protocol (SFP)** | Over-engineering for current scale. Deferred, not rejected — reactivated at >15 squads with delivery failures. |
| **Full holacracy ceremony** | Circles, link roles, governance meetings, four-round objection — all exist because humans are slow. Agents don't need them. 80% ceremony, 20% value. |
| **Capability transfer between squads** | Capabilities don't transfer; tasks do. Task delegation now, capability manifests later, MCP proxying when platforms support it. |
| **squad-graph naming** | Accurate for future (v1.0+) but aspirational today. Code is array-oriented, not graph-structured. Zero traversal algorithms. "We haven't earned the name yet." |

---

## 6. The Final Architecture: squad-mesh

### What It Is

squad-mesh is a **multi-squad coordination mesh** — distributed governance, visibility, and knowledge
propagation for autonomous AI agent teams. It provides organizational primitives (roles, tensions,
directives) rather than engineering abstractions (protocols, services, APIs).

### The 6 Pillars

| Pillar | Subsystem | What It Does |
|---|---|---|
| **Discovery** | Filesystem Scanner + Registry | Finds squads via filesystem markers (`.squad/`, `squad.config.ts`). Local-first scanning with registry fallback. |
| **Status/COP** | Health Assessment + Work Items | Aggregates squad health (green/yellow/red), blockers, decisions into a Common Operational Picture. NATO-inspired. |
| **Steering** | Directives + Tensions + Routing | Top-down directives and bottom-up tensions flow through unified governance. Priority, deadline, escalation built in. |
| **Knowledge** | Learnings + Classification + Propagation | Cross-squad learning transfer. Learnings classified by scope (squad-specific, domain-relevant, universal). Toyota yokoten model. |
| **Coordinator** | System Prompt + COP Injection | Generates AI agent system prompts with current organizational state, tension detection rules, and directive compliance. |
| **Builders** | `defineMetaSquad()` + config functions | Type-safe configuration API. `defineDiscovery()`, `defineSteering()`, `defineVisibility()`, `defineKnowledge()`, `defineHealth()`. |

### Mesh Topology

```
Squad A ←──tension──→ Squad B
  ↕                     ↕
directive            learning
  ↕                     ↕
Squad C ←──status───→ Squad D
  ↕                     ↕
  └────── .meta-squad/ ──────┘
         (git artifacts)
```

Every squad is a peer node. No central hub. Coordination happens through shared git artifacts
(`.squad/` per squad, `.meta-squad/` at org level). Edges are typed: tensions, directives, learnings,
status updates. The `.meta-squad/` directory is a coordination artifact, not a service.

### Key Design Properties

- **Local-first:** All data on local filesystem. Zero network dependencies.
- **Git-native:** Every governance decision is a git commit. Rollback = revert. Audit trail = git log.
- **AI-native:** System prompt injection as coordination primitive. Agents sense tensions, process
  governance, and propagate learnings as part of their normal operation.
- **Anti-thrash:** Constitutional cooldown periods, evidence thresholds, and human circuit breakers
  prevent machine-speed governance from becoming organizational chaos.
- **Zero-dep:** Node.js stdlib only (`node:test`, `node:assert`, `node:fs`, `node:path`). No
  framework lock-in.

### Scale Path

| Scale | Architecture | Coordination |
|---|---|---|
| 1-8 squads | Local filesystem, `.squad/` + `.meta-squad/` | Git artifacts, CLI |
| 8-15 squads | Add indexed registry, file locking | REST API for discovery only |
| 15-20 squads | Regional coordination, I/O abstraction | API contracts, remote discovery |
| 20+ squads | Federation layer, sub-leads | SFP protocol, mTLS, policy gateway |

---

## 7. Review Team and Their Contributions

The architecture was stress-tested by five specialist reviewers:

| Reviewer | Role | Key Contribution |
|---|---|---|
| **Burns** | Lead Architect | Tension loop as sole mechanism; meta-circle pattern; rebrand analysis; implementation plan |
| **Chalmers** | Org Pattern Specialist | Conway's Law inversion; holacratic contracts; cross-squad visibility layer; yokoten model |
| **Moe** | Skeptic / Critic | "80% ceremony, 20% value" holacracy strip; evidence-based activation; local-first defense; YAGNI enforcement |
| **Frink** | Systems Engineer | Protocol reality check ("lossless MCP is a lie"); SFP envelope design; CLI hybrid approach |
| **Skinner** | Governance Analyst | 8 governance gaps; 7 security hard limits; threat model for cross-org federation |
| **Smithers** | Platform Engineer | Package audit; error categorization pattern; persistence error handling; production readiness |

### Convergence Points (All Reviewers Agreed)

1. Roles-as-contracts are the organizational primitive
2. Tensions-as-signals are the sole change mechanism
3. Hub dissolves into git artifacts
4. Start minimal, add complexity only with evidence
5. Security constraints are non-negotiable hard limits

### Key Divergence (Resolved)

**Ceremony level:** Chalmers advocated full holacracy structure (justified because agents eliminate
human overhead). Moe advocated absolute minimum (contracts + tensions + authority = MVP). Burns
synthesized: tension loop is load-bearing; everything else is optional scaffolding measured for value.

---

## 8. Lessons for New Contributors

### Design Principles to Internalize

1. **Earn your complexity.** Don't build infrastructure you haven't justified with measured pain.
   Every feature needs an activation trigger and a kill switch.

2. **The tension loop is sacred.** All organizational change — bottom-up tensions, top-down
   directives, cross-squad escalations — flows through the same governance mechanism. Don't create
   bypass channels.

3. **Local-first is a feature, not a limitation.** Filesystem operations are faster, simpler, and
   more reliable than APIs at current scale. The architecture is designed to grow into remote
   capabilities when evidence demands it.

4. **Git is the substrate.** Every decision is a commit. Every rollback is a revert. The org
   structure is code. Don't introduce state that lives outside git without strong justification.

5. **AI-native means prompt injection is a coordination primitive.** Agents don't read dashboards;
   they receive system prompts. The coordinator subsystem generates prompts that embed organizational
   state, tension detection rules, and directive compliance instructions.

6. **Additive changes only in public types.** Never break backward compatibility. New fields are
   optional. The `warnings` pattern (added alongside existing `errors`) is the precedent.

### Organizational Analogies That Shaped the Design

| Source | What We Borrowed | Where It Shows Up |
|---|---|---|
| **NATO C2** | Common Operational Picture; voluntary interoperability | COP rollup; status aggregation |
| **Toyota** | Yokoten (lateral knowledge deployment) | Knowledge propagation subsystem |
| **Holacracy** | Role contracts; tension sensing; distributed authority | Governance model (stripped of ceremony) |
| **Service mesh (Istio)** | Distributed topology; no central authority; typed edges | Naming; mesh metaphor; peer coordination |
| **Mycelium networks** | Decentralized nutrient sharing; anti-fragile underground network | Hub-as-substrate (not hub-as-authority) |

### What the Code Actually Is (vs. What It Could Become)

- **Today:** Array-oriented + document-oriented. `SquadIdentity[]` flat lists. Knowledge propagation
  is `Array.filter()`. COP is `Array.map()` + `reduce()`. Relationships stored as JSON documents.
- **Not yet:** Graph-structured. Zero traversal algorithms (no BFS/DFS/path-finding/cycle-detection).
  Graph analytics are a v1.0+ aspiration, not a current capability.
- **Honest labeling matters.** Don't use graph terminology before graph structures exist. Don't claim
  "lossless" when the protocol is best-effort. The architecture earns its vocabulary.

### Files That Matter

| File | Purpose |
|---|---|
| `packages/squad-mesh/src/discovery/` | Filesystem scanner, registry, squad list |
| `packages/squad-mesh/src/status/` | Health assessment, COP generation |
| `packages/squad-mesh/src/steering/` | Directives, tensions, routing, escalation |
| `packages/squad-mesh/src/knowledge/` | Learnings, classification, propagation |
| `packages/squad-mesh/src/coordinator/` | System prompt generation, AI injection |
| `packages/squad-mesh/src/types.ts` | All type definitions — the contract surface |
| `.meta-squad/` | Org-level coordination artifacts |
| `.squad/` | Per-squad governance, status, decisions |

---

*This summary was consolidated from 31 architecture review documents produced during March 2026.
The original artifacts included agent analyses, spec drafts (2,047-line endgame spec), endgame
iterations, skeptic reviews, implementation plans, and stress tests. The Mermaid diagram
(`package-architecture.mmd`) is preserved alongside this summary as a visual reference.*
