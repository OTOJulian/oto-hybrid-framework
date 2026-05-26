---
phase: 02-rebrand-engine-distribution-skeleton
plan: 03
type: execute
wave: 3
depends_on: [01, 02]
files_modified:
  - scripts/rebrand/lib/engine.cjs
  - scripts/rebrand/lib/manifest.cjs
  - scripts/rebrand/lib/report.cjs
  - scripts/rebrand.cjs
  - tests/phase-02-engine-classify.test.cjs
  - tests/phase-02-coverage-manifest.test.cjs
  - tests/phase-02-roundtrip.test.cjs
  - tests/phase-02-roundtrip-isolation.test.cjs
  - tests/phase-02-allowlist.test.cjs
  - tests/phase-02-engine-no-source-mutation.test.cjs
  - tests/phase-02-dryrun-report.test.cjs
  - tests/phase-02-summary-line.test.cjs
  - tests/phase-02-owner-override.test.cjs
autonomous: true
requirements: [REB-04, REB-05, REB-06]

must_haves:
  truths:
    - "`scripts/rebrand.cjs --dry-run --target foundation-frameworks/` exits 0 and writes `reports/rebrand-dryrun.json` whose `unclassified_total === 0`"
    - "`scripts/rebrand.cjs --apply --target foundation-frameworks/ --out .oto-rebrand-out/` writes a rebranded tree out-of-place; source tree (`foundation-frameworks/`) sha256 is unchanged before/after run"
    - "`scripts/rebrand.cjs --verify-roundtrip --target foundation-frameworks/` applies engine forward into temp dir A, then again from A to temp dir B; asserts byte-identical (sha256 per file matches); exits 0 on the real upstream snapshot"
    - "Coverage manifest pre/post: post-rebrand counts of `gsd|GSD|Get Shit Done|superpowers|Superpowers` outside the do-not-rename allowlist === 0 (real upstream tree)"
    - "Allowlist preserves: LICENSE byte-identical, THIRD-PARTY-LICENSES.md byte-identical, both Copyright lines untouched, both upstream URLs preserved when in attribution context"
    - "Engine consumes walker entries with `allowlisted: true` and copies them byte-for-byte to `--out` without rule passes (W1 cross-plan reconcile with Plan 02-02 walker contract)"
    - "Engine prints single-line summary on every run: `engine: <mode> — <files> files, <matches> matches, <unclassified> unclassified, <duration>ms`"
    - "Engine resolves `{{GITHUB_OWNER}}` to `OTOJulian` by default; CLI flag `--owner <name>` overrides"
    - "Round-trip mode writes to `os.tmpdir()`, never to `.oto-rebrand-out/` (test verifies `.oto-rebrand-out/` is unchanged after a `--verify-roundtrip` run)"
    - "Engine never mutates source tree (sha256 of `foundation-frameworks/` before === after)"
    - "Schema validation rejects rename-maps with unknown rule classes; engine exits 4 (schema validation failure)"
  artifacts:
    - path: "scripts/rebrand/lib/engine.cjs"
      provides: "Orchestrator: load+validate map, build inventory, walk, dispatch to rules, accumulate, write reports, run assertions"
      exports: ["run", "loadAndValidate"]
      min_lines: 100
    - path: "scripts/rebrand/lib/manifest.cjs"
      provides: "Pre/post coverage manifest builder + zero-count assertion"
      exports: ["buildPre", "buildPost", "assertZeroOutsideAllowlist"]
    - path: "scripts/rebrand/lib/report.cjs"
      provides: "JSON-to-markdown report generator (rebrand-dryrun.md, coverage-manifest.delta.md)"
      exports: ["renderDryrunMarkdown", "renderCoverageDeltaMarkdown"]
    - path: "scripts/rebrand.cjs"
      provides: "CLI entry: parseArgs, dispatch to engine, set exit code per RESEARCH §Exit code policy"
      min_lines: 50
    - path: "reports/rebrand-dryrun.json"
      provides: "Engine dry-run output against foundation-frameworks/ (gitignored, regenerated each run)"
      contains: '"unclassified_total"'
    - path: "reports/coverage-manifest.pre.json"
      provides: "Pre-rebrand counts (gitignored)"
    - path: "reports/coverage-manifest.post.json"
      provides: "Post-rebrand counts; assertion enforces zero outside allowlist"
  key_links:
    - from: "scripts/rebrand.cjs"
      to: "scripts/rebrand/lib/engine.cjs"
      via: "require + dispatch in run() entry"
      pattern: "require.*engine"
    - from: "scripts/rebrand/lib/engine.cjs"
      to: "rename-map.json"
      via: "fs.readFileSync + JSON.parse + validate via scripts/rebrand/lib/validate-schema.cjs"
      pattern: "rename-map"
    - from: "scripts/rebrand/lib/engine.cjs"
      to: "scripts/rebrand/lib/walker.cjs + lib/rules/*.cjs"
      via: "require all rule modules at startup; iterate walker; dispatch each file to rule pipeline"
      pattern: "require.*rules"
    - from: "scripts/rebrand/lib/engine.cjs"
      to: "decisions/file-inventory.json"
      via: "build inventoryByPath Map at startup; pass to walker for file_class lookup"
      pattern: "file-inventory"
    - from: "scripts/rebrand/lib/manifest.cjs"
      to: "reports/coverage-manifest.{pre,post}.json"
      via: "fs.writeFileSync of JSON outputs"
      pattern: "coverage-manifest"
---

