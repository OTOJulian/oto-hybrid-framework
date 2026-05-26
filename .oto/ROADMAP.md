---
project: oto
status: in_progress
milestone: v0.4.0
milestone_name: SDK + Dogfood
last_shipped: v0.3.0
last_shipped_date: 2026-05-18
---

# Roadmap: oto

## Milestones

- ✅ **v0.1.0 Foundation Release** — Phases 1-10 (shipped 2026-05-04)
- ✅ **v0.2.0 Post-Release Commands** — Phases 1-2 (shipped 2026-05-07)
- ✅ **v0.3.0 Restore Doc-Intake and Eval-Review Agents** — Phases 1-3 (shipped 2026-05-18)
- 🚧 **v0.4.0 SDK + Dogfood** — Phases 11-13 (in progress)

## Phases

### 🚧 v0.4.0 SDK + Dogfood (Phases 11-13)

- [x] **Phase 11: oto-sdk package port + PATH wiring** — Port GSD's `sdk/` subpackage, add the `bin/oto-sdk.js` shim and `package.json` bin entry, and verify the installer's PATH check so `oto-sdk query` resolves on a clean archive install with no manual build step.
- [ ] **Phase 12: Query registry + workflow consumption** — Rebuild the query registry to answer every oto key (`init.*`, `agent-skills`, `commit`, `state.*`, `phases.*`) against `.oto/` paths, and wire workflows to consume `oto-sdk query` output while still degrading gracefully when it is absent.
- [ ] **Phase 13: Dogfood migration to `.oto/`** — Migrate this repo's planning root from `.planning/` to `.oto/` with git history preserved, make oto commands operate on `.oto/` without a path override, and update every in-repo `.planning/` reference.

<details>
<summary>✅ v0.3.0 Restore doc-intake and eval-review agents (Phases 1-3) — SHIPPED 2026-05-18</summary>

- [x] Phase 1: Agent ports + installer wiring (2/2 plans) — completed 2026-05-18
- [x] Phase 2: Workflow rebrand-ports + command de-deferral (3/3 plans) — completed 2026-05-18
- [x] Phase 3: Tests, install-smoke, parity, ADR-15 (4/4 plans) — completed 2026-05-18

Full details: [milestones/v0.3.0-ROADMAP.md](milestones/v0.3.0-ROADMAP.md)

</details>

<details>
<summary>✅ v0.2.0 Post-release commands (Phases 1-2) — SHIPPED 2026-05-07</summary>

- [x] Phase 1: `/oto-migrate` (3/3 plans)
- [x] Phase 2: `/oto-log` (3/3 plans)

Full details: [milestones/v0.2.0-ROADMAP.md](milestones/v0.2.0-ROADMAP.md)

</details>

<details>
<summary>✅ v0.1.0 Foundation release (Phases 1-10) — SHIPPED 2026-05-04</summary>

- [x] Phase 1: Inventory + architecture decisions
- [x] Phase 2: Rebrand engine + distribution skeleton
- [x] Phase 3: Installer fork — Claude adapter
- [x] Phase 4: Core workflows + agents port
- [x] Phase 5: Hooks port + consolidation
- [x] Phase 6: Skills port + cross-system integration
- [x] Phase 7: Workstreams + workspaces port
- [x] Phase 8: Codex + Gemini runtime parity
- [x] Phase 9: Upstream sync pipeline
- [x] Phase 10: Tests + CI + docs + v0.1.0 release

Full details: [milestones/v0.1.0-ROADMAP.md](milestones/v0.1.0-ROADMAP.md)

</details>

## Phase Details

### Phase 11: oto-sdk package port + PATH wiring
**Goal**: A clean GitHub-archive install yields a working `oto-sdk` on PATH — `oto-sdk query <key>` resolves and returns structured output instead of `command not found`, with no separate manual build step.
**Depends on**: Nothing (first v0.4.0 phase; SDK foundation)
**Requirements**: SDK-01, SDK-02, SDK-04
**Success Criteria** (what must be TRUE):
  1. After a clean GitHub-archive install, running `oto-sdk query <key>` resolves and returns structured output — never `command not found: oto-sdk`.
  2. `oto-sdk` is on PATH via the `package.json` bin entry (`oto-sdk` → `bin/oto-sdk.js`) and the installer's PATH-resolution check confirms it.
  3. The clean install requires no separate manual build step — the SDK is prebuilt/shipped inside the package.
  4. The installer's existing `oto-sdk` PATH-wiring machinery (the "#2775" path) finds the `bin/oto-sdk.js` shim and bin entry it expects.
**Plans**: 4 plans across 2 waves
  - Wave 1 (parallel):
    - [x] 11-01-PLAN.md — Port GSD sdk/ subpackage + commit prebuilt sdk/dist/ (SDK-04, SDK-01)
    - [x] 11-02-PLAN.md — bin/oto-sdk.js shim + package.json bin/deps/files wiring (SDK-01, SDK-02, SDK-04)
    - [x] 11-03-PLAN.md — Port #2775 PATH-wiring into bin/lib/install.cjs + sdk-wiring unit test (SDK-02)
  - Wave 2:
    - [x] 11-04-PLAN.md — Extend install-smoke: clean-install oto-sdk query + ERR_MODULE_NOT_FOUND guard (SDK-01, SDK-02, SDK-04)

