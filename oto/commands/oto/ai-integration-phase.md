---
name: oto:ai-integration-phase
description: Generate a bounded AI-SPEC.md skeleton for AI phases with live domain research and explicit deferred framework/eval TODOs
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
Generate an AI-feature design contract (AI-SPEC.md) for a phase that adds AI-powered capability.

**v0.1.0 status (bounded scope per ADR-07):**
- **Live:** Domain Research step (via `oto-domain-researcher`) — gathers domain knowledge and writes RESEARCH.md fragments.
- **Deferred:** Framework Selection, AI Research, and Evaluation Planning are deferred until eval-tooling agents return in v2 (see ADR-07 in `decisions/`). The workflow will print explicit DEFERRED blocks where these steps would run, with manual-fill instructions.

Purpose: Keep the command discoverable in `/oto-help` and useful for partial scaffolding; do NOT pretend the deferred steps work.
Output: Domain-research artifacts + an AI-SPEC.md skeleton with explicit TODO sections for the deferred steps.
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
Preserve all workflow gates. The workflow runs the live Domain Research step and prints explicit DEFERRED messages for unsupported v0.1.0 steps.
</process>
