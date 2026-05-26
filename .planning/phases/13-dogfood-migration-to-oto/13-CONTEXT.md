# Phase 13: Dogfood migration to `.oto/` - Context

**Gathered:** 2026-05-25
**Status:** Ready for planning

<domain>
## Phase Boundary

**This phase delivers:** This repo's planning root moves from `.planning/` → `.oto/` with git history preserved, oto commands operate on `.oto/` with **no manual path override**, every *genuine* in-repo self-reference to the old location is updated, and it's a **clean cutover** — no dual-location shim keeping `.planning/` alive. After this phase, the repo self-manages via `/oto-*`, ending the GSD/oto split-brain.

**Scouting findings that scope this phase:**
- **The resolver is already ready (Phase 12).** `core.cjs:planningRootName()` resolves `.oto/` first; the SDK mirrors it (D-01). Once `.oto/` exists it wins regardless of any marker. This phase is the *physical move + reference hygiene + the daily-flow flip* — not resolver work.
- **This repo already self-manages through its own live code.** `/usr/local/bin/oto-sdk` is symlinked to `…/oto-hybrid-framework/bin/oto-sdk.js`, and the CJS tooling lives in-repo at `oto/bin/lib/`. So the oto surface that manages this repo IS this repo's v0.4.0 code — there is no stale-global-install risk. (Upstream GSD at `~/.claude/get-shit-done/` is a separate, `.planning/`-only install and will not find `.oto/` after the move — hence the `/gsd-*` → `/oto-*` daily-flow flip.)
- **The reference surface is a trap, not a chore.** 703 tracked files mention `.planning/`, but the overwhelming majority are *intentional* and must be FROZEN: `foundation-frameworks/` (478 — the upstream-sync byte-baseline), the Phase-12 `.planning/`-with-marker fallback in `core.cjs`/`sdk/helpers.ts`, `migrate.cjs`'s GSD-handling logic, `rename-map.json`, and migration test fixtures. Genuine stale *self*-references are a small allowlist.

**In scope (Phase 13):**
- `git mv .planning .oto` as an atomic, history-preserving rename.
- Rewrite the small allowlist of genuine live self-references.
- Flip `gsd_state_version` → `oto_state_version` in the moved `STATE.md`.
- Flip CLAUDE.md's "GSD Workflow Enforcement" block to OTO `/oto-*`.
- Verify DOG-02 empirically (live probe) + commit a guard test.

**Out of scope:**
- A `.planning/` → `.oto/` dual-location shim (explicitly rejected — clean cutover).
- Rewriting the resolver's intentional `.planning/` fallback, `migrate.cjs`, the rename-map, upstream `foundation-frameworks/`, or migration test fixtures.
- Migrating end-users' projects (that's `/oto-migrate`, already shipped + opt-in).
- Resolver/SDK rework (done in Phase 12).
</domain>

<decisions>
## Implementation Decisions

### Move mechanism & git history
- **D-01:** Move via a single atomic `git mv .planning .oto`, committed on its own. Git records a pure rename so `git log --follow` preserves full history. **Rejected:** dogfooding `/oto-migrate --apply --rename-state-dir` here — it uses `fsp.rename` (history relies on post-hoc detection, not a tracked rename) AND rewrites every `gsd_state_version`/GSD marker → oto across planning docs that legitimately document the GSD→oto port (destructive on this repo). `/oto-migrate` remains correct for end-user GSD projects; it is the wrong tool for *this* repo.
- **D-02:** Prepare a clean tree before the move: commit the in-flight `04-*`/`05-*` plan + validation edits and the new `05-*` plans first, and add `.DS_Store` + `.claude/` to `.gitignore`. The rename commit must be pure (move only, no unrelated WIP).

