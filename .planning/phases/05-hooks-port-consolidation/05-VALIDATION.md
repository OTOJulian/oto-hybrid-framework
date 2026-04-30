---
phase: 5
slug: hooks-port-consolidation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-30
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node:test (built-in, Node 22+) |
| **Config file** | none — runner is `scripts/run-tests.cjs` (already populated by Phase 1/2) |
| **Quick run command** | `node scripts/run-tests.cjs --filter "05-"` |
| **Full suite command** | `node scripts/run-tests.cjs` |
| **Estimated runtime** | ~10 seconds (focused phase tests; full suite ~30s) |

---

## Sampling Rate

- **After every task commit:** Run `node scripts/run-tests.cjs --filter "05-"`
- **After every plan wave:** Run `node scripts/run-tests.cjs`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

> Filled by gsd-planner during PLAN.md generation. Each row maps a planned task to a verifiable test artifact.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | HK-07 | — | Token substitution allowlist excludes `foundation-frameworks/` | unit | `node --test tests/05-token-substitution.test.cjs` | ❌ W0 | ⬜ pending |
| 05-02-01 | 02 | 1 | HK-01, HK-07 | — | SessionStart emits exactly one identity block, no upstream-identity substring | unit | `node --test tests/05-session-start.test.cjs` | ❌ W0 | ⬜ pending |
| 05-03-01 | 03 | 2 | HK-01..06 | — | mergeSettings round-trip preserves user entries; uninstall removes only `_oto` | unit | `node --test tests/05-merge-settings.test.cjs` | ❌ W0 | ⬜ pending |
| 05-04-01 | 04 | 2 | HK-07 | — | build-hooks emits 6 files into `oto/hooks/dist/` with executable bits intact | unit | `node --test tests/05-build-hooks.test.cjs` | ❌ W0 | ⬜ pending |
| 05-05-01 | 05 | 3 | HK-01 | — | SessionStart fixture matches snapshot byte-for-byte (Pitfall 15 substring scan) | snapshot | `node --test tests/05-session-start-fixture.test.cjs` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

*The above is a seed map; planner expands it to cover every task in every PLAN.md.*

---

## Wave 0 Requirements

- [ ] `tests/05-token-substitution.test.cjs` — fixtures for `{{OTO_VERSION}}` substitution + allowlist exclusion (HK-07)
- [ ] `tests/05-session-start.test.cjs` — invokes `oto/hooks/oto-session-start` with stubbed env, asserts JSON shape (HK-01)
- [ ] `tests/05-merge-settings.test.cjs` — round-trip + idempotent + uninstall fixtures (HK-01..06)
- [ ] `tests/05-build-hooks.test.cjs` — runs build-hooks against a temp source tree, asserts 6 dist outputs (HK-07)
- [ ] `tests/05-session-start-fixture.test.cjs` — golden-file compare against `oto/hooks/__fixtures__/session-start-claude.json` (HK-01)
- [ ] `oto/hooks/__fixtures__/session-start-claude.json` — captured baseline JSON (Phase 5 ships static; Phase 10 promotes to CI)

*Wave 0 owns test scaffolding only. No production code changes.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Statusline renders correctly in Claude Code terminal | HK-02 | Statusline output is consumed by Claude Code's TUI; cannot exec the renderer offline | After `oto install --claude`, open a fresh Claude Code session; confirm status bar shows `phase / state` from `.oto/STATE.md` |
| Context-monitor warning appears at threshold crossing | HK-03 | Claude Code fires `PostToolUse` with real token-usage payload; offline tests can stub the payload but cannot fully exercise the in-session UX | Configure low threshold in `.oto/config.json`; run a session that crosses it; observe warning message |
| Stale-hook detection on upgrade overwrites prior version | HK-07 | End-to-end install → version bump → re-install requires real npm git-URL flow | Install at `vX.Y.Z`, bump local package version, re-run `oto install --claude`, confirm hook line 2 reflects new version |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
