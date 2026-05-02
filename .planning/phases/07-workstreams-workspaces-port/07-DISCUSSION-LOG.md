# Phase 7: Workstreams & Workspaces Port - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `07-CONTEXT.md` — this log preserves the alternatives considered.

**Date:** 2026-05-01
**Phase:** 07-workstreams-workspaces-port
**Areas discussed:** Phase scope shape, Skill ↔ workflow deferral, Test surface depth, MR-01-style dogfood

---

## Gray-Area Selection

| Option | Description | Selected |
|--------|-------------|----------|
| Phase scope shape | What does Phase 7 deliver given Phase 4 already shipped the files? | ✓ |
| Skill ↔ workflow deferral | How `oto:using-git-worktrees` defers to `/oto-new-workspace` per ADR-03 | ✓ |
| Test surface depth | Smoke / behavior / integration depth | ✓ |
| MR-01-style dogfood | Manual UAT pass mirroring Phase 4 P08 | ✓ |

**User's choice:** All four areas selected.

---

## Phase Scope Shape

### Deliverable shape

| Option | Description | Selected |
|--------|-------------|----------|
| Verify + wire + test | Verify ports, hand-fix leakage, wire skill deferral, add tests, UAT dogfood. Mirrors Phase 5/6 shape. | ✓ |
| Verify + test only | No skill wiring; defer to later phase. Smaller phase. | |
| Full re-port from upstream | Fresh engine apply against upstream subtree, replacing Phase 4 output. | |

**User's choice:** Verify + wire + test.

**Notes:** Phase 4's bulk rebrand already shipped all 8 files into `oto/` (4 commands, 3 workflows, 1 lib, 1 reference); local smoke-tests confirmed `workstream list`, `init new-workspace`, etc. all return clean JSON. Phase 7 is the verification + wiring + test layer over that output, not a re-port.

### File scope (multiSelect)

| Option | Description | Selected |
|--------|-------------|----------|
| `oto/bin/lib/workstream.cjs` | 495 lines of CRUD logic; verify no `.planning/`/`gsd-` leakage. | ✓ |
| `oto/workflows/{new,list,remove}-workspace.md` | Verify `oto-sdk query init.{...}` invocations + handlers exist. | ✓ |
| `oto/commands/oto/{workstreams,new-workspace,list-workspaces,remove-workspace}.md` | Verify `${OTO_WS}` routing flag + frontmatter schema. | ✓ |
| `oto/references/workstream-flag.md` | Verify env vars + session-key probe order + no `gsd-`/`GSD_` literals. | ✓ |

**User's choice:** All four file groups in scope.

**Notes:** The user paused this round once for clarification before re-confirming all four. Reformulated questions kept the original recommended defaults; the user accepted them on the second pass.

---

## Skill ↔ Workflow Deferral

### Deferral mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| Inline directive in SKILL.md | "Workflow Deference" section in `oto/skills/using-git-worktrees/SKILL.md` mirroring Phase 6 D-03's pattern. | ✓ |
| STATE.md gating only | Rely solely on `oto:using-oto`'s ambient gate; skill stays standalone. | |
| Both: gate + skill directive | Layered defense (active-workflow case + about-to-invoke case). | |

**User's choice:** Inline directive in SKILL.md.

**Notes:** Mirrors Phase 6 D-03 pattern. Grep-able prose; no new mechanism.

### Routing target

| Option | Description | Selected |
|--------|-------------|----------|
| Always `/oto-new-workspace` | Skill defers workspace creation; standalone worktree work still allowed. | ✓ |
| Defer all worktree operations | Defer any `git worktree` command to oto workflow (no such workflow exists for ad-hoc worktree work). | |
| Defer only when `.oto/STATE.md` is present | Couples deferral to project context. | |

**User's choice:** Always `/oto-new-workspace`.

**Notes:** Preserves the skill's standalone usefulness for ad-hoc worktree work (PR review, scratch debugging) while honoring ADR-03's workflow-wins routing for the workspace creation path.

---

## Test Surface Depth

### Test depth

