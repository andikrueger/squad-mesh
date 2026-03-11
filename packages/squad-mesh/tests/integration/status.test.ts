/**
 * Integration Test — COP (Common Operational Picture) Rollup
 *
 * Validates the full status collection → aggregation → compact output pipeline
 * against realistic squad directory structures.
 *
 * Design note: assessSquadHealth() uses file mtime heuristics:
 *   - Recent .squad/log/ entries or decisions.md → 'green'
 *   - All stale (>7 days) → 'yellow'
 *   - No .squad/ dir → 'unknown'
 *   - 'red' is NOT produced by assessSquadHealth — only by generateHealthReport()
 *     via blocker-count signal. This is a known gap; tests reflect actual behavior.
 *
 * @module tests/integration/status
 */

import { describe, it, before, after } from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

import { collectSquadStatus, generateCOP, collectAllStatuses } from '../../src/status/index.js';
import { generateCompactStatus } from '../../src/coordinator/index.js';
import type { SquadIdentity, CommonOperationalPicture } from '../../src/types.js';

// ============================================================================
// Helpers
// ============================================================================

let tmpRoot: string;

function squadPath(name: string): string {
  return path.join(tmpRoot, name);
}

function mkSquadIdentity(name: string, purpose: string): SquadIdentity {
  return {
    name,
    purpose,
    path: squadPath(name),
    discoveredVia: 'explicit',
    registeredAt: new Date().toISOString(),
  };
}

/** Set a file's mtime to N days in the past. */
function setMtimeDaysAgo(filePath: string, days: number): void {
  const past = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  fs.utimesSync(filePath, past, past);
}

function writeFile(relativePath: string, content: string): string {
  const full = path.join(tmpRoot, relativePath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, 'utf-8');
  return full;
}

// ============================================================================
// Test Fixtures
// ============================================================================

/** Squad A: Active, healthy (green) — recent activity, no blockers */
function createSquadA(): void {
  writeFile('squad-alpha/.squad/team.md', [
    '# Squad Alpha',
    'Purpose: Frontend platform and design system.',
    '',
    '## Members',
    '- alice (lead)',
    '- bob (engineer)',
  ].join('\n'));

  writeFile('squad-alpha/.squad/decisions.md', [
    '# Decisions',
    '',
    '## Decision 1: Adopt Fluent v9',
    'Date: 2026-03-10',
    'All new components use Fluent UI React v9.',
    '',
    '## Decision 2: Monorepo bundling',
    'Date: 2026-03-11',
    'Use tsup for library builds.',
  ].join('\n'));

  // Recent log entry — mtime is "now" (within 7-day window)
  writeFile('squad-alpha/.squad/log/2026-03-11-standup.md', [
    '# 2026-03-11 Standup',
    '- Completed Fluent migration for Button component',
    '- Starting Dialog component next',
  ].join('\n'));
}

/** Squad B: Stale, yellow — no recent activity */
function createSquadB(): void {
  const teamFile = writeFile('squad-bravo/.squad/team.md', [
    '# Squad Bravo',
    'Purpose: Backend API services.',
    '',
    '## Members',
    '- charlie (lead)',
    '- diana (engineer)',
  ].join('\n'));

  const decisionsFile = writeFile('squad-bravo/.squad/decisions.md', [
    '# Decisions',
    '',
    '## Decision 1: Use Express v5',
    'Date: 2025-12-01',
    'Standardize on Express v5 for all API services.',
  ].join('\n'));

  const logFile = writeFile('squad-bravo/.squad/log/2025-12-01-kickoff.md', [
    '# 2025-12-01 Kickoff',
    '- Established initial API contracts',
  ].join('\n'));

  // Push all mtimes >30 days into the past so they're clearly stale
  setMtimeDaysAgo(teamFile, 30);
  setMtimeDaysAgo(decisionsFile, 30);
  setMtimeDaysAgo(logFile, 30);
}

/**
 * Squad C: Blocked — has blockers.md, but stale activity.
 * assessSquadHealth returns 'yellow' (stale), NOT 'red'.
 * Blockers are extracted separately by extractBlockers().
 */
function createSquadC(): void {
  const teamFile = writeFile('squad-charlie/.squad/team.md', [
    '# Squad Charlie',
    'Purpose: Infrastructure and deployment.',
    '',
    '## Members',
    '- eve (lead)',
  ].join('\n'));

  const decisionsFile = writeFile('squad-charlie/.squad/decisions.md', [
    '# Decisions',
    '',
    '## Decision 1: Kubernetes migration',
    'Date: 2025-11-15',
    'Migrate all services from VM to K8s.',
  ].join('\n'));

  const logFile = writeFile('squad-charlie/.squad/log/2025-11-15-plan.md', [
    '# 2025-11-15 Migration Plan',
    '- Drafted K8s migration runbook',
  ].join('\n'));

  // Blockers file — this is what extractBlockers() reads
  writeFile('squad-charlie/.squad/blockers.md', [
    '## Waiting on cloud budget approval',
    'Finance team has not approved the Azure spend increase.',
    '',
    '## CI/CD pipeline broken',
    'The main branch build has been red for 3 days.',
  ].join('\n'));

  // Make everything stale
  setMtimeDaysAgo(teamFile, 45);
  setMtimeDaysAgo(decisionsFile, 45);
  setMtimeDaysAgo(logFile, 45);
}

