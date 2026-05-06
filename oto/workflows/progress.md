<purpose>
Check project progress, summarize recent work and what's ahead, then intelligently route to the next action — either executing an existing plan or creating the next one. Provides situational awareness before continuing work.
</purpose>

<required_reading>
Read all files referenced by the invoking prompt's execution_context before starting.
</required_reading>

<process>

<step name="init_context">
**Load progress context (paths only):**

```bash
INIT=$(oto-sdk query init.progress)
if [[ "$INIT" == @file:* ]]; then INIT=$(cat "${INIT#@file:}"); fi
```

Extract from init JSON: `project_exists`, `roadmap_exists`, `state_exists`, `phases`, `current_phase`, `next_phase`, `milestone_version`, `completed_count`, `phase_count`, `paused_at`, `state_path`, `roadmap_path`, `project_path`, `config_path`.

`state_path`, `roadmap_path`, and `project_path` are authoritative. They may
point at the canonical OTO root for new projects or the legacy state root for
projects migrated with `/oto-migrate` without `--rename-state-dir`. A `STATE.md`
file with `oto_state_version` is already migrated and must not be described as
GSD-era.

```bash
DISCUSS_MODE=$(oto-sdk query config-get workflow.discuss_mode 2>/dev/null || echo "discuss")
```

If `project_exists` is false (no OTO planning root):

```
No planning structure found.

Run /oto-new-project to start a new project.
```

Exit.

If missing STATE.md: suggest `/oto-new-project`.

**If ROADMAP.md missing but PROJECT.md exists:**

This means a milestone was completed and archived. Go to **Route F** (between milestones).

If missing both ROADMAP.md and PROJECT.md: suggest `/oto-new-project`.

If falling back to direct artifact reads because `oto-sdk query` is unavailable:
- Prefer the canonical OTO state root when present.
- Otherwise, if the legacy state root's `STATE.md` contains `oto_state_version`,
  read from that root and treat it as a valid migrated OTO project.
- Only suggest `/oto-migrate --dry-run` when artifacts still contain GSD-era
  markers such as `gsd_state_version`, `<!-- GSD:... -->`, or `/gsd-...`.
</step>

<step name="load">
**Use structured extraction from `oto-sdk query` (or legacy oto-tools.cjs):**

Instead of reading full files, use targeted tools to get only the data needed for the report:
- `ROADMAP=$(oto-sdk query roadmap.analyze)`
- `STATE=$(oto-sdk query state-snapshot)`

This minimizes orchestrator context usage.
</step>

<step name="analyze_roadmap">
**Get comprehensive roadmap analysis (replaces manual parsing):**

```bash
ROADMAP=$(oto-sdk query roadmap.analyze)
```

This returns structured JSON with:
- All phases with disk status (complete/partial/planned/empty/no_directory)
- Goal and dependencies per phase
- Plan and summary counts per phase
- Aggregated stats: total plans, summaries, progress percent
- Current and next phase identification

Use this instead of manually reading/parsing ROADMAP.md.
</step>

<step name="recent">
**Gather Recent Activity (interleaved logs + summaries, newest 5):**

Two extraction paths feed one chronological list. Logs come from `.oto/logs/*.md`; summaries from `.oto/phases/*/*-SUMMARY.md`. Both are decorated with a leading timestamp and kind tag, sorted descending, and sliced to the top 5.

```bash
LOG_LINES=()
if compgen -G ".oto/logs/*.md" > /dev/null 2>&1; then
  for f in .oto/logs/*.md; do
    bn=$(basename "$f")
    case "$bn" in .*) continue ;; esac
    date=$(oto-sdk query frontmatter.get "$f" date --raw 2>/dev/null || echo "")
    title=$(oto-sdk query frontmatter.get "$f" title --raw 2>/dev/null || echo "")
    phase=$(oto-sdk query frontmatter.get "$f" phase --raw 2>/dev/null || echo "null")
    suffix=""
    [ "$phase" != "null" ] && [ -n "$phase" ] && suffix=" (phase $phase)"
    [ -n "$date" ] && LOG_LINES+=("${date}\t[${date}] [log] ${title}${suffix}")
  done
fi

SUM_LINES=()
if compgen -G ".oto/phases/*/*-SUMMARY.md" > /dev/null 2>&1; then
  for f in .oto/phases/*/*-SUMMARY.md; do
    one_liner=$(oto-sdk query summary-extract "$f" --fields one_liner 2>/dev/null || echo "")
    completed=$(oto-sdk query frontmatter.get "$f" completed --raw 2>/dev/null || echo "")
    phase=$(oto-sdk query frontmatter.get "$f" phase --raw 2>/dev/null || echo "")
    [ -n "$completed" ] && SUM_LINES+=("${completed}\t[${completed}] [summary] ${one_liner} (phase ${phase})")
  done
fi

RECENT_ACTIVITY=$(
  { printf '%s\n' "${LOG_LINES[@]}"; printf '%s\n' "${SUM_LINES[@]}"; } \
  | grep -v '^$' \
  | sort -r \
  | head -5 \
  | cut -f2-
)
```

