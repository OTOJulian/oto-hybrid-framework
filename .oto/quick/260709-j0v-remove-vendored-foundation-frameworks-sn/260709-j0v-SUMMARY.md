---
phase: quick
plan: 260709-j0v
subsystem: testing
tags: [node-test, rebrand-engine, sync-pipeline, fixtures, git-clone]

# Dependency graph
requires: []
provides:
  - "tests/fixtures/rebrand-corpus/ curated fixture tree (8 real files, ~224KB) replacing foundation-frameworks/ for FIXTURE-class rebrand-engine tests"
  - "tests/helpers/corpus-clone.cjs shared opt-in pinned-clone helper (OTO_SYNC_CORPUS=1) reusing bin/lib/sync-pull.cjs"
  - "tests/phase-02-engine-classify-corpus.integration.test.cjs and tests/phase-09-allowlist-corpus.integration.test.cjs — opt-in completeness tests against a real cloned upstream tree"
  - "scripts/rebrand.cjs / scripts/rebrand/lib/engine.cjs now require an explicit --target (no silent foundation-frameworks/ default)"
  - "foundation-frameworks/ (13MB, 1,129 tracked files) fully removed from the repository"
affects: [rebrand-engine, sync-upstream, decisions]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Opt-in network-gated integration tests via node:test's { skip: probe().reason || false } pattern (precedent: tests/phase-08-smoke-codex.integration.test.cjs)"
    - "Curated committed fixture subtree for unit-style tests instead of a full vendored upstream copy"

key-files:
  created:
    - tests/fixtures/rebrand-corpus/get-shit-done-main/LICENSE
    - tests/fixtures/rebrand-corpus/get-shit-done-main/package.json
    - tests/fixtures/rebrand-corpus/get-shit-done-main/README.md
    - tests/fixtures/rebrand-corpus/get-shit-done-main/get-shit-done/workflows/ingest-docs.md
    - tests/fixtures/rebrand-corpus/get-shit-done-main/get-shit-done/workflows/eval-review.md
    - tests/fixtures/rebrand-corpus/get-shit-done-main/get-shit-done/workflows/execute-phase.md
    - tests/fixtures/rebrand-corpus/get-shit-done-main/get-shit-done/workflows/plan-phase.md
    - tests/fixtures/rebrand-corpus/superpowers-main/LICENSE
    - tests/helpers/corpus-clone.cjs
    - tests/phase-02-engine-classify-corpus.integration.test.cjs
    - tests/phase-09-allowlist-corpus.integration.test.cjs
  modified:
    - tests/phase-02-allowlist.test.cjs
    - tests/phase-02-coverage-manifest.test.cjs
    - tests/phase-02-dryrun-report.test.cjs
    - tests/phase-02-roundtrip-isolation.test.cjs
    - tests/phase-02-engine-no-source-mutation.test.cjs
    - tests/phase-02-roundtrip.test.cjs
    - tests/phase-02-summary-line.test.cjs
    - tests/phase-09-rebrand-sync.test.cjs
    - tests/phase-10-license-attribution.test.cjs
    - tests/phase-01-inventory.test.cjs
    - tests/phase-01-agent-audit.test.cjs
    - tests/phase-03-no-unwanted-runtimes.test.cjs
    - tests/phase-02-engine-classify.test.cjs
    - tests/phase-09-allowlist.test.cjs
    - scripts/rebrand.cjs
    - scripts/rebrand/lib/engine.cjs
    - bin/lib/runtime-claude.cjs
    - bin/lib/runtime-codex.cjs
    - scripts/build-hooks.js
    - decisions/file-inventory.json
    - decisions/ADR-14-inventory-scope.md
    - scripts/gen-inventory.cjs

key-decisions:
  - "Reused the 8 real files already proven to classify with zero unclassified matches, rather than hand-authoring fixture content, to guarantee fixture-based tests keep passing without new token-collision authoring"
  - "Accepted the ~224KB fixture tree size (slightly over CONTEXT.md's ~100-200KB guide) since execute-phase.md/plan-phase.md are real workflow docs and every file is load-bearing for a specific test"
  - "Corpus-clone helper strips the clone's .git directory before handing the tree to mergeAll/engine consumers so the opt-in test tree matches the shape of the original vendored (non-git) snapshot"
  - "decisions/file-inventory.json and ADR-14 got additive historical annotations only; original decision content and entries array untouched"

