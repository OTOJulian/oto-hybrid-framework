---
gsd_state_version: 1.0
milestone: v0.4.0
milestone_name: SDK + Dogfood
status: executing
stopped_at: Phase 13 context gathered
last_updated: "2026-05-26T04:53:36.710Z"
last_activity: 2026-05-26 -- Phase 13 execution started
progress:
  total_phases: 3
  completed_phases: 2
  total_plans: 12
  completed_plans: 8
  percent: 67
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-25)

**Core value:** Stop framework-switching - one installable framework where GSD's planning/execution workflow and Superpowers' capabilities coexist behind a single, consistent `/oto-*` command surface across Claude Code, Codex, and Gemini CLI.

**Current focus:** Phase 13 — dogfood-migration-to-oto

## Current Position

Phase: 13 (dogfood-migration-to-oto) — EXECUTING
Plan: 1 of 4
Status: Executing Phase 13
Last activity: 2026-05-26 -- Phase 13 execution started

Archive (prior milestones):

- `.planning/milestones/v0.3.0-ROADMAP.md`
- `.planning/milestones/v0.3.0-REQUIREMENTS.md`
- `.planning/milestones/v0.2.0-ROADMAP.md`
- `.planning/milestones/v0.2.0-REQUIREMENTS.md`
- `.planning/milestones/v0.2.0-MILESTONE-AUDIT.md`
- `.planning/milestones/v0.1.0-ROADMAP.md`
- `.planning/milestones/v0.1.0-REQUIREMENTS.md`
- `.planning/milestones/v0.1.0-MILESTONE-AUDIT.md`

## Last Verified

- v0.3.0 archived on 2026-05-18: ROADMAP and REQUIREMENTS archived to `.planning/milestones/v0.3.0-*`, MILESTONES.md updated, PROJECT.md evolved, RETROSPECTIVE.md updated, tag `v0.3.0` created.
- Phase 1 verification passed on 2026-05-18: `01-VERIFICATION.md` status `passed`, `01-REVIEW.md` status `clean`, `01-SECURITY.md` status `passed`.
- Phase 2 verification passed on 2026-05-18: `02-VERIFICATION.md` status `passed`, `02-REVIEW.md` status `clean`, `02-SECURITY.md` threats open `0`.
- Phase 3 verification passed on 2026-05-18: `03-VERIFICATION.md` status `passed`, `03-REVIEW.md` status `clean`, `03-SECURITY.md` status `verified` with `threats_open: 0`.
- `npm test` passed on 2026-05-18: 612 pass, 1 expected skip, 0 failures.

## Next Command

```bash
/oto-verify-work 12
```

Verify Phase 12: confirm the query registry, `.oto/` fixture parity, and tiered workflow fallback behavior before Phase 13 dogfood migration.

## Accumulated Context

### Roadmap Evolution

- 2026-05-18: v0.3.0 roadmap created. Phases derived from natural dependency chain: agents (foundation) → workflows + commands (consumer) → tests + parity + ADR-15 (closure). 20/20 requirements mapped.
- 2026-05-18: Phase 1 completed. The retained agent set is now 26 agents; Phase 2 is ready to plan.
- 2026-05-18: Phase 2 completed. `/oto-ingest-docs` and `/oto-eval-review` now have executable workflow bodies, deferral framing is regression-guarded away, and workflow-shape/fixture tests lock the Phase 2 contracts. Phase 3 is ready to plan after `/oto-secure-phase 2`.
- 2026-05-18: Phase 3 planned. 4 PLAN.md files written in `.planning/phases/03-tests-install-smoke-parity-adr-15/` across 2 waves (Wave 1: 03-01 tests authoring + 03-02 install-smoke; Wave 1b: 03-03 per-runtime parity sequenced after 03-02; Wave 2: 03-04 ADR-15). Plan checker passed iteration 2; all 6 phase requirements (TEST-01..03, INST-03, PRTY-01, ADR-01) covered. RESEARCH and VALIDATION (nyquist_compliant: true) drafted.
- 2026-05-18: Phase 3 completed. Tests, install-smoke, Codex/Gemini parity, and ADR-15 landed across 4 scoped commits. `03-VERIFICATION.md` passed 6/6 success criteria, `03-SECURITY.md` verified 16/16 threats closed with `threats_open: 0`, and `npm test` passed with 613 tests, 612 pass, 1 skip, 0 failures. v0.3.0 is ready for milestone completion.
- 2026-05-18: v0.3.0 archived and tagged. ROADMAP and REQUIREMENTS archived to `.planning/milestones/v0.3.0-*`; MILESTONES.md, PROJECT.md, RETROSPECTIVE.md updated; tag `v0.3.0` cut. Between milestones.
- 2026-05-25: v0.4.0 roadmap created. Phases derived from the SDK-before-DOG sequencing constraint: Phase 11 ports GSD's `sdk/` subpackage and wires the `oto-sdk` binary onto PATH (SDK-01, SDK-02, SDK-04); Phase 12 rebuilds the query registry for oto namespaces/`.oto/` paths and wires graceful workflow consumption (SDK-03, SDK-05); Phase 13 migrates this repo to `.oto/` (DOG-01..03), depending on the SDK so the new location has working tooling. 8/8 requirements mapped, no orphans, no duplicates. Phases number from 11 to avoid collision with the leftover v0.1.0–v0.3.0 phase directories (highest existing folder is 10); existing phase folders are not renamed, moved, or deleted.
- 2026-05-25: Phase 11 implementation completed across 4 plans. `scripts/install-smoke.cjs` now gates clean installs on `oto-sdk` executable linkage, structured `generate-slug` output, `.planning`-backed `roadmap.analyze` JSON, absence of `ERR_MODULE_NOT_FOUND`, and PATH-gated `OTO SDK ready` installer output. A local tarball clean-install smoke passed for the current commits; direct GitHub archive smoke awaits the commits being available remotely.
- 2026-05-26: Phase 12 implementation completed across 4 plans. The SDK query registry now resolves through the `.oto` planning-root resolver, workflow-invoked raw `.planning` joins were swept, an enumerate+fixture `.oto` smoke harness covers registered workflow query keys, representative workflows enforce the tiered SDK fallback policy, and manual Task 4 parity confirmed repo-local `oto-sdk` and CJS `oto-tools.cjs` return equivalent state snapshots against a throwaway `.oto` project.

