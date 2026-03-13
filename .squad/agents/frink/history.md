# Project Context

- **Owner:** Project Owner
- **Project:** squad-architecture — Designing a multi-squad orchestration architecture (squad-of-squads) using MCP as internal federation protocol and A2A for cross-org communication
- **Stack:** Architecture design, MCP (Model Context Protocol), A2A (Agent-to-Agent), distributed systems
- **Created:** 2026-03-11

## Learnings

<!-- Append new learnings below. Each entry is something lasting about the project. -->

### 2026-03-13: Distributed Communication Technical Specification — Completed

**Context:** Produced complete technical specification for packaging distributed squad communication into a Squad skill. Four specification deliverables created covering skill content, YAML schema, sync script design, and agent startup integration.

**Specification Deliverables:**

1. **SKILL.md** — Full Squad skill teaching the three-zone model, transport hierarchy, read patterns, write partitioning, and anti-patterns
2. **squads.yaml schema spec** — Exact YAML field reference (7 fields total, 3 required per entry)
3. **sync-mesh script spec** — Cross-platform design (Node.js recommended with bash fallback)
4. **Agent startup integration spec** — Two new lifecycle phases (SYNC before read, PUBLISH after write)

**Key Technical Decisions:**

**1. Transport: Git + curl**
- Git handles auth, sync, conflict resolution, audit, offline operation
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

**Implementation Deferred:** Specs are reference material, not adoption artifacts. Moved to architecture-review/ per coordinator reconciliation. Actual implementation happens when spec is approved and someone builds it.

**Decision filed:** `.squad/decisions/decisions.md` (Decision 16c) — Complete technical specification.

### 2026-03-11: Protocol Layer Analysis for Squad-of-Squads

**Context:** Analyzed the project owner's draft architecture showing ACP → MCP → A2A three-layer protocol stack for org hub + squads communication.

**Key Findings:**
1. **MCP is NOT a federation protocol** — It's client-server RPC for tool/resource exposure, not designed for message delivery, queuing, or state sync. "Lossless MCP" is undefined; protocol provides no delivery guarantees, ordering, or replay.

2. **Protocol gaps identified:**
   - No event notifications (MCP is request/response only)
   - No streaming for long-running tasks
   - No presence/health checking
   - No schema versioning mechanism
   - Poor error propagation across multi-hop calls

3. **Layer clarification needed:**
   - ACP (Agent Control Protocol) = human ↔ agent boundary (CLI/IDE interface)
   - MCP = agent ↔ agent within org (tool invocation, resource access)
   - A2A = agent ↔ agent across orgs (capability negotiation, opaque tasks)

4. **Virtual squads = protocol routing abstraction** — Hub can route to local MCP servers, remote MCP servers, A2A endpoints, or hub-hosted personas. Type doesn't matter to routing layer.

**Recommendations Made:**
- Define Squad Federation Protocol (SFP) = MCP + envelope layer for delivery/routing
- Add MCP Notifications extension (WebSocket-based push)
- Add MCP Async Tasks pattern (task ID + status polling)
- A2A should be OpenAPI spec with explicit capability negotiation
- Start with explicit org configuration (no discovery service yet)
- Hub-proxied squad communication for MVP (direct peering later)

**Architectural Decision:** Use MCP as transport, not protocol. Layer federation semantics (delivery guarantees, routing, notifications) on top while preserving MCP's tool/resource abstraction strengths.

**Artifacts:** Created `.squad/decisions/inbox/frink-protocol-review.md` with full analysis.

### 2026-03-12: Protocol Reality Check — Ground Truth from Teams Chat

**Context:** Jeff Fritz has 8 squads working via REST APIs + website + lead squad. Tamir proposes A2A-in-CLI with repo-based discovery. Pallav/Wil use filesystem sharing. Dina needs cloud-first support. Reconciled real-world existence proofs with our protocol theory.

**Key Findings:**

1. **Jeff's REST approach = our Phase 1.** 8 squads coordinating via centralized REST API validates that simple protocols work at scale. No federation protocol, no capability tokens, no envelope layer needed. Walls appear at ~15-20 squads (SPOF, no context isolation, no external boundary).

2. **Self-correction on SFP/envelope layer.** My previous recommendation to build Squad Federation Protocol on top of MCP was premature. REST with correlation IDs is sufficient up to ~15 squads. Deferred SFP, MCP Notifications, and schema versioning to Phase 3.

