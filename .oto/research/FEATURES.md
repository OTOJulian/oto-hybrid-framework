# Feature Research — v0.5.0 Exa Search Integration

**Domain:** Optional MCP-backed semantic search in a personal AI-CLI framework (Claude Code / Codex / Gemini CLI)
**Researched:** 2026-07-10
**Confidence:** HIGH on Exa MCP server facts and runtime registration mechanics (official docs verified); MEDIUM on comparable-framework conventions (multiple credible sources, no single authority)

> Milestone scope note: this file covers ONLY the v0.5.0 Exa integration features. The
> v0.1.0 full-framework feature landscape was archived out of this file (see git history,
> researched 2026-04-27).

---

## Context: What Already Exists (Do Not Rebuild)

The integration is ~70% latent, inherited from GSD. Verified by direct source inspection:

| Existing surface | Location | State |
|------------------|----------|-------|
| `exa_search` availability detection | `oto/bin/lib/config.cjs:62-63`, `init.cjs:365-366` | Boolean derived from `EXA_API_KEY` env var OR `~/.oto/exa_api_key` keyfile |
| `exa_search` config default | `oto/bin/lib/core.cjs:285` | `false` |
| Secret masking | `oto/bin/lib/secrets.cjs:19` | `exa_search` in the masked-key set |
| Key entry UI | `oto/workflows/settings-integrations.md` | Writes the **raw key string** to `exa_search` in `.oto/config.json` via `config-set` |
| Agent guidance | `oto-phase-researcher`, `oto-project-researcher`, `oto-ui-researcher` | "If `exa_search: true`, call `mcp__exa__web_search_exa`, else fall back to WebSearch/Brave" |
| Agent frontmatter | e.g., `oto/agents/oto-phase-researcher.md:4` | `tools:` allowlist already includes `mcp__exa__*` |
| MCP registration | **nowhere** | `install.js:959` explicitly excludes MCP tools as "auto-discovered from mcpServers config at runtime" — but nothing ever writes that config |

**The confirmed storage inconsistency (bug, not feature):** `config.cjs`/`init.cjs` treat
`exa_search` as a *boolean derived from env/keyfile*, while `settings-integrations` stores
the *API key string itself* under the same key in committed `.oto/config.json`. Both cannot
be right; the current settings flow leaks the secret into a committed file AND never
populates the keyfile/env that the detection logic actually reads.

---

## Verified Exa MCP Server Facts (July 2026)

Source: `exa.ai/docs/reference/exa-mcp` + `github.com/exa-labs/exa-mcp-server` (HIGH confidence).

- **Remote endpoint:** `https://mcp.exa.ai/mcp` (streamable HTTP). Works **unauthenticated**
  at a rate-limited free tier (~150 calls/day, 3 QPS per third-party reports — MEDIUM);
  API key lifts limits.
- **Auth:** `x-api-key` HTTP header (remote), or `?exaApiKey=` URL param (leaks into config —
  avoid), or `EXA_API_KEY` env var (local `npx -y exa-mcp-server` stdio server).
- **Tool selection:** query param `?tools=web_search_exa,web_fetch_exa,...` (remote) —
  unlisted tools are not exposed, which bounds context-window cost.
- **Current default tools:** `web_search_exa`, `web_fetch_exa`.
- **Optional:** `web_search_advanced_exa` (category/domain/date filters, summaries),
  `agent_tools` (async multi-step Exa Agent: `agent_create_run` / `agent_wait_for_run` /
  `agent_get_run_output` / `agent_cancel_run`).
- **Deprecated but still functional:** `get_code_context_exa`, `company_research_exa`,
  `crawling_exa`, `people_search_exa`, `linkedin_search_exa`, legacy `deep_researcher_*`.
