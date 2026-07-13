---
phase: 14-key-storage-reconciliation
verified: "2026-07-13T18:07:06Z"
verified_at: "2026-07-13T18:07:06Z"
verifier: "Claude (oto-verifier, post-triage fresh re-verification)"
status: passed
score: "4/4"
head: "f348bec1c195d9292c195bb9c8bb3e8ed417dd93"
overrides_applied: 4
overrides:
  - must_have: "Workstream secret-status reflects effective root-to-workstream flags and self-heals the root legacy layer (blocked SECR-01)"
    reason: "FRESH-CR-03 dispositioned DEFER to Phase 16 (Agent Guidance + Hardening) alongside WR-04; STATE.md Pending Todos pre-task recorded. Core promise verified intact: no new plaintext is created, and the primary loader path (loadConfig --ws) heals the root legacy string to a 0600 keyfile."
    accepted_by: "developer triage (14-DISPOSITIONS.md, quick 260713-fym)"
    accepted_at: "2026-07-13"
  - must_have: "Every effective legacy string self-heals via every read surface, including workstream secret-status (blocked SECR-03)"
    reason: "FRESH-CR-03 dispositioned DEFER to Phase 16; STATE.md pre-task explicitly owns root-layer legacy migration under workstream status. Primary self-heal paths (loadConfig root+leaf, non-workstream secret-status) verified healing live."
    accepted_by: "developer triage (14-DISPOSITIONS.md)"
    accepted_at: "2026-07-13"
  - must_have: "/oto-settings-integrations resolves the oto-tools path on Codex-only, Gemini-only, and custom config-dir installs (blocked SECR-04)"
    reason: "FRESH-CR-02 dispositioned DEFER to Phase 15 (Exa MCP Registration), which owns per-runtime config-dir resolution; STATE.md pre-task recorded. Core promise verified intact on the primary supported path (default Claude install): stdin-only key entry, masked status, no plaintext persisted."
    accepted_by: "developer triage (14-DISPOSITIONS.md)"
    accepted_at: "2026-07-13"
  - must_have: "Workflow workstream status/confirmation matches the effective loader (blocked SECR-04)"
    reason: "FRESH-CR-03 dispositioned DEFER to Phase 16 (see above); the workflow status surface will follow the fixed secret-status. No secret disclosure or new plaintext on the deferred path."
    accepted_by: "developer triage (14-DISPOSITIONS.md)"
    accepted_at: "2026-07-13"
requirements:
  SECR-01: passed
  SECR-02: passed
  SECR-03: passed
  SECR-04: passed
re_verification:
  previous_status: gaps_found
  previous_score: "1/4"
  previous_verified: "2026-07-13T02:18:06Z"
  previous_head: "cdda36cd0c249747ca6a299ac481a7f0cac59efe"
  gaps_closed:
    - "FRESH-CR-01: Malformed-config parser errors no longer disclose secret fragments — fixed in commit c8fc4d3 (quick 260713-fym); all three prior reproductions now emit only 'Malformed JSON in config file at <path>'"
  gaps_dispositioned:
    - "FRESH-CR-02: Shared settings workflow hardcodes the Claude default tool path — DEFER to Phase 15 (developer triage, STATE.md pre-task)"
    - "FRESH-CR-03: Workstream secret-status bypasses inherited root flags and migration — DEFER to Phase 16 (developer triage, STATE.md pre-task)"
  gaps_remaining: []
  regressions: []
  history:
    - verified: "2026-07-12T02:27:06Z"
      status: gaps_found
      score: "0/4"
    - verified: "2026-07-13T02:18:06Z"
      status: gaps_found
      score: "1/4"
      new_gaps:
        - "Malformed-config parser errors disclose secret fragments through CJS config-get and SDK loadConfig consumers"
        - "The shared settings workflow hardcodes the Claude default install path and does not resolve Codex, Gemini, or custom config directories"
        - "Workstream secret-status bypasses inherited root flags and root-layer legacy migration"
