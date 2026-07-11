---
project: oto
status: active
milestone: v0.5.0
milestone_name: Exa Search Integration
last_shipped: v0.4.0
last_shipped_date: 2026-05-26
---

# Roadmap: oto

## Milestones

- ✅ **v0.1.0 Foundation Release** — Phases 1-10 (shipped 2026-05-04)
- ✅ **v0.2.0 Post-Release Commands** — Phases 1-2 (shipped 2026-05-07)
- ✅ **v0.3.0 Restore Doc-Intake and Eval-Review Agents** — Phases 1-3 (shipped 2026-05-18)
- ✅ **v0.4.0 SDK + Dogfood** — Phases 11-13 (shipped 2026-05-26)
- 🚧 **v0.5.0 Exa Search Integration** — Phases 14-16 (in progress)

## Phases

**Phase Numbering:**
- Integer phases (14, 15, 16): Planned v0.5.0 milestone work — numbering continues above the highest existing phase folder (13). Existing phase directories are never renamed, moved, or deleted.
- Decimal phases (e.g., 14.1): Urgent insertions (marked with INSERTED)

### 🚧 v0.5.0 Exa Search Integration (In Progress)

**Milestone Goal:** Activate and finish oto's latent Exa integration so research-heavy agents use semantic search with inline content across all three runtimes — per-runtime MCP registration, a fixed key-storage story, extended agent guidance, and shipping-standard tests/matrix/docs.

- [ ] **Phase 14: Key Storage Reconciliation** - Integration API keys live only in the 0600 keyfile or env var; committed config holds booleans only, enforced in both write paths with self-healing migration
- [ ] **Phase 15: Exa MCP Registration (All Three Runtimes)** - Consent-gated, idempotent, fingerprint-tracked `exa` server registration in Claude Code, Codex, and Gemini via oto's adapters, with round-trip test coverage
- [ ] **Phase 16: Agent Guidance + Hardening** - Shared runtime-neutral search guidance consumed by five agents, fallback regression floor, subagent e2e check, runtime-matrix row, docs, and sync hygiene

<details>
<summary>✅ v0.4.0 SDK + Dogfood (Phases 11-13) — SHIPPED 2026-05-26</summary>

- [x] Phase 11: oto-sdk package port + PATH wiring (4/4 plans) — completed 2026-05-25
- [x] Phase 12: Query registry + workflow consumption (4/4 plans) — completed 2026-05-26
- [x] Phase 13: Dogfood migration to `.oto/` (4/4 plans) — completed 2026-05-26

Full details: [milestones/v0.4.0-ROADMAP.md](milestones/v0.4.0-ROADMAP.md)

</details>

<details>
<summary>✅ v0.3.0 Restore doc-intake and eval-review agents (Phases 1-3) — SHIPPED 2026-05-18</summary>

- [x] Phase 1: Agent ports + installer wiring (2/2 plans) — completed 2026-05-18
- [x] Phase 2: Workflow rebrand-ports + command de-deferral (3/3 plans) — completed 2026-05-18
- [x] Phase 3: Tests, install-smoke, parity, ADR-15 (4/4 plans) — completed 2026-05-18

Full details: [milestones/v0.3.0-ROADMAP.md](milestones/v0.3.0-ROADMAP.md)

</details>

<details>
<summary>✅ v0.2.0 Post-release commands (Phases 1-2) — SHIPPED 2026-05-07</summary>

- [x] Phase 1: `/oto-migrate` (3/3 plans)
- [x] Phase 2: `/oto-log` (3/3 plans)

Full details: [milestones/v0.2.0-ROADMAP.md](milestones/v0.2.0-ROADMAP.md)

</details>

<details>
<summary>✅ v0.1.0 Foundation release (Phases 1-10) — SHIPPED 2026-05-04</summary>

- [x] Phase 1: Inventory + architecture decisions
- [x] Phase 2: Rebrand engine + distribution skeleton
- [x] Phase 3: Installer fork — Claude adapter
- [x] Phase 4: Core workflows + agents port
- [x] Phase 5: Hooks port + consolidation
- [x] Phase 6: Skills port + cross-system integration
- [x] Phase 7: Workstreams + workspaces port
- [x] Phase 8: Codex + Gemini runtime parity
- [x] Phase 9: Upstream sync pipeline
- [x] Phase 10: Tests + CI + docs + v0.1.0 release

Full details: [milestones/v0.1.0-ROADMAP.md](milestones/v0.1.0-ROADMAP.md)

</details>