- **Per-runtime registration (verified against official docs):**
  - Claude Code: `claude mcp add --transport http exa https://mcp.exa.ai/mcp` or direct
    JSON; `.mcp.json`/settings support `${VAR}` expansion in `url` and `headers`.
    Scopes: user (global) / project (`.mcp.json`) / local.
  - Codex: `~/.codex/config.toml` `[mcp_servers.exa]` with `url = ...` plus
    `bearer_token_env_var` or `http_headers`; streamable HTTP supported.
  - Gemini CLI: `~/.gemini/settings.json` `mcpServers.exa` with `httpUrl` + `headers`, or
    stdio `command`/`args`/`env`. Env-var expansion is reliable in the `env` block; header
    expansion has open issues (google-gemini/gemini-cli#5282, #5828) — MEDIUM confidence
    that `${VAR}` in `headers` works on current versions; the stdio+`env` path is the safe one.

### Which Exa tools matter for oto's research agents

| Tool | Verdict | Why |
|------|---------|-----|
| `web_search_exa` | **Core — enable** | The semantic-search value proposition; already what agent guidance references |
| `web_fetch_exa` | **Enable** | Clean-markdown page fetch; complements WebFetch, keeps researchers on one vendor when following search hits |
| `web_search_advanced_exa` | Optional — enable | Domain/date filtering is genuinely useful for "check publication dates, avoid stale results" research discipline; low marginal cost |
| `agent_tools` (Exa Agent runs) | **Noise — exclude** | oto's researchers ARE the multi-step research agents; nesting an async, billed, poll-until-done agent inside them duplicates orchestration, adds latency and cost, and produces unattributable synthesis |
| `get_code_context_exa` | Noise — exclude | Deprecated upstream; Context7 already owns the "current library docs/code" slot in oto's source hierarchy |
| `company_research_exa`, `linkedin_search_exa`, `people_search_exa`, `crawling_exa` | Noise — exclude | Sales/recruiting tools irrelevant to dev research; each exposed tool schema costs context tokens in every agent session |

**Recommendation:** register with an explicit `?tools=web_search_exa,web_fetch_exa,web_search_advanced_exa`
pin. This makes the exposed surface deterministic even if Exa changes its defaults, and keeps
per-session context cost to three tool schemas.

---

## How Comparable Frameworks Expose Optional MCP Search (MEDIUM confidence)

Surveyed: GSD upstream (oto's own inherited pattern), Superpowers, Exa's official install
docs, netdata/Sentry/Composio MCP client guides, community Claude Code frameworks.

1. **Nobody reputable silently auto-registers MCP servers.** The universal pattern is:
   document a one-liner (`claude mcp add ...` / `codex mcp add ...`) or offer an explicit
   opt-in prompt. MCP servers are a code-execution and token-cost surface; consent is the norm.
2. **Config toggle + prompt-level graceful fallback** is exactly the GSD/oto pattern
   (`brave_search`, `firecrawl`, `exa_search` booleans read by agent prompts, WebSearch as
   floor). oto already has this; v0.5.0 just needs the toggle to correspond to reality.
3. **Secrets live in env vars or keyfiles, referenced from MCP config** — `${EXA_API_KEY}`
   in Claude headers, `bearer_token_env_var` in Codex, `env` block in Gemini stdio. Writing
   literal keys into runtime config files is the documented anti-pattern (and Claude Code
   has a known bug — anthropics/claude-code#18692 — where `claude mcp add` *expands* `${VAR}`
   placeholders and writes resolved secrets back to `.mcp.json`; write config files directly
   instead of shelling out to `claude mcp add`).
4. **User-scope registration for personal tools.** Project-scope `.mcp.json` triggers
   per-repo approval prompts and risks committing config; global/user scope matches oto's
   "installed into `~/.claude` / `~/.codex` / `~/.gemini`" model.
5. **Known subagent gotcha:** Claude Code has a history of stripping MCP tools from
   subagents with a restrictive `tools:` frontmatter (anthropics/claude-code#13898 — the
   same bug that motivated oto's Context7 CLI fallback). oto agents already list
   `mcp__exa__*`; the integration must be *verified end-to-end in a subagent*, not just in
   the main thread, and the WebSearch fallback text must stay in agent prompts as insurance.

### Expected user setup flow (the target UX)

```
1. Get key        → dashboard.exa.ai/api-keys (free tier)
2. Configure once → /oto-settings-integrations
                    - paste key (masked display)
                    - key stored in ~/.oto/exa_api_key (0600) — never committed config
                    - .oto/config.json gets exa_search: true (boolean only)
                    - prompt: "Register Exa MCP server with Claude Code [/Codex/Gemini]? [y/N]"
                    - on consent: merge server entry into each runtime's MCP config
3. Use            → research agents see mcp__exa__* tools exist + exa_search: true
                    and use them; if either is missing they fall back to Brave/WebSearch
                    with zero errors surfaced to the user
```

Everything after step 2 is transparent — that is the bar comparable tools set.

---

## Feature Landscape

### Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Key storage fix: secret in `~/.oto/exa_api_key` (0600) / env var; `exa_search` stays boolean in `.oto/config.json` | Secrets in committed config is a defect, and detection logic already reads the keyfile — the settings flow must feed it | LOW-MEDIUM | Touches `settings-integrations.md`, `secrets.cjs`, `config-schema.cjs`, sdk `config-mutation`; needs migration handling for anyone with a key string already in config.json (this repo included — `.oto/config.json` currently matches the grep) |
| Consent-gated Exa MCP registration for Claude Code | The whole point of the milestone: tools must actually exist | MEDIUM | Write `mcpServers` entry (user scope) with remote HTTP URL + `x-api-key: ${EXA_API_KEY}`-style header or literal-free reference; do NOT shell out to `claude mcp add` (secret-expansion bug #18692) |
| Same for Codex (`config.toml [mcp_servers.exa]`) | Codex is a daily-peer runtime per PROJECT.md decisions | MEDIUM | TOML merge — installer's `mergeConfig` hook machinery already parses/merges `config.toml`; use `bearer_token_env_var`/`http_headers` pattern... verify Exa's `x-api-key` header (not Bearer) fits `http_headers` |
| Same for Gemini (`settings.json mcpServers`) | Ditto | MEDIUM | Header env-expansion unreliable (gemini-cli#5282/#5828); safest: stdio `npx -y exa-mcp-server` with `env: { EXA_API_KEY: ... }`, or accept remote-unauthenticated. Decide one, document it |
| Graceful fallback preserved when key/server absent | Already promised by agent prompts; regression here breaks every research flow for non-Exa users | LOW | Keep existing "if `exa_search: false` → WebSearch/Brave" text; never make Exa a hard dependency of any workflow |
| Idempotent registration + clean unregistration | oto's installer contract everywhere else (marker-tracked copies, re-install safe) | MEDIUM | Re-running settings/install must not duplicate entries; uninstall/clear-key should offer to remove the server entry |
| Explicit tool pinning (`?tools=` allowlist) | Context cost + determinism; frameworks that dump 10 tool schemas into every session are penalized | LOW | Pin `web_search_exa,web_fetch_exa,web_search_advanced_exa` |
| Masked key display everywhere | Already implemented (`****<last-4>`); must survive the storage refactor | LOW | Keep `secrets.cjs` masking against the new keyfile source |
| Tests + runtime matrix entry + docs | oto's shipping standard since v0.1.0 | MEDIUM | `node:test` for config/merge logic; per-runtime install-shape smoke; matrix row for "Exa MCP" per runtime |

### Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| One prompt wires all three runtimes | No other framework registers a search MCP across Claude/Codex/Gemini in one flow — this is oto's core "stop framework-switching" value applied to search | MEDIUM | Reuses the per-runtime adapter pattern the installer already has for hooks/config |
| Keyless mode via Exa's unauthenticated remote tier | `exa_search` can work with ZERO setup (150 calls/day) — register the remote URL without a key, flag the rate limit | LOW | Fits personal-use ceiling perfectly; make it an explicit choice in settings ("no key: rate-limited free tier") so 429s aren't mysterious. MEDIUM confidence on exact limits — verify at build time |
| Status/doctor check | `/oto-settings-integrations` summary shows not just "key set" but "server registered in: claude ✓ codex ✓ gemini ✗" | LOW-MEDIUM | Read-only inspection of the three config files; catches the #1 real-world failure ("toggle true, tools missing") |
| Exa guidance in `oto-debugger` + `oto-advisor-researcher` (and other search-using agents) | Semantic search helps "find who else hit this error" debugging more than keyword search | LOW | Prompt-text change + frontmatter `mcp__exa__*`; already in milestone scope |
| Subagent end-to-end verification test | Guards against the #13898 class of "tools stripped from restricted subagents" regressions | MEDIUM | Even a manual UAT checklist item counts; automated is better |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Auto-register the Exa MCP server during `oto install` without asking | "Zero-config, it just works" | Silent mutation of the user's runtime MCP config = consent violation; adds a network tool + token cost to every session; violates the norm every reputable framework follows | Consent prompt in installer and/or `/oto-settings-integrations`; default No |
| Enable ALL Exa tools | "More capability" | 10+ tool schemas bloat every agent's context; LinkedIn/company/people tools are dead weight for dev research; several are deprecated upstream | Pin 3 tools via `?tools=` |
| Use Exa Agent (`agent_tools` / deep-research runs) inside researcher agents | "Deeper research automatically" | Async poll-until-done inside an agent that is itself orchestrated; opaque synthesis breaks oto's source-attribution/confidence discipline; costs against the free tier fast | oto's researchers keep doing their own multi-query synthesis with `web_search_exa` |
| Shell out to `claude mcp add` / `codex mcp add` for registration | "Use the official CLI" | Claude's CLI expands `${VAR}` and writes resolved secrets to disk (#18692); CLI flags drift across versions; harder to make idempotent | Direct, marker-aware JSON/TOML merge — the installer already owns this pattern for hooks |
| Store the key in `.oto/config.json` (status quo) | It's where other settings live | Committed to git; already contradicts the boolean the detection code expects | `~/.oto/exa_api_key` (0600) or `EXA_API_KEY`, boolean toggle in config |
| Project-scope registration (`.mcp.json` in repos) | "Per-project control" | Per-repo approval prompts, config leakage into commits, N repos to maintain | User/global scope — matches oto's global-install model |
| Wrapping Exa's REST API in `oto-sdk` (like `oto-sdk query websearch` does for Brave) | Symmetry with Brave | A second, parallel Exa code path to maintain; MCP already delivers it natively to all three runtimes; Brave's CLI path exists only because Brave has no sanctioned MCP habit in GSD | MCP-only for Exa; keep Brave as the CLI-path search |
| Vendoring/forking `exa-mcp-server` | "Control the tool surface" | Ongoing sync burden against the personal-use ceiling | Remote hosted server (zero maintenance) or `npx -y exa-mcp-server` (Exa maintains it) |

---

## Feature Dependencies

```
[Key storage fix (keyfile/env + boolean)]
    └──required by──> [MCP registration (all runtimes)]     (config must reference a
    └──required by──> [Keyless/authenticated mode choice]    stable secret location)

[MCP registration — Claude Code]
    └──required by──> [Subagent end-to-end verification]
    └──required by──> [Status/doctor check]
    └──enhanced by──> [Explicit ?tools= pinning]  (same config write, do together)

[MCP registration — Codex, Gemini]
    └──depends on──> [Installer mergeConfig adapters]  (existing capability, extend)

[Agent guidance extension (debugger, advisor-researcher)]
    └──requires──> [MCP registration]  (guidance without tools = today's broken state)
    └──requires──> [frontmatter mcp__exa__* + Codex/Gemini transform parity]

[Tests / runtime matrix / docs] ──span──> everything above
```

### Dependency Notes

- **Key storage fix must land first.** Every registration variant (header env-var, Codex
  `bearer_token_env_var`, Gemini stdio `env`) needs the key at a stable, uncommitted
  location. The existing detection code already points at the answer: `~/.oto/exa_api_key`
  or `EXA_API_KEY`.
- **Registration before guidance extension.** Extending "use `mcp__exa__*`" prose to more
  agents while the tools still don't exist just widens today's dead code.
- **Existing oto surfaces reused, not built:** installer per-runtime adapters + config
  merge (hooks precedent), `secrets.cjs` masking, `settings-integrations` AskUserQuestion
  flow, `config-schema.cjs` key allowlist, agent transform pipeline for Codex/Gemini
  frontmatter.

---

## MVP Definition

### Launch With (v0.5.0)

- [ ] Key storage fix (keyfile/env + boolean reconciliation, migration for existing config-stored keys) — everything depends on it; it's also an active secret-hygiene defect
- [ ] Consent-gated Exa MCP registration for **all three runtimes**, tool-pinned, idempotent — the milestone's stated missing piece; Codex/Gemini parity is a standing project decision, not optional
- [ ] Fallback behavior verified (key absent → WebSearch/Brave, no errors) — regression floor
- [ ] Registration status shown in `/oto-settings-integrations` summary — cheap, prevents the most likely support-yourself failure
- [ ] Guidance + frontmatter extension to `oto-debugger` and `oto-advisor-researcher` — in-scope, low cost once tools exist
- [ ] Tests, runtime matrix row, docs — shipping standard

### Add After Validation (v0.5.x)

- [ ] Keyless unauthenticated-tier option — add once authenticated path is proven; trigger: wanting Exa on a machine without key setup
- [ ] Deeper doctor check (live `tools/list` ping against the server) — trigger: first time registration silently drifts

### Future Consideration (v0.6+)

- [ ] `web_search_advanced_exa`-specific agent guidance (domain/date-filtered research recipes) — defer until basic usage shows researchers actually reach for filters
- [ ] Broader agent rollout beyond the two named agents — defer per AGNT-DEFER-01 discipline; add per-agent only when a real session wanted it

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Key storage fix | HIGH (secret hygiene + unblocks all else) | LOW-MEDIUM | P1 |
| Claude Code MCP registration (consented, pinned, idempotent) | HIGH | MEDIUM | P1 |
| Codex + Gemini registration | HIGH (parity decision) | MEDIUM | P1 |
| Fallback regression protection | HIGH | LOW | P1 |
| Status display in settings summary | MEDIUM | LOW | P1 |
| Agent guidance extension (debugger, advisor) | MEDIUM | LOW | P2 |
| Keyless free-tier mode | MEDIUM | LOW | P2 |
| Subagent e2e verification (automated) | MEDIUM | MEDIUM | P2 |
| Live doctor ping | LOW | MEDIUM | P3 |

---

## Competitor Feature Analysis

| Concern | Exa official docs | GSD upstream (inherited) | Typical MCP client guides (netdata, Sentry, Composio) | Our Approach |
|---------|-------------------|--------------------------|--------------------------------------------------------|--------------|
| Registration | Manual one-liner per client | None — toggle + prompt guidance only (the gap oto inherited) | Manual per-client config snippet | Consent-prompted automatic merge into all three runtimes |
| Key handling | Header (`x-api-key`) or env | Keyfile/env detection (never wired to storage UI) | Env-var reference in config | Keyfile `~/.oto/exa_api_key` (0600) + env override; env-var reference in runtime configs where reliable, stdio `env` on Gemini |
| Tool surface | Defaults + `?tools=` opt-in | N/A | Usually "enable everything" | Pin 3 tools explicitly |
| Fallback | N/A | Prompt-level fallback to WebSearch/Brave | None | Keep prompt-level fallback; Exa never a hard dependency |

---

## Sources

- `exa.ai/docs/reference/exa-mcp` — remote URL, default tools, `?tools=` selection, `x-api-key` header, per-client install commands (HIGH)
- `github.com/exa-labs/exa-mcp-server` — full/deprecated tool list, local stdio `EXA_API_KEY` mode, agent_tools set (HIGH)
- Claude Code MCP docs (`code.claude.com/docs/en/mcp`) — scopes, `${VAR}` expansion in url/headers (HIGH)
- anthropics/claude-code#18692 — `claude mcp add` secret-expansion bug (HIGH, official issue)
- anthropics/claude-code#13898 — MCP tools stripped from `tools:`-restricted subagents (HIGH; already documented inside oto's own agent prompts)
- OpenAI Codex config reference (`developers.openai.com/codex/config-reference`, `/codex/mcp`) — `[mcp_servers]` `url`, `bearer_token_env_var`, `http_headers` (HIGH)
- Gemini CLI MCP docs (`github.com/google-gemini/gemini-cli/.../mcp-server.md`) + issues #5282/#5828 — `httpUrl`/`headers`, env expansion reliable in `env` block, header expansion historically broken (MEDIUM-HIGH)
- Exa pricing pages + third-party trackers — free tier ~1,000 authenticated req/mo (some sources say more), unauthenticated MCP ~150 calls/day (MEDIUM — conflicting numbers; re-verify limits at build time, do not hard-code them in docs)
- Direct source inspection: `oto/bin/lib/{config,init,core,secrets,config-schema}.cjs`, `oto/workflows/settings-integrations.md`, `oto/agents/oto-*-researcher.md`, `oto/bin/install.js:959` (HIGH — primary evidence)

---
*Feature research for: v0.5.0 Exa Search Integration*
*Researched: 2026-07-10*
