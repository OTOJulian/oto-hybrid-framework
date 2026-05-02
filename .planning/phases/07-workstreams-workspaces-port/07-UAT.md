# Phase 7 UAT - Workstreams & Workspaces

**Created:** 2026-05-02
**Operator:** Julian Isaac
**Phase:** 07-workstreams-workspaces-port
**Requirements covered:** WF-26, WF-27

## Preconditions

- [x] Repo HEAD is on the branch where Phase 7 plans 01-04 are committed
- [x] `node --test tests/07-*.test.cjs` exits 0
- [x] `node --test tests/phase-04-frontmatter-schema.test.cjs tests/phase-04-planning-leak.test.cjs` exits 0
- [x] `npm link` has linked the local source package so `oto-sdk` is on PATH
- [x] `node bin/install.js install --claude --force` has copied the current slash-command files into `~/.claude`
- [x] `command -v oto-sdk` returns `/usr/local/bin/oto-sdk`

## Run Mode

UAT ran from a disposable `.oto` project, not from this source repo. The source
repo still uses legacy `.planning/` for its own execution state, and the Phase 7
product surface intentionally requires `.oto/`.

The operator did not run `/oto:new-project` in this source repo, did not migrate
this source repo to `.oto/`, and did not use legacy planning slash commands for
this UAT.

## Disposable Project Setup

The operator created a disposable fixture project under:

```text
/private/tmp/oto-phase7-uat-5xKktK
```

Setup commands used:

```bash
cd /Users/Julian/Desktop/oto-hybrid-framework
export OTO_PHASE7_UAT="$(mktemp -d /tmp/oto-phase7-uat-XXXXXX)"
cd "$OTO_PHASE7_UAT"
git init
git config user.email phase7-uat@example.invalid
git config user.name "Phase 7 UAT"
printf '# OTO Phase 7 UAT\n' > README.md
git add README.md
git commit -m "init"
mkdir -p .oto
cp -R /Users/Julian/Desktop/oto-hybrid-framework/tests/fixtures/phase-07/flat-mode/. .oto/
claude
```

The disposable project was removed after the run with:

```bash
cd /Users/Julian/Desktop/oto-hybrid-framework
rm -rf "$OTO_PHASE7_UAT"
```

## Checklist

### Step 1: Create a workstream

- [x] Run: `/oto:workstreams create demo`
- [x] **Expected:** New directory `.oto/workstreams/demo/` exists with at least `STATE.md`, `ROADMAP.md`, `REQUIREMENTS.md`, and `phases/` migrated into it
- [x] **Verify:** `ls .oto/workstreams/demo/` lists the migrated files
- [x] **Result:**
      ```
      Workstream demo created and set active.

      Path: .oto/workstreams/demo
      State: .oto/workstreams/demo/STATE.md
      Phases: .oto/workstreams/demo/phases
      Migrated from root: ROADMAP.md, STATE.md, REQUIREMENTS.md, phases/
      ```
- [x] **Pass / Fail:** [pass]
- [x] **Rollback if needed:** Not needed

### Step 2: Switch to the workstream

- [x] Run: `/oto:workstreams switch demo`
- [x] **Expected:** Active workstream pointer is set to `demo`
- [x] **Verify:** `oto-sdk query workstream.get --raw --cwd "$PWD"` returns `"active":"demo"`
- [x] **Result:**
      ```
      Active workstream set to demo.
      Routing suggestion: include --ws demo in subsequent commands.
      ```
- [x] **Pass / Fail:** [pass]

### Step 3: List workstreams

- [x] Run: `/oto:workstreams list`
- [x] **Expected:** `demo` appears in the list with its status; no errors
- [x] **Result:**
      ```
      Workstreams (mode: workstream)

      Name      Status          Current Phase    Progress
      demo *    ready_to_plan   -                0/1 phases

      * active - path: .oto/workstreams/demo
      ```
- [x] **Pass / Fail:** [pass]

### Step 4: Active workstream chaining check (`${OTO_WS}`)

This is the critical chaining check. It verifies that after `workstreams switch
demo`, downstream workflows read the demo workstream's state instead of the
flat `.oto/` files.

