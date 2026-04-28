---
phase: 03-installer-fork-claude-adapter
plan: 05
subsystem: installer
tags: [node-test, runtime-adapters, claude, codex, gemini]

requires:
  - phase: 03-installer-fork-claude-adapter
    provides: Marker helper, Wave 0 adapter test scaffolds, and prior installer helper patterns
provides:
  - Claude, Codex, and Gemini runtime adapter modules
  - Descriptor plus lifecycle hook contract for all three supported runtimes
  - Real 25-test adapter contract suite with zero TODO test count
affects: [phase-03-installer, phase-03-install-orchestrator, phase-05-hooks, phase-08-runtime-parity]

tech-stack:
  added: []
  patterns:
    - "CommonJS runtime adapters exporting one module.exports object each"
    - "Adapter renderers receive otoVersion through ctx.otoVersion"
    - "Codex/Gemini Phase 3 parity gaps are source-visible TODO markers verified by tests"

key-files:
  created:
    - bin/lib/runtime-claude.cjs
    - bin/lib/runtime-codex.cjs
    - bin/lib/runtime-gemini.cjs
  modified:
    - tests/phase-03-runtime-claude.test.cjs
    - tests/phase-03-runtime-codex.test.cjs
    - tests/phase-03-runtime-gemini.test.cjs

key-decisions:
  - "Adapters remain pure: package version is passed via ctx.otoVersion rather than requiring package.json inside adapter modules."
  - "Codex and Gemini transforms intentionally remain identity functions at Phase 3, with exact Phase 5/8 TODO markers for later parity work."

patterns-established:
  - "Each runtime adapter owns runtime-specific filenames, settings format, instruction rendering, and install callbacks."
  - "Adapter tests assert both behavior and source markers so planned stubs cannot silently look complete."

requirements-completed: [INS-02, INS-05]

duration: 8 min
completed: 2026-04-28
---

# Phase 03 Plan 05: Runtime Adapter Summary

**Claude, Codex, and Gemini runtime adapters with descriptor metadata, lifecycle hooks, and 25 passing contract tests.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-04-28T22:49:22Z
- **Completed:** 2026-04-28T22:57:41Z
- **Tasks:** 3/3
- **Files modified:** 6

## Accomplishments

- Added `runtime-claude.cjs`, `runtime-codex.cjs`, and `runtime-gemini.cjs` as single-object CommonJS adapters.
- Replaced all 25 Wave 0 adapter TODO tests with real assertions.
- Kept Claude as the canonical happy path while labeling Codex/Gemini as best-effort until Phase 8.
- Added exact source-visible Phase 5/8 TODO markers for the intentionally deferred Codex/Gemini work.

## Descriptor Table

| Runtime | Env var | Default config dir | Instruction file | Settings file | Settings format | Phase 3 transform status |
|---------|---------|--------------------|------------------|---------------|-----------------|--------------------------|
| Claude | `CLAUDE_CONFIG_DIR` | `.claude` | `CLAUDE.md` | `settings.json` | `json` | Canonical identity |
| Codex | `CODEX_HOME` | `.codex` | `AGENTS.md` | `config.toml` | `toml` | Identity with Phase 5/8 TODO markers |
| Gemini | `GEMINI_CONFIG_DIR` | `.gemini` | `GEMINI.md` | `settings.json` | `json` | Identity with Phase 5/8 TODO markers |

All adapters expose `renderInstructionBlock`, `transformCommand`, `transformAgent`, `transformSkill`, `mergeSettings`, `onPreInstall`, and `onPostInstall`.

## Task Commits

Each TDD gate was committed atomically:

1. **Task 1 RED: add failing Claude runtime adapter tests** - `2ed49f3` (test)
2. **Task 1 GREEN: implement Claude runtime adapter** - `86cc969` (feat)
3. **Task 2 RED: add failing Codex runtime adapter tests** - `01deab5` (test)
4. **Task 2 GREEN: implement Codex runtime adapter** - `82fbf44` (feat)
5. **Task 3 RED: add failing Gemini runtime adapter tests** - `0051533` (test)
6. **Task 3 GREEN: implement Gemini runtime adapter** - `1ea10cf` (feat)

## Files Created/Modified

