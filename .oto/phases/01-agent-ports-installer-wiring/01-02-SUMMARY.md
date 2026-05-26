---
phase: 01-agent-ports-installer-wiring
plan: 02
subsystem: installer
tags: [codex, sandbox, install-smoke, runtime-parity]
requires:
  - phase: 01-agent-ports-installer-wiring
    provides: restored agent files from plan 01
provides:
  - Codex sandbox assignments for the three restored agents
  - Updated retained-agent fixture and count assertions for 26 agents
  - Isolated Claude, Codex, and Gemini install-smoke evidence
affects: [installer, codex-runtime, phase-02, phase-03]
tech-stack:
  added: []
  patterns: [per-agent sandbox map, isolated config-dir smoke, adapter-level derived TOML checks]
key-files:
  created: []
  modified:
    - oto/bin/install.js
    - bin/lib/runtime-codex.cjs
    - tests/fixtures/phase-04/retained-agents.json
    - tests/phase-01-agent-audit.test.cjs
    - tests/phase-04-codex-sandbox-coverage.test.cjs
    - tests/phase-04-frontmatter-schema.test.cjs
    - tests/phase-04-rebrand-smoke.test.cjs
key-decisions:
  - "Updated both the legacy monolith sandbox map and the shipped split Codex adapter because the active CLI path uses bin/lib/runtime-codex.cjs."
patterns-established:
  - "When planning docs mention oto/bin/install.js, verify whether the shipped bin/install.js adapter path also needs the same runtime contract."
requirements-completed: [INST-01, INST-02]
duration: 35min
completed: 2026-05-18
---

# Phase 01 Plan 02 Summary

**The restored agents install across Claude, Codex, and Gemini, with Codex TOML sandbox modes locked per agent.**

## Performance

- **Duration:** 35 min
- **Completed:** 2026-05-18
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Added sandbox entries for `oto-doc-classifier`, `oto-doc-synthesizer`, and `oto-eval-auditor` to `oto/bin/install.js`.
- Added the same three entries to the actual shipped Codex adapter, `bin/lib/runtime-codex.cjs`.
- Updated retained-agent fixtures and count tests from 23 to 26 agents, and removed the restored agents from the dropped-agent leak list.
- Verified `bin/install.js install --claude`, `--codex`, and `--gemini` against isolated temp config dirs.

## Files Created/Modified

- `oto/bin/install.js` - Legacy monolith sandbox map includes the three restored agents.
- `bin/lib/runtime-codex.cjs` - Shipped Codex adapter emits the three restored agents' sandbox modes.
- `tests/fixtures/phase-04/retained-agents.json` - Retained set updated to 26 agents.
- `tests/phase-*.test.cjs` - Existing assertions updated to the new retained count and fixture-driven sandbox length.

## Deviations from Plan

### Auto-fixed Issues

**1. Updated the shipped Codex adapter in addition to the legacy monolith**
- **Issue:** Running `node oto/bin/install.js --claude --config-dir <tmp>` fails because that legacy monolith resolves `../package.json` relative to `oto/bin/`. The actual CLI entrypoint is `bin/install.js install ...`, which uses `bin/lib/runtime-codex.cjs`.
- **Fix:** Kept the planned `oto/bin/install.js` map edit and added the same sandbox assignments to `bin/lib/runtime-codex.cjs`, then ran smoke through `bin/install.js install`.
- **Verification:** Codex smoke created `oto-doc-classifier.toml`, `oto-doc-synthesizer.toml`, and `oto-eval-auditor.toml` with the expected `sandbox_mode` values.

## Issues Encountered

- The first combined smoke failed on the legacy `oto/bin/install.js` path. The failure was a plan-path drift, not an installer regression; the shipped entrypoint smoke passed after switching to `bin/install.js install`.

## Verification

- `node -c oto/bin/install.js`
- `node -c bin/lib/runtime-codex.cjs`
- Isolated runtime smoke:
  - Claude: `/var/folders/sh/b81x8yx935zfwjl0sv2z84mm0000gn/T/oto-smoke-claude.QP1R8S`
  - Codex: `/var/folders/sh/b81x8yx935zfwjl0sv2z84mm0000gn/T/oto-smoke-codex.kjzaXJ`
  - Gemini: `/var/folders/sh/b81x8yx935zfwjl0sv2z84mm0000gn/T/oto-smoke-gemini.JFlT0q`
- Focused tests passed: `node --test tests/phase-01-agent-audit.test.cjs tests/phase-04-rebrand-smoke.test.cjs tests/phase-04-frontmatter-schema.test.cjs tests/phase-04-codex-sandbox-coverage.test.cjs tests/phase-04-no-dropped-agents.test.cjs tests/phase-08-codex-install-wiring.test.cjs`

## Next Phase Readiness

Phase 2 can now port the executable `/oto-ingest-docs` and `/oto-eval-review` workflows against installed agent files and Codex sandbox coverage.

## Self-Check: PASSED

The three restored agents install for all supported runtimes, and Codex emits the required sandbox modes per agent.

---
*Phase: 01-agent-ports-installer-wiring*
*Completed: 2026-05-18*
