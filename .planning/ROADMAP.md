# Roadmap: oto

## Milestones

- [x] **v0.1.0 Release** - Phases 1-10 shipped 2026-05-04. Archive: [v0.1.0 ROADMAP](milestones/v0.1.0-ROADMAP.md), [v0.1.0 REQUIREMENTS](milestones/v0.1.0-REQUIREMENTS.md), [v0.1.0 MILESTONE AUDIT](milestones/v0.1.0-MILESTONE-AUDIT.md).

## Current Status

`oto` v0.1.0 is shipped, tagged, released, and archived.

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

### Phase 1: Add /oto-migrate — convert GSD-era projects to the oto surface

**Goal:** Ship `/oto-migrate` (Claude command + per-runtime equivalents + `oto-tools migrate` CLI) that converts an external GSD-era user project's tracked planning artifacts and instruction-file marker blocks to oto's command surface, with dry-run by default, conflict detection, opt-in directory rename, idempotent re-runs, and a timestamped backup.
**Requirements**: REQ-MIG-01, REQ-MIG-02, REQ-MIG-03, REQ-MIG-04, REQ-MIG-05, REQ-MIG-06, REQ-MIG-07, REQ-MIG-08, REQ-MIG-09, REQ-MIG-10
**Depends on:** v0.1.0 (shipped)
**Plans:** 3 plans

Plans:
- [ ] 01-01-PLAN.md — Wave 0: 10 migrate-*.test.cjs scaffolds + 2 fixture trees (RED for Wave 1 to close)
- [ ] 01-02-PLAN.md — Wave 1: oto/bin/lib/migrate.cjs (detectGsdProject, dryRun, apply, main) — closes REQ-MIG-02..08
- [ ] 01-03-PLAN.md — Wave 2: oto-tools dispatch case + oto/commands/oto/migrate.md — closes REQ-MIG-01, 09, 10
