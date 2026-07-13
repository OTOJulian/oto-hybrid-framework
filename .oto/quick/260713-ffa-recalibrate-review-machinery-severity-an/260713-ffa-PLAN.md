---
phase: quick-260713-ffa
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - oto/references/model-calibration.md
  - oto/agents/oto-code-reviewer.md
  - oto/agents/oto-verifier.md
  - oto/workflows/execute-phase.md
  - oto/workflows/plan-phase.md
autonomous: true
requirements: [QUICK-260713-FFA]

must_haves:
  truths:
    - "oto-code-reviewer and oto-verifier load model-calibration.md before reviewing/verifying"
    - "Neither agent file contains the 'go soft' failure-mode bullet list"
    - "execute-phase.md gaps_found path enforces bounded convergence: max 2 gap cycles, then DISPOSITIONS.md triage instead of a third --gaps offer"
    - "plan-phase.md --gaps mode requires reading prior REVIEW.md/DISPOSITIONS.md and excludes ACCEPT/DEFER findings from new plans"
    - "Installed copies under ~/.claude are byte-identical to repo copies"
  artifacts:
    - path: "oto/references/model-calibration.md"
      provides: "Severity anchor + convergence rules for the Claude 5 / GPT-5.6 model generation"
      contains: "Maximum 2 gap-closure cycles"
    - path: "oto/agents/oto-code-reviewer.md"
      provides: "required_reading reference to model-calibration.md; adversarial_stance without 'go soft' bullets"
    - path: "oto/agents/oto-verifier.md"
      provides: "required_reading reference to model-calibration.md; adversarial_stance without 'go soft' bullets"
    - path: "oto/workflows/execute-phase.md"
      provides: "Bounded convergence contract in gaps_found handling"
    - path: "oto/workflows/plan-phase.md"
      provides: "Gap-mode disposition-awareness (REVIEW.md/DISPOSITIONS.md reads, ACCEPT/DEFER exclusion, scoped re-review)"
  key_links:
    - from: "oto/agents/oto-verifier.md"
      to: "oto/references/model-calibration.md"
      via: "required_reading @-reference"
      pattern: "model-calibration"
    - from: "oto/agents/oto-code-reviewer.md"
      to: "oto/references/model-calibration.md"
      via: "required_reading @-reference"
      pattern: "model-calibration"
---

<objective>
Recalibrate oto's review machinery severity and convergence for the Claude 5 / GPT-5.6 model generation. Surgical prompt-text change: create one calibration reference, wire it into the two review agents, remove the severity-inflating "go soft" bullet lists, and add a bounded-convergence contract to the gap-closure loop in execute-phase.md and plan-phase.md.

Purpose: Phase 14 demonstrated runaway gap-closure loops (fresh reviews re-raising Criticals after gaps were closed; blocker count not decreasing). This plan installs the stop condition and severity anchor permanently in the framework prompts.

Output: 1 new reference file + 4 surgically edited prompt files, synced to ~/.claude installed copies.

**SCOPE DISCIPLINE (user-locked):** Touch ONLY the five repo files listed in `files_modified`, their installed counterparts under ~/.claude, and the .oto tracking artifacts the quick workflow maintains. No refactoring, no other agent or workflow files, no "while I'm here" improvements.
</objective>

<execution_context>
@~/.claude/oto/workflows/execute-plan.md
@~/.claude/oto/templates/summary.md
</execution_context>

<context>
@.oto/STATE.md
@CLAUDE.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create model-calibration.md and wire it into both review agents</name>
  <files>oto/references/model-calibration.md, oto/agents/oto-code-reviewer.md, oto/agents/oto-verifier.md</files>
  <action>
**1a. CREATE `oto/references/model-calibration.md`** with EXACTLY this content as the full file body (verbatim — do not rewrite, reformat, or add sections):

