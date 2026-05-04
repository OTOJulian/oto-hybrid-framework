---
phase: 10-tests-ci-docs-v0-1-0-release
plan: 03
subsystem: v0.1.0-release-gate
tags: [release, tag, github-actions, install-smoke, human-uat]

requires:
  - phase: 10-tests-ci-docs-v0-1-0-release
    plan: 02
    provides: CI, docs, package, and release workflow surface
provides:
  - package.json version 0.1.0
  - annotated v0.1.0 git tag
  - published GitHub Release v0.1.0
  - clean install UAT proof for Claude runtime
affects: [package-json, release-tag, github-release, planning-state]

key-files:
  modified:
    - package.json
    - CLAUDE.md
    - AGENTS.md
    - GEMINI.md
    - decisions/runtime-tool-matrix.md
    - tests/05-merge-settings.test.cjs
    - tests/05-token-substitution.test.cjs
    - tests/fixtures/runtime-parity/codex/oto-executor.expected.toml
    - tests/phase-02-bin-stub.test.cjs
    - tests/phase-02-package-json.test.cjs
    - tests/phase-03-install-state.test.cjs
    - tests/phase-03-runtime-claude.test.cjs
    - tests/phase-03-runtime-codex.test.cjs
    - tests/phase-03-runtime-gemini.test.cjs
    - tests/phase-08-gemini-settings.test.cjs
    - tests/phase-09-accept-helper.test.cjs
    - tests/phase-09-allowlist.test.cjs
    - tests/phase-09-merge-3way.test.cjs
    - tests/phase-09-merge-add-delete.test.cjs
  created:
    - foundation-frameworks/

key-decisions:
  - "Treat `npm test` as the canonical full-suite command because `scripts/run-tests.cjs` does not exist in this repo."
  - "Do not create or push `v0.1.0` while main CI is red."
  - "Track `foundation-frameworks/` as an immutable source fixture because Phase 1/2/9/10 tests require it in clean CI checkouts, while package.json `files` keeps it out of shipped npm archives."

requirements-completed: [FND-05]

duration: operator-recovered
completed: 2026-05-04
---

# Phase 10 Plan 03: v0.1.0 Release Gate Summary

**v0.1.0 is tagged, released, and validated by both automated CI and human clean-install UAT.**

## Performance

- **Duration:** operator-recovered after release-gate CI diagnosis
- **Completed:** 2026-05-04
- **Tasks:** 2 automated release tasks + 1 blocking human UAT checkpoint
- **Release tag:** `v0.1.0`
- **Release URL:** https://github.com/OTOJulian/oto-hybrid-framework/releases/tag/v0.1.0

## Accomplishments

- Bumped the package and generated runtime-visible version strings from `0.1.0-alpha.1` to `0.1.0`.
- Re-ran focused version/render tests and the full local `npm test` suite successfully.
- Pushed the release-ready main branch, verified `test.yml` and `install-smoke.yml` green on `18b077c`, then created and pushed the annotated `v0.1.0` tag.
- Verified `release.yml` completed successfully and created the GitHub Release.
- Ran automated install smoke against `https://github.com/OTOJulian/oto-hybrid-framework/archive/v0.1.0.tar.gz`.
- Accepted human UAT from a fresh terminal: `BIN_OK + FND-05_PASS`, install marker present, runtime `claude`, `oto_version` `0.1.0`.

## Task Commits

Each implementation task was committed atomically:

1. **Version bump and fixture updates** - `f6c0cc9` (`chore: bump version to 0.1.0 for first release`)
2. **CI fixture repair** - `18b077c` (`test(10-03): track upstream fixtures for CI`)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Verification Drift] Planned full-suite command referenced a missing script**
- **Found during:** Plan 10-03 pre-tag verification
- **Issue:** Plan text referenced `node scripts/run-tests.cjs`, but this repo does not contain that script.
- **Fix:** Used the canonical package runner, `npm test`, which expands to `node --test --test-concurrency=4 tests/*.test.cjs`.
- **Files modified:** none
- **Verification:** `npm test` passed with 419 tests, 418 pass, 1 skipped, 0 fail, 0 TODO.

