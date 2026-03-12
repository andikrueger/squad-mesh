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

The mesh coordinator generates system prompt fragments that inject organizational context into each squad’s agent. Squads don’t need to know about the mesh — the mesh knows about them.

## Quick Start

```bash
npm install squad-mesh
```

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

## CLI Usage

The package ships a standalone `squad-mesh` binary:

```bash
# Initialize meta-squad configuration
npx squad-mesh init

# Discover squads in the parent directory
npx squad-mesh discover

# Discover with custom root and JSON output
npx squad-mesh discover --root ../projects --json

# Cross-squad Common Operational Picture
npx squad-mesh status

# Machine-readable status
npx squad-mesh status --format json

# Health check (delegates to status with health focus)
npx squad-mesh health

# List available commands
npx squad-mesh help
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
- **AI-native** — The coordinator subsystem generates system prompt fragments that inject organizational awareness into squad agents. Agents don’t call an API — the mesh writes rules into their prompts. This is designed for LLM-powered agents, not human org charts.
- **File-native** — All state (directives, tensions, learnings, status) persists as JSON in `.meta-squad/`. Everything is git-trackable. No database, no external state store.
- **Non-destructive** — The mesh never writes to squad internals. It reads `.squad/` directories, `.meta-squad/status.json`, and squad configs. Squad autonomy is preserved by design.
- **Graph-ready** — The node/edge model maps directly to graph primitives. Current implementation is traversal-only. Planned: DAG validation, hop-based knowledge propagation, squad affinity scoring, centrality-based priority routing.
- **Extensible** — Built as a Squad SDK extension. The architecture accommodates future remote discovery, MCP transport, and federated meshes without breaking the local-first contract.

## Roadmap

| Version | Focus | Key Features |
|---------|-------|-------------|
| **v0.2** | Graph structure | DAG-based directive dependencies, cycle detection, knowledge graph relationships between learnings |
| **v0.5** | Propagation intelligence | Hop-based knowledge propagation (1-hop = direct, 2-hop = transitive), squad affinity model based on shared tags and interaction history |
| **v1.0** | Graph analytics | Centrality analysis (which squad is the coordination bottleneck?), clustering detection, event-sourced governance timeline, GraphQL query interface for mesh state |

## Experimental Features

> ⚠️ **Alpha — APIs may change without notice.**

**Knowledge Collection & Propagation** — `collectSquadLearnings()`, `collectAllLearnings()`, `filterPropagatable()`, `promoteToPattern()`, `saveLearning()`, `loadLearnings()`, `savePattern()`, `loadPatterns()`. The knowledge subsystem collects learnings from squad histories and decisions, classifies their relevance (squad-specific, domain-relevant, universal), and promotes recurring patterns. Functional, but classification heuristics and the propagation model are still being tuned.

**Steering Persistence** — `saveDirective()`, `loadDirectives()`, `saveTension()`, `loadTensions()`, `initializeSteering()`. Directives and tensions persist to disk. The persistence layer is hardened (fail-loud on write errors, auto-creates directories), but the governance workflow (escalation timing, multi-squad directive negotiation) is still evolving.

## License

MIT
