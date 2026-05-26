# Phase 8: Codex & Gemini Runtime Parity - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-02
**Phase:** 08-codex-gemini-runtime-parity
**Areas discussed:** SoT template for instruction files, runtime-tool-matrix.md source and scope, Codex parity depth, Gemini gap handling
**Mode:** Interactive (no `--auto`, no `--chain`, no `--power`, no `--text`)

---

## Gray-area selection

| Option | Description | Selected |
|--------|-------------|----------|
| SoT template for instruction files | MR-02 / SC#1 — single source-of-truth for CLAUDE.md / AGENTS.md / GEMINI.md with per-runtime transforms | ✓ |
| runtime-tool-matrix.md source and scope | MR-03 / SC#2 — divergence doc + verification | ✓ |
| Codex parity depth (TOML + per-agent .toml) | mergeSettings + per-agent .toml + model overrides | ✓ |
| Gemini gap handling (subagents + tools) | Inline-rewrite Task() / tool-name policy / hook surface | ✓ |

**User selected all four areas.**

---

## Area 1: SoT template for instruction files

### Q1.1 — Which instruction files does the SoT template govern?

| Option | Description | Selected |
|--------|-------------|----------|
| Project-root only | Three project-root files (CLAUDE.md / AGENTS.md / GEMINI.md) ship with the repo; install-time marker block stays small per-adapter strings (Recommended) | ✓ |
| Install-time marker block only | SoT only governs renderInstructionBlock output; project-root files stay hand-authored | |
| Both — unified pipeline | SoT covers both; install-time block barely benefits | |

**User's choice:** Project-root only.
**Notes:** Matches Superpowers upstream pattern; the install-time block (~4 lines) is too small to benefit from a unified pipeline.

### Q1.2 — What shape should the SoT artifact take?

| Option | Description | Selected |
|--------|-------------|----------|
| Single markdown template + runtime-tag sections | One file with `<!-- runtime:codex -->` fences + `{{tokens}}` (Recommended) | ✓ |
| Markdown body + per-runtime YAML transform manifest | Two-file split (body + manifest) | |
| Code-side string builder | Shared `bin/lib/render-instruction-file.cjs` builds via JS string concatenation | |

**User's choice:** Single markdown template + runtime-tag sections.
**Notes:** Diff-friendly, grep-friendly, single file to edit. Mirrors marker-block convention from Phase 3 D-08 / Phase 5 D-13.

### Q1.3 — How should "drift impossible by construction" be enforced?

| Option | Description | Selected |
|--------|-------------|----------|
| Generated files committed + node:test regen-diff check | Files committed; test re-renders + diffs; hand-edits fail next test run (Recommended) | ✓ |
| Generated at install/postinstall time | Files .gitignored; generated on install; breaks fresh-clone read | |
| Render at runtime via shared module | Adapters call `renderInstructionFile()` on demand; doesn't match Claude reading project-root CLAUDE.md statically | |

**User's choice:** Generated files committed + regen-diff check.
**Notes:** Maintains fresh-clone usability; regen test enforces the "no hand-edits" rule structurally.

### Q1.4 — What's the seed content for the SoT template?

| Option | Description | Selected |
|--------|-------------|----------|
| Existing project-root CLAUDE.md as baseline | Use current CLAUDE.md verbatim; add runtime-tag fences only where divergence is needed (Recommended) | ✓ |
| Rebrand-engine output as baseline | Use `.oto-rebrand-out/superpowers-main/CLAUDE.md` and GEMINI.md as seed | |
| Hybrid — rebrand output for shared body, project CLAUDE.md for oto-specific top | Compose from both lineages | |

**User's choice:** Existing project-root CLAUDE.md as baseline.
**Notes:** Minimal disruption; CLAUDE.md becomes the generated output of itself.

---

## Area 2: runtime-tool-matrix.md source and scope

### Q2.1 — How should runtime-tool-matrix.md be authored?

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-generated from adapter descriptors + tool maps | Same regen-diff pattern as SoT template (Recommended) | ✓ |
| Hand-authored with linkbacks to source files | Lower upfront cost; relies on discipline | |
| Hybrid — generated tables + hand-written prose | Mixed-mode with markers around generated regions | |

**User's choice:** Auto-generated.
**Notes:** Drift-resistant by construction; matches the SoT template approach.

### Q2.2 — Which dimensions must the matrix cover? (multiSelect)

