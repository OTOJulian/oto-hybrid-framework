# Phase 15: Exa MCP Registration (All Three Runtimes) - Research

**Researched:** 2026-07-13
**Domain:** MCP server registration across a multi-runtime installer (Claude Code / Codex / Gemini CLI) — adapter merge/unmerge, consent gating, fingerprint ownership, launcher-stdio transport
**Confidence:** HIGH (both flagged planning-time verifications resolved this session; all code-under-change read in full)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Transport ADR (MCP-02)
- **D-01:** Transport is **launcher-stdio**: a shipped launcher script (`oto/hooks/oto-exa-mcp.js`, distributed via the existing build-hooks channel) resolves the key from env/keyfile at spawn time and launches the Exa MCP server. Key material never lands in any runtime config file; rotation stays single-source in the Phase 14 keyfile. The ADR is written as the first task, before adapter code lands.
- **D-02:** The launcher pins the **exact version**: `npx -y exa-mcp-server@3.2.1`. Upstream has already deprecated 5+ tools; an exact pin keeps MCP-06's 3-tool surface deterministic. Version bumps ship as one-line changes in normal oto releases.
- **D-03:** Registration **pre-warms the npx cache** immediately after consent (e.g. `npx -y exa-mcp-server@3.2.1 --version`), so the first real session starts fast and offline/network failures surface at install time — not silently inside an agent run.
- **D-04:** The ADR **documents remote HTTP** (`https://mcp.exa.ai/mcp` + `x-api-key` header) as the evaluated alternative with trade-offs — anchoring the v0.5.x keyless-tier deferral (EXA-F-01) so it never gets re-researched from scratch.

#### Consent & registration entry points (MCP-01, MCP-07)
- **D-05:** Consent lives in **both** the installer and settings via one shared code path: `oto install --<runtime>` prompts once when a usable key is detected (default No; silent skip when no key or non-interactive), and `/oto-settings-integrations` offers register/unregister anytime (the key-added-later refresh path).
- **D-06:** One consent covers **the runtimes the current install command targets** — `oto install --claude` asks once and registers Claude; a later `--codex` install asks again for Codex. No all-runtime blanket, no per-runtime checklist ceremony.
- **D-07:** Consent answers are **persisted both ways** (Yes AND No) in `~/.oto` state / install-state. Later installs honor the recorded answer silently — Yes keeps registrations fresh, No never nags. Settings is the change surface.
- **D-08:** Non-interactive installs: default No applies — skip with a one-line log pointing at `/oto-settings-integrations` — plus an **explicit opt-in flag** (e.g. `oto install --claude --register-exa-mcp`) for scripted bootstrap. CI smoke tests stay clean; cross-machine setup stays scriptable.

#### Per-runtime status & config-dir resolution (MCP-09, FRESH-CR-02)
- **D-09:** Status truth = **live parse of each runtime's actual config file cross-checked against oto's install-state fingerprint**. Status distinguishes: registered (oto-managed) / registered (user-owned) / missing-but-expected (drift: user deleted it). Reuses the same parsing the duplicate-refusal logic needs.
- **D-10:** Coherence mismatches (`exa_search: true` but registered nowhere; registered but no usable key) warn with one line in the settings summary AND in `oto doctor`, both calling **one shared detection helper** (doctor precedent: PATH self-healing check from quick task 260616-muv).
- **D-11:** Runtimes with no config dir show as **"not installed"** in status; settings-driven registration only offers detected runtimes. No pre-registration into absent runtimes.
- **D-12:** Custom config-dir env overrides (`CLAUDE_CONFIG_DIR`, `CODEX_HOME`, `GEMINI_CONFIG_DIR`) are honored consistently across registration, status, and uninstall (FRESH-CR-02 contract). Note the open research flag: verify whether `~/.claude.json` relocates under `CLAUDE_CONFIG_DIR` before writing the Claude resolution (drafted fallback: `$CLAUDE_CONFIG_DIR/.claude.json` else `$HOME/.claude.json` — unconfirmed). *(Research resolution below: drafted fallback CONFIRMED.)*

