# Project Context

- **Owner:** Project Owner
- **Project:** squad-architecture — Designing a multi-squad orchestration architecture (squad-of-squads) using MCP as internal federation protocol and A2A for cross-org communication
- **Stack:** Architecture design, MCP (Model Context Protocol), A2A (Agent-to-Agent), distributed systems
- **Created:** 2026-03-11

## Learnings

<!-- Append new learnings below. Each entry is something lasting about the project. -->

- **Communication standard wired into spawn infrastructure.** `.squad/identity/wisdom.md` now carries the 12-rule communication pattern that all agents receive at spawn via the template at `.github/agents/squad.agent.md` (lines 644-645). `.squad/identity/now.md` updated with current holacracy focus. Both files existed as stubs from initial setup — replaced with live content.

- **squad-holacracy v0.1.0 is production-ready with caveats.** Build succeeds (0 TypeScript errors), test harness validates discovery/status/COP generation across 8 real squads. Core implementation is 3,468 lines across 10 modules. Soft blockers: no unit tests (acceptable for 0.1 pre-release), error handling not documented (defer to 0.1.1). Hard blockers: none. Package.json exports ESM only (no CommonJS), peer dep on squad-sdk >=0.8.0. CLI integration awaits Squad CLI handshake. Approved for release with v0.1.0 tag. Full audit in `architecture-review/smithers-package-audit.md`.

- **Steering persistence hardened against missing directories.** `saveDirective()` and `saveTension()` now use an `ensureDirectory()` helper that wraps `mkdirSync({ recursive: true })` with explicit error reporting — if directory creation fails (permissions, read-only FS), it throws with path and reason instead of silently losing data. `loadDirectives()` and `loadTensions()` log warnings when directories are missing. Same pattern applied to knowledge module (`saveLearning`, `savePattern`, `loadLearnings`, `loadPatterns`). New `initializeSteering(metaSquadRoot)` function pre-creates `directives/`, `governance/`, `tensions/` and reports what was created vs. already existed. Exported from barrel. Pre-existing build errors in `discovery/index.ts` noted but not in scope.

