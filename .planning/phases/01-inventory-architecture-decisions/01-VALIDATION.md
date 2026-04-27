---
phase: 1
slug: inventory-architecture-decisions
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-27
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Phase 1 is documentation-only — validation = schema-checking JSON outputs + grep-checking ADR markdown structure.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `node:test` (built-in Node 22+) per CLAUDE.md / STACK.md prescription |
| **Config file** | none — zero-deps, no install needed |
| **Quick run command** | `node --test tests/phase-01-*.test.cjs` |
| **Full suite command** | `node scripts/run-tests.cjs` (mirrors GSD's pattern, to be created in Wave 0) |
| **Estimated runtime** | ~2 seconds (pure file-existence + schema-validation, no I/O beyond filesystem) |

---

## Sampling Rate

- **After every task commit:** Run `node --test tests/phase-01-*.test.cjs`
- **After every plan wave:** Run same (no integration surface — phase is pure docs)
- **Before `/gsd-verify-work`:** Full suite must be green; manual review of ADRs by user before phase close
- **Max feedback latency:** 2 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 1-01-W0-01 | 01 | 0 | — | — | N/A | unit | `node --test tests/phase-01-adr-structure.test.cjs` | ❌ W0 | ⬜ pending |
| 1-01-W0-02 | 01 | 0 | — | — | N/A | unit | `node --test tests/phase-01-decisions-dir.test.cjs` | ❌ W0 | ⬜ pending |
| 1-01-W0-03 | 01 | 0 | — | — | N/A | unit | `node --test tests/phase-01-licenses.test.cjs` | ❌ W0 | ⬜ pending |
| 1-02-W0-01 | 02 | 0 | — | — | N/A | integration | `node --test tests/phase-01-inventory.test.cjs` | ❌ W0 | ⬜ pending |
| 1-02-W0-02 | 02 | 0 | — | — | N/A | integration | `node --test tests/phase-01-agent-audit.test.cjs` | ❌ W0 | ⬜ pending |
| 1-03-W0-01 | 03 | 0 | — | — | N/A | integration | `node --test tests/phase-01-rename-map.test.cjs` | ❌ W0 | ⬜ pending |
| 1-01-XX | 01 | 1+ | ARCH-01 | — | ADR-01 state-root present, sections valid | unit | `node --test tests/phase-01-adr-structure.test.cjs` | ❌ W0 | ⬜ pending |
| 1-01-XX | 01 | 1+ | ARCH-02 | — | ADR-03 + skill-vs-command.md present | unit | `node --test tests/phase-01-adr-structure.test.cjs` | ❌ W0 | ⬜ pending |
| 1-01-XX | 01 | 1+ | ARCH-03 | — | ADR-04 sessionstart present | unit | `node --test tests/phase-01-adr-structure.test.cjs` | ❌ W0 | ⬜ pending |
| 1-01-XX | 01 | 1+ | ARCH-04 | — | ADR-05 agent-collisions present | unit | `node --test tests/phase-01-adr-structure.test.cjs` | ❌ W0 | ⬜ pending |
| 1-01-XX | 01 | 1+ | ARCH-05 | — | ADR-06 (or merged) skill-namespace present | unit | `node --test tests/phase-01-adr-structure.test.cjs` | ❌ W0 | ⬜ pending |
| 1-01-XX | 01 | 1+ | DOC-05 | — | All ADR files have Status/Date/Context/Decision/Rationale/Consequences sections | unit | `node --test tests/phase-01-adr-structure.test.cjs` | ❌ W0 | ⬜ pending |
| 1-02-XX | 02 | 1+ | ARCH-06 | — | file-inventory.json validates against schema; row count matches filesystem; no `unclassified` verdicts | integration | `node --test tests/phase-01-inventory.test.cjs` | ❌ W0 | ⬜ pending |
| 1-02-XX | 02 | 1+ | AGT-01 | — | agent-audit.md contains all 33 GSD agent names with verdict + rationale | integration | `node --test tests/phase-01-agent-audit.test.cjs` | ❌ W0 | ⬜ pending |
| 1-03-XX | 03 | 1+ | REB-02 | — | rename-map.json validates against schema; required rule types present; allowlist contains license names + Lex/Jesse strings | integration | `node --test tests/phase-01-rename-map.test.cjs` | ❌ W0 | ⬜ pending |
| 1-03-XX | 03 | 1+ | FND-06 | — | LICENSE (Julian Isaac) + THIRD-PARTY-LICENSES.md (Lex Christopherson + Jesse Vincent verbatim) at repo root | unit | `node --test tests/phase-01-licenses.test.cjs` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

*Per-task IDs (1-01-XX, 1-02-XX, 1-03-XX) finalize during planning — placeholders here.*

---

## Wave 0 Requirements

All test infrastructure is missing. Wave 0 must create:

- [ ] `tests/phase-01-adr-structure.test.cjs` — covers ARCH-01..05, DOC-05 (regex-validates each ADR's required sections)
- [ ] `tests/phase-01-inventory.test.cjs` — covers ARCH-06 (loads JSON, validates against schema, asserts row count matches filesystem walk)
- [ ] `tests/phase-01-agent-audit.test.cjs` — covers AGT-01 (asserts all 33 agent names present, every line has verdict+rationale)
- [ ] `tests/phase-01-rename-map.test.cjs` — covers REB-02 (validates against schema, asserts allowlist contents)
- [ ] `tests/phase-01-licenses.test.cjs` — covers FND-06 (asserts both copyright strings present in THIRD-PARTY-LICENSES.md)
- [ ] `tests/phase-01-decisions-dir.test.cjs` — counts files in `decisions/`, asserts ≥19 (14 ADRs + skill-vs-command.md + agent-audit.md + file-inventory.json + file-inventory.md + ≥1 reserved)
- [ ] `schema/file-inventory.json` — JSON Schema (Wave 0 dependency for inventory test)
- [ ] `schema/rename-map.json` — JSON Schema (Wave 0 dependency for rename-map test)
- [ ] `tests/helpers/load-schema.cjs` — small hand-rolled validator (zero-deps per CLAUDE.md; no AJV)

**Framework install:** `node:test` is built into Node 22+ — no `npm install` step. Hand-roll required-field/enum/pattern checks (~50 LOC) inside `tests/helpers/load-schema.cjs` to keep zero deps per CLAUDE.md "zero-deps preferred" rigor.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| ADR rationale text quality (each ADR's "Rationale" section makes sense to a future reader) | DOC-05 | Subjective — automated grep cannot judge prose coherence | User reads each ADR before phase close; signs off in `/gsd-verify-work` UAT |
| GitHub username `julianisaac` correctness (D-16, A1) | REB-02 (URL rule) | External fact — cannot be verified against codebase | User confirms before Phase 2 starts; if wrong, update URL rule in rename-map.json |
| Agent keep/drop verdicts match user intent (D-12) | AGT-01 | Judgment call — automated check only ensures every agent has *a* verdict, not the *right* verdict | User reviews agent-audit.md before phase close |
| GSD CHANGELOG deprecation classifications (Open Question Q1, recommendation: manual grep) | ARCH-06, REB-02 | Prose-form deprecation notes need human classification | Hand-curate per ADR-15; ~30 min human effort |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify command or Wave 0 dependency listed
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify (satisfied — every task ties to one of 6 test files)
- [ ] Wave 0 covers all MISSING references (6 test files + 2 schemas + 1 helper)
- [ ] No watch-mode flags (none used — `node --test` runs once)
- [ ] Feedback latency < 2s (measured: file-existence + JSON parse + regex)
- [ ] `nyquist_compliant: true` set in frontmatter (after Wave 0 + first sampling pass succeed)

**Approval:** pending
