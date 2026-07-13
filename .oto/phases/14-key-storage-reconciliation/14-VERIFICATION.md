---
phase: 14-key-storage-reconciliation
verified: "2026-07-13T02:18:06Z"
verified_at: "2026-07-13T02:18:06Z"
verifier: "Codex (fresh independent oto-verifier)"
status: gaps_found
score: "1/4"
head: "cdda36cd0c249747ca6a299ac481a7f0cac59efe"
overrides_applied: 0
requirements:
  SECR-01: blocked
  SECR-02: passed
  SECR-03: blocked
  SECR-04: blocked
re_verification:
  previous_status: gaps_found
  previous_score: "0/4"
  gaps_closed:
    - "Array-shaped config-new-project input is rejected by CJS and SDK before the project .oto directory is created"
    - "Zero-byte keyfiles are treated as absent and legacy strings migrate to usable 0600 keyfiles"
    - "Malformed-config SDK config-set, secret-set, and secret-clear fail closed while preserving config bytes and keyfile state"
  gaps_remaining: []
  regressions: []
  new_gaps:
    - "Malformed-config parser errors disclose secret fragments through CJS config-get and SDK loadConfig consumers"
    - "The shared settings workflow hardcodes the Claude default install path and does not resolve Codex, Gemini, or custom config directories"
    - "Workstream secret-status bypasses inherited root flags and root-layer legacy migration"
review_convergence:
  fresh_review_status: issues_found
  unresolved_critical: 3
  undispositioned_warnings: 6
  convergence_contract: failed
  stop_condition: "Prior verifier blocker count 3; fresh review Critical count 3. The bounded contract requires stopping on a non-decreasing blocker count rather than automatically generating another gap-plan loop."
gaps:
  - truth: "Secret-bearing malformed config errors never echo key bytes"
    status: failed
    reason: >-
      CJS config-get and both selected/root SDK loadConfig parse paths interpolate
      JSON.parse error details. Fresh real-process probes printed the synthetic
      marker fragment SYNTHETICS to stderr.
    artifacts:
      - path: "oto/bin/lib/config.cjs"
        issue: "cmdConfigGet appends err.message to its read/parse failure"
      - path: "sdk/src/config.ts"
        issue: "loadConfig interpolates parser details for selected and inherited root config"
      - path: "sdk/dist/config.js"
        issue: "The shipped build contains both disclosure paths"
  - truth: "/oto-settings-integrations works across Claude, Codex, Gemini, and custom config directories"
    status: failed
    reason: >-
      The workflow defaults OTO_TOOLS to $HOME/.claude/oto/bin/oto-tools.cjs.
      Exact-block probes succeeded for a default Claude install, but Codex-only,
      Gemini-only, and CLAUDE_CONFIG_DIR installs emitted MODULE_NOT_FOUND,
      resolved an empty OTO_CONFIG_PATH, and continued to a misleading final SDK
      success.
    artifacts:
      - path: "oto/workflows/settings-integrations.md"
        issue: "Runtime-shared workflow hardcodes the default Claude config root"
      - path: "tests/14-settings-workflow-contract.test.cjs"
        issue: "Existing tests inject OTO_TOOLS and do not exercise installed defaults"
  - truth: "Workstream status reflects the effective root-to-workstream config and self-heals every effective legacy layer"
    status: failed
    reason: >-
      secret-status migrates and reads only the workstream leaf config. With root
      exa_search true and an empty workstream it reported disabled while shipped
      loadConfig returned true. With a root legacy string it reported disabled/no
      key, left the root file string-typed, and created no keyfile.
    artifacts:
      - path: "sdk/src/query/secret-commands.ts"
        issue: "secretStatus uses planningPaths(...workstream).config only"
      - path: "sdk/dist/query/secret-commands.js"
        issue: "The shipped command mirrors the leaf-only behavior"
      - path: "oto/workflows/settings-integrations.md"
        issue: "Workflow decisions and confirmation trust the incorrect status result"
---

# Phase 14: Key Storage Reconciliation Verification Report

**Phase goal:** Integration API keys exist only in environment variables or mode-0600 `~/.oto` keyfiles; committed config holds booleans only; legacy strings self-heal safely; secret mutations are transactional; and `/oto-settings-integrations` works across supported runtimes and workstreams.

**Verified:** 2026-07-13T02:18:06Z
**Status:** `gaps_found`
**Score:** **1/4** requirements satisfied

## Verdict

The three blocker families from the previous verifier are genuinely closed, and all fresh focused gates pass. That evidence is not sufficient for phase completion: every Critical from the fresh review reproduced independently against the current shipped surfaces.

The phase remains incomplete. Malformed config can echo secret fragments, the settings workflow is not portable across supported runtime install roots, and workstream status ignores inherited root state and root-layer migration. Only SECR-02 is fully satisfied.

## Goal Achievement

