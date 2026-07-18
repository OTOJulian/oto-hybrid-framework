---
phase: 16-agent-guidance-hardening
verified: "2026-07-18T00:20:37Z"
verified_at: "2026-07-18T00:20:37Z"
verifier: "Codex (oto-verifier, independent bounded re-verification)"
status: gaps_found
score: "8/9"
blocker_count: 1
head: "899ae9358e51204b456c0bdf8ebc890c56309812"
verification_scope: "bounded re-verification of Plans 16-07 and 16-08 closure files, the two prior blockers, and fresh review WR-01"
requirements:
  GUID-01: passed
  GUID-02: passed_carried_forward
  GUID-03: passed_carried_forward
  GUID-04: passed_carried_forward
  GUID-05: passed_carried_forward
  HARD-01: passed_carried_forward
  HARD-03: passed_carried_forward
  HARD-04: passed_carried_forward
  HARD-05: gaps_found
review_adjudication:
  prior_verifier_WR-01: resolved
  prior_verifier_WR-03: resolved
  fresh_review_WR-01: blocking
  developer_approved_WR-02: defer_carried_forward
progress_log_lines: 19
---

# Phase 16: Agent Guidance + Hardening — Bounded Re-verification Report

## Verdict

**Status:** `gaps_found`

**Score:** **8/9 requirements passed**

**Blocking gaps:** **1**

Plans 16-07 and 16-08 close both blockers from the prior full-sweep verification: the all-upstream sync path now preserves both upstreams' durable sidecars and reports, and the canonical search guidance now uses runtime-observable availability with a working keyless Brave probe. GUID-01 therefore passes.

One independently reproduced closure-review warning remains blocking. `--accept-deletion <path> --upstream superpowers` resolves the Superpowers sidecar correctly but then updates the first inventory row matching `target_path`, regardless of upstream. With duplicate GSD/Superpowers inventory targets ordered GSD first, the command exits 0, removes the selected Superpowers sidecar and local target, changes the GSD row to `dropped_upstream`, and leaves the Superpowers row at `keep`. Because provenance-safe deletion acceptance is an explicit Plan 16-07 must-have under HARD-05, HARD-05 remains `gaps_found`.

## Scope

This was a bounded re-verification, not a new full sweep. It covered:

1. The eight closure source/test/doc files declared by Plans 16-07 and 16-08.
2. The prior HARD-05 / verifier WR-01 all-upstream evidence-overwrite blocker.
3. The prior GUID-01 / verifier WR-03 runtime-observable availability blocker.
4. Fresh closure-review WR-01, including all three advertised accept modes and duplicate-target ambiguity behavior.

GUID-02 through GUID-05, HARD-01, HARD-03, HARD-04, and the developer-approved WR-02 DEFER disposition were not reopened. Their prior statuses are carried forward unchanged.

## Requirement Accounting

| Requirement | Verdict | Bounded evidence |
|---|---|---|
| **GUID-01** — shared runtime-neutral Exa → Brave → built-in ladder with no Exa retry after 429 | **PASSED** | The canonical reference gates Exa and Firecrawl from the runtime tool list and Brave from the structured SDK response. The ten-consumer shape check passed, and the real keyless `bin/oto-sdk.js query websearch "availability probe"` subprocess exited 0 with `available: false` and the fixed `No Brave key` reason. Source-to-installed runtime sync passed for Claude and Codex; Gemini was skipped because no oto install exists. |
| **GUID-02** | **PASSED — CARRIED FORWARD** | Not reopened by instruction. |
| **GUID-03** | **PASSED — CARRIED FORWARD** | Not reopened by instruction. |
| **GUID-04** | **PASSED — CARRIED FORWARD** | Not reopened by instruction. |
| **GUID-05** | **PASSED — CARRIED FORWARD** | Not reopened by instruction. |
| **HARD-01** | **PASSED — CARRIED FORWARD** | Not reopened by instruction. |
| **HARD-03** | **PASSED — CARRIED FORWARD** | Not reopened by instruction. |
| **HARD-04** | **PASSED — CARRIED FORWARD** | Not reopened by instruction. |
| **HARD-05** — milestone-close upstream-sync hygiene and durable conflict surface | **GAPS FOUND** | The prior overwrite blocker is fixed: the real `--upstream all` overlap regression preserved both namespaced sidecars and both per-upstream `REPORT.md` files. However, the Plan 16-07 acceptance contract is not provenance-safe for deletion acceptance: namespace selection is discarded before inventory mutation, so the wrong upstream row can be marked dropped. |

## Prior Blocker Reproductions

### Prior verifier WR-01 / HARD-05 — RESOLVED

The merged focused suite ran the real `oto sync --upstream all` path against an overlapping two-upstream fixture. It verified:

- `.oto-sync-conflicts/gsd/<target>.md` and `.oto-sync-conflicts/superpowers/<target>.md` both survive;
- `.oto-sync-conflicts/gsd/REPORT.md` and `.oto-sync-conflicts/superpowers/REPORT.md` both survive;
- no legacy flat `REPORT.md` replaces either report;
- status aggregation counts namespaced records while skipping reports; and
- ordinary `--accept` auto-detection, ambiguity refusal, and explicit upstream disambiguation work.

