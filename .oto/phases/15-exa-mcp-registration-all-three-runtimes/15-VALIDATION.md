---
phase: 15
slug: exa-mcp-registration-all-three-runtimes
status: planned
nyquist_compliant: true
wave_0_complete: false
created: 2026-07-13
updated: 2026-07-13
---

# Phase 15 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node:test (built-in, Node >= 22); Vitest + `tsc --noEmit` inside `sdk/` |
| **Config file** | none — `scripts/run-tests.cjs` discovers `tests/*.test.cjs` |
| **Quick run command** | `node --test --test-reporter=dot tests/15-*.test.cjs` |
| **Full suite command** | `npm test` (+ `cd sdk && npx tsc --noEmit && npx vitest run <touched files>` when SDK changes) |
| **Estimated runtime** | ~60-90 seconds |

---

## Sampling Rate

- **After every task commit:** `node --test` on the test files touching the changed module (each task's `<verify><automated>` command); `cd sdk && npx tsc --noEmit` when SDK files change
- **After every plan wave:** `npm test`
- **Before `/oto-verify-work`:** full suite green + Phase 14 SDK-baseline discipline (no new persistent failures vs 14-SDK-BASELINE)
- **Max feedback latency:** 90 seconds

---

## Per-Task Verification Map

Tests are co-created within each task (`tdd="true"` behavior blocks) — the test file always lands in the same task/commit as the code it verifies, so no verify command ever references a file a later wave creates.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01/T1 | 15-01 | 1 | MCP-02 | T-15-01 | Transport decision recorded before adapter code | structural | `node --test tests/phase-01-adr-structure.test.cjs` | ✅ exists | ⬜ pending |
| 01/T2 | 15-01 | 1 | MCP-02 | T-15-01/02 | ADR content pinned (pin, tools, alternative, D-15 table) | structural | `node --test tests/15-adr.test.cjs` | ❌ co-created | ⬜ pending |
| 02/T1 | 15-02 | 1 | MCP-07 (D-15, FRESH-WR-04) | T-15-03..06 | Read-follow/write-refuse symlink split; empty/dangling ≠ key | unit | `node --test tests/15-key-usability.test.cjs tests/14-keyfile-symlink.test.cjs tests/14-secrets-keyfile.test.cjs` | ❌ co-created | ⬜ pending |
| 02/T2 | 15-02 | 1 | MCP-07 (SDK parity) | T-15-06 | Identical D-15 rule in SDK; defect sites fixed | unit (vitest) | `cd sdk && npx tsc --noEmit && npx vitest run src/query/secrets.test.ts` | ❌ co-created | ⬜ pending |
| 03/T1 | 15-03 | 2 | MCP-06 | T-15-07/08/09 | Pinned argv, no key bytes in argv | unit | inline node -e argv assertion | n/a | ⬜ pending |
| 03/T2 | 15-03 | 2 | MCP-06 | T-15-07 | No-key → exit 1 without npx spawn; D-15 launcher parity | unit + process | `node scripts/build-hooks.js && node --test tests/15-launcher.test.cjs tests/05-build-hooks.test.cjs` | ❌ co-created | ⬜ pending |
| 04/T1 | 15-04 | 2 | MCP-04, HARD-02 | T-15-11/13 | Byte-identical round-trip; external-duplicate refusal | unit round-trip (HARD gate) | `node --test tests/15-codex-mcp-block.test.cjs` | ❌ co-created | ⬜ pending |
| 04/T2 | 15-04 | 2 | MCP-04, MCP-07/08 | T-15-12 | Fingerprint-gated unmerge; drift skip | unit | `node --test tests/15-codex-mcp-block.test.cjs` | ❌ co-created | ⬜ pending |
| 05/T1 | 15-05 | 2 | MCP-03, HARD-02 | T-15-14/16 | Additive merge; strict-parse-or-refuse; env-based resolution | unit round-trip | `node --test tests/15-claude-mcp-merge.test.cjs` | ❌ co-created | ⬜ pending |
| 05/T2 | 15-05 | 2 | MCP-03, MCP-08 | T-15-15 | Drift/user-owned skip; round-trip restore | unit | `node --test tests/15-claude-mcp-merge.test.cjs` | ❌ co-created | ⬜ pending |
| 06/T1 | 15-06 | 2 | MCP-05, HARD-02 | T-15-18/19/20 | No url/httpUrl; enableAgents-independent; fingerprint-gated | unit round-trip | `node --test tests/15-gemini-mcp-merge.test.cjs` | ❌ co-created | ⬜ pending |
| 06/T2 | 15-06 | 2 | MCP-05 | T-15-19 | mergeSettings/mergeMcp coexistence | integration | `node --test tests/15-gemini-mcp-merge.test.cjs` | ❌ co-created | ⬜ pending |
| 07/T1 | 15-07 | 3 | MCP-08 | T-15-23 | Corrupt state.mcp fails loudly | unit | `node --test tests/15-mcp-state.test.cjs` | ❌ co-created | ⬜ pending |
| 07/T2 | 15-07 | 3 | MCP-07/08 | T-15-22 | mergeMcp before writeState; unmergeMcp before removeTree | structural ordering | inline node -e index-ordering check | n/a | ⬜ pending |
| 07/T3 | 15-07 | 3 | MCP-07/08, HARD-02 | T-15-21/24 | Idempotent lifecycle; drift/user-owned skip; carry-forward | integration (temp configDir) | `node --test tests/15-mcp-state.test.cjs` | ❌ co-created | ⬜ pending |
| 08/T1 | 15-08 | 4 | MCP-01 | T-15-25/27/28 | Default No; non-TTY never prompts; flags strict; no key bytes | unit | `node --test tests/15-consent.test.cjs` | ❌ co-created | ⬜ pending |
| 08/T2 | 15-08 | 4 | MCP-01 | T-15-25/27 | Gate wired in real entry point; CI-safe | unit + grep | inline node -e presence check + `node bin/install.js --help` | n/a | ⬜ pending |
| 09/T1 | 15-09 | 4 | MCP-09 | T-15-29/30/32 | Read-only classifier; fingerprint-gated ownership claims | unit | `node --test tests/15-mcp-status.test.cjs` | ❌ co-created | ⬜ pending |
| 09/T2 | 15-09 | 4 | MCP-09 (D-10) | T-15-29 | Doctor coherence warnings via shared helper | unit | `node --test tests/260616-muv-doctor.test.cjs` + export check | ✅ exists | ⬜ pending |
| 09/T3 | 15-09 | 4 | MCP-09 (FRESH-CR-02) | T-15-31/32 | SDK mirror semantics; PATH-wired status | unit (vitest) | `cd sdk && npx tsc --noEmit && npx vitest run src/query/mcp-status.test.ts` | ❌ co-created | ⬜ pending |
| 10/T1 | 15-10 | 5 | MCP-09, MCP-01 (D-16, FRESH-WR-05) | T-15-33/34/35 | No OTO_TOOLS; scope disclosure; confirm-before-mutate | grep gates + contract test | bash grep-gate one-liner + `node --test tests/14-settings-workflow-contract.test.cjs` | ✅ exists (contract) | ⬜ pending |
| 10/T2 | 15-10 | 5 | MCP-06/07/08 live | T-15-33 | Live 3-tool surface, idempotency, uninstall symmetry, key grep-audit | manual checkpoint | human-verify steps 1-8 | manual | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

No standalone Wave 0 plan: every `tests/15-*.test.cjs` file is co-created inside the task that builds the code it verifies (tdd="true" behavior blocks — test written first within the task). No task's verify command references a test created by a different plan. Files expected by phase end:

- [ ] `tests/15-adr.test.cjs` — MCP-02 (Plan 01)
- [ ] `tests/15-key-usability.test.cjs` — MCP-07/D-15 (Plan 02; also updates `tests/14-keyfile-symlink.test.cjs`)
- [ ] `tests/15-launcher.test.cjs` — MCP-06 (Plan 03)
- [ ] `tests/15-codex-mcp-block.test.cjs` — MCP-04 + HARD-02 (Plan 04)
- [ ] `tests/15-claude-mcp-merge.test.cjs` — MCP-03 + HARD-02 (Plan 05)
- [ ] `tests/15-gemini-mcp-merge.test.cjs` — MCP-05 + HARD-02 (Plan 06)
- [ ] `tests/15-mcp-state.test.cjs` — MCP-07/08 (Plan 07)
- [ ] `tests/15-consent.test.cjs` — MCP-01 (Plan 08)
- [ ] `tests/15-mcp-status.test.cjs` + `sdk/src/query/mcp-status.test.ts` — MCP-09 (Plan 09)
- Fixture strategy: inline template-literal fixtures inside test files (planner decision — no `tests/fixtures/phase-15/` directory needed)
- Framework install: none (node:test built-in; sdk vitest already configured)

HARD-02 aggregate: after Plan 07, one `npm test` run covers all three families — adapter round-trips (15-claude/codex/gemini/state), boolean validation (`tests/14-config-boolean.test.cjs`), no-plaintext guard (`tests/14-no-plaintext-guard.test.cjs`).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live MCP handshake + exact 3-tool listing in each runtime | MCP-06 | Requires launching Claude Code / Codex / Gemini interactively with a real key; scripted equivalents would shell out to the CLIs the requirements ban | Plan 10 Task 2 checkpoint, steps 1-3 |
| `CLAUDE_CONFIG_DIR` read-side probe (Assumption A1) | MCP-03/D-12 | Requires the real `claude` binary honoring the env var | Plan 10 Task 2 checkpoint, step 5 |
| No key bytes in any runtime config after registration | SECR/V8 | Needs the real exported key value to grep for | Plan 10 Task 2 checkpoint, step 8 |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or are justified manual checkpoints
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (co-creation model — no orphan verify commands)
- [x] No watch-mode flags
- [x] Feedback latency < 90s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** planned 2026-07-13 (planner); execution sign-off pending
