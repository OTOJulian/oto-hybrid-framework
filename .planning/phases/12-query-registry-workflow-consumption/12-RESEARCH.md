# Phase 12: Query registry + workflow consumption - Research

**Researched:** 2026-05-25
**Domain:** TypeScript SDK query registry re-pathing (`.planning/` → `.oto/`-aware) + workflow shell-fallback wiring + enumerate-and-smoke verification
**Confidence:** HIGH (codebase is the primary source; all key claims verified by direct file reads + grep)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Root resolution (SDK)**
- **D-01:** The SDK registry's root resolution MUST mirror the CJS `planningRootName()` model **exactly** for byte-for-byte parity between `oto-sdk query` and `oto-tools.cjs`:
  1. Use `.oto/` if the directory exists.
  2. Use `.planning/` ONLY if it exists AND its `STATE.md` carries the `oto_state_version:` marker (the migrated case — `hasMigratedPlanningRoot()`).
  3. Otherwise default to `.oto/`.
- **D-02:** NOT a hard `.oto/`-only cutover. The migrated-fallback is deliberate (handles migration window, keeps CJS parity, collapses to `.oto/`-only post-migration). (Rejected: `.oto/`-only hardcode.)
- **D-03:** Port the SDK's multi-repo walk-up (`findProjectRoot`) to use the same "has OTO planning root" predicate (`.oto/` present OR `.planning/` with marker), matching `core.cjs` `hasPlanningRoot()`.

**CJS layer scope**
- **D-04:** Do NOT rework the CJS layer. Audit the 9 files referencing `.planning` (`core.cjs`, `init.cjs`, `state.cjs`, `migrate.cjs`, `drift.cjs`, `commands.cjs`, `milestone.cjs`, `verify.cjs`, `gsd2-import.cjs`) to confirm each routes through `planningRootName()`/`planningDir()` or is an intentional migrated-marker check. Fix any stray hardcode; otherwise leave as-is.

**Fallback philosophy (SC-05)**
- **D-05:** **Pragmatic tiered fallback.** `oto-sdk` ships with every install and Phase 11 guarantees it on PATH; absence is an edge case.
  - **Read-only queries degrade to sensible defaults** via the existing `oto-sdk query … 2>/dev/null || echo <default>` pattern. Examples: `config-get`, `resolve-model`, `agent-skills`, `state-snapshot`, `state get`, `find-phase` (read).
  - **Structural / stateful operations hard-require the SDK** and emit ONE clear actionable error when absent — NOT reimplemented in bash. Examples: `init.*`, `commit`, `phase.add/insert/remove/complete`, state mutations, `roadmap update-plan-progress`, `requirements mark-complete`, `milestone complete`.
  - Rejected: literal full per-key bash fallback (~50 handlers in shell — violates the personal-tool cost ceiling). Rejected: a universal wrapper that fakes "completion" of structural ops.
- **D-06:** **REQUIREMENTS/ROADMAP reconciliation required.** D-05 softens the literal wording of ROADMAP SC#4 ("fall back to manual file operations and complete successfully") and REQUIREMENTS SDK-05. The planner MUST reconcile both texts to the tiered model. Do not leave literal wording unmet-but-unchanged.

**Verification bar**
- **D-07:** **Enumerate keys + `.oto/` fixture smoke.** Script-extract every distinct `oto-sdk query <key>` across `oto/workflows/` + `oto/commands/`, run each against a fixture `.oto/` project, assert structured output + never touches `.planning/`. Existing vitest stays green. (Rejected: handler-only unit tests. Deferred: full golden-snapshot per key.)

### Claude's Discretion
- Exact mechanism for sharing the resolution model between CJS and SDK (port logic vs. shared helper) — as long as behavior matches D-01.
- Precise key-by-key tiering (read-only vs. structural) within the D-05 principle.
- Smoke-test harness shape (fixture `.oto/` location, key extraction method, node:test vs. shell-in-CI) within D-07.
- Error message wording for the hard-require path (D-05).

