---
name: oto:new-workspace
description: Create an isolated workspace with repo copies and independent .oto/
argument-hint: "--name <name> [--repos repo1,repo2] [--path /target] [--strategy worktree|clone] [--branch name] [--auto]"
allowed-tools:
  - Read
  - Bash
  - Write
  - AskUserQuestion
---
<context>
**Flags:**
- `--name` (required) — Workspace name
- `--repos` — Comma-separated repo paths or names. If omitted, interactive selection from child git repos in cwd
- `--path` — Target directory. Defaults to `~/oto-workspaces/<name>`
- `--strategy` — `worktree` (default, lightweight) or `clone` (fully independent)
- `--branch` — Branch to checkout. Defaults to `workspace/<name>`
- `--auto` — Skip interactive questions, use defaults
</context>

<objective>
Create a physical workspace directory containing copies of specified git repos (as worktrees or clones) with an independent `.oto/` directory for isolated OTO sessions.

**Use cases:**
- Multi-repo orchestration: work on a subset of repos in parallel with isolated OTO state
- Feature branch isolation: create a worktree of the current repo with its own `.oto/`

**Creates:**
- `<path>/WORKSPACE.md` — workspace manifest
- `<path>/.oto/` — independent planning directory
- `<path>/<repo>/` — git worktree or clone for each specified repo

**After this command:** `cd` into the workspace and run `/oto-new-project` to initialize OTO.
</objective>

<execution_context>
@~/.claude/oto/workflows/new-workspace.md
@~/.claude/oto/references/ui-brand.md
</execution_context>

<process>
Execute the new-workspace workflow from @~/.claude/oto/workflows/new-workspace.md end-to-end.
Preserve all workflow gates (validation, approvals, commits, routing).
</process>
