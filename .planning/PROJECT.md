# oto

## What This Is

`oto` is a personal, production-grade hybrid AI-CLI framework that combines the best of [Get Shit Done (GSD)](https://github.com/gsd-build/get-shit-done) and [Superpowers](https://github.com/obra/superpowers) under a unified `/oto-*` command surface. Built for a single developer who likes GSD's spec-driven workflow but doesn't want to switch frameworks to access the capabilities Superpowers offers.

## Core Value

**Stop framework-switching.** One installable framework where GSD's planning/execution workflow and Superpowers' capabilities coexist behind a single, consistent `/oto-*` command surface — across Claude Code, Codex, and Gemini CLI.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

(None yet — ship to validate)

### Active

<!-- Current scope. Building toward these. The hybrid architecture is research-driven; these requirements scope the framework, not the merge strategy. -->

- [ ] Inventory and analyze GSD's command/agent/workflow surface (what to keep, drop, merge)
- [ ] Inventory and analyze Superpowers' skill/command surface (what to keep, drop, merge)
- [ ] Decide hybrid architecture (which framework's spine, how the other layers in) via research
- [ ] Full rebrand: `/gsd-*` → `/oto-*`, internal directories (`.planning/` → `.oto/` or chosen name), agent IDs, state files, env vars, and all internal references
- [ ] Multi-runtime support: Claude Code, Codex (`AGENTS.md`), Gemini CLI
- [ ] Public GitHub repo, installable via `npm install -g github:<owner>/oto-hybrid-framework` (no npm registry publish)
- [ ] Automated rebrand/sync tool: pull upstream GSD and Superpowers changes, apply rename map, surface conflicts for manual resolution
- [ ] Tests covering core command/skill behavior, install, and the rebrand pipeline
- [ ] Project documentation (README, install guide, command reference, contribution/upstream-sync guide)

### Out of Scope

<!-- Explicit boundaries. Includes reasoning to prevent re-adding. -->

- OpenCode runtime support — user does not use it; carrying it would inflate scope and rebrand surface
- npm registry publishing — overhead unjustified for personal use; GitHub install covers cross-machine portability
- Multi-user/team features (sharing config, central registries, etc.) — personal-use scope; revisit if anyone else adopts it
- Carrying over local `~/.claude/` customizations — clean-slate build; no migration step needed
- Backwards compatibility with users running raw GSD or Superpowers — this is a fork, not a wrapper; users install oto fresh

## Context

**Source frameworks (reference only, not extended):**
- `foundation-frameworks/get-shit-done-main/` — GSD v1.38.5 source. npm-distributed (`get-shit-done-cc`), bin installer, multi-runtime (Claude/Codex/Gemini/OpenCode), command/agent/workflow architecture with `.planning/` state directory.
- `foundation-frameworks/superpowers-main/` — Superpowers v5.0.7 source. OpenCode-plugin shaped but ships skills/agents/commands for Claude/Codex/Gemini too. 14 skills + 3 commands.

**User profile:**
- Solo developer; "production-grade" means the framework should be reliable enough for daily personal use, with tests, docs, CI, and multi-runtime parity — not a weekend hack.
- Currently switches between GSD and Superpowers; oto exists to eliminate that switch.
- Has not committed yet to which Superpowers features matter most — research phase will surface this.

**Hybrid strategy is research-driven:**
- Both the *scope of merge* (which features survive the cut) and the *architecture of merge* (whether GSD's spine hosts Superpowers, or vice versa, or a new shape emerges) are deferred to the research phase. This is intentional — pre-committing to an architecture before inventorying the two frameworks would lock in a worse design.

**Upstream tracking:**
- GSD and Superpowers will continue evolving. oto needs an automated rebrand pipeline so upstream improvements aren't stranded by the rename. Manual diff-and-port was rejected as too high-toil for a multi-month build.

## Constraints

- **Tech stack**: Node.js — both upstreams are Node-based (npm packages with `.cjs`/`.js` binaries and JSON tooling). Diverging would require rewriting both ecosystems.
- **Runtime targets**: Claude Code (primary), Codex, Gemini CLI. Each has its own instruction file (`CLAUDE.md` / `AGENTS.md` / `GEMINI.md`) and command/skill conventions to honor.
- **Distribution**: Installable via `npm install -g github:<owner>/oto-hybrid-framework`. No npm registry publish. Versioning via git tags.
- **Licensing**: Both upstreams are MIT-licensed. oto must preserve attribution and license notices for ported code.
- **Personal-use cost ceiling**: Decisions that add significant ongoing maintenance burden (e.g., OpenCode support, plugin marketplaces) need to clear a high bar — the project succeeds if it makes the user's daily flow better, not if it serves a community.

## Key Decisions

<!-- Decisions that constrain future work. Add throughout project lifecycle. -->

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Command prefix `/oto-*` (full rebrand depth) | User wants a unified, recognizable surface; partial rebrand leaks upstream identities into daily UX | — Pending |
| Distribute via public GitHub, install via `npm install -g github:...` | Personal use doesn't justify npm registry overhead; GitHub gives cross-machine portability and free public hosting | — Pending |
| Track upstream via automated rebrand tool, not manual diff | Full rebrand makes manual porting too costly across a multi-month build; tooling pays back the upfront effort | — Pending |
| Defer hybrid architecture to research phase | Pre-committing without an inventory would lock in a worse design; both frameworks deserve apples-to-apples comparison | — Pending |
| Drop OpenCode support | User doesn't use it; supporting it doubles rebrand and test surface for no personal benefit | — Pending |
| Clean-slate build, no carry-over of personal `~/.claude/` tweaks | User confirmed nothing currently customized that needs preserving | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-27 after initialization*
