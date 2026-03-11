/**
 * Squad Discovery Engine — Local Filesystem Discovery
 *
 * Scans the local filesystem to find sibling squads by looking for
 * known markers (squad.config.ts, .squad/ directory, etc.).
 *
 * Resolution chain:
 *   1. Explicit squads passed in config
 *   2. SQUAD_DISCOVERY_ROOTS environment variable
 *   3. Registry file (.meta-squad/registry.yaml)
 *   4. Filesystem scan of configured roots
 *
 * @module discovery
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type {
  DiscoveryConfig,
  SquadIdentity,
  DiscoverySource,
  SquadMarker,
  RegistryFile,
  DiscoveryWarning,
  DiscoveryWarningCategory,
} from '../types.js';

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_MARKERS: SquadMarker[] = ['squad.config.ts', '.squad'];
const DEFAULT_EXCLUDE = ['node_modules', '.git', 'dist', 'build', '.next', 'coverage'];
const DEFAULT_REGISTRY_PATH = '.meta-squad/registry.yaml';

// ============================================================================
// Discovery Result
// ============================================================================

export interface DiscoveryResult {
  /** All discovered squads (deduplicated by name). */
  squads: SquadIdentity[];
  /** Squads found per source. */
  sources: Record<DiscoverySource, string[]>;
  /** Any errors encountered during scanning. */
  errors: DiscoveryError[];
  /** Categorized warnings — richer view of errors with machine-readable categories. */
  warnings: DiscoveryWarning[];
  /** Timestamp of this discovery run. */
  discoveredAt: string;
}

export interface DiscoveryError {
  path: string;
  error: string;
}

// ============================================================================
// Main Discovery Function
// ============================================================================

/**
 * Discover squads based on the provided configuration.
 *
 * ```ts
 * const result = await discoverSquads({
 *   mode: 'hybrid',
 *   scanRoots: ['..'],
 *   markers: ['squad.config.ts', '.squad'],
 * });
 * console.log(result.squads); // SquadIdentity[]
 * ```
 */
export async function discoverSquads(
  config: DiscoveryConfig,
  explicitSquads?: SquadIdentity[],
): Promise<DiscoveryResult> {
  const result: DiscoveryResult = {
    squads: [],
    sources: { filesystem: [], registry: [], env: [], explicit: [], config: [] },
    errors: [],
    warnings: [],
    discoveredAt: new Date().toISOString(),
  };

  const seen = new Set<string>();

  // 1. Explicit squads (highest priority)
  if (explicitSquads) {
    for (const squad of explicitSquads) {
      if (!seen.has(squad.name)) {
        seen.add(squad.name);
        result.squads.push({ ...squad, discoveredVia: 'explicit' });
        result.sources.explicit.push(squad.name);
      }
    }
  }

  // 2. Environment variable override
  const envRoots = process.env['SQUAD_DISCOVERY_ROOTS'];
  if (envRoots) {
    const roots = envRoots.split(path.delimiter);
    for (const root of roots) {
      const found = scanDirectory(root, config.markers ?? DEFAULT_MARKERS, config.exclude ?? DEFAULT_EXCLUDE);
      for (const squad of found.squads) {
        if (!seen.has(squad.name)) {
          seen.add(squad.name);
          result.squads.push({ ...squad, discoveredVia: 'env' });
          result.sources.env.push(squad.name);
        }
      }
      result.errors.push(...found.errors);
      result.warnings.push(...found.warnings);
    }
  }

  // 3. Registry file (for 'registry' and 'hybrid' modes)
  if (config.mode === 'registry' || config.mode === 'hybrid') {
    const registryPath = config.registryPath ?? DEFAULT_REGISTRY_PATH;
    const registrySquads = loadRegistry(registryPath);
    if (registrySquads) {
      for (const squad of registrySquads) {
        if (!seen.has(squad.name)) {
          seen.add(squad.name);
          result.squads.push({ ...squad, discoveredVia: 'registry' });
          result.sources.registry.push(squad.name);
        }
      }
    }
  }

  // 4. Filesystem scan (for 'local' and 'hybrid' modes)
  if (config.mode === 'local' || config.mode === 'hybrid') {
    const scanRoots = config.scanRoots ?? ['..'];
    const markers = config.markers ?? DEFAULT_MARKERS;
    const exclude = config.exclude ?? DEFAULT_EXCLUDE;

    for (const root of scanRoots) {
      const resolvedRoot = path.resolve(root);
      const found = scanDirectory(resolvedRoot, markers, exclude);
      for (const squad of found.squads) {
        if (!seen.has(squad.name)) {
          seen.add(squad.name);
          result.squads.push(squad);
          result.sources.filesystem.push(squad.name);
        }
      }
      result.errors.push(...found.errors);
      result.warnings.push(...found.warnings);
    }
  }

  return result;
}

