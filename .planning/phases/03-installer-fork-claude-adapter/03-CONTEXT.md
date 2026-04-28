# Phase 3: Installer Fork & Claude Adapter - Context

**Gathered:** 2026-04-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Fork the upstream `bin/install.js` (`foundation-frameworks/get-shit-done-main/bin/install.js`, ~7,755 lines, 11+ runtimes) into oto's real installer with **exactly three** runtimes: Claude Code (locked v0.1.0 happy path), Codex, Gemini CLI. Replace the current Phase 2 stub at `bin/install.js`. Per-runtime adapter modules under `bin/lib/` own all runtime-specific behavior; SC#2 forbids runtime-conditional branches outside those modules.

What Phase 3 ships (real, working code):

1. `bin/install.js` — orchestrator: arg parsing, resolution order, runtime dispatch, copy-files orchestration, marker injection, idempotent re-install, uninstall, `--all` detection.
2. `bin/lib/runtime-claude.cjs`, `runtime-codex.cjs`, `runtime-gemini.cjs` — per-runtime adapter modules (descriptor + lifecycle hooks shape).
3. `bin/lib/` shared library: `args.cjs` (parses with `node:util.parseArgs`), `copy-files.cjs`, `marker.cjs`, `install-state.cjs`, `runtime-detect.cjs`.
4. `oto install --claude --config-dir <dir>` works end-to-end on a real machine: creates dir layout, injects marker block in `CLAUDE.md`, writes `~/.<runtime>/oto/.install.json`, idempotent, uninstall round-trips clean.
5. Tests: per-adapter unit tests + one integration test per runtime that installs into `os.tmpdir()` and asserts contract.

What Phase 3 does **not** ship (explicit out-of-scope, even where upstream has machinery for it):

- Real commands/agents/skills/hooks payload (Phase 4 ports workflows + agents; Phase 5 ports hooks; Phase 6 ports skills). The Phase 3 installer is a complete, working installer that simply has nothing real to copy yet — `oto/commands/`, `oto/agents/`, `oto/skills/`, `oto/hooks/dist/` are empty or absent at Phase 3 close, and the installer tolerates that.
- Codex `[hooks]` and `[[agents]]` TOML machinery (~800 lines in upstream). Phase 5 brings hooks; the Codex adapter's `mergeSettings` is a no-op stub at Phase 3.
- Codex `CODEX_AGENT_SANDBOX` map population — Phase 4 owns it (AGT-04). Phase 3 ships an empty placeholder or omits the symbol entirely.
- Agent-content transforms for Codex/Gemini (Claude → Codex frontmatter, Claude → Gemini tool name remap). Phase 3 stubs return Claude content unchanged with a `// TODO Phase 8 parity` marker; Phase 8 fills them.
- The 11 unwanted runtimes (OpenCode, Kilo, Cursor, Windsurf, Antigravity, Augment, Trae, Qwen, CodeBuddy, Cline, Copilot) and ~5,000 lines of their conversion functions in upstream `install.js`. SC#4: post-fork grep for any of those names in `bin/` returns zero hits.
- Version pinning, upgrade detection, migration from existing GSD/Superpowers installs (Out of Scope per PROJECT.md).
- CI workflows that run install-smoke (Phase 10).

</domain>

<decisions>
## Implementation Decisions

User delegated gray-area choices to Claude (matching the Phase 1 pattern). Decisions below are grounded in: CLAUDE.md tech-stack TL;DR + "Why These Choices" sections, `.planning/research/PITFALLS.md` (esp. Pitfalls 1, 5, 6, 11, 16, 20), prior CONTEXT (Phase 1 D-01..D-23, Phase 2 D-01..D-18), ROADMAP Phase 3 success criteria, and ADR-11 distribution lock-in. Planner should treat these as locked unless explicitly revisited.

### Adapter Shape & Boundary (INS-02, SC#2)

- **D-01:** Adapters are **hybrid: descriptor + lifecycle hooks**. Each `bin/lib/runtime-<name>.cjs` exports a single object with two layers:
  ```
  {
    // --- descriptor (static metadata; read by orchestrator) ---
    name: 'claude' | 'codex' | 'gemini',
    configDirEnvVar: 'CLAUDE_CONFIG_DIR' | 'CODEX_HOME' | 'GEMINI_CONFIG_DIR',
    defaultConfigDirSegment: '.claude' | '.codex' | '.gemini',
    instructionFilename: 'CLAUDE.md' | 'AGENTS.md' | 'GEMINI.md',
    settingsFilename: 'settings.json' | 'config.toml' | 'settings.json',
    settingsFormat: 'json' | 'toml' | 'json',
    sourceDirs: { commands: 'oto/commands', agents: 'oto/agents', skills: 'oto/skills', hooks: 'oto/hooks/dist' },
    targetSubdirs: { commands: 'commands', agents: 'agents', skills: 'skills', hooks: 'hooks' },

    // --- lifecycle hooks (runtime-specific transforms; called by orchestrator) ---
    renderInstructionBlock(opts) -> string,                 // content between OTO Configuration markers
    transformCommand(srcContent, meta) -> string,           // Claude is canonical -> identity for claude; Phase 8 fills others
    transformAgent(srcContent, meta) -> string,             // identity for claude; Phase 8 fills others
    transformSkill(srcContent, meta) -> string,             // identity for claude; Phase 8 fills others
    mergeSettings(existingText, otoBlock) -> string,        // Phase 5 fills hooks; Phase 3 = identity (no-op)
    onPreInstall(ctx) -> void,                              // optional: detect upstream GSD/Superpowers markers, warn
    onPostInstall(ctx) -> void                              // optional: emit runtime-specific success message
  }
  ```
