---
phase: 1
slug: add-oto-migrate-a-command-that-converts-a-gsd-era-project-s
status: draft
nyquist_compliant: true
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

> One row per executable task across the three plans. Test Type ∈ {unit, integration, system}. File Exists indicates whether the test file already exists or needs Wave 0 to create it. Wave 0 is Plan 01-01 itself.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-01-T1 | 01-01 | 0 | REQ-MIG-01..10 | T-01-08 | Authentic GSD-era fixture data (state-frontmatter + instruction-file markers + command refs) used by all later tests; isolates test data from production planning dirs | unit | `node -e "const fs=require('fs'); const m='tests/fixtures/gsd-project-minimal/.planning/STATE.md'; const f='tests/fixtures/gsd-project-full/CLAUDE.md'; const sm=fs.readFileSync(m,'utf8'); const sf=fs.readFileSync(f,'utf8'); if(!sm.includes('gsd_state_version: 1.0')) process.exit(1); if(!sf.includes('<!-- GSD:project-start')) process.exit(1); if(!sf.includes('/gsd-execute-phase')) process.exit(1); console.log('OK');"` | ✅ self-creating | ⬜ pending |
| 01-01-T2 | 01-01 | 0 | REQ-MIG-01..10 | — | RED-scaffold tests for every requirement before implementation; tests use deferred require so module-not-found surfaces as test-body assertion failure (graceful), not file-load crash | unit | `node --test --test-concurrency=4 tests/migrate-*.test.cjs 2>&1 \| tail -30 ; echo "expected: failures (RED) — every test fails via assertion (MODULE_NOT_FOUND surfaced inside test body), no top-level require crash"` | ✅ self-creating | ⬜ pending |
| 01-02-T0 | 01-02 | 1 | REQ-MIG-02, REQ-MIG-03, REQ-MIG-04 | T-01-10 | Engine never writes coverage manifests OR dry-run reports to a non-writable install dir (B-04 closed across BOTH apply AND dry-run paths via skipReports + reportsDir options) | unit | `node --test tests/rebrand-engine.test.cjs` | ✅ exists | ⬜ pending |
| 01-02-T1 | 01-02 | 1 | REQ-MIG-01, REQ-MIG-02, REQ-MIG-03 | T-01-04, T-01-09 | Detection runs without writes; dry-run reuses engine via migrate-scoped derived map (B-01 — `.planning → .oto` rule filtered out); runtime config dirs (`~/.claude` etc.) refused; W-04 RENAME_MAP_PATH fallback for both pre-install and post-install layouts | unit | `node --test tests/migrate-detect.test.cjs tests/migrate-dry-run.test.cjs tests/migrate-rename-map.test.cjs` | ⬜ created in Wave 0 (01-01-T2) | ⬜ pending |
| 01-02-T2a | 01-02 | 1 | REQ-MIG-04, REQ-MIG-07, REQ-MIG-08 | T-01-05, T-01-06, T-01-07 | Marker rewrite anchored on documented sentinel comment shape (won't match arbitrary user content); frontmatter-key rewrite scoped to YAML frontmatter slice only; staging in os.tmpdir() means engine failure never touches projectDir; atomic file writes for all replacements | unit | `node --test tests/migrate-helpers.test.cjs` | ✅ self-creating | ⬜ pending |
| 01-02-T2b | 01-02 | 1 | REQ-MIG-04, REQ-MIG-05, REQ-MIG-06, REQ-MIG-07, REQ-MIG-08 | T-01-04, T-01-05, T-01-08, T-01-11 | Backup directory created before any mutation; copy-back uses atomic per-file replace; safeJoin guards every backup path; copyTreeAtomic + listFilesToBackup explicitly skip `.oto-migrate-backup` (N-03 — recursive-backup defense); post-apply idempotency assertion catches residual GSD signals; conflict guard refuses half-migrated state without --force; opt-in `.planning → .oto` rename only when --rename-state-dir (B-01) | integration | `node --test tests/migrate-apply.test.cjs tests/migrate-idempotent.test.cjs tests/migrate-conflict.test.cjs tests/migrate-instructions.test.cjs tests/migrate-state-frontmatter.test.cjs` | ⬜ created in Wave 0 (01-01-T2) | ⬜ pending |
| 01-02-T3 | 01-02 | 1 | REQ-MIG-09 | — | parseArgs strict mode rejects unknown flags; main() returns numeric exit code (Promise<number>) so caller can `process.exit(await migrate.main(...))`; no positional arguments allowed | unit | `node -e "(async()=>{const m=require('./oto/bin/lib/migrate.cjs'); console.log(typeof m.main, typeof m.apply, typeof m.dryRun, typeof m.detectGsdProject); if(typeof m.main!=='function') process.exit(1);})()"` | n/a (no test file — node -e probe) | ⬜ pending |
| 01-03-T1 | 01-03 | 2 | REQ-MIG-09 | T-01-09 | `case 'migrate'` in oto-tools.cjs dispatch wires CLI surface; spawns oto-tools subprocess with migrate args, asserts exit codes match the documented contract (0 success, non-zero on detection-fail / parse-error / conflict / idempotency-violation) | system | `node --test tests/migrate-cli.test.cjs` | ⬜ created in Wave 0 (01-01-T2) | ⬜ pending |
| 01-03-T2 | 01-03 | 2 | REQ-MIG-10 | — | Claude command markdown is installed and discoverable at `oto/commands/oto/migrate.md`; document parses (frontmatter valid, body non-empty); slash-command surface ships with the package | unit | `node --test tests/migrate-command-md.test.cjs` | ⬜ created in Wave 0 (01-01-T2) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

*Wave 0 = Plan 01-01 itself (tests + fixtures); Wave 1 = Plan 01-02 (engine + migrate.cjs); Wave 2 = Plan 01-03 (dispatch + command-md surface). All test files referenced in Wave 1+ rows are created in Wave 0 (01-01-T2) except `tests/migrate-helpers.test.cjs` (created inline in 01-02-T2a) and `tests/rebrand-engine.test.cjs` (already exists in repo).*

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

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (10 test files + 2 fixture trees)
- [x] No watch-mode flags (use `node --test`, not `--watch`)
- [x] Feedback latency < 90s
- [x] `nyquist_compliant: true` set in frontmatter (per-task map filled)
- [ ] `wave_0_complete: true` (flips after Plan 01-01 lands)

**Approval:** pending
