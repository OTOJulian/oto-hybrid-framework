---
phase: 14-key-storage-reconciliation
plan: 04
subsystem: security
tags: [secrets, keyfiles, workflow, regression-guard, human-verification]

requires:
  - phase: 14-key-storage-reconciliation
    plan: 01
    provides: CJS keyfile storage, boolean-only config enforcement, and legacy migration
  - phase: 14-key-storage-reconciliation
    plan: 03
    provides: Native secret-set, secret-clear, and secret-status SDK commands
provides:
  - Keyfile-only Set/Replace/Clear guidance for /oto-settings-integrations
  - Permanent no-plaintext guard over tracked .oto files and integration config fields
  - Human-approved set, replace, rejection, clear, masking, and restoration loop
affects: [phase-15-exa-mcp-registration, settings-integrations, secret-hygiene]

tech-stack:
  added: []
  patterns: [terminal-to-process secret entry, masked status rendering, tracked-planning-file secret guard]

key-files:
  created:
    - tests/14-no-plaintext-guard.test.cjs
  modified:
    - oto/workflows/settings-integrations.md

key-decisions:
  - "Settings Set/Replace delegates key entry to the user's hidden terminal prompt; the workflow never receives secret material."
  - "The no-plaintext regression guard scans exactly git-tracked .oto files to protect the remote exfiltration surface without fixture false positives."

patterns-established:
  - "Search integration displays are sourced from secret-status and expose only flag, source, and masked last-four output."
  - "Tracked planning artifacts are checked for string-typed integration fields and key-shaped tokens in CI."

requirements-completed: [SECR-01, SECR-03, SECR-04]

duration: 39min
completed: 2026-07-10
---

# Phase 14 Plan 04: Settings Workflow and No-Plaintext Guard Summary

**The settings workflow now keeps API keys out of chat, argv, and tracked config while a permanent guard and approved human round trip lock in masked 0600 keyfile handling.**

## Performance

- **Duration:** 39 min
- **Started:** 2026-07-10T22:42:28Z (earliest verifiable Task 1 commit; execution resumed after the human checkpoint)
- **Completed:** 2026-07-10T23:20:41Z
- **Tasks:** 3
- **Files modified:** 2

## Accomplishments

- Replaced plaintext-to-config instructions with user-run `! oto-sdk query secret-set <slug>` guidance, `secret-clear` removal, and masked `secret-status` displays while preserving the unrelated review-model and agent-skill sections byte-for-byte.
- Added a three-test tracked-`.oto` guard that enforces boolean integration fields and rejects key-shaped plaintext without printing full matches in failures.
- Recorded the user's approved interactive round trip: hidden entry, mode 0600, masked set/replace status, both unsafe-write rejections, clean clear, restored config state, and approved workflow guidance.

## Task Commits

1. **Task 1: Rewrite settings integrations around keyfiles** - `4dbb4ea` (docs)
2. **Task 2: Add tracked `.oto` no-plaintext guard** - `469c985` (test)
3. **Task 3: Human-verify the set/replace/clear loop and masked displays** - verification-only checkpoint; user approved, no file commit

## Files Created/Modified

- `oto/workflows/settings-integrations.md` - Directs Set/Replace through a hidden terminal prompt, Clear through `secret-clear`, and all status tables through masked `secret-status` output.
- `tests/14-no-plaintext-guard.test.cjs` - Enforces boolean integration flags and scans tracked `.oto` files for string-typed fields and key-shaped plaintext with masked failure messages.

## Decisions Made

- Kept raw API keys entirely outside the workflow and conversation by delegating Set/Replace to the user's own hidden terminal prompt.
- Limited the plaintext scan to git-tracked `.oto` files, matching the phase's explicit remote-exfiltration boundary and avoiding unrelated fixture/documentation false positives.

## Human Verification Evidence

The user personally completed and approved the checkpoint; these are recorded results, not agent-replayed tests:

- Initial state had no `~/.oto/exa_api_key`, and `exa_search` was `false`.
- Interactive `secret-set exa` hid input, created a `-rw-------` keyfile, and showed only `****1234`; `secret-status exa` identified the keyfile source without revealing plaintext.
- The config diff contained only the boolean `exa_search: false` to `true` change.
- Replacement showed only `****9999`.
- String-valued `config-set` and key-in-argv `secret-set` attempts both failed with the intended safe guidance.
- `secret-clear exa` removed the keyfile, returned status to `Exa: disabled — no key detected`, and restored `.oto/config.json` to a clean diff.
- The user inspected and approved the workflow's 0600, stdin/TTY-only, boolean-only, and masked-output guidance.

## Verification

- `node --test tests/14-secrets-keyfile.test.cjs tests/14-config-boolean.test.cjs tests/14-no-plaintext-guard.test.cjs` - 22/22 pass.
- `npx vitest run src/query/secrets.test.ts src/query/config-mutation.test.ts src/query/config-query.test.ts src/query/secret-commands.test.ts` - 94/94 pass.
- Targeted registry contract - 1/1 pass; targeted CLI raw-rendering contracts - 2/2 pass.
- `npm run build` in `sdk/` - exits 0, with `sdk/dist` byte-clean afterward.
- Static acceptance checks pass: required `secret-*` and 0600 guidance is present; defect-era integration `config-set` instructions and plaintext-in-config claims are absent; workflow sections 2 and 3 are byte-identical to the pre-Task 1 version.
- Task commits `4dbb4ea` and `469c985` are ancestors of HEAD and contain only their declared files.

## Deviations from Plan

### Authorized Verification-Scope Adjustment

- **Instruction:** The continuation explicitly prohibited rerunning the broad root suite because its inherited long-running failures were already captured.
- **Adjustment:** Used the complete Phase 14 root test set, the directly relevant SDK secret/config tests, targeted registry/CLI contracts, static acceptance checks, and a fresh SDK build.
- **Impact:** No implementation scope changed; the verification evidence covers every Phase 14 behavior affected by this plan without replaying unrelated known failures.

**Total deviations:** 0 auto-fixed; 1 authorized verification-scope adjustment. **Impact:** Verification only; no product behavior or files were added beyond the plan.

## Issues Encountered

- An earlier broad root-suite run changed only the random `target` field in the already-dirty user-owned `reports/rebrand-dryrun.json`. That diff, `reports/rebrand-dryrun.md`, and `INTERVIEW-BRIEF-oto.md` were left untouched and unstaged during this continuation.
- No new execution issues were encountered.

## User Setup Required

None - the approved verification restored the original keyfile/config state.

## Next Phase Readiness

- Phase 14's key-storage contract is complete and ready for Phase 15 to consume when registering Exa across Claude Code, Codex, and Gemini.
- Phase 15 should record the transport/auth ADR before registration code lands, as required by the roadmap.

## Self-Check: PASSED

- Both task artifacts and this summary exist.
- Task commits `4dbb4ea` and `469c985` are present with no tracked deletions.
- Fresh scoped tests, static acceptance checks, and the SDK build passed before tracking updates.
- Protected user-owned paths remain unstaged.

---
*Phase: 14-key-storage-reconciliation*
*Completed: 2026-07-10*
