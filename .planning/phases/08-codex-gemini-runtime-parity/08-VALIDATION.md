---
phase: 08
slug: codex-gemini-runtime-parity
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-02
---

# Phase 08 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `node:test` (Node 22+ builtin, zero dep) |
| **Config file** | None — driven by `package.json` `"test"` script: `node --test --test-concurrency=4 tests/*.test.cjs` |
| **Quick run command** | `node --test tests/phase-08-*.test.cjs` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~30s phase-08 only; ~90s full suite |

---

## Sampling Rate

- **After every task commit:** Run `node --test tests/phase-08-*.test.cjs`
- **After every plan wave:** Run `npm test`
- **Before `/oto-verify-work`:** Full suite must be green AND spine smoke tests run manually with `codex` ≥ 0.120 and `gemini` ≥ 0.38 binaries on PATH
- **Max feedback latency:** 30 seconds (phase-08 quick run)

---

## Per-Task Verification Map

> Populated during planning. Every task in PLAN.md must map to one row below or to a Wave 0 dependency.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 08-01-01 | 01 | 0 | MR-02 | — | N/A — Wave 0 stub | wave-0 | `test -f tests/phase-08-instruction-file-render.test.cjs` | ❌ W0 | ⬜ pending |
| 08-01-02 | 01 | 0 | MR-03 | — | N/A — Wave 0 stub | wave-0 | `test -f tests/phase-08-runtime-matrix-render.test.cjs` | ❌ W0 | ⬜ pending |
| 08-01-03 | 01 | 0 | MR-02/03 | — | N/A — Wave 0 fixture stubs | wave-0 | `test -d tests/fixtures/runtime-parity/codex` | ❌ W0 | ⬜ pending |
| TBD-mr02 | TBD | TBD | MR-02 | T-08-tampering-marker | Marker-block ownership preserved on re-install | unit + golden | `node --test tests/phase-08-instruction-file-render.test.cjs` | ❌ W0 | ⬜ pending |
| TBD-mr02 | TBD | TBD | MR-02 | T-08-info-disclosure-identity | No `gsd-`/`superpowers` literal in transformed agent bodies | golden | `node --test tests/phase-08-codex-transform.test.cjs tests/phase-08-gemini-transform.test.cjs tests/phase-08-claude-identity.test.cjs` | ❌ W0 | ⬜ pending |
| TBD-mr03 | TBD | TBD | MR-03 | — | Matrix vs code byte-equality | unit | `node --test tests/phase-08-runtime-matrix-render.test.cjs` | ❌ W0 | ⬜ pending |
| TBD-mr03 | TBD | TBD | MR-03 | — | `convertGeminiToolName` covers every map entry, filter rules, default lowercase | unit | `node --test tests/phase-08-gemini-toolmap.test.cjs` | ❌ W0 | ⬜ pending |
| TBD-mr03 | TBD | TBD | MR-03 | T-08-tampering-toml | Codex `mergeHooksBlock` round-trip + idempotent rewrite + uninstall removal preserves user-authored entries | unit | `node --test tests/phase-08-codex-toml.test.cjs` | ❌ W0 | ⬜ pending |
| TBD-mr03 | TBD | TBD | MR-03 | — | `resolveAgentModel` precedence (`.oto/config.json` profile > `~/.oto/defaults.json` overrides > tier default) | unit | `node --test tests/phase-08-codex-profile.test.cjs` | ❌ W0 | ⬜ pending |
| TBD-mr03 | TBD | TBD | MR-03 | T-08-tampering-enableagents | Gemini `mergeSettings` BeforeTool/AfterTool/SessionEnd renames + `experimental.enableAgents=true` only WRITTEN if missing (warn + skip if user set false) | unit | `node --test tests/phase-08-gemini-settings.test.cjs` | ❌ W0 | ⬜ pending |
| TBD-mr04 | TBD | TBD | MR-04 | T-08-access-control-sandbox | Codex per-agent `<configDir>/agents/<name>.toml` carries the right `sandbox_mode` | integration | `node --test tests/phase-08-smoke-codex.integration.test.cjs` (skips if `codex` not on PATH or version < 0.120) | ❌ W0 | ⬜ pending |
| TBD-mr04 | TBD | TBD | MR-04 | — | Gemini spine: install → `/oto-help` / `/oto-progress` / `/oto-new-project` / `/oto-pause-work` / `/oto-resume-work` → state file written to `.oto/` | integration | `node --test tests/phase-08-smoke-gemini.integration.test.cjs` (skips if `gemini` not on PATH or version < 0.38) | ❌ W0 | ⬜ pending |
| TBD-mr03 | TBD | TBD | MR-03 | — | Per-command runtime support matrix: Codex column + Gemini column 100% green at v0.1.0 close | unit | (section of `tests/phase-08-runtime-matrix-render.test.cjs`) | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

