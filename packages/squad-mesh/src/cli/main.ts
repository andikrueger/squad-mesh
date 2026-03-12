#!/usr/bin/env node
/**
 * squad-mesh CLI — Standalone entry point for mesh orchestration commands.
 *
 * Usage:
 *   squad-mesh discover [--root <path>] [--markers <m1,m2>] [--json]
 *   squad-mesh status   [--format table|json]
 *   squad-mesh health   [--json]
 *   squad-mesh init     [--name <name>]
 *   squad-mesh help
 *
 * Designed as a standalone CLI that can later be registered as a
 * Squad SDK plugin via registerCommands().
 *
 * @module cli/main
 */

import { discoverSquads, getDefaultDiscoveryConfig, collectAllStatuses, generateCOP, generateCompactStatus, initMetaSquadDir, generateConfigTemplate, resolveMetaSquadDir, META_SQUAD_DIR, REGISTRY_FILE } from '../index.js';
import type { DiscoveryConfig, SquadMarker, SquadIdentity } from '../types.js';
import { VERSION } from '../version.js';
import { MESH_COMMANDS } from './index.js';
import type { CliCommand } from './index.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

// ── ANSI helpers ─────────────────────────────────────────────────────────────

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';

function healthIcon(level: string): string {
  switch (level) {
    case 'green':  return `${GREEN}● green${RESET}`;
    case 'yellow': return `${YELLOW}● yellow${RESET}`;
    case 'red':    return `${RED}● red${RESET}`;
    default:       return `${DIM}○ unknown${RESET}`;
  }
}

// ── Argument Parsing ─────────────────────────────────────────────────────────

function parseArgs(argv: string[]): { command: string; opts: Record<string, string | boolean> } {
  const positional = argv.slice(2);
  // Strip leading "meta" or "mesh" if present (for `squad mesh discover` style invocation)
  let command = positional[0] ?? 'help';
  let startIdx = 1;
  if (command === 'meta' || command === 'mesh') {
    command = positional[1] ?? 'help';
    startIdx = 2;
  }

  const opts: Record<string, string | boolean> = {};
  for (let i = startIdx; i < positional.length; i++) {
    const arg = positional[i]!;
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = positional[i + 1];
      if (!next || next.startsWith('--')) {
        opts[key] = true;
      } else {
        opts[key] = next;
        i++;
      }
    }
  }

  return { command, opts };
}

// ── Commands ─────────────────────────────────────────────────────────────────

async function runDiscover(opts: Record<string, string | boolean>): Promise<void> {
  const root = typeof opts['root'] === 'string' ? opts['root'] : '..';
  const markersRaw = typeof opts['markers'] === 'string' ? opts['markers'] : 'squad.config.ts,.squad';
  const markers = markersRaw.split(',').map(m => m.trim()) as SquadMarker[];
  const asJson = opts['json'] === true;

  const config: DiscoveryConfig = {
    mode: 'hybrid',
    scanRoots: [root],
    markers,
    exclude: ['node_modules', '.git', 'dist', 'build', '.next', 'coverage'],
  };

  const result = await discoverSquads(config);

  if (asJson) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(`\n${BOLD}${CYAN}Squad Discovery${RESET}`);
  console.log(`${DIM}Scanning ${root} for markers: ${markers.join(', ')}${RESET}\n`);

  if (result.squads.length === 0) {
    console.log(`${YELLOW}No squads discovered.${RESET}`);
    return;
  }

  console.log(`${BOLD}Found ${result.squads.length} squad(s):${RESET}\n`);

  for (const squad of result.squads) {
    console.log(`  ${BOLD}${squad.name}${RESET}  ${DIM}(${squad.discoveredVia})${RESET}`);
    console.log(`  ${DIM}${squad.path}${RESET}`);
    console.log(`  ${squad.purpose}`);
    console.log();
  }

  // Source breakdown
  const sources = result.sources;
  const activeSourceNames = Object.entries(sources)
    .filter(([, names]) => names.length > 0)
    .map(([source, names]) => `${source}: ${names.length}`)
    .join(', ');
  if (activeSourceNames) {
    console.log(`${DIM}Sources: ${activeSourceNames}${RESET}`);
  }

  if (result.errors.length > 0) {
    console.log(`\n${YELLOW}Warnings:${RESET}`);
    for (const err of result.errors) {
      console.log(`  ${err.path}: ${err.error}`);
    }
  }

  // --register: persist discovered squads to .meta-squad/registry.yaml
  if (opts['register'] === true && result.squads.length > 0) {
    const cwd = process.cwd();
    let metaDir = resolveMetaSquadDir(cwd);
    if (!metaDir) {
      metaDir = initMetaSquadDir(cwd);
      console.log(`\n${GREEN}✓${RESET} Created ${BOLD}.meta-squad/${RESET} directory`);
    }

    const registryPath = path.join(metaDir, REGISTRY_FILE);
    const yaml = serializeRegistryYaml(result.squads, result.discoveredAt);
    fs.writeFileSync(registryPath, yaml, 'utf-8');
    console.log(`${GREEN}✓${RESET} Registered ${BOLD}${result.squads.length}${RESET} squad(s) in ${DIM}${registryPath}${RESET}`);
  }
}

