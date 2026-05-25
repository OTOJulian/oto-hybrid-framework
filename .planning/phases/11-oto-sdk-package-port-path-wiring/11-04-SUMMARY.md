---
phase: 11-oto-sdk-package-port-path-wiring
plan: 04
subsystem: smoke
tags: [install-smoke, oto-sdk, clean-install, path, regression-gate]

requires:
  - phase: 11-oto-sdk-package-port-path-wiring
    provides: Plans 11-01 through 11-03 committed sdk/dist, package bin/deps/files wiring, and PATH-gated installer readiness
provides:
  - Clean-install smoke assertions for oto-sdk bin linkage and executable mode
  - Structured oto-sdk query proof for generate-slug
  - ERR_MODULE_NOT_FOUND negative guards for SDK query resolution
  - .planning-backed roadmap.analyze JSON parsing proof
  - PATH-gated installer OTO SDK ready assertion
affects: [phase-11, phase-12, sdk, installer, install-smoke]

tech-stack:
  added: []
  patterns: [clean-install SDK smoke gate, temp .planning project registry probe, PATH-gated installer stdout assertion]

key-files:
  created:
    - .planning/phases/11-oto-sdk-package-port-path-wiring/11-04-SUMMARY.md
  modified:
    - scripts/install-smoke.cjs
    - .planning/STATE.md
    - .planning/ROADMAP.md

key-decisions:
  - "Used roadmap.analyze as the Phase 11 .planning-backed registry breadth probe."
  - "Kept direct GitHub-archive smoke documented as blocked until local commits are available remotely; verified the same clean install path with a local npm tarball."

patterns-established:
  - "Install smoke fails on ERR_MODULE_NOT_FOUND for both pure and .planning-backed SDK query paths."
  - "Installer readiness smoke asserts the positive OTO SDK ready message only when oto-sdk is on PATH."

requirements-completed: [SDK-01, SDK-02, SDK-04]

duration: 4min
completed: 2026-05-25
---

# Phase 11 Plan 04: Install Smoke SDK Gate Summary

**Clean-install smoke now proves oto-sdk query resolution, JSON output, dependency resolution, and PATH-gated installer readiness**

## Performance

- **Duration:** 4 min
- **Started:** 2026-05-25T22:26:27Z
- **Completed:** 2026-05-25T22:29:42Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Extended `scripts/install-smoke.cjs` to assert `<prefix>/bin/oto-sdk` exists and is executable after a clean install.
- Added `oto-sdk query generate-slug "Phase Eleven"` smoke coverage with JSON parsing and `slug: "phase-eleven"` validation.
- Added `ERR_MODULE_NOT_FOUND` negative guards to fail the smoke if SDK runtime dependencies stop resolving from `sdk/dist/cli.js`.
- Added a temp `.planning/ROADMAP.md` project and `oto-sdk query roadmap.analyze` JSON parse check.
- Asserted the Claude installer stdout includes PATH-gated `OTO SDK ready` when the installed bin dir is on PATH.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add oto-sdk bin + structured-output + ERR_MODULE_NOT_FOUND negative-guard assertions** - `b43cdb5` (test)
2. **Task 2: Add .planning-backed key assertion + PATH-gated "OTO SDK ready" installer check** - `9930064` (test)

## Files Created/Modified

- `scripts/install-smoke.cjs` - Adds the SDK query, dependency-resolution, `.planning` registry, executable-bin, and installer-ready assertions.
- `.planning/phases/11-oto-sdk-package-port-path-wiring/11-04-SUMMARY.md` - Documents plan execution and verification evidence.
- `.planning/STATE.md` - Advances Phase 11 to completed implementation state.
- `.planning/ROADMAP.md` - Marks Plan 11-04 and Phase 11 plan progress complete.

## Decisions Made

- Used `roadmap.analyze` for the `.planning`-backed key because it is listed in the Phase 11 native registry tier and works without Phase 12 CJS bridge/path rewiring.
- Kept the `.planning` registry probe hermetic by generating a temporary `.planning/ROADMAP.md` project instead of depending on the caller's current directory.

## Verification

- `node -c scripts/install-smoke.cjs`
- `node -c scripts/install-smoke.cjs && grep -q "generate-slug" scripts/install-smoke.cjs && grep -q "ERR_MODULE_NOT_FOUND" scripts/install-smoke.cjs && grep -q "phase-eleven" scripts/install-smoke.cjs && echo "ok: sdk query + negative guard wired"`
- `node -c scripts/install-smoke.cjs && grep -q "roadmap.analyze\|current-timestamp" scripts/install-smoke.cjs && grep -q "OTO SDK ready" scripts/install-smoke.cjs && echo "ok: planning-key + ready-gate assertions wired"`
- Direct `node scripts/install-smoke.cjs` was attempted with approved npm cache/network access, but GitHub returned 404 for local commit `993006420a7de986b16fcb67fc2dcc45d10b0ba7` because it is not available in the remote archive yet.
- Equivalent clean local tarball install passed: `npm pack` from the current worktree, `npm install -g <tarball> --prefix <tmp>`, installed `oto-sdk query generate-slug "Phase Eleven"`, installed `oto-sdk query roadmap.analyze` from a temp `.planning` project, asserted no `ERR_MODULE_NOT_FOUND`, verified `oto-sdk` executable mode, and asserted installer stdout contains `OTO SDK ready`.

## Deviations from Plan

None - plan implementation executed as written.

## Issues Encountered

- Sandboxed `node scripts/install-smoke.cjs` hit npm cache `EPERM`; rerunning with approved npm cache/network access cleared the sandbox issue.
- The direct GitHub archive smoke then failed with a 404 because the just-created local plan commits are not present on GitHub. The same clean install semantics were verified with a local npm tarball from the current committed worktree.

## Known Stubs

None. Stub scan found no placeholder or empty-data patterns in `scripts/install-smoke.cjs`.

## Threat Flags

None. The smoke harness executes the freshly installed `oto-sdk` binary with controlled arguments and temporary directories, matching the plan threat model.

## User Setup Required

None.

## Next Phase Readiness

Phase 11 implementation is complete. The SDK package port now has a clean-install smoke gate for SC #1-#4; Phase 12 can build on a resolving `oto-sdk` binary and focus on `.oto` registry and workflow consumption.

## Self-Check: PASSED

- Found `.planning/phases/11-oto-sdk-package-port-path-wiring/11-04-SUMMARY.md`
- Found `scripts/install-smoke.cjs`
- Found task commits `b43cdb5` and `9930064`
- Confirmed `STATE.md` now points to completed Plan 11-04
- Confirmed `ROADMAP.md` marks Plan 11-04 and Phase 11 progress complete

---
*Phase: 11-oto-sdk-package-port-path-wiring*
*Completed: 2026-05-25*
