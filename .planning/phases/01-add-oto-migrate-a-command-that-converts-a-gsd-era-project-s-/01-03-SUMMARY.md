---
phase: 01-add-oto-migrate-a-command-that-converts-a-gsd-era-project-s-
plan: 03
subsystem: migrate-surface
tags: [migrate, oto-tools, slash-command, generated-docs, runtime-matrix]
requires:
  - "01-01-SUMMARY.md"
  - "01-02-SUMMARY.md"
provides:
  - "oto-tools migrate dispatch"
  - "oto/commands/oto/migrate.md command surface"
  - "Generated command index and runtime matrix entries for /oto-migrate"
affects: [migrate, oto-tools, command-index, runtime-matrix]
tech-stack:
  added: []
  patterns:
    - "thin oto-tools dispatch case delegates to a module-level async main(args, cwd)"
    - "command markdown remains shipped-payload safe by avoiding path-like .planning literals"
key-files:
  created:
    - "oto/commands/oto/migrate.md"
  modified:
    - "oto/bin/lib/oto-tools.cjs"
    - "oto/bin/lib/migrate.cjs"
    - "oto/commands/INDEX.md"
    - "decisions/runtime-tool-matrix.md"
key-decisions:
  - "Expose migrate through the existing oto-tools router rather than adding a new binary."
  - "Regenerate downstream command/runtime artifacts after adding a new command markdown file."
  - "Keep command prose free of path-like .planning references because command markdown ships to runtime payloads."
requirements-completed: [REQ-MIG-01, REQ-MIG-09, REQ-MIG-10]
duration: 24min
completed: 2026-05-05
---

# Phase 01 Plan 03 Summary

**Exposed the migrate feature through `oto-tools migrate` and `/oto-migrate`**

## Performance

- **Duration:** 24 min
- **Completed:** 2026-05-05
- **Tasks:** 2 implementation tasks plus generated artifact repair
- **Files modified:** 5

## Accomplishments

- Added the `migrate` help entry and router case in `oto/bin/lib/oto-tools.cjs`.
- Created `oto/commands/oto/migrate.md` with `name: oto:migrate`, allowed tools, objective, execution context, context, and process blocks.
- Fixed the non-GSD no-flag exit path in `oto/bin/lib/migrate.cjs` so the CLI dispatch contract exits non-zero for plain directories.
- Regenerated `oto/commands/INDEX.md` and `decisions/runtime-tool-matrix.md` so `/oto-migrate` appears in generated docs and runtime parity checks.
- Removed path-like `.planning` literals from the shipped command markdown to satisfy the Phase 4 planning leak gate.

## Task Commits

1. **Task 1 and 2: Dispatch plus command surface** - `38a019c` (`feat(01-03): expose migrate command surface`)

## Files Created/Modified

- `oto/bin/lib/oto-tools.cjs` - Adds help text at lines 170-171 and `case 'migrate'` at lines 1277-1282.
- `oto/commands/oto/migrate.md` - New 40-line command file with frontmatter at lines 1-13 and process guidance at lines 33-40.
- `oto/bin/lib/migrate.cjs` - Recognizes the dry-run `summary.reason` no-signal shape before returning the no-flag non-GSD exit code.
- `oto/commands/INDEX.md` - Adds `/oto-migrate` to the generated command index at line 41.
- `decisions/runtime-tool-matrix.md` - Adds `/oto-migrate` runtime support at line 120.

## Deviations from Plan

- Included the generated `oto/commands/INDEX.md` and `decisions/runtime-tool-matrix.md` updates because the full test suite enforces generated command docs and runtime matrix freshness.
- Included a narrow `oto/bin/lib/migrate.cjs` fix because the Plan 01-03 CLI test proved `main()` needed to read `summary.reason` for dry-run no-signal results.
- Reworded the command markdown process text to avoid path-like `.planning` references in shipped payloads while preserving the same user-facing intent.

## Issues Encountered

- `tests/migrate-cli.test.cjs` initially exposed a root cause in `migrate.main()`: dry-run stores the no-signal reason under `summary.reason`.
- The full suite caught generated artifact drift after adding the new command markdown.
- The planning leak test caught command prose that used a path-like planning directory literal.

## Evidence

- `node --test tests/migrate-cli.test.cjs` passed with 1 passing test.
- `node --test tests/migrate-command-md.test.cjs` passed with 1 passing test.
- `node --test tests/migrate-detect.test.cjs tests/migrate-dry-run.test.cjs tests/migrate-rename-map.test.cjs tests/migrate-apply.test.cjs tests/migrate-idempotent.test.cjs tests/migrate-conflict.test.cjs tests/migrate-instructions.test.cjs tests/migrate-state-frontmatter.test.cjs tests/migrate-helpers.test.cjs` passed with 15 passing tests.
- `node --test tests/phase-04-planning-leak.test.cjs` passed.
- `node --test tests/phase-08-runtime-matrix-render.test.cjs` passed with 5 passing tests.
- `node --test tests/migrate-command-md.test.cjs tests/migrate-cli.test.cjs` passed with 2 passing tests.
- `node --test --test-concurrency=4 --test-reporter=dot tests/*.test.cjs` exited 0 for the full repo test suite.

## User Setup Required

None - no external services or credentials are required.

## Next Phase Readiness

All planned Phase 01 migrate tests are now green, and the feature is reachable through both the CLI router and the generated command surface.

## Self-Check: PASSED

- Key files exist on disk.
- Task commit is present in git history.
- Generated docs and runtime matrix were refreshed.
- Full repo tests passed after the command surface landed.
- No unrelated dirty worktree changes were reverted.

---
*Phase: 01-add-oto-migrate-a-command-that-converts-a-gsd-era-project-s-*
*Completed: 2026-05-05*