/**
 * Serialize discovered squads into the registry YAML format.
 */
function serializeRegistryYaml(squads: SquadIdentity[], discoveredAt: string): string {
  const lines: string[] = [
    '# Meta-Squad Registry',
    '# Auto-populated by `squad mesh discover --register`',
    '#',
    `# Last scan: ${discoveredAt}`,
    '',
    'version: "1.0"',
    'metaSquad: ""',
    'leader: ""',
    `lastScan: "${discoveredAt}"`,
    'squads:',
  ];

  for (const squad of squads) {
    lines.push(`  - name: ${squad.name}`);
    lines.push(`    purpose: ${squad.purpose}`);
    lines.push(`    path: ${squad.path}`);
    lines.push(`    discoveredVia: ${squad.discoveredVia}`);
    lines.push(`    registeredAt: ${squad.registeredAt}`);
  }

  lines.push('');
  return lines.join('\n');
}

async function runStatus(opts: Record<string, string | boolean>): Promise<void> {
  const asJson = opts['format'] === 'json' || opts['json'] === true;
  const root = typeof opts['root'] === 'string' ? opts['root'] : '..';

  const config: DiscoveryConfig = {
    mode: 'hybrid',
    scanRoots: [root],
    markers: ['squad.config.ts', '.squad'],
    exclude: ['node_modules', '.git', 'dist', 'build', '.next', 'coverage'],
  };

  const discoveryResult = await discoverSquads(config);
  const statuses = collectAllStatuses(discoveryResult.squads);
  const cop = generateCOP(discoveryResult.squads);

  if (asJson) {
    console.log(JSON.stringify({ cop, statuses }, null, 2));
    return;
  }

  console.log(`\n${BOLD}${CYAN}Common Operational Picture${RESET}\n`);

  for (const status of statuses) {
    console.log(`  ${BOLD}${status.squad}${RESET}  ${healthIcon(status.health)}`);
    if (status.currentWork.length > 0) {
      for (const item of status.currentWork) {
        console.log(`    ${CYAN}•${RESET} ${item.title} ${DIM}[${item.status}]${RESET}`);
      }
    } else {
      console.log(`    ${DIM}No active work${RESET}`);
    }
    if (status.blockers.length > 0) {
      for (const b of status.blockers) {
        console.log(`    ${RED}⛔${RESET} ${b.description}`);
      }
    }
    console.log();
  }

  console.log(`${BOLD}Summary:${RESET}`);
  console.log(`  Squads: ${cop.summary.totalSquads}  Healthy: ${GREEN}${cop.summary.healthySquads}${RESET}  Blocked: ${cop.summary.blockedSquads > 0 ? RED : DIM}${cop.summary.blockedSquads}${RESET}`);

  const compact = generateCompactStatus(cop);
  console.log(`\n  ${DIM}${compact}${RESET}\n`);
}

