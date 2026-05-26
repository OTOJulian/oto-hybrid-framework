---
phase: 5
slug: hooks-port-consolidation
status: planned
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-30
updated: 2026-04-30
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

> Maps each planned task to its verifiable test artifact. Every task in every PLAN.md has a row here. `nyquist_compliant: true` because every task has an automated `<verify>` command.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 0 | HK-01..06 | T-05-01-01 | Fixture JSON parses; settings-existing has 4 expected user keys; settings-empty equals `{}\n` | scaffold | `node -e "<inline-asserts in plan 05-01 task 1>"` | ❌ creates | ⬜ pending |
| 05-01-02 | 01 | 0 | HK-01..07 | T-05-01-02 | 5 test scaffolds run as todos; node --test exits 0; each has `// Covers: HK-` header | scaffold | `node --test tests/05-*.test.cjs` | ❌ creates | ⬜ pending |
| 05-02-01 | 02 | 1 | HK-07 | T-05-02-02, T-05-02-03 | tokenReplace substitutes `{{OTO_VERSION}}` only; round-trip; deny-list excludes foundation-frameworks/, __fixtures__/, LICENSE | unit | `node --test tests/05-token-substitution.test.cjs` | ❌ Wave 0 | ⬜ pending |
| 05-02-02 | 02 | 1 | HK-07 | T-05-02-01, T-05-02-04 | build-hooks emits 6 files into oto/hooks/dist/ with exec bits on bash hooks; idempotent | unit | `node --test tests/05-build-hooks.test.cjs` | ❌ Wave 0 | ⬜ pending |
| 05-03-01 | 03 | 2 | HK-01 | T-05-03-01, T-05-03-02, T-05-03-03 | oto-session-start rewritten per D-04..D-08; bash -n passes; required literals present; banned upstream strings absent | unit | `bash -n oto/hooks/oto-session-start && grep checks` | ❌ rewrite | ⬜ pending |
| 05-03-02 | 03 | 2 | HK-01, HK-06 | T-05-03-01, T-05-03-03 | Claude/Cursor/fallback branch shapes; opt-in STATE reminder gated by hooks.session_state | unit | `node --test tests/05-session-start.test.cjs` | ❌ Wave 0 | ⬜ pending |
| 05-04-01 | 04 | 3 | HK-01..06 | T-05-04-01, T-05-04-02, T-05-04-04 | mergeSettings + unmergeSettings: 6 marker entries; HK-06 PreToolUse Bash; HK-03 PostToolUse broad/timeout 10 | unit | `node -e "<inline mergeSettings checks in plan 05-04 task 1>"` | ❌ implement | ⬜ pending |
| 05-04-02 | 04 | 3 | HK-07 | (none) | install-state.cjs accepts optional hooks: { version: string }; backward-compat with Phase 3 | unit | `node -e "<inline validateState checks in plan 05-04 task 2>"` | ❌ extend | ⬜ pending |
| 05-04-03 | 04 | 3 | HK-01..07 | T-05-04-05, T-05-04-06 | install.cjs wires applyTokensToTree, hooks.version, mergeSettings ctx, unmergeSettings; phase-03 integration test still passes | integration | `node --test tests/phase-03-install-claude.integration.test.cjs` | ✅ Phase 3 | ⬜ pending |
| 05-04-04 | 04 | 3 | HK-01..06 | T-05-04-01, T-05-04-02 | mergeSettings round-trip + idempotency + unmerge + Pitfall E shape — 5 test cases | unit | `node --test tests/05-merge-settings.test.cjs` | ❌ Wave 0 | ⬜ pending |
| 05-05-01 | 05 | 4 | HK-01 | T-05-05-01, T-05-05-02 | Fixture captured + hand-eyeballed; Pitfall 15 substring-scan clean; exactly one identity block; literal `{{OTO_VERSION}}` token preserved | snapshot | `node -e "<inline fixture checks in plan 05-05 task 1>"` | ❌ capture | ⬜ pending |
| 05-05-02 | 05 | 4 | HK-01 | T-05-05-01, T-05-05-03 | Re-spawn hook deep-equals fixture; defense-in-depth substring scan | snapshot | `node --test tests/05-session-start-fixture.test.cjs` | ❌ Wave 0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