- `bin/lib/runtime-claude.cjs` - Claude descriptor, stable instruction block, identity transforms, marker warning callback, and deterministic post-install summary.
- `bin/lib/runtime-codex.cjs` - Codex descriptor, best-effort instruction block, identity transforms, exact Phase 5/8 TODO markers, marker warning callback, and post-install summary.
- `bin/lib/runtime-gemini.cjs` - Gemini descriptor, best-effort instruction block, identity transforms, exact Phase 5/8 TODO markers, marker warning callback, and post-install summary.
- `tests/phase-03-runtime-claude.test.cjs` - Ten real assertions covering Claude descriptor fields, lifecycle hooks, identity behavior, and render snapshot.
- `tests/phase-03-runtime-codex.test.cjs` - Eight real assertions covering Codex descriptor fields, identity behavior, TODO marker source scans, and best-effort label.
- `tests/phase-03-runtime-gemini.test.cjs` - Seven real assertions covering Gemini descriptor fields, identity behavior, TODO marker source scans, and best-effort label.

## Verification

- `node --test tests/phase-03-runtime-claude.test.cjs tests/phase-03-runtime-codex.test.cjs tests/phase-03-runtime-gemini.test.cjs` - PASS, 25 tests, 0 fail, 0 TODO.
- `rg -n "t\\.todo|todo:" tests/phase-03-runtime-*.test.cjs` - PASS, no `node:test` TODO scaffolds remain.
- `rg -n "if \\(runtime ===" bin/lib/runtime-*.cjs` - PASS, no runtime branch conditionals inside adapter files.
- `rg -n "^module\\.exports = \\{" bin/lib/runtime-*.cjs` - PASS, all three adapters export a single object.
- `rg -n "exports\\.|module\\.exports\\.[A-Za-z_]" bin/lib/runtime-*.cjs` - PASS, no named export assignments.
- `rg -n "(opencode|kilo|cursor|windsurf|antigravity|augment|trae|qwen|codebuddy|cline|copilot)" bin/lib/runtime-*.cjs` - PASS, no unwanted runtime references.
- `git diff -- package.json` - PASS, package dependencies unchanged.

## Decisions Made

- Followed the detailed task action over the stale frontmatter key-link note by keeping adapters pure: `ctx.otoVersion` supplies the version for render output, and no adapter requires `package.json`.
- Preserved the Codex and Gemini Phase 3 stubs as explicit source TODO markers, because the plan intentionally defers TOML/settings merge and runtime parity transforms to Phase 5 and Phase 8.

## Deviations from Plan

None - plan executed exactly as written.

**Total deviations:** 0 auto-fixed. **Impact on plan:** No scope change.

## Issues Encountered

- The plan frontmatter still mentioned a `package.json` require key-link, while the task action explicitly required `ctx.otoVersion` and no adapter-side package require. Execution followed the task action, keeping adapters pure.

## Known Stubs

- `bin/lib/runtime-codex.cjs:33` - `// TODO Phase 8: Codex frontmatter parity (convertClaudeAgentToCodexAgent equivalent)` intentionally marks deferred Codex agent-frontmatter conversion.
- `bin/lib/runtime-codex.cjs:36` - `// TODO Phase 5: real TOML manipulation via bin/lib/codex-toml.cjs` intentionally marks deferred Codex settings merge.
- `bin/lib/runtime-gemini.cjs:32` - `// TODO Phase 8: Gemini command transform` intentionally marks deferred Gemini command transform.
- `bin/lib/runtime-gemini.cjs:34` - `// TODO Phase 8: Gemini tool-name remap parity (convertClaudeToGeminiTools equivalent)` intentionally marks deferred Gemini agent/tool parity.
- `bin/lib/runtime-gemini.cjs:37` - `// TODO Phase 5: Gemini settings.json merge` intentionally marks deferred Gemini settings merge.
- `tests/phase-03-runtime-codex.test.cjs` and `tests/phase-03-runtime-gemini.test.cjs` contain TODO strings only as source-scan assertions for these required adapter markers; they do not contain `t.todo()` scaffolds.

## Threat Flags

None. The adapter `onPreInstall` file-read path and render output were both covered by the plan threat model.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready for `03-06-PLAN.md`. The install orchestrator can now dispatch through descriptor fields and lifecycle hooks for Claude, Codex, and Gemini without runtime conditionals.

## Self-Check: PASSED

- Summary file exists at `.planning/phases/03-installer-fork-claude-adapter/03-05-SUMMARY.md`.
- Created adapter files exist: `bin/lib/runtime-claude.cjs`, `bin/lib/runtime-codex.cjs`, `bin/lib/runtime-gemini.cjs`.
- Task commits found in git history: `2ed49f3`, `86cc969`, `01deab5`, `82fbf44`, `0051533`, `1ea10cf`.

---
*Phase: 03-installer-fork-claude-adapter*
*Completed: 2026-04-28*
