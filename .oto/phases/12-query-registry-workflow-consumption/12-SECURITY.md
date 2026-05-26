---
phase: 12-query-registry-workflow-consumption
phase_number: 12
status: verified
threats_open: 0
asvs_level: 1
verified: 2026-05-26T00:00:00Z
auditor: Claude security auditor
backfill: true
---

# Phase 12 Security Verification

Retroactive (backfill) security verification for Phase 12. The phase shipped with all four plans completed but no SECURITY.md was produced; this pass closes that gap before milestone v0.4.0 is archived. Scope is the declared Phase 12 surface: the rebuilt `oto-sdk` query registry resolving against `.oto/` planning-root paths, the planning-root resolver and the ~40 swept `.planning` join sites, the `loadConfig`/`findProjectRoot`/`relPlanningPath` choke points, the tiered SDK-fallback policy, and any workflow/CLI input flowing into file paths or written artifacts.

Each Phase 12 plan (`12-01..12-04-PLAN.md`) carries its own `<threat_model>` STRIDE register (T-12-01 through T-12-14). Every threat was verified against the implemented code; no threat was accepted on documentation or intent alone.

## Result

| Metric | Count |
|--------|-------|
| Threats reviewed | 14 |
| Closed | 14 |
| Open | 0 |
| Accepted risks | 7 |
| Unregistered summary flags | 0 |

Security enforcement is treated as enabled. `.oto/config.json` does not disable security enforcement (no security-disabling keys present), and project convention defaults phase security gates to ASVS Level 1 (consistent with Phase 11) unless a stricter config is present.

## Critical Review Finding Disposition

`12-REVIEW.md` reported 1 critical + 3 warnings, status `fixed`. The critical (CR-01) **was a security issue** — a path-traversal / data-loss vulnerability — and the fix holds:

- **CR-01 (path traversal in `todoComplete`)** — `sdk/src/query/progress.ts:549-573` now imports `isAbsolute`, `relative`, `resolve` and an `assertPathInside(baseDir, targetPath, label)` guard (`progress.ts:29-33`). Both the pending source and completed destination paths are `resolve()`d and asserted inside their respective todo directories before any `writeFileSync`/`unlinkSync` (`progress.ts:557-560`). A traversal value such as `../../STATE.md` now throws a `GSDError` validation error instead of overwriting and unlinking a planning file. The compiled `sdk/dist/query/progress.js` reflects the guard (grep count 4). Regression test `sdk/src/query/progress.test.ts:160-171` asserts `todoComplete(['../../STATE.md'], tmpDir)` rejects with `classification: 'validation'` AND that the out-of-bounds `STATE.md` content is left untouched. **CLOSED.**
- WR-01 / WR-02 / WR-03 were workstream-routing correctness regressions (default staging scope, config/model forwarding, roadmap milestone forwarding), not path-containment or injection security issues. They are confirmed fixed in code (see Supplemental Checks) and do not affect the threat dispositions below.

## Threat Verification

