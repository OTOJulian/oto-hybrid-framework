# Phase 3: Installer Fork & Claude Adapter - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `03-CONTEXT.md` — this log preserves the alternatives considered.

**Date:** 2026-04-28
**Phase:** 03-installer-fork-claude-adapter
**Areas discussed:** Adapter shape & boundary, Phase 3 payload scope, Lifecycle (re-install & uninstall), Codex/Gemini Phase 3 depth, Install marker, --all detection, Test strategy

---

## Gray Area Selection

User invoked `/gsd-discuss-phase 3` (no `--auto`, no `--chain`). On the multi-select gray-area question, user selected nothing and instructed Claude via free-text note: *"decide what you think is best for all of these grey areas. You can now continue with the user's answers in mind."*

This mirrors the Phase 1 delegation pattern. Claude resolved every gray area using research-backed defaults grounded in CLAUDE.md tech-stack TL;DR, `.planning/research/PITFALLS.md`, ADR-11, prior CONTEXT.md (Phase 1 D-01..D-23, Phase 2 D-01..D-18), and ROADMAP Phase 3 success criteria.

---

## Adapter Shape & Boundary

| Option | Description | Selected |
|--------|-------------|----------|
| A. Thin-config descriptors | Each adapter exports static config (paths, filenames, formats); install.js does all logic | |
| B. Fat lifecycle adapters | Each adapter exports `install`/`uninstall`/`verify`; install.js dispatches by runtime | |
| C. Hybrid descriptor + lifecycle hooks | Adapter exports descriptor object PLUS lifecycle hooks (`renderInstructionBlock`, `transform*`, `mergeSettings`, `onPreInstall`, `onPostInstall`); install.js orchestrates using descriptors and dispatches transform calls | ✓ |

**Claude's choice:** C — Hybrid (D-01).
**Rationale:** A leaks runtime conditionals back into install.js via descriptor lookup tables; B duplicates orchestration 3× and risks drift. The hybrid mirrors GSD's existing factoring (`convertClaudeAgentToCodexAgent`, `generateCodexAgentToml`, `convertClaudeToGeminiTools` are perfect adapter-hook candidates). SC#2 ("no runtime-conditional branches outside these files") is satisfied because every difference is either a descriptor field or a hook call.

---

## Phase 3 Payload Scope

| Option | Description | Selected |
|--------|-------------|----------|
| A. Scaffolding only, real plumbing | Installer is fully functional; reads from empty/absent source dirs (`oto/commands/`, `oto/agents/`, etc.) | ✓ |
| B. Stub payload | Ship a fake `/oto-help` placeholder command + a noop agent so install actually copies something | |
| C. Defer install logic | Phase 3 ships only adapters + arg parsing; actual file copying lands in Phase 4 | |

**Claude's choice:** A — Scaffolding only (D-07).
**Rationale:** B is wasted motion (Pitfall 11) — fixture payloads have no use post-Phase 4. C splits a feature across two phases, defeating SC#1 (which requires `oto install --claude` to work end-to-end now). A delivers a complete, working installer that Phase 4+ feeds without re-forking.

---

## Lifecycle: Re-Install & Uninstall

| Option | Description | Selected |
|--------|-------------|----------|
| A. Install-only at Phase 3 | Defer `--uninstall` and idempotent re-install to a later phase | |
| B. Install + idempotent re-install | Ship marker-based merge so re-install replaces; defer `--uninstall` | |
| C. Full lifecycle (install + idempotent re-install + uninstall + `--purge`) | Marker-bracketed instruction-file blocks + state-file manifest enable all three; cheap when payload is empty | ✓ |

**Claude's choice:** C — Full lifecycle (D-09, D-10, D-11).
**Rationale:** Uninstall is structurally cheap once the marker convention is in place (D-08): rm files in `state.files[]`, strip marker block, rm namespaced subdir. Retrofitting later means re-thinking the marker contract under pressure. Marker format choice is the leverage point — pay it now, get all three lifecycle modes.

---

## Install Marker Format & Location

| Option | Description | Selected |
|--------|-------------|----------|
| A. Marker comment in instruction file only | Block bracketed by `<!-- OTO Configuration -->` ... `<!-- /OTO Configuration -->` in `CLAUDE.md` | |
| B. State file only | `~/.<runtime>/oto/.install.json` listing every installed file | |
| C. Both (dual-source-of-truth) | Marker block (LLM-facing) + state file (installer-facing); each serves a distinct consumer | ✓ |

