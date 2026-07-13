---
phase: 14-key-storage-reconciliation
plan: 19
subsystem: security-verification
tags: [sdk-dist, real-process, baseline-delta, flake-adjudication, bounded-convergence]

requires:
  - phase: 14-key-storage-reconciliation
    provides: source fixes, focused regressions, warning dispositions, and the two-run SDK baseline from plans 14-13 through 14-18
provides:
  - One committed SDK dist rebuild carrying all Phase 14 gap-closure source changes
  - Six machine-checkable real-process gap-reproduction verdicts against CJS and shipped SDK surfaces
  - A four-part terminal gate with a machine-checked no-new-persistent-failures baseline delta
  - A recorded bounded convergence contract for fresh independent verification and review
affects: [phase-14-verification, phase-14-code-review, phase-15-mcp-registration]

tech-stack:
  added: []
  patterns: [single-owned-dist-rebuild, isolated-real-process-reproduction, two-run-union-regression-gate, offender-only-flake-adjudication]

key-files:
  created:
    - .oto/phases/14-key-storage-reconciliation/14-SDK-BASELINE-DELTA.txt
  modified:
    - sdk/dist/cli.js
    - sdk/dist/config.js
    - sdk/dist/query/config-mutation.js
    - sdk/dist/query/index.js
    - sdk/dist/query/secret-commands.js
    - sdk/dist/query/secrets.js

key-decisions:
  - "Preserve compiler-authored dist output when a plan grep assumes one-line TypeScript emission; prove the equivalent generated branch directly instead of hand-editing build artifacts."
  - "Run isolated offender reruns only when the baseline comparison identifies an offender; zero offenders produces an explicit NONE adjudication without manufacturing flake evidence."
  - "Do not declare Phase 14 complete until a fresh independent verifier reports 4/4 and a fresh review reports zero unresolved Critical findings."

patterns-established:
  - "Terminal SDK regression gates compare every final failing file against a captured union and per-file maximum before any flake classification."
  - "Machine-checkable verdicts remain append-only from real-process reproduction through the final baseline decision."

requirements-completed: [SECR-01, SECR-02, SECR-03, SECR-04]

duration: 9 min
completed: 2026-07-13
---

# Phase 14 Plan 19: Terminal SDK Gate and Bounded Convergence Summary

**One committed SDK rebuild carries every Phase 14 source fix, all six original blockers invert against real processes, and the full SDK suite adds zero persistent failures beyond its captured two-run baseline.**

## Performance

- **Duration:** 9 min
- **Started:** 2026-07-13T01:43:50Z
- **Completed:** 2026-07-13T01:53:02Z
- **Tasks:** 3
- **Files modified:** 20 (18 regenerated dist files, the baseline-delta artifact, and this summary)

## Accomplishments

- Honored the Wave 4 hard gate: all six prerequisite summaries (14-13 through 14-18) existed, reported successful verification, and ended with `Self-Check: PASSED` before the rebuild began.
- Ran `npm run build` from `sdk/` exactly once and committed every changed JavaScript, source-map, and declaration artifact produced by TypeScript.
- Inverted the verifier's three blocker families through six fresh real-process probes against the CJS CLI and rebuilt SDK wrapper, with command, exit, and post-state evidence in `14-SDK-BASELINE-DELTA.txt`.
- Passed the focused CJS gate, all 14 enumerated SDK files (271/271), and TypeScript checking.
- Compared the final full SDK run machine-checkably against all 41 baseline-union files and maxima: zero candidate offenders, zero flake exclusions, and zero persistent regressions.

## Task Commits

Each terminal task was committed atomically with hooks bypassed for the isolated parallel worktree:

1. **Task 1: Wave gate and single SDK dist rebuild** - `d3ce48c` (chore)
2. **Task 2: Six real-process gap reproductions** - `82053dd` (test)
3. **Task 3: Four-part terminal gate and baseline delta** - `a2d4c42` (test)

## Task 1 Evidence: Single Rebuild

- **SHA before:** `bb0cbe3c00b58b8f562588937b46037cf0a97f2c`
- **SHA after Task 1:** `d3ce48c456e7f4589a4b126d769a2ee000d22c56`
- **Build:** `cd sdk && npm run build` exited 0. This was the plan's single SDK build.
- **Symbol checks:** `findNestedIntegrationString=4`, `readConfigForMutation=4`, `secure key entry unavailable=1`, `expected a JSON object=1`, `deepMergeConfig=3`, `alreadyLocked=1`, declaration export count `=2`.