`$RECENT_ACTIVITY` is consumed by step `report` and rendered as the "Recent Activity" panel. Format per item: `[YYYY-MM-DD HH:mm] [log|summary] <title> [(phase NN)]`.
  </step>

<step name="position">
**Parse current position from init context and roadmap analysis:**

- Use `current_phase` and `next_phase` from `$ROADMAP`
- Note `paused_at` if work was paused (from `$STATE`)
- Count pending todos: use `init todos` or `list-todos`
- Check for active debug sessions: `(ls .oto/debug/*.md 2>/dev/null || true) | grep -v resolved | wc -l`
  </step>

<step name="report">
**Generate progress bar from `oto-sdk query progress` / `progress.json`, then present rich status report:**

```bash
# Get formatted progress bar
PROGRESS_BAR=$(oto-sdk query progress.bar --raw)
```

Present:

```
# [Project Name]

**Progress:** {PROGRESS_BAR}
**Profile:** [quality/balanced/budget/inherit]
**Discuss mode:** {DISCUSS_MODE}

## Recent Activity
- [YYYY-MM-DD HH:mm] [log|summary] [title or one-line summary] [(phase NN)]
- [YYYY-MM-DD HH:mm] [log|summary] [title or one-line summary] [(phase NN)]

## Current Position
Phase [N] of [total]: [phase-name]
Plan [M] of [phase-total]: [status]
CONTEXT: [✓ if has_context | - if not]

## Key Decisions Made
- [extract from $STATE.decisions[]]
- [e.g. jq -r '.decisions[].decision' from state-snapshot]

## Blockers/Concerns
- [extract from $STATE.blockers[]]
- [e.g. jq -r '.blockers[].text' from state-snapshot]

## Pending Todos
- [count] pending — /oto-check-todos to review

## Active Debug Sessions
- [count] active — /oto-debug to continue
(Only show this section if count > 0)

## What's Next
[Next phase/plan objective from roadmap analyze]
```

</step>

<step name="route">
**Determine next action based on verified counts.**

**Step 1: Count plans, summaries, and issues in current phase**

List files in the current phase directory:

```bash
(ls -1 .oto/phases/[current-phase-dir]/*-PLAN.md 2>/dev/null || true) | wc -l
(ls -1 .oto/phases/[current-phase-dir]/*-SUMMARY.md 2>/dev/null || true) | wc -l
(ls -1 .oto/phases/[current-phase-dir]/*-UAT.md 2>/dev/null || true) | wc -l
```

State: "This phase has {X} plans, {Y} summaries."

**Step 1.5: Check for unaddressed UAT gaps**

Check for UAT.md files with status "diagnosed" (has gaps needing fixes).

```bash
# Check for diagnosed UAT with gaps or partial (incomplete) testing
grep -l "status: diagnosed\|status: partial" .oto/phases/[current-phase-dir]/*-UAT.md 2>/dev/null || true
```

Track:
- `uat_with_gaps`: UAT.md files with status "diagnosed" (gaps need fixing)
- `uat_partial`: UAT.md files with status "partial" (incomplete testing)

**Step 1.6: Cross-phase health check**

Scan ALL phases in the current milestone for outstanding verification debt using the CLI (which respects milestone boundaries via `getMilestonePhaseFilter`):

```bash
DEBT=$(oto-sdk query audit-uat --raw 2>/dev/null)
```

Parse JSON for `summary.total_items` and `summary.total_files`.

Track: `outstanding_debt` — `summary.total_items` from the audit.

**If outstanding_debt > 0:** Add a warning section to the progress report output (in the `report` step), placed between "## What's Next" and the route suggestion:

