---
phase: 03-installer-fork-claude-adapter
plan: 07
subsystem: installer
tags: [node-test, installer, cli-shell, smoke-test, phase-closeout]

requires:
  - phase: 03-installer-fork-claude-adapter
    provides: Args, runtime detection, adapters, and install orchestrator helpers
provides:
  - User-facing `bin/install.js` CLI shell for install and uninstall dispatch
  - Real Wave 4 enforcement tests for bin shape, help output, unwanted runtimes, and runtime conditionals
  - Extended install smoke script with post-install Claude config-dir smoke
  - Phase 3 roadmap closeout at 7/7 plans complete
affects: [phase-03-installer, phase-04-core-workflows-agents-port, phase-10-ci-docs-release]

tech-stack:
  added: []
  patterns:
    - "Thin CommonJS bin shell delegates all runtime behavior to adapter and orchestrator modules"
    - "Install smoke resolves `oto` through the just-installed temporary npm prefix"
    - "Installer help output is treated as an enforced user contract"

key-files:
  created:
    - .planning/phases/03-installer-fork-claude-adapter/03-07-SUMMARY.md
  modified:
    - bin/install.js
    - scripts/install-smoke.cjs
    - tests/phase-03-bin-shell.test.cjs
    - tests/phase-03-help-output.test.cjs
    - tests/phase-03-no-unwanted-runtimes.test.cjs
    - tests/phase-03-no-runtime-conditionals.test.cjs
    - .planning/ROADMAP.md

key-decisions:
  - "`oto` with no args prints install-scoped help instead of defaulting to a real install."
  - "The install-smoke Phase 3 check uses the temporary npm prefix bin directory for PATH resolution."

patterns-established:
  - "No runtime-name conditionals outside runtime adapters; grep tests enforce the boundary."
  - "No unwanted runtime references in `bin/` or `scripts/install-smoke.cjs`; grep tests enforce the trimmed scope."
  - "Manual install smoke remains local until Phase 10 promotes it to CI."

requirements-completed: [INS-01, INS-02, INS-05]

duration: 10 min
completed: 2026-04-28
---

# Phase 03 Plan 07: Installer Shell and Phase Closeout Summary

**Thin `oto` installer shell with enforced three-runtime help, grep guardrails, and post-install Claude smoke coverage.**

## Performance

- **Duration:** 10 min
- **Started:** 2026-04-28T23:15:58Z
- **Completed:** 2026-04-28T23:25:28Z
- **Tasks:** 4/4
- **Files modified:** 7

## Accomplishments

- Replaced the Phase 2 `bin/install.js` stub with a 105-line executable shell that gates Node 22+, parses args, and dispatches to adapter-driven install/uninstall APIs.
- Replaced the final 19 Wave 4 TODO scaffolds with real enforcement tests; all 16 Phase 3 test files are now green with 94 passing test cases and zero TODOs.
- Extended `scripts/install-smoke.cjs` so the live installed `oto` binary runs `oto install --claude --config-dir <tmp>` and verifies state plus marker output.
- Marked Phase 3 and Plan 03-07 complete in `ROADMAP.md`.

## Phase 3 Success Criteria

| Criterion | Status | Evidence |
|-----------|--------|----------|
| SC#1 Claude config-dir install writes state + marker | Satisfied | Phase 3 integration tests and install-smoke extension |
| SC#2 Runtime behavior owned by adapters | Satisfied | Runtime-conditional grep test passes |
| SC#3 Config-dir resolution order works | Satisfied | Args and integration tests pass |
| SC#4 Eleven unwanted runtime names removed | Satisfied | Unwanted-runtime grep test passes |
| SC#5 `--all`, Codex, and Gemini best-effort contract | Satisfied | Install-all, adapter, and help-output tests pass |

## Task Commits

Each task was committed atomically:

1. **Task 1: Replace bin/install.js with thin shell + chmod +x verification** - `9d8fb56` (feat)
2. **Task 2: Fill phase-03-bin-shell + phase-03-help-output enforcement tests** - `bc1287e` (test)
3. **Task 3: Fill phase-03-no-unwanted-runtimes + phase-03-no-runtime-conditionals grep tests** - `82f0fec` (test)
4. **Task 4: Extend install-smoke.cjs + final green check + ROADMAP tickbox** - `6fed749` (test)

