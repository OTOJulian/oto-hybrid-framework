---
name: oto:import
description: Ingest external plans with conflict detection against project decisions before writing anything.
argument-hint: "--from <filepath>"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
  - Task
---

<objective>
Import external plan files into the OTO planning system with conflict detection against PROJECT.md decisions.

- **--from**: Import an external plan file, detect conflicts, write as OTO PLAN.md, validate via oto-plan-checker.

Future: `--prd` mode for PRD extraction is planned for a follow-up PR.
</objective>

<execution_context>
@~/.claude/oto/workflows/import.md
@~/.claude/oto/references/ui-brand.md
@~/.claude/oto/references/gate-prompts.md
@~/.claude/oto/references/doc-conflict-engine.md
</execution_context>

<context>
$ARGUMENTS
</context>

<process>
Execute the import workflow end-to-end.
</process>
