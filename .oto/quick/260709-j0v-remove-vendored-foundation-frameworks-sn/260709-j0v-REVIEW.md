---
phase: 260709-j0v-remove-vendored-foundation-frameworks-sn
reviewed: 2026-07-09T18:34:16Z
depth: quick
files_reviewed: 22
files_reviewed_list:
  - bin/lib/runtime-claude.cjs
  - bin/lib/runtime-codex.cjs
  - scripts/build-hooks.js
  - scripts/gen-inventory.cjs
  - scripts/rebrand.cjs
  - scripts/rebrand/lib/engine.cjs
  - tests/helpers/corpus-clone.cjs
  - tests/phase-01-agent-audit.test.cjs
  - tests/phase-01-inventory.test.cjs
  - tests/phase-02-allowlist.test.cjs
  - tests/phase-02-coverage-manifest.test.cjs
  - tests/phase-02-dryrun-report.test.cjs
  - tests/phase-02-engine-classify-corpus.integration.test.cjs
  - tests/phase-02-engine-classify.test.cjs
  - tests/phase-02-engine-no-source-mutation.test.cjs
  - tests/phase-02-roundtrip-isolation.test.cjs
  - tests/phase-02-roundtrip.test.cjs
  - tests/phase-02-summary-line.test.cjs
  - tests/phase-03-no-unwanted-runtimes.test.cjs
  - tests/phase-09-allowlist-corpus.integration.test.cjs
  - tests/phase-09-allowlist.test.cjs
  - tests/phase-09-rebrand-sync.test.cjs
  - tests/phase-10-license-attribution.test.cjs
  - decisions/ADR-14-inventory-scope.md
  - decisions/file-inventory.json
findings:
  critical: 0
  warning: 4
  info: 0
  total: 4
status: issues_found
---

# Phase 260709-j0v: Code Review Report

