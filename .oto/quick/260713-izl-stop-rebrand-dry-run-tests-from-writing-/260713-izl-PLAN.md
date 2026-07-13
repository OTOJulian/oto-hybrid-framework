---
phase: quick-260713-izl
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - scripts/rebrand.cjs
  - tests/phase-02-dryrun-report.test.cjs
  - tests/phase-02-engine-classify-corpus.integration.test.cjs
  - reports/rebrand-dryrun.json
  - reports/rebrand-dryrun.md
autonomous: true
requirements: []

must_haves:
  truths:
    - "npm test exits 0"
    - "git status --porcelain shows no modified tracked files and no new reports/ entries immediately after npm test"
    - "No test run by npm test writes to a git-tracked file"
    - "Committed reports/rebrand-dryrun.json and reports/rebrand-dryrun.md are removed from the repo (delete option chosen)"
  artifacts:
    - path: "scripts/rebrand.cjs"
      provides: "--reports-dir CLI flag plumbed to engine.run opts.reportsDir"
      contains: "reports-dir"
    - path: "tests/phase-02-dryrun-report.test.cjs"
      provides: "Dry-run tests that write and read reports from an OS tmpdir"
      contains: "mkdtemp"
    - path: "tests/phase-02-engine-classify-corpus.integration.test.cjs"
      provides: "Corpus integration test using reportsDir tmpdir"
      contains: "reportsDir"
  key_links:
    - from: "tests/phase-02-dryrun-report.test.cjs"
      to: "scripts/rebrand.cjs"
      via: "spawnSync argv --reports-dir <tmpdir>"
      pattern: "--reports-dir"
    - from: "scripts/rebrand.cjs"
      to: "scripts/rebrand/lib/engine.cjs"
      via: "engine.run({ reportsDir })"
      pattern: "reportsDir"
---

<objective>
Stop npm test from dirtying the working tree with reports/rebrand-dryrun.* writes. Redirect test-run report output to OS tmpdirs, and remove the stale committed reports/rebrand-dryrun.{json,md} artifacts (pre-260709-j0v corpus leftovers).

Purpose: `npm test` currently leaves modified tracked files behind on every run, breaking clean-tree workflows.
Output: Modified CLI (output-path flag only), two redirected test files, two files deleted from git tracking, clean `git status` after `npm test`.
</objective>

<execution_context>
@~/.claude/oto/workflows/execute-plan.md
@~/.claude/oto/templates/summary.md
</execution_context>

<context>
@./CLAUDE.md
@scripts/rebrand.cjs
@tests/phase-02-dryrun-report.test.cjs
@tests/phase-02-engine-classify-corpus.integration.test.cjs

<interfaces>
<!-- Extracted from codebase. Executor should use these directly — no exploration needed. -->

From scripts/rebrand/lib/engine.cjs (DO NOT modify this file — engine already supports everything needed):
```js
// engine.run(opts) — opts.reportsDir is already supported for BOTH modes:
//   dry-run  → runDryRun(..., { reportsDir: opts.reportsDir || null, ... })   // line 422
//   apply    → applyTree(..., { skipReports, reportsDir: opts.reportsDir || null, ... })
// When reportsDir is set, writeJsonAndMarkdownReports() mkdirs it and writes
// rebrand-dryrun.json + rebrand-dryrun.md there instead of <repo>/reports/.
module.exports = { run, loadAndValidate, byteIdentical };
```

From scripts/rebrand.cjs (current CLI — no reports-dir flag yet):
```js
const { values } = parseArgs({
  options: {
    'dry-run': { type: 'boolean', default: false },
    apply: { type: 'boolean', default: false },
    'verify-roundtrip': { type: 'boolean', default: false },
    target: { type: 'string' },
    out: { type: 'string', default: '.oto-rebrand-out/' },
    force: { type: 'boolean', default: false },
    owner: { type: 'string', default: 'OTOJulian' },
    map: { type: 'string', default: 'rename-map.json' }
  },
  strict: true   // NOTE: strict mode — unknown flags throw, so the flag MUST be declared
});
// ...
const result = await engine.run({ mode, target, out, force: values.force, owner: values.owner, mapPath });
```
</interfaces>

