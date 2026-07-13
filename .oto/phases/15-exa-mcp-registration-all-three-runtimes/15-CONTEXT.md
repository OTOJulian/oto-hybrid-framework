# Phase 15: Exa MCP Registration (All Three Runtimes) - Context

**Gathered:** 2026-07-13
**Status:** Ready for planning

<domain>
## Phase Boundary

**This phase delivers:** With explicit user consent (default No) and a detected usable key, the Exa MCP server is registered as `exa` in Claude Code (`~/.claude.json`, additive JSON merge), Codex (`~/.codex/config.toml`, OTO-marker `[mcp_servers.exa]` block), and Gemini (`~/.gemini/settings.json`, transport shape avoiding the `url`-vs-`httpUrl` SSE trap) — through oto's `bin/lib/` adapter machinery, never via CLI shell-outs. Registration is idempotent, fingerprint-tracked in install state, and cleanly removable on uninstall (user-owned entries skipped and reported). Exposes exactly `web_search_exa`, `web_fetch_exa`, `web_search_advanced_exa`. `/oto-settings-integrations` gains a per-runtime registration status surface. HARD-02 completes here with the adapter merge/unmerge round-trip test family (`node:test`).

**Inherited pre-tasks from Phase 14 dispositions (this phase owns):**
- **FRESH-CR-02:** per-runtime config-dir resolution (`CLAUDE_CONFIG_DIR` / `CODEX_HOME` / `GEMINI_CONFIG_DIR` and custom dirs) plus the per-runtime status surface — the shared settings workflow currently hardcodes the Claude default path and fails on Codex-only, Gemini-only, and custom-config-dir installs.
- **FRESH-WR-04:** canonical key-source detection reused across CJS and SDK paths, covering empty, whitespace-only, symlink, and non-regular keyfile paths.
- **FRESH-WR-05:** `/oto-settings-integrations` Replace/Clear must disclose keyfiles' global scope and require confirmation, reconciling enabled root/workstream flags.

**Out of scope:**
- Agent guidance/frontmatter, shared search-tools reference, fallback-ladder regression floor, runtime matrix row, docs, sync-hygiene close-out (Phase 16).
- Keyless/unauthenticated Exa tier (EXA-F-01), live doctor `tools/list` ping (EXA-F-02) — v0.5.x+ deferred.
- Workstream secret-status parity and root-layer legacy migration (FRESH-CR-03/WR-04-historical — Phase 16 pre-tasks).

</domain>

<decisions>
## Implementation Decisions

### Transport ADR (MCP-02)
- **D-01:** Transport is **launcher-stdio**: a shipped launcher script (`oto/hooks/oto-exa-mcp.js`, distributed via the existing build-hooks channel) resolves the key from env/keyfile at spawn time and launches the Exa MCP server. Key material never lands in any runtime config file; rotation stays single-source in the Phase 14 keyfile. The ADR is written as the first task, before adapter code lands.
- **D-02:** The launcher pins the **exact version**: `npx -y exa-mcp-server@3.2.1`. Upstream has already deprecated 5+ tools; an exact pin keeps MCP-06's 3-tool surface deterministic. Version bumps ship as one-line changes in normal oto releases.
- **D-03:** Registration **pre-warms the npx cache** immediately after consent (e.g. `npx -y exa-mcp-server@3.2.1 --version`), so the first real session starts fast and offline/network failures surface at install time — not silently inside an agent run.
- **D-04:** The ADR **documents remote HTTP** (`https://mcp.exa.ai/mcp` + `x-api-key` header) as the evaluated alternative with trade-offs — anchoring the v0.5.x keyless-tier deferral (EXA-F-01) so it never gets re-researched from scratch.