patterns-established:
  - "New *.integration.test.cjs files for network-gated completeness assertions are matched by the existing tests/*.test.cjs glob and skip cleanly via node:test's { skip } option when OTO_SYNC_CORPUS is unset or network/git is unavailable"

requirements-completed: [j0v-fixtures, j0v-corpus-optin, j0v-rebrand-fix, j0v-citations, j0v-historical, j0v-removal]

# Metrics
duration: 7min
completed: 2026-07-09
---

# Quick Task 260709-j0v: Remove vendored foundation-frameworks/ Summary

**Removed the 13MB / 1,129-file vendored foundation-frameworks/ snapshot from the repo, replacing it with a committed 224KB curated fixture tree for unit tests plus two opt-in pinned-clone integration tests for completeness coverage, and made the manual rebrand CLI fail loudly instead of silently defaulting to the now-deleted folder.**

## Performance

- **Duration:** 7 min (14:17–14:24 local, per task commit timestamps)
- **Tasks:** 3
- **Files modified:** 22 tracked (excl. the 1,129 foundation-frameworks/ deletions)

## Accomplishments
- Built `tests/fixtures/rebrand-corpus/` (8 real files copied byte-for-byte from the vendored snapshot before deletion) and repointed 11 FIXTURE-class test files at it; deleted the one genuinely obsolete filesystem-count sub-test
- Extracted the two full-corpus completeness assertions into opt-in `*.integration.test.cjs` files gated on `OTO_SYNC_CORPUS=1`, backed by a shared `tests/helpers/corpus-clone.cjs` helper that reuses `bin/lib/sync-pull.cjs`
- Made `scripts/rebrand.cjs --target` required at both the CLI layer and `engine.run()` layer, with a clear "target is required" error instead of a silent zero-file walk
- Converted all vendored-path code-comment citations to `get-shit-done@v1.38.5 <path>:<line>` form
- Annotated `decisions/file-inventory.json`, `decisions/ADR-14-inventory-scope.md`, and `scripts/gen-inventory.cjs` as historical records (additive only)
- Deleted `foundation-frameworks/` from git; confirmed `npm test` passes offline (632 pass, 0 fail, 3 skipped — 2 new opt-in corpus tests + the pre-existing gemini-platform skip) and `OTO_SYNC_CORPUS=1 npm test` actually clones `get-shit-done@v1.38.5` and passes both corpus tests for real (634 pass, 0 fail, 1 skipped)

## Task Commits

Each task was committed atomically:

1. **Task 1: Build the curated fixture corpus and repoint FIXTURE-class tests** - `3ef9f00` (feat)
2. **Task 2: Extract opt-in corpus tests, require an explicit rebrand target, rewrite citation comments** - `353b9a4` (feat)
3. **Task 3: Delete foundation-frameworks/, annotate historical records, full-suite verification** - `cd8d211` (feat)

_Note: the orchestrator handles the docs/STATE.md commit separately (Step 8)._

## Files Created/Modified

See frontmatter `key-files`. Highlights:
- `tests/fixtures/rebrand-corpus/` — new curated fixture tree (8 files, ~224KB)
- `tests/helpers/corpus-clone.cjs` — shared opt-in pinned-clone helper
- `tests/phase-02-engine-classify-corpus.integration.test.cjs`, `tests/phase-09-allowlist-corpus.integration.test.cjs` — new opt-in completeness tests
- `scripts/rebrand.cjs`, `scripts/rebrand/lib/engine.cjs` — required `--target`, no silent default
- `bin/lib/runtime-claude.cjs`, `bin/lib/runtime-codex.cjs`, `scripts/build-hooks.js` — citation rewrites
- `decisions/file-inventory.json`, `decisions/ADR-14-inventory-scope.md`, `scripts/gen-inventory.cjs` — historical annotations
- `foundation-frameworks/` — deleted (1,129 files)

