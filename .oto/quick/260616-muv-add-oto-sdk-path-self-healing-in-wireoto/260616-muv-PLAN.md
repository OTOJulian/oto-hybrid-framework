---
phase: quick
plan: 260616-muv
type: execute
wave: 1
depends_on: []
files_modified:
  - bin/lib/install.cjs
  - bin/lib/doctor.cjs
  - bin/install.js
  - tests/sdk-wiring.test.cjs
  - tests/260616-muv-doctor.test.cjs
autonomous: true
requirements:
  - muv-self-heal
  - muv-doctor
must_haves:
  truths:
    - "A dangling managed symlink in a HOME-owned PATH dir is replaced (not skipped) by trySelfLinkOtoSdk"
    - "`oto doctor` reports HEALTHY when oto-sdk resolves correctly to the current repo"
    - "`oto doctor` reports STALE when the symlink is dangling or points to a different repo path"
    - "`oto doctor` reports MISSING when oto-sdk is not found on PATH"
    - "`oto doctor` reports SHADOWED when a non-managed oto-sdk appears first on PATH"
    - "`oto doctor` verifies sdk/dist/cli.js exists"
    - "All new logic is covered by node:test cases in tests/"
  artifacts:
    - path: "bin/lib/install.cjs"
      provides: "isManagedOtoSdkTarget with dangling-managed detection; findOtoSdkOnPath exported"
    - path: "bin/lib/doctor.cjs"
      provides: "checkOtoSdk() diagnostic function + main() for CLI dispatch"
    - path: "bin/install.js"
      provides: "oto doctor argv branch + HELP_TEXT entry"
    - path: "tests/sdk-wiring.test.cjs"
      provides: "New test: trySelfLinkOtoSdk heals dangling managed symlink"
    - path: "tests/260616-muv-doctor.test.cjs"
      provides: "Tests for doctor check verdicts: healthy, stale, missing, shadowed"
  key_links:
    - from: "bin/install.js"
      to: "bin/lib/doctor.cjs"
      via: "argv[0] === 'doctor' branch calling doctor.main()"
    - from: "bin/lib/doctor.cjs"
      to: "bin/lib/install.cjs"
      via: "require('./install.cjs') reusing findOtoSdkOnPath, isManagedOtoSdkTarget"
    - from: "bin/lib/install.cjs isManagedOtoSdkTarget"
      to: "dangling symlink detection"
      via: "readlinkSync when realpathSync throws, check basename === oto-sdk.js"
---

<objective>
Fix the dangling-symlink self-heal gap in trySelfLinkOtoSdk and add an `oto doctor` diagnostic subcommand so a relocated repo is self-correcting on next install and user-diagnosable at any time.

Purpose: When the oto repo is moved on disk the `oto-sdk` symlink dangles. Currently isManagedOtoSdkTarget returns false for dangling links (realpathSync throws), so trySelfLinkOtoSdk skips the candidate directory and the link is never healed. The fix makes the function recognize a dangling symlink whose raw readlink target has basename `oto-sdk.js` as a stale-managed link that should be replaced. The doctor subcommand gives the user a one-shot check of oto-sdk PATH health with actionable remediation text.

Output:
- bin/lib/install.cjs — patched isManagedOtoSdkTarget + new exports
- bin/lib/doctor.cjs — new diagnostic module
- bin/install.js — argv dispatch + HELP_TEXT line for `oto doctor`
- tests/sdk-wiring.test.cjs — new test case for dangling managed link healing
- tests/260616-muv-doctor.test.cjs — doctor verdict tests
</objective>

<execution_context>
@~/.claude/oto/workflows/execute-plan.md
@~/.claude/oto/templates/summary.md
</execution_context>

<context>
@.oto/STATE.md

<interfaces>
<!-- Key contracts the executor needs. Extracted from bin/lib/install.cjs. -->

