---
phase: 02-rebrand-engine-distribution-skeleton
plan: 01
subsystem: distribution
tags: [node, npm, github-install, lifecycle, node-test]
requires:
  - phase: 01-inventory-architecture-decisions
    provides: package and distribution decisions, license artifacts, rename-map/schema inputs
provides:
  - Node package skeleton with `oto` bin
  - Hook build lifecycle script and tests
  - Live GitHub archive install smoke
affects: [phase-03-installer, phase-05-hooks, phase-10-release]
tech-stack:
  added: []
  patterns: [CommonJS CLI scripts, node:test coverage, zero top-level dependencies]
key-files:
  created:
    - package.json
    - bin/install.js
    - scripts/build-hooks.js
    - scripts/install-smoke.cjs
    - hooks/.gitkeep
    - README.md
    - tests/phase-02-package-json.test.cjs
    - tests/phase-02-gitignore.test.cjs
    - tests/phase-02-bin-stub.test.cjs
    - tests/phase-02-build-hooks.test.cjs
  modified:
    - .gitignore
    - .planning/REQUIREMENTS.md
    - .planning/ROADMAP.md
    - .planning/phases/02-rebrand-engine-distribution-skeleton/02-CONTEXT.md
    - .planning/phases/02-rebrand-engine-distribution-skeleton/02-DISCUSSION-LOG.md
key-decisions:
  - "GitHub owner resolved to OTOJulian at the repo-creation checkpoint."
  - "Install smoke uses the public GitHub archive URL because npm's git-dependency preparation path fails for lifecycle-bearing global installs under isolated --prefix."
patterns-established:
  - "Install smoke verifies a pushed GitHub ref in an isolated prefix and runs the installed `oto` bin."
  - "Hook lifecycle uses `postinstall` plus `hooks/` in package files so the installed package has the input directory."
requirements-completed: [FND-01, FND-02, FND-03, FND-04]
duration: 32 min
completed: 2026-04-28
---

# Phase 02 Plan 01: Distribution Skeleton Summary

**Installable Node package skeleton with `oto` bin, hook-build lifecycle, and live GitHub archive smoke**

## Performance

- **Duration:** 32 min
- **Started:** 2026-04-28T19:18:55Z
- **Completed:** 2026-04-28T19:50:50Z
- **Tasks:** 3
- **Files modified:** 17

## Accomplishments

- Added `package.json` with Node >=22, CJS default, `bin: { "oto": "bin/install.js" }`, explicit package files, no dependencies, and no `prepublishOnly`.
- Added the Phase 2 `bin/install.js` stub and README install instructions for the public GitHub repo.
- Added `scripts/build-hooks.js`, `scripts/install-smoke.cjs`, `.gitignore` scratch exclusions, `hooks/.gitkeep`, and focused `node:test` coverage.
- Created and pushed the public GitHub repo at `https://github.com/OTOJulian/oto-hybrid-framework`.
- Verified the live install path with `node scripts/install-smoke.cjs --ref 142c650c49dcfcbe4bfc4ca304ff81fe3958e264`.

## Task Commits

1. **Task 1: package skeleton and bin stub** - `d189593` (feat)
2. **Task 2: hook build and install smoke scripts** - `c177f7a` (feat)
3. **Task 3: repo checkpoint + live smoke** - `4782b82`, `2c752bb`, `142c650` (fix)

## Files Created/Modified

- `package.json` - Node package manifest with `oto` bin, package files allowlist, and install-time hook build.
- `bin/install.js` - Phase 2 executable bin stub that prints version and repo URL.
- `scripts/build-hooks.js` - VM-validating hook copier; verified no-op when `hooks/` only contains `.gitkeep`.
- `scripts/install-smoke.cjs` - Live GitHub archive install smoke for pushed refs.
- `hooks/.gitkeep` - Ensures `hooks/` exists in clones and installed packages.
- `README.md` - Minimal Phase 2 project stub and GitHub archive install command.
- `tests/phase-02-*.test.cjs` - Static/package/bin/build-hooks tests for Plan 02-01.

## Decisions Made

- Repo owner changed from the provisional `julianisaac` value to `OTOJulian` based on the actual repo created by the user.
- The install command changed from npm's `github:` shorthand to the GitHub archive tarball URL. The shorthand triggered npm's git-dependency preparation flow and failed with `ENOTDIR` while renaming the temporary global package symlink under `--prefix`; the archive URL installs from the public GitHub ref, runs `postinstall`, and exposes the `oto` bin successfully.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Actual GitHub owner differed from provisional plan owner**
- **Found during:** Task 3 (GitHub repo creation checkpoint)
- **Issue:** The created repo was `OTOJulian/oto-hybrid-framework`, while Plan 02-01 originally used provisional owner `julianisaac`.
- **Fix:** Updated package metadata, README, install-smoke, tests, and tracked Phase 2 planning context to use `OTOJulian`.
- **Files modified:** `package.json`, `README.md`, `bin/install.js`, `scripts/install-smoke.cjs`, `tests/phase-02-package-json.test.cjs`, tracked Phase 2 docs.
- **Verification:** Package tests passed; `git ls-remote https://github.com/OTOJulian/oto-hybrid-framework.git HEAD` resolved the pushed SHA.
- **Committed in:** `4782b82`

**2. [Rule 3 - Blocking] npm `github:` shorthand failed for lifecycle-bearing global install smoke**
- **Found during:** Task 3 (live install-smoke)
- **Issue:** `npm install -g github:OTOJulian/oto-hybrid-framework#<sha> --prefix <tmp>` failed with `ENOTDIR` in npm's git-dependency preparation path before the bin could be verified.
- **Fix:** Moved hook build to `postinstall`, included `hooks/` in package files, and switched install-smoke/README to the public GitHub archive URL.
- **Files modified:** `package.json`, `tests/phase-02-package-json.test.cjs`, `README.md`, `scripts/install-smoke.cjs`, tracked planning docs.
- **Verification:** Focused Plan 02-01 tests passed; final live smoke passed against `142c650c49dcfcbe4bfc4ca304ff81fe3958e264`.
- **Committed in:** `2c752bb`, `142c650`

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** The distribution skeleton still satisfies FND-01 through FND-04. The install URL is now the GitHub archive tarball path instead of npm's `github:` shorthand because that is the working public GitHub install path with lifecycle scripts under the isolated-prefix smoke.

## Issues Encountered

- npm's `github:` shorthand failed during git dependency preparation for global installs with lifecycle scripts. Verified failure on npm 10.9.2 and npm 11.13.0, then verified success through the public GitHub archive tarball URL.

## User Setup Required

None - the public GitHub repo exists and the current branch is pushed.

## Next Phase Readiness

Plan 02-02 can build the rebrand rule modules and walker on top of the package skeleton and test harness. The live install-smoke now provides a repeatable release-path check for future tags.

## Self-Check: PASSED

- `node --test --test-concurrency=4 tests/phase-02-package-json.test.cjs tests/phase-02-gitignore.test.cjs tests/phase-02-bin-stub.test.cjs tests/phase-02-build-hooks.test.cjs` passed.
- `node scripts/build-hooks.js` passed.
- `git ls-remote https://github.com/OTOJulian/oto-hybrid-framework.git HEAD` resolved `142c650c49dcfcbe4bfc4ca304ff81fe3958e264`.
- `node scripts/install-smoke.cjs --ref 142c650c49dcfcbe4bfc4ca304ff81fe3958e264` passed.

---
*Phase: 02-rebrand-engine-distribution-skeleton*
*Completed: 2026-04-28*
