# Phase 3: Installer Fork & Claude Adapter — Research

**Researched:** 2026-04-28
**Domain:** Node.js CLI installer; multi-runtime adapter pattern; idempotent file-copy + marker-injection install lifecycle
**Confidence:** HIGH

## Summary

Phase 3 forks upstream `bin/install.js` (7,755 lines, 14 runtimes) into oto's real installer keeping exactly three runtimes (Claude / Codex / Gemini), with Claude as the v0.1.0 happy path. CONTEXT.md has already locked the architecturally-significant decisions (D-01..D-24) — research must validate those decisions against upstream code, surface concrete `file:line` references the planner can cite, and identify ports/pitfalls/test-strategy details.

**Three things make this phase tractable:**
1. The existing `bin/install.js` is a Phase 2 stub (304 bytes) — this is a wholesale replacement, not a refactor. The upstream is **reference**, not seed code (D-17).
2. The hybrid descriptor + lifecycle-hook adapter shape (D-01) maps cleanly onto upstream's existing function-naming pattern (`convertClaudeAgentToCodexAgent`, `generateCodexAgentToml`, `mergeCopilotInstructions`) — those functions migrate into per-adapter `transform*` / `mergeSettings` hooks.
3. The Phase 3 install payload is **scaffolding only** (D-07): `oto/commands/`, `oto/agents/`, `oto/skills/`, `oto/hooks/dist/` are empty/absent at Phase 3 close. The installer plumbing is fully tested but copies zero files. Phase 4–6 fill those source dirs without re-touching installer code.

**Primary recommendation:** Build the orchestrator in `bin/lib/install.cjs` as a pure function `installRuntime(adapter, opts)` that receives a runtime-agnostic adapter and an options object. `bin/install.js` is a ~100-line shell that parses args via `node:util.parseArgs` and dispatches. Every runtime difference lives behind the adapter contract. Use Node 22+ built-ins exclusively (`fs.cp`, `fs/promises`, `node:util.parseArgs`, `node:crypto`, `node:test`) — zero deps, per Pitfall 11 and CLAUDE.md.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Adapter Shape & Boundary**
- **D-01:** Adapters are hybrid descriptor + lifecycle hooks. Each `bin/lib/runtime-<name>.cjs` exports a single object combining static metadata (name, env vars, default segment, instruction filename, settings filename + format, source/target dir maps) and lifecycle hooks (`renderInstructionBlock`, `transformCommand`, `transformAgent`, `transformSkill`, `mergeSettings`, `onPreInstall`, `onPostInstall`). Pure-descriptor and pure-lifecycle alternatives rejected.

**Library Layout**
- **D-02:** `bin/lib/` modules: `args.cjs`, `runtime-detect.cjs`, `copy-files.cjs`, `marker.cjs`, `install-state.cjs`, `install.cjs` (orchestrator). All zero-dep, all `node:test`-able. `bin/install.js` is a thin shell (~100 lines).

**Resolution Order & --all Detection**
- **D-03:** Single `resolveConfigDir(adapter, flags, env)` in `args.cjs`: `--config-dir` flag wins, then `env[adapter.configDirEnvVar]`, then `path.join(homedir, adapter.defaultConfigDirSegment)`. No per-adapter resolver.
- **D-04:** `--all` calls `runtime-detect.cjs::detectPresentRuntimes(homeDir)` — directory existence only via `fs.statSync(...).isDirectory()`. Skips absent. No writability pre-check.
- **D-05:** Single-runtime flags force-create config dir if absent (`fs.mkdir(..., { recursive: true })`).
- **D-06:** Single-runtime flags combinable. `--all` is sugar for "all detected." `--all` mutually-exclusive with explicit single-runtime flags.

**Install Payload Scope**
- **D-07:** Phase 3 ships scaffolding-only payload with real plumbing. `oto/commands/`, `oto/agents/`, `oto/skills/`, `oto/hooks/dist/` absent or `.gitkeep`. Installer tolerates absent source dirs (`copyTree` returns `{ filesCopied: 0 }`). No special-case logic.

**Install Marker — Dual-Source-of-Truth**
- **D-08:** Two markers cooperatively define an install:
  - Instruction-file marker block: `<!-- OTO Configuration -->` … `<!-- /OTO Configuration -->` in the runtime's instruction file (`CLAUDE.md` / `AGENTS.md` / `GEMINI.md`).
  - Install state file: `<configDir>/oto/.install.json` with `{version, oto_version, installed_at, runtime, config_dir, files: [{path, sha256}], instruction_file: {path, open_marker, close_marker}}`. Paths in `files[]` are **relative to configDir** (portable across machines).

**Idempotent Re-Install & Uninstall**
- **D-09:** Install lifecycle: resolve dir → read priorState → onPreInstall → copyTree per sourceDirs → transform per file → sha256 → diff vs priorState (delete removed) → injectMarkerBlock → mergeSettings (no-op Phase 3) → write state.json (commit point) → onPostInstall.
- **D-10:** Uninstall lifecycle: read state → rm each `state.files[i]` → removeMarkerBlock → reverse mergeSettings (no-op Phase 3) → rm `<configDir>/oto/`. `--purge` additionally removes any `oto-*` files in conventional subdirs not in `state.files[]`.
- **D-11:** Re-install over existing install just runs install again; D-09 step 7 (file diff) handles deletions. No `--upgrade` flag.

**Codex / Gemini Phase 3 Depth**
- **D-12:** Codex/Gemini adapters at Phase 3 ship minimum-viable parity: full descriptor populated; lifecycle hooks present but `transform*` is identity; `mergeSettings` is identity (Phase 5 owns hooks; Phase 8 owns parity transforms). Codex TOML machinery NOT ported at Phase 3.
- **D-13:** `oto install --codex` / `--gemini` succeed at Phase 3 close: dirs created, marker injected, state file written, no commands/agents/hooks copied. Documented as "best-effort until Phase 8" in `--help`.

**bin/install.js Shell & Help Output**
- **D-14:** `bin/install.js` is the user-facing CLI shell, ~100 lines max. Parses args, dispatches. No business logic.
- **D-15:** Help output documents `oto install --claude|--codex|--gemini|--all [--config-dir <dir>]`, `oto uninstall ...`, resolution order, repo URL, version. Fits 80 cols, ~30 lines.
- **D-16:** Exit codes: `0` success, `1` install error, `2` uninstall error, `3` invalid args / arg conflict, `4` `--all` found no present runtimes. Errors → stderr; success → stdout.

**11 Unwanted Runtime Removal**
- **D-17:** Re-implementation, not incremental edit. Upstream is **reference**, not seed code. The 7,755-line upstream is structurally a monolith; oto's adapter shape (D-01) is structurally simpler.
- **D-18:** Post-fork verification: grep test that `(opencode|kilo|cursor|windsurf|antigravity|augment|trae|qwen|codebuddy|cline|copilot)` returns zero hits in `bin/` and `scripts/install*` (excluding `foundation-frameworks/`, license/attribution files, the test itself). Ports the Phase 2 D-05 coverage manifest pattern.

**Files Allowlist & Distribution**
- **D-19:** `package.json` `files` array already lists `bin/`, covers `bin/lib/` recursively. No `package.json` change needed.
- **D-20:** `bin/install.js` retains executable bit; `bin/lib/*.cjs` don't need it.

**Test Strategy**
- **D-21:** Three test layers via `node --test` `.test.cjs`: per-adapter unit (~10/adapter), library unit (`args`, `marker`, `install-state`), integration (1/runtime, real `os.tmpdir()` config dir, install → re-install idempotency → uninstall round-trip). Uses Phase 1+2 conventions.
- **D-22:** No mock filesystems. Real `os.tmpdir()`, `t.after()` cleanup. Per Pitfall 11.
- **D-23:** `scripts/install-smoke.cjs` extended (not replaced) to invoke `oto install --claude --config-dir <tmp>` after global install. Manual-only at Phase 3; Phase 10 promotes to CI.

**Pre-Existing-Install Detection**
- **D-24:** `onPreInstall` warns (not aborts) on detected upstream GSD/Superpowers markers. PROJECT.md says no migration; markers are namespaced distinctly so coexistence is technically safe.

### Claude's Discretion

- Exact `node:util.parseArgs` flag config (long-form-only vs short flags `-c` etc.).
- Exact wording of help output, success messages, warning messages — **content locked, phrasing not**.
- Whether `bin/lib/install.cjs` exposes `installRuntime` as a single function or splits into `prepareInstall` / `applyInstall` / `finalizeInstall`.
- Style of `transform*` identity hooks at Phase 3 (arrow returning identity vs omitted with orchestrator default vs explicit `(content) => content`).
- Snapshot format for `renderInstructionBlock` tests (inline string vs `tests/fixtures/phase-03/*.md`).
- Order of arg validation checks.

