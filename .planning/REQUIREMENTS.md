# Requirements: oto

**Defined:** 2026-05-25
**Core Value:** Stop framework-switching — one installable framework where GSD's planning/execution workflow and Superpowers' capabilities coexist behind a single `/oto-*` command surface across Claude Code, Codex, and Gemini CLI.

## v0.4.0 Requirements

Milestone: **SDK + Dogfood**. Make oto's own command surface work natively — ship the `oto-sdk` query CLI the workflows already call, then migrate this repo onto `.oto/` so oto manages itself.

### SDK — oto-sdk query CLI

- [x] **SDK-01**: Running `oto-sdk query <key>` resolves the CLI and returns structured output instead of `command not found: oto-sdk`.
- [x] **SDK-02**: After installing oto, `oto-sdk` is callable on PATH — wired via the `package.json` bin entry (`oto-sdk` → `bin/oto-sdk.js`) and the installer's PATH-resolution check.
- [ ] **SDK-03**: The query registry answers every query key the ported workflows invoke (`init.*`, `agent-skills`, `commit`, `state.*`, `phases.*`) using oto namespaces and `.oto/` paths.
- [x] **SDK-04**: A clean GitHub-archive install yields a working `oto-sdk` with no separate manual build step (SDK prebuilt/shipped inside the package).
- [ ] **SDK-05**: Workflows that call `oto-sdk query …` consume its output when present and still degrade gracefully (manual fallback) when it is absent.

### Dogfood — planning root migration

- [ ] **DOG-01**: This repo's planning artifacts live under `.oto/` (migrated from `.planning/`), with git history of the moved files preserved.
- [ ] **DOG-02**: oto commands operate on this repo's `.oto/` state with no manual path override.
- [ ] **DOG-03**: This repo's own references to `.planning/` (CLAUDE.md, config, tooling, docs) are updated so nothing points at the stale location.

## Future Requirements (v0.5.0+)

Deferred, not in this roadmap:

- **AGNT-DEFER-01**: Restore remaining ADR-07 cut-list agents as user-facing commands require.
- Runtime parity hardening beyond install-shape smoke.
- Upstream sync UX improvements.
- Goose framework evaluation (reference parked at `~/Desktop/goose-main/`).

## Out of Scope

| Feature | Reason |
|---------|--------|
| Rewriting the SDK in a new language/architecture | Port GSD's proven `sdk/` subpackage; a rewrite multiplies surface for zero benefit |
| Dual-location shim keeping `.planning/` working in this repo after migration | Clean cutover; supporting both locations is maintenance burden against the personal-use ceiling |
| Migrating end-users' projects to `.oto/` | DOG-01 is about THIS repo dogfooding; `/oto-migrate` already exists for users and is opt-in |

## Traceability

Phases number from 11 (above the highest existing phase folder) to avoid colliding with the accumulated v0.1.0–v0.3.0 phase directories.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SDK-01 | Phase 11 | Complete |
| SDK-02 | Phase 11 | Complete |
| SDK-04 | Phase 11 | Complete |
| SDK-03 | Phase 12 | Pending |
| SDK-05 | Phase 12 | Pending |
| DOG-01 | Phase 13 | Pending |
| DOG-02 | Phase 13 | Pending |
| DOG-03 | Phase 13 | Pending |

**Phase mapping summary:**
- **Phase 11 — oto-sdk package port + PATH wiring**: SDK-01, SDK-02, SDK-04
- **Phase 12 — Query registry + workflow consumption**: SDK-03, SDK-05
- **Phase 13 — Dogfood migration to `.oto/`**: DOG-01, DOG-02, DOG-03

**Coverage:**
- v0.4.0 requirements: 8 total
- Mapped to phases: 8 ✓
- Unmapped: 0 ✓
- Duplicates: 0 ✓

---
*Requirements defined: 2026-05-25*
*Last updated: 2026-05-25 — traceability populated during v0.4.0 roadmap creation (phases 11-13)*
