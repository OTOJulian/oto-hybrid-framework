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
    - scripts/rebrand/lib/walker.cjs
    - scripts/rebrand/lib/engine.cjs
    - scripts/rebrand/lib/manifest.cjs
    - tests/migrate-dry-run.test.cjs
    - tests/migrate-apply.test.cjs
---

# Quick 260506-bxx: Skip Gitignored Migrate Artifacts

## Objective

Prevent `/oto-migrate` from scanning and rewriting untracked gitignored generated artifacts, such as self-contained HTML evaluation outputs with embedded base64 data.

## Requirements

- `QUICK-260506-bxx-01`: Dry-run reports must exclude untracked files ignored by the target project's gitignore rules.
- `QUICK-260506-bxx-02`: Apply mode must leave those untracked gitignored files byte-for-byte untouched while still migrating tracked project artifacts.

## Verification

- Add failing regression coverage before implementation.
- Run focused migrate dry-run/apply tests.
- Run the full test suite.
