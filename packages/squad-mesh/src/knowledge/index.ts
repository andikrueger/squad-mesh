/**
 * Knowledge Propagation - Cross-Squad Learning (Yokoten)
 *
 * Implements Toyota yokoten pattern for cross-squad knowledge sharing.
 * Scans squad learnings/decisions for cross-squad relevance,
 * aggregates patterns, and tracks adoption.
 *
 * All state persists in .meta-squad/learnings/ and .meta-squad/patterns/.
 *
 * @module knowledge
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type {
  SquadIdentity,
  CrossSquadLearning,
  SharedPattern,
  LearningRelevance,
  KnowledgeConfig,
} from '../types.js';

// ============================================================================
// Learning Collection
// ============================================================================

/**
 * Scan a squad state directory for learnings.
 */
export function collectSquadLearnings(squad: SquadIdentity): CrossSquadLearning[] {
  const learnings: CrossSquadLearning[] = [];
  const squadConfigDir = path.join(squad.path, '.squad');

  // 1. Scan agent histories for explicit learnings
  const agentsDir = path.join(squadConfigDir, 'agents');
  if (fs.existsSync(agentsDir)) {
    try {
      for (const agent of fs.readdirSync(agentsDir)) {
        const historyFile = path.join(agentsDir, agent, 'history.md');
        if (!fs.existsSync(historyFile)) continue;

        const content = fs.readFileSync(historyFile, 'utf-8');
        const tag = 'agent:' + agent;
        const extracted = extractLearningsFromMarkdown(content, squad.name, tag);
        learnings.push(...extracted);
      }
    } catch {
      // Ignore
    }
  }

  // 2. Scan decisions for cross-squad relevant decisions
  const decisionsFile = path.join(squadConfigDir, 'decisions.md');
  if (fs.existsSync(decisionsFile)) {
    try {
      const content = fs.readFileSync(decisionsFile, 'utf-8');
      const extracted = extractDecisionLearnings(content, squad.name);
      learnings.push(...extracted);
    } catch {
      // Ignore
    }
  }

  // 3. Scan skills directory for codified knowledge
  const skillsDir = path.join(squadConfigDir, 'skills');
  if (fs.existsSync(skillsDir)) {
    try {
      for (const skillFile of fs.readdirSync(skillsDir)) {
        if (!skillFile.endsWith('.md')) continue;
        const content = fs.readFileSync(path.join(skillsDir, skillFile), 'utf-8');
        const titleMatch = /^#\s+(.+)/m.exec(content);
        learnings.push({
          id: generateId('learn'),
          title: titleMatch?.[1] ?? skillFile.replace(/\.md$/, ''),
          content: content.slice(0, 2000),
          sourceSquad: squad.name,
          learnedAt: new Date().toISOString(),
          tags: ['skill', 'codified'],
          relevance: 'domain-relevant',
        });
      }
    } catch {
      // Ignore
    }
  }

  return learnings;
}

/**
 * Collect learnings from all discovered squads.
 */
export function collectAllLearnings(squads: SquadIdentity[]): CrossSquadLearning[] {
  const allLearnings: CrossSquadLearning[] = [];
  for (const squad of squads) {
    try {
      allLearnings.push(...collectSquadLearnings(squad));
    } catch {
      // Skip squads that cant be read
    }
  }
  return allLearnings;
}

// ============================================================================
// Learning Classification
// ============================================================================

const UNIVERSAL_TAGS = [
  'architecture', 'security', 'performance', 'deployment',
  'testing', 'ci-cd', 'monitoring', 'observability',
  'api-design', 'error-handling', 'accessibility',
];

/**
 * Classify a learning relevance based on its content and tags.
 */
export function classifyRelevance(
  learning: CrossSquadLearning,
  config?: KnowledgeConfig,
): LearningRelevance {
  const crossSquadTags = config?.crossSquadTags ?? UNIVERSAL_TAGS;
  const hasUniversalTag = learning.tags.some(tag => crossSquadTags.includes(tag));

  if (hasUniversalTag) return 'universal';

  const lowerContent = learning.content.toLowerCase();
  const universalKeywords = ['all squads', 'everyone', 'shared', 'common', 'standard', 'convention'];
  if (universalKeywords.some(kw => lowerContent.includes(kw))) return 'universal';

  const domainKeywords = ['pattern', 'approach', 'technique', 'strategy', 'best practice'];
  if (domainKeywords.some(kw => lowerContent.includes(kw))) return 'domain-relevant';

  return 'squad-specific';
}

/**
 * Filter learnings that should be propagated across squads.
 */
export function filterPropagatable(
  learnings: CrossSquadLearning[],
  config?: KnowledgeConfig,
): CrossSquadLearning[] {
  return learnings
    .map(l => ({ ...l, relevance: classifyRelevance(l, config) }))
    .filter(l => l.relevance !== 'squad-specific');
}

// ============================================================================
// Pattern Promotion
// ============================================================================

/**
 * Promote a learning to a shared pattern.
 */
export function promoteToPattern(
  learning: CrossSquadLearning,
  adoptedBy: string[],
): SharedPattern {
  return {
    name: learning.title.toLowerCase().replace(/\s+/g, '-'),
    description: learning.title,
    content: learning.content,
    derivedFrom: [learning.id],
    adoptedBy,
    codifiedAt: new Date().toISOString(),
    confidence: 'experimental',
  };
}

