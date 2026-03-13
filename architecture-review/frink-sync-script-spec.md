# sync-mesh — Script Specification

> **Author:** Frink (Systems Engineer)
> **Status:** Spec v1.0
> **Purpose:** Define the exact requirements for the mesh sync script

---

## Decision: Cross-platform Node.js

**Recommendation: Node.js (single script, no dependencies beyond git and curl).**

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| Bash only | Natural for git/curl, ~30 lines | Doesn't work on Windows without WSL/Git Bash | ❌ Not cross-platform |
| PowerShell only | Native on Windows | Alien syntax for Unix users, git interop varies | ❌ Not cross-platform |
| Both (bash + ps1) | Native on each platform | Two scripts to maintain, drift risk | ⚠️ Acceptable fallback |
| **Node.js** | **Cross-platform, already in toolchain, `child_process.execSync` for git/curl** | Slightly more verbose than bash | **✅ Recommended** |

**Rationale:** Every Squad environment already has Node.js (the Squad SDK is Node-based). The script shells out to `git` and `curl` — both available on all platforms. Node.js `child_process.execSync` is the thinnest wrapper. No npm dependencies. No build step. One file runs everywhere.

**Fallback:** If the team prefers shell scripts, ship `sync-mesh.sh` (bash) and `sync-mesh.ps1` (PowerShell). But maintaining two scripts for 30 lines of logic is more complexity than one 50-line Node script.

---

## Requirements

### Inputs

1. **Registry file path** — path to `squads.yaml` (default: `./squads.yaml`)
2. **Environment variables** — auth tokens referenced by `token_env` fields in the registry

### Outputs

1. **Materialized files** — remote squad state written to `sync_to` directories
2. **Stdout** — one line per squad synced, with status (✓ synced / ⚠ stale / ✗ failed)
3. **Exit code** — 0 if all critical syncs succeeded, 1 if any Zone 2 sync failed (Zone 3 failures are non-fatal)

### Behavior by Zone

**Zone 1 (local):** Skip. Files are already on disk.

**Zone 2 (remote-trusted):**
1. If `sync_to` directory exists and contains `.git/` → `git -C <sync_to> pull --rebase --quiet`
2. If `sync_to` directory does not exist → `git clone --quiet --depth 1 --branch <ref> <source> <sync_to>`
3. If git operation fails → print warning, leave existing files (stale data > no data), set non-fatal flag
4. Shallow clone (`--depth 1`) to minimize disk and network usage

**Zone 3 (remote-opaque):**
1. Create `sync_to` directory if it doesn't exist
2. If `auth: bearer` and `token_env` is set → read token from environment, add `Authorization: Bearer <token>` header
3. `curl --silent --fail <source> -o <sync_to>/SUMMARY.md`
4. If fetch fails → write a stub file: `# {name} — unavailable ({timestamp})\n\nFetch failed. Using stale data if available.`
5. Zone 3 failures are always non-fatal

### Error Handling

- **Network failure:** Log warning, keep stale files. An agent with stale context is better than an agent with no context.
- **Auth failure:** Log error with squad name (not the token). Suggest checking the `token_env` variable.
- **Missing `squads.yaml`:** Exit with error. No config = nothing to sync.
- **Missing `git` or `curl`:** Check at script start, exit with clear error message.

### Performance

- **Sync squads sequentially.** Parallel git pulls from multiple remotes can cause SSH multiplexing issues. Sequential is simpler and fast enough (seconds, not minutes).
- **Shallow clones** — always `--depth 1` for initial clone. No history needed.
- **Quiet mode** — suppress git and curl output unless there's an error.

---

## Minimum Viable Implementation (Node.js)

