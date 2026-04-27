# Requirements: oto

**Defined:** 2026-04-27
**Core Value:** Stop framework-switching — one installable framework where GSD's planning/execution workflow and Superpowers' capabilities coexist behind a single, consistent `/oto-*` command surface across Claude Code, Codex, and Gemini CLI.

## v1 Requirements

Requirements for v0.1.0 release. Each maps to a roadmap phase. Requirements are the *what*; the architecture/scope decisions captured here flow from research (`.planning/research/SUMMARY.md`).

### Foundation

- [ ] **FND-01**: Repository structured as Node.js npm package (Node >= 22.0.0, CommonJS, no top-level TypeScript, no build step at top level)
- [ ] **FND-02**: `package.json` declares `"bin": { "oto": "bin/install.js" }` and an explicit `"files"` allowlist
- [ ] **FND-03**: Hooks-build script (`scripts/build-hooks.js`) runs in `prepare` lifecycle — validates JS hook source with `vm.Script`, copies to `hooks/dist/`
- [ ] **FND-04**: Repository hosted on public GitHub, installable via `npm install -g github:<owner>/oto-hybrid-framework[#vX.Y.Z]`
- [ ] **FND-05**: First tagged release (`v0.1.0`) creates a clean install for at least one runtime (Claude Code)
- [ ] **FND-06**: License attribution for both upstreams preserved in repo (`LICENSE` for oto's added work; `THIRD-PARTY-LICENSES.md` with verbatim GSD and Superpowers MIT licenses)

### Architecture Decisions

- [ ] **ARCH-01**: Canonical state directory name decided and locked (`.oto/` recommended; replaces GSD's `.planning/`)
- [ ] **ARCH-02**: Skill-vs-command routing policy documented in `decisions/skill-vs-command.md`
- [ ] **ARCH-03**: Single consolidated SessionStart hook decided (replaces both upstreams' hooks to prevent double-injection)
- [ ] **ARCH-04**: Agent ID collision resolution documented (e.g., GSD `gsd-code-reviewer` vs Superpowers `code-reviewer`)
- [ ] **ARCH-05**: Internal skill namespace decided (`oto:<skill-name>` for `Skill()` calls inside agents)
- [ ] **ARCH-06**: File inventory complete — every file in both upstreams categorized as keep / drop / merge with reason

### Rebrand Engine

- [ ] **REB-01**: Rule-typed rename engine (`scripts/rebrand.cjs`) — separate rule classes for identifiers (`\b`-bounded), paths, slash commands, URLs, env vars
- [ ] **REB-02**: `rename-map.json` schema with explicit before/after for every internal ID, command name, agent name, skill namespace
- [ ] **REB-03**: Do-not-rename allowlist — `LICENSE` files, `foundation-frameworks/`, copyright lines, upstream URLs in attribution context
- [ ] **REB-04**: Dry-run mode produces classified report (per-file: planned changes by rule type)
- [ ] **REB-05**: Coverage manifest — pre-rebrand and post-rebrand counts of `gsd`, `GSD`, `Get Shit Done`, `superpowers`, `Superpowers` per file class; CI fails if any non-allowlisted occurrence remains
- [ ] **REB-06**: Round-trip assertion — re-applying the rename map to already-rebranded code produces no further changes

### Installer

- [ ] **INS-01**: Forked + trimmed `bin/install.js` — supports only Claude Code, Codex, Gemini CLI (drops OpenCode, Kilo, Cursor, Windsurf, Antigravity, Augment, Trae, Qwen, CodeBuddy, Cline, Copilot)
- [ ] **INS-02**: Per-runtime adapter modules (`runtime-claude.cjs`, `runtime-codex.cjs`, `runtime-gemini.cjs`) own runtime-specific paths, instruction filenames, agent frontmatter dialect, hook registration syntax
- [ ] **INS-03**: Install resolution order: `--config-dir` flag → env var (`CLAUDE_CONFIG_DIR` / `CODEX_HOME` / `GEMINI_CONFIG_DIR`) → `~/.<runtime>` default
- [ ] **INS-04**: Files copied (not symlinked) into runtime config dirs at install time
- [ ] **INS-05**: `oto install --claude` is the documented v0.1.0 happy path; `--codex` and `--gemini` work but parity is best-effort
- [ ] **INS-06**: `--all` flag installs to all detected runtimes

### Workflows (GSD Spine — Ported & Rebranded)

- [ ] **WF-01**: `/oto-new-project` — initialize new project (questioning → research → requirements → roadmap)
- [ ] **WF-02**: `/oto-discuss-phase` — gather phase context through adaptive questioning
- [ ] **WF-03**: `/oto-plan-phase` — create detailed phase plan with verification loop
- [ ] **WF-04**: `/oto-execute-phase` — execute phase with wave-based parallelization
- [ ] **WF-05**: `/oto-verify-work` — validate built features through conversational UAT
- [ ] **WF-06**: `/oto-ship` — create PR, run review, prepare for merge
- [ ] **WF-07**: `/oto-progress`, `/oto-next`, `/oto-resume-work`, `/oto-pause-work` — navigation/state
- [ ] **WF-08**: `/oto-help`, `/oto-update`, `/oto-health`, `/oto-stats`, `/oto-settings` — meta-commands
- [ ] **WF-09**: `/oto-undo` — safe git revert for phase/plan commits
- [ ] **WF-10**: `/oto-debug` — systematic debugging with persistent state
- [ ] **WF-11**: `/oto-fast`, `/oto-quick` — lightweight execution paths for trivial work
- [ ] **WF-12**: `/oto-do` — route freeform text to the right oto command automatically
- [ ] **WF-13**: `/oto-spike`, `/oto-spike-wrap-up` — timeboxed exploration
- [ ] **WF-14**: `/oto-sketch`, `/oto-sketch-wrap-up` — lightweight design sketching
- [ ] **WF-15**: `/oto-explore` — Socratic ideation routing
- [ ] **WF-16**: `/oto-note`, `/oto-add-todo`, `/oto-check-todos`, `/oto-plant-seed` — idea capture
- [ ] **WF-17**: `/oto-new-milestone`, `/oto-complete-milestone`, `/oto-milestone-summary` — milestone lifecycle
- [ ] **WF-18**: `/oto-add-phase`, `/oto-insert-phase`, `/oto-remove-phase`, `/oto-analyze-dependencies` — roadmap manipulation
- [ ] **WF-19**: `/oto-secure-phase`, `/oto-validate-phase` — retroactive audits
- [ ] **WF-20**: `/oto-code-review`, `/oto-code-review-fix` — phase-level batch review
- [ ] **WF-21**: `/oto-ui-phase`, `/oto-ui-review` — UI design contract + retroactive audit
- [ ] **WF-22**: `/oto-add-tests` — generate tests for completed phase based on UAT criteria
- [ ] **WF-23**: `/oto-map-codebase`, `/oto-scan` — brownfield exploration
- [ ] **WF-24**: `/oto-docs-update` — generate/update documentation verified against codebase
- [ ] **WF-25**: `/oto-review` — cross-AI peer review of phase plans
- [ ] **WF-26**: `/oto-workstreams` — manage parallel workstreams (list, create, switch, status, complete)
- [ ] **WF-27**: `/oto-list-workspaces`, `/oto-new-workspace`, `/oto-remove-workspace` — isolated workspace management
- [ ] **WF-28**: AI-integration phase scaffolding ported (eval-planner, AI-feature workflows)
- [ ] **WF-29**: `/oto-autonomous` — run remaining phases autonomously
- [ ] **WF-30**: `/oto-set-profile` — switch model profile (quality/balanced/budget/inherit)

### Agents

- [ ] **AGT-01**: Audit GSD's 33 agents — keep, drop, or merge each. Document decisions in `decisions/agent-audit.md`
- [ ] **AGT-02**: Drop Superpowers' `code-reviewer` example agent (resolves identity collision with `oto-code-reviewer`)
- [ ] **AGT-03**: All retained agents rebranded (`name:` frontmatter, file paths, registry references) and pass schema validation
- [ ] **AGT-04**: Codex `CODEX_AGENT_SANDBOX` config map updated for all retained agents (per-agent sandbox mode)

### Skills (Superpowers Subset — Ported & Rebranded)

- [ ] **SKL-01**: `oto:test-driven-development` — TDD enforcement skill
- [ ] **SKL-02**: `oto:systematic-debugging` — root-cause-tracing methodology
- [ ] **SKL-03**: `oto:verification-before-completion` — per-claim verification skill
- [ ] **SKL-04**: `oto:dispatching-parallel-agents` — parallel agent dispatch patterns
- [ ] **SKL-05**: `oto:using-git-worktrees` — worktree workflow patterns
- [ ] **SKL-06**: `oto:writing-skills` — meta-skill for authoring new oto skills
- [ ] **SKL-07**: `oto:using-oto` — bootstrap skill loaded at SessionStart; defers to in-progress workflows (gates on `.oto/STATE.md`)
- [ ] **SKL-08**: Cross-system integration — `oto-executor` agent invokes `oto:test-driven-development` and `oto:verification-before-completion` at canonical points; `oto-debugger` invokes `oto:systematic-debugging`

### Hooks

- [ ] **HK-01**: Single consolidated SessionStart hook (replaces GSD's session-start + Superpowers' session-start; idempotent; emits one bootstrap injection per session)
- [ ] **HK-02**: Statusline hook (workflow-aware, shows current phase / state)
- [ ] **HK-03**: Context-monitor hook (warns at context-window thresholds)
- [ ] **HK-04**: Prompt-guard hook (validates user-supplied paths/text before tool execution)
- [ ] **HK-05**: Read-injection-scanner hook (detects prompt-injection attempts in file reads)
- [ ] **HK-06**: Validate-commit hook (rejects commits violating workflow invariants)
- [ ] **HK-07**: Hook source files version-tagged with `# oto-hook-version: {{OTO_VERSION}}` token rewritten at install time

### Upstream Sync

- [ ] **SYN-01**: `scripts/sync-upstream/pull-gsd.cjs` — fetch latest GSD `main`, snapshot to `.oto-sync/upstream/gsd/`
- [ ] **SYN-02**: `scripts/sync-upstream/pull-superpowers.cjs` — fetch latest Superpowers `main`, snapshot to `.oto-sync/upstream/superpowers/`
- [ ] **SYN-03**: `scripts/sync-upstream/rebrand.cjs` — apply rename map to upstream snapshot, output rebranded tree
- [ ] **SYN-04**: `scripts/sync-upstream/merge.cjs` — diff rebranded snapshot against current `oto/` tree, surface conflicts in `.oto-sync-conflicts/` for manual resolution
- [ ] **SYN-05**: Per-upstream `last-synced-commit.json` tracks last applied upstream SHA
- [ ] **SYN-06**: Per-upstream `BREAKING-CHANGES.md` log captures upstream removals/renames that need oto-side action
- [ ] **SYN-07**: Sync v1 is rename + conflict surfacing only; three-way merge UX deferred to v2

### Multi-Runtime

- [ ] **MR-01**: Claude Code runtime is daily-use stable before Codex/Gemini parity is pursued
- [ ] **MR-02**: `CLAUDE.md` (Claude), `AGENTS.md` (Codex), `GEMINI.md` (Gemini) generated from a single source-of-truth template, then runtime-specific transformations applied
- [ ] **MR-03**: Runtime-specific instruction file divergences (e.g., Codex needs `sandbox:` frontmatter) documented and tested
- [ ] **MR-04**: Smoke test per runtime: install → run a representative `/oto-*` command → state file written correctly

### Tests & CI

- [ ] **CI-01**: GitHub Actions `test.yml` — Node 22 + 24 matrix on Ubuntu, plus one macOS runner on Node 24
- [ ] **CI-02**: GitHub Actions `install-smoke.yml` — real `npm pack` + `npm install -g <tarball>` AND unpacked-dir install (catches mode-644 trap)
- [ ] **CI-03**: GitHub Actions `release.yml` — tag-triggered, creates GitHub Release; no npm publish
- [ ] **CI-04**: Rebrand-engine snapshot tests — golden-file output for representative source files
- [ ] **CI-05**: Coverage-manifest CI check — fails if any non-allowlisted `gsd`/`superpowers` occurrence appears in rebranded source
- [ ] **CI-06**: License-attribution CI check — `THIRD-PARTY-LICENSES.md` exists and contains both upstreams' MIT text verbatim
- [ ] **CI-07**: Skill-auto-trigger regression test — verifies `oto:using-oto` defers when `.oto/STATE.md` shows in-progress phase
- [ ] **CI-08**: SessionStart-output snapshot fixture — locks the bootstrap injection content
- [ ] **CI-09**: State-leak detection test — verifies no upstream `.planning/` references remain in rebranded code
- [ ] **CI-10**: Pin GitHub Actions by SHA, not major tag

### Documentation

- [ ] **DOC-01**: `README.md` with: what oto is, install instructions (`npm install -g github:<owner>/oto-hybrid-framework#vX.Y.Z`), upstream attribution, command index
- [ ] **DOC-02**: `THIRD-PARTY-LICENSES.md` with verbatim GSD and Superpowers MIT licenses
- [ ] **DOC-03**: `docs/upstream-sync.md` — how to pull and apply upstream changes
- [ ] **DOC-04**: `docs/rebrand-engine.md` — how the rename engine works, how to add rules
- [ ] **DOC-05**: `decisions/` directory containing architecture decisions (skill-vs-command routing, agent audit, state directory choice)
- [ ] **DOC-06**: Auto-generated `commands/INDEX.md` listing all `/oto-*` commands with one-line descriptions

## v2 Requirements

Deferred to post-v0.1.0. Tracked but not in v1 roadmap.

### SDK
- **SDK-01**: Port GSD's `sdk/` subpackage as `oto-sdk` (TypeScript, vitest tests, programmatic API)
- **SDK-02**: SDK PhaseRunner, query registry, CLI binary
- **SDK-03**: Migrate `oto-tools.cjs` callers to `oto-sdk query` API

### Sync v2
- **SYN-V2-01**: Three-way merge UX with conflict resolution UI
- **SYN-V2-02**: Bidirectional sync (push oto improvements back upstream as suggested patches)
- **SYN-V2-03**: Automated rename-map evolution from upstream PR diffs

### Runtime parity hardening
- **RT-V2-01**: Codex parity test suite (subagent dispatch, model inheritance, sandbox modes)
- **RT-V2-02**: Gemini inline-equivalent fallbacks for missing subagent support
- **RT-V2-03**: CI matrix expanded to all three runtimes for smoke tests

### Niche commands
- **NICH-V2-01**: `/oto-graphify` — visualize project state graph
- **NICH-V2-02**: `/oto-intel` — codebase intelligence query interface
- **NICH-V2-03**: `/oto-profile-user` — developer behavioral profiling
- **NICH-V2-04**: `/oto-thread` — persistent context threads for cross-session work
- **NICH-V2-05**: `/oto-import` — ingest external plans with conflict detection

## Out of Scope

| Feature | Reason |
|---------|--------|
| OpenCode runtime support | User does not use OpenCode; carrying it inflates rebrand and test surface |
| Kilo/Cursor/Windsurf/Antigravity/Augment/Trae/Qwen/CodeBuddy/Cline/Copilot runtimes | Not in user's daily flow; 11× rebrand cost for zero personal benefit |
| Windows support | Mac is primary; drops `.cmd` polyglot, MSYS2 carve-outs, CRLF handling, symlink elevation logic |
| npm registry publish (`npm publish`) | Personal use doesn't justify versioning/release ceremony; GitHub install covers cross-machine portability |
| Multi-user / team / shared-config features | Personal-use scope; revisit if anyone else adopts oto |
| Migration from existing GSD/Superpowers installs | Clean-slate build; user confirmed no carry-over needed |
| Backwards compatibility with raw GSD or Superpowers commands | This is a fork, not a wrapper; users install oto fresh |
| Translated READMEs (ja-JP, ko-KR, pt-BR, zh-CN) | Personal use, English only |
| `/gsd-from-gsd2` (GSD migration command) | Inherited migration tool with no personal use case |
| `/gsd-ultraplan-phase` (BETA) | Upstream BETA; defer until proven |
| Marketplace / community / discord features | Personal use; no community to serve |
| Discord/community integrations | Out of scope per personal-use ceiling |
| Superpowers' contributor-facing CLAUDE.md content + tests/ harness | Belongs to upstream; oto is a downstream fork |
| Real-time / subscription features in core framework | Not framework's purpose |

## Traceability

Populated by roadmap creation (`/gsd-roadmapper`) on 2026-04-27.

| Requirement | Phase | Status |
|-------------|-------|--------|
| FND-01 | Phase 2 | Pending |
| FND-02 | Phase 2 | Pending |
| FND-03 | Phase 2 | Pending |
| FND-04 | Phase 2 | Pending |
| FND-05 | Phase 10 | Pending |
| FND-06 | Phase 1 | Pending |
| ARCH-01 | Phase 1 | Pending |
| ARCH-02 | Phase 1 | Pending |
| ARCH-03 | Phase 1 | Pending |
| ARCH-04 | Phase 1 | Pending |
| ARCH-05 | Phase 1 | Pending |
| ARCH-06 | Phase 1 | Pending |
| REB-01 | Phase 2 | Pending |
| REB-02 | Phase 1 | Pending |
| REB-03 | Phase 2 | Pending |
| REB-04 | Phase 2 | Pending |
| REB-05 | Phase 2 | Pending |
| REB-06 | Phase 2 | Pending |
| INS-01 | Phase 3 | Pending |
| INS-02 | Phase 3 | Pending |
| INS-03 | Phase 3 | Pending |
| INS-04 | Phase 3 | Pending |
| INS-05 | Phase 3 | Pending |
| INS-06 | Phase 3 | Pending |
| WF-01 | Phase 4 | Pending |
| WF-02 | Phase 4 | Pending |
| WF-03 | Phase 4 | Pending |
| WF-04 | Phase 4 | Pending |
| WF-05 | Phase 4 | Pending |
| WF-06 | Phase 4 | Pending |
| WF-07 | Phase 4 | Pending |
| WF-08 | Phase 4 | Pending |
| WF-09 | Phase 4 | Pending |
| WF-10 | Phase 4 | Pending |
| WF-11 | Phase 4 | Pending |
| WF-12 | Phase 4 | Pending |
| WF-13 | Phase 4 | Pending |
| WF-14 | Phase 4 | Pending |
| WF-15 | Phase 4 | Pending |
| WF-16 | Phase 4 | Pending |
| WF-17 | Phase 4 | Pending |
| WF-18 | Phase 4 | Pending |
| WF-19 | Phase 4 | Pending |
| WF-20 | Phase 4 | Pending |
| WF-21 | Phase 4 | Pending |
| WF-22 | Phase 4 | Pending |
| WF-23 | Phase 4 | Pending |
| WF-24 | Phase 4 | Pending |
| WF-25 | Phase 4 | Pending |
| WF-26 | Phase 7 | Pending |
| WF-27 | Phase 7 | Pending |
| WF-28 | Phase 4 | Pending |
| WF-29 | Phase 4 | Pending |
| WF-30 | Phase 4 | Pending |
| AGT-01 | Phase 1 | Pending |
| AGT-02 | Phase 4 | Pending |
| AGT-03 | Phase 4 | Pending |
| AGT-04 | Phase 4 | Pending |
| SKL-01 | Phase 6 | Pending |
| SKL-02 | Phase 6 | Pending |
| SKL-03 | Phase 6 | Pending |
| SKL-04 | Phase 6 | Pending |
| SKL-05 | Phase 6 | Pending |
| SKL-06 | Phase 6 | Pending |
| SKL-07 | Phase 6 | Pending |
| SKL-08 | Phase 6 | Pending |
| HK-01 | Phase 5 | Pending |
| HK-02 | Phase 5 | Pending |
| HK-03 | Phase 5 | Pending |
| HK-04 | Phase 5 | Pending |
| HK-05 | Phase 5 | Pending |
| HK-06 | Phase 5 | Pending |
| HK-07 | Phase 5 | Pending |
| SYN-01 | Phase 9 | Pending |
| SYN-02 | Phase 9 | Pending |
| SYN-03 | Phase 9 | Pending |
| SYN-04 | Phase 9 | Pending |
| SYN-05 | Phase 9 | Pending |
| SYN-06 | Phase 9 | Pending |
| SYN-07 | Phase 9 | Pending |
| MR-01 | Phase 4 | Pending (gate) |
| MR-02 | Phase 8 | Pending |
| MR-03 | Phase 8 | Pending |
| MR-04 | Phase 8 | Pending |
| CI-01 | Phase 10 | Pending |
| CI-02 | Phase 10 | Pending |
| CI-03 | Phase 10 | Pending |
| CI-04 | Phase 10 | Pending |
| CI-05 | Phase 10 | Pending |
| CI-06 | Phase 10 | Pending |
| CI-07 | Phase 10 | Pending |
| CI-08 | Phase 10 | Pending |
| CI-09 | Phase 10 | Pending |
| CI-10 | Phase 10 | Pending |
| DOC-01 | Phase 10 | Pending |
| DOC-02 | Phase 10 | Pending |
| DOC-03 | Phase 10 | Pending |
| DOC-04 | Phase 10 | Pending |
| DOC-05 | Phase 1 | Pending |
| DOC-06 | Phase 10 | Pending |

**Coverage:**
- v1 requirements: 100 total
- Mapped to phases: 100 (every requirement assigned to exactly one phase, no orphans, no duplicates)
- Unmapped: 0

**Per-phase counts:**
- Phase 1 (Inventory & Architecture Decisions): 10 — ARCH-01..06, AGT-01, REB-02, DOC-05, FND-06
- Phase 2 (Rebrand Engine & Distribution Skeleton): 9 — FND-01..04, REB-01, REB-03..06
- Phase 3 (Installer Fork & Claude Adapter): 6 — INS-01..06
- Phase 4 (Core Workflows & Agents Port): 32 — WF-01..25, WF-28..30, AGT-02..04, MR-01
- Phase 5 (Hooks Port & Consolidation): 7 — HK-01..07
- Phase 6 (Skills Port & Cross-System Integration): 8 — SKL-01..08
- Phase 7 (Workstreams & Workspaces Port): 2 — WF-26, WF-27
- Phase 8 (Codex & Gemini Runtime Parity): 3 — MR-02..04
- Phase 9 (Upstream Sync Pipeline): 7 — SYN-01..07
- Phase 10 (Tests, CI, Docs & v0.1.0 Release): 16 — CI-01..10, DOC-01..04, DOC-06, FND-05

---
*Requirements defined: 2026-04-27*
*Last updated: 2026-04-27 — traceability populated by roadmap creation (10 phases)*
