# Pitfalls Research

**Domain:** Optional MCP-server search integration (Exa) + API-key handling in a multi-runtime AI-CLI installer framework (Claude Code / Codex / Gemini CLI)
**Researched:** 2026-07-10
**Confidence:** HIGH (local hazards verified in-repo; runtime MCP semantics verified against official Claude Code / Codex / Gemini CLI docs; Exa endpoint/auth verified against exa.ai docs)

## Critical Pitfalls

### Pitfall 1: API key committed to git via the tracked `.oto/config.json`

**What goes wrong:**
The `/oto-settings-integrations` workflow writes the raw Exa API key as a plaintext string to `.oto/config.json` (`oto-sdk query config-set exa_search "<value>"` — `oto/workflows/settings-integrations.md` step `section_1_search_integrations`, and its `<security>` block explicitly says "API keys ... are written as plaintext to `.oto/config.json`"). In **this repo**, `.oto/config.json` is git-tracked (verified: `git ls-files .oto/config.json` → tracked, currently `"exa_search": false`). One `git add -A` after running the workflow and the key is in permanent git history on a public GitHub repo. GSD designed `.planning/config.json` as gitignored user state; oto dogfoods `.oto/` as *committed* planning state — the upstream assumption silently inverted.

**Why it happens:**
Two storage models coexist for the same key name. `oto/bin/lib/config.cjs:62-63,92` and `init.cjs:365-366,448` compute `exa_search` as a **boolean** from `process.env.EXA_API_KEY` or the `~/.oto/exa_api_key` keyfile — the key never touches the project. But `secrets.cjs` lists `exa_search` in `SECRET_CONFIG_KEYS` and `settings-integrations.md` writes the **raw secret string** into project config. `core.cjs:285,477` then reads whatever is in config.json (`get('exa_search') ?? defaults.exa_search`), so a string value flows into orchestrator context as truthy.

**How to avoid:**
Pick ONE canonical secret location and make it home-dir/env only: `EXA_API_KEY` env var or `~/.oto/exa_api_key` keyfile (mode 0600), which `config.cjs`/`init.cjs` already support. Change `settings-integrations` so "Set Exa key" writes the keyfile (not project config) and `config-set exa_search` accepts only `true|false|null`. Add a `config-schema.cjs` validation rule rejecting string values for `exa_search`. Add a `node:test` asserting no key-shaped string can be written to any path under the repo's `.oto/`.

**Warning signs:**
`git diff .oto/config.json` shows a quoted string for `exa_search`; `oto-sdk query config-get exa_search` returns anything other than `true`/`false`/`null`; secrets masking (`****<last-4>`) appearing in `/oto-settings-integrations` output for a project-config key.

**Phase to address:**
First phase of v0.5.0 (key-storage reconciliation) — must land **before** any MCP-registration phase, because registration work will tempt copy-pasting the key into more config files.

---

### Pitfall 2: Agents declare `mcp__exa__*` tools that don't exist → wasted turns and silent degradation

**What goes wrong:**
All three researcher agents (`oto/agents/oto-{project,phase,ui}-researcher.md`) declare `mcp__exa__*` in frontmatter `tools:` and instruct "call `mcp__exa__web_search_exa`". No installer code registers an Exa MCP server (verified: zero MCP-registration logic in `bin/install.js`/`bin/lib/*`; `runtime-matrix.cjs` only *documents* MCP as native/auto-discovered). If `exa_search` resolves truthy (e.g., the string value from Pitfall 1, or keyfile present but server never registered — the exact current state), agents attempt a nonexistent tool, get tool-not-found errors, and burn research turns before falling back — or skip Exa silently forever, making the integration look shipped when it never runs.

**Why it happens:**
The config flag and the MCP registration are two independent facts with no coherence check. GSD shipped the prompt guidance and flag (the "70% latent" part) but registration was always the user's manual job. Nothing verifies `exa_search: true` ⇒ "an MCP server named `exa` is actually registered in the runtime that spawned this agent."

**How to avoid:**
Make the flag derived, not asserted: `exa_search` should only resolve `true` when (a) key material exists AND (b) the current runtime has the server registered (Claude: `claude mcp list` / `~/.claude.json` check at install/doctor time; Codex: `[mcp_servers.exa]` in `config.toml`; Gemini: `mcpServers.exa` in settings.json). Add an `oto doctor` check reporting flag/registration mismatch. In agent guidance, standardize a one-line probe-and-fallback: "if the Exa tool call errors as not found, immediately fall back to Brave/WebSearch — do not retry."

