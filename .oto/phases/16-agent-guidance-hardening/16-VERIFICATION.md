---
phase: 16-agent-guidance-hardening
verified: "2026-07-18T13:54:37Z"
verified_at: "2026-07-18T13:54:37Z"
timestamp: "2026-07-18T13:54:37Z"
verifier: "Codex (oto-verifier, independent bounded Plan 16-09 re-verification)"
status: gaps_found
score: "8/9"
blocker_count: 1
head: "3a04a99461e4fd9180c594998ffa396faac74da9"
verification_scope: "bounded verification of the four Plan 16-09 closure files, original HARD-05/WR-01 explicit and auto-detected deletion-acceptance reproductions, and fresh review WR-03 legacy-body provenance reproduction only"
requirements:
  GUID-01: passed_carried_forward
  GUID-02: passed_carried_forward
  GUID-03: passed_carried_forward
  GUID-04: passed_carried_forward
  GUID-05: passed_carried_forward
  HARD-01: passed_carried_forward
  HARD-03: passed_carried_forward
  HARD-04: passed_carried_forward
  HARD-05: gaps_found
review_adjudication:
  original_WR-01: resolved
  fresh_WR-03: blocking
  developer_approved_WR-02: defer_carried_forward
  completed_gap_cycles: 2
  automatic_third_gap_plan: not_recommended
progress_log_lines: 32
---

# Phase 16: Agent Guidance + Hardening — Bounded Plan 16-09 Re-verification

## Verdict

**Status:** `gaps_found`

**Score:** **8/9 requirements passed**

**Sole current blocker:** **HARD-05 / fresh review WR-03**

Plan 16-09 closes the original WR-01 defect for both explicit and auto-detected namespaced deletion acceptance. However, fresh real-CLI evidence independently reproduces WR-03: a legacy flat sidecar with no valid `upstream` field in its YAML header is accepted when its Markdown body contains an exact `upstream: superpowers` line. The command exits 0 and performs all destructive mutations. That contradicts the required header-only provenance policy, fail-before-mutation semantics, and the user-facing documentation. HARD-05 therefore remains `gaps_found`.

## Bounded Scope

This was not a full phase sweep. Verification was limited to:

1. The four closure-changed Plan 16-09 files: `bin/lib/sync-cli.cjs`, `bin/lib/sync-accept.cjs`, `tests/16-07-sync-all-provenance.test.cjs`, and `docs/upstream-sync.md`.
2. Fresh real-CLI reproductions of original HARD-05 / WR-01 for explicit `--upstream superpowers` and auto-detected sole-Superpowers namespaced deletion sidecars.
3. Fresh real-CLI reproduction of code-review WR-03 using a legacy flat sidecar with no valid header provenance and an exact valid-looking provenance line in the Markdown body.

GUID-01 through GUID-05, HARD-01, HARD-03, HARD-04, all previously resolved blockers, and the developer-approved WR-02 DEFER were not reopened. Their prior passed/deferred statuses are carried forward unchanged.

## Requirement Accounting

| Requirement | Verdict | Evidence |
|---|---|---|
| **GUID-01** | **PASSED — CARRIED FORWARD** | Previously verified; outside this bounded scope. |
| **GUID-02** | **PASSED — CARRIED FORWARD** | Previously verified; outside this bounded scope. |
| **GUID-03** | **PASSED — CARRIED FORWARD** | Previously verified; outside this bounded scope. |
| **GUID-04** | **PASSED — CARRIED FORWARD** | Previously verified; outside this bounded scope. |
| **GUID-05** | **PASSED — CARRIED FORWARD** | Previously verified; outside this bounded scope. |
| **HARD-01** | **PASSED — CARRIED FORWARD** | Previously verified; outside this bounded scope. |
| **HARD-03** | **PASSED — CARRIED FORWARD** | Previously verified; outside this bounded scope. |
| **HARD-04** | **PASSED — CARRIED FORWARD** | Previously verified; outside this bounded scope. |
| **HARD-05** | **GAPS FOUND** | Original WR-01 is closed, but WR-03 proves legacy-flat provenance is scanned from the Markdown body and can authorize destructive acceptance without valid YAML-header provenance. |

## HARD-05 Fresh Adjudication

### Original WR-01 — RESOLVED

Two independent temporary projects invoked the shipped CLI through `node bin/install.js sync ...`. Each inventory contained duplicate rows ordered GSD first, then Superpowers.

| Selection path | Exit | Inventory after | Sidecar/target effects | Verdict |
|---|---:|---|---|---|
| `--accept-deletion oto/workflows/dup.md --upstream superpowers` with both namespaced sidecars | 0 | `gsd: keep`; `superpowers: dropped_upstream` | GSD sidecar remained byte-identical (`96fb9d0…`); Superpowers sidecar and local target were removed | **PASS** |
| `--accept-deletion oto/workflows/dup.md` with only the Superpowers namespaced sidecar | 0 | `gsd: keep`; `superpowers: dropped_upstream` | Selected sidecar and local target were removed | **PASS** |

