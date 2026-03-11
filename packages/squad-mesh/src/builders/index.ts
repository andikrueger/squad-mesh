/**
 * Builder Functions — SDK-First Meta-Squad Configuration
 *
 * Follows the Squad SDK builder pattern: each builder accepts a strongly-typed
 * config object, validates it at runtime, and returns the validated value.
 * The pattern mirrors `defineSquad()` in the SDK: identity-passthrough with
 * runtime safety.
 *
 * Usage:
 * ```ts
 * import { defineMetaSquad, defineDiscovery, defineSteering } from 'squad-mesh';
 *
 * export default defineMetaSquad({
 *   name: 'platform-squads',
 *   purpose: 'Coordinate all platform engineering squads',
 *   discovery: defineDiscovery({ mode: 'hybrid', scanRoots: ['..'] }),
 *   steering: defineSteering({ directiveAuthority: 'leader-only' }),
 * });
 * ```
 *
 * @module builders
 */

import type {
  MetaSquadConfig,
  DiscoveryConfig,
  SteeringConfig,
  VisibilityConfig,
  KnowledgeConfig,
  HealthConfig,
  SquadIdentity,
  Directive,
  CrossSquadLearning,
  DirectivePriority,
} from '../types.js';

// Re-export all types for consumer convenience
export type {
  MetaSquadConfig,
  DiscoveryConfig,
  SteeringConfig,
  VisibilityConfig,
  KnowledgeConfig,
  HealthConfig,
  SquadIdentity,
  Directive,
  CrossSquadLearning,
} from '../types.js';

// ============================================================================
// Validation helpers
// ============================================================================

class MeshValidationError extends Error {
  constructor(builder: string, reason: string) {
    super(`[${builder}] ${reason}`);
    this.name = 'MeshValidationError';
  }
}

function assertNonEmptyString(value: unknown, field: string, builder: string): asserts value is string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new MeshValidationError(builder, `"${field}" must be a non-empty string`);
  }
}

function assertObject(value: unknown, builder: string): asserts value is object {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new MeshValidationError(builder, 'config must be a plain object');
  }
}

function assertOptionalString(value: unknown, field: string, builder: string): void {
  if (value !== undefined && (typeof value !== 'string' || value.length === 0)) {
    throw new MeshValidationError(builder, `"${field}" must be a non-empty string when provided`);
  }
}

function assertOptionalBoolean(value: unknown, field: string, builder: string): void {
  if (value !== undefined && typeof value !== 'boolean') {
    throw new MeshValidationError(builder, `"${field}" must be a boolean when provided`);
  }
}

function assertOptionalArray(value: unknown, field: string, builder: string): void {
  if (value !== undefined && !Array.isArray(value)) {
    throw new MeshValidationError(builder, `"${field}" must be an array when provided`);
  }
}

function assertStringUnion<T extends string>(
  value: unknown,
  allowed: readonly T[],
  field: string,
  builder: string,
): asserts value is T {
  if (!allowed.includes(value as T)) {
    throw new MeshValidationError(builder, `"${field}" must be one of: ${allowed.join(', ')}`);
  }
}

// ============================================================================
// defineDiscovery
// ============================================================================

const DISCOVERY_MODES = ['local', 'registry', 'hybrid'] as const;
const SQUAD_MARKERS = ['squad.config.ts', 'squad.config.js', '.squad', '.squad/config.json', 'package.json'] as const;

/**
 * Define how squads are discovered in the local environment.
 *
 * ```ts
 * const discovery = defineDiscovery({
 *   mode: 'hybrid',
 *   scanRoots: ['..'],
 *   markers: ['squad.config.ts', '.squad'],
 *   exclude: ['node_modules', '.git'],
 * });
 * ```
 */
