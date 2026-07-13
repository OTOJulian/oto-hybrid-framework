---
phase: quick-260713-fym
plan: 01
status: complete
subsystem: key-storage-reconciliation
tags: [secret-hygiene, config-parsing, sdk, dispositions, state]

# Dependency graph
requires:
  - phase: 14
    provides: Fresh 2026-07-13 verification and review with three Criticals and six undispositioned Warnings
provides:
  - Sanitized malformed-JSON errors across CJS config-get and both SDK loadConfig parse branches
  - Real-process CJS and SDK marker-absence regressions against shipped surfaces
  - Complete developer dispositions for all three fresh Criticals and six fresh Warnings
  - Correct oto_state_version marker plus Phase 15 and Phase 16 pre-task ownership
affects: [phase-14-verification, phase-15-runtime-resolution, phase-16-hardening]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Malformed JSON errors expose only a generic message and the affected path"
    - "Secret-bearing error regressions use real processes and assert both stdout and stderr"

key-files:
  created:
    - sdk/src/config-parse-sanitization.test.ts
  modified:
    - oto/bin/lib/config.cjs
    - tests/14-configget-guard.test.cjs
    - sdk/src/config.ts
    - sdk/src/config.test.ts
    - sdk/dist/config.js
    - sdk/dist/config.js.map
    - sdk/dist/config.d.ts.map
    - .oto/phases/14-key-storage-reconciliation/14-DISPOSITIONS.md
    - .oto/STATE.md

key-decisions:
  - "Fix only the malformed-config disclosure in Phase 14 developer triage; defer the other two Criticals to their named Phase 15/16 owners"
  - "Calibrate all six Warnings to the personal single-user threat model: four ACCEPT, two Phase 15 DEFER, zero Critical escalations"

requirements-completed: [QUICK-260713-FYM]

# Metrics
duration: 1h41m
completed: 2026-07-13
---

# Quick Task 260713-fym: Phase 14 Developer Triage Summary

**The malformed-config secret-fragment disclosure is fixed across CJS, SDK source, and rebuilt SDK dist. The other two fresh Criticals have explicit Phase 15/16 owners, and all six fresh Warnings are dispositioned. Phase 14 remains awaiting fresh independent verification.**

## Developer Triage Dispositions

No fresh Warning meets `model-calibration.md`'s Critical definition; no Warning escalation was required.

| Finding | Decision | Owner | Rationale / Evidence |
|---------|----------|-------|----------------------|
| FRESH-CR-01 — malformed-config errors disclose secret bytes | **FIX** | Quick 260713-fym | CJS config-get plus selected-root and inherited-root SDK `loadConfig` now emit only the generic path-only contract; real-process regressions cover all three paths. |
| FRESH-CR-02 — settings workflow hardcodes the Claude tool path | **DEFER** | Phase 15 — Exa MCP Registration | Phase 15 owns per-runtime config-dir resolution and the `/oto-settings-integrations` per-runtime status surface for Claude, Codex, Gemini, and custom directories. |
| FRESH-CR-03 — workstream status bypasses root inheritance/migration | **DEFER** | Phase 16 — Agent Guidance + Hardening | Phase 16 owns effective root-to-workstream secret-status flags and root-layer legacy migration alongside the existing WR-04 pre-task. |
| FRESH-WR-01 — CJS and SDK writers use different locks | **ACCEPT** | — | Requires overlapping same-user writers; settings are reconstructible and no secret leaves the machine or core workflow is blocked. |
| FRESH-WR-02 — SDK `configEnsureSection` is unlocked | **ACCEPT** | — | Same-user stale-write risk is bounded concurrency hardening; the operation is re-runnable and does not disclose secrets or block install/plan/execute. |
| FRESH-WR-03 — CJS config-set false-success on array root | **ACCEPT** | — | Requires an already schema-invalid array root; bytes remain unchanged, so the defect is misleading parity behavior rather than additional corruption/data loss. |
| FRESH-WR-04 — new-project counts unusable keyfile paths | **DEFER** | Phase 15 — Exa MCP Registration | Phase 15 owns usable-key readiness and must use canonical detection for all integrations and unusable-file variants. |
| FRESH-WR-05 — workstream Replace/Clear changes the global credential | **DEFER** | Phase 15 — Exa MCP Registration | Phase 15 owns disclosure/confirmation UX and root/workstream reconciliation for the intentionally global keyfile scope. |
| FRESH-WR-06 — rollback ends before final project config write | **ACCEPT** | — | Failure preserves the credential in a mode-0600 keyfile and reports failure; retry is safe, with no key loss, tracked plaintext, or off-machine transmission. |