| Option | Description | Selected |
|--------|-------------|----------|
| Smoke + structure (Phase 4-style) | Frontmatter + leak grep + handler-existence checks. ~4-5 tests. Lightest. | |
| Smoke + behavior (Phase 5-style) | Above + `workstream.cjs` CRUD via temp `.oto/` fixture + init-handler smoke. ~7-9 tests. | ✓ |
| Smoke + behavior + integration | Above + full `/oto-new-workspace` integration (real worktree in temp dir). ~10-12 tests. | |

**User's choice:** Smoke + behavior (Phase 5-style).

### Coverage (multiSelect)

| Option | Description | Selected |
|--------|-------------|----------|
| Flat → workstream migration | First `workstream create` migrates flat `.oto/` files into `.oto/workstreams/{name}/`. | ✓ |
| Workstream isolation | Two workstreams don't bleed into each other; `set` flips active pointer. | ✓ |
| Session-pointer resolution | `OTO_SESSION_KEY` + `OTO_WORKSTREAM` precedence per `workstream-flag.md`. | ✓ |
| Workstream complete archives | `complete <name>` moves dir to `milestones/`. Optional. | |

**User's choice:** Flat→migration + isolation + session-pointer. Workstream-complete archive deferred.

---

## MR-01-Style Dogfood

### Dogfood scope

| Option | Description | Selected |
|--------|-------------|----------|
| Lightweight smoke | Run all 8 surfaces, ~10 minutes, captured in `07-UAT.md`. No formal MR-* gate. | ✓ |
| Full MR-style UAT plan | Disposable Claude session exercising workstream + workspace alongside an active phase machine. | |
| Skip — automated tests only | Defer to Phase 10 CI. | |

**User's choice:** Lightweight smoke.

### `${OTO_WS}` chaining check

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — verify chaining | After `workstream switch`, run `/oto-progress` and confirm workstream-scoped STATE.md is read. | ✓ |
| No — just verify CRUD | Defer routing-flag propagation check to Phase 10. | |

**User's choice:** Yes — verify chaining.

**Notes:** Catches the silent-fallback bug class where a downstream workflow ignores the active workstream and reads flat-mode state instead.

---

## Final Confirmation

| Option | Description | Selected |
|--------|-------------|----------|
| I'm ready for context | Decisions captured are sufficient. | ✓ |
| Workspace `--strategy` default | Worktree vs. clone default. | |
| Multi-runtime session-key support | Trim to Claude-only or ship as-is. | |
| Workstream auto-migration policy | Auto vs. prompt-first. | |

**User's choice:** Ready for context. Three deferred-discussion items moved to `<deferred>` in CONTEXT.md with the recommended default (ship upstream behavior as-is) implicitly accepted.

---

## Claude's Discretion

- Exact filenames for the 4 test files (`07-structure`, `07-workstream-crud`, `07-session-pointer`, `07-workspace-init`)
- Exact wording of the D-03 deferral directive sentence
- Whether D-06 fixture seeds a real `.planning/`-style structure or a minimal one
- Whether D-07 covers all 5 levels of the resolution order or only the top 3
- Treatment of any payload files inside `oto/skills/using-git-worktrees/` beyond `SKILL.md`
- Workspace `--strategy` default (held at upstream `worktree`)
- Multi-runtime session-key env-var matrix (held at upstream as-is)
- `workstream create` auto-migration vs. prompt-first (held at upstream auto-migrate)
- Whether to hand-fix `oto-tools.cjs` itself if grep finds residual `gsd` literals in workstream-related code paths (yes, in scope)

## Deferred Ideas

See `<deferred>` section of `07-CONTEXT.md` for the full list. Headlines:
- Workspace `--strategy` clone-default override (not selected; held at upstream worktree)
- Multi-runtime session-key probe trim (held at upstream)
- `workstream create` prompt-first migration (held at upstream auto-migrate)
- Workstream-complete archive coverage → Phase 10 CI
- Live `${OTO_WS}` propagation regression test → Phase 10
- Per-workstream config overrides, workstream cloning, nested workspaces → v2
- Retrofitting `${OTO_WS}` into all existing workflows → out of Phase 7 scope
- Skill ↔ workflow deferrals beyond `using-git-worktrees` → would require eval evidence
