---
phase: 14-key-storage-reconciliation
phase_number: 14
status: verified
threats_open: 0
asvs_level: 1
verified: 2026-07-13
auditor: oto-security-auditor (Claude)
---

# Phase 14 Security Verification

Per-phase security contract: verify the 104-threat STRIDE register declared across the 19 plan threat models (14-01-PLAN.md .. 14-19-PLAN.md), by disposition (mitigate / accept / transfer). Every `mitigate` verified by concrete code evidence (file:line) in the implemented CJS layer (`oto/bin/lib/`), SDK layer (`sdk/src/`, rebuilt `sdk/dist/`), workflows, and tests. Every `accept` verified as documented. Both `transfer` threats verified against their executed/tracked targets.

## Result

| Metric | Count |
|--------|-------|
| Threats reviewed | 104 |
| Closed (mitigated, evidence found) | 93 |
| Closed (accepted risk, documented) | 9 |
| Closed (transferred, target verified) | 2 |
| Open | 0 |
| Unregistered summary flags | 0 |

ASVS Level 1 (default). `block_on` default. Fresh independent verification: 14-VERIFICATION.md `passed` 4/4 (2026-07-13T18:07:06Z, head f348bec) with 4 developer-triaged deferral overrides (FRESH-CR-02 → Phase 15, FRESH-CR-03 → Phase 16), all tracked in `.oto/STATE.md` Pending Todos and 14-DISPOSITIONS.md.

## Threat Verification

### Plan 14-01 — CJS keyfile storage

| Threat ID | Category | Disposition | Status | Evidence |
|-----------|----------|-------------|--------|----------|
| T-14-01 | I | mitigate | CLOSED | `oto/bin/lib/config.cjs:394-397` — `validateIntegrationValue` hard-reject in `cmdConfigSet` before any write |
| T-14-02 | I | mitigate | CLOSED | `oto/bin/lib/core.cjs:358` migration hook on every load; `oto/bin/lib/secrets.cjs:268-327` migration → 0600 keyfile; rotation advice `secrets.cjs:312-315` |
| T-14-03 | I | mitigate | CLOSED | `secrets.cjs:100` (openSync mode 0o600), `:106` (chmod after write), `:126-131` (read-time heal) |
| T-14-04 | I | mitigate | CLOSED | `secrets.cjs:26-31` maskSecret; masked echo `config.cjs:445-456`, masked get `config.cjs:516-519`; masked migration notices `secrets.cjs:293-300` |
| T-14-05 | T | mitigate | CLOSED | `secrets.cjs:193-204` temp-file + rename `atomicWrite`, used by migration at `:311` |
| T-14-06 | T | mitigate | CLOSED | `secrets.cjs:38-57` INTEGRATIONS allowlist; `integrationForSlug` throws on unknown slug `:66-70`; `keyfilePath` routes through it `:76-79` |
| T-14-07 | S | accept | CLOSED | Documented in 14-01-PLAN.md register (single-user machine); dir created 0700 `secrets.cjs:84`. Logged in Accepted Risks below |
| T-14-08 | D | mitigate | CLOSED | `core.cjs:358` try/catch around migration in loadConfig; migration no-ops on unreadable config `secrets.cjs:270-278` |

### Plan 14-02 — SDK keyfile storage

| Threat ID | Category | Disposition | Status | Evidence |
|-----------|----------|-------------|--------|----------|
| T-14-09 | I | mitigate | CLOSED | `sdk/src/query/config-mutation.ts:284-287` — `validateIntegrationValue` throws Validation before lock/write |
| T-14-10 | I | mitigate | CLOSED | Hooked in configGet `sdk/src/query/config-query.ts:99` AND loadConfig `sdk/src/config.ts:197,201` |
| T-14-11 | T | mitigate | CLOSED | `sdk/src/query/secrets.ts:76` — `keyfileBase` = `join(homedir(), '.oto')`, no `~/.gsd` keyfile fallback |
| T-14-12 | I | mitigate | CLOSED | `sdk/src/query/secrets.ts:104-112` (0600 open + final chmod), `:138-143` (read heal) |
| T-14-13 | I | mitigate | CLOSED | Sanitized/masked-only messages: `config-query.ts:102,137`; masked conflict notices `secrets.ts:347,447` |
| T-14-14 | T | mitigate | CLOSED | `config-mutation.ts:303` acquireStateLock; `config-mutation.ts:64-77` atomicWriteConfig temp + rename |
| T-14-15 | D | mitigate | CLOSED | try/catch at both hook sites: `config.ts:197,201`; `config-query.ts:99` |

