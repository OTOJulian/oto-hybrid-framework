---
phase: 09-upstream-sync-pipeline
status: clean
depth: standard
files_reviewed: 22
findings:
  critical: 0
  warning: 0
  info: 0
  total: 0
reviewed_at: 2026-05-04T20:35:00Z
---

# Phase 09 Code Review

## Scope

Reviewed the Phase 9 upstream-sync implementation and tests:

- `bin/install.js`
- `bin/lib/sync-accept.cjs`
- `bin/lib/sync-cli.cjs`
- `bin/lib/sync-merge.cjs`
- `bin/lib/sync-pull.cjs`
- `scripts/rebrand/lib/engine.cjs`
- `scripts/sync-upstream/merge.cjs`
- `scripts/sync-upstream/pull-gsd.cjs`
- `scripts/sync-upstream/pull-superpowers.cjs`
- `scripts/sync-upstream/rebrand.cjs`
- `package.json`
- Phase 9 test files and fixtures under `tests/phase-09-*.test.cjs` and `tests/fixtures/phase-09/`

## Findings

No remaining critical, warning, or info findings.

## Review Notes

- Verified user-controlled refs flow through `validateRef` before subprocess staging. The option-like `--to --upload-pack=evil` path is pre-checked so Node's `parseArgs` ambiguity does not bypass the intended guardrail.
- Verified conflict/deletion accept helpers resolve paths under configured roots and keep marker refusal start-of-line anchored.
- Verified full sync stages use `spawnSync(process.execPath, [script, ...args])` with argv arrays, not shell strings.
- Verified dry-run mode avoids writes to `oto/`; expected report and audit-log outputs are still emitted.
- Fixed one review-found edge case before this report: `rotateRebrandedSnapshot()` now returns without deleting `prior/` when no `current/` snapshot exists, preserving recovery state after partial/failed sync attempts. Commit: `0aca4fb`.

## Verification

- `node --test --test-concurrency=4 tests/phase-09-cli.integration.test.cjs` passed after the review fix.
- `npm test` passed before the review fix: 393 pass, 1 skipped, 0 fail, 0 todo.