| Threat ID | Category | Component | Disposition | Status | Evidence |
|-----------|----------|-----------|-------------|--------|----------|
| T-12-01 | Tampering | `hasMigratedPlanningRoot` reading `.planning/STATE.md` | accept | CLOSED | AR-12-01. Marker regex runs on a file already inside `projectDir`; `sdk/src/planning-root.ts:28-35` reads `join(projectDir, '.planning', 'STATE.md')` (literal segments) and tests only `/^oto_state_version\s*:/m`. No new surface vs. the `core.cjs` resolver it ports. |
| T-12-02 | Information Disclosure | `readFileSync(STATE.md)` error path | mitigate | CLOSED | `sdk/src/planning-root.ts:29-34` wraps the read in `try { … } catch { return false; }` — no path or stack leaked. `isDir` does the same (`planning-root.ts:15-21`). Matches `core.cjs:60-62`. |
| T-12-03 | Elevation of Privilege | path construction in `isDir`/`planningRootName` | accept | CLOSED | AR-12-02. `planningRootName` only `join(projectDir, '.oto' \| '.planning' \| 'STATE.md')` with hardcoded literal segments (`sdk/src/planning-root.ts:44-57`); no user-controlled segment concatenated. Workstream/segment validation lives downstream (T-12-05). |
| T-12-04 | Elevation of Privilege / Tampering | `findProjectRoot` walk-up | mitigate | CLOSED | Upper bound preserved: `if (parent === home) break;` at `sdk/src/query/helpers.ts:511` (grep count 1) and `FIND_PROJECT_ROOT_MAX_DEPTH = 10` cap at `helpers.ts:448`/`508`. The `.planning` predicate was swapped for `hasPlanningRoot` (`helpers.ts:485,513`) without removing either bound — resolution cannot escape above home. |
| T-12-05 | Tampering | `relPlanningPath` workstream interpolation | mitigate | CLOSED | `validateWorkstreamName` preserved and rejects `..`/`../`/slashes/empty via `name === '..' \|\| name.startsWith('../')` plus `/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/` (`sdk/src/workstream-utils.ts:16-22`). `relPlanningPath` prepends only `planningRootName(projectDir)` (literal) + `posix.join(root, 'workstreams', workstream)` (`workstream-utils.ts:31-36`) — no new traversal vector. |
| T-12-06 | Tampering | `loadConfig` reading attacker-influenced config.json | accept | CLOSED | AR-12-03. config.json lives inside the resolved project root; re-pathing changes only WHICH root, not the trust model. `commit.ts:189-197` shows malformed JSON is caught and defaults applied; no crash or leak. |
| T-12-07 | Tampering | `state-mutation.ts` WAITING.json write + `mkdirSync` under resolved root | accept | CLOSED | AR-12-04. Write target is `join(projectDir, planningRootName(projectDir), 'WAITING.json')` (`sdk/src/query/state-mutation.ts:1282,1297`) — both segments SDK-controlled literals/resolver output, no user-path concatenation. Containment model unchanged; only the root name re-pathed. |
| T-12-08 | Information Disclosure | `profile-output.ts` reading PROJECT.md / codebase docs from resolved root | accept | CLOSED | AR-12-05. Reads docs already inside the project root; re-pathing only changes which root. `12-03-SUMMARY.md:148-151` confirms the pre-existing fallback text paths were untouched. No new read surface. |
| T-12-09 | Tampering | a missed site silently reads/writes the WRONG root | mitigate | CLOSED | Scoped sweep enforced: `grep -rn "startsWith('.planning/')"` across `sdk/src/` returns no matches; all consumers route through `planningRootName`/`relPlanningPath`/`planningPaths`. Whitelisted residuals (skipDirs, archive prose) documented in `12-03-PLAN.md:381`. Prevents a half-migrated handler splitting reads/writes across roots. |
| T-12-10 | Tampering | smoke harness creating directories | mitigate | CLOSED | Fixtures live under `sdk/src/golden/fixtures/`; runtime copies under `mkdtempSync(tmpdir())`, never repo root. Acceptance asserts `test ! -d .oto` at repo root (`12-04-PLAN.md:303`); confirmed no `.oto/` exists outside `.oto/` planning root in this repo. |
| T-12-11 | Denial of Service | enumerate step spawning grep over many files | accept | CLOSED | AR-12-06. Bounded one-time extraction over `oto/workflows` + `oto/commands` at test setup; integration project carries a 120s timeout. No unbounded recursion. |
| T-12-12 | Spoofing / Tampering | structural hard-require guard | mitigate | CLOSED | `oto/workflows/lib/sdk-require.md:3-25` requires structural/stateful keys (`init.*`, `commit`, `phase.add/insert/remove/complete`, `state.*`, `roadmap.update-plan-progress`, `requirements.mark-complete`, `milestone.complete`) to `exit 1` on missing `oto-sdk`, while read-only keys degrade to defaults. Fixed error string, executes no user input. `tests/sdk-fallback-policy.test.cjs` passes (3/3). |
| T-12-13 | Information Disclosure | reconciliation edits to planning docs | accept | CLOSED | AR-12-07. ROADMAP/REQUIREMENTS edits are local doc-text changes with no secrets; standard planning-doc maintenance. |
| T-12-14 | Elevation of Privilege | `commit.ts` commit_docs gate bypass via prefix mismatch | mitigate | CLOSED | Gate prefix is rooted via `paths.planning` from `planningPaths(projectDir, workstream)`: `commit.ts:204-208` filters staged files by `normalized === planningRel \|\| normalized.startsWith(planningRel + '/')`. The stale `startsWith('.planning/')` literal is gone (grep: NONE FOUND across `sdk/src/`), so `.oto/` doc files are correctly caught by `commit_docs:false`. |

## Accepted Risks

| Risk ID | Threat ID | Rationale | Owner | Date |
|---------|-----------|-----------|-------|------|
| AR-12-01 | T-12-01 | The migrated-marker regex reads a file already inside `projectDir`; an attacker who can write `.planning/STATE.md` inside the project already controls the project. Internal dev tooling, no network input. Direct behavioral port of `core.cjs`. | Claude security audit | 2026-05-26 |
| AR-12-02 | T-12-03 | `isDir`/`planningRootName` concatenate only hardcoded literal path segments under a SDK-resolved `projectDir`; no user-controlled segment enters here. Traversal surface is confined to consumers guarded by T-12-05. | Claude security audit | 2026-05-26 |
| AR-12-03 | T-12-06 | `config.json` is read from inside the resolved project root (existing behavior). Re-pathing changes only which root is selected, not the trust model. Malformed JSON is caught and defaults applied (`commit.ts:189-197`). | Claude security audit | 2026-05-26 |
| AR-12-04 | T-12-07 | WAITING.json write target is composed from SDK-controlled literals and resolver output; the pre-existing write-containment model is unchanged by re-pathing. | Claude security audit | 2026-05-26 |
| AR-12-05 | T-12-08 | profile-output reads docs already inside the project root; re-pathing only corrects which root. No new read surface introduced. | Claude security audit | 2026-05-26 |
| AR-12-06 | T-12-11 | The smoke enumerate step is a bounded one-time grep over a fixed workflow/command corpus with a 120s integration timeout; no unbounded recursion. Developer-side test harness. | Claude security audit | 2026-05-26 |
| AR-12-07 | T-12-13 | Reconciliation edits are local planning-doc text with no secrets; standard maintenance, no disclosure surface. | Claude security audit | 2026-05-26 |

