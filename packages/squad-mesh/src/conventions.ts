/**
 * File Conventions — `.meta-squad/` Directory Structure
 *
 * Defines the canonical file layout for the meta-squad state directory.
 * Provides initialization and validation utilities.
 *
 * Directory structure:
 * ```
 * .meta-squad/
 * ├── meta-squad.config.ts     # SDK-style config (or .json for simple setups)
 * ├── registry.yaml            # Discovered squad registry
 * ├── directives/              # Active and historical directives
 * │   ├── dir-abc123.json
 * │   └── dir-def456.json
 * ├── tensions/                # Cross-squad tensions
 * │   ├── tension-abc123.json
 * │   └── tension-def456.json
 * ├── learnings/               # Cross-squad learnings
 * │   ├── learn-abc123.json
 * │   └── learn-def456.json
 * ├── patterns/                # Promoted shared patterns
 * │   └── error-handling.json
 * ├── status/                  # Squad status snapshots
 * │   ├── auth-squad.json
 * │   └── api-squad.json
 * ├── governance/              # Governance timeline
 * │   └── timeline.json
 * └── health/                  # Health reports
 *     ├── auth-squad.json
 *     └── system.json
 * ```
 *
 * @module file-conventions
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

// ============================================================================
// Directory Constants
// ============================================================================

export const META_SQUAD_DIR = '.meta-squad';
export const REGISTRY_FILE = 'registry.yaml';
export const CONFIG_FILE_TS = 'meta-squad.config.ts';
export const CONFIG_FILE_JSON = 'meta-squad.config.json';

export const SUBDIRECTORIES = [
  'directives',
  'tensions',
  'learnings',
  'patterns',
  'status',
  'governance',
  'health',
] as const;

export type MetaSquadSubdir = typeof SUBDIRECTORIES[number];

// ============================================================================
// Initialization
// ============================================================================

/**
 * Initialize a `.meta-squad/` directory with the canonical structure.
 */
export function initMetaSquadDir(rootDir: string): string {
  const metaDir = path.join(rootDir, META_SQUAD_DIR);
  fs.mkdirSync(metaDir, { recursive: true });

  for (const subdir of SUBDIRECTORIES) {
    fs.mkdirSync(path.join(metaDir, subdir), { recursive: true });
  }

  // Create initial governance timeline
  const timelinePath = path.join(metaDir, 'governance', 'timeline.json');
  if (!fs.existsSync(timelinePath)) {
    fs.writeFileSync(timelinePath, JSON.stringify({
      version: '1.0',
      events: [{
        id: 'init',
        type: 'squad-created',
        description: 'Meta-squad initialized',
        timestamp: new Date().toISOString(),
        initiatedBy: 'system',
        affectedSquads: [],
      }],
    }, null, 2) + '\n', 'utf-8');
  }

  // Create empty registry
  const registryPath = path.join(metaDir, REGISTRY_FILE);
  if (!fs.existsSync(registryPath)) {
    const registryContent = [
      '# Meta-Squad Registry',
      '# Auto-populated by `squad meta discover`',
      '#',
      '# This file tracks all known squads in this meta-squad.',
      '# Edit manually or run `squad meta discover --register` to update.',
      '',
      'version: "1.0"',
      'metaSquad: ""',
      'leader: ""',
      'squads: []',
      '',
    ].join('\n');
    fs.writeFileSync(registryPath, registryContent, 'utf-8');
  }

  return metaDir;
}

/**
 * Generate a starter `meta-squad.config.ts` file.
 */
export function generateConfigTemplate(
  metaSquadName: string,
  purpose: string,
  leader?: string,
): string {
  return `/**
 * Meta-Squad Configuration — ${metaSquadName}
 *
 * This file configures the multi-squad orchestration layer.
 * Install: npm install squad-mesh
 */
import {
  defineMetaSquad,
  defineDiscovery,
  defineSteering,
  defineVisibility,
  defineKnowledge,
  defineHealth,
} from 'squad-mesh';

export default defineMetaSquad({
  version: '1.0.0',
  name: '${metaSquadName}',
  purpose: '${purpose}',
${leader ? `  leader: '${leader}',\n` : ''}
  discovery: defineDiscovery({
    mode: 'hybrid',
    scanRoots: ['..'],
    markers: ['squad.config.ts', '.squad'],
    exclude: ['node_modules', '.git', 'dist'],
  }),

  steering: defineSteering({
    directiveAuthority: 'leader-only',
    defaultPriority: 'normal',
    allowRejection: true,
    autoEscalateAfter: 'P3D',
  }),

  visibility: defineVisibility({
    include: ['work', 'blockers', 'decisions', 'health'],
    staleAfter: 'P1D',
  }),

  knowledge: defineKnowledge({
    autoPropagateUniversal: true,
    patternPromotionThreshold: 'established',
    crossSquadTags: ['architecture', 'security', 'performance', 'api-design'],
  }),

  health: defineHealth({
    enabled: true,
    alertOnChange: true,
    signals: [
      { name: 'blocker-count', yellowThreshold: 1, redThreshold: 3, description: 'Number of active blockers' },
      { name: 'decision-recency', yellowThreshold: 7, redThreshold: 14, description: 'Days since last decision' },
    ],
  }),
});
`;
}

// ============================================================================
// Validation
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate a `.meta-squad/` directory structure.
 */
export function validateMetaSquadDir(rootDir: string): ValidationResult {
  const metaDir = path.join(rootDir, META_SQUAD_DIR);
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!fs.existsSync(metaDir)) {
    return { valid: false, errors: [`.meta-squad/ directory not found at ${rootDir}`], warnings: [] };
  }

  // Check subdirectories
  for (const subdir of SUBDIRECTORIES) {
    if (!fs.existsSync(path.join(metaDir, subdir))) {
      warnings.push(`Missing subdirectory: ${subdir}/`);
    }
  }

  // Check registry
  const registryPath = path.join(metaDir, REGISTRY_FILE);
  if (!fs.existsSync(registryPath)) {
    warnings.push('Missing registry.yaml — run `squad meta discover --register`');
  }

  // Check for config
  const hasConfigTs = fs.existsSync(path.join(rootDir, CONFIG_FILE_TS));
  const hasConfigJson = fs.existsSync(path.join(metaDir, CONFIG_FILE_JSON));
  if (!hasConfigTs && !hasConfigJson) {
    warnings.push('No meta-squad config found — run `squad meta init`');
  }

  // Check governance timeline
  const timelinePath = path.join(metaDir, 'governance', 'timeline.json');
  if (fs.existsSync(timelinePath)) {
    try {
      const content = JSON.parse(fs.readFileSync(timelinePath, 'utf-8'));
      if (!content.events || !Array.isArray(content.events)) {
        errors.push('governance/timeline.json has invalid format (missing events array)');
      }
    } catch {
      errors.push('governance/timeline.json is not valid JSON');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Resolve the `.meta-squad/` directory path from a given starting point.
 * Walks up the directory tree looking for `.meta-squad/`.
 */
export function resolveMetaSquadDir(startDir?: string): string | null {
  let current = path.resolve(startDir ?? process.cwd());

  while (true) {
    const candidate = path.join(current, META_SQUAD_DIR);
    if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
      return candidate;
    }

    const parent = path.dirname(current);
    if (parent === current) break; // Reached filesystem root
    current = parent;
  }

  return null;
}
