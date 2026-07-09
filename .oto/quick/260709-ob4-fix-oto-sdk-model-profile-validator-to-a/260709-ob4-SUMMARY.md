---
phase: quick-260709-ob4
plan: 01
subsystem: sdk
tags: [oto-sdk, typescript, vitest, model-profiles, inherit, resolve-model, config]

requires:
  - phase: 12-sdk-query-registry
    provides: SDK query registry with .oto planning-root resolver (config-query/config-mutation/validate handlers)
provides:
  - "'inherit' accepted by oto-sdk config-set-model-profile (VALID_PROFILES parity with oto/bin/lib/model-profiles.cjs)"
  - "getAgentToModelMapForProfile('inherit') maps all 18 agents to 'inherit'"
  - "resolveModel inherit-before-omit precedence: init.quick reports 'inherit' instead of coercing to 'sonnet'"
  - "validate.ts W004 uses imported VALID_PROFILES single source of truth (adds missing 'adaptive')"
  - "Rebuilt sdk/dist (checked in) so the fix is live via the global oto-sdk shim once merged to main"
affects: [sdk, model-profiles, orchestration, init-quick]

tech-stack:
  added: []
  patterns:
    - "VALID_PROFILES = [...tier keys, 'inherit'] mirrors CJS model-profiles.cjs:58"
    - "resolveModel precedence: model_overrides > inherit > resolve_model_ids omit > tier lookup"
    - "SDK test fixtures write planning artifacts under .oto/ (resolver default), not .planning/"

key-files:
  created: []
  modified:
    - sdk/src/query/config-query.ts
    - sdk/src/query/validate.ts
    - sdk/src/query/config-mutation.ts
    - sdk/src/query/config-query.test.ts
    - sdk/src/query/config-mutation.test.ts
    - sdk/src/query/validate.test.ts
    - sdk/dist/query/ (9 regenerated files)

key-decisions:
  - "resolveModel checks 'inherit' immediately after per-agent model_overrides and before resolve_model_ids 'omit' — per oto/references/model-profile-resolution.md, prevents init.quick's ('' || 'sonnet') coercion"
  - "Repointed the three in-scope test suites' fixtures from .planning/ to .oto/ (resolver default) instead of adding migrated-root markers"
  - "Left the remaining 227 pre-existing SDK vitest failures (36 unrelated files, same fixture drift) as a deferred item rather than expanding scope"

patterns-established:
  - "Profile validation single source of truth: validate.ts imports VALID_PROFILES from config-query.ts instead of hardcoding a list"

requirements-completed: [QUICK-260709-OB4]

duration: 15min
completed: 2026-07-09
---

# Quick Task 260709-ob4: Fix oto-sdk model profile validator to accept 'inherit' Summary

**oto-sdk now accepts and resolves the 'inherit' model profile end to end: config-set-model-profile 'inherit' exits 0 with all 18 agents mapped to 'inherit', and init.quick reports 'inherit' (not 'sonnet') even with resolve_model_ids 'omit' set**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-07-09T21:38:03Z
- **Completed:** 2026-07-09T21:53:00Z
- **Tasks:** 2
- **Files modified:** 15 (3 src, 3 tests, 9 dist)

## Accomplishments

- `VALID_PROFILES` now includes 'inherit' (parity with CJS `oto/bin/lib/model-profiles.cjs:58`); `configSetModelProfile('inherit')` succeeds and its `previousProfile` recovery handles 'inherit' for free
- `getAgentToModelMapForProfile('inherit')` maps every agent to 'inherit' (CJS parity)
- `resolveModel` checks `profile === 'inherit'` before the `resolve_model_ids: 'omit'` branch, fixing the init.quick regression where inherit configs silently resolved every agent to 'sonnet'; per-agent `model_overrides` keep highest precedence and the `unknown_agent` flag is preserved
- `validate.ts` W004 uses the imported `VALID_PROFILES` (single source of truth; the local list had been missing 'adaptive')
- Full TDD cycle: RED commit with failing tests, GREEN commit with source fix, all 94 tests across the three in-scope suites pass
- `sdk/dist` rebuilt via `tsc` and committed (dist is checked in and is what the global `oto-sdk` shim executes)

## Task Commits

1. **Task 1 (RED): failing inherit tests + fixture fix** - `e59e0ea` (test)
2. **Task 1 (GREEN): inherit in validator/map/resolver + W004 import** - `0e3a848` (feat)
3. **Task 1 (Rule 1 deviation): configNewProject commit_docs default** - `028e053` (fix)
4. **Task 2: rebuild sdk/dist** - `0318f65` (chore)

## TDD Gate Compliance

- RED gate: `e59e0ea` (`test(...)`) — 5 inherit tests confirmed failing against unfixed source
- GREEN gate: `0e3a848` (`feat(...)`) — all 94 tests in the three suites pass
- REFACTOR gate: not needed (no cleanup required)
- Note: two of the five new tests ("plain inherit" and "override beats inherit") passed pre-fix because `resolveModel` already had a late inherit branch and an early override branch; investigated per fail-fast rule — they are intentional regression guards, and the load-bearing RED signals (VALID_PROFILES, agent map, inherit-before-omit, configSetModelProfile acceptance) all failed as expected.

## Files Created/Modified

