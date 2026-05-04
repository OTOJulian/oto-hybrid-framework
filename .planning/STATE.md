---
gsd_state_version: 1.0
milestone: v0.1.0
milestone_name: Release
current_phase: 9
current_phase_name: upstream-sync-pipeline
current_plan: Not started
status: executing
stopped_at: Phase 9 context gathered
last_updated: "2026-05-04T17:35:18.788Z"
last_activity: 2026-05-04
progress:
  total_phases: 10
  completed_phases: 8
  total_plans: 47
  completed_plans: 41
  percent: 87
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-02)

**Core value:** Stop framework-switching — one installable framework where GSD's planning/execution workflow and Superpowers' capabilities coexist behind a single, consistent `/oto-*` command surface across Claude Code, Codex, and Gemini CLI.
**Current focus:** Phase 09 — upstream-sync-pipeline

## Current Position

Phase: 09 (upstream-sync-pipeline) — READY TO PLAN
Plan: Not started
**Current Phase:** 9
**Current Phase Name:** upstream-sync-pipeline
**Current Plan:** Not started
**Total Plans in Phase:** 6
**Status:** Ready to execute
**Progress:** 80%
**Last Activity:** 2026-05-04

Progress: [████████░░] 80%

## Performance Metrics

**Velocity:**

- Total plans completed: 41
- Average duration: —
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01 | 3 | - | - |
| 02 | 3 | - | - |
| 03 | 7 | - | - |
| 04 | 8 | - | - |
| 05 | 6 | - | - |
| 06 | 3 | - | - |
| 07 | 5 | 14 min | 5 min |
| 08 | 6 | - | - |

**Recent Trend:**

- Last 5 plans: —
- Trend: —

