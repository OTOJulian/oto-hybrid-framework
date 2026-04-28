---
phase: 2
slug: rebrand-engine-distribution-skeleton
status: planned
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-28
last_updated: 2026-04-28
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `node:test` (Node 22+ built-in) |
| **Config file** | none — invoked via `node --test --test-concurrency=4 tests/` |
| **Quick run command** | `node --test --test-concurrency=4 tests/phase-02-*.test.cjs` |
| **Full suite command** | `node --test --test-concurrency=4 tests/` |
| **Estimated runtime** | ~10s for unit tests; +30s for engine integration tests against `foundation-frameworks/`; +60s for the round-trip test |

---

## Sampling Rate

- **After every task commit:** Run quick command (Phase 2 tests only)
- **After every plan wave:** Run full suite command (Phase 1 + 2)
- **Before `/oto-verify-work`:** Full suite must be green AND `npm run rebrand:dry-run` AND `npm run rebrand` AND `npm run rebrand:roundtrip` AND `node scripts/install-smoke.cjs --ref $(git rev-parse HEAD)` against the live remote must all exit 0
- **Max feedback latency:** ~10 seconds (unit + walker + manifest); integration tests sampled per wave, not per commit

---

## Per-Task Verification Map

> Every task in every PLAN.md maps to one row here.

### Plan 02-01: Distribution Skeleton

| Task | Requirement | Test Type | Automated Command | Status |
|------|-------------|-----------|-------------------|--------|
| 02-01-T1: package.json + bin/install.js stub + hooks/.gitkeep + .gitignore + README.md | FND-01, FND-02 | static + smoke | `node --test tests/phase-02-package-json.test.cjs tests/phase-02-gitignore.test.cjs tests/phase-02-bin-stub.test.cjs` | ✅ |
| 02-01-T2: scripts/build-hooks.js + scripts/install-smoke.cjs + their tests | FND-03 | unit | `node scripts/build-hooks.js && node --test tests/phase-02-build-hooks.test.cjs` | ✅ |
| 02-01-T3: GitHub repo creation + live install-smoke (HUMAN-ACTION CHECKPOINT) | FND-04 | integration (live remote) | `node scripts/install-smoke.cjs --ref $(git rev-parse HEAD)` | ✅ |

### Plan 02-02: Rebrand Rules + Walker + Schema Validator

| Task | Requirement | Test Type | Automated Command | Status |
|------|-------------|-----------|-------------------|--------|
| 02-02-T1: validate-schema move + walker.cjs + 9 fixtures + schema-validate test + walker test | REB-01 (D-16), REB-03 | unit | `node --test tests/phase-02-walker.test.cjs tests/phase-02-schema-validate.test.cjs tests/phase-01-rename-map.test.cjs` | ⬜ |
| 02-02-T2: identifier.cjs + path.cjs + command.cjs + skill_ns.cjs + 4 rule tests | REB-01 | unit | `node --test tests/phase-02-rules-identifier.test.cjs tests/phase-02-rules-path.test.cjs tests/phase-02-rules-command.test.cjs tests/phase-02-rules-skill_ns.test.cjs` | ⬜ |
| 02-02-T3: package.cjs + url.cjs + env_var.cjs + 3 rule tests | REB-01 | unit | `node --test tests/phase-02-rules-package.test.cjs tests/phase-02-rules-url.test.cjs tests/phase-02-rules-env_var.test.cjs` | ⬜ |

### Plan 02-03: Rebrand Engine + CLI

