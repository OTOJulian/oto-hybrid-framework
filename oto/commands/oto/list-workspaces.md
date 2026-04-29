---
name: oto:list-workspaces
description: List active OTO workspaces and their status
allowed-tools:
  - Bash
  - Read
---
<objective>
Scan `~/oto-workspaces/` for workspace directories containing `WORKSPACE.md` manifests. Display a summary table with name, path, repo count, strategy, and OTO project status.
</objective>

<execution_context>
@~/.claude/oto/workflows/list-workspaces.md
@~/.claude/oto/references/ui-brand.md
</execution_context>

<process>
Execute the list-workspaces workflow from @~/.claude/oto/workflows/list-workspaces.md end-to-end.
</process>