**Coverage check:** every HK-NN requirement appears in ≥1 task row above:
- HK-01 → 05-01-02, 05-03-01, 05-03-02, 05-04-01, 05-04-04, 05-05-01, 05-05-02
- HK-02 → 05-04-01, 05-04-04 (statusline registered in mergeSettings; round-trip preserves)
- HK-03 → 05-04-01, 05-04-04 (context-monitor PostToolUse broad/timeout 10)
- HK-04 → 05-04-01, 05-04-04 (prompt-guard PreToolUse Write|Edit)
- HK-05 → 05-04-01, 05-04-04 (read-injection-scanner PostToolUse Read)
- HK-06 → 05-04-01, 05-04-04 (validate-commit PreToolUse Bash — drift resolved)
- HK-07 → 05-02-01, 05-02-02, 05-04-02, 05-04-03 (token substitution + build leg + state schema + install integration)

---

## Wave 0 Requirements

- [ ] `tests/05-token-substitution.test.cjs` — Wave 0 scaffold (todo); body filled in plan 05-02 (HK-07)
- [ ] `tests/05-session-start.test.cjs` — Wave 0 scaffold (todo); body filled in plan 05-03 (HK-01)
- [ ] `tests/05-merge-settings.test.cjs` — Wave 0 scaffold (todo); body filled in plan 05-04 (HK-01..06)
- [ ] `tests/05-build-hooks.test.cjs` — Wave 0 scaffold (todo); body filled in plan 05-02 (HK-07)
- [ ] `tests/05-session-start-fixture.test.cjs` — Wave 0 scaffold (todo); body filled in plan 05-05 (HK-01)
- [ ] `tests/fixtures/phase-05/settings-existing.json` — fixture for mergeSettings round-trip (plan 05-01)
- [ ] `tests/fixtures/phase-05/settings-empty.json` — fixture for bare-merge (plan 05-01)
- [ ] No new framework install needed; `node:test` is built-in.

*Wave 0 owns test scaffolding ONLY. No production code changes in plan 05-01.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Statusline renders correctly in Claude Code terminal | HK-02 | Statusline output is consumed by Claude Code's TUI; cannot exec the renderer offline | After `oto install --claude`, open a fresh Claude Code session; confirm status bar shows `phase / state` from `.oto/STATE.md` |
| Context-monitor warning appears at threshold crossing | HK-03 | Claude Code fires `PostToolUse` with real token-usage payload; offline tests can stub the payload but cannot fully exercise the in-session UX | Configure low threshold in `.oto/config.json`; run a session that crosses it; observe warning message |
| Stale-hook detection on upgrade overwrites prior version | HK-07 | End-to-end install → version bump → re-install requires real npm git-URL flow | Install at `vX.Y.Z`, bump local package version, re-run `oto install --claude`, confirm hook line 2 reflects new version |
| Validate-commit blocks a non-conforming git commit on real Claude session | HK-06 | PreToolUse hooks fire only inside Claude Code's tool-call lifecycle | After install + opt-in (`hooks.session_state: true`), run a `Bash(git commit -m "no type")` from Claude; confirm exit-2 block message |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies — confirmed in Per-Task Verification Map above
- [x] Sampling continuity: no 3 consecutive tasks without automated verify — every task has its own command
- [x] Wave 0 covers all MISSING references — 5 test files + 2 fixture files declared in plan 05-01
- [x] No watch-mode flags — all commands are single-pass `node --test`
- [x] Feedback latency < 10s — phase tests run in ~2-5s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** ready for execution
