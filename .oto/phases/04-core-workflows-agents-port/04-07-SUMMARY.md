---
phase: 04-core-workflows-agents-port
plan: 07
subsystem: testing
tags: [node-test, phase-04, retained-agents, install-smoke, mr-01]

requires:
  - phase: 04-core-workflows-agents-port
    provides: "Plans 04-03 through 04-06 delivered the Phase 4 payload, dropped-agent fixups, and Codex sandbox map"
provides:
  - "Implemented the remaining Phase 4 verification tests with real assertions"
  - "Enforced retained-agent references, dropped-agent absence, command-to-workflow links, and shipped-payload .planning leak removal"
  - "Validated MR-01 automated tarball install smoke against the packed distribution"
affects: [phase-04, phase-08-runtime-parity, phase-10-release-hardening]

tech-stack:
  added: []
  patterns:
    - "node:test verification files remain dependency-free CommonJS"
    - "MR-01 smoke uses os.tmpdir() mkdtemp directories for pack, npm cache, install prefix, and config dir"

key-files:
  created:
    - .planning/phases/04-core-workflows-agents-port/04-07-SUMMARY.md
  modified:
    - tests/phase-04-no-dropped-agents.test.cjs
    - tests/phase-04-generic-agent-allowlist.test.cjs
    - tests/phase-04-superpowers-code-reviewer-removed.test.cjs
    - tests/phase-04-planning-leak.test.cjs
    - tests/phase-04-command-to-workflow.test.cjs
    - tests/phase-04-frontmatter-schema.test.cjs
    - tests/phase-04-task-refs-resolve.test.cjs
    - tests/phase-04-codex-sandbox-coverage.test.cjs
    - tests/phase-04-mr01-install-smoke.test.cjs
    - package.json
    - tests/phase-02-package-json.test.cjs
    - oto/

key-decisions:
  - "Include oto/ in package.json files so the tarball install path actually carries the Phase 4 runtime payload."
  - "Use a temp npm cache and temp pack destination in MR-01 smoke to avoid user npm cache ownership and repo-root tarball side effects."

patterns-established:
  - "Phase 4 static enforcement tests share tests/fixtures/phase-04/retained-agents.json as the retained-agent source of truth."
  - "Shipped payload leak checks scan runtime payload roots only, not repo-local .planning artifacts."

requirements-addressed: [AGT-02, AGT-03, MR-01]
requirements-completed: [AGT-02, AGT-03]
requirements-gated:
  - "MR-01 automated tarball install smoke passed here; manual daily-use dogfood gate remains in 04-08."

duration: 10 min
completed: 2026-04-29
---

# Phase 04 Plan 07: Phase 4 Verification Tests Summary

**Phase 4 verification tests now enforce retained-agent, workflow-link, sandbox-map, shipped-payload leak, and MR-01 tarball install behavior without TODO placeholders.**

## Performance

- **Duration:** 10 min
- **Started:** 2026-04-29T23:30:54Z
- **Completed:** 2026-04-29T23:40:37Z
- **Tasks:** 3
- **Files modified:** 152

## Accomplishments

- Replaced all 9 targeted Phase 4 `t.todo()` scaffolds with real assertions.
- Enforced AGT-02, AGT-03, AGT-04, D-09, D-10, D-12, D-13/D-15/D-16, and the automated MR-01 smoke path.
- Fixed shipped payload residue exposed by the new tests: no dropped-agent substrings and no path-like `.planning` references remain in scanned payload roots.
- Added `oto/` to the npm package allowlist so packed installs contain the Phase 4 commands, agents, workflows, templates, contexts, and references.

## Task Commits

1. **Task 1: 5 grep-style tests** - `7a8c338` (`test`)
2. **Task 2: 3 schema/sandbox tests** - `10a7707` (`test`)
3. **Task 3: MR-01 install smoke** - `cbe8378` (`test`)

## Enforcement Summary

