---
phase: 6
slug: skills-port-cross-system-integration
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-01
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `node:test` (built-in, Node ≥22) |
| **Config file** | none — runner is `scripts/run-tests.cjs` (Phase 1/2) |
| **Quick run command** | `node scripts/run-tests.cjs --filter "06-"` |
| **Full suite command** | `node scripts/run-tests.cjs` |
| **Estimated runtime** | ~3–5 seconds (3 focused tests; full suite ~30s) |

---

## Sampling Rate

- **After every task commit:** Run `node scripts/run-tests.cjs --filter "06-"`
- **After every plan wave:** Run `node scripts/run-tests.cjs`
- **Before `/oto-verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds per task, 30 seconds per merge

**Per-axis sampling design:**

- **Skill structure:** all 7 skills sampled (D-07 mandates "all 7 skill directories"). Rate: per-task and per-merge.
- **Install copy fidelity:** all 27 files in `phase_owner: 6` (sha256 + executable bit on the single `.sh`). Rate: per-merge (~1 s in temp dir).
- **STATE.md gating prose:** single canonical fixture (`using-oto/SKILL.md` body); presence-of-directive assertion. Phase 10 (CI-08) expands to live conversational test.
- **Agent invocation prose:** all 3 agents × 4 invocation directives sampled in one static-analysis pass.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 06-01-XX | 01 | 0 | SKL-01..08 | — | N/A (test scaffolds) | unit | `node --test tests/06-skill-structure.test.cjs` | ❌ W0 | ⬜ pending |
| 06-01-XX | 01 | 0 | SKL-07 | T-15 | No upstream-identity literal leakage in `using-oto/SKILL.md` | unit (static-analysis) | `node --test tests/06-using-oto-state-gating.test.cjs` | ❌ W0 | ⬜ pending |
| 06-01-XX | 01 | 0 | SKL-07 | — | Installer copies `oto/skills/*` byte-identically; preserves executable bit on `find-polluter.sh` | integration | `node --test tests/06-installer-skill-copy.test.cjs` | ❌ W0 | ⬜ pending |
| 06-02-XX | 02 | 1 | SKL-01..07 | — | All 7 skills exist at `oto/skills/<name>/` with parseable frontmatter | unit (structure) | `node --test tests/06-skill-structure.test.cjs` | ❌ W0 | ⬜ pending |
| 06-02-XX | 02 | 1 | SKL-07 | T-15 | `using-oto/SKILL.md` contains STATE.md gating directive; no upstream literals | unit (static-analysis) | `node --test tests/06-using-oto-state-gating.test.cjs` | ❌ W0 | ⬜ pending |
| 06-03-XX | 03 | 1 | SKL-08 | — | `oto-executor.md` body contains `Skill('oto:test-driven-development')` and `Skill('oto:verification-before-completion')` | unit (static-analysis) | `node --test tests/06-skill-structure.test.cjs` | ❌ W0 | ⬜ pending |
| 06-03-XX | 03 | 1 | SKL-08 | — | `oto-verifier.md` body contains `Skill('oto:verification-before-completion')` | unit (static-analysis) | same | ❌ W0 | ⬜ pending |
| 06-03-XX | 03 | 1 | SKL-08 | — | `oto-debugger.md` body contains `Skill('oto:systematic-debugging')` | unit (static-analysis) | same | ❌ W0 | ⬜ pending |
| 06-03-XX | 03 | 1 | SKL-08 | — | No `oto:<skill>` collides with any `/oto-<name>` command file | unit (collision) | same | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

*(Plan-letter and task IDs above are placeholders until planner assigns final plan numbers.)*

---

## Wave 0 Requirements

- [ ] `tests/06-skill-structure.test.cjs` — covers SKL-01..07 (structure) + SKL-08 (collision + agent invocation prose); planner may split agent-invocation assertions into a separate file at discretion
- [ ] `tests/06-installer-skill-copy.test.cjs` — covers SKL-07 install fidelity (D-08); recursive byte-equality, sha256 match, executable-bit preservation, install-state JSON marker
- [ ] `tests/06-using-oto-state-gating.test.cjs` — covers SKL-07 deferral directive (D-09) + literal-string-leak defense (Pitfall 15)
- [ ] (optional) `tests/skills/__fixtures__/STATE-active.md` — only if planner chooses to test gating prose against a real fixture; otherwise skill body anchors are sufficient

*No framework install needed — `node:test` is built-in to Node 22+.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live skill auto-trigger when `.oto/STATE.md` is `complete` (skill fires on suspicion) | SKL-07 (success criterion 5) | Requires real model session; static analysis cannot exercise auto-load behavior | Deferred to Phase 10 (CI-08); D-09 ships static-analysis precursor only |
| Live deferral when `.oto/STATE.md` shows active phase (ambient skills suppressed) | SKL-07 (success criterion 2) | Same reason — needs live conversational eval | Deferred to Phase 10 (CI-08) |

*All in-scope Phase 6 behaviors have automated verification. The two live conversational checks are explicitly deferred to Phase 10 per CONTEXT.md and ROADMAP scope.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (3 test files seeded; agent edits + skill files filled in Wave 1)
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s per task
- [ ] `nyquist_compliant: true` set in frontmatter (planner sets after Wave 0 task IDs are assigned)

**Approval:** pending