```markdown
## Verification Debt ({N} files across prior phases)

| Phase | File | Issue |
|-------|------|-------|
| {phase} | {filename} | {pending_count} pending, {skipped_count} skipped, {blocked_count} blocked |
| {phase} | {filename} | human_needed — {count} items |

Review: `/oto-audit-uat ${OTO_WS}` — full cross-phase audit
Resume testing: `/oto-verify-work {phase} ${OTO_WS}` — retest specific phase
```

This is a WARNING, not a blocker — routing proceeds normally. The debt is visible so the user can make an informed choice.

**Step 2: Route based on counts**

| Condition | Meaning | Action |
|-----------|---------|--------|
| uat_partial > 0 | UAT testing incomplete | Go to **Route E.2** |
| uat_with_gaps > 0 | UAT gaps need fix plans | Go to **Route E** |
| summaries < plans | Unexecuted plans exist | Go to **Route A** |
| summaries = plans AND plans > 0 | Phase complete | Go to Step 3 |
| plans = 0 | Phase not yet planned | Go to **Route B** |

---

**Route A: Unexecuted plan exists**

Find the first PLAN.md without matching SUMMARY.md.
Read its `<objective>` section.

```
---

## ▶ Next Up — [${PROJECT_CODE}] ${PROJECT_TITLE}

**{phase}-{plan}: [Plan Name]** — [objective summary from PLAN.md]

`/clear` then:

`/oto-execute-phase {phase} ${OTO_WS}`

---
```

---

**Route B: Phase needs planning**

Check if `{phase_num}-CONTEXT.md` exists in phase directory.

Check if current phase has UI indicators:

```bash
PHASE_SECTION=$(oto-sdk query roadmap.get-phase "${CURRENT_PHASE}" 2>/dev/null)
PHASE_HAS_UI=$(echo "$PHASE_SECTION" | grep -qi "UI hint.*yes" && echo "true" || echo "false")
```

**If CONTEXT.md exists:**

```
---

## ▶ Next Up — [${PROJECT_CODE}] ${PROJECT_TITLE}

**Phase {N}: {Name}** — {Goal from ROADMAP.md}
<sub>✓ Context gathered, ready to plan</sub>

`/clear` then:

`/oto-plan-phase {phase-number} ${OTO_WS}`

---
```

**If CONTEXT.md does NOT exist AND phase has UI (`PHASE_HAS_UI` is `true`):**

```
---

## ▶ Next Up — [${PROJECT_CODE}] ${PROJECT_TITLE}

**Phase {N}: {Name}** — {Goal from ROADMAP.md}

`/clear` then:

`/oto-discuss-phase {phase}` — gather context and clarify approach

---

**Also available:**
- `/oto-ui-phase {phase}` — generate UI design contract (recommended for frontend phases)
- `/oto-plan-phase {phase}` — skip discussion, plan directly
- `/oto-list-phase-assumptions {phase}` — see Claude's assumptions

---
```

**If CONTEXT.md does NOT exist AND phase has no UI:**

```
---

## ▶ Next Up — [${PROJECT_CODE}] ${PROJECT_TITLE}

**Phase {N}: {Name}** — {Goal from ROADMAP.md}

`/clear` then:

`/oto-discuss-phase {phase} ${OTO_WS}` — gather context and clarify approach

---

**Also available:**
- `/oto-plan-phase {phase} ${OTO_WS}` — skip discussion, plan directly
- `/oto-list-phase-assumptions {phase} ${OTO_WS}` — see Claude's assumptions

---
```

---

**Route E: UAT gaps need fix plans**

UAT.md exists with gaps (diagnosed issues). User needs to plan fixes.

```
---

## ⚠ UAT Gaps Found

**{phase_num}-UAT.md** has {N} gaps requiring fixes.

`/clear` then:

`/oto-plan-phase {phase} --gaps ${OTO_WS}`

---

**Also available:**
- `/oto-execute-phase {phase} ${OTO_WS}` — execute phase plans
- `/oto-verify-work {phase} ${OTO_WS}` — run more UAT testing

---
```

---

**Route E.2: UAT testing incomplete (partial)**

UAT.md exists with `status: partial` — testing session ended before all items resolved.

```
---

## Incomplete UAT Testing

**{phase_num}-UAT.md** has {N} unresolved tests (pending, blocked, or skipped).

`/clear` then:

`/oto-verify-work {phase} ${OTO_WS}` — resume testing from where you left off

---

**Also available:**
- `/oto-audit-uat ${OTO_WS}` — full cross-phase UAT audit
- `/oto-execute-phase {phase} ${OTO_WS}` — execute phase plans

---
```

