---
phase: 260506-axx-expose-migrate-through-public-cli
plan: 01
type: quick
tags: [migrate, cli, command-surface]
requirements:
  - QUICK-260506-axx-01
  - QUICK-260506-axx-02
key-files:
  modified:
    - bin/install.js
    - oto/commands/oto/migrate.md
    - tests/migrate-cli.test.cjs
    - tests/migrate-command-md.test.cjs
commits:
  - df7aba5  # fix(migrate): expose public cli dispatch
metrics:
  completed: 2026-05-06
  tests_pass: 455
  tests_fail: 0
  tests_skipped: 1
---

# Quick 260506-axx: Expose Migrate Through Public CLI Summary

`/oto:migrate` now has a working command path in real target projects:

- `bin/install.js` routes `oto migrate ...` to `oto/bin/lib/migrate.cjs` before installer argument parsing.
- `oto/commands/oto/migrate.md` now tells agents to run `oto migrate`, not `oto-tools migrate`.
- Regression coverage proves `oto migrate --dry-run` dispatches successfully from a fixture project.

## Verification

- `node --test tests/migrate-cli.test.cjs tests/migrate-command-md.test.cjs` reproduced the missing public dispatch before implementation.
- `node --test tests/migrate-cli.test.cjs tests/migrate-command-md.test.cjs`
- `npm test`
