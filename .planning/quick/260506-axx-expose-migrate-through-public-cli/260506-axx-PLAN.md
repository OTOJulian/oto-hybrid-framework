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
---

# Quick 260506-axx: Expose Migrate Through Public CLI

## Objective

Fix `/oto:migrate` invocation in real target projects by routing `oto migrate` through the installed public `oto` binary instead of relying on a non-installed `oto-tools` PATH command.

## Requirements

- `QUICK-260506-axx-01`: `oto migrate --dry-run` must dispatch to the migrate implementation before installer argument parsing.
- `QUICK-260506-axx-02`: The `/oto:migrate` command markdown must instruct agents to call `oto migrate`, not `oto-tools migrate`.

## Verification

- Add failing regression coverage first.
- Run focused migrate CLI and command markdown tests.
- Run the full test suite.