### Consent & registration entry points (MCP-01, MCP-07)
- **D-05:** Consent lives in **both** the installer and settings via one shared code path: `oto install --<runtime>` prompts once when a usable key is detected (default No; silent skip when no key or non-interactive), and `/oto-settings-integrations` offers register/unregister anytime (the key-added-later refresh path).
- **D-06:** One consent covers **the runtimes the current install command targets** — `oto install --claude` asks once and registers Claude; a later `--codex` install asks again for Codex. No all-runtime blanket, no per-runtime checklist ceremony.
- **D-07:** Consent answers are **persisted both ways** (Yes AND No) in `~/.oto` state / install-state. Later installs honor the recorded answer silently — Yes keeps registrations fresh, No never nags. Settings is the change surface.
- **D-08:** Non-interactive installs: default No applies — skip with a one-line log pointing at `/oto-settings-integrations` — plus an **explicit opt-in flag** (e.g. `oto install --claude --register-exa-mcp`) for scripted bootstrap. CI smoke tests stay clean; cross-machine setup stays scriptable.

### Per-runtime status & config-dir resolution (MCP-09, FRESH-CR-02)
- **D-09:** Status truth = **live parse of each runtime's actual config file cross-checked against oto's install-state fingerprint**. Status distinguishes: registered (oto-managed) / registered (user-owned) / missing-but-expected (drift: user deleted it). Reuses the same parsing the duplicate-refusal logic needs.
- **D-10:** Coherence mismatches (`exa_search: true` but registered nowhere; registered but no usable key) warn with one line in the settings summary AND in `oto doctor`, both calling **one shared detection helper** (doctor precedent: PATH self-healing check from quick task 260616-muv).
- **D-11:** Runtimes with no config dir show as **"not installed"** in status; settings-driven registration only offers detected runtimes. No pre-registration into absent runtimes.
- **D-12:** Custom config-dir env overrides (`CLAUDE_CONFIG_DIR`, `CODEX_HOME`, `GEMINI_CONFIG_DIR`) are honored consistently across registration, status, and uninstall (FRESH-CR-02 contract). Note the open research flag: verify whether `~/.claude.json` relocates under `CLAUDE_CONFIG_DIR` before writing the Claude resolution (drafted fallback: `$CLAUDE_CONFIG_DIR/.claude.json` else `$HOME/.claude.json` — unconfirmed).

### Conflict & edge-case UX (MCP-04, MCP-08, FRESH-WR-04/05)
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

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope & requirements
- `.oto/ROADMAP.md` §Phase 15 — goal, 5 success criteria, notes (research flags: `CLAUDE_CONFIG_DIR` → `~/.claude.json` resolution; live `bin/lib/` installer only).
- `.oto/REQUIREMENTS.md` §MCP Registration (MCP-01..09) + §Hardening HARD-02 + the Out of Scope table (no CLI shell-outs, no project-scope `.mcp.json`, no auto-registration).
- `.oto/research/SUMMARY.md` — milestone research (HIGH confidence): transport analysis, per-runtime config schemas, hard constraints (server named `exa`; `~/.claude.json` NOT `~/.claude/settings.json`; Gemini `httpUrl`-vs-`url`; never key-in-URL), pitfalls 2-6, adapter-hook architecture (`mergeMcp`/`unmergeMcp` beside `mergeSettings`, precedent `emitDerivedFiles`). See `.oto/research/ARCHITECTURE.md` and `.oto/research/PITFALLS.md` for file:line evidence.
- `.oto/phases/14-key-storage-reconciliation/14-DISPOSITIONS.md` — the FRESH-CR-02, FRESH-WR-04, FRESH-WR-05 deferral rows this phase owns (verbatim obligations).
- `.oto/phases/14-key-storage-reconciliation/14-CONTEXT.md` — Phase 14 decisions this phase builds on (D-07 secret CRUD surface, D-09 stdin/TTY key entry, D-10 env-wins precedence, keyfile paths).

