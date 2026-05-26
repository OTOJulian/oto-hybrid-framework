---
phase: 260505-cxx-exclude-runtime-worktrees-from-migrate
plan: 01
type: quick
tags: [migrate, runtime-worktrees, regression-test]
requirements:
  - QUICK-260505-cxx-01
  - QUICK-260505-cxx-02
key-files:
  modified:
    - scripts/rebrand/lib/walker.cjs
    - oto/bin/lib/migrate.cjs
    - tests/migrate-dry-run.test.cjs
    - tests/migrate-apply.test.cjs
    - tests/phase-02-walker.test.cjs
    - oto/commands/oto/migrate.md
commits:
  - 69f8969  # fix(migrate): skip runtime worktrees
metrics:
  completed: 2026-05-05
  tests_pass: 455
  tests_fail: 0
  tests_skipped: 1
---

# Quick 260505-cxx: Exclude Runtime Worktrees From Migrate Summary

`/oto-migrate` now excludes archived runtime agent worktrees by default:

- `.claude/worktrees/`
- `.codex/worktrees/`
- `.gemini/worktrees/`

The exclusion lives in the shared rebrand walker, so dry-run reports no longer count those archived copies. The migrate backup/copy helpers also use the same path-prefix skip list, so apply mode leaves runtime worktree contents untouched.

## Verification

- `node --test tests/migrate-dry-run.test.cjs tests/migrate-apply.test.cjs` reproduced the bug before implementation.
- `node --test tests/phase-02-walker.test.cjs tests/migrate-dry-run.test.cjs tests/migrate-apply.test.cjs`
- `node --test tests/migrate-command-md.test.cjs`
- `npm test`
