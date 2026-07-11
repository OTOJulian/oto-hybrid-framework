---
status: gaps_found
phase: 14-key-storage-reconciliation
score: "0/4"
verified_at: "2026-07-11T00:03:37Z"
verified: "2026-07-11T00:03:37Z"
re_verification: false
overrides_applied: 0
requirements:
  SECR-01: blocked
  SECR-02: blocked
  SECR-03: blocked
  SECR-04: blocked
gaps:
  - truth: "Committed integration config is boolean-only across both write implementations"
    status: failed
    reason: >-
      Both registered config-new-project implementations merge caller choices or global defaults
      after constructing boolean defaults and write the merged object without integration-value
      validation. Fresh isolated CJS and SDK probes exited successfully and persisted a synthetic
      exa_search string without creating a keyfile.
    artifacts:
      - path: "oto/bin/lib/config.cjs"
        issue: "buildNewProjectConfig merges unvalidated defaults and choices at lines 143-168; cmdConfigNewProject writes the result at lines 209-215."
      - path: "sdk/src/query/config-mutation.ts"
        issue: "configNewProject merges unvalidated defaults and choices at lines 411-441 and writes at line 443."
    missing:
      - "Validate every integration field in the fully merged new-project config before either write."
      - "Reject caller strings with sanitized errors; migrate or reject trusted legacy global-default strings."
      - "Add CJS and SDK choice/global-default regression tests for all three integrations."
  - truth: "Every legacy integration string self-heals to a 0600 keyfile and can never leave a read or mutation output"
    status: failed
    reason: >-
      SDK config-get suppresses migration failures and returns the original string; CJS and SDK
      workstream loading can parse or fall back to an unmigrated root config; and boolean config-set
      overwrites a legacy string without creating a keyfile. The SDK mutation result also returns
      that legacy plaintext as previousValue.
    artifacts:
      - path: "sdk/src/query/config-query.ts"
        issue: "Migration exceptions are swallowed at line 96 before the original value is returned at line 125."
      - path: "sdk/src/config.ts"
        issue: "Only the requested workstream path is migrated at lines 157-162; root fallback at lines 170-174 is not migrated."
      - path: "oto/bin/lib/core.cjs"
        issue: "Root config is parsed at lines 327-334 before only the workstream config path is migrated at lines 337-341."
      - path: "sdk/src/query/config-mutation.ts"
        issue: "configSet reads legacy previousValue and returns it at lines 225-252 without migration or secret scrubbing."
      - path: "oto/bin/lib/config.cjs"
        issue: "cmdConfigSet overwrites a legacy integration string without first migrating it."
    missing:
      - "Fail closed for sensitive config-get values when migration cannot complete."
      - "Resolve and migrate every effective root/workstream config layer before parsing, fallback, or merge."
      - "Migrate legacy values before config mutation and never return a secret previousValue."
      - "Add migration-failure, root-plus-workstream, and legacy-overwrite tests in both implementations."
  - truth: "Secret set and clear cannot leave split state or destroy an existing credential when config mutation fails"
    status: failed
    reason: >-
      secret-set writes or replaces the keyfile before configSet, while secret-clear deletes the
      keyfile before configSet. Fresh EACCES and EISDIR fault probes confirmed that a failed set
      leaves a 0600 keyfile behind and a failed clear irreversibly removes the prior keyfile.
    artifacts:
      - path: "sdk/src/query/secret-commands.ts"
        issue: "Keyfile mutation precedes config mutation at lines 121-123 and 149-152 with no compensation."
    missing:
      - "Validate the config destination first and implement a compensating transaction that restores the prior keyfile/config state on failure."
      - "Add create, replace, and clear fault-injection tests."
  - truth: "/oto-settings-integrations executes end to end against the active config with one consistent secure-storage contract"
    status: failed
    reason: >-
      The workflow's first command invokes config-ensure-section without its required section and
      exits 10, so the key-management flow is not reachable as written. It computes OTO_CONFIG_PATH
      but never uses it or passes --ws to later SDK commands. The shipped command wrapper also still
      says keys are stored plaintext in config.json and written via config-set, contradicting the
      rewritten workflow.
    artifacts:
      - path: "oto/workflows/settings-integrations.md"
        issue: "Lines 44-49 call config-ensure-section with no argument; later commands do not use the computed active config path or --ws."
      - path: "sdk/src/query/config-mutation.ts"
        issue: "configEnsureSection requires args[0] and throws at lines 460-464."
      - path: "oto/commands/oto/settings-integrations.md"
        issue: "Lines 18-20 and 35-43 retain the old plaintext/config-set contract."
    missing:
      - "Use a valid config-initialization command or supply the required section."
      - "Thread the resolved workstream through every status/set/clear/config command."
      - "Update the shipped command wrapper and add an end-to-end workflow contract test."
---

# Phase 14: Key Storage Reconciliation Verification Report

