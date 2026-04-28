# Roadmap: oto

## Overview

`oto` is a fork-and-merge of GSD (the spine) and Superpowers (a curated skill subset) into one `/oto-*` command surface across Claude Code, Codex, and Gemini CLI. The journey is: lock the architecture and rebrand schema before any code (Phase 1), build the rebrand engine and distribution skeleton (Phase 2), trim and adapt the installer for Claude (Phase 3), bulk-port the GSD spine — workflows + agents (Phase 4), consolidate and version-tag hooks (Phase 5), port the Superpowers skill subset and wire cross-system invocation (Phase 6), port the larger workstreams + workspaces surfaces (Phase 7), achieve Codex/Gemini parity once Claude is daily-use stable (Phase 8), build the upstream sync pipeline (Phase 9), and harden tests/CI/docs and tag v0.1.0 (Phase 10). Phase ordering enforces MR-01 (Claude-stable before multi-runtime parity) and avoids the rebrand-engine pitfalls 1–10 documented in research/PITFALLS.md.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Inventory & Architecture Decisions** - Lock canonical decisions and rebrand schema before any code is touched
- [x] **Phase 2: Rebrand Engine & Distribution Skeleton** - Rule-typed rebrand engine + Node package shape + GitHub-installable repo
- [ ] **Phase 3: Installer Fork & Claude Adapter** - Trim `bin/install.js` to 3 runtimes; Claude install path is the v0.1.0 happy path
- [ ] **Phase 4: Core Workflows & Agents Port** - Bulk rebrand of GSD spine: 28 workflows + retained agents; `/oto-*` commands work end-to-end on Claude
- [ ] **Phase 5: Hooks Port & Consolidation** - Single SessionStart bootstrap, statusline, context-monitor, prompt-guard, read-injection-scanner, validate-commit
- [ ] **Phase 6: Skills Port & Cross-System Integration** - 7 Superpowers skills ported as `oto:<skill>`; agents invoke skills at canonical points
- [ ] **Phase 7: Workstreams & Workspaces Port** - Parallel-workstream and workspace-isolation surfaces (large standalone subsystems)
- [ ] **Phase 8: Codex & Gemini Runtime Parity** - Single-source-of-truth instruction template + per-runtime smoke tests; only after Claude is daily-use stable
- [ ] **Phase 9: Upstream Sync Pipeline** - Pull GSD/Superpowers, apply rename map, surface conflicts; v1 scope = rename + conflict surfacing only
- [ ] **Phase 10: Tests, CI, Docs & v0.1.0 Release** - Full CI matrix, coverage manifest, license check, README, attribution, tagged release

## Phase Details

