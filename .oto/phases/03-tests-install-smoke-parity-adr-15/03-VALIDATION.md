---
phase: 3
slug: tests-install-smoke-parity-adr-15
status: passed
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-18
revised: 2026-05-18
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `node:test` (Node 22+ built-in) |
| **Config file** | none — runner script is `scripts/run-tests.cjs` |
| **Quick run command** | `node --test --test-name-pattern="ingest-docs\|eval-review\|install-smoke\|phase-08-smoke" tests/` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~45–75 seconds full; ~10s focused |

---

## Sampling Rate

- **After every task commit:** Run focused command for the file(s) touched (e.g. `node --test tests/ingest-docs.test.cjs`).
- **After every plan wave:** Run `npm test` and confirm baseline `561 pass + 1 skip + 0 fail → 595–605 pass + 1 skip + 0 fail` (exact target locked by planner per Wave 1 landing).
- **Before `/oto-verify-work`:** Full suite must be green AND `act -j install-smoke-tarball` + `act -j install-smoke-unpacked` (or equivalent local CI runner) must assert agent presence.
- **Max feedback latency:** 75 seconds.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 3-01-01 | 01 | 1 | TEST-01 | — | Workflow + command + 3 agent files present per inventory | unit | `node --test tests/ingest-docs.test.cjs` | ✅ created in 03-01 | ✅ green |
| 3-01-02 | 01 | 1 | TEST-02 | T-3-02 | Workflow loads; `oto-eval-auditor` dispatch surface; EVAL-REVIEW.md shape; SDK-DEFER-01 fallback locked via 2 literal regexes (B3) | unit | `node --test tests/eval-review.test.cjs` | ✅ created in 03-01 | ✅ green |
| 3-01-03 | 01 | 1 | TEST-03 | — | Full suite green at v0.2.0 baseline + new tests | regression | `npm test` | ✅ existing | ✅ green |
| 3-02-01 | 02 | 1 | INST-03 | — | `EXPECTED_AGENTS` includes 3 new agents (26 total) | unit | `node --test tests/phase-04-mr01-install-smoke.test.cjs` | ✅ updated in 03-02 | ✅ green |
| 3-02-02 | 02 | 1 | INST-03 | — | CI install-smoke asserts 3 new agent files in each runtime config dir under tarball + unpacked | CI | `grep -E "oto-doc-classifier\|oto-doc-synthesizer\|oto-eval-auditor" .github/workflows/install-smoke.yml` | ✅ updated in 03-02 | ✅ green |
| 3-03-01 | 03 | 1b | PRTY-01 | T-3-09, T-3-10 | Codex parity: `~/.codex/skills/oto-ingest-docs/SKILL.md` + `oto-eval-review/SKILL.md` exist; sandbox TOML per D-04 | integration | `node --test tests/phase-08-smoke-codex.integration.test.cjs` | ✅ updated in 03-03 | ✅ green |
| 3-03-02 | 03 | 1b | PRTY-01 | T-3-12 | Gemini parity: `~/.gemini/commands/oto/ingest-docs.md` + `eval-review.md` exist (W2 locked — `.md` extension per existing test precedent at lines 60-62) | integration | `node --test tests/phase-08-smoke-gemini.integration.test.cjs` | ✅ updated in 03-03 | ✅ green |
| 3-03-03 | 03 | 1b | PRTY-01 | T-3-W3 | Claude parity assertions owned by Plan 02 in `tests/phase-04-mr01-install-smoke.test.cjs`; Plan 03 Task 3 reruns full suite AFTER Plan 02 lands (depends_on: ['03-02']) | integration | `node --test tests/phase-04-mr01-install-smoke.test.cjs` | ✅ updated in 03-02 | ✅ green |
| 3-04-01 | 04 | 2 | ADR-01 | T-3-B1, T-3-B2 | `decisions/ADR-15-restore-doc-and-eval-agents.md` exists; `Implements: D-24` (B1); cites `ADR-07-agent-trim.md` not the typo (B2); names exactly 3 agents restored; affirms AGNT-DEFER-01 stays deferred; records Codex sandbox per agent | doc | `test -f decisions/ADR-15-restore-doc-and-eval-agents.md && grep -qE "^Implements: D-24" decisions/ADR-15-*.md && grep -q "ADR-07-agent-trim.md" decisions/ADR-15-*.md && ! grep -q "ADR-07-agent-rationalization" decisions/ADR-15-*.md && node --test tests/phase-01-adr-structure.test.cjs` | ✅ created in 03-04 | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

**Wave column note:** Plans 01 and 02 are Wave 1 (mutually parallel, disjoint files). Plan 03 is Wave 1b (sequenced after Plan 02 via `depends_on: ['03-02']` per W3 fix — its Task 3 full-suite regression check needs EXPECTED_AGENTS bumped first). Plan 04 is Wave 2 (depends on all three).

---

## Wave 0 Requirements

- [x] `tests/ingest-docs.test.cjs` — ported from GSD with namespace rebrand + D-04 hand-fixups (drops `import` command describe block; drops `Write` from classifier allowlist assertion) — created by Plan 01 Task 1 (Wave 0 satisfied by the plan that creates it)
- [x] `tests/eval-review.test.cjs` — new file covering workflow load, agent dispatch shape, EVAL-REVIEW.md output shape with COVERED/PARTIAL/MISSING scoring, AND two literal SDK-DEFER-01 fallback regex assertions (B3) — created by Plan 01 Task 2
- [x] `decisions/ADR-15-restore-doc-and-eval-agents.md` — new ADR with `Implements: D-24` (B1) and correct ADR-07 filename references (B2) — created by Plan 04 Task 1

*No framework install needed: `node:test` is built-in to Node 22+.*

*Wave 0 boxes are checked because each MISSING artifact is now explicitly created by the named plan/task with an automated `<verify>` command that uses the artifact. There is no remaining MISSING-without-creator gap.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| ADR-15 prose quality (reads ADR-07's reactivation framing correctly, scopes AGNT-DEFER-01 affirmation) | ADR-01 | Documentation review is subjective | Read `decisions/ADR-15-*.md` end-to-end; confirm Implements/Context/Decision/Consequences sections per ADR-09 format; confirm 7 still-dropped agents enumerated; confirm `Implements: D-24` and ADR-07 filename references the actual on-disk file (`ADR-07-agent-trim.md`) |
| Cross-runtime smoke on physical runtimes (vs CI tarball+unpacked) | PRTY-01 | CI install-smoke uses fixture config dirs; real Claude/Codex/Gemini installs need human invocation to confirm command files dispatch correctly | After `oto install --all`, run `/oto-ingest-docs` and `/oto-eval-review` against fixture inputs in each runtime and confirm no deferral refusal |

---

## Revision Log

| Date | Iter | Issues Addressed | Files Touched |
|------|------|------------------|---------------|
| 2026-05-18 | 1 | B1 (ADR-15 Implements line → D-24), B2 (ADR-07 filename typo fix), B3 (SDK-DEFER-01 fallback regex literal lock), W2 (Gemini `.md` extension lock), W3 (Plan 03 depends_on ['03-02']), W7 (validation sign-off flipped) | 03-01-PLAN.md, 03-03-PLAN.md, 03-04-PLAN.md, 03-VALIDATION.md |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 75s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-05-18
