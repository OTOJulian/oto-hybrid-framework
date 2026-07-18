---
phase: 16-agent-guidance-hardening
reviewed: "2026-07-18T00:10:50Z"
depth: standard
files_reviewed: 8
files_reviewed_list:
  - scripts/sync-upstream/merge.cjs
  - bin/lib/sync-cli.cjs
  - tests/phase-09-cli.integration.test.cjs
  - tests/16-07-sync-all-provenance.test.cjs
  - docs/upstream-sync.md
  - oto/references/search-tools.md
  - tests/16-search-reference.test.cjs
  - tests/16-availability-coherence.test.cjs
findings:
  critical: 0
  warning: 1
  info: 0
  total: 1
status: issues_found
---

# Phase 16: Closure Code Review Report

**Reviewed:** 2026-07-18T00:10:50Z
**Depth:** standard
**Files Reviewed:** 8
**Status:** issues_found

## Summary

The review was limited to the Plan 16-07 and 16-08 closure changes. Previously passed GUID-02..05, HARD-01, HARD-03, and HARD-04 were not reopened, and the developer-approved WR-02 DEFER disposition was preserved.

The per-upstream sidecar/report layout and runtime-observable search guidance are otherwise coherent, and the focused closure suite passed. One provenance defect remains in the newly namespaced deletion-accept path: resolving the correct sidecar namespace does not carry the selected upstream into the inventory mutation, so an overlapping target can update the wrong upstream's row.

## Warnings

### WR-01: Namespaced deletion acceptance mutates the first matching inventory row, not the selected upstream row

**Classification:** BLOCKER

**File:** `bin/lib/sync-cli.cjs:247-249`

**Issue:** `resolveAcceptDir` correctly selects the GSD or Superpowers sidecar directory, but `runSync` passes only `relPath`, `otoDir`, `conflictsDir`, and `inventoryPath` to `acceptDeletion`. The accept helper consequently identifies the inventory record by `target_path` alone. When both upstreams own the same target path—the exact overlap that Plan 16-07 now supports—`--accept-deletion <path> --upstream superpowers` can mark the earlier GSD row `dropped_upstream`, leave the Superpowers row as `keep`, delete the local target, remove the Superpowers sidecar, and still exit 0.

Fresh reproduction used two inventory entries ordered GSD then Superpowers and only a Superpowers deletion sidecar. The explicit Superpowers command returned 0 with these resulting verdicts:

```text
gsd:         dropped_upstream
superpowers: keep
```

This violates the plan's claim that all three accept modes are provenance-safe and leaves durable sync metadata inconsistent with the user's explicit selection. The current closure tests cover namespace resolution only for `--accept`; they do not exercise `--accept-deletion` or `--keep-deleted` with overlapping targets.

**Fix:** Preserve the resolved upstream identity as well as the directory. Pass that identity into deletion acceptance and match the inventory entry by both `target_path` and `upstream` (with an explicit, validated legacy-flat policy). Add CLI-level regressions for auto-detected and explicitly disambiguated `--accept-deletion` cases with duplicate target paths, asserting that only the selected upstream row changes. Add the corresponding `--keep-deleted` namespace-resolution regression so all three advertised modes are locked.

## Verification Evidence

- Closure-focused Node test run: 45 passed, 0 failed, 1 skipped because `OTO_SYNC_CORPUS` was not set.
- `node scripts/check-runtime-sync.cjs`: Claude and Codex `ok`; Gemini skipped because no oto install exists.
- `git diff --check` on the eight closure files: passed.
- Direct deletion-accept reproduction: failed provenance as described in WR-01.

---

_Reviewed: 2026-07-18T00:10:50Z_
_Reviewer: Codex (oto-code-reviewer)_
_Depth: standard_
