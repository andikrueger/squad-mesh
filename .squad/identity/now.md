# Current Focus

v0.2.0 RELEASED ✅

## Status: v0.2.0 Shipped & Documented

- squad-mesh v0.2.0 published (npm, git tag v0.2.0)
- README.md fully rewritten (392 lines) — covers all v0.2.0 features
- CHANGELOG.md comprehensive (v0.1.0 → v0.1.1 → v0.2.0)
- All product docs audited and updated

## v0.2.0 Features

- **`init-squad` command** — register a squad into an existing mesh with backpointers + wisdom skill
- **`yokoten` command** — cross-squad knowledge propagation (learnings & patterns)
- **Mesh Bridge API** — programmatic squad-to-mesh communication (`readMeshLink`, `getMeshLearnings`, etc.)
- **Wisdom Skill Template** — auto-generated `.squad/skills/mesh-wisdom/SKILL.md` for squad agents
- **Backpointers** — `discover --register` writes `.squad/mesh-link.json` into each registered squad
- **Global install recommended** — `npm i -g squad-mesh`, CLI works everywhere

## Release History

| Version | Highlights |
|---------|-----------|
| v0.1.0 | Discovery, COP, steering, knowledge, CLI MVP |
| v0.1.1 | Binary rename squad-meta → squad-mesh, discover --register fix, version flag |
| v0.2.0 | init-squad, yokoten, bridge API, backpointers, wisdom skills, global install |

## Next Phase

- Graph analytics exploration (knowledge graph, centrality, pattern discovery)
- Federation testing — cross-squad distributed mesh validation
- SDK plugin integration when Squad SDK adds extension hooks
