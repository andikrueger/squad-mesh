# Squad-Architecture Decisions Log

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