### Plan 14-03 — SDK secret CRUD commands

| Threat ID | Category | Disposition | Status | Evidence |
|-----------|----------|-------------|--------|----------|
| T-14-16 | I | mitigate | CLOSED | `sdk/src/query/secret-commands.ts:160-165` — hard reject when `args[1]` present; stdin/TTY only |
| T-14-17 | I | mitigate | CLOSED | `secret-commands.ts:51-66` — muted `_writeToOutput`, prompt written to stderr (`:65`) |
| T-14-18 | I | mitigate | CLOSED | Handler results masked only: `secret-commands.ts:197` (secretSet), `:315` (secretStatus) |
| T-14-19 | I | mitigate | CLOSED | `secrets.ts:104-112` writeKeyfile 0600; secret-status heal via `readKeyfile` `secret-commands.ts:303` |
| T-14-20 | T | mitigate | CLOSED | `secret-commands.ts:112-121` resolveSlug allowlist; keyfilePath throws on unknown slug `secrets.ts:66-72` |
| T-14-21 | R | mitigate | CLOSED | `secret-commands.ts:241-244` — "keyfile removed; ENV still set — integration remains available." |
| T-14-22 | D/T | mitigate | CLOSED | 14-03-SUMMARY.md:41,66,108 — exit-trap-guarded smoke with keyfile backup/restore, no dummy key/backup left, clean `.oto/config.json` diff |

### Plan 14-04 — Settings workflow (chat surface)

| Threat ID | Category | Disposition | Status | Evidence |
|-----------|----------|-------------|--------|----------|
| T-14-23 | I | mitigate | CLOSED | `oto/workflows/settings-integrations.md:154,168-170` `!`-prefixed user-run secret-set; `:310-311` keys never through conversation; `oto/commands/oto/settings-integrations.md:18-23` security block |
| T-14-24 | I | mitigate | CLOSED | `tests/14-no-plaintext-guard.test.cjs` exists; `package.json:33` `"test": "node --test ... tests/*.test.cjs"` runs it permanently |
| T-14-25 | I | mitigate | CLOSED | Workflow lines 81, 174-175, 273-274 — all displays sourced verbatim from pre-masked `secret-status` output |
| T-14-26 | I/D | mitigate | CLOSED | 14-04-SUMMARY.md:87,116 — verification restored original keyfile/config state, clean git diff |
| T-14-27 | T | accept | CLOSED | `docs/upstream-sync.md` exists; HARD-05 dry-run gate tracked `.oto/REQUIREMENTS.md:43,98` (Phase 16, pending). Logged in Accepted Risks below |

### Plan 14-05 — New-project defaults reconciliation

| Threat ID | Category | Disposition | Status | Evidence |
|-----------|----------|-------------|--------|----------|
| T-14-05-01 | I | mitigate | CLOSED | `config.cjs:194-196` reconcile validates merged object before write, hard reject via `error()`; SDK parity in configNewProject (`config-mutation.ts` → `secrets.ts:301`) |
| T-14-05-02 | I | mitigate | CLOSED | Rejection messages carry key path only, never the value: `secrets.cjs:181,366-369` |
| T-14-05-03 | T | mitigate | CLOSED | `secrets.cjs:400,407-413` — existing keyfile wins; defaults string dropped with masked notice |
| T-14-05-04 | E | mitigate | CLOSED | `secrets.cjs:84` mkdir 0700; `:100,106` file 0600 + chmod (SDK: `secrets.ts:87,106,112`) |
| T-14-05-05 | R | accept | CLOSED | Documented in plan register + `secrets.cjs:450-454,470` (best-effort heal of oto-owned defaults only; failure = repeat masked notice). Logged below |
| T-14-05-06 | T | mitigate | CLOSED | No `.gsd` write path in either secrets module: `oto/bin/lib/secrets.cjs` contains zero `.gsd` references; defaults heal targets `keyfileBase` (~/.oto) `secrets.cjs:456` |