**Reviewed:** 2026-07-09T18:34:16Z
**Depth:** quick (with targeted deep-read of `tests/helpers/corpus-clone.cjs`, `scripts/rebrand.cjs`, `scripts/rebrand/lib/engine.cjs`, and `bin/lib/sync-pull.cjs` per the review brief's explicit focus areas)
**Files Reviewed:** 22 listed source/test files + 2 decision docs
**Status:** issues_found

## Summary

Reviewed the removal of vendored `foundation-frameworks/`, the new `tests/fixtures/rebrand-corpus/` fixture, the opt-in `OTO_SYNC_CORPUS=1` corpus-clone helper, the now-required `--target` flag on `scripts/rebrand.cjs`/`engine.run()`, and the citation rewrites in `bin/lib/runtime-claude.cjs` / `bin/lib/runtime-codex.cjs` / `scripts/build-hooks.js`.

Pattern scan found no hardcoded secrets, no dangerous functions (`eval`, `innerHTML`, `exec`), no empty catch blocks, and no stray debug artifacts in the reviewed diff. The `--target` guard in `scripts/rebrand.cjs` and `engine.run()` is implemented correctly and consistently (CLI-layer and library-layer checks both fail closed with a clear error and non-zero exit).

The real findings are all in the **test-coverage/robustness** category the review brief asked about: two of the three "does the rebrand engine correctly classify a real upstream tree" completeness checks were converted into an opt-in path that nothing in CI ever exercises, one was deleted outright with no replacement, and the new `corpus-clone.cjs` helper has two latent robustness gaps (a cold-cache concurrency race, and an unbounded blocking network call) in the failure modes the brief called out. None of these affect the default `npm test` run's correctness today, but they represent real, provable regressions in what the test suite protects against going forward — hence all classified WARNING rather than BLOCKER.

## Warnings

### WR-01: Real-upstream-tree completeness assertions are now permanently disabled in CI, with no scheduled/opt-in re-enablement

**File:** `tests/helpers/corpus-clone.cjs:20-25`, `tests/phase-02-engine-classify-corpus.integration.test.cjs:11-24`, `tests/phase-09-allowlist-corpus.integration.test.cjs:10-36`
**Issue:** `probeCorpusClone()` gates on `process.env.OTO_SYNC_CORPUS`, which is unset in every job in `.github/workflows/test.yml`, `install-smoke.yml`, and `release.yml` (verified via `grep -rn OTO_SYNC_CORPUS .github/`: zero hits). This means the two assertions that used to run on every `npm test` invocation against the real vendored `foundation-frameworks/` tree —
- "engine dry-run classifies the real upstream tree with zero unclassified matches" (`phase-02-engine-classify-corpus.integration.test.cjs`)
- "D-17 / Pitfall 7: allowlist completeness … 0 unclassified adds" (`phase-09-allowlist-corpus.integration.test.cjs`)

now `# SKIP OTO_SYNC_CORPUS not set` unconditionally in CI and for any developer who runs plain `npm test`. Verified directly:
```
$ node --test tests/phase-02-engine-classify-corpus.integration.test.cjs tests/phase-09-allowlist-corpus.integration.test.cjs
ok 1 - engine dry-run classifies the real upstream tree with zero unclassified matches # SKIP OTO_SYNC_CORPUS not set
ok 2 - D-17 / Pitfall 7: allowlist completeness ... # SKIP OTO_SYNC_CORPUS not set
```
The replacement fixture (`tests/fixtures/rebrand-corpus/`) is only 8 files, vs. the full GSD+Superpowers trees (1,129 files) the assertions previously ran against — a real-world regression in rename-map coverage (e.g. a new file naming pattern added upstream that the rename rules don't classify) will no longer be caught by any automated, always-on test. There is no nightly/scheduled workflow, cron job, or pre-release checklist step anywhere in the repo that sets `OTO_SYNC_CORPUS=1` — the opt-in path is only ever exercised by a human remembering to type the env var.
**Fix:** Add a scheduled GitHub Actions workflow (e.g. `.github/workflows/corpus-nightly.yml`, `on: schedule` + `workflow_dispatch`) that runs `OTO_SYNC_CORPUS=1 npm test`, or at minimum document a required pre-release manual step in CLAUDE.md/README so the coverage guarantee isn't silently lost.

### WR-02: `phase-01-inventory.test.cjs`'s inventory-completeness check was deleted with no corpus-gated replacement, unlike the other two completeness tests

**File:** `tests/phase-01-inventory.test.cjs` (test removed in commit `3ef9f00`, previously lines ~30-38)
**Issue:** The commit that repointed FIXTURE-class tests deleted `test('entry count matches filesystem walk', ...)` outright:
```diff
-test('entry count matches filesystem walk', () => {
-  const data = JSON.parse(fs.readFileSync(INVENTORY_PATH, 'utf8'));
-  const fsCount = parseInt(
-    execSync('find foundation-frameworks/get-shit-done-main foundation-frameworks/superpowers-main -type f | wc -l', ...).toString().trim(), 10
-  );
-  assert.equal(data.entries.length, fsCount, ...);
-});
```
Unlike the other two completeness assertions extracted in `353b9a4` (`phase-02-engine-classify-corpus.integration.test.cjs`, `phase-09-allowlist-corpus.integration.test.cjs`, both preserved as opt-in `OTO_SYNC_CORPUS=1` integration tests), this one has **no** corpus-gated counterpart anywhere in the tree (`ls tests/ | grep -i corpus` shows only the two files above — no `phase-01-inventory-corpus.integration.test.cjs`). The invariant "`decisions/file-inventory.json` covers every file that actually existed in the two pinned upstream snapshots" is now completely unverifiable by any automated test, ever, even opt-in — it can only be checked by manually re-cloning both upstreams and re-running `find | wc -l` by hand. If `file-inventory.json` is hand-edited in the future (an entry accidentally dropped or duplicated) nothing will catch it.
**Fix:** Either add a corpus-gated equivalent (clone `GSD_REF`/`SUPERPOWERS_REF` via the existing `tests/helpers/corpus-clone.cjs`, `find`-count both, compare to `data.entries.length`), or explicitly document in `decisions/file-inventory.json`'s `historical_note` (and in the deletion commit) that this specific invariant is permanently unverified going forward — the current commit message ("now-obsolete") implies the check was unnecessary, when in fact it's unverifiable-not-obsolete, which understates the coverage loss.

### WR-03: Cold-cache race condition when both `*-corpus.integration.test.cjs` files run concurrently under `OTO_SYNC_CORPUS=1`

**File:** `tests/helpers/corpus-clone.cjs:27-42` (via `bin/lib/sync-pull.cjs:84-140`, not in review scope but load-bearing)
**Issue:** `cloneCorpus()` computes a fixed, non-random `destDir = os.tmpdir()/oto-sync-corpus-<name>` and both `tests/phase-02-engine-classify-corpus.integration.test.cjs` and `tests/phase-09-allowlist-corpus.integration.test.cjs` call `cloneCorpus(GSD_REF)` with that same `destDir`. The code comment at the top of the file explicitly claims this is safe ("Actual clone dedup comes from `pullUpstream()` itself … short-circuits … when `destDir/last-synced-commit.json`'s sha already matches"), but that short-circuit only protects the **warm-cache** case (a valid `current/` + matching pin file already present). `npm test` runs with `node --test --test-concurrency=4 tests/*.test.cjs` (see `package.json`), and both integration test files match that glob, so on a **cold cache** (first-ever run, no `last-synced-commit.json` yet — e.g. a fresh CI runner or a cleared `/tmp`) both child processes can enter `pullUpstream()` concurrently, both find no pin file, both skip the short-circuit, and both call `runGit(['clone', '--branch', ref, url, current])` against the identical `destDir/current` path at the same time. `git clone` refuses to clone into an existing non-empty directory, so the loser of the race throws `git clone ... failed`, which propagates up through `cloneCorpus()` → the test's `await cloneCorpus(GSD_REF)` → an uncaught rejection that fails the test. This is a flaky-CI-failure bug specifically in the "cold cache" scenario the review brief asked to check.
**Fix:** Either serialize the two corpus-integration test files (e.g. a lockfile / `flock`-style mutex around `pullUpstream` keyed on `destDir`, or a `proper-lockfile`-style retry-with-backoff in `cloneCorpus`), or make `destDir` unique per test-process (e.g. include `process.pid` or a `crypto.randomUUID()` suffix) at the cost of losing the warm-cache dedup the comment is trying to preserve. At minimum, update the misleading comment — it currently asserts the race is handled when it is only handled for the warm-cache path.

### WR-04: Unbounded blocking `git clone`/`checkout` calls defeat the declared `{ timeout: 120000 }` test timeout on partial/stalled network connectivity

**File:** `tests/phase-02-engine-classify-corpus.integration.test.cjs:13`, `tests/phase-09-allowlist-corpus.integration.test.cjs:12`, via `bin/lib/sync-pull.cjs:34-47` (`runGit` → `spawnSync('git', args, { encoding: 'utf8', ...opts })`, no `opts.timeout`)
**Issue:** `probeCorpusClone()` correctly bounds its liveness check with `spawnSync(..., { timeout: 10000 })`, but the actual clone/checkout calls made later inside `pullUpstream()` (via `runGit`) pass no `timeout` at all. `spawnSync` blocks the entire Node event loop synchronously until the child process exits — while it is blocked, `node:test`'s per-test `{ timeout: 120000 }` cannot fire (its own timer can't tick on a halted event loop). So a "partial clone" failure mode — the probe's fast `ls-remote` succeeds (connection reachable), but the subsequent full `git clone --depth 1 --branch ...` stalls partway through (flaky network, GitHub rate-limiting, DNS partial failure) — will hang the test process indefinitely rather than failing at the documented 120s bound. This directly matches the "partial clone" failure mode called out in the review brief.
**Fix:** Pass an explicit `timeout` (and `killSignal`) to every `spawnSync('git', ...)` call inside `runGit`/`pullUpstream`, e.g. `spawnSync('git', args, { encoding: 'utf8', timeout: 90000, killSignal: 'SIGKILL', ...opts })`, so a stalled clone fails fast with a clear error instead of hanging the whole test run past its documented bound.

---

_Reviewed: 2026-07-09T18:34:16Z_
_Reviewer: Claude (oto-code-reviewer)_
_Depth: quick_