deferred:
  - truth: "/oto-settings-integrations resolves oto-tools across Codex, Gemini, and custom config directories"
    addressed_in: "Phase 15 (Exa MCP Registration)"
    evidence: "14-DISPOSITIONS.md FRESH-CR-02 row; .oto/STATE.md Pending Todos: 'Phase 15 pre-task (FRESH-CR-02): own per-runtime config-dir resolution plus the /oto-settings-integrations per-runtime status surface across Claude, Codex, Gemini, and custom config directories.'"
  - truth: "Workstream secret-status derives flags from the root-under-workstream effective merge and heals the root legacy layer"
    addressed_in: "Phase 16 (Agent Guidance + Hardening)"
    evidence: "14-DISPOSITIONS.md FRESH-CR-03 row; .oto/STATE.md Pending Todos: 'Phase 16 pre-task (FRESH-CR-03): own effective root-to-workstream secret-status flags and root-layer legacy migration, including inherited booleans and legacy-string post-state.'"
  - truth: "New-project readiness counts only usable keyfile paths (FRESH-WR-04)"
    addressed_in: "Phase 15 (Exa MCP Registration)"
    evidence: "14-DISPOSITIONS.md FRESH-WR-04 row: Phase 15 owns integration readiness/status and must reuse canonical key-source detection."
  - truth: "Workstream Replace/Clear discloses and confirms its global-credential scope (FRESH-WR-05)"
    addressed_in: "Phase 15 (Exa MCP Registration)"
    evidence: "14-DISPOSITIONS.md FRESH-WR-05 row: Phase 15 owns /oto-settings-integrations consent and per-runtime status UX."
  - truth: "Comma-separated agent skills persist as a validated JSON array (WR-04)"
    addressed_in: "Phase 16 (Agent Guidance + Hardening)"
    evidence: "14-DISPOSITIONS.md WR-04 row; .oto/STATE.md Pending Todos Phase 16 pre-task (WR-04)."
review_convergence:
  fresh_review_status: triaged
  unresolved_critical: 0
  undispositioned_warnings: 0
  convergence_contract: satisfied_with_developer_dispositions
  note: >-
    The 2026-07-13T02:18 bounded-convergence stop condition fired and was
    resolved by developer triage (14-DISPOSITIONS.md, quick 260713-fym):
    FRESH-CR-01 FIX (verified real in this pass), FRESH-CR-02/03 DEFER with
    named phase owners and STATE.md pre-tasks, all six fresh Warnings
    dispositioned (FRESH-WR-01/02/03/06 ACCEPT, FRESH-WR-04/05 DEFER).
---

# Phase 14: Key Storage Reconciliation — Post-Triage Verification Report

**Phase goal:** Integration API keys live only in `~/.oto/<integration>_api_key` (mode 0600) or env vars; committed `.oto/config.json` holds booleans only — enforced in both write paths, with self-healing migration for legacy string values.

**Verified:** 2026-07-13T18:07:06Z (HEAD `f348bec`)
**Status:** `passed`
**Score:** **4/4** requirements satisfied (with 4 developer-authorized disposition applications)
**Re-verification:** Yes — post-triage fresh re-verification after the 2026-07-13T02:18:06Z `gaps_found` (1/4) result and the developer triage recorded in `14-DISPOSITIONS.md`.

## Verdict

The single FIX from developer triage (FRESH-CR-01) is real in the current tree: all three of the previous verifier's disclosure reproductions now emit only the fixed path-only message with zero secret bytes. The two DEFERs (FRESH-CR-02 → Phase 15, FRESH-CR-03 → Phase 16) are properly recorded in `14-DISPOSITIONS.md` and `.oto/STATE.md` Pending Todos, and neither deferred defect violates the phase goal's core promise — no plaintext key is persisted to committed config on any primary supported path, and self-healing works through the canonical loader. All evidence gates pass on the current tree. No NEW findings outside the disposition matrix were discovered.

## Blocker Disposition Verification

### FRESH-CR-01 — Malformed-config secret disclosure: FIXED (verified by reproduction, not test existence)

Commit `c8fc4d3f6f1a5bcabf7e9a4a062b5af483b82975` ("fix(config): sanitize malformed JSON errors") is in history and its changes are live in `oto/bin/lib/config.cjs:495`, `sdk/src/config.ts:260,275`, and rebuilt `sdk/dist/config.js:194,207`. `git diff --exit-code -- sdk/dist` exits 0 (dist parity).

