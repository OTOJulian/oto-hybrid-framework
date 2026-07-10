# Architecture Research: Exa MCP Integration (v0.5.0)

**Domain:** MCP server registration for a multi-runtime AI-CLI installer (Claude Code / Codex / Gemini CLI)
**Researched:** 2026-07-10
**Confidence:** HIGH (code-level integration points), MEDIUM (Claude `.claude.json` location semantics under `CLAUDE_CONFIG_DIR`)

## Corrected Premise: TWO Installers Exist — Only One Is Live

The research question pointed at `oto/bin/install.js`. **That is not the installer that runs.** The repo contains two:

| Installer | Wired as bin? | Role |
|-----------|---------------|------|
| `bin/install.js` (141 lines) + `bin/lib/*.cjs` adapters | **YES** — `package.json:11` `"oto": "bin/install.js"` | The real oto installer. Per-runtime adapters at `bin/lib/runtime-{claude,codex,gemini}.cjs`; orchestration at `bin/lib/install.cjs`. |
| `oto/bin/install.js` (7,758 lines, GSD port) | NO | Vestigial reference copy of the rebranded GSD installer. Its `oto/bin/lib/*.cjs` library IS live (used by `oto migrate`, `oto log`, and config/init logic), but the installer entry itself is never invoked. |

**All installer/adapter changes for this milestone go in `bin/lib/`, not `oto/bin/install.js`.** The GSD installer is still useful as a pattern reference (its hooks-merge logic at `oto/bin/install.js:6555-6863` is what the adapters were ported from — comments in `bin/lib/runtime-claude.cjs:5-9` cite it).

A second corrected premise: the settings-integrations workflow does NOT route through `oto/bin/lib/config.cjs` (which masks secrets via `secrets.cjs`). It calls `oto-sdk query config-set` (`oto/workflows/settings-integrations.md:134-137`), handled by `sdk/src/query/config-mutation.ts` — **which has no secret masking at all** (grep for "secret" in that file returns nothing). The masking convention documented in `secrets.cjs` only protects the dead CJS path. This makes the key-storage fix more urgent than the milestone description implies.

## System Overview

```
                         SHIPPED PACKAGE (repo)
┌────────────────────────────────────────────────────────────────────┐
│  bin/install.js ──► bin/lib/install.cjs (installRuntime)           │
│        │                    │                                       │
│        │     ┌──────────────┼──────────────────┐                    │
│        ▼     ▼              ▼                  ▼                    │
│  runtime-claude.cjs   runtime-codex.cjs   runtime-gemini.cjs        │
│  (mergeSettings →     (mergeSettings →    (mergeSettings →          │
│   settings.json)       config.toml via     settings.json)           │
│                        codex-toml.cjs)                              │
│                                                                     │
│  oto/hooks/*.js ──build-hooks──► oto/hooks/dist/ ──copy──►          │
│  sdk/dist/cli.js (oto-sdk query …)   oto/workflows/*.md             │
└────────────────────────────────────────────────────────────────────┘
                                │ install copies + merges
                                ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ ~/.claude/       │  │ ~/.codex/        │  │ ~/.gemini/       │
│  settings.json   │  │  config.toml     │  │  settings.json   │
│  hooks/…         │  │  hooks/…         │  │  hooks/…         │
│ ~/.claude.json ◄─┼──┤ [mcp_servers.*] ◄┼──┤ mcpServers ◄─────┼── NEW: Exa MCP
│  (mcpServers,    │  │  (in config.toml)│  │  (in settings.   │   registration
│   OUTSIDE the    │  │                  │  │   json — same    │
│   config dir!)   │  │                  │  │   merge target)  │
└──────────────────┘  └──────────────────┘  └──────────────────┘
                                │ all three reference
                                ▼
              ~/.oto/exa_api_key  ◄── single source of truth for the key
              (read at MCP-server launch by a shipped launcher script,
               or via EXA_API_KEY env — never copied into any config)
```

