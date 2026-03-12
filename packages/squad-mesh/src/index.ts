/**
 * Squad Mesh Extension — Public API
 *
 * Multi-squad orchestration following mesh coordination principles.
 * Install as a peer extension to @bradygaster/squad-sdk.
 *
 * ```ts
 * import { defineMetaSquad, defineDiscovery, discoverSquads } from 'squad-mesh';
 * ```
 *
 * @module squad-mesh
 */

// --- Types (pure re-exports, zero runtime) ---
export type {
  // Core identity
  SquadIdentity,
  DiscoverySource,
  // Discovery
  DiscoveryConfig,
  DiscoveryMode,
  SquadMarker,
  DiscoveryWarning,
  DiscoveryWarningCategory,
  // Steering
  Directive,
  DirectivePriority,
  DirectiveStatus,
  DirectiveResponse,
  CrossSquadTension,
  TensionType,
  TensionStatus,
  TensionResolution,
  // Visibility
  SquadStatus,
  HealthLevel,
  WorkItem,
  Blocker,
  DecisionSummary,
  CommonOperationalPicture,
  // Knowledge
  CrossSquadLearning,
  LearningRelevance,
  SharedPattern,
  // Mesh Link
  MeshLink,
  // Governance
  GovernanceEvent,
  GovernanceEventType,
  // Health
  SquadHealthReport,
  HealthSignal,
  // Configuration
  MetaSquadConfig,
  SteeringConfig,
  VisibilityConfig,
  KnowledgeConfig,
  HealthConfig,
  // File conventions
  RegistryFile,
  StatusFile,
  DirectiveFile,
  LearningFile,
  GovernanceTimeline,
} from './types.js';

// --- Builders ---
export {
  defineMetaSquad,
  defineDiscovery,
  defineSteering,
  defineVisibility,
  defineKnowledge,
  defineHealth,
  MeshValidationError,
} from './builders/index.js';

// --- Discovery ---
export {
  discoverSquads,
  isSquadRoot,
  getDefaultDiscoveryConfig,
  formatDiscoverySummary,
} from './discovery/index.js';
export type { DiscoveryResult, DiscoveryError } from './discovery/index.js';

// --- Status / COP ---
export {
  collectSquadStatus,
  collectAllStatuses,
  generateCOP,
  generateHealthReport,
} from './status/index.js';

// --- Steering ---
export {
  createDirective,
  issueDirective,
  respondToDirective,
  withdrawDirective,
  raiseTension,
  routeTension,
  resolveTension,
  escalateTension,
  saveDirective,
  loadDirectives,
  saveTension,
  loadTensions,
  checkAutoEscalation,
  initializeSteering,
} from './steering/index.js';
export type { SteeringInitResult } from './steering/index.js';

// --- Knowledge ---
export {
  collectSquadLearnings,
  collectAllLearnings,
  classifyRelevance,
  filterPropagatable,
  promoteToPattern,
  mergeLearningsToPattern,
  saveLearning,
  loadLearnings,
  savePattern,
  loadPatterns,
} from './knowledge/index.js';

// --- Bridge (squad-to-mesh API) ---
export {
  readMeshLink,
  getMeshLearnings,
  getMeshPatterns,
  contributeLearning,
  getMeshStatus,
} from './bridge/index.js';

export { generateWisdomSkill } from './bridge/wisdom-skill.js';

// --- Coordinator Prompt ---
export {
  generateMetaSquadPrompt,
  generateCompactStatus,
  generateTensionDetectionRules,
  generateDirectiveComplianceRules,
} from './coordinator/index.js';

// --- File Conventions ---
export {
  META_SQUAD_DIR,
  REGISTRY_FILE,
  CONFIG_FILE_TS,
  CONFIG_FILE_JSON,
  SUBDIRECTORIES,
  initMetaSquadDir,
  generateConfigTemplate,
  validateMetaSquadDir,
  resolveMetaSquadDir,
} from './conventions.js';
export type { MetaSquadSubdir, ValidationResult } from './conventions.js';

// --- Version ---
export { VERSION } from './version.js';

// --- CLI Commands ---
export { MESH_COMMANDS, handleDiscover, handleStatus, handleDirective } from './cli/index.js';
export type { CliCommand, CliOption } from './cli/index.js';

// --- CLI Standalone + SDK Plugin Hook ---
export { registerCommands } from './cli/main.js';