### Plan 14-06 — secretSet/secretClear transactionality

| Threat ID | Category | Disposition | Status | Evidence |
|-----------|----------|-------------|--------|----------|
| T-14-06-01 | D | mitigate | CLOSED | `secret-commands.ts:218-220` — configSet('false') before deleteKeyfile; flag restore on delete failure `:225-234` |
| T-14-06-02 | I | mitigate | CLOSED | `secret-commands.ts:170-181` — prior keyfile snapshot; on configSet failure delete new keyfile or restore prior |
| T-14-06-03 | I | mitigate | CLOSED | `secret-commands.ts:182-188` — rethrow interpolates only configSet's own message (args are configKey + boolean); secret never interpolated |
| T-14-06-04 | T | mitigate | CLOSED | `secret-commands.ts:130-149` preflightConfigDestination (EISDIR/EACCES), called before any keyfile byte at `:168` and `:217` |
| T-14-06-05 | R | accept | CLOSED | Documented in plan register + 14-06-SUMMARY.md:117. Logged below |

### Plan 14-07 — CJS legacy-string survival

| Threat ID | Category | Disposition | Status | Evidence |
|-----------|----------|-------------|--------|----------|
| T-14-07-01 | D | mitigate | CLOSED | `config.cjs:423-437` — migrate-before-overwrite in one lock; fail-closed `error()` at `:434` |
| T-14-07-02 | I | mitigate | CLOSED | `core.cjs:343-345` — root migration before `readFileSync` under OTO_WORKSTREAM |
| T-14-07-03 | I | mitigate | CLOSED | `core.cjs:348` (root layer scrub) + `:427` (merged effective view scrub) |
| T-14-07-04 | I | mitigate | CLOSED | Fail-closed messages keyPath-only: `config.cjs:434,479` |
| T-14-07-05 | T | accept | CLOSED | Documented in plan + 14-07-SUMMARY.md:107 (migration race WR-02). Subsequently hardened by Plan 14-18 same-lock transaction (`secrets.cjs:320-326`). Logged below |

### Plan 14-08 — SDK read/write fail-closed surfaces

| Threat ID | Category | Disposition | Status | Evidence |
|-----------|----------|-------------|--------|----------|
| T-14-08-01 | I | mitigate | CLOSED | `config-query.ts:99-103` — fail-closed "value withheld" on migration failure for sensitive keys |
| T-14-08-02 | I | mitigate | CLOSED | `config-query.ts:137` — type gate: sensitive string withheld regardless of migration outcome |
| T-14-08-03 | I | mitigate | CLOSED | `config.ts:199-202` root migrate before fallback read; scrub after parse `:268,280` |
| T-14-08-04 | I | mitigate | CLOSED | `config-mutation.ts:310` migrate-first inside lock; `:337-340` maskSecret defense on non-boolean previousValue |
| T-14-08-05 | D | mitigate | CLOSED | `config-mutation.ts:309-315` — fail-closed GSDError, config not modified when migration cannot complete |
| T-14-08-06 | T | mitigate | CLOSED | Rebuilt dist verified: `sdk/dist/config.js:91,194` (scrub + fixed parse message); rebuild commit d3ce48c per 14-19-SUMMARY.md |
| T-14-08-07 | I | mitigate | CLOSED | `secret-commands.ts:291-293` — try/catch migration before readConfig; display masked-only by construction (`:315,323,327`) |

### Plan 14-09 — Workflow workstream threading

