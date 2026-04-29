<purpose>
Display the complete OTO command reference. Output ONLY the reference content. Do NOT add project-specific analysis, git status, next-step suggestions, or any commentary beyond the reference.
</purpose>

<reference>
# OTO Command Reference

**OTO** (oto) creates hierarchical project plans optimized for solo agentic development with Claude Code.

## Quick Start

1. `/oto-new-project` - Initialize project (includes research, requirements, roadmap)
2. `/oto-plan-phase 1` - Create detailed plan for first phase
3. `/oto-execute-phase 1` - Execute the phase

## Staying Updated

OTO evolves fast. Update periodically:

```bash
npx oto-cc@latest
```

## Core Workflow

```
/oto-new-project → /oto-plan-phase → /oto-execute-phase → repeat
```

### Project Initialization

**`/oto-new-project`**
Initialize new project through unified flow.

One command takes you from idea to ready-for-planning:
- Deep questioning to understand what you're building
- Optional domain research (spawns 4 parallel researcher agents)
- Requirements definition with v1/v2/out-of-scope scoping
- Roadmap creation with phase breakdown and success criteria

Creates all `.oto/` artifacts:
- `PROJECT.md` — vision and requirements
- `config.json` — workflow mode (interactive/yolo)
- `research/` — domain research (if selected)
- `REQUIREMENTS.md` — scoped requirements with REQ-IDs
- `ROADMAP.md` — phases mapped to requirements
- `STATE.md` — project memory

Usage: `/oto-new-project`

**`/oto-map-codebase`**
Map an existing codebase for brownfield projects.

- Analyzes codebase with parallel Explore agents
- Creates `.oto/codebase/` with 7 focused documents
- Covers stack, architecture, structure, conventions, testing, integrations, concerns
- Use before `/oto-new-project` on existing codebases

Usage: `/oto-map-codebase`

### Phase Planning

**`/oto-discuss-phase <number>`**
Help articulate your vision for a phase before planning.

- Captures how you imagine this phase working
- Creates CONTEXT.md with your vision, essentials, and boundaries
- Use when you have ideas about how something should look/feel
- Optional `--batch` asks 2-5 related questions at a time instead of one-by-one

Usage: `/oto-discuss-phase 2`
Usage: `/oto-discuss-phase 2 --batch`
Usage: `/oto-discuss-phase 2 --batch=3`

**`/oto-research-phase <number>`**
Comprehensive ecosystem research for niche/complex domains.

- Discovers standard stack, architecture patterns, pitfalls
- Creates RESEARCH.md with "how experts build this" knowledge
- Use for 3D, games, audio, shaders, ML, and other specialized domains
- Goes beyond "which library" to ecosystem knowledge

Usage: `/oto-research-phase 3`

**`/oto-list-phase-assumptions <number>`**
See what Claude is planning to do before it starts.

- Shows Claude's intended approach for a phase
- Lets you course-correct if Claude misunderstood your vision
- No files created - conversational output only

Usage: `/oto-list-phase-assumptions 3`

**`/oto-plan-phase <number>`**
Create detailed execution plan for a specific phase.

- Generates `.oto/phases/XX-phase-name/XX-YY-PLAN.md`
- Breaks phase into concrete, actionable tasks
- Includes verification criteria and success measures
- Multiple plans per phase supported (XX-01, XX-02, etc.)

Usage: `/oto-plan-phase 1`
Result: Creates `.oto/phases/01-foundation/01-01-PLAN.md`

**PRD Express Path:** Pass `--prd path/to/requirements.md` to skip discuss-phase entirely. Your PRD becomes locked decisions in CONTEXT.md. Useful when you already have clear acceptance criteria.

### Execution

**`/oto-execute-phase <phase-number>`**
Execute all plans in a phase, or run a specific wave.

- Groups plans by wave (from frontmatter), executes waves sequentially
- Plans within each wave run in parallel via Task tool
- Optional `--wave N` flag executes only Wave `N` and stops unless the phase is now fully complete
- Verifies phase goal after all plans complete
- Updates REQUIREMENTS.md, ROADMAP.md, STATE.md

Usage: `/oto-execute-phase 5`
Usage: `/oto-execute-phase 5 --wave 2`

### Smart Router

**`/oto-do <description>`**
Route freeform text to the right OTO command automatically.

- Analyzes natural language input to find the best matching OTO command
- Acts as a dispatcher — never does the work itself
- Resolves ambiguity by asking you to pick between top matches
- Use when you know what you want but don't know which `/oto-*` command to run

