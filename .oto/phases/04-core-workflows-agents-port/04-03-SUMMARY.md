---
phase: 04-core-workflows-agents-port
plan: 03
subsystem: workflows
tags: [phase-04, dropped-agents, markdown, oto-debug, oto-plan-phase]

requires:
  - phase: 04-core-workflows-agents-port
    provides: "04-02 generated the baseline oto/ command and workflow payload"
provides:
  - "WF-03 plan-phase workflow without dropped pattern-mapping agent execution"
  - "WF-10 debug command routed directly through retained oto-debugger"
affects: [phase-04-wave-2, phase-04-verification, oto-runtime-payload]

tech-stack:
  added: []
  patterns:
    - "Dropped executable agent references are either rewritten to a retained agent or replaced by an explicit DEFERRED ADR marker"

key-files:
  created:
    - ".planning/phases/04-core-workflows-agents-port/04-03-SUMMARY.md"
  modified:
    - "oto/commands/oto/debug.md"
    - "oto/workflows/plan-phase.md"

key-decisions:
  - "Route debug continuation and new debug sessions directly to oto-debugger because ADR-07 says it absorbs debug-session-manager responsibilities."
  - "Do not silently substitute oto-codebase-mapper for the dropped pattern-mapping role; keep the optional step visibly deferred per ADR-07."
  - "Avoid adding path-like .planning/ references to shipped oto payload while documenting the Phase 4 research pointer."

patterns-established:
  - "Use DEFERRED comments with ADR references for unavailable v2 agent roles in shipped workflow markdown."
  - "Keep shipped workflow payload free of dropped-agent executable Task calls."

requirements-completed: [WF-03, WF-10]
requirements-addressed-from-plan: [WF-03, WF-10]

duration: 7 min
completed: 2026-04-29
---

# Phase 04 Plan 03: Dropped-Agent Core Rewrite Summary

**Plan-phase now defers the dropped pattern-mapping agent, and `/oto-debug` delegates directly to retained `oto-debugger`.**

## Performance

- **Duration:** 7 min
- **Started:** 2026-04-29T22:45:48Z
- **Completed:** 2026-04-29T22:52:28Z
- **Tasks:** 2
- **Files modified:** 2 implementation files, 1 summary file

## Accomplishments

- Removed all `debug-session-manager` references from `oto/commands/oto/debug.md`.
- Replaced both debug Task calls with `subagent_type="oto-debugger"`.
- Removed the dropped `oto-pattern-mapper` executable reference from `oto/workflows/plan-phase.md`.
- Replaced the optional pattern-mapping spawn block with an ADR-07 `DEFERRED` marker and a manual `/oto-map-codebase` approximation.

## Task Commits

Each task was committed atomically; one verification cleanup commit followed Task 1 after a remaining generic prose reference was found.

1. **Task 1: Rewrite debug command to use oto-debugger** - `f958b40` (fix)
2. **Task 2: Defer pattern-mapping workflow step** - `0838468` (fix)
3. **Task 1 verification cleanup: finish direct-delegation prose** - `13cbf5c` (fix)

## Files Created/Modified

- `oto/commands/oto/debug.md` - Removes the dropped debug session manager agent and sends continuation/new-session Task calls to `oto-debugger`.
- `oto/workflows/plan-phase.md` - Removes the dropped pattern-mapping agent from available agents and defers the optional §7.8 step.
- `.planning/phases/04-core-workflows-agents-port/04-03-SUMMARY.md` - Execution summary and verification evidence.

## Requirements Copied From PLAN Frontmatter

- `WF-03`
- `WF-10`

## Edit Evidence

### `oto/commands/oto/debug.md`

**Edit 1: available agent list**

Before, lines 28-32:

```markdown
28 <available_agent_types>
29 Valid OTO subagent types (use exact names — do not fall back to 'general-purpose'):
30 - oto-debug-session-manager — manages debug checkpoint/continuation loop in isolated context
31 - oto-debugger — investigates bugs using scientific method
32 </available_agent_types>
```

After, lines 28-31:

```markdown
28 <available_agent_types>
29 Valid OTO subagent types (use exact names — do not fall back to 'general-purpose'):
30 - oto-debugger — investigates bugs using scientific method and manages debug checkpoint/continuation loop in isolated context
31 </available_agent_types>
```

**Edit 2: continue flow delegation and Task call**

