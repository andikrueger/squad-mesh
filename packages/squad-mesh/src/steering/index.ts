/**
 * Steering Engine — Top-Down Directive & Tension Routing
 *
 * Enables the meta-squad leader to issue directives to target squads,
 * route cross-squad tensions, and track compliance. All state persists
 * as files in `.meta-squad/directives/` and `.meta-squad/tensions/`.
 *
 * @module steering
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type {
  Directive,
  DirectivePriority,
  DirectiveStatus,
  DirectiveResponse,
  CrossSquadTension,
  TensionType,
  TensionStatus,
  TensionResolution,
  SteeringConfig,
} from '../types.js';

// ============================================================================
// Directive Management
// ============================================================================

/**
 * Create a new directive.
 *
 * ```ts
 * const directive = createDirective({
 *   title: 'Implement OAuth2 across all squads',
 *   description: 'All squads must adopt the shared OAuth2 provider by end of sprint',
 *   target: ['auth-squad', 'api-squad', 'web-squad'],
 *   priority: 'high',
 *   issuedBy: 'andi',
 *   acceptanceCriteria: ['OAuth2 endpoints configured', 'Tests passing'],
 * });
 * ```
 */
export function createDirective(
  params: Omit<Directive, 'id' | 'status' | 'issuedAt' | 'responses'>,
): Directive {
  return {
    ...params,
    id: generateId('dir'),
    status: 'draft',
    issuedAt: new Date().toISOString(),
    responses: [],
  };
}

/**
 * Issue a directive — transition from draft to issued.
 */
export function issueDirective(
  directive: Directive,
  config?: SteeringConfig,
): Directive {
  if (directive.status !== 'draft') {
    throw new Error(`Cannot issue directive ${directive.id}: status is "${directive.status}", expected "draft"`);
  }

  // Check authority
  if (config?.directiveAuthority === 'leader-only') {
    // Authority check would be done at the CLI/coordinator layer
  }

  return {
    ...directive,
    status: 'issued',
    issuedAt: new Date().toISOString(),
  };
}

/**
 * Record a squad's response to a directive.
 */
export function respondToDirective(
  directive: Directive,
  response: Omit<DirectiveResponse, 'respondedAt'>,
): Directive {
  const newResponse: DirectiveResponse = {
    ...response,
    respondedAt: new Date().toISOString(),
  };

  const responses = [...(directive.responses ?? [])];
  const existingIdx = responses.findIndex(r => r.squad === response.squad);
  if (existingIdx >= 0) {
    responses[existingIdx] = newResponse;
  } else {
    responses.push(newResponse);
  }

  // Derive overall status from responses
  const targets = Array.isArray(directive.target) ? directive.target : [directive.target];
  const allCompleted = targets.every(t =>
    responses.some(r => r.squad === t && r.status === 'completed')
  );
  const anyRejected = responses.some(r => r.status === 'rejected');
  const anyInProgress = responses.some(r => r.status === 'in-progress');

  let status: DirectiveStatus = directive.status;
  if (allCompleted) status = 'completed';
  else if (anyInProgress) status = 'in-progress';
  else if (anyRejected && !anyInProgress) status = 'issued'; // Some rejected but work continues
  else if (responses.length > 0) status = 'acknowledged';

  return { ...directive, responses, status };
}

/**
 * Withdraw a directive.
 */
export function withdrawDirective(directive: Directive): Directive {
  return { ...directive, status: 'withdrawn' };
}

// ============================================================================
// Tension Routing
// ============================================================================

/**
 * Raise a cross-squad tension.
 */
export function raiseTension(
  params: Omit<CrossSquadTension, 'id' | 'status' | 'raisedAt'>,
): CrossSquadTension {
  return {
    ...params,
    id: generateId('tension'),
    status: 'raised',
    raisedAt: new Date().toISOString(),
  };
}

/**
 * Route a tension to the appropriate handler based on type.
 */
export function routeTension(tension: CrossSquadTension): {
  suggestedHandler: string;
  suggestedMethod: string;
  rationale: string;
} {
  switch (tension.type) {
    case 'domain-conflict':
      return {
        suggestedHandler: 'meta-squad-leader',
        suggestedMethod: 'governance-proposal',
        rationale: 'Domain conflicts require charter amendments, which need meta-squad authority',
      };
    case 'dependency-blocked':
      return {
        suggestedHandler: tension.affects[0] ?? 'meta-squad-leader',
        suggestedMethod: 'direct-coordination',
        rationale: 'Dependency blocks are best resolved by direct squad-to-squad negotiation',
      };
    case 'integration-gap':
      return {
        suggestedHandler: 'meta-squad-leader',
        suggestedMethod: 'new-squad-or-charter-extension',
        rationale: 'Integration gaps may require creating a new squad or extending an existing charter',
      };
    case 'policy-conflict':
      return {
        suggestedHandler: 'meta-squad-leader',
        suggestedMethod: 'policy-harmonization',
        rationale: 'Policy conflicts need meta-level resolution to establish shared policy',
      };
    case 'resource-contention':
      return {
        suggestedHandler: 'meta-squad-leader',
        suggestedMethod: 'domain-assignment',
        rationale: 'Resource contention needs clear domain assignment',
      };
    case 'knowledge-gap':
      return {
        suggestedHandler: tension.affects[0] ?? 'knowledge-module',
        suggestedMethod: 'learning-propagation',
        rationale: 'Knowledge gaps are resolved through the yokoten learning system',
      };
    case 'directive':
      return {
        suggestedHandler: 'meta-squad-leader',
        suggestedMethod: 'directive-amendment',
        rationale: 'Directive tensions require the issuer to revisit the directive',
      };
  }
}

