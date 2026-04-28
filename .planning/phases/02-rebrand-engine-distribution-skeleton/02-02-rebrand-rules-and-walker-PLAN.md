---
phase: 02-rebrand-engine-distribution-skeleton
plan: 02
type: execute
wave: 2
depends_on: [01]
files_modified:
  - scripts/rebrand/lib/validate-schema.cjs
  - scripts/rebrand/lib/walker.cjs
  - scripts/rebrand/lib/rules/identifier.cjs
  - scripts/rebrand/lib/rules/path.cjs
  - scripts/rebrand/lib/rules/command.cjs
  - scripts/rebrand/lib/rules/skill_ns.cjs
  - scripts/rebrand/lib/rules/package.cjs
  - scripts/rebrand/lib/rules/url.cjs
  - scripts/rebrand/lib/rules/env_var.cjs
  - tests/helpers/load-schema.cjs
  - tests/fixtures/rebrand/identifier-edge.txt
  - tests/fixtures/rebrand/path-edge.txt
  - tests/fixtures/rebrand/command-vs-skill_ns.md
  - tests/fixtures/rebrand/license-block.txt
  - tests/fixtures/rebrand/url-attribution.md
  - tests/fixtures/rebrand/env-var-edge.txt
  - tests/fixtures/rebrand/hook-version-token.js
  - tests/fixtures/rebrand/multi-rule-line.md
  - tests/fixtures/rebrand/package-fixture.json
  - tests/phase-02-rules-identifier.test.cjs
  - tests/phase-02-rules-path.test.cjs
  - tests/phase-02-rules-command.test.cjs
  - tests/phase-02-rules-skill_ns.test.cjs
  - tests/phase-02-rules-package.test.cjs
  - tests/phase-02-rules-url.test.cjs
  - tests/phase-02-rules-env_var.test.cjs
  - tests/phase-02-walker.test.cjs
  - tests/phase-02-schema-validate.test.cjs
autonomous: true
requirements: [REB-01, REB-03]

must_haves:
  truths:
    - "Each of seven rule modules exports `{classify, apply, listMatches}` with the rebranded interface and rejects unclassified tokens with the `unclassified` return value"
    - "`identifier.cjs` matches `gsd`/`GSD`/`Gsd` only at word boundaries — `stagsd` and `gsdfoo` and `MY_GSD_VAR` are NOT matched (Pitfall 1 substring negative)"
    - "`identifier.cjs` honors `do_not_match: ['Superpowers (the upstream framework)']` literal-skip post-filter"
    - "`path.cjs` rewrites segments and prefixes (`segment` and `prefix` modes from rename-map.json), and the walker's apply pass also rewrites filenames"
    - "`command.cjs` rewrites `/gsd-foo` → `/oto-foo` but NOT `gsd:foo` (skill_ns owns that path)"
    - "`skill_ns.cjs` rewrites `superpowers:skill-name` → `oto:skill-name`"
    - "`package.cjs` runs only on files named `package.json`, rewriting `name`/`bin` fields when value matches `from`"
    - "`url.cjs` substitutes `{{GITHUB_OWNER}}` at apply time (default `OTOJulian`, override via `context.owner`); preserves URLs in attribution context (Copyright, THIRD-PARTY-LICENSES.md, attribution markers)"
    - "`env_var.cjs` rewrites `GSD_VERSION` → `OTO_VERSION` but leaves `MY_GSD_VAR` alone (word boundary verified at start of token)"
    - "`walker.cjs` walks a tree honoring path-glob allowlist, skips binary extensions, returns iterable of `{relPath, absPath, content, file_class, allowlisted}` — yields allowlisted entries with `allowlisted: true` so the engine can copy them byte-for-byte (W1 cross-plan contract reconcile)"
    - "Walker uses `fs.readdirSync(root, {recursive:true, withFileTypes:true})` (stable since Node 18.17) — NOT `fs.promises.glob` (whose `.parentPath` semantics shifted across Node 22.x minors)"
    - "Hand-rolled JSON Schema validator at `scripts/rebrand/lib/validate-schema.cjs` is the single source; `tests/helpers/load-schema.cjs` re-exports from there (or vice versa) — one implementation, two callers"
    - "Schema validator rejects `rename-map.json` with unknown rule classes (Pitfall 1: every match must be classified)"
    - "Schema validator REQUIRES the `deprecated_drop` field to be present in `rename-map.json` (D-16 schema parity); contents are not consumed at Phase 2 (deferred to Phase 4)"
  artifacts:
    - path: "scripts/rebrand/lib/validate-schema.cjs"
      provides: "Hand-rolled JSON Schema 2020-12 subset (D-16) — moved from tests/helpers/load-schema.cjs"
      exports: ["validate"]
    - path: "scripts/rebrand/lib/walker.cjs"
      provides: "Tree walker with do-not-rename allowlist + binary skip + file_class lookup; yields allowlisted entries with allowlisted=true so engine can preserve them"
      exports: ["walk", "compileAllowlist", "isBinaryByExtension", "lookupFileClass"]
    - path: "scripts/rebrand/lib/rules/identifier.cjs"
      provides: "Word-bounded identifier rewrites (gsd, GSD, get-shit-done, superpowers, etc.)"
      exports: ["classify", "apply", "listMatches"]
    - path: "scripts/rebrand/lib/rules/path.cjs"
      provides: "Path segment + prefix rewrites (.planning, get-shit-done/, agents/gsd-)"
      exports: ["classify", "apply", "listMatches", "applyToFilename"]
    - path: "scripts/rebrand/lib/rules/command.cjs"
      provides: "Slash-command rewrites (/gsd- → /oto-)"
      exports: ["classify", "apply", "listMatches"]
    - path: "scripts/rebrand/lib/rules/skill_ns.cjs"
      provides: "Colon-namespaced skill rewrites (superpowers: → oto:)"
      exports: ["classify", "apply", "listMatches"]
    - path: "scripts/rebrand/lib/rules/package.cjs"
      provides: "package.json field rewrites (name, bin)"
      exports: ["classify", "apply", "listMatches", "applies"]
    - path: "scripts/rebrand/lib/rules/url.cjs"
      provides: "URL rewrites with {{GITHUB_OWNER}} substitution + attribution-context preserve"
      exports: ["classify", "apply", "listMatches"]
    - path: "scripts/rebrand/lib/rules/env_var.cjs"
      provides: "Env var rewrites (GSD_ → OTO_) with apply_to_pattern validation"
      exports: ["classify", "apply", "listMatches"]
  key_links:
    - from: "tests/helpers/load-schema.cjs"
      to: "scripts/rebrand/lib/validate-schema.cjs"
      via: "module re-export — one implementation, two callers (RESEARCH §Hand-rolled JSON Schema validator)"
      pattern: "module.exports = require"
    - from: "scripts/rebrand/lib/walker.cjs"
      to: "decisions/file-inventory.json"
      via: "lookupFileClass(relPath) reads inventory and returns category"
      pattern: "file-inventory"
    - from: "scripts/rebrand/lib/rules/url.cjs"
      to: "context.owner"
      via: "{{GITHUB_OWNER}} substitution at apply time, not load time (D-14)"
      pattern: "GITHUB_OWNER"
