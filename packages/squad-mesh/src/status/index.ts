/**
 * Cross-Squad Status Aggregation — Common Operational Picture
 *
 * Reads status/health artifacts from discovered squads and produces
 * a unified view inspired by NATO's Common Operational Picture (COP).
 *
 * @module status
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type {
  SquadIdentity,
  SquadStatus,
  HealthLevel,
  WorkItem,
  Blocker,
  DecisionSummary,
  CommonOperationalPicture,
  CrossSquadTension,
  Directive,
  SquadHealthReport,
  HealthSignal,
  HealthConfig,
  VisibilityConfig,
} from '../types.js';

// ============================================================================
// Status Collection
// ============================================================================

/**
 * Collect status from a single squad by reading its state directory.
 */
export function collectSquadStatus(squad: SquadIdentity): SquadStatus {
  const squadDir = squad.path;
  const squadConfigDir = path.join(squadDir, '.squad');

  return {
    squad: squad.name,
    updatedAt: new Date().toISOString(),
    health: assessSquadHealth(squadDir),
    currentWork: extractCurrentWork(squadConfigDir),
    blockers: extractBlockers(squadConfigDir),
    recentDecisions: extractRecentDecisions(squadConfigDir),
  };
}

/**
 * Collect status from all discovered squads.
 */
export function collectAllStatuses(squads: SquadIdentity[]): SquadStatus[] {
  return squads.map(squad => {
    try {
      return collectSquadStatus(squad);
    } catch {
      return {
        squad: squad.name,
        updatedAt: new Date().toISOString(),
        health: 'unknown' as HealthLevel,
        currentWork: [],
        blockers: [],
        recentDecisions: [],
      };
    }
  });
}

// ============================================================================
// Common Operational Picture
// ============================================================================

/**
 * Generate the Common Operational Picture — a unified cross-squad view.
 *
 * ```ts
 * const cop = generateCOP(discoveredSquads, activeTensions, openDirectives);
 * console.log(cop.systemHealth); // 'green' | 'yellow' | 'red'
 * console.log(cop.summary.totalSquads); // number
 * ```
 */
export function generateCOP(
  squads: SquadIdentity[],
  tensions?: CrossSquadTension[],
  directives?: Directive[],
): CommonOperationalPicture {
  const statuses = collectAllStatuses(squads);
  const activeTensions = tensions ?? [];
  const openDirectives = directives?.filter(d =>
    d.status !== 'completed' && d.status !== 'withdrawn'
  ) ?? [];

  const healthyCount = statuses.filter(s => s.health === 'green').length;
  const blockedCount = statuses.filter(s => s.blockers.length > 0).length;

  return {
    generatedAt: new Date().toISOString(),
    squads: statuses,
    activeTensions,
    openDirectives,
    systemHealth: deriveSystemHealth(statuses),
    summary: {
      totalSquads: statuses.length,
      healthySquads: healthyCount,
      blockedSquads: blockedCount,
      openTensions: activeTensions.length,
      openDirectives: openDirectives.length,
      recentLearnings: 0, // Populated by knowledge module
    },
  };
}

// ============================================================================
// Health Assessment
// ============================================================================

const DEFAULT_SIGNALS: Array<Omit<HealthSignal, 'value' | 'level'>> = [
  {
    name: 'blocker-count',
    yellowThreshold: 1,
    redThreshold: 3,
    description: 'Number of active blockers',
  },
  {
    name: 'decision-recency',
    yellowThreshold: 7,
    redThreshold: 14,
    description: 'Days since last decision',
  },
  {
    name: 'config-freshness',
    yellowThreshold: 30,
    redThreshold: 90,
    description: 'Days since config was last modified',
  },
];

/**
 * Generate a health report for a single squad.
 */
export function generateHealthReport(
  squad: SquadIdentity,
  config?: HealthConfig,
): SquadHealthReport {
  const signalDefs = config?.signals ?? DEFAULT_SIGNALS;
  const signals: HealthSignal[] = signalDefs.map(def => {
    const value = measureSignal(def.name, squad.path);
    const level = classifySignal(value, def.yellowThreshold, def.redThreshold);
    return { ...def, value, level };
  });

  const worstLevel = signals.reduce<HealthLevel>((worst, s) => {
    return healthPriority(s.level) > healthPriority(worst) ? s.level : worst;
  }, 'green');

  return {
    squad: squad.name,
    health: worstLevel,
    signals,
    generatedAt: new Date().toISOString(),
  };
}

// ============================================================================
// Internal Helpers
// ============================================================================