## Writer audit (all writers of reports/rebrand-dryrun.* — grep-verified, complete)

| Writer | Runs in npm test? | Dirties tree today? | Action |
|--------|-------------------|---------------------|--------|
| tests/phase-02-dryrun-report.test.cjs (4 tests, spawns CLI) | Yes | YES | Redirect via new `--reports-dir` flag (Task 1) |
| tests/phase-02-engine-classify-corpus.integration.test.cjs (engine.run direct) | Yes (skipped unless corpus clone available) | Yes when unskipped | Pass `reportsDir` opt (Task 1) |
| tests/rebrand-engine.test.cjs "default dry-run/apply still writes under repo reports" | Yes | Only via tracked files | LEAVE UNCHANGED — these tests intentionally assert the default repo-reports path; once tracked files are deleted, their output is covered by the existing `reports/` .gitignore rule |
| tests/phase-10-rebrand-snapshot.test.cjs | Yes | No (preserveReports restores/removes) | LEAVE UNCHANGED — after deletion, preserveReports rmSync's on exit, still clean |
| tests/regen-rebrand-snapshots.cjs | No (not matched by `tests/*.test.cjs` glob; manual regen script) | No (preserveReports) | LEAVE UNCHANGED |
| oto/bin/lib/migrate.cjs | No (reads a report path at runtime, out of scope) | No | LEAVE UNCHANGED |

## Delete-vs-keep decision (locked for executor): DELETE