### Code under change
- `bin/lib/install.cjs` — dispatch point for the new `mergeMcp`/`unmergeMcp` adapter hooks; install-state fingerprinting.
- `bin/lib/runtime-claude.cjs`, `bin/lib/runtime-codex.cjs`, `bin/lib/runtime-gemini.cjs` — the three adapters gaining MCP merge/unmerge.
- `bin/lib/codex-toml.cjs` — home of the new `# === BEGIN OTO MCP ===` marker block (separate from the HOOKS block); external-duplicate refusal mirrors `hasMixedLegacyHooks`.
- `bin/lib/install-state.cjs` — fingerprint/ownership records.
- `oto/hooks/` + `scripts/build-hooks.js` — the launcher `oto-exa-mcp.js` ships through this channel (auto-discovered, syntax-validated, uninstall-tracked).
- `oto/bin/lib/config.cjs` + `oto/bin/lib/secrets.cjs` — canonical key detection to reuse/extend per D-15 (GSD-shared: small commented diffs).
- `sdk/src/query/` — SDK-side helpers for status/detection parity (requires sdk/dist rebuild).
- `oto/workflows/settings-integrations.md` — gains register/unregister flow, per-runtime status summary, global-scope confirm (D-16).

### Constraints
- `docs/upstream-sync.md` — sync-hygiene contract for GSD-shared files (HARD-05 verified at milestone close, Phase 16).
- `CLAUDE.md` §Technology Stack — `node:test`, no new npm deps, no install-time build additions, personal-use cost ceiling.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Adapter/marker/merge machinery in `bin/lib/` (`runtime-*.cjs`, `codex-toml.cjs`, `marker.cjs`, `install-state.cjs`) — registration is a new hook pair on existing adapters, not a new subsystem.
- Hooks distribution channel (`scripts/build-hooks.js` allowlist + syntax validation) — the launcher ships exactly like existing hooks.
- Phase 14's keyfile contract: `~/.oto/exa_api_key` (0600), `EXA_API_KEY` env-wins precedence, `maskSecret` display convention, `secret-status` SDK command.
- `oto doctor` (quick task 260616-muv) — precedent and home for the mismatch check (D-10).

### Established Patterns
- Both-write-paths discipline: any detection/validation rule must exist in the SDK TS path AND the CJS path (independent implementations).
- Sync hygiene (standing v0.5.0 constraint): new logic in oto-only files where possible; shared-file diffs small and commented.
- Marker-block + fingerprint ownership: the HOOKS marker block in `codex-toml.cjs` and instruction-file markers are the model for the MCP block and JSON-entry fingerprints.
- One-line masked notices, quiet self-healing tone (Phase 14).

### Integration Points
- `install.cjs` per-runtime dispatch — where `mergeMcp` slots beside `mergeSettings` (precedent: `emitDerivedFiles`).
- `.install.json` install state — fingerprint records consumed by uninstall and by the status live-parse cross-check.
- `/oto-settings-integrations` workflow → SDK query commands — status surface and register/unregister entry point.
- Phase 16 consumes this phase's output: real registered tools are the precondition for truthful agent guidance; the HARD-01 fallback ladder assumes launcher failures degrade cleanly.

</code_context>

<specifics>
## Specific Ideas

- The consent prompt and the pre-warm belong to the same moment: say yes → npx cache warms → registration writes → status confirms. Failures at any step surface immediately at install time, never mid-agent-session.
- Uniform behavior across runtimes is the theme of every conflict decision (D-13/D-14): one mental model — "oto never touches config it didn't write and can't prove it still owns."
- The transport ADR is a real artifact (MCP-02 requires it recorded before adapter code lands), first task of the phase, with remote HTTP written up as the evaluated alternative.

</specifics>

<deferred>
## Deferred Ideas

- Keyless/unauthenticated Exa tier registration (~150 calls/day) — EXA-F-01, v0.5.x+; anchored by the ADR's remote-HTTP alternative section (D-04).
- Live doctor ping (`tools/list` against the registered server) — EXA-F-02, v0.5.x+; D-10's mismatch check is static-config-only by design.
- Takeover flow for user-owned `exa` entries (convert to oto-managed with fingerprint) — rejected in D-13 for asymmetry; revisit only if uniform refusal proves annoying in practice.
- Uninstall-time prompting for drifted entries — rejected in D-14 (uninstall flows are often non-interactive).

</deferred>

---

*Phase: 15-exa-mcp-registration-all-three-runtimes*
*Context gathered: 2026-07-13*
