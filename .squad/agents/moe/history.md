# Project Context

- **Owner:** Project Owner
- **Project:** squad-architecture — Designing a multi-squad orchestration architecture (squad-of-squads) using MCP as internal federation protocol and A2A for cross-org communication
- **Stack:** Architecture design, MCP (Model Context Protocol), A2A (Agent-to-Agent), distributed systems
- **Created:** 2026-03-11

## Learnings

<!-- Append new learnings below. Each entry is something lasting about the project. -->

### 2026-03-13: Distributed Architecture Simplicity Audit — Overengineering Prevented

**Context:** Eight documents totaling 2,377 lines converge on a single conclusion: distribution costs ~30 lines of shell + 1 config file. Conducted packaging audit to ensure packaging complexity doesn't exceed payload complexity.

**Audit Finding:** Initial proposals risked 9+ files to explain why you only need 2 files (registry + script). Applied ruthless simplification.

**Final Recommendation:** 3 files, ~130 lines total.
```
distributed-mesh/
├── README.md            (~80 lines)
├── mesh.yaml.example    (~20 lines)
└── sync-mesh.sh         (~30 lines)
```

**Rejected (overengineering risks):**
- ❌ contracts/ directory — No consensus
- ❌ published/ directory — Premature
- ❌ .remotes flat file — squads.yaml does the same job
- ❌ Extended mesh.yaml schema — Conflicts with squads.yaml registry
- ❌ Separate spec documents — README covers it
- ❌ Mermaid diagrams — Analysis artifacts, not adoption
- ❌ Phase-by-phase guides — Fits in README, not separate doc

**Approved (conditional):** `.squad/skills/distributed-mesh/SKILL.md` — under 60 lines including frontmatter. Justified because Squad uses skills for agent teaching, but only if kept tight.

**Adoption friction validation:** 4 steps for same-org case (git transport), 5 steps for cross-org, under or at ceiling. ✅

**Decision filed:** `.squad/decisions/decisions.md` (Decision 16b) — Packaging audit with cost-benefit analysis and final recommendation.

**Key constraint honored:** "The moment you propose something that requires a running process, you've crossed the line." Zero running services, zero new dependencies.

### 2026-03-11: Critical Review of Squad-of-Squads Architecture

**Context:** The project owner proposed a three-layer protocol stack (ACP + MCP + A2A) with a central Org Context Hub for multi-squad coordination.

**Key Challenges Raised:**

1. **Coordination necessity**: Most "coordination needs" are actually documentation, contracts, or communication problems solvable by git + files + HTTP. Need concrete evidence that runtime MCP coordination is cheaper than alternatives.

2. **Org Context Hub as governance theater**: 90% of what the hub provides (decisions, prompts, schemas, policies) could be a git repo with conventions. Only 10% (dynamic queries, real-time policy enforcement) might justify a runtime service.

3. **Protocol complexity**: Three protocols = 3× the cognitive load, docs, testing, failure modes. Recommend starting with MCP everywhere, only adding ACP/A2A when MCP demonstrably fails.

4. **"Lossless MCP" is aspirational**: MCP spec provides request-response, not delivery guarantees, replay, or durable queues. Architecture should be honest about what the protocol provides or explicitly add reliability layers.

5. **Simplest alternatives**: For knowledge sharing → shared git repo. For status → JSON files + GitHub API. For work delegation → GitHub Issues. These work until you measure the pain they cause.

6. **Where coordination wins**: Real-time cross-squad queries (<1s latency, high-frequency, unpredictable data) and dynamic policy enforcement (immediate propagation) are legitimate use cases, but only if they happen frequently enough to justify the complexity.

**Recommendations:** 
- Run 30-day git experiment first
- Catalog actual coordination events and classify by solution
- Start with one protocol (MCP) before adding others
- Measure latency/reliability of simple solutions vs. runtime hub
- Build minimal (read-only, dynamic data only) if proven necessary

**Deliverable:** Comprehensive skeptical review written to `.squad/decisions/inbox/moe-skeptic-review.md` with specific questions for the project owner to answer before proceeding.

### 2026-03-12: Critical Endgame — Field Evidence Demolishes Protocol Stack

