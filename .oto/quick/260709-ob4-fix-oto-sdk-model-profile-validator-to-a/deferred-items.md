# Deferred Items — quick task 260709-ob4

Out-of-scope discoveries logged during execution. Not fixed in this task per scope boundary rules.

## 1. SDK Vitest unit suite has 227 pre-existing failures across 36 test files

- **Found during:** Task 1/2 (running the vitest regression gate)
- **Cause:** The Phase 12 planning-root resolver (`sdk/src/planning-root.ts`) resolves unmarked
  planning roots to `.oto/`, but most SDK test fixtures still create unmarked `.planning/`
  directories in their tmpdirs. Handlers look in `<tmp>/.oto/` while fixtures live in
  `<tmp>/.planning/` — nearly every suite touching planning paths fails.
- **Baseline evidence:** At base commit 708fdef, `npx vitest run --project unit` reports
  271 failed / 1071 passed (1342). After this task's fixes (3 files repointed to `.oto/`):
  227 failed / 1120 passed (1347). Zero NEW failures were introduced (verified by diffing
  the failing-test lists between baseline and post-change runs).
- **Worst offenders:** phase-lifecycle (35), state-mutation (21), state (17), roadmap (16),
  init-complex (15), phase (14), init (13), context-engine (12), config (10), plus 27 more files.
- **Suggested fix:** A mechanical `/oto-quick` sweep repointing test fixtures from `.planning/`
  to `.oto/` (mirror the fix applied here to config-query.test.ts, config-mutation.test.ts,
  validate.test.ts), plus case-by-case review of any residual failures.

## 2. CJS `oto/bin/lib/verify.cjs:661` W004 list missing 'adaptive'

- **Found during:** Planning (recorded per plan instruction)
- The CJS health-check W004 valid-profiles list omits 'adaptive'. The SDK side was fixed in
  this task by importing `VALID_PROFILES`; the CJS side still has a hardcoded list.

## 3. CJS `core.cjs` resolveModelInternal checks omit before inherit

- **Found during:** Planning (recorded per plan instruction)
- `oto/bin/lib/core.cjs` (~lines 1827/1833) applies the `resolve_model_ids: 'omit'` branch
  before the `inherit` profile branch — the same precedence bug fixed in the SDK's
  `resolveModel` here. Verify and align the CJS resolver.
