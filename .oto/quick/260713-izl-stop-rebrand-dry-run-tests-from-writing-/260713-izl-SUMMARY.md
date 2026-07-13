---
phase: quick-260713-izl
plan: 01
subsystem: rebrand-tooling
tags: [tests, hygiene, rebrand, tmpdir]
requires: []
provides:
  - "scripts/rebrand.cjs --reports-dir flag plumbed to engine.run opts.reportsDir"
  - "npm test leaves git status clean on every run (idempotent)"
  - "reports/rebrand-dryrun.{json,md} removed from git tracking"
affects: [rebrand-cli, test-suite]
tech-stack:
  added: []
  patterns: ["fs.mkdtempSync(os.tmpdir()) per-test report dirs with try/finally rmSync cleanup"]
key-files:
  created: []
  modified:
    - scripts/rebrand.cjs
    - tests/phase-02-dryrun-report.test.cjs
    - tests/phase-02-engine-classify-corpus.integration.test.cjs
  deleted:
    - reports/rebrand-dryrun.json
    - reports/rebrand-dryrun.md
decisions:
  - "DELETE (not keep) the tracked reports/rebrand-dryrun.* artifacts — reports/ is already gitignored; no test reads committed report content without regenerating it; keep-committed would have been the larger diff"
metrics:
  duration: "3 min"
  tasks: 2
  files: 5
  completed: "2026-07-13T17:48:19Z"
---

# Quick Task 260713-izl: Stop rebrand dry-run tests from writing tracked report files — Summary

**One-liner:** Added a `--reports-dir` output-path flag to the rebrand CLI, redirected the two report-writing test files to OS tmpdirs (`fs.mkdtempSync` + try/finally cleanup), and `git rm`'d the stale tracked `reports/rebrand-dryrun.{json,md}` so `npm test` leaves a clean tree on every run.

## What Was Done

### Task 1: `--reports-dir` CLI flag + tmpdir redirection (commit 15b1448)

- **scripts/rebrand.cjs** — added `'reports-dir': { type: 'string' }` to the strict `parseArgs` options and passed `reportsDir: values['reports-dir'] ? path.resolve(values['reports-dir']) : undefined` to `engine.run`. Output-path plumbing only; `scripts/rebrand/lib/engine.cjs` (which already supported `opts.reportsDir` in both dry-run and apply modes) is untouched — its diff is empty.
- **tests/phase-02-dryrun-report.test.cjs** — `runDryrun()` now creates `fs.mkdtempSync(path.join(os.tmpdir(), 'oto-dryrun-report-'))`, appends `--reports-dir <tmpdir>` to the spawnSync argv, and returns `{ result, reportsDir }`; all 4 tests (including the inline-argv 'projected target paths' test) read `rebrand-dryrun.{json,md}` from the tmpdir and remove it in `finally`. No assertion semantics changed (exit 0, files exist, md non-empty, unclassified_total 0, rule-type counts, D-04 shape, projected target_path values).
- **tests/phase-02-engine-classify-corpus.integration.test.cjs** — passes `reportsDir` (a `oto-corpus-classify-` tmpdir) in the `engine.run` opts and reads the report JSON from it, with `finally` cleanup. Skip condition (corpus clone probe) unchanged — test still skips when no corpus clone is available.
- Per the writer audit, `tests/rebrand-engine.test.cjs` (intentionally pins default repo-reports path), `tests/phase-10-rebrand-snapshot.test.cjs`, and `tests/regen-rebrand-snapshots.cjs` were left unchanged.

### Task 2: Delete stale tracked reports + prove clean tree (commit f1e3755)

- `git rm -f reports/rebrand-dryrun.json reports/rebrand-dryrun.md` (51,769 lines removed) — this simultaneously resolved the pre-existing dirty `M reports/rebrand-dryrun.*` working copies.
- Verified `.gitignore` already contains `reports/` (line 2) — no duplicate rule added. Residual default-path writes (e.g., rebrand-engine.test.cjs's intentional default-path tests) now produce ignored-only files.

## Delete-vs-Keep Decision: DELETE

**Chose DELETE for `reports/rebrand-dryrun.*` — deleted; `reports/` already gitignored.** Rationale (assertion-grounded, per the plan's locked decision):

1. `.gitignore` already contained `reports/` — the two tracked files were anomalies committed despite the ignore rule (pre-260709-j0v corpus leftovers). Untracking them lets the existing ignore rule take over for all future writes, including `rebrand-engine.test.cjs`'s intentional default-path tests.
2. No test assertion reads committed report content without first running a dry-run itself — deletion breaks nothing (proven: full suite 737 pass / 0 fail after deletion).
3. Keep-committed would have been the LARGER diff: it required a `git checkout` restore PLUS rewriting `rebrand-engine.test.cjs`'s two "default ... writes under repo reports" tests (which exist precisely to pin default-path behavior) to stop them overwriting the committed files.
4. Deletion also resolved the currently-dirty working copies (`M reports/rebrand-dryrun.*`) in the same move — no separate restore step.

## Verification Results

| Gate | Result |
|------|--------|
| `npm test` exits 0 (full suite) | PASS — 740 tests, 737 pass, 0 fail, 3 skipped |
| `git status --porcelain` clean after `npm test` | PASS — completely empty (no modified tracked files, no reports/ entries) |
| `git ls-files reports/` empty | PASS — 0 tracked files under reports/ |
| `git diff scripts/rebrand/lib/engine.cjs` empty (no matching-logic changes) | PASS — empty diff |
| Second `npm test` run — tree still clean (idempotence) | PASS — exit 0, porcelain empty |
| Corpus integration test skip condition preserved | PASS — 1 test, 1 skipped when no corpus clone |

## Commits

| Task | Commit | Type | Description |
|------|--------|------|-------------|
| 1 | 15b1448 | fix | Redirect rebrand dry-run test reports to OS tmpdirs (`--reports-dir` flag + 2 test files) |
| 2 | f1e3755 | chore | Delete stale tracked rebrand dry-run reports (2 files, 51,769 deletions) |

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None — the `--reports-dir` flag is output-path plumbing on a developer-only script; no new network, auth, or trust-boundary surface.

## Self-Check: PASSED

- All 3 modified source/test files exist and contain their must-have markers (`reports-dir`, `mkdtemp`, `reportsDir`)
- Commits 15b1448 and f1e3755 present in git log
- `git ls-files reports/` empty; on-disk `reports/rebrand-dryrun.*` regenerated by the intentional default-path tests is confirmed gitignored (`git check-ignore` matches) and does not appear in `git status`
