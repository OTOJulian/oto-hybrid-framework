# Phase 13: Dogfood migration to `.oto/` - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-25
**Phase:** 13-dogfood-migration-to-oto
**Areas discussed:** Move mechanism & history, Reference-update scope, Tooling cutover & marker, Historical artifact paths

---

## Move mechanism & history

| Option | Description | Selected |
|--------|-------------|----------|
| git mv | Atomic `git mv .planning .oto`, history-preserving, minimal blast radius | ✓ |
| Dogfood /oto-migrate | Run the migrate tool on this repo — fs.rename + GSD→oto marker rewriting | |
| Custom cutover script | Throwaway git mv + scoped sed over an allowlist | |

**User's choice:** git mv.
**Notes:** `/oto-migrate` rejected for this repo — fs.rename (history via post-hoc detection only) and it rewrites every gsd marker across docs that legitimately document the GSD→oto port (destructive). Tool stays correct for end-user GSD projects.

| Option (tree hygiene) | Description | Selected |
|--------|-------------|----------|
| Commit pending, gitignore noise | Commit 04/05 edits + new 05 plans, gitignore .DS_Store/.claude, then move on clean tree | ✓ |
| Move first, sort out after | git mv over dirty tree | |
| Stash pending, restore after | git stash WIP, move, unstash onto .oto/ | |

**User's choice:** Commit pending + gitignore noise first (pure rename commit).

---

## Reference-update scope

| Option | Description | Selected |
|--------|-------------|----------|
| Allowlist of live self-refs | Rewrite only genuine operational self-refs; freeze everything else | ✓ |
| Everything except a freeze-list | Rewrite all .planning/ except an explicit freeze-list | |

**User's choice:** Allowlist of live self-references.
**Notes:** Freeze (by definition of the allowlist model): `foundation-frameworks/` upstream baseline, Phase-12 resolver fallback (core.cjs/helpers.ts), migrate.cjs GSD logic, rename-map.json + migration fixtures, generic shipped workflow/command markdown. Of 703 files mentioning `.planning/`, genuine stale self-refs are a small set.

---

## Tooling cutover & marker

| Option (state marker) | Description | Selected |
|--------|-------------|----------|
| Rename to oto_state_version | Flip gsd_state_version → oto_state_version in moved STATE.md | ✓ |
| Leave gsd_state_version as-is | Functionally harmless (.oto/ wins) but stale GSD signal | |

**User's choice:** Rename to oto_state_version.

| Option (CLAUDE.md enforcement) | Description | Selected |
|--------|-------------|----------|
| Flip to OTO + /oto-* | Rewrite enforcement block to /oto-* as part of the cutover | ✓ |
| Keep GSD enforcement | Leave /gsd-* (breaks — GSD tooling can't read .oto/) | |

**User's choice:** Flip to OTO /oto-*.
**Notes:** Grounded by scouting — `oto-sdk` is symlinked to this repo's `bin/oto-sdk.js`, so the repo self-manages via its own v0.4.0 code; no stale-global-install risk. Upstream GSD is a separate `.planning/`-only install that won't find `.oto/` after the move. Satisfies the trigger in the standing "use /gsd-* until v0.4.0 SDK + .oto/ migration" note → retire that note post-Phase-13.

| Option (DOG-02 verification) | Description | Selected |
|--------|-------------|----------|
| Live probe, one-time | Run real oto-sdk/CJS queries no-path-flag, assert .oto/ | |
| Live probe + committed guard | Probe + small committed test asserting no .planning/ dir & .oto/ resolution | ✓ |
| Resolver inspection only | Confirm planningRootName returns .oto/ by code reading | |

**User's choice:** Live probe + committed guard (A+).
**Notes:** Probe is meaningful because oto-sdk runs this repo's live code. Guard is the this-repo counterpart to Phase 12's fixture smoke (D-07), not a duplicate.

---

## Historical artifact paths

| Option | Description | Selected |
|--------|-------------|----------|
| Update live only, preserve archives | Rewrite internal paths in live docs; preserve completed phases / archives / ADRs | ✓ |
| Rewrite all internal paths | Sweep every moved file so no .planning/ string survives | |
| Preserve all, update none | Move as-is; touch no internal strings | |

**User's choice:** Update live only, preserve archives (Claude's call, user delegated).
**Notes:** Consistent with the allowlist discipline and immutable-record instinct. Exception: ADR-01-state-root gets a one-line forward-note ("paths historical; root is now .oto/") since it records this very decision.

## Claude's Discretion

- Cutover commit ordering, allowlist membership finalization, guard-test placement, and whether pending 04/05 edits commit as one or several commits.

## Deferred Ideas

- Resolver `.oto/`-only hardcode (rejected — migration-window contract).
- Rewriting foundation-frameworks / migrate.cjs / rename-map / fixtures (frozen).
- Migrating end-users' projects (out of scope; `/oto-migrate` handles it).
- Retiring the "use /gsd-*" memory note (post-Phase-13 housekeeping).
