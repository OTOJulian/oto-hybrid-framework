---
phase: 15-exa-mcp-registration-all-three-runtimes
plan: 09
subsystem: integrations
tags: [exa, mcp, status, doctor, sdk]

requires:
  - phase: 15-exa-mcp-registration-all-three-runtimes
    provides: runtime MCP adapters, stored ownership fingerprints, and canonical Exa key detection
provides:
  - Six-state live Exa MCP registration classification across Claude, Codex, and Gemini
  - Shared coherence warnings in oto doctor
  - PATH-wired oto-sdk query mcp-status command with rebuilt distribution
affects: [15-10, settings-integrations, doctor, mcp-status]

tech-stack:
  added: []
  patterns: [live-config plus fingerprint classification, CJS-SDK mirrored semantics, raw query display alongside structured data]

key-files:
  created:
    - tests/15-mcp-status.test.cjs
    - sdk/src/query/mcp-status.ts
    - sdk/src/query/mcp-status.test.ts
  modified:
    - bin/lib/mcp-register.cjs
    - bin/lib/doctor.cjs
    - tests/260616-muv-doctor.test.cjs
    - sdk/src/query/index.ts
    - sdk/dist/query/index.js

key-decisions:
  - "Registration status is read-only and requires live-entry equality with the stored install fingerprint before claiming oto ownership."
  - "Runtime config targets use the same environment-override resolution as registration, including Claude's relocated .claude.json."
  - "Doctor and SDK status expose static paths and classifications only; key material is never read into output."

patterns-established:
  - "Status surfaces classify ownership from live config plus stored-copy fingerprints, never from state alone."
  - "Human-facing SDK status uses QueryResult.raw while structured consumers receive runtimes and warnings in data."

requirements-completed: [MCP-09]

duration: 10 min
completed: 2026-07-14
---

# Phase 15 Plan 09: Exa MCP Registration Status Summary

**Six-state live Exa registration status with environment-aware runtime targets, shared doctor coherence warnings, and a PATH-wired SDK query**

## Performance

- **Duration:** 10 min
- **Started:** 2026-07-14T02:17:42Z
- **Completed:** 2026-07-14T02:27:42Z
- **Tasks:** 3
- **Files modified:** 14

## Accomplishments

- Added `not-installed`, `not-registered`, `oto-managed`, `user-owned`, `drifted`, and `missing-but-expected` classification against each runtime's live config plus `.install.json` fingerprint.
- Honored `CLAUDE_CONFIG_DIR`, `CODEX_HOME`, and `GEMINI_CONFIG_DIR`, including Claude's special `.claude.json` target, with malformed-input tolerance.
- Extended `oto doctor` with per-runtime Exa status and the two shared D-10 coherence warnings.
- Added and registered `oto-sdk query mcp-status`, independently mirrored the CJS semantics, and rebuilt committed SDK dist artifacts.

## Task Commits

Each task was committed atomically:

1. **Task 1: CJS classifier + coherence in mcp-register.cjs**
   - `df247f9` - RED classifier matrix
   - `a46da98` - GREEN classifier and coherence helpers
2. **Task 2: oto doctor MCP section** - `06262f1`
3. **Task 3: SDK mcp-status query command + rebuild**
   - `364f1d7` - RED SDK mirror tests
   - `4b57be8` - GREEN query handler, registry wiring, and rebuilt dist

## Files Created/Modified

- `bin/lib/mcp-register.cjs` - Runtime target resolution, live classifier, and shared coherence helper.
- `bin/lib/doctor.cjs` - Per-runtime MCP status and coherence output in `oto doctor`.
- `tests/15-mcp-status.test.cjs` - Three-runtime classifier, ownership, malformed-input, override, and warning matrix.
- `tests/260616-muv-doctor.test.cjs` - Doctor MCP status regression coverage.
- `sdk/src/query/mcp-status.ts` - Independent SDK mirror and query handler.
- `sdk/src/query/mcp-status.test.ts` - SDK six-state and coherence regression suite.
- `sdk/src/query/index.ts` - Native `mcp-status` registration.
- `sdk/dist/query/{index,mcp-status}.*` - Rebuilt distributable JavaScript, declarations, and maps.

## Decisions Made

- External Codex `[mcp_servers.exa]` tables always classify as user-owned, even if an OTO marker block is also present.
- Malformed JSON/JSONC is tolerated as no live entry with `detail: unparseable`; status and doctor never crash on user-edited config.
- Only `oto-managed` and `drifted` registrations trigger the missing-key warning, because a user-owned registration is not evidence of an OTO-managed key contract.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Restored the OTO state-version marker after workflow mutations**

- **Found during:** Plan tracking update
- **Issue:** The state mutation SDK rewrote `.oto/STATE.md` from `oto_state_version` to the obsolete `gsd_state_version`, which breaks the repository's Phase 13 root guard.
- **Fix:** Restored the workflow-owned frontmatter marker after all SDK tracking mutations completed.
- **Files modified:** `.oto/STATE.md`
- **Verification:** The final root suite and direct marker check pass.
- **Committed in:** Plan metadata commit

---

**Total deviations:** 1 auto-fixed (1 blocking workflow-state correction).  
**Impact on plan:** No production scope expansion; the repair preserves the repository's established OTO state contract.

## Issues Encountered

- The sandboxed root suite stalled in its known network-dependent install-smoke tail. It was stopped and rerun outside the restricted network sandbox, where the complete suite exited 0.
- The full SDK suite retains its pre-existing baseline debt. The fresh run reported 40 failed files / 266 failed tests / 1305 passed tests versus the Phase 14 union baseline of 41 files / 268 failed tests; a per-file comparison found zero offenders.

## Verification

- `node --test tests/15-mcp-status.test.cjs tests/260616-muv-doctor.test.cjs` - 34/34 passed.
- `cd sdk && npx tsc --noEmit && npx vitest run src/query/mcp-status.test.ts` - typecheck passed; 10/10 focused tests passed.
- `node sdk/dist/cli.js query mcp-status` - exited 0 and printed all three runtime status lines.
- Full SDK baseline comparison - 40 failed files / 266 failed tests / 1305 passed tests; zero files absent from or above the authoritative union baseline.
- `node --test --test-concurrency=4 --test-reporter=dot tests/*.test.cjs` - complete root suite exited 0.
- `git diff --check` - passed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 15-10 can consume `oto-sdk query mcp-status` directly from PATH for truthful settings summaries and runtime registration actions.
- No plan-specific blockers remain.

## Self-Check: PASSED

- All declared source, test, and rebuilt dist artifacts exist.
- All task commits are present in repository history.
- Every task acceptance criterion and plan-level verification command passed or, for the known-red SDK full suite, remained within its authoritative baseline with zero offenders.

---
*Phase: 15-exa-mcp-registration-all-three-runtimes*
*Completed: 2026-07-14*
