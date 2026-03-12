/**
 * Squad Mesh Extension — Core Type Definitions
 *
 * These types define the multi-squad orchestration layer: discovery, steering,
 * visibility, knowledge propagation, and governance across squads.
 *
 * Design principles:
 *   - Local-first: filesystem discovery before any remote/API layer
 *   - File-native: all state persists as YAML/JSON in `.meta-squad/`
 *   - Git-native: all changes are trackable via git history
 *   - SDK-aligned: follows Squad SDK builder pattern conventions
 *
 * @module types
 */

// ============================================================================
// Core Identity
// ============================================================================

/** A squad's identity as seen from the meta-squad layer. */
export interface SquadIdentity {
  /** Unique name for this squad (kebab-case). */
  name: string;
  /** Human-readable display name. */
  displayName?: string;
  /** One-line purpose statement from the squad's charter. */
  purpose: string;
  /** Absolute filesystem path to the squad's root directory. */
  path: string;
  /** How this squad was discovered. */
  discoveredVia: DiscoverySource;
  /** ISO-8601 timestamp when first registered. */
  registeredAt: string;
  /** Squad's declared domain boundaries (from its charter). */
  domains?: string[];
  /** Contact: who owns/leads this squad. */
  owner?: string;
}

/** How a squad was discovered and registered. */
export type DiscoverySource =
  | 'filesystem'    // Found by scanning sibling directories
  | 'registry'      // Declared in .meta-squad/registry.yaml
  | 'env'           // Pointed to by environment variable
  | 'explicit'      // Passed directly via API/CLI
  | 'config';       // Defined in meta-squad.config.ts

// ============================================================================
// Discovery
// ============================================================================

/** Configuration for how squads are discovered. */
export interface DiscoveryConfig {
  /** Discovery strategy. */
  mode: DiscoveryMode;
  /** Root directories to scan (for filesystem mode). */
  scanRoots?: string[];
  /** Glob patterns to match squad directories. */
  patterns?: string[];
  /** Directories to exclude from scanning. */
  exclude?: string[];
  /** Markers that identify a directory as a squad root. */
  markers?: SquadMarker[];
  /** How often to re-scan (for watch mode). ISO-8601 duration or cron. */
  refreshInterval?: string;
  /** Registry file path override (default: .meta-squad/registry.yaml). */
  registryPath?: string;
}

/** Discovery strategy. */
export type DiscoveryMode =
  | 'local'       // Scan local filesystem only
  | 'registry'    // Use registry.yaml only (no scanning)
  | 'hybrid';     // Registry + filesystem scan for unregistered squads

/** Category for discovery warnings — classifies why a path could not be scanned. */
export type DiscoveryWarningCategory =
  | 'permission-denied'  // EACCES / EPERM
  | 'path-too-long'      // Path exceeds OS limits (Windows MAX_PATH)
  | 'not-found'          // Directory doesn't exist or was removed mid-scan
  | 'unknown';           // Catch-all for unrecognized errors

/** A categorized warning from the discovery process. */
export interface DiscoveryWarning {
  /** The path that could not be scanned. */
  path: string;
  /** Human-readable explanation of the problem. */
  message: string;
  /** Machine-readable category for programmatic handling. */
  category: DiscoveryWarningCategory;
}

/** What files/directories mark a directory as a squad root. */
export type SquadMarker =
  | 'squad.config.ts'    // SDK-first config
  | 'squad.config.js'    // Compiled SDK config
  | '.squad'             // Legacy directory marker
  | '.squad/config.json' // Legacy JSON config
  | 'package.json';      // Check for squad dependency

// ============================================================================
// Steering — Top-Down Directives
// ============================================================================

/** A directive from the meta-squad leader to a target squad. */
export interface Directive {
  /** Unique directive ID (auto-generated if not provided). */
  id: string;
  /** Human-readable title. */
  title: string;
  /** Detailed description of what needs to happen. */
  description: string;
  /** Target squad name(s). Use '*' for broadcast. */
  target: string | string[];
  /** Priority level. */
  priority: DirectivePriority;
  /** Current status. */
  status: DirectiveStatus;
  /** Who issued this directive. */
  issuedBy: string;
  /** ISO-8601 timestamp when issued. */
  issuedAt: string;
  /** ISO-8601 deadline (optional). */
  deadline?: string;
  /** Acceptance criteria — what "done" looks like. */
  acceptanceCriteria?: string[];
  /** Labels for categorization. */
  labels?: string[];
  /** Link to a GitHub Issue or other external tracker. */
  externalRef?: string;
  /** Responses from target squads. */
  responses?: DirectiveResponse[];
}