```javascript
// Existing exports (module.exports at line 472-480):
module.exports = {
  installRuntime,
  uninstallRuntime,
  installAll,
  uninstallAll,
  isOtoSdkOnPath,
  trySelfLinkOtoSdk,
  wireOtoSdk,
  // isManagedOtoSdkTarget and findOtoSdkOnPath are NOT currently exported
};

// isManagedOtoSdkTarget(target, shimSrc) → boolean
//   target: absolute path to the oto-sdk link/file in a PATH dir
//   shimSrc: absolute path to bin/oto-sdk.js in the current repo
//   Returns true if target is an oto-managed shim (symlink to shimSrc, real copy of shimSrc,
//   or wrapper file containing require(shimSrc)).
//   BUG: when target is a dangling symlink, realpathSync throws → catch returns false → gap.

// findOtoSdkOnPath(expectedShim?) → { path, matchesCurrentInstall? } | null
//   Scans process.env.PATH for an executable oto-sdk file.
//   Uses statSync (follows symlinks) so dangling links are silently skipped (correct behavior here).

// trySelfLinkOtoSdk(shimSrc) → string | null
//   POSIX only (returns null on win32).
//   Iterates HOME-owned PATH candidates. For each, lstatSync(target):
//     if target exists AND !isManagedOtoSdkTarget(target, shimSrc) → continue (skip non-managed)
//     if target exists AND isManagedOtoSdkTarget returns true → unlink then symlink
//     if target doesn't exist → symlink directly
//   BUG: dangling managed link → isManagedOtoSdkTarget returns false → loop continues without healing.
```

<!-- bin/install.js subcommand dispatch pattern (lines 63-79): -->
```javascript
if (argv[0] === 'sync') {
  const { runSync } = require('./lib/sync-cli.cjs');
  const code = await runSync(argv.slice(1));
  process.exit(code);
}
if (argv[0] === 'migrate') {
  const migrate = require('../oto/bin/lib/migrate.cjs');
  const code = await migrate.main(argv.slice(1), process.cwd());
  process.exit(code);
}
if (argv[0] === 'log') {
  const log = require('../oto/bin/lib/log.cjs');
  const code = await log.main(argv.slice(1), process.cwd());
  process.exit(code);
}
// ADD: if (argv[0] === 'doctor') { ... process.exit(code); }
```

<!-- HELP_TEXT usage entry to add (line ~39): -->
// oto doctor                               check oto-sdk PATH health
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Fix isManagedOtoSdkTarget dangling-symlink gap and export helpers</name>
  <files>bin/lib/install.cjs, tests/sdk-wiring.test.cjs</files>
  <behavior>
    - Test: dangling symlink with basename oto-sdk.js → isManagedOtoSdkTarget returns true (stale-managed)
    - Test: dangling symlink to /some/other/path/unrelated → isManagedOtoSdkTarget returns false (unmanaged)
    - Test: trySelfLinkOtoSdk heals a dangling managed symlink (unlinks it and creates a new link to shimSrc)
    - Test: trySelfLinkOtoSdk still skips a dangling unmanaged symlink
  </behavior>
  <action>
In bin/lib/install.cjs, patch isManagedOtoSdkTarget to handle the dangling-symlink case before the existing logic. After the opening try/lstatSync call:

```javascript
function isManagedOtoSdkTarget(target, shimSrc) {
  try {
    const stat = fs.lstatSync(target);
    if (stat.isSymbolicLink()) {
      // FIRST: try resolved comparison (works for live links).
      try {
        return fs.realpathSync(target) === fs.realpathSync(shimSrc);
      } catch {
        // realpathSync threw — likely a dangling link. Fall through to raw readlink check.
      }
      // SECOND: for dangling symlinks, inspect the raw link target textually.
      // A dangling managed link has basename 'oto-sdk.js' (the shim filename).
      // This covers the "repo was moved" case without false-positives on user-owned links.
      try {
        const rawTarget = fs.readlinkSync(target);
        return path.basename(rawTarget) === 'oto-sdk.js';
      } catch {
        return false;
      }
    }

    if (!stat.isFile()) return false;

    try {
      if (fs.realpathSync(target) === fs.realpathSync(shimSrc)) return true;
    } catch {
      // Fall through to wrapper-content detection.
    }

    const contents = fs.readFileSync(target, 'utf8');
    return contents.includes(`require(${JSON.stringify(shimSrc)})`);
  } catch {
    return false;
  }
}
```

Also add isManagedOtoSdkTarget and findOtoSdkOnPath to module.exports (required by doctor.cjs):

```javascript
module.exports = {
  installRuntime,
  uninstallRuntime,
  installAll,
  uninstallAll,
  isOtoSdkOnPath,
  trySelfLinkOtoSdk,
  wireOtoSdk,
  isManagedOtoSdkTarget,
  findOtoSdkOnPath,
};
```

In tests/sdk-wiring.test.cjs, update the require to pull in the newly exported helpers and add these new test cases after the existing ones:

1. "isManagedOtoSdkTarget: dangling symlink to oto-sdk.js basename returns true" — create a tempdir, write a real shimSrc file, then create a symlink at target pointing at a non-existent path whose basename is oto-sdk.js; assert isManagedOtoSdkTarget(target, shimSrc) === true.

