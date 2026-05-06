---
phase: 01-add-oto-migrate-a-command-that-converts-a-gsd-era-project-s-
plan: 02
subsystem: migrate-engine
tags: [migrate, rebrand-engine, node-test, apply, dry-run]
requires:
  - "01-01-SUMMARY.md"
provides:
  - "Embeddable rebrand engine report controls"
  - "Migrate project detection, dry-run, apply, backup, idempotency, and main entrypoint"
  - "Migrate-scoped derived rename map that keeps .planning unless explicitly renamed"
affects: [migrate, rebrand-engine, oto-tools]
tech-stack:
  added: []
  patterns:
    - "node:test coverage around filesystem fixture copies"
    - "migrate-scoped temp rename map derived from the canonical rename-map.json"
    - "tmpdir staging before copy-back into the user project"
key-files:
  created:
    - "oto/bin/lib/migrate.cjs"
    - "tests/rebrand-engine.test.cjs"
    - "tests/migrate-helpers.test.cjs"
  modified:
    - "scripts/rebrand/lib/engine.cjs"
    - "tests/fixtures/gsd-project-minimal/.planning/phases/01-example/01-PLAN.md"
key-decisions:
  - "Reuse the rebrand engine, but pass reportsDir for migrate callers so globally installed binaries do not write into their install directory."
  - "Filter the .planning path rule out of the migrate-derived rename map; .planning to .oto remains opt-in through renameStateDir."
  - "Apply uses staging plus copy-back with explicit backup and skip filters instead of writing directly during engine traversal."
requirements-completed: [REQ-MIG-02, REQ-MIG-03, REQ-MIG-04, REQ-MIG-05, REQ-MIG-06, REQ-MIG-07, REQ-MIG-08]
duration: 58min
completed: 2026-05-05
---

# Phase 01 Plan 02 Summary

**Implemented the migrate engine module and additive rebrand engine embedding options**

## Performance

- **Duration:** 58 min
- **Completed:** 2026-05-05
- **Tasks:** 5 implementation slices plus plan summary
- **Files modified:** 5

## Accomplishments

- Added `scripts/rebrand/lib/engine.cjs` support for caller-provided report destinations on dry-run and apply paths, while preserving default report behavior for existing callers.
- Added `oto/bin/lib/migrate.cjs` with GSD-era project detection, runtime config directory guards, path traversal-safe joins, migrate-scoped rename-map derivation, dry-run reporting, apply staging, backup, idempotency, conflict detection, marker rewrite, state frontmatter rewrite, optional `.planning` rename, and an async `main()` entrypoint.
- Added helper-level coverage for marker and frontmatter rewrites, including source attributes containing spaces.
- Verified Plan 01-02 turns the migrate engine contract tests green while leaving the CLI dispatch and command markdown tests RED for Plan 01-03.

## Task Commits

1. **Task 0: Embeddable engine report controls** - `98fb84d` (`test(01-02): cover embeddable rebrand reports`)
2. **Task 1: Detection and dry-run** - `cc5caad` (`feat(01-02): add migrate detection and dry-run`)
3. **Task 2a: Staging helpers** - `9a9d4e8` (`feat(01-02): add migrate staging helpers`)
4. **Task 2b: Apply path** - `f48a3d4` (`feat(01-02): complete migrate apply path`)
5. **Task 3: Main entrypoint** - `5ec82b1` (`feat(01-02): add migrate CLI entrypoint`)

## Files Created/Modified

- `oto/bin/lib/migrate.cjs` - New migration engine and exported `detectGsdProject`, `dryRun`, `apply`, and `main`.
- `scripts/rebrand/lib/engine.cjs` - Added `reportsDir` flow for dry-run/apply and preserved `skipReports` handling.
- `tests/rebrand-engine.test.cjs` - Added coverage for `skipReports`, `reportsDir`, and default report behavior.
- `tests/migrate-helpers.test.cjs` - Added direct coverage for marker, frontmatter, and staging helpers.
- `tests/fixtures/gsd-project-minimal/.planning/phases/01-example/01-PLAN.md` - Adjusted fixture command prose to match the existing apply-test assertion.

## Implementation Notes

