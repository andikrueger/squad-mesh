/**
 * Integration Test — Steering Directive & Tension Flow
 *
 * Exercises the full lifecycle: create → save → load → respond for directives,
 * and raise → route for tensions. Uses real filesystem via temp directories.
 *
 * Framework: node:test + node:assert (zero external deps)
 */

import { describe, it, before, after } from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

import {
  createDirective,
  issueDirective,
  respondToDirective,
  withdrawDirective,
  saveDirective,
  loadDirectives,
  raiseTension,
  routeTension,
  resolveTension,
  escalateTension,
  saveTension,
  loadTensions,
} from '../../src/steering/index.js';

import type {
  Directive,
  CrossSquadTension,
  DirectiveResponse,
} from '../../src/types.js';

// ============================================================================
// Test Fixtures
// ============================================================================

const TEST_SQUADS = ['auth-squad', 'api-squad', 'web-squad'];

function makeDirectiveParams(overrides?: Partial<Directive>) {
  return {
    title: 'Adopt shared OAuth2 provider',
    description: 'All squads must migrate to the shared OAuth2 provider by end of sprint.',
    target: TEST_SQUADS,
    priority: 'high' as const,
    issuedBy: 'burns',
    acceptanceCriteria: ['OAuth2 endpoints configured', 'Integration tests passing'],
    ...overrides,
  };
}

function makeTensionParams(overrides?: Partial<CrossSquadTension>) {
  return {
    summary: 'auth-squad and api-squad both claim /users endpoint',
    description: 'Domain overlap on user management routes causes merge conflicts and unclear ownership.',
    type: 'domain-conflict' as const,
    raisedBy: 'api-squad',
    affects: ['auth-squad', 'api-squad'],
    ...overrides,
  };
}

// ============================================================================
// Test Suite
// ============================================================================

