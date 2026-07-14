---
phase: 15-exa-mcp-registration-all-three-runtimes
plan: 10
subsystem: integrations
tags: [exa, mcp, settings, consent, workstreams]

# Dependency graph
requires:
  - phase: 15-08
    provides: consent persistence and register/unregister installer flags
  - phase: 15-09
    provides: per-runtime mcp-status classifier and coherence warnings
provides:
  - per-runtime Exa MCP status and registration controls in settings-integrations
  - default-No global credential replacement and clearing confirmations
  - session-scoped workstream parity in native oto-sdk routing
  - live-approved Claude MCP registration and custom-directory uninstall round-trip
affects: [16-agent-guidance-hardening, settings-integrations, workstream-routing]

# Tech tracking
tech-stack:
  added: []
  patterns: [structured SDK result parsing, fingerprint-aware runtime actions, explicit global-secret consent]

key-files:
  created:
    - .oto/phases/15-exa-mcp-registration-all-three-runtimes/15-USER-SETUP.md
  modified:
    - oto/workflows/settings-integrations.md
    - tests/14-settings-workflow-contract.test.cjs
    - sdk/src/query/workstream.ts
    - sdk/src/query/workstream.test.ts
    - sdk/dist/query/workstream.js
    - .oto/config.json

key-decisions:
  - "Render native mcp-status output verbatim while using its structured runtimes array to gate actions."
  - "Require explicit default-No confirmation before globally shared key replacement or clearing."
  - "Preserve CJS session-scoped workstream routing semantics in the native SDK replacement path."

patterns-established:
  - "Runtime actions are offered only for detected runtimes and never take over user-owned entries."
  - "Global keyfile mutations disclose root/workstream impact before any secret command runs."

requirements-completed: [MCP-09, MCP-01]

# Metrics
duration: 13h 31m elapsed (human checkpoint included)
completed: 2026-07-14
---

# Phase 15 Plan 10: Settings Integrations and Live Registration Summary

**Per-runtime Exa MCP controls, explicit global-key consent, and a live-approved three-tool Claude registration with clean idempotency and uninstall symmetry**

## Performance

- **Duration:** 13h 31m elapsed (human checkpoint included)
- **Started:** 2026-07-14T02:28:00Z
- **Completed:** 2026-07-14T15:59:00Z
- **Tasks:** 2
- **Files modified:** 8 implementation/configuration files plus completion artifacts

## Accomplishments

- Replaced the broken runtime-specific `OTO_TOOLS` path with native `oto-sdk` workstream/config resolution while preserving session-scoped workstream behavior.
- Added verbatim per-runtime MCP status, detected-runtime-only Register/Unregister actions, and refusal to overwrite user-owned entries.
- Gated Replace and Clear behind exact global-scope disclosure and explicit default-No confirmation, with post-clear flag reconciliation guidance.
- Completed the live checkpoint: exact three-tool Claude surface, prompt persistence, no duplicate registration, custom-directory install/uninstall symmetry, and no key bytes in runtime or tracked project configuration.

## Task Commits

Each implementation outcome was committed atomically:

1. **Rule 3 deviation: Preserve native SDK session-scoped workstream routing** - `165fbd4` (fix)
2. **Task 1: Rewrite settings-integrations workflow sections** - `089c3e0` (feat)
3. **Task 2: Live end-to-end verification** - approved checkpoint, documented in the plan metadata commit

## Files Created/Modified

- `oto/workflows/settings-integrations.md` - renders MCP status and drives consent-safe runtime and secret actions.
- `tests/14-settings-workflow-contract.test.cjs` - executes the native SDK resolution block and pins the Phase 15 workflow contract.
- `sdk/src/query/workstream.ts` - preserves session-keyed pointer routing used by the previous CJS resolver.
- `sdk/src/query/workstream.test.ts` - verifies `CODEX_THREAD_ID` selection isolation.
- `sdk/dist/query/workstream.js` and maps - rebuilt distributable SDK handler.
- `.oto/config.json` - intentionally enables `exa_search` after the approved live-key setup.
- `.oto/phases/15-exa-mcp-registration-all-three-runtimes/15-USER-SETUP.md` - records completed external setup and verification.

