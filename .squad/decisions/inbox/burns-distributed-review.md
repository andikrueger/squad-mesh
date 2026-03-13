# Burns' Distributed Architecture Review — Verdict

**Date:** 2026-03-16
**Author:** Burns (Lead Architect)
**Status:** Complete — architectural review concluded
**Scope:** Distributed squad communication across machines, orgs, and companies

---

## Decision: Distributed Mesh Architecture Is Settled

After reviewing all 8 source documents across three model families (Opus 4.6, Sonnet 4.5, GPT-5.4), three analytical perspectives (architect, systems engineer, adversarial critic), and two rounds of independent team analysis (Frink, Moe, Burns), I'm calling this settled.

### The Verdict

**The distributed extension to squad communication is a transport upgrade, not an architecture change.**

The agent interface is invariant — agents read local files. The distributed layer materializes remote files locally before the agent reads them. Git is the transport for 85%+ of cases. The remaining cases need ~15 lines of curl. Total new code: ~30 lines of shell + 1 YAML config.

### Load-Bearing Conclusions (All Models Agree)

1. **Git IS the transport.** Not HTTP, not MCP, not A2A. Git handles auth, sync, conflict resolution, audit, and offline operation.
2. **Three zones of trust.** Local (filesystem), Remote-Trusted (git pull), Remote-Opaque (curl). Every model family independently derived this taxonomy.
3. **Zero running services.** The architecture stays files + conventions + existing tools.
4. **Zero deleted subsystems reinstated.** 0 of 12 subsystems killed in the local-only round earn reinstatement.
5. **Write partitioning eliminates conflicts.** Each squad writes only to its own directory.
6. **Phased rollout.** Convention → sync script → published contracts → never (no protocols).

### Where Models Disagree (All Cosmetic)

- **Config format:** Opus uses flat `.remotes` file; Sonnet/GPT use YAML. → Decision: YAML (mesh.yaml). Richer, still simple.
- **Directory naming:** Varying names for the same concepts (boards/drops/squads vs state.md/log.md). → Decision: Defer to whatever Squad adopts; the pattern matters, not the names.
- **Trust labels:** own/partner/external vs zones 1/2/3 vs local/git/http. → Decision: Use descriptive zone names (local, remote-trusted, remote-opaque).

### Simplest Integration Into Squad

**One file: a SKILL.md.** Drop it into `.squad/skills/distributed-mesh/SKILL.md` in the Squad repo. The skill teaches agents the three zones, the mesh.yaml format, the sync convention, and the anti-patterns. The agent learns the pattern and applies it when distributed communication is needed.

No code changes to Squad. No new CLI commands. No new templates. The skill IS the integration.

The mesh.yaml example and sync-mesh.sh reference script live alongside the SKILL.md in the `distributed-mesh/` folder of this repo for humans to copy-paste.

### Deliverables Produced

```
distributed-mesh/
├── README.md              — One-page architecture guide for humans
├── mesh.yaml.example      — Copy-paste config showing all three zones
├── sync-mesh.sh           — Reference ~30-line sync script
└── SKILL.md               — Squad skill file (the integration artifact)
```

Four files. Each justified:
- README.md: narrative for humans reading this repo
- mesh.yaml.example: the config reference (different audience than the skill)
- sync-mesh.sh: the reference implementation agents or humans can use directly
- SKILL.md: the Squad integration — what agents learn from

### Why Not More Files?

The documents converged on ~30 lines of shell + 1 YAML config. Four files is already generous. Every additional file would need justification against the 125:1 ratio (30 lines of honest architecture vs. 3,756 lines of deleted TypeScript).

### Impact on Team

- **Frink:** His distribution-problem.md and information-flow.md are the deepest technical source. Both confirmed and absorbed.
- **Moe:** His 125:1 ratio and "0 of 12 reinstated" findings are the quality gate. Both preserved.
- **Smithers:** No platform work needed. Git is the platform.
- **Chalmers:** Holacracy/governance model is orthogonal. Distributed mesh is transport, not governance.

---

*Burns — Lead Architect*
