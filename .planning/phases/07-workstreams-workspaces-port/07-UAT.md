# Phase 7 UAT — Workstreams & Workspaces

**Created:** YYYY-MM-DD
**Operator:** [your name / handle]
**Phase:** 07-workstreams-workspaces-port
**Requirements covered:** WF-26, WF-27

## Preconditions

- [ ] Repo HEAD is on the branch where Phase 7 plans 01-04 are committed
- [ ] `node --test tests/07-*.test.cjs` exits 0 (all 4 Phase 7 tests green)
- [ ] `node --test tests/phase-04-frontmatter-schema.test.cjs tests/phase-04-planning-leak.test.cjs` exits 0 (no Phase 4 regression)
- [ ] No active workstream in this repo (`ls .oto/workstreams 2>/dev/null` returns nothing or already-archived names)
- [ ] `git status` is clean before the UAT begins (so any post-UAT diff isolates the UAT's effects)

## Run Mode

Open a Claude Code session in this repo. Each step below is a single slash-command invocation. Capture the output (or relevant subset) under each step's "Result" block. Mark `[x]` for pass, `[!]` for fail, `[~]` for partial / needs investigation.

Rollback instructions for each step are inline. If any step fails, complete the documented rollback for that step before stopping the UAT.

## Checklist

### Step 1: Create a workstream

- [ ] Run: `/oto-workstreams create demo`
- [ ] **Expected:** New directory `.oto/workstreams/demo/` exists with at least `STATE.md`, `ROADMAP.md`, `REQUIREMENTS.md` migrated into it
- [ ] **Verify:** `ls .oto/workstreams/demo/` lists the migrated files
- [ ] **Result:**
      ```
      [paste output here]
      ```
- [ ] **Pass / Fail:** [ ]
- [ ] **Rollback if needed:** `rm -rf .oto/workstreams/demo` and restore the migrated files to repo root if migration was destructive (see step output to determine)

### Step 2: Switch to the workstream

- [ ] Run: `/oto-workstreams switch demo`
- [ ] **Expected:** Active workstream pointer set to `demo`; subsequent oto commands route to the demo workstream's state
- [ ] **Verify:** `node oto/bin/lib/oto-tools.cjs workstream get` returns demo
- [ ] **Result:**
      ```
      [paste output]
      ```
- [ ] **Pass / Fail:** [ ]

### Step 3: List workstreams

- [ ] Run: `/oto-workstreams list`
- [ ] **Expected:** demo appears in the list with its status; no errors
- [ ] **Result:**
      ```
      [paste output]
      ```
- [ ] **Pass / Fail:** [ ]

### Step 4: ${OTO_WS} chaining check (D-10)

> **This is the critical chaining check.** It verifies that after `workstream switch demo`, downstream workflows actually read the demo workstream's state, not the flat-mode files.

- [ ] With demo still active from step 2, run: `/oto-progress`
- [ ] **Expected:** Output reflects the demo workstream's state (likely "no roadmap yet" or similar minimal output, since the migrated demo's ROADMAP.md may be empty / stub-state). It should NOT report progress for the actual oto project (Phase 6 complete, etc.). If `/oto-progress` reports the actual oto project's progress, the routing flag did NOT thread → FAIL.
- [ ] **Result:**
      ```
      [paste output]
      ```
- [ ] **Pass / Fail:** [ ]
- [ ] **If FAIL:** Open a hand-fixup plan to investigate `${OTO_WS}` propagation through `oto-tools.cjs` `planningPaths` / `planningRoot` resolution

### Step 5: Complete the workstream

- [ ] Run: `/oto-workstreams complete demo`
- [ ] **Expected:** demo archived; active pointer cleared (or returned to the prior active state)
- [ ] **Verify:** `node oto/bin/lib/oto-tools.cjs workstream get` returns null / empty / "no active workstream"
- [ ] **Verify:** `.oto/workstreams/demo/` either removed or moved to an archive subdirectory (per upstream `complete` behavior — verify against `oto/bin/lib/workstream.cjs` `complete` function)
- [ ] **Result:**
      ```
      [paste output]
      ```
- [ ] **Pass / Fail:** [ ]
- [ ] **Rollback if needed:** `rm -rf .oto/workstreams/demo .oto/workstreams/.archived/demo 2>/dev/null` to clear any residual state

### Step 6: Create a new workspace

- [ ] Run: `/oto-new-workspace --name uat-demo --repos . --strategy worktree`
- [ ] **Expected:** A new workspace at the path the workflow chose (likely under `.worktrees/uat-demo` or similar — confirm via output). The target contains a `WORKSPACE.md` and an initialized `.oto/`
- [ ] **Verify:** the workspace path printed in the output exists; `WORKSPACE.md` is present at it; `.oto/` is initialized at it
- [ ] **Result:**
      ```
      [paste output]
      ```
- [ ] **Pass / Fail:** [ ]
- [ ] **Rollback if needed:** `git worktree remove <workspace-path>` (if worktree strategy succeeded) or `rm -rf <workspace-path>` (if clone strategy)

### Step 7: List workspaces

- [ ] Run: `/oto-list-workspaces`
- [ ] **Expected:** uat-demo listed with its path and any metadata
- [ ] **Result:**
      ```
      [paste output]
      ```
- [ ] **Pass / Fail:** [ ]

### Step 8: Remove the workspace

- [ ] Run: `/oto-remove-workspace --name uat-demo`
- [ ] **Expected:** uat-demo removed cleanly; parent project's `.oto/` is unchanged; `git worktree list` no longer shows uat-demo
- [ ] **Verify:** `git worktree list` does not include uat-demo
- [ ] **Verify:** `git status` shows no unexpected modifications to the parent repo's `.oto/`
- [ ] **Result:**
      ```
      [paste output]
      ```
- [ ] **Pass / Fail:** [ ]

## Outcome

- [ ] All 8 steps pass → Phase 7 complete; commit `07-UAT.md` and proceed to Phase 8 readiness
- [ ] One or more steps fail → Open a `07-NN-PLAN.md` hand-fixup plan; do NOT mark Phase 7 complete

## Operator Notes

[Free-form notes from the UAT run — anything observed that warrants follow-up but is not a blocker]
