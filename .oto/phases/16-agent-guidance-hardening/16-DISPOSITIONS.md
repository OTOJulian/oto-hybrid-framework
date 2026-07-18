---
phase: 16-agent-guidance-hardening
status: resolved
updated: "2026-07-18"
decision: wr03_fix_verified_wr02_defer
---

# Phase 16 Developer-Approved Dispositions

## WR-02 SDK Planning-Root Fixture Debt

| ID | Source | Disposition | Result | Evidence |
|---|---|---|---|---|
| WR-02 | `.oto/phases/15-exa-mcp-registration-all-three-runtimes/15-DISPOSITIONS.md` | **DEFER** | **TRACKED DEBT** | The current full-SDK failure set is compared against the amended Plan 14-16 two-run union in `16-SDK-BASELINE-DELTA.txt`. The only approved baseline increase is `src/golden/read-only-parity.integration.test.ts` from 19 to 21 failures. |

The developer approved this disposition on 2026-07-17. The +2 baseline amendment covers exactly the `list.todos` and `todo.match-phase` parity failures caused by the tracked planning-root divergence: legacy CJS scans `.planning`, while the SDK reads the real `.oto/todos`. Pre-Phase-16 commit `e4c661b` exposed the divergence by adding a pending todo; `16-SDK-BASELINE-DELTA.txt` records the causal proof that Phase 16 production changes did not create it.

The two todo golden rows remain unchanged, failing, and counted. The baseline amendment is not a claim that the full SDK suite is green; it permits only a baseline-relative `NO NEW FAILURES: PASS` when every current failing file and count remains within the amended union.

No planning-root migration is authorized inside Plan 16-06. That migration remains a separately planned, bounded work item and must be scheduled before milestone close if the milestone hard gates require the full SDK suite to be green.

## WR-03 Legacy-Flat Provenance Boundary

| ID | Source | Disposition | Result | Evidence |
|---|---|---|---|---|
| WR-03 | `16-REVIEW.md` and `16-VERIFICATION.md` | **FIX** | **RESOLVED — VERIFIED** | Developer-approved bounded closure: RED `407baa9` reproduced the body-provenance deletion path; GREEN `7a7acb7` confined provenance parsing to the delimited YAML frontmatter. Fresh review is clean, and scoped verification passed WR-03 refusal 1/1, valid-header control 1/1, and compatibility 26/26 with byte-preserved inventory, sidecar, and local target on refusal. |

The original Plan 16-09 WR-01 defect is closed for both explicit and auto-detected namespaced deletion acceptance. WR-03 is a narrower follow-on defect: `acceptDeletion` applies the provenance regex to the entire sidecar instead of only the YAML frontmatter block, so Markdown body content can authorize a destructive action.

This finding was classified **FIX** because it violated HARD-05's fail-before-mutation guarantee and the documented header-only legacy policy. The developer approved a dispositions-authorized bounded closure, explicitly not a third `/oto-plan-phase 16 --gaps` cycle. `acceptDeletion` now reads upstream provenance only from the delimited YAML frontmatter block; body content cannot authorize a destructive action, and missing valid header provenance with duplicate inventory rows refuses before mutation.

Independent bounded verification recorded `status: passed`, score `9/9`, and blocker count `0` in `16-VERIFICATION.md`. The accepted full-suite DNS limitation remains environment-only: the sandbox run reported the single `ENOTFOUND registry.npmjs.org` install-smoke failure, while its network-enabled rerun passed 1/1. WR-02 remains developer-approved **DEFER** without change.