<objective>
Compose the rule modules + walker (from Plan 02-02) into the orchestrator, manifest builder, report generator, and CLI. Run the engine against the real `foundation-frameworks/` snapshot in all three modes (dry-run, apply, verify-roundtrip) and verify the assertions pass: zero unclassified matches, zero post-rebrand counts outside allowlist, byte-identical round-trip, source tree byte-immutable.

Purpose: This plan turns the per-rule unit infrastructure into the integration the phase actually ships. ROADMAP Phase 2 SC#3 (dry-run with zero unclassified) and SC#4 (round-trip zero-change) and SC#5 (allowlist coverage) and SC#6 (coverage manifest zero outside allowlist) all live here.

The engine validates the `deprecated_drop` field exists in `rename-map.json` (D-16 schema enforcement, W6) but does NOT act on its contents at Phase 2 — `deprecated_drop` consumption is deferred to Phase 4 (bulk port). Phase 2 only ensures schema parity.

Output:
- `scripts/rebrand/lib/engine.cjs` (orchestrator)
- `scripts/rebrand/lib/manifest.cjs` (coverage manifest)
- `scripts/rebrand/lib/report.cjs` (markdown rendering)
- `scripts/rebrand.cjs` (CLI)
- 9 integration test files
- Successful real-tree run: `npm run rebrand:dry-run`, `npm run rebrand`, `npm run rebrand:roundtrip` all exit 0 against `foundation-frameworks/`
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/02-rebrand-engine-distribution-skeleton/02-CONTEXT.md
@.planning/phases/02-rebrand-engine-distribution-skeleton/02-RESEARCH.md
@.planning/phases/02-rebrand-engine-distribution-skeleton/02-VALIDATION.md
@CLAUDE.md
@rename-map.json
@schema/rename-map.json
@decisions/file-inventory.json
@scripts/rebrand/lib/validate-schema.cjs
@scripts/rebrand/lib/walker.cjs
@scripts/rebrand/lib/rules/identifier.cjs
@scripts/rebrand/lib/rules/path.cjs
@scripts/rebrand/lib/rules/command.cjs
@scripts/rebrand/lib/rules/skill_ns.cjs
@scripts/rebrand/lib/rules/package.cjs
@scripts/rebrand/lib/rules/url.cjs
@scripts/rebrand/lib/rules/env_var.cjs

<interfaces>
<!-- engine.cjs surface -->

```js
// scripts/rebrand/lib/engine.cjs
'use strict';

/**
 * @param {object} opts
 * @param {'dry-run'|'apply'|'verify-roundtrip'} opts.mode
 * @param {string} opts.target  - source tree path
 * @param {string=} opts.out    - output dir (apply mode only)
 * @param {boolean=} opts.force - overwrite non-empty out
 * @param {string=} opts.owner  - {{GITHUB_OWNER}} value (default 'OTOJulian')
 * @param {string=} opts.mapPath - path to rename-map.json (default repo root)
 * @returns {Promise<{ exitCode: number, summary: object }>}
 */
async function run(opts) { /* ... */ }

function loadAndValidate(mapPath) { /* returns { map, errors } */ }

module.exports = { run, loadAndValidate };
```

<!-- manifest.cjs surface -->

```js
// scripts/rebrand/lib/manifest.cjs
'use strict';

const TOKENS = ['gsd', 'GSD', 'Get Shit Done', 'superpowers', 'Superpowers'];

async function buildPre(targetRoot, allowlist, inventoryByPath) { /* returns object keyed by file path */ }
async function buildPost(outRoot, allowlist, inventoryByPath) { /* same shape */ }

/**
 * @param {object} postManifest
 * @param {object} allowlist
 * @returns {Array<{path, token, count}>}  - empty array means zero failures
 */
function assertZeroOutsideAllowlist(postManifest, allowlist) { /* ... */ }

module.exports = { buildPre, buildPost, assertZeroOutsideAllowlist, TOKENS };
```

<!-- report.cjs surface -->

```js
// scripts/rebrand/lib/report.cjs
'use strict';

function renderDryrunMarkdown(dryrunJson) { /* returns markdown string */ }
function renderCoverageDeltaMarkdown(preJson, postJson, allowlist) { /* returns markdown string */ }

module.exports = { renderDryrunMarkdown, renderCoverageDeltaMarkdown };
```

<!-- CLI surface (scripts/rebrand.cjs) -->

