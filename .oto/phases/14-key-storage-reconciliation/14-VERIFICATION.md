---
status: gaps_found
phase: 14-key-storage-reconciliation
score: "2/4"
verified: "2026-07-11T02:57:16Z"
verified_at: "2026-07-11T02:57:16Z"
re_verification: true
overrides_applied: 0
requirements:
  SECR-01: blocked
  SECR-02: satisfied
  SECR-03: blocked
  SECR-04: satisfied
re_verification_detail:
  previous_status: gaps_found
  previous_score: "0/4"
  gaps_closed:
    - "Committed integration config is boolean-only across both write implementations (new-project bypass — closed by 14-05)"
    - "Secret set and clear cannot leave split state or destroy an existing credential when config mutation fails (closed by 14-06)"
    - "SDK config-get fail-open / previousValue leak / CJS legacy-overwrite in config-set (closed by 14-07 + 14-08)"
    - "/oto-settings-integrations executes end to end with workstream threading and a corrected command wrapper (closed by 14-09)"
  gaps_remaining: []
  regressions:
    - "CJS loader scrub introduced by 14-07 contaminates the on-disk write object: failed migration + any loader dirty-write destroys the only stored credential (new defect, reproduced)"
gaps:
  - truth: "A legacy API-key string in .oto/config.json is self-heal migrated to the keyfile with a boolean left in its place — never destroyed"
    status: failed
    reason: >-
      _scrubIntegrationStrings is applied to fileData — the object loadConfig's dirty-write
      paths (depth→granularity migration, multiRepo migration, sub_repos strip/sync) persist
      back to disk. When migrateLegacyIntegrationKeys fails (unusable ~/.oto), the legacy
      string is flipped to true in fileData and written to config.json with NO keyfile ever
      created. Independently reproduced: {"exa_search":"<marker>","depth":"standard"} + ~/.oto
      as a regular file → after one loadConfig() the config reads {"exa_search":true,
      "granularity":"standard"} and no keyfile exists. The credential is unrecoverable except
      from git history. This regresses the exact fail-closed invariant 14-07 pinned for the
      config-set path (tests/14-migration-hardening.test.cjs).
    artifacts:
      - path: "oto/bin/lib/core.cjs"
        issue: "Line ~358: fileData = _scrubIntegrationStrings(JSON.parse(raw)) mutates the disk-write object; dirty-write paths at ~365 (depth), ~375-414 (multiRepo/sub_repos/configDirty) persist the scrubbed object"
    missing:
      - "Keep fileData pristine for disk writes; apply the scrub only to the merged/effective in-memory view (parsed), after all configDirty write-backs"
      - "Regression test: legacy string + broken ~/.oto + depth key → config.json still contains the string after loadConfig()"
  - truth: "The SDK loader never returns an integration string (SECR-01 boolean-only loader contract)"
    status: failed
    reason: >-
      The Phase 14 scrub in sdk/src/config.ts runs only in the parsed-project-config branch.
      The two fallback paths — no project config found and empty project config — return
      mergeDefaults(userDefaults) with no migration and no scrub. ~/.gsd/defaults.json is
      precisely where a legacy integration string persists by design (D-08 read-only).
      Independently reproduced against sdk/dist/config.js: {"exa_search":"<marker>"} in
      ~/.gsd/defaults.json + empty project dir → loadConfig() returns the plaintext marker.
      Same defect class as the prior cycle's CR-04, one layer over.
    artifacts:
      - path: "sdk/src/config.ts"
        issue: "Fallback returns at ~193-204 (!projectConfigFound and empty-config branches) bypass the scrub applied at ~218-221"
      - path: "sdk/dist/config.js"
        issue: "Built dist carries the same unscrubbed fallback (reproduction ran against dist)"
    missing:
      - "Scrub integration strings in both fallback returns (never write back to ~/.gsd per D-08), then rebuild sdk/dist"
      - "Vitest case: string in ~/.gsd/defaults.json + no project config → loadConfig returns boolean"
  - truth: "Self-heal migration on read never breaks unrelated config reads (fail-open for non-sensitive keys)"
    status: failed
    reason: >-
      cmdConfigGet calls migrateLegacyIntegrationKeys(configPath) bare — the only unguarded
      call site (loadConfig, cmdConfigSet, and SDK configGet all wrap it). If any integration
      key holds a legacy string and the keyfile write fails, EVERY oto-tools config-get
      invocation crashes with a raw stack trace, including reads of unrelated keys.
      Independently reproduced: {"exa_search":"<marker>","model_profile":"quality"} + ~/.oto
      as a regular file → `oto-tools config-get model_profile` dies with EEXIST mkdir and a
      full stack trace. Workflows and hooks call config-get constantly, so one degraded
      ~/.oto bricks the CJS read surface project-wide.
    artifacts:
      - path: "oto/bin/lib/config.cjs"
        issue: "Line 407: migrateLegacyIntegrationKeys(configPath) with no try/catch in cmdConfigGet"
    missing:
      - "Wrap the migration in try/catch mirroring SDK configGet semantics: fail closed with a sanitized 'withheld' error for sensitive keys, fail open (continue the read) for non-sensitive keys"
      - "Regression test: legacy string + broken ~/.oto → config-get of a non-integration key succeeds; config-get of an integration key errors cleanly without a stack trace"
