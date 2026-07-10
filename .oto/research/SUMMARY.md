# Research Summary — v0.5.0 Exa Search Integration

**Project:** oto (hybrid AI-CLI framework)
**Domain:** Optional MCP-backed semantic search across a multi-runtime installer (Claude Code / Codex / Gemini CLI)
**Researched:** 2026-07-10
**Confidence:** HIGH

> Milestone-scoped research. Supersedes the v0.1.0 foundation research in these files; the
> v0.1.0 stack prescription lives on in `CLAUDE.md` and remains in force.

## Executive Summary

The Exa integration is ~70% latent, inherited from GSD: availability detection (`config.cjs`/`init.cjs` derive `exa_search` from `EXA_API_KEY` env or `~/.oto/exa_api_key` keyfile), secret masking, agent guidance, and `mcp__exa__*` frontmatter declarations in three researcher agents all exist — but **no code anywhere registers an MCP server**, so the declared tools never exist at runtime. The milestone finishes the missing 30%: per-runtime MCP registration through oto's existing adapter architecture, plus fixing a confirmed secret-hygiene defect discovered during research.

That defect is worse than the milestone description implied. The `/oto-settings-integrations` workflow writes the **raw API key string** into git-tracked `.oto/config.json` (via `oto-sdk query config-set exa_search "<key>"`), while the detection logic expects a **boolean** and reads the keyfile the settings flow never writes. Worse, the live write path (`sdk/src/query/config-mutation.ts`) has no secret masking at all — the masking in `secrets.cjs` only guards a dead CJS path. And the same dual-typing defect exists identically for `brave_search` and `firecrawl`. The key-storage fix must land first: key material lives only in `~/.oto/exa_api_key` (mode 0600) or `EXA_API_KEY`; `.oto/config.json` holds booleans, enforced by validation in both config-set paths, with self-healing migration for legacy string values.

The main design risk is per-runtime secret injection: every runtime's easy path puts the key in plaintext config (Gemini headers can't expand env vars, Claude's `~/.claude.json` user-scope expansion is unverified, Codex's `env_http_headers` requires a shell-exported env var the keyfile doesn't provide). The architecture research resolves this with a launcher-script indirection (`oto/hooks/oto-exa-mcp.js` reads env/keyfile and spawns `npx -y exa-mcp-server`) — the recommended primary design, with the remote hosted endpoint (`https://mcp.exa.ai/mcp` + `x-api-key` header) as the documented alternative. This transport/auth decision is the one ADR the roadmap must lock in before the registration phase. Two hard constraints regardless: the server MUST be named `exa` (agents declare `mcp__exa__*`), and registration must be direct marker/fingerprint-tracked file merges (not CLI shell-outs), consistent with oto's existing adapter discipline.

## Key Findings

### Recommended Stack