2. "isManagedOtoSdkTarget: dangling symlink to unrelated basename returns false" — same setup but link points at /nonexistent/path/some-other.js; assert false.

3. "trySelfLinkOtoSdk: heals a dangling managed symlink (basename oto-sdk.js)" — create home+binDir, create shimSrc file, create a symlink in binDir named 'oto-sdk' pointing at a non-existent oldRepo/bin/oto-sdk.js path; call trySelfLinkOtoSdk(shimSrc); assert returned path is path.join(binDir, 'oto-sdk'); assert the link now resolves to shimSrc (readlinkSync or realpathSync).

Mirror the existing test style: POSIX-only via `{ skip: process.platform === 'win32' }`, tempdir via makeTempDir(), withHomeAndPath() helper.
  </action>
  <verify>
    <automated>node --test /Users/Julian/ONE\ to\ ONE/Code/OTO\ Hybrid\ Framework/oto-hybrid-framework-main/tests/sdk-wiring.test.cjs 2>&amp;1</automated>
  </verify>
  <done>All sdk-wiring.test.cjs tests pass including the 3 new cases. isManagedOtoSdkTarget and findOtoSdkOnPath appear in module.exports.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Create bin/lib/doctor.cjs and wire oto doctor dispatch</name>
  <files>bin/lib/doctor.cjs, bin/install.js, tests/260616-muv-doctor.test.cjs</files>
  <behavior>
    - Test: checkOtoSdk returns { verdict: 'missing' } when oto-sdk not on PATH
    - Test: checkOtoSdk returns { verdict: 'stale', reason: 'dangling' } when PATH entry is a dangling symlink to oto-sdk.js
    - Test: checkOtoSdk returns { verdict: 'stale', reason: 'wrong-repo' } when symlink points at a different repo's oto-sdk.js
    - Test: checkOtoSdk returns { verdict: 'shadowed' } when a non-managed oto-sdk appears first on PATH
    - Test: checkOtoSdk returns { verdict: 'healthy' } when oto-sdk resolves to current shimSrc and sdkCliPath exists
    - Test: checkOtoSdk returns { verdict: 'healthy', sdkDistMissing: true } when oto-sdk is correct but sdk/dist/cli.js is absent
    - Test: main() exits 0 on healthy, exits 1 on non-healthy verdict
  </behavior>
  <action>
Create bin/lib/doctor.cjs as a new CJS module:

```javascript
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { findOtoSdkOnPath, isManagedOtoSdkTarget } = require('./install.cjs');

/**
 * checkOtoSdk(opts) → DoctorResult
 *
 * opts.repoRoot  — absolute path to the oto repo (default: __dirname/../..)
 *
 * DoctorResult:
 *   verdict: 'healthy' | 'missing' | 'stale' | 'shadowed'
 *   reason?: 'dangling' | 'wrong-repo'   (only when verdict === 'stale')
 *   sdkDistMissing?: boolean              (only when verdict === 'healthy')
 *   path?: string                         (PATH-resolved oto-sdk path, when found)
 *   shimSrc: string                       (expected shim path for this repo)
 *   sdkCliPath: string                    (expected sdk/dist/cli.js path)
 */
function checkOtoSdk(opts = {}) {
  const repoRoot = opts.repoRoot || path.join(__dirname, '..', '..');
  const shimSrc = path.join(repoRoot, 'bin', 'oto-sdk.js');
  const sdkCliPath = path.join(repoRoot, 'sdk', 'dist', 'cli.js');

  const found = findOtoSdkOnPath(shimSrc);

  if (!found) {
    return { verdict: 'missing', shimSrc, sdkCliPath };
  }

  // findOtoSdkOnPath uses statSync (follows links), so found.path is a live file.
  // matchesCurrentInstall === true means isManagedOtoSdkTarget confirmed it's ours.
  if (found.matchesCurrentInstall === true) {
    const sdkDistMissing = !fs.existsSync(sdkCliPath);
    return { verdict: 'healthy', path: found.path, shimSrc, sdkCliPath, sdkDistMissing };
  }

  // Not matching current install. Distinguish shadowed vs stale.
  // Check if the found path is any kind of managed oto-sdk shim.
  // We can't call isManagedOtoSdkTarget directly here because the link may be dangling
  // (statSync in findOtoSdkOnPath succeeded, so it's a live file — but it might be a
  // regular file pointing at a *different* repo, or a symlink to a different repo).
  //
  // Strategy:
  //   - If lstatSync says it's a symlink: check readlink basename.
  //     - basename === 'oto-sdk.js' → stale (points at a different repo's shim)
  //     - otherwise → shadowed (unrelated executable)
  //   - If it's a regular file: check wrapper content heuristic.
  //     - contains 'oto-sdk.js' in a require() → stale wrong-repo
  //     - otherwise → shadowed

  try {
    const lst = fs.lstatSync(found.path);
    if (lst.isSymbolicLink()) {
      const raw = fs.readlinkSync(found.path);
      if (path.basename(raw) === 'oto-sdk.js') {
        return { verdict: 'stale', reason: 'wrong-repo', path: found.path, shimSrc, sdkCliPath };
      }
      return { verdict: 'shadowed', path: found.path, shimSrc, sdkCliPath };
    }
    // Regular file: look for oto wrapper content.
    const contents = fs.readFileSync(found.path, 'utf8');
    if (contents.includes('oto-sdk.js')) {
      return { verdict: 'stale', reason: 'wrong-repo', path: found.path, shimSrc, sdkCliPath };
    }
    return { verdict: 'shadowed', path: found.path, shimSrc, sdkCliPath };
  } catch {
    // Defensive fallback.
    return { verdict: 'shadowed', path: found.path, shimSrc, sdkCliPath };
  }
}

function printResult(result) {
  const { verdict, reason, path: sdkPath, shimSrc, sdkCliPath, sdkDistMissing } = result;

  if (verdict === 'healthy') {
    process.stdout.write(`oto doctor: oto-sdk OK\n`);
    process.stdout.write(`  PATH entry : ${sdkPath}\n`);
    process.stdout.write(`  shim source: ${shimSrc}\n`);
    if (sdkDistMissing) {
      process.stderr.write(`  WARNING: sdk/dist/cli.js not found at ${sdkCliPath}\n`);
      process.stderr.write(`  Run: cd sdk && npm install && npm run build\n`);
    } else {
      process.stdout.write(`  sdk dist   : ${sdkCliPath} (present)\n`);
    }
    return;
  }

  if (verdict === 'missing') {
    process.stderr.write(`oto doctor: MISSING — oto-sdk not found on PATH\n`);
    process.stderr.write(`  Expected shim: ${shimSrc}\n`);
    process.stderr.write(`  Fix: oto install --claude  (re-runs wireOtoSdk to create the link)\n`);
    return;
  }

  if (verdict === 'stale') {
    const detail = reason === 'dangling' ? 'dangling symlink' : 'points at a different repo';
    process.stderr.write(`oto doctor: STALE — oto-sdk is ${detail}\n`);
    process.stderr.write(`  Found at   : ${sdkPath}\n`);
    process.stderr.write(`  Expected   : ${shimSrc}\n`);
    process.stderr.write(`  Fix: oto install --claude  (re-runs wireOtoSdk to recreate the link)\n`);
    return;
  }

  if (verdict === 'shadowed') {
    process.stderr.write(`oto doctor: SHADOWED — a non-oto oto-sdk appears first on PATH\n`);
    process.stderr.write(`  Shadowing  : ${sdkPath}\n`);
    process.stderr.write(`  Expected   : ${shimSrc}\n`);
    process.stderr.write(`  Fix: move ${path.dirname(shimSrc)} earlier on PATH, or remove the shadowing executable\n`);
    return;
  }
}

async function main(argv, repoRoot) {
  if (process.platform === 'win32') {
    process.stdout.write('oto doctor: PATH self-link check is not supported on Windows.\n');
    return 0;
  }
  const result = checkOtoSdk({ repoRoot: repoRoot || path.join(__dirname, '..', '..') });
  printResult(result);
  return result.verdict === 'healthy' ? 0 : 1;
}

module.exports = { checkOtoSdk, main };
```

In bin/install.js, add the doctor dispatch block immediately after the `log` branch (before the `parseCliArgs` call):

```javascript
if (argv[0] === 'doctor') {
  const doctor = require('./lib/doctor.cjs');
  const code = await doctor.main(argv.slice(1), path.join(__dirname, '..'));
  process.exit(code);
}
```

In bin/install.js, add to HELP_TEXT under the `oto log` line:

```
  oto doctor                              check oto-sdk PATH health and shim integrity
```

Create tests/260616-muv-doctor.test.cjs following the node:test/.test.cjs style from sdk-wiring.test.cjs. Import `{ checkOtoSdk }` from `../bin/lib/doctor.cjs`. Use the same makeTempDir() + withPath() + withHomeAndPath() helpers (inline or import from a shared location — inline is fine since the helpers are small). Write one test per verdict:

