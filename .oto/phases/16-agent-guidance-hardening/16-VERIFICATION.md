---
phase: 16-agent-guidance-hardening
verified: "2026-07-17T21:45:51Z"
verified_at: "2026-07-17T21:45:51Z"
verifier: "Codex (oto-verifier, independent full sweep)"
status: gaps_found
score: "7/9"
blocker_count: 2
head: "d4d4154f9ad5768054bcc3fd2598671cd34fb89a"
verification_scope: "full sweep"
requirements:
  GUID-01: gaps_found
  GUID-02: passed
  GUID-03: passed
  GUID-04: passed
  GUID-05: passed
  HARD-01: passed
  HARD-03: passed
  HARD-04: passed
  HARD-05: gaps_found
review_adjudication:
  WR-01: blocking
  WR-02: non_blocking_follow_up
  WR-03: blocking
progress_log_lines: 9
---

# Phase 16: Agent Guidance + Hardening — Verification Report

## Verdict

**Status:** `gaps_found`
**Score:** **7/9 requirements passed**
**Blocking gaps:** **2**

Phase 16's core implementation is largely present and its automated search, transform, documentation, runtime-sync, repository, and baseline-relative SDK gates reproduce successfully. The developer-approved HARD-04 evidence is sufficient and was not duplicated. However, two fresh review reproductions invalidate explicit phase contracts:

1. the canonical guidance promises availability booleans that none of its five consuming spawn paths supplies; and
2. the exact all-upstream sync path overwrites the first upstream's durable conflict evidence with the second upstream's evidence for overlapping targets.

Those are operational contract gaps, not merely missing test coverage. Phase completion should wait for bounded fixes and re-verification of the affected requirements.

## Requirement Accounting

| Requirement | Verdict | Independent evidence |
|---|---|---|
| **GUID-01** — one shared runtime-neutral ladder with 429 no-retry | **GAPS FOUND** | `oto/references/search-tools.md` exists, is runtime-neutral, and its structural test passes. Its Availability Gates section nevertheless states that every init/orchestrator context carries `exa_search`, `brave_search`, and `firecrawl`. Fresh inspection of all five consuming spawn workflows found neither those fields nor the emitted `*_search_available` fields. The canonical guidance therefore contains a false runtime premise and cannot be followed as written. |
| **GUID-02** — three researchers consume shared guidance | **PASSED** | All three researcher sources include the single reference; drifted Brave/Exa/Firecrawl sections are absent. Structural and runtime-sync checks passed. |
| **GUID-03** — debugger/advisor gain Exa access and shared guidance | **PASSED** | Both agents carry `mcp__exa__*`, include the shared reference, and match installed Claude/Codex roots. The developer's live debugger probe confirms the wildcard resolves to all three exact tools. |
| **GUID-04** — deprecated Exa names absent | **PASSED** | Fresh transform-output suite checked five agents across source, Codex markdown, Codex TOML, and Gemini markdown, plus every shipped reference; no deprecated name was found. |
| **GUID-05** — Codex/Gemini transformed naming verified | **PASSED** | Fresh transform tests confirm Codex preserves Exa access for debugger/advisor and Gemini frontmatter/body carries no Claude Exa namespace. |
| **HARD-01** — keyless research completes without user-facing errors | **PASSED** | Developer-approved fresh keyless session completed through WebSearch with zero user-facing errors, no Exa retry loop, and exit 0. Fresh CJS availability tests (5/5) and SDK Brave/status tests (9/9) also passed. WR-03 remains a separate guidance-contract gap; it does not negate the observed HARD-01 outcome. |
| **HARD-03** — generated matrix and qualitative docs | **PASSED** | Runtime-matrix byte-equality test passed; the three-runtime Exa row, README link, setup/fallback docs, and qualitative 429 behavior are present. |
| **HARD-04** — tools-restricted subagent e2e | **PASSED** | Approved live evidence records all three exact `mcp__exa__*` tools, one real search with 10 current Node LTS results, and no unrecognized warning. No secret or masked suffix is recorded. |
| **HARD-05** — milestone-close sync conflict-surface check | **GAPS FOUND** | The exact dry-run ran both upstreams and the terminal inventory was copied into `16-06-SUMMARY.md`. Fresh reproduction shows the shipped `--upstream all` path writes both legs to one `.oto-sync-conflicts` namespace: the Superpowers leg replaces an overlapping GSD sidecar and rewrites `REPORT.md` to the Superpowers-only report. The durable combined conflict surface is therefore incomplete, so the upstream-sync hygiene/check contract is not achieved. |

## Must-Have Evidence

### Shared guidance and five consumers

- `oto/references/search-tools.md` contains the Exa → Brave → built-in ladder, all three registered Exa tool names, the tool-not-found rule, and the exact 429 no-retry rule.
- The reference contains zero `mcp__` namespace tokens.
- `oto-phase-researcher`, `oto-project-researcher`, `oto-ui-researcher`, `oto-debugger`, and `oto-advisor-researcher` each include the same reference exactly once.
- Debugger/advisor retain the wildcard because the live probe proved it resolves correctly on the installed runtime.

### HARD-01 implementation