**Claude's choice:** C — Both (D-08).
**Rationale:** The instruction-file marker tells the LLM oto exists (idempotent re-injection requires bracketing); the state file gives the installer a manifest for clean uninstall (Pitfall 6 license preservation extends here — never `rm` files we didn't put). Single-marker designs force one side to compromise. CLAUDE.md project-doc already references the `<!-- OTO Configuration -->` convention; D-08 makes it concrete.

---

## Codex / Gemini Phase 3 Depth

| Option | Description | Selected |
|--------|-------------|----------|
| A. Minimum viable | Adapters create dirs + inject marker in `AGENTS.md` / `GEMINI.md`; transforms are identity stubs; no TOML hook merge | ✓ |
| B. Partial parity | Port the Codex `[hooks]` TOML machinery now to keep all settings-merge code in one phase | |
| C. Full parity | Match Phase 8's promised parity at Phase 3; no MR-01 deferral | |

**Claude's choice:** A — Minimum viable (D-12, D-13).
**Rationale:** MR-01 explicitly gates parity behind Claude-stable-at-Phase-4. SC#5 says Codex/Gemini are "best-effort until Phase 8" — porting TOML machinery for hooks that don't exist yet (Phase 5) is wasted motion (Pitfall 11). The hybrid adapter shape (D-01) means Phase 5/Phase 8 fill specific hooks without orchestrator changes — incremental porting is structurally cheap.

---

## `--all` Runtime Detection Logic

| Option | Description | Selected |
|--------|-------------|----------|
| A. Existence of `~/.<runtime>/` directory | Skip silently if absent; force-create only with explicit single-runtime flag | ✓ |
| B. Existence + writability check | Pre-flight check for write perms before attempting install | |
| C. Prompt user | Interactive yes/no per detected runtime | |

**Claude's choice:** A — Directory existence (D-04, D-05).
**Rationale:** B (writability) gives false-positives across permission setups; C breaks scriptability. Letting an actual install fail loudly on perms is a clearer signal than a pre-flight that paints over the issue. Single-runtime flags (`--claude`, `--codex`, `--gemini`) bypass detection and force-create — covers the "I haven't run that CLI yet" case.

---

## Test Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| A. Unit tests with mocked filesystem | Per adapter, mock `fs` operations | |
| B. Integration tests in temp dirs | One per runtime, `os.tmpdir()`, real fs | |
| C. Both, with tight scope | Per-adapter unit + 1 full-cycle integration per runtime | ✓ |

**Claude's choice:** C — Both, tightly scoped (D-21, D-22, D-23).
**Rationale:** Mocked fs adds a dependency (`mock-fs` or hand-rolled) and obscures real bugs (Pitfall 11 + Phase 2 D-22 precedent: prefer real over mocked). Pure integration leaves descriptor bugs latent. Three layers (adapter unit, library unit, runtime integration) cover the contract surface with ~22 total tests — small enough to honor Pitfall 11.

---

## Claude's Discretion

User delegated all gray-area choices: *"decide what you think is best for all of these grey areas."* Decisions D-01..D-24 in CONTEXT.md reflect Claude's judgment grounded in research, PITFALLS.md, prior CONTEXT.md, and CLAUDE.md tech-stack guidance. The user retains the right to override during planning.

Implementation-detail discretion left to planner / executor:
- Exact `node:util.parseArgs` flag config (long-form vs short forms)
- Exact help-output / success-message / warning-message phrasing (content locked, phrasing not)
- Whether `bin/lib/install.cjs` exposes a single `installRuntime` or splits into `prepare` / `apply` / `finalize`
- Whether `transform*` hooks at Phase 3 are arrow-identity, omitted with orchestrator default, or explicit `(c) => c`
- Snapshot format (inline string vs fixture file) for `renderInstructionBlock` tests
- Order of arg validation checks (subject to D-16 exit codes)

---

## Deferred Ideas

Captured in CONTEXT.md `<deferred>`:
- Real commands/agents/skills/hooks payloads (Phases 4–6)
- Codex `[hooks]` and `[[agents]]` TOML machinery (Phase 5; Phase 4 for AGT-04 sandbox map)
- Codex/Gemini parity transforms (Phase 8)
- Migration from existing GSD/Superpowers installs (Out of Scope; warn-only at Phase 3)
- Windows support (Out of Scope)
- CI workflows + license/state-leak CI checks + `c8` coverage (Phase 10)
- Upgrade detection + version migration (post-v0.1.0)
- `oto install --dry-run` (revisit if user asks)
- Concurrent install lock (defer — single-user scope)
- Dynamic `/oto-*` listing in `oto install --help` (Phase 4 owns `/oto-help`)
