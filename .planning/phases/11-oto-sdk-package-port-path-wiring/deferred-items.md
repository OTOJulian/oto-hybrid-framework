# Phase 11 Deferred Items

## 2026-05-25 — Plan 11-03 Broad Suite Stale Phase 2 Assertions

During Plan 11-03 verification, `npm test` reached unrelated stale assertions in the old Phase 2 tests:

- `tests/phase-02-bin-stub.test.cjs` still expects `oto v0.1.0`, but the package currently reports `oto v0.3.0`.
- `tests/phase-02-package-json.test.cjs` still expects the pre-SDK package shape with no top-level `dependencies` and no SDK files allowlist entries.

These failures predate Plan 11-03 and are caused by milestone evolution from Plans 11-01 and 11-02, not by the PATH-wiring changes in `bin/lib/install.cjs` or `bin/install.js`. The focused Plan 11-03 verification passed:

- `node --test tests/sdk-wiring.test.cjs`
- installer export and call-count checks for `isOtoSdkOnPath`, `trySelfLinkOtoSdk`, and `wireOtoSdk`
- `wireOtoSdk({ repoRoot })` with `bin/` prepended to PATH