### Phase 12: Query registry + workflow consumption
**Goal**: The query registry answers every key the ported workflows invoke against oto namespaces and `.oto/` paths, and workflows consume that output when present while still degrading gracefully to manual fallback when it is absent.
**Depends on**: Phase 11 (the `oto-sdk` binary must resolve before its registry can answer keys or workflows can consume it)
**Requirements**: SDK-03, SDK-05
**Success Criteria** (what must be TRUE):
  1. `oto-sdk query` answers every key the ported workflows invoke — `init.*`, `agent-skills`, `commit`, `state.*`, and `phases.*` — using oto namespaces.
  2. Query keys resolve against `.oto/` paths (not GSD's `.planning/` or upstream namespaces).
  3. Workflows that call `oto-sdk query …` consume its structured output when the SDK is present.
  4. When `oto-sdk` is absent, read-only queries degrade to sensible defaults and the workflow continues; structural/stateful operations fail fast with one clear, actionable error rather than silently completing.
**Plans**: 4 plans across 4 waves (sequential — each consumes the prior wave's shared SDK resolver/dist)
  - Wave 1:
    - [x] 12-01-PLAN.md — Port planningRootName/hasMigratedPlanningRoot/hasPlanningRoot resolver into SDK helpers + unit tests (SDK-03)
  - Wave 2:
    - [x] 12-02-PLAN.md — Route the 3 choke points (relPlanningPath, loadConfig, findProjectRoot) through the resolver + rebuild dist (SDK-03)
  - Wave 3:
    - [x] 12-03-PLAN.md — Sweep ~40 raw .planning join sites in workflow-invoked handlers + authoritative dist rebuild (SDK-03)
  - Wave 4:
    - [x] 12-04-PLAN.md — Enumerate+fixture smoke harness, tiered fallback wiring/assertion, D-04 audit, D-06 reconciliation, parity checkpoint (SDK-03, SDK-05)

### Phase 13: Dogfood migration to `.oto/`
**Goal**: This repo manages itself with oto — planning artifacts live under `.oto/` (migrated from `.planning/`) with git history preserved, oto commands operate on `.oto/` with no path override, and every in-repo reference to the old location is updated.
**Depends on**: Phase 12 (and Phase 11) — once this repo moves to `.oto/`, the workflows managing that location need a functioning `oto-sdk` answering `.oto/`-pathed keys
**Requirements**: DOG-01, DOG-02, DOG-03
**Success Criteria** (what must be TRUE):
  1. This repo's planning artifacts live under `.oto/`, migrated from `.planning/`, with the git history of the moved files preserved.
  2. oto commands operate on this repo's `.oto/` state with no manual path override.
  3. Every in-repo reference to `.planning/` (CLAUDE.md, config, tooling, docs) is updated so nothing points at the stale location.
  4. The migration is a clean cutover — no dual-location shim keeping `.planning/` alive alongside `.oto/`.
**Plans**: 4 plans across 4 waves (sequential — paths shift mid-phase at the rename pivot; each wave depends on the prior)
  - Wave 1:
    - [x] 13-01-PLAN.md — Clean-tree precondition: gitignore .DS_Store/.claude, commit in-flight 04-*/05-* WIP + the Phase 13 plans (D-02) (DOG-01)
  - Wave 2:
    - [x] 13-02-PLAN.md — Atomic `git mv .planning .oto` pure rename + flip oto_state_version marker; human-verify the rename diff (D-01, D-06) (DOG-01)
  - Wave 3:
    - [x] 13-03-PLAN.md — Flip enforcement to /oto-* (template + render), ADR-01 forward-note, surgical live-artifact path-citation rewrites; allowlist-only with frozen-surface review (D-03/04/05/07/10/11) (DOG-03)
  - Wave 4:
    - [ ] 13-04-PLAN.md — D-09 node:test guard (no .planning/, resolver → .oto/), full-suite run, D-08 empirical live-probe checkpoint (DOG-02, DOG-01, DOG-03)

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
| --- | --- | --- | --- | --- |
| 1–10 (Foundation set) | v0.1.0 | 50/50 | Complete | 2026-05-04 |
| 1. `/oto-migrate` | v0.2.0 | 3/3 | Complete | 2026-05-07 |
| 2. `/oto-log` | v0.2.0 | 3/3 | Complete | 2026-05-07 |
| 1. Agent ports + installer wiring | v0.3.0 | 2/2 | Complete | 2026-05-18 |
| 2. Workflow rebrand-ports + command de-deferral | v0.3.0 | 3/3 | Complete | 2026-05-18 |
| 3. Tests, install-smoke, parity, ADR-15 | v0.3.0 | 4/4 | Complete | 2026-05-18 |
| 11. oto-sdk package port + PATH wiring | v0.4.0 | 4/4 | Complete    | 2026-05-25 |
| 12. Query registry + workflow consumption | v0.4.0 | 1/4 | Executing | - |
| 13. Dogfood migration to `.oto/` | v0.4.0 | 3/4 | Executing | - |

---

_For prior milestone archives, see `.oto/milestones/`._
