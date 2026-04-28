---
phase: 3
slug: installer-fork-claude-adapter
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-28
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `node:test` + `node:assert/strict` (Node 22+ built-in) |
| **Config file** | none — discovery via glob `tests/*.test.cjs` |
| **Quick run command** | `node --test tests/phase-03-*.test.cjs` |
| **Full suite command** | `npm test` (runs `node --test --test-concurrency=4 tests/*.test.cjs`) |
| **Estimated runtime** | ~10s (phase-03 only) / ~30s (full suite) |

---

## Sampling Rate

- **After every task commit:** Run the touched module's `node --test tests/phase-03-<area>.test.cjs` (single file, < 1s unit / < 5s integration)
- **After every plan wave:** Run `node --test tests/phase-03-*.test.cjs` (all phase-03 tests, ~10s)
- **Before `/gsd-verify-work`:** Full suite must be green (`npm test`) AND manual smoke (`node scripts/install-smoke.cjs`)
- **Max feedback latency:** 10 seconds per wave; 30 seconds for full suite

---

## Per-Task Verification Map

> Tasks will be assigned to plans during planning; this matrix maps each phase requirement to its verification artifact. Plan tasks reference these by File Exists column.

| Req ID | Behavior | Test Type | Automated Command | File Exists | Status |
|--------|----------|-----------|-------------------|-------------|--------|
| INS-01 | `bin/install.js` is a thin shell that dispatches install/uninstall | unit | `node --test tests/phase-03-bin-shell.test.cjs` | ❌ W0 | ⬜ pending |
| INS-01 | Help output documents only Claude / Codex / Gemini | unit | `node --test tests/phase-03-help-output.test.cjs` | ❌ W0 | ⬜ pending |
| INS-01 | No grep hit for 11 unwanted runtimes in `bin/`+`scripts/install*` | grep | `node --test tests/phase-03-no-unwanted-runtimes.test.cjs` | ❌ W0 | ⬜ pending |
| INS-02 | Each adapter exports descriptor + lifecycle hook contract (Claude) | unit | `node --test tests/phase-03-runtime-claude.test.cjs` | ❌ W0 | ⬜ pending |
| INS-02 | Adapter contract (Codex Phase 3 minimum-viable) | unit | `node --test tests/phase-03-runtime-codex.test.cjs` | ❌ W0 | ⬜ pending |
| INS-02 | Adapter contract (Gemini Phase 3 minimum-viable) | unit | `node --test tests/phase-03-runtime-gemini.test.cjs` | ❌ W0 | ⬜ pending |
| INS-02 | Orchestrator has zero `runtime === 'codex'` branches outside adapters | grep | `node --test tests/phase-03-no-runtime-conditionals.test.cjs` | ❌ W0 | ⬜ pending |
| INS-03 | `--config-dir` flag wins over env var and default | unit | `node --test tests/phase-03-args.test.cjs` | ❌ W0 | ⬜ pending |
| INS-03 | Env var wins over default when no flag | unit | `node --test tests/phase-03-args.test.cjs` | ❌ W0 | ⬜ pending |
| INS-03 | Default = `~/.<runtime>` when no flag and no env | unit | `node --test tests/phase-03-args.test.cjs` | ❌ W0 | ⬜ pending |
| INS-04 | copyTree/removeTree/sha256File/walkTree primitives (unit-level fast feedback) | unit | `node --test tests/phase-03-copy-files.test.cjs` | ❌ W0 | ⬜ pending |
| INS-04 | Files copied (not symlinked) into target | integration | `node --test tests/phase-03-install-claude.integration.test.cjs` | ❌ W0 | ⬜ pending |
| INS-04 | Re-install is idempotent (file-set stable) | integration | `node --test tests/phase-03-install-claude.integration.test.cjs` | ❌ W0 | ⬜ pending |
| INS-04 | Uninstall removes all installed files + restores user content | integration | `node --test tests/phase-03-install-claude.integration.test.cjs` | ❌ W0 | ⬜ pending |
| INS-04 | Marker block injected with surrounding user content preserved | integration | `node --test tests/phase-03-marker.test.cjs` + `…install-claude…` | ❌ W0 | ⬜ pending |
| INS-05 | `oto install --claude` produces a working install on a clean tmpdir | integration | `node --test tests/phase-03-install-claude.integration.test.cjs` | ❌ W0 | ⬜ pending |
| INS-05 | `oto install --codex` succeeds at Phase 3 (best-effort, identity transforms) | integration | `node --test tests/phase-03-install-codex.integration.test.cjs` | ❌ W0 | ⬜ pending |
| INS-05 | `oto install --gemini` succeeds at Phase 3 (best-effort) | integration | `node --test tests/phase-03-install-gemini.integration.test.cjs` | ❌ W0 | ⬜ pending |
| INS-06 | `--all` detects present runtimes via dir existence | unit | `node --test tests/phase-03-runtime-detect.test.cjs` | ❌ W0 | ⬜ pending |
| INS-06 | `--all` + `--config-dir` rejected at parse time (exit 3) | unit | `node --test tests/phase-03-args.test.cjs` | ❌ W0 | ⬜ pending |
| INS-06 | `--all` with no present runtimes exits 4 with stderr message | integration | `node --test tests/phase-03-install-all.integration.test.cjs` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Phase 3 requires creating these test files BEFORE any production code (TDD-style scaffolds; assertions filled as production code lands):