export type DirectivePriority = 'critical' | 'high' | 'normal' | 'low';

export type DirectiveStatus =
  | 'draft'        // Not yet issued
  | 'issued'       // Sent to target squad(s)
  | 'acknowledged' // Target squad confirmed receipt
  | 'in-progress'  // Work has started
  | 'completed'    // Acceptance criteria met
  | 'rejected'     // Target squad pushed back (with reason)
  | 'withdrawn';   // Issuer cancelled the directive

/** A squad's response to a directive. */
export interface DirectiveResponse {
  /** Which squad is responding. */
  squad: string;
  /** Response status. */
  status: 'acknowledged' | 'in-progress' | 'completed' | 'rejected' | 'blocked';
  /** Explanation or progress notes. */
  message?: string;
  /** ISO-8601 timestamp. */
  respondedAt: string;
  /** For rejections: reason and suggested alternative. */
  rejection?: {
    reason: string;
    alternative?: string;
  };
}

// ============================================================================
// Tension Routing — Cross-Squad Escalation
// ============================================================================

/** A tension that crosses squad boundaries. */
export interface CrossSquadTension {
  /** Unique tension ID. */
  id: string;
  /** Human-readable summary. */
  summary: string;
  /** Detailed description. */
  description: string;
  /** The tension type from the organizational mesh spec. */
  type: TensionType;
  /** Which squad raised this tension. */
  raisedBy: string;
  /** Which squad(s) are affected. */
  affects: string[];
  /** Current status. */
  status: TensionStatus;
  /** ISO-8601 timestamp. */
  raisedAt: string;
  /** Resolution details (when resolved). */
  resolution?: TensionResolution;
}

export type TensionType =
  | 'domain-conflict'       // Two squads claim the same domain
  | 'dependency-blocked'    // Squad A needs something from Squad B
  | 'integration-gap'       // No squad owns the integration point
  | 'policy-conflict'       // Conflicting policies across squads
  | 'resource-contention'   // Shared resource with no clear owner
  | 'knowledge-gap'         // One squad has knowledge another needs
  | 'directive';            // Escalated from a directive that can't be fulfilled

export type TensionStatus =
  | 'raised'
  | 'acknowledged'
  | 'investigating'
  | 'proposed'    // Resolution proposed, awaiting acceptance
  | 'resolved'
  | 'escalated';  // Escalated to human owner

export interface TensionResolution {
  /** How it was resolved. */
  method: 'charter-amendment' | 'policy-update' | 'domain-transfer' | 'new-squad' | 'human-decision' | 'withdrawn';
  /** What changed. */
  summary: string;
  /** Who decided. */
  decidedBy: string;
  /** ISO-8601 timestamp. */
  resolvedAt: string;
}

// ============================================================================
// Visibility — Cross-Squad Status
// ============================================================================

/** Status snapshot for a single squad. */
export interface SquadStatus {
  /** Squad name. */
  squad: string;
  /** When this status was last updated. */
  updatedAt: string;
  /** Overall health assessment. */
  health: HealthLevel;
  /** What the squad is currently working on. */
  currentWork: WorkItem[];
  /** Active blockers. */
  blockers: Blocker[];
  /** Recent decisions (last N). */
  recentDecisions: DecisionSummary[];
  /** Metrics if available. */
  metrics?: Record<string, number | string>;
}

export type HealthLevel = 'green' | 'yellow' | 'red' | 'unknown';

export interface WorkItem {
  /** Brief description. */
  title: string;
  /** Status. */
  status: 'planned' | 'in-progress' | 'review' | 'done';
  /** Assigned agent(s). */
  assignees?: string[];
  /** External ref (issue #, PR #). */
  ref?: string;
}

export interface Blocker {
  /** What's blocked. */
  description: string;
  /** What's causing the block. */
  cause: string;
  /** Which squad can unblock this (if known). */
  unblockedBy?: string;
  /** How long this has been blocked. */
  since: string;
}

