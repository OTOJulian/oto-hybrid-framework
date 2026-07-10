# Stack Research

**Domain:** Exa MCP server registration across Claude Code / Codex CLI / Gemini CLI (oto v0.5.0)
**Researched:** 2026-07-10
**Confidence:** HIGH (all claims verified against live docs on 2026-07-10)

> Supersedes the v0.1.0 foundation stack research (2026-04-27), whose prescription is preserved in `CLAUDE.md` (Technology Stack section) and remains in force. This document covers only the NEW v0.5.0 capability: activating the latent Exa integration.

## Scope Note

This milestone adds NO new runtime code dependencies. The "stack addition" is one hosted MCP endpoint plus per-runtime config entries written by oto's existing installer adapters (`bin/lib/runtime-claude.cjs`, `runtime-codex.cjs`, `runtime-gemini.cjs`) and/or the `/oto-settings-integrations` surface. Existing validated capabilities (installer, `oto-sdk`, secrets storage, agent guidance) are not re-researched.

## TL;DR — The Prescription

| Concern | Recommendation | Confidence |
|---------|----------------|------------|
| Exa MCP delivery | **Remote hosted endpoint `https://mcp.exa.ai/mcp` (streamable HTTP)** — NOT the local `npx exa-mcp-server` stdio process | HIGH |
| Auth | **`x-api-key` HTTP header**, value sourced from oto's existing secret store (`~/.oto/exa_api_key` / `EXA_API_KEY` env) at registration time. URL-param `?exaApiKey=KEY` works but leaks the key into config/URL logs — avoid. Unauthenticated works on a rate-limited free tier (429 past limit) | HIGH |
| Server name | **`exa`** — mandatory, because the 3 researcher agents already declare `mcp__exa__*` tool names (Claude Code prefixes MCP tools `mcp__<server>__<tool>`) | HIGH |
| Tools to rely on | `web_search_exa` (default-on, still current) + `web_fetch_exa` (default-on). `crawling_exa`, `get_code_context_exa`, `company_research_exa`, `linkedin_search_exa`, `deep_researcher_*` are **deprecated** | HIGH |
| New npm deps | **None.** Remote HTTP needs zero packages. Even the stdio fallback is `npx -y exa-mcp-server` (fetched at run time, never a `package.json` dep) | HIGH |
| Claude Code registration | `claude mcp add --transport http --scope user exa https://mcp.exa.ai/mcp --header "x-api-key: <KEY>"` → stored in `~/.claude.json` | HIGH |
| Codex registration | `[mcp_servers.exa]` table in `~/.codex/config.toml` with `url` + `env_http_headers` (header value from env var — keeps key out of the TOML) | HIGH |
| Gemini registration | `mcpServers.exa` object in `~/.gemini/settings.json` with **`httpUrl`** (not `url` — that field means SSE in Gemini) + `headers` | HIGH |

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Exa hosted MCP endpoint | `https://mcp.exa.ai/mcp` (streamable HTTP; server-managed, no version to pin) | Provides `web_search_exa` / `web_fetch_exa` tools to agents | Zero install footprint, no Node child process per session, no `npx` cold-start or network fetch at session start, Exa maintains it. Works unauthenticated on a rate-limited free tier, so registration can succeed even before a key exists |
| `exa-mcp-server` (npm) | 3.2.1 (latest, published 2026-04-23; engines `node >=18`) | **Fallback only** — local stdio server via `npx -y exa-mcp-server` with `EXA_API_KEY` env | Only needed if the user must run offline-configured/no-remote setups. Do NOT add to `package.json`; invoke via `npx` in the runtime's MCP config if ever used |
| Existing oto secret store | in-repo (`oto/bin/lib/secrets.cjs`, `~/.oto/exa_api_key`, `EXA_API_KEY` env) | Canonical source of the API key for all three runtime registrations | Already shipped; the milestone's key-storage fix makes this the single source and keeps the key out of committed `.oto/config.json` |

### Current Exa MCP Tool Surface (verified 2026-07-10)

| Tool | Status | Notes |
|------|--------|-------|
| `web_search_exa` | **Default-on, current** | The tool oto's 3 researcher agents already reference — no agent renames needed |
| `web_fetch_exa` | **Default-on, current** | Full-page markdown extraction; worth adding to extended agent guidance (replaces `crawling_exa`) |
| `web_search_advanced_exa` | Optional (enable via `?tools=` URL param) | Filters, date ranges, domain restrictions. Enable only if agent guidance needs it |
| `agent_create_run` / `agent_wait_for_run` / `agent_get_run_output` / `agent_cancel_run` | Optional (`?tools=agent_tools`) | Async multi-step research runs. Skip for v0.5.0 — async polling doesn't fit oto's synchronous researcher-agent flow |
| `get_code_context_exa` | **Deprecated** (use `web_search_exa`) | Do not reference in new agent guidance |
| `crawling_exa` | **Deprecated** (renamed → `web_fetch_exa`) | If any inherited GSD prompt text mentions it, update |
| `company_research_exa`, `linkedin_search_exa`, `people_search_exa`, `deep_search_exa`, `deep_researcher_start/check` | **Deprecated** | Never reference |