1. "doctor: healthy verdict when oto-sdk symlink matches current repo and sdk/dist/cli.js exists" — full tmpdir with shimSrc, sdkCliPath, symlink in binDir pointing at shimSrc; withHomeAndPath → checkOtoSdk; assert verdict === 'healthy', sdkDistMissing falsy.

2. "doctor: healthy with sdkDistMissing when sdk/dist/cli.js absent" — same but omit sdkCliPath file; assert verdict === 'healthy', sdkDistMissing === true.

3. "doctor: missing verdict when no oto-sdk on PATH" — empty binDir; assert verdict === 'missing'.

4. "doctor: stale/wrong-repo verdict when symlink points at different repo" — create two repoDirs (repoA, repoB), symlink in binDir points at repoA/bin/oto-sdk.js, call checkOtoSdk with repoRoot=repoB; assert verdict === 'stale', reason === 'wrong-repo'.

5. "doctor: shadowed verdict when non-oto executable precedes managed link" — binDir has an unmanaged executable named 'oto-sdk' (content '#!/bin/sh'); assert verdict === 'shadowed'.

All POSIX tests: `{ skip: process.platform === 'win32' }`.
  </action>
  <verify>
    <automated>node --test /Users/Julian/ONE\ to\ ONE/Code/OTO\ Hybrid\ Framework/oto-hybrid-framework-main/tests/260616-muv-doctor.test.cjs 2>&amp;1 && node --test /Users/Julian/ONE\ to\ ONE/Code/OTO\ Hybrid\ Framework/oto-hybrid-framework-main/tests/sdk-wiring.test.cjs 2>&amp;1</automated>
  </verify>
  <done>Both test files pass. `oto doctor` dispatches correctly from bin/install.js. doctor.cjs exports checkOtoSdk and main. HELP_TEXT includes the doctor entry.</done>
</task>

<task type="auto">
  <name>Task 3: Full test suite green check</name>
  <files></files>
  <action>
Run the full test suite to confirm no regressions from the install.cjs export additions and new module wiring:

```bash
npm test
```

If failures appear, fix them before marking this task done. Expected result: all prior passing tests still pass plus the new tests added in Tasks 1 and 2.
  </action>
  <verify>
    <automated>cd /Users/Julian/ONE\ to\ ONE/Code/OTO\ Hybrid\ Framework/oto-hybrid-framework-main && npm test 2>&amp;1 | tail -20</automated>
  </verify>
  <done>npm test exits 0. Pass count is prior count + new tests (≥ 3 from sdk-wiring + ≥ 5 from 260616-muv-doctor). Zero failures.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| filesystem → doctor.cjs | Doctor reads PATH entries and resolves symlinks — all inputs are local filesystem paths owned by the current user |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-muv-01 | Tampering | isManagedOtoSdkTarget dangling-link detection | accept | Detection is basename-only (oto-sdk.js); an attacker who can write to a HOME-owned PATH dir can already execute arbitrary code — the basename check is heuristic, not a security gate |
| T-muv-02 | Information Disclosure | doctor.cjs printResult | accept | Prints filesystem paths to stdout/stderr; these are paths on the user's own machine and are non-sensitive |
| T-muv-03 | Elevation of Privilege | trySelfLinkOtoSdk creating symlinks in PATH dirs | accept | Symlinks are created only in HOME-owned dirs (path.startsWith(home + sep) guard already present); no escalation possible |
</threat_model>

<verification>
After both tasks are complete:

1. `node --test tests/sdk-wiring.test.cjs` — all tests pass including 3 new dangling-managed cases
2. `node --test tests/260616-muv-doctor.test.cjs` — all 5 verdict tests pass
3. `npm test` — zero failures, count increased by new tests
4. Manual spot-check: `grep 'isManagedOtoSdkTarget\|findOtoSdkOnPath' bin/lib/install.cjs` — both names appear in module.exports block
5. Manual spot-check: `grep 'doctor' bin/install.js` — dispatch block and HELP_TEXT entry both present
</verification>

<success_criteria>
- A dangling managed symlink (basename oto-sdk.js, pointing at a non-existent old path) is healed by trySelfLinkOtoSdk on next `oto install` — not left in place
- `oto doctor` exits 0 for a healthy install, exits 1 for missing/stale/shadowed, with a clear one-line diagnosis and an exact remediation command
- `npm test` passes with zero regressions
- No new runtime dependencies introduced; no TypeScript; all new files are .cjs (doctor) or .js (existing shim)
</success_criteria>

<output>
After completion, create `.oto/quick/260616-muv-add-oto-sdk-path-self-healing-in-wireoto/260616-muv-SUMMARY.md` using the summary template.
</output>
