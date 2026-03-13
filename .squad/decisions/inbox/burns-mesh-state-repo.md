# Decision: Mesh State Repo Does NOT Need a Squad Installation

**Date:** 2026-03-16
**Author:** Burns (Lead Architect)
**Status:** Active
**Scope:** Distributed mesh — shared state repo setup

## Question

Does the shared git repo where participating squads report their state (the Zone 2 rendezvous point) need its own `.squad/` installation?

## Decision: NO

The mesh state repo is a **plain git repository**. It does not need:

- ❌ A `.squad/` folder
- ❌ Agents or charters
- ❌ A `meta-squad.config.ts` or any Squad tooling
- ❌ Skills, drops, boards, or any Squad convention

### What It DOES Need

1. **A root README.md** explaining what the repo is, who participates, and the directory convention.
2. **One directory per participating squad** (e.g., `auth-squad/`, `ci-squad/`, `data-pipeline/`).
3. **Each directory contains at minimum a `SUMMARY.md`** with the squad's current state.
4. **Git branch protections** (optional) to enforce write partitioning — each squad pushes only to its own directory.

That's it. Four things. Three of them are directories and files.

### Rationale

The mesh state repo is a **rendezvous point**, not an intelligent system. Its job is to hold files that squads push to and pull from. It has no agents, no decisions to make, no work to do. Installing Squad infrastructure would violate the core architecture principle: *"If it requires a running process, you've crossed the line."* A `.squad/` folder implies agents will read it. No agents live in the state repo. Nobody's home.

Write partitioning means each squad owns its directory. There are no merge conflicts, no coordination problems, no governance needs. Git permissions handle access control. The repo is a filesystem that happens to be distributed via git.

### Automation

| Phase | Automation | Status |
|-------|-----------|--------|
| **0–1** | None. Manual `git pull`/`git push`. | Current |
| **2** | Optional GitHub Actions health check (e.g., "has every squad pushed in the last 24h?"). Earned when staleness becomes a real problem. | Deferred |
| **3+** | N/A. No federation protocols, no sync daemons, no webhooks. | Not planned |

### What About a "Mesh Observer" Squad?

A squad that *watches* the mesh state repo and reports on cross-squad health, staleness, or coordination gaps — that's a legitimate future concept. But it would be:

- **A separate Squad project** on its own machine, with its own `.squad/` installation
- **NOT installed in the state repo itself**
- The state repo would be a Zone 2 remote in that observer squad's `mesh.yaml`

This is deferred until someone has a concrete pain point that requires it. Don't build it speculatively.

### Summary

The mesh state repo is to squads what a shared drive is to teams — a place to put files. You don't install an operating system on a shared drive. You don't install Squad on a state repo.