## Supplemental Checks

| Check | Status | Evidence |
|-------|--------|----------|
| Path traversal in todo completion (CR-01) | CLOSED | `assertPathInside` guard + dual `resolve`/assert at `sdk/src/query/progress.ts:29-33,557-560`; regression at `progress.test.ts:160-171`; compiled into `sdk/dist/query/progress.js`. |
| `findProjectRoot` cannot escape home | CLOSED | `parent === home` break (`helpers.ts:511`) and depth cap (`helpers.ts:448,508`) both survive the `hasPlanningRoot` predicate swap. |
| Workstream name validation preserved | CLOSED | `validateWorkstreamName` rejects traversal/slashes/empty (`workstream-utils.ts:16-22`). |
| No stale `.planning/` gate prefix | CLOSED | `grep -rn "startsWith('.planning/')" sdk/src/` returns no matches; gate rooted via `paths.planning`. |
| Structural ops fail fast, read-only ops degrade | CLOSED | `oto/workflows/lib/sdk-require.md:3-25`; `tests/sdk-fallback-policy.test.cjs` passes 3/3. No structural op silently completes on missing SDK. |
| WR-01: workstream commit default staging scoped | CLOSED (correctness) | Default stage path is `relative(projectDir, paths.planning) + '/'` (`commit.ts:137-138`), not the root planning name. |
| WR-02: init handlers forward workstream | CLOSED (correctness) | `loadConfig(projectDir, workstream)` and `getModelAlias(..., projectDir, workstream)` forwarded (`init.ts:39-40,281,288-289,360,367-369`). |
| WR-03: roadmap milestone extraction forwards workstream | CLOSED (correctness) | `readModifyWriteRoadmapMd` is workstream-aware (`phase-lifecycle.ts:161-181`) and `extractCurrentMilestone(..., projectDir, workstream)` is forwarded at lifecycle mutation sites (`phase-lifecycle.ts:221,374,477,1281,1368`). |
| No unsanitized content written to artifacts | CLOSED | Artifact writes (WAITING.json, todos, ROADMAP.md) use SDK-resolved literal paths; no raw user input is concatenated into write targets. Display/return values surface validation errors, not paths/stacks. |

## Summary Threat Flags

No unregistered threat flags were reported in the Phase 12 summaries. All summary surfaces map to registered threats:

| Summary | Threat Flags |
|---------|--------------|
| `12-01-SUMMARY.md` | None; new STATE.md marker reads mapped to T-12-01/T-12-02 (`12-01-SUMMARY.md:103-105`) |
| `12-02-SUMMARY.md` | None (`12-02-SUMMARY.md:140-142`) |
| `12-03-SUMMARY.md` | None; pre-existing profile-output fallbacks mapped to T-12-08 (`12-03-SUMMARY.md:153-155`) |
| `12-04-SUMMARY.md` | None (`12-04-SUMMARY.md:150-152`) |

## Verification Commands

| Command | Result |
|---------|--------|
| `node --test tests/sdk-fallback-policy.test.cjs` | PASS, 3 tests, 0 fail |
| `grep -rn "startsWith('.planning/')" sdk/src/` | PASS, no matches (stale gate prefix removed) |
| `grep -c "parent === home" sdk/src/query/helpers.ts` | PASS, 1 (walk-up bound survives) |
| `grep -cE "planningRootName\|hasMigratedPlanningRoot\|hasPlanningRoot" sdk/src/query/helpers.test.ts` | PASS, 25 |
| `grep -c "planning-root resolution" sdk/src/query/helpers.test.ts` | PASS, 1 |
| `grep -c "escapes todo directory\|assertPathInside" sdk/dist/query/progress.js` | PASS, 4 (traversal guard compiled into dist) |
| `progress.test.ts` traversal regression | PASS, `todoComplete(['../../STATE.md'])` rejects + STATE.md untouched |

## Audit Trail

| Date | Threats | Closed | Open | Auditor |
|------|---------|--------|------|---------|
| 2026-05-26 | 14 | 14 | 0 | Claude security auditor (backfill) |

## Routing

Phase 12 is threat-secure. All 14 declared threats are CLOSED (7 mitigated, 7 accepted with logged rationale). The review's critical finding (CR-01) was a path-traversal/data-loss security issue and its fix is present in source and compiled output with regression coverage. No security blocker remains before milestone v0.4.0 close.