// ============================================================================
// Filesystem Scanning
// ============================================================================

interface ScanResult {
  squads: SquadIdentity[];
  errors: DiscoveryError[];
  warnings: DiscoveryWarning[];
}

/**
 * Scan a directory for squad markers in its immediate children.
 * Does NOT recurse deeply — only checks direct child directories.
 */
function scanDirectory(
  rootDir: string,
  markers: SquadMarker[],
  exclude: string[],
): ScanResult {
  const squads: SquadIdentity[] = [];
  const errors: DiscoveryError[] = [];
  const warnings: DiscoveryWarning[] = [];

  // Windows MAX_PATH guard: paths >250 chars fail silently with fs APIs.
  // Try UNC extended-length prefix (\\?\) on Windows; report on all platforms.
  const WIN_PATH_THRESHOLD = 250;
  let effectiveDir = rootDir;

  if (rootDir.length > WIN_PATH_THRESHOLD) {
    if (process.platform === 'win32') {
      if (!rootDir.startsWith('\\\\?\\')) {
        effectiveDir = `\\\\?\\${rootDir}`;
      }
      try {
        fs.accessSync(effectiveDir, fs.constants.R_OK);
      } catch {
        const msg = `Path exceeds Windows MAX_PATH limit (${rootDir.length} chars). UNC prefix (\\\\?\\) also failed — directory cannot be scanned.`;
        warnings.push({ path: rootDir, message: msg, category: 'path-too-long' });
        errors.push({ path: rootDir, error: msg });
        return { squads, errors, warnings };
      }
    } else if (rootDir.length > 4096) {
      const msg = `Path length (${rootDir.length} chars) exceeds filesystem limits`;
      warnings.push({ path: rootDir, message: msg, category: 'path-too-long' });
      errors.push({ path: rootDir, error: msg });
      return { squads, errors, warnings };
    }
  }

  if (!fs.existsSync(effectiveDir)) {
    const msg = 'Directory does not exist';
    warnings.push({ path: rootDir, message: msg, category: 'not-found' });
    errors.push({ path: rootDir, error: msg });
    return { squads, errors, warnings };
  }

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(effectiveDir, { withFileTypes: true });
  } catch (err) {
    const warning = categorizeError(rootDir, err);
    warnings.push(warning);
    errors.push({ path: rootDir, error: `Cannot read directory: ${String(err)}` });
    return { squads, errors, warnings };
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (exclude.includes(entry.name)) continue;

    const candidatePath = path.join(rootDir, entry.name);
    const detectedMarker = detectSquadMarker(candidatePath, markers);

    if (detectedMarker) {
      try {
        const identity = extractSquadIdentity(candidatePath, detectedMarker);
        squads.push(identity);
      } catch (err) {
        const warning = categorizeError(candidatePath, err);
        warnings.push(warning);
        errors.push({ path: candidatePath, error: `Failed to extract identity: ${String(err)}` });
      }
    }
  }

  return { squads, errors, warnings };
}

