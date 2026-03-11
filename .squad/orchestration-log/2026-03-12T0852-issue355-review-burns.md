# Orchestration Log: Issue #355 API Contract Analysis — Burns

**Session:** 2026-03-12T0852Z  
**Agent:** Burns (Lead Architect)  
**Trigger:** GitHub issue bradygaster/squad#355 + Andi's position on API-based contracts  
**Decision Status:** Proposed to team (awaiting review/vote)

---

## Analysis Output

Burns completed architectural analysis of GitHub issue #355 (external API documentation for agents) and its relationship to cross-squad orchestration contracts.

**Key Findings:**
- Issue #355 and squad-holacracy orchestration are the same architectural problem at *different scales*: accessing knowledge not on local filesystem
- Context-hub is a useful tool for external library docs (Option A on #355) but incorrect as architecture directive for our orchestration layer
- Proposed 3-layer evolution path with evidence-based activation triggers:
  - **Layer 1 (Now):** External Doc Skill wrapping `chub` CLI
  - **Layer 2 (Month 2):** Remote-aware discovery via HTTP registry
  - **Layer 3 (Month 4+):** Full SquadAPIContract interface

**Decision Rationale:**
Adopt contract-based interface with pluggable backends (local fs, HTTP) to solve both external docs and remote orchestration without abandoning local-first as default. Separates data model from transport.

**Deliverables:**
- `architecture-review/burns-issue355-api-contracts.md` — Full analysis
- `.squad/decisions/inbox/burns-api-contract-evolution.md` — Decision proposal

**Recommendation:** Proceed with Layer 1 (skill-based integration) immediately; defer Layers 2-3 until evidence triggers (first squad on different machine, >15 squads, cross-org requirement).

---

## References

- GitHub Issue: [bradygaster/squad#355](https://github.com/bradygaster/squad/issues/355)
- Decision 5 (Holacracy Endgame) — cross-squad orchestration contracts
- Decision 5c (Phase 0 IS the product) — evidence-based activation
- Context-hub repo: https://github.com/andrewyng/context-hub

---

*End of orchestration log.*
