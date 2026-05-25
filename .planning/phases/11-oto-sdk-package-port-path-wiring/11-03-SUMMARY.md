---
phase: 11-oto-sdk-package-port-path-wiring
plan: 03
subsystem: installer
tags: [installer, path, sdk, node-test, "2775"]

requires:
  - phase: 11-oto-sdk-package-port-path-wiring
    provides: Plan 11-02 added the top-level oto-sdk shim, package bin entry, dependencies, and shipped SDK payload
provides:
  - PATH-callability detection for oto-sdk in the live installer
  - HOME-scoped oto-sdk self-link fallback with require-wrapper fallback
  - PATH-gated OTO SDK ready output after runtime installs
  - Unit coverage for PATH walk and self-link behavior
affects: [phase-11, phase-12, installer, sdk, path-wiring]

tech-stack:
  added: []
  patterns: [node-test RED/GREEN for installer helpers, repoRoot-based SDK path resolution, PATH-gated readiness messaging]

key-files:
  created:
    - tests/sdk-wiring.test.cjs
    - .planning/phases/11-oto-sdk-package-port-path-wiring/deferred-items.md
  modified:
    - bin/lib/install.cjs
    - bin/install.js

key-decisions:
  - "Ported the #2775 SDK PATH-wiring into the live installer as a once-per-invocation post-install step."
  - "Kept self-link targets bounded to HOME-owned PATH directories and ~/.local/bin, with stale target replacement before link creation."
  - "Recorded stale broad-suite Phase 2 package assertions as deferred instead of changing old test contracts in this PATH-wiring plan."

patterns-established:
  - "Installer SDK readiness is based on real oto-sdk PATH callability, not sdk/dist file presence."
  - "Self-link fallback uses a require-wrapper when symlinks are unavailable; it never copies bin/oto-sdk.js."

requirements-completed: [SDK-02]

duration: 7min
completed: 2026-05-25
---

# Phase 11 Plan 03: SDK PATH Wiring Summary

**Live installer PATH-wiring for oto-sdk with RED/GREEN unit coverage and real callability-gated readiness output**

## Performance

- **Duration:** 7 min
- **Started:** 2026-05-25T22:15:26Z
- **Completed:** 2026-05-25T22:22:22Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Added `tests/sdk-wiring.test.cjs` first, proving the missing `isOtoSdkOnPath` and `trySelfLinkOtoSdk` exports through a failing RED run.
- Ported `isOtoSdkOnPath`, `trySelfLinkOtoSdk`, and `wireOtoSdk` into `bin/lib/install.cjs` with top-level `repoRoot` path corrections for `bin/oto-sdk.js` and `sdk/dist/cli.js`.
- Wired `bin/install.js` to call `wireOtoSdk(opts)` exactly once after install runtime work completes.
- Verified the "OTO SDK ready" message is emitted only when `oto-sdk` is actually callable on PATH.

## Task Commits

Each task was committed atomically:

1. **Task 1: Write SDK wiring RED tests** - `5350e64` (test)
2. **Task 2: Port live installer PATH wiring** - `592e194` (feat)

## Files Created/Modified

- `tests/sdk-wiring.test.cjs` - Hermetic node:test coverage for missing, executable, and non-executable PATH candidates plus HOME-scoped self-link and stale replacement behavior.
- `bin/lib/install.cjs` - Adds and exports `isOtoSdkOnPath`, `trySelfLinkOtoSdk`, and `wireOtoSdk`.
- `bin/install.js` - Imports and calls `wireOtoSdk(opts)` once after the install branch completes.
- `.planning/phases/11-oto-sdk-package-port-path-wiring/deferred-items.md` - Records unrelated stale broad-suite Phase 2 assertions surfaced by `npm test`.

## Decisions Made

- Used a `require(${JSON.stringify(shimSrc)})` wrapper fallback instead of copying the shim, preserving the shim's own `__dirname` resolution.
- Left Phase 12 registry and `.oto/` path work untouched.
- Treated old Phase 2 package-shape test failures as deferred because they are unrelated to this plan's PATH-wiring files.

## Verification

- RED: `node --test tests/sdk-wiring.test.cjs` failed before Task 2 with `isOtoSdkOnPath is not a function` and `trySelfLinkOtoSdk is not a function`.
- GREEN: `node --test tests/sdk-wiring.test.cjs` passed with 5/5 tests.
- `node -c tests/sdk-wiring.test.cjs`
- `node -c bin/lib/install.cjs`
- `node -c bin/install.js`
- Export check confirmed all seven installer exports: `installRuntime`, `installAll`, `uninstallRuntime`, `uninstallAll`, `isOtoSdkOnPath`, `trySelfLinkOtoSdk`, and `wireOtoSdk`.
- `grep -c "wireOtoSdk(" bin/install.js` returned `1`.
- `bin/lib/install.cjs` contains zero `copyFileSync`.
- `PATH="$(pwd)/bin:$PATH" node -e "...wireOtoSdk({ repoRoot: process.cwd() })..."` printed `✓ OTO SDK ready (sdk/dist/cli.js)` and returned `ready: true`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Reconciled closeout state drift after helper updates**
- **Found during:** Plan closeout
- **Issue:** State handlers advanced frontmatter but left the readable `STATE.md` current-position prose on Plan 3, did not update the Phase 11 roadmap checkbox/count, and did not record the execution metric row.
- **Fix:** Manually updated `STATE.md` and `ROADMAP.md` to match completed Plan 11-03 and next Plan 11-04 execution.
- **Files modified:** `.planning/STATE.md`, `.planning/ROADMAP.md`
- **Verification:** Follow-up reads confirmed Plan 4 of 4 in state and 11-03 checked with Phase 11 at 3/4 in roadmap.
- **Committed in:** plan metadata commit

---

**Total deviations:** 1 auto-fixed (Rule 1).
**Impact on plan:** Closeout metadata now matches the completed implementation; no product-code scope changed.

## Issues Encountered

- `npm test` reached stale, unrelated Phase 2 assertions expecting the old `0.1.0` package shape and pre-SDK package allowlist. These failures are logged in `deferred-items.md` and were not fixed in this plan.
- The broad `npm test` run generated changes to `reports/rebrand-dryrun.json` and `reports/rebrand-dryrun.md`; those generated report changes were restored because they were not part of Plan 11-03.

## Deferred Issues

See `.planning/phases/11-oto-sdk-package-port-path-wiring/deferred-items.md`.

## Known Stubs

None. Stub scan found no placeholder or empty-data patterns in the created or modified Plan 11-03 files.

## Threat Flags

None. The new filesystem write surface was already covered by T-11-07, T-11-08, and T-11-09 in the plan threat model.

## User Setup Required

None.

## Next Phase Readiness

Plan 11-04 can extend the install smoke path against a live installer that now performs real `oto-sdk` PATH-callability detection and reports readiness only after that check succeeds.

## Self-Check: PASSED

- Found `.planning/phases/11-oto-sdk-package-port-path-wiring/11-03-SUMMARY.md`
- Found `tests/sdk-wiring.test.cjs`
- Found `.planning/phases/11-oto-sdk-package-port-path-wiring/deferred-items.md`
- Found task commits `5350e64` and `592e194`

---
*Phase: 11-oto-sdk-package-port-path-wiring*
*Completed: 2026-05-25*