Rationale grounded in actual assertions:
1. `.gitignore` ALREADY contains `reports/` — the two tracked files are anomalies committed despite the ignore rule. `git rm -f` untrack + delete makes the existing ignore rule take over for all future writes (including rebrand-engine.test.cjs's intentional default-path tests, which then write ignored-only files).
2. No test assertion reads committed report content without first running a dry-run itself — deletion breaks nothing.
3. Keep-committed would be the LARGER diff: it requires `git checkout` restore PLUS rewriting rebrand-engine.test.cjs's two "default ... writes under repo reports" tests (which exist precisely to pin default-path behavior) to stop them overwriting the committed files.
4. Deletion also resolves the currently-dirty working copies (`M reports/rebrand-dryrun.*`) in the same move — no separate restore step.

Executor MUST state this choice ("deleted; reports/ already gitignored") and rationale in the SUMMARY.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add --reports-dir CLI flag and redirect test report output to tmpdirs</name>
  <files>scripts/rebrand.cjs, tests/phase-02-dryrun-report.test.cjs, tests/phase-02-engine-classify-corpus.integration.test.cjs</files>
  <action>
1. **scripts/rebrand.cjs** (output-path plumbing ONLY — do NOT touch engine.cjs or any matching logic):
   - Add `'reports-dir': { type: 'string' }` to the parseArgs options (strict mode requires declaration).
   - Pass it through to engine.run: `reportsDir: values['reports-dir'] ? path.resolve(values['reports-dir']) : undefined`.

2. **tests/phase-02-dryrun-report.test.cjs**:
   - Require `node:os`; create a per-run tmpdir. Simplest: inside `runDryrun()`, `const reportsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-dryrun-report-'))`, append `'--reports-dir', reportsDir` to the spawnSync argv, and return `{ result, reportsDir }` so each test reads `path.join(reportsDir, 'rebrand-dryrun.json'|'rebrand-dryrun.md')` instead of `path.join(REPO_ROOT, 'reports', ...)`.
   - Apply the same treatment to the 4th test ('projected target paths'), which builds its own spawnSync argv inline — add `--reports-dir <tmpdir>` there too and read the JSON from the tmpdir.
   - Clean up tmpdirs (fs.rmSync recursive in a try/finally or accumulate and remove — node:test `test(..., (t) => ...)` callbacks here are sync functions, so a finally block or process-exit cleanup is fine; keep it simple).
   - Do NOT change any assertion semantics (still: exit 0, files exist, md non-empty, unclassified_total 0, rule-type counts > 0, D-04 entry shape, projected target_path values).

3. **tests/phase-02-engine-classify-corpus.integration.test.cjs**:
   - Create `const reportsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-corpus-classify-'))` inside the test, pass `reportsDir` in the `engine.run({ mode: 'dry-run', target, mapPath: 'rename-map.json', reportsDir })` opts, and read the report JSON from `path.join(reportsDir, 'rebrand-dryrun.json')`. Add `os` require. Clean up the tmpdir.
   - Note: this test is usually skipped (corpus clone probe) — changes must not alter the skip condition.

Leave tests/rebrand-engine.test.cjs, tests/phase-10-rebrand-snapshot.test.cjs, and tests/regen-rebrand-snapshots.cjs UNCHANGED per the writer audit in context.
  </action>
  <verify>
    <automated>node --test tests/phase-02-dryrun-report.test.cjs tests/rebrand-engine.test.cjs && grep -c "reports-dir" scripts/rebrand.cjs | grep -qv "^0$" && ! grep -q "REPO_ROOT, 'reports'" tests/phase-02-dryrun-report.test.cjs</automated>
  </verify>
  <done>All 4 dryrun-report tests pass reading from tmpdir; CLI accepts --reports-dir; no reference to repo reports/ remains in phase-02-dryrun-report.test.cjs; rebrand-engine.test.cjs still passes unmodified.</done>
</task>

<task type="auto">
  <name>Task 2: Delete stale tracked reports and prove npm test leaves a clean tree</name>
  <files>reports/rebrand-dryrun.json, reports/rebrand-dryrun.md</files>
  <action>
1. Remove the stale tracked artifacts (this simultaneously resolves the pre-existing dirty working copies — no separate `git checkout` needed):
   `git rm -f reports/rebrand-dryrun.json reports/rebrand-dryrun.md`
   (`-f` required because the working copies are modified.)
2. Verify `.gitignore` already contains the `reports/` rule (it does, line 2) — do NOT add a duplicate. After untracking, any file a test or the default-path rebrand-engine tests write under reports/ is ignored.
3. Run the full suite and check tree cleanliness (the acceptance gate for this whole plan):
   `npm test && git status --porcelain`
   Expected: npm test exits 0; porcelain output contains NO `M`/`D` lines for tracked files and NO `reports/` entries. The pre-existing untracked `?? INTERVIEW-BRIEF-oto.md` and the staged deletions from step 1 are the only acceptable entries before commit.
4. In the SUMMARY, state the decision explicitly: "Chose DELETE for reports/rebrand-dryrun.* — .gitignore already ignores reports/, no test reads committed report content without regenerating it first, and keep-committed would have required rewriting rebrand-engine.test.cjs's default-path tests (larger diff)."
  </action>
  <verify>
    <automated>npm test && test -z "$(git status --porcelain | grep -v '^??' | grep -v '^D  reports/')" && ! git ls-files reports/ | grep -q rebrand-dryrun</automated>
  </verify>
  <done>reports/rebrand-dryrun.{json,md} no longer git-tracked; npm test exits 0; immediately after the test run git status shows no modified tracked files and no reports/ entries; SUMMARY records the delete decision with rationale.</done>
</task>

</tasks>

<verification>
1. `npm test` exits 0 (full suite, including unmodified rebrand-engine.test.cjs and phase-10-rebrand-snapshot.test.cjs).
2. Immediately after `npm test`: `git status --porcelain` shows no modified/deleted tracked files and no reports/ paths (pre-existing `?? INTERVIEW-BRIEF-oto.md` excepted).
3. `git ls-files reports/` is empty.
4. `git diff` on scripts/rebrand/lib/engine.cjs is empty (no matching-logic changes).
5. Run `npm test` a second time — tree still clean (idempotence).
</verification>

<success_criteria>
- npm test exits 0 and leaves git status clean on every run
- reports/rebrand-dryrun.{json,md} deleted from git tracking; existing `reports/` gitignore rule covers all residual default-path writes
- Test-run dry-run report output goes to OS tmpdirs (phase-02-dryrun-report + corpus integration tests)
- engine.cjs matching logic untouched; oto/ agents and workflows untouched
- SUMMARY states the delete-vs-keep choice and its assertion-grounded rationale
</success_criteria>

<output>
After completion, create `.oto/quick/260713-izl-stop-rebrand-dry-run-tests-from-writing-/260713-izl-SUMMARY.md`
</output>