Zero new npm dependencies. The "stack" is one MCP server (local stdio via `npx -y exa-mcp-server@3.2.1`, or Exa's remote streamable-HTTP endpoint) plus config entries written by oto's existing `bin/lib/` runtime adapters. Current Exa tool surface: `web_search_exa` + `web_fetch_exa` (default-on); `web_search_advanced_exa` optional. `crawling_exa`, `get_code_context_exa`, `company_research_exa`, `linkedin_search_exa`, and `deep_researcher_*` are **deprecated — never reference them** in new guidance.

**Core technologies:**
- `exa-mcp-server` 3.2.1 via `npx -y` (stdio): recommended primary transport — launched by a shipped launcher script that resolves the key from env/keyfile, so no runtime config ever contains key material. Never a `package.json` dep.
- Remote `https://mcp.exa.ai/mcp` (streamable HTTP, `x-api-key` header): the alternative — zero child process, Exa-maintained, works keyless on a rate-limited free tier, but requires a literal key in 2–3 user-private config files (rotation = re-run settings).
- Existing oto secret store (`oto/bin/lib/secrets.cjs`, `~/.oto/exa_api_key`, `EXA_API_KEY`): canonical key source for everything — the milestone's fix makes it real.

**Hard constraints:**
- Server name must be `exa` on all runtimes (Claude tool naming: `mcp__exa__web_search_exa`).
- Claude user-scope MCP lives in `~/.claude.json` — NOT `~/.claude/settings.json` where `mergeSettings` already writes. Different file, needs a new adapter hook.
- Gemini: `httpUrl` = streamable HTTP, `url` = deprecated SSE — using `url` silently negotiates the wrong transport. Header env-expansion is broken (gemini-cli#5282); only stdio `env` blocks expand.
- Codex: `bearer_token_env_var` sends `Authorization: Bearer` — unusable for Exa's `x-api-key`.
- Never key-in-URL (`?exaApiKey=`) — leaks into `mcp list` output, logs, proxies.

### Expected Features

**Must have (table stakes):**
- Key-storage fix: keyfile (0600)/env only; `exa_search` boolean-only in config with validation in BOTH config-set paths; migration for legacy string values (this repo's own `.oto/config.json` is affected) — everything downstream depends on it
- Consent-gated, idempotent Exa MCP registration for all three runtimes (Codex/Gemini parity is a standing project decision, not optional)
- Graceful fallback preserved (key/server absent → Brave/WebSearch, zero errors) — regression floor for every research flow
- Clean unregistration on uninstall (fingerprint-tracked, never deletes user-owned entries)
- Explicit tool pinning (3 tools max) for context-cost determinism
- Registration status in `/oto-settings-integrations` summary ("registered in: claude / codex / gemini")
- Tests, runtime-matrix row, docs — shipping standard

**Should have (differentiators):**
- One prompt wires all three runtimes — oto's "stop framework-switching" value applied to search
- Exa guidance in `oto-debugger` + `oto-advisor-researcher` (in milestone scope; semantic search fits "who else hit this error" debugging)
- Subagent end-to-end verification (guards the claude-code#13898 "MCP tools stripped from restricted subagents" class)

**Defer (v0.5.x+):**
- Keyless unauthenticated-tier mode (works, ~150 calls/day, MEDIUM confidence on limits) — add after the authenticated path is proven
- Live doctor ping (`tools/list` against the server)
- `web_search_advanced_exa` recipes; broader agent rollout (per AGNT-DEFER-01 discipline)

**Anti-features (do NOT build):** silent auto-registration without consent; enabling all 10+ Exa tools; Exa Agent (`agent_tools`) inside researchers (async billed polling inside orchestrated agents); shelling out to `claude mcp add` (secret-expansion bug claude-code#18692, PATH dependency, lost uninstall symmetry); project-scope registration; a parallel `oto-sdk` Exa REST wrapper.

### Architecture Approach

**Critical corrected premise:** the repo has two installers; only `bin/install.js` + `bin/lib/*.cjs` is live (`package.json` bin). The 7,758-line `oto/bin/install.js` is a vestigial GSD reference — all installer changes go in `bin/lib/`. Registration follows oto's existing adapter pattern: a new optional adapter hook pair `mergeMcp`/`unmergeMcp` dispatched from `install.cjs` beside `mergeSettings` (precedent: `emitDerivedFiles`), effectful rather than text-in/text-out because Claude's target is a different file. Registration is conditional on `detectExaKey()` — registering keyless makes every session pay a failing-server startup in three runtimes.

**Major components (NEW):**
1. `oto/hooks/oto-exa-mcp.js` launcher — the only component touching the secret at runtime; ships through the existing build-hooks channel (auto-discovered, syntax-validated, uninstall-tracked)
2. `mergeMcp`/`unmergeMcp` in the three runtime adapters — Claude: surgical additive edit of `~/.claude.json` `mcpServers.exa`, ownership tracked in `.install.json`; Codex: new `# === BEGIN OTO MCP ===` marker block in `codex-toml.cjs` (separate from the HOOKS block, refuse on external duplicate); Gemini: `mcpServers.exa` key in the same settings.json it already merges
3. Secret CRUD — keyfile helpers in `secrets.cjs` + SDK `secret-set`/`secret-clear`/`secret-status` commands (value on stdin, never argv; requires sdk/dist rebuild)

**Major MODIFIED:** `install.cjs` dispatch + install-state; boolean validation in `sdk/src/query/config-mutation.ts` AND `oto/bin/lib/config.cjs`; `settings-integrations.md` rewrite (keyfile flow, migration, rewritten `<security>` block); agent frontmatter/guidance for `oto-debugger` + `oto-advisor-researcher`; `runtime-matrix.cjs` + regenerated matrix doc.

### Critical Pitfalls

1. **Key committed to git via tracked `.oto/config.json`** (active defect, this repo is affected) — fix storage first; reject string values at both config-set paths; add a no-key-shaped-strings regression test.
2. **Agents declare tools that don't exist** — make `exa_search` coherent with actual registration; standardize probe-and-fallback guidance ("tool-not-found → fall back immediately, never retry"); doctor check for flag/registration mismatch.
3. **Wrong Claude scope / wrong file** — user scope in `~/.claude.json`; never project `.mcp.json` (committed + approval friction + untrusted-workspace blocking); never `~/.claude/settings.json`; merge strictly additively (it's Claude Code's live state file).
4. **Codex TOML corruption** — duplicate `[mcp_servers.exa]` headers break Codex's ENTIRE config parse; marker block + external-duplicate refusal (mirror `hasMixedLegacyHooks`) + round-trip test as a hard gate.
5. **Orphaned/clobbered registrations on uninstall/reinstall** — fingerprint what oto wrote in install state; remove only on match; skip-and-report user-owned `exa` entries.
6. **Guidance drift + Claude-only tool names** — `mcp__exa__*` is Claude namespace; Gemini exposes bare names, Codex its own. Consolidate to one shared runtime-neutral search-tools reference with an explicit fallback ladder (Exa → Brave → WebSearch) BEFORE extending to new agents; grep transformed per-runtime output, not just source.
7. **429s burn agent turns** — parallel researchers can drain the free tier; guidance rule: one Exa rate-limit error → switch provider for the session; verify the key is actually attached (silent unauthenticated fall-through is a documented in-the-wild failure).
8. **Upstream sync surface** — the files this milestone touches are exactly GSD-shared (`config.cjs`, `secrets.cjs`, `settings-integrations.md`, researcher agents). Put new logic in oto-only files; keep shared-file diffs small and commented; `oto sync --dry-run` regression check at milestone end.

## Implications for Roadmap

Three phases, dependency-ordered. This maps directly onto the architecture research's build order (1+4 / 2+3 / 5+6).

### Phase 1: Key Storage Reconciliation
**Rationale:** Every registration variant needs the key at a stable, uncommitted location; the current state is an active secret-hygiene defect (and the live SDK write path has no masking at all). Registration work without this fix tempts copy-pasting the key into three more config files.
**Delivers:** Keyfile CRUD (`secrets.cjs` helpers + SDK `secret-set/clear/status`, stdin input, 0600 perms, sdk/dist rebuild); boolean-only validation for `exa_search`/`brave_search`/`firecrawl` in both config-set paths; self-healing migration for legacy string values; rewritten `settings-integrations.md` (Set/Replace/Clear via keyfile, corrected `<security>` block, masked status display).
**Addresses:** Key-storage fix, masked display survival (table stakes).
**Avoids:** Pitfall 1 (committed key), Pitfall 5 groundwork (single rotation source).
**Scope decision to record:** fix all three integrations with the shared mechanism (marginal cost near zero), not just Exa.

### Phase 2: MCP Registration (All Three Runtimes)
**Rationale:** The milestone's stated missing piece. Depends on Phase 1 (key location + detect helper). Guidance extension before this just widens today's dead code.
**Delivers:** Launcher script `oto/hooks/oto-exa-mcp.js` through the build-hooks channel; `mergeMcp`/`unmergeMcp` adapter hooks (Claude `~/.claude.json` additive merge with `CLAUDE_CONFIG_DIR` resolution; Codex `codex-toml.cjs` OTO MCP marker block with duplicate refusal; Gemini settings.json key); `install.cjs` dispatch + install-state fingerprinting; conditional registration on `detectExaKey()`; uninstall coverage; registration-status line in settings summary; per-adapter merge/unmerge round-trip tests.
**Uses:** Existing adapter/marker/merge machinery (hooks precedent), hooks distribution channel, install-state.
**Implements:** Components 1–2 of the architecture; the transport ADR (launcher-stdio primary vs remote-HTTP alternative) is decided at the top of this phase.
**Avoids:** Pitfalls 2, 3, 4, 5, 6.

### Phase 3: Agent Guidance + Hardening
**Rationale:** Guidance is only truthful once tools exist. Consolidation must precede extension or drift multiplies (the three researchers already disagree with each other).
**Delivers:** Shared runtime-neutral search-tools reference with the Exa → Brave → WebSearch fallback ladder and the never-retry-on-429 rule; existing researcher agents pointed at it; `oto-debugger` + `oto-advisor-researcher` frontmatter and guidance; Codex/Gemini transform verification of tool names (grep transformed output); deprecated-tool-name sweep (`crawling_exa` etc.); runtime-matrix Exa row + regeneration; docs (setup, keyfile location, tier limits caveat); integration/regression sweep incl. no-plaintext guard and subagent e2e check; `oto sync --dry-run` conflict-surface comparison.
**Avoids:** Pitfalls 7, 8, 9.

### Phase Ordering Rationale

- **Storage → registration → guidance** is a strict dependency chain confirmed independently by FEATURES (dependency graph) and ARCHITECTURE (build order): registration configs reference the key location; guidance references tools registration creates.
- Phase 2 bundles launcher + adapters + uninstall + state because they form one atomic contract (what's written must be what's removed); splitting invites Pitfall 6.
- Sync hygiene (Pitfall 8) is a cross-cutting constraint on all phases — new logic in oto-only files wherever possible — with verification in Phase 3.
- All existing surfaces are reused, not built: adapters, marker merges, hooks channel, secrets masking, settings AskUserQuestion flow, agent transform pipeline.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2:** (a) `~/.claude.json` location under `CLAUDE_CONFIG_DIR` (MEDIUM — docs say state relocates; verify actual behavior before writing the Claude `mergeMcp` path resolution); (b) the transport ADR — STACK and ARCHITECTURE reached different primary recommendations (remote HTTP vs launcher-stdio); this summary recommends launcher-stdio because it's the only design keeping key material out of ALL runtime configs uniformly, but the decision deserves a quick fresh check of Codex HTTP-transport maturity and Claude user-scope env expansion at phase time; (c) Codex/Gemini MCP tool naming as seen by transformed agents (MEDIUM — verify empirically).
- **Phase 3 (light):** exact Exa free-tier/unauthenticated limits before writing them into docs (MEDIUM — sources conflict; ~1,000 req/mo authenticated, ~150/day unauthenticated; do not hard-code numbers).

Phases with standard patterns (skip research-phase):
- **Phase 1:** pure in-repo refactor against fully-read code; all four sites of the dual-typing bug are pinpointed with line numbers; keyfile mechanics are POSIX-standard.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Exa endpoint/auth/tools and all three runtimes' MCP config schemas verified against live official docs on 2026-07-10 |
| Features | HIGH | Existing-surface inventory from direct source inspection; MEDIUM only on comparable-framework conventions and free-tier numbers |
| Architecture | HIGH | All integration points read in full with file:line evidence; MEDIUM on `.claude.json`/`CLAUDE_CONFIG_DIR` interaction |
| Pitfalls | HIGH | Local hazards verified in-repo (including that this repo's own `.oto/config.json` is git-tracked); runtime gotchas backed by official docs and specific issue numbers |

**Overall confidence:** HIGH

### Gaps to Address

- **Transport/auth ADR (remote HTTP vs launcher-stdio):** the one substantive divergence between research files. Resolve as the first task of Phase 2 with a written ADR; this summary's recommendation is launcher-stdio (uniform secret indirection, honors the keyfile, sidesteps three broken/unverified env-expansion dialects) at the cost of an npx cold-start per session.
- **`CLAUDE_CONFIG_DIR` → `.claude.json` path resolution:** verify before implementing Claude `mergeMcp`; fallback logic (`$CLAUDE_CONFIG_DIR/.claude.json` else `$HOME/.claude.json`) is drafted but unconfirmed.
- **Keyless registration policy:** the hosted endpoint works unauthenticated, but `exa_search` detection keys off key presence, and keyless stdio launches fail noisily. Recommended default: skip-and-log when no key, with re-run-install as the refresh path; revisit keyless mode in v0.5.x.
- **Exact rate limits:** conflicting published numbers; re-verify at docs-writing time, phrase docs qualitatively.
- **Codex/Gemini tool-name mapping in transformed agents:** verify empirically during Phase 3's transform check.

## Sources

### Primary (HIGH confidence)
- Direct source inspection (read in full): `bin/install.js`, `bin/lib/{install,runtime-claude,runtime-codex,runtime-gemini,codex-toml,gemini-transform,runtime-matrix,install-state}.cjs`, `oto/bin/lib/{config,init,core,secrets,config-schema}.cjs`, `sdk/src/query/{config-mutation,index}.ts`, `oto/workflows/settings-integrations.md`, `oto/agents/oto-*-researcher.md`, `scripts/build-hooks.js`, `docs/upstream-sync.md`
- https://exa.ai/docs/reference/exa-mcp + https://github.com/exa-labs/exa-mcp-server + `npm view exa-mcp-server` (all 2026-07-10) — endpoint, auth, tool surface incl. deprecations, v3.2.1
- https://code.claude.com/docs/en/mcp — scopes, `~/.claude.json`, required `type` field, env expansion rules, reserved names
- https://developers.openai.com/codex/config-reference + /codex/mcp — `[mcp_servers]` schema, `env_http_headers`, `bearer_token_env_var` semantics
- https://google-gemini.github.io/gemini-cli/docs/tools/mcp-server.html — `httpUrl` vs `url`, headers, env expansion, `includeTools`, `trust`
- anthropics/claude-code#18692 (CLI secret expansion), #13898 (subagent MCP tool stripping), #14313 (config-dir relocation)

### Secondary (MEDIUM confidence)
- google-gemini/gemini-cli#5282, #5828 — header env-expansion unsupported/broken
- code-yeongyu/oh-my-openagent#1627, #3763 — key-not-attached silent unauthenticated fall-through failure mode
- Exa pricing pages + third-party trackers — free tier ~1,000 req/mo, unauthenticated ~150/day (conflicting; re-verify at build time)

---
*Research completed: 2026-07-10*
*Ready for roadmap: yes*