- [ ] `tests/phase-03-args.test.cjs` — covers INS-03 + INS-06 arg validation
- [ ] `tests/phase-03-runtime-detect.test.cjs` — covers INS-06 `--all` detection
- [ ] `tests/phase-03-marker.test.cjs` — covers marker injection idempotency (INS-04 indirectly)
- [ ] `tests/phase-03-install-state.test.cjs` — covers state schema validation
- [ ] `tests/phase-03-copy-files.test.cjs` — covers INS-04 unit-level copy/hash/walk/remove primitives (Plan 04 fast-feedback layer)
- [ ] `tests/phase-03-runtime-claude.test.cjs` — covers INS-02 adapter contract (Claude)
- [ ] `tests/phase-03-runtime-codex.test.cjs` — covers INS-02 adapter contract (Codex)
- [ ] `tests/phase-03-runtime-gemini.test.cjs` — covers INS-02 adapter contract (Gemini)
- [ ] `tests/phase-03-no-unwanted-runtimes.test.cjs` — covers INS-01 / SC#4 grep enforcement
- [ ] `tests/phase-03-no-runtime-conditionals.test.cjs` — covers INS-02 / SC#2
- [ ] `tests/phase-03-bin-shell.test.cjs` — covers INS-01 thin-shell shape
- [ ] `tests/phase-03-help-output.test.cjs` — covers INS-01 / D-15
- [ ] `tests/phase-03-install-claude.integration.test.cjs` — covers INS-04 + INS-05
- [ ] `tests/phase-03-install-codex.integration.test.cjs` — covers INS-05
- [ ] `tests/phase-03-install-gemini.integration.test.cjs` — covers INS-05
- [ ] `tests/phase-03-install-all.integration.test.cjs` — covers INS-06

**Framework install:** none required. `node:test` is built-in to Node 22+. Test fixture conventions reuse Phase 1+2 patterns (`os.tmpdir()` + `t.after()` cleanup; see `tests/phase-02-allowlist.test.cjs:16-24`).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live `npm install -g github:OTOJulian/oto-hybrid-framework` smoke install | INS-04, INS-05 | Requires real network + global npm prefix mutation; CI smoke covered in Phase 7 | Run `node scripts/install-smoke.cjs` (extended D-23 version) on a Mac before `/gsd-verify-work`. Confirms the published bin runs `oto install --claude --config-dir <tmp>` end-to-end. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (16 test files)
- [ ] No watch-mode flags (single-run `node --test` only)
- [ ] Feedback latency < 10s per wave; < 30s full suite
- [ ] `nyquist_compliant: true` set in frontmatter (after Wave 0 lands)

**Approval:** pending