> Planner: replace the `TBD` rows with concrete `<phase>-<plan>-<task>` IDs once plan numbering is locked. Every PLAN.md task must map to at least one row.

---

## Wave 0 Requirements

> Test-stub files and fixture skeletons that must exist before any implementation task can claim coverage. Created in Wave 0 with failing assertions; populated as transforms land.

- [ ] `tests/phase-08-instruction-file-render.test.cjs` — D-03 regen-diff for the three project-root instruction files (MR-02)
- [ ] `tests/phase-08-runtime-matrix-render.test.cjs` — D-05/D-08 regen-diff for `decisions/runtime-tool-matrix.md` + matrix-vs-code byte-equality (MR-03)
- [ ] `tests/phase-08-codex-transform.test.cjs` — D-11 fixture goldens (agent + per-agent `.toml`) (MR-02/MR-03)
- [ ] `tests/phase-08-codex-toml.test.cjs` — D-10 hook-block merge / idempotent rewrite / uninstall removal (MR-03)
- [ ] `tests/phase-08-codex-profile.test.cjs` — D-10 profile resolution given `.oto/config.json` + `~/.oto/defaults.json` fixtures (MR-03)
- [ ] `tests/phase-08-gemini-transform.test.cjs` — D-13/D-14 fixture goldens (agent + command + Task() rewrite) (MR-02/MR-03)
- [ ] `tests/phase-08-gemini-toolmap.test.cjs` — D-13 `convertGeminiToolName` unit (every map entry + filters + lowercase default) (MR-03)
- [ ] `tests/phase-08-gemini-settings.test.cjs` — D-16 hook event-name renames + `experimental.enableAgents` guard (MR-03)
- [ ] `tests/phase-08-smoke-codex.integration.test.cjs` — D-17/D-18 spine smoke (MR-04)
- [ ] `tests/phase-08-smoke-gemini.integration.test.cjs` — D-17/D-18 spine smoke (MR-04)
- [ ] `tests/phase-08-claude-identity.test.cjs` — Pitfall 5 sanity baseline (Claude transforms remain identity)
- [ ] `tests/fixtures/runtime-parity/{claude,codex,gemini}/` — fixture trio source + expected goldens (3 runtimes × 3 fixtures + per-agent `.toml`)

*No new framework install — `node:test` already shipped in Phase 1.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Spine smoke runs end-to-end against the actual `codex` binary | MR-04 / SC#3 | Requires the Codex CLI on PATH at version ≥ 0.120; CI provisioning is Phase 10 (CI-02) | Install `codex` ≥ 0.120, then run `node --test tests/phase-08-smoke-codex.integration.test.cjs`; assert no skip output |
| Spine smoke runs end-to-end against the actual `gemini` binary | MR-04 / SC#3 | Requires the Gemini CLI on PATH at version ≥ 0.38 (subagents); local env currently 0.26.0 (per RESEARCH §Environment Availability); CI provisioning is Phase 10 | Install/upgrade `gemini` ≥ 0.38, then run `node --test tests/phase-08-smoke-gemini.integration.test.cjs`; assert no skip output |
| Operator daily-peer dogfood (Phase-4-MR-01-style) | (deferred — see CONTEXT §deferred) | Disposable tmpdir end-to-end is automatable; live operator-feel is not. Optional final wave. | Per CONTEXT.md "deferred" — capture impressions in `phase-08-dogfood.md` if planner adds the wave |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (12 stubs above)
- [ ] No watch-mode flags (matches Phase 1–7 convention)
- [ ] Feedback latency < 30s for `phase-08-*` quick run; < 90s for full suite
- [ ] `nyquist_compliant: true` set in frontmatter once all PLAN.md tasks lock to verification rows above

**Approval:** pending