| Threat ID | Category | Disposition | Status | Evidence |
|-----------|----------|-------------|--------|----------|
| T-14-09-01 | I | mitigate | CLOSED | Workflow `:154,161,168-170` — `!`-prefixed hidden-prompt flow preserved; `--ws` appended to the command, never the key |
| T-14-09-02 | T | mitigate | CLOSED | Guarded WS_ARGS threaded (workflow `:63-266`); contract test `tests/14-settings-workflow-contract.test.cjs:151-169,252-258` counts guarded occurrences, forbids unguarded |
| T-14-09-03 | I | mitigate | CLOSED | Wrapper `oto/commands/oto/settings-integrations.md:18-23` rewritten to keyfile/boolean contract; no plaintext-storage guidance |
| T-14-09-04 | D | mitigate | CLOSED | Idempotent `config-new-project` entry (workflow `:47,64`); exit-10 pin `14-settings-workflow-contract.test.cjs:143-148` |
| T-14-09-05 | S | accept | CLOSED | Documented in plan register; secret-status reports shadowing (`secrets.cjs:161` shadowedKeyfile, `secret-commands.ts:316,321`). Logged below |
| T-14-09-06 | D | mitigate | CLOSED | `${WS_ARGS[@]+"${WS_ARGS[@]}"}` guard everywhere (workflow `:50-51,63`); unguarded-expansion test `:163-169,254-258` |

### Plan 14-10 — CJS loader byte fidelity

| Threat ID | Category | Disposition | Status | Evidence |
|-----------|----------|-------------|--------|----------|
| T-14-10-01 | T | mitigate | CLOSED | `core.cjs:362-364,416-427` — scrub applies to effective view only; `fileData` stays byte-faithful for all dirty-write paths |
| T-14-10-02 | I | mitigate | CLOSED | `core.cjs:427` — scrub retained on merged `parsed`; `tests/14-loader-scrub.test.cjs` pins both |

### Plan 14-11 — CJS config-get hardening

| Threat ID | Category | Disposition | Status | Evidence |
|-----------|----------|-------------|--------|----------|
| T-14-11-01 | D | mitigate | CLOSED | `config.cjs:470-480` — try/catch migration; fail open for non-sensitive keys |
| T-14-11-02 | I | mitigate | CLOSED | `config.cjs:479` — fixed sanitized "value withheld" message; no stack/EEXIST interpolation |
| T-14-11-03 | I | mitigate | CLOSED | `config.cjs:445-456` — previousValue-string clause keeps legacy strings masked in echo |
| T-14-11-04 | T | accept | CLOSED | Originally accepted (deferred WR-05); final state MITIGATED by Plan 14-18: migration self-locks (`secrets.cjs:320-326`, SDK `secrets.ts:475-477`). No residual gap |

### Plan 14-12 — SDK fallback scrub + TTY settle

| Threat ID | Category | Disposition | Status | Evidence |
|-----------|----------|-------------|--------|----------|
| T-14-12-01 | I | mitigate | CLOSED | `config.ts:245,253` — scrubIntegrationStrings on both fallback returns; dist smoke in 14-19 (GAP verdicts) |
| T-14-12-02 | T | mitigate | CLOSED | Scrub operates on spread copy `{ ...userDefaults }` (`config.ts:245,253`); D-08 read-only comment `:163`; no `.gsd` write path |
| T-14-12-03 | D | mitigate | CLOSED | `secret-commands.ts:73-77` — 'close' rejection handler settles the promise on EOF |
| T-14-12-04 | I | mitigate | CLOSED | `secret-commands.ts:57-64` — typeof guard on `_writeToOutput` (upgraded to fail-closed by WR-08) |

### Plan 14-13 — Keyfile symlink/empty-file hardening

| Threat ID | Category | Disposition | Status | Evidence |
|-----------|----------|-------------|--------|----------|
| T-14-13-01 | D | mitigate | CLOSED | `secrets.cjs:134-139` / `secrets.ts:145-152` — trimmed-empty → null, so migration overwrites and preserves the legacy value |
| T-14-13-02 | S | mitigate | CLOSED | `secrets.cjs:170` source null + '(unset)'; status renders 'no key detected' `secret-commands.ts:330` |
| T-14-13-03 | T | mitigate | CLOSED | `secrets.cjs:89-100` / `secrets.ts:92-106` — lstat regular-file check + O_NOFOLLOW open |
| T-14-13-04 | I | mitigate | CLOSED | `secrets.cjs:95` / `secrets.ts:101` — chmod 0600 BEFORE truncation; final chmod retained |
| T-14-13-05 | T | mitigate | CLOSED | `secrets.cjs:112-131` / `secrets.ts:123-143` — lstat rejection precedes any chmod in the heal path |
| T-14-13-06 | I | mitigate | CLOSED | Masked-only migration notices `secrets.cjs:293-300` (unchanged) |
| T-14-13-07 | TOCTOU | accept | CLOSED | Documented in 14-13-SUMMARY.md:36 + 14-DISPOSITIONS.md WR-07 row. Logged below |

