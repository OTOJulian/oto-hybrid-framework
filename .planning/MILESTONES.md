# Milestones

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