### Phase 1: Inventory & Architecture Decisions
**Goal**: Lock every architectural decision and produce the rebrand-map specification before any code is touched, so downstream phases have an unambiguous schema to apply.
**Depends on**: Nothing (first phase)
**Requirements**: ARCH-01, ARCH-02, ARCH-03, ARCH-04, ARCH-05, ARCH-06, AGT-01, REB-02, DOC-05, FND-06
**Success Criteria** (what must be TRUE):
  1. `decisions/` directory exists with one decision file per architectural choice (state-root name, skill-vs-command routing, SessionStart consolidation, agent-collision resolution, internal skill namespace) — each captures the chosen option, the rejected options, and the reason
  2. `decisions/agent-audit.md` lists all 33 GSD agents with a keep / drop / merge verdict and rationale per agent
  3. `decisions/file-inventory.md` (or equivalent) categorizes every file in both upstreams as keep / drop / merge with reason — searchable, complete, no "unclassified" rows
  4. `rename-map.json` exists at repo root with explicit before/after entries for every internal ID, command name, agent name, skill namespace, env var, and path segment that the rebrand will touch
  5. `LICENSE` (oto's added work) and `THIRD-PARTY-LICENSES.md` (verbatim GSD MIT + Superpowers MIT, both copyright lines preserved) are present and rebrand-allowlisted
**Plans**: 3 plans
  - [x] 01-01-decisions-and-adrs-PLAN.md — Lock 14 ADRs + agent-audit (AGT-01) + skill-vs-command routing reference (ARCH-01..05, DOC-05, AGT-01)
  - [x] 01-02-inventory-PLAN.md — Generate file-inventory.json + .md classifying every upstream file (ARCH-06)
  - [x] 01-03-rename-map-and-licenses-PLAN.md — Ship rename-map.json + LICENSE + THIRD-PARTY-LICENSES.md (REB-02, FND-06)

### Phase 2: Rebrand Engine & Distribution Skeleton
**Goal**: Ship the rule-typed rebrand engine and the Node package skeleton that makes the repo installable from GitHub, with all the lifecycle hooks correctly wired so `npm install -g https://github.com/.../archive/<ref>.tar.gz` works without a manual build step.
**Depends on**: Phase 1
**Requirements**: FND-01, FND-02, FND-03, FND-04, REB-01, REB-03, REB-04, REB-05, REB-06
**Success Criteria** (what must be TRUE):
  1. `package.json` declares `engines.node >=22.0.0`, CommonJS, `"bin": { "oto": "bin/install.js" }`, an explicit `"files"` allowlist, and a `postinstall` script (NOT `prepublishOnly`) that runs `scripts/build-hooks.js`
  2. Repo is hosted on public GitHub and `npm install -g https://github.com/<owner>/oto-hybrid-framework/archive/<ref>.tar.gz` installs cleanly (the installer itself may not yet do anything useful — that's Phase 3)
  3. `scripts/rebrand.cjs` runs in dry-run mode against the `foundation-frameworks/` upstream copy and emits a per-file classified report (changes grouped by rule type: identifier / path / command / URL / env var); reports zero unclassified matches
  4. Re-applying the rename map to already-rebranded code produces a zero-change diff (round-trip assertion passes)
  5. The rebrand engine respects a do-not-rename allowlist covering `LICENSE*`, `THIRD-PARTY-LICENSES.md`, `foundation-frameworks/`, copyright lines, and upstream URLs in attribution context (verified by a fixture run)
  6. Pre/post coverage manifest counts every occurrence of `gsd`, `GSD`, `Get Shit Done`, `superpowers`, `Superpowers` per file class; the post-rebrand count outside the allowlist is zero
**Plans**: 3 plans
  - [x] 02-01-distribution-skeleton-PLAN.md — package.json + bin/install.js stub + scripts/build-hooks.js + scripts/install-smoke.cjs + .gitignore + README; live install-smoke against public repo (FND-01..04)
  - [x] 02-02-rebrand-rules-and-walker-PLAN.md — 7 per-rule modules + walker + hand-rolled schema validator + 9 synthetic fixtures + per-rule unit tests (REB-01, REB-03)
  - [x] 02-03-rebrand-engine-and-cli-PLAN.md — engine orchestrator + manifest + report + CLI; real-tree dry-run/apply/round-trip against foundation-frameworks/ (REB-04, REB-05, REB-06)

### Phase 3: Installer Fork & Claude Adapter
**Goal**: Fork and trim `bin/install.js` to support exactly three runtimes (Claude Code, Codex, Gemini), with Claude as the locked-in v0.1.0 happy path; Codex and Gemini work but parity is best-effort and proven later.
**Depends on**: Phase 2
**Requirements**: INS-01, INS-02, INS-03, INS-04, INS-05, INS-06
**Success Criteria** (what must be TRUE):
  1. `oto install --claude` on a clean machine writes `oto/` artifacts under `~/.claude/` (or `--config-dir` / `CLAUDE_CONFIG_DIR` override), with files copied (not symlinked), and a smoke check confirms the install marker is present at the expected path
  2. Per-runtime adapter modules (`runtime-claude.cjs`, `runtime-codex.cjs`, `runtime-gemini.cjs`) own their runtime-specific paths, instruction filenames, agent frontmatter dialect, and hook registration syntax — no runtime-conditional branches outside these files
  3. Install resolution order works as specified: `--config-dir` flag wins, then env var, then default `~/.<runtime>/`
  4. Eleven unwanted runtimes (OpenCode, Kilo, Cursor, Windsurf, Antigravity, Augment, Trae, Qwen, CodeBuddy, Cline, Copilot) are entirely removed from `bin/install.js` — grep returns zero hits
  5. `oto install --all` detects which of the 3 supported runtimes are present on disk and installs to each; `--codex` and `--gemini` flags work standalone but are documented as best-effort until Phase 8
**Plans**: TBD
**UI hint**: yes

### Phase 4: Core Workflows & Agents Port
**Goal**: Bulk-port the GSD spine — 28 workflows and the retained subset of GSD's agents — through the rebrand engine, leaving Claude Code daily-use stable so MR-01 holds before any Codex/Gemini parity work begins.
**Depends on**: Phase 3
**Requirements**: WF-01, WF-02, WF-03, WF-04, WF-05, WF-06, WF-07, WF-08, WF-09, WF-10, WF-11, WF-12, WF-13, WF-14, WF-15, WF-16, WF-17, WF-18, WF-19, WF-20, WF-21, WF-22, WF-23, WF-24, WF-25, WF-28, WF-29, WF-30, AGT-02, AGT-03, AGT-04, MR-01
**Success Criteria** (what must be TRUE):
  1. All 28 listed `/oto-*` workflows (new-project through set-profile, excluding workstreams/workspaces in Phase 7) execute end-to-end on Claude Code: `/oto-help`, `/oto-new-project`, `/oto-discuss-phase`, `/oto-plan-phase`, `/oto-execute-phase`, `/oto-verify-work`, `/oto-ship`, plus all navigation, milestone, roadmap-manipulation, and meta-commands
  2. Every retained agent passes frontmatter schema validation (`name:`, `tools:`, `model:`/`color:` shapes), and every `Task(subagent_type=...)` reference in workflows points to an agent that exists in `agents/`
  3. Codex `CODEX_AGENT_SANDBOX` map in the installer covers every retained agent with the correct sandbox mode (`workspace-write` or `read-only`)
  4. Superpowers' example `code-reviewer` agent is removed (the identity collision with `oto-code-reviewer` is resolved by dropping the Superpowers version)
  5. State directory is `.oto/` everywhere; grep for `.planning/` (excluding `foundation-frameworks/`) returns zero hits
  6. **MR-01 gate**: User confirms Claude Code runtime is daily-use stable for at least one full session of `/oto-new-project` → `/oto-execute-phase` → `/oto-verify-work` without falling back to GSD or Superpowers
**Plans**: TBD
**UI hint**: yes

### Phase 5: Hooks Port & Consolidation
**Goal**: Port and consolidate hooks from both upstreams into a single coherent fleet, with one SessionStart entrypoint (no double-injection) and version-tagged source files.
**Depends on**: Phase 4
**Requirements**: HK-01, HK-02, HK-03, HK-04, HK-05, HK-06, HK-07
**Success Criteria** (what must be TRUE):
  1. SessionStart on Claude Code emits exactly one identity block per session (no `<EXTREMELY_IMPORTANT>You have superpowers.` residue, no double "you are using oto" injection); captured snapshot fixture is locked as regression baseline
  2. Statusline hook renders current phase / state from `.oto/STATE.md` in the user's terminal status bar
  3. Context-monitor hook fires after each turn, warns the user when usage crosses a configured threshold
  4. Prompt-guard and read-injection-scanner hooks fire on the appropriate tool events and block known-bad patterns (validated by fixture inputs)
  5. Validate-commit hook rejects a commit that violates the workflow invariant (no commits without an active phase + plan); accepts a well-formed commit
  6. Every hook source file carries a `# oto-hook-version: {{OTO_VERSION}}` token that the installer rewrites at install time; stale-hook detection works on upgrade
**Plans**: TBD

### Phase 6: Skills Port & Cross-System Integration
**Goal**: Port the curated subset of 7 Superpowers skills into `oto/skills/` under the `oto:` namespace, retune the bootstrap to defer to in-progress workflows, and wire agent prompts to invoke skills at canonical points.
**Depends on**: Phase 5
**Requirements**: SKL-01, SKL-02, SKL-03, SKL-04, SKL-05, SKL-06, SKL-07, SKL-08
**Success Criteria** (what must be TRUE):
  1. Seven skills are installed and discoverable via the runtime's native skill mechanism: `oto:test-driven-development`, `oto:systematic-debugging`, `oto:verification-before-completion`, `oto:dispatching-parallel-agents`, `oto:using-git-worktrees`, `oto:writing-skills`, `oto:using-oto`
  2. `oto:using-oto` defers to in-progress workflows: when `.oto/STATE.md` shows an active phase, ambient skills do NOT auto-invoke outside the workflow's allowlist (validated by an auto-trigger regression test)
  3. `oto-executor` agent's prompt invokes `oto:test-driven-development` before writing implementation code AND `oto:verification-before-completion` after writing implementation code, at canonical points
  4. `oto-debugger` agent's prompt invokes `oto:systematic-debugging` when starting a debugging session
  5. Outside of an active workflow, an ambient prompt like "fix this bug" auto-invokes `oto:systematic-debugging` (skill auto-load works as designed when not gated by STATE.md)
**Plans**: TBD

### Phase 7: Workstreams & Workspaces Port
**Goal**: Port the two large standalone GSD subsystems — parallel workstreams and isolated workspaces — that warrant their own phase because each manages a non-trivial state model orthogonal to the phase machine.
**Depends on**: Phase 6
**Requirements**: WF-26, WF-27
**Success Criteria** (what must be TRUE):
  1. `/oto-workstreams list|create|switch|status|complete` works on Claude Code: user can create a parallel workstream, switch to it, see its status separately from the main phase line, and complete it
  2. `/oto-list-workspaces`, `/oto-new-workspace`, `/oto-remove-workspace` work on Claude Code: user can create an isolated workspace, list it, and remove it without corrupting the parent project's `.oto/` state
  3. Workstream and workspace state lives entirely under `.oto/` (no leakage to alternate path schemes); the existing phase machine continues to function correctly while a workstream/workspace is active
**Plans**: TBD

### Phase 8: Codex & Gemini Runtime Parity
**Goal**: Bring Codex and Gemini CLI runtimes up to parity (best-effort given subagent-support gaps in Gemini), gated on MR-01 having been satisfied at Phase 4 close.
**Depends on**: Phase 7 (and MR-01 already satisfied at Phase 4 close)
**Requirements**: MR-02, MR-03, MR-04
**Success Criteria** (what must be TRUE):
  1. `CLAUDE.md`, `AGENTS.md`, `GEMINI.md` are generated from a single source-of-truth template plus per-runtime transformations — no hand-edits to the runtime files; drift is impossible by construction
  2. Runtime-specific instruction-file divergences (e.g., Codex `sandbox:` frontmatter, Gemini's lack of subagent support requiring inline-equivalent fallbacks) are documented in `runtime-tool-matrix.md` and verified by per-runtime fixture tests
  3. Per-runtime smoke test passes on each: install → run a representative `/oto-*` command → state file written to the runtime's expected `.oto/` location → no "tool not found" errors
**Plans**: TBD

### Phase 9: Upstream Sync Pipeline
**Goal**: Build the v1 upstream sync pipeline — pull rebranded snapshots, apply rename map, surface conflicts and deletions for manual resolution. Three-way merge UX is intentionally deferred to v2.
**Depends on**: Phase 8
**Requirements**: SYN-01, SYN-02, SYN-03, SYN-04, SYN-05, SYN-06, SYN-07
**Success Criteria** (what must be TRUE):
  1. `scripts/sync-upstream/pull-gsd.cjs` and `pull-superpowers.cjs` fetch the latest upstream `main` (or pinned tag) and write snapshots under `.oto-sync/upstream/{gsd,superpowers}/`
  2. `rebrand.cjs` (sync variant) applies the rename map to the upstream snapshot and outputs a rebranded tree
  3. `merge.cjs` diffs the rebranded snapshot against the current `oto/` tree and emits any conflicts to `.oto-sync-conflicts/<path>.md` for manual resolution; deletions upstream are surfaced explicitly (not silently propagated)
  4. Per-upstream `last-synced-commit.json` records the last applied upstream SHA; per-upstream `BREAKING-CHANGES.md` log captures upstream removals/renames that needed oto-side action during the sync
  5. Running the sync against a known upstream commit produces clean output (no false-positive conflicts) and tests still pass on the resulting tree
**Plans**: TBD

### Phase 10: Tests, CI, Docs & v0.1.0 Release
**Goal**: Lock the test surface, harden CI, write the public docs, and tag v0.1.0 — the first installable release that creates a clean install for Claude Code.
**Depends on**: Phase 9
**Requirements**: CI-01, CI-02, CI-03, CI-04, CI-05, CI-06, CI-07, CI-08, CI-09, CI-10, DOC-01, DOC-02, DOC-03, DOC-04, DOC-06, FND-05
**Success Criteria** (what must be TRUE):
  1. CI matrix runs on every push: `test.yml` (Node 22 + 24 on Ubuntu, plus one macOS Node 24 runner), `install-smoke.yml` (real `npm pack` + tarball install AND unpacked-dir install — catches the mode-644 trap), `release.yml` (tag-triggered, creates a GitHub Release; no npm publish)
  2. Rebrand-engine snapshot tests pass against golden-file fixtures for representative source files; coverage-manifest CI check fails the build if any non-allowlisted `gsd` / `superpowers` occurrence appears in rebranded source
  3. License-attribution CI check confirms `THIRD-PARTY-LICENSES.md` exists and contains both upstream MIT licenses verbatim (with `Lex Christopherson` and `Jesse Vincent` copyright lines present)
  4. Skill-auto-trigger regression test, SessionStart-output snapshot fixture, and state-leak detection test (no `.planning/` references) all pass; GitHub Actions are pinned by SHA, not major tag
  5. Public docs are present: `README.md` (what oto is, install instruction with tagged ref, upstream attribution, command index), `docs/upstream-sync.md`, `docs/rebrand-engine.md`, auto-generated `commands/INDEX.md` listing every `/oto-*` command with a one-line description
  6. **v0.1.0 tagged release**: `git tag v0.1.0` triggers `release.yml`, GitHub Release is created, and `npm install -g https://github.com/<owner>/oto-hybrid-framework/archive/v0.1.0.tar.gz` on a clean machine produces a working Claude Code install
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Inventory & Architecture Decisions | 3/3 | Complete | 2026-04-27 |
| 2. Rebrand Engine & Distribution Skeleton | 3/3 | Complete | 2026-04-28 |
| 3. Installer Fork & Claude Adapter | 0/TBD | Not started | - |
| 4. Core Workflows & Agents Port | 0/TBD | Not started | - |
| 5. Hooks Port & Consolidation | 0/TBD | Not started | - |
| 6. Skills Port & Cross-System Integration | 0/TBD | Not started | - |
| 7. Workstreams & Workspaces Port | 0/TBD | Not started | - |
| 8. Codex & Gemini Runtime Parity | 0/TBD | Not started | - |
| 9. Upstream Sync Pipeline | 0/TBD | Not started | - |
| 10. Tests, CI, Docs & v0.1.0 Release | 0/TBD | Not started | - |
