# squad-mesh

![npm version](https://img.shields.io/npm/v/squad-mesh)

> Multi-squad coordination mesh for Squad. Discover, steer, and monitor squads as a unified organization.

Requires Node ≥ 20 and `@bradygaster/squad-sdk >= 0.8.0` as a peer dependency.

## Why

When you run 8+ squads locally, each with its own agent, you hit coordination problems fast: Which squads exist? Who’s blocked? How do you push a directive to three squads at once? How does a lesson learned in one squad reach the others?

squad-mesh treats your squads as nodes in a coordination graph. It handles discovery, steering, visibility, and knowledge propagation across the mesh — so individual squads stay autonomous while the organization stays coherent.

## How It Works

```
  ┌─────────┐    directive    ┌─────────┐
  │ squad-A │───────────────▶│ squad-B │
  └────┬────┘                └────┬────┘
       │                          │
       │ tension                  │ learning
       │                          │
  ┌────▼────┐    directive    ┌───▼─────┐
  │ squad-C │◀───────────────│ squad-D │
  └─────────┘                └─────────┘
```

- **Nodes** = squads, discovered by scanning the filesystem for markers (`squad.config.ts`, `.squad/`)
- **Directed edges** = directives flowing from leader to target squads
- **Signals** = tensions routed between squads when cross-cutting issues arise
- **Propagation** = learnings classified by relevance (squad-specific → domain → universal) and pushed through the mesh
- **Backpointers** = each registered squad gets a `.squad/mesh-link.json` pointing back to the mesh root, enabling squads to contact the mesh

The mesh coordinator generates system prompt fragments that inject organizational context into each squad's agent. Squads don't need to know about the mesh — the mesh knows about them.

## Install

**Recommended: install globally.** The primary value of squad-mesh is its CLI commands and file-based wisdom skills — no per-repo `node_modules` needed.

```bash
npm install -g squad-mesh
```

> **Alternative:** `npm install squad-mesh` locally if you need the programmatic Bridge API (`import from 'squad-mesh'`). The CLI commands work either way.

After installing, verify:

```bash
squad-mesh --version   # → 0.2.0
squad-mesh help        # → list all commands
```

## Quick Start

### 1. Initialize the mesh (in your mesh root directory)

```bash
cd ~/dev                       # or wherever your squads live
squad-mesh init
```

This creates `.meta-squad/` with configuration, registry, and subdirectories for learnings, patterns, and status.

### 2. Discover squads

```bash
squad-mesh discover                     # scan parent directory
squad-mesh discover --root ./projects   # scan a specific root
squad-mesh discover --register          # persist to registry.yaml + write backpointers
```

`--register` writes a `.squad/mesh-link.json` backpointer into each discovered squad, linking it back to the mesh.

### 3. Register individual squads into the mesh

From inside any squad repo:

```bash
squad-mesh init-squad --mesh-root ~/dev
squad-mesh init-squad --mesh-root ~/dev --mesh-url https://github.com/org/mesh
squad-mesh init-squad --mesh-root ~/dev --name my-mesh
```

This:
- Creates/updates `.squad/mesh-link.json` (backpointer with mesh root path + optional URL)
- Installs `.squad/skills/mesh-wisdom/SKILL.md` (teaches squad agents how to access mesh knowledge)

### 4. Share knowledge across squads

```bash
squad-mesh yokoten                # collect and propagate learnings
squad-mesh yokoten --dry-run      # preview without writing
squad-mesh yokoten --json         # machine-readable output
```

### 5. Monitor the mesh

```bash
squad-mesh status                 # Common Operational Picture
squad-mesh status --format json   # machine-readable
squad-mesh health                 # cross-squad health check
```

### Recommended Workflow

```
squad-mesh init                                                   # 1. Scaffold mesh root
squad-mesh discover --register                                    # 2. Find squads, write backpointers
cd ~/dev/my-squad && squad-mesh init-squad --mesh-root ~/dev      # 3. Per-squad setup
squad-mesh yokoten                                                # 4. Propagate learnings
squad-mesh status                                                 # 5. Monitor
```

## CLI Reference

| Command | Description |
|---------|-------------|
| `squad-mesh init` | Initialize `.meta-squad/` directory structure in the current directory |
| `squad-mesh discover [--root <path>] [--json] [--register]` | Discover squads on the filesystem. `--register` persists to registry + writes backpointers |
| `squad-mesh init-squad --mesh-root <path> [--mesh-url <url>] [--name <mesh>]` | Register current squad into a mesh. Creates backpointer + installs wisdom skill |
| `squad-mesh yokoten [--root <path>] [--json] [--dry-run]` | Collect and propagate cross-squad learnings (knowledge sharing) |
| `squad-mesh status [--format json]` | Generate Common Operational Picture across all squads |
| `squad-mesh health` | Cross-squad health check |
| `squad-mesh help` | List available commands |
| `squad-mesh --version` | Print version |

## Backpointers & Wisdom Skills

When you run `discover --register` or `init-squad`, squad-mesh writes two files into the squad:

### `.squad/mesh-link.json` (Backpointer)

```json
{
  "meshRoot": "/home/user/dev",
  "meshName": "platform-engineering",
  "registeredAt": "2026-03-12T10:00:00.000Z",
  "registryPath": "/home/user/dev/.meta-squad/registry.yaml",
  "version": "0.2.0",
  "meshUrl": "https://github.com/org/mesh"
}
```

This tells the squad how to find the mesh. The `meshUrl` field is optional and only present if `--mesh-url` was provided.

### `.squad/skills/mesh-wisdom/SKILL.md` (Wisdom Skill)

An auto-generated skill file that teaches squad agents how to:
- Query the mesh for shared learnings and patterns
- Contribute their own learnings back to the mesh
- Check the mesh's Common Operational Picture
- Contact the mesh via CLI commands or the Bridge API

Squad agents that support skill files (e.g., Copilot CLI) automatically pick this up.

## Programmatic Quick Start

Create a `meta-squad.config.ts`:

```ts
import {
  defineMetaSquad,
  defineDiscovery,
  defineSteering,
  defineVisibility,
  defineKnowledge,
  defineHealth,
} from 'squad-mesh';

export default defineMetaSquad({
  name: 'my-squads',
  purpose: 'Coordinate all local dev squads',
  leader: 'andi',

  discovery: defineDiscovery({
    mode: 'hybrid',
    scanRoots: ['./'],
    markers: ['squad.config.ts', '.squad'],
    exclude: ['node_modules', '.git', 'dist'],
  }),

  steering: defineSteering({
    directiveAuthority: 'leader-only',
    allowRejection: true,
    autoEscalateAfter: 'P3D',
  }),

  visibility: defineVisibility({
    include: ['work', 'blockers', 'decisions', 'health'],
    staleAfter: 'P1D',
  }),

  knowledge: defineKnowledge({
    autoPropagateUniversal: true,
    crossSquadTags: ['architecture', 'security', 'performance'],
  }),

  health: defineHealth({
    enabled: true,
    alertOnChange: true,
  }),
});
```

Discover squads programmatically:

```ts
import { discoverSquads } from 'squad-mesh';

const result = await discoverSquads({
  mode: 'hybrid',
  scanRoots: ['./'],
  markers: ['squad.config.ts', '.squad'],
  exclude: ['node_modules', '.git', 'dist'],
});

console.log(`Found ${result.squads.length} squad(s)`);
for (const squad of result.squads) {
  console.log(`  ${squad.name} — ${squad.purpose} (${squad.path})`);
}
// Found 8 squad(s)
//   auth-squad — Authentication and identity (./squads/auth)
//   api-squad — Public API surface (./squads/api)
//   ...
```

## Bridge API (Programmatic Access)

The Bridge API lets squad agents access mesh data programmatically. Import from `'squad-mesh'`:

```ts
import {
  readMeshLink,
  getMeshLearnings,
  getMeshPatterns,
  contributeLearning,
  getMeshStatus,
} from 'squad-mesh';
```

| Function | Description |
|----------|-------------|
| `readMeshLink(squadRoot?)` | Read `.squad/mesh-link.json` backpointer. Returns `MeshLink` or `null` |
| `getMeshLearnings(meshRoot, options?)` | Fetch learnings from the mesh. Filter by tags, relevance, recency |
| `getMeshPatterns(meshRoot)` | Fetch promoted patterns from the mesh |
| `contributeLearning(meshRoot, learning)` | Submit a new learning to the mesh |
| `getMeshStatus(meshRoot)` | Get the mesh's Common Operational Picture |

### MeshLink Type

```ts
import type { MeshLink } from 'squad-mesh';

// Shape:
interface MeshLink {
  meshRoot: string;       // Absolute path to mesh root directory
  meshName: string;       // Name of the mesh (from registry)
  registeredAt: string;   // ISO-8601 timestamp
  registryPath: string;   // Path to registry.yaml
  version: string;        // squad-mesh version that wrote this
  meshUrl?: string;       // Optional URL for remote mesh access
}
```

## API Reference

### Subsystems

| Subsystem | Key Functions | Description |
|-----------|---------------|-------------|
| Discovery | `discoverSquads()`, `isSquadRoot()`, `getDefaultDiscoveryConfig()`, `formatDiscoverySummary()` | Find squads on the filesystem via markers and registry |
| Status/COP | `collectSquadStatus()`, `collectAllStatuses()`, `generateCOP()`, `generateHealthReport()` | Per-squad health, work items, blockers; Common Operational Picture rollup |
| Steering | `createDirective()`, `issueDirective()`, `saveDirective()`, `raiseTension()`, `routeTension()`, `initializeSteering()` | Top-down directives, cross-squad tension routing, auto-escalation |
| Knowledge | `collectSquadLearnings()`, `collectAllLearnings()`, `filterPropagatable()`, `promoteToPattern()`, `saveLearning()` | Cross-squad learning propagation (**experimental**) |
| Coordinator | `generateMetaSquadPrompt()`, `generateCompactStatus()`, `generateTensionDetectionRules()`, `generateDirectiveComplianceRules()` | Agent prompt injection for AI coordinators |
| Bridge | `readMeshLink()`, `getMeshLearnings()`, `getMeshPatterns()`, `contributeLearning()`, `getMeshStatus()` | Programmatic mesh access from squad agents |
| Builders | `defineMetaSquad()`, `defineDiscovery()`, `defineSteering()`, `defineVisibility()`, `defineKnowledge()`, `defineHealth()` | Type-safe, runtime-validated configuration |

### Type Exports

All config and domain types are re-exported from the barrel:

```ts
import type {
  MetaSquadConfig, DiscoveryConfig, SteeringConfig,
  VisibilityConfig, KnowledgeConfig, HealthConfig,
  SquadIdentity, SquadStatus, CommonOperationalPicture,
  Directive, CrossSquadTension, CrossSquadLearning,
  DiscoveryResult, DiscoveryError, DiscoveryWarning,
  MeshLink,
} from 'squad-mesh';
```

## Configuration

The `meta-squad.config.ts` file uses the `defineMetaSquad()` builder. All subsection builders validate at runtime and throw `MeshValidationError` on invalid input.

### `defineMetaSquad(config)`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `string` | ✅ | Meta-squad name |
| `purpose` | `string` | ✅ | Purpose of this meta-squad |
| `leader` | `string` | — | Who leads this meta-squad |
| `version` | `string` | — | Schema version for forward compatibility |
| `discovery` | `DiscoveryConfig` | ✅ | How squads are found (see below) |
| `steering` | `SteeringConfig` | — | Directive and tension policies |
| `visibility` | `VisibilityConfig` | — | Status rollup settings |
| `knowledge` | `KnowledgeConfig` | — | Learning propagation rules |
| `health` | `HealthConfig` | — | Health monitoring thresholds |
| `squads` | `SquadIdentity[]` | — | Explicitly registered squads (in addition to discovered) |

### `defineDiscovery(config)`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `mode` | `'local' \| 'registry' \| 'hybrid'` | ✅ | Discovery strategy |
| `scanRoots` | `string[]` | — | Root directories to scan |
| `markers` | `SquadMarker[]` | — | Files/dirs that identify a squad: `squad.config.ts`, `squad.config.js`, `.squad`, `.squad/config.json`, `package.json` |
| `exclude` | `string[]` | — | Directories to skip (e.g. `node_modules`) |
| `patterns` | `string[]` | — | Glob patterns to match squad directories |
| `refreshInterval` | `string` | — | ISO-8601 duration or cron for re-scan |
| `registryPath` | `string` | — | Override registry file path |

### `defineSteering(config)`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `directiveAuthority` | `'leader-only' \| 'any-squad' \| 'designated'` | ✅ | Who can issue directives |
| `allowRejection` | `boolean` | — | Whether squads can reject directives |
| `defaultPriority` | `'critical' \| 'high' \| 'normal' \| 'low'` | — | Default priority for new directives |
| `autoEscalateAfter` | `string` | — | ISO-8601 duration before auto-escalation |
| `designatedIssuers` | `string[]` | — | Required when authority is `'designated'` |

### `defineVisibility(config)`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `include` | `Array<'work' \| 'blockers' \| 'decisions' \| 'metrics' \| 'health'>` | — | What to include in the COP |
| `staleAfter` | `string` | — | Max age before a status report is stale |
| `reportingCadence` | `string` | — | Cron or duration for reporting schedule |

### `defineKnowledge(config)`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `autoPropagateUniversal` | `boolean` | — | Auto-propagate universal learnings |
| `crossSquadTags` | `string[]` | — | Tags that indicate cross-squad relevance |
| `patternPromotionThreshold` | `'experimental' \| 'established'` | — | Confidence threshold for pattern promotion |

### `defineHealth(config)`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `enabled` | `boolean` | — | Enable automatic health checks |
| `checkInterval` | `string` | — | ISO-8601 duration between checks |
| `alertOnChange` | `boolean` | — | Notify on health level transitions |
| `signals` | `HealthSignal[]` | — | Custom signals with `name`, `description`, `yellowThreshold`, `redThreshold` |

## Architecture

- **Local-first** — All discovery runs against the local filesystem. No network calls, no servers, no auth. Works offline, works in CI, works anywhere Node runs.
- **Mesh topology** — Squads are nodes. Directives are directed edges from leader to targets. Tensions are cross-squad signals routed by the mesh. Knowledge propagates through edges based on relevance classification. The topology is a directed graph today; future versions add cycle detection and centrality analysis.
- **AI-native** — The coordinator subsystem generates system prompt fragments that inject organizational awareness into squad agents. Agents don't call an API — the mesh writes rules into their prompts. This is designed for LLM-powered agents, not human org charts.
- **File-native** — All state (directives, tensions, learnings, status) persists as JSON/YAML in `.meta-squad/`. Everything is git-trackable. No database, no external state store.
- **Non-destructive** — The mesh reads squad data and writes only to `.squad/mesh-link.json` and `.squad/skills/` (with consent via `init-squad` or `--register`). Squad autonomy is preserved by design.
- **Backpointer-linked** — Each registered squad carries a `.squad/mesh-link.json` that points back to the mesh root. This enables squads to locate and communicate with the mesh without hardcoded paths.
- **Skill-based communication** — The wisdom skill (`.squad/skills/mesh-wisdom/SKILL.md`) teaches squad agents how to query the mesh for learnings, patterns, and status. No custom tooling required — agents use their existing skill system.
- **Graph-ready** — The node/edge model maps directly to graph primitives. Current implementation is traversal-only. Planned: DAG validation, hop-based knowledge propagation, squad affinity scoring, centrality-based priority routing.
- **Extensible** — Built as a Squad SDK extension. The architecture accommodates future remote discovery, MCP transport, and federated meshes without breaking the local-first contract.

## Roadmap

| Version | Focus | Key Features |
|---------|-------|-------------|
| **v0.1** | Foundation | Discovery, status/COP, steering persistence, knowledge collection, CLI, coordinator prompt injection |
| **v0.2** | Knowledge wiring | `init-squad` with backpointers, wisdom skill generation, `yokoten` CLI, Bridge API, mesh contact info (`--mesh-url`) |
| **v0.5** | Propagation intelligence | Hop-based knowledge propagation (1-hop = direct, 2-hop = transitive), squad affinity model based on shared tags and interaction history |
| **v1.0** | Graph analytics | Centrality analysis, clustering detection, event-sourced governance timeline, GraphQL query interface for mesh state |

## Experimental Features

> ⚠️ **Alpha — APIs may change without notice.**

**Knowledge Collection & Propagation** — `collectSquadLearnings()`, `collectAllLearnings()`, `filterPropagatable()`, `promoteToPattern()`, `saveLearning()`, `loadLearnings()`, `savePattern()`, `loadPatterns()`. The knowledge subsystem collects learnings from squad histories and decisions, classifies their relevance (squad-specific, domain-relevant, universal), and promotes recurring patterns. Functional, but classification heuristics and the propagation model are still being tuned.

**Steering Persistence** — `saveDirective()`, `loadDirectives()`, `saveTension()`, `loadTensions()`, `initializeSteering()`. Directives and tensions persist to disk. The persistence layer is hardened (fail-loud on write errors, auto-creates directories), but the governance workflow (escalation timing, multi-squad directive negotiation) is still evolving.

## License

MIT