```
node scripts/rebrand.cjs [--dry-run|--apply|--verify-roundtrip] --target <dir> [--out <dir>] [--force] [--owner <name>] [--map <path>]

Defaults: --dry-run, --target foundation-frameworks/, --out .oto-rebrand-out/, --owner OTOJulian, --map rename-map.json

Exit codes (RESEARCH §Exit code policy):
  0 — clean
  1 — round-trip diff (lists diverging paths to stderr)
  2 — unclassified match (engine could not classify a candidate token)
  3 — coverage assertion failure (post-rebrand non-zero outside allowlist)
  4 — schema validation failure
  5 — IO/filesystem error
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Build engine.cjs orchestrator + manifest.cjs + dry-run/classify/no-mutation/owner-override tests</name>
  <files>scripts/rebrand/lib/engine.cjs, scripts/rebrand/lib/manifest.cjs, scripts/rebrand/lib/report.cjs, tests/phase-02-engine-classify.test.cjs, tests/phase-02-engine-no-source-mutation.test.cjs, tests/phase-02-coverage-manifest.test.cjs, tests/phase-02-allowlist.test.cjs, tests/phase-02-owner-override.test.cjs, tests/phase-02-summary-line.test.cjs</files>
  <read_first>
    - .planning/phases/02-rebrand-engine-distribution-skeleton/02-RESEARCH.md §"Coverage manifest mechanics", §"Round-trip mechanics", §"Engine startup checks", §"Hand-rolled JSON Schema validator (D-16)"
    - .planning/phases/02-rebrand-engine-distribution-skeleton/02-CONTEXT.md (D-04 dryrun JSON schema, D-05 coverage manifest, D-14 owner substitution, D-15 zero-deps, D-16 schema validation)
    - rename-map.json (the actual map the engine consumes)
    - schema/rename-map.json (the schema for validation)
    - decisions/file-inventory.json (file_class lookup source — engine builds Map<relPath, entry>)
    - scripts/rebrand/lib/validate-schema.cjs (Plan 02-02 — used to validate rename-map at startup)
    - scripts/rebrand/lib/walker.cjs (Plan 02-02 — engine iterates this; walker yields `{relPath, absPath, content, file_class, allowlisted}` — engine handles `allowlisted: true` entries by byte-for-byte copy in apply mode)
    - scripts/rebrand/lib/rules/*.cjs (all 7 rule modules from Plan 02-02 — engine requires all and dispatches)
    - LICENSE, THIRD-PARTY-LICENSES.md (allowlist test fixtures)
  </read_first>
  <behavior>
    - engine-classify Test 1 (dry-run real tree): `engine.run({mode:'dry-run', target:'foundation-frameworks/', mapPath:'rename-map.json'})` resolves with `exitCode === 0` AND writes `reports/rebrand-dryrun.json` whose parsed JSON has `unclassified_total === 0` AND `summary_by_rule_type` has at least the 7 rule keys.
    - engine-classify Test 2 (schema rejection): mutate a rename-map clone in a temp file to add `rules.weird_class: [...]`; pass that path as `--map` → `exitCode === 4`.
    - engine-no-source-mutation Test 1: compute sha256 of `foundation-frameworks/` tree before; run `engine.run({mode:'apply', target:'foundation-frameworks/', out: <temp>, owner:'OTOJulian'})`; sha256 of `foundation-frameworks/` after === before. (Use temp dir for `out` so we don't pollute repo.)
    - engine-no-source-mutation Test 2: same but `mode:'dry-run'` — sha256 unchanged AND no temp-out is created (dry-run writes only to `reports/`).
    - coverage-manifest Test 1 (pre): `manifest.buildPre('foundation-frameworks/', allowlist, inventoryMap)` returns object with at least one file having non-zero `gsd` count (the upstream tree has thousands of `gsd` tokens — pre-manifest counts them all).
    - coverage-manifest Test 2 (post zero-count assertion): after running `engine.run({mode:'apply', ...})`, `manifest.assertZeroOutsideAllowlist(postManifest, allowlist).length === 0`. This is the SC#6 zero-count requirement against the real upstream tree.
    - coverage-manifest Test 3 (assertion failure surfacing): construct synthetic post manifest with a non-allowlisted file having `gsd: 5` → `assertZeroOutsideAllowlist` returns array with one entry `{path, token:'gsd', count:5}`.
    - allowlist Test 1 (LICENSE preserved — synthetic temp tree per W3): build a temp tree with `fs.mkdtempSync()`, copy `foundation-frameworks/get-shit-done-main/LICENSE` into it as `get-shit-done-main/LICENSE`, plus a non-allowlisted file `foo.md` containing `gsd`. Run `engine.run({mode:'apply', target: tmpDir, out: tmpOutDir, owner:'OTOJulian'})`. Assert `<tmpOutDir>/get-shit-done-main/LICENSE` has byte-identical content to source LICENSE (sha256 match) AND `<tmpOutDir>/foo.md` was rewritten (content changed). Cleanup both temp dirs in `t.after()`.
    - allowlist Test 2 (THIRD-PARTY-LICENSES.md preserved — synthetic temp tree per W3): build a temp tree with `fs.mkdtempSync()`, copy `THIRD-PARTY-LICENSES.md` into it (also drop a `LICENSE` file in there) plus a non-allowlisted `bar.md` containing `gsd`. Run engine apply with the standard allowlist (loaded from `rename-map.json`'s `do_not_rename`). Assert sha256 of `<tmpOutDir>/THIRD-PARTY-LICENSES.md` matches source AND sha256 of `<tmpOutDir>/LICENSE` matches source. Do NOT walk the repo root (avoids walking `.planning/`, `decisions/`, `tests/`, etc.). Cleanup in `t.after()`.
    - allowlist Test 3 (Copyright lines): `grep -c "Copyright (c) 2025 Lex Christopherson" <tmpOutDir>/get-shit-done-main/LICENSE` returns the same count as in source (preserved — falls out of Test 1 since LICENSE is byte-identical, but we assert it explicitly).
    - allowlist Test 4 (URL in attribution context): in a synthetic temp tree containing one file `attribution.md` with line `Copyright 2025 see github.com/gsd-build/get-shit-done`, run engine apply, assert the URL is preserved (rule's preserve_in_attribution kicks in).
    - owner-override Test 1 (synthetic temp tree per W2): use `fs.mkdtempSync(path.join(os.tmpdir(), 'oto-owner-'))` to create a temp dir; copy `tests/fixtures/rebrand/url-attribution.md` into it as the only file; create matching `tmpOutDir = fs.mkdtempSync(...)`; call `engine.run({mode:'apply', target: tmpDir, out: tmpOutDir, owner:'someone'})`. Assert the output file's non-attribution URL line uses `github.com/someone/oto-hybrid-framework`. Cleanup both temp dirs in `t.after()`. (The "engine must handle file targets" alternative is removed — engine only handles directory targets, which is the contract the CLI exposes.)
    - owner-override Test 2: same temp-tree pattern but `owner:'OTOJulian'` (default) → output uses `github.com/OTOJulian/oto-hybrid-framework`.
    - summary-line Test 1: capture stdout from `engine.run({mode:'dry-run', target:'foundation-frameworks/'})`; assert it contains a single line matching `/^engine: dry-run — \d+ files, \d+ matches, 0 unclassified, \d+ms$/`.
  </behavior>
  <action>
    1. **`scripts/rebrand/lib/engine.cjs`** — orchestrator. Implementation:

       Header:
       ```js
       'use strict';
       const fs = require('node:fs');
       const fsp = require('node:fs/promises');
       const path = require('node:path');
       const crypto = require('node:crypto');
       const { validate } = require('./validate-schema.cjs');
       const walker = require('./walker.cjs');
       const manifest = require('./manifest.cjs');
       const report = require('./report.cjs');
       const RULES = {
         identifier: require('./rules/identifier.cjs'),
         path: require('./rules/path.cjs'),
         command: require('./rules/command.cjs'),
         skill_ns: require('./rules/skill_ns.cjs'),
         package: require('./rules/package.cjs'),
         url: require('./rules/url.cjs'),
         env_var: require('./rules/env_var.cjs'),
       };
       ```

       `loadAndValidate(mapPath)`:
       - Read file, JSON.parse, validate against `schema/rename-map.json` via `validate(map, schema)`. Return `{map, errors}`. The schema requires `deprecated_drop` to be present (W6); validator already enforces this at Plan 02-02. Engine does NOT consume `deprecated_drop` contents at Phase 2 — only verifies it exists via the validator's required-field check. Phase 4 will read and act on it.

       `buildInventoryMap()`:
       - Read `decisions/file-inventory.json`, build a `Map<relPath, entry>` from `entries[].path` → entry. Return the Map.

       `run(opts)`:
       - Resolve absolute paths for `opts.target`, `opts.out`, `opts.mapPath`. Reject paths that resolve outside repo root via path traversal (T-2-02 mitigation):
         ```js
         const repoRoot = path.resolve(__dirname, '..', '..', '..');
         const resolvedTarget = path.resolve(opts.target);
         // No restriction — target can be any path; the source-mutation guarantee comes from out-of-place apply, not from path restriction.
         const resolvedOut = opts.out ? path.resolve(opts.out) : null;
         if (resolvedOut && !resolvedOut.startsWith(repoRoot) && !resolvedOut.startsWith(require('node:os').tmpdir())) {
           console.error('Refusing to write outside repo root or os.tmpdir()');
           return { exitCode: 5 };
         }
         ```
       - Load + validate map. If invalid, write errors to stderr, return `{ exitCode: 4 }`.
       - Build inventoryMap.
       - Compile allowlist via `walker.compileAllowlist(map.do_not_rename)`.
       - Build context shape: `{ owner: opts.owner || 'OTOJulian', allowlist, inventoryByPath: inventoryMap, fileClass: undefined, filePath: undefined, fileContent: undefined }`. Per-file fields populated as walker yields.
       - Dispatch by mode:
         - **dry-run**: walk target via `walker.walk(target, allowlist, inventoryMap)`; for each yielded file, **if `entry.allowlisted === true`, skip rule passes for the dryrun report (record an entry with `matches: []` and `classification: 'preserve'` if reporting it at all)**. For non-allowlisted files, run `RULES[type].listMatches(content, rule, ctx)` for each rule type in fixed order [identifier, path, command, skill_ns, package, url, env_var]; aggregate per-file matches; compute `unclassified_count = 0` (every emitted match is classified); write `reports/rebrand-dryrun.json` per D-04 schema; write `reports/rebrand-dryrun.md` via `report.renderDryrunMarkdown`. If any rule returns `'unclassified'` from `classify` for any token, set exitCode=2. Otherwise exitCode=0.
         - **apply**: walk target; for each yielded file:
           - **W1 cross-plan reconcile — if `entry.allowlisted === true`**: copy byte-for-byte to `out/<relPath>`. Use `fsp.mkdir(path.dirname(outPath), { recursive: true })` (I3 polish — only mkdir the parent, not the full path), then `fsp.copyFile(absPath, outPath)`. No rule passes. Continue to next entry.
           - Otherwise (non-allowlisted): run `RULES[type].apply(content, rule, ctx)` for each rule type; the `package` rule is gated by `RULES.package.applies(filePath)` and operates on the parsed JSON (engine handles JSON.parse and re-stringify with the original indentation — use `JSON.stringify(pkg, null, 2)` and trailing newline). Collect output bytes; write to `out/<relPath>` via `fsp.mkdir(path.dirname(outPath), { recursive: true })` (I3) + `fsp.writeFile`. Also rebrand the filename via `RULES.path.applyToFilename(relPath, map.rules.path)` so `agents/gsd-planner.md` → `agents/oto-planner.md`.
           - Then run `manifest.buildPre(target, ...)` → save `reports/coverage-manifest.pre.json`, `manifest.buildPost(out, ...)` → save `reports/coverage-manifest.post.json`, then `manifest.assertZeroOutsideAllowlist`. If failures, write to stderr, return exitCode=3.
         - **verify-roundtrip** (RESEARCH §Round-trip mechanics): create two `os.tmpdir()` subdirs A and B (using `fs.mkdtempSync(os.tmpdir() + '/oto-rebrand-rt-A-')` and `-B-`); apply target → A; apply A → B; compare via `byteIdentical(A, B)` (sha256 of every file, sorted relPath list). If diverge, list paths to stderr, return exitCode=1. Cleanup tmp dirs in `finally`. **Critical**: do NOT write to `.oto-rebrand-out/`; tmpdirs only.
       - Print summary line: `engine: <mode> — <files> files, <matches> matches, <unclassified> unclassified, <duration>ms` (use `Date.now()` start/end).
       - Return `{exitCode, summary}`.

       Helper `byteIdentical(rootA, rootB)`:
       ```js
       function listFiles(root) {
         // recursive readdirSync, return sorted array of relPaths
       }
       function sha256OfFile(p) {
         return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
       }
       function byteIdentical(rootA, rootB) {
         const a = listFiles(rootA);
         const b = listFiles(rootB);
         if (JSON.stringify(a) !== JSON.stringify(b)) return { equal: false, reason: 'file list differs', diff: ... };
         for (const rel of a) {
           if (sha256OfFile(path.join(rootA, rel)) !== sha256OfFile(path.join(rootB, rel))) {
             return { equal: false, reason: 'content differs at ' + rel };
           }
         }
         return { equal: true };
       }
       ```

       Engine startup checks (RESEARCH §Engine startup checks):
       - `require.resolve` each rule file at startup (already done implicitly by `require()` above; if any module is missing, the require throws — engine can't even instantiate, which is correct fail-loud behavior).
       - Assert each rule array in `map.rules` has ≥1 entry (the schema enforces, but a defense-in-depth check costs nothing).

    2. **`scripts/rebrand/lib/manifest.cjs`** — coverage manifest. Implementation:

       ```js
       'use strict';
       const fs = require('node:fs');
       const path = require('node:path');
       const walker = require('./walker.cjs');

       const TOKENS = ['gsd', 'GSD', 'Get Shit Done', 'superpowers', 'Superpowers'];

       async function build(root, allowlist, inventoryByPath) {
         const result = { version: '1', root, files: {} };
         for await (const { relPath, content, file_class, allowlisted } of walker.walk(root, allowlist, inventoryByPath)) {
           const counts = {};
           for (const tok of TOKENS) counts[tok] = (content.match(new RegExp(escapeRegex(tok), 'g')) || []).length;
           result.files[relPath] = { file_class, allowlisted: !!allowlisted, counts };
         }
         return result;
       }
       function escapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

       function buildPre(target, allowlist, inv) { return build(target, allowlist, inv); }
       function buildPost(out, allowlist, inv) { return build(out, allowlist, inv); }

       function assertZeroOutsideAllowlist(postManifest, allowlist) {
         const failures = [];
         for (const [relPath, entry] of Object.entries(postManifest.files)) {
           // Use the walker-emitted `allowlisted` flag as the source of truth (W1).
           if (entry.allowlisted) continue;
           // Defense-in-depth: also re-check pathGlobs in case the manifest came from elsewhere.
           if (allowlist.pathGlobs.some((rx) => rx.test(relPath))) continue;
           for (const tok of TOKENS) {
             if (entry.counts[tok] > 0) failures.push({ path: relPath, token: tok, count: entry.counts[tok] });
           }
         }
         return failures;
       }

       module.exports = { build, buildPre, buildPost, assertZeroOutsideAllowlist, TOKENS };
       ```

    3. **`scripts/rebrand/lib/report.cjs`** — markdown rendering. Implementation:

       - `renderDryrunMarkdown(dryrunJson)`: produce a markdown table grouped by `rule_type`, with per-file change counts. Header section shows totals. Layout details at planner discretion (CONTEXT D-discretion).
       - `renderCoverageDeltaMarkdown(preJson, postJson, allowlist)`: produce a markdown table showing pre-counts, post-counts, delta, grouped by file_class. Footer shows the SC#6 assertion result (PASS / FAIL) and any failure entries.

    4. **Write the 6 test files** implementing Behaviors above. Notes:
       - `engine-classify.test.cjs` uses real `foundation-frameworks/` tree — slow. Mark with longer timeout if needed (`{ timeout: 30000 }` arg to `test`).
       - `engine-no-source-mutation.test.cjs` uses sha256 of the directory tree (concatenate sorted relPath + sha256 of each file, then sha256 the whole). Helper at top of test file.
       - `coverage-manifest.test.cjs` exercises real tree; the `assertZeroOutsideAllowlist` test uses synthetic input for failure case.
       - `allowlist.test.cjs` (W2/W3): uses synthetic temp trees built via `fs.mkdtempSync(path.join(os.tmpdir(), 'oto-allowlist-'))`. Test 1 copies `foundation-frameworks/get-shit-done-main/LICENSE` + a synthetic non-allowlisted `foo.md`. Test 2 copies `THIRD-PARTY-LICENSES.md` + `LICENSE` + synthetic `bar.md`. Test 3 falls out of Test 1 (sha256 match implies Copyright lines match). Test 4 uses a single-file temp tree `attribution.md`. Each test cleans up via `t.after(() => fs.rmSync(tmpDir, {recursive:true, force:true}))`. None of the tests walk the repo root.
       - `owner-override.test.cjs` (W2): uses `fs.mkdtempSync(path.join(os.tmpdir(), 'oto-owner-'))` to build a single-file temp tree containing only `tests/fixtures/rebrand/url-attribution.md` (copied via `fs.copyFileSync`). Run engine apply against the temp dir. Cleanup in `t.after()`. Engine target is always a directory; the file-target alternative is removed.
       - `summary-line.test.cjs` captures stdout via `process.stdout.write` interception OR (cleaner) shells out via `child_process.spawnSync(process.execPath, ['scripts/rebrand.cjs', '--dry-run', '--target', 'foundation-frameworks/'])` and parses stdout. The shell-out path is more honest and exercises the CLI too — recommended.
  </action>
  <verify>
    <automated>node --test --test-concurrency=4 tests/phase-02-engine-classify.test.cjs tests/phase-02-engine-no-source-mutation.test.cjs tests/phase-02-coverage-manifest.test.cjs tests/phase-02-allowlist.test.cjs tests/phase-02-owner-override.test.cjs tests/phase-02-summary-line.test.cjs</automated>
  </verify>
  <acceptance_criteria>
    - All 6 test files pass via `node --test` (exit 0); engine-classify and allowlist tests may take 10–20s due to real-tree walk.
    - `test -f scripts/rebrand/lib/engine.cjs` exits 0
    - `test -f scripts/rebrand/lib/manifest.cjs` exits 0
    - `test -f scripts/rebrand/lib/report.cjs` exits 0
    - `grep -c "loadAndValidate" scripts/rebrand/lib/engine.cjs` returns at least 1
    - `grep -c "validate-schema" scripts/rebrand/lib/engine.cjs` returns at least 1 (D-16 schema validation hooked at startup)
    - `grep -c "byteIdentical" scripts/rebrand/lib/engine.cjs` returns at least 1 (round-trip helper)
    - `grep -c "os.tmpdir\\|node:os" scripts/rebrand/lib/engine.cjs` returns at least 1 (round-trip uses tmpdir)
    - `grep -c "allowlisted" scripts/rebrand/lib/engine.cjs` returns at least 1 (W1: engine reads walker's allowlisted flag and copies byte-for-byte)
    - `grep -cE "fsp\\.mkdir\\(path\\.dirname" scripts/rebrand/lib/engine.cjs` returns at least 1 (I3 polish — mkdir parent only, not full out path)
    - `grep -c "TOKENS" scripts/rebrand/lib/manifest.cjs` returns at least 1
    - `grep -c "assertZeroOutsideAllowlist" scripts/rebrand/lib/manifest.cjs` returns at least 1
    - `grep -cE "require\\(['\"](?!node:|\\.|\\.\\.)" scripts/rebrand/lib/{engine,manifest,report}.cjs` returns 0 (zero third-party imports — D-15)
    - After test run, no leftover files in `os.tmpdir()` matching `oto-rebrand-rt-*`, `oto-allowlist-*`, or `oto-owner-*` (cleanup verified):
      `node -e "const fs=require('fs'),os=require('os'); const leftover = fs.readdirSync(os.tmpdir()).filter(n => /^(oto-rebrand-rt|oto-allowlist|oto-owner)-/.test(n)); process.exit(leftover.length === 0 ? 0 : 1)"` exits 0
    - Source-mutation regression (real-tree): `BEFORE=$(find foundation-frameworks -type f -exec shasum {} + | shasum | cut -c1-40); node -e "require('./scripts/rebrand/lib/engine').run({mode:'dry-run', target:'foundation-frameworks/', mapPath:'rename-map.json'}).then(r => process.exit(r.exitCode))"; AFTER=$(find foundation-frameworks -type f -exec shasum {} + | shasum | cut -c1-40); test "$BEFORE" = "$AFTER"`
  </acceptance_criteria>
  <threat_ref>T-2-01 (schema validation rejects unknown rule classes; engine startup also re-checks per-rule arrays). T-2-02 (engine resolves --out and refuses to write outside repo root or os.tmpdir()).</threat_ref>
  <done>engine + manifest + report shipped (with W1 allowlisted-pass-through copy semantics, I3 mkdir-parent polish); 6 integration tests green (W2/W3 synthetic temp trees, no repo-root walks); source-mutation acceptance verified against the real tree.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Build CLI scripts/rebrand.cjs + dryrun-report + roundtrip + roundtrip-isolation tests; run npm scripts end-to-end against foundation-frameworks/</name>
  <files>scripts/rebrand.cjs, tests/phase-02-dryrun-report.test.cjs, tests/phase-02-roundtrip.test.cjs, tests/phase-02-roundtrip-isolation.test.cjs</files>
  <read_first>
    - scripts/rebrand/lib/engine.cjs (Task 1 — the CLI is a thin wrapper)
    - .planning/phases/02-rebrand-engine-distribution-skeleton/02-RESEARCH.md §"Round-trip mechanics", §"Exit code policy", §"engine summary line"
    - .planning/phases/02-rebrand-engine-distribution-skeleton/02-CONTEXT.md (D-02 modes, D-03 real-tree run, D-09 npm scripts that invoke this CLI)
    - package.json scripts.rebrand, scripts.rebrand:dry-run, scripts.rebrand:roundtrip (Plan 02-01 wired these to scripts/rebrand.cjs)
  </read_first>
  <behavior>
    - dryrun-report Test 1: `child_process.spawnSync(process.execPath, ['scripts/rebrand.cjs', '--dry-run', '--target', 'foundation-frameworks/'])` exits 0; `reports/rebrand-dryrun.json` exists; parsed JSON has `unclassified_total === 0`; `reports/rebrand-dryrun.md` exists and is non-empty.
    - dryrun-report Test 2: parsed JSON has `summary_by_rule_type.identifier > 0` AND `summary_by_rule_type.path > 0` AND `summary_by_rule_type.command > 0` (real upstream tree contains all three rule-types).
    - dryrun-report Test 3: each entry in `files[]` array has the schema-required fields per CONTEXT D-04: `path`, `file_class`, `matches`, `unclassified_count`. (Validate via shape-check, no actual JSON Schema needed — explicit field assertions.)
    - roundtrip Test 1: `child_process.spawnSync(process.execPath, ['scripts/rebrand.cjs', '--verify-roundtrip', '--target', 'foundation-frameworks/'])` exits 0 against real tree.
    - roundtrip Test 2: stdout contains `engine: verify-roundtrip — `.
    - roundtrip-isolation Test 1: ensure `.oto-rebrand-out/` either doesn't exist or has a known sha256 before run; run `--verify-roundtrip`; assert `.oto-rebrand-out/` is unchanged after (D-02 isolation guarantee — round-trip uses `os.tmpdir()` not the scratch dir).
    - roundtrip-isolation Test 2: `os.tmpdir()` has no leftover `oto-rebrand-rt-*` dirs after the run (cleanup happened — verified portably via Node, not `/tmp` glob).
  </behavior>
  <action>
    1. **`scripts/rebrand.cjs`** (CLI entry):

       ```js
       #!/usr/bin/env node
       'use strict';

       const { parseArgs } = require('node:util');
       const path = require('node:path');
       const engine = require('./rebrand/lib/engine.cjs');

       const { values } = parseArgs({
         options: {
           'dry-run': { type: 'boolean' },
           apply: { type: 'boolean' },
           'verify-roundtrip': { type: 'boolean' },
           target: { type: 'string', default: 'foundation-frameworks/' },
           out: { type: 'string', default: '.oto-rebrand-out/' },
           force: { type: 'boolean', default: false },
           owner: { type: 'string', default: 'OTOJulian' },
           map: { type: 'string', default: 'rename-map.json' },
         },
         strict: true,
       });

       let mode = 'dry-run';
       if (values.apply) mode = 'apply';
       else if (values['verify-roundtrip']) mode = 'verify-roundtrip';
       // --dry-run is the default

       (async () => {
         try {
           const result = await engine.run({
             mode,
             target: path.resolve(values.target),
             out: mode === 'apply' ? path.resolve(values.out) : undefined,
             force: values.force,
             owner: values.owner,
             mapPath: path.resolve(values.map),
           });
           process.exit(result.exitCode);
         } catch (e) {
           console.error(`engine error: ${e.message}`);
           process.exit(5);
         }
       })();
       ```

       Mark file executable: `chmod +x scripts/rebrand.cjs` AND `git update-index --chmod=+x scripts/rebrand.cjs`.

    2. **Apply-mode pre-write check** (the engine already handles this; documenting here for completeness): if `mode === 'apply'` and `out` directory exists, is non-empty, and `--force` is not set, refuse with stderr message and exitCode=5. The engine implements this; the CLI passes `force` through.

    3. **Write the 3 test files**:

       - `tests/phase-02-dryrun-report.test.cjs`: shells out via `child_process.spawnSync(process.execPath, ['scripts/rebrand.cjs', '--dry-run', '--target', 'foundation-frameworks/'])`; reads `reports/rebrand-dryrun.json` and asserts `unclassified_total === 0` + per-file shape. Test cleanup: leave reports/ alone (gitignored, regenerated each run). Use `{ timeout: 30000 }` for slow real-tree walk.

       - `tests/phase-02-roundtrip.test.cjs`: shells out via `--verify-roundtrip --target foundation-frameworks/`; assert exit 0 + summary line. Use `{ timeout: 60000 }` (real-tree round-trip is the slowest test; two full apply passes).

       - `tests/phase-02-roundtrip-isolation.test.cjs`: snapshot `.oto-rebrand-out/` (or note it doesn't exist) before `--verify-roundtrip`; verify after. Snapshot via the same `sha256OfDirTree` helper used in engine-no-source-mutation; if dir doesn't exist, snapshot is the literal string `<absent>`; the dir must remain `<absent>` or unchanged after. After the run, also assert `os.tmpdir()` contains no leftover `oto-rebrand-rt-*` directories using `fs.readdirSync(os.tmpdir()).filter(n => n.startsWith('oto-rebrand-rt-')).length === 0` — portable across macOS/Linux (W4).

    4. **Run end-to-end manually** as part of the task verification:
       ```bash
       npm run rebrand:dry-run    # exits 0; reports/rebrand-dryrun.json has unclassified_total: 0
       npm run rebrand            # writes .oto-rebrand-out/, post-coverage zero outside allowlist, exits 0
       npm run rebrand:roundtrip  # uses os.tmpdir(), byte-identical, exits 0
       ```
       All three must pass before this task is done.
  </action>
  <verify>
    <automated>node --test --test-concurrency=2 tests/phase-02-dryrun-report.test.cjs tests/phase-02-roundtrip.test.cjs tests/phase-02-roundtrip-isolation.test.cjs</automated>
  </verify>
  <acceptance_criteria>
    - All 3 test files pass via `node --test` (exit 0)
    - `test -x scripts/rebrand.cjs` exits 0 (executable bit set)
    - `head -1 scripts/rebrand.cjs` equals `#!/usr/bin/env node`
    - `npm run rebrand:dry-run 2>/dev/null` exits 0
    - `cat reports/rebrand-dryrun.json | node -e "const j=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')); process.exit(j.unclassified_total === 0 ? 0 : 1)"` exits 0
    - `npm run rebrand 2>/dev/null` exits 0 (writes .oto-rebrand-out/ with post-rebrand assertion passing)
    - `npm run rebrand:roundtrip 2>/dev/null` exits 0 (real-tree byte-identical round-trip on `foundation-frameworks/`)
    - W4 portable cleanup check (after roundtrip run): `node -e "const fs=require('fs'),os=require('os'); const leftover = fs.readdirSync(os.tmpdir()).filter(n => n.startsWith('oto-rebrand-rt-')); process.exit(leftover.length === 0 ? 0 : 1)"` exits 0
    - `grep -c "parseArgs" scripts/rebrand.cjs` returns at least 1 (zero-deps arg parsing — D-15)
    - `grep -c "process.exit(5)" scripts/rebrand.cjs` returns at least 1 (catch-all IO error path)
    - `grep -cE "require\\(['\"](?!node:|\\.|\\.\\.)" scripts/rebrand.cjs` returns 0
    - Allowlist regression on real apply: `npm run rebrand 2>/dev/null && diff foundation-frameworks/get-shit-done-main/LICENSE .oto-rebrand-out/get-shit-done-main/LICENSE; test $? -eq 0` (LICENSE byte-identical between source and apply output — preserved by allowlist via W1 walker pass-through)
    - Copyright preservation on real apply: `grep -c "Copyright (c) 2025 Lex Christopherson" .oto-rebrand-out/get-shit-done-main/LICENSE` returns the same count as `grep -c "Copyright (c) 2025 Lex Christopherson" foundation-frameworks/get-shit-done-main/LICENSE`
  </acceptance_criteria>
  <threat_ref>T-2-02 (CLI passes --target/--out through engine which resolves them and refuses to write outside repo root or os.tmpdir())</threat_ref>
  <done>CLI ships; 3 test files green; all three `npm run rebrand*` scripts exit 0 against the real `foundation-frameworks/` tree; LICENSE + Copyright preservation verified by acceptance criteria; round-trip isolation verified portably (W4).</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| User CLI input (`--target`, `--out`, `--owner`, `--map`) | Path-resolved via `path.resolve`; engine refuses `--out` outside repo root or `os.tmpdir()` |
