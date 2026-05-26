# Phase 12: Query registry + workflow consumption - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-25
**Phase:** 12-query-registry-workflow-consumption
**Areas discussed:** Root resolution strategy, oto-tools.cjs compat scope, Fallback philosophy (SC-05), Verification bar

---

## Root resolution strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Mirror planningRootName() | SDK adopts the CJS model exactly: `.oto/` if present; `.planning/` only with `oto_state_version:` marker; else `.oto/`. Byte-for-byte parity with `oto-tools.cjs`. | ✓ |
| .oto/ only (hard cutover) | SDK ignores `.planning/` entirely. Simplest, matches Phase 13 ethos, but diverges from the CJS resolver and breaks un-migrated/GSD-era projects + this repo pre-Phase-13. | |

**User's choice:** Mirror `planningRootName()`
**Notes:** Scouting found the CJS layer (`core.cjs:65`) already implements this resolver and everything routes through it; the SDK (`helpers.ts findProjectRoot`) is the only layer still hardcoded to `.planning/`. Parity between the two surfaces is the deciding factor.

---

## oto-tools.cjs compat scope

| Option | Description | Selected |
|--------|-------------|----------|
| Leave as-is + audit | Don't rework CJS; audit the 9 `.planning`-referencing files to confirm each routes through `planningRootName()` or is the intentional migrated-marker check. Scope effort on the SDK. | ✓ |
| Also migrate the 7 workflows | Migrate the 7 workflows calling `oto-tools.cjs` directly to `oto-sdk query`. Cleaner long-term, more surface/risk this phase. | |
| Active CJS rework | Treat the CJS layer as in-scope for refactor/re-path. Highest effort, largely redundant. | |

**User's choice:** Leave as-is + audit
**Notes:** CJS layer already resolves `.oto/` correctly via `planningDir()`. Real work is the SDK.

---

## Fallback philosophy (SC-05)

| Option | Description | Selected |
|--------|-------------|----------|
| Pragmatic tiered | Read-only queries degrade to defaults (`\|\| echo default`); structural/stateful ops hard-require the SDK with one clear error. Softens SC-05's literal wording — success criterion to be updated. | ✓ |
| Literal full fallback | Every `oto-sdk query` call gets a bash manual equivalent. Satisfies SC-05 verbatim; ~50 handlers reimplemented in shell. | |
| Standardized wrapper | One shell helper degrading uniformly. Middle ground; still doesn't truly complete structural ops without the SDK. | |

**User's choice:** Pragmatic tiered
**Notes:** oto-sdk ships with every install and Phase 11 guarantees PATH, so absence is an edge case. User accepted that this softens SC-05's wording and that the success criterion / SDK-05 requirement should be reconciled to match (captured as D-06).

---

## Verification bar

| Option | Description | Selected |
|--------|-------------|----------|
| Enumerate keys + fixture smoke | Extract every `oto-sdk query <key>` from workflows, run each against a fixture `.oto/` project, assert resolution + no `.planning/` touch. Keep SDK unit tests green. | ✓ |
| Targeted unit tests | Unit tests on re-pathed handlers + root-resolution only. Lighter, no end-to-end key coverage. | |
| Golden-fixture per key | Full golden snapshot per key. Highest fidelity, heaviest to build/maintain. | |

**User's choice:** Enumerate keys + fixture smoke
**Notes:** Directly proves SC#1-2 ("answers every key") at the right cost/confidence point for v0.4.0.

---

## Claude's Discretion

- Mechanism for sharing the resolution model between CJS and SDK (port vs. shared helper), as long as behavior matches D-01.
- Precise key-by-key tiering within the D-05 read-only/structural principle.
- Smoke-test harness shape and fixture location within D-07.
- Error-message wording for the hard-require fallback path.

## Deferred Ideas

- `.planning/` → `.oto/` migration of this repo — Phase 13.
- Migrating the 7 `oto-tools.cjs`-direct workflows to `oto-sdk query`.
- Active CJS rework (rejected — already correct).
- Full golden-snapshot per key (deferred in favor of enumerate+smoke).
