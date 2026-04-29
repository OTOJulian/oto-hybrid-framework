---
name: oto:sketch-wrap-up
description: Package sketch design findings into a persistent project skill for future build conversations
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Grep
  - Glob
  - AskUserQuestion
---
<objective>
Curate sketch design findings and package them into a persistent project skill that Claude
auto-loads when building the real UI. Also writes a summary to `.oto/sketches/` for
project history. Output skill goes to `./.claude/skills/sketch-findings-[project]/` (project-local).
</objective>

<execution_context>
@~/.claude/oto/workflows/sketch-wrap-up.md
@~/.claude/oto/references/ui-brand.md
</execution_context>

<runtime_note>
**Copilot (VS Code):** Use `vscode_askquestions` wherever this workflow calls `AskUserQuestion`.
</runtime_note>

<process>
Execute the sketch-wrap-up workflow from @~/.claude/oto/workflows/sketch-wrap-up.md end-to-end.
Preserve all curation gates (per-sketch review, grouping approval, CLAUDE.md routing line).
</process>