---

# Phase 14: Key Storage Reconciliation Verification Report (Re-verification)

**Phase Goal:** Integration API keys live only in `~/.oto/<integration>_api_key` (mode 0600) or env vars; committed `.oto/config.json` holds booleans only — enforced in both write paths, with self-healing migration for legacy string values.
**Verified:** 2026-07-11T02:57:16Z
**Status:** gaps_found
**Re-verification:** Yes — after gap-closure plans 14-05..14-09

## Verdict

All four gaps from the previous verification (0/4) are **closed**: both `config-new-project` writers now validate merged integration values, secret set/clear is transactional with preflight and compensation, migrate-before-overwrite plus fail-closed guards landed in CJS `config-set`, SDK `config-get` fails closed, and `/oto-settings-integrations` executes end to end with workstream threading. Phase test suites pass (46/46 CJS, 114/114 SDK Vitest) and this repo's own config holds booleans only.

However, three **new blockers** remain in the exact code paths the phase goal covers — each independently reproduced by this verification in fresh sandboxes (not taken on the review's word):

1. The 14-07 loader scrub **destroys the only stored credential** when self-heal migration fails (a regression introduced during gap closure).
2. The SDK loader's pre-project fallback **returns a plaintext API key** from `~/.gsd/defaults.json` (the one loader path 14-08's scrub missed).
3. The unguarded migration call in `cmdConfigGet` **crashes every CJS config read** when `~/.oto` is unusable.

A self-healing migration that can silently destroy the credential it exists to protect, and a loader contract that still leaks plaintext on one path, are goal gaps — not advisory footnotes.

## Goal Achievement

### Observable Truths (Roadmap Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Setting an Exa key through `/oto-settings-integrations` writes `~/.oto/exa_api_key` (0600) via stdin, config ends with `"exa_search": true`, no key material in tracked files | ✓ VERIFIED | Sandbox e2e: `secret-set exa` via stdin → keyfile mode 600 with content, config `exa_search: true` (boolean), argv form rejected with clear error, workflow entry `config-new-project` exits 0 idempotently; 46/46 contract tests pass. Warning WR-03 noted below (one status-display command in the workflow fails when `search_gitignored` is absent). |
| 2 | A string written to `exa_search`/`brave_search`/`firecrawl` through either write path is rejected with a clear error | ✓ VERIFIED | All three keys rejected on both paths (SDK exit 10, CJS exit 1) with actionable messages; nothing persisted (config stayed `{}`); new-project path now validated via `reconcileNewProjectIntegrations` wired in `config.cjs:172` and `config-mutation.ts:469`; `tests/14-newproject-boolean.test.cjs` passes. |
| 3 | A legacy string in `.oto/config.json` self-heals to the keyfile with a boolean left in its place — including this repo's config | ✗ FAILED | Happy path works and this repo's config is boolean-only, but the healing contract is broken on failure paths: loader dirty-write destroys the credential (Gap 1, reproduced), SDK fallback returns plaintext (Gap 2, reproduced), and `config-get` crashes on any key (Gap 3, reproduced). |
| 4 | User can set, replace, and clear each key via `/oto-settings-integrations`; status displays masked `****<last-4>` | ✓ VERIFIED | Sandbox e2e: set → `****1234` masked status, replace confirmed, clear removes keyfile and flips flag to false; transactional fault-injection tests (14-06) pass; workflow contract test executes the entry sequence against the real CLI. Interactive TTY flow flagged for human verification. |

