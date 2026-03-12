# Changelog

All notable changes to `squad-mesh` will be documented in this file.

This project follows [Semantic Versioning](https://semver.org/).

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
