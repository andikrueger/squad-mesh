# Squad Decisions — Archive

Decisions older than 30 days, kept for historical reference and institutional memory.

---

## Archived (2026-03-11)

### 1. MCP-Centric Squad-of-Squads Architecture (Architecture Review)
**Date:** 2026-03-11  
**Author:** Burns (Lead Architect) + team review (Frink, Moe, Chalmers, Skinner)  
**Status:** Superseded by Decision 3 (Holacracy-First Architecture)  

Architectural review of proposed hub-and-spoke topology with three protocol layers (ACP/MCP/A2A). Consensus findings:

**Strengths (all reviewers):**
- Protocol separation (ACP/MCP/A2A) with clean trust boundaries
- Hub as value-driven coordinator (not command authority)
- Squad autonomy with graceful degradation
- Opaque external boundaries for A2A

**Challenges:**
- "Lossless MCP" is aspirational — lacks delivery guarantees (Frink's gap #1)
- Governance model undefined — no auth/authz/escalation (Skinner's 8 gaps)
- Three protocols may be premature — 80% of coordination could be git (Moe's challenge)
- Scale ceiling at 10-15 squads before tiering (Chalmers' pattern analysis)

**Verdict:** Proceed in three phases. Phase 0 (mandatory): 30-day git experiment to prove simpler alternatives fail. Only build Phase 1 (MVP hub), Phase 2 (federation), Phase 3 (scale) if pain points materialize.

**Related files:** burns-arch-review.md, burns-synthesis.md, burns-teams-outline.md, frink-protocol-review.md, moe-skeptic-review.md, chalmers-org-patterns.md, skinner-governance-review.md

---

### 2. Use Claude Opus-4.6 as Default Model
**Date:** 2026-03-11  
**Author:** Project Owner (via Copilot)  
**Status:** Active directive  

All squad agents should use claude-opus-4.6 as the default model for synthesis tasks and complex reasoning. This overrides cost-first model selection for architectural work, deep analysis, and decision synthesis.

---