export function defineDiscovery(config: DiscoveryConfig): DiscoveryConfig {
  assertObject(config, 'defineDiscovery');
  assertStringUnion(config.mode, DISCOVERY_MODES, 'mode', 'defineDiscovery');
  assertOptionalArray(config.scanRoots, 'scanRoots', 'defineDiscovery');
  assertOptionalArray(config.patterns, 'patterns', 'defineDiscovery');
  assertOptionalArray(config.exclude, 'exclude', 'defineDiscovery');
  assertOptionalString(config.refreshInterval, 'refreshInterval', 'defineDiscovery');
  assertOptionalString(config.registryPath, 'registryPath', 'defineDiscovery');

  if (config.markers) {
    for (const marker of config.markers) {
      assertStringUnion(marker, SQUAD_MARKERS, 'markers[]', 'defineDiscovery');
    }
  }

  if (config.mode === 'local' && (!config.scanRoots || config.scanRoots.length === 0)) {
    // Default to parent directory if no roots specified in local mode
    config.scanRoots = ['..'];
  }

  return config;
}

// ============================================================================
// defineSteering
// ============================================================================

const DIRECTIVE_AUTHORITIES = ['leader-only', 'any-squad', 'designated'] as const;
const PRIORITIES: readonly DirectivePriority[] = ['critical', 'high', 'normal', 'low'] as const;

/**
 * Define steering policies — how directives flow from leadership to squads.
 *
 * ```ts
 * const steering = defineSteering({
 *   directiveAuthority: 'leader-only',
 *   defaultPriority: 'normal',
 *   allowRejection: true,
 *   autoEscalateAfter: 'P3D', // 3 days
 * });
 * ```
 */
export function defineSteering(config: SteeringConfig): SteeringConfig {
  assertObject(config, 'defineSteering');
  assertStringUnion(config.directiveAuthority, DIRECTIVE_AUTHORITIES, 'directiveAuthority', 'defineSteering');
  assertOptionalBoolean(config.allowRejection, 'allowRejection', 'defineSteering');
  assertOptionalString(config.autoEscalateAfter, 'autoEscalateAfter', 'defineSteering');

  if (config.defaultPriority !== undefined) {
    assertStringUnion(config.defaultPriority, PRIORITIES, 'defaultPriority', 'defineSteering');
  }

  if (config.directiveAuthority === 'designated') {
    if (!config.designatedIssuers || config.designatedIssuers.length === 0) {
      throw new MeshValidationError(
        'defineSteering',
        '"designatedIssuers" must be provided when directiveAuthority is "designated"',
      );
    }
  }

  return config;
}

// ============================================================================
// defineVisibility
// ============================================================================

const VISIBILITY_INCLUDES = ['work', 'blockers', 'decisions', 'metrics', 'health'] as const;

/**
 * Define visibility and status rollup configuration.
 *
 * ```ts
 * const visibility = defineVisibility({
 *   reportingCadence: '0 9 * * 1-5',
 *   include: ['work', 'blockers', 'health'],
 *   staleAfter: 'P1D',
 * });
 * ```
 */
export function defineVisibility(config: VisibilityConfig): VisibilityConfig {
  assertObject(config, 'defineVisibility');
  assertOptionalString(config.reportingCadence, 'reportingCadence', 'defineVisibility');
  assertOptionalString(config.staleAfter, 'staleAfter', 'defineVisibility');

  if (config.include) {
    for (const item of config.include) {
      assertStringUnion(item, VISIBILITY_INCLUDES, 'include[]', 'defineVisibility');
    }
  }

  return config;
}

// ============================================================================
// defineKnowledge
// ============================================================================

const PATTERN_THRESHOLDS = ['experimental', 'established'] as const;

/**
 * Define knowledge propagation — how learnings flow across squads.
 *
 * ```ts
 * const knowledge = defineKnowledge({
 *   autoPropagateUniversal: true,
 *   patternPromotionThreshold: 'established',
 *   crossSquadTags: ['architecture', 'security', 'performance'],
 * });
 * ```
 */
export function defineKnowledge(config: KnowledgeConfig): KnowledgeConfig {
  assertObject(config, 'defineKnowledge');
  assertOptionalBoolean(config.autoPropagateUniversal, 'autoPropagateUniversal', 'defineKnowledge');
  assertOptionalArray(config.crossSquadTags, 'crossSquadTags', 'defineKnowledge');

  if (config.patternPromotionThreshold !== undefined) {
    assertStringUnion(
      config.patternPromotionThreshold,
      PATTERN_THRESHOLDS,
      'patternPromotionThreshold',
      'defineKnowledge',
    );
  }

  return config;
}

// ============================================================================
// defineHealth
// ============================================================================