Fresh real-process reproductions with fixture bytes `{"exa_search": SYNTHETICSECRET1234567890}`:

| Surface | Exit | stderr | Marker leak |
|---|---:|---|---|
| CJS `oto-tools config-get exa_search` | 1 | `Error: Malformed JSON in config file at <path>` — no parser detail | **NONE** |
| SDK dist `oto-sdk query resolve-model gsd-planner` (selected malformed config) | 1 | Same fixed message | **NONE** |
| SDK dist `oto-sdk query resolve-model gsd-planner --ws ws1` (malformed inherited root, valid leaf) | 1 | Same fixed message | **NONE** |

Config bytes were untouched in every probe. Regression tests exist and pass: `tests/14-configget-guard.test.cjs` (6/6) and `sdk/src/config-parse-sanitization.test.ts` (2/2).

### FRESH-CR-02 — Claude-hardcoded workflow tool path: DEFERRED (Phase 15) — deferral verified

- Disposition row present in `14-DISPOSITIONS.md` (DEFER, owner Phase 15 Exa MCP Registration).
- STATE pre-task present: `.oto/STATE.md` Pending Todos line "Phase 15 pre-task (FRESH-CR-02): own per-runtime config-dir resolution plus the `/oto-settings-integrations` per-runtime status surface…".
- Core-promise check: the hardcoded default remains at `oto/workflows/settings-integrations.md:55` (expected — that is the deferred defect). On the primary supported path (default Claude install) the prior fresh verification's installed-path matrix passed, and the workflow's key handling is stdin/TTY-only with `****<last-4>` masking (`secret-set <slug>` — never argv, never chat). The defect is portability, not secret persistence: no path writes a plaintext key to committed config.

### FRESH-CR-03 — Workstream secret-status bypasses root inheritance/migration: DEFERRED (Phase 16) — deferral verified

- Disposition row present in `14-DISPOSITIONS.md` (DEFER, owner Phase 16 Agent Guidance + Hardening, alongside WR-04).
- STATE pre-task present: `.oto/STATE.md` Pending Todos line "Phase 16 pre-task (FRESH-CR-03): … own effective root-to-workstream secret-status flags and root-layer legacy migration…".
- Core-promise check (fresh live probes):
  - Deferred defect confirmed unchanged: root legacy string + empty ws1 → `secret-status exa --ws ws1` reports "disabled — no key detected" and leaves the root string in place. It creates **no new plaintext** and discloses **no key bytes**.
  - Primary path heals: the very next `resolve-model --ws ws1` (loadConfig) migrated the root legacy string → `~/.oto/exa_api_key` mode 0600, root config became `{"exa_search": true}`. Self-healing therefore holds on the canonical read path that every consumer other than the deferred status surface uses.

## Core SECR Promise — Fresh Live Probes (current tree, isolated $HOME)

| Probe | Result |
|---|---|
| CJS `config-set exa_search "sk-…"` | Exit 1, boolean-only pointer message, config bytes unchanged, no echo of value |
| SDK `config-set exa_search "sk-…"` | Exit 10, same rejection, config bytes unchanged |
| SDK `secret-status exa` over legacy string config | Exit 0; migrated to `~/.oto/exa_api_key` mode **0600**; config became `{"exa_search": true}`; output masked `****abcd`; rotation warning printed |
| SDK `secret-set brave` via **stdin** | Exit 0; keyfile mode **0600**; config boolean `brave_search: true`; masked `****zyxw`; no plaintext in config |
| SDK `secret-status brave` | `Brave: enabled — key from ~/.oto/brave_api_key (****zyxw)` |
| SDK `secret-clear brave` | Keyfile removed; `brave_search` set to `false` |
| This repo's own `.oto/config.json` | `exa_search`/`brave_search`/`firecrawl` are all booleans — no key material |

## Requirement Verdicts

