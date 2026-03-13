# squads.yaml — Schema Specification

> **Author:** Frink (Systems Engineer)
> **Status:** Spec v1.0
> **Purpose:** Define the exact YAML schema for the distributed squad registry

---

## Schema

```yaml
# squads.yaml — The distributed squad registry
# One file. Three zones. Zero running services.
#
# This file IS the discovery service. Agents read it to know
# who exists and where to find them. Changes go through PR review.

squads:
  # ─────────────────────────────────────────────────
  # Zone 1: LOCAL — same filesystem, direct reads
  # ─────────────────────────────────────────────────
  - name: auth-squad                # REQUIRED — unique squad identifier
    zone: local                     # REQUIRED — one of: local, remote-trusted, remote-opaque
    path: ../auth-squad             # REQUIRED for local — relative path to squad root
    # No source, no sync_to — files are already on disk

  # ─────────────────────────────────────────────────
  # Zone 2: REMOTE-TRUSTED — different host, same org
  # Transport: git clone/pull
  # ─────────────────────────────────────────────────
  - name: ci-squad
    zone: remote-trusted
    source: git@github.com:our-org/ci-squad-mesh.git   # REQUIRED — git clone URL
    ref: main                                           # OPTIONAL — branch/tag, default: main
    sync_to: .mesh/remotes/ci-squad                     # REQUIRED — local path for materialized files

  # ─────────────────────────────────────────────────
  # Zone 3: REMOTE-OPAQUE — different org, published contracts only
  # Transport: HTTP fetch (curl)
  # ─────────────────────────────────────────────────
  - name: partner-fraud
    zone: remote-opaque
    source: https://partner.example.com/squad-contracts/fraud/SUMMARY.md  # REQUIRED — fetch URL
    sync_to: .mesh/remotes/partner-fraud                                  # REQUIRED — local landing path
    auth: bearer                    # OPTIONAL — auth method (bearer | none)
    token_env: PARTNER_FRAUD_TOKEN  # OPTIONAL — env var holding the auth token
```

## Field Reference

| Field | Required | Zones | Type | Description |
|-------|----------|-------|------|-------------|
| `name` | Yes | All | string | Unique squad identifier. Used in paths and log messages. |
| `zone` | Yes | All | enum | `local`, `remote-trusted`, or `remote-opaque` |
| `path` | Zone 1 only | local | string | Relative filesystem path to the squad root |
| `source` | Zones 2, 3 | remote-* | string | Git clone URL (Zone 2) or HTTP fetch URL (Zone 3) |
| `ref` | No | remote-trusted | string | Git branch or tag. Default: `main` |
| `sync_to` | Zones 2, 3 | remote-* | string | Local directory where remote state materializes |
| `auth` | No | remote-opaque | enum | Auth method: `bearer` or `none` (default: `none`) |
| `token_env` | No | remote-opaque | string | Environment variable name holding the auth token |

## Rules

1. **`name` must be unique** across all entries.
2. **Zone 1 entries need `path` only.** No source, no sync_to — files are native.
3. **Zone 2 entries need `source` + `sync_to`.** The source is a git URL. The sync script clones/pulls from it.
4. **Zone 3 entries need `source` + `sync_to`.** The source is an HTTP URL pointing to SUMMARY.md (or a directory). Auth fields are optional.
5. **`sync_to` paths are relative** to the project root. They should land under `.mesh/remotes/` by convention.
6. **`token_env` names the env var, not the token itself.** Never put secrets in YAML. The sync script reads `${!token_env}` at runtime.
7. **This file is version-controlled.** Adding a squad = PR to this file. Removing a squad = delete the entry. The YAML file IS the governance record.

## Minimal Example (local only)

```yaml
# No distribution — just local squads
squads:
  - name: auth-squad
    zone: local
    path: ../auth-squad
  - name: api-squad
    zone: local
    path: ../api-squad
```

## Full Example (all three zones)

```yaml
squads:
  - name: auth-squad
    zone: local
    path: ../auth-squad

  - name: api-squad
    zone: local
    path: ../api-squad

  - name: ci-squad
    zone: remote-trusted
    source: git@github.com:our-org/ci-squad-mesh.git
    ref: main
    sync_to: .mesh/remotes/ci-squad

  - name: data-squad
    zone: remote-trusted
    source: git@github.com:our-org/data-pipeline.git
    ref: main
    sync_to: .mesh/remotes/data-squad

  - name: partner-fraud
    zone: remote-opaque
    source: https://partner.example.com/squad-contracts/fraud/SUMMARY.md
    sync_to: .mesh/remotes/partner-fraud
    auth: bearer
    token_env: PARTNER_FRAUD_TOKEN

  - name: oss-metrics
    zone: remote-opaque
    source: https://raw.githubusercontent.com/oss-org/metrics-squad/main/SUMMARY.md
    sync_to: .mesh/remotes/oss-metrics
```
