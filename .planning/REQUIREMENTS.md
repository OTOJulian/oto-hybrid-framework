# Requirements: oto

**Defined:** 2026-05-25
**Core Value:** Stop framework-switching — one installable framework where GSD's planning/execution workflow and Superpowers' capabilities coexist behind a single `/oto-*` command surface across Claude Code, Codex, and Gemini CLI.

## v0.4.0 Requirements

Milestone: **SDK + Dogfood**. Make oto's own command surface work natively — ship the `oto-sdk` query CLI the workflows already call, then migrate this repo onto `.oto/` so oto manages itself.

### SDK — oto-sdk query CLI

- [ ] **SDK-01**: Running `oto-sdk query <key>` resolves the CLI and returns structured output instead of `command not found: oto-sdk`.
- [ ] **SDK-02**: After installing oto, `oto-sdk` is callable on PATH — wired via the `package.json` bin entry (`oto-sdk` → `bin/oto-sdk.js`) and the installer's PATH-resolution check.
- [ ] **SDK-03**: The query registry answers every query key the ported workflows invoke (`init.*`, `agent-skills`, `commit`, `state.*`, `phases.*`) using oto namespaces and `.oto/` paths.
- [ ] **SDK-04**: A clean GitHub-archive install yields a working `oto-sdk` with no separate manual build step (SDK prebuilt/shipped inside the package).
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

Populated during roadmap creation (phases number from 11).

| Requirement | Phase | Status |
|-------------|-------|--------|
| SDK-01 | TBD | Pending |
| SDK-02 | TBD | Pending |
| SDK-03 | TBD | Pending |
| SDK-04 | TBD | Pending |
| SDK-05 | TBD | Pending |
| DOG-01 | TBD | Pending |
| DOG-02 | TBD | Pending |
| DOG-03 | TBD | Pending |

**Coverage:**
- v0.4.0 requirements: 8 total
- Mapped to phases: 0 (pending roadmapper)
- Unmapped: 8 ⚠️

---
*Requirements defined: 2026-05-25*
*Last updated: 2026-05-25 after v0.4.0 milestone start*