### Deferred Ideas (OUT OF SCOPE)
- `.planning/` → `.oto/` migration of THIS repo (Phase 13 / DOG-*).
- Migrating the 7 `oto-tools.cjs`-direct workflows to `oto-sdk query`.
- Active rework/refactor of the CJS layer (already correct).
- Full golden-snapshot test per key (deferred in favor of enumerate+smoke).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SDK-03 | The query registry answers every key the ported workflows invoke (`init.*`, `agent-skills`, `commit`, `state.*`, `phases.*`) using oto namespaces and `.oto/` paths. | §Resolution Parity (the 3 re-pathing choke points), §Key Inventory (full enumerated catalog of 89 files / 441 call sites), §Don't Hand-Roll (mirror `planningRootName`, do not reinvent). |
| SDK-05 | Workflows that call `oto-sdk query …` consume its output when present and degrade gracefully (manual fallback) when absent. | §Tiered Fallback (read-only vs. structural classification + exact shell idiom), §State of the Art (D-06 reconciliation edits to SC#4 / SDK-05). |
</phase_requirements>

## Summary

This phase has **one real engineering surface**: the SDK query registry (`sdk/src/query/*.ts` plus two shared helpers) is hardcoded to `.planning/` and has **zero `.oto/` awareness** — no equivalent of the CJS `planningRootName()` / `hasMigratedPlanningRoot()` / `hasPlanningRoot()` model. The CJS layer (`oto/bin/lib/*.cjs`) is already correct: every path routes through `planningDir()` → `planningRootName()`, which prefers `.oto/`, falls back to a marker-tagged `.planning/`, and otherwise defaults `.oto/`. So the work is **bring the SDK to parity, then verify + wire fallback** — exactly as CONTEXT framed it. `[VERIFIED: grep sdk/src — "NONE FOUND" for planningRootName/.oto]`

**One material correction to the CONTEXT scoping.** CONTEXT.md (and the additional_context brief) describe `helpers.ts` `findProjectRoot()` as "THE single re-pathing site in the SDK." That is **not accurate against the code**. There are **three distinct choke points** and a long tail of direct hardcodes:
1. `sdk/src/query/helpers.ts` — `planningPaths()` (via `relPlanningPath`) **and** two raw `.planning` literals in `findProjectRoot()` (lines 477, 509).
2. `sdk/src/workstream-utils.ts` — `relPlanningPath()` returns the literal `'.planning'` (7 consumers, including `loadConfig` and `planningPaths`).
3. `sdk/src/config.ts` — `loadConfig()` hardcodes `.planning` (lines 156–157); this backs `agent-skills`, every `config-get`/`config-set`, `resolve-model`, `state.load`.

Beyond the three choke points, **~45 raw `join(projectDir, '.planning', …)` filesystem sites** exist across ~17 SDK files, of which the workflow-invoked handlers `init.ts` (14 sites), `phase.ts`, `commit.ts`, `progress.ts`, `summary.ts`, `intel.ts`, `state-mutation.ts`, `skill-manifest.ts`, `workspace.ts`, `phase-lifecycle.ts` bypass the helpers entirely. The clean fix is to **introduce a `planningRootName()`-equivalent in the SDK and route all three choke points + the bypassing handlers through it.** `[VERIFIED: grep "join(...'.planning'...)" sdk/src]`

**Primary recommendation:** Port the CJS resolution model into a single shared SDK helper (e.g. `planningRootName(projectDir)` + `hasMigratedPlanningRoot` + `hasPlanningRoot` in `helpers.ts`), make `relPlanningPath`/`planningPaths`/`loadConfig`/`findProjectRoot` consume it, and audit the workflow-invoked handlers' direct `.planning` literals to route through it. Then verify with an enumerate-keys + `.oto/` fixture smoke (node:test or vitest), keeping existing goldens green (they stay green because this repo has no `.oto/` yet, so resolution falls back to `.planning/`). Wire tiered fallback in workflows: extend the established `2>/dev/null || echo <default>` idiom for read-only keys; add a single hard-require guard helper for structural keys.

## Standard Stack

This is an internal port phase — no new external libraries. The "stack" is the existing toolchain, confirmed current.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | ^5.7.0 (sdk/package.json) | SDK source language | `[VERIFIED]` Confined to `sdk/` per CLAUDE.md "What NOT to Use". |
| Node.js | v22.17.1 (local), engines `>=22.0.0` | Runtime | `[VERIFIED: node --version]` Matches CLAUDE.md HIGH-confidence prescription. |
| vitest | ^3.1.1 (sdk devDep) | SDK unit + integration tests | `[VERIFIED: sdk/package.json]` Existing `sdk/golden/` + `sdk/src/query/*.test.ts` infra. |
| node:test | built-in | CJS tooling tests (root `npm test`) | `[VERIFIED: package.json]` Root test = `node --test --test-concurrency=4 tests/*.test.cjs`. |

### Supporting (test harness for D-07)
| Tool | Purpose | When to Use |
|------|---------|-------------|
| vitest integration project | `sdk/vitest.config.ts` already defines an `integration` project (`*.integration.test.ts`, 120s timeout). | The enumerate+smoke harness fits here naturally — same place the goldens live. |
| `oto-sdk query --project-dir <fixtureDir>` | The CLI accepts `--project-dir`, so a fixture `.oto/` tree can be pointed at without changing CWD. | The smoke test can dispatch real CLI argv against a temp `.oto/` fixture. |
| `createRegistry()` + `resolveQueryArgv()` | Programmatic dispatch path — no subprocess needed. | If the harness prefers in-process dispatch over spawning `bin/oto-sdk.js`. |

**Installation:** None. `cd sdk && npm install` is already satisfied; `npm run build` (tsc) rebuilds `dist/`.

**Version verification:** `[VERIFIED]` `node --version` → v22.17.1; `sdk/package.json` declares vitest ^3.1.1, typescript ^5.7.0, @types/node ^22.0.0. No registry lookups needed — no new deps.

## Architecture Patterns

### The three re-pathing choke points (the SDK-03 core work)

```
sdk/src/
├── workstream-utils.ts     # relPlanningPath() — returns '.planning' literal (CHOKE POINT 1)
├── config.ts               # loadConfig() — join(projectDir,'.planning','config.json') (CHOKE POINT 2)
└── query/
    ├── helpers.ts          # planningPaths() [via relPlanningPath] + findProjectRoot() raw '.planning' x2 (CHOKE POINT 3)
    ├── init.ts             # 14 raw join(...'.planning'...) — BYPASSES helpers
    ├── phase.ts            # planningPaths() OK, but milestones path raw '.planning' (188, 201)
    ├── commit.ts           # planningPaths() OK, but default stage glob ['.planning/'] (136), gate (203), error (253)
    ├── progress.ts         # 4 raw join(...'.planning'/todos...) — BYPASSES helpers
    ├── state.ts            # planningPaths() — OK, only needs choke point fix
    ├── state-mutation.ts   # 3 raw join(...'.planning'/WAITING.json...) — BYPASSES helpers
    ├── summary.ts          # raw join(cwd,'.planning','milestones')
    ├── intel.ts            # raw join(projectDir,'.planning','intel')
    ├── skill-manifest.ts   # raw join(projectDir,'.planning')
    ├── workspace.ts        # 3 raw join(...'.planning'...) — autonomous-runner internal
    └── phase-lifecycle.ts  # raw join(projectDir,'.planning',`${version}-MILESTONE-AUDIT.md`)
```

### Pattern 1: Mirror the CJS resolution model in a shared SDK helper (recommended for D-01/D-03)

**What:** Add `planningRootName(projectDir)`, `hasMigratedPlanningRoot(projectDir)`, `hasPlanningRoot(projectDir)` to `sdk/src/query/helpers.ts` as direct ports of `core.cjs:55-73`, then route the three choke points through them.

**When to use:** Always (D-01 mandates exact parity). A shared helper is preferable to porting the logic inline at each site (Claude's discretion per CONTEXT, but the evidence favors a helper: 45 sites would each need the same 3-branch logic otherwise).

**CJS reference to mirror exactly** `[VERIFIED: oto/bin/lib/core.cjs:55-73]`:
```javascript
// Source: oto/bin/lib/core.cjs lines 55-73
function hasMigratedPlanningRoot(cwd) {
  const statePath = path.join(cwd, '.planning', 'STATE.md');
  try {
    const state = fs.readFileSync(statePath, 'utf-8');
    return /^oto_state_version\s*:/m.test(state);
  } catch { return false; }
}
function planningRootName(cwd) {
  if (isDirectory(path.join(cwd, '.oto'))) return '.oto';
  if (isDirectory(path.join(cwd, '.planning')) && hasMigratedPlanningRoot(cwd)) return '.planning';
  return '.oto';
}
function hasPlanningRoot(cwd) {
  return isDirectory(path.join(cwd, '.oto')) || hasMigratedPlanningRoot(cwd);
}
```

**TS port shape (proposed — planner refines):**
```typescript
// sdk/src/query/helpers.ts (NEW)
function isDir(p: string): boolean {
  try { return existsSync(p) && statSync(p).isDirectory(); } catch { return false; }
}
export function hasMigratedPlanningRoot(projectDir: string): boolean {
  try {
    const state = readFileSync(join(projectDir, '.planning', 'STATE.md'), 'utf-8');
    return /^oto_state_version\s*:/m.test(state);
  } catch { return false; }
}
export function planningRootName(projectDir: string): '.oto' | '.planning' {
  if (isDir(join(projectDir, '.oto'))) return '.oto';
  if (isDir(join(projectDir, '.planning')) && hasMigratedPlanningRoot(projectDir)) return '.planning';
  return '.oto';
}
export function hasPlanningRoot(projectDir: string): boolean {
  return isDir(join(projectDir, '.oto')) || hasMigratedPlanningRoot(projectDir);
}
```

### Pattern 2: Route the choke points through `planningRootName`

**Choke point 1 — `relPlanningPath` (workstream-utils.ts:29-33).** Currently `posix.join('.planning', …)` with no project-dir awareness. The signature must change to accept the resolved root name, OR `planningPaths`/`loadConfig` must call `planningRootName(projectDir)` and pass the result. **Caution:** `relPlanningPath(workstream?: string)` has **7 consumers** `[VERIFIED: grep relPlanningPath sdk/src]` — changing its signature is a ripple. The lower-ripple option: keep `relPlanningPath(workstream)` returning a *relative subpath* but have `planningPaths`/`loadConfig` prepend `planningRootName(projectDir)` instead of assuming `.planning`.

**Choke point 2 — `loadConfig` (config.ts:155-157).** Replace `relPlanningPath(workstream)` and the literal `'.planning'` rootConfigPath with `planningRootName(projectDir)`-derived paths. This single fix re-paths `agent-skills`, `config-get`, `config-set`, `resolve-model`, `state.load`, and every config-dependent handler.

**Choke point 3 — `findProjectRoot` (helpers.ts:477, 509).** Replace the two raw `join(…, '.planning')` + `statSync().isDirectory()` checks with `hasPlanningRoot(candidate)` (D-03). The structural walk-up logic stays identical to the CJS `findProjectRoot` (which it already mirrors line-for-line).

### Pattern 3: Audit + route the bypassing workflow-invoked handlers

`init.ts`, `phase.ts` (milestones), `commit.ts` (stage glob/gate/error), `progress.ts`, `state-mutation.ts` (WAITING.json), `summary.ts`, `intel.ts`, `skill-manifest.ts`, `phase-lifecycle.ts` each build paths with raw `join(projectDir, '.planning', …)`. For SDK-03, only the **workflow-invoked** keys must resolve against `.oto/`; the planner should cross-reference §Key Inventory to decide which of these handlers are reachable from a workflow `oto-sdk query` call and route those through `join(projectDir, planningRootName(projectDir), …)`.

### Anti-Patterns to Avoid
- **`.oto/`-only hardcode in the SDK.** Explicitly rejected (D-02). Would break this repo (no `.oto/` until Phase 13), un-migrated user projects, and the goldens.
- **Changing `relPlanningPath`'s return to an absolute or project-dir-aware path without auditing all 7 consumers.** Will silently break workstream routing or `loadConfig` fallback.
- **Reimplementing ~50 query handlers in bash for fallback.** Rejected (D-05) — violates the personal-tool cost ceiling.
- **Editing `sdk/dist/` by hand.** It is a committed build artifact; regenerate with `cd sdk && npm run build`. (See Runtime State Inventory.)

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Planning-root resolution | A new SDK-only `.oto` detection heuristic | Direct port of `core.cjs` `planningRootName`/`hasMigratedPlanningRoot`/`hasPlanningRoot` | D-01 mandates byte-for-byte parity. Divergence breaks the whole point of the HANDOVER parity design. `[CITED: sdk/HANDOVER-QUERY-LAYER.md]` |
| Multi-repo walk-up | A fresh walk-up algorithm | The existing `findProjectRoot` (already a line-for-line CJS port) — just swap its `.planning` literals for `hasPlanningRoot()` | Logic is correct and tested; only the root predicate is stale. `[VERIFIED: helpers.ts:465-558]` |
| Structural-op fallback in shell | Per-handler bash reimplementations | A single hard-require guard idiom (`command -v oto-sdk \|\| { echo "<error>"; exit 1; }`) | D-05; ~50 handlers in bash is the rejected approach. |
| Read-only fallback | Custom default-value parsing | The established `oto-sdk query … 2>/dev/null \|\| echo <default>` idiom (97 existing uses) | Already the house pattern. `[VERIFIED: grep]` |
| Key extraction for tests | Hand-curated key list | Script-extract from `oto/workflows` + `oto/commands` at test time (D-07) | Hand lists drift; extraction is regression-proof. |

**Key insight:** The CJS layer already solved root resolution correctly. The SDK's only job is to *not diverge*. The cheapest correct implementation is a literal port, not a redesign.

## Runtime State Inventory

> This is a re-pathing phase — runtime state matters. The phase changes how the SDK *resolves* paths; it does not migrate stored data (that's Phase 13).

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | **None to migrate this phase.** This repo's planning data stays in `.planning/` until Phase 13 (DOG-*). The SDK re-pathing only changes *resolution preference*; with no `.oto/` present here, resolution still lands on `.planning/`. `[VERIFIED: D-02, CONTEXT out-of-scope]` | None (Phase 13 migrates data) |
| Live service config | None — oto has no external live services. | None |
| OS-registered state | **`oto-sdk v0.1.0` is installed on PATH at `/usr/local/bin/oto-sdk`** `[VERIFIED: command -v oto-sdk]` — a STALE global install from a prior `npm install -g`. Verification MUST run against a freshly-built `sdk/dist/` (e.g. via `bin/oto-sdk.js` from repo, or `node sdk/dist/cli.js`), NOT the stale global binary, or smoke results will be misleading. | Build fresh dist; point smoke at repo-local binary |
| Secrets/env vars | `OTO_QUERY_FALLBACK` (cli.ts) controls CJS-bridge fallback; `OTO_WORKSTREAM`/`OTO_PROJECT` affect CJS `planningDir` routing. Code-reference only — no key rename. `[VERIFIED: cli.ts:262, core.cjs:910-911]` | None (be aware in tests) |
| Build artifacts | **`sdk/dist/` is committed** (`[VERIFIED: ls sdk/dist]`) and is what ships (no install-time build per CLAUDE.md). Any `.ts` edit is INVISIBLE until `cd sdk && npm run build` regenerates `dist/`. The committed `dist/` MUST be rebuilt and re-committed as part of this phase. | `cd sdk && npm run build`, commit dist |

**Canonical question — after every file is updated, what runtime systems still have the old behavior cached?** The shipped `sdk/dist/` (stale until rebuilt) and the globally-installed `oto-sdk v0.1.0` binary. Both must be refreshed for verification to be meaningful.

## Common Pitfalls

### Pitfall 1: Treating "re-pathing" as a one-line `helpers.ts` change
**What goes wrong:** Following CONTEXT's "single re-pathing site" framing, only `findProjectRoot` gets touched; `loadConfig`, `relPlanningPath`, and ~45 direct-hardcode handler sites stay on `.planning`. `agent-skills`, `config-get`, `init.*`, `commit`, `progress`, `state-mutation` silently keep reading `.planning/` even when `.oto/` exists.
**Why it happens:** The brief understates the surface; the literal count looks small until you grep.
**How to avoid:** Treat the three choke points (`helpers.ts` `planningPaths`+`findProjectRoot`, `workstream-utils.ts` `relPlanningPath`, `config.ts` `loadConfig`) as mandatory, then sweep the bypassing handlers via §Key Inventory cross-reference. `[VERIFIED: grep — 45 join sites, 17 files]`

### Pitfall 2: Breaking the goldens by half-migrating
**What goes wrong:** The golden suite (`sdk/src/golden/`) compares SDK output to `gsd-tools.cjs` running against THIS repo (`.planning/`-based). If the SDK resolution starts preferring `.oto/` but the comparison subprocess still uses `.planning/`, results could diverge.
**Why it stays safe (and why to verify):** This repo has **no `.oto/` directory**, so `planningRootName()` falls through to `.planning/` (after the marker check fails) → SDK and CJS both resolve `.planning/`. Goldens stay green **only as long as no `.oto/` is created here.** `[VERIFIED: D-01 fallback logic + no .oto present]`
**How to avoid:** Do NOT create a `.oto/` at this repo's root. Put fixture `.oto/` trees in a temp dir or under `sdk/src/golden/fixtures/`, never at repo root. Run `cd sdk && npm test` after re-pathing to confirm goldens still pass.

### Pitfall 3: Testing against the stale global `oto-sdk`
**What goes wrong:** `oto-sdk` on PATH is v0.1.0 from a prior global install; smoke tests that invoke bare `oto-sdk` exercise stale code, not the re-pathed dist.
**How to avoid:** Invoke `node "$REPO/bin/oto-sdk.js"` or `node "$REPO/sdk/dist/cli.js"` in the harness; rebuild dist first. `[VERIFIED: oto-sdk v0.1.0 on PATH]`

### Pitfall 4: `relPlanningPath` signature ripple
**What goes wrong:** Changing `relPlanningPath(workstream)` to take `projectDir` breaks 7 consumers, some of which (e.g. `loadConfig`'s `rootConfigPath`) have subtle fallback semantics.
**How to avoid:** Prefer keeping `relPlanningPath` as a relative-subpath builder and resolving the root *name* at the `planningPaths`/`loadConfig` call sites. `[VERIFIED: 7 consumers]`

### Pitfall 5: SDK CJS-fallback bridge points at a non-existent path
**What goes wrong:** `sdk/src/gsd-tools.ts` `BUNDLED_GSD_TOOLS_PATH` resolves `../../get-shit-done/bin/gsd-tools.cjs`, which **does not exist** in this rebranded repo (tooling is `oto/bin/lib/oto-tools.cjs`). The `OTO_QUERY_FALLBACK` CJS-bridge for *unregistered* keys is therefore broken. This is distinct from the SDK-05 *workflow* fallback (shell-level `|| echo`), which is unaffected. `[VERIFIED: ls get-shit-done/bin/gsd-tools.cjs → DOES NOT EXIST]`
**How to avoid:** Out of scope for SDK-03/05 (the registry must answer natively; the CJS bridge is only for unregistered keys, of which there are none in the workflow set). Flag for the planner as an Open Question — likely a separate fix or Phase 13 concern, not this phase.

## Code Examples

### Existing read-only fallback idiom (extend for D-05 read-only tier)
```bash
# Source: oto/workflows (97 existing uses) — VERIFIED via grep
SKIP_DISCUSS=$(oto-sdk query config-get workflow.skip_discuss 2>/dev/null || echo "false")
COMMIT_DOCS=$(oto-sdk query config-get commit_docs 2>/dev/null || echo "true")
INIT=$(oto-sdk query init.map-codebase 2>/dev/null || echo "{}")
SECURITY_CFG=$(oto-sdk query config-get workflow.security_enforcement --raw 2>/dev/null || echo "true")
```

### Proposed hard-require guard idiom (D-05 structural tier — planner finalizes wording)
```bash
# For structural/stateful keys (init.*, commit, phase.add, state.update, …):
if ! command -v oto-sdk >/dev/null 2>&1; then
  echo "ERROR: oto-sdk is required for this operation but is not on PATH." >&2
  echo "Install with: npm install -g github:OTOJulian/oto-hybrid-framework" >&2
  exit 1
fi
oto-sdk query commit "docs: ..." --files .oto/STATE.md
```

### Enumerate-keys extraction for the D-07 harness
```bash
# Extract distinct query keys from workflows + commands (VERIFIED to produce 89 files / 441 sites)
grep -rhoE "oto-sdk query [a-zA-Z0-9._-]+( [a-zA-Z0-9._-]+)?" oto/workflows oto/commands \
  | sed 's/oto-sdk query //' | sort -u
# NOTE: this regex catches a few prose false-positives ("into a", "config-get if").
# The harness extractor must filter to keys that resolveQueryArgv() actually matches
# in createRegistry() — i.e. validate each extracted token against registry.has().
```

### Programmatic dispatch against a fixture (in-process smoke)
```typescript
// Source pattern: sdk/src/cli.ts:396-426 (VERIFIED)
import { createRegistry } from '../query/index.js';
import { resolveQueryArgv } from '../query/registry.js';
import { normalizeQueryCommand } from '../query/normalize-query-command.js';

const registry = createRegistry();
const [normCmd, normArgs] = normalizeQueryCommand(key, args);
const matched = resolveQueryArgv([normCmd, ...normArgs], registry);
// fixtureRoot points at a temp dir containing .oto/STATE.md, .oto/config.json, etc.
const result = await registry.dispatch(matched.cmd, matched.args, fixtureRoot, undefined);
// assert result.data is structured (object/string), not an error, and no .planning/ access.
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| SDK hardcoded to `.planning/` | SDK mirrors CJS `planningRootName()` (`.oto` first, marker-`.planning` fallback, `.oto` default) | This phase (SDK-03) | Registry answers `.oto/`-pathed keys at parity with CJS. |
| SC#4 / SDK-05 literal "fall back to manual file operations and complete successfully" | Tiered: read-only degrades to defaults; structural hard-requires SDK with one clear error | This phase (D-06) | **Requires text edits** to `.planning/ROADMAP.md` SC#4 (line 93) and `.planning/REQUIREMENTS.md` SDK-05 (line 16). |

**D-06 reconciliation — exact edits the planner must make:**
- `.planning/ROADMAP.md` Phase 12 SC#4 (line 93): "The same workflows fall back to manual file operations and complete successfully when `oto-sdk` is absent." → reframe to: read-only queries degrade to sensible defaults; structural/stateful operations fail fast with one clear, actionable error rather than silently completing. `[VERIFIED: ROADMAP.md:93]`
- `.planning/REQUIREMENTS.md` SDK-05 (line 16): "still degrade gracefully (manual fallback) when it is absent" → align to the same tiered wording. `[VERIFIED: REQUIREMENTS.md:16]`

**Deprecated/outdated:**
- `oto/bin/lib/oto-tools.cjs` is `@deprecated` in favor of `oto-sdk query` `[VERIFIED: oto-tools.cjs header]` — but remains the live CJS surface; in scope only for the D-04 stray-hardcode audit.

## CJS Stray-Hardcode Audit (D-04)

`[VERIFIED: grep across all 9 files]` — Result: **all 9 are "confirm", none require a logic fix.** The residual `.planning` literals fall into three legitimate buckets:

| File | `.planning` references | Verdict |
|------|------------------------|---------|
| `core.cjs` | `:56` (inside `hasMigratedPlanningRoot` — intentional marker check); all path access via `planningDir`/`planningRoot`/`planningRootName`; `:498` is a comment | **CONFIRM** — correct by design |
| `init.cjs` | All FS access via `planningRoot(cwd)`/`planningDir(cwd)`/`planningPaths(cwd)`; `:34` is a comment | **CONFIRM** |
| `state.cjs` | All via `planningPaths(cwd)`/`planningDir(cwd)` | **CONFIRM** |
| `commands.cjs` | All via `planningDir(cwd)`/`planningPaths(cwd)` | **CONFIRM** |
| `verify.cjs` | All via `planningDir(cwd)`; `:1205` comment | **CONFIRM** |
| `milestone.cjs` | All via `planningPaths(cwd)`; **`:163` is a literal `.planning/REQUIREMENTS.md` inside an archive-header *string***. Cosmetic — appears in an archived file's prose. | **CONFIRM** (note: cosmetic display string; planner may optionally route via `planningRootName` for tidiness, but it is migration-window-correct as-is since archives reference the legacy path) |
| `drift.cjs` | Only comments/doc strings referencing `.planning/codebase/` | **CONFIRM** |
| `migrate.cjs` | Deals with `.planning` ⇄ `.oto` explicitly by design (it IS the migration tool); rename map, dual-root checks (`:210`, `:237`) | **CONFIRM** — intentional dual-root handling |
| `gsd2-import.cjs` | Reverse-migration tool (`.oto/` → `.planning/`); `:468` error string says `.planning/` but variable points at `.oto` (`:464`) — **a pre-existing cosmetic message bug, unrelated to this phase** | **CONFIRM** (flag the `:468` message mismatch as a trivial optional fix, not blocking) |

**Audit conclusion:** D-04 is satisfied by confirmation. The only borderline items are *display strings* (`milestone.cjs:163`, `gsd2-import.cjs:468`) that do not affect resolution. No CJS logic change is required for SDK-03/SDK-05.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Goldens stay green after re-pathing because this repo has no `.oto/` (resolution falls back to `.planning/`). | Pitfall 2 | LOW — verified by D-01 logic; confirm by running `cd sdk && npm test` after the change. If a fixture accidentally creates `.oto/` at repo root, goldens could break. |
| A2 | Only the *workflow-invoked* handlers strictly need re-pathing for SDK-03; SDK-internal-only paths (`init-runner.ts`, `pipeline.ts`, `workspace.ts` autonomous internals) are out of the literal SDK-03 scope. | Pattern 3 | MEDIUM — if a workflow indirectly reaches one of these via a registry key, it must also be re-pathed. Planner should cross-check §Key Inventory against handler imports. |
| A3 | The `relPlanningPath` signature can stay relative-subpath-only (resolve root at call sites) to avoid a 7-consumer ripple. | Pattern 2 / Pitfall 4 | LOW — this is the lower-risk option; planner may choose the alternative. |
| A4 | The SDK CJS-fallback bridge being broken (`get-shit-done/bin/gsd-tools.cjs` absent) is out of scope for SDK-03/05. | Pitfall 5 / Open Questions | MEDIUM — depends on whether any workflow relies on an *unregistered* key hitting the bridge. Verified that all enumerated workflow keys ARE registered, so the bridge is not on the SDK-03 happy path. |

## Open Questions

1. **Broken SDK→CJS fallback bridge (`gsd-tools.cjs` path).**
   - What we know: `sdk/src/gsd-tools.ts` resolves `../../get-shit-done/bin/gsd-tools.cjs`, which does not exist post-rebrand (it's `oto/bin/lib/oto-tools.cjs`). `[VERIFIED]`
   - What's unclear: Whether this phase should fix the bridge or defer it. All enumerated workflow keys are *registered* in `createRegistry()`, so the bridge (only for unregistered keys) is not exercised by the workflow set.
   - Recommendation: Defer or treat as a separate quick-fix. Document, do not block SDK-03/05 on it. Confirm with user during plan-phase discussion.

2. **`relPlanningPath` re-path strategy (signature vs. call-site).**
   - What we know: 7 consumers; choke point for `loadConfig` + `planningPaths`.
   - What's unclear: Whether to change the signature (cleaner, riskier) or resolve root at call sites (lower ripple).
   - Recommendation: Call-site resolution (A3). Planner decides per Claude's-discretion clause in D-01.

3. **Fixture `.oto/` minimal contents for the smoke harness.**
   - What we know: Different key families need different files — `state.*` needs `.oto/STATE.md`; `config-get`/`agent-skills`/`resolve-model` need `.oto/config.json`; `phases.*`/`find-phase` need `.oto/phases/NN-name/`; `roadmap.*` needs `.oto/ROADMAP.md`; `commit` needs a git repo.
   - What's unclear: Exact fixture tree and whether `commit`/mutation keys are smoke-tested (they write) or asserted structurally only.
   - Recommendation: Build a minimal `.oto/` fixture covering STATE.md + config.json + ROADMAP.md + REQUIREMENTS.md + one phase dir; for mutation keys, assert dispatch resolves and targets `.oto/` paths (dry-run / temp-clone) rather than committing. Planner finalizes.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All SDK/CJS | ✓ | v22.17.1 | — |
| TypeScript (`tsc`) | SDK build | ✓ | ^5.7.0 (sdk devDep) | — |
| vitest | SDK tests + smoke harness | ✓ | ^3.1.1 | node:test |
| `oto-sdk` global binary | Workflow runtime | ✓ (STALE v0.1.0) | 0.1.0 | rebuild dist; use repo-local `bin/oto-sdk.js` |
| `bin/oto-sdk.js` shim | Repo-local CLI | ✓ | — | — |
| `sdk/dist/` | Shipped runtime | ✓ (committed, must rebuild) | — | `cd sdk && npm run build` |
| git | `commit` handler smoke | ✓ (repo is git) | — | — |

**Missing dependencies with no fallback:** None.
**Missing dependencies with fallback:** Stale global `oto-sdk v0.1.0` — rebuild `sdk/dist/` and invoke repo-local binary for verification.

## Validation Architecture

> Nyquist validation is enabled (`.planning/config.json` → `workflow.nyquist_validation: true` `[VERIFIED]`).

### Test Framework
| Property | Value |
|----------|-------|
| Framework (SDK) | vitest ^3.1.1, projects `unit` + `integration` (`sdk/vitest.config.ts`) |
| Framework (CJS) | node:test (root `package.json`) |
| Config file | `sdk/vitest.config.ts` (exists); root uses `node --test` (no config) |
| Quick run command | `cd sdk && npx vitest run --project unit` |
| Full suite command | `cd sdk && npm test` (unit+integration) **and** root `npm test` (CJS `node --test tests/*.test.cjs`) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SDK-03 | Every enumerated workflow key resolves against a fixture `.oto/` with structured (non-error) output | integration (enumerate+smoke) | `cd sdk && npx vitest run src/golden/oto-query-smoke.integration.test.ts --project integration` | ❌ Wave 0 |
| SDK-03 | No resolution touches `.planning/` when only `.oto/` is present in the fixture | integration | (same smoke test asserts via fs spy / fixture with no `.planning/`) | ❌ Wave 0 |
| SDK-03 | `planningRootName`/`hasMigratedPlanningRoot`/`hasPlanningRoot` match CJS behavior across `.oto`-only, marker-`.planning`, no-root, both-present cases | unit | `cd sdk && npx vitest run src/query/helpers.test.ts --project unit` | ⚠️ extend existing helpers tests / ❌ new cases |
| SDK-03 | Existing goldens stay green (parity preserved) | integration | `cd sdk && npx vitest run --project integration` | ✅ existing |
| SDK-05 | Read-only keys degrade to default when `oto-sdk` absent | manual + shell smoke | grep-assert that read-only call sites use `2>/dev/null || echo <default>`; optionally a shell test with PATH stripped | ⚠️ shell assertion / ❌ Wave 0 |
| SDK-05 | Structural keys fail fast with one clear error when absent | manual + shell | assert hard-require guard present on structural call sites | ⚠️ ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `cd sdk && npx vitest run --project unit` (fast) + the new helpers resolution test.
- **Per wave merge:** `cd sdk && npm test` (full vitest, incl. goldens) + root `npm test` (CJS regression).
- **Phase gate:** Full vitest green + root CJS tests green + enumerate-smoke passes for every registered workflow key before `/gsd-verify-work`.

### Validation strategy (D-07 grounding — how it proves SC#1-2)
The harness:
1. **Enumerates** every distinct `oto-sdk query <key>` token from `oto/workflows/` + `oto/commands/` at test time (extraction script in §Code Examples), then **filters** to tokens that `registry.has()` accepts (drops prose false-positives like "into a").
2. Builds a **fixture `.oto/` project** in a temp dir (STATE.md, config.json, ROADMAP.md, REQUIREMENTS.md, one `phases/NN-name/` dir; git-init for commit-class keys) with **no `.planning/` directory**.
3. For each enumerated key, **dispatches** via `createRegistry().dispatch(cmd, args, fixtureRoot)` (in-process) — proving SC#1 ("answers every key").
4. **Asserts** the result is structured (object or string), not a thrown `GSDError`/`{error}` for read-only keys, and that any resolved path string is rooted at the fixture's `.oto/`, never `.planning/` — proving SC#2 ("resolve against `.oto/`").
5. Re-runs the existing goldens to prove parity is unbroken (they pass because this repo has no `.oto/`).

### Wave 0 Gaps
- [ ] `sdk/src/golden/oto-query-smoke.integration.test.ts` — enumerate+fixture smoke covering SDK-03 (SC#1, SC#2).
- [ ] `sdk/src/golden/fixtures/oto-project/` (or temp-dir builder) — minimal `.oto/` fixture tree.
- [ ] Extend `sdk/src/query/helpers.test.ts` (or new file) — `planningRootName`/`hasMigratedPlanningRoot`/`hasPlanningRoot` unit cases: `.oto`-only, marker-`.planning`, unmarked-`.planning`, no-root, both-present.
- [ ] Shell-level assertion (node:test or script) that read-only call sites carry `|| echo <default>` and structural call sites carry the hard-require guard (SDK-05). *(May be a static grep assertion rather than a runtime test.)*

## Security Domain

> `security_enforcement` is not disabled in config; treated as enabled. This is an internal re-pathing phase with a constrained threat surface.

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | n/a (local CLI tooling) |
| V3 Session Management | no | n/a |
| V4 Access Control | no | n/a |
| V5 Input Validation | yes | Existing: `validateWorkstreamName()` (workstream-utils), `BAD_SEGMENT` regex in CJS `planningDir` rejecting `..`/separators, `resolvePathUnderProject()` (realpath escape guard) in helpers.ts. Re-pathing MUST preserve these. `[VERIFIED: workstream-utils.ts:15, core.cjs:914, helpers.ts:571]` |
| V6 Cryptography | no | n/a |
| V12 File Resources | yes | Path traversal containment — `planningRootName(projectDir)` must not enable resolution outside `projectDir`; keep `resolvePathUnderProject` guards on user-supplied paths. |

### Known Threat Patterns for this stack
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Path traversal via workstream/project name | Tampering | Existing `validateWorkstreamName` + `BAD_SEGMENT` regex — preserve when routing through `planningRootName`. |
| Resolution escaping project root in multi-repo walk-up | Elevation/Tampering | `findProjectRoot` never walks above `homedir()` (`:507`); keep this bound when swapping the `.planning` predicate for `hasPlanningRoot`. `[VERIFIED: helpers.ts:507]` |
| Reading attacker-controlled STATE.md for the `oto_state_version:` marker | Tampering | Marker check is a regex on a file already inside the project root; no new surface (mirrors CJS). |

**Security note:** Re-pathing introduces no new external input. The only behavioral change is *which root directory* is preferred. All existing input-validation and traversal guards must be carried through unchanged.

## Sources

### Primary (HIGH confidence — direct codebase reads this session)
- `oto/bin/lib/core.cjs` (lines 1-177, 895-994) — canonical resolution model: `hasMigratedPlanningRoot`, `planningRootName`, `hasPlanningRoot`, `findProjectRoot`, `planningDir`, `planningRoot`, `planningPaths`.
- `sdk/src/query/helpers.ts` (full) — `planningPaths`, `findProjectRoot` (the `.planning` literals at 477, 509), `resolvePathUnderProject`.
- `sdk/src/workstream-utils.ts` (full) — `relPlanningPath` choke point, `validateWorkstreamName`.
- `sdk/src/config.ts` (120-209) — `loadConfig` `.planning` hardcode + user-defaults fallback.
- `sdk/src/query/registry.ts`, `sdk/src/query/index.ts` (full) — `createRegistry()`, `QueryRegistry`, `resolveQueryArgv`, `QUERY_MUTATION_COMMANDS`, full handler registration list.
- `sdk/src/cli.ts` (full) — `oto-sdk query` dispatch path, `findProjectRoot` call, `--project-dir`/`--ws` handling, `OTO_QUERY_FALLBACK`.
- `sdk/src/query/skills.ts`, `state.ts`, `phase.ts`, `commit.ts` — how workflow-invoked handlers resolve paths (planningPaths vs. raw).
- `sdk/src/gsd-tools.ts` (20-90) — `BUNDLED_GSD_TOOLS_PATH` / `resolveGsdToolsPath` (broken post-rebrand).
- `sdk/HANDOVER-QUERY-LAYER.md`, `sdk/src/query/QUERY-HANDLERS.md` — registry architecture, parity tiers, normalize/dispatch semantics.
- `sdk/vitest.config.ts`, `sdk/package.json`, root `package.json` — test infra + scripts.
- grep enumerations: 89 workflow/command files, 441 `oto-sdk query` call sites, distinct key catalog; 45 `join(...'.planning'...)` FS sites across 17 SDK files; 97 `|| echo` + 70 `|| true` fallback idioms; CJS 9-file audit.
- `.planning/ROADMAP.md` (Phase 12, SC#4 line 93), `.planning/REQUIREMENTS.md` (SDK-05 line 16) — D-06 reconciliation targets.
- `.planning/config.json` — `nyquist_validation: true`.
- `CLAUDE.md` — TS-in-`sdk/`-only, node:test/vitest split, ship prebuilt dist, no install-time build, personal-use cost ceiling.

### Secondary (MEDIUM confidence)
- `command -v oto-sdk` → `/usr/local/bin/oto-sdk v0.1.0` (stale global install — environment-specific).

### Tertiary (LOW confidence)
- None. All claims grounded in primary codebase reads.

## Project Constraints (from CLAUDE.md)

- **TypeScript confined to `sdk/`** — re-pathing is TS *inside* `sdk/`; do not introduce TS at the top level. `[CITED: CLAUDE.md "What NOT to Use"]`
- **`node:test` for CJS tooling; vitest only inside `sdk/`** — SDK smoke harness uses vitest; any CJS-side test uses `node --test`.
- **Ship prebuilt `sdk/dist/`; NO install-time build** — rebuild and commit `sdk/dist/` as part of this phase; do not add a `prepare`/postinstall TS build.
- **Personal-use cost ceiling** — directly drives D-05: do NOT reimplement ~50 query handlers in bash. Tiered fallback only.
- **Both upstreams MIT; preserve attribution** — re-pathing edits existing ported files; keep license/attribution headers intact.
- **GSD workflow enforcement** — this repo uses `/gsd-*` tooling for its own dev until v0.4.0 ships (per MEMORY.md), and stays on `.planning/` until Phase 13.

## Metadata

**Confidence breakdown:**
- Resolution parity (D-01..D-03): HIGH — CJS model read line-for-line; SDK choke points located and counted via grep.
- Key inventory (SDK-03): HIGH — full enumeration of 89 files / 441 sites, registry registration list read in full.
- Tiered fallback (D-05/D-06): HIGH — 167 existing fallback idioms counted; exact ROADMAP/REQUIREMENTS lines located.
- CJS audit (D-04): HIGH — all 9 files grepped; verdict "confirm, no logic fix."
- Verification (D-07): HIGH on strategy; MEDIUM on exact fixture contents (Open Question 3).
- Scope correction (single-site → three choke points): HIGH — grep evidence directly contradicts the "single site" framing.

**Research date:** 2026-05-25
**Valid until:** 2026-06-24 (stable internal codebase; ~30 days). Re-verify if `sdk/src/query/` is refactored or the rebrand touches `get-shit-done/` paths before this phase executes.