// ============================================================================
// Tests
// ============================================================================

describe('COP Integration — Status Rollup', () => {
  let squadA: SquadIdentity;
  let squadB: SquadIdentity;
  let squadC: SquadIdentity;

  before(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cop-test-'));
    createSquadA();
    createSquadB();
    createSquadC();

    squadA = mkSquadIdentity('squad-alpha', 'Frontend platform');
    squadB = mkSquadIdentity('squad-bravo', 'Backend API services');
    squadC = mkSquadIdentity('squad-charlie', 'Infrastructure and deployment');
  });

  after(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  // --------------------------------------------------------------------------
  // 1. collectSquadStatus — individual squad status
  // --------------------------------------------------------------------------

  describe('collectSquadStatus()', () => {
    it('returns green health for active squad with recent activity', () => {
      const status = collectSquadStatus(squadA);
      assert.equal(status.squad, 'squad-alpha');
      assert.equal(status.health, 'green');
      assert.ok(status.updatedAt, 'updatedAt must be set');
      assert.ok(Array.isArray(status.currentWork));
      assert.ok(Array.isArray(status.blockers));
      assert.ok(Array.isArray(status.recentDecisions));
    });

    it('returns yellow health for stale squad with old activity', () => {
      const status = collectSquadStatus(squadB);
      assert.equal(status.squad, 'squad-bravo');
      assert.equal(status.health, 'yellow');
    });

    it('returns yellow health for stale blocked squad (red not produced by assessSquadHealth)', () => {
      const status = collectSquadStatus(squadC);
      assert.equal(status.squad, 'squad-charlie');
      assert.equal(status.health, 'yellow');
      // Blockers are extracted from blockers.md
      assert.ok(status.blockers.length >= 2, `expected ≥2 blockers, got ${status.blockers.length}`);
    });

    it('extracts decisions from decisions.md', () => {
      const status = collectSquadStatus(squadA);
      assert.ok(status.recentDecisions.length >= 2, 'Squad Alpha has 2 decisions');
      assert.ok(
        status.recentDecisions.some(d => d.title.includes('Adopt Fluent v9')),
        'Should find the Fluent v9 decision',
      );
    });

    it('returns unknown health when .squad dir is missing', () => {
      const noSquadDir = mkSquadIdentity('nonexistent-squad', 'Does not exist');
      // Create the parent directory but not the .squad subdirectory
      fs.mkdirSync(squadPath('nonexistent-squad'), { recursive: true });
      const status = collectSquadStatus(noSquadDir);
      assert.equal(status.health, 'unknown');
    });
  });

  // --------------------------------------------------------------------------
  // 2. generateCOP — full aggregation
  // --------------------------------------------------------------------------

  describe('generateCOP()', () => {
    let cop: CommonOperationalPicture;

    before(() => {
      cop = generateCOP([squadA, squadB, squadC]);
    });

    it('contains all 3 squads', () => {
      assert.equal(cop.squads.length, 3);
      const names = cop.squads.map(s => s.squad).sort();
      assert.deepEqual(names, ['squad-alpha', 'squad-bravo', 'squad-charlie']);
    });

    it('summary.totalSquads is 3', () => {
      assert.equal(cop.summary.totalSquads, 3);
    });

    it('summary.healthySquads counts only green squads', () => {
      assert.equal(cop.summary.healthySquads, 1, 'Only squad-alpha is green');
    });

    it('summary.blockedSquads counts squads with blockers', () => {
      assert.equal(cop.summary.blockedSquads, 1, 'Only squad-charlie has blockers');
    });

    it('systemHealth reflects worst-case across squads', () => {
      // assessSquadHealth produces green/yellow/unknown only.
      // Squad B and C are yellow → system health = yellow
      assert.equal(cop.systemHealth, 'yellow');
    });

    it('generatedAt is a valid ISO timestamp', () => {
      assert.ok(cop.generatedAt);
      assert.ok(!isNaN(Date.parse(cop.generatedAt)), 'generatedAt must be valid ISO-8601');
    });

    it('defaults to empty tensions and directives', () => {
      assert.equal(cop.activeTensions.length, 0);
      assert.equal(cop.openDirectives.length, 0);
      assert.equal(cop.summary.openTensions, 0);
      assert.equal(cop.summary.openDirectives, 0);
    });
  });

  // --------------------------------------------------------------------------
  // 3. generateCompactStatus — one-liner output
  // --------------------------------------------------------------------------

  describe('generateCompactStatus()', () => {
    it('produces a non-empty string', () => {
      const cop = generateCOP([squadA, squadB, squadC]);
      const compact = generateCompactStatus(cop);
      assert.equal(typeof compact, 'string');
      assert.ok(compact.length > 0);
    });

    it('contains squad count and health', () => {
      const cop = generateCOP([squadA, squadB, squadC]);
      const compact = generateCompactStatus(cop);
      assert.ok(compact.includes('3 squads'), `expected '3 squads' in: ${compact}`);
      assert.ok(compact.includes('health=yellow'), `expected 'health=yellow' in: ${compact}`);
    });

    it('includes blocked warning when squads are blocked', () => {
      const cop = generateCOP([squadA, squadB, squadC]);
      const compact = generateCompactStatus(cop);
      assert.ok(compact.includes('blocked'), `expected blocked indicator in: ${compact}`);
    });
  });

  // --------------------------------------------------------------------------
  // 4. Empty squads — graceful handling
  // --------------------------------------------------------------------------

  describe('COP with no squads', () => {
    it('returns valid COP with 0 squads', () => {
      const cop = generateCOP([]);
      assert.equal(cop.squads.length, 0);
      assert.equal(cop.summary.totalSquads, 0);
      assert.equal(cop.summary.healthySquads, 0);
      assert.equal(cop.summary.blockedSquads, 0);
    });

    it('systemHealth is unknown when no squads exist', () => {
      const cop = generateCOP([]);
      assert.equal(cop.systemHealth, 'unknown');
    });

    it('compact status still produces output', () => {
      const cop = generateCOP([]);
      const compact = generateCompactStatus(cop);
      assert.equal(typeof compact, 'string');
      assert.ok(compact.includes('0 squads'));
    });
  });

  // --------------------------------------------------------------------------
  // 5. Mixed discovery — some squads unreadable
  // --------------------------------------------------------------------------

  describe('COP with partially unreadable squads', () => {
    it('collectAllStatuses returns unknown health for unreadable squads', () => {
      const badSquad = mkSquadIdentity('ghost-squad', 'Does not exist on disk');
      // Don't create the directory at all — path doesn't exist
      const statuses = collectAllStatuses([squadA, badSquad]);
      assert.equal(statuses.length, 2, 'Should have entries for both squads');

      const goodStatus = statuses.find(s => s.squad === 'squad-alpha');
      const badStatus = statuses.find(s => s.squad === 'ghost-squad');

      assert.ok(goodStatus, 'Readable squad should be present');
      assert.equal(goodStatus!.health, 'green');

      assert.ok(badStatus, 'Unreadable squad should be present (not crash)');
      assert.equal(badStatus!.health, 'unknown');
    });

    it('COP includes readable squads alongside failed ones', () => {
      const badSquad = mkSquadIdentity('ghost-squad', 'Does not exist');
      const cop = generateCOP([squadA, squadB, badSquad]);
      assert.equal(cop.summary.totalSquads, 3);
      // System still reflects the degraded state
      assert.ok(
        cop.systemHealth === 'yellow' || cop.systemHealth === 'red',
        `expected degraded health, got: ${cop.systemHealth}`,
      );
    });
  });

  // --------------------------------------------------------------------------
  // 6. Regression: COP with tensions and directives
  // --------------------------------------------------------------------------

  describe('COP with injected tensions and directives', () => {
    it('passes through tensions and filters completed directives', () => {
      const tension = {
        id: 'T-001',
        summary: 'Domain overlap on auth module',
        description: 'Both Alpha and Bravo claim ownership of auth.',
        type: 'domain-conflict' as const,
        raisedBy: 'squad-alpha',
        affects: ['squad-alpha', 'squad-bravo'],
        status: 'raised' as const,
        raisedAt: new Date().toISOString(),
      };

      const activeDirective = {
        id: 'D-001',
        title: 'Align on API schema v2',
        description: 'All squads must adopt schema v2 by end of sprint.',
        target: '*',
        priority: 'high' as const,
        status: 'issued' as const,
        issuedBy: 'meta-lead',
        issuedAt: new Date().toISOString(),
      };

      const completedDirective = {
        id: 'D-002',
        title: 'Completed task',
        description: 'Already done.',
        target: 'squad-alpha',
        priority: 'normal' as const,
        status: 'completed' as const,
        issuedBy: 'meta-lead',
        issuedAt: new Date().toISOString(),
      };

      const cop = generateCOP(
        [squadA],
        [tension],
        [activeDirective, completedDirective],
      );

      assert.equal(cop.activeTensions.length, 1);
      assert.equal(cop.openDirectives.length, 1, 'Completed directive should be filtered out');
      assert.equal(cop.summary.openTensions, 1);
      assert.equal(cop.summary.openDirectives, 1);
    });
  });
});
