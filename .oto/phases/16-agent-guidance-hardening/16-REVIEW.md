---
phase: 16-agent-guidance-hardening
reviewed: "2026-07-18T13:50:43Z"
depth: standard
review_cycle: bounded-second-cycle-after-16-09
files_reviewed: 4
files_reviewed_list:
  - bin/lib/sync-cli.cjs
  - bin/lib/sync-accept.cjs
  - tests/16-07-sync-all-provenance.test.cjs
  - docs/upstream-sync.md
findings:
  critical: 0
  warning: 1
  info: 1
  total: 2
status: issues_found
---

# Phase 16: Bounded Plan 16-09 Re-Review

**Reviewed:** 2026-07-18T13:50:43Z
**Depth:** standard
**Files Reviewed:** 4
**Status:** issues_found

## Summary

This second-cycle review was limited to the four Plan 16-09 closure files and the HARD-05 / prior WR-01 deletion-acceptance reproduction. GUID-01..05, HARD-01, HARD-03, HARD-04, resolved earlier blockers, and the developer-approved WR-02 DEFER were not reopened.

Plan 16-09 fixes the original namespaced duplicate-row defect: explicit and auto-detected Superpowers deletion acceptance now carry the selected upstream into `acceptDeletion` and mutate only the Superpowers inventory row. However, the new legacy-flat fallback does not actually restrict provenance lookup to the YAML header. A body line can be mistaken for header provenance, bypassing the required ambiguity refusal and authorizing a destructive acceptance. This remains blocking for HARD-05.

## Blocking Actionable Findings

### WR-03: Legacy-flat provenance is scanned from the entire sidecar, not its YAML header

**Classification:** BLOCKER

**File:** `bin/lib/sync-accept.cjs:72-76`

**Related coverage gap:** `tests/16-07-sync-all-provenance.test.cjs:332-348`

**Issue:** The fallback applies `/^upstream: (gsd|superpowers)$/m` directly to the complete sidecar text returned by `readSidecar`. The expression is line-anchored, but it is not bounded by the opening and closing `---` delimiters. Consequently, a legacy flat sidecar whose YAML header has no valid `upstream:` field is still treated as provenance-resolved if its Markdown body contains a line such as `upstream: superpowers`.

Fresh CLI reproduction used a flat deletion sidecar with a header containing only `kind` and `target_path`, followed by `upstream: superpowers` in the body, plus duplicate GSD-first/Superpowers inventory rows. `oto sync --accept-deletion oto/workflows/dup.md` exited 0, marked the Superpowers row `dropped_upstream`, deleted the local target, and removed the sidecar. It should have refused to guess because the YAML header supplied no provenance.

This contradicts the Plan 16-09 must-have and `docs/upstream-sync.md:97-100`, both of which define the legacy source as the sidecar's YAML header and require missing or invalid header provenance to fail loud when duplicate rows exist. It also weakens the fail-before-mutation guarantee: the command proceeds to all three mutations instead of rejecting the malformed legacy record.

**Fix:** Extract only the YAML frontmatter block (the module already has `HEADER_RE`) before inspecting `upstream`. Accept exactly one valid `upstream: gsd` or `upstream: superpowers` field from that block; treat no valid field or duplicate/conflicting fields as unresolved provenance. Preserve the unique-row compatibility fallback, but refuse duplicate inventory rows before mutation when header provenance is unresolved. Add a CLI regression where the header omits `upstream` while the body contains an exact valid-looking `upstream:` line, and assert nonzero exit plus byte-preservation of inventory, sidecar, and local target. A duplicate/conflicting-header regression would also lock the stated validation policy.

## Informational Observations

### INFO-01: The original namespaced duplicate-row defect is resolved

The selected upstream now survives namespace resolution through the deletion-acceptance dispatch, and inventory selection uses both `target_path` and `upstream`. The explicit and auto-detected Superpowers fixtures preserve the GSD row at `keep`, mark only the Superpowers row `dropped_upstream`, and retain the unselected sidecar where applicable. Ambiguous dual namespaces still fail before mutation, `--keep-deleted` remains path-level, and the scoped path-traversal guards were not weakened by the Plan 16-09 diff.

## Verification Evidence

- `node --test tests/16-07-sync-all-provenance.test.cjs tests/phase-09-accept-helper.test.cjs tests/phase-09-cli.integration.test.cjs`: 25 passed, 0 failed.
- `git diff --check 899ae93..88f2f56 -- <four scoped files>`: passed.
- `tests/phase-09-accept-helper.test.cjs` SHA-256 remained `ce4c017d0929ad14f93f206363c9967fb0fef40de7e2b59078ab60a5d106abda`.
- Fresh legacy-body provenance reproduction: failed the required refusal behavior; exit 0, Superpowers row mutated, local target deleted, and sidecar deleted.

---

_Reviewed: 2026-07-18T13:50:43Z_
_Reviewer: Codex (oto-code-reviewer)_
_Depth: standard_