Tool selection on the remote endpoint: `https://mcp.exa.ai/mcp?tools=web_search_exa,web_fetch_exa` (comma-separated query param). Default (no param) already serves exactly `web_search_exa` + `web_fetch_exa`, so **no `?tools=` param is needed for v0.5.0**.

## Per-Runtime Registration Mechanics

### Claude Code

- **CLI:** `claude mcp add --transport http --scope user exa https://mcp.exa.ai/mcp --header "x-api-key: <KEY>"`
- **Scopes:** `local` (default; per-project, stored in `~/.claude.json` under `projects.<path>.mcpServers`), `project` (shared, `.mcp.json` in repo root — wrong for a secret-bearing personal tool), `user` (all projects, stored in **`~/.claude.json`**, NOT `~/.claude/settings.json`).
- **Recommended scope: `user`** — oto is a global personal framework; per-project registration multiplies maintenance.
- **JSON shape** (what lands in `~/.claude.json`):

```json
{
  "mcpServers": {
    "exa": {
      "type": "http",
      "url": "https://mcp.exa.ai/mcp",
      "headers": { "x-api-key": "<KEY>" }
    }
  }
}
```

- The `type` field is **required** for URL entries — an entry with `url` but no `type` is skipped with an error (`type` accepts `http` or the alias `streamable-http`).
- Env-var expansion (`${EXA_API_KEY}` in `url`/`headers`) is documented for `.mcp.json` files; treat expansion inside `~/.claude.json` user scope as unverified (MEDIUM). Safest path: resolve the key at registration time and write the literal header (`~/.claude.json` is user-private, never committed).
- **Integration note:** prefer shelling out to `claude mcp add` from the installer/settings flow when the `claude` binary is on PATH — it owns the `~/.claude.json` format. Direct JSON merge into `~/.claude.json` `mcpServers` is the documented fallback, but that file carries a lot of unrelated Claude Code state; merge surgically (add/update the `exa` key only), following the same careful-merge discipline as `runtime-claude.cjs`'s `mergeSettings`.
- Server names `workspace`, `claude-in-chrome`, `computer-use`, `Claude Preview`, `Claude Browser` are reserved — `exa` is safe.
- Tool naming at agent time: `mcp__exa__web_search_exa` — matches the declarations already in the 3 researcher agents. **The server MUST be named `exa`.**

### Codex CLI

