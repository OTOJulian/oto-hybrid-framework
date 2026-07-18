# Milestones

## v0.5.0 Exa Search Integration (Shipped: 2026-07-18)

**Archive:**

- [Roadmap](milestones/v0.5.0-ROADMAP.md)
- [Requirements](milestones/v0.5.0-REQUIREMENTS.md)

**Scope:** 3 phases (14-16), 40 plans, 89 tasks, 23 requirements (SECR-01..04, MCP-01..09, GUID-01..05, HARD-01..05). 381 commits since v0.4.0 (range includes the interim v0.4.1 tag and the quick-task stream); the raw diff (+40,703/−340,134 across 1,487 files) is dominated by removing the vendored `foundation-frameworks/` snapshots — the net authored surface is the secrets/keyfile layer, three per-runtime MCP adapters, the pinned launcher hook, the shared search-guidance reference, and per-upstream sync-conflict namespacing.

**Release status:** shipped, tagged. All three phases verified; Phase 16 closed 9/9 after the dispositions-authorized WR-03 bounded fix.

**Key accomplishments:**

- Key-storage overhaul: integration API keys (Exa/Brave/Firecrawl) live only in 0600 `~/.oto` keyfiles or env vars; tracked `.oto/config.json` is boolean-only in both CJS and SDK write paths, with self-healing legacy migration, transactional/compensating secret set/clear, lock-protected migration, and a no-plaintext-in-tracked-files guard.
- Consent-gated Exa MCP registration across all three runtimes: additive merge into `~/.claude.json`, an OTO-marker `[mcp_servers.exa]` block in `~/.codex/config.toml`, and a stdio-shape `mcpServers.exa` entry in `~/.gemini/settings.json` — idempotent, fingerprint-owned, drift-safe on uninstall, never via CLI shell-outs, default-No consent persisted per runtime.
- Launcher-stdio transport (ADR-16): a shipped hook-channel launcher pins `exa-mcp-server@3.2.1` with exactly three tools (`web_search_exa`, `web_fetch_exa`, `web_search_advanced_exa`) and keeps credential bytes out of argv and runtime configuration.
- Shared agent guidance: one runtime-neutral search-tools reference (Exa → Brave → WebSearch fallback ladder, never-retry-on-429) consumed by all five search-using agents, with deprecated-tool-name guards verified against transformed Codex/Gemini output — not just source.
- Hardening to shipping standard: keyless-fallback regression floor (zero user-facing errors without a key), a live e2e proving `mcp__exa__*` tools reach a tools-restricted subagent (claude-code#13898 regression class), runtime-matrix Exa rows plus a public setup guide with qualitative rate-limit phrasing, and provenance-safe per-upstream sync-conflict namespacing.
- Per-runtime settings surface: `/oto-settings-integrations` gained masked stdin-only key set/replace/clear, six-state live MCP registration status per runtime, doctor coherence warnings, and register/unregister controls.

**Verification:**

- Phases 14-16 closed through bounded review/verification cycles (19, 12, and 9 plans including gap-closure waves); every review finding dispositioned in per-phase DISPOSITIONS files.
- Phase 16 final repository gate green; the amended SDK baseline delta shows no new persistent failures beyond the captured two-run baseline (`16-SDK-BASELINE-DELTA.txt`).
- HARD-04 live e2e passed on both keyed and keyless legs; HARD-05 `oto sync --dry-run` conflict surface recorded for both upstreams without applying upstream content.

**Known gaps at close:**

- No v0.5.0 milestone audit was run (`/oto-audit-milestone`); close proceeded on phase-level verification with developer approval (consistent with v0.3.0/v0.4.0, which also closed without separate audits).
- WR-02 planning-root fixture migration remains developer-approved DEFER — tracked debt in `16-DISPOSITIONS.md` and STATE.md pending todos; required before any future gate that needs the full SDK suite green without the amended baseline.

**Known deferred items at close:** 20 (see STATE.md Deferred Items) — 16 already-shipped quick tasks flagged only for missing STATE files, 1 stale pre-v0.4.0 debug session, 2 phases with stale CONTEXT questions, and 1 pending tooling todo (codebase-drift query still targets the removed GSD helper path).

---

## v0.4.0 SDK + Dogfood (Shipped: 2026-05-26)

**Archive:**

- [Roadmap](milestones/v0.4.0-ROADMAP.md)
- [Requirements](milestones/v0.4.0-REQUIREMENTS.md)

**Scope:** 3 phases, 12 plans, 26 tasks, 8 requirements (SDK-01..05, DOG-01..03). 70 commits since v0.3.0. The diff is dominated by the vendored `sdk/` subpackage port (~176 TypeScript source files plus prebuilt `dist/`) and the `.planning/` → `.oto/` repository rename; the net authored surface is the bin/installer PATH-wiring, the query-registry `.oto/` rewiring, the tiered-fallback policy, and the migration guards.

**Release status:** shipped, tagged. All three phases verified and security-cleared. No separate milestone audit (consistent with v0.3.0; cross-phase integration is exercised by Phase 13's dogfood verification).

**Key accomplishments:**

- Ported GSD's `sdk/` subpackage under an `oto-sdk` surface with committed prebuilt TypeScript `dist/`, parent-package bin wiring, top-level runtime dependencies, and npm packlist coverage — resolving `command not found: oto-sdk` with no manual build step.
- Wired live installer PATH-resolution for `oto-sdk` (the #2775 path) with RED/GREEN unit coverage and callability-gated readiness output; clean-install smoke now proves `oto-sdk query` resolution, JSON output, dependency resolution, and PATH-gated installer readiness.
- Rebuilt the query registry to resolve against `.oto/` paths via a dependency-free planning-root resolver mirroring the CJS contract, swept ~40 raw `.planning/` join sites, and covered it with an enumerate+fixture `.oto` smoke harness and cross-binary parity.
- Implemented the tiered SDK-fallback policy — read-only queries degrade to sensible defaults; structural/stateful operations fail fast with one clear, actionable error — enforced by `tests/sdk-fallback-policy.test.cjs`.
- Migrated this repo's planning root from `.planning/` to `.oto/` via a pure `git mv` (history preserved), flipped the `oto_state_version` ownership marker, and rewrote in-repo `.planning/` citations — a clean cutover with no dual-location shim.
- Added a durable `node:test` guard for `.oto/` self-management; live tooling probes confirm oto commands operate on `.oto/` with no path override.

**Verification:**

- All three phases: `VERIFICATION.md` `passed`, `REVIEW.md` clean/fixed, `SECURITY.md` `verified` (`threats_open: 0`). Phase 12 shipped without verification/security reports; both were backfilled at milestone close (verification 4/4 criteria, security 14/14 threats closed).
- `npm test`: 628 tests, 627 pass, 1 expected skip, 0 failures.

**Known deferred items at close:** 7 (see STATE.md Deferred Items) — all pre-v0.4.0 historical noise: 1 stale debug session (`knowledge-base`, May 5), 4 already-committed quick tasks (May 5–6), and 2 phases with stale CONTEXT questions (02, 11). Plus one follow-up flagged by Phase 12 verification: `oto/bin/lib/init.cjs:554` returns `task_dir: .planning/quick/…` (CJS-only stale leak; the SDK handler is correct) — slated for a `/oto-quick` fix.

---

## v0.3.0 Release (Shipped: 2026-05-18)

**Archive:**

- [Roadmap](milestones/v0.3.0-ROADMAP.md)
- [Requirements](milestones/v0.3.0-REQUIREMENTS.md)

**Scope:** 3 phases, 9 plans, 20 requirements (AGNT-01..03, WF-ING-01..04, WF-EVAL-01..02, CMD-01..03, INST-01..03, TEST-01..03, ADR-01, PRTY-01). 19 commits since v0.2.0; +2,455/−84 LOC across 51 core source files (excluding planning, fixtures, foundation, and node_modules).

**Release status:** shipped, tagged, all phases verified and security-cleared.

**Key accomplishments:**

- Partially reversed ADR-07 by restoring three agents — `oto-doc-classifier`, `oto-doc-synthesizer`, `oto-eval-auditor` — bringing the retained agent count to 26 and enabling both previously-deferred commands.
- Rebrand-ported the `/oto-ingest-docs` workflow (~332 LOC) with directory-and-manifest discovery, `--mode new` and `--mode merge` defaults, the 50-doc cap, and the auto-resolved / competing-variants / unresolved-blockers bucketing in `INGEST-CONFLICTS.md`.
- Rebrand-ported the `/oto-eval-review` workflow (~155 LOC) producing `EVAL-REVIEW.md` with per-dimension COVERED / PARTIAL / MISSING scoring and a remediation plan when gaps exist.
- Removed every `[deferred]` / "intentionally non-executable" marker from `/oto-ingest-docs`, `/oto-eval-review`, and `/oto-help`; regression-guarded the clean state with workflow-shape and command-deferral-absence tests.
- Locked the Codex sandbox map for the restored agents (D-04): classifier and auditor `read-only`, synthesizer `workspace-write`; encoded the locks in installer adapter, `EXPECTED_AGENTS=26`, and per-agent `.toml` parity assertions for Claude / Codex / Gemini in both install-smoke and parity integration tests.
- Authored `decisions/ADR-15-restore-doc-and-eval-agents.md` (mints D-24) — names exactly the three restored agents, enumerates the seven still-dropped agents to affirm AGNT-DEFER-01, and records the per-agent Codex sandbox locks.

**Verification:**

- All three phases: `VERIFICATION.md` status `passed`, `REVIEW.md` clean, `SECURITY.md` status `verified` (`threats_open: 0`).
- `npm test`: 613 tests, 612 pass, 1 expected skip, 0 failures.
- Per-runtime parity smoke green on Claude Code, Codex, and Gemini for both restored commands.

---

## v0.2.0 Release (Shipped: 2026-05-07)

**Archive:**

- [Roadmap](milestones/v0.2.0-ROADMAP.md)
- [Requirements](milestones/v0.2.0-REQUIREMENTS.md)
- [Milestone audit](milestones/v0.2.0-MILESTONE-AUDIT.md)

**Scope:** 2 phases, 6 plans, 32 requirements (REQ-MIG-01..10 + D-01..D-22). 76 commits since v0.1.0; +13,760/−533 LOC across 125 files.

**Release status:** shipped, tagged, audited (status: passed).

**Key accomplishments:**

- Shipped `/oto-migrate` as a project-level converter from GSD-era artifacts to oto's command surface, with dry-run by default, idempotent re-runs, half-migrated conflict detection, opt-in directory rename, and timestamped backups.
- Shipped `/oto-log` as a fire-and-forget and session-bookmarked ad-hoc work capture surface, with evidence-grounded six-section bodies, prompt-injection guardrails, immutable `.oto/logs/` entries, and `list`/`show`/`promote --to quick|todo` subcommands.
- Wired `/oto-log` into `/oto-progress` Recent Activity (interleaved with phase summaries) and `/oto-resume-work` (active-session detection).
- Brought both new commands to per-runtime parity across Claude Code, Codex, and Gemini.
- Cut interim `v0.1.1` Codex parity tag (nested `[[hooks.<Event>]]` schema + `~/.codex/skills/oto-<name>/SKILL.md` + `$oto-<name>` invocation), now superseded by `v0.2.0`.

**Verification:**

- `.oto/milestones/v0.2.0-MILESTONE-AUDIT.md` status: `passed`.
- Both phases: VERIFICATION.md `passed`, SECURITY.md `verified` (`threats_open: 0`, ASVS L1).
- `npm test`: 533 pass, 1 expected skip, 0 failures.

---

## v0.1.0 Release (Shipped: 2026-05-04)

**Archive:**

- [Roadmap](milestones/v0.1.0-ROADMAP.md)
- [Requirements](milestones/v0.1.0-REQUIREMENTS.md)
- [Milestone audit](milestones/v0.1.0-MILESTONE-AUDIT.md)

**Scope:** 10 phases, 50 plans, 100 v1 requirements.

**Release status:** shipped, tagged, and validated.

**Key accomplishments:**

- Built the Node/CommonJS `oto` package skeleton with GitHub archive install, explicit package files, hook build lifecycle, license attribution, and public documentation.
- Locked architecture through ADRs, a full upstream file inventory, an agent audit, a rename map, and schema-backed rebrand contracts.
- Shipped the typed rebrand engine with dry-run/apply/round-trip modes, coverage manifests, allowlist protections, and real-tree verification.
- Forked the installer for Claude Code, Codex, and Gemini, with copied runtime payloads, instruction markers, install-state tracking, and adapter-owned runtime behavior.
- Ported the core `/oto-*` GSD workflow spine and retained agents, then validated Claude Code daily-use stability through an end-to-end disposable MR-01 dogfood session.
- Consolidated hooks, ported seven Superpowers-derived skills under `oto:<skill>`, wired canonical agent skill calls, and shipped workstream/workspace surfaces with operator UAT.
- Brought Codex and Gemini to parity through generated instruction files, runtime transforms, per-runtime fixtures, generated runtime matrix docs, and smoke tests.
- Added the upstream sync pipeline for pull/rebrand/merge/conflict surfacing and release hardening across tests, CI, docs, command index, attribution, and clean install UAT.

**Verification:**

- `.oto/milestones/v0.1.0-MILESTONE-AUDIT.md` status: `passed`.
- `audit-open`: clear, 0 open artifacts.
- `npm test`: 418 pass, 1 expected skip, 0 failures.

---
