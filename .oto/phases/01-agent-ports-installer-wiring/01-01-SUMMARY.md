---
phase: 01-agent-ports-installer-wiring
plan: 01
subsystem: agents
tags: [rebrand-engine, agents, inventory, coverage-manifest]
requires:
  - phase: v0.2.0
    provides: shipped rebrand engine and retained agent payload baseline
provides:
  - Rebrand-ported doc classifier, doc synthesizer, and eval auditor agents
  - Updated inventory and agent audit counts for the v0.3.0 retained set
  - Coverage manifests that include the restored upstream and target agent paths
affects: [phase-01, phase-02, phase-03, ingest-docs, eval-review]
tech-stack:
  added: []
  patterns: [inventory-driven agent restore, rebrand-engine generated payload, semantic tool-list reconciliation]
key-files:
  created:
    - oto/agents/oto-doc-classifier.md
    - oto/agents/oto-doc-synthesizer.md
    - oto/agents/oto-eval-auditor.md
  modified:
    - decisions/file-inventory.json
    - decisions/agent-audit.md
    - reports/rebrand-dryrun.json
    - reports/rebrand-dryrun.md
key-decisions:
  - "Restored exactly the three v0.3.0 agents and left the rest of ADR-07's dropped set deferred."
  - "Dropped Write from classifier and auditor tools lines to honor read-only sandbox assignments; synthesizer keeps Write."
patterns-established:
  - "Use the Phase 4-era rebrand invocation with target foundation-frameworks/get-shit-done-main when writing shipped payload under oto/."
requirements-completed: [AGNT-01, AGNT-02, AGNT-03]
duration: 45min
completed: 2026-05-18
---

# Phase 01 Plan 01 Summary

**Doc-intake and eval-review agent files are restored through the rebrand pipeline with corrected read/write tool contracts.**

## Performance

- **Duration:** 45 min
- **Completed:** 2026-05-18
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- Flipped `gsd-doc-classifier`, `gsd-doc-synthesizer`, and `gsd-eval-auditor` inventory rows from DROP to KEEP with v0.3.0 Phase 1 ownership.
- Updated `decisions/agent-audit.md` to `KEEP: 26` / `DROP: 7` and moved the three restored agents into the phase-spine retained set.
- Generated the three `oto/agents/` files from upstream GSD sources, then reconciled the classifier and auditor tools lines to read-only-compatible forms.
- Regenerated rebrand reports against `foundation-frameworks/get-shit-done-main`; coverage manifests include the restored GSD source paths and OTO target paths.

## Files Created/Modified

- `oto/agents/oto-doc-classifier.md` - Rebrand-ported classifier agent with `tools: Read, Grep, Glob`.
- `oto/agents/oto-doc-synthesizer.md` - Rebrand-ported synthesizer agent with `tools: Read, Write, Grep, Glob, Bash`.
- `oto/agents/oto-eval-auditor.md` - Rebrand-ported eval auditor agent with `tools: Read, Bash, Grep, Glob`.
- `decisions/file-inventory.json` - Three restored agent rows now keep with target paths.
- `decisions/agent-audit.md` - Retained/dropped counts and per-agent rationales updated.
- `reports/rebrand-dryrun.json` / `reports/rebrand-dryrun.md` - Regenerated from the correct GSD target root.

## Deviations from Plan

### Auto-fixed Issues

**1. Corrected the rebrand invocation target**
- **Issue:** The plan's `npm run rebrand` shorthand writes the scratch `.oto-rebrand-out/` tree from `foundation-frameworks/`; it does not create shipped files in `oto/agents/`.
- **Fix:** Verified the correct Phase 4-era invocation in a temp output, then used `node scripts/rebrand.cjs --apply --target foundation-frameworks/get-shit-done-main --out oto/ --force --owner OTOJulian`.
- **Verification:** New agent files appeared under `oto/agents/`; unrelated bulk rewrites caused by the broad apply were restored before proceeding.

**2. Reconciled read-only agent behavior beyond the tools line**
- **Issue:** The raw rebrand output dropped `Write` from classifier/auditor tools lines, but their body text still instructed them to write files directly and still referenced `.planning/` paths.
- **Fix:** Updated the classifier to return a JSON classification record for orchestrator persistence, updated the eval auditor to return an `EVAL-REVIEW.md` draft for orchestrator persistence, and replaced restored-agent `.planning/` paths with `.oto/` paths.
- **Verification:** `rg` found no `.planning`, `gsd-`, `/gsd-`, or upstream identity strings in the three restored agents; focused frontmatter and dropped-agent leak tests passed.

## Issues Encountered

- The bulk rebrand apply initially rewrote unrelated tracked `oto/` files. Those accidental rewrites were restored; only the three new agent files remain from the payload generation.
- `reports/rebrand-dryrun.*` records upstream source paths, while `coverage-manifest.post.json` records target paths. The target-path coverage check used the coverage manifest, not the dry-run table.

## Verification

- Inventory node check printed `inventory OK`.
- Frontmatter gate passed for names, colors, and D-04 tools lines.
- `reports/coverage-manifest.pre.json` contains the three `gsd-*` source paths and `reports/coverage-manifest.post.json` contains the three `oto-*` target paths.
- `node --test tests/phase-04-frontmatter-schema.test.cjs tests/phase-04-no-dropped-agents.test.cjs tests/phase-08-codex-install-wiring.test.cjs` passed after read-only behavior reconciliation.

## Next Phase Readiness

Plan 02 can wire the restored agents into Codex sandbox maps and run per-runtime install smoke.

## Self-Check: PASSED

All Plan 01 must-have artifacts exist and the restored agents have the expected frontmatter contracts.

---
*Phase: 01-agent-ports-installer-wiring*
*Completed: 2026-05-18*
