#!/bin/bash
# sync-mesh.sh — Materialize remote squad state locally
#
# Reads mesh.yaml, fetches remote squads into local directories.
# Run before agent reads. No daemon. No service. ~30 lines.
#
# Usage: ./sync-mesh.sh [path-to-mesh.yaml]
# Requires: yq (https://github.com/mikefarah/yq), git, curl

set -euo pipefail
MESH_YAML="${1:-mesh.yaml}"

# Zone 2: Remote-trusted — git clone/pull
for squad in $(yq '.squads | to_entries[] | select(.value.zone == "remote-trusted") | .key' "$MESH_YAML"); do
  source=$(yq ".squads.\"$squad\".source" "$MESH_YAML")
  ref=$(yq ".squads.\"$squad\".ref // \"main\"" "$MESH_YAML")
  target=$(yq ".squads.\"$squad\".sync_to" "$MESH_YAML")

  if [ -d "$target/.git" ]; then
    git -C "$target" pull --rebase --quiet 2>/dev/null \
      || echo "⚠ $squad: pull failed (using stale)"
  else
    mkdir -p "$(dirname "$target")"
    git clone --quiet --depth 1 --branch "$ref" "$source" "$target" 2>/dev/null \
      || echo "⚠ $squad: clone failed (unavailable)"
  fi
done

# Zone 3: Remote-opaque — fetch published contracts
for squad in $(yq '.squads | to_entries[] | select(.value.zone == "remote-opaque") | .key' "$MESH_YAML"); do
  source=$(yq ".squads.\"$squad\".source" "$MESH_YAML")
  target=$(yq ".squads.\"$squad\".sync_to" "$MESH_YAML")
  auth=$(yq ".squads.\"$squad\".auth // \"\"" "$MESH_YAML")

  mkdir -p "$target"
  auth_flag=""
  if [ "$auth" = "bearer" ]; then
    token_var="$(echo "${squad}" | tr '[:lower:]-' '[:upper:]_')_TOKEN"
    [ -n "${!token_var:-}" ] && auth_flag="--header \"Authorization: Bearer ${!token_var}\""
  fi

  eval curl --silent --fail $auth_flag "$source" -o "$target/SUMMARY.md" 2>/dev/null \
    || echo "# ${squad} — unavailable ($(date))" > "$target/SUMMARY.md"
done

echo "✓ Mesh sync complete"