`git diff --name-only bb0cbe3c00b58b8f562588937b46037cf0a97f2c..d3ce48c456e7f4589a4b126d769a2ee000d22c56` recorded:

```text
sdk/dist/cli.js
sdk/dist/cli.js.map
sdk/dist/config.d.ts.map
sdk/dist/config.js
sdk/dist/config.js.map
sdk/dist/query/config-mutation.d.ts
sdk/dist/query/config-mutation.d.ts.map
sdk/dist/query/config-mutation.js
sdk/dist/query/config-mutation.js.map
sdk/dist/query/index.js
sdk/dist/query/index.js.map
sdk/dist/query/secret-commands.d.ts.map
sdk/dist/query/secret-commands.js
sdk/dist/query/secret-commands.js.map
sdk/dist/query/secrets.d.ts
sdk/dist/query/secrets.d.ts.map
sdk/dist/query/secrets.js
sdk/dist/query/secrets.js.map
```

No tracked-file deletions occurred in the commit.

## Task 2 Evidence: Real-Process Reproductions

Every probe used a fresh temporary home and project with all three provider environment variables set to empty strings.

| Verdict | Command surface | Exit | Verified post-state |
|---|---|---:|---|
| `GAP1-CJS: PASS` | CJS `config-new-project` with array choices | 1 | No project `.oto`; no marker in project files |
| `GAP1-SDK: PASS` | SDK dist `config-new-project` with array choices | 10 | No project `.oto`; no marker in project files |
| `GAP2-SDK: PASS` | SDK dist `secret-status exa` with legacy config plus zero-byte keyfile | 0 | Legacy value healed into keyfile; Node `statSync` mode check exited 0; config boolean `true`; masked `****6789`; no unset status |
| `GAP3-CONFIGSET: PASS` | SDK dist `config-set model_profile quality` on malformed config | 1 | Config bytes stayed exactly `{bad json` |
| `GAP3-SECRETSET: PASS` | SDK dist stdin `secret-set exa` on malformed config | 1 | Config bytes preserved; new keyfile absent after compensation |
| `GAP3-SECRETCLEAR: PASS` | SDK dist `secret-clear exa` on malformed config | 1 | Config bytes preserved; prior keyfile remained byte-identical |

The final delta retains exactly one line for each of the six structured `GAP*: PASS` verdicts.

## Task 3 Evidence: Four-Part Terminal Gate

| Part | Command | Result |
|---|---|---|
| 1 - Focused CJS | `node --test --test-reporter=dot tests/14-*.test.cjs` | Exit 0; all focused Phase 14 tests passed |
| 2 - Focused SDK | Exact 14-file list from the plan | 14/14 files, 271/271 tests, exit 0 |
| 3 - TypeScript | `cd sdk && npx tsc --noEmit` | Exit 0 |
| 4 - Full SDK | `cd sdk && npx vitest run` captured to `/tmp/vitest-final-raw.txt` | Baseline-relative gate passed after machine comparison |

### Baseline Delta

| Run | Failed files | Passed files | Failed tests | Passed tests |
|---|---:|---:|---:|---:|
| Baseline run 1 | 41 | 40 | 268 | 1227 |
| Baseline run 2 | 41 | 40 | 268 | 1227 |
| Final post-fix run | 40 | 48 | 267 | 1287 |

- The baseline union contains 41 files with per-file maximum failure counts.
- The final failed set contains 40 files; all 40 belong to the union and all 40 counts are at or below the corresponding maximum.
- Baseline-only `src/query/registry.test.ts` improved from a maximum of 1 failure to 0.
- **Candidate offenders:** 0.
- **Adjudication:** `NONE`. No isolated reruns were required because no file violated either comparison rule.
- **FLAKE classifications:** 0. No offender was excluded from the verdict.
- **PERSISTENT classifications:** 0.
- **Verdict:** `NO NEW FAILURES: PASS`.

## Warning Disposition Check

`14-DISPOSITIONS.md` explicitly dispositions all ten prior Warnings with evidence: WR-01 FIX, WR-02 FIX, WR-03 FIX, WR-04 DEFER to Phase 16 with a named prerequisite and owner, WR-05 FIX, WR-06 FIX, WR-07 FIX, WR-08 FIX, WR-09 FIX, and WR-10 FIX. A fresh review remains responsible for adding and dispositioning any newly discovered Warning before phase closure.

