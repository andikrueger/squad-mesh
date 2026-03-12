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

import { discoverSquads, getDefaultDiscoveryConfig, collectAllStatuses, generateCOP, generateCompactStatus, initMetaSquadDir, generateConfigTemplate, resolveMetaSquadDir, META_SQUAD_DIR, REGISTRY_FILE, collectAllLearnings, filterPropagatable, saveLearning, loadPatterns } from '../index.js';
import type { DiscoveryConfig, SquadMarker, SquadIdentity } from '../types.js';
import { readMeshLink } from '../bridge/index.js';
import { generateWisdomSkill } from '../bridge/wisdom-skill.js';
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

    // Write backpointer into each squad's .squad/ directory
    let backpointerCount = 0;
    const meshName = readMeshNameFromRegistry(registryPath);
    for (const squad of result.squads) {
      const squadDir = path.join(squad.path, '.squad');
      if (!fs.existsSync(squadDir)) continue;
      const backpointer = {
        meshRoot: path.resolve(cwd),
        meshName,
        registeredAt: new Date().toISOString(),
        registryPath: path.resolve(registryPath),
        version: VERSION,
      };
      fs.writeFileSync(
        path.join(squadDir, 'mesh-link.json'),
        JSON.stringify(backpointer, null, 2) + '\n',
        'utf-8',
      );
      backpointerCount++;
    }
    if (backpointerCount > 0) {
      console.log(`${GREEN}✓${RESET} Wrote backpointers to ${BOLD}${backpointerCount}${RESET} squad(s)`);
    }
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

async function runInitSquad(opts: Record<string, string | boolean>): Promise<void> {
  const cwd = process.cwd();
  const squadDir = path.join(cwd, '.squad');

  // 1. Determine mesh root — from flag, existing backpointer, or fail
  let meshRoot = typeof opts['mesh-root'] === 'string' ? opts['mesh-root'] : undefined;
  const meshUrl = typeof opts['mesh-url'] === 'string' ? opts['mesh-url'] : undefined;
  let meshName = typeof opts['name'] === 'string' ? opts['name'] : '';

  // Check for existing backpointer
  const existingLink = readMeshLink(cwd);
  if (existingLink && !meshRoot) {
    meshRoot = existingLink.meshRoot;
    meshName = meshName || existingLink.meshName;
    console.log(`${DIM}Using existing mesh link → ${existingLink.meshRoot}${RESET}`);
  }

  if (!meshRoot) {
    console.error(`${RED}Error:${RESET} --mesh-root is required (path to the mesh directory where .meta-squad/ lives)`);
    console.error(`\n${BOLD}Usage:${RESET} squad-mesh init-squad --mesh-root <path> [--mesh-url <url>] [--name <name>]`);
    process.exit(1);
  }

  meshRoot = path.resolve(meshRoot);

  // 2. Validate the mesh root exists and has .meta-squad/
  const metaDir = path.join(meshRoot, '.meta-squad');
  if (!fs.existsSync(metaDir)) {
    console.error(`${RED}Error:${RESET} No .meta-squad/ found at ${meshRoot}`);
    console.error(`Run ${CYAN}squad-mesh init${RESET} in that directory first.`);
    process.exit(1);
  }

  // 3. Try to read mesh name from registry
  if (!meshName) {
    meshName = readMeshNameFromRegistry(path.join(metaDir, REGISTRY_FILE));
  }

  // 4. Ensure .squad/ directory exists
  if (!fs.existsSync(squadDir)) {
    fs.mkdirSync(squadDir, { recursive: true });
    console.log(`${GREEN}✓${RESET} Created ${BOLD}.squad/${RESET} directory`);
  }

  // 5. Write/update mesh-link.json backpointer
  const registryPath = path.resolve(path.join(metaDir, REGISTRY_FILE));
  const backpointer = {
    meshRoot,
    meshName,
    registeredAt: existingLink?.registeredAt ?? new Date().toISOString(),
    registryPath,
    version: VERSION,
    ...(meshUrl ? { meshUrl } : {}),
  };
  fs.writeFileSync(
    path.join(squadDir, 'mesh-link.json'),
    JSON.stringify(backpointer, null, 2) + '\n',
    'utf-8',
  );
  console.log(`${GREEN}✓${RESET} Wrote ${BOLD}.squad/mesh-link.json${RESET} → ${DIM}${meshRoot}${RESET}`);

  // 6. Install wisdom skill
  const skillDir = path.join(squadDir, 'skills', 'mesh-wisdom');
  fs.mkdirSync(skillDir, { recursive: true });
  const skillContent = generateWisdomSkill(meshName, meshRoot, meshUrl);
  fs.writeFileSync(path.join(skillDir, 'SKILL.md'), skillContent, 'utf-8');
  console.log(`${GREEN}✓${RESET} Installed ${BOLD}.squad/skills/mesh-wisdom/SKILL.md${RESET}`);

  // 7. Summary
  console.log(`\n${BOLD}${CYAN}Squad connected to mesh!${RESET}\n`);
  if (meshName) {
    console.log(`  Mesh name:  ${BOLD}${meshName}${RESET}`);
  }
  console.log(`  Mesh root:  ${DIM}${meshRoot}${RESET}`);
  if (meshUrl) {
    console.log(`  Mesh URL:   ${DIM}${meshUrl}${RESET}`);
  }
  console.log(`  Backpointer: ${DIM}.squad/mesh-link.json${RESET}`);
  console.log(`  Skill:       ${DIM}.squad/skills/mesh-wisdom/SKILL.md${RESET}`);
  console.log(`\n${BOLD}Next steps:${RESET}`);
  console.log(`  1. Your squad agents now have the ${CYAN}mesh-wisdom${RESET} skill for cross-squad knowledge`);
  console.log(`  2. Run ${CYAN}squad-mesh yokoten${RESET} from the mesh root to share learnings`);
  console.log(`  3. Run ${CYAN}squad-mesh status${RESET} to see the full mesh picture`);
}