/**
 * Check if a directory contains any of the specified squad markers.
 */
function detectSquadMarker(dir: string, markers: SquadMarker[]): SquadMarker | null {
  for (const marker of markers) {
    const markerPath = path.join(dir, marker);
    if (fs.existsSync(markerPath)) {
      return marker;
    }
  }
  return null;
}

/**
 * Extract squad identity from a directory that has a known marker.
 */
function extractSquadIdentity(dir: string, marker: SquadMarker): SquadIdentity {
  const name = path.basename(dir);
  let purpose = `Squad discovered at ${dir}`;

  // Try to extract purpose from various config sources
  if (marker === '.squad' || marker === '.squad/config.json') {
    purpose = extractPurposeFromSquadDir(dir) ?? purpose;
  }

  // Try to extract from package.json
  const pkgPath = path.join(dir, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')) as Record<string, unknown>;
      if (typeof pkg.description === 'string' && pkg.description.length > 0) {
        purpose = pkg.description;
      }
    } catch {
      // Ignore parse errors
    }
  }

  return {
    name,
    purpose,
    path: path.resolve(dir),
    discoveredVia: 'filesystem',
    registeredAt: new Date().toISOString(),
  };
}

/**
 * Try to extract purpose from a .squad/ directory's config or team.md.
 */
function extractPurposeFromSquadDir(dir: string): string | null {
  // Try config.json
  const configPath = path.join(dir, '.squad', 'config.json');
  if (fs.existsSync(configPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8')) as Record<string, unknown>;
      if (typeof config.purpose === 'string') return config.purpose;
      if (typeof config.description === 'string') return config.description;
    } catch {
      // Ignore
    }
  }

  // Try team.md first line
  const teamPath = path.join(dir, '.squad', 'team.md');
  if (fs.existsSync(teamPath)) {
    try {
      const content = fs.readFileSync(teamPath, 'utf-8');
      const firstLine = content.split('\n').find((l: string) => l.trim().length > 0 && !l.startsWith('#'));
      if (firstLine) return firstLine.trim().slice(0, 200);
    } catch {
      // Ignore
    }
  }

  return null;
}

// ============================================================================
// Registry Loading
// ============================================================================

/**
 * Load squad identities from a registry YAML file.
 * Returns null if the registry doesn't exist or can't be parsed.
 *
 * Note: Uses a simple YAML subset parser to avoid external dependencies.
 * For full YAML support, consumers should use their own YAML library.
 */
function loadRegistry(registryPath: string): SquadIdentity[] | null {
  const resolvedPath = path.resolve(registryPath);
  if (!fs.existsSync(resolvedPath)) return null;

  try {
    const content = fs.readFileSync(resolvedPath, 'utf-8');
    // Simple JSON-based registry for now (YAML support via optional dep)
    if (registryPath.endsWith('.json')) {
      const parsed = JSON.parse(content) as RegistryFile;
      return parsed.squads;
    }

    // For .yaml/.yml, attempt to parse the squads array from a simple format
    return parseSimpleYamlRegistry(content);
  } catch {
    return null;
  }
}

/**
 * Minimal YAML registry parser for the subset we need.
 * Parses a flat list of squad entries without needing a full YAML library.
 *
 * Expected format:
 * ```yaml
 * squads:
 *   - name: my-squad
 *     purpose: Does the thing
 *     path: /abs/path/to/squad
 * ```
 */