| Task | Requirement | Test Type | Automated Command | Status |
|------|-------------|-----------|-------------------|--------|
| 02-03-T1: engine.cjs + manifest.cjs + report.cjs + 6 integration tests | REB-04, REB-05, REB-06 | integration | `node --test tests/phase-02-engine-classify.test.cjs tests/phase-02-engine-no-source-mutation.test.cjs tests/phase-02-coverage-manifest.test.cjs tests/phase-02-allowlist.test.cjs tests/phase-02-owner-override.test.cjs tests/phase-02-summary-line.test.cjs` | ⬜ |
| 02-03-T2: rebrand.cjs CLI + dryrun-report + roundtrip + roundtrip-isolation tests; real-tree end-to-end | REB-04, REB-06 | integration | `node --test tests/phase-02-dryrun-report.test.cjs tests/phase-02-roundtrip.test.cjs tests/phase-02-roundtrip-isolation.test.cjs && npm run rebrand:dry-run && npm run rebrand && npm run rebrand:roundtrip` | ⬜ |

### Cross-Cutting Invariants (covered by tasks above)

| Invariant | Requirement | Test File | Owning Task |
|-----------|-------------|-----------|-------------|
| Engine never mutates source tree | REB-04 | `tests/phase-02-engine-no-source-mutation.test.cjs` | 02-03-T1 |
| Round-trip stable (re-apply = zero-change) | REB-06 | `tests/phase-02-roundtrip.test.cjs` | 02-03-T2 |
| Coverage manifest zero outside allowlist | REB-05, REB-06 | `tests/phase-02-coverage-manifest.test.cjs` | 02-03-T1 |
| Zero unclassified matches | REB-01, REB-04 | `tests/phase-02-engine-classify.test.cjs` | 02-03-T1 |
| Allowlist preserves LICENSE + URLs in attribution | REB-03, REB-06 | `tests/phase-02-allowlist.test.cjs` | 02-03-T1 |
| Per-rule classification correctness | REB-01 | `tests/phase-02-rules-*.test.cjs` (×7) | 02-02-T2, 02-02-T3 |
| Word-boundary substring negatives (Pitfall 1) | REB-01 | `tests/phase-02-rules-identifier.test.cjs` | 02-02-T2 |
| `package.json` shape | FND-01, FND-02 | `tests/phase-02-package-json.test.cjs` | 02-01-T1 |
| `postinstall` runs `build-hooks.js` | FND-03 | `tests/phase-02-build-hooks.test.cjs` | 02-01-T2 |
| `bin/install.js` invokable | FND-02 | `tests/phase-02-bin-stub.test.cjs` | 02-01-T1 |
| `npm install -g https://github.com/.../archive/<ref>.tar.gz` smoke | FND-04 | `scripts/install-smoke.cjs --ref <sha>` | 02-01-T3 |
| Round-trip uses `os.tmpdir()`, not `.oto-rebrand-out/` | REB-06 | `tests/phase-02-roundtrip-isolation.test.cjs` | 02-03-T2 |
| Engine summary line printed | (cross-cut) | `tests/phase-02-summary-line.test.cjs` | 02-03-T1 |
| `--owner` CLI override resolution (D-14) | REB-04 | `tests/phase-02-owner-override.test.cjs` | 02-03-T1 |
| `.gitignore` covers scratch dirs (D-17) | FND-03 | `tests/phase-02-gitignore.test.cjs` | 02-01-T1 |
| Schema validation rejects unknown rule classes (D-16) | REB-01 | `tests/phase-02-schema-validate.test.cjs` | 02-02-T1 |
| Hand-rolled validator schema parity (D-16) | REB-01 | covered by `tests/phase-02-schema-validate.test.cjs` Test 4 (re-export identity) | 02-02-T1 |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky — updated by executor per task*

---

## Wave 0 Requirements

> Phase 1 already shipped `tests/helpers/` and `node:test` infrastructure. Phase 2's Wave 0 is "create test files alongside the implementation modules in each task" — no separate framework install needed. Each test file is created in the same task that creates the implementation it tests (TDD-style; `tdd="true"` is set on every code-producing task).

Files created (with owning task):