---

<objective>
Build the per-rule modules, the walker, and the hand-rolled schema validator that the engine orchestrator (Plan 02-03) will compose. This plan is foundation: each rule module is independently unit-testable; bugs in identifier `\b`-boundary handling must be isolatable from path segment matching (CONTEXT D-01 rationale). All seven rule modules ship with synthetic-fixture-driven unit tests.

Purpose: Pitfall 1 (substring collisions) is the only Phase 2 failure that would corrupt the entire codebase if missed. Per-rule isolation + per-rule tests are the defense. The walker contract (allowlist evaluation order, binary skip, file_class lookup) is locked in this plan so the engine plan only orchestrates.

Output:
- 7 rule modules under `scripts/rebrand/lib/rules/`
- 1 walker module under `scripts/rebrand/lib/`
- 1 schema validator under `scripts/rebrand/lib/` (with `tests/helpers/load-schema.cjs` re-exporting from it)
- 9 synthetic fixtures under `tests/fixtures/rebrand/` covering D-07 categories
- 9 test files exercising each rule + walker + schema validator
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
@tests/helpers/load-schema.cjs
@scripts/gen-inventory.cjs
@tests/phase-01-rename-map.test.cjs

<interfaces>
<!-- Uniform rule-module interface (D-01 lock). Every rule file in scripts/rebrand/lib/rules/ exports this shape. -->

```js
// scripts/rebrand/lib/rules/<rule>.cjs
'use strict';

/**
 * @param {string} token  - candidate matched substring
 * @param {object} rule   - the rule entry from rename-map.json (e.g. { from, to, boundary, ... })
 * @param {object} context - { owner, allowlist, fileClass, filePath, fileContent }
 * @returns {'match' | 'skip' | 'unclassified'}
 */
function classify(token, rule, context) { /* ... */ }

/**
 * @returns {{ text: string, replacements: number }}
 */
function apply(text, rule, context) { /* ... */ }

/**
 * @returns {Array<{from, to, line, col, classification: 'rename'|'preserve'|'deprecated_drop'}>}
 */
function listMatches(text, rule, context) { /* ... */ }

module.exports = { classify, apply, listMatches };
```

<!-- Walker contract (RESEARCH §Walker contract; W1 cross-plan reconcile + W5 primitive switch). -->

```js
// scripts/rebrand/lib/walker.cjs
'use strict';

/**
 * Compile the rename-map's do_not_rename array into:
 *   { pathGlobs: RegExp[], literals: string[], regexes: RegExp[] }
 */
function compileAllowlist(doNotRename) { /* ... */ }

/**
 * Yield every file (allowlisted OR not) under root, EXCLUDING binaries and scratch dirs.
 *
 * The walker does NOT silently skip allowlisted files — it yields them with
 * `allowlisted: true` so the engine (Plan 02-03) can copy them byte-for-byte
 * without running rule passes. This is the W1 cross-plan contract reconcile:
 * Plan 02-03's allowlist tests assert post-apply files still exist in `<out>/`,
 * which only works if the walker hands them to the engine.
 *
 * Primitive: `fs.readdirSync(root, { recursive: true, withFileTypes: true })`
 * (stable since Node 18.17). NOT `fs.promises.glob` (its `.parentPath` semantics
 * shifted across Node 22.x minors and CLAUDE.md mandates Node >=22.0.0 — we
 * cannot depend on >=22.10). Manual exclude predicate filters scratch dirs.
 *
 * @yields { relPath, absPath, content, file_class, allowlisted }
 */
async function* walk(root, allowlist, inventoryByPath) { /* ... */ }

function isBinaryByExtension(name) { /* matches /\.(png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf|otf|pdf|zip|tar|gz|bin)$/i */ }

function lookupFileClass(relPath, inventoryByPath) { /* return entry.category || 'other' */ }

module.exports = { walk, compileAllowlist, isBinaryByExtension, lookupFileClass };
```

<!-- Schema validator (RESEARCH §"Hand-rolled JSON Schema validator (D-16)" — extract from tests/helpers/load-schema.cjs). -->

The existing implementation at `tests/helpers/load-schema.cjs` already covers the JSON Schema subset Phase 2 needs. Move it to `scripts/rebrand/lib/validate-schema.cjs` (so it ships in the npm tarball — `scripts/rebrand/` is in pkg.files but `tests/helpers/` is not), then have `tests/helpers/load-schema.cjs` simply do `module.exports = require('../../scripts/rebrand/lib/validate-schema.cjs');`. One implementation, two callers (RESEARCH explicit recommendation).

