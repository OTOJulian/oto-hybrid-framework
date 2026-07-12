---
phase: 14-key-storage-reconciliation
verified: "2026-07-12T02:27:06Z"
verified_at: "2026-07-12T02:27:06Z"
status: gaps_found
score: "0/4"
overrides_applied: 0
requirements:
  SECR-01: blocked
  SECR-02: blocked
  SECR-03: blocked
  SECR-04: blocked
re_verification:
  previous_status: gaps_found
  previous_score: "2/4"
  gaps_closed:
    - "CJS loadConfig now preserves a legacy credential when migration fails during an unrelated dirty write"
    - "SDK loadConfig now scrubs integration strings on both pre-project fallback returns"
    - "CJS config-get now fails open for unrelated keys and fails closed with a sanitized message for integration keys"
  gaps_remaining: []
  regressions: []
  new_gaps:
    - "Empty or whitespace-only keyfiles discard a valid legacy credential during migration"
    - "Array-shaped config-new-project choices persist nested plaintext through both write paths"
    - "SDK config mutators and secret commands overwrite malformed config instead of failing closed"
gaps:
  - truth: "No integration API key can be persisted in committed config through either write path"
    status: failed
    reason: >-
      Both CJS and SDK config-new-project accept an array-shaped JSON value such as
      [{"exa_search":"<marker>"}]. Object spread copies its numeric property into
      config.json while reconciliation checks only top-level integration fields.
      Both commands exit 0 and persist the marker at 0.exa_search.
    artifacts:
      - path: "oto/bin/lib/config.cjs"
        issue: "cmdConfigNewProject accepts any JSON root; buildNewProjectConfig spreads arrays and validates only top-level integration fields"
      - path: "sdk/src/query/config-mutation.ts"
        issue: "configNewProject casts any JSON root to Record and mirrors the same array-spread bypass"
      - path: "oto/bin/lib/secrets.cjs"
        issue: "reconcileNewProjectIntegrations inspects only the three top-level fields"
      - path: "sdk/src/query/secrets.ts"
        issue: "SDK reconciler mirrors the top-level-only check"
    missing:
      - "Require caller choices to be a non-null plain object, never an array or primitive, before any merge or side effect"
      - "Reject integration-key strings at any nested location before writing config"
      - "Add real-process CJS and SDK regressions for arrays, primitives, null, and nested integration fields, asserting no file or byte change"
  - truth: "A legacy integration string self-heals to a usable 0600 keyfile with a boolean left in config"
    status: failed
    reason: >-
      readKeyfile returns an object for a zero-byte or whitespace-only file. Migration
      treats that empty value as an authoritative conflicting keyfile, drops the valid
      legacy string, writes true to config, and leaves the keyfile empty. The only usable
      credential is lost, and secret-status reports enabled with ((unset)).
    artifacts:
      - path: "oto/bin/lib/secrets.cjs"
        issue: "readKeyfile returns trimmed empty content as present; migrateLegacyIntegrationKeys takes the keyfile-wins conflict branch"
      - path: "sdk/src/query/secrets.ts"
        issue: "SDK read and migration logic mirrors the empty-keyfile data-loss path"
      - path: "sdk/src/query/secret-commands.ts"
        issue: "secretStatus treats the empty keyfile as a source and renders an enabled but unset credential"
    missing:
      - "Treat trimmed-empty keyfiles as absent or invalid"
      - "During migration, replace an empty keyfile with the valid legacy value and enforce mode 0600"
      - "Add CJS and SDK tests for zero-byte and whitespace-only files across migration, detection, warning, and status paths"
  - truth: "Secret set and clear fail closed without destroying existing project configuration"
    status: failed
    reason: >-
      SDK configSet, configSetModelProfile, and configEnsureSection catch missing-file,
      read, and JSON-parse failures together and continue from an empty object. With a
      malformed config, each command exits 0 and replaces the original bytes. secret-set
      reduces the file to exa_search:true; secret-clear reduces it to exa_search:false and
      deletes the keyfile while also reporting success.
    artifacts:
      - path: "sdk/src/query/config-mutation.ts"
        issue: "Three mutators swallow all read/parse failures and use an empty object"
      - path: "sdk/src/query/secret-commands.ts"
        issue: "secretSet and secretClear delegate to configSet, so destination preflight cannot detect malformed JSON"
      - path: "sdk/dist/query/config-mutation.js"
        issue: "The shipped build contains the same destructive fallback"
    missing:
      - "Start from an empty object only on ENOENT; reject malformed JSON, read errors, arrays, null, and other non-plain roots"
      - "Preserve config bytes and keyfile state on every rejected mutation"
      - "Add byte-preservation tests for all three mutators plus secret-set and secret-clear"