| Test file | Enforces | Runtime evidence |
|-----------|----------|------------------|
| `tests/phase-04-no-dropped-agents.test.cjs` | D-09 / AGT-03 dropped-agent absence | 126.58 ms in Phase 4 glob |
| `tests/phase-04-generic-agent-allowlist.test.cjs` | D-10 generic allowlist | 34.95 ms in Phase 4 glob |
| `tests/phase-04-superpowers-code-reviewer-removed.test.cjs` | AGT-02 collision resolution | 0.59 ms in Phase 4 glob |
| `tests/phase-04-planning-leak.test.cjs` | D-13/D-15/D-16 shipped-payload `.planning` leak absence | 30.31 ms in Phase 4 glob |
| `tests/phase-04-command-to-workflow.test.cjs` | D-12 command workflow references resolve | 17.50 ms in Phase 4 glob |
| `tests/phase-04-frontmatter-schema.test.cjs` | AGT-03 retained agent frontmatter | 12.95 ms in Phase 4 glob |
| `tests/phase-04-task-refs-resolve.test.cjs` | AGT-03 task refs resolve to files or allowlist | 11.70 ms in Phase 4 glob |
| `tests/phase-04-codex-sandbox-coverage.test.cjs` | AGT-04 exact sandbox map coverage | 1.02 ms in Phase 4 glob |
| `tests/phase-04-mr01-install-smoke.test.cjs` | MR-01 packed install populates Claude config dir | 1494.22 ms in Phase 4 glob |

## Verification

- `rg -n 't\.todo\(' tests/phase-04-*.test.cjs` -> no matches.
- `node --test --test-concurrency=4 tests/phase-04-*.test.cjs` -> 14 pass, 0 fail, 0 todo, 1597.99 ms.
- `npm test` -> 229 pass, 0 fail, 0 todo, 8094.10 ms.
- `node --test --test-timeout=120000 tests/phase-04-mr01-install-smoke.test.cjs` -> 1 pass, ~1.48 s after temp npm cache fix.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Removed shipped payload `.planning` leaks and dropped-agent residue**
- **Found during:** Task 1
- **Issue:** The new tests exposed path-like `.planning` references and dropped-agent substrings in shipped payload files.
- **Fix:** Applied the locked `.planning` -> `.oto` path-rule outcome across shipped payload roots and replaced dropped-agent names with neutral deferred-step wording.
- **Files modified:** `oto/`, `bin/lib/runtime-codex.cjs`, Task 1 tests
- **Verification:** Task 1 tests passed individually and as a group; `rg` checks for dropped-agent names and `.planning` in shipped roots returned no matches.
- **Committed in:** `7a8c338`

**2. [Rule 2 - Missing Critical] Included `oto/` in the packaged distribution**
- **Found during:** Task 3
- **Issue:** `package.json` did not include `oto/`, so `npm pack` installs could not populate Phase 4 commands or agents.
- **Fix:** Added `oto/` to `package.json` files and updated the Phase 2 package allowlist test.
- **Files modified:** `package.json`, `tests/phase-02-package-json.test.cjs`
- **Verification:** MR-01 smoke passed and `npm test` passed.
- **Committed in:** `cbe8378`

**3. [Rule 3 - Blocking] Made MR-01 smoke independent of user npm cache state**
- **Found during:** Task 3
- **Issue:** Local `~/.npm` cache ownership caused `npm pack` to fail with EPERM.
- **Fix:** The test now uses temp `npm_config_cache` and temp `--pack-destination`, both under `os.tmpdir()`, and cleans all temp dirs in `finally`.
- **Files modified:** `tests/phase-04-mr01-install-smoke.test.cjs`
- **Verification:** MR-01 smoke passed in isolation and under the full suite.
- **Committed in:** `cbe8378`

**Total deviations:** 3 auto-fixed (2 missing critical, 1 blocking)
**Impact on plan:** All deviations were required for the planned verification tests and MR-01 smoke to prove real shipped behavior. No architectural change was introduced.

## Issues Encountered

- `npm test` initially failed because the Phase 2 package allowlist test still reflected the pre-Phase-4 package surface. The expectation now includes `oto/`.

## Known Stubs

- `bin/lib/runtime-codex.cjs:64` and `bin/lib/runtime-codex.cjs:67` retain existing Phase 8/Phase 5 TODO comments for Codex frontmatter parity and TOML merging.
- Modified payload templates and verifier/checker references contain example TODO/placeholder text by design; these are instructional template examples, not live test stubs.
- No `t.todo()` remains in `tests/phase-04-*.test.cjs`, and no known stub blocks this plan's objective.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Phase 4 automated verification is green with no TODO tests. Plan 04-08 can proceed to the MR-01 dogfood/UAT gate.

## Self-Check: PASSED

- Summary file exists at `.planning/phases/04-core-workflows-agents-port/04-07-SUMMARY.md`.
- Task commits found: `7a8c338`, `10a7707`, `cbe8378`.
- `rg -n 't\.todo\(' tests/phase-04-*.test.cjs` returned no matches.
- Plan verification passed: Phase 4 glob `14/14`, full suite `229/229`, both with `0 todo`.

---
*Phase: 04-core-workflows-agents-port*
*Completed: 2026-04-29*
