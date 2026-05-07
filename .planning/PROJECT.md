# oto

## What This Is

`oto` is a personal, production-grade hybrid AI-CLI framework that combines the best of [Get Shit Done (GSD)](https://github.com/gsd-build/get-shit-done) and [Superpowers](https://github.com/obra/superpowers) under a unified `/oto-*` command surface.

It is built for a single developer who likes GSD's spec-driven workflow but does not want to switch frameworks to access the capabilities Superpowers offers.

## Core Value

**Stop framework-switching.** One installable framework where GSD's planning/execution workflow and Superpowers' capabilities coexist behind a single, consistent `/oto-*` command surface across Claude Code, Codex, and Gemini CLI.

## Current State

**v0.2.0 shipped on 2026-05-07.** v0.1.0 shipped on 2026-05-04; v0.1.1 was an interim Codex parity tag (2026-05-05) now superseded by v0.2.0.

v0.2.0 added two post-release commands and brought both to per-runtime parity:
- `/oto-migrate` — converts GSD-era project artifacts to the oto command surface (dry-run by default, idempotent, half-migrated conflict detection, opt-in directory rename, timestamped backups).
- `/oto-log` — fire-and-forget and session-bookmarked ad-hoc work capture, evidence-grounded six-section bodies with prompt-injection guardrails, immutable `.oto/logs/` entries, surfaces in `/oto-progress` Recent Activity and `/oto-resume-work`.

The next project action is `$gsd-new-milestone` to define fresh requirements for the next cycle.

<details>
<summary>Previously shipped: v0.1.0 (foundation release)</summary>

Shipped in v0.1.0:
- Public GitHub archive install path for the `oto` package.
- Architecture decisions, agent audit, file inventory, rename map, and license attribution.
- Typed rebrand engine with dry-run/apply/round-trip modes and coverage manifest checks.
- Installer adapters for Claude Code, Codex, and Gemini.
- Ported `/oto-*` workflow spine, retained agents, hook fleet, seven skills, workstreams, and workspaces.
- Generated runtime instruction files, runtime matrix, Codex/Gemini transforms, and per-runtime smoke coverage.
- Upstream sync pipeline, CI workflows, docs, command index, release tag, GitHub Release, and clean install UAT.

</details>

Archive:
- v0.2.0: `.planning/milestones/v0.2.0-ROADMAP.md`, `v0.2.0-REQUIREMENTS.md`, `v0.2.0-MILESTONE-AUDIT.md`
- v0.1.0: `.planning/milestones/v0.1.0-ROADMAP.md`, `v0.1.0-REQUIREMENTS.md`, `v0.1.0-MILESTONE-AUDIT.md`

## Requirements

### Validated

- v0.1.0 Release - 100/100 v1 requirements complete and audited.
- v0.2.0 Release - 32/32 requirements (REQ-MIG-01..10 + D-01..D-22) complete and audited.
- Claude Code happy path - approved through MR-01 end-to-end dogfood.
- Codex and Gemini runtime parity - instruction generation, transforms, matrix, smoke tests, and `/oto-migrate` + `/oto-log` per-runtime delivery shipped.
- Clean install release gate - `v0.1.0` tag, GitHub Release, archive install smoke, and human clean-install UAT passed.
- `/oto-migrate` - dry-run/apply migration engine, CLI dispatch, command markdown, public CLI alias, fixture-backed coverage, and generated runtime matrix entry shipped; threats secured.
- `/oto-log` - fire-and-forget and session-based ad-hoc logs, evidence-bounded bodies, list/show/promote, progress/resume surfaces, CLI dispatch, and fixture-backed coverage shipped; threats secured.

### Active

- None. Awaiting `$gsd-new-milestone` to define the next cycle.

### Next Milestone Goals

To be defined through `$gsd-new-milestone`. Likely candidates from deferred scope:
- Runtime parity hardening beyond install-shape smoke.
- Upstream sync UX improvements.
- Optional SDK/programmatic API work.
- Goose framework evaluation for next-cycle research (reference parked at `~/Desktop/goose-main/`).
- Niche command restoration only when it clears the personal-use cost ceiling.

### Out of Scope

- OpenCode runtime support - user does not use it; carrying it inflates scope and test surface.
- npm registry publishing - GitHub archive install is enough for personal cross-machine use.
- Multi-user/team/shared-config features - personal-use scope.
- Carrying over local `~/.claude/` customizations - clean-slate build.
- Backwards compatibility with raw GSD or Superpowers commands - this is a fork, not a wrapper.
- Windows support - Mac is primary for this project.
- Marketplace/community/Discord features - not aligned with the personal-use ceiling.

## Context

**Source frameworks:**
- `foundation-frameworks/get-shit-done-main/` - GSD v1.38.5 source.
- `foundation-frameworks/superpowers-main/` - Superpowers v5.0.7 source.

**User profile:**
- Solo developer.
- "Production-grade" means reliable enough for daily personal use: tests, docs, CI, release tags, and runtime-specific behavior where it matters.
- The project succeeds if it improves the user's daily flow, not if it maximizes community surface area.

## Constraints

- **Tech stack:** Node.js, CommonJS tooling, no top-level TypeScript.
- **Runtime targets:** Claude Code, Codex, Gemini CLI.
- **Distribution:** GitHub archive installs and semver git tags. No npm registry publish.
- **Licensing:** Preserve MIT attribution for both upstream frameworks.
- **Cost ceiling:** Avoid ongoing maintenance burden unless it directly improves daily personal use.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Command prefix `/oto-*` | Unified recognizable surface; partial rebrand leaks upstream UX | Resolved in Phase 1 |
| State directory `.oto/` for shipped runtime payloads | Avoid inheriting GSD's `.planning/` user-facing identity | Resolved in Phase 1 |
| GitHub archive install path | npm `github:` shorthand was unreliable for lifecycle-bearing global installs; archive tarball smoke passed | Resolved in Phase 2 |
| GSD spine plus Superpowers skills | GSD provides the workflow machine; curated Superpowers skills add capability without framework switching | Resolved in Phase 1/6 |
| Drop unsupported runtimes outside Claude/Codex/Gemini | Personal-use ceiling and test-surface control | Resolved in Phase 3 |
| MR-01 before broad parity | Claude Code had to be daily-use stable before spending effort on other runtimes | Resolved in Phase 4 |
| Workflow wins over ambient skill auto-fire | Active workflow state should prevent unrelated suspicion-based skill loading | Resolved in Phase 6 |
| Codex and Gemini are daily-peer runtime targets | Parity gaps should be closed with transforms/tests, not documented as best-effort | Resolved in Phase 8 |
| Upstream sync is rename plus conflict surfacing for v0.1.0 | Three-way UX can wait; conflict visibility is the valuable first step | Resolved in Phase 9 |
| `/oto-migrate` is opt-in for `.planning/` → `.oto/` directory rename | Default-rename has too-large blast radius for users with CI/hooks grepping `.planning/`; matches oto-this-repo's actual behavior | Resolved in v0.2.0 Phase 01 |
| `/oto-log` entries are immutable; no `edit` subcommand | Logs are point-in-time observations; mutation invites narrative revision after the fact | Resolved in v0.2.0 Phase 02 |
| `/oto-log` body is evidence-only (transcript + git diff + git log, capped + DATA-marker wrapped) | Avoids hallucinated motives; bounds prompt-injection surface | Resolved in v0.2.0 Phase 02 |

## Evolution

After each milestone:
1. Move shipped requirements to Validated.
2. Clear Active requirements before defining the next milestone.
3. Re-check the personal-use cost ceiling.
4. Update this document with decisions that should constrain future work.

---
*Last updated: 2026-05-07 after v0.2.0 milestone close*