The schema (`schema/rename-map.json`) lists `deprecated_drop` as a required top-level field; the validator therefore must reject inputs where `deprecated_drop` is absent. Phase 2 only enforces schema parity — engine consumption of the field's contents is deferred to Phase 4 (bulk port), per W6.
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Move schema validator + write walker.cjs + their tests + Wave 0 fixture scaffolding</name>
  <files>scripts/rebrand/lib/validate-schema.cjs, tests/helpers/load-schema.cjs, scripts/rebrand/lib/walker.cjs, tests/phase-02-walker.test.cjs, tests/phase-02-schema-validate.test.cjs, tests/fixtures/rebrand/identifier-edge.txt, tests/fixtures/rebrand/path-edge.txt, tests/fixtures/rebrand/command-vs-skill_ns.md, tests/fixtures/rebrand/license-block.txt, tests/fixtures/rebrand/url-attribution.md, tests/fixtures/rebrand/env-var-edge.txt, tests/fixtures/rebrand/hook-version-token.js, tests/fixtures/rebrand/multi-rule-line.md, tests/fixtures/rebrand/package-fixture.json</files>
  <read_first>
    - tests/helpers/load-schema.cjs (existing implementation — full file, will be relocated)
    - schema/rename-map.json (the schema to validate against)
    - rename-map.json (the input the schema validates)
    - tests/phase-01-rename-map.test.cjs (existing test that uses the validator — must continue to pass)
    - .planning/phases/02-rebrand-engine-distribution-skeleton/02-RESEARCH.md §"Walker contract", §"Hand-rolled JSON Schema validator (D-16)", §"Coverage manifest mechanics" (specifically the file_class lookup paragraph) and §"Walk performance" (synchronous fs.readdirSync recursion is acceptable)
    - .planning/phases/02-rebrand-engine-distribution-skeleton/02-CONTEXT.md (D-07 fixture categories, D-16 validator constraint, D-15 zero-deps, D-17 walker exclusions)
    - decisions/file-inventory.json (top of file, to understand the entry schema for lookupFileClass)
    - scripts/gen-inventory.cjs §line 205 (the binary-extension regex precedent + readdirSync recursion precedent)
    - rename-map.json §do_not_rename (the allowlist entries the walker must compile)
  </read_first>
  <behavior>
    - Test 1 (schema-validate): `validate(JSON.parse(fs.readFileSync('rename-map.json')), JSON.parse(fs.readFileSync('schema/rename-map.json'))).valid === true` — current rename-map passes.
    - Test 2 (schema-validate): mutate a deep clone to add `rules.weird_class: [{from:'a', to:'b'}]` → `valid === false` (additionalProperties:false rejects it). Errors array mentions `weird_class` or `additional property`.
    - Test 3 (schema-validate): omit `version` from a clone → `valid === false`. Errors mention `version` and `required`.
    - Test 4 (schema-validate-reexport): `require('tests/helpers/load-schema.cjs').validate === require('scripts/rebrand/lib/validate-schema.cjs').validate` (same function reference, not duplicated implementation).
    - Test 5 (schema-validate): existing phase-01-rename-map.test.cjs still passes (regression).
    - Test 6 (schema-validate-deprecated_drop): omit `deprecated_drop` from a deep clone → `valid === false`. Errors array mentions `deprecated_drop` and `required`. (W6: schema parity at Phase 2; engine consumption deferred to Phase 4.)
    - Test 7 (walker): walking `tests/fixtures/rebrand/` yields entries for every fixture file with `relPath` relative to root, `content` is a string, `file_class` is `'other'` (fixtures aren't in inventory), `allowlisted` is `false` (no fixture path matches the allowlist).
    - Test 8 (walker): walking a temp dir containing a binary fixture (`fs.writeFileSync('tmp/img.png', Buffer.from([0x89, 0x50, 0x4e, 0x47]))`) — the walker SKIPS that file (does not yield it). Use `fs.mkdtempSync` + cleanup in `t.after`.
    - Test 9 (walker — W1 contract): allowlist with `'foundation-frameworks/**'` glob — when walker is given a temp tree containing `foundation-frameworks/x.md` and `other/y.md`, it yields BOTH entries, with `foundation-frameworks/x.md` having `allowlisted: true` and `other/y.md` having `allowlisted: false`. Do NOT touch real `foundation-frameworks/` in this test — use a temp tree.
    - Test 10 (walker): `compileAllowlist(['LICENSE', 'foundation-frameworks/**', 'Lex Christopherson', {pattern: 'attribution.*upstream', reason: 'x'}])` returns `{pathGlobs: [/^LICENSE$/, /^foundation-frameworks\/.*$/], literals: ['Lex Christopherson'], regexes: [/attribution.*upstream/]}` (or equivalent — the test asserts the three buckets are populated correctly; entries containing `/` or `*` go to pathGlobs even without `*`, so `LICENSE` is a literal-no-glob pathGlob compiled from the bare token).
    - Test 11 (walker): `isBinaryByExtension('foo.png') === true`, `isBinaryByExtension('foo.md') === false`, `isBinaryByExtension('foo.JPG') === true` (case insensitive).
    - Test 12 (walker): `lookupFileClass('agents/gsd-planner.md', inventoryByPath)` returns the inventory's `category` for that path; returns `'other'` if path not in inventory.
    - Test 13 (walker — W5 primitive): introspect `scripts/rebrand/lib/walker.cjs` source — assert it does NOT contain the string `fs.promises.glob` and DOES contain `readdirSync` with `recursive` option (defends against accidental regression to glob primitive).
    - Test 14 (fixtures): each of the 9 fixtures exists, is non-empty, contains the relevant tokens for its category (e.g., `identifier-edge.txt` contains both `gsd` (positive) and `stagsd` (negative)).
  </behavior>
  <action>
    1. **Move schema validator**: copy current `tests/helpers/load-schema.cjs` content to `scripts/rebrand/lib/validate-schema.cjs` verbatim (same code, same exports). Then rewrite `tests/helpers/load-schema.cjs` to a single-line re-export:
       ```js
       'use strict';
       module.exports = require('../../scripts/rebrand/lib/validate-schema.cjs');
       ```
       This satisfies D-16 ("hand-rolled validator") and RESEARCH's "one implementation, two callers" recommendation. The existing `tests/phase-01-rename-map.test.cjs` continues to work because the import path is unchanged.

       After move, verify `schema/rename-map.json` declares `deprecated_drop` in its `required` array (W6). If not present, this is a Phase 1 schema bug — halt and report. If present, the validator already enforces it via the existing `required` check (no validator code change needed; the test in Test 6 verifies the behavior end-to-end).

    2. **Write `scripts/rebrand/lib/walker.cjs`** following the contract in `<interfaces>` above. Implementation specifics (W5 + W1):

       - `compileAllowlist(doNotRename)`:
         - Iterate entries. If string entry contains `/` or `*`, treat as path-glob: convert to RegExp using a hand-rolled minimatch (per RESEARCH §Walker contract): `**` → `.*`, `*` → `[^/]*`, escape regex special chars (`. + ? ( ) [ ] { } |`), anchor with `^...$`. Push to `pathGlobs`.
         - If string entry has no glob chars, push to `literals` (these are content-context preserves, not path filters).
         - If object entry `{pattern, reason}`, compile `new RegExp(pattern)`, push to `regexes`.
         - Return `{pathGlobs, literals, regexes}`.
       - `isBinaryByExtension(name)`: regex `/\.(png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf|otf|pdf|zip|tar|gz|bin)$/i.test(name)`. (Reuse the precedent from `scripts/gen-inventory.cjs`.)
       - `lookupFileClass(relPath, inventoryByPath)`: `inventoryByPath` is a `Map<relPath, entry>` constructed by the engine from `decisions/file-inventory.json`. Return `entry.category || 'other'` if found, else `'other'`. The engine builds the map; walker just looks up.
       - `walk(root, allowlist, inventoryByPath)` — **W5 primitive switch**: use `fs.readdirSync(root, { recursive: true, withFileTypes: true })` (stable since Node 18.17 — matches `scripts/gen-inventory.cjs` precedent and RESEARCH §Walk performance "synchronous fs.readdirSync recursion ... is acceptable"). Do NOT use `fs.promises.glob`; its `.parentPath` semantics changed across Node 22.x minors and CLAUDE.md mandates `>=22.0.0` not `>=22.10`.
         - For each `Dirent` entry: skip unless `entry.isFile()`.
         - Compute `absPath = path.join(entry.parentPath, entry.name)`; `relPath = path.relative(root, absPath)` (POSIX-normalize separators with `relPath.split(path.sep).join('/')` so allowlist regexes match consistently on macOS/Linux).
         - Apply manual exclude predicate over relPath (D-17): if `/^(node_modules|\.git|\.oto-rebrand-out|reports)(\/|$)/.test(relPath)` → continue (don't yield).
         - Skip if `isBinaryByExtension(entry.name)`.
         - Determine `allowlisted`: `allowlisted = allowlist.pathGlobs.some((rx) => rx.test(relPath))` (W1: do NOT skip; mark and yield).
         - Read content as UTF-8: `fs.readFileSync(absPath, 'utf8')`. If read throws (e.g., permission), continue.
         - Sniff content for NUL byte in first 512 bytes — if present, skip as binary fallback.
         - `file_class = lookupFileClass(relPath, inventoryByPath || new Map())`.
         - `yield { relPath, absPath, content, file_class, allowlisted }`.
         - Note: `walk` remains `async function*` for engine-side iteration symmetry, but the underlying primitive is sync. Use a simple `for (const entry of entries) yield ...` loop.

       Header pattern: `'use strict'; const fs = require('node:fs'); const path = require('node:path');` etc.

    3. **Write `tests/phase-02-schema-validate.test.cjs`** implementing Tests 1–6 above. Use `'use strict'; const { test } = require('node:test'); const assert = require('node:assert/strict');` header.

    4. **Write `tests/phase-02-walker.test.cjs`** implementing Tests 7–13 above. Tests 8 and 9 use `fs.mkdtempSync(os.tmpdir() + '/oto-walker-test-')` with `t.after()` cleanup via `fs.rmSync({recursive: true, force: true})`. Test 13 reads `scripts/rebrand/lib/walker.cjs` content and asserts `!source.includes('fs.promises.glob')` AND `/readdirSync\s*\([^)]*recursive\s*:\s*true/.test(source)`.

    5. **Write the 9 synthetic fixtures** under `tests/fixtures/rebrand/` covering D-07 categories. Each fixture is a tiny file (≤30 lines) containing the tokens for that category. Fixture content (plan-author specifies):

       - `identifier-edge.txt`:
         ```
         POSITIVE: gsd, GSD, Gsd, get-shit-done, get-shit-done-cc, GSD_VERSION, gsd_state_version, gsd-hook-version, superpowers, Superpowers
         NEGATIVE_substring: stagsd, gsdfoo, megsd, GSDFOO, supergsd
         NEGATIVE_attribution: Superpowers (the upstream framework)
         ```
       - `path-edge.txt`:
         ```
         see .planning/STATE.md
         see /other/.planning/file (segment match should still work)
         path: get-shit-done/bin/install.js
         agent file: agents/gsd-planner.md
         not-a-path: get-shit-done-cc.identifier (the .identifier suffix means this is a hostname, but identifier rule handles it; path rule must NOT mismatch)
         ```
       - `command-vs-skill_ns.md`:
         ```
         Command: /gsd-do should become /oto-do
         Skill: Skill(skill="gsd:do")
         Skill superpowers: Skill(skill="superpowers:test-driven-development")
         Boundary: not-a-command-/gsd-something
         ```
       - `license-block.txt`:
         ```
         Copyright (c) 2025 Lex Christopherson
         Copyright (c) 2025 Jesse Vincent
         Licensed under MIT
         (these names must NEVER be rewritten by any rule)
         ```
       - `url-attribution.md`:
         ```
         Repo: https://github.com/gsd-build/get-shit-done
         Upstream attribution: based on github.com/obra/superpowers (preserve)
         New repo: github.com/{{GITHUB_OWNER}}/oto-hybrid-framework (placeholder)
         Non-attribution rewrite target: see github.com/gsd-build/get-shit-done/issues/123 (REWRITE)
         ```
       - `env-var-edge.txt`:
         ```
         POSITIVE: GSD_VERSION, GSD_RUNTIME, GSD_FOO_BAR
         NEGATIVE: MY_GSD_VAR, GSDFOO, _GSD_, gsd_lower (lowercase handled by identifier rule, not env_var)
         ```
       - `hook-version-token.js`:
         ```js
         // # gsd-hook-version: {{GSD_VERSION}}
         // The {{GSD_VERSION}} token gets substituted at install time.
         module.exports = { version: '{{GSD_VERSION}}' };
         ```
       - `multi-rule-line.md`:
         ```
         // see /gsd-plan-phase under .planning/STATE.md, env GSD_RUNTIME, repo github.com/gsd-build/get-shit-done
         ```
       - `package-fixture.json`:
         ```json
         {
           "name": "get-shit-done-cc",
           "version": "1.0.0",
           "description": "test fixture for package rule — gsd in description should also be rewritten",
           "bin": { "get-shit-done-cc": "./bin/cli.js", "gsd-sdk": "./bin/sdk.js" }
         }
         ```

    6. **Verify regression**: `tests/phase-01-rename-map.test.cjs` still passes after the schema-validator move. This is the most important regression check.
  </action>
  <verify>
    <automated>node --test --test-concurrency=4 tests/phase-02-walker.test.cjs tests/phase-02-schema-validate.test.cjs tests/phase-01-rename-map.test.cjs</automated>
  </verify>
  <acceptance_criteria>
    - `node --test tests/phase-02-walker.test.cjs` exits 0
    - `node --test tests/phase-02-schema-validate.test.cjs` exits 0
    - `node --test tests/phase-01-rename-map.test.cjs` exits 0 (regression — validator move did not break Phase 1 test)
    - `test -f scripts/rebrand/lib/validate-schema.cjs` exits 0
    - `test -f scripts/rebrand/lib/walker.cjs` exits 0
    - All 9 fixture files exist: `for f in identifier-edge.txt path-edge.txt command-vs-skill_ns.md license-block.txt url-attribution.md env-var-edge.txt hook-version-token.js multi-rule-line.md package-fixture.json; do test -f tests/fixtures/rebrand/$f || exit 1; done`
    - `grep -c "stagsd" tests/fixtures/rebrand/identifier-edge.txt` returns at least 1 (substring negative present)
    - `grep -c "MY_GSD_VAR" tests/fixtures/rebrand/env-var-edge.txt` returns at least 1
    - `grep -c "Lex Christopherson" tests/fixtures/rebrand/license-block.txt` returns at least 1
    - `grep -c "Jesse Vincent" tests/fixtures/rebrand/license-block.txt` returns at least 1
    - `grep -c "{{GITHUB_OWNER}}" tests/fixtures/rebrand/url-attribution.md` returns at least 1
    - `wc -l tests/helpers/load-schema.cjs | awk '{print $1}' | xargs -I{} test {} -le 5` (file is now a thin re-export, ≤5 lines)
    - `grep -c "module.exports = require" tests/helpers/load-schema.cjs` returns at least 1
    - `node -e "const a = require('./tests/helpers/load-schema'); const b = require('./scripts/rebrand/lib/validate-schema'); process.exit(a.validate === b.validate ? 0 : 1)"` exits 0
    - W5 walker primitive: `grep -c "fs.promises.glob" scripts/rebrand/lib/walker.cjs` returns 0 AND `grep -c "readdirSync" scripts/rebrand/lib/walker.cjs` returns at least 1 AND `grep -cE "recursive\s*:\s*true" scripts/rebrand/lib/walker.cjs` returns at least 1
    - W1 walker contract: `grep -c "allowlisted" scripts/rebrand/lib/walker.cjs` returns at least 2 (the field appears in both the yielded object literal and the determination logic)
    - W6 schema parity: `node -e "const v=require('./scripts/rebrand/lib/validate-schema'); const fs=require('fs'); const m=JSON.parse(fs.readFileSync('rename-map.json','utf8')); const s=JSON.parse(fs.readFileSync('schema/rename-map.json','utf8')); delete m.deprecated_drop; const r=v.validate(m,s); process.exit(r.valid===false ? 0 : 1)"` exits 0
    - `grep -cE "require\\(['\"](?!node:|\\.|\\./|\\.\\./)" scripts/rebrand/lib/validate-schema.cjs scripts/rebrand/lib/walker.cjs` returns 0 (zero non-`node:` non-relative requires — D-15 zero-deps)
  </acceptance_criteria>
  <threat_ref>T-2-01 (engine never accepts user-supplied regex; rules constructed from schema-validated rename-map; unknown rule classes rejected at load — Test 2)</threat_ref>
  <done>Validator moved + walker shipped (W5 readdirSync primitive + W1 yields allowlisted entries) + 9 fixtures + 2 test files + Phase 1 regression test green + W6 deprecated_drop schema parity verified.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Write four character-level rule modules (identifier, path, command, skill_ns) + tests</name>
  <files>scripts/rebrand/lib/rules/identifier.cjs, scripts/rebrand/lib/rules/path.cjs, scripts/rebrand/lib/rules/command.cjs, scripts/rebrand/lib/rules/skill_ns.cjs, tests/phase-02-rules-identifier.test.cjs, tests/phase-02-rules-path.test.cjs, tests/phase-02-rules-command.test.cjs, tests/phase-02-rules-skill_ns.test.cjs</files>
  <read_first>
    - rename-map.json (the rule definitions these modules consume — identifier, path, command, skill_ns sections)
    - .planning/phases/02-rebrand-engine-distribution-skeleton/02-RESEARCH.md §"Per-rule matching+rewriting algorithms" (subsections identifier.cjs, path.cjs, command.cjs, skill_ns.cjs — copy regex strategies verbatim)
    - tests/fixtures/rebrand/identifier-edge.txt, tests/fixtures/rebrand/path-edge.txt, tests/fixtures/rebrand/command-vs-skill_ns.md (created in Task 1)
    - scripts/rebrand/lib/walker.cjs (Task 1; rules will consume context.allowlist from walker.compileAllowlist)
    - .planning/research/PITFALLS.md §Pitfall 1 (substring collisions — the design constraint these rules defend)
  </read_first>
  <behavior>
    - identifier Test 1 (positive lower): `apply('use gsd here', {from:'gsd',to:'oto',boundary:'word',case_variants:['lower']}, ctx).text === 'use oto here'`, `replacements === 1`.
    - identifier Test 2 (positive upper case-variant): `apply('GSD foo', {from:'gsd',to:'oto',boundary:'word',case_variants:['lower','upper']}, ctx).text === 'OTO foo'`. Title variant: `Gsd` → `Oto`.
    - identifier Test 3 (Pitfall 1 negative): `apply('stagsd gsdfoo megsd', {from:'gsd',to:'oto',boundary:'word'}, ctx).text === 'stagsd gsdfoo megsd'`, `replacements === 0`. Critical Pitfall 1 defense.
    - identifier Test 4 (boundary "exact" with hyphens): `apply('get-shit-done is here', {from:'get-shit-done',to:'oto',boundary:'word'}, ctx).text === 'oto is here'`. Note: rename-map.json marks `get-shit-done-cc` with `boundary: 'exact'`, while plain `get-shit-done` is `boundary: 'word'`. The implementation must distinguish: `boundary: 'exact'` uses lookaround `(?<![A-Za-z0-9_-])(from)(?![A-Za-z0-9_-])` so `get-shit-done` does NOT match inside `get-shit-done-cc`. `boundary: 'word'` uses `\b(from)\b` and the standard `\b` definition (so `get-shit-done` DOES match the start of `get-shit-done-cc` because `-` is non-word; this is intentional — a rule chain ordering concern handled by the engine, but each module must implement the boundary correctly per its `rule.boundary` field).
    - identifier Test 5 (do_not_match post-filter): `apply('see Superpowers (the upstream framework) for context', {from:'superpowers',to:'oto',boundary:'word',case_variants:['title'],do_not_match:['Superpowers (the upstream framework)']}, ctx).text === 'see Superpowers (the upstream framework) for context'` — match suppressed by literal-skip post-filter.
    - identifier Test 6 (classify): `classify('gsd', {from:'gsd',boundary:'word'}, ctx) === 'match'`. `classify('stagsd', {from:'gsd',boundary:'word'}, ctx) === 'unclassified'` (the engine knows the candidate token came from a regex hit; the rule rejects it as not-a-match → returns unclassified for the engine's accounting).
    - identifier Test 7 (listMatches): on identifier-edge.txt fixture, listMatches enumerates each positive match with `{from, to, line, col, classification:'rename'}`; negatives (`stagsd`, `gsdfoo`) do NOT appear.
    - path Test 1: `apply("see '.planning/STATE.md'", {from:'.planning',to:'.oto',match:'segment'}, ctx).text === "see '.oto/STATE.md'"`. Surrounding quote preserved.
    - path Test 2: `apply('cat get-shit-done/bin/install.js', {from:'get-shit-done/',to:'oto/',match:'prefix'}, ctx).text === 'cat oto/bin/install.js'`.
    - path Test 3: `apply('agents/gsd-planner.md', {from:'agents/gsd-',to:'agents/oto-',match:'prefix'}, ctx).text === 'agents/oto-planner.md'`.
    - path Test 4 (applyToFilename): `applyToFilename('agents/gsd-planner.md', rules.path)` returns `'agents/oto-planner.md'` (drives the walker's filename-rewrite pass during apply).
    - command Test 1: `apply('see /gsd-plan-phase here', {from:'/gsd-',to:'/oto-'}, ctx).text === 'see /oto-plan-phase here'`.
    - command Test 2 (does NOT touch skill_ns): `apply('Skill(skill="gsd:do")', {from:'/gsd-',to:'/oto-'}, ctx).replacements === 0` (no slash before, so no match; skill_ns owns this).
    - command Test 3: command on `command-vs-skill_ns.md` fixture rewrites only the `/gsd-do` line.
    - skill_ns Test 1: `apply('Skill(skill="superpowers:test-driven-development")', {from:'superpowers:',to:'oto:'}, ctx).text === 'Skill(skill="oto:test-driven-development")'`.
    - skill_ns Test 2 (boundary): `apply('see unsuperpowers:foo', {from:'superpowers:',to:'oto:'}, ctx).replacements === 0` — leading `\b` boundary prevents matching inside `unsuperpowers:`.
  </behavior>
  <action>
    Each of the 4 rule files exports the standard `{classify, apply, listMatches}` interface (see `<interfaces>` block). Implementation strategies (per RESEARCH §"Per-rule matching+rewriting algorithms" — copy verbatim):

    1. **`scripts/rebrand/lib/rules/identifier.cjs`**:
       - Compile patterns per `rule.boundary`:
         - `boundary === 'word'`: pattern is `\b<escaped from>\b`. For each variant in `rule.case_variants || ['lower']`, generate `from`-cased and `to`-cased pair. Variants: `'lower'` → from.toLowerCase(), `'upper'` → from.toUpperCase(), `'title'` → first char upper, rest lower.
         - `boundary === 'exact'`: pattern is `(?<![A-Za-z0-9_-])<escaped from>(?![A-Za-z0-9_-])` (custom non-`\w` boundary that includes hyphens — RESEARCH explicit).
       - `apply(text, rule, context)`:
         - For each `(pattern, fromVariant, toVariant)`: `text = text.replace(pattern, (match) => { /* check do_not_match neighborhood */ if (isDoNotMatch(match, text, rule.do_not_match)) return match; replacements++; return toVariant; });` Track `replacements` count.
         - `isDoNotMatch(match, text, doNotMatchList)`: for each literal in the list, check if any window of text containing the match also contains the literal (window = ±64 chars around the match offset). If yes → return true (skip). The match offset comes from `replace`'s callback signature: `text.replace(pattern, (match, offset, fullText) => ...)`.
       - `listMatches(text, rule, context)`: same regex, but use `text.matchAll(pattern)`; for each, compute line + col by counting `\n` up to `match.index`. Apply do_not_match filter the same way; matches that are filtered get `classification: 'preserve'` (not omitted entirely — the dryrun report wants to log them as "would-have-matched-but-skipped").
       - `classify(token, rule, context)`: try compiling rule's pattern; test against token. If matches and no do_not_match → `'match'`. If matches but in do_not_match list → `'skip'`. Otherwise → `'unclassified'`.

    2. **`scripts/rebrand/lib/rules/path.cjs`**:
       - `match === 'segment'`: pattern `(^|[/"'\\s])<escaped from>([/"'\\s]|$)`. Replace with `$1<to>$2`.
       - `match === 'prefix'`: pattern `(^|[\\s"'])<escaped from>`. Replace with `$1<to>`.
       - Export `applyToFilename(filename, pathRules)`: iterate rules; for each `prefix` rule whose `from` matches `filename`'s start, rewrite. For `segment`, split path on `/`, replace exact-match segments. Returns the new filename.

    3. **`scripts/rebrand/lib/rules/command.cjs`**:
       - Pattern: `/gsd-([a-z][a-z0-9-]*)\b`. Replace with `/oto-$1`.
       - Note: this rule has no boundary configurability — the regex itself defines the boundary. The `from`/`to` from rename-map (`/gsd-` → `/oto-`) is used to derive the regex; if a future rename-map adds a different `from`, the module still works as long as the prefix shape matches.

    4. **`scripts/rebrand/lib/rules/skill_ns.cjs`**:
       - Pattern: `\b<escaped from>([a-z][a-z0-9-]*)\b` — note leading `\b` to prevent `unsuperpowers:` matching. Replace with `<to>$1`.
       - For rename-map's `from: "superpowers:"`, this gives `\bsuperpowers:([a-z][a-z0-9-]*)\b`.

    All four modules: `'use strict';` header, `node:`-prefixed requires only, no top-level deps. Header docstring referencing the RESEARCH section.

    Test files implement Behavior tests above. Each test file imports the relevant rule module, `node:test`, `node:assert/strict`, and reads its fixture from `tests/fixtures/rebrand/`. Tests are flat `test('name', () => {...})` at module top-level, no `describe`.

    Helper: build a minimal `context = { owner: 'OTOJulian', allowlist: { pathGlobs: [], literals: [], regexes: [] }, fileClass: 'other', filePath: 'fixture', fileContent: '<text>' }` for each test.
  </action>
  <verify>
    <automated>node --test --test-concurrency=4 tests/phase-02-rules-identifier.test.cjs tests/phase-02-rules-path.test.cjs tests/phase-02-rules-command.test.cjs tests/phase-02-rules-skill_ns.test.cjs</automated>
  </verify>
  <acceptance_criteria>
    - All four rules tests pass via `node --test` (exit 0)
    - `grep -lE "module.exports.*classify.*apply.*listMatches" scripts/rebrand/lib/rules/{identifier,path,command,skill_ns}.cjs` matches 4 files
    - `grep -c "do_not_match" scripts/rebrand/lib/rules/identifier.cjs` returns at least 1
    - `grep -c "applyToFilename" scripts/rebrand/lib/rules/path.cjs` returns at least 1
    - `grep -c "/gsd-" scripts/rebrand/lib/rules/command.cjs` returns at least 1 (the command-rule pattern source)
    - `grep -c "\\\\b" scripts/rebrand/lib/rules/skill_ns.cjs` returns at least 1 (boundary regex present)
    - `grep -cE "require\\(['\"](?!node:|\\.|\\.\\.)" scripts/rebrand/lib/rules/{identifier,path,command,skill_ns}.cjs` returns 0 (zero third-party imports)
    - Pitfall 1 regression: `node -e "const r=require('./scripts/rebrand/lib/rules/identifier'); const ctx={owner:'OTOJulian',allowlist:{pathGlobs:[],literals:[],regexes:[]},fileClass:'other',filePath:'',fileContent:''}; const out=r.apply('stagsd gsdfoo megsd', {from:'gsd',to:'oto',boundary:'word',case_variants:['lower']}, ctx); process.exit(out.replacements === 0 ? 0 : 1)"` exits 0
    - Word-boundary regression: `node -e "const r=require('./scripts/rebrand/lib/rules/identifier'); const ctx={owner:'OTOJulian',allowlist:{pathGlobs:[],literals:[],regexes:[]},fileClass:'other',filePath:'',fileContent:''}; const out=r.apply('use gsd here', {from:'gsd',to:'oto',boundary:'word',case_variants:['lower']}, ctx); process.exit(out.text === 'use oto here' && out.replacements === 1 ? 0 : 1)"` exits 0
  </acceptance_criteria>
  <threat_ref>T-2-01 (rules constructed from schema-validated rename-map; per-rule unit tests catch regex regression that would otherwise corrupt entire codebase)</threat_ref>
  <done>4 rule modules + 4 test files; all 4 tests green; Pitfall 1 substring-collision negative verified by acceptance criterion above.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Write three structural rule modules (package, url, env_var) + tests</name>
  <files>scripts/rebrand/lib/rules/package.cjs, scripts/rebrand/lib/rules/url.cjs, scripts/rebrand/lib/rules/env_var.cjs, tests/phase-02-rules-package.test.cjs, tests/phase-02-rules-url.test.cjs, tests/phase-02-rules-env_var.test.cjs</files>
  <read_first>
    - rename-map.json §rules.package, rules.url, rules.env_var, do_not_rename (the entries these modules consume)
    - .planning/phases/02-rebrand-engine-distribution-skeleton/02-RESEARCH.md §"Per-rule matching+rewriting algorithms" — subsections package.cjs, url.cjs, env_var.cjs (copy strategies verbatim)
    - tests/fixtures/rebrand/url-attribution.md, env-var-edge.txt, package-fixture.json (created in Task 1)
    - .planning/phases/02-rebrand-engine-distribution-skeleton/02-CONTEXT.md §D-14 ({{GITHUB_OWNER}} substitution at apply time, not load time)
  </read_first>
  <behavior>
    - package Test 1 (name field): `apply(JSON.parse(fs.readFileSync('tests/fixtures/rebrand/package-fixture.json','utf8')), {from:'get-shit-done-cc', to:'oto', fields:['name','bin']}, ctx)` returns object where `pkg.name === 'oto'`. (Note: package.cjs operates on the JSON OBJECT, not the raw string — see action below.)
    - package Test 2 (bin object key rename): `pkg.bin['oto'] === './bin/cli.js'` AND `pkg.bin['get-shit-done-cc']` is undefined after apply (key renamed).
    - package Test 3 (bin separate rule): applying both rules to fixture, `pkg.bin['oto-sdk'] === './bin/sdk.js'` (gsd-sdk → oto-sdk via second rule).
    - package Test 4 (applies): `applies('package.json') === true`, `applies('foo.md') === false`. (Used by the engine to gate which files go through this rule.)
    - url Test 1 (default owner): `apply('see github.com/gsd-build/get-shit-done/issues', {from:'github.com/gsd-build/get-shit-done', to:'github.com/{{GITHUB_OWNER}}/oto-hybrid-framework', preserve_in_attribution:true}, {...ctx, owner:'OTOJulian', allowlist:{pathGlobs:[],literals:[],regexes:[]}}).text === 'see github.com/OTOJulian/oto-hybrid-framework/issues'`.
    - url Test 2 (override owner): same input but `context.owner === 'someone'` → `text` contains `github.com/someone/oto-hybrid-framework`.
    - url Test 3 (attribution preserve — Copyright marker): `apply('Copyright (c) 2025 see github.com/gsd-build/get-shit-done', rule, ctx).replacements === 0` — preserved because line contains `Copyright`.
    - url Test 4 (attribution preserve — THIRD-PARTY-LICENSES file context): when `context.filePath === 'THIRD-PARTY-LICENSES.md'`, all matches preserved regardless of line content.
    - url Test 5 (non-attribution rewrite): `apply('regular text github.com/gsd-build/get-shit-done/issues/123', rule, {...ctx, filePath:'README.md'}).replacements === 1`.
    - env_var Test 1: `apply('process.env.GSD_VERSION', {from:'GSD_', to:'OTO_', apply_to_pattern:'^GSD_[A-Z][A-Z0-9_]*$'}, ctx).text === 'process.env.OTO_VERSION'`.
    - env_var Test 2 (negative — embedded): `apply('MY_GSD_VAR', rule, ctx).replacements === 0` (leading word boundary prevents match).
    - env_var Test 3 (negative — wrong shape): `apply('GSD_lowercase_thing', rule, ctx).replacements === 0` (lowercase chars after `GSD_` violate `apply_to_pattern`).
    - env_var Test 4 (multiple in one line): `apply('GSD_RUNTIME=foo GSD_VERSION=bar', rule, ctx).replacements === 2`.
    - env_var Test 5 (allowlist literal — runtime env vars): when `context.allowlist.literals` includes `'CLAUDE_PLUGIN_ROOT'`, `apply('CLAUDE_PLUGIN_ROOT=foo GSD_VERSION=bar', rule, ctx).replacements === 1` (only `GSD_VERSION` rewritten; `CLAUDE_PLUGIN_ROOT` is not even matched since it doesn't start with `GSD_`, but Test 5 verifies the literal-allowlist plumbing exists for adjacent rules).
  </behavior>
  <action>
    1. **`scripts/rebrand/lib/rules/package.cjs`** (RESEARCH §package.cjs — operates on parsed JSON, not free text):
       - Export `applies(filePath)`: `path.basename(filePath) === 'package.json'`. Used by the engine.
       - `apply(pkgObject, rule, context)`: takes a parsed JSON object, mutates a deep clone:
         - For each field in `rule.fields`:
           - If field is `'name'` and `pkg.name === rule.from`, set `pkg.name = rule.to`.
           - If field is `'bin'`:
             - If `typeof pkg.bin === 'string'` and `pkg.bin === rule.from`, set `pkg.bin = rule.to`.
             - If `typeof pkg.bin === 'object'`:
               - If `rule.from` is a key of `pkg.bin`: rename to `rule.to`, preserving the value.
               - Also iterate values: if any value === `rule.from`, set to `rule.to`.
         - (Future fields like `description`, `keywords` could be added here, but rename-map.json's `package.fields` only includes `name` and `bin`.)
       - Returns `{ pkg: <new object>, replacements: <count> }`.
       - `classify(token, rule, context)`: returns `'match'` if token equals `rule.from` AND the engine indicates context is package.json (caller's responsibility); else `'unclassified'`.
       - `listMatches(pkgObject, rule, context)`: same logic as apply, but enumerates matches without mutating; returns `[{from, to, line: 0, col: 0, classification: 'rename'}]` with line/col stubbed to 0 (JSON object operation, no line/col semantic).

    2. **`scripts/rebrand/lib/rules/url.cjs`** (RESEARCH §url.cjs):
       - `apply(text, rule, context)`:
         - Resolve `to`: `const resolvedTo = rule.to.replace('{{GITHUB_OWNER}}', context.owner || 'OTOJulian');` — D-14: substitution happens at apply time.
         - Build pattern: regex-escape `rule.from`, no boundary anchors needed (URL fragments don't have natural boundaries that aren't already in the URL itself).
         - Iterate `text.matchAll(pattern)`:
           - Compute `lineStart = text.lastIndexOf('\n', match.index) + 1; lineEnd = text.indexOf('\n', match.index); const line = text.slice(lineStart, lineEnd === -1 ? text.length : lineEnd);`.
           - Determine if attribution context applies (when `rule.preserve_in_attribution === true`):
             - If `context.filePath === 'THIRD-PARTY-LICENSES.md'` or `context.filePath.endsWith('/LICENSE')` or `context.filePath.endsWith('/LICENSE.md')` → preserve.
             - If `line` contains `Copyright`, `(c)`, or `attribution` (case-insensitive) → preserve.
             - If line is wrapped in markdown brackets containing `upstream`, `original`, `based on` (regex `\[.*?(upstream|original|based on).*?\]`) → preserve.
           - If preserved, leave the match alone, but record in listMatches as `classification: 'preserve'`.
           - Otherwise, replace `rule.from` with `resolvedTo` in this match.
         - Return `{text: <new>, replacements: <count of non-preserved>}`.
       - `listMatches`: same enumeration without mutation.
       - `classify`: returns `'match'` for tokens that the regex matches and aren't preserved; `'skip'` for preserved; `'unclassified'` for non-matches.

    3. **`scripts/rebrand/lib/rules/env_var.cjs`** (RESEARCH §env_var.cjs):
       - Pattern: `\b<escaped from>[A-Z][A-Z0-9_]*\b` (e.g., `\bGSD_[A-Z][A-Z0-9_]*\b` for from=`GSD_`).
       - `apply(text, rule, context)`:
         - For each match, validate against `rule.apply_to_pattern` regex (`^GSD_[A-Z][A-Z0-9_]*$` ensures shape). If match doesn't satisfy `apply_to_pattern`, skip.
         - Check `context.allowlist.literals` — if the matched env-var name is in the literal allowlist, skip (preserve).
         - Otherwise, replace `rule.from` prefix with `rule.to` (rest of the env var preserved).
       - `listMatches`: same enumeration without mutation.
       - `classify`: returns `'match'` or `'skip'` (allowlisted) or `'unclassified'`.

    All three files: `'use strict';` header, `node:`-prefixed requires only, header docstring referencing the RESEARCH section.

    Test files implement Behavior tests above. URL Test 4 needs to construct a context with `filePath: 'THIRD-PARTY-LICENSES.md'`. env_var Test 5's allowlist context: `{...ctx, allowlist:{pathGlobs:[],literals:['CLAUDE_PLUGIN_ROOT'],regexes:[]}}`.
  </action>
  <verify>
    <automated>node --test --test-concurrency=4 tests/phase-02-rules-package.test.cjs tests/phase-02-rules-url.test.cjs tests/phase-02-rules-env_var.test.cjs</automated>
  </verify>
  <acceptance_criteria>
    - All three rule tests pass via `node --test` (exit 0)
    - `grep -c "{{GITHUB_OWNER}}" scripts/rebrand/lib/rules/url.cjs` returns at least 1 (placeholder is referenced)
    - `grep -c "context.owner" scripts/rebrand/lib/rules/url.cjs` returns at least 1 (apply-time substitution per D-14)
    - `grep -c "preserve_in_attribution" scripts/rebrand/lib/rules/url.cjs` returns at least 1
    - `grep -c "applies" scripts/rebrand/lib/rules/package.cjs` returns at least 1 (gates on package.json basename)
    - `grep -c "apply_to_pattern" scripts/rebrand/lib/rules/env_var.cjs` returns at least 1
    - `grep -lE "module.exports.*classify.*apply.*listMatches" scripts/rebrand/lib/rules/{package,url,env_var}.cjs` matches all 3 files
    - Owner-default regression: `node -e "const r=require('./scripts/rebrand/lib/rules/url'); const ctx={owner:'OTOJulian',allowlist:{pathGlobs:[],literals:[],regexes:[]},fileClass:'other',filePath:'README.md',fileContent:''}; const rule={from:'github.com/gsd-build/get-shit-done', to:'github.com/{{GITHUB_OWNER}}/oto-hybrid-framework', preserve_in_attribution:true}; const out=r.apply('see github.com/gsd-build/get-shit-done/issues', rule, ctx); process.exit(out.text === 'see github.com/OTOJulian/oto-hybrid-framework/issues' ? 0 : 1)"` exits 0
    - Owner-override regression: same as above but `owner:'someone'` → output contains `github.com/someone/`
    - env_var word-boundary regression: `node -e "const r=require('./scripts/rebrand/lib/rules/env_var'); const ctx={owner:'OTOJulian',allowlist:{pathGlobs:[],literals:[],regexes:[]},fileClass:'other',filePath:'',fileContent:''}; const out=r.apply('MY_GSD_VAR', {from:'GSD_',to:'OTO_',apply_to_pattern:'^GSD_[A-Z][A-Z0-9_]*$'}, ctx); process.exit(out.replacements === 0 ? 0 : 1)"` exits 0
    - `grep -cE "require\\(['\"](?!node:|\\.|\\.\\.)" scripts/rebrand/lib/rules/{package,url,env_var}.cjs` returns 0 (zero third-party imports)
  </acceptance_criteria>
  <threat_ref>T-2-01 (per-rule schema-validated input + per-rule unit tests; url.cjs is the only rule that does string substitution from a placeholder, and the substitution is bounded to a single literal placeholder string)</threat_ref>
  <done>3 rule modules + 3 test files; all 3 tests green; D-14 apply-time {{GITHUB_OWNER}} substitution verified by acceptance criterion above.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| `rename-map.json` (user-controlled file) → engine rule modules | Validated by hand-rolled JSON Schema before any rule runs |
| `foundation-frameworks/` source tree → walker | Walker reads as input; never writes back (out-of-place apply only) |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-2-01 | Tampering | `rename-map.json` with malicious regex causing ReDoS | mitigate | Schema validation rejects unknown rule classes (Task 1 Test 2); regex constructed by escaping `from`/`to` literals via `String.prototype.replace`-safe escape; user-supplied regex (in `do_not_rename` `pattern` field) is compiled but not executed against attacker-controlled input — only against repo content. Risk: LOW (single-developer repo, attacker model is "user accidentally types bad regex"). |
| T-2-02 | Tampering | Walker accepting malicious `--target` path with `..` segments | mitigate | Walker is called by engine (Plan 02-03) which resolves `--target` via `path.resolve(target)` and rejects if resolved path escapes the repo root; walker itself uses `path.relative(root, ...)` and never reads outside `root`. (This task: walker does its half of the defense; engine does the input-side check in Plan 02-03.) |

All threats LOW; no blocker per ASVS L1.
</threat_model>

<verification>
- All 9 test files in this plan pass via `node --test --test-concurrency=4 tests/phase-02-{rules-*,walker,schema-validate}.test.cjs`
- Phase 1 regression: `node --test tests/phase-01-rename-map.test.cjs` passes (validator move did not break Phase 1)
- All 7 rule modules + walker + schema validator exist on disk and export the expected interfaces
- 9 fixtures exist with the correct token contents (verified by acceptance criteria greps)
- Walker uses `fs.readdirSync({recursive:true})` primitive (W5) and yields allowlisted entries with `allowlisted` flag (W1)
- Schema validator enforces `deprecated_drop` field presence (W6 schema parity)
</verification>

<success_criteria>
- 7 rule modules implemented, each with the `{classify, apply, listMatches}` interface (D-01)
- Walker module compiles allowlist into 3 buckets (pathGlobs, literals, regexes), uses `fs.readdirSync({recursive:true})` (W5), and yields allowlisted entries with `allowlisted: true` (W1)
- Schema validator moved to `scripts/rebrand/lib/validate-schema.cjs` (single source); `tests/helpers/load-schema.cjs` is a re-export
- Schema validator rejects rename-maps lacking `deprecated_drop` (W6)
- 9 synthetic fixtures cover all D-07 categories
- All 9 test files green (per-rule + walker + schema-validate)
- Phase 1 test continues to pass (regression)
- Pitfall 1 substring-collision negative verified (acceptance criterion in Task 2)
- D-14 apply-time `{{GITHUB_OWNER}}` substitution verified (acceptance criterion in Task 3)
- All artifacts in `<must_haves>` exist and match `provides`
- `02-VALIDATION.md` per-task map updated with rows for Plan 02-02 Tasks 1–3
</success_criteria>

<output>
After completion, create `.planning/phases/02-rebrand-engine-distribution-skeleton/02-02-SUMMARY.md`
</output>
