# Requirements: oto v0.5.0 — Exa Search Integration

**Defined:** 2026-07-10
**Core Value:** Stop framework-switching — one installable framework where GSD's planning/execution workflow and Superpowers' capabilities coexist behind a single, consistent `/oto-*` command surface across Claude Code, Codex, and Gemini CLI.

## v0.5.0 Requirements

Requirements for this milestone. Each maps to roadmap phases (numbered from 14).

### Key Storage (SECR)

- [x] **SECR-01**: User's Exa API key is stored only in `~/.oto/exa_api_key` (mode 0600) or the `EXA_API_KEY` env var — never in committed `.oto/config.json`
- [x] **SECR-02**: The `exa_search`, `brave_search`, and `firecrawl` config keys accept boolean values only, enforced in both write paths (SDK `config-mutation.ts` and CJS `config.cjs`)
- [x] **SECR-03**: Legacy API-key strings found in `.oto/config.json` are self-heal migrated to the keyfile with a boolean left in their place (this repo's own config included)
- [ ] **SECR-04**: User can set, replace, and clear integration API keys via `/oto-settings-integrations`; keys are written to the keyfile via stdin (never argv), and status displays are masked (`****<last-4>`)

### MCP Registration (MCP)

- [ ] **MCP-01**: User is asked for consent before any MCP registration; nothing registers silently and the default is No
- [ ] **MCP-02**: Transport/auth decision (launcher-stdio vs remote HTTP) is recorded as an ADR before registration is implemented
- [ ] **MCP-03**: Exa MCP server is registered as `exa` in Claude Code user scope (`~/.claude.json`) via additive JSON merge — never by shelling out to `claude mcp add`
- [ ] **MCP-04**: Exa MCP server is registered in Codex via an OTO-marker `[mcp_servers.exa]` block in `~/.codex/config.toml`, refusing to write when an external duplicate exists
- [ ] **MCP-05**: Exa MCP server is registered in Gemini via `mcpServers.exa` in `~/.gemini/settings.json` using the transport shape that avoids the `url`-vs-`httpUrl` SSE trap
- [ ] **MCP-06**: Registration exposes exactly the pinned tool set (`web_search_exa`, `web_fetch_exa`, `web_search_advanced_exa`) — no deprecated or sales-oriented tools
- [ ] **MCP-07**: Registration is idempotent (re-install and re-run never duplicate entries) and conditional on a detected key
- [ ] **MCP-08**: Uninstall removes only oto-fingerprinted registrations; user-owned `exa` entries are skipped and reported
- [ ] **MCP-09**: `/oto-settings-integrations` summary shows per-runtime registration status (claude / codex / gemini)

### Agent Guidance (GUID)

- [ ] **GUID-01**: A shared, runtime-neutral search-tools reference exists with the Exa → Brave → WebSearch fallback ladder and a never-retry-on-429 rule
- [ ] **GUID-02**: The three researcher agents (`oto-phase-researcher`, `oto-project-researcher`, `oto-ui-researcher`) consume the shared reference; guidance drift between them is removed
- [ ] **GUID-03**: `oto-debugger` and `oto-advisor-researcher` gain `mcp__exa__*` frontmatter and search guidance via the shared reference
- [ ] **GUID-04**: No deprecated Exa tool names (`crawling_exa`, `get_code_context_exa`, `deep_researcher_*`, etc.) appear in any shipped agent or reference prose
- [ ] **GUID-05**: Codex and Gemini transformed agent output is verified for correct tool naming (checked against transformed output, not just source)

### Hardening (HARD)

- [ ] **HARD-01**: With no key or server present, research flows complete with zero user-facing errors via the Brave/WebSearch fallback (regression floor)
- [ ] **HARD-02**: `node:test` coverage exists for adapter merge/unmerge round-trips, boolean config validation, and a no-plaintext-key-in-tracked-files guard
- [ ] **HARD-03**: The generated runtime matrix gains an Exa MCP row per runtime, and docs cover setup with qualitative (not hard-coded) rate-limit phrasing
- [ ] **HARD-04**: An end-to-end check verifies `mcp__exa__*` tools actually reach a tools-restricted subagent (guards the claude-code#13898 regression class)
- [ ] **HARD-05**: `oto sync --dry-run` conflict-surface check passes at milestone close (this milestone touches GSD-shared files)

## Future Requirements (v0.5.x+)

Deferred. Tracked but not in the current roadmap.

### Exa Integration

- **EXA-F-01**: Keyless mode — register Exa's unauthenticated remote tier (~150 calls/day) with explicit rate-limit framing
- **EXA-F-02**: Live doctor ping — `tools/list` against the registered server from the status/doctor check
- **EXA-F-03**: `web_search_advanced_exa` research recipes (domain/date-filtered guidance)
- **EXA-F-04**: Broader agent rollout beyond debugger/advisor, per-agent as real sessions demand (AGNT-DEFER-01 discipline)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Auto-registration without consent | Silent mutation of user runtime config; violates the norm every reputable framework follows |
| Enabling all 10+ Exa tools | Context-window cost per session; several tools deprecated upstream; sales tools irrelevant to dev research |
| Exa Agent (`agent_tools`) inside researchers | Async billed polling inside already-orchestrated agents; opaque synthesis breaks source-attribution discipline |
| Shelling out to `claude mcp add` / `codex mcp add` | Claude CLI expands `${VAR}` and writes resolved secrets to disk (claude-code#18692); CLI flag drift; breaks uninstall symmetry |
| Project-scope `.mcp.json` registration | Per-repo approval friction; risks committing config; oto's model is user/global scope |
| `oto-sdk` Exa REST wrapper (Brave-style CLI path) | Second parallel Exa code path to maintain; MCP already delivers to all three runtimes |
| Vendoring/forking `exa-mcp-server` | Ongoing sync burden against the personal-use ceiling |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SECR-01 | Phase 14 | Complete |
| SECR-02 | Phase 14 | Complete |
| SECR-03 | Phase 14 | Complete |
| SECR-04 | Phase 14 | Pending |
| MCP-01 | Phase 15 | Pending |
| MCP-02 | Phase 15 | Pending |
| MCP-03 | Phase 15 | Pending |
| MCP-04 | Phase 15 | Pending |
| MCP-05 | Phase 15 | Pending |
| MCP-06 | Phase 15 | Pending |
| MCP-07 | Phase 15 | Pending |
| MCP-08 | Phase 15 | Pending |
| MCP-09 | Phase 15 | Pending |
| HARD-02 | Phase 15 | Pending |
| GUID-01 | Phase 16 | Pending |
| GUID-02 | Phase 16 | Pending |
| GUID-03 | Phase 16 | Pending |
| GUID-04 | Phase 16 | Pending |
| GUID-05 | Phase 16 | Pending |
| HARD-01 | Phase 16 | Pending |
| HARD-03 | Phase 16 | Pending |
| HARD-04 | Phase 16 | Pending |
| HARD-05 | Phase 16 | Pending |

**Coverage:**
- v0.5.0 requirements: 23 total
- Mapped to phases: 23
- Unmapped: 0 ✓

Mapping note: HARD-02 lands in Phase 15 — its adapter merge/unmerge round-trip family tests Phase 15 code and is the hard gate against Codex TOML corruption; the boolean-validation and no-plaintext-guard families are written alongside Phase 14's code and confirmed complete under HARD-02 in Phase 15.

---
*Requirements defined: 2026-07-10*
*Last updated: 2026-07-10 — traceability populated by v0.5.0 roadmap (phases 14-16)*
