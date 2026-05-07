# Milestones

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
- `.planning/milestones/v0.2.0-MILESTONE-AUDIT.md` status: `passed`.
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
- `.planning/milestones/v0.1.0-MILESTONE-AUDIT.md` status: `passed`.
- `audit-open`: clear, 0 open artifacts.
- `npm test`: 418 pass, 1 expected skip, 0 failures.

---