/**
 * Merge multiple learnings into a single shared pattern.
 */
export function mergeLearningsToPattern(
  learnings: CrossSquadLearning[],
  name: string,
  description: string,
): SharedPattern {
  const sections: string[] = [];
  for (const l of learnings) {
    sections.push('## From ' + l.sourceSquad + '\n\n' + l.content);
  }
  const mergedContent = sections.join('\n\n---\n\n');

  return {
    name,
    description,
    content: mergedContent,
    derivedFrom: learnings.map(l => l.id),
    adoptedBy: [...new Set(learnings.map(l => l.sourceSquad))],
    codifiedAt: new Date().toISOString(),
    confidence: learnings.length >= 3 ? 'established' : 'experimental',
  };
}

// ============================================================================
// Persistence
// ============================================================================

/**
 * Save a learning to .meta-squad/learnings/.
 * Throws a clear error if the directory cannot be created.
 */
export function saveLearning(metaSquadDir: string, learning: CrossSquadLearning): void {
  const dir = path.join(metaSquadDir, 'learnings');
  ensureDirectory(dir, 'learning');
  const filePath = path.join(dir, learning.id + '.json');
  fs.writeFileSync(
    filePath,
    JSON.stringify(learning, null, 2) + '\n',
    'utf-8',
  );
}

/**
 * Load all learnings from .meta-squad/learnings/.
 * Returns an empty array if the directory doesn't exist yet.
 */
export function loadLearnings(metaSquadDir: string): CrossSquadLearning[] {
  const dir = path.join(metaSquadDir, 'learnings');
  if (!fs.existsSync(dir)) {
    console.warn(`[squad-mesh] Learnings directory not found: ${dir} — returning empty list`);
    return [];
  }

  const learnings: CrossSquadLearning[] = [];
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.json')) continue;
    try {
      const content = fs.readFileSync(path.join(dir, file), 'utf-8');
      learnings.push(JSON.parse(content) as CrossSquadLearning);
    } catch {
      // Skip
    }
  }
  return learnings;
}

/**
 * Save a shared pattern to .meta-squad/patterns/.
 * Throws a clear error if the directory cannot be created.
 */
export function savePattern(metaSquadDir: string, pattern: SharedPattern): void {
  const dir = path.join(metaSquadDir, 'patterns');
  ensureDirectory(dir, 'pattern');
  const filePath = path.join(dir, pattern.name + '.json');
  fs.writeFileSync(
    filePath,
    JSON.stringify(pattern, null, 2) + '\n',
    'utf-8',
  );
}

/**
 * Load all shared patterns from .meta-squad/patterns/.
 * Returns an empty array if the directory doesn't exist yet.
 */
export function loadPatterns(metaSquadDir: string): SharedPattern[] {
  const dir = path.join(metaSquadDir, 'patterns');
  if (!fs.existsSync(dir)) {
    console.warn(`[squad-mesh] Patterns directory not found: ${dir} — returning empty list`);
    return [];
  }

  const patterns: SharedPattern[] = [];
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.json')) continue;
    try {
      const content = fs.readFileSync(path.join(dir, file), 'utf-8');
      patterns.push(JSON.parse(content) as SharedPattern);
    } catch {
      // Skip
    }
  }
  return patterns;
}

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Create a directory (and all parents) or throw a clear error on failure.
 */
function ensureDirectory(dirPath: string, entityType: string): void {
  try {
    fs.mkdirSync(dirPath, { recursive: true });
  } catch (err: unknown) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new Error(`Cannot save ${entityType}: failed to create directory ${dirPath}: ${reason}`);
  }
}

function extractLearningsFromMarkdown(
  content: string,
  sourceSquad: string,
  source: string,
): CrossSquadLearning[] {
  const learnings: CrossSquadLearning[] = [];

  const learningsSectionMatch = /^##\s+(?:Key\s+)?Learnings?\s*\n([\s\S]*?)(?=\n##\s+|$)/mi.exec(content);
  if (learningsSectionMatch?.[1]) {
    const items = learningsSectionMatch[1].split(/\n[-*]\s+/).filter(i => i.trim());
    for (const item of items) {
      if (item.trim().length < 10) continue;
      learnings.push({
        id: generateId('learn'),
        title: item.trim().slice(0, 100),
        content: item.trim(),
        sourceSquad,
        learnedAt: new Date().toISOString(),
        tags: [source],
        relevance: 'squad-specific',
      });
    }
  }

  return learnings;
}

function extractDecisionLearnings(content: string, sourceSquad: string): CrossSquadLearning[] {
  const learnings: CrossSquadLearning[] = [];

  const sections = content.split(/^##\s+Decision\s+\d+:/m).slice(1);
  for (const section of sections) {
    const titleLine = section.split('\n')[0]?.trim() ?? '';
    if (!titleLine) continue;

    const lowerSection = section.toLowerCase();
    const isCrossSquad = ['cross-squad', 'all squads', 'shared', 'multi-squad', 'meta-squad']
      .some(kw => lowerSection.includes(kw));

    if (isCrossSquad) {
      learnings.push({
        id: generateId('learn'),
        title: titleLine,
        content: section.trim().slice(0, 2000),
        sourceSquad,
        learnedAt: new Date().toISOString(),
        tags: ['decision', 'cross-squad'],
        relevance: 'universal',
      });
    }
  }

  return learnings;
}

function generateId(prefix: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return prefix + '-' + timestamp + '-' + random;
}