function parseSimpleYamlRegistry(content: string): SquadIdentity[] {
  const squads: SquadIdentity[] = [];
  const lines = content.split('\n');
  let inSquads = false;
  let current: Partial<SquadIdentity> | null = null;

  for (const line of lines) {
    const trimmed = line.trimEnd();

    if (trimmed === 'squads:') {
      inSquads = true;
      continue;
    }

    if (!inSquads) continue;

    // New squad entry
    if (/^\s+-\s+name:\s+/.test(trimmed)) {
      if (current?.name && current?.purpose && current?.path) {
        squads.push({
          name: current.name,
          purpose: current.purpose,
          path: current.path,
          discoveredVia: 'registry',
          registeredAt: current.registeredAt ?? new Date().toISOString(),
        });
      }
      current = {};
      const match = /name:\s+(.+)/.exec(trimmed);
      if (match?.[1]) current.name = match[1].trim().replace(/^["']|["']$/g, '');
      continue;
    }

    if (current && /^\s+purpose:\s+/.test(trimmed)) {
      const match = /purpose:\s+(.+)/.exec(trimmed);
      if (match?.[1]) current.purpose = match[1].trim().replace(/^["']|["']$/g, '');
    }

    if (current && /^\s+path:\s+/.test(trimmed)) {
      const match = /path:\s+(.+)/.exec(trimmed);
      if (match?.[1]) current.path = match[1].trim().replace(/^["']|["']$/g, '');
    }

    if (current && /^\s+registeredAt:\s+/.test(trimmed)) {
      const match = /registeredAt:\s+(.+)/.exec(trimmed);
      if (match?.[1]) current.registeredAt = match[1].trim().replace(/^["']|["']$/g, '');
    }

    // Non-indented line breaks us out of squads section
    if (inSquads && trimmed.length > 0 && !trimmed.startsWith(' ') && !trimmed.startsWith('-')) {
      inSquads = false;
    }
  }

  // Don't forget the last entry
  if (current?.name && current?.purpose && current?.path) {
    squads.push({
      name: current.name,
      purpose: current.purpose,
      path: current.path,
      discoveredVia: 'registry',
      registeredAt: current.registeredAt ?? new Date().toISOString(),
    });
  }

  return squads;
}

// ============================================================================
// Error Categorization
// ============================================================================

/**
 * Categorize a filesystem error into a DiscoveryWarning with a machine-readable category.
 */
function categorizeError(errorPath: string, err: unknown): DiscoveryWarning {
  const code = (err as NodeJS.ErrnoException)?.code;
  const raw = String(err);

  if (code === 'EACCES' || code === 'EPERM') {
    return {
      path: errorPath,
      message: `Permission denied — cannot read directory (${code})`,
      category: 'permission-denied',
    };
  }
  if (code === 'ENAMETOOLONG') {
    return {
      path: errorPath,
      message: `Path name too long for this filesystem (${code})`,
      category: 'path-too-long',
    };
  }
  if (code === 'ENOENT') {
    return {
      path: errorPath,
      message: `Directory not found — may have been deleted mid-scan (${code})`,
      category: 'not-found',
    };
  }
  return {
    path: errorPath,
    message: raw,
    category: 'unknown',
  };
}

// ============================================================================
// Discovery Summary
// ============================================================================

/**
 * Generate a one-line summary suitable for printing at the top of discovery output.
 * Returns null if there are no warnings.
 *
 * ```ts
 * const summary = formatDiscoverySummary(result);
 * if (summary) console.log(summary);
 * ```
 */
export function formatDiscoverySummary(result: DiscoveryResult): string | null {
  if (result.warnings.length === 0) return null;
  return `⚠️ ${result.warnings.length} director${result.warnings.length === 1 ? 'y' : 'ies'} could not be scanned (see warnings)`;
}

// ============================================================================
// Convenience exports
// ============================================================================

/** Check if a directory looks like a squad root. */
export function isSquadRoot(dir: string, markers?: SquadMarker[]): boolean {
  return detectSquadMarker(dir, markers ?? DEFAULT_MARKERS) !== null;
}

/** Get the default discovery configuration. */
export function getDefaultDiscoveryConfig(): DiscoveryConfig {
  return {
    mode: 'hybrid',
    scanRoots: ['..'],
    markers: [...DEFAULT_MARKERS],
    exclude: [...DEFAULT_EXCLUDE],
  };
}