*Updated after each plan completion*
| Phase 03 P01 | 6 min | 3 tasks | 17 files |
| Phase 03 P02 | 5 min | 2 tasks | 4 files |
| Phase 03 P03 | 6 min | 2 tasks | 4 files |
| Phase 03 P04 | 4 min | 2 tasks | 2 files |
| Phase 03 P05 | 8 min | 3 tasks | 6 files |
| Phase 03 P06 | 8 min | 3 tasks | 5 files |
| Phase 03 P07 | 10 min | 4 tasks | 7 files |
| Phase 04 P01 | 4 min | 2 tasks | 11 files |
| Phase 04 P02 | 6 min | 2 tasks | 339 files |
| Phase 04 P03 | 7 min | 2 tasks | 3 files |
| Phase 04 P04 | 4 min | 2 tasks | 3 files |
| Phase 04 P05 | 6 min | 3 tasks | 7 files |
| Phase 04 P06 | 2 min | 1 tasks | 2 files |
| Phase 04 P07 | 10 min | 3 tasks | 152 files |
| Phase 04 P08 | operator-driven | 2 tasks | 3 files |
| Phase 05 P01 | 4 min | 2 tasks | 7 files |
| Phase 05 P02 | 11 min | 2 tasks | 6 files |
| Phase 05 P03 | 5 min | 2 tasks | 3 files |
| Phase 05 P04 | 9 min | 4 tasks | 5 files |
| Phase 05 P05 | 6 min | 2 tasks | 4 files |
| Phase 05 P06 | 4 min | 2 tasks | 3 files |
| Phase 06 P01 | 12 min | 3 tasks | 4 files |
| Phase 06 P02 | 18 min | 2 tasks | 29 created, 1 modified |
| Phase 06 P03 | 15 min | 2 tasks + 1 regression fix | 6 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Command prefix `/oto-*` and internal `oto:<skill-name>` namespace — RESOLVED by Phase 01 ADRs
- Distribute via public GitHub archive install URL — RESOLVED by Phase 02 Plan 01; owner resolved to `OTOJulian`, smoke path is `https://github.com/OTOJulian/oto-hybrid-framework/archive/<ref>.tar.gz`
- Rebrand primitives are isolated CommonJS rule modules with `.cjs` canonical files and `.js` extensionless require shims — RESOLVED by Phase 02 Plan 02
- Rebrand engine dry-run/apply/round-trip modes are working against `foundation-frameworks/` with zero unclassified matches and zero post-coverage residue — RESOLVED by Phase 02 Plan 03
- Track upstream via automated rebrand tool, not manual diff — RESOLVED by Phase 01 inventory and rename-map contracts
- Defer hybrid architecture to research phase — RESOLVED by research/ARCHITECTURE.md (Option A: GSD spine + Superpowers skills as a first-class peer)
- Drop OpenCode support — RESOLVED by v1 scope and Phase 01 inventory decisions
- Clean-slate build, no carry-over of personal `~/.claude/` tweaks — RESOLVED by v1 scope
- 03-02 keeps config-dir resolution descriptor-based: flag, then adapter env var, then adapter default segment.
- 03-02 runtime detection is presence-only and limited to claude, codex, and gemini config dirs.
- 03-03 marker helper ports the upstream trim/splice algorithm with OTO marker constants.
- 03-03 install-state helper keeps validation hand-rolled and dependency-free.
- 03-05 keeps runtime adapters pure: package version is passed through ctx.otoVersion rather than requiring package.json inside adapter modules.
- 03-05 Codex and Gemini transforms remain Phase 3 identity stubs with exact Phase 5/8 TODO markers for future parity work.
- 03-06 installAll uses opts.homeDir both for runtime detection and per-adapter configDir resolution.
- 03-06 installRuntime records only current source-manifest files so stale target files do not survive state diff cleanup.
- 03-07: oto with no args prints install-scoped help instead of defaulting to a real install.
- 03-07: install-smoke prefixes PATH with the temporary npm install bin directory before invoking oto.
- 04-01: Use intentional t.todo() scaffolds so downstream Phase 4 plans fill existing verification files instead of inventing new names.
- 04-01: Keep retained-agent data in tests/fixtures/phase-04/retained-agents.json so multiple Phase 4 checks share one source.
- 04-02: Use inventory target_path values as the source of truth for generated output layout.
- 04-02: Keep the REQUIREMENTS out-of-scope override for ultraplan-phase by deleting the emitted workflow file after generation.
- 04-03: Route debug sessions directly through oto-debugger because ADR-07 absorbs debug-session-manager responsibilities.
- 04-03: Keep optional codebase pattern mapping deferred instead of silently substituting oto-codebase-mapper.
- 04-04: Keep /oto-ai-integration-phase shippable by running only oto-domain-researcher live and surfacing unsupported steps as DEFERRED manual-fill sections.
- 04-04: Avoid path-like .planning/ references in shipped DEFERRED comments while still citing ADR-07, preserving Phase 4 leak rules.
- 04-05: Keep /oto-eval-review and /oto-ingest-docs discoverable, but mark their bodies DEFERRED because their executable paths depended on dropped agents.
- 04-05: Delete oto/workflows/profile-user.md after confirming no command, workflow, or agent includes it.
- 04-05: Remove stale dropped-agent substrings from shipped reference/template files when they block the plan-level no-dropped grep.
- 04-06: Keep Codex sandbox data on runtime-codex.cjs as a descriptor field; do not modify bin/install.js or TOML writing behavior.
- 04-06: Enumerate all 23 retained agents so Codex sandbox fallback behavior is never used for retained agents.
- 04-07: Include oto/ in package.json files so the packed distribution actually carries the Phase 4 runtime payload.
- 04-07: Use temp npm cache and temp pack destination in MR-01 smoke tests to avoid user npm cache and repo-root tarball side effects.
- 04-07: Enforce shipped payload roots with no dropped-agent substrings and no path-like .planning references.
- 05-01: Use intentional t.todo() scaffolds so downstream Phase 5 plans must fill existing verification files instead of creating new names.
- 05-01: Keep settings.json round-trip fixtures under tests/fixtures/phase-05/ for Wave 3 mergeSettings tests.
- 05-02 keeps hook token substitution install-time only; build output remains template-pristine.
- 05-02 ignores generated oto/hooks/dist output, matching the legacy hooks/dist pattern.
- 05-02 exports scripts/build-hooks.js::build for isolated regression tests while preserving CLI behavior.
- 05-03 keeps the SessionStart identity block hand-authored so model-facing text cannot leak upstream framework identity.
- 05-03 uses hooks.session_state consistently for SessionStart state reminders and validate-commit opt-in behavior.
- 05-03 keeps the Phase 6 using-oto skill fallback in the hook so Phase 5 remains shippable before skills are backfilled.
- 05-04: Use _oto.hooks command_contains markers to own and unmerge Claude settings entries without touching user-authored hooks.
- 05-04: Recompute install state hashes after hook token substitution so .install.json reflects final installed bytes.
- 05-04: Validate-commit registers as PreToolUse/Bash and context-monitor registers as PostToolUse with the broad Bash plus Edit/Write/MultiEdit/Agent/Task matcher.
- 05-05: Capture the SessionStart fixture from the source hook so the literal {{OTO_VERSION}} token remains part of the locked baseline.
- 05-05: Keep the fixture test isolated from the install pipeline by respawning oto/hooks/oto-session-start directly in a temp cwd.
- 05-06: Keep validate-commit message parsing before active .oto/STATE.md phase/plan enforcement.
- 06-02: Use the upstream repo root as the rebrand target so inventory `target_path` entries drive `skills/using-superpowers` to `skills/using-oto`.
- 06-02: Keep hand edits isolated to `oto/skills/using-oto/SKILL.md`; the other six retained skills ship as rebrand-engine output.
- 06-03: Keep SKL-08 wiring as inline prose `Skill('oto:<name>')` directives, not frontmatter or hooks.
- 06-03: Strip nested `using-oto` identity tags during SessionStart injection so the runtime context preserves one outer identity block.

### Pending Todos

[From .planning/todos/pending/ — ideas captured during sessions]

None yet.

### Blockers/Concerns

[Issues that affect future work]

- **Personal-use rigor inflation (cross-cutting, Pitfall 11):** "production-grade" + "personal use" pull opposite. Re-read PROJECT.md cost ceiling at every milestone close; ship Claude-Code-only oto early.
- **MR-01 is a phase-ordering constraint, not a single deliverable:** Claude Code must be daily-use stable at end of Phase 4 before Phase 8 (Codex/Gemini parity) starts.

## Session Continuity

Last session: 2026-05-04T16:50:35.629Z
Stopped at: Phase 9 context gathered
Resume file: .planning/phases/09-upstream-sync-pipeline/09-CONTEXT.md
