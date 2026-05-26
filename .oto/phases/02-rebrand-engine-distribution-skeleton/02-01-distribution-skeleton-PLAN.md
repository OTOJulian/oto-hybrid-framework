---
phase: 02-rebrand-engine-distribution-skeleton
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - package.json
  - bin/install.js
  - scripts/build-hooks.js
  - scripts/install-smoke.cjs
  - hooks/.gitkeep
  - .gitignore
  - README.md
  - tests/phase-02-package-json.test.cjs
  - tests/phase-02-build-hooks.test.cjs
  - tests/phase-02-gitignore.test.cjs
  - tests/phase-02-bin-stub.test.cjs
autonomous: false   # contains a human-action checkpoint for GitHub repo creation
requirements: [FND-01, FND-02, FND-03, FND-04]

must_haves:
  truths:
    - "`package.json` declares engines.node >=22.0.0, CJS default, bin: { oto: bin/install.js }, explicit files allowlist, postinstall script, NO prepublishOnly, version 0.1.0-alpha.1, no top-level dependencies"
    - "`scripts/build-hooks.js` validates JS via vm.Script + copies to hooks/dist/; exits 0 cleanly when hooks/ contains only .gitkeep"
    - "`bin/install.js` is invokable post-install, prints `oto v0.1.0-alpha.1` + Phase 3 hint, exits 0"
    - "`.gitignore` covers .oto-rebrand-out/, reports/, hooks/dist/, node_modules/, *.log, /tmp-*"
    - "`scripts/install-smoke.cjs` exists and exercises the `npm install -g https://github.com/OTOJulian/oto-hybrid-framework/archive/<sha>.tar.gz --prefix /tmp/...` path against the live remote, asserting `oto` bin runs and prints version"
    - "Public GitHub repo `OTOJulian/oto-hybrid-framework` exists and clones with the current branch pushed"
  artifacts:
    - path: "package.json"
      provides: "Node package skeleton (engines, bin, files, scripts, no deps)"
      contains: '"engines"'
    - path: "bin/install.js"
      provides: "Installable bin stub (Phase 3 grows it)"
      min_lines: 5
    - path: "scripts/build-hooks.js"
      provides: "vm-validated hook copier wired to postinstall lifecycle"
      min_lines: 30
    - path: "scripts/install-smoke.cjs"
      provides: "Live-remote npm install -g smoke check (D-08)"
      min_lines: 30
    - path: "hooks/.gitkeep"
      provides: "Keeps empty hooks/ tracked so build-hooks.js never throws ENOENT on fresh clone"
    - path: ".gitignore"
      provides: "Excludes scratch dirs (D-17)"
      contains: ".oto-rebrand-out/"
    - path: "README.md"
      provides: "Phase 2 minimal stub mentioning install command"
    - path: "tests/phase-02-package-json.test.cjs"
      provides: "Static assertion on package.json shape"
    - path: "tests/phase-02-build-hooks.test.cjs"
      provides: "Verifies empty-hooks no-op + syntax-validation rejection"
    - path: "tests/phase-02-gitignore.test.cjs"
      provides: "Asserts D-17 entries"
    - path: "tests/phase-02-bin-stub.test.cjs"
      provides: "Asserts bin prints version + exits 0"
  key_links:
    - from: "package.json scripts.postinstall"
      to: "scripts/build-hooks.js"
      via: "npm postinstall lifecycle (runs on `npm install -g https://github.com/.../archive/<ref>.tar.gz`)"
      pattern: '"postinstall":\\s*"node scripts/build-hooks.js"'
    - from: "package.json bin"
      to: "bin/install.js"
      via: "npm bin shim"
      pattern: '"oto":\\s*"bin/install.js"'
    - from: "scripts/build-hooks.js"
      to: "hooks/"
      via: "fs.readdirSync + vm.Script syntax check"
      pattern: 'new vm\\.Script'
    - from: "scripts/install-smoke.cjs"
      to: "github.com/OTOJulian/oto-hybrid-framework"
      via: "child_process.execSync('npm install -g https://github.com/.../archive/<sha>.tar.gz')"
      pattern: 'npm install -g https://github.com/OTOJulian/oto-hybrid-framework/archive/'
