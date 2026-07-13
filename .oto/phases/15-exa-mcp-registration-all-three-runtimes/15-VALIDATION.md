---
phase: 15
slug: exa-mcp-registration-all-three-runtimes
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-13
---

# Phase 15 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node:test (built-in, Node >= 22) |
| **Config file** | none — `scripts/run-tests.cjs` discovers `tests/*.test.cjs` |
| **Quick run command** | `node --test tests/<relevant>.test.cjs` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~60 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node --test` on the test files touching the changed module
- **After every plan wave:** Run `npm test`
- **Before `/oto-verify-work`:** Full suite must be green
- **Max feedback latency:** 90 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| *(filled by planner — one row per task, mapped to MCP-01..MCP-09, HARD-02)* | | | | | | | | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Per RESEARCH.md requirement→test map (10 Wave-0 test files expected, HARD-02 families):

- [ ] adapter merge/unmerge round-trip tests (claude JSON, codex TOML, gemini JSON) — MCP-02/03/04, HARD-02
- [ ] boolean config validation tests — HARD-02
- [ ] no-plaintext-key-in-tracked-files guard test — HARD-02
- [ ] consent gate tests (default No, no key → no registration) — MCP-01
- [ ] idempotency / duplicate-refusal tests — MCP-05
- [ ] uninstall fingerprint-scoped removal tests — MCP-07/08

*Exact file list to be finalized by planner from RESEARCH.md's requirement→test map.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live MCP handshake in each runtime after registration | MCP-06 | Requires launching Claude Code / Codex / Gemini interactively | Register with consent, launch each CLI, confirm `exa` server lists exactly web_search_exa, web_fetch_exa, web_search_advanced_exa |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 90s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
