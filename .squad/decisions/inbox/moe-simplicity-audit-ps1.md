# Simplicity Audit: sync-mesh.ps1 + README/SKILL Expansion

**Author:** Moe (Skeptic/Critic)  
**Date:** 2026-03-14  
**Requested by:** Scribe  
**Status:** ⚠️ APPROVED WITH NOTES

## Scope

Three additions to `distributed-mesh/`:
1. `sync-mesh.ps1` — PowerShell port of sync-mesh.sh (39 lines)
2. `README.md` — expanded with setup walkthrough + Windows support section
3. `SKILL.md` — updated with Mesh State Repo pattern section

## Verdict

Ship it, but fix two things first.

### ✅ What Passes

| Check | Result |
|-------|--------|
| File count (4 → 5) | **Pass.** User is on Windows. Bash can't run natively. Platform parity is justified. |
| New dependencies | **Pass.** ps1 uses Invoke-WebRequest (built-in), replacing curl. yq + git unchanged. Zero new deps. |
| Scope creep | **Pass.** Mesh State Repo pattern is anti-pattern clarification, not a new concept. Windows section is 7 lines. |
| Overengineering (8-file test) | **Pass.** 5 files for ~75 lines of code. At the edge, but under ceiling. |

### ⚠️ What Needs Fixing

**1. SKILL.md exceeds approved budget.**  
Original audit conditionally approved SKILL.md at ≤60 lines. Current: 86 lines (43% over). The new Mesh State Repo section (9 lines) is justified, but the file was already over budget before this addition. Scribe should tighten the existing content to get back under 70 lines (giving 10-line grace for the new section).

**2. README has duplicate setup instructions.**  
"Getting Started" walkthrough (lines 76–130, ~55 lines) and "Same-Org Setup (4 steps)" (lines 132–151, ~20 lines) cover the same ground: create shared repo, add config, run sync. The verbose walkthrough duplicates the compressed version.  
**Recommendation:** Cut the "Getting Started" section (lines 76–130) and the "Prerequisites" section above it (lines 77–79). Promote "Same-Org Setup (4 steps)" as the primary getting-started path. Keep the "mesh state repo" callout box (line 130) — move it under Same-Org Setup. This removes ~40 lines of redundancy.

## Numbers

| File | Lines |
|------|-------|
| README.md | 164 |
| SKILL.md | 86 |
| sync-mesh.ps1 | 39 |
| sync-mesh.sh | 39 |
| mesh.yaml.example | 36 |
| **Total** | **364** |

Docs-to-code ratio: 3.3:1 (286 lines docs / 78 lines code). After fixing duplicates: ~320 lines, ratio ~3:1. Acceptable for a settled architecture reference.

## Decision

⚠️ APPROVED WITH NOTES — ship after:
1. Trim SKILL.md to ≤70 lines
2. Deduplicate README setup sections (cut ~40 lines)