```markdown
# Model Calibration — Severity & Convergence Anchor

oto is a personal, single-user CLI framework run by one developer on their own machine. Calibrate ALL review and verification severity to that threat model.

**Critical/Blocker** = secret material written to git-tracked files or transmitted off-machine; destruction or loss of user project data; a broken core workflow (install, plan, execute) that blocks daily use.

**Warning** = issues requiring local same-user access (TOCTOU races, symlink attacks); hardening against hypothetical future API changes; defense-in-depth gaps; maintainability concerns.

**Info** = style, naming, minor cleanup.

A clean review of sound code is a correct and expected outcome, not a reviewer failure. Do not inflate severity to appear thorough. Findings must be proportionate to a personal tool, not a multi-tenant production service.

**Convergence rules:** Maximum 2 gap-closure cycles per phase, then STOP and present unresolved findings for developer triage — never auto-generate a third cycle. Gap-cycle re-reviews MUST read the phase's prior REVIEW.md and DISPOSITIONS.md, MUST NOT re-raise findings already dispositioned ACCEPT or DEFER, and MUST limit review scope to files changed by the gap-closure plans.
```

**1b. EDIT `oto/agents/oto-verifier.md`:**

- The existing `<required_reading>` block is at lines 41-44 (between `</adversarial_stance>` and the "Escalation Gate" line). Add one line inside it, after the `@~/.claude/oto/references/gates.md` line:
  `@~/.claude/oto/references/model-calibration.md`
- In `<adversarial_stance>` (lines 25-39): DELETE the "Common failure modes — how verifiers go soft:" heading line and its 5 bullets (lines 28-33: "Trusting SUMMARY.md bullet points...", "Accepting \"file exists\"...", "Choosing UNCERTAIN instead of FAILED...", "Letting high task-completion percentage...", "Anchoring on truths that passed early..."). KEEP the "**FORCE stance:**" paragraph (line 26) and the entire "**Required finding classification:**" block (lines 35-38) untouched. Also keep the `<role>` section's "Do NOT trust SUMMARY.md claims" mindset (line 21) — do not touch it.

**1c. EDIT `oto/agents/oto-code-reviewer.md`:**

- This file has no static `<required_reading>` block (its `<role>` at lines 15-16 only says to honor prompt-provided `<required_reading>` blocks). Add an equivalent block near the top: immediately after `</role>` (line 17) and before `<adversarial_stance>` (line 19), insert:

  ```
  <required_reading>
  @~/.claude/oto/references/model-calibration.md
  </required_reading>
  ```

- In `<adversarial_stance>` (lines 19-33): DELETE the "Common failure modes — how code reviewers go soft:" heading line and its 5 bullets (lines 22-27: "Stopping at obvious surface issues...", "Accepting plausible-looking logic...", "Treating \"code compiles\"...", "Reading only the file under review...", "Downgrading findings from BLOCKER to WARNING to avoid seeming harsh"). KEEP the "**FORCE stance:**" paragraph (line 20) and the "**Required finding classification:**" block (lines 29-32, including the "Findings without a classification are not valid output." line) untouched.

Do not modify anything else in either agent file.
  </action>
  <verify>
    <automated>grep -c "model-calibration" oto/agents/oto-code-reviewer.md oto/agents/oto-verifier.md && ! grep -rn "go soft" oto/agents/ && grep -q "Maximum 2 gap-closure cycles" oto/references/model-calibration.md</automated>
  </verify>
  <done>model-calibration.md exists with the exact specified body; both agents reference it via required_reading; "go soft" appears nowhere under oto/agents/; FORCE stance and finding-classification blocks are intact in both agents.</done>
</task>

<task type="auto">
  <name>Task 2: Add bounded-convergence contract to execute-phase.md and plan-phase.md gap mode</name>
  <files>oto/workflows/execute-phase.md, oto/workflows/plan-phase.md</files>
  <action>
**2a. EDIT `oto/workflows/execute-phase.md`** — gaps_found handling inside the `verify_phase_goal` step:

- **Routing table (lines 1367-1371):** The `gaps_found` row currently reads `| \`gaps_found\` | Present gap summary, offer \`/oto-plan-phase {phase} --gaps ${OTO_WS}\` |`. Change its action to note the cycle-count precondition, e.g. `Present gap summary; check gap-cycle count first (see "If gaps_found" below) — offer \`/oto-plan-phase {phase} --gaps ${OTO_WS}\` only if bounded-convergence conditions allow`.