**Warning signs:**
Research transcripts containing tool-not-found errors for `mcp__exa__*`; `exa_search: true` in orchestrator context while `claude mcp list` shows no `exa` entry; researcher output whose Sources sections never cite Exa despite the flag being on.

**Phase to address:**
MCP-registration phase (installer + per-runtime adapters) plus the agent-guidance phase; the doctor/coherence check belongs in the registration phase's verification criteria.

---

### Pitfall 3: Registering Exa at the wrong Claude Code scope (project `.mcp.json` = committed + approval friction)

**What goes wrong:**
Claude Code has three MCP scopes: **local** (default, stored in `~/.claude.json` under the project path), **project** (`.mcp.json` at repo root, *designed to be committed*), **user** (`~/.claude.json`, all projects). If oto registers Exa at project scope, the config — including any inline key or `?exaApiKey=` URL — lands in a committed `.mcp.json`; project-scoped servers also require an interactive approval prompt per user (and since Claude Code v2.1.196, approvals in an untrusted/cloned workspace stay `⏸ Pending approval`), so the server silently doesn't connect for exactly the automated flows oto cares about. Registering at local scope means it only exists in the one project where the install ran.

**Why it happens:**
Scope naming is confusing ("local" ≠ project file; older versions called local "project" and user "global"), and `mcpServers` does not go in `~/.claude/settings.json` where oto's existing `mergeSettings` adapter already writes — a natural but wrong place to put it.

**How to avoid:**
For a personal, all-projects framework: **user scope**. Prefer shelling out to `claude mcp add --transport http exa --scope user https://mcp.exa.ai/mcp --header "x-api-key: ..."` (or write `~/.claude.json` only when the CLI is unavailable). Never write `.mcp.json` into the user's project. Do not hand-edit `~/.claude.json` while a Claude Code session is running — Claude Code rewrites that file itself and concurrent edits can be clobbered.

**Warning signs:**
A new `.mcp.json` appears in `git status` after install; `claude mcp list` shows `exa` as `⏸ Pending approval`; Exa works in one project but not others.

**Phase to address:**
Claude-runtime registration phase; per-scope decision recorded as an ADR before implementation.

---

### Pitfall 4: Codex TOML merge corrupts or duplicates `[mcp_servers.exa]`

**What goes wrong:**
TOML hard-errors on duplicate table headers. If oto appends `[mcp_servers.exa]` into `~/.codex/config.toml` while the user already has one (hand-added, or from a previous oto install/upgrade), Codex fails to parse the **entire** config — hooks, model settings, everything breaks, not just Exa. Conversely, a naive "replace the whole `[mcp_servers]` section" clobbers the user's other MCP servers.

**Why it happens:**
oto's existing Codex adapter (`bin/lib/codex-toml.cjs`) manages a marker-delimited `# === BEGIN OTO HOOKS ===` block designed for hooks; MCP tables are a different shape, and it's tempting to just string-append. GSD already learned this class of lesson (the mixed legacy-hooks refusal logic in `hasMixedLegacyHooks`).

**How to avoid:**
Reuse the marker-block pattern: an `# === BEGIN OTO MCP ===` block, with a pre-merge scan that detects any user-owned `[mcp_servers.exa]` *outside* the block and refuses with a clear message instead of writing a duplicate (mirror `hasMixedLegacyHooks`). Or shell out to `codex mcp add exa --url https://mcp.exa.ai/mcp ...` and let Codex own its own file. Round-trip test: merge → parse → unmerge → byte-identical user content.

**Warning signs:**
Codex refuses to start or ignores config after oto install/upgrade; two `[mcp_servers.exa]` headers in `config.toml`; user's pre-existing `[mcp_servers.*]` entries missing after install.

**Phase to address:**
Codex-runtime registration phase; the refuse-on-external-duplicate test is a hard gate.

---

### Pitfall 5: Secret ends up plaintext inside runtime config files (URL query param, static headers, Codex `env`)