| Option | Description | Selected |
|--------|-------------|----------|
| Tool name map (Claude → Codex / Gemini) + filtered tools | Core 'tool not found' prevention surface (Recommended) | ✓ |
| Frontmatter dialect per runtime | Per-runtime agent frontmatter rules (Recommended) | ✓ |
| Capability gaps + 'best-effort' boundary | Explicit gap registry (Recommended) | ✓ |
| Hook event names + sandbox modes per runtime | Per-runtime registration shape (Recommended) | ✓ |

**User's choice:** All four dimensions.

### Q2.3 — Where should runtime-tool-matrix.md live?

| Option | Description | Selected |
|--------|-------------|----------|
| `decisions/` (alongside ADRs) | Treats it as a normative reference; mirrors agent-audit.md / skill-vs-command.md (Recommended) | ✓ |
| `docs/` (user-facing documentation) | Less authoritative; for end users | |
| `oto/references/` (shipped to runtime) | Conflates project-internal reference with installed payload | |

**User's choice:** `decisions/`.

### Q2.4 — What does "verified by per-runtime fixture tests" mean concretely?

| Option | Description | Selected |
|--------|-------------|----------|
| Per-runtime golden-file fixtures + diff tests | One canonical agent/command/skill per runtime; diffed against expected output; matrix-vs-code consistency test (Recommended) | ✓ |
| Property tests — round-trip + invariants only | No goldens; weaker regression guarantee | |
| Hybrid — one golden + property invariants per runtime | Most coverage; most code | |

**User's choice:** Per-runtime golden-file fixtures + diff tests.

---

## Area 3: Codex parity depth

### Q3.1 — How much of upstream's Codex TOML machinery should Phase 8 port?

**User initially asked for clarification on why partial porting was on the table** — flagged confusion that "partial port" sounded like incomplete Codex compatibility.

Clarification provided: each upstream chunk maps to a distinct Codex behavior (hook firing, sandbox enforcement, model selection, profile resolution, idempotent re-install). The "minimum-viable" framing was rooted in PROJECT.md's personal-use cost ceiling and Pitfall 11 (rigor inflation) — i.e. "don't port code you'll never exercise." That framing only makes sense if Codex isn't a daily-use runtime.

**User's response (verbatim):** "I intend to use codex day to day, yes, i swtich between claude and codex for differen thtings, so I want full codex compatability, I dont want there to be any commands that don't work in codex"

This locks Codex to **daily-peer parity** and overrides ROADMAP Phase 8's "best-effort" framing.

| Option (after clarification) | Description | Selected |
|--------|-------------|----------|
| Daily peer — port everything Codex needs to behave like Claude | mergeSettings + per-agent .toml + model_overrides + RUNTIME_PROFILE_MAP + idempotent strip-and-rewrite (~600–800 LOC port) | ✓ |
| Functional parity minus profiles | Port hooks block + per-agent .toml + idempotent rewrite; skip model overrides (`/oto-set-profile` no-op on Codex) | |
| Best-effort install only — hooks + smoke, no per-agent .toml | mergeSettings hooks only; AGT-04 documented as Claude-only | |

### Q3.2 — Should Phase 8 produce a per-command runtime support matrix?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — generated command-runtime matrix in `decisions/runtime-tool-matrix.md` | Auto-generated section listing every `/oto-*` command × runtime; Codex column 100% green for v0.1.0 (Recommended) | ✓ |
| Yes — separate `decisions/command-runtime-coverage.md` doc | Two docs to keep in sync | |
| No — rely on smoke tests + manual verification | Broken commands could ship undetected | |

**User's choice:** Generated section in `decisions/runtime-tool-matrix.md`.
**Notes:** This is the verifiable enforcement mechanism for "no broken commands on Codex."

### Q3.3 — Which `/oto-*` commands should the Codex smoke test exercise end-to-end?

| Option | Description | Selected |
|--------|-------------|----------|
| Core spine + workflow critical path | /oto-help, /oto-progress, /oto-new-project (tmpdir), /oto-discuss-phase, /oto-plan-phase, /oto-execute-phase, /oto-verify-work, /oto-pause-work, /oto-resume-work; mirrors Phase 4 MR-01 spine (Recommended) | ✓ |
| Every retained `/oto-*` command, smoke-only (no end-to-end) | All ~80 commands invoked once; harder to make hermetic | |
| Spine + dogfood disposable project | Phase 4 MR-01 dogfood pattern but on Codex; depends on Codex CLI being installable in CI | |

