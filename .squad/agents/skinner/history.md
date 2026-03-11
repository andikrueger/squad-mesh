# Project Context

- **Owner:** Project Owner
- **Project:** squad-architecture — Designing a multi-squad orchestration architecture (squad-of-squads) using MCP as internal federation protocol and A2A for cross-org communication
- **Stack:** Architecture design, MCP (Model Context Protocol), A2A (Agent-to-Agent), distributed systems
- **Created:** 2026-03-11

## Learnings

<!-- Append new learnings below. Each entry is something lasting about the project. -->

### 2026-03-11: Trust Model Analysis

Analyzed the squad-of-squads architecture for trust boundaries and governance gaps. Key findings:

1. **Three trust zones identified:** Intra-squad (tight trust), Squad↔Hub (mutual trust with asymmetric power), Org↔Org A2A (zero trust).

2. **Hub is single point of governance failure:** If compromised, can poison all squads. Needs authentication (mTLS), authorization (namespaces + ACLs), and redundancy (multi-instance consensus).

3. **"Reasoning ownership" creates implicit override authority:** Hub can override squad decisions. Needs explicit escalation model with exception requests.

4. **Data classification critical at A2A boundary:** Internal data (policies, prompts, guardrails, decisions) must NEVER cross org boundary. A2A responses need sanitization layer.

5. **Cross-squad leakage risk:** Without namespace isolation, squads can see each other's context. Recommend private/shared/canonical access model.

6. **Virtual squads need trust zone declaration:** Intra-org (mTLS to hub) vs extra-org (A2A capability tokens). Provisioning mechanism undefined.

7. **Policy enforcement model unspecified:** Three options: Store (passive), Gateway (active), Oracle (hybrid). Recommend Gateway for critical policies, Oracle for advisory.

8. **Eight critical gaps documented:** No auth mechanism, no authz model, no escalation path, no data classification, no namespace isolation, no cert management, no policy enforcement, hub single point of failure.

Governance review written to .squad/decisions/inbox/skinner-governance-review.md with detailed threat model, blast radius analysis, and remediation recommendations.

### 2026-03-12: Auth & Security Endgame Analysis

Deep-dive threat model for the federation endgame scenarios raised in the Teams chat. Key findings:

1. **The Entra cross-org scenario is a SolarWinds-class risk.** An AI agent from one org requesting code modifications to another org's identity system has catastrophic blast radius. Air-gapping security-critical systems from external A2A is non-negotiable.

2. **Cross-org AI-to-AI code modification is not safe with current AI capabilities.** LLMs are susceptible to prompt injection, cannot reliably assess intent, and generate plausible-but-subtly-wrong security code. Human-in-the-loop is mandatory for all cross-org code changes — this is a hard constraint, not a preference.

3. **"Squads creating organizations" is a privilege escalation and fork bomb risk.** Requires: human approval for org creation, privilege ceiling enforcement (child ≤ parent), depth limiting, rate limiting, and platform-level kill switches.

4. **Filesystem trust model (OneDrive/symlinks) is unacceptable for multi-squad.** Filesystem permissions are coarse-grained, unaudited, and trivially bypassed by supply chain attacks. Multi-squad must use authenticated APIs, not shared filesystems.

5. **Dina's cloud constraint makes authentication mandatory from day one.** Internet-traversing federation with unauthenticated endpoints will be exploited within hours. "Add auth later" is not an option.

6. **Seven hard limits proposed for Phase 3:** No autonomous cross-org code modification, no autonomous org creation, no capability delegation beyond one hop, no A2A access to security-critical systems, maximum federation depth of 2, 24-hour quarantine for cross-org changes, annual federation recertification.

7. **Core position: Build the security model FIRST, let the architecture conform to its constraints.** Security retrofitted onto architecture is how breaches happen. The auth model IS the architecture.

Analysis written to architecture-review/skinner-auth-endgame.md. Decision proposal written to .squad/decisions/inbox/skinner-endgame.md.
