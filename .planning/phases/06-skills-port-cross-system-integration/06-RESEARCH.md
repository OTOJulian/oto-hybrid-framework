# Phase 6: Skills Port & Cross-System Integration — Research

**Researched:** 2026-05-01
**Domain:** Curated upstream-skill rebrand + agent-prompt wiring (rebrand-engine reuse, no new infrastructure)
**Confidence:** HIGH

---

## Summary

Phase 6 has been comprehensively de-risked by prior phases. The rebrand engine that handles the skill subtree (`scripts/rebrand.cjs apply`) was validated end-to-end in Phase 2; the installer category for `skills` and the `runtime-claude` source/target mapping were validated in Phase 3; the `oto-session-start` hook that loads `oto/skills/using-oto/SKILL.md` already exists (with a defensive fallback) from Phase 5; and the three target agent prompts (`oto-executor`, `oto-verifier`, `oto-debugger`) already contain the exact lines marked for replacement at lines 58, 54, and 41 respectively. CONTEXT.md locks every architectural choice — research focused only on verifying assumptions and surfacing the unambiguous mechanical sequence the planner will encode.

The shape of the work: (1) point the existing engine at the upstream skill subtree and capture the seven retained directories into `oto/skills/`; (2) hand-fix `oto/skills/using-oto/SKILL.md` only — strip upstream contributor framing, replace the identity sentence to match the Phase 5 SessionStart fixture, and insert the STATE.md deferral directive; (3) edit three agent prompt files at known line numbers to insert four `Skill('oto:<name>')` directives; (4) ship three focused `node:test` files (skill structure + name collision; installer copy smoke; STATE.md gating prose).

**Primary recommendation:** Drive the plan from `decisions/file-inventory.json` `phase_owner: 6` rows (27 entries, all `verdict: "keep"`, `category: "skill"`) — they are the canonical engine input. Run dry-run before apply to catch unexpected matches inside non-markdown payload (`find-polluter.sh`, `condition-based-waiting-example.ts`, `render-graphs.js`, `graphviz-conventions.dot`); engine output for the other six skills ships as-is, only `using-oto/SKILL.md` gets hand-fixes. [VERIFIED: file-inventory.json grep yielded 27 phase_owner=6 rows]

---

## User Constraints (from CONTEXT.md)

> Locked decisions from Phase 6 discussion. The planner MUST honor these verbatim and not relitigate.

### Locked Decisions

**Skill Rebrand Strategy (D-01..D-02)**

- **D-01:** Run `scripts/rebrand.cjs apply` against the upstream skill subtree at `foundation-frameworks/superpowers-main/skills/` for the 7 retained skill directories (per `decisions/file-inventory.json` `phase_owner: 6` rows). Engine emits to `oto/skills/<name>/`. The existing rule set (`identifier`, `path`, `command`, `URL`, `env_var`, `skill_ns`) covers the bulk of the rewrite. After engine apply, hand-fix `oto/skills/using-oto/SKILL.md` only.
- **D-02:** Voice adaptation in `using-oto/SKILL.md` is **minimal**:
  - Replace upstream identity literals: `<EXTREMELY-IMPORTANT>You have superpowers.` → the rebranded sentence already locked in Phase 5 D-05; `using-superpowers` skill name → `oto:using-oto`; `Superpowers skills` → `oto skills`.
  - Strip upstream contributor-framing paragraphs (94% PR rejection rate, fabricated-content warning, "your job is to protect your human partner from PR rejection" content).
  - **Preserve verbatim**: the Red Flags rationalization table, the 1% rule, the Instruction Priority hierarchy, the "human partner" phrasing where it shapes behavior, the Skill Priority ordering (process skills before implementation skills), the Red Flags / "I can check git/files quickly" table.
  - Diff-review using-oto end-to-end before lock — highest-visibility skill (loaded inline on every SessionStart).

**`oto:using-oto` Workflow Gating (D-03..D-04)**

- **D-03:** `oto:using-oto/SKILL.md` instructs the model to **read `.oto/STATE.md`** before deciding whether to auto-fire other skills. Implementation is prose inside the skill body — a directive sentence: "Before suggesting or invoking any other oto skill on suspicion, read `.oto/STATE.md`. If the `status:` frontmatter field shows an active phase (e.g., `execute_phase`, `plan_phase`, `debug`, `verify`), suppress ambient skill auto-fire — only canonical agent invocations and explicit user `Skill()` calls fire." Prose fallback: if `.oto/STATE.md` is missing, malformed, or shows `status: complete`, treat as no active workflow and let skills fire normally.
- **D-04:** Suppression scope when STATE.md shows active workflow = **ambient auto-fire only**. The following continue to fire unaffected:
  - **Canonical agent invocations (SKL-08):** explicit `Skill()` calls inside agent prompts.
  - **Explicit user requests:** if the user types `/skill oto:systematic-debugging` or otherwise explicitly asks for a skill, it fires.
  - **Workflow-internal skill calls:** if a `/oto-*` workflow itself invokes a skill (none currently do, but the door stays open).

**Agent Canonical Invocation Pattern (D-05..D-06)**

- **D-05:** Skill invocations are added as **inline prose instructions inside agent prompt bodies**, not via frontmatter (no `required_skills:` field) and not via hooks.
- **D-06:** Four canonical invocation points wired in this phase:
  1. **`oto-executor`** — Invokes `oto:test-driven-development` **before writing implementation code**. Insert at the agent's existing pre-write checkpoint (line 58 today).
  2. **`oto-executor`** — Invokes `oto:verification-before-completion` **after writing implementation code, before declaring the task done**. Insert at the agent's verification gate.
  3. **`oto-verifier`** — Invokes `oto:verification-before-completion` **at the start of its verification pass** (line 54 today).
  4. **`oto-debugger`** — Invokes `oto:systematic-debugging` **when starting a debug session** (line 41 today).

**Phase 6 Test Surface (D-07..D-09)**

Phase 6 ships **focused** `node:test` files only — full CI matrix is Phase 10.