## Files Created/Modified

- `bin/install.js` - Thin CLI shell with Node 22 gate, help text, and adapter dispatch.
- `tests/phase-03-bin-shell.test.cjs` - Real shell shape and executable-bit assertions.
- `tests/phase-03-help-output.test.cjs` - Real help-output assertions for supported flags, 30-line/80-column budget, repo URL, and runtime labels.
- `tests/phase-03-no-unwanted-runtimes.test.cjs` - Grep-style enforcement over `bin/` and `scripts/install-smoke.cjs`.
- `tests/phase-03-no-runtime-conditionals.test.cjs` - Grep-style enforcement that excludes `runtime-*.cjs` adapters.
- `scripts/install-smoke.cjs` - Added post-install Claude config-dir smoke after global install validation.
- `.planning/ROADMAP.md` - Marked Phase 3 and Plan 03-07 complete.

## Verification

- `node --test tests/phase-03-*.test.cjs` - PASS, 94 tests, 0 fail, 0 TODO.
- `npm test` - PASS, 205 tests, 0 fail, 0 TODO.
- `node --check bin/install.js` - PASS.
- `node --check scripts/install-smoke.cjs` - PASS.
- `bin/install.js` metrics - 105 lines, executable bit set, help output 29 lines with max width 78.
- Unwanted runtime grep over `bin/install.js bin/lib/*.cjs scripts/install-smoke.cjs` - PASS, 0 hits.
- Runtime conditional grep over non-adapter installer files - PASS, 0 hits.

## Decisions Made

- `oto` with no args prints help. This keeps Phase 2's existing smoke invocation safe and matches the Phase 3 context note that help is shown when no flags are given.
- The smoke extension prefixes PATH with the temporary npm install's `bin` directory before invoking `spawnSync('oto', ...)`, so the check exercises the just-installed binary instead of any ambient system binary.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Resolved temporary-prefix PATH for install-smoke**
- **Found during:** Task 4 (Extend install-smoke.cjs + final green check + ROADMAP tickbox)
- **Issue:** The existing smoke harness installs with `npm install -g --prefix <tmp>`, which does not place `<tmp>/bin` on the current process PATH. A literal `spawnSync('oto', ...)` could fail or hit an unrelated ambient binary.
- **Fix:** Passed the temporary install bin directory into `runOtoInstallClaudeSmoke()` and prefixed PATH for that spawned process.
- **Files modified:** `scripts/install-smoke.cjs`
- **Verification:** `node --check scripts/install-smoke.cjs`; grep checks for `runOtoInstallClaudeSmoke`, `oto install --claude --config-dir`, and `Phase 3 smoke`.
- **Committed in:** `6fed749`

**Total deviations:** 1 auto-fixed (1 blocking). **Impact on plan:** No scope change; the smoke still invokes `oto install --claude --config-dir <tmp>` as required, but now reliably targets the just-installed binary.

## Issues Encountered

- Help output from the canonical interface needed slight wording and line splitting to satisfy the required 30-line / 80-column budget. The content constraints remain satisfied.

## Known Stubs

None. Stub scan found only the historical `ROADMAP.md` description of Plan 03-01's completed `t.todo()` scaffolds, not an active implementation or test stub in this plan.

## Threat Flags

None. This plan touched the expected argv/help/smoke trust surfaces from the plan threat model and introduced no additional network endpoint, auth path, schema boundary, or runtime file-access pattern beyond the planned smoke invocation.

## Manual Verification Status

Pending user run before `/gsd-verify-work`: `node scripts/install-smoke.cjs`.

## Next Phase Readiness

Phase 3 is closed and ready for `/gsd-verify-work` plus the manual install smoke. Phase 4 can fill `oto/commands/` and `oto/agents/`; the installer plumbing is in place and should not need rework for those payload directories.

## Self-Check: PASSED

- Summary file exists at `.planning/phases/03-installer-fork-claude-adapter/03-07-SUMMARY.md`.
- Modified files exist: `bin/install.js`, `scripts/install-smoke.cjs`, the four Wave 4 test files, and `.planning/ROADMAP.md`.
- Task commits found in git history: `9d8fb56`, `bc1287e`, `82f0fec`, `6fed749`.

---
*Phase: 03-installer-fork-claude-adapter*
*Completed: 2026-04-28*
