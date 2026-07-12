---
gsd_state_version: 1.0
milestone: v0.5.0
milestone_name: Exa Search Integration
status: executing
stopped_at: Completed 14-04-PLAN.md
last_updated: "2026-07-12T01:35:19.905Z"
last_activity: 2026-07-12 -- Phase 14 planning complete
progress:
  total_phases: 3
  completed_phases: 0
  total_plans: 12
  completed_plans: 9
  percent: 75
---

# Project State

## Project Reference

See: .oto/PROJECT.md (updated 2026-07-10)

**Core value:** Stop framework-switching - one installable framework where GSD's planning/execution workflow and Superpowers' capabilities coexist behind a single, consistent `/oto-*` command surface across Claude Code, Codex, and Gemini CLI.

**Current focus:** Phase 14 — key-storage-reconciliation

## Current Position

Phase: 14 (key-storage-reconciliation) — EXECUTING
Plan: 1 of 9
Status: Ready to execute
Last activity: 2026-07-12 -- Phase 14 planning complete

Progress: [██████████] 100%

## Next Command

```bash
/oto-plan-phase 14
```

Phase 14 is flagged standard-pattern by research (skip research-phase); Phase 15 carries research flags (`CLAUDE_CONFIG_DIR` → `~/.claude.json` resolution, transport ADR).

## Performance Metrics

**Velocity (v0.4.0 reference):**

- v0.4.0: 12 plans across 3 phases; recent plan durations 8/6/7/4/3/18/36 min

**v0.5.0:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

*Updated after each plan completion*
| Phase 14 P01 | 8 min | 2 tasks | 5 files |
| Phase 14 P02 | 8 min | 2 tasks | 7 files |
| Phase 14 P03 | 14 min | 2 tasks | 34 files |
| Phase 14 P04 | 39min | 3 tasks | 2 files |

## Accumulated Context

### Roadmap Evolution

- 2026-07-10: v0.5.0 roadmap created. Three phases (14-16) per research's strict dependency chain — key storage reconciliation (SECR-01..04) → MCP registration across all three runtimes (MCP-01..09 + HARD-02) → agent guidance + hardening (GUID-01..05 + HARD-01/03/04/05). 23/23 requirements mapped, no orphans, no duplicates. HARD-02 mapped to Phase 15 (its adapter round-trip family tests Phase 15 code and is the TOML-corruption hard gate; Phase 14's validation/no-plaintext test families land there and complete under HARD-02). Phases number from 14 (above the highest existing folder, 13); existing phase directories are never renamed/moved/deleted.
- 2026-05-26: v0.4.0 shipped (phases 11-13; SDK port, query registry, dogfood `.oto/` migration). Archives: `.oto/milestones/v0.4.0-*`.

### Decisions

Decisions are logged in PROJECT.md Key Decisions table. Recent/forward-relevant:

- v0.5.0 phases number from 14 (above highest existing phase folder, 13); never collide with accumulated v0.1.0-v0.4.0 directories.
- Transport/auth ADR (launcher-stdio vs remote HTTP) must be recorded at the top of Phase 15 before registration code lands; research recommends launcher-stdio.
- Key-storage fix covers all three integrations (`exa_search`, `brave_search`, `firecrawl`) with the shared mechanism, not just Exa.
- Sync hygiene is a cross-cutting v0.5.0 constraint: new logic in oto-only files where possible; shared-file diffs small and commented; `oto sync --dry-run` verified at milestone close (HARD-05).
- All installer changes go in the live `bin/lib/` installer; `oto/bin/install.js` is a vestigial GSD reference.
- [Phase 14]: CJS integration flags accept booleans only; API keys live in environment variables or 0600 ~/.oto keyfiles. — Prevents tracked config from persisting secret material.
- [Phase 14]: Legacy config conflicts preserve the existing keyfile and drop the config string with masked notices. — A deliberately created keyfile is the safer source of truth.
- [Phase 14]: SDK integration validation runs before the config lock or write — Non-boolean values never reach tracked config.
- [Phase 14]: Both SDK read paths invoke best-effort legacy migration — Legacy strings self-heal without blocking normal reads.
- [Phase 14]: Secret values enter through stdin or a muted TTY prompt only; argv and handler output remain plaintext-free. — Prevents keys from leaking through shell history, process listings, logs, or agent transcripts.
- [Phase 14]: Native query handlers may provide optional raw display text while preserving structured data for programmatic consumers. — Lets human-facing status commands render exact masked lines without breaking registry callers.
- [Phase 14]: Settings Set/Replace delegates key entry to the user's hidden terminal prompt; the workflow never receives secret material. — Keeps keys out of chat, argv, shell history, and tracked config.
- [Phase 14]: The no-plaintext regression guard scans exactly git-tracked .oto files. — Protects the remote exfiltration surface without fixture false positives.

### Pending Todos

None yet.

### Blockers/Concerns

- Active secret-hygiene defect (research-confirmed): `/oto-settings-integrations` writes raw API-key strings into git-tracked `.oto/config.json`, and the live SDK write path has no masking. Phase 14 fixes this first; avoid touching integration keys via settings until then.

## Deferred Items

Items acknowledged and deferred at v0.4.0 milestone close on 2026-05-26. All are pre-v0.4.0 historical noise carried in the open-artifact audit, plus one follow-up surfaced by Phase 12 verification:

| Category | Item | Status | Note |
|----------|------|--------|------|
| debug | knowledge-base | unknown | Stale debug session from 2026-05-05 (pre-v0.4.0); has a `resolved/` subdir. Close or archive via `/oto-debug` cleanup. |
| quick_task | 260505-bxx-port-gsds-codex-command-to-skill-adapter | committed | Already shipped (commit f56522c); audit flags it only because the quick-task dir lacks a STATE file. |
| quick_task | 260505-cxx-exclude-runtime-worktrees-from-migrate | committed | Already shipped (commit 69f8969). |
| quick_task | 260506-axx-expose-migrate-through-public-cli | committed | Already shipped (commit df7aba5). |
| quick_task | 260506-bxx-skip-gitignored-migrate-artifacts | committed | Already shipped (commit 4230d59). |
| context_question | Phase 02 (02-CONTEXT.md) | stale | v0.3.0-era discuss question left flagged; phase shipped and verified. |
| context_question | Phase 11 (11-CONTEXT.md) | stale | Discuss questions answered during planning; phase shipped and verified. |
| follow-up | init.cjs `.planning/` leak + milestone.complete marker | open | `oto/bin/lib/init.cjs:554` returns `task_dir: .planning/quick/…` (SDK handler correct); `oto-sdk query milestone.complete` rewrote the STATE.md frontmatter marker to `gsd_state_version` (restored manually). Both are ported CJS/SDK tooling still emitting GSD-era identifiers — fix via `/oto-quick`. |
| follow-up | config-mutation.ts:349 global defaults path reads `~/.gsd/defaults.json` while CJS `config.cjs:66` reads `~/.oto/defaults.json` | open | GSD-era path divergence found during Phase 14; out of D-08 scope (keyfiles only) — fix via `/oto-quick` alongside the other GSD-era identifier cleanups |

## Session Continuity

Last session: 2026-07-10T23:22:14.544Z
Stopped at: Completed 14-04-PLAN.md
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