function assessSquadHealth(squadDir: string): HealthLevel {
  const squadConfigDir = path.join(squadDir, '.squad');
  if (!fs.existsSync(squadConfigDir)) return 'unknown';

  // Simple heuristic: check for blockers and recency of activity
  const logDir = path.join(squadConfigDir, 'log');
  const decisionsFile = path.join(squadConfigDir, 'decisions.md');

  let hasRecentActivity = false;
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  // Check log directory for recent entries
  if (fs.existsSync(logDir)) {
    try {
      const entries = fs.readdirSync(logDir);
      for (const entry of entries) {
        const stat = fs.statSync(path.join(logDir, entry));
        if (stat.mtimeMs > oneWeekAgo) {
          hasRecentActivity = true;
          break;
        }
      }
    } catch {
      // Ignore read errors
    }
  }

  // Check decisions file
  if (fs.existsSync(decisionsFile)) {
    try {
      const stat = fs.statSync(decisionsFile);
      if (stat.mtimeMs > oneWeekAgo) hasRecentActivity = true;
    } catch {
      // Ignore
    }
  }

  if (!hasRecentActivity) return 'yellow';
  return 'green';
}

function extractCurrentWork(squadConfigDir: string): WorkItem[] {
  // Read from orchestration-log or similar
  const orchLogDir = path.join(squadConfigDir, 'orchestration-log');
  if (!fs.existsSync(orchLogDir)) return [];

  const items: WorkItem[] = [];
  try {
    const entries = fs.readdirSync(orchLogDir).sort().slice(-5); // Last 5 entries
    for (const entry of entries) {
      const content = fs.readFileSync(path.join(orchLogDir, entry), 'utf-8');
      const titleMatch = /^#\s+(.+)/m.exec(content);
      items.push({
        title: titleMatch?.[1] ?? entry.replace(/\.md$/, ''),
        status: 'in-progress',
      });
    }
  } catch {
    // Ignore
  }
  return items;
}

function extractBlockers(squadConfigDir: string): Blocker[] {
  // Look for blockers in decisions or a dedicated blockers file
  const blockersFile = path.join(squadConfigDir, 'blockers.md');
  if (!fs.existsSync(blockersFile)) return [];

  const blockers: Blocker[] = [];
  try {
    const content = fs.readFileSync(blockersFile, 'utf-8');
    const blocks = content.split(/^##\s+/m).filter((b: string) => b.trim());
    for (const block of blocks) {
      const lines = block.split('\n');
      blockers.push({
        description: lines[0]?.trim() ?? 'Unknown blocker',
        cause: lines[1]?.trim() ?? 'Unknown',
        since: new Date().toISOString(),
      });
    }
  } catch {
    // Ignore
  }
  return blockers;
}

function extractRecentDecisions(squadConfigDir: string): DecisionSummary[] {
  const decisionsFile = path.join(squadConfigDir, 'decisions.md');
  if (!fs.existsSync(decisionsFile)) return [];

  const decisions: DecisionSummary[] = [];
  try {
    const content = fs.readFileSync(decisionsFile, 'utf-8');
    // Parse "## Decision N: Title" pattern
    const matches = content.matchAll(/^##\s+Decision\s+(\d+):\s+(.+)/gm);
    for (const match of matches) {
      decisions.push({
        id: `decision-${match[1]}`,
        title: match[2]?.trim() ?? 'Untitled',
        madeAt: new Date().toISOString(), // Would need to parse actual dates
        crossSquadRelevant: false,
      });
    }
  } catch {
    // Ignore
  }
  return decisions.slice(-5); // Last 5
}

function deriveSystemHealth(statuses: SquadStatus[]): HealthLevel {
  if (statuses.length === 0) return 'unknown';
  if (statuses.some(s => s.health === 'red')) return 'red';
  if (statuses.some(s => s.health === 'yellow')) return 'yellow';
  if (statuses.some(s => s.health === 'unknown')) return 'yellow';
  return 'green';
}

function healthPriority(level: HealthLevel): number {
  switch (level) {
    case 'green': return 0;
    case 'yellow': return 1;
    case 'red': return 2;
    case 'unknown': return 1;
  }
}

function measureSignal(signalName: string, squadPath: string): number {
  const squadConfigDir = path.join(squadPath, '.squad');
  switch (signalName) {
    case 'blocker-count': {
      const blockersFile = path.join(squadConfigDir, 'blockers.md');
      if (!fs.existsSync(blockersFile)) return 0;
      const content = fs.readFileSync(blockersFile, 'utf-8');
      return (content.match(/^##\s+/gm) ?? []).length;
    }
    case 'decision-recency': {
      const decisionsFile = path.join(squadConfigDir, 'decisions.md');
      if (!fs.existsSync(decisionsFile)) return 999;
      const stat = fs.statSync(decisionsFile);
      return Math.floor((Date.now() - stat.mtimeMs) / (24 * 60 * 60 * 1000));
    }
    case 'config-freshness': {
      const configFile = path.join(squadConfigDir, 'config.json');
      if (!fs.existsSync(configFile)) return 999;
      const stat = fs.statSync(configFile);
      return Math.floor((Date.now() - stat.mtimeMs) / (24 * 60 * 60 * 1000));
    }
    default:
      return 0;
  }
}

function classifySignal(value: number, yellowThreshold: number, redThreshold: number): HealthLevel {
  if (value >= redThreshold) return 'red';
  if (value >= yellowThreshold) return 'yellow';
  return 'green';
}
