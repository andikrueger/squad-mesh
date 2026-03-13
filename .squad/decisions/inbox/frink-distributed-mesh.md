# Decision: Distributed Mesh Uses Git Repos as Transport

**Author:** Frink (Systems Engineer)
**Date:** 2026-03-13
**Scope:** Cross-machine, cross-org information flow

## Decision

Distributed mesh coordination uses git repos — not servers, APIs, or new protocols — as the transport layer between squads on different machines and different orgs.

## Key Design

- **Same org:** One mesh git repo, everyone clones. `git push` = publish, `git pull` = subscribe.
- **Cross org:** Separate mesh repo per trust boundary. Remote repos cloned read-only.
- **New artifact:** `.mesh/.remotes` file lists remote mesh repo URLs + trust level.
- **Sync:** `git pull` before reading, `git push` after writing. Agent can do this directly.
- **Trust model:** Git repo permissions ARE the trust boundary. Can clone = can see. Can't clone = invisible.

## What Doesn't Change

Agent interface is unchanged: read local files, write local files, discover via `ls`. The distribution tax is one flat file (`.remotes`) and one git command (`git pull`).

## What We're NOT Building

No federation protocol, no discovery service, no auth system, no HTTP APIs, no running servers, no MCP federation layer, no A2A endpoints.

## Artifact

Full analysis: `architecture-review/frink-distributed-information-flow.md`