### Deferred Ideas (OUT OF SCOPE for Phase 3)

- Real commands/agents/skills/hooks payload — Phases 4 (commands+agents), 5 (hooks), 6 (skills).
- Codex `[hooks]` and `[[agents]]` TOML machinery — Phase 5 ports `bin/lib/codex-toml.cjs` from upstream lines 2168–2965.
- Codex `transformAgent` (Claude → Codex frontmatter) — Phase 4 or Phase 8.
- Gemini `transformAgent` / `transformCommand` (Claude → Gemini tool-name remap) — Phase 8.
- Migration from existing GSD/Superpowers installs — Out of Scope per PROJECT.md (D-24 warns only).
- Windows support — Out of Scope. POSIX path conventions; `expandTilde` POSIX-tuned.
- CI workflows (`install-smoke.yml`, `test.yml`, `release.yml`) — Phase 10. Phase 3 ships local `scripts/install-smoke.cjs` only.
- License-attribution and state-leak CI checks — Phase 10.
- Coverage tool (`c8`) for installer — Phase 10 unless TDD demands.
- Upgrade detection + version migration — Out of Scope for v0.1.0.
- `oto install --dry-run` — defer; not in any v1 requirement.
- Concurrent install lock — single-user personal-use; defer.
- Help command dynamic listing of `/oto-*` commands — Phase 4 owns `/oto-help`; Phase 3 `--help` is static text.

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INS-01 | Forked + trimmed `bin/install.js` — supports only Claude, Codex, Gemini (drops 11 others) | Re-impl in adapter shape (D-17). Help output documents only 3 runtimes (D-15). Grep test enforces (D-18). Upstream lines 81–134 (arg parsing) and 171–422 (per-runtime resolvers) are the reference for what to drop and what to keep. |
| INS-02 | Per-runtime adapter modules own runtime-specific paths, instruction filenames, agent frontmatter dialect, hook registration syntax | Hybrid descriptor + lifecycle hook contract (D-01). `bin/lib/runtime-{claude,codex,gemini}.cjs`. Orchestrator dispatches via descriptor lookup + hook calls — zero `if (runtime === 'codex')` branches outside adapter files. |
| INS-03 | Resolution order: `--config-dir` flag → env var → `~/.<runtime>` default | Single `resolveConfigDir(adapter, flags, env)` in `args.cjs` (D-03). Adapters supply only `configDirEnvVar` and `defaultConfigDirSegment`. Upstream lines 295–326 (Gemini, Codex) confirm the chain pattern. |
| INS-04 | Files copied (not symlinked) into runtime config dirs at install time | `copy-files.cjs::copyTree` uses `fs.cp(..., { recursive: true, force: true })` — Node 22+ built-in. Symlinks rejected per CLAUDE.md "What NOT to Use" (volatile npm install path; Windows elevation). |
| INS-05 | `oto install --claude` is documented v0.1.0 happy path; `--codex`/`--gemini` work but parity best-effort | Codex/Gemini adapters at Phase 3 ship full descriptor + identity transforms + identity `mergeSettings` (D-12, D-13). `--help` text labels them best-effort until Phase 8 (D-15). |
| INS-06 | `--all` flag installs to all detected runtimes | `runtime-detect.cjs::detectPresentRuntimes(homeDir)` — `fs.statSync(path).isDirectory()` for `~/.claude`, `~/.codex`, `~/.gemini` (D-04). `--all` + `--config-dir` rejected at parse time (single-target only). |

</phase_requirements>

## Standard Stack

### Core (zero external dependencies — per Pitfall 11 + CLAUDE.md TL;DR)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `node:util` (`parseArgs`) | Node 22+ built-in | CLI argument parsing | [VERIFIED via `node -e`] Replaces upstream's hand-rolled `args.includes(...)` loop (upstream lines 82–106). Stable since Node 18.3.0. Zero deps. |
| `node:fs` (`cp`) | Node 22+ built-in | Recursive directory copy | [VERIFIED via `node -e`] `fs.cp(src, dst, { recursive: true, force: true, errorOnExist: false })` replaces upstream's `copyWithPathReplacement`. |
| `node:fs/promises` | Node 22+ built-in | Async file I/O | Modern alternative to `node:fs` callbacks. |
| `node:crypto` (`createHash`) | Node 22+ built-in | SHA-256 file hashing for state.files[] | Upstream `fileHash` (line 5655) uses `crypto.createHash('sha256')`. |
| `node:test` + `node:assert/strict` | Node 22+ built-in | Test runner + assertions | [CITED: CLAUDE.md "Why These Choices §4"]. Already in use Phase 1+2. |
| `node:path` / `node:os` | Node 22+ built-in | Path manipulation, homedir | Standard. |

### Supporting (none — installer is dep-free at Phase 3)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none) | — | — | Pitfall 11 explicitly forbids: TOML library (Phase 5 hand-rolls), JSONC parser (Phase 3 has no JSONC surface; if needed, port upstream `stripJsonComments` lines 543–588), CLI parser beyond `parseArgs`, logger, snapshot-test library. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `node:util.parseArgs` | hand-rolled `args.includes(...)` (upstream pattern) | Upstream's pattern proliferates `hasFoo` booleans (28 of them, lines 82–106). `parseArgs` halves arg-handling LOC and gives free `--key=value` and conflict-detection scaffolding. |
| `fs.cp` | hand-rolled recursive copy | Upstream's `copyWithPathReplacement` (line 4570, ~150 lines) does string substitution during copy. Phase 3 has no transform pipeline that needs intermixing — `copyTree` copies, then transforms run in a second pass over written files. Cleaner. |
| `node:test` | Vitest, Jest | [CITED: CLAUDE.md "Why These Choices §4"] Vitest is ESM-first, Jest is heavy + slow. `node:test` is zero-dep, already in Phase 1+2 use. |
| Two-pass copy + transform | One-pass copy with inline transform | Two-pass is testable in isolation: `copyTree` is pure I/O, `transform*` hooks are pure functions. Mixing them couples I/O with parsing failures. |

**Installation:** None — Phase 3 adds zero dependencies.

**Version verification (Node 22+ built-ins):**
```bash
node --version  # >= 22.0.0 required (engines field already enforces)
node -e "console.log(typeof require('node:util').parseArgs)"  # function
node -e "console.log(typeof require('fs').cp)"                # function
```
Verified locally: Node v22.17.1 has all needed primitives. [VERIFIED: local exec 2026-04-28]

## Architecture Patterns

### Recommended Project Structure

```
bin/
├── install.js              # Thin CLI shell (~100 lines): shebang, 'use strict', parse args, dispatch
└── lib/
    ├── args.cjs            # parseArgs wrapper + resolveConfigDir + arg-conflict validation
    ├── runtime-detect.cjs  # detectPresentRuntimes(homeDir) for --all
    ├── copy-files.cjs      # copyTree, removeTree, sha256File
    ├── marker.cjs          # injectMarkerBlock, removeMarkerBlock, findUpstreamMarkers
    ├── install-state.cjs   # readState, writeState, schema-validate
    ├── install.cjs         # Orchestrator: installRuntime(adapter, opts), uninstallRuntime(adapter, opts)
    ├── runtime-claude.cjs  # Adapter (descriptor + lifecycle hooks)
    ├── runtime-codex.cjs   # Adapter (Phase 3 minimum-viable; Phase 5+8 fill)
    └── runtime-gemini.cjs  # Adapter (Phase 3 minimum-viable; Phase 8 fills parity)

scripts/
└── install-smoke.cjs       # Extended (not replaced) per D-23

tests/
├── phase-03-args.test.cjs                       # Resolution order × 3 paths, --all, conflicts
├── phase-03-marker.test.cjs                     # Inject/remove/replace, idempotency
├── phase-03-install-state.test.cjs              # Read/write/round-trip/schema-reject
├── phase-03-runtime-claude.test.cjs             # Descriptor shape, transforms, render snapshot
├── phase-03-runtime-codex.test.cjs              # Same shape, Phase 3 identity transforms
├── phase-03-runtime-gemini.test.cjs             # Same shape, Phase 3 identity transforms
├── phase-03-no-unwanted-runtimes.test.cjs       # Grep test (SC#4 / D-18)
├── phase-03-install-claude.integration.test.cjs # Real tmpdir install/re-install/uninstall
├── phase-03-install-codex.integration.test.cjs
└── phase-03-install-gemini.integration.test.cjs
```

