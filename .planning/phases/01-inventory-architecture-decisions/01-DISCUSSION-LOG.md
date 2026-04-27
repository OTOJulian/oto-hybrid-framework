# Phase 1: Inventory & Architecture Decisions - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-27
**Phase:** 01-inventory-architecture-decisions
**Areas discussed:** State dir + env vars; GitHub owner + bin names; Decision + inventory formats; SDK + agent trim depth

---

## Mode

User invoked `/gsd-discuss-phase 1` interactively, then delegated all gray-area decisions to Claude with "you decide on all of these gray areas."

Per the discuss-phase.md "Claude's Discretion" pattern, decisions below are Claude's judgment grounded in research artifacts (`.planning/research/{SUMMARY,ARCHITECTURE,PITFALLS,STACK,FEATURES}.md`), `PROJECT.md`, `REQUIREMENTS.md`, and `CLAUDE.md`. No questions were posed individually — the user explicitly preferred bulk delegation.

---

## State directory + Env-var prefix

| Option | Description | Selected |
|--------|-------------|----------|
| `.oto/` state root | Single canonical state dir replacing `.planning/` (research recommendation) | ✓ |
| `.oto-state/` or other | Alternative names considered | |
| Keep `GSD_*` env vars | Preserve upstream env-var names for sync simplicity | |
| Rename `GSD_*` → `OTO_*` | Lockstep rename; full rebrand depth | ✓ |

**Claude's choice:** `.oto/` + lockstep `OTO_*` env vars.
**Notes:** Research and PROJECT.md "full rebrand depth" key decision both align. Keeping `GSD_*` would leak upstream identity through `--help` output and runtime errors, undermining the unified surface. The rebrand engine handles env-var rules with the same `\b`-bounded identifier machinery, so cost is minimal.

---

## GitHub owner + Bin names

| Option | Description | Selected |
|--------|-------------|----------|
| Owner `julianisaac` | Inferred from user email me@julianisaac.com | ✓ (provisional) |
| Owner placeholder `<owner>` | Defer until user confirms | |
| Bin: `oto` only | Single binary, defer SDK | ✓ |
| Bin: `oto` + `oto-sdk` | Mirror GSD's dual-bin shape | |

**Claude's choice:** `julianisaac/oto-hybrid-framework`, single `oto` bin.
**Notes:** Bin name distinct from GSD's `get-shit-done-cc` / `gsd-sdk` (Pitfall 16 satisfied). `oto-sdk` not needed in v1 since SDK is deferred (see SDK section below). Owner is provisional — flagged in deferred ideas for verification before Phase 2 closes.

---

## Decision file format + File inventory format

| Option | Description | Selected |
|--------|-------------|----------|
| Lightweight ADR (Title/Context/Decision/Rationale/Consequences/Status) | Structured but minimal | ✓ |
| Full ADR (with Date/Supersedes/Links/Tags) | Heavier, suited for team/compliance | |
| Free prose | Less structure, harder to grep | |
| File inventory: markdown table only | Human-readable, hard for tooling to consume | |
| File inventory: JSON only | Machine-readable, hard to skim | |
| File inventory: JSON + generated markdown index | Single source of truth + readable view | ✓ |

**Claude's choice:** Lightweight ADR per decision; dual-format inventory (JSON SoT + generated markdown).
**Notes:** Phase 2 rebrand engine and Phase 9 sync pipeline must consume the inventory programmatically — markdown-only would force markdown parsing. Lightweight ADR matches personal-use cost ceiling without losing the structure that future-self needs to revisit choices.

---

## SDK strategy + Agent trim depth

| Option | Description | Selected |
|--------|-------------|----------|
| Drop `sdk/` entirely; fork `gsd-tools.cjs` | Eliminates `prepare`-build risk; matches CLAUDE.md guidance | ✓ |
| Keep `sdk/` with `prepare`-build | Adds toolchain failure surface (Pitfall 5) | |
| Keep `sdk/`, commit `dist/` | Pollutes diffs | |
| Conservative agent trim (port all 33 except duplicates) | Cold-start context bloat | |
| Moderate trim (~20-23 agents, drop AI/eval/v2 + duplicates) | Balanced; matches research recommendation | ✓ |
| Aggressive trim (~10-12 agents) | Too lossy; cuts spine functionality | |

**Claude's choice:** Drop `sdk/` (fork CJS path); moderate trim to ~23 agents.
**Notes:** Pitfall 5 explicitly recommends the CJS-only path. Moderate trim lands at 23 keep + 10 drop, with concrete keep/drop list specified in CONTEXT.md D-12. SDK gets its own deferred-status ADR so the choice is explicit and revisitable.

---

## Claude's Discretion

User delegated all decisions: state-dir name, env-var rename policy, GitHub owner, bin names, decision-file format, file-inventory format, SDK strategy, agent trim depth, rename-map schema shape, decision-numbering convention, license attribution scope.

Claude's judgments are recorded as D-01..D-23 in CONTEXT.md. Each decision references the research artifact (PITFALLS.md, ARCHITECTURE.md, etc.) or PROJECT.md key decision that grounds it.

## Deferred Ideas

- `oto-sdk` programmatic API → v2 (SDK-01..03)
- Three-way merge in upstream sync → v2
- Codex/Gemini parity hardening → Phase 8
- Windows support → out of scope
- GitHub owner `julianisaac` verification → flag during Phase 2 plan-phase
