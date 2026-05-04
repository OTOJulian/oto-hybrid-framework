---
phase: 10-tests-ci-docs-v0-1-0-release
plan: 02
subsystem: ci-docs-release-surface
tags: [github-actions, docs, readme, rebrand-snapshots, package-curation]

requires:
  - phase: 10-tests-ci-docs-v0-1-0-release
    plan: 01
    provides: Phase 10 deferred test surface and command index generator
provides:
  - GitHub Actions test, install-smoke, and release workflows
  - Public README and upstream sync / rebrand engine documentation
  - Live rebrand projection snapshots for all representative fixtures
  - Single-bin package shape for v0.1.0
affects: [ci, release, docs, package-json, rebrand-snapshot-tests]

tech-stack:
  added: []
  patterns:
    - GitHub Actions workflows pinned to 40-character action SHAs
    - node:test snapshot assertions over deterministic rebrand projections
    - docs authored as repo markdown, with README as public entrypoint

key-files:
  created:
    - .github/workflows/test.yml
    - .github/workflows/install-smoke.yml
    - .github/workflows/release.yml
    - docs/upstream-sync.md
    - docs/rebrand-engine.md
    - tests/regen-rebrand-snapshots.cjs
    - tests/fixtures/phase-10/rebrand-snapshots/command-vs-skill_ns.json
    - tests/fixtures/phase-10/rebrand-snapshots/env-var-edge.json
    - tests/fixtures/phase-10/rebrand-snapshots/hook-version-token.json
    - tests/fixtures/phase-10/rebrand-snapshots/identifier-edge.json
    - tests/fixtures/phase-10/rebrand-snapshots/license-block.json
    - tests/fixtures/phase-10/rebrand-snapshots/multi-rule-line.json
    - tests/fixtures/phase-10/rebrand-snapshots/package-fixture.json
    - tests/fixtures/phase-10/rebrand-snapshots/path-edge.json
    - tests/fixtures/phase-10/rebrand-snapshots/url-attribution.json
  modified:
    - README.md
    - package.json
    - tests/phase-02-package-json.test.cjs
    - tests/phase-04-mr01-install-smoke.test.cjs
    - tests/phase-10-rebrand-snapshot.test.cjs
  deleted:
    - bin/oto-sdk.js

key-decisions:
  - "Keep the package single-bin for v0.1.0: `oto` remains the only installed binary and `oto-sdk` stays deferred."
  - "Use the repo's actual `npm test` / `node --test` runner because `scripts/run-tests.cjs` does not exist in this repo."
  - "Use `path.parse(fname).name` for snapshot names so fixture filenames containing dots cannot collide."

patterns-established:
  - "Workflow shape, SHA pin, README, docs, command-index, and rebrand snapshot tests now run live with no TODOs."
  - "Rebrand snapshot regen and assertion code share the same D-10-07 projection filename contract."
  - "Release CI is present but the actual tag, push, and clean install UAT remain Plan 10-03."

requirements-completed: [CI-01, CI-02, CI-03, CI-04, CI-05, CI-08, CI-09, CI-10, DOC-01, DOC-02, DOC-03, DOC-04, DOC-06]

duration: operator-recovered
completed: 2026-05-04
---

# Phase 10 Plan 02: CI and Docs Surface Summary

**GitHub Actions, public docs, package curation, and live rebrand snapshots are now in place for the v0.1.0 release gate.**

## Performance

- **Duration:** operator-recovered after executor stall
- **Completed:** 2026-05-04T20:49:07Z
- **Tasks:** 3 planned tasks + 2 recovery fixes
- **Files modified:** 22 tracked files

## Accomplishments

- Added `.github/workflows/test.yml`, `.github/workflows/install-smoke.yml`, and `.github/workflows/release.yml` with pinned external actions and reusable release gates.
- Rewrote `README.md` for the public v0.1.0 entrypoint and added `docs/upstream-sync.md` plus `docs/rebrand-engine.md`.
- Dropped the deferred `bin/oto-sdk.js` binary and aligned package/install-smoke tests with the single-bin v0.1.0 shape.
- Captured nine golden rebrand projection snapshots and added `tests/regen-rebrand-snapshots.cjs`.
- Fixed snapshot filename derivation so fixtures with dots in their names cannot map to the same output JSON.

## Task Commits