| # | Roadmap truth | Verdict | Fresh evidence |
|---|---|---|---|
| 1 | Stdin key entry creates a 0600 keyfile, leaves a boolean flag, and no key material reaches tracked config | **FAILED** | The ordinary path and old Gap 2 probe pass, but a root legacy string remains tracked when workstream `secret-status` is used, and malformed-config errors can echo secret fragments. |
| 2 | String values for all three integration flags are rejected through both write paths | **PASSED** | Fresh CJS and SDK real-process probes rejected `exa_search`, `brave_search`, and `firecrawl` strings, preserved config bytes, emitted the boolean-only pointer, and did not echo the supplied marker. The array-shaped new-project bypass is also closed. |
| 3 | Every effective legacy string self-heals to a usable 0600 keyfile with a boolean left in config | **FAILED** | The empty-keyfile case now heals, but workstream `secret-status` leaves a root legacy string unchanged and creates no keyfile. |
| 4 | Set/replace/clear/status is safe and works through `/oto-settings-integrations` across supported runtimes/workstreams | **FAILED** | The workflow entry fails path resolution on Codex-only, Gemini-only, and custom-dir installs; workstream status reports the wrong effective flag; malformed loader errors disclose secret fragments. |

## Previous-Gap Regression Check

| Previous blocker | Fresh result |
|---|---|
| Array-shaped config-new-project persisted nested plaintext | **CLOSED.** CJS exited 1 and SDK exited 10; neither created the project `.oto` directory or echoed the marker. |
| Empty keyfile discarded a valid legacy string | **CLOSED.** SDK status exited 0; config became boolean `true`; keyfile contained the legacy value at mode 0600; output showed only `****6789`. |
| Malformed SDK config mutation erased config/keyfile state | **CLOSED.** `config-set`, `secret-set`, and `secret-clear` each exited 1; config bytes stayed exactly `{bad json`; set removed its attempted keyfile and clear preserved the prior keyfile. |

These closures match the six `GAP*: PASS` lines in `14-SDK-BASELINE-DELTA.txt`, but were reproduced fresh rather than accepted from the summary.

## Fresh Critical Reproductions

### Critical 1 — Malformed-config secret disclosure

Fixture bytes: `{"exa_search": SYNTHETICSECRET1234567890}`.

| Surface | Exit | Result |
|---|---:|---|
| CJS `config-get exa_search` | 1 | **FAILED:** stderr contained `..."_search": SYNTHETICS"...`. |
| SDK dist `resolve-model gsd-planner` (selected config) | 1 | **FAILED:** `loadConfig` error contained the same marker fragment. |
| SDK dist `resolve-model gsd-planner --ws ws1` (malformed inherited root, valid leaf) | 1 | **FAILED:** inherited-root parse error contained the marker fragment. |
| SDK dist `config-get exa_search` control | 10 | **PASSED:** fixed `Malformed config.json at <path>` message; no marker fragment. |

This localizes the SDK disclosure to `loadConfig` consumers while confirming the direct SDK config-get guard is already sanitized.

### Critical 2 — Claude-only workflow tool path

The exact workflow entry block was executed with a real installed `oto-tools.cjs` present only in the runtime/config directory under test and with no `OTO_TOOLS` override.

| Simulated install | Tool actually installed at | Result |
|---|---|---|
| Default Claude | `$HOME/.claude/oto/bin/oto-tools.cjs` | **PASS:** config-path resolved; entry completed. |
| Codex-only | `$CODEX_HOME/oto/bin/oto-tools.cjs` | **FAIL:** hardcoded Claude module missing; config-path status 1; `OTO_CONFIG_PATH` empty. |
| Gemini-only | `$GEMINI_CONFIG_DIR/oto/bin/oto-tools.cjs` | **FAIL:** same `MODULE_NOT_FOUND` and empty path. |
| Custom Claude dir | `$CLAUDE_CONFIG_DIR/oto/bin/oto-tools.cjs` | **FAIL:** env override ignored; same failure. |

In all three failing cases the block continued to `oto-sdk query config-new-project` and ended with SDK status 0, so the workflow can appear successful despite failed canonical path/workstream resolution.

### Critical 3 — Workstream status bypasses root inheritance/migration

| Fixture | `secret-status exa --ws ws1` | Authoritative/post-state |
|---|---|---|
| Root `{exa_search:true}`, workstream `{}`, valid keyfile | `Exa: disabled — key from ~/.oto/exa_api_key (****6789)` | Shipped `loadConfig(project, "ws1")` returned `exa_search:true`. |
| Root legacy Exa string, workstream `{}`, no keyfile | `Exa: disabled — no key detected` | Root remained the plaintext string; no keyfile was created. |

The status surface is therefore inconsistent with the effective loader and does not satisfy read-time self-healing for the root layer under a workstream.

## Source and Shipped-Artifact Audit