async function runHealth(opts: Record<string, string | boolean>): Promise<void> {
  // Health delegates to status with health focus
  await runStatus({ ...opts, format: opts['json'] ? 'json' : 'table' } as Record<string, string | boolean>);
}

async function runInit(opts: Record<string, string | boolean>): Promise<void> {
  const cwd = process.cwd();
  const name = typeof opts['name'] === 'string' ? opts['name'] : path.basename(cwd);
  
  // Initialize .meta-squad/ directory
  const metaDir = initMetaSquadDir(cwd);
  console.log(`${GREEN}✓${RESET} Initialized ${BOLD}.meta-squad/${RESET} directory structure`);
  
  // Generate config file
  const configPath = path.join(cwd, 'meta-squad.config.ts');
  if (!fs.existsSync(configPath)) {
    const configContent = generateConfigTemplate(
      name,
      'Multi-squad orchestration and coordination'
    );
    fs.writeFileSync(configPath, configContent, 'utf-8');
    console.log(`${GREEN}✓${RESET} Created ${BOLD}meta-squad.config.ts${RESET}`);
  } else {
    console.log(`${YELLOW}⚠${RESET} Config file already exists: ${configPath}`);
  }
  
  console.log(`\n${BOLD}Next steps:${RESET}`);
  console.log(`  1. Edit ${CYAN}meta-squad.config.ts${RESET} to configure discovery, steering, and health`);
  console.log(`  2. Run ${CYAN}squad-mesh discover${RESET} to find sibling squads`);
  console.log(`  3. Run ${CYAN}squad-mesh status${RESET} to view the Common Operational Picture`);
}

// ── Help ─────────────────────────────────────────────────────────────────────

function printHelp(): void {
  console.log(`
${BOLD}squad-mesh${RESET} v${VERSION} — Multi-squad orchestration CLI

${BOLD}Usage:${RESET}
  squad-mesh <command> [options]

${BOLD}Commands:${RESET}`);

  for (const cmd of MESH_COMMANDS) {
    // Strip "mesh " prefix for standalone mode
    const name = cmd.name.replace('mesh ', '');
    console.log(`  ${BOLD}${name.padEnd(14)}${RESET} ${cmd.description}`);
  }

  console.log(`
${BOLD}Examples:${RESET}
  squad-mesh init                          Initialize meta-squad configuration
  squad-mesh discover                      Discover sibling squads
  squad-mesh discover --root C:\\dev --json  Scan a specific root, JSON output
  squad-mesh status                        Cross-squad operational picture
  squad-mesh status --format json          Machine-readable status
`);
}

// ── SDK Plugin Hook ──────────────────────────────────────────────────────────

/**
 * Register meta-squad commands with a Squad SDK CLI instance.
 * This is the future plugin interface — when the SDK exposes a
 * plugin/extension hook, this function provides the bridge.
 *
 * For now it returns the command definitions and handlers as a
 * structured object that any CLI framework can consume.
 */
export function registerCommands(): {
  commands: CliCommand[];
  handlers: Record<string, (opts: Record<string, string | boolean>) => Promise<void>>;
} {
  return {
    commands: MESH_COMMANDS,
    handlers: {
      discover: runDiscover,
      status: runStatus,
      health: runHealth,
      init: runInit,
    },
  };
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const { command, opts } = parseArgs(process.argv);

  switch (command) {
    case 'init':
      await runInit(opts);
      break;
    case 'discover':
      await runDiscover(opts);
      break;
    case 'status':
      await runStatus(opts);
      break;
    case 'health':
      await runHealth(opts);
      break;
    case 'version':
    case '--version':
    case '-v':
      console.log(`squad-mesh v${VERSION}`);
      break;
    case 'help':
    case '--help':
    case '-h':
      printHelp();
      break;
    default:
      console.error(`${RED}Unknown command: ${command}${RESET}\n`);
      printHelp();
      process.exit(1);
  }
}

main().catch((err: Error) => {
  console.error(`${RED}Fatal: ${err.message}${RESET}`);
  process.exit(1);
});
