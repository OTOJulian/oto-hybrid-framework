# /oto-* Command Index

_Auto-generated from `oto/commands/oto/*.md` frontmatter. Re-run `node scripts/gen-commands-index.cjs` after adding or renaming commands._

| Command | Description |
|---------|-------------|
| `/oto-add-backlog` | Add an idea to the backlog parking lot (999.x numbering) |
| `/oto-add-phase` | Add phase to end of current milestone in roadmap |
| `/oto-add-tests` | Generate tests for a completed phase based on UAT criteria and implementation |
| `/oto-add-todo` | Capture idea or task as todo from current conversation context |
| `/oto-ai-integration-phase` | Generate a bounded AI-SPEC.md skeleton for AI phases with live domain research and explicit deferred framework/eval TODOs |
| `/oto-analyze-dependencies` | Analyze phase dependencies and suggest Depends on entries for ROADMAP.md |
| `/oto-audit-fix` | Autonomous audit-to-fix pipeline — find issues, classify, fix, test, commit |
| `/oto-audit-milestone` | Audit milestone completion against original intent before archiving |
| `/oto-audit-uat` | Cross-phase audit of all outstanding UAT and verification items |
| `/oto-autonomous` | Run all remaining phases autonomously — discuss→plan→execute per phase |
| `/oto-check-todos` | List pending todos and select one to work on |
| `/oto-cleanup` | Archive accumulated phase directories from completed milestones |
| `/oto-code-review` | Review source files changed during a phase for bugs, security issues, and code quality problems |
| `/oto-code-review-fix` | Auto-fix issues found by code review in REVIEW.md. Spawns fixer agent, commits each fix atomically, produces REVIEW-FIX.md summary. |
| `/oto-complete-milestone` | Archive completed milestone and prepare for next version |
| `/oto-debug` | Systematic debugging with persistent state across context resets |
| `/oto-discuss-phase` | Gather phase context through adaptive questioning before planning. Use --all to skip area selection and discuss all gray areas interactively. Use --auto to skip interactive questions (Claude picks recommended defaults). Use --chain for interactive discuss followed by automatic plan+execute. Use --power for bulk question generation into a file-based UI (answer at your own pace). |
| `/oto-do` | Route freeform text to the right OTO command automatically |
| `/oto-docs-update` | Generate or update project documentation verified against the codebase |
| `/oto-edit-phase` | Edit any field of an existing roadmap phase in place, preserving number and position |
| `/oto-eval-review` | Retroactively audit an executed AI phase's evaluation coverage — scores each eval dimension as COVERED/PARTIAL/MISSING and produces an actionable EVAL-REVIEW.md with remediation plan |
| `/oto-execute-phase` | Execute all plans in a phase with wave-based parallelization |
| `/oto-explore` | Socratic ideation and idea routing — think through ideas before committing to plans |
| `/oto-fast` | Execute a trivial task inline — no subagents, no planning overhead |
| `/oto-forensics` | Post-mortem investigation for failed OTO workflows — analyzes git history, artifacts, and state to diagnose what went wrong |
| `/oto-health` | Diagnose planning directory health and optionally repair issues |
| `/oto-help` | Show available OTO commands and usage guide |
| `/oto-import` | Ingest external plans with conflict detection against project decisions before writing anything. |
| `/oto-ingest-docs` | Scan a repo for mixed ADRs, PRDs, SPECs, and DOCs and bootstrap or merge the full .oto/ setup from them. Classifies each doc in parallel, synthesizes a consolidated context with a conflicts report, and routes to new-project or merge-milestone depending on whether .oto/ already exists. |
| `/oto-insert-phase` | Insert urgent work as decimal phase (e.g., 72.1) between existing phases |
| `/oto-list-phase-assumptions` | Surface Claude's assumptions about a phase approach before planning |
| `/oto-list-workspaces` | List active OTO workspaces and their status |
| `/oto-manager` | Interactive command center for managing multiple phases from one terminal |
| `/oto-map-codebase` | Analyze codebase with parallel mapper agents to produce .oto/codebase/ documents |
| `/oto-milestone-summary` | Generate a comprehensive project summary from milestone artifacts for team onboarding and review |
| `/oto-new-milestone` | Start a new milestone cycle — update PROJECT.md and route to requirements |
| `/oto-new-project` | Initialize a new project with deep context gathering and PROJECT.md |
| `/oto-new-workspace` | Create an isolated workspace with repo copies and independent .oto/ |
| `/oto-next` | Automatically advance to the next logical step in the OTO workflow |
| `/oto-note` | Zero-friction idea capture. Append, list, or promote notes to todos. |
| `/oto-pause-work` | Create context handoff when pausing work mid-phase |
| `/oto-plan-milestone-gaps` | Create phases to close all gaps identified by milestone audit |
| `/oto-plan-phase` | Create detailed phase plan (PLAN.md) with verification loop |
| `/oto-plan-review-convergence` | Cross-AI plan convergence loop — replan with review feedback until no HIGH concerns remain (max 3 cycles) |
| `/oto-plant-seed` | Capture a forward-looking idea with trigger conditions — surfaces automatically at the right milestone |
| `/oto-pr-branch` | Create a clean PR branch by filtering out .oto/ commits — ready for code review |
| `/oto-progress` | Check project progress, show context, and route to next action (execute or plan). Use --forensic to append a 6-check integrity audit after the standard report. |
| `/oto-quick` | Execute a quick task with OTO guarantees (atomic commits, state tracking) but skip optional agents |
| `/oto-remove-phase` | Remove a future phase from roadmap and renumber subsequent phases |
| `/oto-remove-workspace` | Remove a OTO workspace and clean up worktrees |
| `/oto-research-phase` | Research how to implement a phase (standalone - usually use /oto-plan-phase instead) |
| `/oto-resume-work` | Resume work from previous session with full context restoration |
| `/oto-review` | Request cross-AI peer review of phase plans from external AI CLIs |
| `/oto-review-backlog` | Review and promote backlog items to active milestone |
| `/oto-scan` | Rapid codebase assessment — lightweight alternative to /oto-map-codebase |
| `/oto-secure-phase` | Retroactively verify threat mitigations for a completed phase |
| `/oto-session-report` | Generate a session report with token usage estimates, work summary, and outcomes |
| `/oto-set-profile` | Switch model profile for OTO agents (quality/balanced/budget/inherit) |
| `/oto-settings` | Configure OTO workflow toggles and model profile |
| `/oto-settings-advanced` | Power-user configuration — plan bounce, timeouts, branch templates, cross-AI execution, runtime knobs |
| `/oto-settings-integrations` | Configure third-party API keys, code-review CLI routing, and agent-skill injection |
| `/oto-ship` | Create PR, run review, and prepare for merge after verification passes |
| `/oto-sketch` | Sketch UI/design ideas with throwaway HTML mockups, or propose what to sketch next (frontier mode) |
| `/oto-sketch-wrap-up` | Package sketch design findings into a persistent project skill for future build conversations |
| `/oto-spec-phase` | Socratic spec refinement — clarify WHAT a phase delivers with ambiguity scoring before discuss-phase. Produces a SPEC.md with falsifiable requirements locked before implementation decisions begin. |
| `/oto-spike` | Spike an idea through experiential exploration, or propose what to spike next (frontier mode) |
| `/oto-spike-wrap-up` | Package spike findings into a persistent project skill for future build conversations |
| `/oto-stats` | Display project statistics — phases, plans, requirements, git metrics, and timeline |
| `/oto-sync-skills` | Sync managed OTO skills across runtime roots so multi-runtime users stay aligned after an update |
| `/oto-ui-phase` | Generate UI design contract (UI-SPEC.md) for frontend phases |
| `/oto-ui-review` | Retroactive 6-pillar visual audit of implemented frontend code |
| `/oto-undo` | Safe git revert. Roll back phase or plan commits using the phase manifest with dependency checks. |
| `/oto-update` | Update OTO to latest version with changelog display |
| `/oto-validate-phase` | Retroactively audit and fill Nyquist validation gaps for a completed phase |
| `/oto-verify-work` | Validate built features through conversational UAT |
| `/oto-workstreams` | Manage parallel workstreams — list, create, switch, status, progress, complete, and resume |