| Area | Source finding | Shipped finding |
|---|---|---|
| CJS config-get | `oto/bin/lib/config.cjs` appends `err.message` | Direct CJS CLI reproduction leaks marker fragment. |
| SDK config loading | `sdk/src/config.ts` interpolates parse errors for selected and root config | `sdk/dist/config.js` contains both branches and leaked through the wrapper. |
| Settings workflow | Runtime-shared workflow defaults to `$HOME/.claude/...` | Installed-path simulations fail for Codex, Gemini, and custom dirs. |
| Workstream status | `sdk/src/query/secret-commands.ts` migrates/reads only the leaf config | `sdk/dist/query/secret-commands.js` has the same leaf-only calls. |
| Dist parity | `npm run build` completed | `git diff --exit-code -- sdk/dist` exited 0; the shipped dist matches current source. |

## Requirement Verdicts

| Requirement | Verdict | Evidence |
|---|---|---|
| **SECR-01** | **BLOCKED** | Ordinary keyfile storage passes, but workstream status can leave a root legacy key in tracked config, and malformed-config errors disclose secret fragments. |
| **SECR-02** | **PASSED** | Both CJS and SDK reject strings for all three integration keys without changing config or echoing the value; array/nested new-project bypasses are closed. |
| **SECR-03** | **BLOCKED** | Empty-keyfile and loader cases pass, but the workstream status read path neither migrates nor effectively reads the inherited root layer. |
| **SECR-04** | **BLOCKED** | CRUD happy paths are transactional, but the shared workflow is not runtime/config-dir portable and its workstream status/confirmation is incorrect. |

## Test and Build Evidence

| Command | Fresh result |
|---|---|
| `node --test --test-reporter=dot tests/14-*.test.cjs` | Exit 0; **99/99 passed**. |
| Enumerated 14-file Phase 14 SDK Vitest gate | Exit 0; **14/14 files, 271/271 tests passed**. |
| `cd sdk && npx tsc --noEmit` | Exit 0. |
| `cd sdk && npm run build` | Exit 0. |
| `git diff --exit-code -- sdk/dist` | Exit 0; source/dist synchronized. |
| Fresh full `cd sdk && npx vitest run` | Expected nonzero overall: **40 failed / 48 passed files; 266 failed / 1288 passed tests**. Machine comparison found **0 candidate offenders** against the 41-file/two-run union baseline, so the baseline-relative gate passes. |

The green focused suites and baseline-relative full-suite result are supporting evidence only. They do not cover or override the three reproduced Critical behaviors.

## Review-Convergence Assessment

| Contract item | Status | Evidence |
|---|---|---|
| 1. Fresh independent verification passes 4/4 | **FAILED** | This report is `gaps_found`, score 1/4. |
| 2. Fresh review has zero unresolved Criticals | **FAILED** | Fresh `14-REVIEW.md` reports 3 Criticals; all three reproduced. |
| 3. Every Warning is FIX / ACCEPT / DEFER with evidence | **FAILED** | The fresh review has 6 new Warnings; `14-DISPOSITIONS.md` covers historical findings only and has no rows for them. |
| 4. Focused CJS/SDK tests and typecheck pass | **PASSED** | 99/99 CJS, 271/271 SDK, and TypeScript exit 0. |
| 5. No persistent full-SDK regression beyond baseline | **PASSED** | Fresh run has zero candidate offenders versus the captured union/maxima. |

The bounded stop condition is now material: the prior verifier had three blockers and the fresh review still has three unresolved Criticals. Because the blocker count did not decrease, the contract says to stop and report the contradiction rather than automatically generating another open-ended gap-plan cycle.

The six fresh Warnings also require explicit disposition before closure: cross-layer lock identity, unlocked SDK `configEnsureSection`, CJS array-root false success, unusable keyfile availability detection, global keyfile effects from workstream Replace/Clear, and new-project rollback after final config-write failure.

## Required Remediation

1. Replace parser-detail interpolation with fixed path-only messages in CJS `cmdConfigGet` and both SDK `loadConfig` parse branches; add CJS/source/dist real-process marker-absence regressions.
2. Make settings workflow tool resolution runtime-neutral and config-dir-aware, then execute the unmodified installed entry block for Claude, Codex, Gemini, and custom directories without injecting `OTO_TOOLS`.
3. Make `secret-status` migrate root and leaf layers and derive flags from the same root-under-workstream effective merge as `loadConfig`; test inherited true, explicit workstream overrides, and root legacy-string post-state.
4. Add FIX / ACCEPT / DEFER rows with evidence for all six fresh Warnings.

## Next-Step Guidance

**Do not run `/oto-execute-phase 14` or `/oto-secure-phase 14`, and do not automatically create another unconstrained gap-plan loop.** The bounded convergence stop condition has fired. Return the three Critical reproductions and six undispositioned Warnings to the developer for an explicit decision on the final permitted revision cycle. If that cycle is authorized, revise one bounded plan set covering all three Criticals plus the complete Warning disposition matrix, then execute and re-run fresh review and verification.

---

_Verified: 2026-07-13T02:18:06Z_
_Verifier: Codex (fresh independent oto-verifier)_
