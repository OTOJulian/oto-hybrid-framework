---
name: oto:undo
description: "Safe git revert. Roll back phase or plan commits using the phase manifest with dependency checks."
argument-hint: "--last N | --phase NN | --plan NN-MM"
allowed-tools:
  - Read
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

<objective>
Safe git revert — roll back OTO phase or plan commits using the phase manifest, with dependency checks and a confirmation gate before execution.

Three modes:
- **--last N**: Show recent OTO commits for interactive selection
- **--phase NN**: Revert all commits for a phase (manifest + git log fallback)
- **--plan NN-MM**: Revert all commits for a specific plan
</objective>

<execution_context>
@~/.claude/oto/workflows/undo.md
@~/.claude/oto/references/ui-brand.md
@~/.claude/oto/references/gate-prompts.md
</execution_context>

<context>
$ARGUMENTS
</context>

<process>
Execute the undo workflow from @~/.claude/oto/workflows/undo.md end-to-end.
</process>