**Phase goal:** Integration API keys live only in `~/.oto/<integration>_api_key`
(mode 0600) or environment variables; committed `.oto/config.json` holds
booleans only, enforced in both write paths with self-healing migration.

**Verdict:** `gaps_found`. The phase contains substantive, working happy-path
primitives, but none of the four roadmap success criteria holds end to end. The
four critical review findings were independently reproduced, and verification
found additional user-surface and legacy-overwrite blockers.

## Goal Achievement

| # | Roadmap success criterion | Status | Fresh evidence |
|---|---|---|---|
| 1 | `/oto-settings-integrations` sets Exa through stdin to a 0600 keyfile and leaves only `exa_search: true` in tracked config | **FAILED** | Direct `secret-set` works in isolation, but the workflow stops immediately: `node bin/oto-sdk.js query config-ensure-section` exited 10 with `Usage: config-ensure-section <section>`. The shipped command wrapper also advertises plaintext config storage. |
| 2 | Strings for all three integration flags are rejected through both write implementations | **FAILED** | The focused `config-set` endpoints reject strings, but both registered `config-new-project` paths accept and persist a synthetic string from caller choices and global defaults. |
| 3 | Legacy strings self-heal to keyfiles with booleans left in config, including this repo | **FAILED** | Ordinary root reads migrate and this repo currently has booleans, but config-get failure, workstream root fallback/inheritance, secret-status, and boolean config-set can retain, expose, or destroy legacy strings without migration. |
| 4 | Each integration supports set, replace, clear, and masked status via the workflow | **FAILED** | Isolated handler round trips passed for Exa, Brave, and Firecrawl, but the shipped workflow is not executable as written; set/clear also become destructive or split-state operations when config mutation fails. |

**Score:** 0/4 roadmap success criteria verified.

## Requirement Traceability

Every PLAN frontmatter requirement resolves to `.oto/REQUIREMENTS.md`; no Phase
14 requirement is orphaned.

| Requirement | Declared by plans | Status | Evidence |
|---|---|---|---|
| **SECR-01** — Exa key only in 0600 keyfile or env, never committed config | 14-01, 14-02, 14-03, 14-04 | **BLOCKED** | CJS and SDK keyfile CRUD enforce 0600 on the normal path, but both new-project writers can persist a plaintext string and config-get can return one after migration failure. |
| **SECR-02** — all three config fields boolean-only in SDK and CJS | 14-01, 14-02 | **BLOCKED** | `cmdConfigSet` and `configSet` reject all three strings, but `cmdConfigNewProject` and `configNewProject` bypass the same validation. |
| **SECR-03** — legacy strings self-heal, including this repo | 14-01, 14-02, 14-04 | **BLOCKED** | Direct root migration tests pass and current repo values are boolean-typed; workstream, migration-failure, status, and overwrite paths do not satisfy the invariant. |
| **SECR-04** — workflow set/replace/clear, stdin-only, masked status | 14-03, 14-04 | **BLOCKED** | Direct compiled handlers pass safe happy-path round trips, but the workflow's opening command fails, its active-workstream routing is unused, its command wrapper is stale, and failed CRUD is non-transactional. |

## PLAN Must-Have Evidence

| Plan | Verified must-haves | Failed or partial must-haves |
|---|---|---|
| **14-01** | CJS helper CRUD, 0600 write, permission heal, env precedence, keyfile-wins conflict, masked migration notices, rotation warning, direct `config-set` rejection/warn, and ordinary root migration are implemented and covered. | “Any CJS config load” is false for an existing workstream; new-project bypasses boolean-only enforcement; boolean `config-set` can overwrite rather than migrate a legacy key. |
| **14-02** | SDK helper parity, canonical `~/.oto` detection, direct `configSet` rejection/warn, ordinary root migration, conflict policy, and rotation warning are implemented and covered. | New-project bypasses validation; config-get fails open; root fallback under a workstream is not migrated. |
| **14-03** | `secret-set`, `secret-clear`, and `secret-status` are registered and present in built dist; piped input, argv rejection in the expected slug-plus-extra-arg form, 0600 mode, masks, env precedence, and permission healing pass. | Set/clear has no rollback; status bypasses migration/read errors; failure paths are not covered by the plan tests. |
| **14-04** | The workflow body contains the `! oto-sdk query secret-set` guidance, uses `secret-clear`/`secret-status`, removes defect-era integration `config-set` examples, and the current tracked `.oto` guard passes. | The actual workflow fails on its first command, does not route the computed workstream, and is contradicted by the shipped command wrapper. The guard also does not cover that shipped surface. |

## Required Artifacts and Key Links

- Automated artifact verification reported **9/9 artifacts present and
  substantive** across the four PLAN files.
- Automated key-link verification reported 7/11 because four PLAN regexes are
  malformed or over-escaped. Manual checks verified all four structural links:
  SDK `.oto` keyfile checks at `config-mutation.ts:365-367`, secret registry
  registrations at `index.ts:344-346`, flag flips at
  `secret-commands.ts:123,152`, and the repo config link at
  `tests/14-no-plaintext-guard.test.cjs:11`.