/**
 * Define health monitoring thresholds and behavior.
 *
 * ```ts
 * const health = defineHealth({
 *   enabled: true,
 *   checkInterval: 'PT1H',
 *   alertOnChange: true,
 *   signals: [
 *     { name: 'blocker-age', yellowThreshold: 2, redThreshold: 5, description: 'Days oldest blocker has been open' },
 *   ],
 * });
 * ```
 */
export function defineHealth(config: HealthConfig): HealthConfig {
  assertObject(config, 'defineHealth');
  assertOptionalBoolean(config.enabled, 'enabled', 'defineHealth');
  assertOptionalString(config.checkInterval, 'checkInterval', 'defineHealth');
  assertOptionalBoolean(config.alertOnChange, 'alertOnChange', 'defineHealth');
  assertOptionalArray(config.signals, 'signals', 'defineHealth');

  if (config.signals) {
    for (const signal of config.signals) {
      assertNonEmptyString(signal.name, 'signals[].name', 'defineHealth');
      assertNonEmptyString(signal.description, 'signals[].description', 'defineHealth');
      if (typeof signal.yellowThreshold !== 'number' || typeof signal.redThreshold !== 'number') {
        throw new MeshValidationError(
          'defineHealth',
          `signals[].yellowThreshold and redThreshold must be numbers`,
        );
      }
      if (signal.yellowThreshold >= signal.redThreshold) {
        throw new MeshValidationError(
          'defineHealth',
          `signals[].yellowThreshold must be less than redThreshold for "${signal.name}"`,
        );
      }
    }
  }

  return config;
}

// ============================================================================
// defineMetaSquad — top-level composition
// ============================================================================

/**
 * Compose all meta-squad configuration into a single validated config.
 * This is the entry point for meta-squad.config.ts files.
 *
 * ```ts
 * // meta-squad.config.ts
 * import {
 *   defineMetaSquad, defineDiscovery, defineSteering,
 *   defineVisibility, defineKnowledge, defineHealth,
 * } from 'squad-mesh';
 *
 * export default defineMetaSquad({
 *   name: 'platform-engineering',
 *   purpose: 'Coordinate all platform engineering squads for unified delivery',
 *   leader: 'andi',
 *   discovery: defineDiscovery({
 *     mode: 'hybrid',
 *     scanRoots: ['..'],
 *     markers: ['squad.config.ts', '.squad'],
 *   }),
 *   steering: defineSteering({
 *     directiveAuthority: 'leader-only',
 *     allowRejection: true,
 *   }),
 *   visibility: defineVisibility({
 *     include: ['work', 'blockers', 'health'],
 *     staleAfter: 'P1D',
 *   }),
 *   knowledge: defineKnowledge({
 *     autoPropagateUniversal: true,
 *     crossSquadTags: ['architecture', 'security'],
 *   }),
 *   health: defineHealth({
 *     enabled: true,
 *     alertOnChange: true,
 *   }),
 * });
 * ```
 */
export function defineMetaSquad(config: MetaSquadConfig): MetaSquadConfig {
  assertObject(config, 'defineMetaSquad');
  assertNonEmptyString(config.name, 'name', 'defineMetaSquad');
  assertNonEmptyString(config.purpose, 'purpose', 'defineMetaSquad');
  assertOptionalString(config.version, 'version', 'defineMetaSquad');
  assertOptionalString(config.leader, 'leader', 'defineMetaSquad');

  // Validate nested sections via their respective builders
  defineDiscovery(config.discovery);

  if (config.steering !== undefined) defineSteering(config.steering);
  if (config.visibility !== undefined) defineVisibility(config.visibility);
  if (config.knowledge !== undefined) defineKnowledge(config.knowledge);
  if (config.health !== undefined) defineHealth(config.health);

  if (config.squads) {
    for (const squad of config.squads) {
      assertObject(squad, 'defineMetaSquad');
      assertNonEmptyString(squad.name, 'squads[].name', 'defineMetaSquad');
      assertNonEmptyString(squad.purpose, 'squads[].purpose', 'defineMetaSquad');
      assertNonEmptyString(squad.path, 'squads[].path', 'defineMetaSquad');
    }
  }

  return config;
}

export { MeshValidationError };