## Integration Point 1: Where Per-Runtime Config Merging Happens Today

### The orchestration hook (where MCP registration slots in)

`bin/lib/install.cjs:327-339` — after file copy, derived-file emit, and instruction-marker inject, `installRuntime()` calls the adapter's `mergeSettings`:

```js
const settingsPath = path.join(configDir, adapter.settingsFilename);
if (typeof adapter.mergeSettings === 'function') {
  const existing = fs.existsSync(settingsPath) ? await fsp.readFile(settingsPath, 'utf8') : '';
  const merged = adapter.mergeSettings(existing, { otoVersion, configDir, runtime, installedAt });
  ...
}
```

Uninstall mirror: `bin/lib/install.cjs:399-412` calls `adapter.unmergeSettings`.

### Per-adapter merge machinery (reuse targets)

| Runtime | File merged | Merge function | Idempotency mechanism | Uninstall |
|---------|-------------|----------------|----------------------|-----------|
| Claude | `<configDir>/settings.json` | `bin/lib/runtime-claude.cjs:82-126` (`mergeSettings`) | `entryHasOtoCommand` marker match + `settings._oto` manifest (`:119-123`) | `unmergeSettings` `:128-159` |
| Codex | `<configDir>/config.toml` | `bin/lib/runtime-codex.cjs:125-127` → `bin/lib/codex-toml.cjs:88` (`mergeHooksBlock`) | `# === BEGIN OTO HOOKS ===` / `# === END OTO HOOKS ===` comment markers (`codex-toml.cjs:3-4`), block strip-and-rewrite | `unmergeHooksBlock` `codex-toml.cjs:105` |
| Gemini | `<configDir>/settings.json` | `bin/lib/runtime-gemini.cjs:88-139` (`mergeSettings`) | marker match + `settings._oto` manifest (`:133-137`); also force-enables `experimental.enableAgents` (`:105-108`) | `unmergeSettings` `:141-164` |

### Why MCP registration is NOT just "add entries to mergeSettings"

