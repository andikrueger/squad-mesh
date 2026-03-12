/**
 * Mesh Bridge — Programmatic API for squad-to-mesh communication
 *
 * This module is the reason `squad-mesh` exists in node_modules.
 * It reads the backpointer (.squad/mesh-link.json) and provides
 * access to shared knowledge, patterns, and mesh status.
 *
 * Usage from a squad project:
 * ```ts
 * import { readMeshLink, getMeshLearnings, getMeshPatterns } from 'squad-mesh';
 *
 * const link = readMeshLink();
 * if (link) {
 *   const learnings = getMeshLearnings(link);
 *   const patterns = getMeshPatterns(link);
 *   console.log(`Connected to mesh "${link.meshName}" with ${learnings.length} learnings`);
 * }
 * ```
 *
 * @module bridge
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { MeshLink, CrossSquadLearning, SharedPattern } from '../types.js';
import { loadLearnings, loadPatterns, saveLearning } from '../knowledge/index.js';
import { META_SQUAD_DIR, REGISTRY_FILE } from '../conventions.js';

// ============================================================================
// Mesh Link Resolution
// ============================================================================

const MESH_LINK_FILE = 'mesh-link.json';
const SQUAD_DIR = '.squad';

/**
 * Read the mesh backpointer from a squad directory.
 *
 * Looks for `.squad/mesh-link.json` in the given directory (defaults to cwd).
 * Returns the parsed {@link MeshLink} or `null` if the file doesn't exist
 * or cannot be read.
 */
export function readMeshLink(squadDir?: string): MeshLink | null {
  try {
    const dir = path.resolve(squadDir ?? process.cwd());
    const linkPath = path.join(dir, SQUAD_DIR, MESH_LINK_FILE);

    if (!fs.existsSync(linkPath)) {
      return null;
    }

    const content = fs.readFileSync(linkPath, 'utf-8');
    const parsed = JSON.parse(content) as MeshLink;

    // Basic validation — meshRoot, registeredAt, registryPath, version are required; meshName may be empty
    if (!parsed.meshRoot || !parsed.registeredAt || !parsed.registryPath || !parsed.version) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

// ============================================================================
// Shared Knowledge Access
// ============================================================================

/**
 * Get all cross-squad learnings from the mesh.
 *
 * Reads the mesh link (from `link` param or cwd), resolves the mesh's
 * `.meta-squad/` directory, and loads all learnings from it.
 * Returns an empty array if the mesh link is missing or learnings
 * directory doesn't exist.
 */
export function getMeshLearnings(link?: MeshLink): CrossSquadLearning[] {
  try {
    const resolved = link ?? readMeshLink();
    if (!resolved) return [];

    const metaSquadDir = path.join(resolved.meshRoot, META_SQUAD_DIR);
    return loadLearnings(metaSquadDir);
  } catch {
    return [];
  }
}

/**
 * Get all shared patterns from the mesh.
 *
 * Same resolution pattern as {@link getMeshLearnings} but for patterns.
 */
export function getMeshPatterns(link?: MeshLink): SharedPattern[] {
  try {
    const resolved = link ?? readMeshLink();
    if (!resolved) return [];

    const metaSquadDir = path.join(resolved.meshRoot, META_SQUAD_DIR);
    return loadPatterns(metaSquadDir);
  } catch {
    return [];
  }
}

// ============================================================================
// Knowledge Contribution
// ============================================================================

/**
 * Contribute a learning back to the mesh.
 *
 * Generates `id` and `learnedAt` automatically. The learning is saved
 * to the mesh's `.meta-squad/learnings/` directory.
 *
 * @returns `true` if saved successfully, `false` if mesh link not found
 *          or saving failed.
 */
export function contributeLearning(
  learning: Omit<CrossSquadLearning, 'id' | 'learnedAt'>,
  link?: MeshLink,
): boolean {
  try {
    const resolved = link ?? readMeshLink();
    if (!resolved) return false;

    const metaSquadDir = path.join(resolved.meshRoot, META_SQUAD_DIR);
    const fullLearning: CrossSquadLearning = {
      ...learning,
      id: generateId('learn'),
      learnedAt: new Date().toISOString(),
    };

    saveLearning(metaSquadDir, fullLearning);
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// Mesh Status
// ============================================================================

/**
 * Quick summary of the mesh this squad belongs to.
 *
 * @returns A status summary, or `null` if the squad is not linked to a mesh.
 */
export function getMeshStatus(): {
  meshName: string;
  meshRoot: string;
  squadCount: number;
  learningCount: number;
  patternCount: number;
} | null {
  try {
    const link = readMeshLink();
    if (!link) return null;

    const metaSquadDir = path.join(link.meshRoot, META_SQUAD_DIR);
    const learnings = loadLearnings(metaSquadDir);
    const patterns = loadPatterns(metaSquadDir);
    const squadCount = countSquadsInRegistry(path.join(metaSquadDir, REGISTRY_FILE));

    return {
      meshName: link.meshName,
      meshRoot: link.meshRoot,
      squadCount,
      learningCount: learnings.length,
      patternCount: patterns.length,
    };
  } catch {
    return null;
  }
}

// ============================================================================
// Internal Helpers
// ============================================================================

function generateId(prefix: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Count squads listed in a registry.yaml file.
 * Uses a simple line-scan rather than pulling in a YAML parser.
 */
function countSquadsInRegistry(registryPath: string): number {
  try {
    if (!fs.existsSync(registryPath)) return 0;

    const content = fs.readFileSync(registryPath, 'utf-8');
    // Each squad entry starts with "- name:" under the "squads:" key
    const matches = content.match(/^\s*-\s+name:/gm);
    return matches?.length ?? 0;
  } catch {
    return 0;
  }
}