Usage: `/oto-do fix the login button`
Usage: `/oto-do refactor the auth system`
Usage: `/oto-do I want to start a new milestone`

### Quick Mode

**`/oto-quick [--full] [--validate] [--discuss] [--research]`**
Execute small, ad-hoc tasks with OTO guarantees but skip optional agents.

Quick mode uses the same system with a shorter path:
- Spawns planner + executor (skips researcher, checker, verifier by default)
- Quick tasks live in `.oto/quick/` separate from planned phases
- Updates STATE.md tracking (not ROADMAP.md)

Flags enable additional quality steps:
- `--full` — Complete quality pipeline: discussion + research + plan-checking + verification
- `--validate` — Plan-checking (max 2 iterations) and post-execution verification only
- `--discuss` — Lightweight discussion to surface gray areas before planning
- `--research` — Focused research agent investigates approaches before planning

Granular flags are composable: `--discuss --research --validate` gives the same as `--full`.

Usage: `/oto-quick`
Usage: `/oto-quick --full`
Usage: `/oto-quick --research --validate`
Result: Creates `.oto/quick/NNN-slug/PLAN.md`, `.oto/quick/NNN-slug/SUMMARY.md`

---

**`/oto-fast [description]`**
Execute a trivial task inline — no subagents, no planning files, no overhead.

For tasks too small to justify planning: typo fixes, config changes, forgotten commits, simple additions. Runs in the current context, makes the change, commits, and logs to STATE.md.

- No PLAN.md or SUMMARY.md created
- No subagent spawned (runs inline)
- ≤ 3 file edits — redirects to `/oto-quick` if task is non-trivial
- Atomic commit with conventional message

Usage: `/oto-fast "fix the typo in README"`
Usage: `/oto-fast "add .env to gitignore"`

### Roadmap Management

**`/oto-add-phase <description>`**
Add new phase to end of current milestone.

- Appends to ROADMAP.md
- Uses next sequential number
- Updates phase directory structure

Usage: `/oto-add-phase "Add admin dashboard"`

**`/oto-insert-phase <after> <description>`**
Insert urgent work as decimal phase between existing phases.

- Creates intermediate phase (e.g., 7.1 between 7 and 8)
- Useful for discovered work that must happen mid-milestone
- Maintains phase ordering

Usage: `/oto-insert-phase 7 "Fix critical auth bug"`
Result: Creates Phase 7.1

**`/oto-remove-phase <number>`**
Remove a future phase and renumber subsequent phases.

- Deletes phase directory and all references
- Renumbers all subsequent phases to close the gap
- Only works on future (unstarted) phases
- Git commit preserves historical record

Usage: `/oto-remove-phase 17`
Result: Phase 17 deleted, phases 18-20 become 17-19

### Milestone Management

**`/oto-new-milestone <name>`**
Start a new milestone through unified flow.

- Deep questioning to understand what you're building next
- Optional domain research (spawns 4 parallel researcher agents)
- Requirements definition with scoping
- Roadmap creation with phase breakdown
- Optional `--reset-phase-numbers` flag restarts numbering at Phase 1 and archives old phase dirs first for safety

Mirrors `/oto-new-project` flow for brownfield projects (existing PROJECT.md).

Usage: `/oto-new-milestone "v2.0 Features"`
Usage: `/oto-new-milestone --reset-phase-numbers "v2.0 Features"`

**`/oto-complete-milestone <version>`**
Archive completed milestone and prepare for next version.

- Creates MILESTONES.md entry with stats
- Archives full details to milestones/ directory
- Creates git tag for the release
- Prepares workspace for next version

Usage: `/oto-complete-milestone 1.0.0`

### Progress Tracking

**`/oto-progress`**
Check project status and intelligently route to next action.

- Shows visual progress bar and completion percentage
- Summarizes recent work from SUMMARY files
- Displays current position and what's next
- Lists key decisions and open issues
- Offers to execute next plan or create it if missing
- Detects 100% milestone completion

Usage: `/oto-progress`

### Session Management

**`/oto-resume-work`**
Resume work from previous session with full context restoration.

- Reads STATE.md for project context
- Shows current position and recent progress
- Offers next actions based on project state

Usage: `/oto-resume-work`

**`/oto-pause-work`**
Create context handoff when pausing work mid-phase.

- Creates .continue-here file with current state
- Updates STATE.md session continuity section
- Captures in-progress work context

