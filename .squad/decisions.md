# Squad Decisions

## Active Decisions

### 1. Holacracy-First Architecture Replaces Phased Approach
**Date:** 2026-03-13  
**Author:** Burns (Lead Architect)  
**Status:** Proposed — awaiting team review  

Adopt holacracy-first architecture targeting multi-squad coordination. Replaces phased approach (Phase 0 → 1 → 2 → 3) with single governance mechanism: tension processing over role contracts.

**Key Changes:**
1. Roles replace squads as organizational primitive; every squad holds a role defined by purpose, domain, accountabilities in `.holacracy/roles/*.yaml`
2. Circles replace hubs; organizational nesting defined by circles in `.holacracy/circles/*.yaml`
3. Tensions replace phase triggers; all organizational change flows through tension-processing loop
4. `.holacracy/` directory replaces `.squad-org/`; contains constitution, roles, circles, tensions, governance log
5. Three protocol layers (ACP/MCP/A2A) collapse to one contract model; transport is irrelevant
6. Human remains organizational architect; agents staff roles and run governance loop

**What's Preserved:** Skinner's 7 security constraints, Frink's "send work not tools," squad autonomy, Conway's Law, git as substrate

**What's Cut:** Hub topology, Squad Federation Protocol, phased rollout with pain-point triggers, ACP as separate layer, capability negotiation