- **D-07: Skill structure + name collision test.** Assert all 7 skill directories exist at `oto/skills/<name>/` and each contains a `SKILL.md` whose frontmatter parses (at minimum: `name:` and `description:` fields). Assert that for every skill directory, `oto:<directory-name>` does NOT collide with any `/oto-<name>` command file in `oto/commands/`.
- **D-08: Installer skill copy smoke.** Given a fixture install run, assert `runtime-claude.cjs` copies `oto/skills/*` (recursively, including each skill's payload — e.g., `systematic-debugging/find-polluter.sh`) into `<configDir>/skills/*` with byte-identical content (sha256 match), preserves the executable bit on shell scripts, and records the skill set in the install marker JSON.
- **D-09: STATE.md gating logic test.** Static-analyze `oto/skills/using-oto/SKILL.md` body to assert it contains the unambiguous deferral directive locked in D-03 — a single grep-able sentence that mentions both `.oto/STATE.md` and the suppression rule. Static fixture check, not a live conversational evaluation.

### Claude's Discretion

- Exact filenames for test files (`06-NN-*.test.cjs` per phase convention)
- Exact regex / matcher pattern for the gating sentence in D-09 — planner picks the assertion form (substring-includes vs. structured-marker vs. line-anchor)
- Whether to consolidate D-07 (structure + collision) into one test file or split into two
- Specific edit points within agent prompt bodies for D-06 inline invocations — current line numbers are starting hints; planner adjusts to most natural insertion point
- Whether the cross-runtime tool refs in `oto/skills/using-oto/references/` are kept in Phase 6 (recommended: keep all three; KEEP-marked in inventory)
- Treatment of payload binaries / non-markdown — engine should not touch identifiers in source code unless they match a rebrand rule; planner verifies via dry-run
- Whether to ship a `tests/skills/__fixtures__/STATE-active.md` alongside the test for D-09 (probably yes; mirrors Phase 5's hook fixture pattern)

### Deferred Ideas (OUT OF SCOPE)

- Reviving any of the 7 dropped Superpowers skills (brainstorming, writing-plans, executing-plans, subagent-driven-development, requesting-code-review, receiving-code-review, finishing-a-development-branch)
- `receiving-code-review` skill (v2 candidate)
- Codex/Gemini skill discovery parity → Phase 8
- Live skill-auto-trigger conversational regression test → Phase 10 (CI-08)
- Skill-coverage CI manifest → Phase 10 (CI-04)
- License-attribution CI check coverage of skill files → Phase 10 (CI-06)
- Workspaces/workstreams integration of `oto:using-git-worktrees` → Phase 7
- Plugin-marketplace style skill distribution
- `/oto-write-skill` workflow command
- Skill signing / hash-based integrity
- Expanding agent canonical invocations beyond the SKL-08-named three

---

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SKL-01 | `oto:test-driven-development` — TDD enforcement skill | Engine input: 2 files at `foundation-frameworks/superpowers-main/skills/test-driven-development/` (`SKILL.md`, `testing-anti-patterns.md`). Both `phase_owner: 6`. [VERIFIED: file-inventory.json + filesystem listing] |
| SKL-02 | `oto:systematic-debugging` — root-cause-tracing methodology | Engine input: 11 files (`SKILL.md`, `CREATION-LOG.md`, `condition-based-waiting.md`, `condition-based-waiting-example.ts`, `defense-in-depth.md`, `find-polluter.sh`, `root-cause-tracing.md`, `test-academic.md`, `test-pressure-1.md`, `test-pressure-2.md`, `test-pressure-3.md`). `find-polluter.sh` carries mode 100755 (executable bit must survive copy). [VERIFIED: stat output mode 100755] |
| SKL-03 | `oto:verification-before-completion` — per-claim verification | Engine input: 1 file (`SKILL.md`). [VERIFIED: filesystem listing] |
| SKL-04 | `oto:dispatching-parallel-agents` — parallel agent dispatch | Engine input: 1 file (`SKILL.md`). [VERIFIED] |
| SKL-05 | `oto:using-git-worktrees` — worktree workflow patterns | Engine input: 1 file (`SKILL.md`). [VERIFIED] |
| SKL-06 | `oto:writing-skills` — meta-skill for authoring oto skills | Engine input: 7 files (`SKILL.md`, `anthropic-best-practices.md`, `examples/CLAUDE_MD_TESTING.md`, `graphviz-conventions.dot`, `persuasion-principles.md`, `render-graphs.js`, `testing-skills-with-subagents.md`). [VERIFIED] |
| SKL-07 | `oto:using-oto` — bootstrap skill (renamed from `using-superpowers` per ADR-06) | Engine input: 4 files (`SKILL.md` + 3 references: `codex-tools.md`, `copilot-tools.md`, `gemini-tools.md`). Inventory `target_path` `skills/using-oto/SKILL.md` drives the directory rename via `engine.cjs::outputRelPathFor` (which prefers `target_path` over rule-based path rewriting). [VERIFIED: target_path field in inventory] |
| SKL-08 | Cross-system integration — agent canonical invocations | Three agent prompt files exist with the exact replacement sites: `oto/agents/oto-executor.md` line 58 (`Follow skill rules relevant to the task you are about to commit.`), `oto/agents/oto-verifier.md` line 54 (`Apply skill rules when scanning for anti-patterns and verifying quality.`), `oto/agents/oto-debugger.md` line 41 (`Follow skill rules relevant to the bug being investigated and the fix being applied.`). [VERIFIED: read each file at named line] |

**Inventory totals:** 27 rows have `phase_owner: 6, category: "skill"`. Sum of per-skill file counts above is 27 → matches inventory exactly. No drift between CONTEXT.md inventory list and what is actually on disk.

---

## Project Constraints (from CLAUDE.md)

| Directive | How research honors it |
|-----------|------------------------|
| Tech stack: Node.js 22+ CommonJS top-level | All ported skill content is markdown plus small static payload (`.sh`, `.ts`, `.dot`, `.js`); no Node code added at top level. Tests use `node:test` (built-in, zero-dep, CJS-compatible). |
| No top-level TypeScript, no top-level build | Engine apply emits files to `oto/skills/`; no compilation step. `.ts` files in `systematic-debugging` are example payload, not compiled. |
| Test framework: `node:test` for tooling | All three Phase 6 test files use `node:test` (matching Phase 5 pattern: `tests/05-*.test.cjs`). |
| Distribution: GitHub install, no npm publish | Skills ship as repo content; installer copies via existing `install.cjs` path; no registry artifacts. |
| Runtime targets: Claude / Codex / Gemini | Phase 6 wires Claude only (per CONTEXT.md domain). Codex/Gemini skill discovery deferred to Phase 8. |
| Personal-use cost ceiling | No new test infrastructure; no new CI; reuses every existing tool. |
| Drop OpenCode / 11 unwanted runtimes | Confirmed absent from `bin/install.js` already (Phase 3 work). |
| GSD Workflow Enforcement (project CLAUDE.md) | Plan instructs all edits go through `/oto-execute-phase`; no direct repo edits outside the workflow. |

---

## Standard Stack

### Core (already shipped — Phase 6 reuses)

| Library / Tool | Version | Purpose | Why Standard |
|----------------|---------|---------|--------------|
| `scripts/rebrand.cjs` (in-tree) | n/a — Phase 2 | Rule-typed rebrand engine; `apply` mode emits transformed tree | Already validated against `foundation-frameworks/`; reusing it is the locked decision (D-01) |
| `decisions/file-inventory.json` | n/a — Phase 1 | Authoritative keep/drop classification with `target_path` per file | Engine `outputRelPathFor` consults this for the `using-superpowers` → `using-oto` directory rename |
| `rename-map.json` | n/a — Phase 1 | Rule set for identifier / path / command / skill_ns / URL / env_var / package | `skill_ns` rule (`superpowers:` → `oto:`) handles all `Skill('superpowers:*')` references; no map changes for Phase 6 |
| `bin/lib/install.cjs::installRuntime` | n/a — Phase 3 | Walks `SRC_KEYS` (`commands`, `agents`, `skills`, `hooks`, `workflows`, `references`, `templates`, `contexts`), copies, transforms, records install state | `'skills'` is already in `SRC_KEYS` (line 22); `transformSkill` is wired (line 32) |
| `bin/lib/runtime-claude.cjs` | n/a — Phase 3 | Source/target mapping for Claude adapter | `sourceDirs.skills: 'oto/skills'` (line 171), `targetSubdirs.skills: 'skills'` (line 181); `transformSkill` is identity by default |
| `bin/lib/copy-files.cjs::copyTree` | n/a — Phase 3 | Recursive copy via `fsp.cp({ recursive: true, force: true, errorOnExist: false, dereference: false })` | `dereference: false` plus underlying `fsp.cp` semantics preserve mode bits including the executable bit on `find-polluter.sh` (Node.js docs: `fs.cp` preserves file mode by default) |
| `node:test` | Built-in (Node ≥22) | Test runner for the three Phase 6 verification files | Zero-dep; matches Phase 5 pattern (`tests/05-*.test.cjs`) |
| `oto/hooks/oto-session-start` | n/a — Phase 5 | Reads `oto/skills/using-oto/SKILL.md` if present, falls back to placeholder otherwise | Phase 6 backfills the file the hook expects; no hook edit needed |

### Supporting (from prior phases)

| Tool | Purpose | When to Use |
|------|---------|-------------|
| `bin/lib/install-state.cjs` | Persists install-marker JSON at `<configDir>/oto/.install.json` | D-08 test reads marker JSON to verify recorded skill files |
| `bin/lib/copy-files.cjs::sha256File` | Stable hash for byte-identity assertions | D-08 test compares src vs. dst sha256 for each copied skill file |
| `oto/hooks/__fixtures__/session-start-claude.json` | Phase 5 fixture establishing literal-string scan precedent | Pattern for D-09 fixture (and any STATE-active fixture under `tests/skills/__fixtures__/`) |
| `tests/05-session-start-fixture.test.cjs` | Phase 5 reference for `node:test` + `node:fs` + `spawnSync` + literal-string-scan style | Template for D-08 (install smoke) and D-09 (static analysis) shape |

### Alternatives Considered (and rejected)

| Instead of | Could Use | Why Not |
|------------|-----------|---------|
| Run engine `apply` once over upstream skill subtree | Manually copy + sed each upstream skill | Manual process scales poorly across 27 files and re-introduces Pitfall 15 (literal-identity leakage); the engine has been validated end-to-end with round-trip + coverage manifest |
| Inline `Skill('oto:<name>')` prose in agent bodies | `required_skills:` frontmatter or hook-based skill invocation | Locked by D-05; both alternatives add a mechanism Claude Code does not natively support and break the grep-ability that current agent prompts rely on |
| Three focused phase-scoped tests | Full CI matrix in Phase 6 | Locked by D-07/D-08/D-09; full CI is Phase 10 (CI-04, CI-06, CI-08) and adding it earlier inflates Pitfall 11 (production-grade rigor on a personal tool) |
| Re-implementing skill copy in a new code path | Existing `install.cjs` skills loop at line 22 | The path already exists, has been validated by Phase 3, and `transformSkill` is identity by default — no change needed |

**Installation / invocation:** No new packages. Engine apply, dry-run, and roundtrip are CLI-driven:
```bash
# Dry-run first — confirms zero unclassified matches in the skill subtree
node scripts/rebrand.cjs --dry-run --target foundation-frameworks/superpowers-main/skills/

# Apply (note: --target points at upstream subtree; --out emits to a staging dir; planner moves
# only the 7 retained directories into oto/skills/, since engine walks the whole target by default)
node scripts/rebrand.cjs --apply --target foundation-frameworks/superpowers-main/skills/ \
  --out .oto-rebrand-out/skills/ --force

# Round-trip verification (re-apply emits no changes)
node scripts/rebrand.cjs --verify-roundtrip --target .oto-rebrand-out/skills/
```

**Operational note (verified by reading `engine.cjs::run`):** The engine walks the entire `--target` directory and consults `decisions/file-inventory.json` for verdicts. Files lacking inventory entries are processed via rule-based path rewriting (`applyRelPath`); files with `verdict: "drop"` are skipped (`shouldSkipInventoryEntry`); files with a `target_path` field use it verbatim (`outputRelPathFor`). All 27 retained skill files have explicit `target_path` entries, so the rename is fully driven by the inventory — no map-rule churn needed for the `using-superpowers` → `using-oto` directory move.

---

## Architecture Patterns

### Recommended Project Structure (post-Phase 6)

```
oto/
├── skills/                                # CREATED in Phase 6
│   ├── test-driven-development/
│   │   ├── SKILL.md
│   │   └── testing-anti-patterns.md
│   ├── systematic-debugging/
│   │   ├── SKILL.md
│   │   ├── CREATION-LOG.md
│   │   ├── condition-based-waiting.md
│   │   ├── condition-based-waiting-example.ts
│   │   ├── defense-in-depth.md
│   │   ├── find-polluter.sh                # exec bit must survive copy
│   │   ├── root-cause-tracing.md
│   │   ├── test-academic.md
│   │   ├── test-pressure-1.md
│   │   ├── test-pressure-2.md
│   │   └── test-pressure-3.md
│   ├── verification-before-completion/SKILL.md
│   ├── dispatching-parallel-agents/SKILL.md
│   ├── using-git-worktrees/SKILL.md
│   ├── writing-skills/
│   │   ├── SKILL.md
│   │   ├── anthropic-best-practices.md
│   │   ├── examples/CLAUDE_MD_TESTING.md
│   │   ├── graphviz-conventions.dot
│   │   ├── persuasion-principles.md
│   │   ├── render-graphs.js
│   │   └── testing-skills-with-subagents.md
│   └── using-oto/                         # renamed from upstream using-superpowers/
│       ├── SKILL.md                       # HAND-FIXED after engine apply (D-01/D-02)
│       └── references/
│           ├── codex-tools.md
│           ├── copilot-tools.md
│           └── gemini-tools.md
├── agents/
│   ├── oto-executor.md                    # EDITED: line 58 → Skill('oto:test-driven-development') + verification gate
│   ├── oto-verifier.md                    # EDITED: line 54 → Skill('oto:verification-before-completion') at start
│   └── oto-debugger.md                    # EDITED: line 41 → Skill('oto:systematic-debugging') at start
└── hooks/
    └── oto-session-start                  # NO CHANGE — already reads using-oto/SKILL.md (Phase 5)

tests/
├── 06-skill-structure.test.cjs            # CREATED: D-07
├── 06-installer-skill-copy.test.cjs       # CREATED: D-08
└── 06-using-oto-state-gating.test.cjs     # CREATED: D-09
tests/skills/__fixtures__/                 # OPTIONAL (Claude's discretion):
└── STATE-active.md                        #   sample STATE.md with status: execute_phase
```

### Pattern 1: Engine + Targeted Hand-Fix (locked from Phase 5 D-04..D-09)

**What:** Run the rebrand engine over upstream content, then apply *minimal*, *named*, *literal-string* hand-fixes only to the model-facing surface (the SessionStart hook in Phase 5; `using-oto/SKILL.md` in Phase 6).

**When to use:** Any port of upstream content where (a) the bulk is mechanically rebranded by existing rules, and (b) a small high-visibility surface needs upstream-identity stripping that the engine cannot encode (e.g., voice / framing paragraphs).

**Example (Phase 5 SessionStart for reference):** Phase 5 D-05 did exactly this — engine apply on the upstream session-start hook plus a hand-rewrite of the literal `<EXTREMELY_IMPORTANT>` block. The Phase 5 fixture (`oto/hooks/__fixtures__/session-start-claude.json`) and the matching test (`tests/05-session-start-fixture.test.cjs`) are the exact precedent for Phase 6's `using-oto/SKILL.md` treatment. [VERIFIED: read both files]

```javascript
// Source: tests/05-session-start-fixture.test.cjs (Phase 5 — read to confirm pattern)
// Defense-in-depth: even if both files drift in lockstep, the substring scan catches identity leakage.
const ctx = captured.hookSpecificOutput.additionalContext;
for (const banned of ['superpowers', 'Superpowers', 'gsd-', 'Get Shit Done',
                       'using-superpowers', 'You have superpowers']) {
  assert.equal(ctx.indexOf(banned), -1, `Pitfall 15: upstream identity leaked: ${banned}`);
}
```

### Pattern 2: Inventory-Driven Engine Apply

**What:** Use `decisions/file-inventory.json` as the source of truth for what to port. The engine's `buildInventoryMap` consults each entry's `target_path` (which already specifies `skills/using-oto/SKILL.md` for the Superpowers `using-superpowers/SKILL.md` row). [VERIFIED: read engine.cjs lines 48–58, 230–241]

**When to use:** Any phase that ports a curated subset of upstream content. Avoids per-file decisions during execution; the inventory is the contract.

**Code reference:** `scripts/rebrand/lib/engine.cjs::outputRelPathFor` (line 230) — first checks `inventoryEntryFor(entry.relPath, inventoryByPath).target_path`; falls back to rule-based `applyRelPath` only if absent. All 27 phase-6 skill rows have explicit `target_path` values. [VERIFIED]

### Pattern 3: Inline Prose Skill Invocations (locked by D-05)

**What:** Insert literal `Skill('oto:<skill-name>')` directives in the existing imperative prose flow of agent bodies. No frontmatter changes, no hooks.

**When to use:** Cross-system integration where agent behavior must consistently invoke skills at canonical points and the integration must be grep-able for tests, code review, and future eval.

**Example (the four canonical invocations):**
```markdown
<!-- oto-executor.md, replacing the line 58 generic prose -->
Before writing implementation code, invoke Skill('oto:test-driven-development') and
follow the discipline it specifies. After completing implementation and before
declaring the task done, invoke Skill('oto:verification-before-completion') and
apply its checklist.
```
```markdown
<!-- oto-verifier.md, replacing the line 54 generic prose -->
At the start of the verification pass, invoke Skill('oto:verification-before-completion')
and apply its checklist before scanning for anti-patterns.
```
```markdown
<!-- oto-debugger.md, replacing the line 41 generic prose -->
When starting a debug session, invoke Skill('oto:systematic-debugging') and follow
its root-cause-tracing methodology.
```
(Final wording is Claude's discretion per CONTEXT.md "specific edit points within agent prompt bodies … current line numbers are starting hints".)

### Pattern 4: Phase-Scoped node:test files (locked from Phase 5 D-17/D-18)

**What:** Each Phase 6 test file lives at `tests/06-*.test.cjs`, runs via `node:test`, and asserts a single concern with one or more `test()` blocks. Production CI matrix (snapshot, golden, conversational regression) is Phase 10's job.

**Established naming convention:** `tests/0N-<concern>.test.cjs` for `N ≥ 4`. Phase 5 used `05-build-hooks`, `05-merge-settings`, `05-session-start-fixture`, `05-session-start`, `05-token-substitution`, `05-validate-commit`. Phase 6 should follow.

**Established fixture convention:** `tests/fixtures/phase-NN/...` for fixtures shared across multiple tests; `oto/hooks/__fixtures__/...` for fixtures co-located with the artifact under test. For Phase 6's optional STATE-active fixture, either works; co-locating under `tests/skills/__fixtures__/` is consistent with the in-test-tree style and avoids polluting the shipped `oto/skills/` payload. [Recommendation: `tests/skills/__fixtures__/STATE-active.md` if shipped.]

### Anti-Patterns to Avoid

- **Bypass the engine and hand-edit `superpowers:` → `oto:` references in skill markdown** — re-introduces Pitfall 15 and skips the round-trip / coverage-manifest validation. Engine first; hand-fix only for `using-oto/SKILL.md`.
- **Modify `rename-map.json` to add a new `path` rule for `using-superpowers` → `using-oto`** — unnecessary; the inventory `target_path` already drives the directory rename. Adding a rule risks downstream drift if other locations later need different mappings.
- **Add `required_skills:` frontmatter or hook-based skill invocation** — explicitly rejected by D-05.
- **Ship the four cross-runtime references files (`codex-tools.md`, `copilot-tools.md`, `gemini-tools.md`) with hand edits** — they contain only tool-name mappings, no upstream identity strings; engine pass should be clean. Inspect via dry-run, do not pre-edit.
- **Run engine apply across the whole `foundation-frameworks/superpowers-main/` tree** — would produce a much larger output than this phase needs and risks accidental writes outside `oto/skills/`. Scope `--target` to `foundation-frameworks/superpowers-main/skills/` (the engine treats this subtree-rooted target correctly, per `engine.cjs::run` reading `path.resolve(opts.target)`).
- **Promote D-09 to a live conversational test in Phase 6** — explicitly deferred to Phase 10 (CI-08). Phase 6 is static analysis only.
- **Edit `oto/hooks/oto-session-start`** — Phase 5 already wired it to read `oto/skills/using-oto/SKILL.md` defensively; once the file exists, the fallback path stops triggering automatically. No hook change needed.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Skill subtree rebrand | Per-file `sed` / hand-edit pass | `scripts/rebrand.cjs apply` | Rule-typed engine validated in Phase 2; round-trip and coverage manifest enforce correctness |
| Skill installation copy | New `installSkills()` function | Existing `install.cjs` skills loop (line 22) | Already wired and validated in Phase 3 |
| Skill source/target path mapping per runtime | Hard-coded path constants | `runtime-claude.cjs::sourceDirs.skills` + `targetSubdirs.skills` | Already mapped (lines 171, 181) |
| Recursive directory copy with mode preservation | `cp -r` shell + chmod | `bin/lib/copy-files.cjs::copyTree` | Uses `fsp.cp({ dereference: false })`; mode bits (incl. exec bit on `find-polluter.sh`) preserved by Node `fs.cp` |
| Install-marker JSON | New schema | `bin/lib/install-state.cjs::{readState, writeState}` | Already records every copied file with sha256 (`fileEntries` in `installRuntime`); D-08 test reads this JSON |
| Frontmatter parsing in tests | YAML library | Hand-rolled extractor (Phase 1 pattern: simple regex on `---` fences for `name:` and `description:`) | Skill `SKILL.md` files have flat frontmatter (no nesting); a regex extractor of `^([a-z_]+):\s*(.+)$` between `---` fences is sufficient and adds no dependency |
| STATE.md gating prose check | NLP / semantic match | Substring + line-anchor grep in test (D-09 explicitly says "static fixture check, not a live conversational evaluation") | Static-analysis is the contract |
| Live conversational regression (skill auto-trigger) | Now | Phase 10 / CI-08 | Locked deferral |

**Key insight:** Phase 6 has *zero* new infrastructure surface. Every tool needed already exists; the work is content (apply-engine output for 6 skills, hand-fix one skill, edit three agents) plus three small static-analysis tests.

---

## Runtime State Inventory

Phase 6 is a *port* but its mutations are bounded: it creates new files under `oto/skills/`, edits three agent prompt files at known line numbers, and adds three test files under `tests/`. The five categories are explicitly addressed:

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — Phase 6 ships repo content only; no databases, datastores, or runtime caches | None |
| Live service config | None for Phase 6 itself. **Note for downstream:** Claude Code's `Skill` tool reads `<configDir>/skills/` at session start and may cache discovered skills in-process for the session lifetime. After `oto install --claude`, users with an *existing* live Claude Code session must restart it for the seven new skills to register. This is documented Claude Code behavior, not Phase-6-introduced. [ASSUMED — based on Skill tool's documented session-start discovery model; planner may flag as an explicit success-criterion in PLAN] | Document in PLAN as user instruction: "restart Claude Code after install to pick up new skills" — no code change |
| OS-registered state | None — no Task Scheduler, launchd, systemd, or pm2 entries created or modified | None |
| Secrets / env vars | None — no env-var renames; the `skill_ns` rule (`superpowers:` → `oto:`) only acts on `Skill('superpowers:*')` literals in markdown bodies | None |
| Build artifacts / installed packages | `oto/hooks/dist/` is regenerated by `scripts/build-hooks.js` (Phase 5). Phase 6 does **not** touch hooks, so no rebuild is required for skill changes alone. The runtime-claude adapter copies from `oto/skills/` directly (no `dist` step for skills). After install on machines with a prior oto install, `bin/lib/install.cjs` removes orphaned files via the `priorState.files` diff (lines 101–107) — no stale-skill state survives a re-install. [VERIFIED: read install.cjs lines 100–107] | None |

**Verified by:** Reading `bin/lib/install.cjs::installRuntime` (lines 67–107), confirming the install loop walks `SRC_KEYS` (which includes `'skills'`), copies new files, transforms via `transformSkill`, and removes any prior-install file paths not in the new source set.

---

## Common Pitfalls

> Project-level `.planning/research/PITFALLS.md` enumerates 19 pitfalls. The two that directly bind Phase 6 are 10 and 15. Phase-6-specific pitfalls (executable-bit loss, payload drift, name collision) are surfaced from CONTEXT.md and confirmed against the codebase.

### Pitfall A: Upstream Identity Leakage in `using-oto/SKILL.md` (PITFALLS Pitfall 15)

**What goes wrong:** Engine apply rebrands `superpowers:` → `oto:` and similar but cannot scrub upstream contributor-framing prose ("94% PR rejection rate", "your job is to protect your human partner from PR rejection") that is meaningless in a personal-use fork. Without a hand-fix pass, `using-oto/SKILL.md` ships with upstream voice intact and Claude Code injects it inline at every SessionStart.

**Why it happens:** This is content the rebrand engine has no rule for — it's voice and framing, not identifier. The engine correctly does not touch it.

**How to avoid:** D-01/D-02 hand-fix pass + D-09 static-analysis assertion in `tests/06-using-oto-state-gating.test.cjs`. The test should ALSO scan for the same banned-substring set as `tests/05-session-start-fixture.test.cjs` line 30: `superpowers`, `Superpowers`, `gsd-`, `Get Shit Done`, `using-superpowers`, `You have superpowers`.

**Warning signs:** Live SessionStart that says "you have superpowers" (would happen if SessionStart fixture and `using-oto/SKILL.md` drift apart and the SessionStart fixture wins). Worth running `bash oto/hooks/oto-session-start` manually post-Phase-6 and re-confirming the Phase 5 fixture deep-equals.

### Pitfall B: Skill / Command Name Collision (Phase-6-specific)

**What goes wrong:** `oto:dispatching-parallel-agents` collides with a hypothetical future `/oto-dispatching-parallel-agents` command — the user's intent ("dispatch parallel agents") could be ambiguous between the skill and the command at the routing layer.

**Why it happens:** Skills are namespaced (`oto:`); commands are slash-prefixed (`/oto-`). They live in separate trees but share semantic territory.

**How to avoid:** D-07 explicitly checks: for every skill `<name>`, no `oto/commands/oto-<name>.md` file exists. The existing 28 `/oto-*` workflows from Phase 4 are stable; the seven Phase 6 skill names (`test-driven-development`, `systematic-debugging`, `verification-before-completion`, `dispatching-parallel-agents`, `using-git-worktrees`, `writing-skills`, `using-oto`) do not match any existing command name. [VERIFIED: cross-checked Phase 4 WF-01..WF-30 against the seven skill names — no collisions]

**Warning signs:** A new command added in Phase 7+ matching a skill name — the D-07 collision test continues to enforce this going forward.

### Pitfall C: Executable-Bit Loss on `find-polluter.sh` (Phase-6-specific, mirrors Pitfall 5)

**What goes wrong:** A copy that loses mode 100755 on `find-polluter.sh` ships a non-executable shell script; users hitting the polluter-find workflow get permission errors.

**Why it happens:** Some copy mechanisms (e.g., naïve `fs.copyFile` without mode propagation, JSON-pickle/serialize round-trips, or git-attributes mishandling) drop the exec bit. Pitfall 5 in PITFALLS.md ("the mode-644 trap") is the historical instance — Phase 2 install-smoke catches it for hooks; Phase 6 must catch it for the one shell script in skill payload.

**How to avoid:** D-08 explicitly verifies executable bit preservation on `oto/skills/systematic-debugging/find-polluter.sh` after install. Implementation: `fs.statSync(targetPath).mode & 0o111` non-zero. The current `copy-files.cjs::copyTree` uses `fsp.cp({ dereference: false })`, which preserves mode bits — this verification confirms behavior, not adds new behavior. [VERIFIED: read copy-files.cjs::copyTree; mode `100755` confirmed on upstream source]

**Warning signs:** D-08 test fails on `mode & 0o111`. Indicates upstream-side change (e.g., chmod stripped) or a copy-mechanism regression.

### Pitfall D: Payload Drift — Engine Touches `.ts` / `.sh` / `.dot` / `.js` (Phase-6-specific)

**What goes wrong:** Engine processes a non-markdown payload file (e.g., `condition-based-waiting-example.ts`) and an identifier rule unexpectedly matches an in-code symbol (`gsdSomething`, `superpowersThing`), corrupting the example.

**Why it happens:** Engine `applyStringRules` runs on the file content regardless of extension; only `package` rules are gated by `.applies(relPath)` (which checks for `package.json` filename). The `coverage-cleanup` patterns in `applyCoverageCleanup` are specifically designed to catch identifier-shaped tokens (e.g., `(?<![A-Za-z])gsd(?=[A-Z_\d-])`).

**How to avoid:** Locked by CONTEXT.md "engine should not touch identifiers in source code unless they match a rebrand rule … planner verifies via the engine's per-rule classification report on dry-run before apply." Concretely: run `node scripts/rebrand.cjs --dry-run --target foundation-frameworks/superpowers-main/skills/` and inspect `reports/rebrand-dryrun.md` for any matches inside `.ts`/`.sh`/`.dot`/`.js` files. If matches found that would corrupt example code, escalate (likely add to the do-not-rename allowlist). [VERIFIED: engine writes both JSON and Markdown reports under `reports/`]

**Warning signs:** Dry-run output shows matches inside `find-polluter.sh`, `condition-based-waiting-example.ts`, `render-graphs.js`, or `graphviz-conventions.dot`.

### Pitfall E: STATE.md Gating Sentence Drift (Phase-6-specific)

**What goes wrong:** `using-oto/SKILL.md` is hand-edited months after Phase 6 ships and the deferral sentence is paraphrased away ("just defer to active workflows" instead of the locked sentence). The static-analysis test (D-09) loosens to compensate. Production behavior degrades silently.

**Why it happens:** Single-line directives are easy to "improve" without realizing they were the contract.

**How to avoid:** D-09 test asserts on a *grep-able* substring or a structured marker comment. Recommended form (Claude's discretion): wrap the directive in a fenced HTML comment or a recognizable section header so the test anchor is robust to surrounding edits but breaks if the directive is removed. Example marker pattern:
```markdown
## Workflow Deference

<!-- oto:state-gating-directive -->
Before invoking any other oto skill on suspicion, read `.oto/STATE.md`.
If the `status:` frontmatter field shows an active phase
(`execute_phase`, `plan_phase`, `debug`, or `verify`), suppress
ambient skill auto-fire — only canonical agent invocations and
explicit user `Skill()` calls fire.
<!-- /oto:state-gating-directive -->
```
Test asserts presence of both marker comments AND substring `.oto/STATE.md` AND substring `suppress` (or planner-chosen anchors).

**Warning signs:** Test starts being routinely skipped, marked todo, or has its anchors widened.

### Pitfall F: Skill Auto-Loading Conflicts With Command-Driven Flow (PITFALLS Pitfall 10)

**What goes wrong:** Without the D-03/D-04 STATE.md gating prose, `oto:using-oto`'s "1% rule" can trigger skill auto-fire mid-`/oto-execute-phase` and derail the phase machine.

**How to avoid:** D-03/D-04 are exactly the mechanism the project-level pitfall calls for ("the using-superpowers-equivalent must be retuned to *defer* to oto commands when they're active"). Phase 6 satisfies the deferred fix.

**Warning signs:** Live skill-auto-trigger conversational regression test in Phase 10 (CI-08) catches drift. Phase 6's static check (D-09) is the precursor.

---

## Code Examples

Verified patterns from existing oto code:

### Example 1: Inventory-driven engine target_path resolution

```javascript
// Source: scripts/rebrand/lib/engine.cjs (lines 230–241)
function outputRelPathFor(entry, map, outRoot, inventoryByPath) {
  const inventoryEntry = inventoryEntryFor(entry.relPath, inventoryByPath);
  const targetPath = inventoryEntry && inventoryEntry.target_path;
  let outRelPath = targetPath || applyRelPath(entry.relPath, map);
  outRelPath = outRelPath.split(path.sep).join('/');
  if (path.basename(outRoot) === 'oto' && outRelPath.startsWith('oto/')) {
    outRelPath = outRelPath.slice('oto/'.length);
  }
  return outRelPath;
}
```
This is the mechanism that maps `skills/using-superpowers/SKILL.md` → `skills/using-oto/SKILL.md` (via `target_path` in inventory). No rename-map change required.

### Example 2: Install-time skill copy (already wired)

```javascript
// Source: bin/lib/install.cjs (lines 19–22, 30–34, 67–98)
const SRC_KEYS = ['commands', 'agents', 'skills', 'hooks', 'workflows',
                  'references', 'templates', 'contexts'];
const TRANSFORM_KEY = { commands: 'transformCommand', agents: 'transformAgent',
                        skills: 'transformSkill', hooks: 'transformSkill' };

// In installRuntime:
for (const srcKey of SRC_KEYS) {
  const srcAbs = path.join(repoRoot, adapter.sourceDirs[srcKey]);
  const dstAbs = path.join(configDir, adapter.targetSubdirs[srcKey]);
  const result = await copyTree(srcAbs, dstAbs);
  // ... transformFn applied, sha256 recorded in fileEntries
}
```
For Claude: `adapter.sourceDirs.skills === 'oto/skills'`, `adapter.targetSubdirs.skills === 'skills'`, `adapter.transformSkill` is identity. The D-08 test exercises this exact path with a temp `configDir`.

### Example 3: Phase 5 fixture-test pattern (template for Phase 6)

```javascript
// Source: tests/05-session-start-fixture.test.cjs
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const REPO_ROOT = path.resolve(__dirname, '..');

test('phase-06 using-oto state-gating directive present', () => {
  const skill = fs.readFileSync(
    path.join(REPO_ROOT, 'oto/skills/using-oto/SKILL.md'), 'utf8');
  assert.match(skill, /<!-- oto:state-gating-directive -->/);
  assert.ok(skill.includes('.oto/STATE.md'));
  assert.ok(skill.includes('suppress'));
  // Defense-in-depth literal-string scan (mirrors Phase 5 line 30)
  for (const banned of ['superpowers', 'Superpowers', 'using-superpowers',
                         'You have superpowers']) {
    assert.equal(skill.indexOf(banned), -1, `Pitfall 15: identity leaked: ${banned}`);
  }
});
```

### Example 4: Install marker JSON contract (D-08 input)

```javascript
// Source: bin/lib/install.cjs (lines 128–142)
writeState(statePath, {
  version: 1,
  oto_version: OTO_VERSION,
  installed_at: new Date().toISOString(),
  runtime: adapter.name,
  config_dir: configDir,
  files: fileEntries,        // [{ path: 'skills/<name>/<file>', sha256 }, ...]
  instruction_file: { path, open_marker, close_marker },
  hooks: { version: OTO_VERSION },
});
```
D-08 test asserts the `files` array contains a `path` entry for every expected skill file (e.g., 27 paths matching the inventory) and that each `sha256` matches the source file.

---

## State of the Art

> Phase 6 reuses existing in-tree tooling exclusively. There is no upstream library decision to make.

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hand-rebrand via sed/replace | `scripts/rebrand.cjs` rule-typed engine | Phase 2 (REB-01..06) | Mechanical, validated, reversible |
| Sequential per-runtime install logic | Adapter pattern (`runtime-claude.cjs`, etc.) | Phase 3 (INS-02) | New runtimes plug in without forking install.js |
| Fragmented SessionStart hooks (GSD + Superpowers) | Single `oto-session-start` consolidated bash hook | Phase 5 (HK-01, ADR-04) | Phase 6 has a ready-made entry point that already calls `using-oto/SKILL.md` |
| Dropped agents (debug-session-manager, pattern-mapper, etc.) | Three retained agents directly invoke skills | Phase 4 (ADR-07) + Phase 6 (D-05/D-06) | Smaller surface, deterministic invocation points |

**Deprecated / outdated (do not resurrect):**
- Seven dropped Superpowers skills (brainstorming, writing-plans, executing-plans, subagent-driven-development, requesting-code-review, receiving-code-review, finishing-a-development-branch) — workflow-wins per ADR-03; CONTEXT.md "Deferred Ideas" forbids resurrection in Phase 6.
- Hook-based or frontmatter-based skill invocation — explicitly rejected by D-05.
- Live conversational test in Phase 6 — deferred to Phase 10 / CI-08.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Claude Code's `Skill` tool re-reads `<configDir>/skills/` on session start; users with an existing session must restart to register newly installed skills | Runtime State Inventory — Live service config | If Claude Code caches skill discovery across multiple sessions or has a hot-reload, the user instruction in PLAN is unnecessary but harmless. If discovery is *less* aggressive than session-start (e.g., only on `Skill` tool first invocation), behavior still works but the timing of "skill becomes visible" differs. Either failure mode is benign for v0.1.0. |

All other claims in this research are tagged `[VERIFIED]` (confirmed via Read/Bash on in-tree files) or `[CITED]` (sourced from `.planning/research/PITFALLS.md` or upstream `CLAUDE.md`).

**Items needing user confirmation before locking:** None. CONTEXT.md already locks every decision in scope; the one assumption above is a documentation question (PLAN may include or omit the "restart Claude Code after install" instruction at the planner's discretion).

---

## Open Questions

None blocking the planner. The four enumerated discretion items in CONTEXT.md ("Claude's Discretion") are decisions for the planner / implementer to make at planning time, not research gaps:

1. Test filenames (`06-NN-*.test.cjs` per Phase 5 convention).
2. Exact regex / matcher pattern for the D-09 gating sentence (recommended marker-comment style above).
3. Whether to consolidate D-07 into one file or split (recommended: one file, two `test()` blocks).
4. Final wording of the four `Skill()` directives in agent prompts (line numbers are starting hints; planner picks the most natural insertion point).

---

## Environment Availability

> Phase 6 has no external dependencies beyond Node.js 22+ and the in-tree scripts. All tooling required is already validated by prior phases.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All scripts and tests | ✓ | ≥22 (project engines field; CI tests on 22 + 24) | — |
| `node:test` | Three Phase 6 test files | ✓ | Built-in (≥18, fully featured ≥22) | — |
| `scripts/rebrand.cjs` | Engine apply on skill subtree | ✓ | Phase 2 (validated end-to-end) | — |
| `decisions/file-inventory.json` | Engine input for `target_path` resolution | ✓ | Phase 1 (27 phase_owner=6 rows) | — |
| `bin/lib/install.cjs` + `runtime-claude.cjs` | D-08 install copy smoke | ✓ | Phase 3 (skills category wired at lines 22, 32, 171, 181) | — |
| `oto/hooks/oto-session-start` | Reads `using-oto/SKILL.md` post-Phase-6 | ✓ | Phase 5 (defensive fallback active until SKL-07 file is created) | — |

**Missing dependencies with no fallback:** None.
**Missing dependencies with fallback:** None.

---

## Validation Architecture

> `workflow.nyquist_validation: true` in `.planning/config.json`. This section is the input for `06-VALIDATION.md` (Step 5.5).

### Test Framework

| Property | Value |
|----------|-------|
| Framework | `node:test` (built-in, Node ≥22) |
| Config file | none — runner is `scripts/run-tests.cjs` (already populated by Phase 1/2) |
| Quick run command | `node scripts/run-tests.cjs --filter "06-"` |
| Full suite command | `node scripts/run-tests.cjs` |
| Estimated runtime | ~3–5 seconds (3 focused tests; full suite ~30s) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SKL-01 | Skill `oto:test-driven-development` exists with parseable frontmatter (`name:`, `description:`); 2 files present (`SKILL.md`, `testing-anti-patterns.md`) | unit (structure) | `node --test tests/06-skill-structure.test.cjs` | ❌ Wave 0 |
| SKL-02 | Skill `oto:systematic-debugging` exists with parseable frontmatter; 11 files present including `find-polluter.sh` | unit (structure) | `node --test tests/06-skill-structure.test.cjs` | ❌ Wave 0 |
| SKL-03 | Skill `oto:verification-before-completion` exists with parseable frontmatter | unit (structure) | `node --test tests/06-skill-structure.test.cjs` | ❌ Wave 0 |
| SKL-04 | Skill `oto:dispatching-parallel-agents` exists with parseable frontmatter | unit (structure) | `node --test tests/06-skill-structure.test.cjs` | ❌ Wave 0 |
| SKL-05 | Skill `oto:using-git-worktrees` exists with parseable frontmatter | unit (structure) | `node --test tests/06-skill-structure.test.cjs` | ❌ Wave 0 |
| SKL-06 | Skill `oto:writing-skills` exists with parseable frontmatter; 7 files present | unit (structure) | `node --test tests/06-skill-structure.test.cjs` | ❌ Wave 0 |
| SKL-07 | Skill `oto:using-oto` exists with parseable frontmatter; 4 files present (`SKILL.md` + 3 references); STATE.md gating directive present; no upstream-identity literals leaked | unit (structure + static-analysis) | `node --test tests/06-skill-structure.test.cjs && node --test tests/06-using-oto-state-gating.test.cjs` | ❌ Wave 0 |
| SKL-07 (second axis) | Installer copies `oto/skills/*` recursively with byte-identical content; executable bit preserved on `find-polluter.sh`; install marker JSON records skill files | integration (smoke) | `node --test tests/06-installer-skill-copy.test.cjs` | ❌ Wave 0 |
| SKL-08 (axis 1) | `oto/agents/oto-executor.md` body contains `Skill('oto:test-driven-development')` and `Skill('oto:verification-before-completion')` literal strings | unit (static-analysis) | `node --test tests/06-skill-structure.test.cjs` (or split into `tests/06-agent-invocations.test.cjs`) | ❌ Wave 0 |
| SKL-08 (axis 2) | `oto/agents/oto-verifier.md` body contains `Skill('oto:verification-before-completion')` | unit (static-analysis) | same | ❌ Wave 0 |
| SKL-08 (axis 3) | `oto/agents/oto-debugger.md` body contains `Skill('oto:systematic-debugging')` | unit (static-analysis) | same | ❌ Wave 0 |
| SKL-08 (axis 4) | No skill-name / command-name collision: for every skill `<name>`, no `oto/commands/oto-<name>.md` file exists | unit (collision) | `node --test tests/06-skill-structure.test.cjs` | ❌ Wave 0 |
| Manual-only | Live skill auto-trigger when STATE.md is `complete`; deferral when STATE.md shows active phase | manual / Phase 10 (CI-08) | n/a — deferred per D-09 + CONTEXT.md | n/a |

### Sampling Rate

> Nyquist principle: every test axis sampled at a rate that exceeds the rate at which it can change.

- **Per task commit:** `node scripts/run-tests.cjs --filter "06-"` (≤5 s)
- **Per wave merge:** `node scripts/run-tests.cjs` (full suite ~30 s)
- **Phase gate:** Full suite green before `/oto-verify-work`
- **Per-axis sampling design:**
  - **Skill structure:** all 7 skills sampled (no subset — D-07 mandates "all 7 skill directories"). Rate: per-task and per-merge.
  - **Install copy fidelity:** 27 files (every file in `phase_owner: 6`), sha256 + executable bit on the one `.sh`. Rate: per-merge (test runs install in temp dir; ~1 s).
  - **STATE.md gating prose:** single canonical fixture (`using-oto/SKILL.md` itself); no fixture STATE.md needed if test asserts only on the directive's presence/literal anchors. If STATE-active fixture shipped, one canonical positive fixture is sufficient (Phase 10 expands to multi-state).
  - **Agent invocation prose:** all 3 agents × 4 invocation directives sampled. Single test scans each agent file.
- **Max feedback latency:** 5 s per task, 30 s per merge.

### Wave 0 Gaps

- [ ] `tests/06-skill-structure.test.cjs` — covers SKL-01..07 (structure) + SKL-08 (collision + agent invocations); planner may split agent invocations into a separate file at discretion
- [ ] `tests/06-installer-skill-copy.test.cjs` — covers SKL-07 install fidelity (D-08)
- [ ] `tests/06-using-oto-state-gating.test.cjs` — covers SKL-07 deferral directive (D-09) + literal-string-leak defense (Pitfall 15)
- [ ] (optional, planner discretion) `tests/skills/__fixtures__/STATE-active.md` — sample STATE.md for D-09 if planner chooses to test the gating prose against a real fixture

*(No framework install needed; `node:test` is built-in.)*

---

## Sources

### Primary (HIGH confidence)

- `decisions/file-inventory.json` — 27 `phase_owner: 6` rows; per-file `target_path` for `using-superpowers/*` → `using-oto/*` rename
- `scripts/rebrand/lib/engine.cjs` — `outputRelPathFor` (lines 230–241), inventory consultation, `applyTree`, dry-run reports
- `scripts/rebrand.cjs` — CLI entry, dry-run / apply / verify-roundtrip modes
- `bin/lib/install.cjs` — `installRuntime` skills loop (lines 22, 32, 67–107), state JSON contract (lines 128–142)
- `bin/lib/runtime-claude.cjs` — `sourceDirs.skills` (line 171), `targetSubdirs.skills` (line 181), `transformSkill` identity (line 197)
- `bin/lib/copy-files.cjs` — `copyTree` using `fsp.cp({ dereference: false })` (lines 30–58)
- `oto/agents/oto-executor.md` line 58 — exact replacement target text
- `oto/agents/oto-verifier.md` line 54 — exact replacement target text
- `oto/agents/oto-debugger.md` line 41 — exact replacement target text
- `oto/hooks/oto-session-start` — Phase 5 hook reading `oto/skills/using-oto/SKILL.md` with defensive fallback (lines 21–26)
- `oto/hooks/__fixtures__/session-start-claude.json` — Phase 5 SessionStart locked fixture (the identity-block string the using-oto SKILL.md must align with)
- `tests/05-session-start-fixture.test.cjs` — Phase 5 literal-string-scan + fixture-test pattern (template for Phase 6)
- `foundation-frameworks/superpowers-main/skills/*` — engine input; 27 files across 7 retained directories
- `foundation-frameworks/superpowers-main/skills/systematic-debugging/find-polluter.sh` — mode 100755 (verified via `stat`)
- `foundation-frameworks/superpowers-main/skills/using-superpowers/SKILL.md` — exact upstream voice/framing to strip in D-02 hand-fix
- `foundation-frameworks/superpowers-main/CLAUDE.md` — confirms upstream contributor framing ("94% PR rejection rate", "your job is to protect your human partner from PR rejection") that must be stripped per D-02
- `rename-map.json` — confirms `skill_ns: superpowers: → oto:` rule, no path rule for `using-superpowers` (rename driven by inventory `target_path`)
- `.planning/research/PITFALLS.md` — Pitfalls 10 (skill-vs-command auto-trigger), 15 (literal identity leakage)
- `.planning/phases/05-hooks-port-consolidation/05-VALIDATION.md` — Phase 5 Validation Architecture template (mirrored above)
- `.planning/phases/05-hooks-port-consolidation/05-RESEARCH.md` — Pattern 1 (engine + hand-fix) precedent

### Secondary (MEDIUM confidence)

- ADR-03 / ADR-06 / ADR-07 — referenced in CONTEXT.md, drive the routing rule, namespace, and agent-trim choices that bound this phase
- Node.js docs on `fs.cp` mode preservation — supports the "executable bit survives copy" claim with `dereference: false`

### Tertiary (LOW confidence)

- A1 in Assumptions Log: Claude Code skill discovery cadence (treated as ASSUMED; planner can include or omit the user instruction in PLAN)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every tool is in-tree, used by prior phases, and reads correctly when traced
- Architecture: HIGH — the four patterns (engine + hand-fix, inventory-driven, inline prose, phase-scoped node:test) are all locked precedents with running examples
- Pitfalls: HIGH — every pitfall has a documented avoidance mechanism and a corresponding test in the locked Phase 6 test surface
- User constraints: HIGH — copied verbatim from CONTEXT.md
- Validation Architecture: HIGH — sampling rate per axis is explicit, all SKL-NN requirements have test rows, no axis is unsampled

**Research date:** 2026-05-01
**Valid until:** 2026-05-31 (30 days for stable in-tree tooling; the only external dependency is upstream Superpowers which is read-only via `foundation-frameworks/`)