export interface DecisionSummary {
  /** Decision ID. */
  id: string;
  /** One-line summary. */
  title: string;
  /** When it was made. */
  madeAt: string;
  /** Cross-squad relevance flag. */
  crossSquadRelevant: boolean;
}

/** Aggregated status across all squads — the Common Operational Picture. */
export interface CommonOperationalPicture {
  /** ISO-8601 timestamp when this picture was generated. */
  generatedAt: string;
  /** Individual squad statuses. */
  squads: SquadStatus[];
  /** Active cross-squad tensions. */
  activeTensions: CrossSquadTension[];
  /** Open directives. */
  openDirectives: Directive[];
  /** Overall system health (worst-of-all-squads). */
  systemHealth: HealthLevel;
  /** Summary statistics. */
  summary: {
    totalSquads: number;
    healthySquads: number;
    blockedSquads: number;
    openTensions: number;
    openDirectives: number;
    recentLearnings: number;
  };
}

// ============================================================================
// Knowledge — Cross-Squad Learning Propagation
// ============================================================================

/** A learning that may be relevant across squads. */
export interface CrossSquadLearning {
  /** Unique learning ID. */
  id: string;
  /** Human-readable title. */
  title: string;
  /** Full description of what was learned. */
  content: string;
  /** Which squad discovered this. */
  sourceSquad: string;
  /** When it was learned. */
  learnedAt: string;
  /** Domain/topic tags. */
  tags: string[];
  /** Relevance to other squads. */
  relevance: LearningRelevance;
  /** Which squads have acknowledged this learning. */
  acknowledgedBy?: string[];
  /** Whether this has been promoted to a shared pattern. */
  promotedToPattern?: boolean;
}

export type LearningRelevance =
  | 'squad-specific'    // Only relevant to source squad
  | 'domain-relevant'   // Relevant to squads in the same domain
  | 'universal';        // Relevant to all squads

/** A shared pattern extracted from learnings across squads. */
export interface SharedPattern {
  /** Pattern name. */
  name: string;
  /** Description. */
  description: string;
  /** Full pattern content. */
  content: string;
  /** Which learnings contributed to this pattern. */
  derivedFrom: string[];
  /** Which squads have adopted this pattern. */
  adoptedBy: string[];
  /** When this pattern was codified. */
  codifiedAt: string;
  /** Confidence level. */
  confidence: 'experimental' | 'established' | 'proven';
}

// ============================================================================
// Mesh Link — Backpointer from Squad to Mesh
// ============================================================================

/** Backpointer stored in each squad's .squad/mesh-link.json */
export interface MeshLink {
  /** Absolute path to the mesh root directory. */
  meshRoot: string;
  /** Name of the mesh this squad belongs to (optional — may be empty for auto-discovered squads). */
  meshName: string;
  /** ISO-8601 timestamp when the squad was registered. */
  registeredAt: string;
  /** Absolute path to the mesh's registry.yaml. */
  registryPath: string;
  /** squad-mesh version that created this link. */
  version: string;
  /** Optional URL for the mesh (e.g. GitHub repo URL) — enables remote/distributed mesh access. */
  meshUrl?: string;
}

// ============================================================================
// Governance — Meta-Squad Governance Timeline
// ============================================================================

/** A governance event in the meta-squad timeline. */
export interface GovernanceEvent {
  /** Unique event ID. */
  id: string;
  /** Event type. */
  type: GovernanceEventType;
  /** Human-readable description. */
  description: string;
  /** ISO-8601 timestamp. */
  timestamp: string;
  /** Who initiated this event. */
  initiatedBy: string;
  /** Which squads are affected. */
  affectedSquads: string[];
  /** Outcome or current status. */
  outcome?: string;
}

export type GovernanceEventType =
  | 'squad-created'
  | 'squad-dissolved'
  | 'charter-amended'
  | 'domain-transferred'
  | 'policy-enacted'
  | 'policy-revoked'
  | 'directive-issued'
  | 'tension-resolved'
  | 'pattern-promoted'
  | 'health-alert';

// ============================================================================
// Health Monitoring
// ============================================================================

