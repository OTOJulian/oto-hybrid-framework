---
phase: 09-upstream-sync-pipeline
verified: 2026-05-04T20:45:00Z
status: passed
score: 5/5 roadmap success criteria verified
requirements_completed:
  - SYN-01
  - SYN-02
  - SYN-03
  - SYN-04
  - SYN-05
  - SYN-06
  - SYN-07
must_haves:
  total: 25
  verified: 25
  failed: 0
  uncertain: 0
findings:
  blockers: 0
  warnings: 0
human_verification: []
gaps: []
---

# Phase 9: Upstream Sync Pipeline Verification Report

**Phase Goal:** Build the v1 upstream sync pipeline: pull rebranded GSD/Superpowers snapshots, apply the rename map, auto-merge non-overlapping changes through `git merge-file`, and surface only conflicts/deletions for user resolution.

**Status:** passed

## Goal Achievement

Phase 9 achieved the roadmap goal and the stricter user-locked bar recorded in `09-CONTEXT.md`: avoid manual editing for non-conflicts while still deferring any oto-built merge UI to v2. The implementation ships independent stage scripts, shared sync libraries, a user-facing `oto sync` subcommand, conflict/deletion acceptance helpers, committed sync metadata schemas, and offline tests using a real bare Git fixture.

The only intentional interpretation change is SYN-07: literal "three-way merge UX deferred to v2" remains true for oto-owned UI, but non-overlapping merge work is delegated to the existing `git merge-file` binary. Same-line conflicts still surface as sidecars for manual resolution.

## Roadmap Success Criteria

| Criterion | Status | Evidence |
|---|---|---|
| `pull-gsd.cjs` and `pull-superpowers.cjs` fetch pinned upstream snapshots under `.oto-sync/upstream/{name}/`. | VERIFIED | `scripts/sync-upstream/pull-gsd.cjs`, `scripts/sync-upstream/pull-superpowers.cjs`, and `bin/lib/sync-pull.cjs`; `tests/phase-09-pull-puller.test.cjs` verifies clone, rotation, tag, SHA, warning, dedup, and pin behavior. |
| Sync `rebrand.cjs` applies the rename map to an upstream snapshot and emits a rebranded tree. | VERIFIED | `scripts/sync-upstream/rebrand.cjs` wraps `scripts/rebrand/lib/engine.cjs`; `tests/phase-09-rebrand-sync.test.cjs` verifies byte-identical output to direct `engine.run({ mode: 'apply' })` and source-tree immutability. |
| `merge.cjs` compares prior/current rebranded snapshots and current `oto/`, emitting conflicts/deletions explicitly. | VERIFIED | `bin/lib/sync-merge.cjs`, `scripts/sync-upstream/merge.cjs`, and `bin/lib/sync-accept.cjs`; merge/add/delete/accept tests cover clean merges, same-line conflicts, binary sidecars, deletions, unclassified adds, and safe accept helpers. |
| Per-upstream pin and breaking-change records are written. | VERIFIED | `schema/last-synced-commit.json`, `.oto-sync/BREAKING-CHANGES-{gsd,superpowers}.md`, `prior-last-synced-commit.json` preservation, `writeReport`, and `appendBreakingChanges`; report tests verify append and regeneration semantics. |
| Running sync against a known upstream commit produces clean output and tests pass. | VERIFIED | `tests/phase-09-cli.integration.test.cjs` runs `oto sync` dry-run and two-pull `--apply` against a generated bare-repo fixture; final `npm test` passes with 393 pass, 1 skipped, 0 fail, 0 todo. |

## Requirement Verification

| Requirement | Status | Evidence |
|---|---|---|
| SYN-01 | VERIFIED | GSD puller script exists and delegates to `pullUpstream`; tests verify clone, rotation, tag and SHA paths. |
| SYN-02 | VERIFIED | Superpowers puller script exists with the same shared helper path; tests verify parameterization. |
| SYN-03 | VERIFIED | Sync rebrand wrapper reuses the Phase 2 engine and passes byte-identity tests. |
| SYN-04 | VERIFIED | Merge stage delegates to `git merge-file`, emits YAML sidecars for conflicts/additions/deletions, and supports accept helpers. |
| SYN-05 | VERIFIED | `last-synced-commit.json` validates against schema; previous pins are preserved for 3-way metadata. |
| SYN-06 | VERIFIED | `REPORT.md` regenerates each run and identical event content is appended to `BREAKING-CHANGES-{upstream}.md`. |
| SYN-07 | VERIFIED | `oto sync` is the single entry point; dry-run is default, `--apply` writes auto-merged output, and sidecars remain the resolution surface for true conflicts. |

## Key Links

- `bin/install.js` -> `bin/lib/sync-cli.cjs::runSync()` for `oto sync`.
- `bin/lib/sync-cli.cjs` -> `scripts/sync-upstream/{pull-gsd,pull-superpowers,rebrand,merge}.cjs`.
- `scripts/sync-upstream/rebrand.cjs` -> `scripts/rebrand/lib/engine.cjs::run({ mode: 'apply' })`.
- `scripts/sync-upstream/merge.cjs` -> `bin/lib/sync-merge.cjs::{mergeAll,writeReport,appendBreakingChanges}`.
- `bin/lib/sync-accept.cjs` -> `oto sync --accept`, `--accept-deletion`, and `--keep-deleted`.

## Automated Checks

| Check | Result |
|---|---|
| `gsd-sdk query phase-plan-index 9` | 6 plans, 6 summaries, `incomplete: []` |
| `gsd-sdk query verify.schema-drift 9` | `valid: true`, 0 issues, 6 checked |
| `node --test --test-concurrency=4 tests/phase-09-*.test.cjs` | 45 pass, 0 fail, 0 todo |
| `node --test --test-concurrency=4 tests/phase-09-cli.integration.test.cjs` | 7 pass, 0 fail |
| `npm test` | 393 pass, 1 skipped, 0 fail, 0 todo |
| `node bin/install.js sync --status` | exits 0 and prints status |

## Residual Notes

- The one skipped full-suite test is the pre-existing Gemini live invocation version gate (`gemini v0.26.0 < required v0.38`), not a Phase 9 failure.
- `reports/rebrand-dryrun.*` are rewritten by the full suite and remain outside Phase 9 commits.
- Phase 10 owns CI promotion and public sync documentation (`docs/upstream-sync.md`).
- No human verification is required for Phase 9 closeout; the fixture-backed `oto sync` tests cover the user-facing path offline.

## Gaps Summary

No phase-blocking gaps remain.

---

_Verified: 2026-05-04T20:45:00Z_
_Verifier: Codex (inline fallback; subagent unavailable in this runtime)_