- **D-01 rationale:** Pure-descriptor (option A) leaks runtime-specific transforms back into `install.js` as conditional dispatches; pure-lifecycle (option B) duplicates install flow 3× and risks drift. The hybrid mirrors GSD's existing function-naming pattern (`convertClaudeAgentToCodexAgent`, `generateCodexAgentToml`, `convertClaudeToGeminiTools`) — those functions migrate cleanly into `transform*` hooks on the right adapter. SC#2 is satisfied: `install.js` has zero `if (runtime === 'codex')` branches because every difference is either a descriptor field or a lifecycle hook call.

### `bin/lib/` Library Layout & Module Boundaries (INS-02)

- **D-02:** Shared library files (orchestrator-side, runtime-agnostic):
  - `bin/lib/args.cjs` — flag parsing via `node:util.parseArgs`. Exports `parseArgs(argv)` returning `{action, runtimes, configDir, force, uninstall, purge, verbose, help}`.
  - `bin/lib/runtime-detect.cjs` — `detectPresentRuntimes(homeDir)` returns array of runtime names whose default `~/.<runtime>/` directory exists. Used by `--all`.
  - `bin/lib/copy-files.cjs` — `copyTree(src, dst, opts)`, `removeTree(dst)`, `sha256File(path)`. Uses `fs.cp` (Node 22+) with `recursive: true, force: true, errorOnExist: false`. Tolerates missing source dirs (no-op when source absent — Phase 3 reality).
  - `bin/lib/marker.cjs` — `injectMarkerBlock(filePath, openMarker, closeMarker, body)`, `removeMarkerBlock(filePath, openMarker, closeMarker)`, `findUpstreamMarkers(filePath)` returns array of upstream `<!-- GSD Configuration -->` / `superpowers` markers if present.
  - `bin/lib/install-state.cjs` — `readState(stateFilePath)`, `writeState(stateFilePath, stateObj)`, schema-validates against an inline shape.
  - `bin/lib/install.cjs` — orchestrator core. `installRuntime(adapter, opts)`, `uninstallRuntime(adapter, opts)`. Pure: takes adapter + opts, returns result. `bin/install.js` is the thin CLI shell that parses args and dispatches.
- **D-02 rationale:** Mirrors CLAUDE.md "Stack Patterns" precedent (`oto/bin/lib/*.cjs`) and the Phase 2 `scripts/rebrand/lib/*.cjs` factoring. Each module independently `node:test`-able. `install.js` becomes a thin shell (~100 lines), all logic is in libraries. Pitfall 11 (rigor inflation) honored: zero deps, all primitives are Node 22+ built-ins (`fs/promises`, `node:fs.cp`, `node:util.parseArgs`, `node:crypto`).

### Resolution Order & `--all` Detection (INS-03, INS-06, SC#3)

- **D-03:** Config-dir resolution implemented **once** in `args.cjs` — `resolveConfigDir(adapter, flags, env)`:
  1. If `flags.configDir` is set (from `--config-dir <path>`), use it. Win.
  2. Else if `env[adapter.configDirEnvVar]` is set, use it.
  3. Else use `path.join(os.homedir(), adapter.defaultConfigDirSegment)`.

  Adapters supply only the env var name and default segment; no adapter implements its own resolver. Tested as a single unit with all three adapters as fixtures.
- **D-04:** `oto install --all` calls `runtime-detect.cjs::detectPresentRuntimes(os.homedir())` which checks **directory existence only** (`fs.statSync(path).isDirectory()`) for `~/.claude`, `~/.codex`, `~/.gemini`. Skips any absent. Logs which runtimes are being targeted. Does NOT prompt, does NOT check writability ahead of time (let the install fail loudly if perms wrong — clearer signal than a pre-flight that gives a false-positive).
- **D-05:** Single-runtime flags (`--claude`, `--codex`, `--gemini`) force-target that runtime regardless of presence detection — they create the config dir if absent (`fs.mkdir(..., { recursive: true })`). Resolution order still applies for the actual target path.
- **D-06:** Multiple single-runtime flags can be combined (`oto install --claude --codex`) — installs to both. Implementation: arg parser collects them into `flags.runtimes: string[]`. `--all` is sugar for "all detected." Mutually-exclusive validation only between `--all` and explicit single-runtime flags.

### Phase 3 Install Payload Scope (INS-04, SC#1)

- **D-07:** Phase 3 ships **scaffolding-only payload** with **real plumbing**. The installer is fully functional but reads from empty (or absent) source directories.
  - At Phase 3 close: `oto/commands/`, `oto/agents/`, `oto/skills/`, `oto/hooks/dist/` are absent or contain only `.gitkeep`. The installer tolerates absent source dirs without erroring.
  - When an adapter's `sourceDirs.commands` is missing or empty, `copy-files.cjs::copyTree` returns `{ filesCopied: 0 }` and the installer continues. No special-case logic in `install.js` — the orchestrator iterates `sourceDirs` and copies whatever's there.
  - Phase 4 fills `oto/commands/` and `oto/agents/`; Phase 5 fills `oto/hooks/`; Phase 6 fills `oto/skills/`. Each subsequent phase changes the **content** of those dirs, not the installer code.