Usage: `/oto-pause-work`

### Debugging

**`/oto-debug [issue description]`**
Systematic debugging with persistent state across context resets.

- Gathers symptoms through adaptive questioning
- Creates `.oto/debug/[slug].md` to track investigation
- Investigates using scientific method (evidence → hypothesis → test)
- Survives `/clear` — run `/oto-debug` with no args to resume
- Archives resolved issues to `.oto/debug/resolved/`

Usage: `/oto-debug "login button doesn't work"`
Usage: `/oto-debug` (resume active session)

### Spiking & Sketching

**`/oto-spike [idea] [--quick]`**
Rapidly spike an idea with throwaway experiments to validate feasibility.

- Decomposes idea into 2-5 focused experiments (risk-ordered)
- Each spike answers one specific Given/When/Then question
- Builds minimum code, runs it, captures verdict (VALIDATED/INVALIDATED/PARTIAL)
- Saves to `.oto/spikes/` with MANIFEST.md tracking
- Does not require `/oto-new-project` — works in any repo
- `--quick` skips decomposition, builds immediately

Usage: `/oto-spike "can we stream LLM output over WebSockets?"`
Usage: `/oto-spike --quick "test if pdfjs extracts tables"`

**`/oto-sketch [idea] [--quick]`**
Rapidly sketch UI/design ideas using throwaway HTML mockups with multi-variant exploration.

- Conversational mood/direction intake before building
- Each sketch produces 2-3 variants as tabbed HTML pages
- User compares variants, cherry-picks elements, iterates
- Shared CSS theme system compounds across sketches
- Saves to `.oto/sketches/` with MANIFEST.md tracking
- Does not require `/oto-new-project` — works in any repo
- `--quick` skips mood intake, jumps to building

Usage: `/oto-sketch "dashboard layout for the admin panel"`
Usage: `/oto-sketch --quick "form card grouping"`

**`/oto-spike-wrap-up`**
Package spike findings into a persistent project skill.

- Curates each spike one-at-a-time (include/exclude/partial/UAT)
- Groups findings by feature area
- Generates `./.claude/skills/spike-findings-[project]/` with references and sources
- Writes summary to `.oto/spikes/WRAP-UP-SUMMARY.md`
- Adds auto-load routing line to project CLAUDE.md

Usage: `/oto-spike-wrap-up`

**`/oto-sketch-wrap-up`**
Package sketch design findings into a persistent project skill.

- Curates each sketch one-at-a-time (include/exclude/partial/revisit)
- Groups findings by design area
- Generates `./.claude/skills/sketch-findings-[project]/` with design decisions, CSS patterns, HTML structures
- Writes summary to `.oto/sketches/WRAP-UP-SUMMARY.md`
- Adds auto-load routing line to project CLAUDE.md

Usage: `/oto-sketch-wrap-up`

### Quick Notes

**`/oto-note <text>`**
Zero-friction idea capture — one command, instant save, no questions.

- Saves timestamped note to `.oto/notes/` (or `~/.claude/notes/` globally)
- Three subcommands: append (default), list, promote
- Promote converts a note into a structured todo
- Works without a project (falls back to global scope)

Usage: `/oto-note refactor the hook system`
Usage: `/oto-note list`
Usage: `/oto-note promote 3`
Usage: `/oto-note --global cross-project idea`

### Todo Management

**`/oto-add-todo [description]`**
Capture idea or task as todo from current conversation.

- Extracts context from conversation (or uses provided description)
- Creates structured todo file in `.oto/todos/pending/`
- Infers area from file paths for grouping
- Checks for duplicates before creating
- Updates STATE.md todo count

Usage: `/oto-add-todo` (infers from conversation)
Usage: `/oto-add-todo Add auth token refresh`

**`/oto-check-todos [area]`**
List pending todos and select one to work on.

- Lists all pending todos with title, area, age
- Optional area filter (e.g., `/oto-check-todos api`)
- Loads full context for selected todo
- Routes to appropriate action (work now, add to phase, brainstorm)
- Moves todo to done/ when work begins

Usage: `/oto-check-todos`
Usage: `/oto-check-todos api`

### User Acceptance Testing

**`/oto-verify-work [phase]`**
Validate built features through conversational UAT.

- Extracts testable deliverables from SUMMARY.md files
- Presents tests one at a time (yes/no responses)
- Automatically diagnoses failures and creates fix plans
- Ready for re-execution if issues found

Usage: `/oto-verify-work 3`

### Ship Work

