# Decision: README Setup Guide Expansion

**Date:** 2026-03-14
**Author:** Smithers (Platform Engineer)
**Status:** Implemented
**Scope:** Documentation — `distributed-mesh/README.md`

## What Changed

Expanded the Getting Started section with a detailed "Setting Up Your First Mesh" walkthrough (5 steps) targeting someone starting from scratch. Updated Windows Note to reference the existing `sync-mesh.ps1` with usage examples. Added ps1 to the files table.

## Design Choices

1. **Two-tier setup docs:** Kept the existing "Same-Org Setup (4 steps)" as a quickstart alongside the new detailed walkthrough. Different readers, different needs — the quickstart is copy-paste for experienced users, the walkthrough explains what everything IS.

2. **Mesh state repo FAQ inline:** Added the "Does it need its own Squad?" callout directly in the walkthrough rather than a separate FAQ section. It's the question that hits at exactly that point in the setup flow.

3. **Windows Support section:** Upgraded from a dismissive "run via WSL" note to proper first-class documentation of the PowerShell script that already exists. The ps1 was built but never documented in the README.

## Impact

Documentation only. No code changes. No breaking changes.
