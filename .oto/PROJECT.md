# oto

## What This Is

`oto` is a personal, production-grade hybrid AI-CLI framework that combines the best of [Get Shit Done (GSD)](https://github.com/gsd-build/get-shit-done) and [Superpowers](https://github.com/obra/superpowers) under a unified `/oto-*` command surface.

It is built for a single developer who likes GSD's spec-driven workflow but does not want to switch frameworks to access the capabilities Superpowers offers.

## Core Value

**Stop framework-switching.** One installable framework where GSD's planning/execution workflow and Superpowers' capabilities coexist behind a single, consistent `/oto-*` command surface across Claude Code, Codex, and Gemini CLI.

## Current State

**v0.5.0 (Exa Search Integration) shipped on 2026-07-18.** Phases 14–16 (40 plans, 23/23 requirements) delivered the full Exa last-mile:
- **Key storage** — integration API keys (Exa/Brave/Firecrawl) live only in 0600 `~/.oto` keyfiles or env vars; tracked `.oto/config.json` is boolean-only in both CJS and SDK write paths, with self-healing legacy migration, transactional secret set/clear, and a no-plaintext-in-tracked-files guard.
- **MCP registration** — consent-gated (default No), idempotent, fingerprint-owned `exa` registration in all three runtimes via oto's adapters (additive `~/.claude.json` merge, OTO-marker Codex TOML block, stdio-shape Gemini entry), with drift-safe uninstall and a shipped launcher pinning `exa-mcp-server@3.2.1` to exactly three tools (ADR-16).
- **Agent guidance + hardening** — one runtime-neutral search-tools reference (Exa → Brave → WebSearch, never-retry-on-429) consumed by five agents, deprecated-name guards checked against transformed Codex/Gemini output, keyless-fallback regression floor, live tools-restricted-subagent e2e, runtime-matrix rows, setup docs, and per-upstream sync-conflict namespacing.

Closed without a separate milestone audit (developer-accepted, consistent with v0.3.0/v0.4.0). WR-02 planning-root fixture debt remains developer-approved DEFER and separately tracked.

**v0.4.0 (SDK + Dogfood) shipped on 2026-05-26.** v0.3.0 shipped 2026-05-18; v0.2.0 on 2026-05-07; v0.1.0 on 2026-05-04; v0.1.1 was an interim Codex parity tag (2026-05-05) superseded by v0.2.0.

v0.4.0 made oto's own command surface work natively and ended the GSD/oto split-brain:
- **`oto-sdk` query CLI** — ported GSD's `sdk/` subpackage under an `oto-sdk` surface (prebuilt `dist/`, parent-package bin wiring, installer PATH-resolution), rebuilt the query registry to answer every workflow key against `.oto/` paths, and added a tiered fallback (read-only queries degrade to defaults; structural/stateful operations fail fast with one clear error). Resolves `command not found: oto-sdk` across the workflows that previously fell back to manual file ops.
- **Dogfood** — migrated this repo's planning root from `.planning/` to `.oto/` via a pure `git mv` (history preserved); a clean cutover with no dual-location shim. oto now manages itself on `.oto/` with no path override, guarded by a `node:test`.

<details>
<summary>Previously shipped: v0.3.0 (restore doc-intake and eval-review agents)</summary>

v0.3.0 partially reversed ADR-07 to retire the two remaining `[deferred]` entries in `/oto-help`:
- `/oto-ingest-docs` — executable workflow for converting mixed ADR/PRD/SPEC/RFC piles into a synthesized `.oto/` state, with `--mode new`/`--mode merge`, the 50-doc cap, and `INGEST-CONFLICTS.md` bucketing.
- `/oto-eval-review` — executable workflow for retroactive eval coverage audits of completed AI phases, producing `EVAL-REVIEW.md` with per-dimension COVERED / PARTIAL / MISSING scoring.
- Restored three agents (`oto-doc-classifier`, `oto-doc-synthesizer`, `oto-eval-auditor`) — retained agent count is now 26; the remaining ADR-07 cut list stays deferred under AGNT-DEFER-01.
- Codex sandbox map locked per agent (classifier + auditor read-only, synthesizer workspace-write); ADR-15 records the partial reversal and reaffirms AGNT-DEFER-01.

</details>

<details>
<summary>Previously shipped: v0.2.0 (post-release commands)</summary>

Shipped in v0.2.0:
- `/oto-migrate` — converts GSD-era project artifacts to the oto command surface (dry-run by default, idempotent, half-migrated conflict detection, opt-in directory rename, timestamped backups).
- `/oto-log` — fire-and-forget and session-bookmarked ad-hoc work capture, evidence-grounded six-section bodies with prompt-injection guardrails, immutable `.oto/logs/` entries, surfaces in `/oto-progress` Recent Activity and `/oto-resume-work`.

</details>

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
- v0.5.0: `.oto/milestones/v0.5.0-ROADMAP.md`, `v0.5.0-REQUIREMENTS.md`
- v0.4.0: `.oto/milestones/v0.4.0-ROADMAP.md`, `v0.4.0-REQUIREMENTS.md`
- v0.3.0: `.oto/milestones/v0.3.0-ROADMAP.md`, `v0.3.0-REQUIREMENTS.md`
- v0.2.0: `.oto/milestones/v0.2.0-ROADMAP.md`, `v0.2.0-REQUIREMENTS.md`, `v0.2.0-MILESTONE-AUDIT.md`
- v0.1.0: `.oto/milestones/v0.1.0-ROADMAP.md`, `v0.1.0-REQUIREMENTS.md`, `v0.1.0-MILESTONE-AUDIT.md`

## Current Milestone

None — v0.5.0 shipped 2026-07-18. Run `/oto-new-milestone` to define the next one. Any new phases number from **17** (above the highest existing phase folder, 16).

## Requirements

### Validated

- v0.1.0 Release - 100/100 v1 requirements complete and audited.
- v0.2.0 Release - 32/32 requirements (REQ-MIG-01..10 + D-01..D-22) complete and audited.
- v0.3.0 Release - 20/20 requirements (AGNT-01..03, WF-ING-01..04, WF-EVAL-01..02, CMD-01..03, INST-01..03, TEST-01..03, ADR-01, PRTY-01) complete; all three phases verified, security cleared.
- v0.4.0 Release - 8/8 requirements (SDK-01..05, DOG-01..03) complete; all three phases verified and security-cleared (Phase 12 verification + security backfilled at close). `oto-sdk` query CLI ships working on a clean install; this repo now dogfoods `.oto/`.
- v0.5.0 Release - 23/23 requirements (SECR-01..04, MCP-01..09, GUID-01..05, HARD-01..05) complete across Phases 14–16; all phases verified (Phase 16 at 9/9 after the dispositions-authorized WR-03 closure); shipped and archived 2026-07-18. Closed without a separate milestone audit (developer-accepted); WR-02 is an approved deferred planning-root fixture debt item.
- Exa key hygiene - keys only in 0600 `~/.oto` keyfiles or env vars; boolean-only tracked config enforced in both write paths with self-healing migration and a no-plaintext guard — v0.5.0.
- Exa MCP registration - consent-gated, idempotent, fingerprint-owned `exa` registration and drift-safe uninstall across Claude Code, Codex, and Gemini; pinned three-tool launcher (ADR-16) — v0.5.0.
- Shared search guidance - one runtime-neutral reference consumed by five agents; deprecated-name guards verified against transformed runtime output; keyless fallback regression floor holds — v0.5.0.
- `oto-sdk` query CLI - ported GSD `sdk/` subpackage under an `oto-sdk` surface, installer PATH-wiring, `.oto/`-pathed query registry, and tiered fallback (read-only degrades, structural/stateful fails fast); clean-install smoke + cross-binary parity green.
- Dogfood migration - this repo's planning root moved `.planning/` → `.oto/` via pure `git mv` (history preserved), clean cutover, no path override; `node:test` guards self-management.
- Claude Code happy path - approved through MR-01 end-to-end dogfood.
- Codex and Gemini runtime parity - instruction generation, transforms, matrix, smoke tests, and `/oto-migrate` + `/oto-log` + `/oto-ingest-docs` + `/oto-eval-review` per-runtime delivery shipped.
- Clean install release gate - `v0.1.0` tag, GitHub Release, archive install smoke, and human clean-install UAT passed.
- `/oto-migrate` - dry-run/apply migration engine, CLI dispatch, command markdown, public CLI alias, fixture-backed coverage, and generated runtime matrix entry shipped; threats secured.
- `/oto-log` - fire-and-forget and session-based ad-hoc logs, evidence-bounded bodies, list/show/promote, progress/resume surfaces, CLI dispatch, and fixture-backed coverage shipped; threats secured.
- `/oto-ingest-docs` - executable workflow with directory + manifest discovery, `--mode new`/`--mode merge`, 50-doc cap, INGEST-CONFLICTS.md bucketing; agents restored; fixture- and workflow-shape-tested.
- `/oto-eval-review` - executable workflow producing per-dimension EVAL-REVIEW.md scoring; `oto-eval-auditor` restored; workflow-shape and SDK-fallback regression tests in place.
- ADR-15 (D-24) - partial reversal of ADR-07 recorded; AGNT-DEFER-01 explicitly reaffirmed for the remaining seven dropped agents.

### Active

None. v0.5.0 shipped and archived; define the next milestone via `/oto-new-milestone`.

### Next Milestone Goals

Candidates for v0.6.0+ (deferred):
- **AGNT-DEFER-01** — Possible restoration of the remaining ADR-07 cut list (`oto-ai-researcher`, `oto-eval-planner`, `oto-framework-selector`, `oto-pattern-mapper`, `oto-intel-updater`, `oto-user-profiler`, `oto-debug-session-manager`) only as user-facing commands require.
- Runtime parity hardening beyond install-shape smoke.
- Upstream sync UX improvements.
- Goose framework evaluation for next-cycle research (reference parked at `~/Desktop/goose-main/`).
- Exa follow-ons (EXA-F-01..04, archived in v0.5.0-REQUIREMENTS.md): keyless unauthenticated tier, live doctor `tools/list` ping, advanced-search research recipes, broader agent rollout per AGNT-DEFER-01 discipline.
- WR-02 planning-root fixture migration (CJS/SDK `.planning` → `.oto` fixtures) — deferred debt; required before any gate that needs the full SDK suite green without the amended baseline.
- GSD-era identifier cleanups (init.cjs `.planning/` leak, `~/.gsd/defaults.json` path divergence, codebase-drift stale helper path) — via `/oto-quick`.

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
| Surgical partial ADR-07 reversal (3 of 10 dropped agents) | Restoring only the agents the user actively needed (`/oto-ingest-docs`, `/oto-eval-review`) keeps the maintenance surface aligned with the personal-use ceiling; AGNT-DEFER-01 keeps the rest dormant | Resolved in v0.3.0 Phase 1 (ADR-15 / D-24) |
| Per-agent Codex sandbox map (classifier+auditor read-only, synthesizer workspace-write) | Sandbox declaration must match each agent's actual filesystem footprint; the synthesizer is the only restored agent that writes (`.oto/INGEST-CONFLICTS.md`) | Resolved in v0.3.0 Phase 1 (D-04, ADR-15) |
| Read-only agents (classifier, auditor) return values are persisted by the orchestrator, not by the agent | Sandbox parity for `read-only` requires the agent to never write; the workflow assumes the responsibility for persisting the agent's return value | Resolved in v0.3.0 Phase 2 (D-04 follow-on) |
| `oto-sdk` is a faithful PORT of GSD's `sdk/` subpackage, not a greenfield build | The installer already carried `oto-sdk` PATH-wiring expecting a `bin/oto-sdk.js` shim; a rewrite multiplies surface for zero benefit | Resolved in v0.4.0 Phase 11 |
| Ship prebuilt `sdk/dist/` committed in-repo; no install-time SDK build | A clean GitHub-archive install must yield a working `oto-sdk` with no manual build step or `prepare` toolchain risk | Resolved in v0.4.0 Phase 11 |
| Tiered SDK fallback: read-only queries degrade to defaults, structural/stateful operations fail fast | Silent completion of a stateful op without the SDK is worse than a clear stop; read-only paths can safely continue | Resolved in v0.4.0 Phase 12 (SDK-05) |
| Dogfood migration is a clean cutover to `.oto/` — no dual-location `.planning/` shim | Supporting both locations is maintenance burden against the personal-use ceiling; the rename preserves git history | Resolved in v0.4.0 Phase 13 |
| v0.4.0 phases number from 11 (above the highest existing folder) | New phase directories must never collide with the accumulated v0.1.0–v0.3.0 folders; existing folders are not renamed/moved/deleted | Resolved in v0.4.0 roadmap |
| Integration config flags are boolean-only; API keys live in env vars or 0600 `~/.oto` keyfiles, entered via stdin/muted TTY only (never argv) | Tracked config must never persist secret material; argv/logs/transcripts must stay plaintext-free | Resolved in v0.5.0 Phase 14 |
| Key-storage fix covers all three integrations (`exa_search`, `brave_search`, `firecrawl`) with one shared mechanism | Fixing only Exa would leave the same defect class live in two other paths | Resolved in v0.5.0 Phase 14 |
| Exa MCP transport is launcher-stdio: shipped hook pins `exa-mcp-server@3.2.1` with an exact three-tool surface (ADR-16) | Uniform env-first/keyfile secret resolution and a deterministic tool surface across all three runtimes; remote HTTP documented as the alternative | Resolved in v0.5.0 Phase 15 |
| MCP registration is additive and fingerprint-owned per runtime — never CLI shell-outs; user-owned, drifted, or unparseable entries are refused, not overwritten | `claude mcp add` writes resolved secrets to disk (claude-code#18692); runtime config files contain user state that must survive oto install/uninstall | Resolved in v0.5.0 Phase 15 |
| MCP consent is persisted separately from install fingerprints, default No, key-gated | User intent is independent of mutation ownership evidence; nothing registers silently or without a usable key | Resolved in v0.5.0 Phase 15 |
| All key-availability gates use `detectKeySource` (usable-key detection), never bare file existence | Empty or dangling keyfiles must not enable integrations or registration | Resolved in v0.5.0 Phase 15 |
| Upstream sync conflicts are namespaced per upstream; deletion acceptance carries resolved upstream identity and refuses ambiguous legacy provenance | Two-upstream overlap must never mutate the wrong inventory row or guess provenance | Resolved in v0.5.0 Phase 16 |
| v0.5.0 closed without a separate milestone audit; WR-02 planning-root fixture debt deferred with an amended SDK baseline | Phase-level bounded verification covered the surface; consistent with v0.3.0/v0.4.0 close practice — audit remains available retroactively | Decided at v0.5.0 close (⚠️ revisit if the deferred debt blocks a future gate) |

## Evolution

After each milestone:
1. Move shipped requirements to Validated.
2. Clear Active requirements before defining the next milestone.
3. Re-check the personal-use cost ceiling.
4. Update this document with decisions that should constrain future work.

---
*Last updated: 2026-07-18 after v0.5.0 milestone*
