---
oto_state_version: 1.0
milestone: v0.5.0
milestone_name: Exa Search Integration
status: completed
stopped_at: Completed 16-09-PLAN.md
last_updated: "2026-07-18T19:41:39.990Z"
last_activity: 2026-07-18
progress:
  total_phases: 3
  completed_phases: 3
  total_plans: 40
  completed_plans: 40
  percent: 100
---

# Project State

## Project Reference

See: .oto/PROJECT.md (updated 2026-07-18)

**Core value:** Stop framework-switching - one installable framework where GSD's planning/execution workflow and Superpowers' capabilities coexist behind a single, consistent `/oto-*` command surface across Claude Code, Codex, and Gemini CLI.

**Current focus:** Planning next milestone

## Current Position

Milestone: v0.5.0 Exa Search Integration — SHIPPED 2026-07-18 (tag v0.5.0)
Status: Between milestones — next milestone not yet defined
Last activity: 2026-07-18 — v0.5.0 archived (roadmap + requirements), PROJECT.md evolved, tagged

Progress: [██████████] 100%

## Next Command

v0.5.0 is shipped, archived, and tagged. Closed without a separate milestone audit (developer-accepted); WR-02 planning-root fixture debt remains approved DEFER. Run `/oto-new-milestone` to start the next cycle (questioning → research → requirements → roadmap). New phases number from 17.

## Performance Metrics

**Velocity (v0.4.0 reference):**

- v0.4.0: 12 plans across 3 phases; recent plan durations 8/6/7/4/3/18/36 min

**v0.5.0:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 14 | 19 | - | - |
| 15 | 12 | - | - |
| 16 | 9 | - | - |

*Updated after each plan completion*
| Phase 14 P01 | 8 min | 2 tasks | 5 files |
| Phase 14 P02 | 8 min | 2 tasks | 7 files |
| Phase 14 P03 | 14 min | 2 tasks | 34 files |
| Phase 14 P04 | 39min | 3 tasks | 2 files |
| Phase 15 P01 | 8 min | 2 tasks | 2 files |
| Phase 15 P02 | 5 min | 2 tasks | 18 files |
| Phase 15 P03 | 3 min | 2 tasks | 4 files |
| Phase 15 P04 | 7 min | 2 tasks | 3 files |
| Phase 15 P05 | 5 min | 2 tasks | 2 files |
| Phase 15 P06 | 9 min | 2 tasks | 2 files |
| Phase 15 P07 | 14 min | 3 tasks | 4 files |
| Phase 15 P08 | 9 min | 2 tasks | 4 files |
| Phase 15 P09 | 10 min | 3 tasks | 14 files |
| Phase 15 P10 | 13h 31m | 2 tasks | 8 files |
| Phase 15 P11 | 8 min | 2 tasks | 5 files |
| Phase 15 P12 | 8 min | 2 tasks | 7 files |
| Phase 16 P09 | 7 min | 2 tasks | 4 files |

## Accumulated Context

### Roadmap Evolution

- 2026-07-18: v0.5.0 shipped (phases 14-16; key-storage reconciliation, Exa MCP registration in all three runtimes, shared agent guidance + hardening). Archives: `.oto/milestones/v0.5.0-*`. Next phases number from 17.
- 2026-05-26: v0.4.0 shipped (phases 11-13; SDK port, query registry, dogfood `.oto/` migration). Archives: `.oto/milestones/v0.4.0-*`.

### Decisions

Full log: PROJECT.md Key Decisions table (v0.5.0 decisions recorded at close). Forward-relevant:

- New phases number from 17 (above the highest existing phase folder, 16); accumulated phase directories are never renamed/moved/deleted.
- All installer changes go in the live `bin/lib/` installer; `oto/bin/install.js` is a vestigial GSD reference.
- Sync hygiene: new logic in oto-only files where possible; shared-file diffs small and commented; `oto sync --dry-run` verified at milestone close.
- Integration config flags are boolean-only; keys live in env vars or 0600 `~/.oto` keyfiles; all availability gates use `detectKeySource`, never bare file existence.
- MCP registration is additive, consent-gated (default No), fingerprint-owned per runtime; user-owned/drifted/unparseable entries are refused, never overwritten.

### Pending Todos

