---
phase: 16
slug: agent-guidance-hardening
status: planned
nyquist_compliant: true
wave_0_complete: false
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
- **Before `/oto-verify-work`:** Full suites green + HARD-04 checkpoint approved + HARD-05 dry-run recorded
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
| 16-06-01 | 06 | 3 | all | — | Key never printed (source label only) | gate | `npm test && node scripts/check-runtime-sync.cjs` | ✅ | ❌ red — persistent SDK baseline offenders |
| 16-06-02 | 06 | 3 | HARD-04, HARD-01 | T-16-06-01 | Key never pasted into transcript | manual (checkpoint) | n/a — checkpoint:human-verify | n/a | ⬜ pending |
| 16-06-03 | 06 | 3 | HARD-05 | T-16-06-02, T-16-06-03 | Conflict baseline recorded; keyfile restored | scripted manual | `oto sync --upstream all --to latest --dry-run` (network) | n/a | ⬜ pending |

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

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `mcp__exa__*` reaches a tools-restricted subagent; one live call returns results | HARD-04 | Needs a live Claude Code session + real key + network; live CLIs banned from automated install path (15-VALIDATION.md precedent) | 16-06 Task 2 checkpoint, Leg A (probe with tool enumeration) |
| Keyless research flow completes with zero user-facing errors via fallback floor | HARD-01 (live leg) | Same live-session constraint | 16-06 Task 2 checkpoint, Leg B (key moved aside, restore after) |
| Upstream conflict surface at milestone close | HARD-05 | Requires network fetch of upstreams; results are findings to disposition, not pass/fail | 16-06 Task 3: `oto sync --upstream all --to latest --dry-run`, record + disposition |

---

## Plan 16-06 Pre-Checkpoint Evidence (2026-07-17)

### Green gates

- `npm test` — PASS: 961 tests, 958 passed, 0 failed, 3 skipped.
- `node --test tests/16-*.test.cjs` — PASS: 45/45.
- `cd sdk && npx vitest run src/query/websearch.test.ts src/query/secret-status-inheritance.test.ts` — PASS: 9/9.
- `node scripts/check-runtime-sync.cjs` — PASS: Claude and Codex `ok`; Gemini skipped because no oto install exists.
- Installed Claude debugger contains one `mcp__exa__*` wildcard; installed shared search reference byte-matches the repository copy.
- `detectKeySource('exa').source` — `keyfile`; no credential bytes were printed.

### Blocking gate — Phase 16 regression

- `cd sdk && npx vitest run` — FAIL: 40 test files failed, 51 passed; 270 tests failed, 1332 passed.
- The machine comparison against Plan 14-16's authoritative 41-file two-run union found no new failing file name, but found two per-file count offenders: `src/golden/read-only-parity.integration.test.ts` at 22 failures versus baseline max 19, and `src/query/decomposed-handlers.test.ts` at 8 failures versus baseline max 7.
- Both offenders are **PERSISTENT** under the terminal baseline rule. Two isolated runs of `read-only-parity` each failed 22 tests; two isolated runs of `decomposed-handlers` each failed 8 tests. Neither run met its baseline maximum.
- Durable evidence: `16-SDK-BASELINE-DELTA.txt`, verdict `NO NEW FAILURES: FAIL`.
- The inherited WR-02 `.planning` fixture-root / `gsd_state_version` debt was **not dispositioned** because the zero-net-new precondition failed. No broader SDK planning-root migration was started.
- Task 2 HARD-04 was not presented or simulated. HARD-05, phase verification, and code review did not run. Plan 16-06 is stopped on this Phase 16 regression.

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter (plan-structure compliance at planning time; `wave_0_complete` flips in 16-06 Task 3)

**Approval:** pending (16-06 Task 3 finalizes)
