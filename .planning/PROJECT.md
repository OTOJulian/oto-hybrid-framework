# oto

## What This Is

`oto` is a personal, production-grade hybrid AI-CLI framework that combines the best of [Get Shit Done (GSD)](https://github.com/gsd-build/get-shit-done) and [Superpowers](https://github.com/obra/superpowers) under a unified `/oto-*` command surface.

It is built for a single developer who likes GSD's spec-driven workflow but does not want to switch frameworks to access the capabilities Superpowers offers.

## Core Value

**Stop framework-switching.** One installable framework where GSD's planning/execution workflow and Superpowers' capabilities coexist behind a single, consistent `/oto-*` command surface across Claude Code, Codex, and Gemini CLI.

## Current State

**v0.1.0 shipped on 2026-05-04.**

The release is tagged and archived. The active milestone is complete, and the next project action is to run `$gsd-new-milestone` to define fresh requirements.

Shipped in v0.1.0:
- Public GitHub archive install path for the `oto` package.
- Architecture decisions, agent audit, file inventory, rename map, and license attribution.
- Typed rebrand engine with dry-run/apply/round-trip modes and coverage manifest checks.
- Installer adapters for Claude Code, Codex, and Gemini.
- Ported `/oto-*` workflow spine, retained agents, hook fleet, seven skills, workstreams, and workspaces.
- Generated runtime instruction files, runtime matrix, Codex/Gemini transforms, and per-runtime smoke coverage.
- Upstream sync pipeline, CI workflows, docs, command index, release tag, GitHub Release, and clean install UAT.

Archive:
- `.planning/milestones/v0.1.0-ROADMAP.md`
- `.planning/milestones/v0.1.0-REQUIREMENTS.md`
- `.planning/milestones/v0.1.0-MILESTONE-AUDIT.md`

## Requirements

### Validated

- v0.1.0 Release - 100/100 v1 requirements complete and audited.
- Claude Code happy path - approved through MR-01 end-to-end dogfood.
- Codex and Gemini runtime parity - instruction generation, transforms, matrix, and smoke tests shipped.
- Clean install release gate - `v0.1.0` tag, GitHub Release, archive install smoke, and human clean-install UAT passed.

### Active

- None. Fresh requirements should be created by `$gsd-new-milestone`.

### Next Milestone Goals

To be defined through `$gsd-new-milestone`. Likely candidates from deferred v2 scope:
- Runtime parity hardening beyond install-shape smoke.
- Upstream sync UX improvements.
- Optional SDK/programmatic API work.
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

## Evolution

After each milestone:
1. Move shipped requirements to Validated.
2. Clear Active requirements before defining the next milestone.
3. Re-check the personal-use cost ceiling.
4. Update this document with decisions that should constrain future work.

---
*Last updated: 2026-05-04 after v0.1.0 milestone closeout*