**What goes wrong:**
Exa's hosted MCP historically documents key-in-URL (`https://mcp.exa.ai/mcp?exaApiKey=YOUR_KEY`) and now also `x-api-key` header. Every runtime tempts you into a plaintext copy:
- **Claude:** inline `headers: {"x-api-key": "<key>"}` or key-in-URL written into `~/.claude.json`.
- **Codex:** `http_headers` values are literal strings; stdio `env = { EXA_API_KEY = "..." }` is literal; `bearer_token_env_var` exists but sends `Authorization: Bearer`, which is not Exa's documented `x-api-key` scheme (verify before relying on it).
- **Gemini:** `headers` values are **literal only** — env-var substitution in headers is an open feature request (gemini-cli #5282); only the `env` block expands `$VAR`.

Key-in-URL is worse than key-in-header even in a home-dir file: URLs get echoed by `claude mcp list`/`codex mcp get` output, error messages, and debug logs, and any proxy/log line captures the query string. Result: the key exists in 3-4 plaintext locations with different lifecycles, and rotation means hunting them all.

**Why it happens:**
Each runtime has a different secret-injection capability, and the path of least resistance in each is "paste the string."

**How to avoid:**
Single source of truth: `EXA_API_KEY` in shell env + `~/.oto/exa_api_key` keyfile as the persistent copy. Per runtime, prefer the indirection each supports: Claude `.mcp.json`/`~/.claude.json` supports `${EXA_API_KEY}` expansion in `env`, `headers`, and `url` — but note Claude Code **fails to parse the whole config** if a referenced variable is unset with no default, so write `${EXA_API_KEY:-}`-style defaults or only register when the key resolves. For Gemini, prefer the **local stdio server** (`npx exa-mcp-server` with `env: {"EXA_API_KEY": "$EXA_API_KEY"}`) over `httpUrl`+literal header, because Gemini can't expand headers. For Codex, accept plaintext in `~/.codex/config.toml` only as a documented last resort, or use the stdio server understanding it's a home-dir file. Never use the `?exaApiKey=` URL form in any written config.

**Warning signs:**
`grep -r "exaApiKey\|x-api-key" ~/.claude.json ~/.codex/config.toml ~/.gemini/settings.json` returns the raw key; `claude mcp get exa` prints a URL containing the key; more than one file needs editing to rotate the key.

**Phase to address:**
MCP-registration phase — the per-runtime secret-injection strategy is a design decision, not an implementation detail; document the plaintext residue per runtime in `docs/CONFIGURATION.md`.

---

### Pitfall 6: Uninstall/upgrade leaves orphaned MCP registrations (or removes the user's own)

**What goes wrong:**
oto's uninstall path removes only oto-marked entries from settings files (`bin/lib/install.cjs:398`, D-14) — but MCP registrations written via `claude mcp add` / `codex mcp add` / Gemini settings merge carry no oto marker by default. After `oto uninstall`, an `exa` server (possibly with an embedded key) keeps running in every session forever; after a re-install, registration logic may double-add or, if it removes "any server named exa," delete a registration the user created themselves before oto existed.

**Why it happens:**
The existing marker/ownership discipline covers hooks and instruction files; MCP entries are a new surface added late, and CLI-mediated registration (`claude mcp add`) leaves no provenance.

**How to avoid:**
Record MCP registrations in oto's install state (`bin/lib/install-state.cjs`): runtime, scope, server name, and a fingerprint of what oto wrote. On uninstall, remove only if the current value matches the fingerprint (i.e., the user hasn't modified it); otherwise warn and leave. On install, if a server named `exa` already exists and wasn't oto-written, do not touch it — report "already registered, skipping."

**Warning signs:**
`claude mcp list` still shows `exa` after uninstall; a user-customized `exa` entry reverts after `oto install`; install-state JSON has no `mcp` section.

**Phase to address:**
MCP-registration phase (write state) + a small uninstall-coverage addition with tests in the same phase.

---

### Pitfall 7: Tool-name and guidance drift across runtimes (`mcp__exa__web_search_exa` is Claude-only)

**What goes wrong:**
Agent prompt bodies hard-code `mcp__exa__web_search_exa`. That naming is Claude Code's namespace. `bin/lib/gemini-transform.cjs:18` already strips `mcp__*` from Gemini agent frontmatter (returns null) — but the **body text** conversion only rewrites paths/`CLAUDE.md`, so Gemini and Codex agents ship prose telling the model to call a tool name that doesn't exist in their runtime (Gemini exposes MCP tools by bare name, e.g. `web_search_exa`, prefixing only on conflict; Codex uses its own naming). The model either errors or hallucinates around it. Separately, the three researcher agents already disagree: project-researcher says check `exa_search` "from orchestrator context," phase-researcher says "from init context," ui-researcher gives a different Exa-vs-Firecrawl preference ordering — extending guidance to `oto-debugger`/`oto-advisor-researcher` by copy-paste multiplies the drift.

