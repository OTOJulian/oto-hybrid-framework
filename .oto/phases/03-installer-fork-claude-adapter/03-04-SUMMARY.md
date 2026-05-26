---
phase: 03-installer-fork-claude-adapter
plan: 04
subsystem: installer
tags: [node-test, installer, copy-files, sha256, filesystem]

requires:
  - phase: 03-installer-fork-claude-adapter
    provides: Wave 0 copy-files scaffold and prior installer helper patterns
provides:
  - Dependency-free copy/remove/hash/walk helper module
  - Symlink rejection before recursive copy
  - Real INS-04 unit tests over os.tmpdir() fixtures
affects: [phase-03-installer, phase-03-install-orchestrator, phase-03-uninstall]

tech-stack:
  added: []
  patterns:
    - "CommonJS bin/lib helper using Node built-ins only"
    - "fs.promises.cp with dereference:false plus preflight symlink rejection"
    - "node:test filesystem fixtures with t.after cleanup"

key-files:
  created:
    - bin/lib/copy-files.cjs
  modified:
    - tests/phase-03-copy-files.test.cjs

key-decisions: []

patterns-established:
  - "copyTree treats absent source directories as a no-op with an empty result manifest."
  - "copyTree returns absolute written file paths plus paths relative to the destination root."
  - "walkTree skips symlinks and returns only regular files."

requirements-completed: [INS-04]

duration: 4 min
completed: 2026-04-28
---

# Phase 03 Plan 04: Copy Files Helper Summary

**Dependency-free copy, remove, hash, and walk primitives with symlink-safe recursive copy and real INS-04 filesystem tests.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-28T22:41:05Z
- **Completed:** 2026-04-28T22:45:16Z
- **Tasks:** 2/2
- **Files modified:** 2

## Accomplishments

- Added `bin/lib/copy-files.cjs` exporting `copyTree`, `removeTree`, `sha256File`, and `walkTree`.
- Implemented Pitfall-B/F-safe absent source and absent target behavior.
- Added source-tree symlink rejection before `fsp.cp`, while keeping `dereference: false` as defense in depth.
- Replaced the 7 Wave 0 copy-files TODO tests with real assertions covering copy, symlink rejection, SHA-256 hashing, walking, and removal.

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement copy-files helper module** - `13f1164` (feat)
2. **Task 2: Fill copy-files test scaffold** - `b2f7bab` (test)

## Files Created/Modified

- `bin/lib/copy-files.cjs` - Filesystem helper module with recursive copy, recursive remove, deterministic SHA-256 hashing, and regular-file tree walking.
- `tests/phase-03-copy-files.test.cjs` - Seven real `node:test` assertions replacing the Wave 0 TODO scaffold.

## Verification

- `node --test tests/phase-03-copy-files.test.cjs` - PASS, 7 tests, 0 TODO.
- `node --test tests/phase-03-*.test.cjs` - PASS, 94 tests, 0 fail, 65 TODO from later Phase 3 waves.
- Export check - PASS, `copyTree,removeTree,sha256File,walkTree`.
- `grep -c "fs\\.cp\\|fsp\\.cp" bin/lib/copy-files.cjs` - PASS, 1 hit.
- `grep -c "if (runtime ===" bin/lib/copy-files.cjs` - PASS, 0 hits.
- `grep -F "symlink not allowed" bin/lib/copy-files.cjs` - PASS, 2 hits.
- `grep -F "dereference: false" bin/lib/copy-files.cjs` - PASS, 1 hit.
- `git log --diff-filter=A --oneline -- tests/phase-03-copy-files.test.cjs` - PASS, introducing commit remains `35b83e8` from Plan 03-01.
- `git diff -- package.json` - PASS, no dependency changes.

## Decisions Made

None - followed plan as specified.

## Deviations from Plan

None - plan executed exactly as written.

**Total deviations:** 0 auto-fixed. **Impact on plan:** No scope change.

## Issues Encountered

None.

## Known Stubs

None. The plan-owned implementation and test files have no TODO placeholders, hardcoded UI-empty values, or unwired data-source stubs.

## Threat Flags

None. The new filesystem helper surface is covered by the plan threat model, including symlink rejection and `dereference: false`.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready for `03-05-PLAN.md`. The install orchestrator can now consume copy/remove/hash/walk helpers without adding runtime conditionals or external dependencies.

## Self-Check: PASSED

- Summary file exists at `.planning/phases/03-installer-fork-claude-adapter/03-04-SUMMARY.md`.
- Created implementation file exists: `bin/lib/copy-files.cjs`.
- Modified test file exists: `tests/phase-03-copy-files.test.cjs`.
- Task commits found in git history: `13f1164`, `b2f7bab`.

---
*Phase: 03-installer-fork-claude-adapter*
*Completed: 2026-04-28*