The selected identity now survives `resolveAcceptTarget` and is passed as `upstream: resolved.upstream`; `acceptDeletion` matches both `target_path` and `upstream`. The original wrong-row mutation is closed.

### Fresh WR-03 — REPRODUCED, BLOCKING

The independent fixture used:

- a legacy flat `.oto-sync-conflicts/oto/workflows/dup.md.deleted.md` sidecar;
- YAML frontmatter containing `kind: deleted` and `target_path`, but no valid `upstream` field;
- Markdown body containing the exact line `upstream: superpowers`; and
- duplicate inventory rows ordered GSD first, then Superpowers.

The real command `node bin/install.js sync --accept-deletion oto/workflows/dup.md` produced:

- exit code **0** and `accepted-deletion: oto/workflows/dup.md`;
- inventory SHA-256 changed from `f5fd5c3521beaf7eecaf08fa26b9db3755b6814b147ae0a5601ddc708f79be98` to `51ad299a083f69cbbb058c05ead501afe714818b11be16417c2792ee8ae113bd`;
- verdicts became `gsd: keep`, `superpowers: dropped_upstream`;
- sidecar SHA-256 `d215bfb02212138b738a1d5ddbdb5ab472113d29dc6a812c62eb0c9c509f6466` changed to missing; and
- local target SHA-256 `fda6c87ced60341e65074fb335e25a047cba333cc6e47823e09e2d73b8a2d336` changed to missing.

The refusal and byte-preservation contract therefore failed on all three mutation surfaces: inventory, sidecar, and local target.

### Cause

`bin/lib/sync-accept.cjs` already defines `HEADER_RE`, but `acceptDeletion` applies `/^upstream: (gsd|superpowers)$/m` directly to the complete raw sidecar. The line anchor prevents partial-line matches but does not confine the search to YAML frontmatter. An exact body line is consequently treated as trusted provenance.

## Docs Truthfulness and Test Coverage

`docs/upstream-sync.md` states that a legacy flat record resolves provenance from the sidecar's `upstream:` YAML header and refuses when that header is missing or invalid with duplicate inventory rows. The fresh WR-03 fixture demonstrates that this statement is not currently true.

The scoped Plan 16-09 suite passed **25/25**, including its headerless duplicate-row refusal test. That test removes the header line, but its body contains no exact valid-looking `upstream:` line. No scoped regression exercises headerless/invalid frontmatter plus body provenance, so the passing suite does not cover WR-03.

## Fresh Verification Evidence

| Check | Result |
|---|---|
| Fresh explicit namespaced WR-01 CLI fixture | **PASS** — only Superpowers inventory row changed; unselected GSD sidecar preserved byte-for-byte |
| Fresh auto-detected namespaced WR-01 CLI fixture | **PASS** — only Superpowers inventory row changed |
| Fresh legacy-body WR-03 CLI fixture | **FAIL / BLOCKER REPRODUCED** — exit 0; inventory mutated; flat sidecar and local target deleted |
| `node --test tests/16-07-sync-all-provenance.test.cjs tests/phase-09-accept-helper.test.cjs tests/phase-09-cli.integration.test.cjs` | **25 passed, 0 failed, 0 skipped** — confirms current suite misses WR-03 |
| `node --check bin/lib/sync-cli.cjs && node --check bin/lib/sync-accept.cjs` | **PASS** |
| `git diff --check 899ae93..HEAD -- <four Plan 16-09 files>` | **PASS** |

No full phase suite, SDK suite, runtime-sync sweep, prior GUID/HARD reproduction, or third gap cycle was run. Those were explicitly outside this bounded verification scope.

## Sole Blocking Gap and Routing

HARD-05 needs one bounded correction: inspect provenance only inside the YAML frontmatter block, accept only a valid unambiguous `upstream: gsd|superpowers` field there, and preserve the existing unique-row compatibility fallback. Add a real-CLI regression that places an exact valid-looking `upstream:` line only in the Markdown body and asserts nonzero exit plus byte-preservation of inventory, sidecar, and local target.

Two gap cycles have already run. Do **not** start a third automatic gap plan. Route WR-03 as the sole unresolved blocker to `16-DISPOSITIONS.md` and developer triage for an explicit fix/defer decision. The original WR-01 is closed; WR-02 remains developer-approved DEFER and was not reopened.

No implementation code, STATE, ROADMAP, REQUIREMENTS, disposition, baseline, golden-row, plan, or summary file was modified by this verifier. Only this report and its heartbeat log were updated; `INTERVIEW-BRIEF-oto.md` remains untouched.

---

_Verified: 2026-07-18T13:54:37Z_

_Verifier: Codex (oto-verifier, independent bounded Plan 16-09 re-verification)_
