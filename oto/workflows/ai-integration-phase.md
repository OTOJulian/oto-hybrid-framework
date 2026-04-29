<purpose>
Generate a bounded AI design contract (AI-SPEC.md) for phases that involve building AI systems. In oto v0.1.0, this workflow runs the Domain Research step through `oto-domain-researcher` and makes the unsupported Framework Selection, AI Research, and Eval Planning steps explicit DEFERRED sections.

AI-SPEC.md still locks the intended design surface before the planner creates tasks:
1. Framework selection (manual TODO in v0.1.0)
2. Implementation guidance (manual TODO in v0.1.0)
3. Domain context (live Domain Research)
4. Evaluation strategy (manual TODO in v0.1.0)

This prevents silent false confidence: the user gets a scaffold plus live domain context, and the workflow names exactly which sections need manual fill-in until the eval-tooling agents return.
</purpose>

<required_reading>
@~/.claude/oto/references/ai-frameworks.md
@~/.claude/oto/references/ai-evals.md
</required_reading>

<process>

## 1. Initialize

```bash
INIT=$(oto-sdk query init.plan-phase "$PHASE")
if [[ "$INIT" == @file:* ]]; then INIT=$(cat "${INIT#@file:}"); fi
```

Parse JSON for: `phase_dir`, `phase_number`, `phase_name`, `phase_slug`, `padded_phase`, `has_context`, `has_research`, `commit_docs`.

**File paths:** `state_path`, `roadmap_path`, `requirements_path`, `context_path`.

Resolve the retained live agent model only:
```bash
DOMAIN_MODEL=$(oto-sdk query resolve-model oto-domain-researcher 2>/dev/null | jq -r '.model' 2>/dev/null || true)
```

Check config:
```bash
AI_PHASE_ENABLED=$(oto-sdk query config-get workflow.ai_integration_phase 2>/dev/null || echo "true")
```

**If `AI_PHASE_ENABLED` is `false`:**
```
AI phase is disabled in config. Enable via /oto-settings.
```
Exit workflow.

**If `planning_exists` is false:** Error — run `/oto-new-project` first.

## 2. Parse and Validate Phase

Extract phase number from $ARGUMENTS. If not provided, detect next unplanned phase.

```bash
PHASE_INFO=$(oto-sdk query roadmap.get-phase "${PHASE}")
```

**If `found` is false:** Error with available phases.

## 3. Check Prerequisites

**If `has_context` is false:**
```
No CONTEXT.md found for Phase {N}.
Recommended: run /oto-discuss-phase {N} first to capture framework preferences.
Continuing with a bounded AI-SPEC scaffold — deferred framework and eval sections will remain manual TODOs.
```
Continue (non-blocking).

## 4. Check Existing AI-SPEC

```bash
AI_SPEC_FILE=$(ls "${PHASE_DIR}"/*-AI-SPEC.md 2>/dev/null | head -1)
```

**Text mode (`workflow.text_mode: true` in config or `--text` flag):** Set `TEXT_MODE=true` if `--text` is present in `$ARGUMENTS` OR `text_mode` from init JSON is `true`. When TEXT_MODE is active, replace every `AskUserQuestion` call with a plain-text numbered list and ask the user to type their choice number. This is required for non-Claude runtimes (OpenAI Codex, Gemini CLI, etc.) where `AskUserQuestion` is not available.

**If exists:** Use AskUserQuestion:
- header: "Existing AI-SPEC"
- question: "AI-SPEC.md already exists for Phase {N}. What would you like to do?"
- options:
  - "Update — re-run with existing as baseline"
  - "View — display current AI-SPEC and exit"
  - "Skip — keep current AI-SPEC and exit"

If "View": display file contents, exit.
If "Skip": exit.
If "Update": continue to step 5.

## 5. Framework Selection (DEFERRED in v0.1.0)

<!-- DEFERRED: was the framework-selector agent per ADR-07. No retained replacement; deferred until eval-tooling agents return in v2. -->

Print to the user:

> Step 1/4 — Framework Selection — DEFERRED in oto v0.1.0.
> Manually decide which framework/library will host the AI feature (for example: Vercel AI SDK, LangChain, raw OpenAI client) and record it under AI-SPEC.md § Framework.
> Tracking: ADR-07; this step will be re-enabled when eval-tooling agents return.

Initialize bounded placeholders for the AI-SPEC scaffold:

```bash
PRIMARY_FRAMEWORK="TODO: choose manually"
SYSTEM_TYPE="TODO: classify manually"
MODEL_PROVIDER="TODO: choose manually"
EVAL_CONCERNS="TODO: define manually"
ALTERNATIVE_FRAMEWORK="TODO: compare manually"
```