- **Config:** `~/.codex/config.toml`, `[mcp_servers.<name>]` table. Streamable HTTP is supported via the `url` field (no experimental flag required as of the current config reference).
- **Recommended TOML** (written by oto's existing `codex-toml.cjs` merge machinery):

```toml
[mcp_servers.exa]
url = "https://mcp.exa.ai/mcp"
# Preferred: header value sourced from an env var — key never lands in the TOML
env_http_headers = { "x-api-key" = "EXA_API_KEY" }
```

- Field semantics (verified against the Codex configuration reference):
  - `url` (string) — endpoint for a streamable HTTP MCP server
  - `env_http_headers` (map<string,string>) — header name → **environment variable name** whose value populates the header
  - `http_headers` (map<string,string>) — static literal headers (fallback if the user doesn't export `EXA_API_KEY`; `~/.codex/config.toml` is user-private, acceptable but rotation requires rewrite)
  - `bearer_token_env_var` (string) — `Authorization: Bearer` only; **not usable** for Exa's `x-api-key` header
  - `enabled` (bool), `startup_timeout_sec` (default 10), `tool_timeout_sec` (default 60), `enabled_tools`/`disabled_tools` (allow/deny lists)
- `codex mcp add <name> -- <command>` exists for stdio servers; URL-based add via CLI is not documented in the config reference — **write the TOML directly** via oto's existing TOML-merge machinery (a new `mergeMcpBlock` sibling to `mergeHooksBlock` in `codex-toml.cjs`).
- `env_http_headers` requires `EXA_API_KEY` in Codex's process env. Since oto's canonical store may be the `~/.oto/exa_api_key` file (not env), the settings flow should either (a) instruct the user to export `EXA_API_KEY` in their shell profile, or (b) write `http_headers` with the literal key. Decide once in the key-storage-fix phase; (a) is cleaner for rotation.

### Gemini CLI

- **Config:** `~/.gemini/settings.json` (user scope) or `.gemini/settings.json` (project scope — avoid for secrets), `mcpServers` object.
- **Critical field gotcha:** `httpUrl` = streamable HTTP; `url` = SSE. Using `url` for Exa would negotiate the wrong (deprecated) transport.
- **Recommended JSON:**

```json
{
  "mcpServers": {
    "exa": {
      "httpUrl": "https://mcp.exa.ai/mcp",
      "headers": { "x-api-key": "<KEY>" },
      "timeout": 30000
    }
  }
}
```

- CLI alternative: `gemini mcp add --transport http --scope user --header "x-api-key: <KEY>" exa https://mcp.exa.ai/mcp` (writes `~/.gemini/settings.json` with `-s user`; default scope is **project**, so the scope flag is mandatory).
- Env-var expansion (`$VAR` / `${VAR}`) is documented for the `env` block of stdio servers; expansion inside `headers` is not explicitly documented (MEDIUM) — write the literal key at registration time, same policy as Claude Code.
- Optional hardening fields: `trust` (bool, bypasses per-call confirmation — reasonable for a read-only search server), `includeTools` allowlist (e.g., `["web_search_exa", "web_fetch_exa"]`).
- Since oto's installer already owns a settings.json merge path for Gemini, registration is a plain JSON merge — no shell-out needed.

## Installation

```bash
# NOTHING to npm install. Registration commands the installer/settings flow runs or emulates:

# Claude Code (user scope → ~/.claude.json)
claude mcp add --transport http --scope user exa https://mcp.exa.ai/mcp \
  --header "x-api-key: $EXA_API_KEY"

# Codex (installer merges into ~/.codex/config.toml)
#   [mcp_servers.exa]
#   url = "https://mcp.exa.ai/mcp"
#   env_http_headers = { "x-api-key" = "EXA_API_KEY" }

# Gemini CLI (user scope → ~/.gemini/settings.json)
gemini mcp add --transport http --scope user \
  --header "x-api-key: $EXA_API_KEY" exa https://mcp.exa.ai/mcp

# Verification per runtime
claude mcp list && claude mcp get exa
codex mcp list
gemini mcp list
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Remote `https://mcp.exa.ai/mcp` | Local stdio `npx -y exa-mcp-server` with `env.EXA_API_KEY` | Only if the hosted endpoint is unreachable/deprecated, or the user wants to pin tool behavior to `exa-mcp-server@3.2.1`. Costs: npx fetch + Node child process per session on all three runtimes, and 3 different stdio config shapes to maintain |
| `x-api-key` header auth | `?exaApiKey=KEY` URL parameter | Never preferred — the key becomes part of the URL (logged by proxies, visible in `claude mcp list` output). Only if a runtime's header support breaks |
| Header written literally at registration (Claude/Gemini) | `${EXA_API_KEY}` env expansion in config | Use expansion only where explicitly documented (`.mcp.json` project files). User-scope files are private, so the literal is acceptable; rotation = re-run `/oto-settings-integrations` |
| Codex `env_http_headers` (key from env) | Codex `http_headers` literal | Literal is fine if the user won't export `EXA_API_KEY` in their shell; document the rotation caveat |
| Register unauthenticated when no key is stored (free rate-limited tier) | Refuse to register without a key | Registering keyless keeps `web_search_exa` usable day one; but then `exa_search: true` detection (currently keyed off key presence in `config.cjs`) must be reconciled — a roadmap decision, flagged here |
| User scope everywhere | Project scope (`.mcp.json` / `.gemini/settings.json` in repo) | Only for team-shared, keyless configs — out of scope for a personal framework carrying a secret |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Adding `exa-mcp-server` (or `exa-js`, `@modelcontextprotocol/sdk`) to `package.json` | oto is no-build, CJS, minimal-deps; the remote endpoint needs zero packages; even stdio fallback works via `npx -y` | Remote HTTP endpoint |
| SSE transport (`--transport sse`, Gemini `url` field) | Deprecated in Claude Code docs; Gemini treats `url` as SSE — silently wrong transport for Exa | Streamable HTTP (`--transport http`, Gemini `httpUrl`) |
| `type`-less URL entries in Claude JSON configs | Claude Code reads no-`type` entries as stdio and skips them with an error | Always include `"type": "http"` |
| Codex `bearer_token_env_var` for Exa | Emits `Authorization: Bearer` — Exa's remote server authenticates via `x-api-key` header (or URL param) | `env_http_headers` / `http_headers` |
| Deprecated tool names in agent guidance (`crawling_exa`, `get_code_context_exa`, `company_research_exa`, `linkedin_search_exa`, `deep_researcher_*`) | Deprecated upstream; may disappear from the hosted server | `web_search_exa`, `web_fetch_exa`, optionally `web_search_advanced_exa` |
| Storing the key in committed `.oto/config.json` or in project-scope MCP files (`.mcp.json`, `.gemini/settings.json` in repo) | Secret lands in version control — exactly the storage inconsistency this milestone fixes | `~/.oto/exa_api_key` (canonical) → injected into user-scope, user-private runtime configs |
| A server name other than `exa` | Breaks the `mcp__exa__*` tool declarations already shipped in 3 researcher agents | Name it `exa` on all runtimes |
| Bulk-rewriting `~/.claude.json` | It's Claude Code's live state file (projects, history, approvals) | `claude mcp add` shell-out, or a surgical merge of only `mcpServers.exa` |

## Stack Patterns by Variant

**If the user has a stored Exa key (`~/.oto/exa_api_key` or `EXA_API_KEY`):**
- Register with `x-api-key` auth on all three runtimes (header literal for Claude/Gemini; `env_http_headers` for Codex when env-exported, else `http_headers` literal)
- Because authenticated access gets full plan limits and no 429 surprises

**If no key is stored yet:**
- Either register keyless (free rate-limited tier; hosted server 429s past the limit) or defer registration until `/oto-settings-integrations` stores a key
- Because the hosted endpoint explicitly supports unauthenticated starts, but `config.cjs`'s `exa_search` boolean currently keys off key presence — the two must be reconciled in the key-storage-fix phase

**If the hosted endpoint must be avoided (offline/pinned behavior):**
- stdio: `command: npx`, `args: ["-y", "exa-mcp-server"]`, per-server `env: { EXA_API_KEY: ... }` — supported by all three runtimes' stdio schemas
- Because it's the only local option; pin `exa-mcp-server@3.2.1` in the args if reproducibility matters

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| Remote `mcp.exa.ai/mcp` | All three runtimes' streamable HTTP transports | Claude Code `type: http` (alias `streamable-http`); Codex `url` field (stable, no experimental flag in current config reference); Gemini `httpUrl` field |
| `exa-mcp-server` 3.2.1 (stdio fallback) | Node >= 18 (engines) | oto requires Node >= 22 — satisfied. Deps (`@modelcontextprotocol/sdk` ^1.12.1, `exa-js` ^2.8.0) are npx-resolved, never oto's |
| Agent declarations `mcp__exa__web_search_exa` | Claude Code MCP tool naming `mcp__<server>__<tool>` | Requires server name `exa`. Codex/Gemini expose MCP tools under their own naming; oto's existing codex/gemini agent transforms are the place to verify tool-name mapping (MEDIUM — verify at phase time) |
| Free tier | Personal-use cost ceiling | Exa API free tier ~1,000 req/month; unauthenticated hosted MCP is rate-limited (429 past limit). Fits the ceiling per PROJECT.md |

## Sources

- https://exa.ai/docs/reference/exa-mcp (fetched 2026-07-10) — remote endpoint URL, `x-api-key` header auth, default tools (`web_search_exa`, `web_fetch_exa`), `?tools=` selection, `claude mcp add --transport http` example — HIGH
- https://github.com/exa-labs/exa-mcp-server README (fetched 2026-07-10) — full tool list incl. deprecations, `?exaApiKey=` URL-param auth, `npx -y exa-mcp-server` + `EXA_API_KEY` stdio config — HIGH
- `npm view exa-mcp-server` (run 2026-07-10) — version 3.2.1, engines node >=18, dependency tree — HIGH
- https://code.claude.com/docs/en/mcp (fetched 2026-07-10) — `claude mcp add` syntax, `--transport http`/`--header`/`--scope`, scope storage table (`~/.claude.json` vs `.mcp.json`), required `type` field, env expansion rules, reserved server names — HIGH
- https://learn.chatgpt.com/docs/extend/mcp?surface=cli and https://learn.chatgpt.com/docs/config-file/config-reference (fetched 2026-07-10, redirected from developers.openai.com/codex) — `[mcp_servers]` TOML schema: `url`, `http_headers`, `env_http_headers` (map header→env-var-name), `bearer_token_env_var`, timeouts, tool allow/deny lists; no experimental flag for streamable HTTP — HIGH
- https://geminicli.com/docs/tools/mcp-server/ (fetched 2026-07-10) — `mcpServers` schema (`httpUrl` vs `url`, `headers`, `env` expansion, `trust`, `includeTools`), `gemini mcp add` options and scope file locations — HIGH
- Repo evidence: `oto/bin/lib/config.cjs` (lines 62–63, 92 — `exa_search` boolean from `EXA_API_KEY`/`~/.oto/exa_api_key`), `oto/bin/lib/secrets.cjs` (line 19 — `exa_search` secret key), `bin/lib/runtime-{claude,codex,gemini}.cjs` + `codex-toml.cjs` (existing merge machinery to extend) — HIGH

---
*Stack research for: Exa MCP server registration (oto v0.5.0)*
*Researched: 2026-07-10*