/**
 * Read the metaSquad name from registry.yaml (simple line scan).
 */
function readMeshNameFromRegistry(registryPath: string): string {
  try {
    if (!fs.existsSync(registryPath)) return '';
    const content = fs.readFileSync(registryPath, 'utf-8');
    const match = content.match(/^metaSquad:\s*"?([^"\n]*)"?/m);
    return match?.[1]?.trim() ?? '';
  } catch {
    return '';
  }
}

async function runYokoten(opts: Record<string, string | boolean>): Promise<void> {
  const root = typeof opts['root'] === 'string' ? opts['root'] : '..';
  const asJson = opts['json'] === true;
  const dryRun = opts['dry-run'] === true;

  const config: DiscoveryConfig = {
    mode: 'hybrid',
    scanRoots: [root],
    markers: ['squad.config.ts', '.squad'],
    exclude: ['node_modules', '.git', 'dist', 'build', '.next', 'coverage'],
  };

  if (!asJson) {
    console.log(`\n${BOLD}${CYAN}Squad Yokoten${RESET} — Cross-Squad Knowledge Sharing\n`);
    console.log(`Scanning ${root} for squad learnings...\n`);
  }

  const discoveryResult = await discoverSquads(config);
  const allLearnings = collectAllLearnings(discoveryResult.squads);
  const propagatable = filterPropagatable(allLearnings);
  const squadSpecificCount = allLearnings.length - propagatable.length;

  const cwd = process.cwd();
  const metaDir = resolveMetaSquadDir(cwd) ?? path.join(cwd, META_SQUAD_DIR);
  const patterns = fs.existsSync(metaDir) ? loadPatterns(metaDir) : [];

  if (asJson) {
    console.log(JSON.stringify({
      totalLearnings: allLearnings.length,
      squadsScanned: discoveryResult.squads.length,
      propagatable: propagatable.map(l => ({
        title: l.title,
        source: l.sourceSquad,
        relevance: l.relevance,
      })),
      squadSpecific: squadSpecificCount,
      saved: !dryRun ? propagatable.length : 0,
      existingPatterns: patterns.length,
    }, null, 2));
    return;
  }

  console.log(`Found ${BOLD}${allLearnings.length}${RESET} learnings across ${BOLD}${discoveryResult.squads.length}${RESET} squads\n`);

  if (propagatable.length > 0) {
    console.log(`${GREEN}Propagatable (${propagatable.length}):${RESET}`);
    for (const l of propagatable) {
      console.log(`  📚 "${l.title}" from ${BOLD}${l.sourceSquad}${RESET} ${DIM}[${l.relevance}]${RESET}`);
    }
  } else {
    console.log(`${DIM}No propagatable learnings found.${RESET}`);
  }

  if (squadSpecificCount > 0) {
    console.log(`\n${DIM}Filtered out (${squadSpecificCount} squad-specific)${RESET}`);
  }

  if (!dryRun && propagatable.length > 0) {
    const saveDir = resolveMetaSquadDir(cwd) ?? initMetaSquadDir(cwd);
    for (const learning of propagatable) {
      saveLearning(saveDir, learning);
    }
    console.log(`\n${GREEN}✓${RESET} Saved ${BOLD}${propagatable.length}${RESET} learnings to ${DIM}.meta-squad/learnings/${RESET}`);
  } else if (dryRun && propagatable.length > 0) {
    console.log(`\n${YELLOW}Dry run${RESET} — no learnings saved`);
  }

  console.log(`\n${DIM}Existing patterns: ${patterns.length}${RESET}\n`);
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
  squad-mesh init-squad --mesh-root C:\\dev  Register this squad into a mesh
  squad-mesh status                        Cross-squad operational picture
  squad-mesh yokoten                       Share learnings across the mesh
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
      yokoten: runYokoten,
      init: runInit,
      'init-squad': runInitSquad,
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
    case 'init-squad':
      await runInitSquad(opts);
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
    case 'yokoten':
      await runYokoten(opts);
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