Then proceed to Step 6.

## 6. Initialize AI-SPEC.md

Copy template:
```bash
cp "$HOME/.claude/oto/templates/AI-SPEC.md" "${PHASE_DIR}/${PADDED_PHASE}-AI-SPEC.md"
AI_SPEC_FILE="${PHASE_DIR}/${PADDED_PHASE}-AI-SPEC.md"
```

Fill in header fields:
- Phase number and name
- System classification: `TODO: classify manually`
- Selected framework: `TODO: choose manually`
- Alternative considered: `TODO: compare manually`

Add or preserve visible TODO markers for:
- Framework choice and rationale
- Implementation guidance from official docs
- Evaluation dimensions, guardrails, and tracing approach

## 7. AI Research (DEFERRED in v0.1.0)

<!-- DEFERRED: was the AI researcher agent per ADR-07. No retained replacement; deferred until eval-tooling agents return in v2. -->

Print to the user:

> Step 2/4 — AI Research — DEFERRED in oto v0.1.0.
> Manually research the selected framework's current official docs and fill AI-SPEC.md Sections 3 and 4 with implementation patterns, syntax, failure modes, and pitfalls.
> Tracking: ADR-07; this step will be re-enabled when eval-tooling agents return.

Then proceed to Step 8.

## 8. Domain Research (LIVE)

Display:
```
◆ Step 3/4 — Researching domain context and expert evaluation criteria...
```

Spawn `oto-domain-researcher` with a live Task call:
```markdown
Task(subagent_type="oto-domain-researcher", prompt="""
Read ~/.claude/agents/oto-domain-researcher.md for instructions.

<objective>
Research the business domain and expert evaluation criteria for Phase {phase_number}: {phase_name}
Write Section 1b (Domain Context) of AI-SPEC.md
</objective>

<files_to_read>
{ai_spec_path}
{context_path if exists}
{requirements_path if exists}
</files_to_read>

<input>
system_type: {system_type}
phase_name: {phase_name}
phase_goal: {phase_goal}
ai_spec_path: {ai_spec_path}
</input>
""")
```

## 9. Eval Planning (DEFERRED in v0.1.0)

<!-- DEFERRED: was the eval-planner agent per ADR-07. No retained replacement; deferred until eval-tooling agents return in v2. -->

Print to the user:

> Step 4/4 — Eval Planning — DEFERRED in oto v0.1.0.
> Use the domain context from Section 1b to manually fill AI-SPEC.md Sections 5, 6, and 7: evaluation dimensions, reference examples, guardrails, and tracing approach.
> Tracking: ADR-07; this step will be re-enabled when eval-tooling agents return.

Then proceed to Step 10.

## 10. Validate Bounded AI-SPEC Completeness

Read the bounded AI-SPEC.md. Check that:
- AI-SPEC.md exists at the expected phase path
- The framework, implementation guidance, and eval strategy sections contain visible TODO/manual-fill markers
- Section 1b has domain context from the live Domain Research step, or the workflow reports exactly that domain research did not complete
- The output clearly says Framework Selection, AI Research, and Eval Planning are DEFERRED in oto v0.1.0

**If validation fails:** Display specific missing sections. Ask user if they want to re-run the Domain Research step or continue with the bounded scaffold.

## 11. Commit

**If `commit_docs` is true:**
```bash
git add "${AI_SPEC_FILE}"
git commit -m "docs({phase_slug}): scaffold bounded AI-SPEC.md with domain context"
```

## 12. Display Completion

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 OTO ► AI-SPEC SCAFFOLD COMPLETE — PHASE {N}: {name}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

◆ Live step: Domain Research via oto-domain-researcher
◆ Deferred: Framework Selection, AI Research, Eval Planning
◆ Output: {ai_spec_path}

Manual next steps:
  1. Fill AI-SPEC.md § Framework with the chosen framework/library
  2. Fill AI-SPEC.md implementation guidance from current official docs
  3. Fill AI-SPEC.md eval dimensions and guardrails from the domain context

Next command:
  /oto-plan-phase {N}   — planner will consume AI-SPEC.md
```

</process>

<success_criteria>
- [ ] AI-SPEC.md created from template
- [ ] Framework Selection is visibly DEFERRED with manual-fill guidance
- [ ] AI Research is visibly DEFERRED with manual-fill guidance
- [ ] Domain context + expert rubric ingredients researched through `oto-domain-researcher`
- [ ] Eval Planning is visibly DEFERRED with manual-fill guidance
- [ ] AI-SPEC.md validation reflects bounded v0.1.0 behavior instead of requiring deferred sections to be auto-populated
- [ ] Committed if commit_docs enabled
- [ ] Next step surfaced to user
</success_criteria>
