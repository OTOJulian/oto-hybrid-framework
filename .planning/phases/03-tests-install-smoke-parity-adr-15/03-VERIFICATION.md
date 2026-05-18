---
phase: 03-tests-install-smoke-parity-adr-15
verified: 2026-05-18T21:48:47Z
status: passed
score: 6/6 success criteria verified
human_verification: not_required
overrides_applied: 0
---

# Phase 03: Tests, Install-Smoke, Parity, ADR-15 Verification Report

**Phase Goal:** Both restored commands carry test coverage matching the v0.1.0 / v0.2.0 baseline, every supported runtime ships the new surface consistently, and the partial reversal of ADR-07 is recorded as ADR-15.

**Status:** passed

## Goal Achievement

Phase 3 achieved its goal. The two restored commands are now covered by regression tests, restored-agent installation is asserted in local smoke and CI smoke paths, Codex and Gemini runtime parity tests lock their runtime-specific command/skill surfaces, and ADR-15 records the partial reversal of ADR-07 as D-24 while affirming AGNT-DEFER-01 for the still-dropped agents.

## Success Criteria

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | `tests/ingest-docs.test.cjs` is namespace-rebranded from the GSD source and passes under `npm test`. | VERIFIED | `tests/ingest-docs.test.cjs`; `03-01-SUMMARY.md`; focused run 37 pass, 0 fail. |
| 2 | `tests/eval-review.test.cjs` exists and covers workflow load, agent dispatch, and EVAL-REVIEW.md shape. | VERIFIED | `tests/eval-review.test.cjs`; `03-01-SUMMARY.md`; focused run 12 pass, 0 fail. |
| 3 | Full `npm test` suite remains green with the new tests. | VERIFIED | Final `npm test`: 613 tests, 612 pass, 1 skipped, 0 fail. |
| 4 | `install-smoke.yml` CI asserts the three new agent files under tarball and unpacked install paths. | VERIFIED | `.github/workflows/install-smoke.yml`; `scripts/install-smoke.cjs`; `tests/phase-04-mr01-install-smoke.test.cjs`; `03-02-SUMMARY.md`. |
| 5 | Per-runtime parity smoke covers `/oto-ingest-docs` and `/oto-eval-review` on Claude, Codex, and Gemini. | VERIFIED | Claude assertions in `tests/phase-04-mr01-install-smoke.test.cjs`; Codex assertions in `tests/phase-08-smoke-codex.integration.test.cjs`; Gemini assertions in `tests/phase-08-smoke-gemini.integration.test.cjs`. |
| 6 | ADR-15 exists, references ADR-07 by correct filename, names the three restored agents, affirms the seven still-dropped agents under AGNT-DEFER-01, and records Codex sandbox decisions. | VERIFIED | `decisions/ADR-15-restore-doc-and-eval-agents.md`; `node --test tests/phase-01-adr-structure.test.cjs`; `03-04-SUMMARY.md`. |

## Automated Checks

```text
node --test tests/ingest-docs.test.cjs
tests: 37
pass: 37
fail: 0
```

```text
node --test tests/eval-review.test.cjs
tests: 12
pass: 12
fail: 0
```

```text
node --test tests/phase-04-mr01-install-smoke.test.cjs
status: passed
```

```text
node --test tests/phase-08-smoke-codex.integration.test.cjs
tests: 5
pass: 5
fail: 0
skipped: 0
```

```text
node --test tests/phase-08-smoke-gemini.integration.test.cjs
tests: 5
pass: 4
fail: 0
skipped: 1
```

```text
node --test tests/phase-01-adr-structure.test.cjs
tests: 3
pass: 3
fail: 0
```

```text
npm test
tests: 613
pass: 612
fail: 0
skipped: 1
```

## Code Review

`03-REVIEW.md` status: clean.

## Requirement Traceability

Phase 3 completes `TEST-01`, `TEST-02`, `TEST-03`, `INST-03`, `ADR-01`, and `PRTY-01`.

## Gaps Summary

No Phase 3 blocking gaps remain.

## Notes

- `node scripts/install-smoke.cjs` could not be used as final evidence because it installs the current local commit from the GitHub archive URL; the local commit was not pushed and GitHub returned 404. The behavior it would validate is covered by local installer loops, the updated install-smoke workflow assertions, and the focused runtime smoke tests.
- The installed Gemini CLI is `0.26.0`, below the live invocation gate of `>= 0.38`; the live Gemini invocation self-skipped. Non-live Gemini install parity still ran and passed.
- Security review for Phase 3 has not been run yet; run `/oto-secure-phase 3` before milestone completion.