- **Tooling quick task:** `oto-sdk query verify.codebase-drift` still targets removed `get-shit-done/bin/gsd-tools.cjs`, so the non-blocking drift gate skips with `sdk-exception`. Fix the OTO-native helper routing and add a JSON-contract regression via `/oto-quick`. Tracked in `.oto/todos/pending/2026-07-14-fix-codebase-drift-stale-gsd-helper-path.md`.
- **Deferred debt (WR-02 planning-root migration):** CJS/SDK `.planning` → `.oto` planning-root and stale-fixture migration, developer-approved DEFER at v0.5.0 close under the amended SDK baseline. Required before any future gate that needs the full SDK suite green without the amendment. Evidence: `16-DISPOSITIONS.md`, `16-SDK-BASELINE-DELTA.txt`.

### Blockers/Concerns

None. The v0.5.0-opening secret-hygiene defect (raw keys in tracked config) was fixed and regression-guarded in Phase 14.

## Deferred Items

Items acknowledged and deferred at v0.5.0 milestone close on 2026-07-18 (20 open-artifact-audit items plus tracked follow-ups). The debug session, the four May quick tasks, and both context-question rows were previously acknowledged at the v0.4.0 close; the twelve 2026-06/07 quick tasks are all already shipped (see Quick Tasks Completed below) and are flagged only because their directories lack STATE files.

| Category | Item | Status | Note |
|----------|------|--------|------|
| debug | knowledge-base | unknown | Stale debug session from 2026-05-05 (pre-v0.4.0); has a `resolved/` subdir. Close or archive via `/oto-debug` cleanup. |
| quick_task | 16 directories (260505-bxx … 260716-qbp) | committed | All shipped with commits recorded in Quick Tasks Completed; audit flags them only for missing STATE files. |
| todo | 2026-07-14-fix-codebase-drift-stale-gsd-helper-path | pending | `verify.codebase-drift` targets the removed GSD helper; fix via `/oto-quick`. |
| context_question | Phase 02 (02-CONTEXT.md) | stale | v0.3.0-era discuss question left flagged; phase shipped and verified. |
| context_question | Phase 11 (11-CONTEXT.md) | stale | Discuss questions answered during planning; phase shipped and verified. |
| debt | WR-02 planning-root fixture migration | deferred (approved) | See Pending Todos; amended SDK baseline recorded in `16-SDK-BASELINE-DELTA.txt`. |
| gap | No v0.5.0 milestone audit | accepted | Close proceeded on phase-level verification with developer approval; `/oto-audit-milestone` remains available retroactively. |
| follow-up | init.cjs `.planning/` leak + milestone.complete marker | open | `oto/bin/lib/init.cjs:554` returns `task_dir: .planning/quick/…` (SDK handler correct); GSD-era identifiers in ported tooling — fix via `/oto-quick`. Note: the v0.5.0 requirements archive header also emitted a `.planning/REQUIREMENTS.md` reference (corrected by hand at close). |
| follow-up | config-mutation.ts:349 reads `~/.gsd/defaults.json` vs CJS `config.cjs:66` `~/.oto/defaults.json` | open | GSD-era path divergence found during Phase 14; out of D-08 scope — fix via `/oto-quick` alongside the other identifier cleanups. |

## Session Continuity

Last session: 2026-07-18T13:42:45.261Z
Stopped at: Completed 16-09-PLAN.md
Resume file: None

### Quick Tasks Completed

