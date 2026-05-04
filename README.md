# oto

Hybrid AI-CLI framework: GSD planning plus Superpowers skills under `/oto-*`
across Claude Code, Codex, and Gemini CLI.

![Tests](https://github.com/OTOJulian/oto-hybrid-framework/actions/workflows/test.yml/badge.svg)
![Install Smoke](https://github.com/OTOJulian/oto-hybrid-framework/actions/workflows/install-smoke.yml/badge.svg)

## What is oto?

oto is a personal-use framework that fuses two upstream projects into a single
command surface:

- **[Get Shit Done (GSD)](https://github.com/gsd-build/get-shit-done)** -
  spec-driven phase planning, execution waves, verification loops, stateful
  project tracking, and release workflow discipline.
- **[Superpowers](https://github.com/obra/superpowers)** - composable skills for
  test-driven development, systematic debugging, verification before completion,
  parallel agents, and git worktree workflows.

Both upstreams' commands and skills are rebranded under `/oto-*` and
`oto:<skill>` namespaces, installed to whichever runtime you use, and kept in
sync through a one-way upstream pull pipeline.

## Install

```sh
npm install -g https://github.com/OTOJulian/oto-hybrid-framework/archive/v0.1.0.tar.gz
oto install --claude
```

Replace `v0.1.0` with the latest release tag from the
[Releases page](https://github.com/OTOJulian/oto-hybrid-framework/releases).
For Codex or Gemini, use `oto install --codex` or `oto install --gemini`.
To install all detected runtimes, use `oto install --all`.

## Supported runtimes

| Runtime | Status | Install command |
|---------|--------|-----------------|
| Claude Code | primary, daily-use stable | `oto install --claude` |
| Codex | best-effort | `oto install --codex` |
| Gemini CLI | best-effort | `oto install --gemini` |

Claude Code is the v0.1.0 happy path. Codex and Gemini have generated
instruction files, runtime transforms, and smoke coverage, but they remain
lower-priority personal runtimes until post-v0.1.0 hardening.

## Commands

oto ships about 76 `/oto-*` commands. See
[`oto/commands/INDEX.md`](oto/commands/INDEX.md) for the full generated command
index with one-line descriptions.

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