---

# Phase 14: Key Storage Reconciliation Verification Report

**Phase Goal:** Integration API keys live only in `~/.oto/<integration>_api_key` (mode 0600) or environment variables; committed `.oto/config.json` holds booleans only, enforced in both write paths with self-healing migration.

**Verified:** 2026-07-12T02:27:06Z
**Status:** gaps_found
**Re-verification:** Yes, after all 12 plans were merged

## Verdict

The previous three verification gaps are closed, and the ordinary supported path works. In an isolated real-process round trip, `secret-set exa` accepted stdin, created a mode-0600 keyfile, set `exa_search: true`, displayed only `****1234`, rejected an argv key with exit 10, and `secret-clear exa` removed the keyfile and restored the flag to `false`.

The phase goal is still not achieved. Three distinct edge cases were reproduced independently against the current CJS and built SDK surfaces:

1. Array-shaped new-project choices place plaintext in committed config through both write implementations.
2. An empty keyfile wins migration and destroys the only valid legacy credential.
3. SDK mutations and secret commands replace malformed config while returning success.

These are observable data-disclosure or data-loss paths, not documentation-only concerns. All four SECR requirements remain blocked.

## Goal Achievement

### Observable Truths

| # | Roadmap truth | Status | Evidence |
|---|---|---|---|
| 1 | Setting an Exa key uses stdin, creates a 0600 keyfile, leaves a boolean flag, and no key material exists in tracked files | FAILED | The ordinary secret-set path passes, but both config-new-project writers accept an array and persist plaintext at `0.exa_search`, so the no-key-material invariant is false. |
| 2 | Strings for `exa_search`, `brave_search`, and `firecrawl` are rejected through both write paths | FAILED | Direct top-level writes are rejected, but array-shaped caller choices bypass the fully-merged-config gate in both implementations and exit 0. |
| 3 | Legacy strings self-heal to usable keyfiles with booleans left in config | FAILED | With an empty or whitespace-only keyfile, both migrations drop the valid string, write `true`, and leave zero usable key bytes. |
| 4 | Users can safely set, replace, clear, and inspect masked status through the workflow | FAILED | Happy-path CRUD passes, but malformed config is silently replaced on set/clear; clear also deletes the keyfile. Empty-keyfile status falsely reports `enabled` with `((unset))`. |

**Score:** 0/4 roadmap truths verified.

### Previous-Gap Regression Check

| Previous gap | Current result |
|---|---|
| CJS loader dirty-write destroyed a credential after failed migration | CLOSED — `14-loader-credential-survival` and `14-migration-hardening` pass; `fileData` remains pristine and only the effective view is scrubbed. |
| SDK loader fallback returned a string from legacy defaults | CLOSED — both fallbacks call `scrubIntegrationStrings`; current `src` and built `dist` tests return booleans. |
| Unguarded CJS config-get migration crashed unrelated reads | CLOSED — non-sensitive reads fail open; sensitive reads return the sanitized `value withheld` error. |

## Artifact and Wiring Audit

- PLAN inventory: 58 declared truths, 33 artifacts, and 30 key links across 12 plans.
- `oto-sdk query verify.artifacts`: **33/33 artifacts passed** existence and substantive checks.
- `oto-sdk query verify.key-links`: 17/30 automatic matches. The 13 reported failures were plan-metadata parser false negatives caused by double-escaped regexes or annotated `from:` paths; manual tracing confirmed **30/30 structural links**.
- Structural wiring is therefore present. The failures are behavioral holes inside wired implementations.

| Artifact group | Structural status | Behavioral status |
|---|---|---|
| `oto/bin/lib/secrets.cjs`, `sdk/src/query/secrets.ts` | WIRED | FAILED for empty-keyfile migration and source detection |
| `oto/bin/lib/config.cjs`, `sdk/src/query/config-mutation.ts` | WIRED | FAILED for array-shaped new-project input; SDK also fails closed incorrectly on malformed config |
| `sdk/src/query/secret-commands.ts` | WIRED | Happy path passes; malformed-config set/clear and empty-keyfile status fail |
| `oto/bin/lib/core.cjs`, `sdk/src/config.ts`, `sdk/src/query/config-query.ts` | WIRED | Previous verification gaps closed |
| `oto/workflows/settings-integrations.md`, command wrapper, contract tests | WIRED | Ordinary path works; underlying command defects remain reachable |