- **Gemini:** MCP registration IS the same file — `mcpServers` is a top-level key in `~/.gemini/settings.json` (verified: [Gemini CLI MCP docs](https://google-gemini.github.io/gemini-cli/docs/tools/mcp-server.html)). Extending `runtime-gemini.cjs` `mergeSettings` works directly. Gemini env blocks support `$VAR` expansion.
- **Codex:** Same file — `[mcp_servers.exa]` table in `~/.codex/config.toml` (verified: [Codex config reference](https://developers.openai.com/codex/config-reference), [Codex MCP docs](https://developers.openai.com/codex/mcp)). Supports `command`/`args`/`env` for stdio and `env_vars = ["EXA_API_KEY"]` to forward parent env. Needs a new marker-delimited block in `codex-toml.cjs` (e.g. `# === BEGIN OTO MCP ===`), because the HOOKS block is strip-and-rewritten wholesale.
- **Claude:** **Different file.** User-scope MCP servers live in `~/.claude.json` (top-level `mcpServers` key) — NOT in `~/.claude/settings.json` (verified: [Claude Code MCP docs](https://code.claude.com/docs/en/mcp), [.claude directory docs](https://code.claude.com/docs/en/claude-directory)). The current adapter contract (`settingsFilename: 'settings.json'`, `runtime-claude.cjs:166`) cannot reach it. This forces a **new adapter hook** rather than overloading `mergeSettings`.

**Recommendation:** add an optional adapter hook pair `mergeMcp(ctx)` / `unmergeMcp(ctx)` invoked from `install.cjs` immediately after the `mergeSettings` block (after line 339) and from `uninstallRuntime` after the `unmergeSettings` block (after line 412). The hook receives `{ configDir, otoVersion, exaEnabled, launcherPath }`. Gemini/Codex implementations can internally share their existing settings-file I/O; Claude's implementation resolves and edits `.claude.json` separately. Precedent for optional adapter hooks already exists: `emitDerivedFiles` (`install.cjs:302-312`), `installCommandsOverride` (`install.cjs:260-267`), `uninstallCommandsOverride` (`install.cjs:416-418`).

### Claude `.claude.json` location caveat (MEDIUM confidence — verify in phase research)

Default location is `$HOME/.claude.json` (outside the config dir). When `CLAUDE_CONFIG_DIR` is set, Claude Code relocates its state paths under that dir ("every ~/.claude path lives under that directory instead" per docs; see also [issue #14313](https://github.com/anthropics/claude-code/issues/14313)). The Claude `mergeMcp` should resolve: `CLAUDE_CONFIG_DIR` set → `$CLAUDE_CONFIG_DIR/.claude.json`, else `$HOME/.claude.json`. Also: `.claude.json` is Claude Code's live mutable state file (project history, onboarding state) — the merge must be strictly additive (touch only `mcpServers.exa`; track ownership in the install state file `<configDir>/oto/.install.json` instead — see `install.cjs:342-355` — since `.claude.json` has no safe slot for an `_oto` breadcrumb), and must never rewrite unrelated keys. JSON round-trip with `JSON.stringify(obj, null, 2)` matches what Claude Code itself writes.

## Integration Point 2: The `exa_search` Dual-Typing Problem and Its Reconciliation

### Current state (the bug, with all four code sites)

| Site | Treats `exa_search` as | Evidence |
|------|------------------------|----------|
| `oto/bin/lib/config.cjs:62-63, 92` | **boolean** — derived from `EXA_API_KEY` env or `~/.oto/exa_api_key` keyfile existence, written into new-project config | `hasExaSearch = !!(process.env.EXA_API_KEY \|\| fs.existsSync(exaKeyFile))` |
| `oto/bin/lib/init.cjs:364-366, 448, 710` | **boolean** — `exa_search_available` in init payload; `exa_search: config.exa_search` passed to orchestrator context | same detect logic |
| `oto/bin/lib/secrets.cjs:16-20` | **secret string** — `exa_search` in `SECRET_CONFIG_KEYS`, masked as `****<last-4>` | implies raw key stored at that key |
| `oto/workflows/settings-integrations.md:134-137, 261-262` | **secret string** — `oto-sdk query config-set exa_search "<value>"`; doc says "API keys are stored plaintext in .oto/config.json" | writes raw key into the committed project config |

Consequences today: (a) the raw API key lands in `.oto/config.json`, which is committed when `commit_docs: true`; (b) the SDK path that actually executes the write (`sdk/src/query/config-mutation.ts`) doesn't even mask the echo — `secrets.cjs` masking only guards the unused CJS `cmdConfigSet`; (c) a string value is truthy, so boolean consumers "work" by accident, hiding the leak; (d) the same defect exists identically for `brave_search` and `firecrawl`.

### Reconciliation (recommended, opinionated)

**The key lives ONLY in `~/.oto/exa_api_key` (mode 0600) or the `EXA_API_KEY` env var. `.oto/config.json` holds a boolean, full stop.**

1. **`.oto/config.json` schema:** `exa_search` is boolean-only. Add type validation in both config-set paths (`sdk/src/query/config-mutation.ts` and `oto/bin/lib/config.cjs` `cmdConfigSet`) rejecting non-boolean values for `brave_search`/`firecrawl`/`exa_search` with a pointer to the keyfile mechanism. `config.cjs:63` and `init.cjs:366` detection logic is already correct — unchanged.
2. **New secret CRUD:** `oto/bin/lib/secrets.cjs` grows `keyfilePath(name)`, `readKeyfile(name)`, `writeKeyfile(name, value)` (mkdir `~/.oto`, write, `chmod 0600`), `clearKeyfile(name)`, `keyfileStatus(name)` (returns masked form via existing `maskSecret`). Exposed as SDK query commands `secret-set <integration>` / `secret-clear <integration>` / `secret-status` (registered in `sdk/src/query/index.ts` registry, `:338` area; requires an sdk/dist rebuild — precedent: v0.4.x shipped prebuilt dist rebuilds).
3. **`settings-integrations.md` rewrite:** "Set"/"Replace" writes via `oto-sdk query secret-set exa` (value passed on stdin, not argv) then `oto-sdk query config-set exa_search true`; "Clear" runs `secret-clear exa` + `config-set exa_search false`. The `<security>` block's claim "keys are written as plaintext to .oto/config.json — that is where secrets live on disk" (`settings-integrations.md:14-16`) is replaced with the keyfile story. Confirmation table shows `keyfileStatus` masked output.
4. **Migration:** on `secret-status`/settings-integrations entry, if `config.json` `exa_search` (or brave/firecrawl) is a non-boolean string → move value to keyfile, set key to `true`, print a one-line notice. Cheap, self-healing, no separate migration command.
5. **`secrets.cjs` `SECRET_CONFIG_KEYS`:** keep the set (masking legacy string values during migration display) but its role shifts from "keys whose config values are secrets" to "keys with associated keyfiles."
6. **Scope note:** fix all three integrations (brave/firecrawl/exa) with the same mechanism — the marginal cost is near zero since the mechanism is shared, and fixing only exa leaves the identical leak documented as correct behavior for the other two. Flag as an in-milestone scope decision.

### Key data flow (end state)

```
User (settings-integrations)          Install time                    Agent runtime
        │                                  │                               │
  secret-set exa (stdin)          detectExaKey():                   MCP server launch:
        │                          EXA_API_KEY env ||                runtime spawns
        ▼                          ~/.oto/exa_api_key      ┌──────► node <configDir>/hooks/oto-exa-mcp.js
~/.oto/exa_api_key (0600)              exists?             │              │ reads EXA_API_KEY env
        │                                  │ yes           │              │ || ~/.oto/exa_api_key
        ▼                                  ▼               │              ▼
config-set exa_search true    mergeMcp() writes launcher ──┘        spawns `npx -y exa-mcp-server`
        │                     reference (NO key material)            with EXA_API_KEY injected
        ▼                     into .claude.json /                          │
.oto/config.json              config.toml / settings.json                  ▼
(boolean; commit-safe)                                              mcp__exa__web_search_exa
        │                                                            available to agents
        ▼
orchestrator passes exa_search: true → researcher/debugger agents use mcp__exa__* per guidance
```

The load-bearing move is the **launcher script**: every runtime's MCP config references `hooks/oto-exa-mcp.js` (already-copied hooks channel), and only the launcher touches the secret, at server-start time. No runtime config file — `.claude.json`, `config.toml`, `settings.json` — ever contains key material. This sidesteps three per-runtime env-interpolation dialects (Claude `.mcp.json` `${VAR}` expansion is project-scope-documented only; Codex needs `env_vars` forwarding which requires the parent env to have the key; Gemini `$VAR` expansion requires env too) with one uniform mechanism that also honors the keyfile.

## Architectural Patterns

### Pattern 1: Optional adapter hook (`mergeMcp`/`unmergeMcp`)

**What:** New optional pair on each runtime adapter, dispatched from `install.cjs` next to `mergeSettings`/`unmergeSettings`.
**When to use:** Whenever a runtime concern targets a different file (Claude) or a different section of the same file (Codex/Gemini) than the hooks merge.
**Trade-offs:** One more adapter-contract member; but overloading `mergeSettings` would force the Claude adapter to write two files from one function whose contract is "return merged text of `settingsFilename`" — a contract break. `install.cjs` mergeSettings contract (`:327-339`) is text-in/text-out; `mergeMcp` should instead be effectful (`async (ctx) => void`), like `emitDerivedFiles`.

**Conditionality:** register Exa only when `detectExaKey()` (extract shared helper from `config.cjs:62-63`, or duplicate the two-line check in `bin/lib/`) returns true at install time. Registering an MCP server with no key means every runtime session pays a failing-server startup; skip-and-log is the right default. Re-running `oto install --<runtime>` after setting the key is the refresh path (installs are already idempotent); `settings-integrations` should say exactly that after a successful `secret-set`.

### Pattern 2: Marker-delimited TOML block for Codex MCP

**What:** `codex-toml.cjs` gains `mergeMcpBlock`/`unmergeMcpBlock` using `# === BEGIN OTO MCP ===` / `# === END OTO MCP ===`, structurally identical to `mergeHooksBlock` (`codex-toml.cjs:88-103`).
**Why a separate block from hooks:** `mergeHooksBlock` strips and rewrites its whole block on every install; folding `[mcp_servers.exa]` into the HOOKS block couples MCP lifecycle to hook lifecycle and breaks `unmergeHooksBlock`'s assumptions.
**Emitted TOML:**

```toml
# === BEGIN OTO MCP ===
[mcp_servers.exa]
command = "node"
args = ["<configDir>/hooks/oto-exa-mcp.js"]
# === END OTO MCP ===
```

Must not collide with a user-authored `[mcp_servers.exa]` outside the block — detect and warn-skip, mirroring `hasMixedLegacyHooks` caution (`codex-toml.cjs:23-30`).

### Pattern 3: Launcher script through the existing hooks build channel

**What:** New `oto/hooks/oto-exa-mcp.js` — reads `process.env.EXA_API_KEY || fs.readFileSync(path.join(os.homedir(), '.oto', 'exa_api_key'))`, then `spawn('npx', ['-y', 'exa-mcp-server'], { env: {...process.env, EXA_API_KEY: key}, stdio: 'inherit' })`, exiting with a clear stderr message when no key is found.
**Why the hooks channel:** `scripts/build-hooks.js:14-48` auto-discovers every `.js/.cjs/.sh` in `oto/hooks/`, vm-syntax-validates, and copies to `oto/hooks/dist/`; adapters ship `oto/hooks/dist` → `<configDir>/hooks/` (`runtime-*.cjs` `sourceDirs.hooks`). Zero new distribution machinery; the file is tracked in install state and removed on uninstall automatically. Precedent for non-hook executables in this channel: `oto-statusline.js`.
**Trade-offs:** `npx -y exa-mcp-server` performs a network fetch on first launch (then npm-cache-served). Acceptable for personal use; document `npm i -g exa-mcp-server` as the offline-hardening option. Alternative rejected: Exa's remote HTTP server (`https://mcp.exa.ai/mcp?exaApiKey=…`) puts the key in a URL inside config files — exactly what this milestone eliminates — and Codex HTTP transport support (`url` + `bearer_token_env_var`) is newer/less uniform than stdio.

## Anti-Patterns

### Anti-Pattern 1: Writing the API key into any runtime config file

**What people do:** `env = { EXA_API_KEY = "sk-…" }` in `config.toml` / `.claude.json` / `settings.json`, or Exa's remote URL with `?exaApiKey=…`.
**Why it's wrong:** Reproduces the exact leak this milestone fixes, in three more files — one of which (`.claude.json`) is outside oto's ownership and may be synced/backed up by users.
**Do this instead:** Launcher-script indirection; key resolved at MCP-server start from env/keyfile.

### Anti-Pattern 2: Overloading `mergeSettings` for MCP

**What people do:** Bolt `mcpServers` into the existing merge functions since two of three runtimes use the same file.
**Why it's wrong:** Claude's mcpServers live in a different file than `adapter.settingsFilename`; the text-in/text-out contract of `mergeSettings` (`install.cjs:327-339`) can't express a second target. It also entangles MCP lifecycle with hook unmerge logic.
**Do this instead:** Separate optional `mergeMcp`/`unmergeMcp` adapter hooks.

### Anti-Pattern 3: Unconditional registration

**What people do:** Always emit the Exa MCP entry so it "just works" once a key appears.
**Why it's wrong:** Keyless launches make the MCP server fail at every session start in three runtimes — visible noise, and Gemini/Codex surface MCP startup failures prominently.
**Do this instead:** Register only when `detectExaKey()` is true; settings-integrations prints the one-command refresh after `secret-set`.

### Anti-Pattern 4: Shelling out to `claude mcp add` / `codex mcp add` / `gemini mcp add` from the installer

**What people do:** Use each CLI's own MCP-add command for "official" registration.
**Why it's wrong:** Requires all three CLIs on PATH at install time, argv-leaks any inline secrets, output formats churn, and uninstall symmetry is lost. oto's whole adapter architecture is direct idempotent file merges with marker-based ownership.
**Do this instead:** Direct file merge, consistent with the hooks fleet.

## Component Inventory: NEW vs MODIFIED

### NEW

| Component | Location | Purpose |
|-----------|----------|---------|
| Exa MCP launcher | `oto/hooks/oto-exa-mcp.js` (→ `oto/hooks/dist/` via build) | Resolve key from env/keyfile at server start; exec `npx -y exa-mcp-server`. Only component that touches the secret at runtime. |
| Adapter hook: Claude MCP merge | new fns in `bin/lib/runtime-claude.cjs` (`mergeMcp`/`unmergeMcp`) | Additive `mcpServers.exa` edit of `~/.claude.json` (or `$CLAUDE_CONFIG_DIR/.claude.json`). |
| Adapter hook: Codex MCP merge | `mergeMcpBlock`/`unmergeMcpBlock` in `bin/lib/codex-toml.cjs`; wired in `bin/lib/runtime-codex.cjs` | Marker-delimited `[mcp_servers.exa]` block in `config.toml`. |
| Adapter hook: Gemini MCP merge | new fns in `bin/lib/runtime-gemini.cjs` | `mcpServers.exa` key in `~/.gemini/settings.json` (same file as hooks merge). |
| Secret CRUD commands | `secret-set`/`secret-clear`/`secret-status` in `sdk/src/query/` (new handler file) + registry entries in `sdk/src/query/index.ts`; CJS keyfile helpers in `oto/bin/lib/secrets.cjs` | Keyfile write/clear/status with 0600 perms and masked display. |
| Exa key detect helper | small shared helper in `bin/lib/` (or reuse from `oto/bin/lib/`) | One implementation of "env or keyfile exists" used by installer + config/init. |
| Tests | `tests/` — launcher unit test; per-adapter mcp-merge/unmerge tests (mirror `05-merge-settings.test.cjs`, `phase-08-gemini-settings.test.cjs` shapes); secret-set 0600 + no-plaintext-in-config regression test; install/uninstall round-trip | Shipping standard per PROJECT.md. |

### MODIFIED

| Component | Location | Change |
|-----------|----------|--------|
| Install orchestration | `bin/lib/install.cjs` (after `:339` install; after `:412` uninstall) | Dispatch optional `mergeMcp`/`unmergeMcp`; record MCP ownership in `.install.json` state (`:342-355`). |
| Secrets library | `oto/bin/lib/secrets.cjs` | Add keyfile helpers; repurpose `SECRET_CONFIG_KEYS` contract comment. |
| SDK config mutation | `sdk/src/query/config-mutation.ts` (+ rebuild `sdk/dist/`) | Boolean-only validation for `brave_search`/`firecrawl`/`exa_search`; masked echo safety net. |
| CJS config | `oto/bin/lib/config.cjs` (`cmdConfigSet`, `:313-377`) | Same boolean validation for parity. |
| Settings workflow | `oto/workflows/settings-integrations.md` | Keyfile-based Set/Replace/Clear; migration step for legacy string values; post-set "re-run `oto install --<runtime>` to register the Exa MCP server" guidance; rewritten `<security>` block. |
| Agent markdown | `oto/agents/oto-debugger.md`, `oto/agents/oto-advisor-researcher.md` (candidate: `oto-domain-researcher.md`) | Add `mcp__exa__*` to `tools:` frontmatter + Exa guidance block (copy the pattern from `oto-project-researcher.md:142-152`). Codex transform keeps `mcp__` names (pattern at `oto/bin/install.js:943-944`, mirrored in `bin/lib/codex-transform.cjs`); Gemini transform drops them since MCP tools are auto-discovered (pattern at `oto/bin/install.js:958-960`). Note: oto-advisor-researcher is `read-only` in the Codex sandbox map (`bin/lib/runtime-codex.cjs:87`) — MCP tool use is network, not filesystem, so no sandbox change needed. |
| Runtime matrix | `bin/lib/runtime-matrix.cjs` (`CAPABILITY_REGISTRY` already has an `mcp:` row) + regenerate `decisions/runtime-tool-matrix.md` via `scripts/render-runtime-matrix.cjs` | Add Exa MCP registration row (file merged, transport, conditionality). |
| Docs | `README.md` / configuration docs | Exa setup, free-tier note, keyfile location. |

### Explicitly NOT touched

- `oto/bin/install.js` (vestigial GSD installer) — reference only.
- `oto/bin/lib/config.cjs:53-163` `buildNewProjectConfig` — already correct (boolean detect).
- Hook fleet registration (`runtime-*.cjs` `mergeSettings` hook entries) — MCP is a sibling concern, not a hook.

## Suggested Build Order (dependency-respecting)

1. **Secret storage foundation** — `secrets.cjs` keyfile helpers; SDK `secret-set/clear/status` + registry + `sdk/dist` rebuild; boolean validation in both config-set paths; legacy-string migration logic. *(No dependencies; everything downstream reads the keyfile.)*
2. **Launcher script** — `oto/hooks/oto-exa-mcp.js` + build-hooks output verification. *(Depends on 1 only for the keyfile path convention.)*
3. **Installer MCP registration** — `mergeMcp`/`unmergeMcp` in the three adapters + `codex-toml.cjs` MCP block + `install.cjs` dispatch + install-state ownership + conditional detect. *(Depends on 2 — launcher path is what gets written — and 1 — detect helper.)*
4. **settings-integrations workflow rewrite** — keyfile flow, migration prompt, post-set registration guidance. *(Depends on 1; references 3's refresh path.)*
5. **Agent guidance extension** — `oto-debugger`, `oto-advisor-researcher` frontmatter + guidance blocks; verify Codex/Gemini transforms of the new tool declarations. *(Independent; can run parallel with 3-4.)*
6. **Tests, runtime matrix, docs** — per-adapter merge/unmerge round-trips, no-plaintext regression guard (assert `.oto/config.json` fixtures never contain key-shaped strings), matrix regeneration, README/config docs. *(Last; exercises 1-5. Unit tests naturally land inside phases 1-3 TDD-style — the standalone item is the integration/regression sweep.)*

Phase-mapping suggestion: 1+4 make one coherent phase ("key storage fix"), 2+3 a second ("MCP registration"), 5+6 a third ("guidance + hardening") — or fold 5 into 2+3 if three phases is too many for the milestone's size.

## Integration Points Summary (for the roadmap)

| Boundary | File:line | Nature |
|----------|-----------|--------|
| Install orchestration → adapters | `bin/lib/install.cjs:327-339` (install), `:399-412` (uninstall) | Add `mergeMcp`/`unmergeMcp` dispatch after settings merge |
| Claude MCP target | `~/.claude.json` (NOT `runtime-claude.cjs:166` settingsFilename) | New file target; additive JSON merge; `CLAUDE_CONFIG_DIR` relocation caveat (MEDIUM — verify) |
| Codex MCP target | `bin/lib/codex-toml.cjs` (new block beside `:3-4` hook markers) | `[mcp_servers.exa]` stdio entry |
| Gemini MCP target | `bin/lib/runtime-gemini.cjs:88-139` same settings.json | `mcpServers.exa` top-level key |
| Secret write path | `sdk/src/query/config-mutation.ts` + `sdk/src/query/index.ts` (registry ~`:338`) + `oto/bin/lib/secrets.cjs` | New secret-* commands; boolean guard on config-set |
| Secret read path (runtime) | new `oto/hooks/oto-exa-mcp.js`; existing detect at `oto/bin/lib/config.cjs:62-63`, `init.cjs:364-366` | env `EXA_API_KEY` → keyfile `~/.oto/exa_api_key` |
| Workflow surface | `oto/workflows/settings-integrations.md:79-145` (search-integrations step), `:13-33` (security block) | Rewrite Set/Replace/Clear + security contract |
| Agent surface | `oto/agents/oto-project-researcher.md:142-152` (pattern source); `oto-debugger.md`, `oto-advisor-researcher.md` (targets) | Copy Exa guidance block + `tools:` entry |
| Runtime matrix | `bin/lib/runtime-matrix.cjs` (`mcp` capability rows) → `decisions/runtime-tool-matrix.md` | Regenerate with Exa row |

## Sources

- `bin/install.js`, `bin/lib/install.cjs`, `bin/lib/runtime-claude.cjs`, `bin/lib/runtime-codex.cjs`, `bin/lib/runtime-gemini.cjs`, `bin/lib/codex-toml.cjs` — read in full (HIGH; primary evidence for integration points)
- `oto/bin/lib/config.cjs`, `oto/bin/lib/secrets.cjs`, `oto/bin/lib/init.cjs`, `oto/bin/lib/config-schema.cjs`, `oto/workflows/settings-integrations.md` — read in full / targeted (HIGH; dual-typing evidence)
- `sdk/src/query/config-mutation.ts`, `sdk/src/query/config-schema.ts`, `sdk/src/query/index.ts` — targeted reads (HIGH; proves the live config-set path has no masking)
- `scripts/build-hooks.js`, `oto/hooks/`, `package.json` — hooks distribution channel and bin wiring (HIGH)
- [Claude Code MCP docs](https://code.claude.com/docs/en/mcp), [.claude directory docs](https://code.claude.com/docs/en/claude-directory), [claude-code#25998](https://github.com/anthropics/claude-code/issues/25998), [claude-code#14313](https://github.com/anthropics/claude-code/issues/14313) — user-scope mcpServers in `~/.claude.json`; config-dir relocation (HIGH for location; MEDIUM for `CLAUDE_CONFIG_DIR` interaction)
- [Codex MCP docs](https://developers.openai.com/codex/mcp), [Codex config reference](https://developers.openai.com/codex/config-reference) — `[mcp_servers]` stdio shape, `env`/`env_vars` (HIGH)
- [Gemini CLI MCP server docs](https://google-gemini.github.io/gemini-cli/docs/tools/mcp-server.html) — `mcpServers` in settings.json, `$VAR` env expansion, `httpUrl` (HIGH)
- [exa-mcp-server (npm)](https://www.npmjs.com/package/exa-mcp-server), [Exa MCP docs](https://docs.exa.ai/reference/exa-mcp), [exa-labs/exa-mcp-server](https://github.com/exa-labs/exa-mcp-server) — `EXA_API_KEY` env, `web_search_exa` default tool, remote `https://mcp.exa.ai/mcp` (HIGH)

---
*Architecture research for: oto v0.5.0 Exa MCP integration*
*Researched: 2026-07-10*