- [ ] `tests/phase-02-package-json.test.cjs` (02-01-T1) — FND-01, FND-02
- [ ] `tests/phase-02-gitignore.test.cjs` (02-01-T1) — D-17
- [ ] `tests/phase-02-bin-stub.test.cjs` (02-01-T1) — FND-02
- [ ] `tests/phase-02-build-hooks.test.cjs` (02-01-T2) — FND-03
- [ ] `tests/phase-02-walker.test.cjs` (02-02-T1) — REB-03 walker contract
- [ ] `tests/phase-02-schema-validate.test.cjs` (02-02-T1) — REB-01 (D-16)
- [ ] `tests/phase-02-rules-identifier.test.cjs` (02-02-T2) — REB-01 + Pitfall 1
- [ ] `tests/phase-02-rules-path.test.cjs` (02-02-T2) — REB-01
- [ ] `tests/phase-02-rules-command.test.cjs` (02-02-T2) — REB-01
- [ ] `tests/phase-02-rules-skill_ns.test.cjs` (02-02-T2) — REB-01
- [ ] `tests/phase-02-rules-package.test.cjs` (02-02-T3) — REB-01
- [ ] `tests/phase-02-rules-url.test.cjs` (02-02-T3) — REB-01 (D-14)
- [ ] `tests/phase-02-rules-env_var.test.cjs` (02-02-T3) — REB-01
- [ ] `tests/phase-02-engine-classify.test.cjs` (02-03-T1) — REB-01, REB-04
- [ ] `tests/phase-02-engine-no-source-mutation.test.cjs` (02-03-T1) — REB-04
- [ ] `tests/phase-02-coverage-manifest.test.cjs` (02-03-T1) — REB-05, REB-06
- [ ] `tests/phase-02-allowlist.test.cjs` (02-03-T1) — REB-03, REB-06
- [ ] `tests/phase-02-owner-override.test.cjs` (02-03-T1) — REB-04 (D-14)
- [ ] `tests/phase-02-summary-line.test.cjs` (02-03-T1) — cross-cut UX
- [ ] `tests/phase-02-dryrun-report.test.cjs` (02-03-T2) — REB-04
- [ ] `tests/phase-02-roundtrip.test.cjs` (02-03-T2) — REB-06
- [ ] `tests/phase-02-roundtrip-isolation.test.cjs` (02-03-T2) — REB-06 isolation guarantee
- [ ] `tests/fixtures/rebrand/` (02-02-T1) — synthetic-fixture tree (D-07 categories)

*Existing helpers: `tests/helpers/load-schema.cjs` is reusable (becomes a re-export of `scripts/rebrand/lib/validate-schema.cjs` in 02-02-T1). Existing test layout: `tests/phase-01-*.test.cjs` is the naming precedent.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| GitHub repo creation (public, owner = `OTOJulian`, name = `oto-hybrid-framework`) | FND-04 (D-08) | One-time visibility/topics/description configuration via `gh repo create` or web UI; not worth scripting for personal-use scope | 1. Create `github.com/OTOJulian/oto-hybrid-framework` (public). 2. Push current branch. 3. Run `node scripts/install-smoke.cjs --ref $(git rev-parse HEAD)` and confirm exit 0. (Plan 02-01 Task 3 checkpoint.) |
| `npm install -g https://github.com/OTOJulian/oto-hybrid-framework/archive/<ref>.tar.gz` against live remote | FND-04 (D-08) | Requires network + live remote; exercises the same public GitHub archive that users install from | Run `scripts/install-smoke.cjs --ref <sha>` after each tagged release; assert `oto --version` exits 0 |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies (every task in 02-01/02-02/02-03 has an `<automated>` block)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify (every task has its own automated verify; no gaps)
- [x] Wave 0 covers all MISSING references (test files listed above; each is created within the task that needs it)
- [x] No watch-mode flags (`node --test` is single-shot by default)
- [x] Feedback latency < 10s for quick command (unit tests under 10s; integration tests sampled per wave, not per commit)
- [x] `nyquist_compliant: true` set in frontmatter (every task has `<automated>` verify; integration tests sampled per wave)

**Approval:** ready for execution
