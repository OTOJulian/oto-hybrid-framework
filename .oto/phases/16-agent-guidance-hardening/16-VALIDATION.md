---
phase: 16
slug: agent-guidance-hardening
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-07-17
---

# Phase 16 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `node:test` (Node 22.17.1 built-in) for repo `.cjs`; Vitest for `sdk/` |
| **Config file** | none — glob convention `tests/*.test.cjs`; `sdk/` uses its own vitest config |
| **Quick run command** | `node --test tests/16-*.test.cjs` |
| **Full suite command** | `npm test` (repo) + `cd sdk && npx vitest run` (SDK) |
| **Estimated runtime** | ~30-60 seconds (repo suite); ~30 seconds (SDK) |

---

## Sampling Rate

- **After every task commit:** Run `node --test tests/16-*.test.cjs`; plus `node scripts/check-runtime-sync.cjs` on any task touching `oto/agents|references|workflows`
- **After every plan wave:** Run `npm test` (and `cd sdk && npx vitest run` if the wave touched `sdk/src`)
- **Before `/oto-verify-work`:** Repository suite green + SDK amended-baseline delta PASS + HARD-04 checkpoint approved + HARD-05 dry-run recorded
- **Max feedback latency:** ~60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 16-01-01 | 01 | 1 | GUID-01 | T-16-01-02 | No mcp__ tokens / no secrets in shipped reference | structural | `node --test tests/16-search-reference.test.cjs` | ✅ | ✅ green |
| 16-01-02 | 01 | 1 | GUID-02 | T-16-01-01 | Runtime roots byte-synced (no stale guidance) | structural | `node --test tests/16-search-reference.test.cjs && node scripts/check-runtime-sync.cjs` | ✅ | ✅ green |
| 16-02-01 | 02 | 1 | HARD-01 | T-16-02-03 | Empty/dangling keyfile → available:false | unit (tmp HOME fixtures) | `node --test tests/16-availability-coherence.test.cjs` | ✅ | ✅ green |
| 16-02-02 | 02 | 1 | HARD-01 (WR-04 pre-task) | T-16-02-01 | Each skill name validated (slug regex + validatePath) before persist | unit + e2e contract | `node --test tests/16-agent-skills-array.test.cjs` | ✅ | ✅ green |
| 16-03-01 | 03 | 1 | HARD-01 | T-16-03-02, T-16-03-04 | Key only in fetch header; structured degradation, never throws | unit (vitest, fetch stub) | `cd sdk && npx vitest run src/query/websearch.test.ts` | ✅ | ✅ green |
| 16-03-02 | 03 | 1 | HARD-01 (FRESH-CR-03 pre-task) | T-16-03-01, T-16-03-03 | Masked-only status; lock-protected root migration | unit (vitest fixtures) | `cd sdk && npx vitest run src/query/secret-status-inheritance.test.ts` | ✅ | ✅ green |
| 16-04-01 | 04 | 1 | HARD-03 | T-16-04-02 | Generated matrix never hand-edited | unit (existing regen-diff) | `node --test tests/phase-08-runtime-matrix-render.test.cjs` | ✅ | ✅ green |
| 16-04-02 | 04 | 1 | HARD-03 | T-16-04-01 | No key values / no numeric quotas in docs | grep gate | `test -f docs/search-integrations.md && ! grep -nE '[0-9,]+ ?(requests|req|calls|QPS)' docs/search-integrations.md` | n/a (grep) | ✅ green |
| 16-05-01 | 05 | 2 | GUID-03 | T-16-05-01 | Grant limited to 3 read-only Exa tools | structural | `node --test tests/16-search-reference.test.cjs && node scripts/check-runtime-sync.cjs` | ✅ (extends 16-01 file) | ✅ green |
| 16-05-02 | 05 | 2 | GUID-04, GUID-05 | T-16-05-02 | Real transforms in-process; OUTPUT greps | unit | `node --test tests/16-transformed-tool-names.test.cjs` | ✅ | ✅ green |
| 16-06-01 | 06 | 3 | all | — | Key never printed (source label only) | gate | `npm test && node scripts/check-runtime-sync.cjs`; SDK amended-baseline delta | ✅ | ⚠️ DEFER — automated repo gates green; SDK baseline-relative PASS |
| 16-06-02 | 06 | 3 | HARD-04, HARD-01 | T-16-06-01 | Key never pasted into transcript | manual (checkpoint) | n/a — checkpoint:human-verify | n/a | ✅ developer-approved: both live legs passed |
| 16-06-03 | 06 | 3 | HARD-05 | T-16-06-02, T-16-06-03 | Conflict baseline recorded; keyfile restored | scripted manual | `node bin/install.js sync --upstream all --to latest --dry-run` (network fallback because `oto` was not on PATH) | n/a | ✅ recorded and dispositioned |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Test files are created RED-first inside the same tasks that turn them green (tdd="true" tasks) — no separate Wave 0 plan needed:

- [x] `tests/16-search-reference.test.cjs` — GUID-01/02/03 structural guards (plan 16-01, extended in 16-05)
- [x] `tests/16-availability-coherence.test.cjs` — HARD-01 CJS fixtures (plan 16-02)
- [x] `tests/16-agent-skills-array.test.cjs` — WR-04 e2e (plan 16-02)
- [x] `sdk/src/query/websearch.test.ts` — Brave keyfile rung (plan 16-03)
- [x] `sdk/src/query/secret-status-inheritance.test.ts` — FRESH-CR-03 (plan 16-03)
- [x] `tests/16-transformed-tool-names.test.cjs` — GUID-04/05 transform-output greps (plan 16-05)
- Framework install: none needed (node:test built-in; vitest already in sdk/)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions | Result |
|----------|-------------|------------|-------------------|--------|
| `mcp__exa__*` reaches a tools-restricted subagent; one live call returns results | HARD-04 | Needs a live Claude Code session + real key + network; live CLIs banned from automated install path (15-VALIDATION.md precedent) | 16-06 Task 2 checkpoint, Leg A (probe with tool enumeration) | ✅ Fresh `oto-debugger` enumerated all three Exa tools; one search returned 10 real current Node LTS results; no unrecognized warning |
| Keyless research flow completes with zero user-facing errors via fallback floor | HARD-01 (live leg) | Same live-session constraint | 16-06 Task 2 checkpoint, Leg B (key moved aside, restore after) | ✅ Fresh keyless session used WebSearch fallback, emitted no user-facing errors or Exa retry loop, and exited 0; keyfile restored |
| Upstream conflict surface at milestone close | HARD-05 | Requires network fetch of upstreams; results are findings to disposition, not pass/fail | 16-06 Task 3: `oto sync --upstream all --to latest --dry-run`, record + disposition | ✅ Both upstreams inspected; 269 same-line conflicts, 952 added/unclassified, 31 deleted, 66 clean; no upstream content applied |

---

## Plan 16-06 Close Evidence (2026-07-17)

### Green gates

- Final `npm test` — PASS: 967 tests, 964 passed, 0 failed, 3 skipped.
- `node --test tests/16-*.test.cjs` — PASS: 45/45.
- `cd sdk && npx vitest run src/query/websearch.test.ts src/query/secret-status-inheritance.test.ts` — PASS: 9/9.
- `node scripts/check-runtime-sync.cjs` — PASS: Claude and Codex `ok`; Gemini skipped because no oto install exists.
- Installed Claude debugger contains one `mcp__exa__*` wildcard; installed shared search reference byte-matches the repository copy.
- `detectKeySource('exa').source` — `keyfile`; no credential bytes were printed.

### Developer-approved SDK baseline-relative disposition

- The developer approved updating the two stale websearch expectations to the intentional HARD-01 env-or-keyfile reason. Focused rerun: `src/query/decomposed-handlers.test.ts` returned to 7 inherited failures and `src/golden/read-only-parity.integration.test.ts` returned to 21.
- The developer approved amending only `src/golden/read-only-parity.integration.test.ts` from `max_failed=19` to `max_failed=21`. The exact +2 remain the failing, counted `list.todos` and `todo.match-phase` golden rows caused by tracked WR-02 planning-root divergence after pre-Phase-16 commit `e4c661b` added a pending todo.
- Fresh close rerun `cd sdk && npx vitest run` — expected inherited-debt FAIL: 40 files failed, 51 passed; 268 tests failed, 1334 passed. This is not a green full SDK suite.
- Machine comparison against the amended authoritative 41-file union: 40 current failing files, 0 new files, 0 files over their maxima. `16-SDK-BASELINE-DELTA.txt` verdict: `NO NEW FAILURES: PASS`.
- `16-DISPOSITIONS.md` records **DEFER**, references Phase 15 WR-02, and preserves the broader planning-root migration as a separately planned bounded task required before milestone close if the milestone hard gates require full SDK green.
- Task 1 is complete under this developer-approved baseline-relative disposition. The planning-root migration remains separately bounded and was not started.

### HARD-04 developer checkpoint

- Leg A: a fresh `oto-debugger` session enumerated `mcp__exa__web_search_exa`, `mcp__exa__web_fetch_exa`, and `mcp__exa__web_search_advanced_exa`. One `mcp__exa__web_search_exa` call returned 10 real results with current Node LTS data. No unrecognized warning appeared.
- Leg B: with the keyfile moved aside and `EXA_API_KEY` unset, a fresh session completed the research request through WebSearch fallback with zero user-facing errors, no Exa retry loop, and exit 0.
- The keyfile was restored and `secret-status` confirmed Exa enabled. No credential bytes or masked suffix are recorded here.

### HARD-05 sync dry-run

- Exact fallback command: `node bin/install.js sync --upstream all --to latest --dry-run` (`oto` was not on PATH).
- GSD `bdcaab2c752d9a33a1a1ca9acf3a3c81fb991815`: 52 clean, 257 conflict, 3 added, 29 deleted, 897 unclassified additions.
- Superpowers `d884ae04edebef577e82ff7c4e143debd0bbec99`: 14 clean, 12 conflict, 0 added, 2 deleted, 52 unclassified additions.
- Combined: 269 same-line conflicts, 952 added/unclassified, 31 deleted, 66 clean, 0 binary; 1,252 surfaced findings. Exit 1 is the designed fail-loud result for unclassified additions. No upstream content was applied.
- Milestone-touched findings: `oto/agents/oto-advisor-researcher.md` is one new expected-and-block-shaped conflict; `sdk/src/query/secrets.ts` and `sdk/src/query/secrets.test.ts` are new same-path upstream additions and need follow-up. The remaining listed milestone-touched conflicts pre-date the milestone and are noted only. Full inventory and dispositions are in `16-06-SUMMARY.md`.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter (plan-structure compliance at planning time; `wave_0_complete` flips in 16-06 Task 3)

**Approval:** developer approved both HARD-04 legs on 2026-07-17; HARD-05 exact dry-run was recorded and dispositioned; final repository and SDK baseline-relative gates passed.
