---
name: oto:new-project
description: Initialize a new project with deep context gathering and PROJECT.md
argument-hint: "[--auto]"
allowed-tools:
  - Read
  - Bash
  - Write
  - Task
  - AskUserQuestion
---
<runtime_note>
**Copilot (VS Code):** Use `vscode_askquestions` wherever this workflow calls `AskUserQuestion`. They are equivalent — `vscode_askquestions` is the VS Code Copilot implementation of the same interactive question API.
</runtime_note>

<context>
**Flags:**
- `--auto` — Automatic mode. After config questions, runs research → requirements → roadmap without further interaction. Expects idea document via @ reference.
</context>

<objective>
Initialize a new project through unified flow: questioning → research (optional) → requirements → roadmap.

**Creates:**
- `.oto/PROJECT.md` — project context
- `.oto/config.json` — workflow preferences
- `.oto/research/` — domain research (optional)
- `.oto/REQUIREMENTS.md` — scoped requirements
- `.oto/ROADMAP.md` — phase structure
- `.oto/STATE.md` — project memory

**After this command:** Run `/oto-plan-phase 1` to start execution.
</objective>

<execution_context>
@~/.claude/oto/workflows/new-project.md
@~/.claude/oto/references/questioning.md
@~/.claude/oto/references/ui-brand.md
@~/.claude/oto/templates/project.md
@~/.claude/oto/templates/requirements.md
</execution_context>

<process>
Execute the new-project workflow from @~/.claude/oto/workflows/new-project.md end-to-end.
Preserve all workflow gates (validation, approvals, commits, routing).
</process>
