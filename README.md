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
- [`docs/search-integrations.md`](docs/search-integrations.md) - Exa MCP setup,
  Brave search, and the fallback ladder.
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