- **"If gaps_found:" block (lines 1435-1456):** Before the `## ⚠ Phase {X}: {Name} — Gaps Found` presentation template, insert the bounded convergence contract:

  Before offering `/oto-plan-phase {X} --gaps`, count prior gap-closure cycles for this phase — count `gap_closure: true` plans and/or re-verification history entries in `{phase_num}-VERIFICATION.md`. Then:
  - **If 2 gap-closure cycles have already run**, OR **the blocker count did not decrease between the last two verifications**: do NOT offer another `--gaps` cycle. Instead instruct creation/update of `{phase_dir}/{phase_num}-DISPOSITIONS.md` — every finding marked FIX / ACCEPT / DEFER with evidence — and present the unresolved findings for developer triage. STOP; a developer decision is required.
  - **Otherwise** (0 or 1 prior cycles and blockers decreasing): present the existing gap summary and offer `/oto-plan-phase {X} --gaps ${OTO_WS}` as today.

- **Gap-closure-cycle description (line 1456):** Extend the sentence `Gap closure cycle: /oto-plan-phase {X} --gaps ... → verifier re-runs.` to state the bound: maximum 2 gap-closure cycles per phase; after that, or if blockers stop decreasing, the loop terminates in DISPOSITIONS.md-based developer triage — never auto-generate a third cycle.

Wording may be adapted to the surrounding style, but the contract content (cycle counting, the two stop conditions, DISPOSITIONS.md with FIX/ACCEPT/DEFER + evidence, developer triage) is mandatory.

**2b. EDIT `oto/workflows/plan-phase.md`** — gap_closure (`--gaps`) mode, inside the planner prompt in step "## 8. Spawn oto-planner Agent":

- **`<files_to_read>` block (lines 663-684):** After the two existing gap lines (`- {verification_path} (Verification Gaps - if --gaps)` at line 670 and `- {uat_path} (UAT Gaps - if --gaps)` at line 671), add two lines:
  ```
  - {phase_dir}/{phase_num}-REVIEW.md (Prior review findings — if --gaps and exists)
  - {phase_dir}/{phase_num}-DISPOSITIONS.md (Prior finding dispositions — if --gaps and exists)
  ```

- **Gap-mode planner instructions:** In the same planner prompt (after the `</files_to_read>` closing tag at line 684, near the `${AGENT_SKILLS_PLANNER}` / project-instructions lines), add a conditional gap-mode block (mirror the surrounding template style, e.g. gate on gap_closure mode):
  - The planner MUST read the phase's prior REVIEW.md and DISPOSITIONS.md if they exist.
  - Findings dispositioned ACCEPT or DEFER MUST NOT generate new plans.
  - The subsequent re-review scope is limited to files changed by the gap plans.

Do not modify any other section of either workflow file. Do not touch `oto/references/planner-gap-closure.md` or any other file.
  </action>
  <verify>
    <automated>grep -q "DISPOSITIONS" oto/workflows/execute-phase.md && grep -q "DISPOSITIONS" oto/workflows/plan-phase.md && grep -qi "did not decrease" oto/workflows/execute-phase.md && grep -qi "ACCEPT or DEFER" oto/workflows/plan-phase.md</automated>
  </verify>
  <done>execute-phase.md gaps_found routing and cycle description carry the bounded-convergence contract (max 2 cycles, non-decreasing-blocker stop, DISPOSITIONS.md triage); plan-phase.md --gaps mode requires prior REVIEW.md/DISPOSITIONS.md reads, excludes ACCEPT/DEFER findings from new plans, and scopes re-review to gap-plan files.</done>
</task>

<task type="auto">
  <name>Task 3: Sync installed copies under ~/.claude, run full verification, commit</name>
  <files>oto/references/model-calibration.md, oto/agents/oto-code-reviewer.md, oto/agents/oto-verifier.md, oto/workflows/execute-phase.md, oto/workflows/plan-phase.md</files>
  <action>
**3a. SYNC** — copy each changed repo file over its installed counterpart (installed locations verified to exist during planning):

```bash
cp oto/references/model-calibration.md ~/.claude/oto/references/model-calibration.md
cp oto/agents/oto-code-reviewer.md ~/.claude/agents/oto-code-reviewer.md
cp oto/agents/oto-verifier.md ~/.claude/agents/oto-verifier.md
cp oto/workflows/execute-phase.md ~/.claude/oto/workflows/execute-phase.md
cp oto/workflows/plan-phase.md ~/.claude/oto/workflows/plan-phase.md
```

