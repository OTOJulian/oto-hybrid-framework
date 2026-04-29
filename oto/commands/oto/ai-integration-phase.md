---
name: oto:ai-integration-phase
description: Generate AI design contract (AI-SPEC.md) for phases that involve building AI systems — framework selection, implementation guidance from official docs, and evaluation strategy
argument-hint: "[phase number]"
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
  - Task
  - WebFetch
  - WebSearch
  - AskUserQuestion
  - mcp__context7__*
---
<objective>
Create an AI design contract (AI-SPEC.md) for a phase involving AI system development.
Orchestrates oto-framework-selector → oto-ai-researcher → oto-domain-researcher → oto-eval-planner.
Flow: Select Framework → Research Docs → Research Domain → Design Eval Strategy → Done
</objective>

<execution_context>
@~/.claude/oto/workflows/ai-integration-phase.md
@~/.claude/oto/references/ai-frameworks.md
@~/.claude/oto/references/ai-evals.md
</execution_context>

<context>
Phase number: $ARGUMENTS — optional, auto-detects next unplanned phase if omitted.
</context>

<process>
Execute @~/.claude/oto/workflows/ai-integration-phase.md end-to-end.
Preserve all workflow gates.
</process>