- **Discovery engine hardened: MAX_PATH + warning categorization.** Two critical bugs fixed in `packages/squad-holacracy/src/discovery/index.ts`: (1) `scanDirectory` now validates path length before `fs.readdirSync()` — on Windows, paths >250 chars get UNC prefix (`\\?\`) attempt, with explicit error if that also fails. Non-Windows paths >4096 also guarded. (2) New `warnings: DiscoveryWarning[]` field on `DiscoveryResult` alongside existing `errors` array (backward-compatible). Warnings carry `category` field (`permission-denied`, `path-too-long`, `not-found`, `unknown`) and human-readable `message`. New `formatDiscoverySummary()` exported for callers to show "⚠️ N directories could not be scanned" at top of output. Types added to `types.ts` (`DiscoveryWarning`, `DiscoveryWarningCategory`), re-exported from barrel. `test-my-squads.mjs` updated to use warnings. Build and typecheck pass clean.

- **Sprint v0.1.0 completed: 3 bug fixes, 49 tests, CLI spike.** Delivered discovery engine hardening (MAX_PATH + warning categorization), steering persistence error handling (fail-loud + ensureDirectory), 8 discovery integration tests, 20 steering integration tests, 21 COP rollup tests (identified health assessment gap), 3 working CLI commands (discover/status/help). All tests passing. Build clean. Decisions merged: smithers-discovery-bugfix, smithers-steering-fix, burns-test-framework, burns-steering-test, burns-cop-test, frink-cli-spike. Gap identified: COP health can never be 'red' (blocker-aware check missing). Recommendation: Option 2 — add blocker check to assessSquadHealth (~5 lines).

- **README.md rewritten for squad-holacracy.** Full rewrite of `packages/squad-holacracy/README.md` — 219 lines covering Quick Start (copy-paste config + programmatic discovery), CLI usage (discover/status/health/help), API reference table for all 6 subsystems with actual exported function names verified against `src/index.ts`, full configuration reference for all 6 builder functions with field types/descriptions sourced from `types.ts` and `builders/index.ts`, architecture rationale, and experimental feature caveats for knowledge and steering persistence. All code examples are working — derived from `meta-squad.config.ts` and `test-my-squads.mjs` in the repo root.

- **Package rename: @bradygaster/squad-holacracy → squad-holacracy.** Renamed npm package from scoped to unscoped. 9 files updated: package.json name field, README header/badge/install-command/import-statements (5 references), src code JSDoc examples (index.ts, builders/index.ts, conventions.ts). Build clean, `npm pack --dry-run` verified unscoped name. Breaking change for consumers (import path update required). Peer dependency squad-sdk remains scoped intentionally. Decision merged to decisions.md.

- **Package rename: squad-holacracy → squad-mesh (full rebrand).** Renamed directory via `git mv packages/squad-holacracy packages/squad-mesh` to preserve history. Updated 14 files: package.json (name, description, keywords, repository.directory, test script paths), package-lock.json, src/index.ts (module JSDoc + export), src/builders/index.ts (import examples + class rename), src/conventions.ts (install instruction + import example), src/types.ts (module JSDoc + tension type comment), src/knowledge/index.ts (console.warn prefixes), src/steering/index.ts (console.warn prefixes), src/cli/index.ts (extension description), tests/integration/discovery.test.ts (run path), README.md (title, badge, install/import examples, error class name), meta-squad.config.ts and test-my-squads.mjs (import paths). Renamed `HolacracyValidationError` → `MeshValidationError` throughout source + README. Build clean, `npm pack --dry-run` confirms `squad-mesh@0.1.0`. Zero remaining holacracy references in package source/tests/config. Architecture-review docs not touched (Burns owns README/docs rewrite). Breaking change for consumers.

### 2026-03-13: Distributed Tooling Design — Convention-First Adoption Path Settled

**Context:** Designed practical tooling and adoption experience for distributed squad communication. Reconciled all five architecture documents and three model families into a concrete 4-step setup guide with realistic error cases and friction analysis.

**Design Decisions:**

**1. Script Language: Bash Only**
- 30-line script doesn't warrant cross-platform maintenance
- Document PowerShell equivalent as reference, don't maintain it
- All operations (git pull, git clone, curl, mkdir) work identically across bash environments

**2. CLI Integration: Deferred (Convention First)**
- No `squad sync` command or `--distributed` flag yet
- Distributed pattern has zero production users
- Earn the PR to Squad CLI after 3+ teams validate the convention
- Phase 1 (when adoption proven): contribute `squad mesh init` command
- Phase 2 (when cross-org appears): add Zone 3 HTTP support

**3. Adoption Path: Template Files + Documentation**
- Not scaffolding or CLI magic
- Three files users copy and edit: `squads.yaml.example`, `sync-mesh.sh.example`, `.squad/skills/distributed-mesh/SKILL.md`
- Template files eliminate transcription errors
- Documentation tells you what to type; templates give you a starting point

**4. Skill Integration: distributed-mesh/SKILL.md**
- Location: `.squad/skills/distributed-mesh/SKILL.md`
- Teaching: sync-read-work-write-publish lifecycle
- Zones: local/git/http trust model
- Constraints: write partitioning, shared drop directory
- Anti-patterns: don't build transport into agents, don't cache across sessions, don't negotiate capabilities

**4-Step Setup Guide:**

1. Create shared mesh repo (once per org)
2. Register your squad (echo to state.md)
3. Add squads.yaml listing known squads
4. Sync before work, push after work

**Step count: 4.** No daemon, no server, no config service.

**Error Cases Handled:** Git auth failures, non-fast-forward conflicts, Zone 3 404s, missing .mesh directory, stale data, yq not found — all documented with troubleshooting guidance.

**Phased Graduation to CLI:**
- **Phase 0 (now):** Convention + templates + skill
- **Phase 1 (3+ teams validating):** `squad mesh init` command to Squad CLI
- **Phase 2 (cross-org appears):** Zone 3 HTTP support in sync script

**Key Constraint Honored:** User directive "Choose the most simple implementation path."

**Entire distributed tooling layer: 3 template files, 1 skill, 0 new dependencies, 0 running services.**

- **Distributed mesh docs migrated from YAML config to JSON config.** Updated 3 files (`distributed-mesh/README.md`, `distributed-mesh/SKILL.md`, `.squad/skills/distributed-mesh/SKILL.md`) to reflect `mesh.yaml` → `mesh.json` switch. All inline config examples converted from YAML syntax to JSON. `yq` dependency removed, replaced with `jq` for bash script. PowerShell script now documented as zero-external-dep (ConvertFrom-Json is built-in). Parameter renamed `-MeshYaml` → `-MeshJson`. Files table, phased rollout table, prerequisites, cross-org setup, Windows support section all updated. Both SKILL.md copies verified identical post-edit. No architecture content, zone descriptions, or anti-pattern logic changed.

**Decision filed:** `.squad/decisions/decisions.md` (Decision 16d) — Tooling design, 4-step setup, adoption friction analysis.

- **README Getting Started expanded with detailed walkthrough.** Added "Setting Up Your First Mesh" section (~50 lines) to `distributed-mesh/README.md` walking through: what the mesh state repo is, creating it, directory structure convention, registering a squad, configuring mesh.yaml, running first sync, and verifying. Added callout answering "Does the mesh state repo need its own Squad?" (answer: no — it's a dumb pipe). Updated Windows Note → "Windows Support" section with `sync-mesh.ps1` usage examples and compatibility notes (PS 5.1+/7+). Added `sync-mesh.ps1` to the Files table. The ps1 script already existed — no changes needed to it. README went from 162 → 223 lines. Design choice: kept existing "Same-Org Setup (4 steps)" as a quickstart reference alongside the new detailed walkthrough — they serve different readers (experienced vs. first-timer).

- **Distributed tooling design: convention-first, no CLI integration yet.** Reviewed 5 distributed architecture documents (Burns, Frink, Moe across Sonnet 4.5, Opus 4.6, GPT-5.4). Key decisions: (1) bash-only sync script — 30 lines doesn't warrant cross-platform maintenance; document PowerShell equivalent but don't ship it. (2) No Squad CLI integration yet — distributed pattern has zero production users; earn the PR to Brady's repo after 3+ teams validate the convention. (3) Template files + docs as adoption path — `squads.yaml.example` and `sync-mesh.sh.example` users copy and edit. (4) Created Squad skill `.squad/skills/distributed-mesh/SKILL.md` teaching agents the sync-read-work-write-publish lifecycle, zone trust model, and write partitioning rules. (5) 4-step setup guide designed for someone with 2-3 squads on different machines. Decision filed at `.squad/decisions/inbox/smithers-distributed-tooling.md`. User directive "choose the most simple implementation path" is the governing constraint — no running services, no new dependencies, no scaffolding commands.
