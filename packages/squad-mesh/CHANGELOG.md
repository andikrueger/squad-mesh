# Changelog

All notable changes to `squad-mesh` will be documented in this file.

This project follows [Semantic Versioning](https://semver.org/).

## [0.2.0] - 2025-01-29

### Added
- **`init-squad` command** — register a squad into an existing mesh, install the wisdom skill, write backpointer with mesh contact info (`--mesh-root`, `--mesh-url`, `--name`)
- **`yokoten` command** — collect and propagate cross-squad learnings (knowledge sharing) with `--dry-run` and `--json` support
- **Mesh Bridge API** — programmatic squad-to-mesh communication (`readMeshLink`, `getMeshLearnings`, `getMeshPatterns`, `contributeLearning`, `getMeshStatus`)
- **Wisdom Skill Template** — auto-generated `.squad/skills/mesh-wisdom/SKILL.md` teaching squad agents how to access mesh knowledge
- **Backpointers** — `discover --register` now writes `.squad/mesh-link.json` into each registered squad with mesh contact info
- **Knowledge injection** — coordinator prompt now includes `<shared_knowledge>` section with learnings and patterns
- **COP enrichment** — `recentLearnings` count now reflects actual learning data
- `MeshLink` type with `meshUrl` field for remote/distributed mesh access
- `generateWisdomSkill()` accepts mesh root path and URL for contact section

### Changed
- **Recommended install: global** (`npm i -g squad-mesh`) — CLI commands work everywhere, no per-repo install needed
- Wisdom skill template updated with CLI-first examples (global install friendly)
- `readMeshLink()` no longer requires `meshName` to be non-empty (relaxed validation)
- `runDiscover()` backpointer now reads mesh name from registry instead of writing empty string

### Fixed
- `meshName` validation bug — `readMeshLink()` returned null for all backpointers written by `discover --register` because meshName was empty string (falsy)

## [0.1.1] - 2025-01-29

### Added
- `--version` / `-v` flag to the CLI
- Version displayed in help output
- CHANGELOG.md for release traceability
- Git tags for release tracking (`v0.1.1`)

### Fixed
- `discover --register` now writes discovered squads to `registry.yaml`
- CLI binary name corrected from `squad-meta` to `squad-mesh`
- `init` command wired into CLI main switch
- All internal references renamed from `squad-meta` to `squad-mesh`
- Duplicate `test:integration` script entries in package.json

## [0.1.0] - 2025-01-29

### Added
- Initial release of squad-mesh
- **Discovery** — scan filesystem for sibling squads via configurable markers
- **Status / COP** — common operational picture aggregating health across squads
- **Steering** — directive issuance, routing, and timeline tracking
- **Knowledge (Yokoten)** — cross-squad insight and pattern propagation
- **Coordinator** — agent communication and work delegation
- **CLI** — standalone `squad-mesh` binary with `init`, `discover`, `status`, `health`, `help` commands
- `.meta-squad/` directory structure for persistent mesh state
- `meta-squad.config.ts` template generation
- `registry.yaml` for discovered squad persistence
- Windows MAX_PATH handling in discovery scanner