**2. [Rule 3 - Blocking] Clean GitHub checkout lacked required upstream fixtures**
- **Found during:** main-branch CI run after the version bump
- **Issue:** `test.yml` failed remotely because `foundation-frameworks/` was present locally but untracked. Clean checkouts could not satisfy inventory, license, coverage-manifest, rebrand-sync, and Phase 10 license tests.
- **Fix:** Tracked `foundation-frameworks/` as source-only test fixtures. The package allowlist still excludes it from npm tarballs.
- **Files modified:** `foundation-frameworks/`
- **Verification:** a clean clone under `/private/tmp/oto-ci-repro` ran `npm test` successfully; remote `test.yml` and `install-smoke.yml` both passed on `18b077c`.
- **Committed in:** `18b077c`

**3. [Scoped Deviation] Working tree was not clean because of pre-existing unrelated artifacts**
- **Found during:** Plan 10-03 execution
- **Issue:** The plan requested a clean worktree, but the repo already had unrelated Phase 4/5 planning/report modifications and untracked files.
- **Fix:** Kept release commits narrowly scoped. No unrelated pre-existing dirty files were staged or reverted.
- **Verification:** `git status --short` after release work still shows only the pre-existing unrelated dirty files outside the Phase 10 closeout scope.

---

**Total deviations:** 3 auto-handled or scoped
**Impact on plan:** Release confidence increased: the CI fixture issue was caught before tagging, fixed, and verified in clean local and remote CI environments.

## Verification

- `node --test tests/phase-02-bin-stub.test.cjs tests/phase-08-runtime-matrix-render.test.cjs tests/phase-08-instruction-render.test.cjs tests/phase-08-codex-transform.test.cjs` passed: 12/12 tests.
- `npm test` passed after version bump: 419 tests, 418 pass, 1 skipped, 0 fail, 0 TODO.
- Clean clone reproduction under `/private/tmp/oto-ci-repro` ran `npm test` successfully after tracking fixtures: 419 tests, 418 pass, 1 skipped, 0 fail, 0 TODO.
- `node scripts/install-smoke.cjs` against the pushed main SHA passed and reported `oto v0.1.0`.
- `test.yml` on `18b077c487dc74b53cbbe16121064a101b6653c8` completed with conclusion `success`.
- `install-smoke.yml` on `18b077c487dc74b53cbbe16121064a101b6653c8` completed with conclusion `success`.
- `git cat-file -t v0.1.0` returned `tag`.
- `git show v0.1.0:package.json` showed `"version": "0.1.0"`.
- `release.yml` run `25343460823` completed with conclusion `success`.
- GitHub Release `v0.1.0` exists and was published at `2026-05-04T21:05:20Z`.
- `node scripts/install-smoke.cjs --ref v0.1.0` passed against the published tag archive.
- Human UAT passed from a fresh terminal: `BIN_OK`, `FND-05_PASS`, `.install.json` present with `oto_version` `0.1.0`, runtime `claude`, and 331 files copied.

## User Setup Required

None. The release is published and installable from:

```sh
npm install -g https://github.com/OTOJulian/oto-hybrid-framework/archive/v0.1.0.tar.gz
```

## Next Phase Readiness

Phase 10 is complete. All v0.1.0 roadmap phases are now complete, so the next workflow should be milestone closeout rather than another phase execution.

## Self-Check: PASSED

- FND-05 is satisfied by automated and human UAT evidence.
- The release tag is annotated and pushed.
- CI and release workflows are green.
- No unrelated pre-existing Phase 4/5 dirty artifacts were staged or committed.

---
*Phase: 10-tests-ci-docs-v0-1-0-release*
*Completed: 2026-05-04*