### Reference-update scope (highest blast-radius decision)
- **D-03:** Governing rule = **allowlist of genuine live self-references.** Rewrite ONLY this repo's real operational self-refs; everything not on the allowlist stays `.planning/` by default. (Rejected: "rewrite everything except a freeze-list" — inverts the risk so anything forgotten gets corrupted.)
- **D-04:** The following are FROZEN by definition (must keep saying `.planning/`):
  - `foundation-frameworks/` — vendored GSD + Superpowers; the upstream-sync comparison baseline (must stay byte-identical).
  - The Phase-12 resolver fallback — the `.planning/`-with-marker branch in `oto/bin/lib/core.cjs` (`planningRootName`/`hasMigratedPlanningRoot`), `sdk/src/query/helpers.ts`, and `migrate.cjs`'s GSD-handling code. This is the migration-window contract (Phase 12 D-01).
  - `rename-map.json`, `reports/rebrand-dryrun.json`, and migration test fixtures — reference `.planning/` by design to exercise the conversion path.
  - Generic shipped `oto/workflows/` + `oto/commands/` markdown — resolves via tooling, ships to users; not a this-repo self-ref. (Revisit only if a specific file hardcodes *this repo's* path.)
- **D-05:** The planner MUST enumerate the concrete allowlist (likely: CLAUDE.md enforcement block, `decisions/ADR-01-state-root.md` forward-note, this-repo docs that cite the live planning path, any config/tooling hardcoding THIS repo's root) and justify each inclusion. Default-exclude when uncertain.

### Tooling cutover & state marker
- **D-06:** Flip `gsd_state_version: 1.0` → `oto_state_version: 1.0` in the moved `.oto/STATE.md`. Resolution doesn't require it once `.oto/` exists, but it ends the stale GSD-managed signal and makes the file honestly oto-owned.
- **D-07:** Rewrite CLAUDE.md's "GSD Workflow Enforcement" block → "OTO Workflow Enforcement" pointing at `/oto-quick`, `/oto-debug`, `/oto-execute-phase`, etc. This repo's daily flow switches from `/gsd-*` to `/oto-*` — the literal point of dogfooding. **Sequencing:** the move + flip should land so that the *remaining* Phase 13 work (and all future work) runs via `/oto-*`; this satisfies the trigger in the user's standing "use `/gsd-*` until v0.4.0 ships the SDK + `.oto/` migration" note, which should be retired once Phase 13 lands.

### DOG-02 verification
- **D-08:** Verify "no manual path override" empirically: after the move, run representative read + structural `oto-sdk query …` (`init.*`, state reads, `phases.*`) plus a CJS tool call with **no path flag**, and assert they resolve `.oto/` and never touch `.planning/`. The probe is meaningful because `oto-sdk` is symlinked to this repo's live code.
- **D-09:** Add a small committed **guard test** asserting this repo has no `.planning/` directory and oto resolves `.oto/`. Durable regression protection against a future accidental `.planning/` reintroduction. This is the *this-repo* counterpart to Phase 12's *fixture* enumerate-smoke (D-07), not a duplicate.

### Historical artifact path strings
- **D-10:** Rewrite internal `.planning/ → .oto/` path strings ONLY in **live artifacts** downstream agents actively read: `ROADMAP.md`, `REQUIREMENTS.md`, `STATE.md`, and active phase 11/12/13 CONTEXT/PLAN docs (e.g. `canonical_refs` that get opened). **Preserve** completed-phase directories (v0.1.0–v0.3.0), `milestones/` archives, and `decisions/` ADRs as point-in-time records — they recorded what was true at the time. (Rejected: rewrite-all — mutates history, enlarges blast radius. Rejected: preserve-all — leaves live `canonical_refs` pointing at the dead location, breaking downstream agents.)
- **D-11:** Exception to D-10: `decisions/ADR-01-state-root.md` gets a single forward-note line ("paths historical; this repo's root is now `.oto/` as of Phase 13") since it is *the* record of this state-root decision and deserves a breadcrumb.

### Claude's Discretion
- Exact ordering of the cutover commits (move → marker → references → enforcement → verify) within the constraints of D-02 (clean tree first) and D-07 (flip lands so remaining work is `/oto-*`).
- The precise allowlist membership (D-05) — planner enumerates and justifies.
- Guard-test placement and runner (D-09) — `node:test` in this repo's existing tooling tests is the natural home.
- Whether the `04-*`/`05-*` pending edits commit as one or several commits (D-02), as long as the tree is clean before the rename.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

> Path note: planning + execution run *before* the move, so these point at the current `.planning/` locations (where the files actually are when you read them). Execution relocates `.planning/` → `.oto/`; the plan must account for paths shifting mid-phase.

### Phase scope & requirements
- `.planning/ROADMAP.md` (Phase 13 section) — goal + 4 success criteria (history preserved, no path override, every ref updated, clean cutover — no shim).
- `.planning/REQUIREMENTS.md` — DOG-01 (move with history preserved), DOG-02 (no path override), DOG-03 (update this repo's references). Note the "Out of Scope" rows (no dual-location shim, not migrating end-users).
- `.planning/phases/12-query-registry-workflow-consumption/12-CONTEXT.md` — the Phase-12 deferral boundary; this migration was explicitly deferred to Phase 13. Also documents the resolver model (D-01..D-03 there).

### Resolver model (already correct — FREEZE its `.planning/` fallback)
- `oto/bin/lib/core.cjs` §`planningRootName` (≈65-69), §`hasMigratedPlanningRoot` (≈55-63), §`hasPlanningRoot`, §`planningDir`/`planningRoot`/`planningPaths` — the locked `.oto/`-first resolution. The `.planning/`-with-marker branch is intentional and must not be rewritten.
- `sdk/src/query/helpers.ts` §`findProjectRoot` + `.planning` path helpers — SDK mirror of the same model (Phase 12).

### The tool we are NOT using on this repo (and why)
- `oto/bin/lib/migrate.cjs` — `/oto-migrate`'s engine (`fsp.rename`, GSD→oto marker/frontmatter rewriting, rename-map application, backups). Correct for end-user GSD projects; destructive on this repo (D-01). FREEZE its `.planning/` strings.

### Cutover targets (the allowlist seeds — planner finalizes per D-05)
- `CLAUDE.md` → "GSD Workflow Enforcement" block (flip to OTO `/oto-*`, D-07).
- `.planning/STATE.md` → frontmatter `gsd_state_version` → `oto_state_version` (D-06).
- `decisions/ADR-01-state-root.md` → forward-note line (D-11).

### Project constraints
- `CLAUDE.md` → "Technology Stack" / "What NOT to Use" — `node:test` for tooling tests (guard test home, D-09), no install-time build, personal-use cost ceiling (informs the "don't dogfood the heavy migrate tool" call, D-01).
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `oto/bin/lib/core.cjs` `planningRootName()`/`hasPlanningRoot()` — the tested `.oto/`-first resolver this phase relies on. No change needed; just exercise it.
- `oto-sdk` (symlinked to `bin/oto-sdk.js`) + repo-local `oto/bin/lib/` — the self-managing surface used for the DOG-02 live probe (D-08).
- This repo's existing `node:test` tooling tests — natural home for the D-09 guard test.

### Established Patterns
- `.oto/`-first resolution with `.planning/`-with-marker fallback (Phase 12 D-01) is the law; this phase makes `.oto/` exist so the first branch wins.
- Allowlist/freeze discipline for the rebrand engine and rename-map mirrors the D-03/D-04 reference-scope approach — selective, evidence-grounded rewrites, never blanket find-replace.

### Integration Points
- `git mv .planning .oto` (D-01) is the single physical pivot; everything else is reference hygiene around it.
- Upstream GSD install (`~/.claude/get-shit-done/`, `.planning/`-only) is *external* and untouched — after the move it simply won't manage this repo, which is intended (D-07).
- `.gitignore` gains `.DS_Store` + `.claude/` (D-02).
</code_context>

<specifics>
## Specific Ideas

- `oto-sdk` symlinks into this repo's working tree (`/usr/local/bin/oto-sdk` → `bin/oto-sdk.js`) — this repo *already* self-manages at the SDK level; Phase 13 completes the loop by moving the state location and flipping the daily-flow commands.
- The move must be a *pure* rename commit (D-02) so `git log --follow` and review stay clean.
- "Clean cutover" is non-negotiable: no shim, no dual-location support — `.planning/` ceases to exist in this repo after the move (D-01, success criterion #4).
</specifics>

<deferred>
## Deferred Ideas

- Rewriting the resolver's intentional `.planning/` fallback to `.oto/`-only — rejected; it's the migration-window contract for end-user/un-migrated projects (Phase 12 D-02).
- Rewriting `foundation-frameworks/`, `migrate.cjs`, `rename-map.json`, or migration fixtures — frozen by D-04.
- Migrating end-users' projects — out of scope; `/oto-migrate` already handles that, opt-in.
- Retiring the user's "use `/gsd-*` on this repo" memory note — a post-Phase-13 housekeeping action, not a code change (flagged in D-07).

</deferred>

---

*Phase: 13-dogfood-migration-to-oto*
*Context gathered: 2026-05-25*