### Plan 14-14 — SDK mutation fail-closed

| Threat ID | Category | Disposition | Status | Evidence |
|-----------|----------|-------------|--------|----------|
| T-14-14-01 | T | mitigate | CLOSED | `config-mutation.ts:93-123` readConfigForMutation throws on all non-ENOENT failures; byte-preservation tests `sdk/src/query/config-mutation-failclosed.test.ts` |
| T-14-14-02 | D | mitigate | CLOSED | `secret-commands.ts:218-220` config-first + fail-closed configSet → deleteKeyfile never runs on malformed config |
| T-14-14-03 | R | mitigate | CLOSED | All rejections are thrown GSDErrors (`config-mutation.ts:285-287,309-315`; `secret-commands.ts:161,185,236`) — non-zero CLI exit, never exit-0-with-replacement |
| T-14-14-04 | I | mitigate | CLOSED | Fixed path-only parse messages: `config-mutation.ts:108-112`; CJS `config.cjs:341,495` |
| T-14-14-05 | I | mitigate | CLOSED | `secret-commands.ts:57-64` — WR-08 fail-closed reject before prompt when `_writeToOutput` unavailable; `sdk/src/query/secret-input-failclosed.test.ts` |
| T-14-14-06 | T | mitigate | CLOSED | `sdk/src/query/registry.ts:125` — `handler(args, projectDir, workstream)` forwards all three; WR-03 regression in `registry.test.ts` |
| T-14-14-07 | D | mitigate | CLOSED | `config-mutation.ts:97` — ENOENT returns `{}`; fresh-project first write preserved |

### Plan 14-15 — New-project shape guard

| Threat ID | Category | Disposition | Status | Evidence |
|-----------|----------|-------------|--------|----------|
| T-14-15-01 | I | mitigate | CLOSED | Plain-object root guard: `config.cjs:236-241`; SDK `config-mutation.ts:435-441` |
| T-14-15-02 | I | mitigate | CLOSED | Deep scan with no truthiness test (`secrets.cjs:335-346` — `typeof value === 'string'` catches `""`); top-level allowlist `config.cjs:243-249`, SDK `config-mutation.ts:43,444` |
| T-14-15-03 | I | mitigate | CLOSED | Scanner returns dot-paths only (`secrets.cjs:329-346`); fixed parse messages `config.cjs:225-230`, `config-mutation.ts:425-430` ("input not echoed") |
| T-14-15-04 | T | mitigate | CLOSED | mkdir after full validation: `config.cjs:251-259` (buildNewProjectConfig+reconcile precede mkdir), SDK `config-mutation.ts:555` |
| T-14-15-05 | D | mitigate | CLOSED | `secrets.cjs:406-432` — Phase B compensation rolls back every keyfile written in the failed run |
| T-14-15-06 | I | mitigate | CLOSED | `secrets.cjs:383-402` — migration candidates derive from `rawDefaults`; caller boolean wins in config only `:437-448` |
| T-14-15-07 | E | transfer | CLOSED | Transfer target executed: Plan 14-19 rebuild (14-19-SUMMARY.md, commit d3ce48c) + dist-level GAP1-SDK/GAP3 reproductions PASS (14-SDK-BASELINE-DELTA.txt) |

### Plan 14-16 — Loader boolean contract + import safety

