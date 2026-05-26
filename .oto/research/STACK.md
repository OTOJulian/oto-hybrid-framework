# Stack Research

**Project:** oto — hybrid AI-CLI framework (GSD + Superpowers under unified `/oto-*` surface)
**Domain:** Personal multi-runtime AI coding-CLI framework, distributed via public GitHub
**Researched:** 2026-04-27
**Overall confidence:** HIGH (recommendations derived directly from how GSD v1.38.5 and Superpowers v5.0.7 actually ship today, not generic 2025/2026 advice)

---

## TL;DR — The Prescription

| Concern | Recommendation | Confidence |
|---------|----------------|------------|
| Language | **JavaScript (CommonJS `.cjs` for tooling, raw `.js`/`.md` for shipped artifacts)** — NOT TypeScript at the top level | HIGH |
| Runtime | **Node.js >= 22.0.0** (engines field), CI-tested on 22 + 24 | HIGH |
| Module system | **CJS for installer/tooling; markdown-only payload otherwise.** ESM only inside an isolated optional `sdk/` subpackage if a programmatic API is ever desired | HIGH |
| TypeScript | **No** at the top level. Optional, isolated, **only inside `sdk/` subpackage** with its own `package.json` and `tsconfig.json` (mirrors GSD's pattern), and only if/when oto grows a programmatic API. Not part of v1. | HIGH |
| Build step (top level) | **None.** Ship raw `.cjs` / `.js` / `.md`. The only "build" is the hooks copy script (a syntax-validating file copy). | HIGH |
| Package layout | `bin/install.js` + `bin/oto-tools.cjs` (top level) + `oto/bin/lib/*.cjs` (library) + `commands/`, `agents/`, `skills/`, `hooks/`, `scripts/` content roots | HIGH |
| Install mechanism | `npm install -g github:owner/oto-hybrid-framework[#vX.Y.Z]` → bin script `oto` runs the installer, which **copies/symlinks files** into `~/.claude`, `~/.codex`, `~/.gemini` | HIGH |
| Test framework | **`node:test`** (built-in, zero-deps) for installer/library `.cjs` tests; **Vitest** only inside the optional `sdk/` subpackage | HIGH |
| CI | GitHub Actions: `test.yml` (matrix: ubuntu × node 22/24 + 1 macos), `install-smoke.yml` (real `npm install -g <tarball>` + `<unpacked dir>`), `release.yml` (tag → GitHub Release) | HIGH |
| Versioning | **Git tags `vX.Y.Z` (semver)**. No npm registry publish. `npm install -g github:owner/repo#vX.Y.Z` for pinning. | HIGH |
| Runtime detection | **Caller specifies the runtime explicitly** via install flag (`oto install --claude` / `--codex` / `--gemini`). At install time, paths and instruction filenames (`CLAUDE.md` / `AGENTS.md` / `GEMINI.md`) are written per-runtime. No "auto-detect at runtime" needed because the framework is the installer, not a process living inside the runtime. | HIGH |

---

## Why These Choices (Evidence-Grounded)

### 1. Language & Runtime: Node 22+, CommonJS top-level

**What GSD actually does** (verified from `package.json`, `tsconfig.json`, `bin/install.js`, `get-shit-done/bin/lib/*`):
- `package.json` declares `"engines": { "node": ">=22.0.0" }`
- The top-level `tsconfig.json` is a **stub** — `{ "files": [], "references": [{ "path": "sdk" }] }`. **There is no top-level TypeScript.**
- All 33 library files in `get-shit-done/bin/lib/` are **`.cjs`** (e.g., `commands.cjs`, `core.cjs`, `state.cjs`, `init.cjs`, `phase.cjs`, …). The installer (`bin/install.js`) is plain `.js` using `require()`.
- Test files are `tests/*.test.cjs`, run via the built-in `node --test` runner (`scripts/run-tests.cjs` calls `process.execPath` with `--test --test-concurrency=4`).
- TypeScript exists **only** inside the isolated `sdk/` subpackage (its own `package.json`, `"type": "module"`, ESM, `tsc` build, Vitest tests).

**What Superpowers actually does** (verified from `package.json`, directory layout):
- `package.json` is a **6-line stub** declaring `"type": "module"` and pointing to `.opencode/plugins/superpowers.js`. There is essentially no Node code — Superpowers is a **content distribution** of skills/commands/agents (markdown).
- Distribution is via plugin manifests (`.claude-plugin/plugin.json`, `.codex-plugin/plugin.json`) and **manual `git clone` + `ln -s`** (per `.codex/INSTALL.md`). No installer binary.

**Conclusion for oto:** GSD's Node-version baseline (>=22) and CJS-by-default approach is the right shape because oto inherits GSD's installer-driven model (Superpowers' clone-and-symlink model is too thin for what oto needs to do). Node 22 is current LTS as of April 2026 and is a hard prerequisite for using the built-in `node --test` runner with the features GSD relies on.

**Why CJS, not ESM, for the tooling layer:**
- GSD's installer and library are deeply CJS (`require()`, `__dirname`, `module.exports`). Rewriting them in ESM during the rebrand would multiply the rebrand surface for zero user benefit.
- The installer path needs `__dirname` at runtime to locate sibling files (`get-shit-done/bin/lib/...`). ESM's `import.meta.url` works but is uglier and adds churn.
- `node --test` works with both, but CJS test files compose better with `require` of CJS libraries under test.

**Why no TypeScript at the top level:**
- GSD doesn't use it for the installer or library, despite being the more mature codebase. The shipped surface is markdown + small Node scripts; types add a build step, a publish trap (mode-644 / executable-bit issues — see GSD issue #2453), and zero runtime safety for a personal tool.
- TypeScript would need a `prepare` script (which `npm install -g github:...` runs) to compile on install — adding install-time toolchain risk for users who already have everything they need.
- If oto ever grows a programmatic SDK, copy GSD's pattern: isolate it in `sdk/` with its own package, build there, ship `dist/`.

### 2. Package Layout

**Recommended top-level layout** (mirrors GSD with rebrand):

```
oto-hybrid-framework/
├── package.json                  # Top-level: bin entries, files allowlist, engines, scripts
├── README.md
├── LICENSE                       # MIT (preserves both upstreams' license)
├── NOTICE                        # Attribution: GSD MIT + Superpowers MIT
├── bin/
│   ├── install.js                # Installer entrypoint — copies content into ~/.claude, ~/.codex, ~/.gemini
│   └── oto-tools.cjs             # Daily CLI tools (graphify, audit, websearch, etc.)
├── oto/                          # Renamed from `get-shit-done/` — core library + content
│   ├── bin/
│   │   ├── oto-tools.cjs         # (or here, depending on which level you prefer; GSD has both)
│   │   └── lib/                  # The library — all .cjs
│   │       ├── core.cjs
│   │       ├── commands.cjs
│   │       ├── state.cjs
│   │       ├── ... (rebrand of GSD's 30+ lib files)
│   │       └── skills.cjs        # NEW: skill discovery/install logic ported from Superpowers
│   ├── contexts/                 # Long-form context docs surfaced to the agent
│   ├── references/               # Reference docs the agent reads on demand
│   ├── templates/                # Markdown templates (PROJECT.md, ROADMAP.md, …)
│   └── workflows/                # Workflow markdown (one per /oto-* command)
├── commands/                     # /oto-* command frontmatter + body (.md)
├── agents/                       # Subagent definitions (.md with frontmatter)
├── skills/                       # SKILL.md files (Superpowers-style: name/description frontmatter + body)
├── hooks/                        # Node + bash hooks for runtime integration
│   ├── oto-prompt-guard.js
│   ├── oto-context-monitor.js
│   ├── oto-statusline.js
│   ├── oto-phase-boundary.sh
│   └── dist/                     # gitignored; populated by scripts/build-hooks.js
├── scripts/
│   ├── build-hooks.js            # Validates JS syntax, copies to hooks/dist
│   ├── run-tests.cjs             # node --test runner
│   ├── upstream-sync.cjs         # NEW: pulls upstream GSD/Superpowers, applies rename map
│   └── rebrand.cjs               # NEW: idempotent rename engine used by upstream-sync
├── tests/
│   └── *.test.cjs                # node:test tests
├── sdk/                          # OPTIONAL — only if/when programmatic API is needed
│   ├── package.json              # Own package, "type": "module"
│   ├── tsconfig.json
│   ├── vitest.config.ts
│   └── src/**/*.ts
└── .github/
    └── workflows/
        ├── test.yml
        ├── install-smoke.yml
        └── release.yml
```

**`package.json` shape** (prescriptive):

```json
{
  "name": "oto",
  "version": "0.1.0",
  "description": "Hybrid AI-CLI framework: GSD + Superpowers under a unified /oto-* surface.",
  "bin": {
    "oto": "bin/install.js"
  },
  "files": [
    "bin",
    "commands",
    "agents",
    "skills",
    "hooks",
    "oto",
    "scripts",
    "NOTICE",
    "LICENSE",
    "README.md"
  ],
  "engines": { "node": ">=22.0.0" },
  "scripts": {
    "build:hooks": "node scripts/build-hooks.js",
    "prepare": "node scripts/build-hooks.js",
    "test": "node scripts/run-tests.cjs",
    "lint": "node scripts/lint-no-source-grep.cjs"
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/<owner>/oto-hybrid-framework.git"
  },
  "license": "MIT"
}
```

**Critical fields:**
- `"bin": { "oto": "bin/install.js" }` — exposes the `oto` command after `npm install -g github:...`.
- `"files"` — explicit allowlist; without this, npm publishes everything tracked by git, which is fine for github-installs but `files` makes intent explicit and matches GSD's convention.
- `"prepare"` — runs automatically when installing from a git URL, perfect for the hooks-build step. (See "Install mechanism" below for why this is the right place.)
- **No `"main"` and no `"exports"`** at v1 — oto isn't a library you `require()`, it's a CLI installer.

### 3. Install Mechanism — How `npm install -g github:...` Actually Works for oto

**The end-to-end flow:**

1. User runs:
   ```bash
   npm install -g github:<owner>/oto-hybrid-framework         # latest main
   npm install -g github:<owner>/oto-hybrid-framework#v1.2.3  # pin to tag
   ```
2. npm clones the repo into a temp dir, reads `package.json`.
3. **npm runs the `prepare` script** (this is the github-install hook — it does NOT run `prepublishOnly`). For oto, `prepare` runs `node scripts/build-hooks.js`, which:
   - Walks `hooks/*.js` and `hooks/*.sh`
   - **Validates `.js` syntax** with `vm.Script(...)` (catches breakage before shipping; GSD added this after issues #1107/#1109/#1125/#1161)
   - Copies files into `hooks/dist/`, preserving executable bit on `.sh`
4. npm symlinks `bin/install.js` to `~/.npm/bin/oto` (or platform equivalent), making `oto` available on PATH.
5. User runs `oto install --claude --global` (or `--codex` / `--gemini`).
6. `bin/install.js`:
   - Resolves the target config dir per runtime (see paths below)
   - Copies/symlinks `commands/*.md` → `<configDir>/commands/`
   - Copies/symlinks `agents/*.md` → `<configDir>/agents/`
   - Copies/symlinks `skills/*` → `<configDir>/skills/`
   - Copies hooks from `hooks/dist/` → `<configDir>/hooks/`
   - Writes/merges the runtime instruction file (`CLAUDE.md` / `AGENTS.md` / `GEMINI.md`) using markdown markers (e.g., `<!-- OTO Configuration — managed by oto installer -->` … `<!-- /OTO Configuration -->`)
   - Writes/merges runtime config (e.g., Claude Code `settings.json` for hooks; Codex `config.toml` for agent sandboxes)

**Target paths (verified from GSD `bin/install.js`):**

| Runtime | Global config dir | Override env var | Instruction file |
|---------|-------------------|------------------|------------------|
| Claude Code | `~/.claude/` | `CLAUDE_CONFIG_DIR` | `CLAUDE.md` |
| Codex | `~/.codex/` | `CODEX_HOME` | `AGENTS.md` |
| Gemini CLI | `~/.gemini/` | `GEMINI_CONFIG_DIR` | `GEMINI.md` |

**Local install** target is the project root: `./.claude/`, `./.codex/`, `./.gemini/` (project-scoped install — keep this; it's how a single dev tries oto on one repo without polluting global).

**Subdirectories under each config dir:**
```
~/.claude/
├── CLAUDE.md                     # Includes OTO Configuration block (delimited with markers)
├── settings.json                 # Hook registrations merged in
├── commands/
│   └── oto-*.md                  # All /oto-* commands
├── agents/
│   └── oto-*.md                  # All oto subagents
├── skills/
│   └── oto/                      # Skill bundles (subdir per skill, contains SKILL.md)
└── hooks/
    └── oto-*.{js,sh}             # Copied from hooks/dist/
```

**Why copy, not symlink, for global installs from `npm install -g github:...`:**
- npm installs the package into `~/.npm/lib/node_modules/oto/` (or platform equivalent), but that path is volatile (re-installs replace it). Symlinking from `~/.claude/commands/oto-foo.md` → `~/.npm/lib/node_modules/oto/commands/oto-foo.md` would break on every re-install.
- Copy is dumb-simple, works cross-platform (Windows symlinks need elevation), and uninstall is trivial (delete files matching the OTO marker prefix).
- **Exception:** Superpowers' `~/.codex/superpowers/` clone-and-symlink model works for them because they tell the user to `git clone` directly. We're npm-installing, so copy wins.

**Source detection inside `install.js`:** use `path.join(__dirname, '..', '<dir>')`. GSD does exactly this (`bin/install.js:_gsdLibDir = path.join(__dirname, '..', 'get-shit-done', 'bin', 'lib')`) — it works regardless of cwd, which matters because users run `oto install` from arbitrary project directories.

### 4. Test Framework — `node:test`, not Vitest, not Jest

**What GSD actually uses for the installer/library:** `node --test` (built-in), via `scripts/run-tests.cjs`:
```js
execFileSync(process.execPath, ['--test', '--test-concurrency=4', ...files], ...)
```
Tests are `tests/*.test.cjs` using `require('node:test')` and `require('node:assert')`. Coverage is via `c8`.

**Why this beats Vitest at the top level:**
- **Zero dependencies.** Every dep we add is a supply-chain risk and a `prepare` failure point.
- **Already shipped in Node 22+.** No install step, no version drift.
- **Plays well with CJS.** Vitest is ESM-first; using it for CJS code paths means jumping through `vite-node` interop hoops.
- **Coverage via `c8`** (which GSD does use, ^11.x): ~700KB single dep, no transformer, just reads V8 coverage data. Perfect for `.cjs`.

**When to use Vitest:** only inside `sdk/` if/when oto gains a TS programmatic API — Vitest is the right pick there because it's TS-native and ESM-native and the GSD `sdk/` proves the pattern works.

**What NOT to use:**
- **Jest.** Heavy, slow startup, requires Babel/`ts-jest` for any non-trivial setup, ESM support is still rough in 2026. Replaced by Vitest in modern projects and replaced by `node:test` for plain Node.
- **AVA / tape / Mocha.** Don't add a dep when `node:test` is built-in.

### 5. CI — GitHub Actions

Three workflows, modeled on GSD's:

**`.github/workflows/test.yml`** — runs on every PR and push:
```yaml
name: Tests
on:
  push: { branches: [main, 'release/**', 'hotfix/**'] }
  pull_request: { branches: [main] }
  workflow_dispatch:
concurrency:
  group: ${{ github.workflow }}-${{ github.head_ref || github.run_id }}
  cancel-in-progress: true
jobs:
  test:
    runs-on: ${{ matrix.os }}
    timeout-minutes: 10
    strategy:
      fail-fast: true
      matrix:
        os: [ubuntu-latest]
        node-version: [22, 24]
        include:
          - os: macos-latest
            node-version: 24
    steps:
      - uses: actions/checkout@v6
        with: { fetch-depth: 0 }
      - uses: actions/setup-node@v6
        with: { node-version: ${{ matrix.node-version }}, cache: 'npm' }
      - run: npm ci
      - run: npm run build:hooks
      - run: npm test
```

**`.github/workflows/install-smoke.yml`** — exercises the **real** install path:
- Job A: `npm pack` → `npm install -g <tarball>` → assert `oto` is on PATH and executable. (Tarball is the canonical ship path.)
- Job B: `npm install -g <unpacked-dir>` (no pack). Catches the **mode-644 trap** GSD hit in #2453: npm does NOT chmod bin targets when installing from an unpacked directory, so any stale build output without the executable bit will fail here before users see it.

**`.github/workflows/release.yml`** — triggered by pushing a `vX.Y.Z` tag:
- Validates `package.json` version matches tag
- Runs full test + install-smoke as a `workflow_call` gate
- Creates a GitHub Release with auto-generated notes
- **No npm publish** (per project constraint — public GitHub install only)

**Pin actions by SHA**, not by major tag (GSD does this — `actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd  # v6.0.2`). Personal-grade supply-chain hygiene at near-zero ongoing cost (Dependabot can bump these).

### 6. Versioning — Semver Git Tags

**Scheme:** semver `vX.Y.Z` git tags. `package.json` `version` must match the tag.

**Compatibility with `npm install -g github:owner/repo`:**
- `npm install -g github:owner/oto-hybrid-framework` → installs `HEAD` of default branch (main).
- `npm install -g github:owner/oto-hybrid-framework#v1.2.3` → installs the commit tagged `v1.2.3`. **This is the production-grade pinning mechanism.**
- `npm install -g github:owner/oto-hybrid-framework#main` → explicit main pin.
- `npm install -g github:owner/oto-hybrid-framework#<sha>` → exact-commit pin.

All four forms are first-class npm features — they map to git's standard refs.

**Release process:**
1. Bump `package.json` version
2. Update `CHANGELOG.md`
3. Commit, tag (`git tag v1.2.3`), push tag
4. `release.yml` creates the GitHub Release

**Bumping rules** (semver, applied to a personal tool):
- `MAJOR`: rebrand-tool format change (rename map shape changes); install path changes; instruction-file marker format changes
- `MINOR`: new `/oto-*` command; new skill; new runtime supported
- `PATCH`: bug fix, doc update, dep bump

### 7. Multi-Runtime Adapter Pattern

**Key insight from GSD's code:** GSD does **not** auto-detect the runtime at agent-execution time. The runtime is selected **at install time** via flag (`--claude` / `--codex` / `--gemini` / `--all`), and the installer writes runtime-specific artifacts into runtime-specific directories.

This is correct because:
- The "runtime" is the CLI process (Claude Code, Codex, Gemini CLI). Each one looks in its own config dir for commands/agents/skills.
- Once installed, files in `~/.claude/commands/oto-foo.md` are only ever read by Claude Code. Files in `~/.codex/commands/oto-foo.md` only by Codex. There is no shared in-process detection.
- Runtime-specific differences (instruction filename, hook config syntax, agent-frontmatter dialect, sandbox policy) are baked in at install time by the installer's per-runtime conversion logic.

**What oto's install layer must do per runtime** (verified from `bin/install.js`):

| Concern | Claude | Codex | Gemini |
|---------|--------|-------|--------|
| Instruction file | `CLAUDE.md` | `AGENTS.md` | `GEMINI.md` |
| Config file | `~/.claude/settings.json` (JSON) | `~/.codex/config.toml` (TOML) | `~/.gemini/settings.json` |
| Skill location | `~/.claude/skills/` | `~/.codex/skills/` (or `~/.agents/skills/` per Superpowers convention — pick one and document) | `~/.gemini/skills/` |
| Hook syntax | Claude Code hook events (`PreToolUse`, `PostToolUse`, `UserPromptSubmit`, …) | Codex `[hooks]` table in `config.toml` with agent sandbox declarations | Gemini equivalent |
| Agent frontmatter | Claude `tools:` field, `model:` field | Codex requires `sandbox:` (`workspace-write` / `read-only`) — see `CODEX_AGENT_SANDBOX` map in GSD's installer | Gemini-flavored |
| Tool name mapping | Native (`Read`, `Write`, `Bash`, …) | Native or mapped | Native or mapped |
| Markdown command body | Native | Native | May need slight conversion |

**The adapter shape (recommended):**
```
oto/bin/lib/
  ├── runtime-claude.cjs   # toClaude(content) — per-runtime conversions
  ├── runtime-codex.cjs    # toCodex(content) — incl. sandbox map, config.toml merge
  ├── runtime-gemini.cjs   # toGemini(content)
  └── runtime-registry.cjs # const RUNTIMES = { claude: {...}, codex: {...}, gemini: {...} }
```

Each runtime module exports:
- `configDir({ explicitDir })` — resolves install target (consult `--config-dir` flag, then env var, then default `~/.<runtime>`)
- `instructionFile()` — returns `'CLAUDE.md' | 'AGENTS.md' | 'GEMINI.md'`
- `installCommands(srcDir, targetDir)`, `installAgents(...)`, `installSkills(...)`, `installHooks(...)`
- `mergeConfig(targetDir, otoBlock)` — merges hook registrations / agent sandboxes into runtime config file
- `injectInstructionMarker(targetDir, otoMarkdown)` — wraps oto's instruction injection between `<!-- OTO Configuration -->` markers in the runtime's instruction file

**Runtime selection:**
```bash
oto install --claude               # one runtime
oto install --claude --codex       # subset
oto install --all                  # claude + codex + gemini (NOT opencode — out of scope)
oto install                        # interactive prompt
```

**Why this beats "auto-detect at runtime":**
- Auto-detection requires running code inside the runtime's process — but oto's payload is mostly markdown, which has no runtime. Hooks run in the runtime, but they're already runtime-specific by virtue of where they're installed.
- The user knows which CLI they want oto to power. Asking them once, at install time, is cheaper than reading env/process state on every command.

---

## Installation (Recommended Commands)

```bash
# Install latest from main
npm install -g github:<owner>/oto-hybrid-framework

# Pin to a release tag (production-grade)
npm install -g github:<owner>/oto-hybrid-framework#v1.0.0

# Set up runtimes
oto install --claude --global       # Primary runtime
oto install --codex --global        # Optional
oto install --gemini --global       # Optional
oto install --all --global          # Everything (claude + codex + gemini)

# Per-project install (no global pollution)
cd ~/code/some-project
oto install --claude --local

# Update later
npm install -g github:<owner>/oto-hybrid-framework#v1.0.1
oto update --all
```

---

## Alternatives Considered

| Recommended | Alternative | Why Not the Alternative |
|-------------|-------------|-------------------------|
| Node 22+ CJS | Node 22+ ESM throughout | GSD installer is deeply CJS; converting would multiply rebrand surface. ESM offers no runtime benefit for an installer that runs once. |
| Plain JS top-level | TypeScript top-level | Adds compile step → `prepare` must run TS → install-time toolchain failure surface. GSD chose JS for the same reasons. |
| `node:test` for tooling | Vitest for everything | Vitest is ESM-first; using it on CJS installer code requires interop; adds 50+ MB of deps for zero personal-tool benefit. Use Vitest only inside `sdk/` if it ever exists. |
| `node:test` | Jest | Slow, ESM is still painful in Jest 30, requires Babel/`ts-jest`, not the trajectory most JS projects are on in 2026. |
| Copy files at install | Symlink files at install | npm volatile install path breaks symlinks on re-install; Windows needs elevation; copy is dumber and reliable. |
| GitHub install + tags | npm registry publish | Project constraint: personal use, no npm publish overhead. `npm install -g github:owner/repo#vX.Y.Z` covers cross-machine portability. |
| 3 runtimes (Claude/Codex/Gemini) | + OpenCode + Cursor + … | Out of scope per `PROJECT.md`. GSD supports 14; cutting to 3 halves the rebrand and test matrix. |
| Per-runtime adapters at install | "Universal" content with runtime detection at agent time | Each runtime reads its own dir; in-process detection has no place to run since most of the payload is markdown. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| TypeScript at top level | Forces a build step in `prepare`; install-time toolchain failure surface; GSD doesn't and ships fine | Plain `.cjs`; isolate TS to optional `sdk/` if/when needed |
| `npm publish` | Project constraint says no; adds 2FA, scope, maintenance | `npm install -g github:owner/repo#vX.Y.Z` |
| Bundlers (esbuild/rollup/webpack) at top level | Both upstreams ship raw `.js` — adding bundling solves no problem and creates source-map / debugging headaches | None — ship raw files |
| `pnpm`/`yarn` workspaces at top level | A single package; workspaces add tooling for no reason | npm |
| Auto-detect runtime at agent execution time | Runtime is determined by which CLI invoked the file; detection has nothing to detect from | Install-time `--claude`/`--codex`/`--gemini` flags + per-runtime install dirs |
| Symlink-based install for global | Volatile npm install paths break on re-install; cross-platform pain | Copy files; track with marker comments for clean uninstall |
| Jest | Slow, ESM-painful, heavy deps | `node:test` for tooling; Vitest for any TS subpackage |
| `prepublishOnly` as the only build trigger | `npm install -g github:...` does NOT run `prepublishOnly`; it runs `prepare` | Use `prepare` (or both, with `prepare` doing the work) |
| Carrying GSD's OpenCode/Cursor/Windsurf/Augment/Trae/etc. install branches | Out of scope per `PROJECT.md`; doubles rebrand and test surface | Delete those code paths during the rebrand; keep only Claude/Codex/Gemini |
| Bash-only installer | GSD's installer is 7,755 lines of Node — bash can't replicate the JSON/TOML merging logic safely | Node-based installer (single language, cross-platform) |

---

## Stack Patterns by Variant

**If you decide later to add a programmatic API (e.g., embed oto in a script):**
- Mirror GSD's `sdk/` pattern: separate `sdk/package.json` with `"type": "module"`, `tsc` build to `dist/`, Vitest tests, separate `bin/oto-sdk.js` thin wrapper at top level
- Keep TS confined there; don't let it bleed into the installer

**If oto ever needs to install non-trivially-mergeable runtime configs (e.g., shared memory across runtimes):**
- Add a small `oto/bin/lib/state.cjs` for cross-runtime state in `~/.oto/` (not in any single runtime's dir)
- GSD does this: `~/.gsd/defaults.json` (line 633 of `install.js`) is GSD's neutral state location

**If a new Claude Code feature requires a new hook event:**
- Add the hook script to `hooks/` as a Node `.js`
- Update `scripts/build-hooks.js`'s `HOOKS_TO_COPY` allowlist (this is where validation happens — DO NOT skip the syntax-check pass)
- Update the per-runtime adapter's `mergeConfig` to register it in `~/.claude/settings.json`

---

## Version Compatibility

| Component | Version | Notes |
|-----------|---------|-------|
| Node.js | >=22.0.0 | Engines field. CI tests on 22 + 24. Built-in `node --test` works fully on 22.x; some flags (e.g., `--test-concurrency`) require ≥22. |
| npm | >=10 (ships with Node 22+) | `prepare` script behavior on git installs is stable in npm 10+. |
| `c8` (coverage, optional) | ^11 | Matches GSD; minimal, V8-coverage-based, plays well with CJS. |
| GitHub Actions runner images | `ubuntu-latest`, `macos-latest` | Pinned action versions by SHA in workflow files. |

---

## Sources

- `foundation-frameworks/get-shit-done-main/package.json` — engines, deps, scripts, files allowlist (HIGH confidence; primary evidence)
- `foundation-frameworks/get-shit-done-main/bin/install.js` (7,755 lines) — install paths, runtime detection, env vars, target dirs, hooks merge, instruction-file markers (HIGH)
- `foundation-frameworks/get-shit-done-main/get-shit-done/bin/lib/*.cjs` (33 CJS files) — confirms CommonJS at the library layer (HIGH)
- `foundation-frameworks/get-shit-done-main/sdk/{package.json,tsconfig.json}` — confirms TS is confined to the optional SDK subpackage with its own ESM module system (HIGH)
- `foundation-frameworks/get-shit-done-main/scripts/{build-hooks.js,run-tests.cjs}` — hooks build pattern with vm-based syntax validation; `node --test` runner via `process.execPath` (HIGH)
- `foundation-frameworks/get-shit-done-main/.github/workflows/{test.yml,install-smoke.yml}` — CI matrix shape; `npm pack`-then-install + unpacked-dir install smoke pattern that catches mode-644 issues (HIGH)
- `foundation-frameworks/superpowers-main/package.json` + `.codex/INSTALL.md` — confirms Superpowers ships content + plugin manifests + manual symlink (no installer); useful as anti-pattern for oto since we need an installer (HIGH)
- `foundation-frameworks/superpowers-main/.{claude,codex,opencode}-plugin/` — plugin manifest formats (MEDIUM confidence on whether oto needs them; for npm-installer model, plugin manifests are optional)
- npm docs on git URL installs (`prepare` runs, `prepublishOnly` does NOT) — well-known npm behavior, confirmed by GSD's `prepublishOnly` use only for npm-registry path and `prepare` not being needed because they publish to registry (HIGH on npm semantics; oto must use `prepare` since it has no npm-registry path)

---

*Stack research for: oto — hybrid AI-CLI framework*
*Researched: 2026-04-27*