| # | Description | Date | Commit | Status | Directory |
|---|-------------|------|--------|--------|-----------|
| 260505-bxx | Port GSD's Codex command-to-skill adapter into oto's installer (Codex `$oto-*` invocation parity) | 2026-05-05 | f56522c |  | [260505-bxx-port-gsds-codex-command-to-skill-adapter](./quick/260505-bxx-port-gsds-codex-command-to-skill-adapter/) |
| 260505-cxx | Exclude runtime agent worktrees from `/oto-migrate` dry-run and apply scope | 2026-05-05 | 69f8969 |  | [260505-cxx-exclude-runtime-worktrees-from-migrate](./quick/260505-cxx-exclude-runtime-worktrees-from-migrate/) |
| 260506-axx | Expose `/oto:migrate` through the public `oto migrate` CLI path | 2026-05-06 | df7aba5 |  | [260506-axx-expose-migrate-through-public-cli](./quick/260506-axx-expose-migrate-through-public-cli/) |
| 260506-bxx | Skip untracked gitignored generated artifacts during `/oto-migrate` | 2026-05-06 | 4230d59 |  | [260506-bxx-skip-gitignored-migrate-artifacts](./quick/260506-bxx-skip-gitignored-migrate-artifacts/) |
| 260616-muv | Add oto-sdk PATH self-healing in wireOtoSdk and an `oto doctor` check | 2026-06-16 | 549d6c7 |  | [260616-muv-add-oto-sdk-path-self-healing-in-wireoto](./quick/260616-muv-add-oto-sdk-path-self-healing-in-wireoto/) |
| 260709-fav | Rewrite README.md to remove all mention of GSD and Superpowers, describing oto generically as its own framework | 2026-07-09 | bd5aeeb |  | [260709-fav-rewrite-readme-md-to-remove-all-mention-](./quick/260709-fav-rewrite-readme-md-to-remove-all-mention-/) |
| 260709-j0v | Remove vendored foundation-frameworks/ snapshots: tests to fixtures + opt-in corpus clone, folder deleted | 2026-07-09 | cd8d211 | Verified | [260709-j0v-remove-vendored-foundation-frameworks-sn](./quick/260709-j0v-remove-vendored-foundation-frameworks-sn/) |
| 260709-ks5 | Fix Codex SessionStart hook JSON schema mismatch (envelope output) + validate-commit stderr block reasons | 2026-07-09 | 8806d1e | Verified | [260709-ks5-fix-codex-sessionstart-hook-json-schema-](./quick/260709-ks5-fix-codex-sessionstart-hook-json-schema-/) |
| 260709-lln | Make Codex SessionStart hook detection deterministic via installer-registered --codex argv flag | 2026-07-09 | 1fce5a7 |  | [260709-lln-make-codex-sessionstart-hook-detection-d](./quick/260709-lln-make-codex-sessionstart-hook-detection-d/) |
| 260709-ob4 | Fix oto-sdk model profile validator to accept 'inherit' | 2026-07-09 | 0318f65 |  | [260709-ob4-fix-oto-sdk-model-profile-validator-to-a](./quick/260709-ob4-fix-oto-sdk-model-profile-validator-to-a/) |
| 260713-ffa | Recalibrate review machinery severity and convergence for Claude 5 / GPT-5.6 model generation | 2026-07-13 | 8379506 |  | [260713-ffa-recalibrate-review-machinery-severity-an](./quick/260713-ffa-recalibrate-review-machinery-severity-an/) |
| 260713-fym | Phase 14 developer triage: fix parser secret-fragment disclosure; defer two Criticals with Phase 15/16 owners; disposition six warnings; fix STATE marker and status; run required verification | 2026-07-13 | 606b7a9 |  | [260713-fym-phase-14-developer-triage-fix-parser-sec](./quick/260713-fym-phase-14-developer-triage-fix-parser-sec/) |
| 260713-in8 | Propagate review-machinery recalibration (260713-ffa) to Codex runtime root; Gemini skipped (no oto install) | 2026-07-13 | 7aaf84f |  | [260713-in8-propagate-review-machinery-recalibration](./quick/260713-in8-propagate-review-machinery-recalibration/) |
| 260713-izl | Redirect rebrand dry-run test report output to OS tmpdirs and delete stale tracked reports/rebrand-dryrun.* so npm test leaves the tree clean | 2026-07-13 | f1e3755 |  | [260713-izl-stop-rebrand-dry-run-tests-from-writing-](./quick/260713-izl-stop-rebrand-dry-run-tests-from-writing-/) |
| 260714-nzr | Extend review-machinery recalibration (260713-ffa) to remaining 7 review/audit agents; synced to ~/.claude and ~/.codex (.md + .toml); Gemini skipped (no oto install); Phase 14 ROADMAP checkbox fixed | 2026-07-14 | 4e69350 |  | [260714-nzr-extend-review-machinery-recalibration-to](./quick/260714-nzr-extend-review-machinery-recalibration-to/) |
| 260716-qbp | Harden oto verifier operation (heartbeat, non-interactive commands, human_needed fallback; verification_scope + liveness policy in execute-phase) and add runtime-sync drift guard (scripts/check-runtime-sync.cjs + test + CLAUDE.md rule); synced to ~/.claude and ~/.codex (.md + .toml); gemini: no install, skipped | 2026-07-16 | 7060458 |  | [260716-qbp-harden-oto-verifier-operation-and-add-ru](./quick/260716-qbp-harden-oto-verifier-operation-and-add-ru/) |