---

**Step 3: Check milestone status (only when phase complete)**

Read ROADMAP.md and identify:
1. Current phase number
2. All phase numbers in the current milestone section

Count total phases and identify the highest phase number.

State: "Current phase is {X}. Milestone has {N} phases (highest: {Y})."

**Route based on milestone status:**

| Condition | Meaning | Action |
|-----------|---------|--------|
| current phase < highest phase | More phases remain | Go to **Route C** |
| current phase = highest phase | Milestone complete | Go to **Route D** |

---

**Route C: Phase complete, more phases remain**

Read ROADMAP.md to get the next phase's name and goal.

Check if next phase has UI indicators:

```bash
NEXT_PHASE_SECTION=$(oto-sdk query roadmap.get-phase "$((Z+1))" 2>/dev/null)
NEXT_HAS_UI=$(echo "$NEXT_PHASE_SECTION" | grep -qi "UI hint.*yes" && echo "true" || echo "false")
```

**If next phase has UI (`NEXT_HAS_UI` is `true`):**

```
---

## ✓ Phase {Z} Complete

## ▶ Next Up — [${PROJECT_CODE}] ${PROJECT_TITLE}

**Phase {Z+1}: {Name}** — {Goal from ROADMAP.md}

`/clear` then:

`/oto-discuss-phase {Z+1}` — gather context and clarify approach

---

**Also available:**
- `/oto-ui-phase {Z+1}` — generate UI design contract (recommended for frontend phases)
- `/oto-plan-phase {Z+1}` — skip discussion, plan directly
- `/oto-verify-work {Z}` — user acceptance test before continuing

---
```

**If next phase has no UI:**

```
---

## ✓ Phase {Z} Complete

## ▶ Next Up — [${PROJECT_CODE}] ${PROJECT_TITLE}

**Phase {Z+1}: {Name}** — {Goal from ROADMAP.md}

`/clear` then:

`/oto-discuss-phase {Z+1} ${OTO_WS}` — gather context and clarify approach

---

**Also available:**
- `/oto-plan-phase {Z+1} ${OTO_WS}` — skip discussion, plan directly
- `/oto-verify-work {Z} ${OTO_WS}` — user acceptance test before continuing

---
```

---

**Route D: Milestone complete**

```
---

## 🎉 Milestone Complete

All {N} phases finished!

## ▶ Next Up — [${PROJECT_CODE}] ${PROJECT_TITLE}

**Complete Milestone** — archive and prepare for next

`/clear` then:

`/oto-complete-milestone ${OTO_WS}`

---

**Also available:**
- `/oto-verify-work ${OTO_WS}` — user acceptance test before completing milestone

---
```

---

**Route F: Between milestones (ROADMAP.md missing, PROJECT.md exists)**

A milestone was completed and archived. Ready to start the next milestone cycle.

Read MILESTONES.md to find the last completed milestone version.

```
---

## ✓ Milestone v{X.Y} Complete

Ready to plan the next milestone.

## ▶ Next Up — [${PROJECT_CODE}] ${PROJECT_TITLE}

**Start Next Milestone** — questioning → research → requirements → roadmap

`/clear` then:

`/oto-new-milestone ${OTO_WS}`

---
```

</step>

<step name="edge_cases">
**Handle edge cases:**

- Phase complete but next phase not planned → offer `/oto-plan-phase [next] ${OTO_WS}`
- All work complete → offer milestone completion
- Blockers present → highlight before offering to continue
- Handoff file exists → mention it, offer `/oto-resume-work ${OTO_WS}`
</step>

<step name="forensic_audit">
**Forensic Integrity Audit** — only runs when `--forensic` is present in ARGUMENTS.

If `--forensic` is NOT present in ARGUMENTS: skip this step entirely. Default progress behavior (standard report + routing) is unchanged.

If `--forensic` IS present: after the standard report and routing suggestion have been displayed, append the following audit section.

---

## Forensic Integrity Audit

Running 6 deep checks against project state...

Run each check in order. For each check, emit ✓ (pass) or ⚠ (warning) with concrete evidence when a problem is found.

**Check 1 — STATE vs artifact consistency**

