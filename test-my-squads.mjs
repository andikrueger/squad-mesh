#!/usr/bin/env node
/**
 * test-my-squads.mjs — Live test of squad-mesh discovery + status
 *
 * Discovers all squads under C:\dev, collects status for each,
 * generates a Common Operational Picture, and prints a formatted summary.
 */

import {
  discoverSquads,
  collectSquadStatus,
  generateCOP,
  generateCompactStatus,
  formatDiscoverySummary,
} from './packages/squad-mesh/dist/index.js';

// ANSI color helpers
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const WHITE = '\x1b[37m';

function healthIcon(level) {
  switch (level) {
    case 'green':   return `${GREEN}🟢 green${RESET}`;
    case 'yellow':  return `${YELLOW}🟡 yellow${RESET}`;
    case 'red':     return `${RED}🔴 red${RESET}`;
    default:        return `${DIM}⚪ unknown${RESET}`;
  }
}

function systemHealthBanner(level) {
  switch (level) {
    case 'green':   return `${GREEN}${BOLD}✅ ALL SYSTEMS GREEN${RESET}`;
    case 'yellow':  return `${YELLOW}${BOLD}⚠️  ATTENTION NEEDED${RESET}`;
    case 'red':     return `${RED}${BOLD}🚨 CRITICAL ISSUES${RESET}`;
    default:        return `${DIM}${BOLD}❓ STATUS UNKNOWN${RESET}`;
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n${BOLD}${CYAN}╔══════════════════════════════════════════════════════════╗${RESET}`);
  console.log(`${BOLD}${CYAN}║       🏢  Project Owner's Squad-of-Squads — Live Discovery       ║${RESET}`);
  console.log(`${BOLD}${CYAN}╚══════════════════════════════════════════════════════════╝${RESET}\n`);

  // 1. Discover squads
  console.log(`${DIM}Scanning C:\\dev for squads (hybrid mode)...${RESET}\n`);
  const discoveryResult = await discoverSquads({
    mode: 'hybrid',
    scanRoots: ['C:\\dev'],
    markers: ['squad.config.ts', '.squad'],
    exclude: ['node_modules', '.git', 'dist'],
  });

  const { squads } = discoveryResult;

  // Show warning summary at the top so it's not buried
  const warningSummary = formatDiscoverySummary(discoveryResult);
  if (warningSummary) {
    console.log(`  ${YELLOW}${warningSummary}${RESET}\n`);
  }

  console.log(`${BOLD}Found ${squads.length} squad(s)${RESET}\n`);

  if (squads.length === 0) {
    console.log(`${YELLOW}No squads discovered. Check scan roots and markers.${RESET}`);
    return;
  }

  // 2. Collect status for each squad
  const statuses = [];
  for (const squad of squads) {
    try {
      const status = collectSquadStatus(squad);
      statuses.push({ squad, status });
    } catch (err) {
      statuses.push({
        squad,
        status: {
          squad: squad.name,
          updatedAt: new Date().toISOString(),
          health: 'unknown',
          currentWork: [],
          blockers: [],
          recentDecisions: [],
        },
      });
    }
  }

  // 3. Generate COP
  const cop = generateCOP(squads);

  // 4. Print per-squad details
  console.log(`${BOLD}${'─'.repeat(58)}${RESET}`);
  for (const { squad, status } of statuses) {
    console.log(`\n  ${BOLD}${WHITE}${squad.name}${RESET}  ${healthIcon(status.health)}`);
    console.log(`  ${DIM}${squad.path}${RESET}`);
    console.log(`  ${DIM}${squad.purpose}${RESET}`);

    if (status.currentWork.length > 0) {
      console.log(`  ${CYAN}Work:${RESET}`);
      for (const item of status.currentWork) {
        console.log(`    • ${item.title} ${DIM}[${item.status}]${RESET}`);
      }
    } else {
      console.log(`  ${DIM}No active work items${RESET}`);
    }

    if (status.blockers.length > 0) {
      console.log(`  ${RED}Blockers:${RESET}`);
      for (const blocker of status.blockers) {
        console.log(`    ⛔ ${blocker.description} ${DIM}(${blocker.cause})${RESET}`);
      }
    }
  }

  // 5. System summary
  console.log(`\n${BOLD}${'─'.repeat(58)}${RESET}`);
  console.log(`\n  ${systemHealthBanner(cop.systemHealth)}\n`);

  console.log(`  ${BOLD}Summary:${RESET}`);
  console.log(`    Total squads:   ${cop.summary.totalSquads}`);
  console.log(`    Healthy:        ${GREEN}${cop.summary.healthySquads}${RESET}`);
  console.log(`    Blocked:        ${cop.summary.blockedSquads > 0 ? RED : DIM}${cop.summary.blockedSquads}${RESET}`);
  console.log(`    Open tensions:  ${cop.summary.openTensions}`);
  console.log(`    Open directives:${cop.summary.openDirectives}`);

  // 6. Compact status line
  const compact = generateCompactStatus(cop);
  console.log(`\n  ${DIM}Compact:${RESET} ${compact}`);

  // Discovery source breakdown
  const sources = discoveryResult.sources;
  const activeSourceNames = Object.entries(sources)
    .filter(([, names]) => names.length > 0)
    .map(([source, names]) => `${source}: ${names.length}`)
    .join(', ');
  if (activeSourceNames) {
    console.log(`  ${DIM}Sources: ${activeSourceNames}${RESET}`);
  }

  if (discoveryResult.warnings.length > 0) {
    console.log(`\n  ${YELLOW}Discovery warnings:${RESET}`);
    for (const w of discoveryResult.warnings) {
      console.log(`    ⚠️  [${w.category}] ${w.path}: ${w.message}`);
    }
  }

  // Legacy errors (backward compat — shown if there are errors not covered by warnings)
  if (discoveryResult.errors.length > 0) {
    console.log(`\n  ${DIM}Discovery errors (raw):${RESET}`);
    for (const err of discoveryResult.errors) {
      console.log(`    ${DIM}${err.path}: ${err.error}${RESET}`);
    }
  }

  console.log(`\n${BOLD}${CYAN}${'═'.repeat(58)}${RESET}\n`);
}

main().catch(err => {
  console.error(`${RED}Fatal: ${err.message}${RESET}`);
  process.exit(1);
});