- [x] With `demo` still active from step 2, run: `/oto:progress`
- [x] **Expected:** Output reflects the disposable fixture workstream state. It must not report progress for `/Users/Julian/Desktop/oto-hybrid-framework`.
- [x] **Result:**
      ```
      Phase 7 Fixture Project

      Progress: 0/0 plans (0%)
      Profile: inherit (executor: sonnet, planner: opus)
      Workstream: demo *

      Recent Work
      - None - workstream just initialized

      Current Position
      Phase 1 of 1: stub
      Plans: 0 of 0
      CONTEXT: present (01-CONTEXT.md)
      ```
- [x] **Pass / Fail:** [pass]

### Step 5: Complete the workstream

- [x] Run: `/oto:workstreams complete demo`
- [x] **Expected:** `demo` is archived under `.oto/milestones/`; active pointer is cleared
- [x] **Verify:** `oto-sdk query workstream.get --raw --cwd "$PWD"` returns a null or empty active workstream
- [x] **Result:**
      ```
      Workstream demo archived.

      Archived to: .oto/milestones/ws-demo-2026-05-02
      Remaining workstreams: 0
      Repo reverted to flat mode (no active workstreams)
      ```
- [x] **Pass / Fail:** [pass]
- [x] **Rollback if needed:** Not needed

### Step 6: Create a new workspace

- [x] Run: `/oto:new-workspace --name uat-demo --repos . --strategy worktree --auto`
- [x] **Expected:** A new workspace is created under `~/oto-workspaces/uat-demo` unless the output says a different path. The target contains `WORKSPACE.md` and an initialized `.oto/`
- [x] **Verify:** the workspace path printed in the output exists; `WORKSPACE.md` is present at it; `.oto/` is present at it
- [x] **Result:**
      ```
      OTO > WORKSPACE CREATED

      Workspace created: /Users/Julian/oto-workspaces/uat-demo
      Repos: 1
      Strategy: worktree
      Branch: workspace/uat-demo
      WORKSPACE.md present
      .oto/ present
      ```
- [x] **Pass / Fail:** [pass]
- [x] **Rollback if needed:** Completed by Step 8

### Step 7: List workspaces

- [x] Run: `/oto:list-workspaces`
- [x] **Expected:** `uat-demo` is listed with its path and metadata
- [x] **Result:**
      ```
      OTO Workspaces (~/oto-workspaces/)

      Name       Repos   Strategy   OTO Project
      uat-demo   1       worktree   No
      ```
- [x] **Pass / Fail:** [pass]

### Step 8: Remove the workspace

- [x] Run: `/oto:remove-workspace uat-demo`
- [x] **Expected:** `uat-demo` is removed cleanly; `git worktree list` no longer shows the workspace repo
- [x] **Verify:** `git worktree list` does not include `uat-demo`
- [x] **Result:**
      ```
      Workspace uat-demo removed.

      Path: /Users/Julian/oto-workspaces/uat-demo (deleted)
      Repos: 1 worktree cleaned up (workspace/uat-demo branch on source repo retained)
      ```
- [x] **Pass / Fail:** [pass]

## Outcome

- [x] All 8 steps pass: commit `07-UAT.md`, create `07-05-SUMMARY.md`, and proceed to Phase 8 readiness
- Not selected: one or more steps fail; open a `07-NN-PLAN.md` hand-fixup plan and do not mark Phase 7 complete

## Operator Notes

- Initial attempt correctly exposed a UAT setup gap: running `/oto:workstreams create demo` in the source repo failed because this repo stores execution artifacts under `.planning/`, while the product workstream runtime requires `.oto/`.
- Fix commit `3d154cb` repaired the UAT setup: `oto-sdk` was linked onto PATH, Claude commands were reinstalled, the checklist moved to a disposable `.oto` fixture, and `/oto:workstreams create <name>` now passes `--migrate-name <name>`.
- Step 8 was accidentally run twice. The first run removed `uat-demo` successfully; the second run returned `Workspace not found`, which is expected after successful removal and is not a blocker.
