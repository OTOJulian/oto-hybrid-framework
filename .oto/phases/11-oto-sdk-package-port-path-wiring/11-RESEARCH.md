# Phase 11: oto-sdk package port + PATH wiring - Research

**Researched:** 2026-05-25
**Domain:** Node ESM module resolution for a npm-installed subpackage CLI; faithful TypeScript subpackage port; installer PATH-wiring
**Confidence:** HIGH

## Summary

Phase 11 ports GSD's `sdk/` subpackage into oto's top-level `sdk/`, adds a `bin/oto-sdk.js` shim + `package.json` bin entry, ships a prebuilt `sdk/dist/`, and ports the dead-but-authoritative #2775 PATH-wiring machinery into the live installer. The single highest-risk item — runtime dependency resolution — is **resolved and empirically proven**: declaring `@anthropic-ai/claude-agent-sdk` and `ws` in the **top-level** `package.json` `dependencies` causes npm to install them into `<pkg>/node_modules/`, and Node's upward module resolution from `sdk/dist/cli.js` finds them. A clean `npm install -g <tarball>` (and the equivalent github-archive install) yields a working `oto-sdk query` with no sub-install and no manual build. The negative case (deps only in `sdk/package.json`, no shipped `sdk/node_modules`) crashes with `ERR_MODULE_NOT_FOUND` — the exact failure CONTEXT warns about. [VERIFIED: local npm pack + install simulation, this session]

The rebrand pipeline does **not** cover the SDK: `scripts/gen-inventory.cjs` line 95-96 explicitly drops `^sdk/` with verdict `drop` / "SDK dropped from v1 per ADR-12". Prior phases never ran the SDK through the rebrand engine. The SDK must therefore be **ported manually** (copy the subtree, apply targeted gsd→oto identifier + user-facing-string renames). The rebrand engine's `applyCoverageCleanup` (`gsd-sdk`→`oto-sdk`) and `package` rule *would* handle the bin rename if pointed at the SDK, but the established pipeline excludes it, so a manual port is the consistent, lower-risk path. [VERIFIED: gen-inventory.cjs grep, this session]

For Phase 11, "returns structured output" is satisfiable against the existing `.planning/` layout in this repo: pure handlers (`generate-slug`, `current-timestamp`) and `.planning/`-reading handlers (`state.json`, `progress`, `roadmap.analyze`, `find-phase`, `config-get`) all answer without Phase 12's `.oto/` re-pathing. Only the `state.load` and CJS-bridge fallback paths (which resolve `../../get-shit-done/bin/...`, absent in oto) would fail — and those are explicitly Phase 12's deep re-pathing concern.

**Primary recommendation:** Manually port `foundation-frameworks/get-shit-done-main/sdk/` → top-level `sdk/`, build `dist/` once with `tsc` and commit it, declare both heavy deps in the **top-level** `package.json` `dependencies`, add `oto-sdk` bin + `files` entries, port the #2775 machinery into `bin/lib/install.cjs` as a once-per-invocation global step (paths corrected to top-level `bin/oto-sdk.js` + `sdk/dist/cli.js`), and verify via a `npm pack` → temp-prefix install → `oto-sdk query generate-slug "X"` smoke that asserts structured JSON and no missing-module crash.

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Port scope — Faithful full port + deps (LOCKED, user decision)**
- Port GSD's entire `sdk/` source faithfully (including the programmatic runner: `phase-runner`, `session-runner`, `ws-transport`, `event-stream`, `init-runner`, the `GSD` class, transports), not a query-only trim.
- Rationale: lowest port effort, preserves clean future upstream syncs, keeps the programmatic runner available. The runner is not used by oto's slash-command workflows today (those use Claude Code's native Task tool), but fidelity-to-upstream was chosen over trimming.

**Dependency strategy (LOCKED, user decision)**
- Declare `@anthropic-ai/claude-agent-sdk` (^0.2.84) and `ws` (^8.20.0) as **regular dependencies** so the full SDK works out of the box on a clean install.
- Critical constraint: `cli.ts` statically imports `index.ts` (→ `session-runner`/`event-stream` → Agent SDK) and `ws-transport` (→ `ws`). At module load, `node sdk/dist/cli.js` transitively requires both deps. Both deps MUST be resolvable at runtime for `oto-sdk query` to even start — a missing-module crash would fail SC #1 just as surely as `command not found`.

