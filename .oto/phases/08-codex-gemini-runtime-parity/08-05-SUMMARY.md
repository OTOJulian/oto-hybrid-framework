---
phase: 08-codex-gemini-runtime-parity
plan: 05
subsystem: runtime-matrix
tags: [runtime-parity, generated-docs, matrix, node-test]
requires:
  - phase: 08
    provides: 08-03 Codex runtime parity helpers and agent sandbox map
  - phase: 08
    provides: 08-04 Gemini runtime parity helpers and tool map
provides:
  - Runtime matrix source-of-truth with capability registry, command scanner, and markdown renderer.
  - Regenerator script for decisions/runtime-tool-matrix.md.
  - Generated runtime tool matrix covering tool maps, frontmatter dialects, capability gaps, hook events, Codex sandbox modes, and per-command runtime support.
  - Regen-diff and matrix-vs-code assertions replacing the plan-05 todo test stubs.
affects: [phase-08, runtime-parity, decisions, tests]
tech-stack:
  added: []
  patterns: [generated normative docs, adapter-export consistency tests, deterministic command scanning]
key-files:
  created:
    - bin/lib/runtime-matrix.cjs
    - scripts/render-runtime-matrix.cjs
    - decisions/runtime-tool-matrix.md
  modified:
    - tests/phase-08-runtime-matrix-render.test.cjs
key-decisions:
  - "The generated matrix uses ASCII PASS/FAIL cells rather than emoji so the generated artifact stays consistent with repo ASCII defaults."
  - "Per-command support scans nested `oto/commands/**/*.md` and renders command names as `/oto-*`, matching the current retained command layout."
  - "Matrix-vs-code consistency is enforced against `claudeToGeminiTools` and `runtime-codex.cjs::agentSandboxes` so the doc drifts only when the source code drifts."
patterns-established:
  - "Generated decision docs should start from code exports and be covered by a byte-equality regen test."
  - "New `bin/` helper source must avoid unsupported runtime bare-name literals because the Phase 3 scanner inspects all `bin/` files."
requirements-completed: [MR-03]
duration: 8min
completed: 2026-05-02
---

# Phase 08: Codex & Gemini Runtime Parity Plan 05 Summary

**Generated runtime tool matrix with code-backed consistency checks**

## Performance

- **Duration:** 8 min
- **Started:** 2026-05-02T21:20:56Z
- **Completed:** 2026-05-02T21:28:40Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Added `bin/lib/runtime-matrix.cjs` with the Phase 8 capability registry, recursive command scanner, per-command support evaluation, and deterministic markdown renderer.
- Added `scripts/render-runtime-matrix.cjs` and generated `decisions/runtime-tool-matrix.md`.
- The generated matrix now includes all five required sections: Claude to Codex to Gemini tool map, frontmatter dialects, capability gaps, hook event names plus sandbox modes, and per-command runtime support.
- Replaced the runtime matrix todo stubs with real tests for regen diff, Gemini tool map consistency, Codex sandbox consistency, and 100% green Codex/Gemini per-command support.

## Task Commits

Each task was committed atomically:

1. **Task 1: Author runtime matrix source** - `da42408` (feat)
2. **Task 2: Generate runtime tool matrix** - `82c6fe1` (docs)
3. **Task 2 tests: Add regen and consistency checks** - `5f79660` (test)

## Files Created/Modified

- `bin/lib/runtime-matrix.cjs` - Matrix source-of-truth, capability registry, command scanner, and renderer.
- `scripts/render-runtime-matrix.cjs` - Regenerator for `decisions/runtime-tool-matrix.md`.
- `decisions/runtime-tool-matrix.md` - Generated normative runtime matrix.
- `tests/phase-08-runtime-matrix-render.test.cjs` - Regen, matrix-vs-code, and coverage assertions.

## Decisions Made

- Used recursive command discovery under `oto/commands/` because the current command layout is `oto/commands/oto/*.md`, not flat.
- Kept the per-command support notes compact (`agents:N`, `tools:N`) so the matrix stays readable while still exposing scanner coverage.
- Added the required `// PHASE-9-CONSIDER:` marker on the capability registry to surface future descriptor-sync work.

## Deviations from Plan

### Auto-fixed Issues

**1. Matrix table spacing initially broke exact row assertions**
- **Found during:** `node --test tests/phase-08-runtime-matrix-render.test.cjs`.
- **Issue:** The renderer emitted `| AskUserQuestion |native |ask_user |`, which was readable markdown but failed exact matrix-vs-code row checks.
- **Fix:** Standardized markdown table joins to ` | ` spacing.
- **Files modified:** `bin/lib/runtime-matrix.cjs`
- **Verification:** Targeted runtime matrix test passed.
- **Committed in:** `da42408`

**2. Dry-run report side effects**
- **Found during:** Full `npm test`.
- **Issue:** The dry-run report tests rewrote `reports/rebrand-dryrun.*`.
- **Fix:** Restored both report files before staging commits because they are generated side effects, not Phase 8 deliverables.
- **Files modified:** None retained.

## Verification

- `node -e "const m = require('./bin/lib/runtime-matrix.cjs'); const cmds = m.scanCommands('.'); console.log(typeof m.renderMatrix, cmds.length, cmds[0].name);"` passed and scanned 76 commands.
- `node --test tests/phase-08-runtime-matrix-render.test.cjs` passed: 5 passing, 0 failures, 0 todos.
- `rg -n "test\\.todo" tests/phase-08-runtime-matrix-render.test.cjs` returned no matches.
- `rg -n "gsd-|superpowers-|cursor" bin/lib/runtime-matrix.cjs decisions/runtime-tool-matrix.md` returned no matches.
- `rg -n "Generated by scripts/render-runtime-matrix.cjs|\\| /oto-progress \\||\\| oto-executor \\| workspace-write \\|" decisions/runtime-tool-matrix.md` returned expected matches.
- `npm test` passed: 346 tests total, 337 passing, 9 todo, 0 failures.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plan 06 can proceed with runtime smoke tests. The matrix now gives MR-03 a generated, test-enforced reference for runtime parity coverage.

---
*Phase: 08-codex-gemini-runtime-parity*
*Completed: 2026-05-02*