The durable evidence and full notes for every row are in `14-DISPOSITIONS.md` under the `FRESH-*` identifiers.

## Implementation

### Generic error contract

All three affected parse paths now emit:

```text
Malformed JSON in config file at <path>
```

No affected catch appends `err.message`, stringifies the parser error, or includes raw config bytes.

### Atomic commits

1. `c8fc4d3` — `fix(config): sanitize malformed JSON errors`
   - `oto/bin/lib/config.cjs`
   - `tests/14-configget-guard.test.cjs`
   - `sdk/src/config.ts`
   - `sdk/src/config.test.ts`
   - `sdk/src/config-parse-sanitization.test.ts`
   - `sdk/dist/config.js`
   - `sdk/dist/config.js.map`
   - `sdk/dist/config.d.ts.map`
2. `606b7a9` — `docs(phase-14): record developer triage dispositions`
   - `.oto/phases/14-key-storage-reconciliation/14-DISPOSITIONS.md` only

The pre-dispatch plan is isolated in `5e9e9fa`. No implementation commit touches `oto/agents/`, `oto/workflows/`, `.oto/ROADMAP.md`, or a gap-closure plan.

## Regression-Test Mutation Proof

The real-process tests were written and executed before the implementation change:

- Pre-fix CJS `node --test tests/14-configget-guard.test.cjs` exited nonzero because stderr contained the synthetic marker fragment, failing the marker-absence assertion.
- Pre-fix SDK `npx vitest run src/config-parse-sanitization.test.ts` exited nonzero with both selected-root and inherited-root workstream cases failing at the marker-fragment absence assertion.
- The implementation then changed only the three leaking branches and rebuilt SDK dist once.
- The identical probes passed afterward. This observed RED-to-GREEN transition demonstrates that reverting the sanitization makes the regressions fail; captured marker-bearing stderr was not copied into tracked artifacts.

## Verification

### Fresh completion gates

| Command | Result |
|---------|--------|
| `node --test tests/14-*.test.cjs` | **PASS — 100/100** |
| `cd sdk && npx vitest run src/config-parse-sanitization.test.ts` | **PASS — 2/2** |
| `cd sdk && npx tsc --noEmit` | **PASS** |
| `cd sdk && npm run build` | **PASS** |
| `git diff --exit-code -- sdk/dist` after rebuild | **PASS — no dist drift** |
| `node --test tests/13-oto-root-guard.test.cjs` | **PASS — 4/4** |
| `git diff --check` | **PASS** |

### Full-suite baseline comparison

The required full `npm test` comparison was run before the dry-run reports were restored:

| Run | Total | Passed | Failed | Skipped | Failure set |
|-----|------:|-------:|-------:|--------:|-------------|
| Pre-change baseline | 739 | 734 | 2 | 3 | STATE marker guard; pre-existing install-smoke `ENOTFOUND registry.npmjs.org` |
| Post-change | 740 | 736 | 1 | 3 | Same pre-existing install-smoke `ENOTFOUND registry.npmjs.org` only |

There are no new failures. The requested STATE marker change removes the former root-guard failure; the remaining network-dependent failure is unchanged from baseline.

## STATE and Ownership

- Frontmatter now uses `oto_state_version: 1.0`.
- Pending Todos includes the Phase 15 per-runtime config-dir/status pre-task and the Phase 16 root/workstream status/migration pre-task.
- The separately tracked tooling follow-up that can regress the marker remains unchanged under Deferred Items.
- Current Position status is exactly: `developer triage applied 2026-07-13: parser-leak fixed, 2 Criticals deferred with owners, warnings dispositioned; awaiting fresh verification.`

## Scope and Worktree Audit

- `reports/rebrand-dryrun.json` and `reports/rebrand-dryrun.md` were regenerated by the full-suite test and restored to committed versions after developer confirmation that the dirty variants were regenerable output; both are clean.
- A requested snapshot-backup safety attempt was explicitly abandoned by the developer before any backup was created. Its empty `/tmp/snap` and Desktop directories were removed; the OS-managed read-only snapshot mount was left untouched.
- `INTERVIEW-BRIEF-oto.md` remains untouched, untracked, and absent from every quick-task commit.
- No unrelated file is staged or included in the quick-task commits.

## Handoff

Developer triage is applied. Phase 14 is **awaiting fresh verification** against the fixed parser path and the recorded deferral/disposition matrix.

---
*Phase: quick-260713-fym*
*Completed: 2026-07-13*
