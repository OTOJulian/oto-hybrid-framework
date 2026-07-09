---
phase: 260709-fav
plan: 01
type: execute
wave: 1
depends_on: []
files_modified: [README.md]
autonomous: true
requirements: [QUICK-260709-fav]
must_haves:
  truths:
    - "README.md contains no occurrence of GSD, Get Shit Done, Superpowers, gsd-build, or obra/superpowers"
    - "README.md contains no links to gsd-build/get-shit-done or obra/superpowers repos"
    - "The tagline, 'What is oto?' narrative, and comparison content describe oto as its own framework (spec-driven planning workflow + composable skill library), not as a fusion of two named upstreams"
    - "CI badge lines, Install section, and Supported runtimes table are byte-identical to the pre-rewrite README.md"
    - "LICENSE, THIRD-PARTY-LICENSES.md, NOTICE, and CLAUDE.md are untouched"
  artifacts:
    - path: "README.md"
      provides: "Rewritten project README with no upstream-naming, preserved badges/install/runtimes table"
  key_links:
    - from: "README.md"
      to: "THIRD-PARTY-LICENSES.md"
      via: "Attribution section link (unchanged target, generalized wording)"
      pattern: "THIRD-PARTY-LICENSES\\.md"
---

<objective>
Rewrite README.md to remove every mention of GSD (Get Shit Done) and
Superpowers, describing oto's planning workflow and skill library as oto's
own generic framework capabilities — while preserving the title/tagline
structure, both CI badge lines, the Install section, and the Supported
runtimes table exactly as they are today.

Purpose: The README currently frames oto as a rebrand/fusion of two named
upstream projects (GSD + Superpowers), including direct links and a
"From GSD / From Superpowers" comparison table. This quick task removes all
upstream naming from README.md so oto reads as a self-contained framework,
without touching the separate attribution files (LICENSE,
THIRD-PARTY-LICENSES.md) where real MIT attribution must continue to live.

Output: Updated README.md at the repo root.
</objective>

<execution_context>
@~/.claude/oto/workflows/execute-plan.md
@~/.claude/oto/templates/summary.md
</execution_context>

<context>
@.oto/STATE.md
@README.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Rewrite README.md with the finalized target content</name>
  <files>README.md</files>
  <action>
Replace the full contents of README.md with the exact text below. This text
was pre-verified: it contains zero occurrences of "GSD", "Get Shit Done",
"Superpowers", "gsd-build", or "obra", and the CI badge lines, Install
section, and Supported runtimes table are byte-identical to the current
README.md. Do not deviate from this text — write it verbatim using the Write
tool (read README.md first per tool requirements, then overwrite).

Key structural changes from the current README:
- Tagline (lines 1-4): reframed to describe oto generically as "a spec-driven
  planning workflow paired with a composable skill library" — no upstream
  names.
