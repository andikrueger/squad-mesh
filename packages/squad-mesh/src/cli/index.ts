/**
 * CLI Command Specifications — Meta-Squad Commands
 *
 * Defines the command structure for meta-squad CLI integration.
 * These are specifications that the Squad CLI would register when
 * the mesh extension is installed.
 *
 * @module cli
 */

import type { MetaSquadConfig, SquadIdentity, Directive, CommonOperationalPicture } from '../types.js';
import { discoverSquads } from '../discovery/index.js';
import { generateCOP, generateHealthReport } from '../status/index.js';
import { loadDirectives, loadTensions, createDirective, issueDirective, saveDirective } from '../steering/index.js';
import { collectAllLearnings, filterPropagatable, loadPatterns } from '../knowledge/index.js';

// ============================================================================
// Command Definitions
// ============================================================================

export interface CliCommand {
  name: string;
  description: string;
  usage: string;
  options?: CliOption[];
  examples?: string[];
}

export interface CliOption {
  name: string;
  alias?: string;
  description: string;
  type: 'string' | 'boolean' | 'number';
  required?: boolean;
  default?: string | boolean | number;
}

/**
 * All meta-squad CLI commands.
 */
export const META_SQUAD_COMMANDS: CliCommand[] = [
  {
    name: 'meta discover',
    description: 'Discover sibling squads in the local filesystem',
    usage: 'squad meta discover [--root <path>] [--markers <markers>]',
    options: [
      { name: 'root', alias: 'r', description: 'Root directory to scan', type: 'string', default: '..' },
      { name: 'markers', alias: 'm', description: 'Comma-separated squad markers', type: 'string', default: 'squad.config.ts,.squad' },
      { name: 'json', description: 'Output as JSON', type: 'boolean', default: false },
      { name: 'register', description: 'Auto-register discovered squads in registry', type: 'boolean', default: false },
    ],
    examples: [
      'squad meta discover',
      'squad meta discover --root ~/projects --markers squad.config.ts',
      'squad meta discover --json | jq .squads',
    ],
  },
  {
    name: 'meta status',
    description: 'Show cross-squad status (Common Operational Picture)',
    usage: 'squad meta status [--squad <name>] [--format <format>]',
    options: [
      { name: 'squad', alias: 's', description: 'Show status for a specific squad only', type: 'string' },
      { name: 'format', alias: 'f', description: 'Output format: table, json, compact', type: 'string', default: 'table' },
      { name: 'include', description: 'Comma-separated: work,blockers,decisions,health', type: 'string', default: 'work,blockers,health' },
    ],
    examples: [
      'squad meta status',
      'squad meta status --squad auth-squad',
      'squad meta status --format json',
      'squad meta status --include work,blockers,decisions,health',
    ],
  },
  {
    name: 'meta directive',
    description: 'Issue a directive to one or more squads',
    usage: 'squad meta directive <action> [options]',
    options: [
      { name: 'title', alias: 't', description: 'Directive title', type: 'string', required: true },
      { name: 'target', description: 'Target squad(s), comma-separated', type: 'string', required: true },
      { name: 'priority', alias: 'p', description: 'Priority: critical, high, normal, low', type: 'string', default: 'normal' },
      { name: 'description', alias: 'd', description: 'Detailed description', type: 'string' },
      { name: 'issue', description: 'Immediately issue (skip draft)', type: 'boolean', default: false },
    ],
    examples: [
      'squad meta directive --title "Adopt OAuth2" --target auth-squad,api-squad --priority high',
      'squad meta directive --title "Update deps" --target "*" --issue',
      'squad meta directive list',
      'squad meta directive list --status open',
    ],
  },
  {
    name: 'meta tensions',
    description: 'View and manage cross-squad tensions',
    usage: 'squad meta tensions [list|raise|resolve|escalate] [options]',
    options: [
      { name: 'type', description: 'Tension type filter', type: 'string' },
      { name: 'status', description: 'Status filter: raised, investigating, resolved, escalated', type: 'string' },
      { name: 'squad', description: 'Filter by squad', type: 'string' },
    ],
    examples: [
      'squad meta tensions list',
      'squad meta tensions list --type domain-conflict',
      'squad meta tensions raise --summary "Auth module ownership unclear"',
    ],
  },
  {
    name: 'meta learnings',
    description: 'View and propagate cross-squad learnings',
    usage: 'squad meta learnings [list|propagate|promote] [options]',
    options: [
      { name: 'squad', description: 'Filter by source squad', type: 'string' },
      { name: 'relevance', description: 'Filter: universal, domain-relevant, squad-specific', type: 'string' },
      { name: 'format', description: 'Output format: table, json', type: 'string', default: 'table' },
    ],
    examples: [
      'squad meta learnings list',
      'squad meta learnings list --relevance universal',
      'squad meta learnings propagate --id learn-abc123',
      'squad meta learnings promote --ids learn-a,learn-b --name "error-handling-pattern"',
    ],
  },
  {
    name: 'meta health',
    description: 'Show health reports for all squads',
    usage: 'squad meta health [--squad <name>] [--signals]',
    options: [
      { name: 'squad', description: 'Show health for a specific squad', type: 'string' },
      { name: 'signals', description: 'Show individual health signals', type: 'boolean', default: false },
      { name: 'format', description: 'Output format: table, json', type: 'string', default: 'table' },
    ],
    examples: [
      'squad meta health',
      'squad meta health --squad api-squad --signals',
      'squad meta health --format json',
    ],
  },
  {
    name: 'meta init',
    description: 'Initialize a meta-squad configuration in the current directory',
    usage: 'squad meta init [--name <name>]',
    options: [
      { name: 'name', description: 'Meta-squad name', type: 'string' },
      { name: 'interactive', alias: 'i', description: 'Interactive setup', type: 'boolean', default: true },
    ],
    examples: [
      'squad meta init',
      'squad meta init --name platform-engineering',
    ],
  },
];

// ============================================================================
// Command Handlers (for SDK integration)
// ============================================================================

/**
 * Handle the `squad meta discover` command.
 */
export async function handleDiscover(config: MetaSquadConfig): Promise<{
  squads: SquadIdentity[];
  newlyDiscovered: number;
}> {
  const result = await discoverSquads(config.discovery, config.squads);
  return {
    squads: result.squads,
    newlyDiscovered: result.sources.filesystem.length,
  };
}

/**
 * Handle the `squad meta status` command.
 */
export async function handleStatus(
  config: MetaSquadConfig,
  metaSquadDir: string,
): Promise<CommonOperationalPicture> {
  const discoveryResult = await discoverSquads(config.discovery, config.squads);
  const tensions = loadTensions(metaSquadDir);
  const directives = loadDirectives(metaSquadDir);
  return generateCOP(discoveryResult.squads, tensions, directives);
}

/**
 * Handle the `squad meta directive` command (create + issue).
 */
export function handleDirective(
  metaSquadDir: string,
  params: {
    title: string;
    description: string;
    target: string | string[];
    priority: 'critical' | 'high' | 'normal' | 'low';
    issuedBy: string;
    immediateIssue?: boolean;
  },
): Directive {
  let directive = createDirective({
    title: params.title,
    description: params.description,
    target: params.target,
    priority: params.priority,
    issuedBy: params.issuedBy,
  });

  if (params.immediateIssue) {
    directive = issueDirective(directive);
  }

  saveDirective(metaSquadDir, directive);
  return directive;
}