- **D-07 rationale:** Pitfall 11 (no premature rigor): no need for fixture payloads or stub commands at Phase 3 — the integration test asserts the installer contract (marker injected, state file written, exit clean), not that real commands are present. Decoupling installer plumbing from payload landing eliminates a re-fork at Phase 4. SC#1's "install marker present at expected path" is satisfied without any commands being copied.

### Install Marker — Dual-Source-of-Truth (SC#1, FND-04 stability)

- **D-08:** Two markers cooperatively define an install:
  - **Instruction-file marker block** (in `~/.<runtime>/CLAUDE.md` or `AGENTS.md` or `GEMINI.md`):
    ```
    <!-- OTO Configuration -->
    [adapter-rendered body content]
    <!-- /OTO Configuration -->
    ```
    Open marker = `<!-- OTO Configuration -->`, close marker = `<!-- /OTO Configuration -->`. Body content comes from `adapter.renderInstructionBlock(ctx)`. Block is bracketed so re-install replaces only what's between markers (Pitfall 1 line: "rule-typed precision" — marker logic is its own rule).
  - **Install state file**: `<configDir>/oto/.install.json`. Single oto-namespaced subdir under each runtime config dir; everything oto writes lives under it OR under conventional runtime subdirs (commands/, agents/, etc.) — files in conventional subdirs are tracked in the state file's `files[]` array so uninstall can find them. Schema:
    ```
    {
      "version": 1,
      "oto_version": "0.1.0-alpha.X",
      "installed_at": "ISO-8601",
      "runtime": "claude",
      "config_dir": "/Users/x/.claude",
      "files": [
        { "path": "commands/oto-help.md", "sha256": "..." }
      ],
      "instruction_file": {
        "path": "CLAUDE.md",
        "open_marker": "<!-- OTO Configuration -->",
        "close_marker": "<!-- /OTO Configuration -->"
      }
    }
    ```