- "What is oto?" section: reframed as two native halves of oto ("Planning
  workflow" and "Skill library") instead of two named upstream projects.
- "How they combine" section: same outer-loop/inner-loop narrative, reworded
  to refer to "the planning workflow" and "the skill library" rather than
  "GSD" and "Superpowers".
- Comparison table: header changed from "Contribution | From GSD | From
  Superpowers" to "Capability | What it provides" — single column of
  capabilities, no upstream attribution columns.
- "Why oto instead of GSD or Superpowers on their own?" section: replaced
  with "### Why this design", keeping the "no framework-switching", "pieces
  actually compose", and "one install, three runtimes" bullets reworded
  without upstream names. The "stays current without merge pain" /
  upstream-sync bullet is dropped (it only made sense relative to named
  upstreams).
- Commands section: `/oto-quick` description changed from "run a small
  GSD-tracked task" to "run a small oto-tracked task". All other command
  bullets unchanged.
- Documentation section: `docs/upstream-sync.md` bullet reworded from
  "merge upstream GSD/Superpowers changes" to "merge upstream changes" (the
  linked doc file itself is out of scope and untouched).
- Attribution section: reworded from naming "Get Shit Done" and
  "Superpowers" with their repo links and copyright lines, to a generic
  statement that oto incorporates MIT-licensed open-source upstream work,
  pointing to THIRD-PARTY-LICENSES.md (unchanged file) for full attribution
  and license texts. This does NOT add or remove any attribution file — it
  only removes the named upstream mentions from README.md itself, per the
  task's explicit scope.
- License section: unchanged.

Target content (write exactly, byte for byte):

```markdown
# oto

A spec-driven planning workflow paired with a composable skill library, under
a single `/oto-*` command surface across Claude Code, Codex, and Gemini CLI.

![Tests](https://github.com/OTOJulian/oto-hybrid-framework/actions/workflows/test.yml/badge.svg)
![Install Smoke](https://github.com/OTOJulian/oto-hybrid-framework/actions/workflows/install-smoke.yml/badge.svg)

## What is oto?

oto is built around two complementary halves of the agentic-development
problem — the *what/when* and the *how*:

- **Planning workflow** — the **workflow spine**. Spec-driven phase planning,
  wave-based execution, verification loops, stateful project tracking
  (roadmap → phases → plans → verification → release), and release discipline.
  oto is opinionated about *the process of shipping a project*.
- **Skill library** — the **capability library**. Composable, reusable
  skills: test-driven development, systematic debugging,
  verification-before-completion, parallel agent dispatch, and
  git-worktree isolation. oto is opinionated about *how each unit of work is
  done well*.

Both halves ship together under one `/oto-*` command and `oto:<skill>`
namespace, installed together to whichever runtime you use (Claude Code,
Codex, Gemini).

### How they combine

The planning workflow provides the **outer loop** (plan the milestone,
sequence the phases, execute, verify, ship). The skill library provides the
**inner loop** (how a single phase is actually implemented). In oto they
interlock: an `/oto-execute-phase` run invokes skills as part of its
disciplined cycle — writing tests first (`test-driven-development`),
debugging methodically (`systematic-debugging`), fanning out independent
work to parallel agents, and refusing to mark work "done" until it's
verified (`verification-before-completion`). The planning spine decides
*what* to build and tracks state; the skills decide *how* each step is
executed to a high standard.

| Capability | What it provides |
|------------|-------------------|
| Project structure | roadmap, phases, plans, persistent STATE |
| Process discipline | execution waves, verification gates, release flow, verification-before-completion |
| Implementation quality | TDD, systematic debugging |
| Throughput | wave parallelization, parallel-agent dispatch, worktree isolation |
| Memory & continuity | stateful tracking across sessions, skill-encoded reusable techniques |

### Why this design

- **No framework-switching.** A single consistent `/oto-*` surface means you
  never have to stop mid-task and decide which command vocabulary, agent
  set, or hook config applies — the core value is **stop
  framework-switching**.
- **The pieces actually compose.** The planning spine sequences and tracks
  work; the skill library supplies the techniques used inside each step.
  Skills run *inside* the planning/execution loop instead of beside it.
- **One install, three runtimes.** A single `oto install` lays the full
  system down for Claude Code, Codex, or Gemini, with per-runtime
  instruction files, hook config, and agent sandboxes generated for you —
  no manual symlinking or per-runtime reconciliation.

## Install

```sh
npm install -g https://github.com/OTOJulian/oto-hybrid-framework/archive/v0.4.1.tar.gz
oto install --claude
```

Replace `v0.4.1` with the latest release tag from the
[Releases page](https://github.com/OTOJulian/oto-hybrid-framework/releases).
For Codex or Gemini, use `oto install --codex` or `oto install --gemini`.
To install all detected runtimes, use `oto install --all`.

## Supported runtimes

| Runtime | Status | Install command |
|---------|--------|-----------------|
| Claude Code | primary, daily-use stable | `oto install --claude` |
| Codex | best-effort | `oto install --codex` |
| Gemini CLI | best-effort | `oto install --gemini` |

Claude Code is the primary, daily-use happy path. Codex and Gemini have
generated instruction files, runtime transforms, and smoke coverage, but they
remain lower-priority personal runtimes pending further hardening.

## Commands

oto ships about 76 `/oto-*` commands. See
[`oto/commands/INDEX.md`](oto/commands/INDEX.md) for the full generated command
index with one-line descriptions, or the
[command routing guide (PDF)](docs/oto-command-routing-guide.pdf) for a
visual walkthrough of which command to reach for when.

Common entry points:

- `/oto-new-project` - initialize a new project
- `/oto-discuss-phase` - gather phase context through adaptive questioning
- `/oto-plan-phase` - create detailed phase plans with verification loops
- `/oto-execute-phase` - execute planned work with atomic commits
- `/oto-verify-work` - validate completed work through UAT
- `/oto-help` - list available commands and usage guidance
- `/oto-progress` - inspect project state and route the next action
- `/oto-resume-work` - restore previous session context
- `/oto-quick` - run a small oto-tracked task
- `/oto-debug` - run systematic debugging with persistent state
- `/oto-ship` - prepare reviewed work for merge or release

## Documentation

- [`docs/oto-command-routing-guide.pdf`](docs/oto-command-routing-guide.pdf) - a
  visual guide to which `/oto-*` command to use for a given task.
- [`docs/upstream-sync.md`](docs/upstream-sync.md) - how to pull, rebrand, and
  merge upstream changes.
- [`docs/rebrand-engine.md`](docs/rebrand-engine.md) - how the rule-typed
  rebrand engine works and how to add new rules.
- [`decisions/`](decisions/) - architecture decision records and inventory
  decisions that constrain the fork.
- [`THIRD-PARTY-LICENSES.md`](THIRD-PARTY-LICENSES.md) - verbatim upstream MIT
  licenses and attribution.

## Attribution

oto incorporates work from open-source upstream projects, each MIT-licensed.
Full attribution and verbatim license texts are reproduced in
[`THIRD-PARTY-LICENSES.md`](THIRD-PARTY-LICENSES.md).

## License

oto's added work is MIT-licensed. See [`LICENSE`](LICENSE).
```
  </action>
  <verify>
    <automated>! grep -n -iE "gsd|get shit done|superpowers|gsd-build|obra" README.md</automated>
  </verify>
  <done>README.md fully overwritten with the target content above; grep for forbidden terms returns no matches.</done>
</task>

<task type="auto">
  <name>Task 2: Verify preserved blocks and out-of-scope files are untouched</name>
  <files>README.md</files>
  <action>
Run a diff-based verification that the four required-verbatim blocks
(title, both badge lines, Install section, Supported runtimes table) still
match the pre-rewrite versions, and confirm no other tracked file changed.

1. Confirm badge lines are present unchanged:
   `grep -n "actions/workflows/test.yml/badge.svg" README.md`
   `grep -n "actions/workflows/install-smoke.yml/badge.svg" README.md`
2. Confirm the Install section's npm/oto install commands are present
   unchanged:
   `grep -n "npm install -g https://github.com/OTOJulian/oto-hybrid-framework/archive/v0.4.1.tar.gz" README.md`
   `grep -n "oto install --claude" README.md`
   `grep -n "oto install --all" README.md`
3. Confirm the Supported runtimes table header and all three rows are
   present unchanged:
   `grep -n "| Runtime | Status | Install command |" README.md`
   `grep -n "oto install --codex" README.md`
   `grep -n "oto install --gemini" README.md`
4. Confirm out-of-scope files were not modified in this task's changes:
   `git status --porcelain -- LICENSE THIRD-PARTY-LICENSES.md NOTICE CLAUDE.md` must return empty output.
5. Re-run the full forbidden-term sweep across the whole file (not just
   visible top sections) to catch anything Task 1 missed:
   `grep -n -iE "gsd|get shit done|superpowers|gsd-build|obra" README.md` must return no matches.

If any check fails, fix README.md directly (targeted edit, not full
rewrite) and re-run the failing check until it passes.
  </action>
  <verify>
    <automated>git status --porcelain -- LICENSE THIRD-PARTY-LICENSES.md NOTICE CLAUDE.md | wc -l | grep -qx 0 && ! grep -n -iE "gsd|get shit done|superpowers|gsd-build|obra" README.md</automated>
  </verify>
  <done>All preserved blocks (title, badges, Install section, Supported runtimes table) confirmed byte-identical to the pre-rewrite README.md; LICENSE, THIRD-PARTY-LICENSES.md, NOTICE, and CLAUDE.md show no git changes; whole-file forbidden-term sweep returns zero matches.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| N/A | This plan only edits static documentation (README.md). No code execution paths, network input, or trust boundaries are affected. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-260709-01 | I (Information Disclosure) | README.md Attribution section | accept | Rewording removes named upstream project references from README.md prose only; the actual MIT attribution and license texts remain intact and unmodified in THIRD-PARTY-LICENSES.md, so no license-compliance information is lost — only the human-facing README summary is reworded. |
</threat_model>

<verification>
- `grep -n -iE "gsd|get shit done|superpowers|gsd-build|obra" README.md` returns no matches (whole file).
- Title line, both CI badge lines, the Install section body, and the Supported runtimes table are byte-identical to the pre-rewrite README.md.
- `git status --porcelain -- LICENSE THIRD-PARTY-LICENSES.md NOTICE CLAUDE.md` returns empty output.
- `git diff --stat` shows only `README.md` as a modified file.
</verification>

<success_criteria>
- README.md no longer mentions GSD, Get Shit Done, Superpowers, gsd-build, or obra/superpowers anywhere in the file.
- README.md describes oto's planning workflow and skill library as oto's own native capabilities.
- CI badges, Install section, and Supported runtimes table are unchanged from the pre-rewrite README.md.
- No other file in the repository (LICENSE, THIRD-PARTY-LICENSES.md, NOTICE, CLAUDE.md) was modified.
</success_criteria>

<output>
After completion, create `.oto/quick/260709-fav-rewrite-readme-md-to-remove-all-mention-/260709-fav-SUMMARY.md`
</output>