**Score:** 2/4 roadmap success criteria verified.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `oto/bin/lib/secrets.cjs` | `reconcileNewProjectIntegrations` + keyfile CRUD | ✓ VERIFIED | Exported (line 312), 0600 write + chmod heal confirmed by test + sandbox |
| `sdk/src/query/secrets.ts` | SDK mirror, no `~/.gsd` writes | ✓ VERIFIED | `reconcileNewProjectIntegrations` at line 199; D-08 respected |
| `sdk/src/query/secret-commands.ts` | `preflightConfigDestination` + compensation | ✓ VERIFIED | Present at line 113, called in `secretSet` (151) and `secretClear` (200); mirrored in committed dist |
| `oto/bin/lib/config.cjs` | migrate-before-overwrite + fail-closed in `cmdConfigSet` | ✓ VERIFIED (set path) | Guard at ~354-359; but `cmdConfigGet` line 407 is unguarded (Gap 3) |
| `oto/bin/lib/core.cjs` | root-layer migration + in-memory-only scrub | ⚠️ HOLLOW | Root migration present; scrub exists but contaminates the disk-write object (Gap 1) — the "in-memory" contract of the 14-07 must-have does not hold |
| `sdk/src/config.ts` | root-fallback migration + loader scrub | ⚠️ HOLLOW | Scrub present only on parsed-project branch; both fallback returns unscrubbed (Gap 2) |
| `sdk/src/query/config-query.ts` | fail-closed `configGet` + post-read gate | ✓ VERIFIED | "withheld" gate present in src and committed dist |
| `oto/workflows/settings-integrations.md` | executable entry + WS_ARGS threading + used OTO_CONFIG_PATH | ✓ VERIFIED | `config-new-project` entry, guarded `${WS_ARGS[@]+"${WS_ARGS[@]}"}` on all subsequent commands |
| `oto/commands/oto/settings-integrations.md` | keyfile/boolean contract | ✓ VERIFIED | No plaintext/config-set storage claims remain; contract test pins it |
| `tests/14-*.test.cjs` (6 files) | regression coverage | ✓ VERIFIED | 46/46 pass; substantive fault-injection and contract assertions |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `config.cjs buildNewProjectConfig` | `secrets.cjs` | `reconcileNewProjectIntegrations` | ✓ WIRED | Line 172 — covers `cmdConfigNewProject` and `ensureConfigFile` |
| `config-mutation.ts configNewProject` | `secrets.ts` | `reconcileNewProjectIntegrations` | ✓ WIRED | Line 469, before write |
| `secret-commands.ts` | `config-mutation.ts` | `configSet` in try/catch with keyfile compensation | ✓ WIRED | Fault-injection tests pass (EISDIR/EACCES, create/replace/clear) |
| `config.cjs cmdConfigSet` | `secrets.cjs` | `migrateLegacyIntegrationKeys` before `setConfigValue` | ✓ WIRED | Fail-closed guard confirmed in code |
| `core.cjs loadConfig` | `secrets.cjs` | `migrateLegacyIntegrationKeys(rootConfigPath)` in ws branch | ✓ WIRED | Present; failure swallowed (by design) — but see Gap 1 for the scrub side-effect |
| `config.ts loadConfig` | `secrets.ts` | root migration before fallback read | ✓ WIRED | Present for workstream root; fallback scrub missing (Gap 2) |
| workflow entry | SDK registry | `config-new-project` handler | ✓ WIRED | Sandbox execution exits 0 |
| `tests/14-settings-workflow-contract.test.cjs` | `bin/oto-sdk.js` | spawnSync of real CLI | ✓ WIRED | e2e cases pass |

### Data-Flow Trace (Level 4)

