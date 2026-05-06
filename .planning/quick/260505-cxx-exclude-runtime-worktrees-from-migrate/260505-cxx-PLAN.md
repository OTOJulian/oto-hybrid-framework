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
---

# Quick 260505-cxx: Exclude Runtime Worktrees From Migrate

## Objective

Make `/oto-migrate` skip archived runtime agent worktrees by default so migrating a real GSD-era project does not rewrite `.claude/worktrees/agent-*`, `.codex/worktrees/agent-*`, or `.gemini/worktrees/agent-*` copies.

## Requirements

- `QUICK-260505-cxx-01`: Dry-run reports must not include files under runtime `worktrees/` directories.
- `QUICK-260505-cxx-02`: Apply mode must leave runtime `worktrees/` contents byte-for-byte untouched while still migrating the primary project.

## Verification

- Add failing regression coverage before implementation.
- Run the focused migrate/walker tests.
- Run the full test suite if focused verification passes.
