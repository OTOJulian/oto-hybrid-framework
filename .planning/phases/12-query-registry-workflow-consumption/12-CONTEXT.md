# Phase 12: Query registry + workflow consumption - Context

**Gathered:** 2026-05-25
**Status:** Ready for planning

<domain>
## Phase Boundary

**This phase delivers:** The shipped `oto-sdk query` registry answers every key the ported workflows invoke (`init.*`, `agent-skills`, `commit`, `state.*`, `phases.*`) against **`.oto/` paths and oto namespaces** instead of GSD's `.planning/`, and workflows consume that structured output when the SDK is present while degrading gracefully when it is absent.

**Key scouting finding that scopes this phase:** There are two parallel tooling surfaces, and only one is behind.
- **CJS layer (`oto/bin/lib/*.cjs`, `oto-tools.cjs`) is ALREADY `.oto/`-aware.** `core.cjs:65` `planningRootName()` resolves `.oto/` first, falls back to `.planning/` only when it carries the `oto_state_version:` migrated marker, else defaults `.oto/`. Everything routes through `planningDir()` → `planningRootName()`.
- **The SDK query registry (`sdk/src/query/*.ts`) is the only layer still hardcoded to `.planning/`** — `helpers.ts` `findProjectRoot()` walks up for `.planning/` (lines ~477, ~509). This is the real work.

So the phase is fundamentally: **bring the SDK registry to parity with the CJS resolver, then verify + wire fallback** — not re-path two systems.

**In scope (Phase 12):**
- Re-path the SDK query registry's root resolution to mirror the CJS `planningRootName()` model exactly.
- Make every workflow-invoked key (`init.*`, `agent-skills`, `commit`, `state.*`, `phases.*`) resolve against `.oto/` paths + oto namespaces.
- Tiered graceful-fallback wiring in workflows (see D-05/D-06).
- Verification that every invoked key answers correctly against `.oto/`.
- Audit (not rework) the 9 CJS files referencing `.planning` for stray hardcodes.

**Out of scope — Phase 13 (DOG-*):** Migrating THIS repo's `.planning/` → `.oto/`. This repo keeps using GSD tooling for its own development until then.

