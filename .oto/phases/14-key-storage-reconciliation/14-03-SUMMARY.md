---
phase: 14-key-storage-reconciliation
plan: 03
subsystem: security
tags: [secrets, sdk, cli, keyfiles, vitest]

requires:
  - phase: 14-key-storage-reconciliation
    plan: 02
    provides: TypeScript keyfile helpers and boolean-only SDK config contract
provides:
  - Native secret-set, secret-clear, and secret-status SDK query commands
  - Stdin-only secret entry with silent TTY prompting and argv rejection
  - Masked human-readable CLI status backed by structured query data
  - Rebuilt committed SDK dist containing the Phase 14 secret storage surface
affects: [14-04, phase-15-exa-mcp-registration]

tech-stack:
  added: []
  patterns: [stdin-only secret ingestion, structured query data with optional raw CLI display, guarded live secret smoke]

key-files:
  created:
    - sdk/src/query/secret-commands.ts
    - sdk/src/query/secret-commands.test.ts
    - sdk/dist/query/secret-commands.js
  modified:
    - sdk/src/query/index.ts
    - sdk/src/query/registry.test.ts
    - sdk/src/cli.ts
    - sdk/src/cli.test.ts
    - sdk/src/query/utils.ts
    - sdk/dist/**

key-decisions:
  - "Secret values enter through stdin or a muted TTY prompt only; argv and handler output remain plaintext-free."
  - "Native query handlers may provide optional raw display text while preserving structured data for programmatic consumers."

patterns-established:
  - "Secret command handlers return masks and metadata only; raw API keys never leave the stdin-to-keyfile path."
  - "Live secret smoke tests guard and restore both the user's keyfile and tracked config flag through an exit trap."

requirements-completed: [SECR-01, SECR-04]

duration: 14min
completed: 2026-07-10
---

# Phase 14 Plan 03: Secret CRUD Command Surface Summary

**Native SDK secret commands now set 0600 keyfiles from stdin, clear keys honestly, and render masked source status through the live oto-sdk shim.**

## Performance

- **Duration:** 14 min
- **Started:** 2026-07-10T22:16:50Z
- **Completed:** 2026-07-10T22:31:28Z
- **Tasks:** 2
- **Files modified:** 34

## Accomplishments

- Added `secret-set`, `secret-clear`, and `secret-status` handlers for Exa, Brave, and Firecrawl with allowlisted slugs, stdin-only key entry, 0600 keyfiles, boolean config flips, and masked output.
- Registered all three handlers in the native SDK registry and exposed exact three-line status output through both `node bin/oto-sdk.js` and the installed live shim.
- Rebuilt and committed the complete Phase 14 SDK dist delta, including Plan 02's intentionally deferred helper/config output and Plan 03's command/CLI output.
- Smoke-proved set, argv rejection, clear, permission mode, and restoration without leaving a dummy key, backup file, or `.oto/config.json` diff.

## Task Commits

Each task followed an atomic RED/GREEN sequence:

1. **Task 1 RED: Secret command behavior tests** - `409cbcd` (test)
2. **Task 1 GREEN: Secret CRUD query handlers** - `3c57a61` (feat)
3. **Task 2 RED: Native registry contract** - `862de56` (test)
4. **Task 2 RED: Raw CLI query rendering regression** - `4a90a09` (test)
5. **Task 2 GREEN: Registry wiring, CLI rendering, and rebuilt dist** - `8105d07` (feat)

## Files Created/Modified

- `sdk/src/query/secret-commands.ts` - Reads secrets from piped stdin or a silent TTY, writes/deletes keyfiles, flips flags, heals permissions, and returns masked status.
- `sdk/src/query/secret-commands.test.ts` - Thirteen isolated tests for input validation, set/clear semantics, source precedence, masking, and mode healing.
- `sdk/src/query/index.ts` - Registers all three commands and includes them in the native mutation command set.
- `sdk/src/query/registry.test.ts` - Locks the three registry links and command-set membership.
- `sdk/src/cli.ts` - Renders a handler's optional masked raw display while keeping structured data available.
- `sdk/src/cli.test.ts` - Covers raw display and the ordinary JSON fallback.
- `sdk/src/query/utils.ts` - Adds the optional `raw` field to the shared `QueryResult` contract.
- `sdk/dist/**` - Rebuilt committed JavaScript, declarations, and source maps for the Phase 14 SDK delta.

## Decisions Made

- Preserved the query registry's structured `data` contract and added an optional `raw` representation rather than making secret status a CLI-only side effect.
- Healed a keyfile before source detection so loose permissions are repaired even when an environment variable shadows that file.

## TDD Gate Compliance

| Task | RED | GREEN | Refactor |
|------|-----|-------|----------|
| Secret handlers | `409cbcd` (module absent; expected failure) | `3c57a61` (13/13 pass) | Not needed |
| Registry + live output | `862de56` (registry links absent) + `4a90a09` (raw renderer absent) | `8105d07` (3/3 targeted contract tests + build/live smoke pass) | Not needed |

## Verification

- `npx vitest run src/query/secret-commands.test.ts` - 13/13 pass.
- Targeted registry contract - 1/1 pass; targeted CLI raw-rendering contract - 2/2 pass.
- `npm run build` - exits 0, and a second post-commit build leaves `sdk/dist` byte-clean.
- Static acceptance checks - all handler phrases, registry links, mutation-set membership, and `sdk/dist/query/secret-commands.js` are present.
- Live shim - `~/.local/bin/oto-sdk` resolves to this repo's `bin/oto-sdk.js`; its output matches the direct node shim and contains exactly Exa, Brave, and Firecrawl status lines.
- Guarded live round trip - piped set created mode 0600 and set `exa_search: true`; argv set exited 10; clear removed the file and set the flag false; restoration left no key/backup and no tracked config diff.
- Broad SDK suite - 1191/1468 pass and 277 fail, exactly the supplied pre-existing failure count; the 16 new Plan 14-03 tests account for the pass-count increase from the 1175-pass baseline.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added native raw query-result rendering**

- **Found during:** Task 2 live `secret-status` probe.
- **Issue:** The handler returned the plan's three-line `raw` display, but the existing CLI discarded it and always serialized `result.data`, producing JSON instead of the required masked lines.
- **Fix:** Added an optional `QueryResult.raw` contract and a narrow CLI renderer that honors it when `--pick` is not used; added RED coverage before implementation.
- **Files modified:** `sdk/src/query/utils.ts`, `sdk/src/cli.ts`, `sdk/src/cli.test.ts`, generated `sdk/dist/cli*` and `sdk/dist/query/utils*`.
- **Verification:** Two targeted renderer tests, fresh SDK build, direct-node/live-shim parity, and exact three-line acceptance probe.
- **Committed in:** `4a90a09` (RED) and `8105d07` (GREEN).

---

**Total deviations:** 1 auto-fixed (1 missing critical).
**Impact on plan:** The narrow shared result contract was required to make the plan's live CLI output achievable; structured consumers remain unchanged and no unrelated behavior was altered.

## Issues Encountered

- The plan names `/usr/local/bin/oto-sdk`, while this machine's installed shim is `~/.local/bin/oto-sdk`; the actual shim resolves to this checkout and passed every live probe.
- The broad SDK suite retains 277 known `.planning`/golden-parity baseline failures. The failure count did not increase, and all Plan 14-03 scoped tests pass.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 14-04 can now rewrite `/oto-settings-integrations` around the live stdin-only set/replace/clear/status commands.
- Phase 15 can consume the canonical environment-or-keyfile source contract without reading secrets from tracked config.
- No blockers remain for the final Phase 14 plan.

## Self-Check: PASSED

- All created source/dist artifacts exist.
- All five RED/GREEN task commits are present.
- Protected user-owned working-tree changes remain unstaged and untouched.

---
*Phase: 14-key-storage-reconciliation*
*Completed: 2026-07-10*
