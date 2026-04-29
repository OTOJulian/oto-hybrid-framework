<purpose>
Research how to implement a phase. Spawns oto-phase-researcher with phase context.

Standalone research command. For most workflows, use `/oto-plan-phase` which integrates research automatically.
</purpose>

<available_agent_types>
Valid OTO subagent types (use exact names — do not fall back to 'general-purpose'):
- oto-phase-researcher — Researches technical approaches for a phase
</available_agent_types>

<process>

## Step 0: Resolve Model Profile

@~/.claude/oto/references/model-profile-resolution.md

Resolve model for:
- `oto-phase-researcher`

## Step 1: Normalize and Validate Phase

@~/.claude/oto/references/phase-argument-parsing.md

```bash
PHASE_INFO=$(oto-sdk query roadmap.get-phase "${PHASE}")
```

If `found` is false: Error and exit.

## Step 2: Check Existing Research

```bash
ls .oto/phases/${PHASE}-*/RESEARCH.md 2>/dev/null || true
```

If exists: Offer update/view/skip options.

## Step 3: Gather Phase Context

```bash
INIT=$(oto-sdk query init.phase-op "${PHASE}")
if [[ "$INIT" == @file:* ]]; then INIT=$(cat "${INIT#@file:}"); fi
# Extract: phase_dir, padded_phase, phase_number, state_path, requirements_path, context_path
AGENT_SKILLS_RESEARCHER=$(oto-sdk query agent-skills oto-phase-researcher)
```

## Step 4: Spawn Researcher

```
Task(
  prompt="<objective>
Research implementation approach for Phase {phase}: {name}
</objective>

<files_to_read>
- {context_path} (USER DECISIONS from /oto-discuss-phase)
- {requirements_path} (Project requirements)
- {state_path} (Project decisions and history)
</files_to_read>

${AGENT_SKILLS_RESEARCHER}

<additional_context>
Phase description: {description}
</additional_context>

<output>
Write to: .oto/phases/${PHASE}-{slug}/${PHASE}-RESEARCH.md
</output>",
  subagent_type="oto-phase-researcher",
  model="{researcher_model}"
)
```

> **ORCHESTRATOR RULE — CODEX RUNTIME**: After calling Task() above, stop working on this task immediately. Do not read more files, edit code, or run tests related to this task while the subagent is active. Wait for the subagent to return its result. This prevents duplicate work, conflicting edits, and wasted context. Only resume when the subagent result is available.

## Step 5: Handle Return

- `## RESEARCH COMPLETE` — Display summary, offer: Plan/Dig deeper/Review/Done
- `## CHECKPOINT REACHED` — Present to user, spawn continuation
- `## RESEARCH INCONCLUSIVE` — Show attempts, offer: Add context/Try different mode/Manual

</process>
