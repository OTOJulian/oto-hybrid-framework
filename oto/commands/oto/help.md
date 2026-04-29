---
name: oto:help
description: Show available OTO commands and usage guide
allowed-tools:
  - Read
---
<objective>
Display the complete OTO command reference.

Output ONLY the reference content below. Do NOT add:
- Project-specific analysis
- Git status or file context
- Next-step suggestions
- Any commentary beyond the reference
</objective>

<execution_context>
@~/.claude/oto/workflows/help.md
</execution_context>

<process>
Output the complete OTO command reference from @~/.claude/oto/workflows/help.md.
Display the reference content directly — no additions or modifications.
</process>
