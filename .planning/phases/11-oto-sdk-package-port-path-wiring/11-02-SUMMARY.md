---
phase: 11-oto-sdk-package-port-path-wiring
plan: 02
subsystem: sdk
tags: [sdk, packaging, dependencies, npm-pack, oto-sdk]

requires:
  - phase: 11-oto-sdk-package-port-path-wiring
    provides: Plan 11-01 committed the surface-rebranded SDK subtree and prebuilt sdk/dist output
provides:
  - Top-level oto-sdk shim resolving sdk/dist/cli.js
  - Package bin entry linking oto-sdk to bin/oto-sdk.js
  - Top-level runtime dependency declarations and lock metadata for SDK imports
  - Package files allowlist entries for the committed SDK runtime payload
affects: [phase-11, phase-12, sdk, installer, package]

tech-stack:
  added: ["@anthropic-ai/claude-agent-sdk", ws]
  patterns: [parent-package CJS shim, top-level dependency resolution for sdk/dist, narrow npm files allowlist]

key-files:
  created:
    - bin/oto-sdk.js
    - package-lock.json
  modified:
    - package.json

key-decisions:
  - "Declared SDK runtime dependencies at the top level so sdk/dist imports resolve by Node's upward node_modules walk."
  - "Added a top-level package-lock.json because this package now has runtime dependencies."
  - "Used an empty verification commit for the read-only npm pack assertion task."

patterns-established:
  - "Parent package exposes oto-sdk through a CJS shim that invokes sdk/dist/cli.js via process.execPath."
  - "SDK shipping uses explicit files allowlist entries for sdk/dist, sdk/package.json, and sdk/prompts only."

requirements-completed: [SDK-01, SDK-02, SDK-04]

duration: 6min
completed: 2026-05-25
---

# Phase 11 Plan 02: SDK Package Port Path Wiring Summary

**Parent-package oto-sdk binary wiring with top-level runtime dependencies and npm packlist coverage**

## Performance

- **Duration:** 6 min
- **Started:** 2026-05-25T22:05:55Z
- **Completed:** 2026-05-25T22:11:34Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- Added `bin/oto-sdk.js`, a faithful parent-package shim that resolves `../sdk/dist/cli.js` from its own `__dirname` and delegates via `spawnSync(process.execPath, ...)`.
- Wired top-level `package.json` with `bin.oto-sdk`, SDK runtime dependencies, and narrow SDK files allowlist entries.
- Generated top-level `package-lock.json` so the new runtime dependency metadata is reproducible.
- Verified `npm pack --dry-run --json` includes the shim, `sdk/package.json`, and `sdk/dist/cli.js`, while excluding SDK node_modules and test sources.

## Task Commits

Each task was committed atomically:

1. **Task 1: Create bin/oto-sdk.js shim** - `ef651e0` (feat)
2. **Task 2: Wire package.json metadata** - `21c0eb0` (feat)
3. **Task 3: Verify npm pack ships SDK payload** - `25ed487` (test, empty verification commit)

## Files Created/Modified

- `bin/oto-sdk.js` - Parent-package CJS shim for the installed `oto-sdk` binary.
- `package.json` - Adds `oto-sdk` bin, top-level SDK runtime dependencies, and SDK runtime files allowlist entries.
- `package-lock.json` - Locks the new top-level dependency tree, including `@anthropic-ai/claude-agent-sdk` 0.2.141 and `ws` 8.21.0.

## Decisions Made

- Declared `@anthropic-ai/claude-agent-sdk` and `ws` in the top-level package, not only in `sdk/package.json`, matching the dependency-resolution proof in 11-RESEARCH.
- Kept the files allowlist narrow: `sdk/dist/`, `sdk/package.json`, and `sdk/prompts/`; no bare `sdk/`, `sdk/src/`, or `sdk/node_modules/`.
- Created a top-level lockfile because package-level runtime dependencies now exist.

## Verification

- `test -f bin/oto-sdk.js`
- `grep -q "path.resolve(__dirname, '..', 'sdk', 'dist', 'cli.js')" bin/oto-sdk.js`
- `grep -q "spawnSync(process.execPath" bin/oto-sdk.js`
- `grep -q "process.exit(result.status ?? 1)" bin/oto-sdk.js`
- `node -c bin/oto-sdk.js`
- `rg -n "gsd-sdk" bin/oto-sdk.js` returned no matches.
- `node -e "require('./package.json')"`
- Package verification confirmed `bin.oto`, `bin.oto-sdk`, locked dependency version ranges, SDK files entries, no overbroad SDK files entries, no `scripts.prepare`, and no postinstall `tsc`.
- Lock verification confirmed root dependencies in `package-lock.json` and resolved versions `0.2.141` / `8.21.0`.
- `npm pack --dry-run --json` confirmed `bin/oto-sdk.js`, `sdk/package.json`, and `sdk/dist/cli.js` are packed.
- Pack exclusion verification confirmed no `sdk/node_modules/` or SDK test files are packed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Reconciled closeout state drift after helper updates**
- **Found during:** Plan closeout
- **Issue:** State handlers advanced core state, but left `STATE.md` next-command prose on Plan 2, did not update the Phase 11 roadmap checkbox/count, and left SDK-02 Pending plus a split SDK-02 checkbox line in `REQUIREMENTS.md`.
- **Fix:** Manually updated `STATE.md`, `ROADMAP.md`, and `REQUIREMENTS.md` to match completed Plan 11-02.
- **Files modified:** `.planning/STATE.md`, `.planning/ROADMAP.md`, `.planning/REQUIREMENTS.md`
- **Verification:** Follow-up grep/read checks confirmed Plan 3 of 4, 11-02 checked, Phase 11 at 2/4, and SDK-02 Complete.
- **Committed in:** plan metadata commit

---

**Total deviations:** 1 auto-fixed (Rule 1).
**Impact on plan:** Closeout metadata now matches the completed implementation; no product-code scope changed.

## Issues Encountered

- A sandboxed `npm install --package-lock-only --ignore-scripts` produced no output and did not finish promptly. The hung npm process was stopped, then the command was rerun with approved npm metadata/cache access and completed successfully.
- Sandboxed `npm pack --dry-run --json` hit an npm cache `EPERM`; rerunning the same dry-run pack checks with approved npm cache access produced the required packlist evidence.
- GSD state handlers partially updated closeout files; the remaining metadata drift was fixed manually and documented as a deviation.

## Known Stubs

None. Stub scan found no placeholder or empty-data patterns in `bin/oto-sdk.js`, `package.json`, or `package-lock.json`.

## Threat Flags

None. The dependency and package allowlist surfaces were already covered by the plan threat model.

## User Setup Required

None.

## Next Phase Readiness

Plan 11-03 can port the live installer PATH wiring against the committed `bin/oto-sdk.js`, top-level `bin.oto-sdk` entry, and shipped SDK runtime payload.

## Self-Check: PASSED

- Found `.planning/phases/11-oto-sdk-package-port-path-wiring/11-02-SUMMARY.md`
- Found `bin/oto-sdk.js`
- Found `package-lock.json`
- Found task commits `ef651e0`, `21c0eb0`, and `25ed487`

---
*Phase: 11-oto-sdk-package-port-path-wiring*
*Completed: 2026-05-25*