## Phase Details

### Phase 14: Key Storage Reconciliation
**Goal**: Integration API keys live only in `~/.oto/<integration>_api_key` (mode 0600) or env vars; committed `.oto/config.json` holds booleans only — enforced in both write paths, with self-healing migration for legacy string values
**Depends on**: Nothing (first v0.5.0 phase; builds on shipped v0.4.0 surface)
**Requirements**: SECR-01, SECR-02, SECR-03, SECR-04
**Success Criteria** (what must be TRUE):
  1. Setting an Exa API key through `/oto-settings-integrations` writes it to `~/.oto/exa_api_key` (mode 0600) via stdin (never argv), and `.oto/config.json` ends up with `"exa_search": true` — no key material in any tracked file
  2. A string value written to `exa_search`, `brave_search`, or `firecrawl` through either write path (SDK `config-mutation.ts` or CJS `config.cjs`) is rejected with a clear error
  3. A legacy API-key string found in `.oto/config.json` is self-heal migrated to the keyfile with a boolean left in its place — including this repo's own config
  4. User can set, replace, and clear each integration key via `/oto-settings-integrations`, and status displays are masked (`****<last-4>`)
**Plans**: 9 plans (4 original + 5 gap-closure)

Plans:
- [x] 14-01-PLAN.md — CJS layer: keyfile CRUD/migration/validation in secrets.cjs, boolean-only rejection + self-heal hooks in config.cjs/core.cjs
- [x] 14-02-PLAN.md — SDK layer: secrets.ts mirror, D-08 `~/.gsd/`→`~/.oto/` fix, boolean validation in configSet, migration hooks in both SDK read paths
- [x] 14-03-PLAN.md — SDK secret-set/clear/status commands (stdin/TTY entry, masked status), registry wiring, sdk/dist rebuild + live smoke
- [x] 14-04-PLAN.md — /oto-settings-integrations rewrite (`!`-prefix secret-set flow), D-04 no-plaintext guard test, human-verify checkpoint
- [x] 14-05-PLAN.md — Gap closure: validate merged config-new-project integration values in both write paths (CR-01)
- [x] 14-06-PLAN.md — Gap closure: transactional secret set/clear with preflight + compensating rollback (CR-03)
- [x] 14-07-PLAN.md — Gap closure: CJS migrate-before-overwrite in config-set, root-layer migration + loader scrub in core.cjs (CR-04)
- [x] 14-08-PLAN.md — Gap closure: SDK fail-closed config-get, root-fallback migration, configSet previousValue scrub + single sdk/dist rebuild (CR-02, CR-04)
- [x] 14-09-PLAN.md — Gap closure: fix workflow entry command + workstream threading, correct command wrapper, e2e workflow contract test

Notes: Research flags this phase as standard-pattern (skip research-phase) — all four sites of the dual-typing defect are pinpointed with line numbers. Scope decision from research: fix all three integrations (`exa_search`, `brave_search`, `firecrawl`) with the shared mechanism, not just Exa. Sync hygiene applies: keep shared-file diffs (`config.cjs`, `secrets.cjs`, `settings-integrations.md`) small and commented.

### Phase 15: Exa MCP Registration (All Three Runtimes)
**Goal**: With explicit user consent and a detected key, the Exa MCP server is registered as `exa` in Claude Code, Codex, and Gemini through oto's adapter machinery — idempotent, fingerprint-tracked, and cleanly removable on uninstall
**Depends on**: Phase 14 (registration reads the keyfile/detect helper Phase 14 makes real)
**Requirements**: MCP-01, MCP-02, MCP-03, MCP-04, MCP-05, MCP-06, MCP-07, MCP-08, MCP-09, HARD-02
**Success Criteria** (what must be TRUE):
  1. Nothing registers without explicit consent (default No) or without a detected key, and the transport/auth decision (launcher-stdio vs remote HTTP) is recorded as an ADR before adapter code lands
  2. After consent, `exa` appears in `~/.claude.json` (additive JSON merge), `~/.codex/config.toml` (OTO-marker `[mcp_servers.exa]` block that refuses to write when an external duplicate exists), and `~/.gemini/settings.json` (transport shape avoiding the `url`-vs-`httpUrl` SSE trap) — never via CLI shell-outs
  3. The registration exposes exactly `web_search_exa`, `web_fetch_exa`, and `web_search_advanced_exa`, and re-running install or registration never duplicates entries
  4. Uninstall removes only oto-fingerprinted registrations, skipping and reporting user-owned `exa` entries; `/oto-settings-integrations` summary shows per-runtime registration status (claude / codex / gemini)
  5. `npm test` includes passing `node:test` coverage for adapter merge/unmerge round-trips, boolean config validation, and the no-plaintext-key-in-tracked-files guard (all three HARD-02 test families)