**Out of scope this phase:** Migrating the 7 workflows that call `oto-tools.cjs` directly over to `oto-sdk query`; any active rework/refactor of the CJS layer (it's already correct).
</domain>

<decisions>
## Implementation Decisions

### Root resolution (SDK)
- **D-01:** The SDK registry's root resolution MUST mirror the CJS `planningRootName()` model **exactly** for byte-for-byte parity between `oto-sdk query` and `oto-tools.cjs`:
  1. Use `.oto/` if the directory exists.
  2. Use `.planning/` ONLY if it exists AND its `STATE.md` carries the `oto_state_version:` marker (the migrated case — `hasMigratedPlanningRoot()`).
  3. Otherwise default to `.oto/`.
- **D-02:** This is NOT a hard `.oto/`-only cutover. The migrated-fallback is deliberate: it handles the migration window, keeps parity with the CJS layer, and naturally collapses to `.oto/`-only once projects migrate. (Rejected: `.oto/`-only hardcode — diverges from the CJS resolver and breaks un-migrated/GSD-era projects and this repo before Phase 13.)
- **D-03:** Port the SDK's multi-repo walk-up (`findProjectRoot`) to use the same "has OTO planning root" predicate (`.oto/` present OR `.planning/` with marker), matching `core.cjs` `hasPlanningRoot()`.

### CJS layer scope
- **D-04:** Do NOT rework the CJS layer. Audit the 9 files that reference `.planning` (`core.cjs`, `init.cjs`, `state.cjs`, `migrate.cjs`, `drift.cjs`, `commands.cjs`, `milestone.cjs`, `verify.cjs`, `gsd2-import.cjs`) to confirm each either routes through `planningRootName()`/`planningDir()` or is an intentional migrated-marker check (e.g. `core.cjs:56` inside `hasMigratedPlanningRoot()`). Fix any stray hardcode found; otherwise leave as-is. Phase 12's effort centers on the SDK registry.

### Fallback philosophy (SC-05)
- **D-05:** **Pragmatic tiered fallback.** `oto-sdk` ships with every install and Phase 11 guarantees it on PATH, so absence is an edge case — not the normal path.
  - **Read-only queries degrade to sensible defaults** via the existing `oto-sdk query … 2>/dev/null || echo <default>` pattern (already partly present for `config-get`, `resolve-model`, `audit-uat`). Examples: `config-get`, `resolve-model`, `agent-skills`, state reads (`state-snapshot`, `state get`), `find-phase` (read).
  - **Structural / stateful operations hard-require the SDK** and emit ONE clear, actionable error when absent — they are NOT reimplemented in bash. Examples: `init.*`, `commit`, `phase.add/insert/remove/complete`, state mutations (`state update/patch/begin-phase`), `roadmap update-plan-progress`, `requirements mark-complete`, `milestone complete`.
  - Rejected: literal full per-key bash fallback (~50 handlers reimplemented in shell — violates the personal-tool cost ceiling for an edge case Phase 11 already prevents). Rejected: a universal wrapper that fakes "completion" of structural ops.
- **D-06:** **REQUIREMENTS/ROADMAP reconciliation required.** D-05 softens the literal wording of SC#4 ("the same workflows fall back to manual file operations and complete successfully when oto-sdk is absent") and SDK-05. The planner MUST reconcile the success-criterion / requirement text to reflect the tiered model — read-only ops degrade gracefully; structural ops fail fast with a clear error rather than silently completing. Do not leave the literal wording unmet-but-unchanged. (Touches `.planning/ROADMAP.md` Phase 12 SC#4 and `.planning/REQUIREMENTS.md` SDK-05.)

### Verification bar
- **D-07:** **Enumerate keys + `.oto/` fixture smoke.** Script-extract every distinct `oto-sdk query <key>` invoked across `oto/workflows/` and `oto/commands/`, run each against a fixture `.oto/` project, and assert it resolves with structured output and never touches `.planning/`. Existing SDK unit tests (vitest) stay green. This directly proves SC#1-2 ("answers every key") and catches stale-`.planning/` regressions. (Rejected: handler-only unit tests — no end-to-end key coverage. Deferred: full golden-snapshot per key — heaviest; the enumerate+smoke approach is the right cost/confidence point for v0.4.0.)

### Claude's Discretion
- Exact mechanism for sharing the resolution model between CJS and SDK (port the logic vs. a shared helper) — planner/researcher decide, as long as behavior matches D-01.
- The precise key-by-key tiering (which specific keys are read-only vs. structural) within the D-05 principle.
- Smoke-test harness shape (where the fixture `.oto/` lives, how keys are extracted, node:test vs. a shell script in CI) within D-07.
- Error message wording for the hard-require path (D-05).
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope & requirements
- `.planning/ROADMAP.md` (Phase 12 section) — goal + 4 success criteria. Note SC#4 needs reconciliation per D-06.
- `.planning/REQUIREMENTS.md` — SDK-03 (registry answers every key against `.oto/`) and SDK-05 (workflow consumption + graceful fallback). SDK-05 wording to be reconciled per D-06.
- `.planning/phases/11-oto-sdk-package-port-path-wiring/11-CONTEXT.md` — the Phase 11 deferral boundary: registry was a surface rebrand only; deep re-pathing is explicitly this phase.

### SDK registry (the layer to re-path)
- `sdk/HANDOVER-QUERY-LAYER.md` — query registry architecture, `createRegistry()`, `normalizeQueryCommand`, parity tiers. Read first.
- `sdk/src/query/QUERY-HANDLERS.md` — catalog of handlers/keys.
- `sdk/src/query/registry.ts` — registry assembly.
- `sdk/src/query/index.ts` — query dispatch entry.
- `sdk/src/query/helpers.ts` §`findProjectRoot` (and the `.planning/` literals at ~lines 477, 509) + the `.planning` path helpers — the hardcoded resolution to re-path to mirror the CJS model.

### Canonical resolver to mirror (CJS layer — already correct)
- `oto/bin/lib/core.cjs` §`planningRootName` (lines 65-69), §`hasMigratedPlanningRoot` (55-63), §`hasPlanningRoot` (71-73), §`planningDir`/`planningRoot`/`planningPaths` (909-960). This is the behavior the SDK must match (D-01..D-03).
- `oto/bin/lib/oto-tools.cjs` — the `@deprecated` CJS compat CLI (header documents the full command surface); routes through `core.cjs`. In-scope only for the stray-hardcode audit (D-04), not rework.

### Project constraints
- `CLAUDE.md` → "Technology Stack" / "What NOT to Use" — TS confined to `sdk/`, `node:test` for tooling / Vitest only inside `sdk/`, ship prebuilt `dist/`, no install-time build, and the personal-use cost ceiling (directly informs D-05).
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `core.cjs` `planningRootName()` / `hasMigratedPlanningRoot()` / `hasPlanningRoot()` — the exact, tested resolution model the SDK should adopt (D-01). Don't reinvent; mirror.
- Existing workflow fallback idiom `oto-sdk query … 2>/dev/null || echo <default>` — already present for several read-only `config-get`/`resolve-model`/`audit-uat` calls; extend this pattern for the read-only tier (D-05).
- SDK `golden/` dir + vitest config (`sdk/vitest.config.ts`) — existing test infra to keep green; the fixture-smoke harness (D-07) can live alongside.

### Established Patterns
- Two-surface tooling: ESM/TypeScript SDK (`sdk/src/query/`, vitest) vs. CJS lib (`oto/bin/lib/`, node:test). Keep TS in `sdk/`.
- All CJS path access is centralized through `planningDir(cwd, ws, project)`, which is workstream- and project-aware (honors `OTO_WORKSTREAM`/`OTO_PROJECT`). SDK parity should preserve this routing, not just swap a string.

### Integration Points
- `sdk/src/query/helpers.ts` `findProjectRoot` + `.planning` path helpers — the single re-pathing site in the SDK.
- ~110 `oto/workflows/` + `oto/commands/` files call `oto-sdk query` (consumption + fallback wiring target).
- 7 workflows call `oto-tools.cjs` directly (`complete-milestone`, `plan-review-convergence`, `progress`, `update`, `spec-phase`, `execute-phase`, `quick`) — already resolve `.oto/` via the CJS layer; left untouched this phase.
</code_context>

<specifics>
## Specific Ideas

- Parity between `oto-sdk query` and `oto-tools.cjs` is the north star for the root-resolution decision — they must return identical answers for the same project layout (that is the whole point of the HANDOVER-QUERY-LAYER parity design).
- "Graceful fallback" is a degradation safety net, not a co-equal code path — the SDK is expected present on every install (Phase 11). Engineering effort should reflect that.
</specifics>

<deferred>
## Deferred Ideas

- `.planning/` → `.oto/` migration of THIS repo (with git history preserved) — Phase 13 (DOG-*).
- Migrating the 7 `oto-tools.cjs`-direct workflows to `oto-sdk query` — deferred; they work today via the CJS layer.
- Active rework/refactor of the CJS layer — rejected; it is already `.oto/`-aware.
- Full golden-snapshot test per key — deferred in favor of enumerate+fixture-smoke (D-07).

</deferred>

---

*Phase: 12-query-registry-workflow-consumption*
*Context gathered: 2026-05-25*