| Threat ID | Category | Disposition | Status | Evidence |
|-----------|----------|-------------|--------|----------|
| T-14-16-01 | I | mitigate | CLOSED | `core.cjs:321-334` and `config.ts:157-170` — every present non-boolean normalized via `Boolean(value)` |
| T-14-16-02 | T | mitigate | CLOSED | `core.cjs:424-427` — scrub on effective view only; disk-byte assertions in `tests/14-loader-scrub.test.cjs` |
| T-14-16-03 | T | mitigate | CLOSED | `config.ts:227-233,268-281` — root parsed, scrubbed, deep-merged under workstream (WR-09) mirroring CJS |
| T-14-16-04 | D | mitigate | CLOSED | `sdk/src/cli.ts:698` — `import.meta.url === pathToFileURL(process.argv[1]).href` direct-entry guard |
| T-14-16-05 | R | mitigate | CLOSED | `14-SDK-BASELINE.txt` (two-run union) + `14-SDK-BASELINE-DELTA.txt:208` `NO NEW FAILURES: PASS` |

### Plan 14-17 — Workflow WS resolution + scan breadth

| Threat ID | Category | Disposition | Status | Evidence |
|-----------|----------|-------------|--------|----------|
| T-14-17-01 | T | mitigate | CLOSED | Workflow `:58-63` canonical resolver (`workstream get --raw` + `config-path`); real-process regressions `14-settings-workflow-contract.test.cjs:224-251`; hardcoded `active-workstream` read pinned absent `:251` |
| T-14-17-02 | I | mitigate | CLOSED | `tests/14-no-plaintext-guard.test.cjs:21-22` broadened `sk-/fc-[A-Za-z0-9_-]{20,}` classes; positive/negative controls `:101-130` |
| T-14-17-03 | D | mitigate | CLOSED | Guarded expansion convention grep-pinned: test `:163-169,254-258` (≥12 guarded, zero unguarded) |
| T-14-17-04 | T | transfer | CLOSED | Transfer tracked: `.oto/STATE.md:87` Phase 16 pre-task (WR-04) + 14-DISPOSITIONS.md WR-04 row with named owner |

### Plan 14-18 — Migration locking

| Threat ID | Category | Disposition | Status | Evidence |
|-----------|----------|-------------|--------|----------|
| T-14-18-01 | T | mitigate | CLOSED | Same-lock transaction: CJS `config.cjs:423-437` + `secrets.cjs:320-326` (`alreadyLocked`); SDK `config-mutation.ts:303-315` + `secrets.ts:475-477`; regressions `tests/14-migration-lock.test.cjs`, `sdk/src/query/migration-lock.test.ts` |
| T-14-18-02 | D | mitigate | CLOSED | `secrets.cjs:321-325` — timeoutMs 2000, `onTimeout: 'skip'`; sensitive reads withhold on skip `config.cjs:474-480` |
| T-14-18-03 | D | mitigate | CLOSED | `secrets.cjs:211-266` — try/finally release, process-exit sweep, 30s stale-lock eviction |
| T-14-18-04 | T | accept | CLOSED | Recorded in 14-18-SUMMARY.md:34,93 + 14-DISPOSITIONS.md WR-01 row (SDK ~2s force-acquire is pre-existing lock-internal semantics). Logged below |

### Plan 14-19 — Terminal gate

| Threat ID | Category | Disposition | Status | Evidence |
|-----------|----------|-------------|--------|----------|
| T-14-19-01 | E | mitigate | CLOSED | Single rebuild committed (d3ce48c); dist-level greps verified live (`sdk/dist/config.js:91,194`; `sdk/dist/query/secret-commands.js:116`); six real-process GAP reproductions PASS |
| T-14-19-02 | R | mitigate | CLOSED | Four-part gate with two-run-union baseline; machine-checkable `14-SDK-BASELINE-DELTA.txt` (six `GAP*: PASS` + `NO NEW FAILURES: PASS` line 208) |
| T-14-19-03 | D | mitigate | CLOSED | Bounded convergence contract in 14-DISPOSITIONS.md (≤2 cycles, STOP rule); flake adjudication via isolated re-runs documented in gate rule 5 |
| T-14-19-04 | T | mitigate | CLOSED | Fresh oto-verifier run: 14-VERIFICATION.md `passed` 4/4, 2026-07-13T18:07:06Z, head f348bec; fresh review evidence 14-REVIEW.md (zero unresolved Criticals — FRESH-CR-01 fixed c8fc4d3, CR-02/03 developer-triaged DEFER) |