**`/oto-ship [phase]`**
Create a PR from completed phase work with an auto-generated body.

- Pushes branch to remote
- Creates PR with summary from SUMMARY.md, VERIFICATION.md, REQUIREMENTS.md
- Optionally requests code review
- Updates STATE.md with shipping status

Prerequisites: Phase verified, `gh` CLI installed and authenticated.

Usage: `/oto-ship 4` or `/oto-ship 4 --draft`

---

**`/oto-review --phase N [--gemini] [--claude] [--codex] [--coderabbit] [--opencode] [--qwen] [--cursor] [--all]`**
Cross-AI peer review — invoke external AI CLIs to independently review phase plans.

- Detects available CLIs (gemini, claude, codex, coderabbit)
- Each CLI reviews plans independently with the same structured prompt
- CodeRabbit reviews the current git diff (not a prompt) — may take up to 5 minutes
- Produces REVIEWS.md with per-reviewer feedback and consensus summary
- Feed reviews back into planning: `/oto-plan-phase N --reviews`

Usage: `/oto-review --phase 3 --all`

---

**`/oto-pr-branch [target]`**
Create a clean branch for pull requests by filtering out .oto/ commits.

- Classifies commits: code-only (include), planning-only (exclude), mixed (include sans .oto/)
- Cherry-picks code commits onto a clean branch
- Reviewers see only code changes, no OTO artifacts

Usage: `/oto-pr-branch` or `/oto-pr-branch main`

---

**`/oto-plant-seed [idea]`**
Capture a forward-looking idea with trigger conditions for automatic surfacing.

- Seeds preserve WHY, WHEN to surface, and breadcrumbs to related code
- Auto-surfaces during `/oto-new-milestone` when trigger conditions match
- Better than deferred items — triggers are checked, not forgotten

Usage: `/oto-plant-seed "add real-time notifications when we build the events system"`

---

**`/oto-audit-uat`**
Cross-phase audit of all outstanding UAT and verification items.
- Scans every phase for pending, skipped, blocked, and human_needed items
- Cross-references against codebase to detect stale documentation
- Produces prioritized human test plan grouped by testability
- Use before starting a new milestone to clear verification debt

Usage: `/oto-audit-uat`

### Milestone Auditing

**`/oto-audit-milestone [version]`**
Audit milestone completion against original intent.

- Reads all phase VERIFICATION.md files
- Checks requirements coverage
- Spawns integration checker for cross-phase wiring
- Creates MILESTONE-AUDIT.md with gaps and tech debt

Usage: `/oto-audit-milestone`

**`/oto-plan-milestone-gaps`**
Create phases to close gaps identified by audit.

- Reads MILESTONE-AUDIT.md and groups gaps into phases
- Prioritizes by requirement priority (must/should/nice)
- Adds gap closure phases to ROADMAP.md
- Ready for `/oto-plan-phase` on new phases

Usage: `/oto-plan-milestone-gaps`

### Configuration

**`/oto-settings`**
Configure workflow toggles and model profile interactively.

- Toggle researcher, plan checker, verifier agents
- Select model profile (quality/balanced/budget/inherit)
- Updates `.oto/config.json`

Usage: `/oto-settings`

**`/oto-set-profile <profile>`**
Quick switch model profile for OTO agents.

- `quality` — Opus everywhere except verification
- `balanced` — Opus for planning, Sonnet for execution (default)
- `budget` — Sonnet for writing, Haiku for research/verification
- `inherit` — Use current session model for all agents (OpenCode `/model`)

Usage: `/oto-set-profile budget`

### Utility Commands

**`/oto-cleanup`**
Archive accumulated phase directories from completed milestones.

- Identifies phases from completed milestones still in `.oto/phases/`
- Shows dry-run summary before moving anything
- Moves phase dirs to `.oto/milestones/v{X.Y}-phases/`
- Use after multiple milestones to reduce `.oto/phases/` clutter

Usage: `/oto-cleanup`

**`/oto-help`**
Show this command reference.

**`/oto-update`**
Update OTO to latest version with changelog preview.

- Shows installed vs latest version comparison
- Displays changelog entries for versions you've missed
- Highlights breaking changes
- Confirms before running install
- Better than raw `npx oto-cc`

Usage: `/oto-update`

**`/oto-join-discord`**
Join the OTO Discord community.

- Get help, share what you're building, stay updated
- Connect with other OTO users

Usage: `/oto-join-discord`

## Files & Structure

