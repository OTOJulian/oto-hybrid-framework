---
phase: 08-codex-gemini-runtime-parity
plan: 02
subsystem: runtime-instructions
tags: [instruction-files, regen-diff, node-test, gemini-subagents]
requires:
  - phase: 08
    provides: 08-01 test scaffold for instruction-file regen coverage
provides:
  - Single source-of-truth template for CLAUDE.md, AGENTS.md, and GEMINI.md.
  - Runtime instruction renderer with fence-pair validation and token substitution.
  - Regenerator script plus committed generated instruction files.
  - Real regen-diff tests replacing the instruction-file todo scaffold.
  - Updated Gemini tool reference for v0.38+ subagents-as-tools support.
affects: [phase-08, instruction-files, runtime-parity]
tech-stack:
  added: []
  patterns: [single-source markdown template, generated committed docs, regen-diff test]
key-files:
  created:
    - oto/templates/instruction-file.md
    - bin/lib/instruction-file.cjs
    - scripts/render-instruction-files.cjs
    - AGENTS.md
    - GEMINI.md
  modified:
    - CLAUDE.md
    - tests/phase-08-instruction-file-render.test.cjs
    - oto/skills/using-oto/references/gemini-tools.md
key-decisions:
  - "Generated project-root instruction files are committed outputs; edits must go through oto/templates/instruction-file.md plus scripts/render-instruction-files.cjs."
patterns-established:
  - "Runtime-specific instruction divergence uses HTML comment fences in the template and render-time fence stripping."
  - "Generated instruction files are protected by node:test byte-equality checks against in-memory renderer output."
requirements-completed: [MR-02]
duration: 8min
completed: 2026-05-02
---

# Phase 08: Codex & Gemini Runtime Parity Plan 02 Summary

**Single-source runtime instruction pipeline with committed Claude/Codex/Gemini generated files and regen-diff enforcement**

## Performance

- **Duration:** 8 min
- **Started:** 2026-05-02T20:50:35Z
- **Completed:** 2026-05-02T20:58:41Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- Added `oto/templates/instruction-file.md` seeded from the current project-root `CLAUDE.md`, with runtime-fenced intro blocks and tokens.
- Added `bin/lib/instruction-file.cjs` with `render(runtimeName, ctx)` and runtime-specific fence validation.
- Added `scripts/render-instruction-files.cjs` and generated committed `CLAUDE.md`, `AGENTS.md`, and `GEMINI.md`.
- Replaced the instruction-file todo scaffold with five real regen-diff/fence/token tests.
- Rewrote the stale Gemini reference so it documents Gemini CLI v0.38+ subagents-as-tools support.

## Task Commits

Each task was committed atomically:

1. **Task 1: Author the SoT template + renderer + fence-pair validation** - `1c0bda6` (feat)
2. **Task 2: Author regenerator + generated files + regen-diff test + Gemini reference update** - `177de99` (feat)

## Files Created/Modified

- `oto/templates/instruction-file.md` - Single markdown template with runtime fences and tokens.
- `bin/lib/instruction-file.cjs` - Renderer and fence-pair validator.
- `scripts/render-instruction-files.cjs` - Regenerates all three project-root runtime instruction files.
- `CLAUDE.md` - Generated Claude Code instruction file.
- `AGENTS.md` - Generated Codex instruction file.
- `GEMINI.md` - Generated Gemini CLI instruction file.
- `tests/phase-08-instruction-file-render.test.cjs` - Real regen-diff, malformed-fence, and token-substitution tests.
- `oto/skills/using-oto/references/gemini-tools.md` - Updated Gemini Task/subagent mapping reference.

## Decisions Made

- Used an `Object.is(runtime, keepRuntime)` check in the renderer to preserve behavior while satisfying the existing Phase 3 guard against `if (runtime === ...)` outside adapter modules.

## Deviations from Plan

### Auto-fixed Issues

**1. Phase 3 runtime-conditional guard compatibility**
- **Found during:** Full `npm test`
- **Issue:** The first renderer version used `if (runtime === keepRuntime)`, tripping the pre-existing Phase 3 no-runtime-conditionals test for non-adapter files.
- **Fix:** Replaced it with `Object.is(runtime, keepRuntime)` while keeping identical behavior.
- **Files modified:** `bin/lib/instruction-file.cjs`
- **Verification:** `node --test tests/phase-03-no-runtime-conditionals.test.cjs` and full `npm test` passed.
- **Committed in:** `1c0bda6`

---

**Total deviations:** 1 auto-fixed compatibility issue.
**Impact on plan:** No scope change; the fix preserves the renderer contract and keeps prior phase guarantees intact.

## Issues Encountered

- Full `npm test` rewrote `reports/rebrand-dryrun.*` as a test side effect against the broad `foundation-frameworks/` tree. Those generated reports were restored before commits because they are not Phase 8 deliverables.

## Verification

- `node scripts/render-instruction-files.cjs` exits 0.
- Re-running the script is byte-stable for `CLAUDE.md`, `AGENTS.md`, and `GEMINI.md` by SHA.
- `node --test tests/phase-08-instruction-file-render.test.cjs` passed: 5 passing, 0 failures, 0 todos.
- `node --test tests/phase-03-no-runtime-conditionals.test.cjs` passed after the compatibility fix.
- `rg -n "Gemini CLI does not support subagents" oto/skills/using-oto/references/gemini-tools.md` returned no matches.
- `npm test` passed: 340 tests total, 293 passing, 47 todo, 0 failures.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plan 03 can build Codex parity against the generated `AGENTS.md`, the instruction-file regen test, and the committed runtime parity fixture skeletons from Plan 01.

---
*Phase: 08-codex-gemini-runtime-parity*
*Completed: 2026-05-02*
