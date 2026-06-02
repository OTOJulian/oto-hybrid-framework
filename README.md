# oto

Hybrid AI-CLI framework: GSD planning plus Superpowers skills under `/oto-*`
across Claude Code, Codex, and Gemini CLI.

![Tests](https://github.com/OTOJulian/oto-hybrid-framework/actions/workflows/test.yml/badge.svg)
![Install Smoke](https://github.com/OTOJulian/oto-hybrid-framework/actions/workflows/install-smoke.yml/badge.svg)

## What is oto?

oto fuses two complementary open-source projects into a single command surface.
Each upstream is strong at one half of the agentic-development problem, and they
were built to do different jobs:

- **[Get Shit Done (GSD)](https://github.com/gsd-build/get-shit-done)** is the
  **workflow spine** — the *what* and *when*. It gives you spec-driven phase
  planning, wave-based execution, verification loops, stateful project tracking
  (roadmap → phases → plans → summaries), and release discipline. GSD is opinionated
  about *the process of shipping a project*.
- **[Superpowers](https://github.com/obra/superpowers)** is the **capability
  library** — the *how*. It gives you composable, reusable skills: test-driven
  development, systematic debugging, verification-before-completion, parallel
  agent dispatch, and git-worktree isolation. Superpowers is opinionated about
  *how each unit of work is done well*.

oto rebrands both under one `/oto-*` command and `oto:<skill>` namespace, installs
them together to whichever runtime you use (Claude Code, Codex, Gemini), and keeps
them current through a one-way upstream pull pipeline.

### How they combine

GSD provides the **outer loop** (plan the milestone, sequence the phases, execute,
verify, ship). Superpowers provides the **inner loop** (how a single phase is
actually implemented). In oto they interlock: a GSD `/oto-execute-phase` run can
invoke Superpowers skills as part of its disciplined cycle — writing tests first
(`test-driven-development`), debugging methodically (`systematic-debugging`),
fanning out independent work to parallel agents, and refusing to mark work
"done" until it's verified (`verification-before-completion`). The planning spine
decides *what* to build and tracks state; the skills decide *how* each step is
executed to a high standard.

| Contribution | From GSD | From Superpowers |
|--------------|----------|------------------|
| Project structure | roadmap, phases, plans, persistent STATE | — |
| Process discipline | execution waves, verification gates, release flow | verification-before-completion |
| Implementation quality | — | TDD, systematic debugging |
| Throughput | wave parallelization | parallel-agent dispatch, worktree isolation |
| Memory & continuity | stateful tracking across sessions | skill-encoded reusable techniques |

### Why oto instead of GSD or Superpowers on their own?

Running both separately is the status quo this project was built to end:

- **No framework-switching.** GSD and Superpowers are two installs with two
  command vocabularies, two sets of agents/hooks, and overlapping conventions.
  Mid-task you'd otherwise have to stop and decide *which framework am I in?* oto
  collapses that into one consistent `/oto-*` surface — the core value is **stop
  framework-switching**.
- **The pieces actually compose.** Alone, GSD has the planning spine but lacks
  the deep skill library; Superpowers has the skills but no project spine to
  sequence and track them. Each is half a workflow. oto wires them so the skills
  run *inside* the planning/execution loop instead of beside it.
- **One install, three runtimes.** A single `oto install` lays both systems down
  for Claude Code, Codex, or Gemini, with per-runtime instruction files, hook
  config, and agent sandboxes generated for you — no manual symlinking or
  per-runtime reconciliation.
- **Stays current without merge pain.** A one-way upstream sync pulls and
  rebrands new GSD/Superpowers work, so you get upstream improvements without
  re-resolving naming conflicts by hand.

oto adds no new agent capabilities of its own — its value is the *integration*:
the union is more usable than the sum of two parts you'd otherwise juggle
side by side.

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
[command routing guide (PDF)](docs/oto-command-routing-guide.pdf) for a visual
walkthrough of which command to reach for when.

Common entry points:

- `/oto-new-project` - initialize a new project
- `/oto-discuss-phase` - gather phase context through adaptive questioning
- `/oto-plan-phase` - create detailed phase plans with verification loops
- `/oto-execute-phase` - execute planned work with atomic commits
- `/oto-verify-work` - validate completed work through UAT
- `/oto-help` - list available commands and usage guidance
- `/oto-progress` - inspect project state and route the next action
- `/oto-resume-work` - restore previous session context
- `/oto-quick` - run a small GSD-tracked task
- `/oto-debug` - run systematic debugging with persistent state
- `/oto-ship` - prepare reviewed work for merge or release

## Documentation

- [`docs/oto-command-routing-guide.pdf`](docs/oto-command-routing-guide.pdf) - a
  visual guide to which `/oto-*` command to use for a given task.
- [`docs/upstream-sync.md`](docs/upstream-sync.md) - how to pull, rebrand, and
  merge upstream GSD/Superpowers changes.
- [`docs/rebrand-engine.md`](docs/rebrand-engine.md) - how the rule-typed
  rebrand engine works and how to add new rules.
- [`decisions/`](decisions/) - architecture decision records and inventory
  decisions that constrain the fork.
- [`THIRD-PARTY-LICENSES.md`](THIRD-PARTY-LICENSES.md) - verbatim upstream MIT
  licenses and attribution.

## Attribution

oto incorporates work from:

- [Get Shit Done](https://github.com/gsd-build/get-shit-done) - Copyright (c)
  2025 Lex Christopherson - MIT
- [Superpowers](https://github.com/obra/superpowers) - Copyright (c) 2025 Jesse
  Vincent - MIT

Both upstream MIT licenses are reproduced verbatim in
[`THIRD-PARTY-LICENSES.md`](THIRD-PARTY-LICENSES.md).

## License

oto's added work is MIT-licensed. See [`LICENSE`](LICENSE).
