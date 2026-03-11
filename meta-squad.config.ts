/**
 * Meta-Squad Configuration — andi-squads
 *
 * Configures multi-squad orchestration for all of the project owner's local dev squads.
 * Uses the squad-mesh extension for discovery, steering, and visibility.
 */
import {
  defineMetaSquad,
  defineDiscovery,
  defineSteering,
  defineVisibility,
  defineKnowledge,
  defineHealth,
} from './packages/squad-mesh/dist/index.js';

export default defineMetaSquad({
  version: '1.0.0',
  name: 'dev-squads',
  purpose: 'Coordinate local development squads',
  leader: 'owner',

  discovery: defineDiscovery({
    mode: 'hybrid',
    scanRoots: ['C:\\dev'],
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
