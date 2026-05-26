---
phase: 11-oto-sdk-package-port-path-wiring
verified: 2026-05-25T23:01:35Z
status: passed
score: 4/4 must-haves verified
overrides_applied: 0
---

# Phase 11: oto-sdk package port + PATH wiring Verification Report

**Phase Goal:** A clean GitHub-archive install yields a working `oto-sdk` on PATH — `oto-sdk query <key>` resolves and returns structured output instead of `command not found`, with no separate manual build step.
**Verified:** 2026-05-25T23:01:35Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | After a clean GitHub-archive install, running `oto-sdk query <key>` resolves and returns structured output — never `command not found: oto-sdk`. | VERIFIED | `package.json` exposes `bin.oto-sdk`; `bin/oto-sdk.js` delegates to `sdk/dist/cli.js`; `node bin/oto-sdk.js query generate-slug "Phase Eleven"` returned `{ "slug": "phase-eleven" }`; local tarball install produced `prefix/bin/oto-sdk` and returned the same slug with no `ERR_MODULE_NOT_FOUND`. |
| 2 | `oto-sdk` is on PATH via the `package.json` bin entry (`oto-sdk` -> `bin/oto-sdk.js`) and the installer's PATH-resolution check confirms it. | VERIFIED | `package.json` bin entry exists; `wireOtoSdk()` uses `findOtoSdkOnPath(shimSrc)` and only reports ready when the found executable matches the current shim; `PATH="$(pwd)/bin:$PATH" ... wireOtoSdk(...)` returned `ready: true`; `tests/sdk-wiring.test.cjs` passed 8/8. |
| 3 | The clean install requires no separate manual build step — the SDK is prebuilt/shipped inside the package. | VERIFIED | `sdk/dist/cli.js` exists; `package.json` files allowlist includes `sdk/dist/`, `sdk/package.json`, and `sdk/prompts/`; `postinstall` remains only `node scripts/build-hooks.js`; `npm pack --dry-run` includes the SDK runtime payload and excludes `sdk/src`, `sdk/node_modules`, and test files. |
| 4 | The installer's existing `oto-sdk` PATH-wiring machinery (the "#2775" path) finds the `bin/oto-sdk.js` shim and bin entry it expects. | VERIFIED | `bin/lib/install.cjs` exports `isOtoSdkOnPath`, `trySelfLinkOtoSdk`, and `wireOtoSdk`; paths are computed from `repoRoot` to `sdk/dist/cli.js` and `bin/oto-sdk.js`; self-link uses symlink or require-wrapper, never copy; stale/shadowed PATH behavior is tested. |

