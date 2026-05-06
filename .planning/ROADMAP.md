# Roadmap: oto

## Milestones

- [x] **v0.1.0 Release** - Phases 1-10 shipped 2026-05-04. Archive: [v0.1.0 ROADMAP](milestones/v0.1.0-ROADMAP.md), [v0.1.0 REQUIREMENTS](milestones/v0.1.0-REQUIREMENTS.md), [v0.1.0 MILESTONE AUDIT](milestones/v0.1.0-MILESTONE-AUDIT.md).

## Current Status

`oto` v0.1.0 is shipped, tagged, released, and archived.

Post-release Phase 1 is complete: `/oto-migrate` now ships as a command markdown surface and `oto-tools migrate` CLI for converting GSD-era project artifacts to the oto command surface.

The completed milestone delivered:
- Node/CommonJS package skeleton and GitHub archive install path.
- Architecture decisions, file inventory, rename map, license attribution, and rebrand engine.
- Claude/Codex/Gemini installer adapters and generated runtime instruction files.
- Ported `/oto-*` workflow spine, retained agents, hook fleet, skills, workstreams, and workspaces.
- Upstream sync pipeline, CI workflows, docs, command index, attribution checks, and clean install UAT.

## Next Step

Start the next milestone with:

```bash
$gsd-new-milestone
```

That workflow should create fresh `.planning/REQUIREMENTS.md` and expand this roadmap with the next milestone's phases.

### Phase 1: Add /oto-migrate — convert GSD-era projects to the oto surface — Complete 2026-05-05

**Goal:** Ship `/oto-migrate` (Claude command + per-runtime equivalents + `oto-tools migrate` CLI) that converts an external GSD-era user project's tracked planning artifacts and instruction-file marker blocks to oto's command surface, with dry-run by default, conflict detection, opt-in directory rename, idempotent re-runs, and a timestamped backup.
**Requirements**: REQ-MIG-01, REQ-MIG-02, REQ-MIG-03, REQ-MIG-04, REQ-MIG-05, REQ-MIG-06, REQ-MIG-07, REQ-MIG-08, REQ-MIG-09, REQ-MIG-10
**Depends on:** v0.1.0 (shipped)
**Plans:** 3 plans

Plans:
- [x] 01-01-PLAN.md — Wave 0: 10 migrate-*.test.cjs scaffolds + 2 fixture trees (RED for Wave 1 to close)
- [x] 01-02-PLAN.md — Wave 1: oto/bin/lib/migrate.cjs (detectGsdProject, dryRun, apply, main) — closes REQ-MIG-02..08
- [x] 01-03-PLAN.md — Wave 2: oto-tools dispatch case + oto/commands/oto/migrate.md — closes REQ-MIG-01, 09, 10

### Phase 2: Build /oto-log command for capturing freeform/ad-hoc work sessions as first-class tracked artifacts surfaced by /oto-progress and /oto-resume-work

**Goal:** Ship `/oto-log` (Claude command + per-runtime equivalents + `oto-tools log` CLI + public `oto log` alias) that captures ad-hoc work sessions as durable, listable, immutable artifacts in `.oto/logs/`. Hybrid capture model — fire-and-forget by default (`/oto-log <title>`) and bookmarked sessions (`/oto-log start` / `/oto-log end`). Body drafted from observable evidence (recent transcript + `git diff` + `git log` over a bounded ref) with DATA_START/DATA_END prompt-injection guardrails. Surfaces in `/oto-progress` Recent Activity and `/oto-resume-work` status panel. Supports `list`, `show <slug>`, and `promote <slug> --to quick|todo`. Entries are immutable.
**Requirements**: D-01, D-02, D-03, D-04, D-05, D-06, D-07, D-08, D-09, D-10, D-11, D-12, D-13, D-14, D-15, D-16, D-17, D-18, D-19, D-20, D-21, D-22 (CONTEXT.md decisions act as the requirement set; no REQ-LOG-* IDs in REQUIREMENTS.md for this post-v0.1.0 milestone)
**Depends on:** Phase 1
**Plans:** 3 plans

Plans:
- [ ] 02-01-PLAN.md — Wave 0: 12 log-*.test.cjs scaffolds + 4 fixture trees (RED for Wave 1+2 to close)
- [ ] 02-02-PLAN.md — Wave 1: oto/bin/lib/log.cjs library (deriveLogSlug, routeSubcommand, captureEvidence, writeLogEntry, startSession, endSession, listLogs, showLog, promoteLog, main) — closes D-01, D-02, D-06, D-07, D-08, D-09, D-10, D-11, D-12, D-18, D-19, D-20, D-21
- [ ] 02-03-PLAN.md — Wave 2: oto-tools log dispatch + public oto log dispatch + oto/commands/oto/log.md + progress.md Recent Activity edit + resume-project.md active-session.json check + .gitignore entry — closes D-03, D-04, D-05, D-13, D-14, D-15, D-16, D-17, D-22