```
.oto/
├── PROJECT.md            # Project vision
├── ROADMAP.md            # Current phase breakdown
├── STATE.md              # Project memory & context
├── RETROSPECTIVE.md      # Living retrospective (updated per milestone)
├── config.json           # Workflow mode & gates
├── todos/                # Captured ideas and tasks
│   ├── pending/          # Todos waiting to be worked on
│   └── done/             # Completed todos
├── spikes/               # Spike experiments (/oto-spike)
│   ├── MANIFEST.md       # Spike inventory and verdicts
│   └── NNN-name/         # Individual spike directories
├── sketches/             # Design sketches (/oto-sketch)
│   ├── MANIFEST.md       # Sketch inventory and winners
│   ├── themes/           # Shared CSS theme files
│   └── NNN-name/         # Individual sketch directories (HTML + README)
├── debug/                # Active debug sessions
│   └── resolved/         # Archived resolved issues
├── milestones/
│   ├── v1.0-ROADMAP.md       # Archived roadmap snapshot
│   ├── v1.0-REQUIREMENTS.md  # Archived requirements
│   └── v1.0-phases/          # Archived phase dirs (via /oto-cleanup or --archive-phases)
│       ├── 01-foundation/
│       └── 02-core-features/
├── codebase/             # Codebase map (brownfield projects)
│   ├── STACK.md          # Languages, frameworks, dependencies
│   ├── ARCHITECTURE.md   # Patterns, layers, data flow
│   ├── STRUCTURE.md      # Directory layout, key files
│   ├── CONVENTIONS.md    # Coding standards, naming
│   ├── TESTING.md        # Test setup, patterns
│   ├── INTEGRATIONS.md   # External services, APIs
│   └── CONCERNS.md       # Tech debt, known issues
└── phases/
    ├── 01-foundation/
    │   ├── 01-01-PLAN.md
    │   └── 01-01-SUMMARY.md
    └── 02-core-features/
        ├── 02-01-PLAN.md
        └── 02-01-SUMMARY.md
```

## Workflow Modes

Set during `/oto-new-project`:

**Interactive Mode**

- Confirms each major decision
- Pauses at checkpoints for approval
- More guidance throughout

**YOLO Mode**

- Auto-approves most decisions
- Executes plans without confirmation
- Only stops for critical checkpoints

Change anytime by editing `.oto/config.json`

## Planning Configuration

Configure how planning artifacts are managed in `.oto/config.json`:

**`planning.commit_docs`** (default: `true`)
- `true`: Planning artifacts committed to git (standard workflow)
- `false`: Planning artifacts kept local-only, not committed

When `commit_docs: false`:
- Add `.oto/` to your `.gitignore`
- Useful for OSS contributions, client projects, or keeping planning private
- All planning files still work normally, just not tracked in git

**`planning.search_gitignored`** (default: `false`)
- `true`: Add `--no-ignore` to broad ripgrep searches
- Only needed when `.oto/` is gitignored and you want project-wide searches to include it

Example config:
```json
{
  "planning": {
    "commit_docs": false,
    "search_gitignored": true
  }
}
```

## Common Workflows

**Starting a new project:**

```
/oto-new-project        # Unified flow: questioning → research → requirements → roadmap
/clear
/oto-plan-phase 1       # Create plans for first phase
/clear
/oto-execute-phase 1    # Execute all plans in phase
```

**Resuming work after a break:**

```
/oto-progress  # See where you left off and continue
```

**Adding urgent mid-milestone work:**

```
/oto-insert-phase 5 "Critical security fix"
/oto-plan-phase 5.1
/oto-execute-phase 5.1
```

**Completing a milestone:**

```
/oto-complete-milestone 1.0.0
/clear
/oto-new-milestone  # Start next milestone (questioning → research → requirements → roadmap)
```

**Capturing ideas during work:**

```
/oto-add-todo                    # Capture from conversation context
/oto-add-todo Fix modal z-index  # Capture with explicit description
/oto-check-todos                 # Review and work on todos
/oto-check-todos api             # Filter by area
```

**Debugging an issue:**

```
/oto-debug "form submission fails silently"  # Start debug session
# ... investigation happens, context fills up ...
/clear
/oto-debug                                    # Resume from where you left off
```

## Getting Help

- Read `.oto/PROJECT.md` for project vision
- Read `.oto/STATE.md` for current context
- Check `.oto/ROADMAP.md` for phase status
- Run `/oto-progress` to check where you're up to
</reference>