**Score:** 4/4 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `sdk/package.json` | ESM subpackage manifest with `oto-sdk` bin and SDK deps. | VERIFIED | Contains `name: @oto-build/sdk`, `type: module`, `bin.oto-sdk`, and faithful SDK dependencies. |
| `sdk/dist/cli.js` | Prebuilt committed CLI entry. | VERIFIED | Exists, runs under node, and dispatches query output; no `*.test.js` or `*.integration.test.js` files found under `sdk/dist`. |
| `bin/oto-sdk.js` | Parent-package CJS shim resolving `../sdk/dist/cli.js`. | VERIFIED | Resolves via `__dirname`, delegates with `spawnSync(process.execPath, ...)`, exits with child status. |
| `package.json` | Parent package bin/deps/files wiring. | VERIFIED | Declares `oto-sdk`, top-level `@anthropic-ai/claude-agent-sdk` and `ws`, and narrow SDK runtime files allowlist. |
| `bin/lib/install.cjs` | PATH detection, self-link fallback, and ready gate. | VERIFIED | Implements HOME-bounded self-link/wrapper fallback and current-install PATH matching before printing `OTO SDK ready`. |
| `scripts/install-smoke.cjs` | Clean-install SDK regression gate. | VERIFIED | Asserts installed `oto-sdk` executable, `generate-slug`, `roadmap.analyze`, no `ERR_MODULE_NOT_FOUND`, and PATH-gated installer readiness. |
| `tests/sdk-wiring.test.cjs` | Unit coverage for PATH walk/self-link/shadowing. | VERIFIED | `node --test tests/sdk-wiring.test.cjs` passed 8/8. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `package.json` | `bin/oto-sdk.js` | npm `bin.oto-sdk` auto-link | WIRED | `package.json` line 12 maps `oto-sdk` to `bin/oto-sdk.js`; local tarball install created `prefix/bin/oto-sdk`. |
| `bin/oto-sdk.js` | `sdk/dist/cli.js` | `path.resolve(__dirname, '..', 'sdk', 'dist', 'cli.js')` | WIRED | Direct command output proves the shim reaches the compiled CLI and returns structured JSON. |
| `sdk/dist/cli.js` | `sdk/dist/query/index.js` | dynamic query dispatch imports registry | WIRED | `generate-slug` and `roadmap.analyze` are registered and both returned JSON through `node bin/oto-sdk.js query ...`. |
| `package.json dependencies` | `sdk/dist/cli.js` static import chain | Node upward `node_modules` resolution | WIRED | Top-level deps exist in `package.json`/lockfile; clean local tarball install query completed with `noErrModuleNotFound: true`. |
| `bin/install.js` | `wireOtoSdk(opts)` | post-install call after runtime install branch | WIRED | `bin/install.js` imports `wireOtoSdk` and calls it once after install runtime work completes. |
| `wireOtoSdk` | current install shim | `findOtoSdkOnPath(shimSrc)` current-install match | WIRED | Ready output is gated on `matchesCurrentInstall`; stale PATH shadowing returns `reason: shadowed` and is covered by test. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `sdk/dist/cli.js` | query result JSON | `createRegistry().dispatch(...)` in query path | Yes | FLOWING — `generate-slug` returned `phase-eleven`; `roadmap.analyze` returned parsed phase data. |
| `bin/oto-sdk.js` | process argv/status | `process.argv.slice(2)` -> spawned CLI -> child status | Yes | FLOWING — direct and installed-bin invocations pass arguments and return child output/status. |
| `wireOtoSdk` | readiness result | PATH scan of executable `oto-sdk`, current-install shim match | Yes | FLOWING — live probe returned `ready: true`; tests cover false, true, unmanaged, managed, and shadowed cases. |
| `scripts/install-smoke.cjs` | smoke pass/fail assertions | freshly installed package bin and spawned `oto-sdk` outputs | Yes | FLOWING — smoke contains executable, JSON parse, missing-module, planning-key, and ready-message assertions. |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Pure query returns structured output | `node bin/oto-sdk.js query generate-slug "Phase Eleven"` | `{ "slug": "phase-eleven" }` | PASS |
| `.planning`-backed key returns parseable JSON | `node bin/oto-sdk.js query roadmap.analyze` | Returned phase list including Phase 11, 12, and 13 | PASS |
| PATH wiring unit tests | `node --test tests/sdk-wiring.test.cjs` | 8 pass, 0 fail | PASS |
| Packlist ships runtime payload only | `npm pack --dry-run --json` parsed with cache in `/private/tmp` | Missing `[]`, forbidden count `0`, entry count `794` | PASS |
| Clean local archive-style install | local `npm pack` -> `npm install -g <tarball> --prefix <tmp>` -> `oto-sdk query generate-slug` | Installed `prefix/bin/oto-sdk`, slug `phase-eleven`, no `ERR_MODULE_NOT_FOUND` | PASS |
| Schema drift | `node bin/oto-sdk.js query verify.schema-drift 11` | `drift_detected: false`, `blocking: false` | PASS |
| Full suite | Orchestrator evidence: `npm test` | 620 pass, 1 skip, 0 fail | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| SDK-01 | 11-01, 11-02, 11-04 | Running `oto-sdk query <key>` resolves the CLI and returns structured output instead of command not found. | SATISFIED | Direct `generate-slug` and `roadmap.analyze` commands return JSON; clean local tarball install ran installed `oto-sdk` successfully. |
| SDK-02 | 11-02, 11-03, 11-04 | After installing oto, `oto-sdk` is callable on PATH via bin entry and installer PATH-resolution check. | SATISFIED | `package.json` bin entry exists; installed tarball creates `prefix/bin/oto-sdk`; `wireOtoSdk` positive path and 8-unit suite pass. |
| SDK-04 | 11-01, 11-02, 11-04 | Clean GitHub-archive install yields a working `oto-sdk` with no separate manual build step. | SATISFIED | `sdk/dist/` is prebuilt and packed; no SDK build step in top-level install scripts; clean local tarball install works. |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `scripts/install-smoke.cjs` | 91, 132, 200 | `console.log` pass messages | INFO | Expected CLI smoke output, not stub behavior. |
| `sdk/src/cli.ts` / `sdk/dist/cli.js` | query/init output paths | `console.log` structured CLI output | INFO | Expected user-facing CLI output. |
| `bin/lib/install.cjs` | 99, 107, 110, 159 | `return null` in absence/unsupported branches | INFO | Valid sentinel returns for no PATH match, win32 skip, missing HOME, and failed self-link. |

No blocker or warning anti-patterns found. Placeholder/TODO and hardcoded-empty user-output scans did not identify stubs in the Phase 11 implementation surface.

### Human Verification Required

None. The phase goal is CLI/package behavior and was verified with direct commands, packlist inspection, unit tests, and clean local tarball install.

### Gaps Summary

No gaps found. Phase 11 satisfies the roadmap success criteria and the scoped requirements SDK-01, SDK-02, and SDK-04. Phase 12 remains responsible for full `.oto` query registry/workflow consumption, and Phase 13 remains responsible for dogfood migration; those are not Phase 11 gaps.

---

_Verified: 2026-05-25T23:01:35Z_
_Verifier: Claude (gsd-verifier)_