| Flow | Result |
|------|--------|
| stdin → `secretSet` → 0600 keyfile → `configSet(true)` | ✓ FLOWING — sandbox e2e confirmed all steps including replace and clear |
| Legacy config string → read-time migration → keyfile + boolean | ⚠️ PARTIAL — happy path flows; failure path DESTROYS the string via loader dirty-write (Gap 1, reproduced) |
| `~/.gsd/defaults.json` legacy string → SDK loader → consumer | ✗ LEAKING — plaintext marker returned by `sdk/dist/config.js` `loadConfig()` in pre-project context (Gap 2, reproduced) |
| Legacy string + broken `~/.oto` → `config-get <any key>` | ✗ CRASHING — raw EEXIST stack trace on unrelated-key read (Gap 3, reproduced) |
| Workflow → secret commands with `--ws` threading | ✓ FLOWING — entry executes; WS_ARGS on all 8 commands; WR-03 degrades one display default |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Stdin secret-set → 0600 keyfile + boolean | `printf key \| oto-sdk query secret-set exa` (sandbox HOME) | mode 600, content correct, `exa_search: true` | ✓ PASS |
| Masked status | `oto-sdk query secret-status exa` | `Exa: enabled — key from ~/.oto/exa_api_key (****1234)` | ✓ PASS |
| Argv rejection | `oto-sdk query secret-set exa <key-on-argv>` | "never accepted as arguments" error | ✓ PASS |
| Clear | `oto-sdk query secret-clear exa` | keyfile removed, flag false | ✓ PASS |
| String rejection ×3 keys ×2 paths | `config-set <key> sk-...` (SDK + CJS) | clear errors, exits 10/1, nothing persisted | ✓ PASS |
| Workflow entry | `oto-sdk query config-new-project` (existing config) | exit 0, `created: false` | ✓ PASS |
| Loader credential survival on failed migration | `loadConfig()` with legacy string + broken `~/.oto` + `depth` key | string overwritten with `true`, no keyfile | ✗ FAIL (Gap 1) |
| SDK loader boolean contract, pre-project | `sdk/dist/config.js loadConfig()` with string in `~/.gsd/defaults.json` | plaintext marker returned | ✗ FAIL (Gap 2) |
| Unrelated-key read with degraded `~/.oto` | `oto-tools config-get model_profile` | unhandled EEXIST stack trace | ✗ FAIL (Gap 3) |
| Workflow `--default` fallback | `oto-sdk query config-get search_gitignored --default false` (key absent) | exit 1, `Key not found` — `--default` ignored by SDK handler | ✗ FAIL (WR-03, warning) |
| CJS test suites | `node --test tests/14-*.test.cjs` | 46/46 pass | ✓ PASS |
| SDK Vitest suites | `npx vitest run` (4 Phase-14 files) | 114/114 pass | ✓ PASS |
| Repo config hygiene | type probe on `.oto/config.json` (tracked) | all three flags boolean | ✓ PASS |

### Requirements Coverage

All four requirement IDs declared across plans 14-01..14-09 resolve to `.oto/REQUIREMENTS.md`; no Phase 14 requirement is orphaned.

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|--------------|-------------|--------|----------|
| SECR-01 | 14-01..14-06, 14-08 | Exa key only in 0600 keyfile or env var, never in committed config | ✗ BLOCKED | Write paths are clean, but the SDK loader still hands consumers a plaintext key on the pre-project fallback (Gap 2), and the CJS loader can destroy the stored credential (Gap 1) |
| SECR-02 | 14-01, 14-02, 14-05, 14-07 | Three config keys boolean-only, enforced in both write paths | ✓ SATISFIED | Direct set + new-project rejection verified for all three keys in both implementations; nothing persists on rejection |
| SECR-03 | 14-01, 14-02, 14-04, 14-07, 14-08 | Legacy strings self-heal to keyfile with boolean left in place, incl. this repo | ✗ BLOCKED | Happy-path healing works and repo config is boolean-only, but failure-path healing destroys credentials (Gap 1) and crashes reads (Gap 3) |
| SECR-04 | 14-03, 14-04, 14-06, 14-09 | Set/replace/clear via workflow, stdin-only, masked status | ✓ SATISFIED | E2e sandbox round trips + transactional fault tests + executable workflow; interactive TTY flow needs human confirmation (below) |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `oto/bin/lib/core.cjs` | ~358 | Scrub mutates the object documented as disk-write-only (`fileData`) | 🛑 Blocker | Credential destruction (Gap 1) |
| `sdk/src/config.ts` | ~193-204 | Fallback branches bypass the security gate applied to the main branch | 🛑 Blocker | Plaintext leak (Gap 2) |
| `oto/bin/lib/config.cjs` | 407 | Bare call to a throwing helper in a hot read path | 🛑 Blocker | Read-surface crash (Gap 3) |
| `oto/bin/lib/config.cjs` | 447-451, 386-399 | `maskSecret(true)` → `****` — boolean flags unreadable via CJS CLI, diverges from SDK | ⚠️ Warning | Review WR-01; CJS `config-get exa_search` prints `****` for both true and false |
| `oto/bin/lib/config.cjs` / `config-mutation.ts` | ~346-359 / ~221-235 | "no key detected — flag has no effect" warning fires before the migration that creates the key | ⚠️ Warning | Review WR-02; contradictory guidance for the migration cohort |
| `oto/workflows/settings-integrations.md` | 75 | `--default` flag silently ignored by SDK `config-get`; no `\|\| echo` guard unlike every sibling workflow | ⚠️ Warning | Review WR-03; reproduced — exit 1, empty var when key absent |
| `sdk/src/query/secret-commands.ts` | 49-73 | TTY branch never settles on readline `'close'` (Ctrl-D); relies on private `_writeToOutput` | ⚠️ Warning | Review WR-04; interactive hang risk |
| `oto/bin/lib/secrets.cjs` / `secrets.ts` | 165-214 / 265-322 | Unlocked read-modify-write of config.json from read paths racing locked writers | ⚠️ Warning | Review WR-05; multi-worktree last-write-wins hazard |

