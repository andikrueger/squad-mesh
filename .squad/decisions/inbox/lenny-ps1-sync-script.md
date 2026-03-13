# Decision: PowerShell sync-mesh.ps1 implementation choices

**Date:** 2025-07-16
**Author:** Lenny (Core Developer)
**Status:** Informational — no review needed

## Context

Created `distributed-mesh/sync-mesh.ps1` as a direct port of `sync-mesh.sh` for Windows/cross-platform use.

## Key Choices

1. **`$LASTEXITCODE` for git, try/catch for `Invoke-WebRequest`**: Native commands (git) don't throw on failure in PS 5.1, so we check exit codes manually. Cmdlets (Invoke-WebRequest) do throw, so try/catch is the right pattern there.

2. **`UseBasicParsing` on all web requests**: Required for PS 5.1 where default parsing depends on IE COM objects. No-op in PS 7+ but harmless.

3. **Same `yq` dependency**: No PowerShell-native YAML parser to avoid adding a module dependency. `yq` is already required by the bash version and is cross-platform.

## Impact

Windows users can now run mesh sync natively. No team decisions affected — this is a parallel implementation, not a replacement.
