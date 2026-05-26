---
phase: 02-rebrand-engine-distribution-skeleton
plan: 03
subsystem: rebrand-engine
tags: [rebrand, cli, dry-run, roundtrip, coverage, node-test]
requires:
  - phase: 02-01-distribution-skeleton
    provides: npm package scripts and GitHub install smoke
  - phase: 02-02-rebrand-rules-and-walker
    provides: rule modules, walker, schema validator, fixtures
provides:
  - Rebrand engine orchestrator
  - Coverage manifest builder and assertions
  - Markdown/JSON report generation
  - CLI entrypoint and npm scripts
  - Real-tree dry-run, apply, and round-trip verification
affects: [phase-03-installer, phase-04-core-port, phase-09-upstream-sync, phase-10-ci-release]
tech-stack:
  added: []
  patterns: [CommonJS CLI, util.parseArgs, node:test integration tests, os.tmpdir roundtrip isolation]
key-files:
  created:
    - scripts/rebrand/lib/engine.cjs
    - scripts/rebrand/lib/engine.js
    - scripts/rebrand/lib/manifest.cjs
    - scripts/rebrand/lib/manifest.js
    - scripts/rebrand/lib/report.cjs
    - scripts/rebrand/lib/report.js
    - scripts/rebrand.cjs
    - tests/phase-02-engine-classify.test.cjs
    - tests/phase-02-engine-no-source-mutation.test.cjs
    - tests/phase-02-coverage-manifest.test.cjs
    - tests/phase-02-allowlist.test.cjs
    - tests/phase-02-owner-override.test.cjs
    - tests/phase-02-summary-line.test.cjs
    - tests/phase-02-dryrun-report.test.cjs
    - tests/phase-02-roundtrip.test.cjs
    - tests/phase-02-roundtrip-isolation.test.cjs
  modified:
    - package.json
    - tests/phase-02-package-json.test.cjs
    - scripts/rebrand/lib/walker.cjs
    - scripts/rebrand/lib/rules/url.cjs
    - .planning/REQUIREMENTS.md
    - .planning/ROADMAP.md
    - .planning/STATE.md
    - .planning/phases/02-rebrand-engine-distribution-skeleton/02-VALIDATION.md
key-decisions:
  - "npm run rebrand now invokes apply mode with --force; CLI default remains dry-run."
  - "Round-trip mode writes only to os.tmpdir() and never touches .oto-rebrand-out/."
  - "Engine includes a final coverage cleanup pass for real upstream camelCase/snake-ish identifier shapes not represented in isolated rule tests."
patterns-established:
  - "Engine validates rename-map.json at startup and returns exit code 4 for schema failures."
  - "Allowlisted walker entries are copied byte-for-byte to output without rule passes."
  - "Coverage manifests strip allowlisted literals and regex matches before post-rebrand zero-count assertions."
requirements-completed: [REB-04, REB-05, REB-06]
duration: 15 min
completed: 2026-04-28
---

# Phase 02 Plan 03: Rebrand Engine and CLI Summary

**Integrated rebrand engine, coverage manifest, CLI, npm scripts, and real-tree verification**

## Performance

- **Duration:** 15 min
- **Completed:** 2026-04-28
- **Tasks:** 2
- **Full suite:** 111 tests passed via `npm test`

## Accomplishments

- Added `scripts/rebrand/lib/engine.cjs` with dry-run, apply, and verify-roundtrip modes.
- Added `manifest.cjs` for pre/post token coverage and zero-outside-allowlist assertions.
- Added `report.cjs` for dry-run and coverage markdown report rendering.
- Added executable `scripts/rebrand.cjs` using Node's built-in `util.parseArgs`.
- Wired npm scripts so `rebrand:dry-run`, `rebrand`, and `rebrand:roundtrip` all execute real-tree engine modes.
- Verified real-tree dry-run writes `reports/rebrand-dryrun.json` with `unclassified_total: 0`.
- Verified real-tree apply writes `.oto-rebrand-out/` out-of-place and preserves source-tree hashes.
- Verified real-tree round-trip applies target -> temp A -> temp B and produces byte-identical output.

## Task Commits

1. **Task 1: engine + manifest + reports + integration tests** - `8c34acd` (feat)
2. **Task 2: CLI + npm scripts + roundtrip tests** - `007fe09` (feat)
3. **Verification fix: explicit npm test glob** - `52ce004` (fix)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Nested LICENSE files were not path-allowlisted**
- **Found during:** Task 1 allowlist integration
- **Issue:** `LICENSE` allowlist entries matched only root-level `LICENSE`, but the real upstream source has nested `get-shit-done-main/LICENSE` and `superpowers-main/LICENSE`.
- **Fix:** Walker path allowlist basenames now match at any path depth.
- **Verification:** Allowlist tests confirm nested LICENSE byte identity after apply.
- **Committed in:** `8c34acd`

**2. [Rule 3 - Blocking] Real upstream contained camelCase/snake-ish identity residues**
- **Found during:** Real-tree apply coverage assertion
- **Issue:** The isolated rule modules correctly avoided substring collisions, but real upstream code included internal identifiers such as `gsdBlock`, `_gsdLibDir`, `GSDTools`, and `usingSuperpowers`.
- **Fix:** Engine apply mode includes a final conservative coverage cleanup pass after typed rules and before unmasking protected URLs.
- **Verification:** `npm run rebrand` exits 0 and post-coverage assertion passes.
- **Committed in:** `8c34acd`

**3. [Rule 3 - Blocking] `node --test tests/` failed on Node 22 in this repo**
- **Found during:** Full-suite verification
- **Issue:** Node tried to load `tests` as a module instead of discovering test files.
- **Fix:** `npm test` now uses `node --test --test-concurrency=4 tests/*.test.cjs`.
- **Verification:** `npm test` passed all 111 tests.
- **Committed in:** `52ce004`

## Self-Check: PASSED

- `npm test` passed: 111 tests, 0 failures.
- `npm run rebrand:dry-run` passed and wrote `reports/rebrand-dryrun.json` with `unclassified_total: 0`.
- `npm run rebrand` passed and wrote `.oto-rebrand-out/` with post-coverage zero outside allowlist.
- `npm run rebrand:roundtrip` passed with byte-identical round-trip output.
- `diff foundation-frameworks/get-shit-done-main/LICENSE .oto-rebrand-out/get-shit-done-main/LICENSE` passed.
- `scripts/rebrand.cjs` is executable and starts with `#!/usr/bin/env node`.

## Next Phase Readiness

Phase 3 can now fork the installer against a real package skeleton and a working rebrand output tree. The important handoff artifacts are `.oto-rebrand-out/`, `reports/rebrand-dryrun.json`, and the Phase 2 test suite.

---
*Phase: 02-rebrand-engine-distribution-skeleton*
*Completed: 2026-04-28*