## Data-Flow Checks

| Flow | Result |
|---|---|
| stdin -> `secret-set` -> 0600 keyfile -> boolean config -> masked status -> clear | PASS |
| array JSON choices -> object spread -> numeric property in tracked config | FAIL — plaintext persists at `0.exa_search` in CJS and SDK |
| legacy string + empty keyfile -> conflict handling -> config rewrite | FAIL — string is discarded, config becomes `true`, keyfile remains empty |
| malformed config -> SDK mutation catch -> `{}` -> atomic write | FAIL — original bytes are replaced and the command exits 0 |

## Behavioral Evidence

| Check | Result |
|---|---|
| CJS empty-keyfile migration | Exit 0; config `exa_search` became `true`; keyfile stayed 0 bytes; result recorded a conflict |
| SDK empty-keyfile migration | Same result as CJS; subsequent status printed `Exa: enabled — key from ~/.oto/exa_api_key ((unset))` |
| CJS array-shaped config-new-project | Exit 0; top-level flag boolean; nested plaintext marker persisted |
| SDK array-shaped config-new-project | Exit 0; same nested plaintext persistence in the built CLI |
| SDK config-set on `{bad json` | Exit 0; file replaced with only `{ "model_profile": "quality" }` |
| SDK secret-set on `{bad json` | Exit 0; file replaced with only `{ "exa_search": true }`; 0600 keyfile created |
| SDK secret-clear on `{bad json` | Exit 0; file replaced with only `{ "exa_search": false }`; keyfile deleted |
| Repository `.oto/config.json` type probe | All three integration fields are currently booleans (`false`) |

## Requirements Coverage

All PLAN requirement IDs resolve to `.oto/REQUIREMENTS.md`. The union is exactly SECR-01 through SECR-04; there are no orphan Phase 14 requirements.

| Requirement | Source plans | Status | Evidence |
|---|---|---|---|
| SECR-01 | 01, 02, 03, 04, 05, 06, 07, 08, 10, 12 | BLOCKED | Both write paths can commit a nested plaintext Exa key through array choices. |
| SECR-02 | 01, 02, 05, 07, 11, 12 | BLOCKED | The fully merged new-project config is not boolean-only; caller-controlled nested `exa_search` strings survive. |
| SECR-03 | 01, 02, 04, 07, 08, 10, 11 | BLOCKED | Empty or whitespace-only keyfiles cause destructive conflict handling instead of migration to a usable keyfile. |
| SECR-04 | 03, 04, 06, 09, 11, 12 | BLOCKED | Secret set/clear can report success while replacing malformed config, and status can report an empty keyfile as enabled. |

## Test Evidence

- `node --test --test-reporter=dot tests/14-*.test.cjs`: **54/54 passed**.
- Seven focused SDK suites: **211/212 passed**. The sole failure is the stale registry spy at `sdk/src/query/registry.test.ts:80`, which expects two handler arguments although dispatch correctly supplies the third `workstream` argument as `undefined`.
- `npx tsc --noEmit`: **passed**.
- Existing tests contain no array-root new-project cases, no empty/whitespace keyfile migration/status cases, and no malformed-config byte-preservation cases for SDK mutators or secret commands. Their green results do not cover the reproduced blockers.
- No TODO/FIXME/placeholder implementation markers were found in the Phase 14 production files.

## Deferred and Human Verification

No blocker is specifically covered by Phase 15 or Phase 16 roadmap criteria, so none is deferred. No human verification is needed to classify this result: all blockers are deterministic and reproduced programmatically. The prior interactive hidden-prompt checkpoint remains valid normal-path evidence but cannot override these failures.

## Gaps Summary

1. Reject non-plain new-project input and recursively block nested integration-key strings before any side effect.
2. Treat empty keyfiles as absent/invalid and migrate the valid legacy value into them.
3. Make SDK mutators distinguish ENOENT from parse/read failures and preserve both config bytes and keyfile state on rejection.

Re-run targeted gap planning with `/oto-plan-phase 14 --gaps`, then independently re-verify the same real-process probes.

---

_Verified: 2026-07-12T02:27:06Z_
_Verifier: Codex (oto-verifier)_