---

<objective>
Ship the Node package skeleton that makes `npm install -g https://github.com/OTOJulian/oto-hybrid-framework/archive/<ref>.tar.gz` install cleanly with all lifecycle hooks correctly wired, plus the live-remote install-smoke that proves it.

Purpose: Phase 2 has two interlocked artifacts (skeleton + engine). This plan ships the skeleton so the engine plan (02-02) lands into a repo that already passes `npm install -g https://github.com/.../archive/<ref>.tar.gz` and has the test infrastructure in place. Without the skeleton, REB-* tests would have no harness to run inside.

Output:
- `package.json` matching the D-09 lock-shape (engines, bin, files, scripts, repository, license, author — NO main, NO exports, NO type, NO prepublishOnly, NO top-level dependencies)
- `bin/install.js` stub (prints version + Phase-3 hint)
- `scripts/build-hooks.js` real-but-no-op (vm-validated copy script with empty hooks/)
- `scripts/install-smoke.cjs` (live-remote install verification)
- `hooks/.gitkeep`
- `.gitignore` updates
- `README.md` minimal stub
- 4 test files asserting all of the above
- Manual GitHub repo creation + push + install-smoke pass
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/REQUIREMENTS.md
@.planning/phases/02-rebrand-engine-distribution-skeleton/02-CONTEXT.md
@.planning/phases/02-rebrand-engine-distribution-skeleton/02-RESEARCH.md
@.planning/phases/02-rebrand-engine-distribution-skeleton/02-VALIDATION.md
@CLAUDE.md
@foundation-frameworks/get-shit-done-main/package.json
@foundation-frameworks/get-shit-done-main/scripts/build-hooks.js
@scripts/gen-inventory.cjs
@tests/phase-01-licenses.test.cjs

<interfaces>
<!-- Existing patterns the executor should mirror exactly. -->

From `scripts/gen-inventory.cjs` (existing CJS style precedent):
```js
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const REPO_ROOT = path.join(__dirname, '..');
// ... `node:`-prefixed core requires, no top-level deps
```

From `tests/phase-01-licenses.test.cjs` (existing test file precedent — naming, layout):
```js
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const REPO_ROOT = path.join(__dirname, '..');
test('LICENSE exists', () => { ... });
```

From `foundation-frameworks/get-shit-done-main/scripts/build-hooks.js` (canonical vm-validated copy pattern):
```js
const vm = require('vm');
function validateSyntax(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  try {
    new vm.Script(content, { filename: path.basename(filePath) });
    return null;
  } catch (e) {
    if (e instanceof SyntaxError) return e.message;
    throw e;
  }
}
```

From CONTEXT.md D-09 (the LITERAL package.json — copy verbatim, do not paraphrase):
```json
{
  "name": "oto",
  "version": "0.1.0-alpha.1",
  "description": "Hybrid AI-CLI framework: GSD planning + Superpowers skills under /oto-* across Claude/Codex/Gemini",
  "engines": { "node": ">=22.0.0" },
  "bin": { "oto": "bin/install.js" },
    "files": [
      "bin/",
      "hooks/",
      "scripts/rebrand/",
    "scripts/build-hooks.js",
    "rename-map.json",
    "schema/",
    "package.json",
    "README.md",
    "LICENSE",
    "THIRD-PARTY-LICENSES.md"
  ],
  "scripts": {
    "postinstall": "node scripts/build-hooks.js",
    "test": "node --test --test-concurrency=4 tests/",
    "rebrand": "node scripts/rebrand.cjs",
    "rebrand:dry-run": "node scripts/rebrand.cjs --dry-run",
    "rebrand:roundtrip": "node scripts/rebrand.cjs --verify-roundtrip"
  },
  "repository": { "type": "git", "url": "git+https://github.com/OTOJulian/oto-hybrid-framework.git" },
  "license": "MIT",
  "author": "Julian Isaac"
}
```