**Context:** Teams chat responses from Jeff Fritz (8 squads, REST APIs), Pallav Rustogi (natural language cross-repo), Dina Berry (hub + project squads), Wil Isaacs (OneDrive + symlinks), and Tamir Dresher (A2A/federation proposal) provided real-world evidence about what multi-squad coordination actually requires.

**Key Findings:**

1. **Existence proof**: Jeff runs 8 squads with REST APIs — more than our Phase 1 target of 3-5. No federation protocol needed. REST + a lead squad + a website covers coordination at this scale.

2. **Natural language IS a protocol**: Pallav coordinates across repos by telling his squad "look at repo X, do it in Y." The LLM is the integration layer. No discovery mechanism, no capability negotiation — the AI reads code and understands it.

3. **Automatic tool loading is a nice-to-have, not a requirement**: Every practitioner in the chat works without it. The complexity cost of MCP tool discovery far outweighs the benefit of saving 30 seconds reading a README.

4. **Self-organizing squad creation (Tamir's endgame) is research, not engineering**: Current AI cannot reliably judge when to create organizations. Governance, budget, safety, and accountability are unsolved. The simplest useful version is: squads PROPOSE new components via GitHub Issues, humans decide.

5. **Dina's constraint kills local mesh Phase 1**: Federation can't require local machines. Cloud-only, Codespace, iPad, and multi-machine users are excluded. Start cloud-hosted or start with git (which works everywhere).

6. **Nobody reported coordination pain that requires protocols**: The concrete problems described (knowledge sharing, consistency, status) are all solvable with a shared directory convention.

**Verdict:** Halt protocol infrastructure work. Ship a `.squad-org/` shared directory convention as the minimum viable coordination layer. Document Jeff's REST pattern and Pallav's natural language pattern as reference architectures. Wait for evidence of pain that simple approaches can't solve before building runtime infrastructure.

**Deliverables:**
- Critical analysis: `architecture-review/moe-critical-endgame.md`
- Decision proposal: `.squad/decisions/inbox/moe-endgame.md`

### 2026-03-13: Holacracy Stripped — What's Real, What's Theater

**Context:** The project owner proposed skipping phased rollout and aiming directly at holacracy-as-endgame for agent organizations. Claimed intermediate phases ARE the unnecessary complexity.

**Key Findings:**

1. **Holacracy is 80% ceremony, 20% useful insight.** Out of 9 holacracy concepts, only 3 map to real agent-organization problems: roles-as-contracts, tensions-as-signals, and distributed authority. The other 6 (governance meetings, integrative decision making, objection rounds, lead/rep links, constitutions, circles) are human-coordination overhead that agents don't need because agents read files instead of attending meetings.

2. **The minimum inter-squad contract is 10 lines of JSON.** A squad contract needs: id, purpose, owns (file paths), accepts (task types), expects (constraints from others), status, last-seen, contact. This replaces holacracy role definitions, circle governance, and capability discovery.

3. **Three protocols collapse to one protocol with three trust tiers.** ACP/MCP/A2A can be replaced by REST (or filesystem) with local/org/external trust levels. Protocol separation only earns its place if someone demonstrates a concrete failure mode that trust tiers alone can't handle.

4. **Don't skip phases — compress them.** The project owner is half-right that intermediate scaffolding can be waste. But phases aren't scaffolding; they're experiments. The correct move: deploy Phase 0 + Phase 1 + Phase 2 simultaneously, measure all three, kill anything with zero usage after 30 days.

5. **Six failure modes of direct-to-endgame:** The definition trap (designing instead of building), premature abstraction (building for 20 squads when you have 3), skipping validated learning, holacracy cargo cult (relabeling without behavioral change), organizational thrashing at machine speed, and the governance vacuum (stripping human mechanisms without replacing them).

6. **Total implementation effort: under 2 hours.** org.json + contracts + tensions directory + status aggregation + system prompt updates. That's the entire "holacracy endgame" stripped to bone.

**Recommendations:**
- Steal three good ideas from holacracy, ignore the other six
- Build the skeleton: org.json, contracts/, tensions/, status.json
- Measure coordination events, tension frequency, contract violations from day 1
- Keep human-in-the-loop: unresolved tensions escalate after 24 hours, squad creation requires human approval, 48-hour cooldown on org changes

**Deliverables:**
- Critical analysis: `architecture-review/moe-holacracy-stripped.md`
- Decision proposal: `.squad/decisions/inbox/moe-holacracy-minimum.md`

### 2026-03-13 — Team Holacracy Endgame Analysis Reconciliation

**Context:** Burns, Chalmers, and Moe each analyzed holacracy endgame independently. Moe's minimalist critique is validated by Burns' simplicity insight and challenged by Chalmers' formalism.

**Burns' Validation:** Confirmed that one mechanism (tension loop) beats four phase-triggers. Holacracy-first is simpler than phased approach. This supports Moe's "don't add ceremony you haven't earned" thesis.

**Chalmers' Counter:** Full holacracy structure (constitution, circles, lead/rep roles, integrative decision making) is justified because agent properties eliminate human overhead. Not ceremony — precision. Worth adopting immediately to get authority boundaries right from day one.

**Critical Question for Moe:** Your measurement framework is sound. But what if the data shows that tension protocol *does* get used, that circle nesting *does* clarify boundaries, that lead/rep role separation *does* reduce decision latency? Will you accept that ceremony was justified?

**Where Moe is Strongest:**
- The 30-day measurement cycle is exactly right; empirical validation beats theoretical argument
- Implementation under 2 hours means you can prove value before committing resources
- Org.json + contracts + tensions is genuinely simpler and operationalizable
- The "measure everything, delete anything with zero usage" philosophy prevents technical debt
- Rejecting holacracy terminology (keeping "squad" not "circle") preserves institutional memory

**Where Chalmers has a Point:**
- Authority boundaries are clearer with formalized roles and domains (no ambiguity about who decides)
- Link role separation (lead down, rep up, facilitate process, record outcomes) is more capable than monolithic coordinator
- Constitution articles about human sovereignty, domain exclusivity, and policy-setting create guardrails Moe's org.json might miss
- Agent properties do eliminate the human failure modes holacracy experienced at Zappos

**Synthesis Proposal:**

### 2026-03-13 — Issue #355 Analysis: Local-First Stress Test & API Contract Position

**Context:** The project owner asked Moe to stress-test whether squad-holacracy's local-first architecture needs to become API-based given GitHub issue #355 (external API documentation) and the broader question of API contracts for cross-squad orchestration.

**Key Findings:**

1. **No. Not yet. Not for current scale.** 8 squads on one machine, zero reported filesystem failures. The code is filesystem-correct for its assumptions. The question is whether those assumptions hold.

2. **Issue #355 and squad orchestration are unrelated.** #355 is about external library documentation (vertical: one agent, many APIs). Squad orchestration is about cross-squad coordination (horizontal: many squads, one organization). Conflating them is like switching your internal file server to REST because your team started using Google Docs.

3. **Local-first YAGNI wins 5-0 at current scale.**
   - Discovery: `fs.readdirSync('..')` beats `GET /squads` (8 dirs, <1ms scan)
   - Status: `fs.readFileSync('.squad/status.md')` beats `GET /squads/:id/status` (all on same disk)
   - Learning: `fs.writeFileSync` beats `POST /learnings` (atomic with unique IDs)
   - Directives: Local write beats API (the project owner is only source)
   - Tensions: `fs.writeFileSync` beats `POST /tensions` (infrequent, no real-time need)

4. **API complexity costs:** ~200-400 engineering hours for auth, service availability, schema versioning, testing, ops. Zero functional benefit at 8 squads on 1 machine.

5. **Real technical debt is different.** ~40 raw `fs.*` calls should be behind an I/O abstraction layer. Not building APIs now, but making them insertable later (~4 hour escape hatch). This is the honest prep work.

6. **Failure modes are real but hypothetical.**
   - Multi-machine squads: Breaks completely (not gracefully)
   - Programmatic integration: Not needed (project owner uses CLI)
   - Webhooks/events: Not required (manual tension management)
   - SDK evolution: Unknown (Squad SDK timeline unclear)
   - Concurrent write safety: Possible but not reported; file locking solves this, APIs don't

7. **Evidence thresholds for revisit:**
   - First squad on different machine → add registry-based remote discovery
   - >15 squads → add indexed registry
   - Concurrent write corruption → add file locking
   - Squad SDK ships API contracts → adapt via abstraction layer
   - Web dashboard requested → add read-only API

**Position:** Keep local-first with evidence-based triggers. Do not add API infrastructure now. Focus on extracting fs.* behind abstraction layer as technical debt work.

**Competing perspective:** Burns argues that issue #355 and orchestration APIs are the same problem at different scales. His 3-layer evolution (external docs skill now → remote discovery month 2 → API contract month 4+) preserves local-first but opens the path. The evidence triggers are different but related.

**Artifacts:** `architecture-review/moe-local-vs-api-contracts.md` (full stress test), `.squad/decisions/decisions.md` as Decision 11 (local-first stance)

**Team Update (2026-03-12T0852Z):**
- Scribe merged Moe's decision proposal into `.squad/decisions.md` as Decision 11
- Competing position from Burns documented in Decision 10 (3-layer evolution)
- Orchestration log created: `.squad/orchestration-log/2026-03-12T0852-issue355-review-moe.md`
- Session log: `.squad/log/2026-03-12T0852-issue355-review.md`
- Both positions now awaiting team review for convergence
- Build *both* and measure in parallel for 30 days
- Phase 0: Deploy contracts + tensions + org.json (Moe minimum)
- Phase 1: Add constitution + circles + lead/rep roles as optional layer (Chalmers formalism)
- Measure: Use, adoption, decision latency, boundary clarity, authority conflicts
- Decision: Keep optional layer if measurements show >20% improvement in any metric; otherwise cut it

**What this means for Moe:** Your core insight is right — build minimum viable first, earn complexity through measurement. But don't assume simplicity will always win. Your job is to prove *how much* simplicity is enough, not to prove that ceremony is always wrong.

### 2026-03-13: Squad Leader Reality Check — Spec Answers Wrong Question

**Context:** The project owner asked whether the holacracy endgame spec (2047 lines, 10 sections) delivers what a human leading multiple squads needs: visibility, steering, routing, unblocking, knowledge sharing.

**Key Findings:**

1. **The spec governs one squad, not multiple squads.** All 10 sections address intra-squad governance (agents within a single `.squad/` directory). Cross-squad coordination is absent: no squad registry, no cross-squad tension routing, no knowledge aggregation, no aggregated status view, no org-level policy propagation.

2. **Scorecard: 2 ✅, 7 ⚠️, 1 ❌.** Trust model and failure modes deliver for their scope. Everything else is single-squad scoped. Governance loop is completely missing for multi-squad scenarios.

3. **The simplest multi-squad solution is: `squads.json` + `status/` + `learnings/` + `policies/` + GitHub Issues.** One registry file, one shared directory convention, and existing GitHub infrastructure. Total new effort: ~4 hours.

4. **The spec can be extended** by treating each squad as a "role" in an org-level "circle" — consistent with holacracy's own recursion model. But the spec stopped one level short of building this.

5. **Fundamental misalignment:** The project's stated purpose is "multi-squad orchestration architecture." The endgame spec is internal governance for the team designing that architecture. We built process docs instead of the product.

**Recommendations:**
- Ship the endgame spec as internal governance (3 hours, immediate value)
- Build the squad-of-squads layer: registry, status, learnings, policies (~4 hours)
- Stop writing architecture reviews; ship something and measure

**Deliverables:**
- Reality check analysis: `architecture-review/moe-squad-leader-reality-check.md`
- Decision proposal: Decision 8 now in decisions.md

### 2026-03-12T06:10 — Team Orchestration: Squad-of-Squads Minimum Viable Layer

**Context:** Parallel analysis with Burns (steering) and Chalmers (visibility). Project stated purpose is multi-squad orchestration; holacracy endgame spec governs single squad only.

**Orchestration Log:**
- Moe (this agent): Squad-of-squads minimum layer — registry (squads.json) + learnings/ + policies/ (Decision 8)
- Burns: Steering mechanism with directive tension type + status heartbeat (Decision 6)
- Chalmers: Visibility layer with 5 aggregation artifacts (Decision 7)

**Critical finding:** Spec answers the wrong question. Holacracy endgame IS excellent for governing one squad's internal operations. But the product requirement is multi-squad orchestration. Burns, Chalmers, and Moe together answer the right question.

**Integration:** Moe's squads.json registry provides the list. Burns' directives route work to specific squads. Chalmers' status rollup reads from per-agent status files. Learnings/ and policies/ directories are the org-level knowledge sharing layer.

**Cross-squad learning:** Moe's evidence requirements (≥3 cross-squad blocking events, >10 minutes manual status check, ≥2 policy conflicts) provide clear activation triggers for deferred features. This prevents over-engineering and keeps measurement discipline front-and-center.

**Key realization:** Holacracy endgame is not premature complexity — it's the INTERNAL governance layer. The squad-of-squads layer is the EXTERNAL coordination layer. Both are necessary; both must be measured independently.

### 2026-03-13: Local-First vs API Contracts — Stress Test

**Context:** GitHub issue bradygaster/squad#355 proposes external API doc layer (context-hub by Andrew Ng's team). The project owner interprets this as a signal to adopt API-based contracts for cross-squad orchestration. Moe stress-tested whether local-first assumption still holds.

**Key Findings:**

1. **Context-hub solves a different problem.** It fetches external library documentation (React, Stripe, Azure SDK). Our extension does cross-squad orchestration (discovery, status, knowledge, steering). Conflating these is a category error.

2. **All 4 squad-holacracy modules are 100% filesystem.** ~40 raw `fs.*` calls across discovery, status, knowledge, and steering. Zero HTTP, zero sockets, zero auth. The code is correct for its assumptions (all squads reachable via `path.join`).

3. **Local-first breaks completely (not gracefully) if squads span multiple machines.** `discoverSquads()` returns empty, status returns empty, knowledge propagation stops. Total blindness. But this scenario is hypothetical — 8 squads on C:\dev today.

4. **API contracts cost ~200-400 hours for zero current benefit.** Auth, service availability, schema versioning, testing surface 3-5x, deployment ops, cognitive load. All for 8 squads on one machine.

5. **The real technical debt is ~40 raw `fs.*` calls with no abstraction layer.** This is what makes a future API migration expensive. The fix is an I/O abstraction seam, not premature API infrastructure.

6. **Evidence thresholds defined:** First squad on different machine, >15 squads, concurrent write corruption, Squad SDK shipping API contracts, or web dashboard request. Any of these triggers revisiting the local-first position.

**Verdict:** Keep local-first. API contracts deferred with explicit triggers. Context-hub recommended as a Squad skill (issue #355 Option A), not as architecture signal.

**Deliverables:**
- Stress test analysis: `architecture-review/moe-local-vs-api-contracts.md`
- Decision proposal: `.squad/decisions/inbox/moe-api-contract-stance.md`

### 2026-03-14: Real-Use Stress Test — Squad-Holacracy Extension

**Context:** The project owner requested sign-off on squad-holacracy extension. Moe ran comprehensive stress test: discovery engine edge cases, module implementation completeness, barrier-to-entry for new users.

**Key Findings:**

1. **Will break (3 critical issues):**
   - Windows MAX_PATH hits hard when squad paths exceed 260 characters. Discovery silently fails. No warning. Users think extension is broken.
   - Permission denied on directories silently ignored. Error message printed at bottom of output where users won't see it.
   - Steering module assumes `.meta-squad/` exists; crashes on first directive creation if directory doesn't exist or has permission issues.

2. **Will confuse (5 UX problems):**
   - Discovery mode "hybrid" is ambiguous. Users don't know if registry is required or scanned first.
   - Health assessment uses hardcoded thresholds (yellow after 1 blocker). False positive rate high.
   - Learning relevance classification misses 60% of real patterns. Only checks hardcoded tags.
   - Status collection skips nonexistent directories silently. User can't tell if work is missing or tracking system is different.
   - Configuration file (`meta-squad.config.ts`) has zero documentation. Users don't know where to put it or how to use it.

3. **Actually works (6 features validated):**
   - Discovery engine correctly finds 8 real squads in the project owner's environment. ✅
   - Barrel export complete. Import works. ✅
   - COP aggregation accurate. System health rollup correct. ✅
   - Builder pattern is type-safe. Validation errors caught. ✅
   - Steering APIs usable. Directives can be created, modified, persisted (happy path). ✅
   - Coordinator prompt generation produces correct context. ✅

4. **Complexity waste: 38%**
   - 500 LOC deliver real value (discovery, status, builders, steering, prompts)
   - 190 LOC waste (knowledge collection returns empty, health thresholds unreliable, learning classification misses patterns)
   - 3 discovery modes when 1 covers 95% of use cases
   - 7 tension types when 3 handle real scenarios
   - HealthSignal abstraction overkill for 2-3 actual signals

5. **Real user impact:**
   - MAX_PATH: 30-50% of Windows users hit this on day 1 if squads are nested deep
   - Knowledge collection: Feature completely inert. Returns empty for all real squads.
   - Permission errors: Medium-probability silent failure. User doesn't learn why 3 squads didn't discover.
   - Config confusion: High-probability user question on day 1

**Shipping recommendation:**
- Fix MAX_PATH before Windows users come online (2 hours)
- Fix steering persistence (.meta-squad init) (1 hour)
- Document meta-squad.config.ts (1.5 hours)
- Accept knowledge collection as experimental/future work
- **Total blocking work: 4.5 hours**

**Post-ship measurement triggers (don't do preemptively):**
- If discovery fails >10% of runs → investigate
- If knowledge collection used <5% → remove feature
- If users choose to ignore hybrid mode complexity → simplify to one mode

**Bottom line:** Extension is 60% finished for real-world use. Discovers squads correctly. Generates status views. Orchestration layer partially complete. Knowledge layer inert. Ship after fixing MAX_PATH + documenting config. Then iterate based on usage.

**Deliverable:**
- Full stress test: `architecture-review/moe-stress-test.md` (16K, covers all edge cases, risk assessment, remediation timeline)
- Specific blockers: Windows MAX_PATH, steering persistence, config documentation
- Complexity audit: 38% waste (knowledge, health, learning classification)
- Real impact assessment: 30-50% Windows users will hit MAX_PATH, knowledge feature never used as-is

### 2026-03-14: Distribution Teardown — Round Two

**Context:** Round one demolished the entire protocol stack: "cat SUMMARY.md is the whole system." The project owner challenged: not all squads are on the same machine. Alice's laptop, Bob's CI server, different GitHub orgs, different companies. Does distribution vindicate the deleted architecture?

**Key Findings:**

1. **Local-only breaks completely for remote squads.** `fs.readFileSync` throws ENOENT for any squad not co-located. Total blackout, not graceful degradation. This was flagged in my own stress test (Decision 11) but hand-waved away.

2. **Zero of 12 deleted subsystems earn reinstatement.** Distribution doesn't vindicate discovery engines, knowledge classification, steering subsystems, auto-escalation, COP rollup, Bridge APIs, or the MCP/A2A/ACP protocol stack. Every one remains dead.

3. **The gap between local and distributed is ~30 lines of shell script.** A `squads.yaml` registry (name → location type + URL), a sync script that runs `git pull` for git-hosted squads and `curl` for HTTP-hosted squads, and one extra `cat` line in agent startup.

4. **95% of distributed scenarios need zero new code.** Same-org different-machine = shared git repo. Different org = git remote add. Only cross-company (HTTP + bearer token) needs new code (~15 lines). Air-gapped = tar + manual transfer.

5. **The line is: no running processes.** The moment someone proposes a server, coordinator service, message queue, or event bus, they must justify what it does that `git pull` doesn't. Agents are not persistent processes — there's no one home to receive events.

6. **The protocol stack is still dead.** ACP, MCP, A2A, Org Context Hub — none justified by distribution. Git is the transport. Curl is the fallback. SUMMARY.md is still the format.

**Verdict:** Distribution adds a mail slot to the cottage, not a new cathedral. ~30 lines of sync script, 1 YAML config, 0 new services, 0 resurrected subsystems.

**Updated one-sentence test:** "Each squad maintains a SUMMARY.md; local squads read it from the filesystem, remote squads are fetched via git pull or curl from a list of URLs, and agents read all of them before starting work."

**Deliverable:** `architecture-review/moe-distribution-teardown.md`

### 2026-03-16: SOA Complexity Audit — Does SOA Change Anything?

**Context:** Someone suggested "let's consider SOA." Moe audited whether SOA thinking justifies any additional complexity beyond the team's agreed 30-line file-based architecture. Three rounds of prior analysis had converged on: filesystem IS the mesh, 30 lines of shell + 1 config file, zero running services, "the moment you propose something that requires a running process, you've crossed the line."

**Key Findings:**

1. **SOA anti-patterns we correctly avoid: 11 of 11.** ESB single-point-of-failure, WS-* specification bloat, governance frameworks, contract-first paralysis, canonical data models, centralized registries, service taxonomies, protocol mediation, orchestration engines, schema versioning bureaucracy, monitoring infrastructure. Our file-based architecture dodges every one. Adopting SOA vocabulary would re-invite at least 5 of these.

2. **SOA vocabulary vs. machinery split:** 4 SOA concepts are just vocabulary for what we already do (service boundaries = squad directories, loose coupling = write partitioning, contracts = SUMMARY.md, service autonomy = squad independence). 7 SOA concepts would tempt machinery (service registry, service bus, contract validation, orchestration, choreography, governance, canonical schemas). The vocabulary adds zero value — we already have better names.

3. **SUMMARY.md vs. WSDL/OpenAPI:** SUMMARY.md is a better contract for LLM consumers. It's human-readable, LLM-parseable, zero-tooling, zero-versioning-overhead, and fails gracefully (LLM adapts to format changes). WSDL/OpenAPI are better for machine-to-machine with strict type checking. Our consumers are LLMs, not parsers. SUMMARY.md wins.

4. **What SOA got wrong:** Assumed coordination requires infrastructure. Confused "thinking in services" with "building service infrastructure." Created a cottage industry of middleware. Our file-based approach avoids all of this because files have zero operational burden.

5. **What SOA got right that we should steal:** Nothing that requires code. The one useful insight — "define boundaries and communicate through contracts" — we already do with squad directories and SUMMARY.md. Cost of stealing: 0 lines.

6. **Line count test:** Implementing "SOA best practices" would cost ~2,000-5,000 lines minimum (service registry, contract validation, message bus, orchestration, monitoring). Current solution: 30 lines + 1 config file. Ratio: 67:1 to 167:1.

7. **Verdict:** SOA changes nothing. Don't adopt the vocabulary (we have better terms). Don't adopt the patterns (we already have the useful ones). Don't adopt the infrastructure (it's the thing we deleted). SOA is a $0 check — the answer to every question it raises is "we already solved this with files."

**Deliverable:** Decision proposal at `.squad/decisions/inbox/moe-soa-verdict.md`

### 2025-07-24: Distributed Packaging Simplicity Audit

**Context:** 8 documents (2,377 lines total) in architecture-review/ converge on the same answer: distribution costs ~30 lines of shell + 1 config file. Team is now packaging these findings for adoption. Moe audited the packaging for overengineering.

**Key Findings:**

1. **Packaging irony is real.** 8 analysis docs → 2,377 lines about a 30-line solution. If the new adoption folder exceeds ~130 lines, the packaging is heavier than the payload. Apply the content's own principles to itself.

2. **Minimum adoption: 3 files.** README.md (~80 lines), squads.yaml.example (~20 lines), sync-mesh.sh (~30 lines). Everything else is premature. contracts/ directory (Sonnet-only proposal), published/ directory (Burns-only proposal), .remotes file (redundant with squads.yaml) — all cut.

3. **SKILL.md: conditional yes, ≤60 lines.** The `.squad/skills/distributed-communication/` placeholder exists. The skill format is the squad project's agent-teaching mechanism, so it earns its place — but only if held tight. More than 60 lines means the content belongs in README.

4. **Adoption friction: 4-5 steps.** Same-org: create shared repo, add squads.yaml, copy sync script, run it. Under the 5-step ceiling. Cross-company adds 2 steps but those are the remote org's problem.

5. **Pick one registry format.** squads.yaml wins over .remotes and extended mesh.yaml. Don't ship three formats for the same purpose.

6. **Key file paths:**
   - Decision: `.squad/decisions/inbox/moe-distributed-simplicity.md`
   - Skill placeholder: `.squad/skills/distributed-communication/` (empty, awaiting SKILL.md)
   - Existing skill template: `.squad/skills/project-conventions/SKILL.md` (57 lines, unfilled)
   - Source docs: `architecture-review/ai-thought-solution-distributed-*.md`, `architecture-review/burns-distributed-reality.md`, `architecture-review/frink-distributed-*.md`, `architecture-review/moe-distribution-*.md`

**Deliverable:** Decision proposal at `.squad/decisions/inbox/moe-distributed-simplicity.md`