- **D-08 rationale:** Single marker is insufficient. The instruction-file block tells the LLM that oto exists; the state file gives the installer a manifest for clean uninstall (Pitfall 6 license preservation extends here — never rm files we didn't put). Two markers means re-install can detect a partial install and recover. CLAUDE.md project-doc already references "wraps oto's instruction injection between `<!-- OTO Configuration -->` markers" — D-08 makes that concrete.

### Idempotent Re-Install & Uninstall (SC#1)

- **D-09:** Install lifecycle (each adapter, orchestrated by `install.cjs`):
  1. Resolve config dir (D-03).
  2. Read existing `<configDir>/oto/.install.json` if present — call this `priorState`.
  3. `adapter.onPreInstall(ctx)` — optional warn on upstream GSD/Superpowers markers detected by `marker.cjs::findUpstreamMarkers`. Warn only, do not abort (PROJECT.md "no migration"; clean-slate assumed; markers are namespaced distinctly).
  4. For each `(srcKey, srcPath) in adapter.sourceDirs`: call `copy-files.cjs::copyTree(srcPath, path.join(configDir, adapter.targetSubdirs[srcKey]))`. Tolerates missing source.
  5. Apply `adapter.transform*` to each copied file's content as it's written (functional pipeline; Claude adapter = identity for all transforms at Phase 3).
  6. Hash each written file with `sha256File`; accumulate into new `state.files[]`.
  7. Diff `priorState.files` vs `newState.files` — delete any file in priorState that's not in newState (handles renames/removals across upgrades).
  8. Render and inject instruction block via `marker.cjs::injectMarkerBlock`. Replaces existing block if present (idempotent).
  9. `adapter.mergeSettings(existingText, otoBlock)` — Phase 5 fills, Phase 3 returns existingText unchanged.
  10. Write `<configDir>/oto/.install.json` last (commit point).
  11. `adapter.onPostInstall(ctx)` — emit success message.
- **D-10:** Uninstall lifecycle:
  1. Read `<configDir>/oto/.install.json`. If missing, exit 0 with "no install found" (idempotent uninstall).
  2. For each `state.files[i]`: `fs.rm(path.join(configDir, file.path), { force: true })`.
  3. `marker.cjs::removeMarkerBlock(state.instruction_file.path, ...)` — strips the OTO Configuration block, leaves rest of file intact.
  4. Reverse `mergeSettings` if Phase 5 added settings entries (Phase 3 = no-op).
  5. `fs.rm(path.join(configDir, 'oto'), { recursive: true, force: true })` — removes the oto-namespaced subdir (and the state file with it).
  6. `--purge` flag additionally removes any `oto-*` files in conventional subdirs that weren't in `state.files[]` (defensive: handles stale-state edge case).
- **D-11:** Re-install over existing install: just runs install again. Step 7 (file diff) handles deletions. Idempotent by construction. No `--upgrade` flag needed.

### Codex / Gemini Phase 3 Depth (INS-05, SC#5, MR-01)

- **D-12:** Codex and Gemini adapters at Phase 3 ship **minimum-viable parity**:
  - Full descriptor populated (paths, env vars, instruction filenames).
  - Full lifecycle hooks present, but transforms are identity (`return srcContent`) with `// TODO Phase 8: parity transform` markers.
  - `mergeSettings` is identity at Phase 3 (no hooks yet). The TOML-manipulation suite (~800 lines in upstream `install.js`: `parseTomlBracketHeader`, `getTomlLineRecords`, `stripCodexHooksFeatureAssignments`, etc.) is **not** ported at Phase 3. Phase 5 ports it as a single `bin/lib/codex-toml.cjs` library that the Codex adapter's `mergeSettings` calls.
  - Marker injection works (instruction-file block) — same code path as Claude.
  - State file written — same code path as Claude.
- **D-13:** `oto install --codex` and `oto install --gemini` succeed on Phase 3 close: dirs created, marker injected in `AGENTS.md`/`GEMINI.md`, state file written, no commands/agents/hooks copied (because none exist yet). Documented as "best-effort until Phase 8" in `oto install --help` output.
- **D-12/D-13 rationale:** MR-01 (Claude daily-use stable before parity). Pitfall 11 (rigor inflation) — porting Codex TOML and Gemini tool-name maps before there's anything to register/remap is wasted motion. The hybrid adapter shape (D-01) means Phase 5 and Phase 8 only need to fill specific hook implementations; orchestrator code doesn't change.

### `bin/install.js` Shell & Help Output (INS-01)

- **D-14:** `bin/install.js` is the user-facing CLI shell — replaces the Phase 2 stub:
  ```
  #!/usr/bin/env node
  'use strict';
  const args = require('./lib/args.cjs').parseArgs(process.argv.slice(2));
  if (args.help) { /* print help, exit 0 */ }
  // dispatch to install/uninstall in lib/install.cjs
  ```
  No business logic. ~100 lines max.
- **D-15:** Help output (printed by `--help`, also when no flags given). Documents:
  - `oto install --claude [--config-dir <dir>]` — install for Claude Code (v0.1.0 happy path)
  - `oto install --codex [--config-dir <dir>]` — install for Codex (best-effort until Phase 8)
  - `oto install --gemini [--config-dir <dir>]` — install for Gemini CLI (best-effort until Phase 8)
  - `oto install --all` — install to all detected runtimes
  - `oto uninstall --claude` (etc.) — symmetric uninstall
  - `oto uninstall --all --purge` — remove from every runtime, including stale files
  - Resolution order: `--config-dir` flag → `<RUNTIME>_CONFIG_DIR` env → `~/.<runtime>/`
  - Repo URL + version
- **D-16:** Exit codes: `0` success, `1` install error, `2` uninstall error, `3` invalid args / arg conflict, `4` `--all` found no present runtimes. Beyond that Claude's discretion. Errors print to stderr; success messages to stdout (so install scripts can pipe stdout cleanly).

### 11 Unwanted Runtime Removal (SC#4)

- **D-17:** The fork of upstream `bin/install.js` is **not** an incremental edit — it's a **re-implementation** in oto's adapter shape (D-01) keeping only the install primitives that have parallels (resolution order, copy-files, marker injection, state tracking, settings merge stub). The 7,755-line upstream is **reference**, not seed code. This avoids the "still has 11 runtime branches lying dormant" trap that an incremental trim would create.
- **D-18:** Post-fork verification (lands as a Phase 3 test):
  - `grep -i -E "(opencode|kilo|cursor|windsurf|antigravity|augment|trae|qwen|codebuddy|cline|copilot)" bin/ scripts/install*` returns zero hits (excluding `foundation-frameworks/`, license/attribution files, and the test itself).
  - Phase 3 ports the rebrand engine's coverage manifest pattern (Phase 2 D-05) to enforce this — adds the 11 unwanted runtime names to a "must not appear" string list.
- **D-17/D-18 rationale:** Pitfall 1 (substring collision and dormant branches). Re-implementation is cheaper than incremental trim because the adapter shape (D-01) is structurally simpler than upstream's monolithic `install.js`; copy-by-reference is the wrong primitive when the structural target differs.

### Files Allowlist & Distribution (FND-02)

- **D-19:** `package.json` `files` array currently lists `bin/`. That covers `bin/lib/` recursively — confirmed. No change needed beyond Phase 2's allowlist.
- **D-20:** `bin/install.js` retains executable bit; `bin/lib/*.cjs` are required modules and don't need executable bit. Phase 2's CI smoke (Phase 10 will lift it) catches the mode-644 trap on tarball install — `bin/install.js` permission tested under `install-smoke.cjs`.

### Test Strategy (cross-cutting)

- **D-21:** Three test layers, all `node --test` with `.test.cjs` suffix per Phase 1 convention:
  - **Unit** (~10 fast tests per adapter): `tests/phase-03-runtime-claude.test.cjs`, `phase-03-runtime-codex.test.cjs`, `phase-03-runtime-gemini.test.cjs`. Cover descriptor shape, transform hooks (identity for Phase 3), `renderInstructionBlock` output stability via snapshot.
  - **Library unit** (~6 tests): `phase-03-args.test.cjs` (resolution order all 3 paths, `--all` flag, conflict detection), `phase-03-marker.test.cjs` (inject / remove / replace block, idempotency, multiple-block detection), `phase-03-install-state.test.cjs` (read / write / round-trip / schema rejection).
  - **Integration** (1 per runtime, 3 total): `phase-03-install-claude.integration.test.cjs` etc. Each:
    1. Creates `os.tmpdir()/oto-install-test-<random>/` as fake config dir.
    2. Calls `installRuntime(adapter, { configDir, ... })`.
    3. Asserts marker block present in instruction file, state file present + parses, file count from `state.files[]` matches actual filesystem (zero at Phase 3, but plumbing tested).
    4. Re-runs install — asserts byte-for-byte identical state, no duplicate marker block.
    5. Calls `uninstallRuntime(adapter, ...)` — asserts instruction file restored to pre-install content, state file gone, oto-namespaced subdir gone.
- **D-22:** No mock filesystems — use real `os.tmpdir()` per Pitfall 11 ("zero deps, prefer real over mocked"). Tests clean up their own tmpdirs via `t.after()` hooks (`node:test` built-in).
- **D-23:** Phase 2's `scripts/install-smoke.cjs` is **extended** (not replaced) to additionally invoke `oto install --claude --config-dir <tmp-isolated>` after the global install, asserting the live remote produces a working install. Lives at `scripts/install-smoke.cjs`. Manual run only at Phase 3; Phase 10 promotes to CI.

### Pre-Existing-Install Detection (defensive)

- **D-24:** Adapter's `onPreInstall(ctx)` calls `marker.cjs::findUpstreamMarkers(instructionFilePath)`. If `<!-- GSD Configuration -->` or `superpowers` identity markers found in the same instruction file, **warn** to stderr ("upstream GSD/Superpowers configuration block detected in <file>; oto installs alongside but does not migrate — remove manually if conflicts arise") and proceed. Do not abort.
- **D-24 rationale:** PROJECT.md "Out of Scope: Migration from existing GSD/Superpowers installs" plus clean-slate assumption. Marker namespaces are distinct (`<!-- OTO Configuration -->` vs `<!-- GSD Configuration -->`) — coexistence is technically safe. Aborting would force an out-of-scope migration UX. Warning preserves user awareness without imposing migration.

### Claude's Discretion

The user delegated all Phase 3 gray-area choices. Decisions D-01..D-24 reflect Claude's judgment grounded in research, PITFALLS.md, prior CONTEXT.md, and CLAUDE.md tech-stack guidance. The following implementation details are left to the planner / executor:

- Exact `node:util.parseArgs` flag config (long-form-only vs allowing `-c` short flags, etc.) — D-15 lists user-visible flags but short forms are flexible.
- Exact wording of help output, success messages, warning messages — content is locked, phrasing is not.
- Whether `bin/lib/install.cjs` exposes a single `installRuntime` function or splits into `prepareInstall` / `applyInstall` / `finalizeInstall` — implementation choice.
- Whether `transform*` hooks at Phase 3 are arrow functions returning the identity, omitted (with orchestrator defaulting to identity if missing), or explicit `(content) => content`. Style choice.
- Snapshot format for `renderInstructionBlock` tests — inline string vs `tests/fixtures/phase-03/*.md`. Either fine.
- Order of arg validation checks (mutual exclusion of `--all` + explicit runtime flags, conflicting `--config-dir` with `--all`, etc.) — Claude's discretion subject to D-16 exit codes.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project intent and scope
- `.planning/PROJECT.md` — Vision, "Out of Scope" (esp. "Migration from existing GSD/Superpowers installs", "Windows support"), key decisions, personal-use cost ceiling
- `.planning/REQUIREMENTS.md` — All 100 v1 requirements; Phase 3 maps to INS-01..06 exactly (no other requirements)
- `.planning/STATE.md` — Current project position, Phase 1 + Phase 2 complete; blockers (Pitfall 11 personal-use rigor inflation, MR-01 Claude-stable-before-parity gate)
- `CLAUDE.md` — Tech-stack TL;DR + "Why These Choices" §1–7 + "What NOT to Use" + "Stack Patterns by Variant"; the prescription is opinionated and Phase 3 must honor it (esp. Node 22+ CJS, no top-level TS, zero deps, `node:test`)
- `.planning/ROADMAP.md` §"Phase 3: Installer Fork & Claude Adapter" — Five concrete success criteria (INS-01..06 lineage); every D-NN traces back to one or more

### Phase 1 ADRs (locked)
- `decisions/ADR-01-state-root.md` — `.oto/` (informs marker namespace + state file location D-08)
- `decisions/ADR-02-env-var-prefix.md` — `OTO_*` env vars; runtime-detection vars (`CLAUDE_CONFIG_DIR`, `CODEX_HOME`, `GEMINI_CONFIG_DIR`) on do-not-rename allowlist; consumed in D-03 resolver
- `decisions/ADR-03-skill-vs-command.md` — Skill-vs-command routing; informs what gets copied where (Phase 3 plumbing)
- `decisions/ADR-04-sessionstart.md` — Single SessionStart hook contract; Phase 3 stubs `mergeSettings` (D-12); Phase 5 fills it
- `decisions/ADR-07-agent-trim.md` — 23 retained agents (Phase 3 doesn't port them, but adapter shape must accommodate)
- `decisions/ADR-11-distribution.md` — Bin = `oto`, install URL `github:OTOJulian/...`, no SDK bin (informs `bin/install.js` shell shape D-14)
- `decisions/ADR-12-sdk-strategy.md` — SDK deferred (no `oto-sdk` bin in Phase 3)
- `decisions/ADR-13-license-attribution.md` — `LICENSE` + `THIRD-PARTY-LICENSES.md` allowlist mechanics (installer must not touch these in copy-files passes)
- `decisions/ADR-14-inventory-scope.md` — Inventory `verdict` field drives Phase 4 ports; Phase 3 installer doesn't filter by verdict (it's just plumbing)

### Phase 2 outputs consumed by Phase 3
- `bin/install.js` (Phase 2 stub at /Users/Julian/Desktop/oto-hybrid-framework/bin/install.js, 304 bytes) — replaced wholesale in Phase 3 per D-14
- `package.json` — `bin: { oto: 'bin/install.js' }` declaration is unchanged; `files` allowlist already covers `bin/lib/` recursively (D-19)
- `scripts/build-hooks.js` — runs in `postinstall` lifecycle; Phase 3 installer **does not** invoke it (build-hooks runs at npm-install time on the user's machine, populating `hooks/dist/`; the installer reads from `hooks/dist/` not `hooks/`). At Phase 3 `hooks/` is empty so `hooks/dist/` is also empty.
- `scripts/install-smoke.cjs` — extended (D-23) with a post-install `oto install --claude --config-dir <tmp>` invocation
- `scripts/rebrand/` — not consumed by installer at runtime (the rebrand engine and the installer are independent components per ARCHITECTURE.md)
- `tests/` — Phase 1 + Phase 2 patterns: `node:test`, `.test.cjs` suffix, hand-rolled assertions, `os.tmpdir()` fixtures

### Research artifacts (HIGH confidence, dated 2026-04-27)
- `.planning/research/SUMMARY.md` — Stack guidance, build-order, runtime parity expectations
- `.planning/research/STACK.md` — Node 22 + CJS + zero deps + `node:test` (read alongside CLAUDE.md)
- `.planning/research/PITFALLS.md` — Phase 3 must address: **Pitfall 1** (rule-typed precision — D-17 re-impl over incremental trim, D-18 grep verification), **Pitfall 5** (`postinstall` not `prepublishOnly` — Phase 2 settled, no Phase 3 surface), **Pitfall 6** (license preservation — installer never touches `LICENSE`/`THIRD-PARTY-LICENSES.md`), **Pitfall 8** (hook ordering — D-12 defers TOML hook merge to Phase 5), **Pitfall 9** (state systems leak — D-08 dual-marker contains oto state to its namespaced subdir), **Pitfall 11** (rigor inflation — D-02 zero deps, D-12 minimum-viable Codex/Gemini, D-21 small test surface), **Pitfall 16** (bin collision — D-14 single `oto` bin per ADR-11), **Pitfall 21** (agent collision — Phase 4 owns; Phase 3 installer is collision-agnostic)
- `.planning/research/ARCHITECTURE.md` — Option A (GSD spine + Superpowers skills); Phase 3 installer fits the "installer / runtime adapters" component
- `.planning/research/FEATURES.md` — Feature inventory; informational only for Phase 3 (Phase 4+ port from this list)

### Upstream sources (preserved, do-not-rebrand — read for fork reference)
- `foundation-frameworks/get-shit-done-main/bin/install.js` (7,755 lines) — Reference for D-17 re-impl. Specifically:
  - Lines 81–106: arg-parsing pattern (oto's `args.cjs` mirrors structure, drops 11 unwanted runtimes)
  - Lines 171–278: `getDirName` / `getConfigDirFromHome` / `getGlobalDir` — resolution-order pattern; oto's `resolveConfigDir` (D-03) condenses this
  - Lines 437–460: `parseConfigDirArg` — adopted in oto's `args.cjs`
  - Lines 479–521: `expandTilde` + `buildHookCommand` — `expandTilde` adopted; `buildHookCommand` deferred to Phase 5
  - Lines 543–629: `stripJsonComments` / `readSettings` / `writeSettings` — adopted into `bin/lib/install-state.cjs` reading pattern (Pitfall 11: don't add `jsonc-parser`; hand-roll comment stripping)
  - Lines 1877–2965: Codex-specific TOML machinery — **NOT ported in Phase 3**; Phase 5 ports as `bin/lib/codex-toml.cjs`
  - Lines 1218–1454: Antigravity / Cursor conversion machinery — **dropped entirely** per D-17
- `foundation-frameworks/get-shit-done-main/get-shit-done/bin/lib/` — pattern source for `bin/lib/*.cjs` factoring (each module independently testable, exports plain functions, no DI framework)
- `foundation-frameworks/get-shit-done-main/scripts/run-tests.cjs` — `node --test --test-concurrency=4` invocation pattern (already adopted in Phase 1/2 tests)

### Phase 1 inventory (consumed by Phase 4, informational here)
- `decisions/file-inventory.json` — Per-file `verdict` + `file_class`. Phase 3 installer is `verdict`-agnostic — it copies whatever's in `oto/commands/`, `oto/agents/`, etc. Phase 4 uses inventory to decide what lands in those source dirs.
- `rename-map.json` — Engine input, not consumed by installer at runtime.

### Phase 3 deliverables (what Phase 3 produces; for downstream phases)
- `bin/install.js` (real CLI shell) → unchanged in Phase 4+; only its inputs change
- `bin/lib/runtime-claude.cjs` / `runtime-codex.cjs` / `runtime-gemini.cjs` → Phase 4 fills `transformAgent` for Codex; Phase 8 fills `transformAgent`/`transformCommand` for Gemini parity
- `bin/lib/install.cjs` (orchestrator) → unchanged in Phase 4+
- `bin/lib/copy-files.cjs` / `marker.cjs` / `install-state.cjs` / `args.cjs` / `runtime-detect.cjs` → unchanged in Phase 4+
- `tests/phase-03-*.test.cjs` → maintained alongside; Phase 5 adds `mergeSettings` tests, Phase 8 adds parity transform tests
- `scripts/install-smoke.cjs` (extended) → Phase 10 promotes to CI workflow (`install-smoke.yml`)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **`bin/install.js` (Phase 2 stub, 304 bytes)** — Replaced wholesale in Phase 3 per D-14. Stub already proves the bin entrypoint works on tarball install (Phase 2 SC#2). Phase 3 keeps the shebang + `'use strict';` pattern.
- **`package.json` `files` allowlist** — Already includes `bin/`, which transitively covers `bin/lib/`. Phase 3 needs no `package.json` changes (D-19).
- **`scripts/install-smoke.cjs`** — Phase 2 ships this as a live-remote install verification harness; Phase 3 extends it with a post-install `oto install --claude --config-dir <tmp>` invocation per D-23. Single-script edit, no new file.
- **`scripts/rebrand/lib/*.cjs` factoring (Phase 2)** — Direct precedent for `bin/lib/*.cjs` factoring (D-02): each module is independently `node:test`-able, exports plain functions, zero dependency injection.
- **`tests/` `node:test` conventions (Phase 1+2)** — `.test.cjs` suffix, hand-rolled assertions, `os.tmpdir()` for filesystem fixtures, `t.after()` cleanup. Phase 3 tests follow exactly.
- **`upstream install.js` arg-parsing pattern** — Lines 81–106 in `foundation-frameworks/get-shit-done-main/bin/install.js` provide the reference shape for `bin/lib/args.cjs`; oto adapts using `node:util.parseArgs` instead of upstream's hand-roll.
- **`upstream install.js` resolution-order pattern** — Lines 171–460 (multiple functions) consolidate into oto's single `resolveConfigDir(adapter, flags, env)` per D-03.
- **`upstream install.js` settings-read/strip-comments pattern** — Lines 543–629 adopted into `bin/lib/install-state.cjs` reading pattern (per Pitfall 11: keep zero-dep, hand-roll JSON-with-comments stripping if any settings file ever uses comments; not needed at Phase 3 since `mergeSettings` is no-op).

### Established Patterns (carry forward)

- **`#!/usr/bin/env node` + `'use strict';` at top of every CJS bin/script** — Phase 1+2 pattern; Phase 3 honors.
- **CJS-only top-level** — every Phase 3 file is `.cjs` (or `.js` with `require()`). No `import`. CLAUDE.md TL;DR locks this.
- **Hand-rolled JSON Schema validation** — Phase 2 D-16 set the precedent (no `ajv`); Phase 3 `install-state.cjs` validates the state file shape inline.
- **`node:util.parseArgs` for CLI argument parsing** — zero-dep, Node 22+; replaces upstream's hand-rolled arg loop.
- **`fs.cp` recursive copy** — Node 22+ built-in; replaces upstream's recursive copy helpers. `node:fs.glob` available if needed (Phase 2 D-15 same primitive).
- **`os.tmpdir()` for integration test fixtures** — Phase 2 round-trip mode used the same per Phase 2 D-07; tests clean up via `t.after()`.
- **Markdown report generated from JSON source-of-truth** — Phase 1 file-inventory + Phase 2 rebrand reports follow this; Phase 3 state file is JSON-only (no human-facing markdown report needed at Phase 3).
- **Single-line summary at end of run** — Phase 2 specific (`engine: <mode> — ...`); Phase 3 installer should emit one final line per runtime (`installed: <runtime> — <files> files copied, marker injected, state at <path>`).

### Integration Points (downstream phase consumption)

- **Phase 3 → Phase 4**: Phase 4 fills `oto/commands/`, `oto/agents/` (and runs the rebrand engine to produce them). Phase 3 installer reads from those dirs; no installer changes. Phase 4 also adds `CODEX_AGENT_SANDBOX` config — extends the Codex adapter's descriptor with a `agentSandboxes` field; orchestrator passes it to settings merge.
- **Phase 3 → Phase 5**: Phase 5 fills `oto/hooks/` (the `postinstall` `build-hooks.js` then populates `hooks/dist/`). Phase 5 also fills the Codex adapter's `mergeSettings` with real TOML manipulation (ports the upstream lines 2168–2965 carve into `bin/lib/codex-toml.cjs`). Claude/Gemini `mergeSettings` adapt analogous JSON manipulations.
- **Phase 3 → Phase 6**: Phase 6 fills `oto/skills/`. Same plumbing.
- **Phase 3 → Phase 8**: Phase 8 fills `transform*` hooks (Codex agent frontmatter, Gemini tool-name remap). Adapter shape (D-01) means `bin/install.js` doesn't change.
- **Phase 3 → Phase 9**: Upstream sync pipeline doesn't depend on installer; orthogonal.
- **Phase 3 → Phase 10**: CI extends `scripts/install-smoke.cjs` into a `install-smoke.yml` workflow; `release.yml` does tag-triggered GitHub Release. Phase 10 also adds the SC#4 grep check (no unwanted runtime names) as a CI test.

</code_context>

<specifics>
## Specific Ideas

- The Phase 3 installer's success message should be a single deterministic line per runtime: `installed: claude — 0 files copied, marker injected, state at /Users/x/.claude/oto/.install.json`. Makes regressions obvious in CI logs and integration tests can grep on the prefix.
- `bin/install.js` should refuse to run if Node < 22 with a clear message (`node --version` check at top, before any `require`). `engines.node` in `package.json` is advisory; npm warns but doesn't enforce. The installer enforces.
- `--config-dir` value is normalized via `path.resolve(value)` so relative paths work predictably. Tilde expansion (`~/foo`) handled by `expandTilde` helper adapted from upstream lines 479–495.
- Marker block content should be **stable across re-installs** when `oto_version` is unchanged — content depends only on `oto_version` + adapter descriptor. Tests pin this via snapshot. Avoids spurious "marker changed" diffs in user-managed instruction files.
- `state.files[]` paths are **relative to configDir**, never absolute. Makes `.install.json` portable across machines (e.g., for support/debug — user can paste their state file without leaking paths).
- SHA-256 hashing of every copied file is overkill for Phase 3 with zero files. Keep the code path live anyway — Phase 4 lights it up with real files. Cost: ~5 lines.
- The Phase 3 integration tests run in `--test-concurrency=4` mode and use unique `os.tmpdir()/oto-install-test-<random>/` paths so concurrent test runs don't collide on a shared tmpdir.
- `oto install --all` with `--config-dir` is rejected at arg-parse time (exit 3) — `--config-dir` is single-target. `--all` users want the convention path; explicit `--config-dir` users want one runtime.
- The `findUpstreamMarkers` helper (D-24) should also detect the inverse: an oto install on a machine that previously had GSD installed and uninstalled but left stale marker comments. Just a string scan in the instruction file; cheap.
- Per Pitfall 11, Phase 3 should resist: a logger library (use `console.log` / `console.error`), a CLI parsing library beyond `node:util.parseArgs`, a TOML library (Phase 5 hand-rolls — see upstream lines 2168+ as reference), an assertion library beyond `node:test`'s `assert`, a snapshot-test library (inline strings or fixture files).
- The arg-parser's `--help` output should fit in a 80-column terminal without wrapping to a second screen. Roughly 30 lines is the budget. If help output grows beyond that in later phases, split into `oto --help` (top-level) vs `oto install --help` (subcommand).

</specifics>

<deferred>
## Deferred Ideas

- **Real commands/agents/skills/hooks payload** (`oto/commands/`, `oto/agents/`, `oto/skills/`, `oto/hooks/`) — Phase 4 (commands+agents), Phase 5 (hooks), Phase 6 (skills). Phase 3 installer plumbing reads from these dirs but tolerates them being empty/absent.
- **Codex `[hooks]` and `[[agents]]` TOML machinery** — Phase 5 (hooks merge), Phase 4 (agent sandbox map / AGT-04). Ported into `bin/lib/codex-toml.cjs` from upstream lines 2168–2965.
- **Codex `transformAgent` (Claude → Codex frontmatter conversion)** — Phase 4 (agents land) or Phase 8 (parity hardening). Phase 3 stub returns Claude content unchanged.
- **Gemini `transformAgent` / `transformCommand` (Claude → Gemini tool-name remap)** — Phase 8 parity. Phase 3 stubs.
- **Migration from existing GSD/Superpowers installs** — Out of Scope per PROJECT.md. Phase 3 only warns on detection (D-24).
- **Windows support** — Out of Scope. Phase 3 uses POSIX path conventions; `path.sep` will work on Windows but the integration tests, hook commands (Phase 5), and `expandTilde` are POSIX-tuned.
- **CI workflows** (`install-smoke.yml`, `test.yml`, `release.yml`) — Phase 10. Phase 3 ships local `scripts/install-smoke.cjs` only.
- **License-attribution and state-leak CI checks** — Phase 10.
- **Coverage tool (`c8`) for installer** — Phase 10 unless TDD demands during execute. Per Phase 2 D-18 and Pitfall 11.
- **Upgrade detection + version migration** — Out of Scope for v0.1.0. `oto install` over an existing install is treated as re-install (D-11); semver migrations land if/when they matter post-v0.1.0.
- **`oto install --dry-run`** — could be a useful addition (mirrors rebrand engine D-02), but not in any v1 requirement. Defer; revisit if user asks.
- **Concurrent install lock** (e.g., file lock on `<configDir>/oto/.install.json` to prevent two parallel `oto install` racing) — single-user personal-use scope; defer.
- **Help command dynamic listing of `/oto-*` commands** — Phase 4 owns `/oto-help`; Phase 3 `oto install --help` is static text only.

### Reviewed Todos (not folded)

None — `gsd-tools.cjs todo match-phase 3` returned 0 matches.

</deferred>

---

*Phase: 03-installer-fork-claude-adapter*
*Context gathered: 2026-04-28*
