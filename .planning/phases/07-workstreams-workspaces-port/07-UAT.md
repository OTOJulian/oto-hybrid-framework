# Phase 7 UAT - Workstreams & Workspaces

**Created:** 2026-05-02
**Operator:** [your name / handle]
**Phase:** 07-workstreams-workspaces-port
**Requirements covered:** WF-26, WF-27

## Preconditions

- [ ] Repo HEAD is on the branch where Phase 7 plans 01-04 are committed
- [ ] `node --test tests/07-*.test.cjs` exits 0
- [ ] `node --test tests/phase-04-frontmatter-schema.test.cjs tests/phase-04-planning-leak.test.cjs` exits 0
- [ ] `npm link` has linked the local source package so `oto-sdk` is on PATH
- [ ] `node bin/install.js install --claude --force` has copied the current slash-command files into `~/.claude`
- [ ] `command -v oto-sdk` returns a path

## Run Mode

Run this UAT from a disposable `.oto` project, not from this source repo. The
source repo still uses legacy `.planning/` for its own GSD execution state, and
the Phase 7 product surface intentionally requires `.oto/`.

Do not run `/oto:new-project` in this source repo, do not migrate this source
repo to `.oto/`, and do not use `/gsd-*` commands for this UAT.

## Disposable Project Setup

From a normal terminal:

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

In Claude Code, each step below is a single slash-command invocation. Capture
the output, or the relevant subset, under each step's "Result" block. Mark
`[x]` for pass, `[!]` for fail, `[~]` for partial / needs investigation.

If any step fails, complete the documented rollback for that step before
stopping the UAT.

## Checklist

### Step 1: Create a workstream

- [ ] Run: `/oto:workstreams create demo`
- [ ] **Expected:** New directory `.oto/workstreams/demo/` exists with at least `STATE.md`, `ROADMAP.md`, `REQUIREMENTS.md`, and `phases/` migrated into it
- [ ] **Verify:** `ls .oto/workstreams/demo/` lists the migrated files
- [ ] **Result:**
      ```
      [paste output here]
      ```
- [ ] **Pass / Fail:** [ ]
- [ ] **Rollback if needed:** `rm -rf .oto/workstreams/demo .oto/workstreams` and restore the setup fixture if migration was destructive

### Step 2: Switch to the workstream

- [ ] Run: `/oto:workstreams switch demo`
- [ ] **Expected:** Active workstream pointer is set to `demo`
- [ ] **Verify:** `oto-sdk query workstream.get --raw --cwd "$PWD"` returns `"active":"demo"`
- [ ] **Result:**
      ```
      [paste output]
      ```
- [ ] **Pass / Fail:** [ ]

### Step 3: List workstreams

- [ ] Run: `/oto:workstreams list`
- [ ] **Expected:** `demo` appears in the list with its status; no errors
- [ ] **Result:**
      ```
      [paste output]
      ```
- [ ] **Pass / Fail:** [ ]

### Step 4: Active workstream chaining check

This is the critical chaining check. It verifies that after `workstreams switch
demo`, downstream workflows read the demo workstream's state instead of the
flat `.oto/` files.

- [ ] With `demo` still active from step 2, run: `/oto:progress`
- [ ] **Expected:** Output reflects the disposable fixture workstream state. It must not report progress for `/Users/Julian/Desktop/oto-hybrid-framework`.
- [ ] **Result:**
      ```
      [paste output]
      ```
- [ ] **Pass / Fail:** [ ]
- [ ] **If FAIL:** Open a hand-fixup plan to investigate active workstream propagation through `oto-tools.cjs` `planningPaths` / `planningRoot` resolution

### Step 5: Complete the workstream

- [ ] Run: `/oto:workstreams complete demo`
- [ ] **Expected:** `demo` is archived under `.oto/milestones/`; active pointer is cleared
- [ ] **Verify:** `oto-sdk query workstream.get --raw --cwd "$PWD"` returns a null or empty active workstream
- [ ] **Result:**
      ```
      [paste output]
      ```
- [ ] **Pass / Fail:** [ ]
- [ ] **Rollback if needed:** `rm -rf .oto/workstreams/demo .oto/milestones/ws-demo-* 2>/dev/null`

### Step 6: Create a new workspace

- [ ] Run: `/oto:new-workspace --name uat-demo --repos . --strategy worktree --auto`
- [ ] **Expected:** A new workspace is created under `~/oto-workspaces/uat-demo` unless the output says a different path. The target contains `WORKSPACE.md` and an initialized `.oto/`
- [ ] **Verify:** the workspace path printed in the output exists; `WORKSPACE.md` is present at it; `.oto/` is present at it
- [ ] **Result:**
      ```
      [paste output]
      ```
- [ ] **Pass / Fail:** [ ]
- [ ] **Rollback if needed:** `git worktree remove <workspace-repo-path>` if worktree strategy succeeded, then `rm -rf <workspace-path>`

### Step 7: List workspaces

- [ ] Run: `/oto:list-workspaces`
- [ ] **Expected:** `uat-demo` is listed with its path and metadata
- [ ] **Result:**
      ```
      [paste output]
      ```
- [ ] **Pass / Fail:** [ ]

### Step 8: Remove the workspace

- [ ] Run: `/oto:remove-workspace uat-demo`
- [ ] **Expected:** `uat-demo` is removed cleanly; `git worktree list` no longer shows the workspace repo
- [ ] **Verify:** `git worktree list` does not include `uat-demo`
- [ ] **Result:**
      ```
      [paste output]
      ```
- [ ] **Pass / Fail:** [ ]

## Cleanup

After the checklist, from the disposable project terminal:

```bash
cd /Users/Julian/Desktop/oto-hybrid-framework
rm -rf "$OTO_PHASE7_UAT"
```

## Outcome

- [ ] All 8 steps pass: commit `07-UAT.md`, create `07-05-SUMMARY.md`, and proceed to Phase 8 readiness
- [ ] One or more steps fail: open a `07-NN-PLAN.md` hand-fixup plan; do not mark Phase 7 complete

## Operator Notes

[Free-form notes from the UAT run. Capture anything observed that warrants follow-up but is not a blocker.]