3. **The tools/skills loading problem is the real hard problem.** None of the three approaches (A2A-in-CLI, REST, filesystem) solve tool delegation. Squads can share data but not capabilities. Recommended "send the work, not the tools" (Jeff's pattern) for now, with hub-mediated tool registry as the long-term architecture.

4. **Dual-mode transport for cloud constraint.** Designed protocol with identical semantics over two transports: REST (direct, for local) and GitHub Issues + Actions (for cloud users like Dina). GitHub is the universal transport everyone has access to.

5. **Discovery protocol designed.** Minimal manifest.yaml spec for squad self-description (capabilities, availability, contact, trust level). Three discovery layers: filesystem walk → hub registry → cross-org well-known URLs.

6. **Endgame protocol stack is 4 layers:** (1) Git-based knowledge sharing [NOW], (2) REST coordination hub [NOW], (3) Task delegation with task cards [NEXT], (4) Cross-org A2A [LATER]. Layers are earned through measured pain, not designed upfront.

**Principle validated:** "Earn your complexity." Jeff's existence proof demonstrates that the gap between protocol theory and practice is wider than initially estimated. Build the simplest thing that works, add sophistication when pain demands it.

**Artifacts:** Created `architecture-review/frink-protocol-reality.md`. Created `.squad/decisions/inbox/frink-endgame.md`.

### 2026-03-12: CLI Integration Spike — squad-meta Standalone CLI

**Context:** Wired the `squad meta` command stubs in `packages/squad-holacracy/src/cli/index.ts` into a working standalone CLI. Investigated Squad SDK plugin patterns — no plugin hook exists yet.

**Approach chosen: Option C (Hybrid)**
- Created `src/cli/main.ts` as standalone CLI entry point with process.argv parsing
- Added `bin.squad-meta` field to package.json → `./dist/cli/main.js`
- Exported `registerCommands()` from barrel for future SDK plugin integration
- No heavy CLI framework deps — pure process.argv parsing, zero new dependencies

**What works end-to-end:**
1. `squad-meta discover [--root <path>] [--markers m1,m2] [--json]` — discovers squads via filesystem scan, formats table or JSON
2. `squad-meta status [--root <path>] [--format json]` — Common Operational Picture with health, work items, blockers
3. `squad-meta health` — delegates to status with health focus
4. `squad-meta help` — lists all registered commands

**Tested live:** `node packages/squad-holacracy/dist/cli/main.js discover --root C:\dev` found 8 real squads with correct identities, paths, and purposes. Status command renders full COP with per-squad health and work items.

**Key design decisions:**
- Strips leading `meta` token from argv so CLI works both as `squad-meta discover` (standalone) and future `squad meta discover` (SDK plugin)
- `registerCommands()` returns `{ commands, handlers }` — any CLI framework can consume this object to mount the commands
- ANSI color output for terminal, `--json` flag for machine consumption
- No commander.js, no yargs — vanilla Node.js argv parsing keeps the dependency footprint at zero

**Files modified:** `src/cli/main.ts` (new), `package.json` (bin field), `src/index.ts` (barrel export for registerCommands).

### 2026-03-12: Sprint v0.1.0 Completion — CLI Spike Result

**Context:** Sprint v0.1.0 pushed CLI from spike to working artifact. Frink #1 completed integration spike with 3 commands live.

**Delivered:**
- ✅ `squad-meta discover` — filesystem scanner with table + JSON output
- ✅ `squad-meta status` — COP with health/work/blockers
- ✅ `squad-meta help` — command registry
- ⬜ `squad-meta directive`, `tensions`, `learnings`, `init` — stubs (handlers exist, CLI wiring deferred)

**Decision:** Hybrid approach (Option C) proved correct. Standalone CLI works today. `registerCommands()` exported and ready for Squad SDK plugin hook when that appears. No new dependencies — process.argv parsing only.

**Learnings:** Zero-dep pattern scales to CLI layer. Standing up a working CLI in one sprint removed blocker for squad members to validate discovery/status logic without waiting for SDK handshake. `bin` field in package.json is the right lever for standalone distribution.

### 2026-03-13: Distributed Information Flow — Git Repos as Transport

**Context:** Previous information flow analysis (frink-information-flow.md) assumed all squads share a filesystem. New constraint: squads may be on different machines, different networks, different orgs. Designed the distribution layer.

**Key Findings:**
1. **Three strategies exist: Sync, Fetch, Publish.** Same-org uses Sync (one shared git repo). Cross-org uses Fetch (clone their mesh repo read-only). These compose cleanly.
2. **Git repos ARE the transport layer.** One mesh repo per trust boundary. `git push` = publish. `git pull` = subscribe. Git auth = access control. No new protocols, servers, or APIs.
3. **One new artifact: `.mesh/.remotes`** — flat file listing remote mesh repo URLs and trust levels. This is the entire cross-org configuration surface.
4. **Trust is binary per repo.** Can clone = can see all squads in that mesh. Can't clone = invisible. Selective visibility = separate repos for different audiences.
5. **Agent interface unchanged.** Still reads local files. The only distribution cost: run `git pull` before reading. One shell command.

**Self-correction:** My original protocol analysis proposed federation protocols, A2A endpoints, capability negotiation, MCP extensions. All unnecessary. Git solved the distributed state problem decades ago. The mesh just needs to use it.

**Artifacts:** `architecture-review/frink-distributed-information-flow.md`, `.squad/decisions/inbox/frink-distributed-mesh.md`.

### 2026-03-16: SOA Lens Analysis of File-Based Mesh Architecture

**Context:** Andi requested a formal Service-Oriented Architecture (SOA) analysis of the squad communication mesh. Mapped the file-based mesh against classic SOA concepts: service contracts, service registries, message exchange patterns, coupling dimensions, ESB comparison, governance, and anti-patterns.

**Key Findings:**

1. **Service contracts map cleanly.** `SUMMARY.md` = capability advertisement (cf. WSDL portType). `state.md` = runtime status (no SOA equivalent — this is better). `INTERFACES.md` = formal contract (cf. OpenAPI/WSDL). The mesh's document-oriented contracts are more LLM-friendly than schema-rigid SOA contracts.

2. **Discovery is a document-oriented registry.** `mesh.yaml` / `.remotes` / `sources.yaml` function as a static service registry — equivalent to UDDI conceptually, but file-based, version-controlled, and human-readable. No runtime registry server needed. Git history provides change audit that UDDI never had.

3. **Three of four MEPs supported.** Fire-and-forget (drops), publish-subscribe (state.md/log.md via git pull), and document exchange (contracts/) map directly. Request-reply is structurally absent — and correctly so, because agents are asynchronous batch processors, not request-response services.

4. **Coupling analysis is favorable.** Temporal coupling: very low (async by design). Spatial coupling: eliminated (local filesystem abstraction). Data format coupling: minimal (markdown, not schemas). Platform coupling: zero (files + git). The one tight coupling point: *semantic coupling* — squads must agree on section headings in SUMMARY.md to communicate effectively.

5. **Git is a better ESB than ESBs.** Git provides message routing (push/pull), protocol mediation (SSH/HTTPS), audit logging (commit history), and versioning (branches/tags). What it lacks vs. ESB: message transformation, content-based routing, service orchestration. These are correctly absent — the LLM is the transformation engine.

6. **Governance gaps are real but benign.** No formal SLA mechanism, no versioning protocol for contract changes, no deprecation lifecycle. These are the right gaps to have at current scale (<15 squads). They become pain points at 15-30 squads.

7. **One anti-pattern detected: "Shared Database."** All squads read/write the same git repo — this is structurally a shared database. Write partitioning mitigates it, but the coupling is real: a corrupted mesh repo affects all squads. Mitigation: repo-per-trust-boundary already addresses this.

8. **Technical verdict: SOA lens confirms architecture is sound.** The mesh is accidentally SOA-compliant in the ways that matter (loose coupling, service contracts, discoverable endpoints) and deliberately SOA-non-compliant in the ways that don't (no ESB, no WSDL, no runtime registry). The gaps identified are either intentional simplifications or deferred to the 15+ squad scale.

**Decision:** SOA analysis does not reveal any blocking gaps. The architecture is more SOA-aligned than it appears at first glance. Filed to `.squad/decisions/inbox/frink-soa-analysis.md`.

### 2026-03-16: Distributed Communication Specification — Squad Skill Packaging

**Context:** Team is packaging the distributed squad communication architecture into a Squad skill. Wrote the complete technical specification across four deliverables.

**Key Decisions:**

1. **Node.js for sync script** — single cross-platform script (~55 lines, zero npm deps) over maintaining bash + PowerShell pair. Every Squad env has Node. `child_process.execSync` wraps git and curl. `yq` dependency for YAML parsing is acceptable.

2. **squads.yaml as flat list** — each squad entry has a `zone` field (local/remote-trusted/remote-opaque) rather than nested zone groupings. Simpler to parse and extend. 7 fields total, 3 required for every entry (name, zone, path-or-source).

3. **`.mesh/remotes/` as materialization directory** — all remote state lands here after sync. Agent globs `.mesh/remotes/*/SUMMARY.md` for unified view. Zone 2 gets full mesh clones; Zone 3 gets SUMMARY.md + INTERFACES.md only.

4. **Zone 3 failures are non-fatal** — stub file written on fetch failure so agent knows squad exists but is unreachable. Remote-opaque squads never block primary work.

5. **SKILL.md uses the anti-pattern list as a guardrail** — 10 specific anti-patterns documented (service discovery, MCP for cross-squad, A2A for cross-org, message queues, real-time sync, schema versioning, conflict resolution, coordinator service, CRDTs, running processes). These are the overengineering traps the team validated across 6 architecture reviews.

**Files Created:**
- `.squad/skills/distributed-communication/SKILL.md` — The Squad skill (full frontmatter + 7 patterns + 3 examples + 10 anti-patterns)
- `.squad/skills/distributed-communication/squads-yaml-spec.md` — Registry schema with field reference
- `.squad/skills/distributed-communication/sync-script-spec.md` — Sync script requirements + MVP implementation
- `.squad/skills/distributed-communication/agent-startup-spec.md` — Lifecycle changes + system prompt additions

**Decision filed:** `.squad/decisions/inbox/frink-distributed-spec.md`