Result: the original all-upstream evidence-overwrite blocker is closed.

### Prior verifier WR-03 / GUID-01 — RESOLVED

The closure tests and direct runtime guard verified the replacement contract:

- the shared reference contains no retired context-booleans or `_available` premise;
- Exa and Firecrawl use observable tool-list gates;
- the Brave rung uses the documented structured CLI probe;
- all five spawn workflows and all five agent sources avoid promising unavailable context fields;
- the keyless Brave probe exits 0 and returns `available: false` with `No Brave key` reason; and
- installed Claude and Codex copies are byte-aligned with source.

Result: the canonical guidance can now be followed as written, so GUID-01 passes.

## Fresh Review WR-01 Adjudication

### `--accept` — provenance-safe in the tested duplicate-target case

With both GSD and Superpowers modified sidecars present for the same target, explicit `--upstream superpowers` wrote the Superpowers content, removed only the Superpowers sidecar, and preserved the GSD sidecar.

### `--accept-deletion` — BLOCKING provenance defect

Two independent real-CLI fixtures reproduced the defect:

| Selection path | Selected evidence | Resulting inventory verdicts |
|---|---|---|
| Explicit `--upstream superpowers` | Superpowers deletion sidecar | `gsd: dropped_upstream`, `superpowers: keep` |
| Auto-detected sole Superpowers sidecar | Superpowers deletion sidecar | `gsd: dropped_upstream`, `superpowers: keep` |

The cause is direct: `resolveAcceptDir` returns only a directory, `runSync` passes no upstream identity to `acceptDeletion`, and `acceptDeletion` uses `.find(candidate => candidate.target_path === relPath)`. The first duplicate target wins regardless of selected provenance.

### `--keep-deleted` — namespace-safe within the Plan 16-07 must-have

With duplicate GSD and Superpowers deletion sidecars, explicit `--upstream superpowers` preserved the local target, removed only the Superpowers sidecar, retained the GSD sidecar, and added the target to the path-level divergence list. This mode does not mutate an upstream inventory row. The divergence record is intentionally path-level, so the bounded finding is limited to deletion acceptance.

### Ambiguity guard — passed

For both `--accept-deletion` and `--keep-deleted`, omitting `--upstream` while both upstream sidecars existed failed loud, mentioned both upstreams, and left both sidecars and the local target unchanged.

## Fresh Verification Evidence

| Command / reproduction | Result |
|---|---|
| `node --test tests/16-07-sync-all-provenance.test.cjs tests/phase-09-cli.integration.test.cjs tests/16-search-reference.test.cjs tests/16-availability-coherence.test.cjs` | **21 passed, 0 failed, 0 skipped** |
| `node scripts/check-runtime-sync.cjs` | **PASS** — Claude `ok`, Codex `ok`, Gemini skipped because no install exists |
| Explicit duplicate-target Superpowers `--accept-deletion` CLI fixture | **BLOCKER REPRODUCED** — GSD row changed; Superpowers row unchanged |
| Auto-detected sole-Superpowers deletion CLI fixture with duplicate inventory rows | **BLOCKER REPRODUCED** — GSD row changed; Superpowers row unchanged |
| Explicit duplicate-target Superpowers `--accept` CLI fixture | **PASS** — selected content/sidecar only |
| Explicit duplicate-target Superpowers `--keep-deleted` CLI fixture | **PASS within bounded must-have** — selected sidecar only; local target and other sidecar preserved |
| Dual-upstream deletion-sidecar ambiguity fixtures | **PASS** — both deletion modes failed loud without mutation |
| `node bin/oto-sdk.js query verify.schema-drift 16` | **PASS** — `drift_detected: false`, `blocking: false` |
| `npm test` | 973 total: **969 passed, 1 failed, 3 skipped**; sole failure was sandbox DNS `ENOTFOUND registry.npmjs.org` in install-smoke |
| Network-enabled `node --test tests/phase-04-mr01-install-smoke.test.cjs` | **1 passed, 0 failed**; confirms the sandbox-only failure is not a code regression |

## Blocking Gap

Preserve selected upstream identity through deletion acceptance. Pass the validated resolved upstream into `acceptDeletion` and match the inventory entry by both `target_path` and `upstream`, with an explicit policy for legacy flat sidecars. Add CLI-level regressions for both explicit and unambiguous auto-detected Superpowers selection with duplicate target paths, plus retain the ambiguity and `--keep-deleted` coverage.

No implementation, STATE, ROADMAP, REQUIREMENTS, disposition, baseline, golden-row, plan, or summary file was modified by this verifier. The only repository artifacts updated were this report and its heartbeat log. `INTERVIEW-BRIEF-oto.md` remains untouched.

---

_Verified: 2026-07-18T00:20:37Z_

_Verifier: Codex (oto-verifier, independent bounded re-verification)_
