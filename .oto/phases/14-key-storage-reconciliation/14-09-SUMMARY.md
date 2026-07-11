---
phase: 14-key-storage-reconciliation
plan: 09
subsystem: security
tags: [workflow, markdown, secrets, keyfile, bash-portability, node-test, contract-test]

# Dependency graph
requires:
  - phase: 14-key-storage-reconciliation (plan 05)
    provides: config-new-project with boolean-validated integration defaults (the workflow's new entry command)
  - phase: 14-key-storage-reconciliation (plan 08)
    provides: rebuilt+committed sdk/dist serving transactional secret commands and fail-closed reads (the CLI the e2e test spawns)
provides:
  - Executable /oto-settings-integrations entry step (idempotent config-new-project, never argument-less config-ensure-section)
  - Workstream threading via bash-3.2/set-u-safe guarded expansion ${WS_ARGS[@]+"${WS_ARGS[@]}"} on all 8 subsequent oto-sdk commands
  - Used OTO_CONFIG_PATH (displayed in confirmation banner)
  - Command wrapper rewritten to keyfile/boolean secure-storage contract
  - End-to-end workflow contract test (5 e2e cases against bin/oto-sdk.js + static workflow/wrapper pins)
affects: [verify-phase, settings-integrations, gsd-sync]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Guarded empty-array expansion ${ARR[@]+\"${ARR[@]}\"} for bash 3.2 + set -u portability in workflow bash blocks"
    - "Workflow contract tests: e2e entry sequence via spawnSync of the real CLI + static markdown pins (grep-style assertions) in one node:test file"
    - "Regression exit-code pin: assert the legacy defect (bare config-ensure-section exits 10) to document WHY the workflow must not call it"

key-files:
  created:
    - tests/14-settings-workflow-contract.test.cjs
  modified:
    - oto/workflows/settings-integrations.md
    - oto/commands/oto/settings-integrations.md

key-decisions:
  - "Workstream resolved FIRST in the entry step so WS_ARGS threads through the very first SDK call (config-new-project --ws)"
  - "User-facing printed secret-set commands substitute the literal --ws <ws-name>; the WS_ARGS guard is only for the workflow's own bash blocks"
  - "Success-criteria wording avoids the literal string config-ensure-section so the zero-occurrence grep/test contract holds (plan action text conflicted with its own acceptance criteria)"
  - "RED validated against the pre-fix file version (git show HEAD~1) since Task 1 necessarily landed before the test — static contract fails on all four original defects"

patterns-established:
  - "GSD-shared workflow files: defect-scoped diffs only; security block and AskUserQuestion structures byte-identical"

requirements-completed: [SECR-04]

# Metrics
duration: 6min
completed: 2026-07-11
---

# Phase 14 Plan 09: Settings-Integrations Workflow Executability + Contract Test Summary

**One-liner:** /oto-settings-integrations now executes end to end — idempotent config-new-project entry, guarded WS_ARGS workstream threading on every oto-sdk command (bash 3.2 + set -u safe), used OTO_CONFIG_PATH — with the keyfile/boolean contract pinned by a 7-case e2e/static test.

## What Was Built

### Task 1 — Workflow + wrapper fixes (commit 9cb6119)

`oto/workflows/settings-integrations.md`:
- Entry step rewritten: resolves the active workstream FIRST, builds `WS_ARGS=(--ws "$WS")` when `.oto/active-workstream` exists, then runs the idempotent `oto-sdk query config-new-project ${WS_ARGS[@]+"${WS_ARGS[@]}"}`. The previous argument-less `config-ensure-section` call exited 10, making the whole flow unreachable.
- All 8 subsequent oto-sdk invocations (secret-status, config-get search_gitignored, post-set secret-status <slug>, secret-clear, config-set search_gitignored, config-set review.models.<cli>, config-set agent_skills.<slug>, final secret-status) now carry the guarded expansion — 12 guarded occurrences total, zero unguarded `"${WS_ARGS[@]}"` lines.
- User-run secret-set guidance: when a workstream is active, the printed command includes the literal `--ws <ws-name>` (key entry unchanged — hidden prompt, never argv).
- `Config: $OTO_CONFIG_PATH` added to the confirmation banner — the computed path is no longer dead code.
- Success criteria updated for workstream threading + idempotent entry.
- Security block, AskUserQuestion structures, and masked-display examples untouched (verified via git diff — no hunks in `<security>`).

`oto/commands/oto/settings-integrations.md`:
- Objective no longer claims plaintext storage in config.json; states the keyfile (`~/.oto/<integration>_api_key`, mode 0600) / boolean-flag contract with stdin/TTY secret-set entry.
- Process items 1 and 6 rewritten: workstream-aware config-new-project entry; secret-set/secret-clear for keys, config-set for non-secret settings.

### Task 2 — Contract test (commit a344873)

`tests/14-settings-workflow-contract.test.cjs` (147 lines, node:test, 7 passing tests):
- E2E against `bin/oto-sdk.js` with temp project + temp HOME + cleared provider env vars: fresh-create (booleans typed), idempotent rerun (`already_exists`, bytes unchanged), `--ws ws1` routing, reachable `secret-status`, and the exit-10 regression pin for bare `config-ensure-section`.
- Static pins: workflow has zero `config-ensure-section`, >= 9 guarded `WS_ARGS[@]+` expansions, zero unguarded lines, `! oto-sdk query secret-set`, `Config: $OTO_CONFIG_PATH`; wrapper has no `stored plaintext`, has `secret-set`/`secret-clear`/`0600`.

## Verification Evidence

- `node --test tests/14-settings-workflow-contract.test.cjs` — 7/7 pass
- `node --test tests/14-no-plaintext-guard.test.cjs` — 3/3 pass (tracked-.oto guard unaffected)
- Full phase regression: `node --test tests/14-*.test.cjs` — 46/46 pass
- Live bash 3.2 check: entry block executed under macOS `/bin/bash` 3.2.57 with `set -u` on BOTH the empty-array (flat) and workstream paths — exit 0, correct config created each time
- RED validation: the static contract run against the pre-fix workflow (`git show HEAD~1:...`) fails on all four original defects (references config-ensure-section, missing config-new-project, < 9 guarded expansions, unused OTO_CONFIG_PATH)

## TDD Gate Compliance

Task 2 is a test-only task pinning behavior delivered by Task 1 and waves 1-3, so a failing-test-first commit against the current tree was not achievable. RED semantics were validated instead by asserting the static contract FAILS against the pre-Task-1 file version (see Verification Evidence). Commit sequence: `fix(14-09)` 9cb6119 → `test(14-09)` a344873.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Plan's success-criteria wording contradicted its own acceptance criteria**
- **Found during:** Task 1, step A.5
- **Issue:** The plan's action text said to add "never argument-less `config-ensure-section`" to the workflow's success criteria, but the acceptance criteria (and the Task 2 test) require zero occurrences of the literal string `config-ensure-section` in the workflow file.
- **Fix:** Reworded to "never the argument-less legacy ensure-section call, which exits 10" — same meaning, no literal match. The verifiable contract (grep == 0 + test absence assertion) wins.
- **Files modified:** oto/workflows/settings-integrations.md
- **Commit:** 9cb6119

**2. [Rule 1 - Bug] Prose line contained an unguarded bare expansion**
- **Found during:** Task 1 verification
- **Issue:** The entry-step prose "never write a bare `\"${WS_ARGS[@]}\"`" itself matched the test's unguarded-line detector (line contains the bare form without `WS_ARGS[@]+` on the same line).
- **Fix:** Reworded to "never expand the array without the `WS_ARGS[@]+` guard".
- **Files modified:** oto/workflows/settings-integrations.md
- **Commit:** 9cb6119

## Known Stubs

None — both markdown surfaces are fully wired to live SDK commands and the test exercises the real built CLI.

## Commits

| Task | Commit | Message |
| ---- | ------ | ------- |
| 1 | 9cb6119 | fix(14-09): make settings-integrations workflow executable with workstream threading |
| 2 | a344873 | test(14-09): add end-to-end settings workflow contract test |

## Self-Check: PASSED

- tests/14-settings-workflow-contract.test.cjs — FOUND
- oto/workflows/settings-integrations.md (config-new-project entry) — FOUND
- oto/commands/oto/settings-integrations.md (keyfile contract) — FOUND
- Commit 9cb6119 — FOUND
- Commit a344873 — FOUND