Each implementation task was committed atomically:

1. **Task 1: Release CI workflows and package curation** - `79e7b7e` (`feat(10-02): add release CI workflows`)
2. **Task 1b: Rebrand projection snapshots** - `fb359e1` (`test(10-02): capture rebrand projection snapshots`)
3. **Recovery fix: single-bin test alignment** - `fc7ddfb` (`fix(10-02): align tests with single-bin package`)
4. **Task 2: README and docs** - `b68d75e` (`docs(10-02): publish release documentation`)
5. **Recovery fix: snapshot filename collisions** - `de81670` (`fix(10-02): avoid rebrand snapshot filename collisions`)

**Plan metadata:** this SUMMARY and tracking commit.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Package tests still expected the deferred `oto-sdk` binary**
- **Found during:** focused Plan 10-02 verification
- **Issue:** Package/install-smoke tests still asserted the pre-plan two-bin shape after `package.json` correctly dropped `oto-sdk`.
- **Fix:** Updated the package and MR-01 smoke tests to assert the v0.1.0 single-bin contract.
- **Files modified:** `tests/phase-02-package-json.test.cjs`, `tests/phase-04-mr01-install-smoke.test.cjs`
- **Verification:** `node --test tests/phase-02-package-json.test.cjs tests/phase-04-mr01-install-smoke.test.cjs` passed.
- **Committed in:** `fc7ddfb`

**2. [Rule 3 - Blocking] Snapshot filenames collided for dotted fixture names**
- **Found during:** focused Plan 10-02 verification
- **Issue:** Snapshot generator and test code used `fixture.replace(/\.[^.]+$/, '.json')`, so filenames containing dots could derive the wrong snapshot name.
- **Fix:** Added a shared local `snapshotName(fname)` helper using `path.parse(fname).name` in both regen and test code, then regenerated snapshots.
- **Files modified:** `tests/regen-rebrand-snapshots.cjs`, `tests/phase-10-rebrand-snapshot.test.cjs`, snapshot JSONs
- **Verification:** focused Phase 10 CI/docs/snapshot test set passed with 21/21 tests.
- **Committed in:** `de81670`

**3. [Rule 3 - Verification Drift] Planned full-suite command referenced a missing script**
- **Found during:** full verification
- **Issue:** Plan text referenced `node scripts/run-tests.cjs`, but this repo does not contain that script.
- **Fix:** Used the canonical package runner, `npm test`, which expands to `node --test --test-concurrency=4 tests/*.test.cjs`.
- **Files modified:** none
- **Verification:** `npm test` passed.
- **Committed in:** summary metadata only

---

**Total deviations:** 3 auto-handled
**Impact on plan:** Plan output is stronger than the original handoff: all deferred Wave 1 test gates are live and green, and the single-bin package contract is enforced.

## Verification

- `node --test tests/phase-10-action-sha-pin.test.cjs tests/phase-10-workflow-shape.test.cjs tests/phase-10-readme-shape.test.cjs tests/phase-10-docs-presence.test.cjs tests/phase-10-rebrand-snapshot.test.cjs tests/phase-10-commands-index-sync.test.cjs` passed: 21/21 tests.
- `node --test tests/phase-02-package-json.test.cjs tests/phase-04-mr01-install-smoke.test.cjs` passed: 6/6 tests.
- `npm test` passed: 419 tests, 418 pass, 1 skipped, 0 fail, 0 TODO.
- `node -p "require('./package.json').files.includes('THIRD-PARTY-LICENSES.md')"` returned `true`.
- `test ! -f bin/oto-sdk.js` passed.

## User Setup Required

None for Plan 10-02. Plan 10-03 will require networked release operations and a manual clean-install UAT checkpoint.

## Next Phase Readiness

Plan 10-03 is ready to execute. Remaining work is the v0.1.0 release gate: confirm the version/tag state, tag and push, verify GitHub release automation, and prove a clean Claude Code install from the tagged archive.

## Self-Check: PASSED

- All Plan 10-02 output files exist.
- Deferred Wave 1 tests now run live with no TODOs.
- Full `npm test` is green.
- No unrelated pre-existing Phase 4/5 dirty artifacts were staged or committed.

---
*Phase: 10-tests-ci-docs-v0-1-0-release*
*Completed: 2026-05-04*