**Minimum Viable:** Three files (constitution.yaml, roles/*.yaml, root circle.yaml) + one process (tension loop) + one system prompt instruction

**Rationale:** Simpler than phased approach — one mechanism (tension loop) instead of four (phase triggers). Governance loop discovers and resolves problems dynamically rather than pre-computing solutions.

**Risks:** Thrashing (mitigated by cooldown/evidence thresholds/human circuit breakers), cold start noise, governance execution model unclear

---

### 2. Holacratic Contract Model for Agent Squads
**Date:** 2026-03-13  
**Author:** Chalmers (Org Pattern Specialist)  
**Status:** Proposed — needs team review  
**Scope:** Organizational model, governance structure, charter format

Proposes replacing phased architecture with holacracy-first model based on Robertson's Holacracy Constitution, adapted for agent organizations. Five load-bearing elements:

1. **Constitution** — immutable meta-contract defining governance (`.squad/constitution.md`)
2. **Role Contracts** — charters gain explicit purpose, exclusive domain, observable accountabilities, metrics
3. **Circle Nesting** — roles expand into circles when needed, collapse when not
4. **Tension Protocol** — sensed gaps trigger governance changes via integrative decision making
5. **Link roles** — lead link (strategy down, human-appointed), rep link (reality up, agent-elected), facilitator, secretary

**What This Cuts:** Three protocol layers (absorbed), phased rollout, hub-and-spoke topology, routing.md, ceremonies.md, decisions.md inbox pattern

**What This Adds:** `.squad/constitution.md`, `.squad/governance.md`, `.squad/circles/` directory, enhanced charters with purpose/domain/accountabilities

**Impact on Team:**
- Burns: Lead link role formalized
- Frink: Protocol work reframed as constitution-agnostic
- Skinner: 8 governance gaps filled by constitution articles
- Moe: Validates "premature complexity" critique by proving simpler model works
- Smithers: Platform work reframed as a role with clear accountabilities
- Scribe: Formalized as Secretary role

**Open Questions:**
1. Who can amend constitution? (Recommendation: human owner only)
2. How to route cross-circle tensions?
3. How many metrics per role? (Recommendation: 2-4)
4. Rep link election mechanics for agents?
5. How to preserve institutional memory during restructuring?

---

### 3. Holacracy Endgame Specification (Definitive)
**Date:** 2026-03-13  
**Author:** Burns (Lead Architect) + team synthesis  
**Status:** Complete — documented in `architecture-review/holacracy-endgame-spec.md`  

Comprehensive holacracy-first architecture specification (2047 lines, 10 sections) synthesizing Burns' foundational analysis with Chalmers' org rigor and Moe's minimalist critique. Tension loop established as single load-bearing mechanism; ceremony (constitution, circles, link roles) positioned as optional scaffolding to be measured for value.

**Core Model (All Three Reviewers Agree):**
1. Roles are contracts with purpose, domain, accountabilities
2. Tensions are machine-detectable discrepancies triggering governance decisions
3. Hub concept dissolves into `.holacracy/` git artifacts (constitution.yaml, roles/*.yaml, circles/*.yaml)
4. Distributed authority with cryptographic verification
5. Scale ceiling ~15-20 squads per hub; federation via governance decisions

**Key Tensions Resolved:**
- **Chalmers position** (full ceremony): Justified because agent properties eliminate human overhead
- **Moe position** (minimize ceremony): Contracts + tensions + authority = MVP; measure rest for value
- **Burns synthesis**: Tension loop is load-bearing; everything else is optional scaffolding

**What's Preserved:** Skinner's 7 security constraints, Frink's "send work not tools," squad autonomy, Conway's Law, git as substrate

**What's Cut:** Hub-and-spoke topology, Squad Federation Protocol, phased rollout with pain-point triggers, ACP as separate layer, capability negotiation

**Minimum Viable:** Constitution (governance rules), role files (purpose/domain/accountabilities), root circle (structure), plus tension-processing loop in system prompts

**Implementation Path:** Sections 7 & 10 provide concrete file structure and real-world example of end-to-end lifecycle

**Measurement Framework:** TBD by team — Moe's critique requires proving ceremony delivers value beyond MVP core

---

### 4. Community Ground Truth Integration (Burns)
**Date:** 2026-03-12  
**Author:** Burns (Lead Architect)  
**Status:** Incorporated into Decision 3 (Holacracy Endgame Spec)  
**Evidence Base:** Teams practitioners (Tamir Dresher, Jeff Fritz, Dina Berry, Pallav Rustogi, Wil Isaacs)

Key revisions to prior theoretical analysis based on real-world validation:
1. Hub is data plane, not control plane — can be git at small scale, REST + database at large scale
2. Coordination emerges bottom-up, not top-down — independent squads → local discovery → organic hub
3. Three hosting levels must coexist: ephemeral (CLI), persistent local (daemon), cloud (Actions/Azure)
4. Capabilities don't transfer; tasks do — task delegation (now), capability manifests (near-term), MCP proxying (speculative)
5. Squad spawning requires governance: spawn tokens, permission attenuation, resource budgets, lineage registry

---

### 4a. Authority, Org Design & Conway's Law (Chalmers)
**Date:** 2026-03-11  
**Author:** Chalmers (Org Pattern Specialist)  
**Status:** Incorporated into Decision 3

Key patterns for team discussion:
1. **Conway's Law as Design Tool** — Squad topology determines software architecture; frame as first principle
2. **Squad Mitosis Triggers** — Context overflow, domain divergence, throughput bottleneck, expertise depth; NOT architectural symmetry
3. **Stale State Risk** — `.squad/` decisions need TTL/decay mechanism; decisions >N sprints without revalidation should be reviewed
4. **Hub Value = Synthesis** — MVP hub's first capability should be cross-squad insight synthesis, not message routing
5. **Endgame Vision** — Design for conservative target but don't prevent radical target (holacracy at machine speed later)

---

### 4b. Evidence-Based Architecture Reorientation (Moe)
**Date:** 2026-03-12  
**Author:** Moe (Skeptic / Critic)  
**Status:** Proposed as architectural principle; incorporated into Decision 3 critique

**Evidence:** Real-world practitioners succeeding with simple approaches (REST, shared directories, natural language) at all current scales.

**Proposed Actions:**
- **Now:** `.squad-org/` shared directory convention (squads.json, decisions/, patterns/, status.json); document Jeff's REST API pattern; document Pallav's natural language pattern
- **Deferred:** MCP federation, A2A negotiation, discovery mechanisms, runtime hub, Squad Federation Protocol
- **Cancelled:** Self-organizing squad creation, 3-phase rollout to federation

**Activation Criteria for Protocol Work:** >15 squads reporting specific failures unsolvable by git+REST, OR concrete cross-org requirement, OR <1 minute policy propagation need (proven, not hypothetical)

**Principle:** Phase 0 (shared directories) IS the product until evidence says otherwise. Any feature with zero usage after 30 days should be deleted.

---

### 4c. Protocol Stack — Layered Build by Measured Pain (Frink)
**Date:** 2026-03-12  
**Author:** Frink (Systems Engineer)  
**Status:** Proposed; aligns with Moe's evidence-based approach

**4-Layer Stack (Incremental):**
1. **Knowledge Sharing** — Git + manifest.yaml (NOW)
2. **Coordination Hub** — REST API registry/aggregation/discovery (NOW)
3. **Task Delegation** — REST or GitHub Issues (Month 2-3)
4. **Cross-Org Boundary** — A2A over HTTPS (Month 4+)

**Key Design Principles:**
- REST over MCP for inter-squad (MCP stays within squads)
- "Send the work, not the tools" — task delegation with context snapshots
- Dual-mode transport (direct REST + GitHub Issues) for cloud compatibility
- Defer Squad Federation Protocol, MCP Notifications, envelope protocol to 15+ squads scale

**Supersedes:** Previous SFP recommendation; SFP deferred, not rejected

---

### 4d. Auth & Security Hard Limits for Federation (Skinner)
**Date:** 2026-03-12  
**Author:** Skinner (Governance Analyst)  
**Status:** Proposed; critical blocker for Phase 2+

**Hard Limits for Cross-Org Federation (Phase 3):**
1. No autonomous cross-org code modification — human review mandatory
2. No autonomous org creation — human approval required
3. No capability delegation beyond one hop — A→B allowed, A→B→C not allowed
4. Security-critical systems off-limits — identity, crypto, PKI, infrastructure
5. Max federation depth of 2 — Hub → Squad → External Squad
6. 24-hour quarantine for cross-org-initiated changes
7. Annual federation recertification — stale relationships auto-suspend

**Additionally Required:**
- **Auth from Day 1** of internet-facing deployment (mTLS for squad↔hub)
- **Filesystem sharing Phase 0 only** — multi-squad coordination must use authenticated APIs
- **Audit trail mandatory for Phase 1** — append-only, tamper-evident, separate security domain

**Rationale:** Current AI safety capabilities (prompt injection risk, intent assessment gaps, no persistent trust) make fully autonomous cross-org AI agent coordination unsafe. These limits can be relaxed as AI safety matures but cannot be absent at launch.

---

### 5. Meta-Circle Pattern for Squad-of-Squads Leadership (Burns)
**Date:** 2026-03-12  
**Author:** Burns (Lead Architect)  
**Status:** Proposed — needs team review  
**Relates to:** Decision 3 (Holacracy Endgame Spec)  
**Triggered by:** The project owner's question about top-down steering and cross-squad visibility  

**Problem:** The holacracy endgame spec is bottom-up by design. A human leading multiple squads needs complementary top-down capabilities: directives, status visibility, knowledge aggregation.

**Solution:** Four additions to the holacracy spec:

1. **`directive` Tension Type** — Human-originated, top-down work assignments flowing through same governance system as bottom-up tensions. Directives require acknowledgment within 1 cycle; squads may object via standard governance.

2. **`advisory` Tension Type** — Non-actionable cross-squad information sharing. No governance response required — purely informational.

3. **`.meta-squad/` Directory Pattern** — Organization-level coordination layer:
   - `registry/` — one YAML per squad (pointer to repo + charter summary)
   - `status/current.yaml` — aggregated status across all squads (auto-generated)
   - `directives/` — directive lifecycle tracking
   - `learnings/registry.yaml` — yokoten (cross-squad knowledge transfer)

4. **Squad Status Heartbeat Protocol** — Each squad publishes `.squad/status.yaml` during governance cycles. Meta-circle aggregator reads these for cross-squad status dashboard.

**Design Principles:**
- NOT a hub — read-heavy git artifacts with no runtime service
- Consistent with Moe's YAGNI and the spec's git-as-substrate principle
- Adds outer ring around holacracy model without changing existing design
- Enables the project owner's requirements: steer, see status, route issues, capture learnings

**Impact:** Spec changes (Tension schema, Article 4 authority clause). New artifacts (`.meta-squad/` directory and schemas). All existing design preserved.

**Reference:** Full analysis in `architecture-review/burns-squad-leader-visibility.md`

---

### 6. API Contract Evolution for squad-mesh (Burns) [Historical — pre-rename]
**Date:** 2026-03-13  
**Author:** Burns (Lead Architect)  
**Status:** Proposed — awaiting team review  
**Triggered by:** GitHub Issue [bradygaster/squad#355](https://github.com/bradygaster/squad/issues/355) + the project owner's observation on API-based contracts  
**Relates to:** Decision 3 (Holacracy Endgame), Decision 4b (Moe evidence-based), Decision 4c (Frink protocol stack), Decision 4d (Skinner security), Decision 5 (Meta-circle)

**Decision:**

Evolve squad-mesh (originally squad-holacracy) from filesystem-only to contract-based access in three layers, activated by measured pain.

**Layer 1: External Doc Skill (Now)**
- Add `.squad/skills/external-docs.md` wrapping `chub` CLI for external API documentation
- Add `.squad/docs/annotations/` convention for git-tracked API annotations (new knowledge tier)
- No code changes to extension — skill + file convention only
- **Activation:** Immediate (issue #355 is the pain evidence)

**Layer 2: Remote-Aware Discovery (Month 2)**
- Add `'remote-registry'` to `DiscoverySource`, optional `url` to `SquadIdentity`
- Read-only HTTP GET against remote registry endpoints
- **Activation criteria:** First squad that cannot be discovered via local filesystem

**Layer 3: API Contract Interface (Month 4+)**
- Define `SquadAPIContract` interface (listSquads, getStatus, getCOP, getLearnings, issueDirective)
- `LocalSquadAPI` wraps existing fs-based code; `RemoteSquadAPI` uses HTTP
- **Activation criteria:** >15 squads with filesystem-unsolvable failures, OR cross-org requirement, OR directive SLA that git latency can't meet

**Rationale:**

Issue #355 (external API docs) and cross-squad orchestration are the same architectural problem at different scales: accessing knowledge not on the local filesystem. A contract-based interface with pluggable backends (local fs, HTTP) solves both without abandoning local-first as default.

Context-hub is a useful tool but wrong as an architecture. We adopt its patterns (search→fetch→annotate, incremental fetch, structured frontmatter) through a skill layer while keeping governance, trust, and git-native audit trail in squad-mesh.

**What This Preserves:**
- Git as substrate (Decisions 3-5)
- Local-first as default (until pain proves otherwise)
- Evidence-based activation (Decision 5c, Moe)
- Skinner's security limits (auth comes with Layer 3)

**What This Adds:**
- External API documentation as a knowledge tier
- Path to remote squad discovery
- Interface contract that separates data model from transport

**Impact:**
- **Types:** `SquadIdentity` gains optional `url` and `accessMode` (Layer 2)
- **Discovery:** `DiscoverySource` gains `'remote-registry'` (Layer 2)
- **New module:** `packages/squad-mesh/src/api/contract.ts` (Layer 3)
- **No breaking changes:** All current behavior preserved; new capabilities are additive

**Reference:** Full analysis: `architecture-review/burns-issue355-api-contracts.md`

---

### 7. Local-First Remains Correct; API Contracts Deferred (Moe)
**Date:** 2026-03-13  
**Author:** Moe (Skeptic / Critic)  
**Status:** Proposed — awaiting team review  
**Triggered by:** bradygaster/squad#355, the project owner's API contract position  
**Relates to:** Decision 4b (Phase 0 IS the product), Decision 8 (zero usage = delete), Decision 9 (SDK forward-compatibility)

**Position:**

Keep local-first. Do not add API contracts (yet).

**Summary:**

---

### 8. Discovery Engine Error Categorization Pattern (Smithers)
**Date:** 2026-03-14  
**Author:** Smithers (Platform Engineer)  
**Status:** Implemented  
**Scope:** `packages/squad-mesh/src/discovery/`

**Context:** The discovery engine silently swallowed errors (permissions, long paths, deleted directories) or buried them at the bottom of output. Two bugs required a pattern decision.

**Decision:**

**Additive warnings field.** `DiscoveryResult` gains a `warnings: DiscoveryWarning[]` field. The existing `errors` array is preserved unchanged for backward compatibility. Warnings carry a machine-readable `category` (`permission-denied`, `path-too-long`, `not-found`, `unknown`) and a human-readable `message`.

**Pattern:** Every filesystem error in discovery is now dual-reported — once to `errors` (legacy, raw) and once to `warnings` (categorized, actionable). Callers that only read `errors` see no change. Callers that opt into `warnings` get structured data they can filter/group.

**Windows MAX_PATH:** Paths >250 chars on Windows get a UNC prefix (`\\?\`) attempt before failing. This is a best-effort workaround, not a guarantee — some Windows APIs still reject UNC paths.

**Team Impact:**
- **Frink (Protocol):** No protocol impact — this is filesystem-only.
- **Burns (Architecture):** Sets precedent for "additive fields, never breaking" in public types.
- **Skinner (Governance):** Permission errors now visible and categorized — useful for security auditing.
- **All consumers:** `formatDiscoverySummary(result)` available for top-of-output warning banners.

---

### 9. Steering Persistence Error Handling Pattern (Smithers)
**Date:** 2026-03-14  
**Author:** Smithers (Platform Engineer)  
**Status:** Implemented  
**Scope:** `packages/squad-mesh/` — steering and knowledge modules

**Context:** `saveDirective()` and `saveTension()` called `fs.mkdirSync()` with `{ recursive: true }` but had no error handling. If directory creation failed (permissions, missing parent, read-only FS), the data was created in memory but never persisted. The user saw no error — next run, data was gone.

**Decision:**

1. **All save functions** (`saveDirective`, `saveTension`, `saveLearning`, `savePattern`) now use an `ensureDirectory()` helper that wraps `mkdirSync` in a try/catch and throws a descriptive error on failure.
2. **All load functions** (`loadDirectives`, `loadTensions`, `loadLearnings`, `loadPatterns`) log a `console.warn` when the expected directory doesn't exist, then return an empty array. They do not crash.
3. **New `initializeSteering(metaSquadRoot)` function** pre-creates the three steering subdirectories (`directives/`, `governance/`, `tensions/`) and returns a status object `{ created: string[], alreadyExisted: string[] }`. Exported from barrel.

**Rationale:** Silent data loss is the worst class of bug in a persistence layer. Better to fail loudly on write (user can investigate) and degrade gracefully on read (system remains functional). The `initializeSteering` function gives callers an explicit way to ensure the directory tree exists before any writes.

**Impact:**
- No public API breakage — all existing function signatures unchanged
- New export: `initializeSteering` + `SteeringInitResult` type
- Same pattern applied to knowledge module for consistency

---

### 10. Integration Test Framework for squad-mesh (Burns)
**Date:** 2026-03-12  
**Author:** Burns (Lead/Architect)  
**Status:** Adopted  
**Scope:** packages/squad-mesh testing

**Context:** Needed a test framework for integration tests against the discovery engine and future holacracy subsystems.

**Decision:**

- **Framework:** `node:test` + `node:assert` (Node.js built-in, zero external dependencies)
- **Runner:** `tsx` for TypeScript execution without a compile step
- **Pattern:** Temp directory scaffolding in `before()`, cleanup in `after()`, filesystem-based assertions
- **Script:** `test:integration` in package.json

**Rationale:**
- Zero-dep aligns with squad-sdk conventions (already used in steering tests)
- `tsx` already available in the monorepo toolchain
- Built-in test runner provides `describe/it/before/after` — no need for Jest/Vitest overhead
- Integration tests live at `tests/integration/` separate from future unit tests

**Implications:**
- All new integration tests should follow this pattern
- No test framework lock-in — stdlib only
- Tests must clean up their own temp directories

---

### 11. COP Health Assessment Cannot Produce 'red' (Burns)
**Date:** 2026-03-12  
**Author:** Burns (Lead/Architect)  
**Status:** Observation — needs team input  
**Scope:** `packages/squad-mesh/src/status/`

**Context:** While writing integration tests for the COP rollup pipeline, I discovered that `assessSquadHealth()` (used by `collectSquadStatus()` and `generateCOP()`) only returns `green | yellow | unknown` — never `red`. The `red` health level only surfaces through `generateHealthReport()` → `blocker-count` signal (threshold ≥ 3), which is **not** called by the COP pipeline.

**Impact:**
- `generateCOP().systemHealth` can never be `red`, even if a squad has 10 active blockers.
- The compact status line (`generateCompactStatus()`) will show "blocked" squads via the separate blocker count, but `health=red` never appears.
- If COP is used for real alerting or escalation triggers, this gap would mask critical squad states.

**Options:**

1. **Wire `generateHealthReport()` into `collectSquadStatus()`** — incorporate signal-based health (including blocker-count) into the COP flow.
2. **Add blocker-aware logic to `assessSquadHealth()`** — check `blockers.md` directly and return 'red' when blockers exist.
3. **Accept the gap** — document that COP health is activity-recency only, not blocker-aware.

**Recommendation:** Option 2 — cheapest change, biggest improvement. `assessSquadHealth()` already reads filesystem state; adding a blockers.md check is ~5 lines and makes the COP pipeline honest.

---

### 12. Steering Integration Test Strategy (Burns)
**Date:** 2026-03-14  
**Author:** Burns (Lead/Architect)  
**Status:** Implemented  
**Scope:** `packages/squad-mesh/tests/integration/`

**Context:** Smithers is fixing steering persistence bugs while we need test coverage for the full directive and tension lifecycle. Tests must be resilient to both pre-fix and post-fix behavior.

**Decision:**

- **Zero-dep test framework:** `node:test` + `node:assert` — no Vitest/Jest. Keeps the squad-mesh package free of test framework dependencies.
- **Real filesystem, temp dirs:** Tests use `os.tmpdir()` with cleanup in `after()`. No mocks — we're testing actual persistence behavior.
- **Self-healing persistence validated:** `saveDirective()` creates its own directories. Tests confirm this works, making Smithers' mkdir fixes complementary rather than blocking.
- **Added `test:integration` script** to package.json: `npx tsx --test packages/squad-mesh/tests/integration/*.test.ts`

**Consequences:**
- Any squad member can run `npm run test:integration` from the repo root to validate steering
- Tests document the full API contract — serves as living spec for the steering engine
- Edge case coverage (malformed files, duplicate responses, single-target directives) catches regression

---

### 13. CLI Integration — Standalone Hybrid Approach (Frink)
**Date:** 2026-03-12  
**Author:** Frink (Systems Engineer)  
**Status:** Implemented (spike)  
**Scope:** `packages/squad-mesh/src/cli/`

**Context:** The squad-mesh extension had CLI command stubs (`META_SQUAD_COMMANDS`, handler functions) but no way to actually run them. The Squad SDK (`@bradygaster/squad`) has no plugin/extension hook for registering CLI commands yet.

**Decision:** **Option C: Hybrid** — Standalone CLI now, SDK plugin-ready later.

- `packages/squad-mesh/src/cli/main.ts` is the CLI entry point
- `package.json` has `"bin": { "squad-mesh": "./dist/cli/main.js" }`
- `registerCommands()` exported for future SDK integration

---

### 14. Rebrand: squad-holacracy → squad-mesh (Burns)
**Date:** 2026-03-14  
**Author:** Burns (Lead Architect)  
**Status:** Proposed  
**Tags:** branding, adoption, positioning

**Executive Summary:**

Current name `squad-holacracy` obscures what we built. Architecture is ~40% holacracy, ~60% novel (AI-native orchestration, local-first filesystem, tension-based escalation, COP aggregation, knowledge propagation). Holacracy branding carries enterprise baggage and is adoption blocker (polarizing, misrepresentative).

**Recommendation:** Rename to **`squad-mesh`** — captures distributed peer-to-peer topology without central hub. Tested alternatives: lattice, nexus, fabric, sync, orbit, weave, relay (ranked 2-7).

**Key Findings:**
- **What we kept from holacracy:** Role-as-contract, tension sensing, distributed authority, governance loop, consent escalation
- **What we ignored:** Circles, link roles, constitution formalism, governance meetings, 4-round objection integration
- **What we added:** System prompt injection, agent autonomy as primitive, local-first discovery, Toyota yokoten, NATO COP

**Adoption Impact:**
- Enterprise: "Mesh orchestration, like Istio. I understand."
- Startups: "Distributed coordination for autonomous agents. That's what we need."
- Developers: "Squad mesh is like service mesh. Got it."

**Implementation Plan:**
1. Rename package.json (name + description + keywords)
2. Rewrite README with new narrative (governance without bureaucracy, visibility without dashboards)
3. Update types.ts comments: replace "holacratic" with "distributed governance"
4. Update coordinator system prompt
5. Publish as v0.2.0 (minor version due to branding clarity)
6. Alias `squad-holacracy` until v1.0 for backward compat

**Risks (all low-medium):**
- Rename breaks adoption → mitigate: clear announcement
- Name conflict → mitigate: npm check (available)
- Team prefers alternative → mitigate: vote with project owner
- Existing users migrate → mitigate: deprecation alias

**Success metric:** New users understand what squad-mesh does within 30 seconds of reading README.

**Detailed analysis:** `.squad/decisions/inbox/burns-rebrand-strategy.md`

---

### 19. Graph Naming & Architecture: Analysis + Roadmap

**Date:** 2026-03-15  
**Author:** Burns (Lead Architect)  
**Status:** Proposed  
**Tags:** naming, architecture, graph-tech, roadmap  
**Input:** Burns (haiku analysis) + Burns (opus strategic review) + User directive (opus model for strategic work)

#### Summary

User query: Is `squad-graph` better than `squad-mesh`? What can we learn from graph technologies?

**Consensus:** `squad-mesh` is correct for v0.1–v0.2. `squad-graph` is valid v1.0+ rebrand candidate IF we commit to graph analytics (centrality algorithms, traversal, knowledge graph integration).

**Haiku Preliminary (Graph Analysis):**
- Evaluated 6 naming alternatives: squad-mesh (9/10 fit), squad-graph (8/10 fit, requires v1.0 commitment), squad-weave, lattice, nexus, net
- Analyzed 7 graph technology concepts: knowledge graphs, RDF/OWL, semantic analysis, centrality algorithms, pattern discovery, subgraph federation
- Mapped each to effort/value/roadmap
- Recommendation: Mesh for v0.1–v0.2; graph as v1.0+ rebrand IF analytics ship

**Opus Strategic Review (Premium):**
- Confirmed haiku analysis with architectural rigor
- **Key nuance:** "Graph is the right direction, we haven't earned the name yet"
- Code audit: Today's architecture is array-oriented + document-oriented, NOT graph-structured
  - Zero graph traversal (no BFS/DFS/path-finding/cycle-detection)
  - SquadIdentity[] is flat list; relationships in JSON documents
  - Knowledge propagation is Array.filter(); COP is Array.map() + reduce()
- Verdict: Aspirational naming acceptable IF gap is closeable in one version bump AND name doesn't mislead
- Advised: squad-mesh = "coordination + governance" (accurate today); squad-graph = "algorithms + analytics" (roadmap capability)

#### Recommendation

**Immediate:** Proceed with `squad-mesh` for v0.1–v0.2 (follows Decision 14 consensus)

**Conditional Future:** Rebrand to `squad-graph` at v1.0 IF:
1. Graph analytics ship (centrality algorithms, traversal interfaces, knowledge graph integration)
2. Team commits to graph-aware COP, pattern discovery, capability mapping, cross-squad insights
3. Developer docs include graph model + worked examples

#### Open Questions

1. Which graph analytics features are highest ROI for v1.0? (Recommendation: Start with knowledge graph + recurring pattern discovery)
2. What's the realistic timeline for v1.0 graph analytics?
3. Should v0.2 roadmap flag "graph direction" publicly or keep internal?

#### Related Decisions

- Decision 14: Rebrand squad-holacracy → squad-mesh
- Decision 1-3: Core holacracy/holacratic contract model (superseded by mesh framing)

---

### 20. Strategic Model Directive: Opus for Architecture Decisions

**Date:** 2026-03-12  
**Author:** Project Owner (via Copilot CLI)  
**Status:** Accepted  
**Scope:** Model selection for architecture + strategic work

**Directive:** Use claude-opus-4.6 for strategic/architectural analysis. Don't default to haiku for Burns' analytical work.

**Rationale:** Quality over cost for strategic decision-making. Opus provides:
- Rigorous code audits (e.g., actual data structures vs. aspirational metaphors)
- Multi-perspective synthesis (confirming/enhancing preliminary analysis)
- Long-form reasoning for complex tradeoffs (naming impact, roadmap sequencing, adoption risk)
- Better catching of subtle risks (e.g., "we haven't earned the graph name yet")

**Scope:** Applies to:
- Architectural decisions (topology, protocol, federation models)
- Naming decisions (brand impact, adoption risk, semantic accuracy)
- Framework comparisons and evaluations
- Roadmap sequencing and strategic priorities
- Risk audits and long-term positioning

**Implementation:** Burns will use opus-4.6 for strategic tasks; haiku-4.5 for implementation depth (code generation, pattern exploration, test cases).

**Success Metric:** Strategic decisions show increased rigor and adoption-oriented thinking. Team confirms quality improvement justifies cost delta.

---

### 21. Instance: Graph Naming Decision Validates Opus Model

**Date:** 2026-03-15  
**Author:** Burns (Lead Architect)  
**Status:** Accepted (instance of Decision 20)

**What Happened:** User asked about squad-graph vs. squad-mesh. Burns (haiku) produced preliminary analysis; Burns (opus) reviewed and added critical nuance: "Graph is right direction, we haven't earned the name yet" + code audit proving today's implementation isn't graph-structured.

**Outcome:** Opus review caught a subtle risk (aspirational naming misleading developers) that haiku analysis missed. Recommendation gained confidence and credibility through dual-perspective validation.

**Learning for Squad:** When architecture/naming decisions require cross-layer thinking (today's code + future roadmap + adoption narrative), opus input significantly improves quality.

**Action:** Treat graph decision as model instance for future strategic work.

**Next steps:** Project owner + team review and vote on `squad-mesh` or alternative.
- Zero new dependencies — process.argv parsing only

**Consequences:**
- Users can run `npx squad-mesh discover` today
- When Squad SDK adds a plugin hook, we just wire `registerCommands()` into it
- CLI accepts standard subcommand syntax: `squad-mesh discover`, `squad-mesh status`, etc.

**Working Commands:**

| Command | Status | Notes |
|---------|--------|-------|
| `discover` | ✅ Working | Scans filesystem, table + JSON output |
| `status` | ✅ Working | COP with health/work/blockers |
| `health` | ✅ Working | Delegates to status |
| `directive` | ⬜ Stub | Handler exists, CLI wiring needed |
| `tensions` | ⬜ Stub | Handler exists, CLI wiring needed |
| `learnings` | ⬜ Stub | Handler exists, CLI wiring needed |
| `init` | ⬜ Stub | Not yet implemented |

Context-hub (issue #355) solves external library documentation — a different problem than cross-squad orchestration. Our extension's 4 modules (discovery, status, knowledge, steering) are filesystem-only and correct for current topology: 8 squads, 1 machine, 0 reported failures.

Adding API contracts costs ~200-400 engineering hours (auth, service availability, schema versioning, testing, ops) for zero measurable benefit at current scale.

**YAGNI Analysis:**

All 5 cross-squad capabilities (discovery, status, learning, directives, tensions) score **Local Wins** for current scale (8 squads, 1 machine). API adds latency, availability concerns, auth debt with zero functional benefit.

**Required Actions:**

1. **No changes to squad-mesh extension.** Local-first is correct.
2. **Recommend context-hub as a Squad skill** (Option A on issue #355), NOT as an architecture signal for our orchestration layer.
3. **Track technical debt:** ~40 raw `fs.*` calls should be behind an I/O abstraction layer. This is the real preparation for future APIs — not building them now, but making them insertable later.

**Evidence Thresholds for Revisiting:**

| Trigger | Measurement | Action |
|---------|-------------|--------|
| First squad on a different machine | `discoverSquads()` returns 0 for known squad | Add registry-based remote discovery |
| >15 squads | Filesystem scan exceeds 5s | Add indexed registry; consider API for discovery only |
| Concurrent write corruption reported | Data loss in `.meta-squad/` | Add file locking; API only if locking insufficient |
| Squad SDK ships API contracts | Platform release notes | Adapt modules to SDK contracts via abstraction layer |
| Web dashboard requested | Project owner asks for it | Add read-only API for status/health; keep writes local |

**Risk Accepted:**

If squads move to multiple machines before we add an abstraction layer, the extension fails completely (not gracefully). Estimated remediation: ~4 hours to add I/O abstraction + remote backend.

**Reference:** Full analysis: `architecture-review/moe-local-vs-api-contracts.md`

---

### 7. Cross-Squad Visibility Layer (Chalmers)
**Date:** 2026-03-12  
**Author:** Chalmers (Org Pattern Specialist)  
**Status:** Proposed — needs team review  
**Scope:** Product requirements, file conventions, knowledge propagation  

**Problem:** Holacracy endgame spec has strong primitives (charters, tensions, governance logs) but no synthesis layer — nothing that aggregates individual squad state into a super-circle leader's operational picture.

**Solution:** Four file conventions and one directory to fill the gap:

1. **`.squad/patterns/` (Pattern Library)** — Cross-squad learning directory. When squads resolve tensions with transferable insight, write pattern file. Other squads check patterns before starting relevant work (via system prompt instruction). Based on Toyota yokoten model.

2. **`.squad/agents/*/status.md` (Per-Agent Status)** — Minimum viable rep link. Each agent maintains brief status file: current focus, blockers, learnings, tension counts. Updated per cycle. Data source for rollup.

3. **`.squad/status.md` (Status Rollup)** — Generated (not manually maintained) file aggregating all agent statuses, open tensions, recent governance decisions, and health indicators. Based on NATO Common Operating Picture.

4. **`.squad/governance/timeline.md` (Governance Timeline)** — One-line-per-decision append-only log. The `git log --oneline` of governance. Scannable in 10 seconds.

5. **`.squad/health.json` (Health Metrics)** — Machine-readable squad health with defined computation rules: green/yellow/red/stale states, plus thrashing and overload detection formulas.

**Priority:**
- **P0 (immediate):** patterns/ directory + README + template; per-agent status.md convention
- **P1 (after first governance cycle):** status.md rollup; governance/timeline.md
- **P2 (after 5+ squads):** health.json generation; health rules in constitution

**Impact on Team:**
- Burns: Rollup gives architectural visibility; timeline supplements governance/log/
- Smithers: Natural owner of status generation (platform/observability accountability)
- Skinner: No security implications — all artifacts are local trust tier
- Moe: Zero new infrastructure. All file conventions. 30-day kill switch applies.

**Reference:** Full analysis in `architecture-review/chalmers-cross-squad-visibility.md`

---

### 8. Squad-of-Squads Minimum Viable Layer (Moe)
**Date:** 2026-03-12  
**Author:** Moe (Skeptic / Critic)  
**Status:** Proposed  
**Scope:** Multi-squad orchestration — the project's actual stated goal  
**Related:** Decision 5 (Holacracy Endgame Spec), `architecture-review/moe-squad-leader-reality-check.md`

**Problem:** Holacracy endgame spec (Decision 5) governs agents within one squad. Project's stated purpose is multi-squad orchestration. No specification exists for how a human leads multiple squads — no registry, no cross-squad status, no knowledge aggregation, no org-level policy.

The project owner's requirements ("Can I steer, see status, route issues, and see what was learned?") have NO answer in the current spec.

**Solution: Immediate (this week):**
1. **`squads.json` org registry** — One file listing all squads with purpose, status, repo, last-active, blocked-by. Convention: lives in shared location (dedicated repo or well-known path).
2. **`learnings/` shared directory** — Cross-squad knowledge that any squad can read.
3. **`policies/` shared directory** — Org-wide standards that all squads must follow.
4. **System prompt instruction** — Squads read org directory on startup.
5. **Ship holacracy as internal governance** — 3 hours to formalize Decision 5 as operational governance.

**Deferred (measure first):**
- Cross-squad tension routing
- Status aggregation script
- Squad-level charters
- Meta-governance loop

**Evidence Required Before Deferred Items:**
- Cross-squad tension: ≥3 issues where Squad A blocked Squad B and the project owner manually intervened
- Status aggregation: Manual status check across all squads takes >10 minutes
- Meta-governance: ≥2 policy conflicts between squads requiring human resolution

**Integration with Burns & Chalmers:**
- Burns' meta-circle pattern maps directly to `squads.json` + `directives/` + status aggregation
- Chalmers' visibility layer (patterns, status.md, health.json) IS the status aggregation mechanism
- Moe provides the registry and policies layer; Burns/Chalmers provide the visibility/steering layer
- All three are orthogonal and can be implemented in parallel

**Implementation Effort:**
- Ship holacracy as internal governance: ~3 hours
- Build squad-of-squads minimum (registry + learnings + policies): ~4 hours
- Total: ~7 hours to make both decisions operational

**Reference:** Full analysis in `architecture-review/moe-squad-leader-reality-check.md`

---

### 9. Build Multi-Squad Orchestration as Installable Extension
**Date:** 2026-03-12  
**Author:** Project Owner (via Copilot)  
**Status:** Active directive  
**Scope:** Product direction, SDK forward-compatibility

Build the multi-squad orchestration layer as an installable extension to Squad, not just a specification document. Squad is evolving into an SDK/CLI approach — keep this architecture change in mind. Don't rely solely on the current `.squad/` file structure. Review the repo for latest dev direction; check insider channels for Squad SDK evolution.

**Rationale:** User design preference — product must be forward-compatible with Squad SDK/CLI evolution, not locked into the current file-based governance model.

**Implementation:** `packages/squad-mesh/` extension package (npm-installable) completed and integrated. All 9 integration tests passed. Ready for federation testing.

---

---

### 17. Document API via README.md

**Date:** 2026-03-12 (v0.1.0), updated 2025-01-29 (v0.2.0)  
**Author:** Smithers (Platform Engineer)  
**Status:** Accepted — README fully rewritten for v0.2.0  
**Scope:** Documentation, API reference

The README for squad-mesh has been rewritten for v0.2.0 (392 lines). Covers:

1. **Quick Start** — global install, init, discover, init-squad workflow
2. **CLI Reference** — all 7 commands (init, discover, status, health, init-squad, yokoten, help)
3. **Bridge API** — programmatic squad-to-mesh communication
4. **Configuration** — builders and mesh config
5. **Backpointers & Wisdom Skills** — init-squad generated artifacts
6. **Architecture** — updated mesh topology diagram

**Rationale:** Documentation must match implementation. Users should never hit "command not found" from examples.

---

### 18. Package Rename: squad-holacracy Unscoped

**Date:** 2026-03-12
**Author:** Smithers (Platform Engineer)
**Status:** Completed
**Scope:** Package naming, npm registry

Renamed `squad-holacracy` npm package from scoped (`@bradygaster/squad-holacracy`) to unscoped (`squad-holacracy`). 

**Changes:** 9 files updated — package.json, README.md, 3 source files with import examples, peer dependency declarations. Build verified clean. `npm pack --dry-run` confirms unscoped name.

**Breaking Change:** Consumers must update imports from `'@bradygaster/squad-holacracy'` to `'squad-holacracy'`. Peer dependency `@bradygaster/squad-sdk >= 0.8.0` remains scoped (intentional).

**Verification:** Build passes, tarball generation verified, no residual scoped references in codebase.

---

### 19. Rename squad-holacracy → squad-mesh

**Date:** 2026-03-14  
**Author:** Smithers (Platform Engineer)  
**Status:** Complete  
**Scope:** Package branding, directory, error classes

Full rebrand of the npm package from `squad-holacracy` to `squad-mesh`. Directory renamed from `packages/squad-holacracy/` to `packages/squad-mesh/` using `git mv` to preserve history.

**Changes Made:**

1. **Directory:** `packages/squad-holacracy/` → `packages/squad-mesh/` (git mv)
2. **package.json:** name, description, keywords ("holacracy" → "mesh"), repository.directory, test script paths
3. **package-lock.json:** All name references updated
4. **Source files (7 files):** Module JSDoc headers, import examples, console.warn prefixes, type comments
5. **Error class:** `HolacracyValidationError` → `MeshValidationError` (class name, constructor, all throw sites, export, README reference)
6. **Tests:** Run path in discovery.test.ts header comment
7. **README.md:** Title, npm badge URL, install command, import examples, error class name (content rewrite deferred to Burns)
8. **Root files:** `meta-squad.config.ts` and `test-my-squads.mjs` import paths updated

**Impact:**

- **Breaking change** for any consumer importing from `squad-holacracy` — must update to `squad-mesh`
- **Breaking change** for any code catching `HolacracyValidationError` — must update to `MeshValidationError`
- Binary name `squad-meta` unchanged (already not holacracy-named)
- Peer dependency `@bradygaster/squad-sdk` unchanged

**Verification:**

- `npm run build` — compiles clean (0 errors)
- `npm pack --dry-run` — shows `squad-mesh@0.1.0`
- Grep for `holacracy` in package source/tests/config — zero matches
- Architecture-review docs intentionally not modified (historical design documents)

---

### 20. README Rewrite for squad-mesh

**Date:** 2026-03-15  
**Author:** Burns (Lead Architect)  
**Status:** Complete  
**Scope:** Documentation, package identity

Rewrote `packages/squad-mesh/README.md` to replace the holacracy-derived narrative with the mesh coordination story. All API reference content preserved; all narrative sections rewritten.

**Changes Made:**

1. **New sections:** Why, How It Works (with mesh diagram), Roadmap (v0.2/v0.5/v1.0)
2. **Rewritten sections:** Architecture (now: local-first, mesh topology, AI-native, file-native, non-destructive, graph-ready, extensible)
3. **Preserved sections:** Quick Start, CLI Usage, API Reference (subsystems table, type exports, all 6 config tables), Experimental Features, License
4. **Renamed references:** `squad-holacracy` → `squad-mesh`, `HolacracyValidationError` → `MeshValidationError`
5. **Zero holacracy references remain** in the README

**Rationale:**

The README is the primary adoption surface. The old README framed the tool through organizational theory ("Holacracy-based multi-squad orchestration"). The new README frames it through the problem it solves ("managing 8+ squads locally") and the mechanism it uses (mesh topology with nodes, directed edges, signals, propagation). This aligns with the rebrand decision and the project owner's communication directive: no buzzwords, every statement adds information, copy-paste ready.

**Coordination:**

- Smithers handled the mechanical rename (folder, package.json, code symbols) concurrently
- Burns wrote to the existing file path; Smithers' `git mv` carried the content to the new location
- No merge conflicts expected — different scopes of change

**Risks:** None. Documentation-only change. API tables copied verbatim from the tested original.

---

### 21. User Directive: claude-opus-4.6 for All Agents

**Date:** 2026-03-12T11:06Z  
**By:** Project Owner (via Copilot)  
**Status:** Active  
**Scope:** Agent modeling policy

All agents use claude-opus-4.6 (premium) for this session and all rebrand work. No cost-first downgrades. Quality across the board for the rebrand sprint.

---

## Governance

- All meaningful changes require team consensus
- Document architectural decisions here
- Keep history focused on work, decisions focused on direction