```js
#!/usr/bin/env node
// sync-mesh.js — Materialize remote squad state locally
// Dependencies: git, curl (both standard on dev machines)
// Node.js built-ins only — no npm packages

const { execSync } = require('child_process');
const { readFileSync, mkdirSync, writeFileSync, existsSync } = require('fs');
const { join } = require('path');

const registryPath = process.argv[2] || 'squads.yaml';

// Parse YAML without a dependency — squads.yaml is simple enough
// for line-based parsing OR use: JSON.parse(execSync(`yq -o json '.' ${registryPath}`))
// For MVP, require yq (already common in dev toolchains)
const squadsJson = JSON.parse(
  execSync(`yq -o json '.' "${registryPath}"`, { encoding: 'utf-8' })
);
const squads = squadsJson.squads || [];

let failures = 0;

for (const squad of squads) {
  const { name, zone, source, ref = 'main', sync_to, auth, token_env } = squad;

  if (zone === 'local') continue;

  if (zone === 'remote-trusted') {
    try {
      if (existsSync(join(sync_to, '.git'))) {
        execSync(`git -C "${sync_to}" pull --rebase --quiet`, { stdio: 'pipe' });
      } else {
        mkdirSync(sync_to, { recursive: true });
        execSync(
          `git clone --quiet --depth 1 --branch "${ref}" "${source}" "${sync_to}"`,
          { stdio: 'pipe' }
        );
      }
      console.log(`✓ ${name} (git pull)`);
    } catch (e) {
      console.error(`⚠ ${name}: git sync failed (using stale data)`);
      failures++;
    }
  }

  if (zone === 'remote-opaque') {
    try {
      mkdirSync(sync_to, { recursive: true });
      let authHeader = '';
      if (auth === 'bearer' && token_env && process.env[token_env]) {
        authHeader = `-H "Authorization: Bearer ${process.env[token_env]}"`;
      }
      execSync(
        `curl --silent --fail ${authHeader} "${source}" -o "${join(sync_to, 'SUMMARY.md')}"`,
        { stdio: 'pipe' }
      );
      console.log(`✓ ${name} (http fetch)`);
    } catch (e) {
      const stub = `# ${name} — unavailable (${new Date().toISOString()})\n\nFetch failed.\n`;
      writeFileSync(join(sync_to, 'SUMMARY.md'), stub);
      console.error(`⚠ ${name}: fetch failed (stub written)`);
      // Zone 3 failures are non-fatal — don't increment failures
    }
  }
}

const synced = squads.filter(s => s.zone !== 'local').length;
console.log(`\nMesh sync complete: ${synced} remote squads processed`);
process.exit(failures > 0 ? 1 : 0);
```

**Line count:** ~55 lines. One file. Zero npm dependencies. Shells out to `git` and `curl`.

**External tool dependency:** `yq` for YAML parsing. If the team wants to eliminate this, the alternative is either:
- (a) Use JSON format for the registry instead of YAML
- (b) Write a 15-line YAML subset parser (the schema is flat enough)
- (c) Bundle `js-yaml` as a single vendored file

**Recommendation:** Keep `yq` for now. It's commonly installed alongside `jq` in dev toolchains. If it becomes a friction point, switch the registry to JSON or vendor a minimal parser.

---

## Bash Fallback (for teams that prefer shell)

```bash
#!/bin/bash
# sync-mesh.sh — ~30 lines
set -euo pipefail
REGISTRY="${1:-squads.yaml}"

# Zone 2: git
for squad in $(yq '.squads[] | select(.zone == "remote-trusted") | .name' "$REGISTRY"); do
  source=$(yq ".squads[] | select(.name == \"$squad\") | .source" "$REGISTRY")
  ref=$(yq ".squads[] | select(.name == \"$squad\") | .ref // \"main\"" "$REGISTRY")
  target=$(yq ".squads[] | select(.name == \"$squad\") | .sync_to" "$REGISTRY")
  if [ -d "$target/.git" ]; then
    git -C "$target" pull --rebase --quiet 2>/dev/null && echo "✓ $squad" || echo "⚠ $squad: stale"
  else
    git clone --quiet --depth 1 --branch "$ref" "$source" "$target" 2>/dev/null \
      && echo "✓ $squad" || echo "⚠ $squad: clone failed"
  fi
done

# Zone 3: curl
for squad in $(yq '.squads[] | select(.zone == "remote-opaque") | .name' "$REGISTRY"); do
  source=$(yq ".squads[] | select(.name == \"$squad\") | .source" "$REGISTRY")
  target=$(yq ".squads[] | select(.name == \"$squad\") | .sync_to" "$REGISTRY")
  mkdir -p "$target"
  curl --silent --fail "$source" -o "$target/SUMMARY.md" 2>/dev/null \
    && echo "✓ $squad" || echo "⚠ $squad: fetch failed"
done

echo "Mesh sync complete"
```

---

## Integration Point

The sync script is invoked at one point: **agent startup, before any file reads.**

```
# In agent's system prompt or startup wrapper:
node sync-mesh.js squads.yaml   # or: bash sync-mesh.sh squads.yaml
```

That's it. One invocation. Then the agent reads files as normal.