**Why it happens:**
Guidance was written once for Claude and cloned per agent; the runtime transforms handle frontmatter mechanically but can't rewrite prose semantics.

**How to avoid:**
Extract one shared search-tooling guidance reference (`oto/references/search-tools.md` or similar) that agents include by pointer, with runtime-neutral phrasing ("the Exa search tool, if available") plus an explicit fallback ladder: Exa → Brave (`oto-sdk query websearch`) → built-in WebSearch. Extend `runtime-matrix.cjs`'s existing `mcp__` scanner to assert every `mcp__exa__*` mention in shipped agent bodies is either transformed or runtime-conditional. Update `gemini-transform`/`codex-transform` to rewrite or generalize the tool-name strings in bodies.

**Warning signs:**
`grep -rn "mcp__exa__" oto/agents oto/workflows oto/references` returns hits in files shipped to Codex/Gemini unmodified; researcher agents describing different fallback orders; Gemini research sessions showing "tool not found: mcp__exa__web_search_exa".

**Phase to address:**
Agent-guidance phase ("extend Exa usage guidance beyond the 3 researcher agents") — do the consolidation *before* adding new agents to the list.

---

### Pitfall 8: Local Exa edits to upstream-shared files create permanent `oto sync` conflict surface

**What goes wrong:**
`oto sync` three-way merges rebranded GSD snapshots against the live `oto/` tree via `git merge-file` (docs/upstream-sync.md). The files this milestone must touch are exactly the ones GSD ships and keeps evolving: `config.cjs`, `core.cjs`, `init.cjs`, `secrets.cjs`, `config-schema.cjs`, `settings-integrations.md`, and the three researcher agents. Every local line changed in those files is a potential same-line conflict on every future sync — and GSD upstream may itself rework `exa_search` handling (it originated there), producing semantic conflicts that `git merge-file` merges "cleanly" but wrongly (e.g., upstream reverts your boolean-only rule while your keyfile code remains).

**Why it happens:**
The integration is "70% latent from GSD," so the natural move is editing GSD's files in place.

**How to avoid:**
Put all *new* logic in oto-only files that upstream will never touch: e.g., `bin/lib/mcp-register.cjs` (per-runtime registration), a small Exa helper module, `oto/references/search-tools.md` (guidance). Keep diffs in shared files small, block-shaped, and commented (`// oto: Exa key-storage fix — see ADR-xx`) so merge conflicts are obvious and resolvable. After the milestone, run `oto sync --dry-run` against current GSD head as a verification step to see the conflict surface just created.

**Warning signs:**
`oto sync --dry-run` reports conflicts in `config.cjs`/researcher agents that didn't conflict before; a sync "auto-merges" a shared file and Exa tests start failing (semantic mis-merge).

**Phase to address:**
Cross-cutting constraint stated in the roadmap and enforced in every phase's plan; final phase should include an `oto sync --dry-run` regression check.

---

### Pitfall 9: Free-tier exhaustion mid-research — 429s burn agent turns instead of triggering fallback