| `rename-map.json` content | Validated by hand-rolled JSON Schema before any rule runs (D-16) |
| Engine output writes | Only to `--out` (apply mode), `os.tmpdir()` (verify-roundtrip), `reports/` (any mode); never to source tree |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-2-01 | Tampering | Malicious `rename-map.json` regex causing ReDoS in rule modules | mitigate | Schema validation rejects unknown rule classes; rule modules construct regexes from escaped literal `from`/`to` strings; user-supplied regex (only in `do_not_rename` `pattern` field) is compiled but tested against repo content (not attacker-controlled). Risk LOW per personal-use scope. |
| T-2-02 | Tampering | Path traversal via `--target`, `--out` | mitigate | `engine.run` resolves `--out` and refuses if it escapes repo root AND `os.tmpdir()`. Walker uses `path.relative(root, ...)` for relPath computation; never reads outside `root`. Verified in Task 1 acceptance criteria. |
| T-2-06 | Information Disclosure | Engine accidentally writing reports outside `reports/` | accept | Reports are always written to `reports/` (hardcoded in engine); Task 1 acceptance includes a grep that this string is constant. |

All threats LOW; no blocker per ASVS L1.
</threat_model>

<verification>
- All 9 test files in this plan pass via `node --test`
- `npm run rebrand:dry-run` exits 0 + `reports/rebrand-dryrun.json` has `unclassified_total: 0`
- `npm run rebrand` exits 0 + `.oto-rebrand-out/` populated + post-coverage zero outside allowlist
- `npm run rebrand:roundtrip` exits 0 (byte-identical re-apply on real upstream tree)
- ROADMAP Phase 2 SC#3 (dry-run with zero unclassified) — verified
- ROADMAP Phase 2 SC#4 (round-trip zero-change) — verified
- ROADMAP Phase 2 SC#5 (allowlist preserves LICENSE + Copyright + upstream URLs in attribution) — verified by allowlist tests
- ROADMAP Phase 2 SC#6 (post-coverage zero outside allowlist) — verified
- W1 cross-plan reconcile: engine consumes walker's `allowlisted: true` entries via byte-for-byte copy; allowlist tests assert preserved files exist in `<out>/` post-apply
- W6 schema parity: engine relies on validator's `deprecated_drop` required-field check; engine does not consume contents (deferred to Phase 4)
</verification>

<success_criteria>
- engine + manifest + report + CLI shipped, 9 integration test files green
- Real-tree run of all three modes passes against `foundation-frameworks/`
- Round-trip mode uses `os.tmpdir()` (not `.oto-rebrand-out/`) — isolation test verifies (portable W4)
- Source tree byte-immutable (sha256 before === after) — engine-no-source-mutation test verifies
- Coverage manifest exits with non-zero count failures listed (synthetic test) AND passes (zero failures) on real tree
- Schema validation rejects unknown rule classes (engine-classify Test 2) — exit code 4
- Allowlist tests use synthetic temp trees only, never the repo root (W2/W3)
- All three `npm run rebrand*` commands exit 0 — discoverability per D-09
- All `<must_haves>` artifacts exist and key_links pattern-match
- `02-VALIDATION.md` per-task map updated with rows for Plan 02-03 Tasks 1–2; `nyquist_compliant: true` set in frontmatter (every task has `<automated>` verify)
- ROADMAP Phase 2 SC#3, SC#4, SC#5, SC#6 all checked off
</success_criteria>

<output>
After completion, create `.planning/phases/02-rebrand-engine-distribution-skeleton/02-03-SUMMARY.md`
</output>