- `scripts/rebrand/lib/engine.cjs:259-265` writes dry-run reports to an optional caller directory, and `scripts/rebrand/lib/engine.cjs:322-330` does the same for coverage manifests.
- `scripts/rebrand/lib/engine.cjs:405-417` threads `reportsDir` and `skipReports` through `engine.run()`.
- `oto/bin/lib/migrate.cjs:34-52` rejects runtime config directories and path traversal.
- `oto/bin/lib/migrate.cjs:82-94` derives a temporary migrate rename map and filters the `.planning` path rule.
- `oto/bin/lib/migrate.cjs:96-130` detects GSD-era signals and half-migrated conflicts.
- `oto/bin/lib/migrate.cjs:155-174` handles marker, source-attribute, frontmatter, and command-reference rewrites.
- `oto/bin/lib/migrate.cjs:190-237` applies the rebrand engine into a tmpdir staging tree with migrate-owned report output.
- `oto/bin/lib/migrate.cjs:262-348` creates backups, filters `.oto-migrate-backup`, copies staging output back, optionally renames `.planning`, and re-checks for residual GSD signals.
- `oto/bin/lib/migrate.cjs:356-405` implements the async `main()` entrypoint and parses `--dry-run`, `--apply`, `--rename-state-dir`, `--no-backup`, `--force`, `--scope`, and `--project-dir`.

## Deviations from Plan

- Adjusted `tests/fixtures/gsd-project-minimal/.planning/phases/01-example/01-PLAN.md` from a `/gsd-plan-phase` reference to `/gsd-execute-phase` because `tests/migrate-apply.test.cjs` already asserted the apply result should contain `/oto-execute-phase`.
- A broad intermediate engine test command pulled in unrelated migrate tests while Plan 01-03 was still RED. The final Plan 01-02 verification was rerun with the targeted test files listed below.

## Issues Encountered

- The marker rewrite regex initially missed `source:GSD defaults` because the source attribute contains a space. The helper implementation now preserves the attribute while converting only the marker prefix.
- Root instruction files required a post-copy rewrite pass because the rebrand engine inventory skips some root instruction files.

## Evidence

- `node --test tests/rebrand-engine.test.cjs` passed with 5 passing tests.
- `node --test tests/migrate-detect.test.cjs tests/migrate-dry-run.test.cjs tests/migrate-rename-map.test.cjs tests/migrate-apply.test.cjs tests/migrate-idempotent.test.cjs tests/migrate-conflict.test.cjs tests/migrate-instructions.test.cjs tests/migrate-state-frontmatter.test.cjs tests/migrate-helpers.test.cjs` passed with 15 passing tests.
- `node -e "(async()=>{const m=require('./oto/bin/lib/migrate.cjs'); console.log(typeof m.main, typeof m.apply, typeof m.dryRun, typeof m.detectGsdProject); if(typeof m.main!=='function') process.exit(1);})()"` printed `function function function function`.
- `wc -l oto/bin/lib/migrate.cjs` reported 451 lines, satisfying the minimum size check.
- `rg -n "homedir\\(\\)|safeJoin|RENAME_MAP_CANDIDATES|buildMigrateMapPath|\\.oto-migrate-backup|skipPatterns|renameStateDir|copyTreeAtomic" oto/bin/lib/migrate.cjs` found the required guard, map, backup, and copy-back terms.
- `node --test tests/migrate-cli.test.cjs tests/migrate-command-md.test.cjs` remains RED only for Plan 01-03 scope: `Unknown command: migrate` and missing `oto/commands/oto/migrate.md`.

## User Setup Required

None - no external services or credentials are required.

## Next Phase Readiness

Plan 01-03 can now wire `oto-tools migrate` to `migrate.main()` and add `oto/commands/oto/migrate.md`. Those two missing surfaces are the only targeted RED tests left from the migrate scaffold.

## Self-Check: PASSED

- Key files exist on disk.
- Task commits are present in git history.
- Engine and migrate module verification commands were run.
- Plan 01-03 scope is isolated to CLI dispatch and command markdown.
- No unrelated dirty worktree changes were reverted.

---
*Phase: 01-add-oto-migrate-a-command-that-converts-a-gsd-era-project-s-*
*Completed: 2026-05-05*