### Pattern 1: Hybrid Descriptor + Lifecycle Hook Adapter

**What:** Each `bin/lib/runtime-<name>.cjs` exports an object with two layers — static descriptor metadata read by the orchestrator, plus lifecycle hooks the orchestrator calls at deterministic points.

**When to use:** Multi-runtime installer where most differences are data (paths, filenames, env vars) but a few are behavioral (frontmatter dialect, settings format). Pure-descriptor leaks behavior into the orchestrator as `if (runtime === 'codex')` branches; pure-lifecycle duplicates the install flow 3×.

**Example (Claude adapter, Phase 3 minimum-viable):**

```javascript
// bin/lib/runtime-claude.cjs
'use strict';
const { version: OTO_VERSION } = require('../../package.json');

module.exports = {
  // Descriptor (orchestrator reads these directly)
  name: 'claude',
  configDirEnvVar: 'CLAUDE_CONFIG_DIR',
  defaultConfigDirSegment: '.claude',
  instructionFilename: 'CLAUDE.md',
  settingsFilename: 'settings.json',
  settingsFormat: 'json',
  sourceDirs: {
    commands: 'oto/commands',
    agents:   'oto/agents',
    skills:   'oto/skills',
    hooks:    'oto/hooks/dist',
  },
  targetSubdirs: {
    commands: 'commands',
    agents:   'agents',
    skills:   'skills',
    hooks:    'hooks',
  },

  // Lifecycle hooks (orchestrator calls at deterministic points)
  renderInstructionBlock(/* ctx */) {
    // Stable across re-installs when oto_version unchanged (snapshot-tested)
    return `<!-- managed by oto v${OTO_VERSION} — do not edit between markers -->\n` +
           `## oto\n\noto v${OTO_VERSION} is installed. Run \`/oto-help\` for the command list.\n`;
  },
  transformCommand: (content /*, meta */) => content,  // Claude is canonical → identity
  transformAgent:   (content /*, meta */) => content,
  transformSkill:   (content /*, meta */) => content,
  mergeSettings:    (existingText /*, otoBlock */) => existingText,  // Phase 5 fills
  onPreInstall(/* ctx */)  { /* warn on upstream markers via marker.findUpstreamMarkers */ },
  onPostInstall(ctx) {
    console.log(`installed: claude — ${ctx.filesCopied} files copied, marker injected, state at ${ctx.statePath}`);
  },
};
```

**Codex adapter at Phase 3** has identical hook signatures, identity transforms, identity `mergeSettings`, and `// TODO Phase 5: real TOML manipulation` / `// TODO Phase 8: Codex frontmatter parity` comments. Phase 5+8 fill in place; orchestrator and tests don't change.