Then verify each installed copy matches the repo copy:

```bash
diff -q oto/references/model-calibration.md ~/.claude/oto/references/model-calibration.md
diff -q oto/agents/oto-code-reviewer.md ~/.claude/agents/oto-code-reviewer.md
diff -q oto/agents/oto-verifier.md ~/.claude/agents/oto-verifier.md
diff -q oto/workflows/execute-phase.md ~/.claude/oto/workflows/execute-phase.md
diff -q oto/workflows/plan-phase.md ~/.claude/oto/workflows/plan-phase.md
```

All five diffs must produce no output (exit 0).

**3b. VERIFY:**
- `npm test` exits 0 (prompt-text change must not break any tooling tests).
- `grep -l "model-calibration" oto/agents/oto-code-reviewer.md oto/agents/oto-verifier.md` lists both files.
- `grep -rn "go soft" oto/agents/` returns nothing (exit 1).

**3c. COMMIT** — atomic commit(s) touching ONLY the five listed repo files plus the .oto tracking files the quick workflow maintains (this PLAN.md, SUMMARY.md, STATE.md quick-task entry). Suggested single commit:

```bash
git add oto/references/model-calibration.md oto/agents/oto-code-reviewer.md oto/agents/oto-verifier.md oto/workflows/execute-phase.md oto/workflows/plan-phase.md
```

Commit message: `feat(quick): recalibrate review severity and bound gap-closure convergence`. Before committing, run `git status --porcelain` and confirm no other repo file is staged or modified by this work. Files under ~/.claude are outside the repo and are not committed.
  </action>
  <verify>
    <automated>npm test && diff -q oto/workflows/execute-phase.md ~/.claude/oto/workflows/execute-phase.md && diff -q oto/workflows/plan-phase.md ~/.claude/oto/workflows/plan-phase.md && diff -q oto/references/model-calibration.md ~/.claude/oto/references/model-calibration.md && diff -q oto/agents/oto-code-reviewer.md ~/.claude/agents/oto-code-reviewer.md && diff -q oto/agents/oto-verifier.md ~/.claude/agents/oto-verifier.md</automated>
  </verify>
  <done>All five installed copies byte-identical to repo copies; npm test green; commit contains only the five repo files (plus .oto quick-task tracking artifacts).</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| repo → ~/.claude installed copies | Prompt text copied into live agent/workflow config; a bad copy silently changes agent behavior |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-quick-01 | Tampering | ~/.claude sync step | mitigate | `diff -q` after every copy proves installed copy == repo copy |
| T-quick-02 | Denial of service | review loop prompts | mitigate | Bounded convergence contract itself (max 2 cycles) is the fix; npm test guards against tooling regressions |
</threat_model>

<verification>
- `oto/references/model-calibration.md` exists and contains the exact user-specified body (severity tiers + convergence rules).
- `grep "model-calibration" oto/agents/oto-code-reviewer.md oto/agents/oto-verifier.md` → both match.
- `grep -rn "go soft" oto/agents/` → no matches.
- FORCE stance and Required finding classification blocks survive in both agents' `<adversarial_stance>` sections.
- execute-phase.md gaps_found path counts prior cycles and routes to DISPOSITIONS.md triage after 2 cycles or non-decreasing blockers.
- plan-phase.md gap mode reads REVIEW.md/DISPOSITIONS.md, excludes ACCEPT/DEFER, scopes re-review.
- All 5 installed copies pass `diff -q`.
- `npm test` exits 0.
- `git log` shows commits touching only the 5 repo files + .oto tracking artifacts.
</verification>

<success_criteria>
- Review agents load the calibration anchor before every review/verification run.
- Severity-inflation bullet lists are gone; evidence and classification requirements remain.
- The Phase 14-style runaway loop is structurally impossible: after 2 gap cycles (or stalled blocker count), workflows route to DISPOSITIONS.md developer triage instead of a third `--gaps` offer.
- Repo and installed copies are in lockstep.
</success_criteria>

<output>
After completion, create `.oto/quick/260713-ffa-recalibrate-review-machinery-severity-an/260713-ffa-SUMMARY.md`
</output>