- Structural wiring is therefore present. Behavioral data-flow verification is
  what fails: some writers bypass validation, some readers bypass migration,
  and the user workflow never reaches the wired secret commands.

## Data-Flow Trace

| Flow | Result |
|---|---|
| Terminal stdin → `secretSet` → `writeKeyfile` → `configSet(true)` | **Happy path works:** all three integrations produced mode 0600, boolean `true`, masked status, replacement mask, and clean clear in isolated temp homes. **Failure path is unsafe:** keyfile mutation is not rolled back. |
| Config string → read-time migration → keyfile + boolean | **Partial:** direct root reads work; SDK migration failure and root/workstream resolution bypass it. |
| New-project choices/defaults → merged config → write | **Failed invariant:** no integration validation occurs after merge in either implementation. |
| `/oto-settings-integrations` command → workflow → secret commands | **Disconnected at entry:** the first SDK command exits 10; wrapper and workflow also state contradictory storage contracts. |

## Independent Review-Finding Reproduction

All probes used fresh temp projects/homes, cleared provider environment variables,
and generated synthetic markers. No real API-key value was read or printed.

| Review finding | Result | Sanitized observation |
|---|---|---|
| **CR-01 new-project bypass** | **REPRODUCED** | Real CJS and SDK commands exited 0; caller-choice and global-default cases persisted `exa_search` with type `string`; no keyfile was created. |
| **CR-02 config-get fail-open** | **REPRODUCED** | With the temp home made unusable as a keyfile directory, real SDK config-get exited 0, returned a string equal to the synthetic marker, retained the config string, and created no keyfile. |
| **CR-03 non-transactional set/clear** | **REPRODUCED** | EACCES and EISDIR faults caused failed set to leave a 0600 keyfile and failed clear to remove the prior keyfile while config remained unchanged. |
| **CR-04 workstream root migration** | **REPRODUCED** | CJS existing-workstream and SDK missing-workstream fallback both returned a string, retained the root string, and created no keyfile. |

Additional fresh reproduction showed that setting a legacy `exa_search` string
to boolean `true` creates no keyfile in either implementation. SDK also returns
the original string in `data.previousValue`; CJS masks output but still destroys
the only stored credential.

## Automated Checks

| Command/check | Result |
|---|---|
| `node --test tests/14-secrets-keyfile.test.cjs tests/14-config-boolean.test.cjs tests/14-no-plaintext-guard.test.cjs` | **22/22 passed** |
| `npx vitest run src/query/secrets.test.ts src/query/config-mutation.test.ts src/query/config-query.test.ts src/query/secret-commands.test.ts src/cli.test.ts` in `sdk/` | **139/139 passed** |
| Secret registry contract test | **1/1 passed** |
| `npm run build` in `sdk/` | **Exit 0**; `git diff --exit-code -- sdk/dist` stayed clean |
| `node --check` for `secrets.cjs`, `config.cjs`, and `core.cjs` | **Exit 0** |
| Workflow static contract grep | Required `secret-*`/0600 guidance present; defect-era integration `config-set` examples absent from the workflow body |
| Repo config type probe | `exa_search`, `brave_search`, and `firecrawl` are currently present as booleans |
| Isolated three-integration set/replace/status/clear harness | Every happy-path boolean/mode/mask/clear assertion passed |
| Workflow entry probe | **Exit 10**: `Usage: config-ensure-section <section>` |

Per the verification scope, the broad root suite was not run. Its inherited
baseline failures and report side effects are unrelated to this phase. The
protected user-owned paths remained untouched.

## Human Verification Evidence

`14-04-SUMMARY.md:78-88` records the user's approval of a direct Exa exercise:
hidden TTY entry, 0600 mode, boolean-only config diff, masked set/replace status,
both rejection checks, and clean clear/restoration. This is useful evidence for
the lower-level happy path, but it did not execute the complete workflow's
failing first step and cannot override the reproduced blockers above.

## Gaps

1. **Boolean-only persistence is bypassable.** Validate merged new-project
   configuration in both CJS and SDK and cover caller/default inputs.
2. **Migration is fail-open and path-incomplete.** Migrate the actual effective
   root/workstream layers, fail closed for sensitive reads, and scrub/migrate
   legacy mutation `previousValue` data.
3. **Secret CRUD is non-transactional.** Add preflight validation and rollback
   across keyfile plus config mutations.
4. **The shipped settings workflow is broken and contradictory.** Fix its entry
   command, active-workstream routing, and command wrapper; then test the actual
   command-to-workflow path end to end.

## Recommendation

Do not advance to Phase 15. Create a Phase 14 gap-closure plan for the four
grouped gaps above, add regression tests for every reproduced failure, then rerun
verification. Phases 15 and 16 do not explicitly cover these defects, so none is
eligible for deferral.

---

_Verified: 2026-07-11T00:03:37Z_  
_Verifier: Codex (oto-verifier)_