**Installer wiring — Bin entry + port #2775 verify into the live installer (LOCKED, Q2 = Option A)**
- Add the `package.json` bin entry (`oto-sdk` → `bin/oto-sdk.js`); npm auto-links it on a github-archive global install.
- Port the #2775 machinery from the dead `oto/bin/install.js` (~lines 7267–7602) into the LIVE installer `bin/lib/install.cjs`, paths corrected from `oto/bin/`+`oto/sdk/` to canonical top-level `bin/oto-sdk.js` + `sdk/dist/cli.js`:
  - `isOtoSdkOnPath()` — pure PATH walk for a callable `oto-sdk`.
  - `trySelfLinkOtoSdk()` — `~/.local/bin` (or first writable on-PATH HOME dir) self-link/wrapper fallback.
  - dist-presence verify + "✓ OTO SDK ready" gated on real PATH-callability (avoid the false-✓ #2775 was created to prevent).

**Mechanics decided by Claude (per CLAUDE.md Technology Stack, low-stakes)**
- SDK location: top-level `sdk/` subpackage with its own `package.json` (`type: module`, ESM) and `tsconfig.json`, mirroring GSD. TypeScript stays confined to `sdk/`.
- Shim location: top-level `bin/oto-sdk.js` (covered by the existing `bin/` `files` entry), resolving `path.resolve(__dirname, '..', 'sdk', 'dist', 'cli.js')`.
- Build/ship: commit `sdk/dist/` to git and ship it prebuilt. Do NOT add `tsc` to `postinstall`/`prepare`. The existing `postinstall: build-hooks.js` stays untouched.
- `files` allowlist: add the SDK payload needed at runtime (e.g. `sdk/dist/`, `sdk/package.json`, and `sdk/prompts/` if present). `bin/oto-sdk.js` is already covered by `bin/`.
- Rebrand depth: surface rebrand only — package name, bin name (`gsd-sdk`→`oto-sdk`), shim, and user-facing CLI strings (help/usage/errors). Deep registry re-pathing (`.planning/`→`.oto/`, namespace semantics, `gsd-tools.cjs`/`core.cjs` resolution) is Phase 12.

### Claude's Discretion
- Exact ordering/structure of the SDK-wiring step within `install.cjs` (a once-per-invocation global step after runtime installs complete).
- Whether to run the SDK through the rebrand engine with a temporary inventory override, or port manually (research recommends **manual** — see Architecture Patterns).
- Depth of internal `GSD`→`OTO` identifier renaming (cosmetic; not required for the binary to run — see Pitfall 4).

### Deferred Ideas (OUT OF SCOPE)
- Query registry re-pathing to `.oto/` and oto namespaces → Phase 12 (SDK-03).
- Workflow consumption of `oto-sdk query` with graceful fallback → Phase 12 (SDK-05).
- `.planning/`→`.oto/` repo migration → Phase 13 (DOG-*).
- Trimming the programmatic runner / dropping heavy deps → explicitly rejected this phase (faithful full port chosen).

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SDK-01 | `oto-sdk query <key>` resolves the CLI and returns structured output instead of `command not found: oto-sdk` | Bin entry + shim make it resolvable (Don't Hand-Roll: npm bin linking); top-level dep declaration makes the static-import chain load without crash (Pitfall 1, VERIFIED simulation); `.planning/`-backed registry keys return JSON (see "Phase 11 Query Keys") |
| SDK-02 | After install, `oto-sdk` is callable on PATH — wired via `package.json` bin entry and the installer's PATH-resolution check | `bin: { "oto-sdk": "bin/oto-sdk.js" }` (npm auto-links on `-g`); ported `isOtoSdkOnPath()` + `trySelfLinkOtoSdk()` + PATH-gated "✓ OTO SDK ready" in `bin/lib/install.cjs` (Code Examples) |
| SDK-04 | A clean GitHub-archive install yields a working `oto-sdk` with no separate manual build step (SDK prebuilt/shipped) | Commit `sdk/dist/`; `files` ships `sdk/dist`+`sdk/package.json`(+`sdk/prompts`); github-archive install runs `postinstall` not `prepublishOnly`, and since dist is prebuilt no build runs at all (Pitfall 2, Specifics) |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@anthropic-ai/claude-agent-sdk` | `^0.2.84` | Agent SDK `query()` used by `session-runner.ts` (programmatic runner) | Faithful match to GSD's `sdk/package.json`. Loaded at module init via `cli.ts → index.ts → session-runner.ts`. [VERIFIED: sdk/package.json, session-runner.ts grep] |
| `ws` | `^8.20.0` | WebSocket transport (`ws-transport.ts`) used by the `--ws-port` flag | Faithful match to GSD. Loaded at module init via `cli.ts → ws-transport.ts`. [VERIFIED: sdk/package.json, ws-transport.ts grep] |
| TypeScript | `^5.7.0` (devDep, sdk only) | Compiles `sdk/src/*.ts` → `sdk/dist/*.js` once, before commit | GSD's `sdk/devDependencies`. Confined to `sdk/`. [CITED: sdk/package.json] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@types/node` | `^22.0.0` | Type defs for build | sdk devDep, build-time only |
| `@types/ws` | `^8.18.1` | Type defs for `ws` | sdk devDep, build-time only |
| `vitest` | `^3.1.1` | SDK unit/integration tests | sdk devDep; runs in `sdk/`, NOT in top-level `npm test`. Scoped out of Phase 11's ship path (tests excluded from dist). |

### Version note (IMPORTANT for planner)
`^0.2.84` resolves to the **0.2.x line** (caret on a `0.x.y` version locks the minor): highest installable is currently `0.2.141`. The current registry latest is `0.3.150`, which `^0.2.84` will NOT pull. This is correct for a faithful port — keep `^0.2.84`. agent-sdk unpacked size ~4.6 MB with zero transitive deps; `ws` is small. Install weight is modest. [VERIFIED: `npm view @anthropic-ai/claude-agent-sdk@^0.2.84 version` → 0.2.141; `dist.unpackedSize` 4602516; `dependencies` `{}`, this session]

### Installation (top-level package.json change)
The heavy deps go in the **top-level** `oto` `package.json` `dependencies` (NOT only in `sdk/package.json`). This is the resolution-critical decision (see Architecture Pattern 1):
```jsonc
// package.json (top level)
"dependencies": {
  "@anthropic-ai/claude-agent-sdk": "^0.2.84",
  "ws": "^8.20.0"
}
```
The ported `sdk/package.json` keeps its own `dependencies` block too (faithful port + clean upstream sync), but the runtime resolution is satisfied by the top-level install.

### Version verification (this session)
- `@anthropic-ai/claude-agent-sdk` `^0.2.84` → installs `0.2.141`. [VERIFIED: npm view]
- `ws` `^8.20.0` → installs `8.21.0`. [VERIFIED: npm view]
- Node 22.17.1 / npm 10.9.2 locally; both meet `engines.node >=22.0.0`. [VERIFIED: node --version / npm --version]

## Architecture Patterns

### Recommended Layout (additions only)
```
oto-hybrid-framework/
├── bin/
│   ├── install.js              # LIVE bin entry (package.json bin.oto) — unchanged
│   ├── oto-sdk.js              # NEW: shim → resolves ../sdk/dist/cli.js, spawns node
│   └── lib/
│       └── install.cjs         # MODIFIED: gains the #2775 SDK-wiring step
├── sdk/                        # NEW: manual port of GSD sdk/
│   ├── package.json            # name @oto-build/sdk (or similar), type:module, bin oto-sdk, deps kept
│   ├── tsconfig.json           # outDir dist, excludes *.test.ts / *.integration.test.ts
│   ├── src/                    # ported .ts (86 source + 78 test files in upstream)
│   ├── dist/                   # NEW + COMMITTED: prebuilt tsc output (cli.js, index.js, query/, ...)
│   └── prompts/templates/      # ported (needed by `init` runner; not by `query`)
└── package.json                # MODIFIED: bin.oto-sdk, files += sdk payload, dependencies += deps
```

### Pattern 1: Runtime dependency resolution via upward node_modules walk (RESOLVES Research Q1)
**What:** Declare `@anthropic-ai/claude-agent-sdk` and `ws` in the **top-level** `package.json` `dependencies`. On `npm install -g <tarball|github-archive>`, npm installs them into `<install-prefix>/lib/node_modules/oto/node_modules/`. The ESM `import` in `sdk/dist/cli.js` (statically: `./index.js` → `session-runner.js` → `@anthropic-ai/claude-agent-sdk`; and `./ws-transport.js` → `ws`) triggers Node's resolution algorithm, which walks **up** from `sdk/dist/` (`sdk/dist/node_modules` → `sdk/node_modules` → `oto/node_modules`) and finds the deps.

**Why this option over alternatives:**
- (a) Top-level `dependencies` — **CHOSEN.** No sub-install, no shipped `node_modules`, npm manages versions. [VERIFIED below]
- (b) Ship `sdk/node_modules/` — bloats the repo/tarball with ~4.6 MB of vendored code, defeats npm dedup, hard to keep current. Rejected.
- (c) Keep deps only in `sdk/package.json` + add an install step — requires running the SDK's own `npm install` on the user's machine (forbidden by CONTEXT: "do NOT run the SDK subpackage's own `npm install`"), and CLAUDE.md warns against install-time toolchain risk. Rejected. Proven to crash (negative case below).

**Empirical proof (this session):** Built a minimal package mirroring oto's shape — top-level `package.json` declaring a dep, `bin/oto-sdk.js` shim, ESM `sdk/dist/cli.js` that `import`s the dep, `sdk/package.json` with `type:module`. `npm pack` → `npm install -g <tarball> --prefix <tmp>`:
- Positive (dep top-level): dep installed at `…/node_modules/oto-sim/node_modules/left-pad`; `oto-sdk` ran and printed structured JSON; exit 0.
- Negative (dep only in sdk/, not shipped): no dep installed anywhere; `oto-sdk` crashed with `code: 'ERR_MODULE_NOT_FOUND'`; non-zero exit.

This is the make-or-break finding and it confirms the locked decision. [VERIFIED: /tmp simulation, this session]

### Pattern 2: Shim resolves CLI relative to its own __dirname (port faithfully)
**What:** `bin/oto-sdk.js` is CJS, computes `path.resolve(__dirname, '..', 'sdk', 'dist', 'cli.js')`, and `spawnSync(process.execPath, [cliPath, ...argv])` with `stdio:'inherit'`.
**Why:** Invoking via `node <cli.js>` means the dist execute-bit is irrelevant (works at 0o644). The `__dirname`-relative resolve is what lets the #2775 self-link fallback create a `require()` wrapper (not a copy) so resolution still points at the real `sdk/dist/`. Direct port of `bin/gsd-sdk.js` with `gsd`→`oto` string swaps. [CITED: foundation-frameworks/.../bin/gsd-sdk.js]

### Pattern 3: #2775 PATH-wiring as a once-per-invocation global installer step (RESOLVES installer wiring)
**What:** The live `bin/lib/install.cjs` installs per-runtime (`installRuntime`) and `installAll`. PATH-callability of `oto-sdk` is **runtime-independent** (it's about the npm global bin / `~/.local/bin`, not `~/.claude` vs `~/.codex`). So the ported step should run **once** after the runtime install(s) complete — not inside the per-runtime loop.
**Seam:** Add an exported `wireOtoSdk(opts)` (or `installSdkIfNeeded`) to `install.cjs` and call it once from `bin/install.js main()` after the install branch, OR have `installRuntime`/`installAll` invoke it once at the end (guard against double-invocation in the per-runtime loop). The dead source already centralizes this in a `finalize()` called from `installAllRuntimes` — mirror that "call once" intent.
**Functions to port (rename `Gsd`→`Oto`, correct paths):**
- `isGsdSdkOnPath()` → `isOtoSdkOnPath()` — pure PATH walk for a callable `oto-sdk` (no spawn). [SOURCE: oto/bin/install.js ~7494]
- `trySelfLinkGsdSdk(shimSrc)` → `trySelfLinkOtoSdk(shimSrc)` — `~/.local/bin`/on-PATH-HOME-dir symlink, falling back to a `require()` wrapper on symlink-hostile FS. [SOURCE: oto/bin/install.js ~7527]
- dist-presence verify (`sdk/dist/cli.js` exists; chmod +x best-effort) + PATH-gated "✓ OTO SDK ready" message. [SOURCE: oto/bin/install.js ~7358 installSdkIfNeeded]
**Path corrections:** dead source uses `path.resolve(__dirname, '..', 'sdk')` and `path.resolve(__dirname, 'oto-sdk.js')` where `__dirname` was `oto/bin`. In the LIVE installer, the shim is top-level `bin/oto-sdk.js` and dist is top-level `sdk/dist/cli.js`. Compute `shimSrc` and `sdkDir` from `opts.repoRoot` (already threaded into `install.cjs` as `repoRoot`), not from `__dirname` of the lib file. [VERIFIED: install.cjs already receives `opts.repoRoot`]
**Trim:** The dead source's `classifySdkInstall` (npx-cache / dev-clone / tarball heuristics, EACCES probes for #2649) is upstream-specific complexity. oto installs via `npm install -g github:...` (global), not npx-cache; keep a minimal dist-presence check + the dev-clone "build first" hint. The full classifier is optional polish — recommend keeping the dev-clone hint and the global "upgrade/install" hint, dropping npx-cache-specific branches unless the planner wants full parity.

### Pattern 4: Manual SDK port (NOT the rebrand pipeline) (RESOLVES rebrand-engine question)
**What:** Copy `foundation-frameworks/get-shit-done-main/sdk/` → top-level `sdk/`, then apply targeted gsd→oto renames (bin/package name, user-facing strings, optional internal identifiers).
**Why manual:** `scripts/gen-inventory.cjs` line 95-96 emits `verdict: 'drop'` for any `^sdk/` path ("SDK dropped from v1 per ADR-12"). The rebrand engine consumes this inventory, so the SDK is **excluded from the established pipeline**; prior phases never rebranded it. Two options:
  - Manual/scripted port (RECOMMENDED): consistent with the pipeline excluding the SDK; the subtree is self-contained; lets the planner control rebrand depth precisely (surface-only per CONTEXT).
  - Temporarily change the ADR-12 inventory rule to `keep` for `sdk/` and run the engine: the engine's `package` rule (`gsd-sdk`→`oto-sdk` bin) and `applyCoverageCleanup` (`gsd-sdk`→`oto-sdk`, `gsd`→`oto` identifier variants) *would* fire — but this re-opens an ADR decision and risks the engine's `.planning`→`.oto` path rule rewriting SDK code paths (which is Phase 12's job). Not recommended for Phase 11.
[VERIFIED: gen-inventory.cjs grep, this session]

### Anti-Patterns to Avoid
- **Declaring the heavy deps only in `sdk/package.json`** and shipping prebuilt dist without a sub-install — proven to crash with `ERR_MODULE_NOT_FOUND` (Pitfall 1).
- **Adding `tsc` to `prepare`/`postinstall`** — CLAUDE.md explicitly forbids install-time TS toolchain; commit `dist/` instead.
- **Running the #2775 step inside the per-runtime loop** — it's a global, once-per-invocation concern; running it per-runtime emits duplicate "✓ OTO SDK ready" lines and redundant self-link attempts.
- **`copyFileSync(shimSrc, target)` for the self-link fallback** — breaks `__dirname` resolution (the resolved CLI path becomes `~/.local/sdk/dist/cli.js`). Use a `require(shimSrc)` wrapper, exactly as the #2775 source does.
- **Doing Phase 12's re-pathing now** — do NOT change `BUNDLED_GSD_TOOLS_PATH`/`BUNDLED_CORE_CJS` resolution (`../../get-shit-done/bin/...`) to oto paths; that's the deep registry re-pathing CONTEXT defers.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Making `oto-sdk` callable globally | A custom PATH installer / shell-rc editor | npm's `bin` field auto-linking on `-g` install + the #2775 `~/.local/bin` fallback for the npx/non-PATH edge | npm chmods + links bin targets correctly from a tarball (avoids mode-644 #2453); #2775 already solves the "global bin not on PATH" edge |
| Resolving heavy deps for the subpackage CLI | Vendoring `sdk/node_modules`, a bundler, or a sub-`npm install` | Top-level `dependencies` + Node's upward resolution | Proven to work with zero extra machinery (Pattern 1); bundling/vendoring add CLAUDE.md-forbidden complexity |
| Compiling TS at install time | A `prepare` script running `tsc` | Commit prebuilt `sdk/dist/` | CLAUDE.md forbids install-time toolchain; github-archive install runs `postinstall` (build-hooks) but never `prepublishOnly`, so no SDK build triggers |
| Detecting a callable `oto-sdk` on PATH | A `spawnSync('oto-sdk', ['--version'])` probe | Ported `isOtoSdkOnPath()` pure PATH walk | Avoids spawn cost and the chicken-and-egg of running a not-yet-linked binary; handles `.cmd`/`.exe` on Windows |

**Key insight:** Every piece of machinery this phase needs already exists upstream (shim, #2775 PATH-wiring, the entire SDK). The work is faithful porting + correct dependency declaration + correct path-correction of the installer step — not invention.

## Phase 11 Query Keys (RESOLVES Research Q3)

"Returns structured output" is satisfiable against this repo's existing `.planning/` layout (verified present: `STATE.md`, `ROADMAP.md`, `REQUIREMENTS.md`, `config.json`, etc.). Handlers fall into three tiers:

| Tier | Example keys | Works in Phase 11? | Why |
|------|-------------|--------------------|-----|
| Pure (no FS) | `generate-slug`, `current-timestamp` | ✅ Yes | No `.planning/`, no CJS bridge. Best smoke target — e.g. `oto-sdk query generate-slug "My Phase"` → `{ "slug": "my-phase" }` |
| `.planning/`-reading (native registry) | `state.json`, `progress`, `roadmap.analyze`, `find-phase`, `config-get`, `phase.list-plans` | ✅ Yes (this repo has `.planning/`) | `planningPaths(projectDir).planning` resolves to `<cwd>/.planning`, which exists; handlers read it directly in-process |
| CJS-bridge / `core.cjs`-dependent | `state.load`, plus any unregistered key that falls through to `gsd-tools.cjs` | ❌ No (Phase 12) | `state.load` resolves `../../../get-shit-done/bin/lib/core.cjs` (absent in oto — oto has `oto/bin/lib/oto-tools.cjs`/`core.cjs`); the CJS fallback `resolveGsdToolsPath` similarly points at a non-existent path. This is the deep re-pathing CONTEXT defers. |

**Recommended SC #1 acceptance target:** `oto-sdk query generate-slug "Phase Eleven"` (pure, deterministic, zero FS dependency) for the canonical "resolves + structured output" proof, with a secondary `.planning/`-reading key (e.g. `oto-sdk query roadmap.analyze` or `state.json`) to demonstrate registry breadth. Do NOT gate Phase 11 on `state.load` or any CJS-bridge key. [VERIFIED: utils.ts (pure), state-project-load.ts (BUNDLED_CORE_CJS path), helpers.ts planningPaths, .planning/ contents]

## Minimum Rebrand for the Binary to Run (RESOLVES Research Q2)

Strictly required for `oto-sdk query` to resolve + return structured output:
1. **Bin name:** `gsd-sdk`→`oto-sdk` in `sdk/package.json` `bin` AND the new top-level `package.json` `bin.oto-sdk`. (Required for SDK-02 callability.)
2. **Shim:** `bin/oto-sdk.js` (gsd→oto string swaps in `bin/gsd-sdk.js`).
3. **Package name:** `@gsd-build/sdk`→ an oto name (e.g. `@oto-build/sdk`) — cosmetic for the binary, but part of surface rebrand.

Surface rebrand (user-facing, per CONTEXT — do these too):
4. **CLI help/usage/error strings** in `cli.ts` (`Usage: gsd-sdk …`, `gsd-sdk v${ver}`, error messages naming `gsd-sdk`). [CITED: cli.ts USAGE, lines 166/247-249/333/382]
5. **`GSD_QUERY_FALLBACK` env var** → `OTO_QUERY_FALLBACK` (env_var rule semantics). Note: if renamed, update both the read site (cli.ts) and any docs.

**Can stay as-is for Phase 11 (deep re-pathing, Phase 12):**
- `BUNDLED_GSD_TOOLS_PATH = ../../get-shit-done/bin/gsd-tools.cjs` and `BUNDLED_CORE_CJS = ../../../get-shit-done/bin/lib/core.cjs` resolution in `gsd-tools.ts`/`state-project-load.ts`. These point at GSD's CJS layout (absent in oto). Leaving them means CJS-bridge keys fail — acceptable, those are Phase 12 keys.
- All `.planning/` path references inside handlers (`helpers.ts planningPaths`, `state.json`, etc.) — they resolve against `<cwd>/.planning`, which works in this repo today. Re-pathing to `.oto/` is Phase 12.
- Internal `GSD` class / `GSDError` / `GSDTools` / `GSDEvent` identifiers (48 files). **Not required for the binary to run.** Renaming them (via the `gsd`→`oto` identifier rule with `upper` case variant) is internally consistent if applied uniformly, but it's cosmetic and increases the port diff. The planner may rename or defer at discretion (CONTEXT marks rebrand depth as Claude's discretion). [VERIFIED: 48 files reference GSD identifiers; renaming is consistent-or-defer]

## Common Pitfalls

### Pitfall 1: Missing-module crash on clean install (the headline risk)
**What goes wrong:** `oto-sdk query` exits with `ERR_MODULE_NOT_FOUND` for `@anthropic-ai/claude-agent-sdk` or `ws` because the static import chain (`cli.ts → index.ts → session-runner.ts`; `cli.ts → ws-transport.ts`) loads both deps at module init — even for the `query` command, which otherwise dynamically imports its registry.
**Why it happens:** Deps declared only in `sdk/package.json` but `sdk/`'s own `npm install` never runs (CONTEXT forbids it) and `sdk/node_modules` isn't shipped.
**How to avoid:** Declare both in the **top-level** `package.json` `dependencies` (Pattern 1). Proven fix.
**Warning signs:** `command -v oto-sdk` resolves but `oto-sdk query generate-slug x` prints a Node stack trace ending in `code: 'ERR_MODULE_NOT_FOUND'`.

### Pitfall 2: `prepublishOnly` build never runs on github-archive install
**What goes wrong:** Relying on GSD's `sdk` `prepublishOnly: "rm -rf dist && tsc && chmod +x dist/cli.js"` to produce dist → on a `npm install -g github:...` install, `prepublishOnly` does NOT run, so `dist/` is absent and the shim resolves a non-existent `cli.js`.
**Why it happens:** github-archive/global installs run `prepare`/`postinstall`, not `prepublishOnly`.
**How to avoid:** Commit `sdk/dist/` to git and add it to `files`. Build is a one-time author step (`cd sdk && npm install && npm run build`), not an install-time step. Verify `sdk/dist/cli.js` is present in `npm pack` output. [VERIFIED: package.json has no `prepare`; CONTEXT Specifics]
**Warning signs:** Install succeeds but `oto-sdk` prints `Cannot find module …/sdk/dist/cli.js`.

### Pitfall 3: False "✓ OTO SDK ready" when bin isn't on PATH
**What goes wrong:** A file-presence-only check reports success, but `oto-sdk` isn't actually callable (npx-cache or non-PATH global bin). This is the exact #2775 regression.
**How to avoid:** Gate the "✓ OTO SDK ready" message on `isOtoSdkOnPath()` (after attempting `trySelfLinkOtoSdk`), not on dist presence. [SOURCE: oto/bin/install.js ~7458]
**Warning signs:** Installer prints ✓ but workflows fail with `command not found: oto-sdk`.

### Pitfall 4: `dist/` filenames retain `gsd` (cosmetic, low-impact)
**What goes wrong:** `gsd-tools.ts` → `gsd-tools.js` in dist; if internal identifiers are renamed but the filename/import isn't, build breaks.
**How to avoid:** If renaming filenames, rename the file AND all `import … from './gsd-tools.js'` sites together; or leave filenames as-is (they're internal, never user-facing). Recommend leaving internal filenames unchanged for a minimal, build-safe port. [VERIFIED: gsd-tools.ts present; index.ts imports './gsd-tools.js']

### Pitfall 5: Self-link fallback uses copy instead of require-wrapper
**What goes wrong:** `~/.local/bin/oto-sdk` created via `copyFileSync` breaks `__dirname`-relative CLI resolution.
**How to avoid:** Port the #2775 require-wrapper exactly (`#!/usr/bin/env node\nrequire("<abs shimSrc>");\n` + chmod 755). [SOURCE: oto/bin/install.js ~7571]

## Code Examples

### bin/oto-sdk.js (ported from bin/gsd-sdk.js)
```javascript
// Source: foundation-frameworks/get-shit-done-main/bin/gsd-sdk.js (gsd→oto)
#!/usr/bin/env node
'use strict';
const path = require('path');
const { spawnSync } = require('child_process');
const cliPath = path.resolve(__dirname, '..', 'sdk', 'dist', 'cli.js');
const result = spawnSync(process.execPath, [cliPath, ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: process.env,
});
process.exit(result.status ?? 1);
```

### isOtoSdkOnPath() — pure PATH walk (ported)
```javascript
// Source: oto/bin/install.js ~7494 (isGsdSdkOnPath → isOtoSdkOnPath)
function isOtoSdkOnPath() {
  const path = require('path');
  const fs = require('fs');
  const pathEnv = process.env.PATH || '';
  const exts = process.platform === 'win32' ? ['.cmd', '.exe', '.bat', ''] : [''];
  for (const seg of pathEnv.split(path.delimiter)) {
    if (!seg) continue;
    for (const ext of exts) {
      const candidate = path.join(seg, `oto-sdk${ext}`);
      try {
        const st = fs.statSync(candidate);
        if (st.isFile()) {
          if (process.platform === 'win32') return true;
          if ((st.mode & 0o111) !== 0) return true;
        }
      } catch { /* keep scanning */ }
    }
  }
  return false;
}
```

### SDK-wiring step seam in install.cjs (path-corrected)
```javascript
// NEW exported helper, called ONCE after runtime install(s) complete.
// repoRoot is already passed in opts (see installRuntime: opts.repoRoot).
function wireOtoSdk(opts = {}) {
  const repoRoot = opts.repoRoot || path.join(__dirname, '..', '..');
  const sdkCliPath = path.join(repoRoot, 'sdk', 'dist', 'cli.js');
  const shimSrc = path.join(repoRoot, 'bin', 'oto-sdk.js'); // top-level, NOT oto/bin
  if (!fs.existsSync(sdkCliPath)) { /* dist-missing error + dev-clone hint */ return; }
  try { const st = fs.statSync(sdkCliPath); if (!(st.mode & 0o111)) fs.chmodSync(sdkCliPath, st.mode | 0o111); } catch {}
  let onPath = isOtoSdkOnPath();
  if (!onPath) { const linked = trySelfLinkOtoSdk(shimSrc); if (linked) onPath = isOtoSdkOnPath(); }
  // gate the ✓ message on onPath (Pitfall 3)
}
```
[SOURCE: oto/bin/install.js installSdkIfNeeded ~7358, path-corrected to top-level]

## Runtime State Inventory

> Phase 11 is additive (new files + a new installer step). No rename of existing stored state, but the port carries GSD-named artifacts into the package.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — no datastore keys/collections are renamed by this phase. The `.planning/` layout is read but not migrated (that's Phase 13). | None |
| Live service config | None — `oto-sdk` is a local CLI; no external service registration. | None |
| OS-registered state | `~/.local/bin/oto-sdk` self-link (or require-wrapper) is created by the ported #2775 step on installs where the global bin isn't on PATH. Stale prior links are `unlink`ed before re-creating (source already handles this). | Verify the self-link points at the top-level `bin/oto-sdk.js` (path-corrected from the dead `oto/bin/oto-sdk.js`). |
| Secrets/env vars | `GSD_QUERY_FALLBACK` env var read in `cli.ts`. If renamed to `OTO_QUERY_FALLBACK` (surface rebrand), it's a code rename only — no secret value changes. | Optional rename; update read site + docs together if renamed. |
| Build artifacts | `sdk/dist/` is a NEW committed build artifact. Internal dist filenames retain `gsd` (e.g. `gsd-tools.js`) unless renamed — leaving them is build-safe (Pitfall 4). The dead `oto/bin/install.js` expects a shim at `oto/bin/oto-sdk.js`; the LIVE port puts it at top-level `bin/oto-sdk.js` — paths MUST be corrected during the port (CONTEXT-locked). | Build dist once and commit; verify `npm pack` includes `sdk/dist/cli.js`. |

## Common Pitfalls (summary already above)

## Validation Architecture

> Nyquist validation is enabled (config absent → enabled). Phase 11's central validation is the **clean-install simulation** proving `oto-sdk query <key>` resolves + returns structured output with no manual build and no missing-module crash.

### Test Framework
| Property | Value |
|----------|-------|
| Framework (top-level) | `node:test` (built-in), run via `node --test --test-concurrency=4 tests/*.test.cjs` |
| Framework (sdk subpackage) | `vitest ^3.1.1` — runs in `sdk/`, NOT part of top-level `npm test`; scoped out of Phase 11's ship/gate |
| Config file | top-level: none (CLI flags); sdk: `sdk/vitest.config.ts` (ported, unit+integration projects) |
| Quick run command | `node --test tests/sdk-install.test.cjs` (NEW Phase 11 smoke test) |
| Full suite command | `npm test` (top-level node:test suite) |
| Clean-install sim | `node scripts/install-smoke.cjs` (EXTENDED — see below) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SDK-01 | `oto-sdk query generate-slug "X"` resolves + emits structured JSON; no `ERR_MODULE_NOT_FOUND` | install-smoke (integration) | extend `scripts/install-smoke.cjs`: after global install into temp prefix, run `<prefix>/bin/oto-sdk query generate-slug "Phase Eleven"`, assert exit 0 + JSON contains `"slug": "phase-eleven"` | ❌ Wave 0 (extend existing smoke) |
| SDK-01 | `.planning/`-backed key returns structured output | install-smoke (integration) | in a temp project with `.planning/`, run `oto-sdk query roadmap.analyze` (or `state.json`); assert exit 0 + parseable JSON | ❌ Wave 0 |
| SDK-02 | `oto-sdk` callable on PATH via bin entry; installer PATH check passes | install-smoke (integration) | assert `<prefix>/bin/oto-sdk` exists + executable (mode & 0o111); run `oto install --claude --config-dir <tmp>` and assert stdout contains "OTO SDK ready" (PATH-gated) | ❌ Wave 0 |
| SDK-02 | `isOtoSdkOnPath()` / `trySelfLinkOtoSdk()` behave (PATH walk, self-link, require-wrapper fallback) | unit (node:test) | NEW `tests/sdk-wiring.test.cjs`: stub PATH env + a fake bin dir, assert detection true/false; assert self-link creates symlink or require-wrapper | ❌ Wave 0 |
| SDK-04 | Clean github-archive install yields working `oto-sdk` with NO manual build | install-smoke (integration) | `npm pack` then `npm install -g <tarball> --prefix <tmp>`; assert `sdk/dist/cli.js` present in the installed tree and `oto-sdk` runs WITHOUT any `tsc`/build step having run | ❌ Wave 0 |
| SDK-04 | `files` allowlist ships the SDK payload | unit (node:test) | NEW assertion in smoke or a packlist test: `npm pack --dry-run --json` includes `sdk/dist/cli.js`, `sdk/package.json` (+ `sdk/prompts/` if shipped) | ❌ Wave 0 |

### Clean-install simulation (the load-bearing check) — exact sequence (RESOLVES Research Q4)
```bash
# 1. Build the SDK dist once (author step; produces committed artifact).
cd sdk && npm install && npm run build && cd ..
# verify tests excluded from dist:
test ! -e sdk/dist/cli.test.js && echo "ok: no test files in dist"

# 2. Pack the top-level package (canonical ship path; mirrors github-archive).
TARBALL=$(npm pack --silent)

# 3. Install into an isolated temp prefix.
PREFIX=$(mktemp -d)
npm install -g "./$TARBALL" --prefix "$PREFIX"

# 4. Assert bin linked + executable.
test -x "$PREFIX/bin/oto-sdk" && echo "ok: oto-sdk linked + executable"

# 5. Assert deps resolved (the headline proof) + structured output, no crash.
OUT=$("$PREFIX/bin/oto-sdk" query generate-slug "Phase Eleven")
echo "$OUT" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const j=JSON.parse(s);if(j.slug!=="phase-eleven")process.exit(1);console.log("ok: structured slug")})'

# 6. Assert a .planning/-backed key works (run from a dir containing .planning/).
( cd <project-with-.planning> && "$PREFIX/bin/oto-sdk" query roadmap.analyze | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{JSON.parse(s);console.log("ok: registry JSON")})' )

# 7. Negative guard: assert NO ERR_MODULE_NOT_FOUND in stderr on any query.
"$PREFIX/bin/oto-sdk" query generate-slug x 2>&1 | grep -q ERR_MODULE_NOT_FOUND && { echo "FAIL: missing module"; exit 1; } || echo "ok: deps resolve"

# 8. Cleanup.
rm -rf "$PREFIX" "$TARBALL"
```
This mirrors the proven /tmp simulation. The existing `scripts/install-smoke.cjs` (npm pack → install into temp prefix → assert bin) is the right host to extend — add the `oto-sdk query` assertions to `runOtoInstallSmoke`/main. [VERIFIED: install-smoke.cjs structure; /tmp resolution simulation]

### Sampling Rate
- **Per task commit:** `node --test tests/sdk-wiring.test.cjs` (fast unit checks for PATH-walk/self-link) when touching installer; `cd sdk && npm run build` when touching SDK source (proves dist still compiles).
- **Per wave merge:** `npm test` (top-level node:test) + `node scripts/install-smoke.cjs` (clean-install sim).
- **Phase gate:** `node scripts/install-smoke.cjs` green (SC #1–#4 proven end-to-end) + `npm test` green before `/oto-verify-work`.

### Wave 0 Gaps
- [ ] `scripts/install-smoke.cjs` — EXTEND to run `oto-sdk query generate-slug` + a `.planning/` key + the `ERR_MODULE_NOT_FOUND` negative guard (covers SDK-01, SDK-04).
- [ ] `tests/sdk-wiring.test.cjs` — NEW node:test for `isOtoSdkOnPath()` / `trySelfLinkOtoSdk()` (covers SDK-02 unit).
- [ ] `sdk/dist/` — NEW committed build artifact (the "no manual build" enabler for SDK-04).
- [ ] (Optional) packlist assertion that `sdk/dist/cli.js` is in `npm pack` output.
- SDK subpackage's own vitest suite ports along with the source but is NOT wired into top-level `npm test` (faithful port; runs via `cd sdk && npm test` for authors). No top-level framework install needed.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | runtime + build | ✓ | 22.17.1 | — (engines >=22) |
| npm | pack/install sim, dep install | ✓ | 10.9.2 | — |
| TypeScript (`tsc`) | one-time SDK dist build (in `sdk/` via `npm install`) | ✗ globally | — | `cd sdk && npm install` installs `typescript@^5.7.0` as a devDep, then `npm run build` — no global tsc needed |
| `@anthropic-ai/claude-agent-sdk` | runtime (static import chain) | installable | `^0.2.84`→0.2.141 | — (top-level dependency; npm fetches on install) |
| `ws` | runtime (ws-transport static import) | installable | `^8.20.0`→8.21.0 | — (top-level dependency) |

**Missing dependencies with no fallback:** None — all are either present or fetched by npm/`sdk` devDeps.
**Missing dependencies with fallback:** `tsc` — supplied by `sdk` devDependencies during the one-time author build; never needed on the install path.

## Security Domain

> `security_enforcement` not set to false in config → included.

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | No auth surface; local CLI |
| V3 Session Management | no | No sessions |
| V4 Access Control | no | No multi-user access control |
| V5 Input Validation | yes | `cli.ts` arg parsing (`parseArgs` / permissive query parser); `--ws` validated via `validateWorkstreamName`; registry handlers validate inputs (`GSDError` Validation). Faithful port preserves upstream validation. |
| V6 Cryptography | no | None hand-rolled; no crypto in scope |
| V12 Files & Resources | yes | `resolvePathUnderProject` / `findProjectRoot` constrain `@file:` indirection and project-root resolution; the installer's `trySelfLinkOtoSdk` writes only to user-owned `~/.local/bin`/on-PATH HOME dirs |

### Known Threat Patterns for this stack
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Path traversal via `@file:` query output or `--project-dir` | Tampering / Info disclosure | Ported `resolvePathUnderProject` (helpers.ts) bounds paths under projectDir; no change in Phase 11 |
| Installer writing a self-link outside user-owned dirs | Elevation of Privilege | `trySelfLinkOtoSdk` only targets `~/.local/bin` and HOME-prefixed on-PATH dirs; skips Windows; non-fatal on EROFS/EACCES — faithful port |
| Stale/poisoned self-link from a prior install | Tampering | Source `unlink`s any existing `oto-sdk` target before re-creating — preserve this |
| Supply-chain weight of `@anthropic-ai/claude-agent-sdk` | Tampering | Caret-pinned `^0.2.84`; zero transitive deps; vendored nowhere — npm integrity hashes apply |

No new threats introduced beyond faithful-port surface. Recommend `/oto-secure-phase 11` confirm the path-correction of the installer step didn't widen the self-link target set.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| GSD `sdk` separately published as `@gsd-build/sdk` + back-compat `gsd-sdk` shim in parent | Ship SDK inside the parent package; expose `oto-sdk` via parent `bin` + prebuilt committed `dist/` | GSD fix/2441-sdk-decouple, #2453/#2775 | No sub-install, no mode-644 trap; deps must resolve from the parent's node_modules (Pattern 1) |
| File-presence "✓ SDK ready" | PATH-callability-gated "✓ ready" + `~/.local/bin` self-link | #2775 | Eliminates false-✓ on npx-cache/non-PATH installs |

**Deprecated/outdated:**
- `prepublishOnly`-only build trigger — does not run on github-archive/global installs; superseded by committed `dist/`.
- `^0.2.84` is NOT outdated for a faithful port even though registry latest is `0.3.150` — caret locks the 0.2.x minor intentionally.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | github-archive install (`npm install -g github:OTOJulian/...`) lays out top-level `dependencies` into `<pkg>/node_modules/` identically to the proven tarball install | Pattern 1 | Low — npm installs `dependencies` regardless of source (tarball/github both unpack to `lib/node_modules/<name>/` and run `npm install` honoring `files`/deps). Proven for tarball; github path uses the same npm machinery. If wrong, deps wouldn't resolve — caught immediately by the install-smoke step. [ASSUMED for the github path specifically; VERIFIED for tarball] |
| A2 | A faithful `tsc` build of the ported SDK compiles without source edits (oto's port is byte-equivalent to GSD src minus gsd→oto strings) | Validation / Pitfall 2 | Low-Medium — if the gsd→oto rename touches an identifier inconsistently (e.g. a filename without its imports), `tsc` fails. Caught by the author build step before commit. [ASSUMED — not built this session; tsc not run] |
| A3 | The `oto-build` package scope/name for `sdk/package.json` is acceptable (the binary doesn't depend on the scope) | Min Rebrand item 3 | Negligible — package name is cosmetic for a non-published subpackage; the bin name is what matters. [ASSUMED naming convention; planner/user may pick a different scope] |

## Open Questions (RESOLVED)

> Both items were CONTEXT-delegated to Claude's discretion (rebrand depth) and are now actioned in the plans: 11-01 Task 2 leaves internal `GSD*` identifiers as-is; 11-03 Task 2 trims `classifySdkInstall` to the dist-presence + dev-clone hint.

1. **Internal `GSD`→`OTO` identifier rename depth**
   - What we know: 48 SDK source files reference `GSD`/`GSDError`/`GSDTools`/`GSDEvent`/`gsd-sdk`. Renaming uniformly is internally consistent; not required for the binary to run.
   - RESOLVED: rename user-facing strings + bin/package names (required); leave internal class identifiers and dist filenames as-is for a minimal, build-safe port (implemented by 11-01 Task 2). CONTEXT marks rebrand depth as Claude's discretion; full identifier rebrand deferred.

2. **How much of `classifySdkInstall` (#2649 npx-cache logic) to port**
   - What we know: oto installs globally via `npm install -g github:...`, not npx-cache; the classifier handles npx-cache read-only edges specific to GSD's distribution.
   - RESOLVED: trim to dist-presence check + dev-clone "build first" hint + global "install/upgrade" hint; drop npx-cache-specific branches (implemented by 11-03 Task 2). Revisit only if oto ever ships via npx.

## Sources

### Primary (HIGH confidence)
- `foundation-frameworks/get-shit-done-main/sdk/{package.json,tsconfig.json,vitest.config.ts}` — build scripts, deps, dist outDir, test exclusions
- `foundation-frameworks/get-shit-done-main/sdk/src/{cli.ts,index.ts,gsd-tools.ts}` — static import chain (the headline risk), query dispatch, CJS-bridge path resolution
- `foundation-frameworks/get-shit-done-main/sdk/src/query/{index.ts,utils.ts,helpers.ts,state-project-load.ts}` — registry wiring, pure vs `.planning/`-reading vs CJS-bridge handler tiers
- `foundation-frameworks/get-shit-done-main/sdk/HANDOVER-QUERY-LAYER.md` — query registry architecture
- `foundation-frameworks/get-shit-done-main/bin/gsd-sdk.js` — shim to port
- `oto/bin/install.js` ~7267–7602 — #2775 machinery (isGsdSdkOnPath, trySelfLinkGsdSdk, installSdkIfNeeded, classifySdkInstall)
- `bin/install.js`, `bin/lib/install.cjs`, `package.json` — live installer + package shape
- `scripts/gen-inventory.cjs` (line 95-96), `scripts/rebrand/lib/{engine.cjs,rules/package.cjs}`, `rename-map.json` — rebrand pipeline drops `^sdk/`; package/cleanup rules
- `scripts/install-smoke.cjs`, `.github/workflows/install-smoke.yml` — clean-install simulation host
- Local `npm pack` + `npm install -g <tarball> --prefix <tmp>` simulation — proves upward dep resolution (positive) and `ERR_MODULE_NOT_FOUND` (negative)
- `npm view @anthropic-ai/claude-agent-sdk@^0.2.84 version` → 0.2.141; `npm view ws version` → 8.21.0

### Secondary (MEDIUM confidence)
- npm git-URL install semantics (`prepare`/`postinstall` run, `prepublishOnly` does not) — well-established npm behavior, consistent with package.json having no `prepare`

### Tertiary (LOW confidence)
- None — all load-bearing claims verified by tool or cited.

## Metadata

**Confidence breakdown:**
- Dependency resolution (Q1): HIGH — empirically proven both positive and negative cases this session
- Standard stack: HIGH — versions verified against registry; deps match upstream faithfully
- Installer wiring (#2775 port): HIGH — source read in full; seam + path corrections identified; live installer architecture read in full
- Rebrand approach: HIGH — gen-inventory.cjs `drop` verdict verified; manual port recommended
- Phase 11 query keys: HIGH — handler tiers traced; `.planning/` presence verified in repo
- Validation/clean-install sim: HIGH — mirrors proven simulation + existing smoke host

**Research date:** 2026-05-25
**Valid until:** 2026-06-24 (30 days — stable; agent-sdk 0.2.x line and npm resolution semantics are stable)