#### Conflict & edge-case UX (MCP-04, MCP-08, FRESH-WR-04/05)
- **D-13:** External user-owned `exa` entry at registration time: **uniform refusal across all three runtimes** (Codex's TOML refusal is locked by MCP-04; Claude and Gemini match it). Refuse, report the existing entry, point at manual resolution. Status then shows "registered (user-owned)". No takeover prompt on JSON runtimes.
- **D-14:** Uninstall with a **drifted** oto-fingerprinted entry (user modified it after registration, fingerprint mismatch): **skip + report as modified** — treat like user-owned; nothing the user touched gets deleted. One-line notice: "exa entry was modified since oto registered it — left in place."
- **D-15:** Key-usability rule for registration gating: a keyfile is usable if it **resolves (symlinks followed) to a regular readable file whose trimmed content is non-empty**. Empty/whitespace files and non-regular targets = "no key detected". One helper serves CJS, SDK, and the launcher (FRESH-WR-04).
- **D-16:** `/oto-settings-integrations` Replace/Clear from any context **discloses global scope plainly** ("this key is shared by the root project and all workstreams") and **requires explicit confirmation**; enabled flags across root/workstream configs are reconciled after (FRESH-WR-05). No root-only lockout.

### Claude's Discretion
- Exact wording of consent prompts, refusal reports, drift notices, and status lines — keep to oto's one-line masked-value convention from Phase 14.
- Status line formatting and where the shared resolution/mismatch helpers live (sync hygiene: prefer oto-only files; small commented diffs in GSD-shared ones).
- Install-state fingerprint schema (hash vs stored-copy comparison) — whatever makes the round-trip tests cleanest.
- Launcher error-output details on spawn failure (one-line stderr; agents fall back per the HARD-01 ladder that Phase 16 formalizes).
- Consent-flag naming (`--register-exa-mcp` is illustrative, not binding).
- Test file placement within the existing `node:test` tooling-test layout; fixture strategy for the three-runtime round-trip family.

### Deferred Ideas (OUT OF SCOPE)
- Keyless/unauthenticated Exa tier registration (~150 calls/day) — EXA-F-01, v0.5.x+; anchored by the ADR's remote-HTTP alternative section (D-04).
- Live doctor ping (`tools/list` against the registered server) — EXA-F-02, v0.5.x+; D-10's mismatch check is static-config-only by design.
- Takeover flow for user-owned `exa` entries (convert to oto-managed with fingerprint) — rejected in D-13 for asymmetry; revisit only if uniform refusal proves annoying in practice.
- Uninstall-time prompting for drifted entries — rejected in D-14 (uninstall flows are often non-interactive).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MCP-01 | Consent before any registration; nothing silent; default No | Consent flow map (Pattern 6): TTY prompt in `bin/install.js` main before the adapter loop, `--register-exa-mcp` flag added to `bin/lib/args.cjs` strict parser, persisted answer in `~/.oto` state (D-07); install-smoke CI is non-TTY → default No keeps it clean [VERIFIED: codebase] |
| MCP-02 | Transport ADR recorded before registration code | ADR precedent: `decisions/ADR-01..15` format (Status/Date/Context/Decision/Rationale/Consequences) — next is ADR-16; D-01..D-04 pre-decide content; remote-HTTP alternative documented [VERIFIED: codebase decisions/] |
| MCP-03 | Claude user scope `~/.claude.json` additive JSON merge, no CLI shell-out | `CLAUDE_CONFIG_DIR` resolution CONFIRMED (`$CLAUDE_CONFIG_DIR/.claude.json` else `$HOME/.claude.json`); entry shape + additive merge pattern (Pattern 2); new effectful `mergeMcp` hook — `settingsFilename` contract cannot reach `.claude.json` [VERIFIED: claude-code#14313 + docs] |
| MCP-04 | Codex OTO-marker `[mcp_servers.exa]` block; refuse on external duplicate | `codex-toml.cjs` marker machinery read in full; `# === BEGIN OTO MCP ===` block sibling to HOOKS block; duplicate scan via existing `getTomlLineRecords` (`parseTomlBracketHeader` matches `mcp_servers.exa` dotted path); refusal mirrors `hasMixedLegacyHooks` (Pattern 3) [VERIFIED: codebase] |
| MCP-05 | Gemini `mcpServers.exa` in settings.json avoiding `url`-vs-`httpUrl` trap | Launcher-stdio entry uses `command`/`args` — the SSE trap is avoided by construction (no URL at all); same settings.json `runtime-gemini.cjs` already merges, but separate `mergeMcp` hook to avoid the `enableAgents:false` early-return coupling [VERIFIED: codebase + milestone research CITED] |
| MCP-06 | Exactly `web_search_exa`, `web_fetch_exa`, `web_search_advanced_exa` | Tool-pinning mechanism VERIFIED against the actual 3.2.1 package: Smithery `key=value` positional args — `tools=web_search_exa,web_fetch_exa,web_search_advanced_exa` (NOT `--tools`); defaults are only 2 tools (advanced is off-by-default) so the arg is REQUIRED; launcher passes it to the npx child [VERIFIED: package source + local run] |
| MCP-07 | Idempotent + conditional on detected key | Idempotency via fingerprint-match-then-rewrite (Pattern 5); key gating via existing `detectKeySource` (CJS `secrets.cjs:151` / SDK `secrets.ts:170`) with the D-15 usability upgrade; defect sites `config.cjs:88-93` and `config-mutation.ts:464-466` use bare `existsSync` — FRESH-WR-04 fix routes them through the canonical helper [VERIFIED: codebase] |
| MCP-08 | Uninstall removes only oto-fingerprinted entries; skip+report user-owned | `.install.json` state extension (`mcp` section passes `validateState` today — no unknown-key rejection — but should gain explicit validation); `unmergeMcp` dispatch after `unmergeSettings` (install.cjs:399-412) and BEFORE `removeTree(configDir/oto)` which deletes the state file [VERIFIED: codebase] |
| MCP-09 | `/oto-settings-integrations` per-runtime registration status | FRESH-CR-02 root cause found: workflow hardcodes `$HOME/.claude/oto/bin/oto-tools.cjs` AND the live installer never installs `oto/bin/` (no `bin` in `SRC_KEYS`; `~/.claude/oto/bin` absent on this machine). Fix direction: status via a new PATH-wired `oto-sdk query` command; SDK already registers `workstream get` and `config-path` [VERIFIED: codebase + live machine] |
| HARD-02 | node:test for merge/unmerge round-trips + boolean validation + no-plaintext guard | Boolean-validation (`tests/14-config-boolean.test.cjs`) and no-plaintext guard (`tests/14-no-plaintext-guard.test.cjs`) already exist from Phase 14; this phase adds the round-trip family modeled on `tests/05-merge-settings.test.cjs` (fixtures + merge→parse→unmerge→byte-identical) [VERIFIED: codebase tests/] |
</phase_requirements>

## Summary

The milestone research (`.oto/research/SUMMARY.md`, ARCHITECTURE.md, PITFALLS.md — HIGH confidence, 2026-07-10) already designed this phase: launcher-stdio transport, `mergeMcp`/`unmergeMcp` adapter hook pair, Codex marker block, install-state fingerprinting. This phase research resolves the two items the roadmap flagged for planning-time verification and completes the code-level integration map against the post-Phase-14 tree.

**Flag 1 resolved — `CLAUDE_CONFIG_DIR` → `.claude.json`:** When `CLAUDE_CONFIG_DIR` is set, Claude Code writes `.claude.json` **inside that directory** (`$CLAUDE_CONFIG_DIR/.claude.json`); unset, it lives at `$HOME/.claude.json`. Confirmed by claude-code#14313 (debug logs show the rename target moving under the config dir when the env var is exported) and the official `.claude`-directory docs ("every ~/.claude path lives under that directory instead"). The drafted D-12 fallback is correct as written. [VERIFIED: github.com/anthropics/claude-code/issues/14313]

**Flag 2 resolved — transport ADR inputs + tool pinning mechanics:** `exa-mcp-server@3.2.1` is still the npm `latest` (published 2026-04-23, no newer release). Its stdio binary is a Smithery bundle that parses **positional `key=value` args**, not flags: the launcher must spawn `npx -y exa-mcp-server@3.2.1 tools=web_search_exa,web_fetch_exa,web_search_advanced_exa`. Two consequential empirical findings: (a) `web_search_advanced_exa` is **off by default** — omitting the `tools=` arg ships only 2 of MCP-06's 3 tools; (b) the binary has **no `--version` handling** — D-03's illustrative pre-warm command would start a server that waits on stdio. However, the server **exits 0 cleanly on stdin EOF** (verified by running the actual 3.2.1 bundle locally), so the correct pre-warm is an empty-stdin spawn with a timeout. [VERIFIED: npm registry + package source + local execution]

One decision-level tension surfaced that the planner must handle explicitly: D-15 requires symlinks to be **followed** during key detection, but Phase 14's WR-07 hardening makes `readKeyfile` **refuse** symlinks (lstat + `isFile()` check). See Open Question 1 for the recommended reconciliation (follow-on-read via target-stat, keep O_NOFOLLOW on write).

**Primary recommendation:** Build exactly the milestone architecture — ADR-16 first, then launcher through the hooks channel, then `mergeMcp`/`unmergeMcp` on all three adapters with stored-copy fingerprints in `.install.json`, then consent wiring in `bin/install.js` + settings workflow, with the round-trip test family as the hard gate.

## Project Constraints (from CLAUDE.md)

- **No new npm dependencies** — `node:test` for tooling tests; zero-dep discipline; `exa-mcp-server` is never a `package.json` dep (npx-spawned at runtime only).
- **CJS at top level** (`bin/lib/*.cjs`); TypeScript confined to `sdk/` (ESM, `tsc` build, Vitest) — SDK changes require a `sdk/dist` rebuild.
- **No build-step additions**; the only build is `scripts/build-hooks.js` (syntax-validating copy) — the launcher ships through it.
- **All installer changes go in the live `bin/lib/` installer** — `oto/bin/install.js` is a vestigial GSD reference (pattern source only).
- **Sync hygiene** (standing v0.5.0 constraint): new logic in oto-only files (`bin/lib/*` is oto-only); shared-file diffs (`oto/bin/lib/config.cjs`, `secrets.cjs`, `oto/workflows/settings-integrations.md`) small and commented.
- **Runtime targets:** Claude Code, Codex, Gemini CLI only; copy-based install with marker/fingerprint ownership; uninstall symmetry is mandatory.
- **Personal-use cost ceiling** — no quota tracking, no vendoring, no plugin machinery.
- **OTO workflow enforcement:** implementation work starts through `/oto-execute-phase`.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Transport/auth ADR (MCP-02) | Repo docs (`decisions/`) | — | Point-in-time record; precedent ADR-01..15; must exist before adapter code lands |
| Consent prompt + flag + persistence (MCP-01, D-05..08) | Installer CLI (`bin/install.js` + `bin/lib/args.cjs`) | Settings workflow (register-later path) | Prompt is per-install-command (D-06); argv parsing is strict — new flag must be declared |
| Key-usability detection (MCP-07, D-15, FRESH-WR-04) | Shared secrets libs (`oto/bin/lib/secrets.cjs` + `sdk/src/query/secrets.ts`) | Launcher (inline copy) | Canonical helpers already exist (`detectKeySource`); the launcher cannot `require()` repo libs after install — see Pattern 4 |
| Per-runtime config merge/unmerge (MCP-03/04/05/08) | Runtime adapters (`bin/lib/runtime-*.cjs`, `codex-toml.cjs`) | Install orchestration (`bin/lib/install.cjs` dispatch) | Adapter hook pair beside `mergeSettings`; Claude targets a different file than `settingsFilename` |
| Fingerprint/ownership records | Install state (`bin/lib/install-state.cjs`, `<configDir>/oto/.install.json`) | — | Uninstall + status both read it; state is written once at the installRuntime commit point |
| Launcher (secret at runtime) | Hooks channel (`oto/hooks/oto-exa-mcp.js` → dist → `<configDir>/hooks/`) | build-hooks script | Only component touching the key at runtime; auto-discovered, syntax-validated, state-tracked, uninstall-removed |
| Registration status surface (MCP-09, D-09..D-12) | SDK query command (new, PATH-wired `oto-sdk`) | `oto doctor` (CJS, shares detection semantics) | Workflow shells to oto-sdk; the hardcoded per-runtime tools path is the FRESH-CR-02 defect being replaced |
| Settings workflow UX (D-16, FRESH-WR-05) | `oto/workflows/settings-integrations.md` | — | Markdown-only surface; never touches key material itself |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `exa-mcp-server` | 3.2.1 (exact pin, npx-spawned) | The MCP server the launcher runs | npm `latest` verified 2026-07-13 (`npm view` → 3.2.1, published 2026-04-23); D-02 locks the pin; NOT a package.json dep [VERIFIED: npm registry] |
| `node:test` + `node:assert/strict` | Node ≥22 built-in | Round-trip test family | Project standard; `npm test` = `node --test --test-concurrency=4 tests/*.test.cjs` [VERIFIED: package.json] |
| `node:fs` / `node:child_process` / `node:readline` | built-in | Config I/O, npx spawn/pre-warm, consent prompt | Zero-dep constraint |
| Existing adapter machinery | in-repo | Merge/unmerge, marker blocks, state | `bin/lib/{install,runtime-*,codex-toml,install-state}.cjs` read in full this session |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `oto/bin/lib/secrets.cjs` | in-repo (Phase 14) | `detectKeySource`, `readKeyfile`, `maskSecret`, `INTEGRATIONS` | Key gating + status display (CJS path); GSD-shared — keep diffs commented |
| `sdk/src/query/secrets.ts` | in-repo (Phase 14) | SDK mirror of the above | SDK-side detection parity (FRESH-WR-04); needs `sdk/dist` rebuild |
| `scripts/build-hooks.js` | in-repo | Ships the launcher | Auto-discovers top-level `.js/.cjs/.sh` in `oto/hooks/` — no allowlist edit needed [VERIFIED: build-hooks.js:45-48] |
| Vitest + `tsc --noEmit` | sdk-local | SDK test/typecheck | Only for SDK-side status/detection changes |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Launcher-stdio (D-01, locked) | Remote HTTP `https://mcp.exa.ai/mcp` + `x-api-key` | Documented in ADR-16 as the alternative: zero child process, Exa-maintained, keyless free tier — but requires a literal key in 2-3 user-private config files (rotation pain), Gemini headers can't expand env vars (gemini-cli#5282), Codex `bearer_token_env_var` sends the wrong header scheme |
| `key=value` Smithery args to pin tools | Gemini `includeTools` / per-runtime filters | Per-runtime filters are non-uniform (Claude has no per-server tool filter); pinning in the launcher gives one mechanism across all three runtimes |
| Hand-rolled TOML line scan (existing pattern) | npm TOML parser dep | Violates zero-dep constraint; marker-block + `parseTomlBracketHeader` already handles the needed subset |

**Installation:** none — zero new dependencies. Version verification performed: `npm view exa-mcp-server version` → `3.2.1`; `dist-tags.latest = 3.2.1`; last modified 2026-04-23. [VERIFIED: npm registry]

## Architecture Patterns

### System Architecture Diagram

```
 INSTALL TIME                                                      RUNTIME (each CLI session)
┌─────────────────────────────────────────────────────┐          ┌──────────────────────────────────┐
│ oto install --<runtime> [--register-exa-mcp]        │          │ Claude Code / Codex / Gemini      │
│   bin/install.js main()                             │          │ reads its own config file         │
│      │                                              │          │      │ finds mcpServers.exa /     │
│      ├─ parseCliArgs (args.cjs, +new flag)          │          │      │ [mcp_servers.exa]          │
│      ├─ CONSENT GATE (new):                         │          │      ▼                            │
│      │   detectKeySource('exa') usable? ──no──► skip│          │ spawns: node <configDir>/hooks/   │
│      │   recorded answer in ~/.oto? ──yes──► honor  │          │         oto-exa-mcp.js            │
│      │   TTY? ──no──► default No + 1-line log       │          │      │                            │
│      │   prompt (default No) ──No──► persist + skip │          │      ├─ key := EXA_API_KEY env    │
│      │      │ Yes (persist)                         │          │      │   || ~/.oto/exa_api_key    │
│      │      ▼                                       │          │      │   (trim; follow symlink    │
│      ├─ PRE-WARM npx cache (empty-stdin spawn,      │          │      │    to regular file; D-15)  │
│      │   timeout; failure surfaces HERE)            │          │      ├─ no key → 1-line stderr,   │
│      │      │                                       │          │      │   exit ≠0 (runtime reports │
│      ▼      ▼                                       │          │      │   server failed; agents    │
│  installRuntime(adapter)                            │          │      │   fall back per HARD-01)   │
│   copy files → emitDerivedFiles → marker inject     │          │      ▼                            │
│   → mergeSettings → ★ mergeMcp(ctx) ★               │          │ spawn npx -y exa-mcp-server@3.2.1 │
│      │         (NEW dispatch, after install.cjs:339)│          │   tools=web_search_exa,           │
│      │                                              │          │         web_fetch_exa,            │
│      ├─ claude: $CLAUDE_CONFIG_DIR/.claude.json     │          │         web_search_advanced_exa   │
│      │   else $HOME/.claude.json — additive         │          │   env: {…, EXA_API_KEY: key}      │
│      │   mcpServers.exa edit (refuse user-owned)    │          │      │                            │
│      ├─ codex: config.toml # === BEGIN OTO MCP ===  │          │      ▼                            │
│      │   block (refuse external [mcp_servers.exa])  │          │ exactly 3 tools exposed:          │
│      ├─ gemini: settings.json mcpServers.exa        │          │  Claude: mcp__exa__web_search_exa │
│      │   (stdio shape — no url/httpUrl at all)      │          │  Gemini: web_search_exa (bare)    │
│      ▼                                              │          │  Codex:  its own naming           │
│   writeState(.install.json + mcp fingerprint)       │          └──────────────────────────────────┘
└───────────────┬─────────────────────────────────────┘
                │                          UNINSTALL: state.files removal (launcher auto-removed)
                ▼                          → unmergeSettings → ★ unmergeMcp ★ (fingerprint match →
   STATUS (settings workflow + oto doctor)   remove; mismatch/user-owned → skip + report)
   live-parse 3 config files ⨯ install-state → BEFORE removeTree(configDir/oto) kills .install.json
   fingerprints → per-runtime status lines
```

### Recommended Project Structure

```
bin/lib/
├── install.cjs            # MODIFIED: mergeMcp/unmergeMcp dispatch + mcp state record + consent ctx
├── args.cjs               # MODIFIED: --register-exa-mcp (strict parser rejects unknown flags)
├── runtime-claude.cjs     # MODIFIED: mergeMcp/unmergeMcp (targets .claude.json, NOT settingsFilename)
├── runtime-codex.cjs      # MODIFIED: mergeMcp/unmergeMcp → codex-toml MCP block fns
├── runtime-gemini.cjs     # MODIFIED: mergeMcp/unmergeMcp (mcpServers key in same settings.json)
├── codex-toml.cjs         # MODIFIED: mergeMcpBlock/unmergeMcpBlock + hasExternalMcpServer scan
├── install-state.cjs      # MODIFIED: validate optional state.mcp section
├── mcp-register.cjs       # NEW (oto-only): entry builders, fingerprints, consent persistence,
│                          #   per-runtime status/coherence helper shared by doctor + installer
└── doctor.cjs             # MODIFIED: MCP coherence check (D-10)
oto/hooks/
└── oto-exa-mcp.js         # NEW: launcher (self-contained; ships via build-hooks → dist → hooks/)
sdk/src/query/
├── mcp-status.ts          # NEW: per-runtime registration status for the workflow (mirror semantics)
└── index.ts               # MODIFIED: register 'mcp-status' (+ register/unregister command if chosen)
oto/workflows/
└── settings-integrations.md  # MODIFIED: per-runtime status, register/unregister, D-16 global-scope confirm
decisions/
└── ADR-16-exa-mcp-transport.md  # NEW: first task (MCP-02)
tests/
├── 15-claude-mcp-merge.test.cjs, 15-codex-mcp-block.test.cjs, 15-gemini-mcp-merge.test.cjs
├── 15-launcher.test.cjs, 15-consent.test.cjs, 15-mcp-state.test.cjs, 15-mcp-status.test.cjs
└── fixtures/phase-15/    # user-owned-entry, drifted-entry, existing-config fixtures
```

### Pattern 1: Effectful optional adapter hook pair (`mergeMcp`/`unmergeMcp`)

**What:** New optional adapter members dispatched from `install.cjs` — install side immediately after the `mergeSettings` block (`install.cjs:327-339`), uninstall side after `unmergeSettings` (`install.cjs:399-412`) and **before** `removeTree(path.join(configDir, 'oto'))` at `:420` (which deletes `.install.json`).
**When to use:** The Claude target is a *different file* than `adapter.settingsFilename`, so the text-in/text-out `mergeSettings` contract cannot express it. Precedent for effectful optional hooks: `emitDerivedFiles` (`install.cjs:302-312`), `installCommandsOverride` (`:260-267`), `uninstallCommandsOverride` (`:416-418`). [VERIFIED: codebase]
**Contract sketch:** `async mergeMcp(ctx) => { registered: bool, refused?: {reason, existingEntry}, entry?: <what-was-written> }` with `ctx = { configDir, otoVersion, launcherPath, env }`. Return value feeds the `.install.json` `mcp` record and the install-time report line. `unmergeMcp(ctx)` receives the recorded fingerprint from prior state.
**State threading:** `installRuntime` writes state once, as a literal object at the commit point (`install.cjs:342-355`) — the mcp result must be captured before that call and included in the object. `validateState` (`install-state.cjs:7-47`) does not reject unknown keys, but add explicit validation for the optional `mcp` section (mirror the `state.hooks` pattern at `:39-45`) so corrupt records fail loudly.

### Pattern 2: Claude additive `.claude.json` merge

**What:** Resolve `process.env.CLAUDE_CONFIG_DIR ? path.join(CLAUDE_CONFIG_DIR, '.claude.json') : path.join(os.homedir(), '.claude.json')` — **confirmed correct** this session [VERIFIED: claude-code#14313 debug logs + code.claude.com/docs/en/claude-directory]. Read (file may be large — it holds project history/onboarding state), parse strict JSON, touch **only** `mcpServers.exa`, re-serialize with `JSON.stringify(obj, null, 2)` (matches Claude Code's own format).
**Entry to write:**

```json
{
  "mcpServers": {
    "exa": {
      "type": "stdio",
      "command": "node",
      "args": ["<configDir>/hooks/oto-exa-mcp.js"]
    }
  }
}
```

**Conflict rule (D-13):** if `mcpServers.exa` exists and does not fingerprint-match oto's state record → refuse, report, leave untouched. If it matches (re-install) → rewrite (idempotent refresh, MCP-07).
**Ownership:** no `_oto` breadcrumb inside `.claude.json` (it's Claude Code's live mutable state file); ownership lives exclusively in `<configDir>/oto/.install.json`. Note the resolution nuance: when `CLAUDE_CONFIG_DIR` is unset, `.claude.json` sits at `$HOME/.claude.json` — *outside* the configDir the installer resolved — so the Claude `mergeMcp` must do its own env-based resolution rather than deriving from `ctx.configDir`. When the user passes `--config-dir` (no env var), the correct target is ambiguous — see Open Question 3.

### Pattern 3: Codex marker-delimited MCP block

**What:** New `mergeMcpBlock`/`unmergeMcpBlock` in `codex-toml.cjs` with markers `# === BEGIN OTO MCP ===` / `# === END OTO MCP ===`, structurally identical to `mergeHooksBlock` (`codex-toml.cjs:88-103`) — strip-block-then-append. A **separate** block from HOOKS because `mergeHooksBlock` strips and rewrites its whole block wholesale on every install.
**External-duplicate refusal (MCP-04):** before writing, scan `stripBlock(existing)` output with `getTomlLineRecords`/`parseTomlBracketHeader` for a `[mcp_servers.exa]` (or `[[mcp_servers.exa]]`) header outside the OTO block → refuse with a one-line stderr report (mirror `hasMixedLegacyHooks`, `codex-toml.cjs:23-30`). `parseTomlBracketHeader` already matches dotted names like `mcp_servers.exa` [VERIFIED: codex-toml.cjs:6-13].
**Emitted TOML:**

```toml
# === BEGIN OTO MCP ===
# managed by oto v<version>
[mcp_servers.exa]
command = "node"
args = ["<configDir>/hooks/oto-exa-mcp.js"]
# === END OTO MCP ===
```

Use `JSON.stringify` for the string values (same quoting discipline as `emitHookEntry`, `codex-toml.cjs:77-86`) so paths with quotes/backslashes can't corrupt TOML. Round-trip test (merge → unmerge → byte-identical user content) is the HARD-02 hard gate.

### Pattern 4: Self-contained launcher through the hooks channel

**What:** `oto/hooks/oto-exa-mcp.js` — plain Node script, **no `require()` of repo libraries** (after install it lives alone in `<configDir>/hooks/`; `oto/bin/lib/` is never copied there — `SRC_KEYS` has no `bin`). Inline the ~20-line key resolution (env → keyfile per D-15) rather than importing `secrets.cjs`. Precedent for non-hook executables in this channel: `oto-statusline.js`. `build-hooks.js` auto-discovers top-level `.js` files (`build-hooks.js:45-48`) — no allowlist edit; the file is vm-syntax-validated, copied to `oto/hooks/dist/`, installed to `<configDir>/hooks/`, sha-tracked in `state.files`, and auto-removed on uninstall. [VERIFIED: codebase]
**Behavior:**
1. `key = (process.env.EXA_API_KEY || '').trim()`; if empty, read `~/.oto/exa_api_key`: `fs.statSync` (follows symlinks) must report a regular file; read, trim; empty → no key (D-15).
2. No key → one-line stderr (`oto-exa-mcp: no Exa API key (EXA_API_KEY or ~/.oto/exa_api_key) — run /oto-settings-integrations`) and `process.exit(1)`. Never print any part of the key.
3. Spawn `npx` with args `['-y', 'exa-mcp-server@3.2.1', 'tools=web_search_exa,web_fetch_exa,web_search_advanced_exa']`, `stdio: 'inherit'`, `env: { ...process.env, EXA_API_KEY: key }`; propagate child exit code; forward SIGTERM/SIGINT. On Windows spawn needs `npx.cmd`/`shell` handling — one guarded line (`process.platform === 'win32'`).
4. Never pass `exaApiKey=` as an argv item (the schema accepts it, but argv leaks into process listings). Env is the verified fallback: the bundle resolves `config.exaApiKey || process.env.EXA_API_KEY`. [VERIFIED: package source]

**Note on `${OTO_VERSION}` substitution:** `install.cjs:289-295` token-replaces `{{OTO_VERSION}}` in hook files at install time — usable if the launcher wants a version banner, optional.

### Pattern 5: Fingerprint ownership in `.install.json`

**What:** Extend the state object with an `mcp` section recorded at the `writeState` commit point:

```json
"mcp": {
  "exa": {
    "target": "/Users/x/.claude.json",
    "registered_at": "<iso>",
    "entry": { "type": "stdio", "command": "node", "args": ["…/hooks/oto-exa-mcp.js"] }
  }
}
```

**Recommendation (discretion area):** stored-copy comparison, not hash — `unmergeMcp` and the status helper both need the entry value anyway (for "what did oto write" reporting and drift diffing), deep-equality on the parsed value is trivial (`JSON.stringify` of key-sorted objects), and round-trip tests read better asserting against the stored entry than an opaque digest. For Codex, the fingerprint is the block's inner content (between markers) since the block is the ownership unit.
**Drift semantics (D-14):** at uninstall, parse the live file; entry absent → nothing to do (report "already removed"); entry deep-equals stored copy → remove; else → skip + one-line "modified since oto registered it — left in place."

### Pattern 6: Consent gate + persistence

**What:** In `bin/install.js` `main()` before the per-adapter loop (D-06: one prompt per install command covering its targeted runtimes):
1. `--register-exa-mcp` flag → consent yes (D-08). Must be added to `FLAG_CONFIG` in `args.cjs` — `parseArgs` is `strict: true` and throws on unknown flags [VERIFIED: args.cjs:6-20].
2. Else: usable key detected (D-15 helper)? No → silent skip (one line only if verbose).
3. Else: recorded answer in `~/.oto` consent state? → honor silently (D-07).
4. Else: `process.stdin.isTTY && process.stdout.isTTY`? No → default No + one-line log pointing at `/oto-settings-integrations` (keeps `install-smoke.yml` CI clean — it runs real installs non-interactively). Yes → `node:readline` prompt, default No; persist the answer either way.
**Persistence location (discretion):** recommend a new oto-owned `~/.oto/mcp-consent.json` (e.g. `{ "exa": { "claude": "yes", "codex": "no" } }`) rather than `~/.oto/defaults.json` — `loadDefaults` (`codex-profile.cjs`) validates that file's shape and other GSD-era readers touch it; a dedicated file keeps the contract clean and the tests isolated. Per-runtime answers support D-06's per-install-command semantics.
**Pre-warm (D-03, corrected):** `spawnSync('npx', ['-y', 'exa-mcp-server@3.2.1', 'tools=…'], { input: '', timeout: 120000 })` — stdin EOF makes the server exit 0 after startup (verified locally on the real 3.2.1 bundle). `--version` does NOT exist in the binary (zero matches in the bundle) and would hang the install. First-run download can take tens of seconds; print a "warming npx cache…" line first. Non-zero exit / timeout → report failure at install time and still write the registration (the launcher will surface the same failure per-session) — or skip registration; planner's call, but report either way.

### Pattern 7: Status + coherence helper (MCP-09, D-09/D-10, FRESH-CR-02)

**What:** One detection routine, two consumers (settings summary + `oto doctor`), mirrored across CJS and SDK per the both-write-paths discipline:
- Resolve each runtime's config dir: env override (`CLAUDE_CONFIG_DIR`/`CODEX_HOME`/`GEMINI_CONFIG_DIR`) else `~/.claude`|`~/.codex`|`~/.gemini` — same logic as `resolveConfigDir` (`args.cjs:89-93`). Dir absent → "not installed" (D-11).
- Live-parse the runtime's MCP location (Claude: resolved `.claude.json`; Codex: `config.toml` OTO-block + outside-block scan; Gemini: `settings.json`), cross-check against `<configDir>/oto/.install.json` `mcp` fingerprint → `oto-managed` / `user-owned` / `drifted` / `missing-but-expected` / `not registered`.
- Coherence warnings (D-10): `exa_search: true` but registered nowhere; registered but no usable key.
**FRESH-CR-02 fix:** the settings workflow's `OTO_TOOLS="${OTO_TOOLS:-$HOME/.claude/oto/bin/oto-tools.cjs}"` default is doubly broken — hardcoded Claude path AND the live `bin/lib` installer never installs `oto/bin/` anywhere (verified: no `bin` in `SRC_KEYS`; `~/.claude/oto/bin` does not exist on this machine while `~/.claude/oto/.install.json` does). Recommendation: expose the status as a **new `oto-sdk query mcp-status` command** (oto-sdk is PATH-wired and runtime-independent) and have the workflow consume it; the workstream/config-path resolution the workflow needs is also already registered in the SDK (`workstream get` at `index.ts:511-512`, `config-path` at `:286`), allowing the `$OTO_TOOLS` dependency to be dropped from this workflow entirely. `oto doctor` gets the CJS twin in `bin/lib/` (extend `doctor.cjs` `main()`, precedent 260616-muv).

### Anti-Patterns to Avoid

- **Overloading `mergeSettings` for MCP:** Claude's target is a different file; entangles MCP lifecycle with hook unmerge and Gemini's `enableAgents:false` early-return path (`runtime-gemini.cjs:92-103`).
- **Shelling out to `claude mcp add` / `codex mcp add`:** requires CLIs on PATH at install time, argv-leaks, output churn, breaks uninstall symmetry (also explicitly banned in REQUIREMENTS Out of Scope; claude-code#18692).
- **Key material in any runtime config** (env map, header, `?exaApiKey=` URL): reproduces the Phase 14 defect in three more files. The launcher indirection exists precisely to prevent this.
- **`--tools` flags or JSON config files for the stdio server:** the 3.2.1 stdio bundle parses only positional `key=value` Smithery args; anything else is silently ignored (tools revert to the 2-tool default — MCP-06 violation).
- **Registering without a usable key:** every session pays a failing-server startup in the registered runtime.
- **`_oto` breadcrumb inside `.claude.json`:** not oto's file; ownership belongs in `.install.json`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| TOML table detection | A TOML parser (or npm dep) | `getTomlLineRecords` + `parseTomlBracketHeader` (`codex-toml.cjs`) + marker block | Zero-dep constraint; the needed subset (bracket headers in/out of a marked block) is already implemented and tested |
| JSONC-tolerant settings parse | New parser | `parseSettings` in `runtime-claude.cjs:52-66` / `runtime-gemini.cjs:15-29` | Handles comment-stripping fallback; identical semantics both adapters |
| Key detection / masking | New key logic in the installer | `detectKeySource` / `readKeyfile` / `maskSecret` (`oto/bin/lib/secrets.cjs`, `sdk/src/query/secrets.ts`) | Phase 14 hardening (heal-before-read, empty-file, non-regular refusal) is already encoded; D-15 amends, not replaces |
| Config-dir resolution | New env-var logic | `resolveConfigDir` (`args.cjs:89-93`) + adapter `configDirEnvVar`/`defaultConfigDirSegment` | Already covers flag > env > default; reuse in status |
| Tool-surface filtering | Per-runtime `includeTools`/allowlists | `tools=` Smithery arg in the launcher | One mechanism, three runtimes; per-runtime filters drift |
| Hook distribution | New copy path for the launcher | `scripts/build-hooks.js` channel | Auto-discovery, syntax validation, state tracking, uninstall — all free |
| Interactive secrets | Any key prompt in this phase | Phase 14's `secret-set` stdin/TTY flow | Registration never handles key bytes; only detection |

**Key insight:** every mechanism this phase needs (marker ownership, JSONC parse, fingerprint state, hooks shipping, key detection) already exists in-tree with tests; the phase is composition, not construction. New code should be almost entirely in oto-only files (`bin/lib/`, `oto/hooks/`, `sdk/src/query/mcp-status.ts`), keeping the GSD-shared diff surface to `settings-integrations.md` + small commented touches in `config.cjs`/`secrets.cjs`.

## Common Pitfalls

### Pitfall 1: Pre-warm hangs the installer
**What goes wrong:** D-03's illustrative `npx -y exa-mcp-server@3.2.1 --version` starts the MCP server (the bundle has no `--version` handling — verified zero matches in the 3.2.1 source) and blocks on stdio forever.
**Why it happens:** Smithery stdio bundles treat all argv as `key=value` config; unmatched args are ignored and the server starts.
**How to avoid:** Empty-stdin spawn with timeout: the server exits 0 on stdin EOF after `[smithery] MCP server connected to stdio transport` (verified by executing the real 3.2.1 bundle locally). `spawnSync('npx', [...], { input: '', timeout: 120000 })`.
**Warning signs:** install never returns; CI job timeout.

### Pitfall 2: Only 2 of 3 tools exposed
**What goes wrong:** Omitting the `tools=` arg ships the server defaults — `web_search_exa` + `web_fetch_exa` only; `web_search_advanced_exa` is `enabled: false` by default (MCP-06 fails quietly).
**How to avoid:** Launcher always passes `tools=web_search_exa,web_fetch_exa,web_search_advanced_exa`; the filter is exact-include when non-empty (verified in the bundle's registration filter). Unit-test the argv the launcher assembles.
**Warning signs:** advanced tool missing from `claude mcp list` tool output / agent tool errors on the advanced tool only.

### Pitfall 3: Codex TOML corruption via duplicate table
**What goes wrong:** Appending `[mcp_servers.exa]` when the user already has one breaks Codex's ENTIRE config parse (hooks, model settings, everything).
**How to avoid:** Outside-block scan + refusal before write (Pattern 3); merge→unmerge→byte-identical round-trip test as the HARD-02 hard gate; test against a fixture with a user-owned `[mcp_servers.exa]` AND one with other user `[mcp_servers.*]` entries that must survive untouched.
**Warning signs:** Codex refuses to start after install; user MCP entries missing.

### Pitfall 4: `.claude.json` clobbering
**What goes wrong:** `.claude.json` is Claude Code's live mutable state (project history, onboarding); a concurrent Claude session can rewrite it between oto's read and write, or oto's rewrite drops unknown keys.
**How to avoid:** Read-modify-write in one tick, touch only `mcpServers.exa`, preserve every other key byte-for-byte at the object level, `JSON.stringify(obj, null, 2)`; document "don't run install while a Claude session is actively mutating state" as a known small window (personal-tool accept). Consider write-then-verify parse.
**Warning signs:** Claude loses project history/onboarding state after `oto install`.

### Pitfall 5: Uninstall ordering destroys the fingerprint before it's used
**What goes wrong:** `uninstallRuntime` ends with `removeTree(configDir/oto)` which deletes `.install.json`; if `unmergeMcp` runs after that (or reads state lazily), the fingerprint is gone and the entry orphans.
**How to avoid:** Dispatch `unmergeMcp` right after the `unmergeSettings` block (`install.cjs:399-412`), passing the already-read `state` object. Also: the launcher file itself is in `state.files` and is removed by the file loop at `:383-388` — no extra cleanup needed, but the registration entry must go too or every session logs a spawn failure.
**Warning signs:** `exa` still in `claude mcp list` after `oto uninstall`; hooks/oto-exa-mcp.js missing but config entry present.

### Pitfall 6: Consent prompt breaks CI / non-interactive installs
**What goes wrong:** `install-smoke.yml` runs real `npm install -g` + `oto` installs with no TTY; a blocking readline prompt hangs the job.
**How to avoid:** TTY check before prompting (D-08); default No with a one-line log. Test with stdin not-a-TTY. Note the smoke machines have no `~/.oto` key, so the key gate already short-circuits there — but don't rely on that alone.
**Warning signs:** CI job stuck at the consent step.

### Pitfall 7: Detection helper divergence (three implementations)
**What goes wrong:** D-15's rule ends up implemented slightly differently in CJS `secrets.cjs`, SDK `secrets.ts`, and the inline launcher copy — e.g. one follows symlinks, another refuses; registration then gates on a different answer than the launcher acts on ("registered but server always exits 1").
**How to avoid:** Write the D-15 rule as a table in the ADR/plan (env-trim → stat-follow → regular-file → read-trim → non-empty), implement identically in all three sites, and add matching test cases (empty, whitespace, symlink-to-regular, symlink-to-dir, FIFO) to each suite. FRESH-WR-04 defect sites to fix while there: `oto/bin/lib/config.cjs:88-93` and `sdk/src/query/config-mutation.ts:464-466` (+ `init-complex.ts`) use bare `existsSync` — an empty or dangling keyfile currently counts as "key present".
**Warning signs:** status says enabled/registered while launcher exits "no key".

### Pitfall 8: Gemini `enableAgents:false` early return skips more than intended
**What goes wrong:** If Gemini MCP registration is folded into `mergeSettings`, the existing `experimental.enableAgents === false` early-return (`runtime-gemini.cjs:92-103`) would silently skip MCP registration too (or, refactored badly, stop skipping hooks).
**How to avoid:** Keep `mergeMcp` a separate hook even though it writes the same file; MCP servers don't depend on Gemini's agents experiment.
**Warning signs:** Exa registered/not-registered flips with the enableAgents setting.

### Pitfall 9: This dev machine has no live key or `~/.oto` keyfiles
**What goes wrong:** Manual verification steps assume a detected key; `~/.oto/` is empty here (verified), so the happy path can't be exercised without setup, and tests that touch the real `~/.oto` would pollute developer state.
**How to avoid:** All Phase 14 helpers accept a `baseDir` parameter (`secrets.cjs` `keyfileBase(baseDir)`) — thread an override through the new detection/consent/state code paths so tests run against temp dirs; the launcher can honor an `OTO_KEYFILE_DIR`-style override or be tested by spawning with a fake `HOME`. Manual e2e: set `EXA_API_KEY` in env.
**Warning signs:** tests writing to the real `~/.oto`; "works on CI, not locally" flakiness.

## Code Examples

### Launcher core (oto/hooks/oto-exa-mcp.js — self-contained)

```js
// Source: pattern from .oto/research/ARCHITECTURE.md Pattern 3 + D-15 + verified 3.2.1 arg format
const key = resolveKey(); // env EXA_API_KEY (trim) → ~/.oto/exa_api_key (stat-follow, regular, trim, non-empty)
if (!key) {
  process.stderr.write('oto-exa-mcp: no Exa API key (EXA_API_KEY or ~/.oto/exa_api_key) — run /oto-settings-integrations\n');
  process.exit(1);
}
const { spawn } = require('node:child_process');
const child = spawn(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['-y', 'exa-mcp-server@3.2.1', 'tools=web_search_exa,web_fetch_exa,web_search_advanced_exa'],
  { stdio: 'inherit', env: { ...process.env, EXA_API_KEY: key } }
);
child.on('exit', (code, signal) => process.exit(signal ? 1 : (code ?? 1)));
```

### Pre-warm (verified exit-on-EOF behavior)

```js
// Source: local execution of the real 3.2.1 bundle — server exits 0 when stdin closes
const { spawnSync } = require('node:child_process');
const res = spawnSync(process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['-y', 'exa-mcp-server@3.2.1', 'tools=web_search_exa,web_fetch_exa,web_search_advanced_exa'],
  { input: '', timeout: 120000, encoding: 'utf8' });
// res.status === 0 → cache warm + server startable; else report at install time (D-03)
```

### Claude mergeMcp resolution + additive edit

```js
// Source: verified CLAUDE_CONFIG_DIR behavior (claude-code#14313); additive-merge rule from milestone research
function claudeJsonPath(env) {
  const dir = env.CLAUDE_CONFIG_DIR;
  return dir ? path.join(expandTilde(dir), '.claude.json') : path.join(os.homedir(), '.claude.json');
}
// read → JSON.parse → inspect existing mcpServers.exa:
//   absent            → write entry, record fingerprint
//   deep-equals state → no-op (idempotent)
//   else              → refuse + report (D-13), status shows "registered (user-owned)"
```

### Codex MCP block emit (quoting discipline)

```js
// Source: emitHookEntry pattern, codex-toml.cjs:77-86
const lines = [
  MCP_BEGIN,
  `# managed by oto v${ctx.otoVersion || 'unknown'}`,
  '[mcp_servers.exa]',
  'command = "node"',
  `args = [${JSON.stringify(launcherPath)}]`,
  MCP_END,
];
```

### Round-trip test shape (HARD-02 family)

```js
// Source: tests/05-merge-settings.test.cjs structure (fixtures + node:test + assert/strict)
test('15 codex mcp: merge → unmerge is byte-identical for user content', () => {
  const merged = mergeMcpBlock(FIX_USER_TOML, ctx);
  assert.equal(unmergeMcpBlock(merged), FIX_USER_TOML);
});
test('15 codex mcp: external [mcp_servers.exa] refuses and leaves input untouched', () => {
  const out = mergeMcpBlock(FIX_USER_OWNED_EXA, ctx);
  assert.equal(out, FIX_USER_OWNED_EXA);
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Exa tools `crawling_exa`, `get_code_context_exa`, `deep_researcher_*`, `company_research_exa`, `linkedin_search_exa`, `deep_search_exa`, `people_search_exa` | Deprecated (`enabled:false`, "Deprecated: use web_search_advanced_exa / web_fetch_exa instead" in tool metadata) | ≤ v3.2.1 | Never reference them; the 3-tool pin is the current surface [VERIFIED: 3.2.1 bundle metadata] |
| exa-mcp-server `--tools` flag era (2.x docs floating around) | Smithery `key=value` positional args (`tools=` / `enabledTools=`, comma string or JSON array) | 3.x Smithery rebuild | Old snippets with `--tools=` silently do nothing |
| Claude MCP in `~/.claude/settings.json` (common misconception) | User scope in `~/.claude.json` (`$CLAUDE_CONFIG_DIR/.claude.json` when relocated) | stable | The reason `mergeMcp` is a new hook, not a `mergeSettings` extension |
| Gemini `url` (SSE) | `httpUrl` (streamable HTTP) for remote; stdio `command/args` unaffected | gemini-cli deprecation of SSE | Moot under launcher-stdio — no URL is written at all |
| Codex flat `[[hooks]]`/`[hooks.X]` legacy formats | Codex 0.125.0+ `[[hooks.Event]]` schema; `[mcp_servers.<name>]` tables stable | 0.124-0.125 | Existing `hasMixedLegacyHooks` caution shows the refusal pattern to mirror |

**Deprecated/outdated:** `oto/bin/install.js` (7,758-line GSD port) — reference only, never modified. `~/.gsd/defaults.json` path in `config-mutation.ts:349` — known divergence, out of this phase's scope (STATE.md deferred item).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Claude Code *reads* MCP servers from `$CLAUDE_CONFIG_DIR/.claude.json` when the env var is set (write-side confirmed via #14313 debug logs; read-side inferred from "every ~/.claude path lives under that directory") | Pattern 2 | Registration lands in a file Claude ignores for relocated-config users; D-09's live-parse status would show it "registered" while tools are absent. Mitigation: cheap manual probe during implementation (`CLAUDE_CONFIG_DIR=/tmp/x claude mcp list` after seeding the file) |
| A2 | `"type": "stdio"` in the Claude entry is accepted/ignored-harmlessly (docs examples show stdio entries with and without it) | Pattern 2 | Entry rejected or normalized by Claude (fingerprint drift false-positive). Mitigation: fingerprint compares the parsed object oto wrote; verify once manually with `claude mcp list` |
| A3 | Codex tolerates comment lines (`# === BEGIN OTO MCP ===`) adjacent to `[mcp_servers.exa]` | Pattern 3 | None realistic — comments are core TOML; the HOOKS block ships this way today (working install on this machine) |
| A4 | zod `safeParse` in the 3.2.1 bundle strips/ignores unknown config keys rather than erroring | Pattern 4 | Extra args could fail startup; launcher passes only `tools=`, a schema-declared key, so exposure is nil |
| A5 | Stdin-EOF exit behavior holds under `npx` wrapping on other platforms (verified on macOS/node 22 against the extracted bundle directly) | Pattern 6 | Pre-warm timeout fires spuriously on some platform; timeout + non-fatal handling already required by D-03's "surface failures" intent |
| A6 | `oto-sdk query workstream get` / `config-path` SDK commands accept the same flags (`--raw`) the workflow currently passes to `oto-tools` | Pattern 7 | Workflow rewrite needs a small flag-shim or output adjustment; verify during planning (registry entries confirmed to exist, flag surface not audited) |

## Open Questions

1. **D-15 "symlinks followed" vs Phase 14 WR-07 symlink refusal (must be reconciled in the plan)**
   - What we know: D-15 (locked) says a keyfile resolving *through* symlinks to a regular readable non-empty file IS usable. Phase 14's `readKeyfile` (both CJS and SDK) lstat-refuses any non-regular file — a symlink currently means "no key" — and `writeKeyfile` uses O_NOFOLLOW (WR-07 FIX, with an ACCEPTED residual TOCTOU).
   - What's unclear: whether D-15 intends to relax the *read* path (likely — a symlink into a password-manager-managed file is the legit use case) or only defines the detection wording.
   - Recommendation: implement D-15 as written for READ/DETECT (stat-follow, target must be a regular readable file, trimmed non-empty) in all three sites (CJS, SDK, launcher), while WRITE keeps lstat + O_NOFOLLOW refusal (the WR-07 threat was write-through-symlink). Record the delta in the plan and add symlink-to-regular/symlink-to-dir/dangling-symlink test cases per FRESH-WR-04. If the planner reads D-15 differently, this needs a one-line user confirmation before code lands.

2. **Consent persistence file** *(discretion area — recommendation only)*
   - What we know: D-07 says "`~/.oto` state / install-state." `~/.oto/defaults.json` exists as a concept (validated by `loadDefaults`, read by `config.cjs`), `.install.json` is per-runtime and rewritten wholesale each install.
   - What's unclear: nothing blocking; pure placement choice.
   - Recommendation: new `~/.oto/mcp-consent.json` keyed by integration → runtime → yes/no (+ timestamp). Per-runtime answers implement D-06/D-07 exactly; `.install.json` additionally records what was *written* (fingerprint), keeping "what the user chose" and "what oto did" separate.

3. **Claude target when `--config-dir` flag is used without `CLAUDE_CONFIG_DIR`**
   - What we know: `resolveConfigDir` honors flag > env > default for the *config dir*; but Claude Code itself only relocates `.claude.json` via the env var — a flag-only custom install writes runtime files to the custom dir while the real Claude process (without the env var) still reads `$HOME/.claude.json`.
   - What's unclear: which target best serves the FRESH-CR-02 "custom Claude config-dir installs failed" reproduction.
   - Recommendation: resolve the `.claude.json` path from `CLAUDE_CONFIG_DIR` env (matching what Claude Code itself will read), NOT from the `--config-dir` flag; when the flag is set without the env var, register into `$CLAUDE_CONFIG_DIR`-unset behavior (`$HOME/.claude.json`) and note it in the install report. Status must use the same resolution so D-09's cross-check stays truthful. Tests pin both branches.

4. **Pre-warm failure policy** *(one-line decision for the plan)*
   - What we know: D-03 wants failures surfaced at install time. Unclear: on pre-warm failure (offline), still write the registration or skip?
   - Recommendation: still register (consent was given; the launcher fails with the same message per-session and npx will succeed once online), print a clear one-line warning. Skipping would silently contradict the persisted "yes."

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js ≥22 | everything | ✓ | 22.17.1 | — |
| npm / npx | pre-warm + launcher spawn | ✓ | 10.9.2 | — |
| `claude` CLI | manual e2e verification only (never shelled by installer) | ✓ | on PATH | — |
| `codex` CLI | manual e2e verification only | ✓ | on PATH | — |
| `gemini` CLI | manual e2e verification only | ✓ | on PATH | — |
| `~/.claude` oto install | live-target testing | ✓ | oto 0.4.1 (`.install.json`, 337 files) | — |
| `~/.codex` oto install | live-target testing | ✓ | oto install present | — |
| `~/.gemini` | D-11 "detected runtime" case | ✓ dir exists, NO oto install | — | good fixture for the not-installed/status path |
| `~/.claude.json` | Claude merge target | ✓ exists | — | — |
| Exa API key | happy-path e2e | ✗ (`~/.oto` empty, no `EXA_API_KEY`) | — | export `EXA_API_KEY` for manual e2e; all automated tests use temp `baseDir`/fake HOME |
| Network (npm registry) | pre-warm, npx first run | ✓ (note: sandboxed test shells may block npx — a local `npx -y` probe failed in this session's sandbox while direct execution of the downloaded tarball worked) | — | tests must not depend on live npx; launcher tests assert argv assembly, not real spawn |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** Exa API key (env-var injection for manual verification; temp-dir keyfiles for tests).

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | `node:test` (Node 22 built-in) for tooling; Vitest + `tsc --noEmit` inside `sdk/` |
| Config file | none (convention: `tests/*.test.cjs`; sdk: `sdk/vitest` defaults) |
| Quick run command | `node --test --test-reporter=dot tests/15-*.test.cjs` |
| Full suite command | `npm test` (= `node --test --test-concurrency=4 tests/*.test.cjs`); SDK: `cd sdk && npx tsc --noEmit && npx vitest run src/query/mcp-status.test.ts` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MCP-01 | Consent gate: default No, TTY-detect, flag override, persisted answers honored | unit | `node --test tests/15-consent.test.cjs` | ❌ Wave 0 |
| MCP-02 | ADR-16 exists with required sections before adapter code | structural | `node --test tests/15-adr.test.cjs` (mirror `phase-01-adr-structure.test.cjs`) | ❌ Wave 0 |
| MCP-03 | Claude merge: additive, idempotent, env-based path resolution, refusal on user-owned | unit round-trip | `node --test tests/15-claude-mcp-merge.test.cjs` | ❌ Wave 0 |
| MCP-04 | Codex block: merge→unmerge byte-identical; external-duplicate refusal; other `[mcp_servers.*]` preserved | unit round-trip (HARD gate) | `node --test tests/15-codex-mcp-block.test.cjs` | ❌ Wave 0 |
| MCP-05 | Gemini entry: stdio shape (no url/httpUrl keys), survives enableAgents:false, idempotent | unit round-trip | `node --test tests/15-gemini-mcp-merge.test.cjs` | ❌ Wave 0 |
| MCP-06 | Launcher argv contains exactly the 3-tool `tools=` arg + `@3.2.1` pin; no key in argv | unit | `node --test tests/15-launcher.test.cjs` | ❌ Wave 0 |
| MCP-07 | Double-merge stable on all three adapters; no-key → skip; D-15 usability matrix (empty/whitespace/symlink/non-regular) in CJS+SDK+launcher | unit | `node --test tests/15-*.test.cjs` + `cd sdk && npx vitest run src/query/secrets.test.ts` | ❌ Wave 0 (extends existing 14-* suites) |
| MCP-08 | Uninstall removes fingerprint-matched only; drifted → skip+report; user-owned untouched; launcher file removed via state.files | unit + integration (temp configDir install/uninstall round-trip) | `node --test tests/15-mcp-state.test.cjs` | ❌ Wave 0 |
| MCP-09 | Status classifier: oto-managed/user-owned/drifted/missing-expected/not-installed per runtime; env-override dirs honored | unit (both paths) | `node --test tests/15-mcp-status.test.cjs` + sdk vitest twin | ❌ Wave 0 |
| HARD-02 | Three families green under `npm test` | aggregate | `npm test` | partially ✅ (`tests/14-config-boolean.test.cjs`, `tests/14-no-plaintext-guard.test.cjs` exist; round-trip family is this phase) |

Manual-only (justified): live `claude mcp list` / Codex startup / `gemini` tool listing after a real consented install — requires interactive runtimes and a real key; scripted equivalents would shell out to the CLIs the requirements ban from the install path. Keep as human verification steps in the phase verification doc.

### Sampling Rate
- **Per task commit:** `node --test --test-reporter=dot tests/15-*.test.cjs` (plus `cd sdk && npx tsc --noEmit` when SDK files change)
- **Per wave merge:** `npm test` + focused SDK vitest for touched files
- **Phase gate:** `npm test` green + SDK typecheck + the Phase 14 SDK-baseline discipline (no new persistent failures vs 14-SDK-BASELINE)

### Wave 0 Gaps
- [ ] `tests/15-consent.test.cjs` — MCP-01 (TTY/flag/persistence matrix)
- [ ] `tests/15-adr.test.cjs` — MCP-02 structural check
- [ ] `tests/15-claude-mcp-merge.test.cjs`, `tests/15-codex-mcp-block.test.cjs`, `tests/15-gemini-mcp-merge.test.cjs` — MCP-03/04/05 + HARD-02 round-trips
- [ ] `tests/15-launcher.test.cjs` — MCP-06
- [ ] `tests/15-mcp-state.test.cjs` — MCP-07/08 (fingerprint/drift/uninstall)
- [ ] `tests/15-mcp-status.test.cjs` + `sdk/src/query/mcp-status.test.ts` — MCP-09
- [ ] `tests/fixtures/phase-15/` — existing-config, user-owned-exa, drifted-entry fixtures per runtime
- Framework install: none needed (node:test built-in; sdk vitest already configured)

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no (no auth flows; API key is a bearer secret handled by Phase 14 machinery) | — |
| V3 Session Management | no | — |
| V4 Access Control | yes (file ownership) | Fingerprint-gated mutation: oto never deletes/overwrites config it can't prove it wrote (D-13/D-14); path-traversal guard `assertWithin` already protects state-driven removals |
| V5 Input Validation | yes | Boolean-only integration flags (Phase 14, both write paths); `validateState` extension for the `mcp` section; TOML/JSON string quoting via `JSON.stringify` for embedded paths |
| V6 Cryptography | no (no crypto beyond existing sha256 file fingerprints — `node:crypto`, never hand-rolled) | — |
| V8 Data Protection (secrets) | yes | Key never in argv, never in any runtime config file, never echoed; launcher env-injection only; keyfile 0600 with heal-before-read (Phase 14); masked display via `maskSecret` |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Secret in argv (`exaApiKey=` Smithery arg, `secret-set <value>`) | Information Disclosure | Env-only injection in the launcher; Phase 14 stdin/TTY-only entry; test asserts launcher argv contains no key bytes |
| Secret in runtime config / key-in-URL (`?exaApiKey=`) | Information Disclosure | Launcher indirection (D-01); no-plaintext regression guard (`tests/14-no-plaintext-guard.test.cjs`) already scans tracked `.oto/` — configs written here are home-dir, but grep-audit step in verification (PITFALLS.md warning signs) |
| Symlink plant in `~/.oto` | Tampering / Elevation | Write path keeps lstat + O_NOFOLLOW (WR-07); read path follows only to regular files (D-15) — read-follow is disclosure-neutral for the same user |
| Duplicate TOML table injection corrupting Codex config | Denial of Service | Outside-block scan + refusal; byte-identical round-trip gate |
| Clobbering user MCP servers / Claude state | Tampering | Additive merge only; deep-equal fingerprint before any removal; unknown keys preserved |
| Malicious/compromised npx package | Tampering | Exact version pin `@3.2.1` (D-02); version bumps are reviewed one-line diffs |
| Consent bypass (silent registration) | Repudiation | Default No everywhere, non-TTY = No, persisted answers, install report line states exactly what was registered where |

## Sources

### Primary (HIGH confidence)
- Direct source inspection this session (read in full): `bin/lib/install.cjs`, `bin/lib/runtime-claude.cjs`, `bin/lib/runtime-codex.cjs`, `bin/lib/runtime-gemini.cjs`, `bin/lib/codex-toml.cjs`, `bin/lib/install-state.cjs`, `bin/lib/args.cjs`, `bin/lib/doctor.cjs`, `scripts/build-hooks.js`, `oto/bin/lib/secrets.cjs`, `oto/workflows/settings-integrations.md`; targeted: `oto/bin/lib/config.cjs:85-130`, `sdk/src/query/secrets.ts`, `sdk/src/query/index.ts` registry, `sdk/src/query/config-mutation.ts:464-466`, `tests/05-merge-settings.test.cjs`, `bin/lib/codex-profile.cjs`
- `exa-mcp-server@3.2.1` package source (npm tarball extracted): Smithery `key=value` config parsing, `tools`/`enabledTools` schema (comma string or array), default-enabled map (`web_search_exa`/`web_fetch_exa` on, `web_search_advanced_exa` off), deprecation metadata, `exaApiKey || process.env.EXA_API_KEY` fallback, no `--version` handling [VERIFIED: npm registry + local execution — server starts and exits 0 on stdin EOF, `tools=` arg honored]
- `npm view exa-mcp-server` — 3.2.1 = latest, modified 2026-04-23 [VERIFIED: npm registry]
- https://github.com/anthropics/claude-code/issues/14313 — `.claude.json` written to `$CLAUDE_CONFIG_DIR/.claude.json` when the env var is set (debug-log evidence); https://code.claude.com/docs/en/claude-directory — "every ~/.claude path lives under that directory instead" [CITED]
- Live machine state: `~/.claude/oto/.install.json` (oto 0.4.1, 337 files), `~/.claude/oto/bin` absent, `~/.oto` empty, `~/.claude.json` present, all three runtime CLIs on PATH [VERIFIED: filesystem]
- `.oto/research/{SUMMARY,ARCHITECTURE,PITFALLS}.md` (2026-07-10, HIGH) — per-runtime MCP config schemas verified against official Claude/Codex/Gemini docs; adapter-hook architecture with file:line evidence [CITED: milestone research + its listed official-doc sources]
- `.oto/phases/14-key-storage-reconciliation/{14-CONTEXT,14-DISPOSITIONS}.md` — inherited FRESH-CR-02/WR-04/WR-05 obligations verbatim; WR-07 symlink hardening record

### Secondary (MEDIUM confidence)
- https://code.claude.com/docs/en/mcp + community config guides (search-verified 2026-07-13) — user-scope `mcpServers` in `~/.claude.json`, stdio entry shape with/without `type`
- claude-code#25998 — confirms `.claude.json` default location at `$HOME` and backup-file behavior

### Tertiary (LOW confidence)
- None load-bearing. (Sandboxed `npx -y exa-mcp-server@3.2.1` probe failed with "command not found" in this session's restricted shell — attributed to sandboxing, not the package; direct bundle execution succeeded.)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new deps; exa-mcp-server pin and arg format verified against the actual published artifact, executed locally
- Architecture: HIGH — every integration point read at current line numbers this session; milestone architecture confirmed still accurate post-Phase-14
- Claude config-dir resolution: HIGH for write-side / MEDIUM-HIGH for read-side (A1) — issue evidence + docs statement; one cheap manual probe recommended during implementation
- Pitfalls: HIGH — phase-specific pitfalls grounded in executed evidence (pre-warm hang, 2-tool default) and in-repo code paths (uninstall ordering, Gemini early-return, strict argv parser)

**Research date:** 2026-07-13
**Valid until:** ~2026-08-13 (stable domain; re-check `npm view exa-mcp-server version` and Claude config-dir behavior if implementation slips past a Claude Code major release)