NO `main`. NO `exports`. NO `type`. NO `prepublishOnly`. NO top-level `dependencies`. NO `devDependencies` (zero deps per D-15).
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Create package.json + bin/install.js stub + hooks/.gitkeep + .gitignore + README.md, plus their assertion tests</name>
  <files>package.json, bin/install.js, hooks/.gitkeep, .gitignore, README.md, tests/phase-02-package-json.test.cjs, tests/phase-02-gitignore.test.cjs, tests/phase-02-bin-stub.test.cjs</files>
  <read_first>
    - .planning/phases/02-rebrand-engine-distribution-skeleton/02-CONTEXT.md (D-09, D-13, D-14, D-17)
    - .planning/phases/02-rebrand-engine-distribution-skeleton/02-RESEARCH.md §"Distribution Skeleton Deep-Dive"
    - foundation-frameworks/get-shit-done-main/package.json (template; do not copy verbatim — extract pattern only)
    - tests/phase-01-licenses.test.cjs (test file precedent)
    - scripts/gen-inventory.cjs (CJS style + 'use strict' header pattern)
    - CLAUDE.md §"What NOT to Use" (specifically: NO TypeScript, NO bundlers, NO npm publish, NO `prepublishOnly`)
  </read_first>
  <behavior>
    - Test 1 (package-json): JSON.parse(package.json) has exactly these top-level keys (in any order): name, version, description, engines, bin, files, scripts, repository, license, author. Has NO `main`, `exports`, `type`, `dependencies`, `devDependencies`, `prepublishOnly` keys.
    - Test 2 (package-json): pkg.engines.node === '>=22.0.0', pkg.name === 'oto', pkg.version === '0.1.0-alpha.1', pkg.bin.oto === 'bin/install.js', pkg.license === 'MIT', pkg.author === 'Julian Isaac'.
    - Test 3 (package-json): pkg.scripts.postinstall === 'node scripts/build-hooks.js', pkg.scripts.test === 'node --test --test-concurrency=4 tests/', pkg.scripts.rebrand === 'node scripts/rebrand.cjs', pkg.scripts['rebrand:dry-run'] && pkg.scripts['rebrand:roundtrip']. Assert `'prepublishOnly' in pkg.scripts === false`.
    - Test 4 (package-json): pkg.files is an array containing exactly: ['bin/', 'scripts/rebrand/', 'scripts/build-hooks.js', 'rename-map.json', 'schema/', 'package.json', 'README.md', 'LICENSE', 'THIRD-PARTY-LICENSES.md']. Asserts `'foundation-frameworks/'` is NOT in pkg.files (D-10), `'tests/'` is NOT in pkg.files (D-11).
    - Test 5 (package-json): pkg.repository.url === 'git+https://github.com/OTOJulian/oto-hybrid-framework.git'.
    - Test 6 (gitignore): The text of .gitignore contains exact lines (one per line): `.oto-rebrand-out/`, `reports/`, `hooks/dist/`, `node_modules/`, `*.log`, `/tmp-*`. Use `gitignoreLines.includes('.oto-rebrand-out/')` style assertions.
    - Test 7 (bin-stub): `child_process.spawnSync(process.execPath, ['bin/install.js'])` returns status 0 AND stdout contains 'oto v0.1.0-alpha.1' AND stdout contains '/oto-hybrid-framework' (the repo URL).
    - Test 8 (bin-stub): `bin/install.js` first line is `#!/usr/bin/env node` and second line is `'use strict';`.
  </behavior>
  <action>
    1. **Write `package.json`** (at repo root) using EXACTLY the JSON from `<interfaces>` above (D-09 lock — copy verbatim). The key order shown is the canonical order; preserve it. End the file with a single trailing newline.

    2. **Write `bin/install.js`** with this exact content:
       ```js
       #!/usr/bin/env node
       'use strict';

       const { version } = require('../package.json');

       console.log(`oto v${version}`);
       console.log('');
       console.log('Run `oto install --claude` (Phase 3) to install for Claude Code.');
       console.log('Repo: https://github.com/OTOJulian/oto-hybrid-framework');

       process.exit(0);
       ```
       Then run `chmod +x bin/install.js` AND `git update-index --chmod=+x bin/install.js` so the executable bit is committed (Pitfall 16; see RESEARCH §"Cross-platform shebang concerns").

    3. **Write `hooks/.gitkeep`** as an empty file (just `touch hooks/.gitkeep` semantics via Write tool with empty content). Required so `scripts/build-hooks.js` does not throw ENOENT on fresh clone or installed package (RESEARCH §"hooks/.gitkeep + postinstall UX").

    4. **Append to `.gitignore`** (create if missing) the following lines exactly (D-17):
       ```
       .oto-rebrand-out/
       reports/
       hooks/dist/
       node_modules/
       *.log
       /tmp-*
       ```
       If `.gitignore` already exists with some entries, append these without duplicating; preserve existing entries.

    5. **Write `README.md`** as a minimal Phase 2 stub. Required content: name `oto`, one-paragraph description from PROJECT.md core value, install command `npm install -g https://github.com/OTOJulian/oto-hybrid-framework/archive/vX.Y.Z.tar.gz` (with `vX.Y.Z` placeholder noted), upstream attribution (`THIRD-PARTY-LICENSES.md` reference + GSD + Superpowers links), one line "alpha — Phase 2 ships the rebrand engine; Phase 3 wires the real installer." Layout details at planner's discretion per CONTEXT D-discretion.

    6. **Write the four test files** in `tests/`:
       - `tests/phase-02-package-json.test.cjs` — implements behaviors Test 1–5 above. Use `'use strict'; const { test } = require('node:test'); const assert = require('node:assert/strict');` header pattern from `tests/phase-01-licenses.test.cjs`.
       - `tests/phase-02-gitignore.test.cjs` — implements Test 6.
       - `tests/phase-02-bin-stub.test.cjs` — implements Test 7 + Test 8 (uses `child_process.spawnSync`).
       - (No build-hooks test in this task — that's Task 2.)

    Do NOT add any dependencies. Do NOT add `package-lock.json` (zero-deps means no install step). All test imports use `node:`-prefixed built-ins.
  </action>
  <verify>
    <automated>node --test --test-concurrency=4 tests/phase-02-package-json.test.cjs tests/phase-02-gitignore.test.cjs tests/phase-02-bin-stub.test.cjs</automated>
  </verify>
  <acceptance_criteria>
    - `node --test tests/phase-02-package-json.test.cjs` exits 0
    - `node --test tests/phase-02-gitignore.test.cjs` exits 0
    - `node --test tests/phase-02-bin-stub.test.cjs` exits 0
    - `node bin/install.js` exits 0 AND stdout contains the literal string `oto v0.1.0-alpha.1`
    - `grep -c '"prepublishOnly"' package.json` returns `0`
    - `grep -c '"dependencies"' package.json` returns `0`
    - `grep -c '"devDependencies"' package.json` returns `0`
    - `grep -c '"type":' package.json` returns `0`
    - `grep -c '"main":' package.json` returns `0`
    - `grep -c '"exports":' package.json` returns `0`
    - `node -e "const p = require('./package.json'); process.exit(p.engines.node === '>=22.0.0' ? 0 : 1)"` exits 0
    - `node -e "const p = require('./package.json'); process.exit(p.bin.oto === 'bin/install.js' ? 0 : 1)"` exits 0
    - `node -e "const p = require('./package.json'); process.exit(p.scripts.postinstall === 'node scripts/build-hooks.js' ? 0 : 1)"` exits 0
    - `grep -E '^\.oto-rebrand-out/$' .gitignore` matches a line
    - `grep -E '^reports/$' .gitignore` matches a line
    - `grep -E '^hooks/dist/$' .gitignore` matches a line
    - `grep -E '^node_modules/$' .gitignore` matches a line
    - `grep -E '^\*\.log$' .gitignore` matches a line
    - `grep -E '^/tmp-\*$' .gitignore` matches a line
    - `test -f hooks/.gitkeep` exits 0
    - `test -x bin/install.js` exits 0 (executable bit set)
    - `head -1 bin/install.js` equals `#!/usr/bin/env node`
    - `grep -l '#vX.Y.Z' README.md` matches (install command present)
  </acceptance_criteria>
  <threat_ref>T-2-04 (install-smoke writes to /tmp; stub bin/install.js does not access env or print secrets — see action #2 content)</threat_ref>
  <done>package.json + bin stub + hooks/.gitkeep + .gitignore + README.md committed; all three test files green via `node --test`.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Create scripts/build-hooks.js + scripts/install-smoke.cjs + their tests</name>
  <files>scripts/build-hooks.js, scripts/install-smoke.cjs, tests/phase-02-build-hooks.test.cjs</files>
  <read_first>
    - foundation-frameworks/get-shit-done-main/scripts/build-hooks.js (canonical vm-validated copy pattern; reproduce the validateSyntax function pattern verbatim, drop the GSD-specific HOOKS_TO_COPY list)
    - .planning/phases/02-rebrand-engine-distribution-skeleton/02-CONTEXT.md (D-12, D-08)
    - .planning/phases/02-rebrand-engine-distribution-skeleton/02-RESEARCH.md §"scripts/build-hooks.js stub design" + §"install-smoke design"
    - hooks/.gitkeep (must exist from Task 1; if not, halt)
    - package.json (must exist from Task 1, used by install-smoke to know expected version)
    - tests/phase-01-licenses.test.cjs (test file pattern)
  </read_first>
  <behavior>
    - Test 1 (build-hooks no-op): With `hooks/` containing only `.gitkeep`, `child_process.spawnSync(process.execPath, ['scripts/build-hooks.js'])` exits 0. stdout contains 'Build complete' (or similar success marker the action below specifies). `hooks/dist/` directory exists after the run.
    - Test 2 (build-hooks rejects bad syntax): create `hooks/__test_bad.js` with content `const x = 1; const x = 2;` (duplicate const), run the script — exits non-zero, stderr mentions 'SyntaxError' or the specific error. Cleanup: remove `hooks/__test_bad.js` and `hooks/dist/__test_bad.js` after assertion. Use `t.after()` for cleanup so failures still clean up.
    - Test 3 (build-hooks copies valid file): create `hooks/__test_good.js` with `console.log('ok');`, run script, assert exit 0 AND `hooks/dist/__test_good.js` exists with same content. Cleanup after.
    - (No automated test for install-smoke in this task — it requires a live remote and is gated by the manual checkpoint Task 3. The smoke script itself is a deliverable, not unit-tested.)
  </behavior>
  <action>
    1. **Write `scripts/build-hooks.js`** following the GSD pattern at `foundation-frameworks/get-shit-done-main/scripts/build-hooks.js` with these specific differences (see RESEARCH §"scripts/build-hooks.js stub design"):

       Header:
       ```js
       #!/usr/bin/env node
       'use strict';

       /**
        * oto build-hooks: vm-validates JS hook sources and copies to hooks/dist/.
        * Phase 2: hooks/ contains only .gitkeep; this is a verified no-op.
        * Phase 5 fills hooks/ with real source files.
        * Pattern derived from foundation-frameworks/get-shit-done-main/scripts/build-hooks.js.
        */

       const fs = require('node:fs');
       const path = require('node:path');
       const vm = require('node:vm');
       ```

       Constants:
       ```js
       const HOOKS_DIR = path.join(__dirname, '..', 'hooks');
       const DIST_DIR = path.join(HOOKS_DIR, 'dist');
       ```

       The `validateSyntax` function — reproduce from GSD verbatim (per `<interfaces>` block above):
       ```js
       function validateSyntax(filePath) {
         const content = fs.readFileSync(filePath, 'utf8');
         try {
           new vm.Script(content, { filename: path.basename(filePath) });
           return null;
         } catch (e) {
           if (e instanceof SyntaxError) return e.message;
           throw e;
         }
       }
       ```

       Main `build()`:
       - `if (!fs.existsSync(HOOKS_DIR)) { console.error('hooks/ missing'); process.exit(1); }` (defense; should never trigger because `.gitkeep` exists)
       - `fs.mkdirSync(DIST_DIR, { recursive: true })`
       - Read entries dynamically: `const entries = fs.readdirSync(HOOKS_DIR).filter(name => /\.(js|cjs|sh)$/.test(name));` (dynamic list, per RESEARCH §"build-hooks.js stub design" point 1 — "both work; static list is GSD's choice and is more explicit"; RESEARCH says either works under D-15. We pick dynamic for Phase 2 because static lists drift across phases.)
       - For each entry: skip if name is `.gitkeep` (already filtered by ext, defensive); for `.js`/`.cjs` run `validateSyntax`; on syntax error, log + set `hasErrors = true`, do NOT copy; otherwise copy `hooks/<name>` → `hooks/dist/<name>`.
       - For `.sh` files: skip syntax validation (vm doesn't validate bash); just copy.
       - Final: if `hasErrors`, `console.error('Build failed.'); process.exit(1)`; else `console.log('Build complete (' + count + ' hooks).'); process.exit(0)`.

       Call `build()` at the bottom (no `module.exports`; this is a CLI script, not a library).

    2. **Write `scripts/install-smoke.cjs`** per RESEARCH §"install-smoke design" §Algorithm. Use Node 22+ `util.parseArgs` for the `--ref <sha-or-tag>` flag (zero-deps per D-15):

       ```js
       #!/usr/bin/env node
       'use strict';

       const fs = require('node:fs');
       const os = require('node:os');
       const path = require('node:path');
       const { execSync, spawnSync } = require('node:child_process');
       const { parseArgs } = require('node:util');

       const { values } = parseArgs({
         options: { ref: { type: 'string' } },
         strict: true,
       });

       const ref = values.ref || execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
       const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-install-smoke-'));
       const expectedVersion = require(path.join(__dirname, '..', 'package.json')).version;

       try {
       const spec = `https://github.com/OTOJulian/oto-hybrid-framework/archive/${ref}.tar.gz`;
       console.log(`Smoke: installing ${spec} into ${tmpdir}...`);
       execSync(`npm install -g ${spec} --prefix ${tmpdir}`, {
           stdio: 'inherit',
         });

         const binPath = path.join(tmpdir, 'bin', 'oto');
         if (!fs.existsSync(binPath)) {
           console.error(`FAIL: bin not at ${binPath}`);
           process.exit(1);
         }
         const mode = fs.statSync(binPath).mode;
         if ((mode & 0o111) === 0) {
           console.error(`FAIL: bin not executable (mode ${mode.toString(8)})`);
           process.exit(1);
         }

         const out = spawnSync(binPath, [], { encoding: 'utf8' });
         if (out.status !== 0) {
           console.error(`FAIL: bin exit ${out.status}\nstderr:\n${out.stderr}`);
           process.exit(1);
         }
         if (!out.stdout.includes(`oto v${expectedVersion}`)) {
           console.error(`FAIL: stdout missing 'oto v${expectedVersion}'\nstdout:\n${out.stdout}`);
           process.exit(1);
         }

         console.log(`PASS: install-smoke for ref ${ref} (oto v${expectedVersion})`);
       } finally {
         fs.rmSync(tmpdir, { recursive: true, force: true });
       }
       ```

       Mark file executable: `chmod +x scripts/install-smoke.cjs` AND `git update-index --chmod=+x scripts/install-smoke.cjs`.

    3. **Write `tests/phase-02-build-hooks.test.cjs`** implementing Test 1–3 above. Use `node:test`'s `t.after()` for cleanup. Do NOT use a `describe` block; flat `test()` calls are the precedent in `tests/phase-01-*.test.cjs`. The bad-syntax fixture and good-syntax fixture must be created and removed within the test (`t.after`/`try/finally`); never leave files in `hooks/` after the test exits.

    Do NOT add any dependencies. Both scripts use only Node 22+ built-ins.
  </action>
  <verify>
    <automated>node scripts/build-hooks.js && node --test --test-concurrency=4 tests/phase-02-build-hooks.test.cjs</automated>
  </verify>
  <acceptance_criteria>
    - `node scripts/build-hooks.js` exits 0 AND stdout contains 'Build complete'
    - `test -d hooks/dist` exits 0 (the dist directory was created)
    - `node --test tests/phase-02-build-hooks.test.cjs` exits 0
    - `head -1 scripts/build-hooks.js` equals `#!/usr/bin/env node`
    - `head -1 scripts/install-smoke.cjs` equals `#!/usr/bin/env node`
    - `test -x scripts/install-smoke.cjs` exits 0
    - `grep -c "new vm.Script" scripts/build-hooks.js` returns at least 1
    - `grep -c "archive/\\${ref}.tar.gz" scripts/install-smoke.cjs` returns at least 1
    - `grep -c "parseArgs" scripts/install-smoke.cjs` returns at least 1 (zero-deps arg parsing)
    - `grep -c "require(" scripts/install-smoke.cjs | xargs -I{} test {} -ge 1` (uses CJS, not ESM)
    - `grep -cE "require\\(['\"](?!node:)" scripts/build-hooks.js scripts/install-smoke.cjs` returns 0 — every require uses `node:`-prefixed core modules OR a relative path (no third-party requires)
    - `hooks/dist/.gitkeep` is NOT present (the dist dir is freshly mkdir'd; no leftover files)
    - After running `node scripts/build-hooks.js`, `ls hooks/dist/` produces empty output (no .gitkeep gets copied because the filter excludes it)
  </acceptance_criteria>
  <threat_ref>T-2-03 (postinstall runs scripts/build-hooks.js; script only does fs.read + vm.Script + fs.copyFile of files we control; no shell-out, no network)</threat_ref>
  <done>build-hooks.js + install-smoke.cjs + their test file committed; build-hooks test green; running build-hooks.js produces hooks/dist/ and exits 0.</done>
</task>

<task type="checkpoint:human-action" gate="blocking">
  <name>Task 3: Create public GitHub repo + push branch + run live install-smoke</name>
  <what-required>
    Manual GitHub repo creation (per CONTEXT D-08 — locked upfront). Repo creation requires choosing visibility, name, description, and topics — one-time configuration the user wants to control by hand. After creation, Claude runs the install-smoke automation against the live remote to satisfy FND-04 SC#2 ("Repo is hosted on public GitHub and `npm install -g https://github.com/<owner>/oto-hybrid-framework/archive/<ref>.tar.gz` installs cleanly").
  </what-required>
  <how-to-verify>
    1. **User action**: Create `https://github.com/OTOJulian/oto-hybrid-framework` as a **public** repository. No description/topics required for Phase 2 (Phase 10 polishes those). Do not initialize with a README — this repo already has one locally.
    2. **User action**: Confirm to Claude that the repo exists.
    3. **Claude action** (after user confirmation): Run from repo root:
       ```bash
       git remote add origin https://github.com/OTOJulian/oto-hybrid-framework.git 2>/dev/null || git remote set-url origin https://github.com/OTOJulian/oto-hybrid-framework.git
       git push -u origin HEAD
       ```
    4. **Claude action**: Run the live install-smoke:
       ```bash
       node scripts/install-smoke.cjs --ref $(git rev-parse HEAD)
       ```
       Expected: exits 0, stdout contains `PASS: install-smoke for ref <sha> (oto v0.1.0-alpha.1)`.
    5. **Claude action**: If the smoke fails, report the failure mode (npm install error, bin missing, version string mismatch, etc.) and STOP — do not continue to plan 02-02.
  </how-to-verify>
  <resume-signal>Type "repo-created" once the GitHub repo exists, or "issue: <description>" if blocked.</resume-signal>
  <acceptance_criteria>
    - User confirms `https://github.com/OTOJulian/oto-hybrid-framework` is public and accessible
    - `git ls-remote https://github.com/OTOJulian/oto-hybrid-framework.git HEAD` succeeds (resolves a SHA)
    - `node scripts/install-smoke.cjs --ref $(git rev-parse HEAD)` exits 0
    - smoke stdout contains the literal `PASS: install-smoke for ref` AND `oto v0.1.0-alpha.1`
  </acceptance_criteria>
  <threat_ref>T-2-04 (install-smoke writes only to a fresh mkdtemp dir; cleaned up via fs.rmSync in `finally`; bin/install.js does not access env vars)</threat_ref>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| `npm install -g https://github.com/.../archive/<ref>.tar.gz` → local machine | Public-internet code (this repo) executed with full user perms via `postinstall` lifecycle |
| install-smoke script → temp dir | Writes only to `mkdtempSync` path under `os.tmpdir()`; cleaned in `finally` |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-2-03 | Tampering / Elevation | `postinstall` lifecycle running `scripts/build-hooks.js` on every install | mitigate | Script only does `fs.readFileSync` + `new vm.Script` (parse-only, no execution) + `fs.copyFile` over files in our own repo; zero shell-out; zero network calls. Reviewed in Task 2 action. |
| T-2-04 | Information Disclosure | `scripts/install-smoke.cjs` writes to `/tmp` and exec'd `oto` bin | mitigate | Bin stub only prints version + Phase-3 hint; never accesses `process.env`. Smoke uses `mkdtempSync` (random suffix) and `fs.rmSync({force:true})` in `finally`. Reviewed in Task 2 action. |
| T-2-05 | Denial of Service | Malicious `hooks/*.js` causing infinite parse | accept | `vm.Script` is a parse step; runaway parsers in V8 are not a known attack surface for syntactically valid input. Phase 2 hooks/ is empty; Phase 5 source review covers content. |

All threats LOW or MEDIUM; none HIGH/CRITICAL → no blocker per ASVS L1 `block_on: high`.
</threat_model>

<verification>
- `node --test --test-concurrency=4 tests/phase-02-package-json.test.cjs tests/phase-02-gitignore.test.cjs tests/phase-02-bin-stub.test.cjs tests/phase-02-build-hooks.test.cjs` exits 0
- `node bin/install.js` exits 0 and prints `oto v0.1.0-alpha.1`
- `node scripts/build-hooks.js` exits 0 with empty hooks/
- `node scripts/install-smoke.cjs --ref $(git rev-parse HEAD)` exits 0 against the live remote
- ROADMAP Phase 2 SC#1 satisfied (package.json shape) — verified by tests/phase-02-package-json.test.cjs
- ROADMAP Phase 2 SC#2 satisfied (`npm install -g https://github.com/.../archive/<ref>.tar.gz` installs cleanly) — verified by Task 3
</verification>

<success_criteria>
- All four test files green via `node --test`
- `bin/install.js` invokable post-install (verified in install-smoke)
- `scripts/build-hooks.js` is a verified no-op when hooks/ contains only `.gitkeep`
- `scripts/build-hooks.js` rejects syntactically invalid hooks (verified by Test 2 in Task 2)
- Public GitHub repo exists at `OTOJulian/oto-hybrid-framework`, branch pushed
- Live install-smoke passes against `HEAD` sha
- All artifacts in `<must_haves>` exist on disk and match their `provides` description
- `02-VALIDATION.md` per-task map updated with rows for Tasks 1–3
- ROADMAP Phase 2 SC#1 (package.json shape) and SC#2 (GitHub-installable) checked off
</success_criteria>

<output>
After completion, create `.planning/phases/02-rebrand-engine-distribution-skeleton/02-01-SUMMARY.md`
</output>