- `cmdInitNewProject` uses `detectKeySource` for Exa, Brave, and Firecrawl; empty and whitespace-only files report unavailable.
- SDK websearch uses environment-first `readKeyfile('brave')` fallback and returns structured unavailability without throwing.
- Workstream secret-status migrates root and selected-workstream layers, then reads the effective `loadConfig` merge with masked-only output.
- Legacy comma-joined `agent_skills` values split/trim before existing validation; the workflow persists validated JSON arrays.

### Matrix, docs, live proof, and baseline

- Generated matrix output byte-equals `bin/lib/runtime-matrix.cjs` and documents all three runtime registration shapes.
- Search docs cover hidden key entry, consent, the exact three tools, Brave, fallback, qualitative 429 handling, and fingerprint-safe uninstall.
- HARD-04 developer evidence meets both keyed and keyless plan legs; restoration is recorded without key bytes.
- Fresh full SDK run remains inside the amended authoritative union: 40 failing files, 267 failed / 1335 passed tests, 0 new failing files, and 0 files over maxima. `read-only-parity.integration.test.ts` was 20/21 and `decomposed-handlers.test.ts` was 7/7. No baseline or golden row was changed by verification.

## Fresh Test Evidence

| Command / reproduction | Result |
|---|---|
| Phase 16 + matrix + sync + coverage focused `node:test` set | **84 passed, 0 failed** |
| `node scripts/check-runtime-sync.cjs` | **PASS** — Claude/Codex `ok`; Gemini skipped (no install) |
| `cd sdk && npx --no-install vitest run src/query/websearch.test.ts src/query/secret-status-inheritance.test.ts` | **9 passed, 0 failed** |
| `cd sdk && npx --no-install tsc --noEmit` | **PASS** |
| `npm test` | 967 total: **963 passed, 1 failed, 3 skipped**; sole failure was sandbox DNS `ENOTFOUND registry.npmjs.org` in the install smoke |
| Network-enabled rerun: `node --test tests/phase-04-mr01-install-smoke.test.cjs` | **1 passed, 0 failed** |
| Full SDK JSON run + amended-union comparison | **NO NEW FAILURES: PASS** — 40 failing files, 0 new, 0 over max |
| WR-01 focused reproduction | Final overlapping sidecar had `upstream: superpowers`, contained only Superpowers content, and `REPORT.md` was Superpowers-only |
| WR-02 focused reproduction | Engine exited 0 and copied raw `.planning` plus `gsd-skill` unchanged from an allowlisted test |
| WR-03 five-workflow inspection | All five workflows lacked both canonical availability fields and the emitted `*_available` spelling |

## Review-Warning Adjudication

### WR-01 — BLOCKING (maps to HARD-05)

This is not just a future acceptance UX problem. Phase 16 changed `--upstream all` so the second leg runs after a nonzero first leg, while both legs still target the same sidecar/report namespace. The exact milestone-close command therefore does not leave a durable record of the full conflict surface it claims to inspect. Manual transcription in `16-06-SUMMARY.md` preserves this run's terminal inventory, but it does not repair the shipped sync behavior or make later `oto sync --status` / `--accept` provenance-safe.

### WR-02 — NON-BLOCKING FOLLOW-UP

The whole-file `do_not_rename` entries do bypass semantic rebranding, and the current test only checks allowlist presence. That should be corrected before accepting/applying those upstream test assets. It does not invalidate one of the nine Phase 16 requirements in this run because no upstream content was applied, the three additions were still surfaced in the dry-run inventory, and the phase contract does not require importing those tests. Keep it as explicit sync/rebrand debt; do not silently treat the allowlist as a semantic port.

### WR-03 — BLOCKING (maps to GUID-01 and roadmap success criterion 1)

The shared file is the canonical behavior contract, not optional commentary. It says contexts carry three exact booleans and instructs all five agents to trust them before using a rung. `init.new-project` emits different names, `init.plan-phase` exposes config values internally, and none of the actual spawn prompts injects either form. Passing independent reference/init tests do not establish the missing key link. The approved debugger keyless leg proves the fallback outcome for one session, so HARD-01 passes, but it cannot make the five-consumer availability claim true.

## Inherited Debt Context

The developer-approved WR-02 planning-root disposition remains valid and separate from these gaps. The current SDK failures stay within the amended Plan 14-16 union, the two todo-parity golden rows remain unchanged/failing/counted when present, and the broader CJS/SDK planning-root migration was not started. It remains a separately bounded task before milestone close if milestone hard gates require a fully green SDK suite.

## Blocking Gaps

1. **Preserve both upstreams' durable sync evidence.** Namespace `.oto-sync-conflicts` sidecars/reports by upstream or write a provenance-preserving aggregate. Add an end-to-end `--upstream all` test with an overlapping target and prove both records remain available after the second leg. Re-verify HARD-05.
2. **Make the availability contract real.** Choose one canonical spelling and thread usable Exa/Brave/Firecrawl availability into every one of the five consuming spawn prompts, or rewrite the canonical reference around runtime-observable tool availability and the structured Brave response. Add an end-to-end workflow-shape test from init output to all five prompts. Re-verify GUID-01 and success criterion 1.

No source, baseline, golden row, STATE, ROADMAP, REQUIREMENTS, plan, summary, or disposition file was modified by this verifier. `INTERVIEW-BRIEF-oto.md` remains untouched.

---

_Verified: 2026-07-17T21:45:51Z_
_Verifier: Codex (oto-verifier, independent full sweep)_