## Decisions Made
- Fixture files reused verbatim from the vendored snapshot (already proven zero-unclassified) rather than hand-authored, to avoid introducing new token-collision risk.
- Accepted the ~224KB fixture size deviation from CONTEXT.md's ~100-200KB guide since `execute-phase.md`/`plan-phase.md` are large real workflow docs and every file is load-bearing for a named test (per plan's pre-approved deviation note).
- `rename-map.json`'s `foundation-frameworks/**` do-not-rename glob, `bin/lib/copy-files.cjs`'s `TOKEN_DENY_PATH_CONTAINS` entry, and `bin/lib/sync-merge.cjs`'s dead `/foundation-frameworks/` branch were left completely untouched per the plan's explicit no-op decision (still asserted on by `tests/phase-01-rename-map.test.cjs` and `tests/05-token-substitution.test.cjs`).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `tests/helpers/corpus-clone.cjs` left a `.git` dir in the cloned tree, causing false-positive unclassified adds under `OTO_SYNC_CORPUS=1`**
- **Found during:** Task 3 full-suite verification (`OTO_SYNC_CORPUS=1 npm test`)
- **Issue:** `bin/lib/sync-pull.cjs`'s `pullUpstream()` performs a real `git clone`, leaving a `.git` metadata directory inside the returned `current` tree. `bin/lib/sync-merge.cjs`'s `walkFiles()` has no `.git` exclusion (unlike `scripts/rebrand/lib/walker.cjs`'s `SCRATCH_DIRS`), so the new `tests/phase-09-allowlist-corpus.integration.test.cjs` test flagged every packed git object (`.git/objects/pack/*.pack`, `.git/packed-refs`, `.git/shallow`, etc.) as an "unclassified upstream addition," failing the `unclassifiedAdds === 0` assertion — a false positive since the original vendored `foundation-frameworks/` snapshot was a plain directory copy that never had a `.git` folder.
- **Fix:** After `pullUpstream()` returns, `cloneCorpus()` now removes `<current>/.git` via `fsp.rm(..., { recursive: true, force: true })` before handing the directory to callers, restoring parity with the original non-git vendored snapshot shape.
- **Files modified:** `tests/helpers/corpus-clone.cjs`
- **Verification:** Re-ran `OTO_SYNC_CORPUS=1 node --test tests/phase-02-engine-classify-corpus.integration.test.cjs tests/phase-09-allowlist-corpus.integration.test.cjs` (2/2 pass), then the full `OTO_SYNC_CORPUS=1 npm test` (634 pass, 0 fail, 1 skipped).
- **Committed in:** `cd8d211` (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 bug fix)
**Impact on plan:** Necessary for the must_have "`OTO_SYNC_CORPUS=1 npm test` ... actually clones ... and exercises the two completeness assertions ... against the real cloned tree" to actually pass rather than just execute. No scope creep — fix confined to the test helper file this plan created.

## Issues Encountered
- `reports/rebrand-dryrun.json` and `reports/rebrand-dryrun.md` are tracked-but-gitignored generated report artifacts that get rewritten every time the dry-run CLI runs (including during this plan's test runs). They were already dirty at session start (pre-existing, unrelated to this task) and remain modified-but-uncommitted on disk at the end of this plan — out of scope per the deviation rules' scope boundary (not in the plan's `files_modified`, not caused by this task's code changes, purely a side effect of running the test suite). Left uncommitted for the orchestrator/next session to handle if desired.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `foundation-frameworks/` is fully gone from git; the repo is ~13MB lighter.
- `npm test` is green offline (632/632 non-skipped pass) and `OTO_SYNC_CORPUS=1 npm test` proves the opt-in corpus path works end-to-end against the real pinned upstream tags when network is available.
- The manual rebrand CLI (`node scripts/rebrand.cjs`) now requires `--target` explicitly; all 18 originally-dependent test files and the sync pipeline already pass one, so no further follow-up is required there.
- No blockers for future work.

---
*Phase: quick*
*Completed: 2026-07-09*

## Self-Check: PASSED

All 11 created files verified present (fixture tree, corpus-clone helper, 2 integration test files). `foundation-frameworks/` verified absent. All 3 task commits (`3ef9f00`, `353b9a4`, `cd8d211`) verified present in git log.