## Convergence Contract

Phase 14 completes ONLY when:

1. Fresh independent verification (oto-verifier) reports `passed` with 4/4 requirements (SECR-01..04) satisfied.
2. A fresh code review reports zero unresolved Critical findings.
3. Every Warning is explicitly FIX / ACCEPT / DEFER with evidence (14-DISPOSITIONS.md current).
4. Focused Phase 14 tests (CJS + SDK, Parts 1-2) and `npx tsc --noEmit` (Part 3) pass.
5. The full SDK suite introduces no PERSISTENT failures beyond the recorded two-run-union baseline (Part 4, after flake adjudication).

**Bounded convergence:** no more than TWO further plan-review revision cycles are permitted after this plan. If the blocker count does not decrease between consecutive cycles, STOP — report the unresolved contradiction to the developer rather than generating another gap-plan loop. Adjudicated FLAKEs never consume a cycle.

**Current cycle:** cycle 1 of the bound.

**Current contract status:** items 4 and 5 passed in this plan, and the existing Warning matrix satisfies item 3 for the prior review. Items 1 and 2 require fresh independent agents and cannot be self-certified here. Phase 14 is ready for those gates but is not yet declared complete.

## Decisions Made

- Preserved TypeScript's generated formatting rather than hand-editing a dist file merely to satisfy a one-line textual assumption.
- Applied the plan's mandatory offender-only adjudication literally: with zero offenders, the correct evidence is `NONE`, not two unnecessary runs of an arbitrary baseline failure.
- Kept `.oto/STATE.md`, `.oto/ROADMAP.md`, and `.oto/REQUIREMENTS.md` unchanged so the orchestrator remains the single writer and requirements are not closed before independent verification and review.

## Deviations from Plan

### Recorded Evidence Deviation

**1. [Rule 3 - Blocking evidence mismatch] TypeScript emitted the empty-keyfile branch across two lines**

- **Found during:** Task 1 acceptance checks.
- **Issue:** The plan's literal one-line search for the empty-value branch returned zero because `tsc` emitted `if (value === '')` and `return null;` on adjacent lines.
- **Resolution:** Preserved the compiler-authored artifact and verified the adjacent generated lines plus the source statement. The shipped branch is present and the empty-keyfile real-process reproduction passed.
- **Files modified:** None beyond the planned compiler output.
- **Verification:** `sdk/dist/query/secrets.js` lines 115-116 contain the branch; `GAP2-SDK: PASS` proves the behavior through rebuilt dist.

---

**Total deviations:** 1 recorded evidence-command mismatch; 0 production-scope deviations.
**Impact on plan:** No implementation, build, or security behavior changed; generated-output integrity was preserved.

## Issues Encountered

- The isolated worktree's Git index is administered under the primary checkout's `.git/worktrees` directory, so Git staging and commits required sandbox escalation. All three atomic commits completed with `--no-verify` as instructed.
- Pre-existing untracked dependency directories `node_modules` and `sdk/node_modules` were left untouched and uncommitted.

## Known Stubs

None - no implementation stubs or placeholder data paths were introduced.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Run fresh independent Phase 14 verification and require `passed` with 4/4 SECR requirements.
- Run a fresh Phase 14 code review and require zero unresolved Critical findings; update `14-DISPOSITIONS.md` for every new Warning, if any.
- Do not advance Phase 14 or run its post-completion security workflow until both remaining contract gates pass.

## Self-Check: PASSED

- Both created planning artifacts and all required regenerated dist artifacts exist.
- Task commits `d3ce48c`, `82053dd`, and `a2d4c42` resolve in branch history with no tracked-file deletions.
- Fresh post-summary verification passed: focused CJS exit 0, focused SDK 271/271, TypeScript exit 0, six real-process reproductions, every task acceptance criterion, and the machine baseline comparison.
- The branch remains `codex/phase14-19`, required base `bb0cbe3c00b58b8f562588937b46037cf0a97f2c` is an ancestor, and `.oto/STATE.md` / `.oto/ROADMAP.md` remain unchanged.
- The final scope is 18 regenerated dist files, `14-SDK-BASELINE-DELTA.txt`, and this summary; pre-existing dependency directories remain uncommitted.

---
*Phase: 14-key-storage-reconciliation*
*Completed: 2026-07-13*