## Accepted Risks Log

| Threat ID | Risk | Justification | Documented |
|-----------|------|---------------|------------|
| T-14-07 | Attacker-planted keyfile impersonating the user's key | Local single-user machine; keyfile dir is 0700 under `$HOME` | 14-01-PLAN.md register |
| T-14-27 | GSD upstream sync clobbering the rewritten shared workflow | Sync hygiene contract (`docs/upstream-sync.md`); HARD-05 dry-run gate at milestone close, tracked `.oto/REQUIREMENTS.md:43,98` (Phase 16) | 14-04-PLAN.md register |
| T-14-05-05 | Repeat masked migration notices from read-only `~/.gsd/defaults.json` | Foreign install state is never rewritten (D-08); repeat notices are masked-only | 14-05-PLAN.md register; `secrets.cjs:450-454` |
| T-14-06-05 | Double-fault (config write fails AND best-effort restore fails) | Low probability; sanitized error thrown either way, no secret exposure | 14-06-PLAN.md register; 14-06-SUMMARY.md:117 |
| T-14-07-05 | Migration race with concurrent config writes (WR-02-era) | Accepted at plan time; subsequently hardened by Plan 14-18 same-lock transaction | 14-07-PLAN.md register; 14-07-SUMMARY.md:107 |
| T-14-09-05 | Env-var key shadowing a replaced keyfile (WR-08) | Pre-existing; secret-status explicitly reports the shadowed keyfile (`shadowed_keyfile`, `[shadows ...]` line) | 14-09-PLAN.md register |
| T-14-11-04 | Unlocked RMW in migration (WR-05 deferral) | Superseded: Plan 14-18 delivered same-lock migration in both layers — residual risk eliminated | 14-11-PLAN.md register; final state verified in code |
| T-14-13-07 | Residual lstat→open TOCTOU on regular-file swap | O_NOFOLLOW closes the symlink-swap case; remaining race requires local same-user access — outside this personal tool's threat model | 14-13-SUMMARY.md:36; 14-DISPOSITIONS.md WR-07 |
| T-14-18-04 | SDK `acquireStateLock` force-acquire after ~2s | Pre-existing lock-internal semantics; contention window shrank from unbounded to ≤2s; lock internals out of Phase 14 scope | 14-18-SUMMARY.md:34,93; 14-DISPOSITIONS.md WR-01 |

## Transferred Threats

| Threat ID | Transferred To | Verification |
|-----------|----------------|--------------|
| T-14-15-07 | Plan 14-19 (dist rebuild) | EXECUTED — rebuild committed (d3ce48c), dist-level reproductions PASS, dist greps confirmed live |
| T-14-17-04 | Phase 16 (WR-04, agent-skills consumers) | TRACKED — `.oto/STATE.md:87` Pending Todos pre-task with named owner + 14-DISPOSITIONS.md WR-04 row |

## Unregistered Flags

None. Summaries 14-05..14-08 declare "None" under `## Threat Flags`; summaries 14-13/14/15/16/18 state no unplanned threat surfaces were introduced; remaining summaries report no new attack surface. No executor-flagged surface lacks a threat-register mapping.

## Deferred Items (outside Phase 14 register, developer-triaged)

Fresh-review findings dispositioned with named owners (not open threats in this phase's register):
- **FRESH-CR-02** → Phase 15: per-runtime config-dir resolution for `/oto-settings-integrations` (`.oto/STATE.md:88`)
- **FRESH-CR-03** → Phase 16: workstream secret-status effective root-merge + root-layer migration (`.oto/STATE.md:89`)
- **FRESH-WR-01/02/03, FRESH-WR-06** → ACCEPT (single-user local-race / maintainability class, 14-DISPOSITIONS.md rows)
- **FRESH-WR-04/05** → Phase 15 (integration readiness detection; global-keyfile-scope consent UX)