## Workflow Eyeball Audit

- `oto/workflows/settings-integrations.md:107` captures `oto-sdk query mcp-status`; lines 111-118 explicitly render `$MCP_STATUS` verbatim with per-runtime examples and coherence warnings.
- Lines 180-204 place the global Replace disclosure and default-No confirmation before the `secret-set` instructions at lines 206-230.
- Lines 234-260 place the global Clear disclosure and default-No confirmation before `secret-clear` at lines 256-260.
- Lines 282-313 gate Register/Unregister by runtime status, refuse `user-owned`, and re-render status after actions.

## Decisions Made

- Used the native SDK's actual structured output rather than assuming `--raw` returned the old CJS scalar shape.
- Kept secret mutation confirmations separate for Replace and Clear so both destructive paths default to No.
- Preserved the user's intentional `exa_search: true` setting as part of the final tracked configuration.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Restored native SDK session-scoped workstream parity**
- **Found during:** Task 1 command-surface probe
- **Issue:** `oto-sdk query workstream get --raw` was registered but ignored session-scoped pointers such as `CODEX_THREAD_ID`, so replacing the CJS call would regress the existing WR-02 workflow contract.
- **Fix:** Ported the established CJS session-key selection, hashed temporary pointer path, validation, isolation, and cleanup semantics into the native SDK handler; rebuilt `sdk/dist`.
- **Files modified:** `sdk/src/query/workstream.ts`, `sdk/src/query/workstream.test.ts`, `sdk/dist/query/workstream.js` and maps.
- **Verification:** Focused Vitest session-pointer test, `npx tsc --noEmit`, executable root contract test, and full `npm test`.
- **Committed in:** `165fbd4`

**2. [Rule 1 - Workflow state] Restored the OTO state marker after SDK tracking updates**
- **Found during:** Plan completion tracking
- **Issue:** The existing state mutation handler rewrote `oto_state_version` to the stale `gsd_state_version` identifier and left the body phase label as executing while frontmatter was verifying.
- **Fix:** Restored `oto_state_version: 1.0` and aligned the body label to `VERIFYING` after all SDK state mutations completed.
- **Files modified:** `.oto/STATE.md`.
- **Verification:** Direct frontmatter/body inspection plus `oto-sdk query state.load` after the final edit.
- **Committed in:** plan metadata commit

---

**Total deviations:** 2 auto-fixed (1 blocking correctness issue, 1 workflow-state correction).  
**Impact on plan:** The minimal SDK parity repair prevents a workstream-routing regression introduced by the mandated native SDK migration, while the tracking correction preserves OTO's state contract; no unrelated behavior was changed.

## Issues Encountered

- The first sandboxed full-suite run stalled in the known network-dependent install-smoke tail. It was stopped and rerun with network access; the complete run passed 852 tests with zero failures and three skips.
- Native `workstream get --raw` and `config-path` return structured JSON, so the workflow parses their actual `{ active }` and `{ path }` shapes.

## User Setup Required

Completed during the human checkpoint. See [15-USER-SETUP.md](./15-USER-SETUP.md) for the verified Exa credential and registration checklist.

## Next Phase Readiness

- Phase 15's settings surface and live Claude registration path are approved and ready for independent phase verification.
- Phase 16 can consume the stable three-tool Exa MCP surface for runtime-neutral agent guidance and fallback hardening.

## Self-Check: PASSED

- Required completion artifacts exist.
- Implementation commits `165fbd4` and `089c3e0` are present.
- Focused contract, TypeScript, full root suite, live registration, uninstall symmetry, and secret-hygiene checks passed.

---
*Phase: 15-exa-mcp-registration-all-three-runtimes*
*Completed: 2026-07-14*