/**
 * Resolve a tension with a decision.
 */
export function resolveTension(
  tension: CrossSquadTension,
  resolution: TensionResolution,
): CrossSquadTension {
  return {
    ...tension,
    status: 'resolved',
    resolution,
  };
}

/**
 * Escalate a tension to the human owner.
 */
export function escalateTension(tension: CrossSquadTension): CrossSquadTension {
  return { ...tension, status: 'escalated' };
}

// ============================================================================
// Persistence — File-Based State
// ============================================================================

/**
 * Save a directive to the .meta-squad/directives/ directory.
 * Throws a clear error if the directory cannot be created.
 */
export function saveDirective(metaSquadDir: string, directive: Directive): void {
  const directivesDir = path.join(metaSquadDir, 'directives');
  ensureDirectory(directivesDir);

  const filePath = path.join(directivesDir, `${directive.id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(directive, null, 2) + '\n', 'utf-8');
}

/**
 * Load all directives from the .meta-squad/directives/ directory.
 * Returns an empty array if the directory doesn't exist yet.
 */
export function loadDirectives(metaSquadDir: string): Directive[] {
  const directivesDir = path.join(metaSquadDir, 'directives');
  if (!fs.existsSync(directivesDir)) {
    console.warn(`[squad-mesh] Directives directory not found: ${directivesDir} — returning empty list`);
    return [];
  }

  const directives: Directive[] = [];
  for (const file of fs.readdirSync(directivesDir)) {
    if (!file.endsWith('.json')) continue;
    try {
      const content = fs.readFileSync(path.join(directivesDir, file), 'utf-8');
      directives.push(JSON.parse(content) as Directive);
    } catch {
      // Skip malformed files
    }
  }
  return directives;
}

/**
 * Save a tension to the .meta-squad/tensions/ directory.
 * Throws a clear error if the directory cannot be created.
 */
export function saveTension(metaSquadDir: string, tension: CrossSquadTension): void {
  const tensionsDir = path.join(metaSquadDir, 'tensions');
  ensureDirectory(tensionsDir);

  const filePath = path.join(tensionsDir, `${tension.id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(tension, null, 2) + '\n', 'utf-8');
}

/**
 * Load all tensions from the .meta-squad/tensions/ directory.
 * Returns an empty array if the directory doesn't exist yet.
 */
export function loadTensions(metaSquadDir: string): CrossSquadTension[] {
  const tensionsDir = path.join(metaSquadDir, 'tensions');
  if (!fs.existsSync(tensionsDir)) {
    console.warn(`[squad-mesh] Tensions directory not found: ${tensionsDir} — returning empty list`);
    return [];
  }

  const tensions: CrossSquadTension[] = [];
  for (const file of fs.readdirSync(tensionsDir)) {
    if (!file.endsWith('.json')) continue;
    try {
      const content = fs.readFileSync(path.join(tensionsDir, file), 'utf-8');
      tensions.push(JSON.parse(content) as CrossSquadTension);
    } catch {
      // Skip malformed files
    }
  }
  return tensions;
}

// ============================================================================
// Steering Initialization
// ============================================================================

/** Result of initializing steering directories. */
export interface SteeringInitResult {
  created: string[];
  alreadyExisted: string[];
}

const STEERING_SUBDIRS = ['directives', 'governance', 'tensions'] as const;

/**
 * Initialize the steering directory structure under a meta-squad root.
 * Creates `.meta-squad/directives/`, `.meta-squad/governance/`, and
 * `.meta-squad/tensions/` if they don't already exist.
 */
export function initializeSteering(metaSquadRoot: string): SteeringInitResult {
  const created: string[] = [];
  const alreadyExisted: string[] = [];

  for (const subdir of STEERING_SUBDIRS) {
    const dirPath = path.join(metaSquadRoot, subdir);
    if (fs.existsSync(dirPath)) {
      alreadyExisted.push(subdir);
    } else {
      ensureDirectory(dirPath);
      created.push(subdir);
    }
  }

  return { created, alreadyExisted };
}

// ============================================================================
// Auto-Escalation
// ============================================================================

/**
 * Check for tensions that should be auto-escalated based on age.
 */
export function checkAutoEscalation(
  tensions: CrossSquadTension[],
  maxAge: string,
): CrossSquadTension[] {
  const maxAgeMs = parseIsoDuration(maxAge);
  if (maxAgeMs === null) return [];

  const now = Date.now();
  return tensions.filter(t => {
    if (t.status === 'resolved' || t.status === 'escalated') return false;
    const age = now - new Date(t.raisedAt).getTime();
    return age > maxAgeMs;
  });
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Create a directory (and all parents) or throw a clear error on failure.
 */
function ensureDirectory(dirPath: string): void {
  try {
    fs.mkdirSync(dirPath, { recursive: true });
  } catch (err: unknown) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new Error(`Cannot save directive: failed to create directory ${dirPath}: ${reason}`);
  }
}

function generateId(prefix: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Parse a simple ISO-8601 duration (P[n]D, PT[n]H, PT[n]M).
 * Returns milliseconds or null if unparseable.
 */
function parseIsoDuration(duration: string): number | null {
  const dayMatch = /^P(\d+)D$/.exec(duration);
  if (dayMatch?.[1]) return parseInt(dayMatch[1], 10) * 24 * 60 * 60 * 1000;

  const hourMatch = /^PT(\d+)H$/.exec(duration);
  if (hourMatch?.[1]) return parseInt(hourMatch[1], 10) * 60 * 60 * 1000;

  const minuteMatch = /^PT(\d+)M$/.exec(duration);
  if (minuteMatch?.[1]) return parseInt(minuteMatch[1], 10) * 60 * 1000;

  return null;
}
