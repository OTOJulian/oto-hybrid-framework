---
phase: 260506-bxx-skip-gitignored-migrate-artifacts
plan: 01
type: quick
tags: [migrate, gitignore, generated-artifacts]
requirements:
  - QUICK-260506-bxx-01
  - QUICK-260506-bxx-02
key-files:
  modified:
    - oto/bin/lib/migrate.cjs
    - oto/commands/oto/migrate.md
    - scripts/rebrand/lib/walker.cjs
    - scripts/rebrand/lib/engine.cjs
    - scripts/rebrand/lib/manifest.cjs
    - tests/migrate-dry-run.test.cjs
    - tests/migrate-apply.test.cjs
    - tests/migrate-command-md.test.cjs
commits:
  - 4230d59  # fix(migrate): skip gitignored generated artifacts
metrics:
  completed: 2026-05-06
  tests_pass: 457
  tests_fail: 0
  tests_skipped: 1
---

# Quick 260506-bxx: Skip Gitignored Migrate Artifacts Summary

`/oto-migrate` now excludes untracked files ignored by the target project's gitignore rules. This keeps local generated evidence such as `docs/results/*.html` out of migrate dry-run/apply scope without hard-coding one project's artifact directory.

The skip is passed into the rebrand walker for dry-run, apply, and pre-coverage manifest generation, so ignored generated files are not read, counted, rewritten, or asserted against.

## Verification

- `node --test tests/migrate-dry-run.test.cjs tests/migrate-apply.test.cjs` reproduced the bug before implementation.
- `node --test tests/migrate-dry-run.test.cjs tests/migrate-apply.test.cjs tests/phase-02-walker.test.cjs`
- `node --test tests/migrate-command-md.test.cjs tests/migrate-dry-run.test.cjs tests/migrate-apply.test.cjs`
- `npm test`
- `oto migrate --dry-run --project-dir /Users/Julian/Documents/one-one-dev-test`
