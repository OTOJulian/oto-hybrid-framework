---
phase: 1
slug: add-oto-migrate-a-command-that-converts-a-gsd-era-project-s
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-05
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `node:test` (built-in, Node 22+) |
| **Config file** | `scripts/run-tests.cjs` (existing repo runner) |
| **Quick run command** | `node --test --test-concurrency=4 tests/migrate-*.test.cjs` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~5–15 seconds (migrate tests); ~60–90 seconds (full) |

---

## Sampling Rate

- **After every task commit:** Run quick run command (`node --test tests/migrate-*.test.cjs`)
- **After every plan wave:** Run full suite (`npm test`)
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 90 seconds (full suite); 15 seconds (quick)

---

## Per-Task Verification Map

> The planner fills this table after producing PLAN.md files. One row per executable task. `Test Type ∈ {unit, integration, system, manual}`. `File Exists` indicates whether the test file already exists or needs Wave 0 to create it.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 1-XX-XX | XX | N | REQ-MIG-XX | — | (filled by planner) | unit/integration/system | `node --test tests/migrate-*.test.cjs` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Based on RESEARCH.md ("10 named test files + 2 fixture trees for Wave 0"):

- [ ] `tests/migrate-detect.test.cjs` — REQ-MIG-01 (GSD project detection)
- [ ] `tests/migrate-rename-map.test.cjs` — REQ-MIG-02 (rename map application via existing engine)
- [ ] `tests/migrate-dry-run.test.cjs` — REQ-MIG-03 (dry-run report shape; no writes)
- [ ] `tests/migrate-apply.test.cjs` — REQ-MIG-04 (apply writes only allowlisted paths)
- [ ] `tests/migrate-idempotent.test.cjs` — REQ-MIG-05 (second run is no-op)
- [ ] `tests/migrate-conflict.test.cjs` — REQ-MIG-06 (oto markers already present → safe abort)
- [ ] `tests/migrate-instructions.test.cjs` — REQ-MIG-07 (CLAUDE.md / AGENTS.md / GEMINI.md marker block rewrite)
- [ ] `tests/migrate-state-frontmatter.test.cjs` — REQ-MIG-08 (`gsd_state_version` → `oto_state_version` rewrite)
- [ ] `tests/migrate-cli.test.cjs` — REQ-MIG-09 (oto-tools CLI subcommand dispatch + exit codes)
- [ ] `tests/migrate-command-md.test.cjs` — REQ-MIG-10 (Claude command markdown is installed and discoverable)
- [ ] `tests/fixtures/gsd-project-minimal/` — fixture: smallest GSD-era project (STATE.md + ROADMAP.md + 1 phase dir)
- [ ] `tests/fixtures/gsd-project-full/` — fixture: full GSD-era project (all artifact types, all 3 instruction files, completed-phase summaries)

*If none: "Existing infrastructure covers all phase requirements." → not applicable; new test files are required.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| End-to-end migration on a real external GSD-era repo | REQ-MIG-04, REQ-MIG-05 | Requires a separate user repo not present in CI | `cd /tmp/sandbox-gsd-repo && oto migrate --dry-run && oto migrate --apply && oto migrate --apply # second run = no-op` |
| Per-runtime instruction-file UX in actual Claude / Codex / Gemini CLIs | REQ-MIG-07 | Behavior depends on each CLI's reading of CLAUDE.md / AGENTS.md / GEMINI.md | Open the migrated repo in each CLI; verify `/oto-*` commands list and that legacy `/gsd-*` references in prose are not broken links |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (10 test files + 2 fixture trees)
- [ ] No watch-mode flags (use `node --test`, not `--watch`)
- [ ] Feedback latency < 90s
- [ ] `nyquist_compliant: true` set in frontmatter after planner fills the per-task map

**Approval:** pending