describe('Steering Engine — Integration', () => {
  let tmpDir: string;
  let metaSquadDir: string;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'squad-steering-test-'));
    metaSquadDir = path.join(tmpDir, '.meta-squad');
    fs.mkdirSync(path.join(metaSquadDir, 'directives'), { recursive: true });
    fs.mkdirSync(path.join(metaSquadDir, 'governance'), { recursive: true });
    fs.mkdirSync(path.join(metaSquadDir, 'tensions'), { recursive: true });
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // --------------------------------------------------------------------------
  // 1. createDirective() generates a proper directive
  // --------------------------------------------------------------------------

  describe('createDirective()', () => {
    it('generates a directive with valid ID, timestamp, and draft status', () => {
      const directive = createDirective(makeDirectiveParams());

      // ID format: dir-<base36timestamp>-<random>
      assert.ok(directive.id.startsWith('dir-'), `ID should start with "dir-", got "${directive.id}"`);
      assert.equal(directive.status, 'draft');
      assert.ok(directive.issuedAt, 'issuedAt should be set');
      assert.ok(!isNaN(Date.parse(directive.issuedAt)), 'issuedAt should be valid ISO-8601');

      // Responses initialized
      assert.ok(Array.isArray(directive.responses), 'responses should be an array');
      assert.equal(directive.responses.length, 0);
    });

    it('preserves all input fields in the directive body', () => {
      const params = makeDirectiveParams();
      const directive = createDirective(params);

      assert.equal(directive.title, params.title);
      assert.equal(directive.description, params.description);
      assert.deepEqual(directive.target, TEST_SQUADS);
      assert.equal(directive.priority, 'high');
      assert.equal(directive.issuedBy, 'burns');
      assert.deepEqual(directive.acceptanceCriteria, params.acceptanceCriteria);
    });
  });

  // --------------------------------------------------------------------------
  // 2. saveDirective() persists to filesystem
  // --------------------------------------------------------------------------

  describe('saveDirective()', () => {
    it('writes a JSON file to the directives directory', () => {
      const directive = createDirective(makeDirectiveParams({ title: 'Persist test' }));

      saveDirective(metaSquadDir, directive);

      const filePath = path.join(metaSquadDir, 'directives', `${directive.id}.json`);
      assert.ok(fs.existsSync(filePath), `Expected file at ${filePath}`);

      const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      assert.equal(content.id, directive.id);
      assert.equal(content.title, 'Persist test');
      assert.equal(content.status, 'draft');
      assert.deepEqual(content.target, TEST_SQUADS);
    });

    it('creates directives directory if it does not exist', () => {
      // Use a fresh subdirectory with no pre-created structure
      const freshDir = path.join(tmpDir, '.meta-squad-fresh');
      const directive = createDirective(makeDirectiveParams({ title: 'Mkdir test' }));

      // saveDirective should call mkdirSync({ recursive: true }) internally
      saveDirective(freshDir, directive);

      const filePath = path.join(freshDir, 'directives', `${directive.id}.json`);
      assert.ok(fs.existsSync(filePath), 'File should exist even when directives/ was not pre-created');
    });
  });

  // --------------------------------------------------------------------------
  // 3. loadDirectives() reads back saved directives
  // --------------------------------------------------------------------------

  describe('loadDirectives() — round-trip fidelity', () => {
    let savedDirectives: Directive[];
    let loadDir: string;

    before(() => {
      loadDir = path.join(tmpDir, '.meta-squad-load');
      fs.mkdirSync(path.join(loadDir, 'directives'), { recursive: true });

      savedDirectives = [
        createDirective(makeDirectiveParams({ title: 'Directive A', priority: 'critical' })),
        createDirective(makeDirectiveParams({ title: 'Directive B', priority: 'normal' })),
        createDirective(makeDirectiveParams({ title: 'Directive C', priority: 'low' })),
      ];

      for (const d of savedDirectives) {
        saveDirective(loadDir, d);
      }
    });

    it('loads all 3 saved directives', () => {
      const loaded = loadDirectives(loadDir);
      assert.equal(loaded.length, 3, `Expected 3 directives, got ${loaded.length}`);
    });

    it('each loaded directive matches its saved counterpart', () => {
      const loaded = loadDirectives(loadDir);
      for (const saved of savedDirectives) {
        const match = loaded.find(d => d.id === saved.id);
        assert.ok(match, `Could not find directive ${saved.id} in loaded results`);
        assert.deepEqual(match, saved, `Directive ${saved.id} round-trip mismatch`);
      }
    });

    it('returns empty array when directives directory does not exist', () => {
      const emptyDir = path.join(tmpDir, '.meta-squad-empty');
      const loaded = loadDirectives(emptyDir);
      assert.deepEqual(loaded, []);
    });
  });

  // --------------------------------------------------------------------------
  // 4. Full flow — create → save → load → respond
  // --------------------------------------------------------------------------

  describe('Full directive lifecycle', () => {
    let flowDir: string;

    before(() => {
      flowDir = path.join(tmpDir, '.meta-squad-flow');
    });

    it('create → issue → save → load → respond → complete', () => {
      // Create
      let directive = createDirective(makeDirectiveParams({ title: 'Full lifecycle test' }));
      assert.equal(directive.status, 'draft');

      // Issue
      directive = issueDirective(directive);
      assert.equal(directive.status, 'issued');

      // Save
      saveDirective(flowDir, directive);

      // Load
      const loaded = loadDirectives(flowDir);
      assert.equal(loaded.length, 1);
      let reloaded = loaded[0]!;
      assert.equal(reloaded.id, directive.id);
      assert.equal(reloaded.status, 'issued');

      // Respond — each squad acknowledges then completes
      for (const squad of TEST_SQUADS) {
        reloaded = respondToDirective(reloaded, {
          squad,
          status: 'acknowledged',
          message: `${squad} acknowledges`,
        });
      }
      assert.equal(reloaded.status, 'acknowledged');

      // Move all squads to in-progress
      for (const squad of TEST_SQUADS) {
        reloaded = respondToDirective(reloaded, {
          squad,
          status: 'in-progress',
          message: `${squad} working on it`,
        });
      }
      assert.equal(reloaded.status, 'in-progress');

      // Complete all squads
      for (const squad of TEST_SQUADS) {
        reloaded = respondToDirective(reloaded, {
          squad,
          status: 'completed',
          message: `${squad} done`,
        });
      }
      assert.equal(reloaded.status, 'completed');

      // Persist final state
      saveDirective(flowDir, reloaded);
      const final = loadDirectives(flowDir);
      assert.equal(final.length, 1);
      assert.equal(final[0]!.status, 'completed');
      assert.equal(final[0]!.responses?.length, 3);
    });

    it('withdraw cancels a directive', () => {
      let directive = createDirective(makeDirectiveParams({ title: 'To be withdrawn' }));
      directive = issueDirective(directive);
      directive = withdrawDirective(directive);
      assert.equal(directive.status, 'withdrawn');
    });

    it('issuing a non-draft directive throws', () => {
      let directive = createDirective(makeDirectiveParams({ title: 'Double issue' }));
      directive = issueDirective(directive);

      assert.throws(
        () => issueDirective(directive),
        /Cannot issue directive.*status is "issued"/,
      );
    });
  });

  // --------------------------------------------------------------------------
  // 5. raiseTension() + routeTension() flow
  // --------------------------------------------------------------------------

  describe('Tension routing', () => {
    it('raiseTension() creates a tension with valid structure', () => {
      const tension = raiseTension(makeTensionParams());

      assert.ok(tension.id.startsWith('tension-'), `ID should start with "tension-", got "${tension.id}"`);
      assert.equal(tension.status, 'raised');
      assert.ok(!isNaN(Date.parse(tension.raisedAt)), 'raisedAt should be valid ISO-8601');
      assert.equal(tension.type, 'domain-conflict');
      assert.equal(tension.raisedBy, 'api-squad');
      assert.deepEqual(tension.affects, ['auth-squad', 'api-squad']);
    });

    it('routeTension() produces a reasonable routing for domain-conflict', () => {
      const tension = raiseTension(makeTensionParams());
      const routing = routeTension(tension);

      assert.ok(routing.suggestedHandler, 'Should suggest a handler');
      assert.ok(routing.suggestedMethod, 'Should suggest a method');
      assert.ok(routing.rationale, 'Should provide rationale');
      assert.equal(routing.suggestedHandler, 'meta-squad-leader');
      assert.equal(routing.suggestedMethod, 'governance-proposal');
    });

    it('routeTension() handles dependency-blocked type', () => {
      const tension = raiseTension(makeTensionParams({
        type: 'dependency-blocked',
        summary: 'api-squad blocked on auth-squad token service',
      }));
      const routing = routeTension(tension);

      assert.equal(routing.suggestedMethod, 'direct-coordination');
      // Handler should be the first affected squad
      assert.equal(routing.suggestedHandler, 'auth-squad');
    });

    it('routeTension() handles knowledge-gap type', () => {
      const tension = raiseTension(makeTensionParams({
        type: 'knowledge-gap',
        summary: 'web-squad needs auth patterns from auth-squad',
        affects: ['web-squad'],
      }));
      const routing = routeTension(tension);

      assert.equal(routing.suggestedMethod, 'learning-propagation');
      assert.equal(routing.suggestedHandler, 'web-squad');
    });

    it('saveTension() + loadTensions() round-trips correctly', () => {
      const tensionDir = path.join(tmpDir, '.meta-squad-tensions');
      const tension = raiseTension(makeTensionParams());

      saveTension(tensionDir, tension);
      const loaded = loadTensions(tensionDir);

      assert.equal(loaded.length, 1);
      assert.deepEqual(loaded[0], tension);
    });

    it('resolveTension() marks tension as resolved', () => {
      let tension = raiseTension(makeTensionParams());
      tension = resolveTension(tension, {
        method: 'domain-transfer',
        summary: 'Transferred /users endpoint ownership to auth-squad',
        decidedBy: 'burns',
        resolvedAt: new Date().toISOString(),
      });

      assert.equal(tension.status, 'resolved');
      assert.ok(tension.resolution);
      assert.equal(tension.resolution.method, 'domain-transfer');
    });

    it('escalateTension() marks tension as escalated', () => {
      let tension = raiseTension(makeTensionParams());
      tension = escalateTension(tension);
      assert.equal(tension.status, 'escalated');
    });
  });

  // --------------------------------------------------------------------------
  // 6. Edge cases & resilience
  // --------------------------------------------------------------------------

  describe('Edge cases', () => {
    it('loadDirectives() skips malformed JSON files gracefully', () => {
      const edgeDir = path.join(tmpDir, '.meta-squad-edge');
      const directivesDir = path.join(edgeDir, 'directives');
      fs.mkdirSync(directivesDir, { recursive: true });

      // Write a valid directive
      const valid = createDirective(makeDirectiveParams({ title: 'Valid' }));
      saveDirective(edgeDir, valid);

      // Write a malformed file
      fs.writeFileSync(path.join(directivesDir, 'broken.json'), '{{not valid json', 'utf-8');

      // Write a non-JSON file (should be skipped)
      fs.writeFileSync(path.join(directivesDir, 'readme.txt'), 'ignore me', 'utf-8');

      const loaded = loadDirectives(edgeDir);
      assert.equal(loaded.length, 1, 'Should load only the valid directive');
      assert.equal(loaded[0]!.id, valid.id);
    });

    it('respondToDirective() replaces existing response from same squad', () => {
      let directive = createDirective(makeDirectiveParams());
      directive = issueDirective(directive);

      directive = respondToDirective(directive, {
        squad: 'auth-squad',
        status: 'acknowledged',
        message: 'first response',
      });
      assert.equal(directive.responses?.length, 1);

      directive = respondToDirective(directive, {
        squad: 'auth-squad',
        status: 'in-progress',
        message: 'updated response',
      });
      // Should replace, not append
      assert.equal(directive.responses?.length, 1);
      assert.equal(directive.responses?.[0]?.status, 'in-progress');
    });

    it('directive with single string target works correctly', () => {
      let directive = createDirective(makeDirectiveParams({ target: 'auth-squad' }));
      directive = issueDirective(directive);

      directive = respondToDirective(directive, {
        squad: 'auth-squad',
        status: 'completed',
        message: 'done',
      });
      assert.equal(directive.status, 'completed');
    });
  });
});