**Plans**: TBD

Notes: HARD-02's boolean-validation and no-plaintext-guard test families naturally land alongside Phase 14's code; the requirement completes here with the adapter round-trip family (research's hard gate against Codex TOML corruption). Research flags for planning-time verification: `CLAUDE_CONFIG_DIR` → `~/.claude.json` resolution behavior, and the transport ADR (research recommends launcher-stdio `oto/hooks/oto-exa-mcp.js` for uniform secret indirection, remote HTTP as the documented alternative). All installer changes go in the live `bin/lib/` installer, not the vestigial `oto/bin/install.js`.

### Phase 16: Agent Guidance + Hardening
**Goal**: Search-using agents consume one shared, runtime-neutral guidance surface for the now-real Exa tools, and the integration ships to oto's standard — fallback regression floor, subagent e2e check, runtime-matrix row, docs, and upstream-sync hygiene
**Depends on**: Phase 15 (guidance is only truthful once tools exist at runtime)
**Requirements**: GUID-01, GUID-02, GUID-03, GUID-04, GUID-05, HARD-01, HARD-03, HARD-04, HARD-05
**Success Criteria** (what must be TRUE):
  1. A single shared runtime-neutral search-tools reference (Exa → Brave → WebSearch fallback ladder, never-retry-on-429 rule) is consumed by `oto-phase-researcher`, `oto-project-researcher`, `oto-ui-researcher`, `oto-debugger`, and `oto-advisor-researcher` — guidance drift between them is gone, and debugger/advisor carry `mcp__exa__*` frontmatter
  2. No deprecated Exa tool names (`crawling_exa`, `get_code_context_exa`, `deep_researcher_*`, etc.) appear in any shipped agent or reference, verified against transformed Codex/Gemini output — not just source
  3. With no key or server present, research flows complete with zero user-facing errors via the Brave/WebSearch fallback (regression floor holds)
  4. An end-to-end check proves `mcp__exa__*` tools reach a tools-restricted subagent (guards the claude-code#13898 regression class)
  5. The generated runtime matrix has an Exa MCP row per runtime, docs cover setup with qualitative (not hard-coded) rate-limit phrasing, and `oto sync --dry-run` passes the conflict-surface check at milestone close
**Plans**: TBD

Notes: Consolidate the shared reference BEFORE extending guidance to new agents (the three researchers already disagree with each other). Light research flag: re-verify Exa free-tier limits at docs-writing time; phrase qualitatively. Verify Codex/Gemini MCP tool naming empirically against transformed agent output.

## Progress

**Execution Order:**
Phases execute in numeric order: 14 → 15 → 16 (decimal insertions, if any, between their surrounding integers)

| Phase | Milestone | Plans Complete | Status | Completed |
| --- | --- | --- | --- | --- |
| 1–10 (Foundation set) | v0.1.0 | 50/50 | Complete | 2026-05-04 |
| 1. `/oto-migrate` | v0.2.0 | 3/3 | Complete | 2026-05-07 |
| 2. `/oto-log` | v0.2.0 | 3/3 | Complete | 2026-05-07 |
| 1. Agent ports + installer wiring | v0.3.0 | 2/2 | Complete | 2026-05-18 |
| 2. Workflow rebrand-ports + command de-deferral | v0.3.0 | 3/3 | Complete | 2026-05-18 |
| 3. Tests, install-smoke, parity, ADR-15 | v0.3.0 | 4/4 | Complete | 2026-05-18 |
| 11. oto-sdk package port + PATH wiring | v0.4.0 | 4/4 | Complete | 2026-05-25 |
| 12. Query registry + workflow consumption | v0.4.0 | 4/4 | Complete | 2026-05-26 |
| 13. Dogfood migration to `.oto/` | v0.4.0 | 4/4 | Complete | 2026-05-26 |
| 14. Key Storage Reconciliation | v0.5.0 | 9/9 | Complete   | 2026-07-11 |
| 15. Exa MCP Registration (All Three Runtimes) | v0.5.0 | 0/TBD | Not started | - |
| 16. Agent Guidance + Hardening | v0.5.0 | 0/TBD | Not started | - |

---

_For prior milestone archives, see `.oto/milestones/`._