Before, lines 133-169:

```markdown
133 Surface to user. Then delegate directly to the session manager (skip Steps 2 and 3 — pass `symptoms_prefilled: true` and set the slug from SLUG variable). The existing file IS the context.
141 [debug] Delegating loop to session manager...
144 Spawn session manager:
163   subagent_type="oto-debug-session-manager",
169 Display the compact summary returned by the session manager.
```

After, lines 132-168:

```markdown
132 Surface to user. Then delegate directly to oto-debugger (skip Steps 2 and 3 — pass `symptoms_prefilled: true` and set the slug from SLUG variable). The existing file IS the context.
140 [debug] Delegating loop to oto-debugger...
143 Spawn debugger:
162   subagent_type="oto-debugger",
168 Display the compact summary returned by oto-debugger.
```

**Edit 3: new debug session delegation and Task call**

Before, lines 220-247:

```markdown
220 ## 4. Session Management (delegated to oto-debug-session-manager)
222 After initial context setup, spawn the session manager to handle the full checkpoint/continuation loop. The session manager handles specialist_hint dispatch internally: when oto-debugger returns ROOT CAUSE FOUND it extracts the specialist_hint field and invokes the matching skill (e.g. typescript-expert, swift-concurrency) before offering fix options.
241   subagent_type="oto-debug-session-manager",
247 Display the compact summary returned by the session manager.
```

After, lines 204-246:

```markdown
204 Create the debug session file before delegating to oto-debugger.
210 [debug] Delegating loop to oto-debugger...
219 ## 4. Session Management (delegated to oto-debugger)
221 After initial context setup, spawn oto-debugger to handle the full checkpoint/continuation loop. The debugger handles specialist_hint dispatch internally: when root cause is found it extracts the specialist_hint field and invokes the matching skill (e.g. typescript-expert, swift-concurrency) before offering fix options.
240   subagent_type="oto-debugger",
246 Display the compact summary returned by oto-debugger.
```

**Edit 4: debug success criteria**

Before, lines 257-262:

```markdown
257 - [ ] Current Focus (hypothesis + next_action) surfaced before session manager spawn
260 - [ ] oto-debug-session-manager spawned with security-hardened session_params
261 - [ ] Session manager handles full checkpoint/continuation loop in isolated context
262 - [ ] Compact summary displayed to user after session manager returns
```

After, lines 256-261:

```markdown
256 - [ ] Current Focus (hypothesis + next_action) surfaced before oto-debugger spawn
259 - [ ] oto-debugger spawned with security-hardened session_params
260 - [ ] oto-debugger handles full checkpoint/continuation loop in isolated context
261 - [ ] Compact summary displayed to user after oto-debugger returns
```

### `oto/workflows/plan-phase.md`

**Edit 5: available agent list**

Before, lines 15-20:

```markdown
15 <available_agent_types>
16 Valid OTO subagent types (use exact names — do not fall back to 'general-purpose'):
17 - oto-phase-researcher — Researches technical approaches for a phase
18 - oto-pattern-mapper — Analyzes codebase for existing patterns, produces PATTERNS.md
19 - oto-planner — Creates detailed plans from phase scope
20 - oto-plan-checker — Reviews plan quality before execution
```

After, lines 15-20:

```markdown
15 <available_agent_types>
16 Valid OTO subagent types (use exact names — do not fall back to 'general-purpose'):
17 - oto-phase-researcher — Researches technical approaches for a phase
18 - oto-planner — Creates detailed plans from phase scope
19 - oto-plan-checker — Reviews plan quality before execution
20 </available_agent_types>
```

**Edit 6: optional §7.8 pattern-mapping block**

Before, lines 638-699:

```markdown
638 Proceed to Step 7.8 (or Step 8 if pattern mapper is disabled) only if user selects 2 or 3.
640 ## 7.8. Spawn oto-pattern-mapper Agent (Optional)
642 **Skip if** `workflow.pattern_mapper` is explicitly set to `false` in config.json (absent key = enabled). Also skip if no CONTEXT.md and no RESEARCH.md exist for this phase (nothing to extract file lists from).
681 Spawn with:
683 Task(
684   prompt="{above}",
685   subagent_type="oto-pattern-mapper",
686   model="{researcher_model}",
687 )
696 After pattern mapper completes, update the path variable:
698 PATTERNS_PATH="${PHASE_DIR}/${PADDED_PHASE}-PATTERNS.md"
```

