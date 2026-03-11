/**
 * Integration Test — Discovery Engine (3-Squad Case)
 *
 * Validates that discoverSquads() correctly finds squads via filesystem
 * scanning, handles errors gracefully, respects exclude patterns, and
 * reads from registry files in hybrid mode.
 *
 * Run: npx tsx --test packages/squad-mesh/tests/integration/discovery.test.ts
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { discoverSquads, isSquadRoot } from '../../src/discovery/index.js';
import type { DiscoveryConfig } from '../../src/types.js';

// ============================================================================
// Helpers
// ============================================================================

/** Create a directory tree from a flat map of path → content. null = directory only. */
function scaffold(root: string, tree: Record<string, string | null>): void {
  for (const [rel, content] of Object.entries(tree)) {
    const full = path.join(root, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    if (content !== null) {
      fs.writeFileSync(full, content, 'utf-8');
    } else {
      fs.mkdirSync(full, { recursive: true });
    }
  }
}

// ============================================================================
// Test Suite
// ============================================================================

describe('Discovery Engine — 3-Squad Integration', () => {
  let tmpRoot: string;
  let squadADir: string;
  let squadBDir: string;
  let squadCDir: string;

  before(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'squad-discovery-test-'));

    // --- Squad A: Full .squad/ directory ---
    squadADir = path.join(tmpRoot, 'squad-alpha');
    scaffold(squadADir, {
      '.squad/team.md': [
        'Alpha squad handles core platform services.',
        '',
        '## Members',
        '- Burns (Lead)',
        '- Frink (Systems)',
      ].join('\n'),
      '.squad/decisions.md': '# Decisions\n\n- Use node:test for testing\n',
      '.squad/agents/burns/config.yaml': 'name: burns\nrole: lead\n',
      '.squad/identity/now.md': '# Now\n\nBuilding discovery engine integration tests.\n',
      'manifest.yaml': 'name: squad-alpha\nversion: 0.1.0\n',
    });

    // --- Squad B: Minimal .squad/ directory (just team.md) ---
    squadBDir = path.join(tmpRoot, 'squad-beta');
    scaffold(squadBDir, {
      '.squad/team.md': 'Beta squad owns the frontend experience.\n',
      '.squad/identity/now.md': '# Now\n\nDesigning component library.\n',
      'manifest.yaml': 'name: squad-beta\nversion: 0.1.0\n',
    });

    // --- Squad C: Has squad.config.ts marker but no .squad/ directory ---
    squadCDir = path.join(tmpRoot, 'squad-gamma');
    scaffold(squadCDir, {
      'squad.config.ts': 'export default { name: "squad-gamma", purpose: "Data pipeline" };\n',
      '.squad/identity/now.md': '# Now\n\nSetting up data ingestion.\n',
      'manifest.yaml': 'name: squad-gamma\nversion: 0.1.0\n',
    });
  });

  after(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  // --------------------------------------------------------------------------
  // Test 1: discoverSquads() finds all 3 squads
  // --------------------------------------------------------------------------

  it('discovers all 3 squads in local mode', async () => {
    const config: DiscoveryConfig = {
      mode: 'local',
      scanRoots: [tmpRoot],
      markers: ['squad.config.ts', '.squad'],
    };

    const result = await discoverSquads(config);

    // Exactly 3 squads
    assert.equal(result.squads.length, 3, `Expected 3 squads, got ${result.squads.length}`);

    // No errors
    assert.equal(result.errors.length, 0, `Unexpected errors: ${JSON.stringify(result.errors)}`);

    // Validate each squad
    const names = result.squads.map((s) => s.name).sort();
    assert.deepEqual(names, ['squad-alpha', 'squad-beta', 'squad-gamma']);

    for (const squad of result.squads) {
      assert.ok(squad.name, 'Squad must have a name');
      assert.ok(squad.path, 'Squad must have a path');
      assert.ok(squad.purpose, 'Squad must have a purpose');
      assert.ok(squad.discoveredVia, 'Squad must have discoveredVia');
      assert.ok(squad.registeredAt, 'Squad must have registeredAt');

      // Path must be absolute and point to the correct directory
      assert.ok(path.isAbsolute(squad.path), `Path should be absolute: ${squad.path}`);
      assert.ok(fs.existsSync(squad.path), `Path should exist: ${squad.path}`);
    }

    // Squad A should have purpose extracted from team.md
    const alpha = result.squads.find((s) => s.name === 'squad-alpha')!;
    assert.ok(
      alpha.purpose.includes('Alpha squad') || alpha.purpose.includes('platform'),
      `Alpha purpose should come from team.md, got: "${alpha.purpose}"`,
    );

    // All discovered via filesystem
    for (const squad of result.squads) {
      assert.equal(squad.discoveredVia, 'filesystem');
    }

    // Sources tracking
    assert.equal(result.sources.filesystem.length, 3);
  });

  // --------------------------------------------------------------------------
  // Test 2: discoverSquads() handles missing directories gracefully
  // --------------------------------------------------------------------------

  it('handles non-existent directory gracefully', async () => {
    const nonExistent = path.join(tmpRoot, 'this-does-not-exist');
    const config: DiscoveryConfig = {
      mode: 'local',
      scanRoots: [nonExistent],
    };

    const result = await discoverSquads(config);

    // No squads found
    assert.equal(result.squads.length, 0, 'Should find no squads');

    // Errors array should contain the path issue
    assert.ok(result.errors.length > 0, 'Should report at least one error');
    const err = result.errors[0]!;
    assert.ok(err.path.includes('this-does-not-exist'), `Error path should reference the missing dir`);
    assert.ok(err.error.toLowerCase().includes('not exist'), `Error message should say dir doesn't exist`);
  });

  // --------------------------------------------------------------------------
  // Test 3: discoverSquads() respects exclude patterns
  // --------------------------------------------------------------------------

  it('excludes node_modules and other default excludes', async () => {
    // Create a squad inside node_modules — should be excluded
    const nodeModulesSquad = path.join(tmpRoot, 'node_modules', 'hidden-squad');
    scaffold(nodeModulesSquad, {
      '.squad/team.md': 'This squad should never be discovered.\n',
    });

    const config: DiscoveryConfig = {
      mode: 'local',
      scanRoots: [tmpRoot],
      markers: ['squad.config.ts', '.squad'],
      // Default excludes include node_modules
    };

    const result = await discoverSquads(config);

    const names = result.squads.map((s) => s.name);
    assert.ok(!names.includes('node_modules'), 'node_modules should be excluded');
    assert.ok(!names.includes('hidden-squad'), 'Squad inside node_modules should not be found');

    // Should still find the 3 legit squads
    assert.equal(result.squads.length, 3, `Expected 3 squads, got: ${names.join(', ')}`);

    // Clean up the extra directory
    fs.rmSync(path.join(tmpRoot, 'node_modules'), { recursive: true, force: true });
  });

  // --------------------------------------------------------------------------
  // Test 4: Custom exclude patterns work
  // --------------------------------------------------------------------------

  it('respects custom exclude patterns', async () => {
    const config: DiscoveryConfig = {
      mode: 'local',
      scanRoots: [tmpRoot],
      markers: ['squad.config.ts', '.squad'],
      exclude: ['squad-beta'], // Explicitly exclude squad-beta
    };

    const result = await discoverSquads(config);

    const names = result.squads.map((s) => s.name);
    assert.ok(!names.includes('squad-beta'), 'squad-beta should be excluded');
    assert.equal(result.squads.length, 2, `Expected 2 squads with exclusion, got: ${names.join(', ')}`);
  });

  // --------------------------------------------------------------------------
  // Test 5: Hybrid mode reads from registry + filesystem
  // --------------------------------------------------------------------------

  it('hybrid mode combines registry and filesystem squads', async () => {
    // Create a registry.yaml with a squad NOT on the filesystem
    const registryDir = path.join(tmpRoot, '.meta-squad');
    fs.mkdirSync(registryDir, { recursive: true });

    const registryContent = [
      'squads:',
      '  - name: squad-remote',
      '    purpose: Remote squad only in registry',
      '    path: /opt/squads/squad-remote',
      '    registeredAt: 2026-01-01T00:00:00Z',
    ].join('\n');

    fs.writeFileSync(path.join(registryDir, 'registry.yaml'), registryContent, 'utf-8');

    const config: DiscoveryConfig = {
      mode: 'hybrid',
      scanRoots: [tmpRoot],
      markers: ['squad.config.ts', '.squad'],
      registryPath: path.join(registryDir, 'registry.yaml'),
    };

    const result = await discoverSquads(config);

    const names = result.squads.map((s) => s.name).sort();

    // Should have the 3 filesystem squads + 1 registry-only squad
    assert.ok(names.includes('squad-remote'), `Registry squad should be found: ${names.join(', ')}`);
    assert.ok(names.includes('squad-alpha'), 'Filesystem squad-alpha should be found');
    assert.ok(names.includes('squad-beta'), 'Filesystem squad-beta should be found');
    assert.ok(names.includes('squad-gamma'), 'Filesystem squad-gamma should be found');
    assert.equal(result.squads.length, 4, `Expected 4 squads in hybrid mode, got ${result.squads.length}`);

    // Check source tracking
    const remote = result.squads.find((s) => s.name === 'squad-remote')!;
    assert.equal(remote.discoveredVia, 'registry');
    assert.ok(result.sources.registry.includes('squad-remote'));

    assert.equal(result.sources.filesystem.length, 3);

    // Clean up registry dir
    fs.rmSync(registryDir, { recursive: true, force: true });
  });

  // --------------------------------------------------------------------------
  // Test 6: isSquadRoot utility works correctly
  // --------------------------------------------------------------------------

  it('isSquadRoot correctly identifies squad roots', () => {
    assert.equal(isSquadRoot(squadADir), true, 'Squad A should be a squad root');
    assert.equal(isSquadRoot(squadBDir), true, 'Squad B should be a squad root');
    assert.equal(isSquadRoot(squadCDir), true, 'Squad C should be a squad root');
    assert.equal(isSquadRoot(tmpRoot), false, 'Temp root itself is not a squad root');
    assert.equal(isSquadRoot(path.join(tmpRoot, 'nonexistent')), false, 'Non-existent dir is not a squad root');
  });

  // --------------------------------------------------------------------------
  // Test 7: discoveredAt timestamp is present
  // --------------------------------------------------------------------------

  it('includes a valid discoveredAt timestamp', async () => {
    const config: DiscoveryConfig = {
      mode: 'local',
      scanRoots: [tmpRoot],
    };

    const before = new Date().toISOString();
    const result = await discoverSquads(config);
    const after = new Date().toISOString();

    assert.ok(result.discoveredAt, 'discoveredAt should be present');
    assert.ok(result.discoveredAt >= before, 'discoveredAt should be >= test start');
    assert.ok(result.discoveredAt <= after, 'discoveredAt should be <= test end');
  });

  // --------------------------------------------------------------------------
  // Test 8: Deduplication across sources
  // --------------------------------------------------------------------------

  it('deduplicates squads found in multiple sources', async () => {
    // Create registry that lists squad-alpha (already on filesystem)
    const registryDir = path.join(tmpRoot, '.meta-squad-dedup');
    fs.mkdirSync(registryDir, { recursive: true });

    const registryContent = [
      'squads:',
      '  - name: squad-alpha',
      '    purpose: Same squad also in registry',
      `    path: ${squadADir}`,
      '    registeredAt: 2026-01-01T00:00:00Z',
    ].join('\n');

    fs.writeFileSync(path.join(registryDir, 'registry.yaml'), registryContent, 'utf-8');

    const config: DiscoveryConfig = {
      mode: 'hybrid',
      scanRoots: [tmpRoot],
      markers: ['squad.config.ts', '.squad'],
      registryPath: path.join(registryDir, 'registry.yaml'),
    };

    const result = await discoverSquads(config);

    // squad-alpha should appear exactly once (registry wins — checked first)
    const alphas = result.squads.filter((s) => s.name === 'squad-alpha');
    assert.equal(alphas.length, 1, 'squad-alpha should appear exactly once after dedup');

    // Clean up
    fs.rmSync(registryDir, { recursive: true, force: true });
  });
});