**What goes wrong:**
Exa free tier is ~1,000 requests/month; the unauthenticated hosted MCP tier is a daily fixed-window limiter (~150 calls/day per milestone context — MEDIUM confidence; exa.ai does not publish the exact number). oto's research phases spawn up to 3-4 researchers **in parallel**, each capable of 10-30 searches; two or three `/oto-new-milestone` runs plus phase research can drain the month. When exhausted, the hosted server returns 429 / "You've hit Exa's free MCP rate limit" — an LLM agent's default response is to retry the same tool, wasting turns, or to stall the research phase. A related failure mode observed in the wild (oh-my-openagent #1627/#3763): key configured but not actually applied to the MCP connection → silent fall-through to the unauthenticated tier → mysterious rate-limit errors despite "having a key."

**Why it happens:**
Nothing in the guidance distinguishes "tool absent" from "tool present but rate-limited," and parallel researchers can't see each other's usage.

**How to avoid:**
Guidance rule in the shared search reference: on any Exa 429/limit error, switch to Brave/WebSearch for the remainder of the session — never retry Exa. Treat Exa as the *semantic-query* tier, not the default for every lookup. Verify at registration time that the key is actually attached (one authenticated test call in `oto doctor`), so you're not silently on the unauthenticated tier. For a personal tool, don't build quota tracking — a one-line fallback rule fits the cost ceiling.

**Warning signs:**
Research transcripts with repeated Exa 429 errors; monthly Exa dashboard at cap mid-month; 429s occurring while the dashboard shows near-zero usage (= key not attached, running unauthenticated).

**Phase to address:**
Agent-guidance phase (fallback ladder text); registration phase (authenticated-call verification); docs note the tier limits.

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Keep `exa_search` accepting both boolean and string "until later" | No breaking change to settings-integrations | Every consumer must handle two types; the string keeps flowing toward committed config | Never — this is the core bug of the milestone |
| Key-in-URL (`?exaApiKey=`) registration | One-line config, works everywhere | Key leaks into `mcp list` output, logs, proxies; rotation requires config edits in 3 runtimes | Never in written config; OK for a one-off manual curl test |
| Hand-append TOML/JSON instead of marker-block or CLI-mediated registration | Fast to write | Duplicate-table parse failures (Codex), clobbered user servers, no uninstall path | Never — adapters + markers already exist, reuse them |
| Copy-paste Exa guidance into each new agent | Ships the "extend guidance" requirement quickly | 5+ divergent copies to keep in sync; drift already visible across the 3 researchers | Never — consolidate to a shared reference first |
| Skip Gemini MCP registration ("Gemini auto-discovers") | Less adapter work | Gemini only discovers servers configured in *its* settings.json; nothing carries over from Claude's config — Exa silently absent on Gemini | Acceptable only if Gemini Exa support is explicitly descoped and documented in the runtime matrix |
| Plaintext key in `~/.codex/config.toml` env map | Codex stdio server "just works" | One more rotation location; grep-able secret in home dir | Acceptable for personal use IF documented and the keyfile remains the rotation source of truth |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Exa hosted MCP | Key in URL query (`?exaApiKey=`) | `x-api-key` header (current documented scheme) or local `exa-mcp-server` with `EXA_API_KEY` env |
| Exa hosted MCP | Assuming the unauthenticated tier is fine for daily use | Shared daily limiter with 429s; register the key or expect mid-session degradation |
| Claude Code MCP | Putting `mcpServers` in `~/.claude/settings.json` (where oto's mergeSettings already writes) | User scope lives in `~/.claude.json`; use `claude mcp add --scope user` |
| Claude Code MCP | `${EXA_API_KEY}` in config with no default while the var is unset | Claude Code fails to parse the whole config; use `${EXA_API_KEY:-}` default or register conditionally |
| Claude Code MCP | Project-scope `.mcp.json` for a personal framework | Gets committed + per-user approval prompts + untrusted-workspace blocking; use user scope |
| Codex MCP | String-appending `[mcp_servers.exa]` to config.toml | Marker block with external-duplicate refusal (mirror `hasMixedLegacyHooks`) or `codex mcp add` |
| Codex MCP | Assuming `bearer_token_env_var` works for Exa | It sends `Authorization: Bearer`; Exa documents `x-api-key` — verify before shipping, else `http_headers` or stdio |
| Gemini CLI MCP | `httpUrl` + `headers` with `$EXA_API_KEY` in the header value | Headers are literal strings (no env expansion — gemini-cli #5282); use stdio server with `env` block, which does expand |
| Gemini CLI MCP | Expecting `mcp__exa__web_search_exa` naming | Gemini exposes bare tool names (`web_search_exa`), prefixed only on conflict; prompt bodies must be runtime-neutral |
| Gemini CLI MCP | Unset env var in `env` block | Expands to empty string silently → server starts, returns 401s mid-run; check key presence before registering |
| oto uninstall | Removing "any server named exa" | Remove only fingerprint-matched oto-written entries; leave user-modified ones with a warning |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Parallel researchers all defaulting to Exa | Quota gone mid-month; 429 storms during research phases | Exa reserved for semantic queries; Brave/WebSearch for routine lookups | ~2-3 full research cycles/month on the free tier (1,000 req/mo) |
| Retrying Exa on 429 | Agents loop on the same failing call, research phase stalls | Guidance: one failure → switch provider for the session | First day the daily/monthly cap is hit |
| Remote MCP health-checked at every session start | Slow session start when mcp.exa.ai is slow/unreachable offline | Accept it (runtimes handle unavailable servers gracefully); never make a hook depend on Exa availability | Offline / airplane use |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Raw key written to tracked `.oto/config.json` | Permanent leak into public GitHub history; requires history rewrite + key rotation | Boolean-only in project config; key in `~/.oto/exa_api_key` (0600) or env (Pitfall 1) |
| Key in MCP URL query string | Echoed by `claude mcp list`/`codex mcp get`, error messages, logs, proxies | Header or env-based auth only |
| `****<last-4>` masking treated as sufficient | Masking is a display convention, not a storage control; a masked value in a committed file still proves a live key exists there | Fix storage location; keep masking for UI only |
| Keyfile created with default umask | World-readable key on shared machines | `fs.writeFileSync(path, key, { mode: 0o600 })` and assert mode in tests |
| Registering a remote MCP server without recording what was registered | Server URL/config drift invisible; tool descriptions arrive from the network | Record exact URL + fingerprint in install-state |
| Key committed → "just delete it in the next commit" | Key remains in git history and GitHub caches | Rotate immediately at dashboard.exa.ai; history rewrite for a public repo |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| `exa_search: true` with no registered server | Research silently slower/worse; user thinks Exa is working | `oto doctor` flag/registration coherence check per runtime |
| Install registers MCP without saying so | User surprised by a new server in `claude mcp list`, approval prompts | Installer prints exactly what was registered, where, and how to remove it |
| Key prompt echoes or logs the value | Key in terminal scrollback/session transcripts | Extend the existing masking convention to the keyfile flow; never echo on write |
| Exa failure mid-research with no explanation | User sees mediocre research, doesn't know quota was hit | Researcher SUMMARY notes "Exa unavailable (rate limit) — fell back to WebSearch" |
| Uninstall leaves Exa registered | "I removed oto, why is this server still here?" | Fingerprinted removal (Pitfall 6) |

## "Looks Done But Isn't" Checklist

- [ ] **Key-storage fix:** Often missing the `config-schema.cjs` rejection of string values — verify `oto-sdk query config-set exa_search "sk-test"` is refused, not masked-and-written
- [ ] **Claude registration:** Often missing the unset-env-var parse failure — verify a fresh shell *without* `EXA_API_KEY` still starts Claude Code cleanly
- [ ] **Codex registration:** Often missing the pre-existing-server case — verify install against a config.toml that already has a user-owned `[mcp_servers.exa]`
- [ ] **Gemini registration:** Often missing entirely (assumed auto-discovery) — verify `gemini` actually lists Exa tools after install
- [ ] **Agent guidance:** Often missing body-text tool names for Codex/Gemini — grep `mcp__exa__` on the *transformed* per-runtime output, not just source
- [ ] **Uninstall:** Often missing MCP cleanup — verify `claude mcp list` / `config.toml` / Gemini settings after `oto uninstall`
- [ ] **Runtime matrix:** Often missing the new Exa row/status — verify `render-runtime-matrix.cjs` output includes Exa per runtime
- [ ] **Authenticated-tier verification:** Often missing — key "configured" but connection running unauthenticated (oh-my-openagent #1627 failure mode); verify one authenticated call succeeds and shows up on the Exa dashboard
- [ ] **Sync hygiene:** Often missing — run `oto sync --dry-run` after the milestone and record the expected conflict set

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Key committed to git history | HIGH | Rotate key at dashboard.exa.ai immediately; remove from config; rewrite history (`git filter-repo`) since the repo is public; force-push |
| Corrupted Codex config.toml (duplicate tables) | MEDIUM | Restore from oto's timestamped backup (existing installer convention); add external-duplicate detection before re-merge |
| Orphaned MCP registration after uninstall | LOW | `claude mcp remove exa --scope user` / delete `[mcp_servers.exa]` block / remove Gemini settings key; then add fingerprinted cleanup |
| Guidance drift discovered post-ship | LOW-MEDIUM | Consolidate to shared reference file; agents point at it; single-file fix thereafter |
| Sync conflict storm in shared files | MEDIUM | Resolve once via `oto sync --accept`; then refactor Exa logic out of the shared file into an oto-only module so it doesn't recur |
| Quota exhausted mid-milestone | LOW | Fallback ladder covers it; optionally upgrade the Exa plan if usage justifies |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| 1. Key in committed config | Phase 14 (key-storage reconciliation, FIRST) | `config-set exa_search <string>` rejected; `git diff .oto/config.json` clean after settings flow; keyfile mode 0600 test |
| 5. Plaintext key in runtime configs | Phase 14 design + registration phase | grep audit of `~/.claude.json`, `config.toml`, Gemini settings for raw key / `exaApiKey=` |
| 2. Flag/registration incoherence | Registration phase | `oto doctor` reports mismatch; agent context only sees `exa_search: true` when server registered |
| 3. Claude scope mistake | Registration phase (Claude adapter) | ADR records user-scope decision; no `.mcp.json` created in project; `claude mcp get exa` shows user scope |
| 4. Codex TOML corruption | Registration phase (Codex adapter) | Round-trip merge test; external-duplicate refusal test |
| 6. Orphaned/clobbered registrations | Registration phase + uninstall coverage | Uninstall test asserts removal; user-owned-entry preservation test |
| 7. Guidance drift / tool naming | Agent-guidance phase | Single shared reference; transformed-output grep for `mcp__exa__` on Codex/Gemini payloads |
| 9. Rate-limit turn burn / silent unauthenticated tier | Agent-guidance + registration phases | Fallback ladder in shared reference; `oto doctor` authenticated test call |
| 8. Upstream sync surface | All phases (constraint) + final phase check | `oto sync --dry-run` regression comparison pre/post milestone |

## Sources

- Local (HIGH): `oto/bin/lib/{config.cjs,init.cjs,core.cjs,secrets.cjs,config-schema.cjs}`, `oto/workflows/settings-integrations.md`, `oto/agents/oto-{project,phase,ui}-researcher.md`, `bin/lib/{runtime-claude.cjs,runtime-codex.cjs,runtime-gemini.cjs,codex-toml.cjs,gemini-transform.cjs,runtime-matrix.cjs,install.cjs,install-state.cjs}`, `docs/upstream-sync.md`; `git ls-files .oto/config.json` (tracked, currently `"exa_search": false`)
- Claude Code MCP docs (HIGH): https://code.claude.com/docs/en/mcp — scopes table (local/project/user → `~/.claude.json` / `.mcp.json`), env expansion (`${VAR}`, `${VAR:-default}`; unset+no-default = config parse failure), project-scope approval + v2.1.196 untrusted-workspace behavior, `claude mcp add --scope`, `claude mcp reset-project-choices`
- Exa MCP docs (HIGH): https://exa.ai/docs/reference/exa-mcp — remote endpoint `https://mcp.exa.ai/mcp`, `x-api-key` header auth, local npx + `EXA_API_KEY`, tools `web_search_exa`/`web_fetch_exa`; https://exa.ai/docs/reference/rate-limits and https://exa.ai/pricing — free tier ~1,000 req/mo; 429 on unauthenticated-tier exhaustion (daily fixed-window limiter). The "150/day" unauthenticated figure is from milestone context (MEDIUM — not published verbatim)
- Codex MCP (MEDIUM-HIGH): https://developers.openai.com/codex/mcp and https://developers.openai.com/codex/config-reference — `[mcp_servers.<name>]`, stdio `command/args/env`, HTTP `url` + `bearer_token_env_var` + `http_headers`, `codex mcp add`, project-scoped `.codex/config.toml` (trusted projects)
- Gemini CLI MCP (HIGH): https://google-gemini.github.io/gemini-cli/docs/tools/mcp-server.html — `mcpServers` in settings.json, `httpUrl`+`headers` (literal), env expansion in `env` block only (unset → empty string), tool-name generation; header env-substitution gap: https://github.com/google-gemini/gemini-cli/issues/5282
- Exa key-not-applied failure mode in the wild (MEDIUM): https://github.com/code-yeongyu/oh-my-openagent/issues/1627 and https://github.com/code-yeongyu/oh-my-openagent/issues/3763 — EXA_API_KEY not applied to the MCP URL → silent fall-through to unauthenticated tier → rate-limit errors

---
*Pitfalls research for: Exa MCP search integration in a multi-runtime AI-CLI installer framework*
*Researched: 2026-07-10*