**User's choice:** Core spine + workflow critical path.

---

## Area 4: Gemini gap handling

### Q4.1 — What's the intended Gemini use bar at v0.1.0?

| Option | Description | Selected |
|--------|-------------|----------|
| Daily peer — no broken commands on Gemini either | Same bar as Codex; inline-rewrite Task() into Gemini agent-as-tool invocation | ✓ |
| Best-effort — spine works, exotic commands degrade with clear messaging | Spine works; deep subagent chains documented as reduced functionality (Recommended at the time, but user chose the stronger bar) | |
| Install + smoke + document gaps — don't rewrite Task() | Install works; Task()-using commands documented as not supported on Gemini | |

**User's choice:** Daily peer — no broken commands on Gemini either.
**Notes:** Generalizes the Codex constraint to Gemini. Overrides ROADMAP Phase 8's "best-effort given subagent-support gaps" framing.

### Q4.2 — How should Task() dispatches in workflow markdown be rewritten for Gemini?

| Option | Description | Selected |
|--------|-------------|----------|
| Inline-rewrite at install/transform time — emit Gemini tool-invocation syntax | Single-source workflow stays as Task() in repo; Gemini sees its native form at install (Recommended) | ✓ |
| Author dual-form invocations in workflow markdown | Runtime-tag fences in workflow body; high authoring friction | |
| Runtime detection in workflow markdown body | Model interprets the branch at runtime; messiest | |

**User's choice:** Inline-rewrite at install/transform time.
**Notes:** Researcher must lock the exact Gemini agent-as-tool invocation syntax — highest-priority research input.

### Q4.3 — Parallel Task() dispatch on Gemini policy?

| Option | Description | Selected |
|--------|-------------|----------|
| Researcher must verify Gemini supports it; if not, sequentialize at transform time | Honors no-broken-commands bar; behavior matches Claude when supported, slower when not (Recommended) | ✓ |
| Sequentialize unconditionally on Gemini | Predictable; potentially slower than necessary | |
| Document parallel-dispatch commands as Claude/Codex-only | Walks back daily-peer bar | |

**User's choice:** Researcher verifies; if no native support, sequentialize at transform time.

### Q4.4 — Tool-name filter policy for Gemini transforms?

| Option | Description | Selected |
|--------|-------------|----------|
| Adopt upstream filter verbatim | Filter mcp__*, filter Task, apply explicit Claude→Gemini map, default lowercase, escape `${VAR}`→`$VAR` (Recommended) | ✓ |
| Adopt filter but make it data-driven via runtime-tool-matrix.md | Same behaviors but config lives in matrix instead of code | |
| Custom filter — clarify scope first | Discuss extending or trimming the upstream filter | |

**User's choice:** Adopt upstream filter verbatim.

### Q4.5 — Gemini hook policy?

| Option | Description | Selected |
|--------|-------------|----------|
| Researcher confirms Gemini hook surface, then port whatever exists | If Gemini supports hooks, near-identity port from Claude; if no, document gap (Recommended) | ✓ |
| Skip Gemini hooks entirely — document as v0.1.0 gap | mergeSettings stays no-op; weakens daily-peer | |
| Use Gemini equivalent if it exists, otherwise inline-replicate via session prompts | Aggressive parity; potentially fragile | |

**User's choice:** Researcher confirms hook surface; port what exists.
**Notes:** This is the one place D-12's "no broken commands" bar bends — hooks are not commands; their absence degrades observability/safety on Gemini, doesn't break command execution.

---

## Claude's Discretion

(Captured in CONTEXT.md `<decisions>` § Claude's Discretion — implementation details left to the planner/executor: exact test filenames, `bin/lib/codex/` subdirectory vs flat layout, runtime-tag fence syntax variant, capability-gap registry wording, optional `# managed by oto v{{OTO_VERSION}}` comment in per-agent `.toml`, `~/.oto/defaults.json` initial seeding, smoke test handling of interactive `AskUserQuestion`-equivalent input on Codex/Gemini.)

## Deferred Ideas

(Captured in CONTEXT.md `<deferred>` — per-runtime stability gate equivalent to MR-01, CI promotion of smoke tests, three-way merge UX for upstream sync, cross-runtime workstream verification, `oto:using-oto` cross-runtime tool refs maintenance, `/oto-set-profile` extension to Gemini, `mcp__*` re-enablement on Gemini, Gemini SessionStart-equivalent identity primer, `~/.oto/defaults.json` interactive setup wizard.)