| Requirement | Verdict | Evidence |
|---|---|---|
| **SECR-01** — keys only in 0600 keyfile or env var, never committed config | **PASSED** (1 override: FRESH-CR-03 deferral) | Keyfile storage, 0600 mode, masked display all verified live; malformed-config disclosure (the other prior blocker on this requirement) is FIXED and reproduced clean; the residual workstream-status non-heal is the deferred Phase 16 pre-task and creates no new plaintext. |
| **SECR-02** — boolean-only integration flags in both write paths | **PASSED** (no override) | Fresh CJS and SDK real-process rejections for string values; array/nested new-project bypasses remain closed (tests/14-newproject-shape-guard 99/99 aggregate green); config bytes preserved; value never echoed. |
| **SECR-03** — legacy strings self-heal to keyfile with boolean left | **PASSED** (1 override: FRESH-CR-03 deferral) | Live migration verified through secret-status (non-ws) and loadConfig root-layer heal under `--ws`; empty-keyfile heal covered by tests/14-empty-keyfile (green). The one non-healing surface (workstream secret-status) is the dispositioned Phase 16 deferral. |
| **SECR-04** — set/replace/clear via `/oto-settings-integrations`, stdin-only, masked | **PASSED** (2 overrides: FRESH-CR-02 and FRESH-CR-03 deferrals) | Set/replace/clear/status CRUD verified live and transactional; workflow enforces stdin-only entry and `****<last-4>` masking; malformed-loader disclosure FIXED. Runtime portability (Phase 15) and workstream status fidelity (Phase 16) are developer-authorized deferrals with STATE pre-tasks. |

## Requirements Coverage

All four IDs are claimed across plan frontmatter (14-01 … 14-19; e.g. 14-19 declares `[SECR-01, SECR-02, SECR-03, SECR-04]`). No orphaned Phase 14 requirements exist in `.oto/REQUIREMENTS.md` (rows 76-79 map exactly SECR-01..04 to Phase 14).

## Test and Build Evidence (current tree)

| Command | Result |
|---|---|
| `node --test --test-reporter=dot tests/14-*.test.cjs` | Exit 0 (all dots, no failures) |
| `node --test tests/14-configget-guard.test.cjs` | 6 pass / 0 fail |
| Enumerated Phase 14 SDK gate (14 files from plan 14-19 Task 3 Part 2) + `config-parse-sanitization.test.ts` | **15 files passed, 273/273 tests passed** |
| `cd sdk && npx vitest run src/config-parse-sanitization.test.ts` | 2/2 passed |
| `cd sdk && npx tsc --noEmit` | Exit 0 |
| `git diff --exit-code -- sdk/dist` | Exit 0 — shipped dist matches source |

## Disposition-Matrix Completeness

Every finding from both review cycles has a FIX / ACCEPT / DEFER row in `14-DISPOSITIONS.md`: CR-01..03 and WR-01..10 + IR-01/02 (historical, FIX/DEFER), FRESH-CR-01 (FIX — verified above), FRESH-CR-02/03 (DEFER — verified above), FRESH-WR-01/02/03/06 (ACCEPT with documented justifications), FRESH-WR-04/05 (DEFER, owner Phase 15). No finding is silently unaddressed, and this verification pass surfaced **no new findings** outside the matrix.

## Deferred Items (informational — tracked, not gaps)

| # | Item | Addressed in | Evidence |
|---|---|---|---|
| 1 | Per-runtime config-dir resolution for the settings workflow (FRESH-CR-02) | Phase 15 | STATE.md Pending Todos Phase 15 pre-task |
| 2 | Effective root-to-workstream secret-status + root legacy migration (FRESH-CR-03) | Phase 16 | STATE.md Pending Todos Phase 16 pre-task |
| 3 | Usable-keyfile readiness detection in new-project (FRESH-WR-04) | Phase 15 | 14-DISPOSITIONS.md row |
| 4 | Global-scope consent for workstream Replace/Clear (FRESH-WR-05) | Phase 15 | 14-DISPOSITIONS.md row |
| 5 | Agent-skills JSON-array persistence (WR-04) | Phase 16 | STATE.md Pending Todos Phase 16 pre-task |

---

_Verified: 2026-07-13T18:07:06Z_
_Verifier: Claude (oto-verifier, post-triage fresh re-verification)_