[CITED: D-01 in CONTEXT.md; pattern source = upstream's existing function-naming convention `convertClaudeAgentToCodexAgent` at `foundation-frameworks/get-shit-done-main/bin/install.js:1991`, `generateCodexAgentToml` at `:2017`, `mergeCopilotInstructions` at `:3349`.]

### Pattern 2: Pure-Function Orchestrator with Adapter Injection

**What:** `installRuntime(adapter, opts)` takes the adapter and an opts object; returns a result object. No globals, no hidden state — testable by passing fake adapters and a `tmpdir`.

**When to use:** Whenever the install flow has runtime-agnostic structure (resolve dir, copy files, hash, write state, inject marker) and runtime-specific transforms (handled via adapter calls).

**Example (orchestrator skeleton):**

```javascript
// bin/lib/install.cjs (sketch)
'use strict';
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const { resolveConfigDir } = require('./args.cjs');
const { copyTree, sha256File } = require('./copy-files.cjs');
const { injectMarkerBlock, findUpstreamMarkers } = require('./marker.cjs');
const { readState, writeState } = require('./install-state.cjs');

async function installRuntime(adapter, opts) {
  const configDir = resolveConfigDir(adapter, opts.flags, process.env);
  await fsp.mkdir(configDir, { recursive: true });

  const statePath = path.join(configDir, 'oto', '.install.json');
  const priorState = readState(statePath);

  if (adapter.onPreInstall) adapter.onPreInstall({ configDir, priorState });

  const writtenFiles = [];
  for (const [srcKey, srcRel] of Object.entries(adapter.sourceDirs)) {
    const srcAbs = path.join(opts.repoRoot, srcRel);
    const dstAbs = path.join(configDir, adapter.targetSubdirs[srcKey]);
    const result = await copyTree(srcAbs, dstAbs, { transform: adapter[`transform${capitalize(srcKey)}`] });
    writtenFiles.push(...result.files);  // each: { relPath, absPath }
  }

  // Hash
  const fileEntries = await Promise.all(writtenFiles.map(async ({ relPath, absPath }) => ({
    path: path.relative(configDir, absPath),
    sha256: await sha256File(absPath),
  })));

  // Diff against priorState — delete removals
  const newPaths = new Set(fileEntries.map(f => f.path));
  for (const prior of (priorState?.files || [])) {
    if (!newPaths.has(prior.path)) {
      await fsp.rm(path.join(configDir, prior.path), { force: true });
    }
  }

  // Marker injection
  const instructionPath = path.join(configDir, adapter.instructionFilename);
  const block = adapter.renderInstructionBlock({ configDir });
  injectMarkerBlock(instructionPath, '<!-- OTO Configuration -->', '<!-- /OTO Configuration -->', block);

  // Settings merge (Phase 3: identity)
  // ... read settings, call adapter.mergeSettings, write back ...

  // Commit point: state file last
  writeState(statePath, {
    version: 1,
    oto_version: opts.otoVersion,
    installed_at: new Date().toISOString(),
    runtime: adapter.name,
    config_dir: configDir,
    files: fileEntries,
    instruction_file: {
      path: adapter.instructionFilename,
      open_marker: '<!-- OTO Configuration -->',
      close_marker: '<!-- /OTO Configuration -->',
    },
  });

  if (adapter.onPostInstall) adapter.onPostInstall({ configDir, statePath, filesCopied: fileEntries.length });
  return { runtime: adapter.name, configDir, statePath, filesCopied: fileEntries.length };
}

module.exports = { installRuntime, /* uninstallRuntime */ };
```

[VERIFIED: skeleton compiles with Node 22.17.1 primitives; matches D-09 lifecycle order.]

### Pattern 3: Two-Pass Copy + Transform

**What:** First pass = `fs.cp` recursive directory copy (raw bytes). Second pass = walk written files, apply `adapter.transform<Kind>` content transforms in-place. Phase 3 transforms are identity → no-op.

**When to use:** When you need both atomicity (one logical copy) and testability (transforms isolated from I/O failures). Upstream's `copyWithPathReplacement` (`bin/install.js:4570`) intermixes them; Phase 3 separates so each pass has an independent failure mode.

**Anti-Pattern:** Single-pass copy-with-transform via custom `fs.readdir` walk. Loses the simplicity benefit of `fs.cp`, multiplies test surface, mirrors upstream's monolithic shape.

### Pattern 4: Marker-Bracketed Idempotent Block Injection

**What:** Wrap installer-managed content between `<!-- OTO Configuration -->` and `<!-- /OTO Configuration -->`. Re-install replaces only what's between markers; surrounding user content is preserved byte-for-byte.

**Source:** Upstream `mergeCopilotInstructions` at `foundation-frameworks/get-shit-done-main/bin/install.js:3349-3380` is the closest pattern. Its three-case logic (no file → create; markers present → replace between; no markers → append) is the canonical algorithm. Port verbatim with renamed markers and `BEFORE`-trimming nuance preserved.

**Example (port):**

```javascript
// bin/lib/marker.cjs
'use strict';
const fs = require('node:fs');

function injectMarkerBlock(filePath, openMarker, closeMarker, body) {
  const block = `${openMarker}\n${body.trim()}\n${closeMarker}`;
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, block + '\n');
    return;
  }
  const existing = fs.readFileSync(filePath, 'utf8');
  const openIdx = existing.indexOf(openMarker);
  const closeIdx = existing.indexOf(closeMarker);
  if (openIdx !== -1 && closeIdx !== -1) {
    const before = existing.substring(0, openIdx).trimEnd();
    const after  = existing.substring(closeIdx + closeMarker.length).trimStart();
    let newContent = '';
    if (before) newContent += before + '\n\n';
    newContent += block;
    if (after) newContent += '\n\n' + after;
    fs.writeFileSync(filePath, newContent + '\n');
    return;
  }
  fs.writeFileSync(filePath, existing.trimEnd() + '\n\n' + block + '\n');
}

function removeMarkerBlock(filePath, openMarker, closeMarker) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  const openIdx = content.indexOf(openMarker);
  const closeIdx = content.indexOf(closeMarker);
  if (openIdx === -1 || closeIdx === -1) return;
  const before = content.substring(0, openIdx).trimEnd();
  const after  = content.substring(closeIdx + closeMarker.length).trimStart();
  const cleaned = (before + (before && after ? '\n\n' : '') + after).trim();
  if (!cleaned) fs.unlinkSync(filePath);
  else fs.writeFileSync(filePath, cleaned + '\n');
}

function findUpstreamMarkers(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, 'utf8');
  const markers = [];
  if (content.includes('<!-- GSD Configuration')) markers.push('GSD');
  if (content.includes('<EXTREMELY_IMPORTANT>You have superpowers.')) markers.push('Superpowers');
  if (content.match(/superpowers-codex bootstrap/i)) markers.push('Superpowers-Codex');
  return markers;
}

module.exports = { injectMarkerBlock, removeMarkerBlock, findUpstreamMarkers };
```

[CITED: pattern source `foundation-frameworks/get-shit-done-main/bin/install.js:3349` (`mergeCopilotInstructions`) and `:3388` (`stripGsdFromCopilotInstructions`).]

### Anti-Patterns to Avoid

- **`if (runtime === 'codex')` branches in `bin/install.js` or `bin/lib/install.cjs`.** Violates SC#2. All runtime-specific behavior lives behind the adapter contract. The grep test (`phase-03-runtime-conditional.test.cjs` — see Validation Architecture) enforces this.
- **Symlink-based install.** [CITED: CLAUDE.md "What NOT to Use"] npm volatile install paths break on re-install; Windows needs elevation. Use `fs.cp` (D-04 / INS-04).
- **Single-source marker (state file alone OR instruction-file block alone).** D-08 mandates dual-source. State file gives the installer a manifest for clean uninstall; instruction-file block tells the LLM oto exists. Single-source loses one of the two functions.
- **Auto-running `mergeSettings` for hooks at Phase 3.** Phase 3 ships zero hooks (per D-07/D-12). Stubbing `mergeSettings` to identity (no-op) at Phase 3 prevents touching user `settings.json` or `config.toml` until Phase 5 is ready.
- **Mock filesystem for integration tests.** [CITED: D-22, Pitfall 11] Use real `os.tmpdir()` with `t.after()` cleanup. Mock-fs adds a dep, hides real `fs.cp` semantics, and the round-trip assertion is the test's whole point.
- **JSON Schema library (`ajv` etc.) for state validation.** Phase 2 D-16 set the precedent for hand-rolled validation. State schema is ~5 fields; inline the checks.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CLI argument parsing | `args.includes(...)` loop with 28 booleans | `node:util.parseArgs` | Built-in (Node 18.3+), zero deps, gives free `--key=value` parsing and arg-conflict scaffolding. Upstream's hand-roll (`bin/install.js:81-134`) is a known pain point — 50+ lines for what `parseArgs` does in a config object. |
| Recursive directory copy | `fs.readdir` + `fs.copyFile` recursion | `fs.cp(src, dst, { recursive: true, force: true })` | Built-in (Node 16.7+), handles errors, symlinks, permissions correctly. Upstream's `copyWithPathReplacement` (`bin/install.js:4570`, ~150 lines) only existed because it intermixed transform — Phase 3 doesn't need that intermixing. |
| Marker-bracketed block replace | Custom regex with edge cases | Port `mergeCopilotInstructions` (upstream `:3349`) | Upstream's three-case logic (no file → create; markers present → replace; markers absent → append) is the correct algorithm and has been hardened against real-world edge cases. Re-implementing risks subtle bugs around trailing-newline handling. |
| File hashing | Manual hex encoding | `crypto.createHash('sha256').update(buf).digest('hex')` | One-liner; upstream `fileHash` (`:5655`) is the reference. |
| Settings.json read with comments | Generic JSON parser | Phase 3: identity `mergeSettings`. Phase 5: port `stripJsonComments` (upstream `:543-588`) only if Claude `settings.json` ever uses JSONC | Phase 3 has no settings-merge surface. Don't pre-port. |
| Tilde expansion | Custom path utils | Port `expandTilde` (upstream `:479-484`) — 6 lines | Trivial; just preserve. Apply in `args.cjs::resolveConfigDir` for `--config-dir ~/foo`. |
| Test framework | Vitest, Jest | `node:test` + `node:assert/strict` | [CITED: CLAUDE.md] Already in use Phase 1+2; zero deps. |

**Key insight:** The upstream installer evolved into 7,755 lines because it was a moving target accreting runtimes one at a time, each with its own edge-case fix. Oto's three-runtime, scaffolding-only Phase 3 doesn't need that bulk — it needs the **structural primitives** (resolution chain, marker injection, copy + hash + state) abstracted cleanly. Don't pre-port machinery for problems Phase 3 doesn't solve.

## Runtime State Inventory

> Phase 3 is a fork-and-trim of an installer. The "runtime state" question matters because the installer manages user-machine state (config dirs, instruction files, state files) — not because Phase 3 is a rename phase. Audit included for completeness.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — Phase 3 introduces a new `<configDir>/oto/.install.json` schema; no existing oto installs exist on any user machine. | None. Schema starts at `version: 1`. |
| Live service config | None — installer writes only filesystem state. No databases, queues, or external services touched. | None. |
| OS-registered state | None at Phase 3 — `mergeSettings` is no-op, no hooks registered, no `launchd`/Task Scheduler entries written. (Phase 5 adds hook registration in `settings.json` / `config.toml`.) | None. |
| Secrets/env vars | Reads only `CLAUDE_CONFIG_DIR`, `CODEX_HOME`, `GEMINI_CONFIG_DIR` (the runtime-detection env vars on the rename-map do-not-rename allowlist per ADR-02). Never writes env vars or secrets. | None. |
| Build artifacts | `hooks/dist/` is built by `scripts/build-hooks.js` in `postinstall` (Phase 2 / FND-03). Phase 3 installer reads from `hooks/dist/` but doesn't invoke `build-hooks.js`. At Phase 3 close, `hooks/dist/` is empty (no hook source files yet) — installer tolerates. | None. Phase 5 fills `hooks/` source; Phase 5 then has live hook payload to copy. |

**Nothing found in any category** that blocks Phase 3 — the installer is a greenfield artifact (replacing a 304-byte stub) with no migration concerns. PROJECT.md "Out of Scope" already excludes migration from existing GSD/Superpowers installs (D-24 only warns).

## Common Pitfalls

### Pitfall A: Substring collision in the unwanted-runtime grep test

**What goes wrong:** `grep -i -E "(opencode|kilo|cursor|...)" bin/` matches comments mentioning "opencode" in CHANGELOG-style notes, agent descriptions, or carryover doc fragments. Test fails on innocent substrings.

**Why it happens:** D-18's grep is case-insensitive over a flat token list. Upstream-derived comments may quote unwanted-runtime names ("ported from upstream's opencode handler").

**How to avoid:**
- Scope grep to `bin/` and `scripts/install*` only (NOT all `scripts/`, NOT `tests/`, NOT `foundation-frameworks/`).
- Add explicit allowlist exclusions for the test file itself (it has to mention the names).
- Make the test scan **identifiers only**: search for `'opencode'`, `--opencode`, `is.+opencode`, `runtime.*opencode` — not free-text.
- Suggested form: `grep -E "(--opencode|--kilo|--cursor|--windsurf|--antigravity|--augment|--trae|--qwen|--codebuddy|--cline|--copilot)"` (CLI flag form catches code references; ignores docs).

**Warning signs:** Test fails locally on a clean fork. Error message points to a comment, not code.

[CITED: This is Pitfall 1 from `.planning/research/PITFALLS.md` applied to Phase 3.]

### Pitfall B: `fs.cp` errors on missing source dir

**What goes wrong:** Phase 3 ships scaffolding-only (D-07) — `oto/commands/` may not exist. `fs.cp(missingSrc, dst, ...)` rejects with `ENOENT`.

**Why it happens:** Node's `fs.cp` does not auto-tolerate missing source.

**How to avoid:** `copyTree` checks `fs.existsSync(src)` first; returns `{ files: [], filesCopied: 0 }` if absent. Document this contract in the function comment so Phase 4 implementer doesn't try to "fix" it.

**Warning signs:** Phase 3 integration test fails with `ENOENT: no such file or directory, lstat '.../oto/commands'`.

### Pitfall C: Trailing-newline drift in marker injection

**What goes wrong:** Re-install over an existing install produces a one-byte diff (extra/missing trailing `\n`). Snapshot tests fail intermittently.

**Why it happens:** `injectMarkerBlock` appending a block to a file that already ends with `\n` yields `...\n\n\n<block>\n`. Re-running adds another `\n`. Drift accumulates.

**How to avoid:** Always `existing.trimEnd()` before splicing, and always end the written file with exactly one `\n`. Upstream's `mergeCopilotInstructions` (`:3349-3380`) does this correctly — port verbatim.

**Warning signs:** `phase-03-marker.test.cjs` "idempotent re-inject" test produces non-empty diff after second call. Use `assert.equal(file1, file2)` to catch.

### Pitfall D: SHA-256 unstable across line endings

**What goes wrong:** Test on macOS produces hash X; same file on Linux CI produces hash Y because the test fixture has CRLF on one host and LF on another.

**Why it happens:** Git can normalize line endings on checkout depending on `core.autocrlf`.

**How to avoid:** Hash exactly the bytes on disk. Add `* text=auto eol=lf` to `.gitattributes` for the repo. Phase 3 doesn't need to hash anything (zero files copied at Phase 3 close), but the code path must be live for Phase 4. Test with explicit byte arrays, not git-tracked fixtures, where possible.

**Warning signs:** CI hash mismatch when local test passes.

### Pitfall E: `--config-dir` with `--all` silently picks one runtime

**What goes wrong:** User runs `oto install --all --config-dir /tmp/test`. Installer doesn't know which runtime gets that dir; defaults silently to one (or all three to the same dir, corrupting state files for the other two).

**Why it happens:** `--config-dir` is single-target by definition; `--all` is multi-target by definition. Combining them is meaningless.

**How to avoid:** Reject at arg-parse time with exit code 3 and stderr message: `--config-dir cannot be used with --all (--config-dir targets a single runtime)`. [Per "Specifics" in CONTEXT.md.]

**Warning signs:** Integration test demonstrates that running `--all --config-dir <tmp>` produces a clean error in stderr and exit code 3.

### Pitfall F: State file written before all I/O succeeds (commit-point bug)

**What goes wrong:** Install fails halfway through (disk full, permissions). State file already on disk. Uninstall sees state file but the listed files don't all exist → uninstall prints errors trying to `rm` files that aren't there.

**Why it happens:** Writing state file at the start (or middle) of install loses the "completion" semantic.

**How to avoid:** D-09 step 10 mandates state-file-as-commit-point: write it **last**, after all other I/O succeeds. Uninstall (D-10 step 2) uses `fs.rm(..., { force: true })` so missing files don't error. This pair gives crash safety: a partial install leaves an inconsistent filesystem but no state file → uninstall is a no-op (idempotent). Re-running install heals.

**Warning signs:** Integration test that simulates a mid-install failure shows: state file absent → uninstall says "no install found" → re-install succeeds cleanly.

### Pitfall G: Help output drift after Phase 4+

**What goes wrong:** Phase 3 `--help` lists 3 runtimes statically. Phase 4 lands `/oto-*` commands but help doesn't mention them. User can't discover Phase 4 features.

**Why it happens:** Static help text is a known maintenance burden.

**How to avoid:** Per CONTEXT.md "Deferred Ideas" — dynamic help (lists `/oto-*` commands) is Phase 4's `oto-help` command surface. Phase 3 `oto install --help` is **install-scoped only**: documents flags + resolution order + version + repo URL. Don't try to be a top-level command index. If the user types `oto --help` (no subcommand), suggest `oto install --help` and link to the repo.

**Warning signs:** Help text in Phase 3 review starts mentioning `/oto-execute-phase` or other Phase 4 surfaces.

### Pitfall H: `state.files[]` paths storing absolute paths

**What goes wrong:** State file is portable across machines for support — until you ship one with `/Users/julian/.claude/oto/commands/oto-help.md` baked in. Now every diff/copy/audit leaks the user's home path.

**Why it happens:** `path.resolve()` returns absolute paths.

**How to avoid:** [Per CONTEXT.md "Specifics"] Always store `path.relative(configDir, absPath)` in `state.files[i].path`. At uninstall time, reconstruct: `path.join(configDir, file.path)`.

**Warning signs:** `phase-03-install-state.test.cjs` snapshot includes `/Users/...` or `/home/...`.

[CITED: All eight pitfalls cross-reference upstream code or `.planning/research/PITFALLS.md`. Confidence: HIGH for A, B, C, E, F, G, H (verifiable from code); MEDIUM for D (depends on CI host).]

## Code Examples

### Example 1: `node:util.parseArgs` configuration

```javascript
// bin/lib/args.cjs
'use strict';
const { parseArgs } = require('node:util');
const path = require('node:path');
const os = require('node:os');

function expandTilde(p) {
  if (p && p.startsWith('~/')) return path.join(os.homedir(), p.slice(2));
  return p;
}

const FLAG_CONFIG = {
  options: {
    'claude':       { type: 'boolean', default: false },
    'codex':        { type: 'boolean', default: false },
    'gemini':       { type: 'boolean', default: false },
    'all':          { type: 'boolean', default: false },
    'config-dir':   { type: 'string'  },
    'force':        { type: 'boolean', default: false, short: 'f' },
    'purge':        { type: 'boolean', default: false },
    'verbose':      { type: 'boolean', default: false, short: 'v' },
    'help':         { type: 'boolean', default: false, short: 'h' },
  },
  allowPositionals: true,  // First positional is the action: 'install' | 'uninstall'
  strict: true,
};

function parseCliArgs(argv) {
  const { values, positionals } = parseArgs({ args: argv, ...FLAG_CONFIG });
  const action = positionals[0] || 'install';

  const runtimes = [];
  if (values.claude) runtimes.push('claude');
  if (values.codex)  runtimes.push('codex');
  if (values.gemini) runtimes.push('gemini');

  // Validation
  if (values.all && runtimes.length > 0) {
    throw new ArgError('--all cannot be combined with --claude/--codex/--gemini', 3);
  }
  if (values.all && values['config-dir']) {
    throw new ArgError('--config-dir cannot be used with --all', 3);
  }
  if (!values.all && runtimes.length === 0 && action !== 'help' && !values.help) {
    // Default for `oto install` with no runtime flag: --claude (v0.1.0 happy path per INS-05)
    runtimes.push('claude');
  }

  return {
    action,
    runtimes,
    all: values.all,
    configDir: values['config-dir'] ? expandTilde(path.resolve(values['config-dir'])) : null,
    force: values.force,
    purge: values.purge,
    verbose: values.verbose,
    help: values.help,
  };
}

class ArgError extends Error {
  constructor(message, exitCode) { super(message); this.exitCode = exitCode; }
}

function resolveConfigDir(adapter, parsed, env) {
  if (parsed.configDir) return parsed.configDir;
  const fromEnv = env[adapter.configDirEnvVar];
  if (fromEnv) return expandTilde(fromEnv);
  return path.join(os.homedir(), adapter.defaultConfigDirSegment);
}

module.exports = { parseCliArgs, resolveConfigDir, expandTilde, ArgError };
```

[VERIFIED: `parseArgs` API per Node 22 docs; pattern follows D-03 + D-15 + D-16.]

### Example 2: `--all` runtime detection

```javascript
// bin/lib/runtime-detect.cjs
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const SUPPORTED_RUNTIMES = ['claude', 'codex', 'gemini'];

const DEFAULT_SEGMENTS = {
  claude: '.claude',
  codex:  '.codex',
  gemini: '.gemini',
};

function detectPresentRuntimes(homeDir = os.homedir()) {
  const present = [];
  for (const runtime of SUPPORTED_RUNTIMES) {
    const dir = path.join(homeDir, DEFAULT_SEGMENTS[runtime]);
    try {
      if (fs.statSync(dir).isDirectory()) present.push(runtime);
    } catch { /* ENOENT — runtime not installed */ }
  }
  return present;
}

module.exports = { detectPresentRuntimes, SUPPORTED_RUNTIMES };
```

[CITED: D-04. Mirrors upstream's pattern of `fs.existsSync` checks at install time (e.g., `bin/install.js:5610` `verifyInstalled`), but at the dir level for detection.]

### Example 3: Install-state schema validation (hand-rolled, per Phase 2 D-16 precedent)

```javascript
// bin/lib/install-state.cjs
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const CURRENT_SCHEMA_VERSION = 1;

function validateState(state) {
  const errors = [];
  if (!state || typeof state !== 'object') return ['state must be an object'];
  if (state.version !== CURRENT_SCHEMA_VERSION) errors.push(`unsupported state.version: ${state.version}`);
  if (typeof state.oto_version !== 'string') errors.push('state.oto_version must be a string');
  if (typeof state.installed_at !== 'string') errors.push('state.installed_at must be ISO-8601 string');
  if (!['claude', 'codex', 'gemini'].includes(state.runtime)) errors.push(`unknown runtime: ${state.runtime}`);
  if (typeof state.config_dir !== 'string') errors.push('state.config_dir must be a string');
  if (!Array.isArray(state.files)) errors.push('state.files must be an array');
  else for (const [i, f] of state.files.entries()) {
    if (typeof f.path !== 'string') errors.push(`state.files[${i}].path must be a string`);
    if (path.isAbsolute(f.path)) errors.push(`state.files[${i}].path must be relative to configDir, got absolute: ${f.path}`);
    if (typeof f.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(f.sha256)) errors.push(`state.files[${i}].sha256 must be 64-hex string`);
  }
  if (!state.instruction_file || typeof state.instruction_file !== 'object') errors.push('state.instruction_file required');
  return errors;
}

function readState(statePath) {
  if (!fs.existsSync(statePath)) return null;
  const raw = fs.readFileSync(statePath, 'utf8');
  let state;
  try { state = JSON.parse(raw); } catch (e) { throw new Error(`state file corrupt: ${e.message}`); }
  const errors = validateState(state);
  if (errors.length) throw new Error(`state file invalid: ${errors.join('; ')}`);
  return state;
}

function writeState(statePath, state) {
  const errors = validateState(state);
  if (errors.length) throw new Error(`refusing to write invalid state: ${errors.join('; ')}`);
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2) + '\n');
}

module.exports = { readState, writeState, validateState, CURRENT_SCHEMA_VERSION };
```

[CITED: D-08 schema; pattern source = Phase 2 D-16 hand-rolled JSON Schema validation precedent; absolute-path rejection per Pitfall H above and CONTEXT.md "Specifics".]

### Example 4: Integration test skeleton for clean install round-trip

```javascript
// tests/phase-03-install-claude.integration.test.cjs
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');

const REPO_ROOT = path.join(__dirname, '..');
const adapter = require(path.join(REPO_ROOT, 'bin/lib/runtime-claude.cjs'));
const { installRuntime, uninstallRuntime } = require(path.join(REPO_ROOT, 'bin/lib/install.cjs'));

function tmpDir(t) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-install-test-'));
  t.after(() => fs.rmSync(d, { recursive: true, force: true }));
  return d;
}

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

test('claude: install → re-install identity → uninstall round-trip', { timeout: 30000 }, async (t) => {
  const configDir = tmpDir(t);
  // Pre-create a CLAUDE.md with user content to verify preservation
  const userContent = '# My Notes\n\nMy own personal notes that must survive.\n';
  fs.writeFileSync(path.join(configDir, 'CLAUDE.md'), userContent);

  // 1. First install
  const r1 = await installRuntime(adapter, { repoRoot: REPO_ROOT, flags: { configDir } });
  assert.equal(r1.runtime, 'claude');
  assert.equal(r1.configDir, configDir);
  assert.ok(fs.existsSync(path.join(configDir, 'oto', '.install.json')), 'state file exists');
  const claudeMd = fs.readFileSync(path.join(configDir, 'CLAUDE.md'), 'utf8');
  assert.match(claudeMd, /<!-- OTO Configuration -->/, 'open marker present');
  assert.match(claudeMd, /<!-- \/OTO Configuration -->/, 'close marker present');
  assert.match(claudeMd, /My own personal notes/, 'user content preserved');

  // 2. Re-install: byte-identical state file (modulo installed_at timestamp)
  const stateAfterFirst = JSON.parse(fs.readFileSync(path.join(configDir, 'oto', '.install.json'), 'utf8'));
  await installRuntime(adapter, { repoRoot: REPO_ROOT, flags: { configDir } });
  const stateAfterSecond = JSON.parse(fs.readFileSync(path.join(configDir, 'oto', '.install.json'), 'utf8'));
  assert.deepEqual(stateAfterSecond.files, stateAfterFirst.files, 'files list stable across re-install');
  // Marker block: only one occurrence
  const claudeMd2 = fs.readFileSync(path.join(configDir, 'CLAUDE.md'), 'utf8');
  const openCount = (claudeMd2.match(/<!-- OTO Configuration -->/g) || []).length;
  assert.equal(openCount, 1, 'no duplicate marker block on re-install');

  // 3. Uninstall
  await uninstallRuntime(adapter, { configDir });
  assert.ok(!fs.existsSync(path.join(configDir, 'oto')), 'oto-namespaced subdir removed');
  const claudeMdFinal = fs.readFileSync(path.join(configDir, 'CLAUDE.md'), 'utf8');
  assert.equal(claudeMdFinal.trim(), userContent.trim(), 'user content fully restored');
});
```

[CITED: D-21 layer 3 (integration); fixture pattern from `tests/phase-02-allowlist.test.cjs:16-24`.]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hand-rolled `args.includes(...)` arg parsing (upstream) | `node:util.parseArgs` | Node 18.3.0 (stable) | 50%+ LOC reduction in arg-handling, free `--key=value` and conflict detection. |
| Hand-rolled recursive copy with transform mixed in (upstream `copyWithPathReplacement`, ~150 lines) | `fs.cp(src, dst, { recursive: true, force: true })` + separate transform pass | Node 16.7.0 (`fs.cp`) | Cleaner separation, both passes independently testable. |
| Symlink-based install (Superpowers `.codex/INSTALL.md`) | Copy-based install (oto INS-04 / D-04) | oto Phase 3 | Volatile npm install paths break symlinks; copy is dumber but reliable across Mac and (deferred) Windows. |
| Single SessionStart marker (GSD `gsd-session-state.sh`, Superpowers `session-start`) | Dual-source-of-truth marker (D-08) | oto Phase 3 | State file gives uninstall a manifest; instruction-file block gives the LLM identity. Either alone is insufficient. |
| Per-runtime resolver function (upstream `getOpencodeGlobalDir`, `getKiloGlobalDir`, etc., ~10 functions) | Single `resolveConfigDir(adapter, flags, env)` driven by descriptor (D-03) | oto Phase 3 | 10 functions → 1; resolution chain trivial to test exhaustively. |

**Deprecated/outdated:**
- Upstream's `convertOpenCodeFrontmatter` / `convertKiloFrontmatter` / `convertCursorMarkdown` / etc.: not ported (D-17). Eleven runtime-conversion suites dropped entirely.
- Upstream's `installAllRuntimes` (line 7585) iterates a 14-element list; oto's iterates 3. Same shape, reduced data.
- Upstream's `manifest` (line 5683 `writeManifest`) writes `<configDir>/.gsd-manifest.json` as a flat file-hash map — oto's `<configDir>/oto/.install.json` lives in a namespaced subdir (D-08) and includes per-runtime metadata + instruction-file marker info, not just hashes.

## Assumptions Log

> All claims in this research were verified against upstream code (`bin/install.js`), CONTEXT.md, CLAUDE.md, the Phase 2 codebase, or by direct execution (`node --version`, `node -e ...`). No `[ASSUMED]` claims remain.

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| — | (none) | — | — |

**This table is empty.** All Phase 3 research findings are either [VERIFIED] (via tool/exec) or [CITED] (sourced from CONTEXT.md, CLAUDE.md, ADRs, or upstream code with file:line references). No user confirmation needed.

## Open Questions

1. **Should `bin/lib/install.cjs` use sync or async I/O?**
   - What we know: Upstream is fully sync (`fs.readFileSync`, `fs.writeFileSync`). Phase 1+2 code is sync. `node:test` supports both seamlessly.
   - What's unclear: Async (`fs.promises`) is more idiomatic 2026, and `fs.cp` is async-only. Mixing async `fs.cp` with sync `fs.readFileSync` works but is ugly.
   - Recommendation: Make orchestrator async (`async function installRuntime`). Use `fs.promises` everywhere except for tiny snapshot helpers in tests. Adapter lifecycle hooks remain sync (they're pure transforms over strings, no I/O). This matches `fs.cp`'s shape and gives natural test ergonomics with `await`.

2. **Should `transform*` hooks at Phase 3 be `(c) => c` arrow functions or omitted?**
   - What we know: D-01 lists them as required; CONTEXT.md "Claude's Discretion" calls this a style choice.
   - What's unclear: If hooks are omitted, orchestrator needs `adapter.transformCommand?.(content) ?? content` — adds a `??` everywhere they're called.
   - Recommendation: Define them explicitly as `(content) => content` in each adapter at Phase 3. Cost: 4 lines × 3 adapters = 12 lines. Benefit: orchestrator code is `adapter.transformCommand(content)` cleanly, no nullish-coalesce noise. When Phase 4/8 fills them, only the adapter file changes.

3. **Should the unwanted-runtime grep test scan `tests/` too?**
   - What we know: D-18 says "excluding the test itself." Naturally grep finds the runtime names in the test file (it has to mention them).
   - What's unclear: Should other test files (e.g., a hypothetical Phase 8 test that compares against upstream) be excluded?
   - Recommendation: Phase 3 grep test scans `bin/` + `scripts/install*.cjs` + `bin/install.js`. Excludes `foundation-frameworks/`, `tests/`, `decisions/`, `.planning/`, `THIRD-PARTY-LICENSES.md`, license files, the test file itself. Scope is "shipped runtime code", not "the repo." Document the exclusion list in the test file as `EXCLUDED_PATHS`.

4. **Where should the orchestrator log to during install?**
   - What we know: D-16 says "errors → stderr, success → stdout." CONTEXT.md "Specifics" wants a single deterministic line per runtime: `installed: claude — N files copied, marker injected, state at <path>`.
   - What's unclear: Should there be intermediate progress lines (`copying commands... done`)?
   - Recommendation: Phase 3 emits **only** the final summary line per runtime in non-verbose mode. Intermediate lines hidden behind `--verbose`. Keeps CI/integration-test logs grepable; matches the "single-line summary at end of run" pattern from Phase 2.

5. **Snapshot format for `renderInstructionBlock`?**
   - What we know: CONTEXT.md "Claude's Discretion" leaves this open. Both inline string assertions and fixture files work.
   - What's unclear: Inline strings make tests self-contained but noisy; fixture files separate test logic from expected output but require a sync mechanism.
   - Recommendation: **Inline strings** for Phase 3. Block bodies are ~5-10 lines per adapter. Fixture files become valuable when block content grows past ~30 lines or includes embedded markdown that's painful to escape — neither is true at Phase 3.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Everything | ✓ | v22.17.1 | — (engines `>=22.0.0` enforces) |
| `node:util.parseArgs` | `bin/lib/args.cjs` | ✓ | built-in | — |
| `node:fs.cp` | `bin/lib/copy-files.cjs` | ✓ | built-in | — |
| `node:test` | All `phase-03-*.test.cjs` | ✓ | built-in | — |
| `node:crypto.createHash` | `bin/lib/copy-files.cjs::sha256File` | ✓ | built-in | — |
| `npm` (for tarball install smoke) | `scripts/install-smoke.cjs` | ✓ | ships with Node 22 | — |
| Git (for `git rev-parse HEAD` in smoke) | `scripts/install-smoke.cjs` | ✓ | system tool | — |
| Public GitHub repo (`OTOJulian/oto-hybrid-framework`) | Live install-smoke (D-23) | ✓ | Phase 2 verified | — |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** None.

[VERIFIED: `node --version` → v22.17.1; `node -e "console.log(typeof require('node:util').parseArgs, typeof require('fs').cp, typeof require('fs/promises').cp)"` → `function function function` (2026-04-28).]

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | `node:test` + `node:assert/strict` (Node 22+ built-in) |
| Config file | none — discovery via glob `tests/*.test.cjs` |
| Quick run command | `node --test tests/phase-03-*.test.cjs` |
| Full suite command | `npm test` (runs `node --test --test-concurrency=4 tests/*.test.cjs`) |

### Phase Requirements → Test Map

Sampling rate: **per-task quick run runs only the touched module's `phase-03-<area>.test.cjs`; per-wave merge runs all phase-03 tests; phase gate runs the full suite (`npm test`).** Nyquist sampling is satisfied because the integration tests exercise the full install lifecycle (install → re-install → uninstall) end-to-end on real `os.tmpdir()`, while unit tests exercise each lifecycle step in isolation.

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INS-01 | `bin/install.js` is a thin shell that dispatches install/uninstall | unit | `node --test tests/phase-03-bin-shell.test.cjs` | ❌ Wave 0 |
| INS-01 | Help output documents only Claude / Codex / Gemini | unit | `node --test tests/phase-03-help-output.test.cjs` | ❌ Wave 0 |
| INS-01 | No grep hit for 11 unwanted runtimes in `bin/`+`scripts/install*` | grep | `node --test tests/phase-03-no-unwanted-runtimes.test.cjs` | ❌ Wave 0 |
| INS-02 | Each adapter exports the full descriptor + lifecycle hook contract | unit | `node --test tests/phase-03-runtime-claude.test.cjs` etc. | ❌ Wave 0 |
| INS-02 | Orchestrator has zero `runtime === 'codex'` branches | grep | `node --test tests/phase-03-no-runtime-conditionals.test.cjs` | ❌ Wave 0 |
| INS-03 | `--config-dir` flag wins over env var and default | unit | `node --test tests/phase-03-args.test.cjs` | ❌ Wave 0 |
| INS-03 | Env var wins over default when no flag | unit | `node --test tests/phase-03-args.test.cjs` | ❌ Wave 0 |
| INS-03 | Default = `~/.<runtime>` when no flag and no env | unit | `node --test tests/phase-03-args.test.cjs` | ❌ Wave 0 |
| INS-04 | Files copied (not symlinked) into target | integration | `node --test tests/phase-03-install-claude.integration.test.cjs` | ❌ Wave 0 |
| INS-04 | Re-install is idempotent (file-set stable) | integration | (same as above) | ❌ Wave 0 |
| INS-04 | Uninstall removes all installed files + restores user content | integration | (same as above) | ❌ Wave 0 |
| INS-04 | Marker block injected with surrounding user content preserved | integration | (same as above) | ❌ Wave 0 |
| INS-05 | `oto install --claude` produces a working install on a clean tmpdir | integration | `node --test tests/phase-03-install-claude.integration.test.cjs` | ❌ Wave 0 |
| INS-05 | `oto install --codex` and `--gemini` succeed at Phase 3 (best-effort, identity transforms) | integration | `node --test tests/phase-03-install-codex.integration.test.cjs` `…-gemini…` | ❌ Wave 0 |
| INS-06 | `--all` detects present runtimes via dir existence | unit | `node --test tests/phase-03-runtime-detect.test.cjs` | ❌ Wave 0 |
| INS-06 | `--all` + `--config-dir` rejected at parse time (exit 3) | unit | `node --test tests/phase-03-args.test.cjs` | ❌ Wave 0 |
| INS-06 | `--all` with no present runtimes exits 4 with stderr message | integration | `node --test tests/phase-03-install-all.integration.test.cjs` | ❌ Wave 0 |

**Manual verification (smoke):** Phase 3 exit gate requires running `node scripts/install-smoke.cjs` once (the extended D-23 version) on a Mac to confirm the live `npm install -g github:OTOJulian/oto-hybrid-framework` produces a binary that successfully runs `oto install --claude --config-dir <tmp>`. Not automated until Phase 10.

### Sampling Rate

- **Per task commit:** `node --test tests/phase-03-<area>.test.cjs` (single file, < 1s for unit tests, < 5s for integration)
- **Per wave merge:** `node --test tests/phase-03-*.test.cjs` (~10s)
- **Phase gate:** `npm test` (full suite green) AND manual `node scripts/install-smoke.cjs`

### Wave 0 Gaps

Phase 3 requires creating these files before any production code:

- [ ] `tests/phase-03-args.test.cjs` — covers INS-03 + INS-06 arg validation
- [ ] `tests/phase-03-runtime-detect.test.cjs` — covers INS-06 `--all` detection
- [ ] `tests/phase-03-marker.test.cjs` — covers marker injection idempotency (INS-04 indirectly)
- [ ] `tests/phase-03-install-state.test.cjs` — covers state schema validation
- [ ] `tests/phase-03-runtime-claude.test.cjs` — covers INS-02 adapter contract (Claude)
- [ ] `tests/phase-03-runtime-codex.test.cjs` — covers INS-02 adapter contract (Codex Phase 3 minimum-viable)
- [ ] `tests/phase-03-runtime-gemini.test.cjs` — covers INS-02 adapter contract (Gemini Phase 3 minimum-viable)
- [ ] `tests/phase-03-no-unwanted-runtimes.test.cjs` — covers INS-01 / SC#4 grep enforcement
- [ ] `tests/phase-03-no-runtime-conditionals.test.cjs` — covers INS-02 / SC#2 (no `runtime === 'codex'` outside adapters)
- [ ] `tests/phase-03-bin-shell.test.cjs` — covers INS-01 thin-shell shape
- [ ] `tests/phase-03-help-output.test.cjs` — covers INS-01 / D-15
- [ ] `tests/phase-03-install-claude.integration.test.cjs` — covers INS-04 + INS-05
- [ ] `tests/phase-03-install-codex.integration.test.cjs` — covers INS-05
- [ ] `tests/phase-03-install-gemini.integration.test.cjs` — covers INS-05
- [ ] `tests/phase-03-install-all.integration.test.cjs` — covers INS-06

Framework install: **none required.** `node:test` is built-in. Existing `tests/helpers/` from Phase 1+2 already provides the test conventions (`fixtures/`, `helpers/`, `.test.cjs` suffix, `os.tmpdir()` + `t.after()` cleanup).

## Sources

### Primary (HIGH confidence)

- `foundation-frameworks/get-shit-done-main/bin/install.js` (7,755 lines) — Reference for fork:
  - Lines 81–134: arg-parsing (oto's `args.cjs` replaces with `node:util.parseArgs`)
  - Lines 171–186: `getDirName` (oto's `defaultConfigDirSegment` descriptor field)
  - Lines 278–422: `getGlobalDir` runtime resolution (oto's `resolveConfigDir` consolidates)
  - Lines 437–459: `parseConfigDirArg` (`expandTilde` + arg pickup adopted in oto's `args.cjs`)
  - Lines 479–484: `expandTilde` (port verbatim)
  - Lines 543–588: `stripJsonComments` (defer to Phase 5; not needed at Phase 3)
  - Lines 597–622: `readSettings` / `writeSettings` (Phase 5 reference; identity at Phase 3)
  - Lines 1991–2016: `convertClaudeAgentToCodexAgent` (Phase 8 reference for Codex `transformAgent`)
  - Lines 2017–2064: `generateCodexAgentToml` (Phase 4/5 reference)
  - Lines 2168–2965: TOML manipulation suite (Phase 5 reference; **not Phase 3**)
  - Lines 3349–3380: `mergeCopilotInstructions` (port pattern verbatim into `marker.cjs`)
  - Lines 3388–3402: `stripGsdFromCopilotInstructions` (port pattern into `removeMarkerBlock`)
  - Lines 4570–4719: `copyWithPathReplacement` (replaced by `fs.cp` + transform pass)
  - Lines 4720–4733: `cleanupOrphanedFiles` (Phase 3 doesn't need static orphan list — `state.files[]` diff handles renames/removals)
  - Lines 4877–5396: `uninstall` (reference for D-10 lifecycle)
  - Lines 5610–5662: `verifyInstalled`, `fileHash` (port `fileHash` as `sha256File`)
  - Lines 5683–5768: `writeManifest` (oto's `writeState` is the analogue, but namespaced subdir + state schema are oto-specific)
  - Lines 5872–6865: `install` (reference for D-09 lifecycle)
  - Lines 7585–7626: `installAllRuntimes` (reference for D-04 / D-06)
- `foundation-frameworks/get-shit-done-main/package.json` — engines, scripts, files allowlist patterns
- CLAUDE.md (project root) — TL;DR + Why These Choices §1–7 + What NOT to Use + Stack Patterns
- `.planning/phases/03-installer-fork-claude-adapter/03-CONTEXT.md` — Decisions D-01..D-24 (locked)
- `.planning/REQUIREMENTS.md` — INS-01..INS-06 + Out of Scope table
- `.planning/ROADMAP.md` Phase 3 — Five concrete success criteria
- `.planning/research/PITFALLS.md` — Pitfalls 1, 5, 6, 11, 16, 20 (cross-referenced in CONTEXT.md)
- `decisions/ADR-04-sessionstart.md` — Single SessionStart contract (Phase 5 implements; Phase 3 stubs `mergeSettings`)
- `decisions/ADR-11-distribution.md` — `oto` bin command, GitHub install URL template
- `decisions/ADR-13-license-attribution.md` — Installer never touches `LICENSE` / `THIRD-PARTY-LICENSES.md`

### Secondary (MEDIUM confidence)

- Node 22 docs (`node:util.parseArgs`, `node:fs.cp`) — verified by direct exec: `node --version` → 22.17.1; `node -e "console.log(typeof ...)"` → all built-ins available.
- `foundation-frameworks/superpowers-main/.codex/INSTALL.md` — Confirms Superpowers' anti-pattern (manual symlink, not installer) — useful as foil for oto's copy-based approach (CLAUDE.md "Stack Patterns").
- `foundation-frameworks/superpowers-main/.claude-plugin/plugin.json` and `.codex-plugin/plugin.json` — Plugin manifest shape; **not needed for Phase 3** (oto is npm-installer-driven, not plugin-manifest-driven). Documenting here so the planner doesn't accidentally try to add them.

### Tertiary (LOW confidence)

None — all key claims are verified against upstream code, CONTEXT.md, or direct exec.

## Project Constraints (from CLAUDE.md)

The planner MUST verify every plan/task respects these CLAUDE.md directives. Listed for compliance check:

| Constraint | Source in CLAUDE.md | Phase 3 Application |
|------------|---------------------|---------------------|
| Node ≥ 22.0.0 | TL;DR + engines field | `bin/install.js` enforces with `process.exit(1)` if `process.versions.node` major < 22 (per CONTEXT.md "Specifics"). |
| CommonJS only at top level | TL;DR | All `bin/lib/*.cjs` files use `require()`/`module.exports`. No `import`. |
| No top-level TypeScript | TL;DR + Why §1 | Phase 3 ships no `.ts` files. |
| Zero deps for installer/library | TL;DR + Why §4 + Pitfall 11 | Only Node 22+ built-ins. No new entries in `package.json` `dependencies` or `devDependencies`. |
| `node:test` for tests | Why §4 | All Phase 3 tests use `node:test`. No Vitest/Jest. |
| Copy not symlink | Why §3 + What NOT to Use | `fs.cp { recursive, force }`. INS-04 enforces. |
| Claude Code primary | TL;DR + MR-01 | Claude is v0.1.0 happy path; Codex/Gemini Phase 3 minimum-viable (D-12, INS-05). |
| Markers `<!-- OTO Configuration -->` for instruction injection | Stack Patterns by Variant | D-08 implements verbatim. |
| Per-runtime conventions baked at install time | Stack Patterns | Adapters hold filename/format/env-var (D-01 descriptor). |
| `package.json` `files` allowlist explicit | TL;DR §2 | Already covers `bin/` recursively (D-19). No change. |
| `prepare` lifecycle for any build step | Stack Patterns | Phase 3 has no build step. `postinstall` already runs `build-hooks.js` (Phase 2 / FND-03), invoked from Phase 5+ when there are real hooks. |
| Bash-only installer is forbidden | What NOT to Use | Installer is Node-based. |
| No `npm publish` | TL;DR + What NOT to Use | Phase 3 unaffected (no publish step). Live install-smoke uses `github:OTOJulian/...` URL. |

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every primitive verified by direct exec (`node --version`, `node -e ...`).
- Architecture (adapter shape, orchestrator pattern, marker injection): HIGH — locked in CONTEXT.md D-01..D-24 with rationale; upstream `mergeCopilotInstructions` (`bin/install.js:3349`) is the canonical port source.
- Pitfalls: HIGH — cross-referenced to upstream code lines, PITFALLS.md, and direct experience-based reasoning. Pitfall D (line ending hash drift) is MEDIUM (depends on CI host config).
- Test strategy: HIGH — pattern matches Phase 1+2 (`tests/*.test.cjs`, `os.tmpdir()`, `t.after()`), and one example file already references the right helpers (`tests/phase-02-allowlist.test.cjs:16-24`).
- Wave 0 gap list: HIGH — derived from D-21 + INS-01..INS-06 mapping.

**Research date:** 2026-04-28
**Valid until:** 2026-05-28 (30 days). Triggers for re-research: any change to CONTEXT.md decisions, any new ADR, upstream `bin/install.js` version bump beyond v1.38.5 that the sync pipeline (Phase 9) reveals.