### Decisions

- Phase 1 partially reverses ADR-07 only for `oto-doc-classifier`, `oto-doc-synthesizer`, and `oto-eval-auditor`; the rest of the ADR-07 dropped-agent set remains deferred until a future milestone.
- Codex sandbox locks for restored agents: classifier and eval auditor are `read-only`; doc synthesizer is `workspace-write`.
- v0.4.0 numbers phases from 11 (above the highest existing phase folder, 10) so new phase directories never collide with the accumulated v0.1.0–v0.3.0 folders; do not rename/move/delete existing phase directories.
- v0.4.0 SDK is a PORT of GSD's existing `sdk/` subpackage, not a greenfield build; the installer already carries the `oto-sdk` PATH-wiring (#2775 path) expecting a `bin/oto-sdk.js` shim and `package.json` bin entry.
- Dogfood migration (Phase 13) is a clean cutover to `.oto/` — no dual-location shim keeping `.planning/` working (per REQUIREMENTS Out of Scope).
- Plan 11-01 ported the full upstream GSD SDK subtree rather than trimming to query-only.
- Plan 11-01 kept internal GSD SDK identifiers unchanged while rebranding package, bin, and user-facing CLI strings to oto-sdk.
- Plan 11-01 committed the generated sdk/package-lock.json as SDK package metadata.
- Plan 11-01 committed sdk/dist as a one-time author build and did not add any install-time SDK build.
- Plan 11-02 declared SDK runtime dependencies at the top level so sdk/dist imports resolve by Node's upward node_modules walk.
- Plan 11-02 added top-level package-lock.json because oto now has runtime dependencies.
- Plan 11-02 used an empty verification commit for the read-only npm pack assertion task.
- Plan 11-03 ports #2775 SDK PATH-wiring into the live installer as a once-per-invocation post-install step.
- Plan 11-04 uses `roadmap.analyze` as the `.planning`-backed SDK smoke key and keeps Phase 12 `.oto` registry rewiring out of scope.
- Plan 12-01 keeps planning-root resolution in sdk/src/planning-root.ts as a node-builtin-only leaf module and re-exports it from query helpers to avoid helpers/workstream-utils cycles.
- Phase 12 Plan 02 preserved the resolver contract: unmarked .planning roots remain GSD-era and default to .oto; Plan 12-04 .oto fixture smoke is the new parity proof.
- Preserve the Phase 12 resolver contract: unmarked .planning roots remain GSD-era and default to .oto.
- Plan 12-04 verifies `.oto/` parity through an in-process enumerate+fixture smoke plus a manual cross-binary check, not by marking this repo's `.planning/STATE.md` as migrated.
- SDK-05 fallback is tiered: read-only query calls degrade to sensible defaults, while structural/stateful calls hard-require `oto-sdk` and fail fast with one clear error.
- D-04 confirms the CJS layer remains correct-by-design; no CJS rework is part of Phase 12.

### Execution Metrics

| Phase | Plan | Duration | Tasks | Files |
|-------|------|----------|-------|-------|
| 11 | 01 | 8min | 3 | 533 |
| 11 | 02 | 6min | 3 | 3 |
| 11 | 03 | 7min | 2 | 4 |
| 11 | 04 | 4min | 2 | 3 |
| 12 | 01 | 3min | 2 | 3 |
| 12 | 02 | 18min | 3 | 22 |
| 12 | 04 | 36m | 4 | 13 |

### Last Session

- **Stopped At:** Phase 13 context gathered
- **Resume File:** .planning/phases/13-dogfood-migration-to-oto/13-CONTEXT.md

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260505-bxx | Port GSD's Codex command-to-skill adapter into oto's installer (Codex `$oto-*` invocation parity) | 2026-05-05 | f56522c | [260505-bxx-port-gsds-codex-command-to-skill-adapter](./quick/260505-bxx-port-gsds-codex-command-to-skill-adapter/) |
| 260505-cxx | Exclude runtime agent worktrees from `/oto-migrate` dry-run and apply scope | 2026-05-05 | 69f8969 | [260505-cxx-exclude-runtime-worktrees-from-migrate](./quick/260505-cxx-exclude-runtime-worktrees-from-migrate/) |
| 260506-axx | Expose `/oto:migrate` through the public `oto migrate` CLI path | 2026-05-06 | df7aba5 | [260506-axx-expose-migrate-through-public-cli](./quick/260506-axx-expose-migrate-through-public-cli/) |
| 260506-bxx | Skip untracked gitignored generated artifacts during `/oto-migrate` | 2026-05-06 | 4230d59 | [260506-bxx-skip-gitignored-migrate-artifacts](./quick/260506-bxx-skip-gitignored-migrate-artifacts/) |