No TODO/FIXME/placeholder markers in any phase-modified file.

### Human Verification Required

#### 1. Interactive hidden-prompt key entry

**Test:** Run `/oto-settings-integrations` in a real Claude Code session, choose an integration, and enter a key at the hidden TTY prompt (then clear it).
**Expected:** No echo of the key to the terminal; keyfile created 0600; masked `****<last-4>` in the follow-up status; also try Ctrl-D at the prompt — the command should exit cleanly, not hang (known WR-04 risk).
**Why human:** TTY raw-mode behavior and readline echo suppression cannot be verified from a non-interactive sandbox. Prior human sign-off (14-04-SUMMARY) predates the 14-09 workflow rewrite.

#### 2. Workflow run with an active workstream

**Test:** Activate a workstream, run `/oto-settings-integrations`, set and clear a key.
**Expected:** All operations target the workstream config (via `--ws`), confirmation banner shows the resolved `OTO_CONFIG_PATH`.
**Why human:** The workflow is markdown executed by the agent; end-to-end agent-driven threading can't be spawned programmatically. Note review IN-05: session-scoped workstream pointers are not seen by the workflow's `.oto/active-workstream` read.

### Deferred Items

None. Phase 15 (Exa MCP registration) and Phase 16 (agent guidance + hardening) goals and success criteria do not cover loader migration safety, SDK loader fallback scrubbing, or `config-get` guarding — no gap is eligible for deferral.

### Gaps Summary

The gap-closure wave genuinely fixed everything the previous verification flagged, and the write-path story is now solid: booleans-only is enforced everywhere a caller can write, secret CRUD is transactional, and the workflow is executable. What remains broken is the **failure half of the self-healing migration contract**, in three reproduced ways:

1. **Gap 1 (regression, introduced by 14-07):** the loader scrub is applied to the object that loader dirty-writes persist, so a failed migration plus any unrelated config migration (e.g. `depth`→`granularity`) silently replaces the only stored credential with `true` — no keyfile, credential gone.
2. **Gap 2 (incomplete 14-08 fix):** the SDK loader's two pre-project fallback branches return `~/.gsd/defaults.json` values unscrubbed — a plaintext API key leaves `loadConfig` in exactly the context (`~/.gsd` legacy defaults) the phase was built to handle.
3. **Gap 3 (missed call site from 14-01):** `cmdConfigGet` is the only unguarded caller of the migration; one degraded `~/.oto` bricks every CJS `config-get` project-wide with a raw stack trace.

All three are small, precisely located fixes (the review's suggested patches at 14-REVIEW.md are sound). Five warnings (WR-01..WR-05) should ride along in the same closure plan or be explicitly accepted.

**Recommendation:** Do not advance to Phase 15. One more focused gap-closure plan covering the three blockers (plus regression tests pinning each reproduction), then re-verify.

---

_Verified: 2026-07-11T02:57:16Z_
_Verifier: Claude (oto-verifier)_