Read STATE.md `status` / `stopped_at` fields (from the STATE snapshot already loaded). Compare against the artifact count from the roadmap analysis. If STATE.md claims the current phase is pending/mid-flight but the artifact count shows it as complete (all PLAN.md files have matching SUMMARY.md files), flag inconsistency. Emit:
- ✓ `STATE.md consistent with artifact count` — if both agree
- ⚠ `STATE.md claims [status] but artifact count shows phase complete` — with the specific values

**Check 2 — Orphaned handoff files**

Check for existence of:
```bash
ls .oto/HANDOFF.json .oto/phases/*/.continue-here.md .oto/phases/*/*HANDOFF*.md 2>/dev/null || true
```
Also check `.oto/continue-here.md`.

Emit:
- ✓ `No orphaned handoff files` — if none found
- ⚠ `Orphaned handoff files found` — list each file path, add: `→ Work was paused mid-flight. Read the handoff before continuing.`

**Check 3 — Deferred scope drift**

Search phase artifacts (CONTEXT.md, DISCUSSION-LOG.md, BUG-BRIEF.md, VERIFICATION.md, SUMMARY.md, HANDOFF.md files under `.oto/phases/`) for patterns:
```bash
grep -rl "defer to Phase\|future phase\|out of scope Phase\|deferred to Phase" .oto/phases/ 2>/dev/null || true
```

For each match, extract the referenced phase number. Cross-reference against ROADMAP.md phase list. If the referenced phase number is NOT in ROADMAP.md, flag as deferred scope not captured.

Emit:
- ✓ `All deferred scope captured in ROADMAP` — if no mismatches
- ⚠ `Deferred scope references phase(s) not in ROADMAP` — list: file, reference text, missing phase number

**Check 4 — Memory-flagged pending work**

Check if `.oto/MEMORY.md` or `.oto/memory/` exists:
```bash
ls .oto/MEMORY.md .oto/memory/*.md 2>/dev/null || true
```

If found, grep for entries containing: `pending`, `status`, `deferred`, `not yet run`, `backfill`, `blocking`.

Emit:
- ✓ `No memory entries flagging pending work` — if none found or no MEMORY.md
- ⚠ `Memory entries flag pending/deferred work` — list the matching lines (max 5, truncated at 80 chars)

**Check 5 — Blocking operational todos**

Check for pending todos:
```bash
ls .oto/todos/pending/*.md 2>/dev/null || true
```

For files found, scan for keywords indicating operational blockers: `script`, `credential`, `API key`, `manual`, `verification`, `setup`, `configure`, `run `.

Emit:
- ✓ `No blocking operational todos` — if no pending todos or none match operational keywords
- ⚠ `Blocking operational todos found` — list the file names and matching keywords (max 5)

**Check 6 — Uncommitted code**

```bash
git status --porcelain 2>/dev/null | grep -v "^??" | grep -v "^.oto\/" | grep -v "^\.\." | head -10
```

If output is non-empty (modified/staged files outside `.oto/`), flag as uncommitted code.

Emit:
- ✓ `Working tree clean` — if no modified files outside `.oto/`
- ⚠ `Uncommitted changes in source files` — list up to 10 file paths

---

After all 6 checks, display the verdict:

**If all 6 checks passed:**
```
### Verdict: CLEAN

The standard progress report is trustworthy — proceed with the routing suggestion above.
```

**If 1 or more checks failed:**
```
### Verdict: N INTEGRITY ISSUE(S) FOUND

The standard progress report may not reflect true project state.
Review the flagged items above before acting on the routing suggestion.
```

Then for each failed check, add a concrete next action:
- Check 2 (orphaned handoff): `Read the handoff file(s) and resume from where work was paused: /oto-resume-work ${OTO_WS}`
- Check 3 (deferred scope): `Add the missing phases to ROADMAP.md or update the deferred references`
- Check 4 (memory pending): `Review the flagged memory entries and resolve or clear them`
- Check 5 (blocking todos): `Complete the operational steps in .oto/todos/pending/ before continuing`
- Check 6 (uncommitted code): `Commit or stash the uncommitted changes before advancing`
- Check 1 (STATE inconsistency): `Run /oto-verify-work ${PHASE} ${OTO_WS} to reconcile state`
</step>

</process>

<success_criteria>

- [ ] Rich context provided (recent work, decisions, issues)
- [ ] Current position clear with visual progress
- [ ] What's next clearly explained
- [ ] Smart routing: /oto-execute-phase if plans exist, /oto-plan-phase if not
- [ ] User confirms before any action
- [ ] Seamless handoff to appropriate oto command
      </success_criteria>
