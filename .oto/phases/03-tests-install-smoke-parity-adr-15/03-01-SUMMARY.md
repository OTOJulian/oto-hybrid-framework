# Plan 03-01 Summary: ingest-docs + eval-review regression tests

## Outcome

Completed.

## Changes

- Flipped `decisions/file-inventory.json` for `tests/ingest-docs.test.cjs` from `drop` to `keep`, with `rebrand_required: true`, `target_path`, and Phase 3 ownership.
- Ported upstream `tests/ingest-docs.test.cjs` through the rebrand engine.
- Applied Phase 3 hand-fixups:
  - Updated classifier agent assertion to require `Read, Grep, Glob` and reject `Write` per Phase 1 D-04.
  - Removed the out-of-scope `/oto-import` shared conflict-engine describe block.
  - Corrected generated paths to this repo's `oto/commands` and `oto/agents` layout.
- Added `tests/eval-review.test.cjs` with structural, workflow-shape, SDK fallback, scoring vocabulary, and D-04 read-only auditor assertions.

## Verification

- `node --test tests/ingest-docs.test.cjs` — passed, 37 pass, 0 fail.
- `node --test tests/eval-review.test.cjs` — passed, 12 pass, 0 fail.
- `rg -n "gsd-|\\.planning/|get-shit-done/|import command adopts shared conflict-engine" tests/ingest-docs.test.cjs` — no hits.
- `node -e "JSON.parse(require('fs').readFileSync('decisions/file-inventory.json','utf8')); console.log('JSON OK')"` — passed.
- `npm test` — passed, 611 tests, 610 pass, 1 skipped, 0 fail.

## Deviations from Plan

- The rebrand-generated ingest-docs test used upstream root-relative paths for `commands/` and `agents/`. I corrected them to this repo's shipped layout under `oto/commands/` and `oto/agents/` so the ported test exercises actual OTO artifacts.

## Self-Check: PASSED