/** Health report for a single squad. */
export interface SquadHealthReport {
  /** Squad name. */
  squad: string;
  /** Overall health. */
  health: HealthLevel;
  /** Individual health signals. */
  signals: HealthSignal[];
  /** When this report was generated. */
  generatedAt: string;
}

export interface HealthSignal {
  /** Signal name (e.g., 'decision-velocity', 'blocker-age', 'charter-freshness'). */
  name: string;
  /** Current value. */
  value: number;
  /** Threshold for yellow. */
  yellowThreshold: number;
  /** Threshold for red. */
  redThreshold: number;
  /** Which level this signal triggers. */
  level: HealthLevel;
  /** Human-readable description of the signal. */
  description: string;
}

// ============================================================================
// Top-Level Configuration
// ============================================================================

/** Top-level meta-squad configuration — the `defineMetaSquad()` input. */
export interface MetaSquadConfig {
  /** Schema version for forward compatibility. */
  version?: string;
  /** Meta-squad name. */
  name: string;
  /** Purpose of this meta-squad. */
  purpose: string;
  /** Who leads this meta-squad. */
  leader?: string;
  /** Discovery configuration. */
  discovery: DiscoveryConfig;
  /** Steering policies. */
  steering?: SteeringConfig;
  /** Visibility and status rollup configuration. */
  visibility?: VisibilityConfig;
  /** Knowledge propagation configuration. */
  knowledge?: KnowledgeConfig;
  /** Health monitoring thresholds. */
  health?: HealthConfig;
  /** Squads explicitly registered (in addition to discovered ones). */
  squads?: SquadIdentity[];
}

/** Steering subsystem configuration. */
export interface SteeringConfig {
  /** Who can issue directives. */
  directiveAuthority: 'leader-only' | 'any-squad' | 'designated';
  /** Designated directive issuers (when authority is 'designated'). */
  designatedIssuers?: string[];
  /** Default priority for new directives. */
  defaultPriority?: DirectivePriority;
  /** Auto-escalation: tensions older than this duration escalate to leader. */
  autoEscalateAfter?: string;
  /** Whether squads can reject directives. */
  allowRejection?: boolean;
}

/** Visibility subsystem configuration. */
export interface VisibilityConfig {
  /** How often squads should report status. */
  reportingCadence?: string;
  /** What to include in the common operational picture. */
  include?: Array<'work' | 'blockers' | 'decisions' | 'metrics' | 'health'>;
  /** Maximum age of a status report before it's considered stale. */
  staleAfter?: string;
}

/** Knowledge propagation configuration. */
export interface KnowledgeConfig {
  /** Auto-propagate learnings tagged as 'universal'. */
  autoPropagateUniversal?: boolean;
  /** Minimum confidence level to promote to shared pattern. */
  patternPromotionThreshold?: 'experimental' | 'established';
  /** Tags that indicate cross-squad relevance. */
  crossSquadTags?: string[];
}

/** Health monitoring configuration. */
export interface HealthConfig {
  /** Enable automatic health checks. */
  enabled?: boolean;
  /** Health check interval. */
  checkInterval?: string;
  /** Custom health signal definitions. */
  signals?: Array<Omit<HealthSignal, 'value' | 'level'>>;
  /** Alert on health level changes. */
  alertOnChange?: boolean;
}

// ============================================================================
// File Convention Types
// ============================================================================

/** Shape of .meta-squad/registry.yaml */
export interface RegistryFile {
  version: string;
  metaSquad: string;
  leader: string;
  squads: SquadIdentity[];
  lastScan?: string;
}

/** Shape of .meta-squad/status/{squad-name}.yaml */
export interface StatusFile {
  squad: string;
  reportedAt: string;
  health: HealthLevel;
  currentWork: WorkItem[];
  blockers: Blocker[];
  recentDecisions: DecisionSummary[];
}

/** Shape of .meta-squad/directives/{id}.yaml */
export interface DirectiveFile extends Directive {
  // Extends Directive with no additional fields — file is the directive
}

/** Shape of .meta-squad/learnings/{id}.yaml */
export interface LearningFile extends CrossSquadLearning {
  // Extends CrossSquadLearning with no additional fields
}

/** Shape of .meta-squad/governance/timeline.yaml */
export interface GovernanceTimeline {
  version: string;
  events: GovernanceEvent[];
}