After, lines 637-643:

```markdown
637 Proceed to Step 8 only if user selects 2 or 3.
639 ## 7.8. Codebase Pattern Mapping (Deferred — see ADR-07)
641 <!-- DEFERRED: The optional codebase pattern mapping agent was dropped per ADR-07 (decisions/agent-audit.md). This step is deferred until a v2 replacement agent is designed. To approximate it manually, run `/oto-map-codebase` through oto-codebase-mapper and feed the output into the planning context. See Phase 4 research, Category A item 1. -->
643 Skip to step 8.
```

## Verification

| Check | Result |
|-------|--------|
| `grep -c "debug-session-manager" oto/commands/oto/debug.md` | `0` |
| `grep -c "pattern-mapper" oto/workflows/plan-phase.md` | `0` |
| `grep -c "DEFERRED" oto/workflows/plan-phase.md` | `1` |
| `grep -E "subagent_type\\s*[:=]\\s*[\"']oto-debugger" oto/commands/oto/debug.md` | 2 matches |
| `node --test tests/phase-04-no-dropped-agents.test.cjs` | Passes: 1 TODO scaffold, 0 failures |
| `npm test` | Passes: 229 tests, 220 pass, 9 TODO, 0 failures |

## Decisions Made

- Used the retained `oto-debugger` directly for both continuation and new-session Task calls.
- Deferred the optional codebase pattern mapping step rather than rewriting it to `oto-codebase-mapper`, because research flagged that as a role mismatch.
- Kept the deferred marker in shipped workflow prose but avoided adding a path-like `.planning/` reference to the shipped `oto/` payload.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Avoided a shipped `.planning/` payload leak**
- **Found during:** Task 2 (defer pattern-mapping step)
- **Issue:** The plan's sample deferred comment pointed to `.planning/phases/...`, but Phase 4 D-13 forbids path-like `.planning/` leaks in shipped `oto/` payload.
- **Fix:** Kept the ADR-07 `DEFERRED` marker and Phase 4 research pointer, but used prose ("Phase 4 research, Category A item 1") instead of a path-like `.planning/` reference.
- **Files modified:** `oto/workflows/plan-phase.md`
- **Verification:** The inserted deferred block contains `DEFERRED` and `ADR-07`; it does not introduce a new `.planning/` path in the edited block.
- **Committed in:** `0838468`

**2. [Rule 1 - Bug] Finished direct-delegation prose after initial Task 1 commit**
- **Found during:** Summary evidence collection
- **Issue:** Three generic "session manager" prose references remained after all dropped-name references were removed.
- **Fix:** Rewrote those phrases to `oto-debugger` so prose and executable Task calls agree.
- **Files modified:** `oto/commands/oto/debug.md`
- **Verification:** `rg -n "session manager" oto/commands/oto/debug.md` returns no matches; `grep -c "debug-session-manager"` returns `0`.
- **Committed in:** `13cbf5c`

---

**Total deviations:** 2 auto-fixed (1 Rule 1, 1 Rule 2)  
**Impact on plan:** Both adjustments were needed to preserve Phase 4 correctness. No scope expansion beyond the two planned markdown files.

## Issues Encountered

- Git staging initially failed inside the sandbox with `.git/index.lock: Operation not permitted`; reran staging/commits with approved git escalation. No repository content was affected.

## Known Stubs

None that block this plan. The `DEFERRED` marker in `oto/workflows/plan-phase.md` is the intended plan outcome for the dropped optional agent role.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

04-03 is ready for downstream Wave 2/3 work. The two direct blockers in this plan are removed:

- `/oto-debug` no longer references `debug-session-manager`.
- `/oto-plan-phase` no longer references `pattern-mapper` and visibly marks the removed optional role as deferred.

## Self-Check: PASSED

- Found `.planning/phases/04-core-workflows-agents-port/04-03-SUMMARY.md`.
- Found `oto/commands/oto/debug.md` and `oto/workflows/plan-phase.md`.
- Found task commits `f958b40`, `0838468`, and `13cbf5c` in git history.
- Re-ran plan-level greps and no-dropped-agents scaffold after the final cleanup; all passed.

---
*Phase: 04-core-workflows-agents-port*
*Completed: 2026-04-29*