- `sdk/src/query/config-query.ts` - VALID_PROFILES + 'inherit'; inherit branch in getAgentToModelMapForProfile; inherit-before-omit reorder in resolveModel with rationale comment
- `sdk/src/query/validate.ts` - W004 check imports VALID_PROFILES from config-query.js
- `sdk/src/query/config-mutation.ts` - commit_docs default aligned to CJS (true)
- `sdk/src/query/config-query.test.ts` - 5 new inherit tests; VALID_PROFILES assertion updated to five entries; fixtures repointed to .oto/
- `sdk/src/query/config-mutation.test.ts` - configSetModelProfile('inherit') acceptance test; fixtures repointed to .oto/
- `sdk/src/query/validate.test.ts` - fixtures repointed to .oto/ (no behavioral test changes)
- `sdk/dist/query/*` - 9 regenerated build outputs (config-query, config-mutation, validate + maps/d.ts)

## Decisions Made

- Inherit precedence sits between per-agent overrides and the omit branch, matching `oto/references/model-profile-resolution.md` ("If model_profile is 'inherit', all agents resolve to 'inherit'")
- Test fixtures use `.oto/` (the resolver's default root) rather than marking `.planning/` roots as migrated — truer to the Phase 12 resolver contract
- Did not expand scope to the other 36 broken test files; logged in `deferred-items.md`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Repointed the three in-scope test suites' fixtures from `.planning/` to `.oto/`**
- **Found during:** Task 1 (RED phase run)
- **Issue:** All three target suites had pre-existing failures (45 at baseline) unrelated to the inherit bug: fixtures write planning artifacts under unmarked `.planning/` tmpdirs, but the Phase 12 planning-root resolver directs handlers to `.oto/`. The plan's "all three test files pass" gate was unreachable without this.
- **Fix:** Mechanical `'.planning'` → `'.oto'` replacement in config-query.test.ts, config-mutation.test.ts, validate.test.ts (plus stale comment updates)
- **Files modified:** the three test files
- **Verification:** All 94 tests in the three suites pass; failing-test-list diff against baseline shows zero new failures repo-wide
- **Committed in:** `e59e0ea` (RED commit)

**2. [Rule 3 - Blocking] Installed sdk devDependencies in the worktree**
- **Found during:** Task 1 (first vitest run)
- **Issue:** `sdk/node_modules` absent in the fresh worktree; npx pulled an incompatible vitest@4 and the config failed to load
- **Fix:** `npm ci` in `sdk/` (installs pinned vitest 3.2.4)
- **Files modified:** none (node_modules is gitignored)
- **Verification:** vitest runs with the project's pinned toolchain
- **Committed in:** n/a (no repo changes)

**3. [Rule 1 - Bug] configNewProject hardcoded `commit_docs: false`**
- **Found during:** Task 1 (config-mutation suite still failing after fixture fix)
- **Issue:** CJS ground truth (`oto/bin/lib/core.cjs:271` CONFIG_DEFAULTS) and `sdk/src/config.ts:81` both default `commit_docs` to `true`; `configNewProject` in config-mutation.ts diverged with `false`, contradicting its own test
- **Fix:** Changed the default to `true` with a source-of-truth comment
- **Files modified:** sdk/src/query/config-mutation.ts
- **Verification:** `configNewProject > creates config.json with defaults` passes
- **Committed in:** `028e053`

---

**Total deviations:** 3 auto-fixed (2 blocking, 1 bug)
**Impact on plan:** All fixes were prerequisites for the plan's own verification gates. No scope creep — the 227 remaining pre-existing vitest failures across 36 unrelated files were deliberately deferred (see `deferred-items.md`).

## Issues Encountered

- **Plan assumption drift:** The plan stated this repo's `.oto/config.json` has `model_profile: 'inherit'`. The tracked value at the base commit is `'balanced'`; the 'inherit' value lives as an uncommitted modification in the main checkout (the very setting this bug was blocking). Live verification was run by temporarily setting 'inherit' in the worktree and restoring `config.json` afterward — no config change is committed.
- **Global binary check:** `which oto-sdk` → `~/.local/bin/oto-sdk` → symlink to the main checkout's `bin/oto-sdk.js`, which spawns the **main** checkout's `sdk/dist/cli.js`. From the executor worktree the global binary still runs the unfixed dist (exit 10, as expected). The fix goes live for the global binary as soon as this branch merges to main — no reinstall/relink needed. The worktree's rebuilt dist was verified directly: `config-set-model-profile inherit` exit 0 with all agents 'inherit'; `resolve-model gsd-planner` → 'inherit'; `init.quick` → planner/executor/checker/verifier models all 'inherit'.

## Deferred Issues

See `deferred-items.md` in this directory:
1. 227 pre-existing SDK vitest unit failures across 36 unrelated test files (same `.planning` → `.oto` fixture drift from Phase 12) — the plan's "full unit suite green" criterion is unreachable within quick-task scope; verified zero NEW failures introduced by this change
2. CJS `oto/bin/lib/verify.cjs:661` W004 list missing 'adaptive' (noted in plan)
3. CJS `core.cjs` resolveModelInternal checks omit before inherit — same precedence question as the SDK bug fixed here (noted in plan)

## Known Stubs

None.

## User Setup Required

None - no external service configuration required. Optional: to activate inherit for this repo, the main checkout's uncommitted `.oto/config.json` (`model_profile: "inherit"`) is already in place; after merge, `oto-sdk query config-set-model-profile inherit` will succeed globally.

## Next Phase Readiness

- Model inheritance now works through the SDK layer for the whole orchestration surface (init.quick and friends)
- Follow-ups queued in deferred-items.md (test fixture sweep + two CJS parity fixes)

---
*Phase: quick-260709-ob4*
*Completed: 2026-07-09*

## Self-Check: PASSED

- All 6 modified src/test files exist; dist regenerated (config-query.js contains 'inherit')
- Commits e59e0ea, 0e3a848, 028e053, 0318f65 present in git log
- Working tree clean except uncommitted docs artifacts (SUMMARY.md, deferred-items.md — orchestrator commits docs)
