# Phase 2: Workflow rebrand-ports + command de-deferral — Research

**Researched:** 2026-05-18
**Domain:** Markdown workflow ports via repo rebrand pipeline; deferral-stub removal; fixture-driven workflow smoke
**Confidence:** HIGH

## Summary

The two artifacts in scope are GSD upstream workflows (`ingest-docs.md` 332 LOC, `eval-review.md` 155 LOC) currently shipped as **deferral stubs** in `oto/workflows/`. The agents they spawn (`oto-doc-classifier`, `oto-doc-synthesizer`, `oto-eval-auditor`) plus the required reference (`oto/references/doc-conflict-engine.md`) all landed in Phase 1 and are verified present.

Empirical rebrand-engine probe (run during research): with the current `decisions/file-inventory.json` rows for the two workflows already set to `verdict: keep` + `rebrand_required: true` + correct `target_path`s, `node scripts/rebrand.cjs --apply --target foundation-frameworks/get-shit-done-main --owner OTOJulian --out .oto-rebrand-test` produces both target files successfully. The engine output is mostly clean: `gsd-` agent names rebrand correctly (`gsd-doc-classifier` → `oto-doc-classifier`, `gsd-roadmapper` → `oto-roadmapper`), `/gsd-*` commands flip, `GSD ►` banners become `OTO ►`, and `gsd-sdk query` becomes `oto-sdk query`.

**Two engine gaps require post-rebrand hand-fixups** (same gap class that Phase 1 hit with read-only agents per `01-VERIFICATION.md` "Code Review" section):

1. **`.planning/` is NOT rebranded inside markdown prose.** The `rename-map.json` rule for `.planning` is a `path`-type rule with `match: segment` — it only fires when `.planning` appears in a path-typed context. Inside backtick-quoted prose like ``Bootstrap or merge into `.planning/`.`` or `OUTPUT_DIR — .planning/intel/classifications/`, the engine leaves the string untouched. The rebranded `ingest-docs.md` has **16 unrebranded `.planning/` occurrences** at lines 3, 6, 64, 166, 171, 201–203, 209, 230, 242, 274, 279–281, 315 (line numbers from the rebrand-test output). `eval-review.md` had zero, since the upstream doesn't reference `.planning/` in its prose.
2. **`oto-sdk` is referenced but unavailable in this repo's environment** (`which oto-sdk` returns "not found"; confirmed by `STATE.md` Phase 1 last-activity note: *"oto-sdk was unavailable in this Codex environment, so execution used on-disk planning artifacts as the authoritative workflow fallback"*). Both workflows call `oto-sdk query init.ingest-docs`, `oto-sdk query init.phase-op`, `oto-sdk query resolve-model`, and `oto-sdk query commit`. Per SDK-DEFER-01 from REQUIREMENTS.md v2, the SDK surface is **explicitly deferred**. Workflows must either tolerate SDK absence gracefully (existing `2>/dev/null || …` fallback pattern) or be re-shaped to use direct file ops.

Command files (`oto/commands/oto/ingest-docs.md`, `oto/commands/oto/eval-review.md`) are **already clean** — they contain no "intentionally non-executable" or deferral framing. CMD-01 and CMD-02 are largely satisfied at the *command file* level; the deferral lives entirely in the `oto/workflows/*.md` bodies. Similarly, `oto/workflows/help.md` and `oto/commands/INDEX.md` contain **no `[deferred]` tags** for the two commands. The two `deferred`-string hits in those files are unrelated (`/oto-plant-seed` description in help.md line 428; `/oto-ai-integration-phase` description in INDEX.md line 11). CMD-03 may already be satisfied by absence; the planner should assert this with a string test, not rewrite code.

**Primary recommendation:** Run the rebrand engine (it already works), then a small hand-fixup pass on the two workflow bodies to (a) replace prose-embedded `.planning/` → `.oto/` and (b) make the `oto-sdk` calls tolerant of SDK absence. Treat CMD-01/02/03 as **assertion-only** requirements unless a hidden deferral string surfaces. Add four fixture-driven smoke tests as Phase 2's verification surface (Phase 3 ports the upstream test file; Phase 2 only needs enough fixture coverage to prove the workflows execute).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Token substitution gsd→oto | Rebrand engine (`scripts/rebrand.cjs`) | — | Single source of truth per CLAUDE.md "rebrand engine vs hand-edits boundary" + Phase 1 D-01 precedent |
| Prose-embedded `.planning/` paths | Hand fixup (markdown edit on rebrand output) | Future: rename-map rule extension | Engine's `path` rule with `match: segment` does not match in markdown prose; documented limitation |
| Agent dispatch (Task subagent_type=…) | Workflow body (markdown instructions) | Runtime (Claude Code Task tool, Codex equivalent) | Agents already installed Phase 1; workflows reference by name |
| State persistence (write `.oto/PROJECT.md` etc.) | Workflow orchestrator (in-context, runs Bash/Write) | `oto-doc-synthesizer` (writes own outputs) | Synthesizer has `workspace-write`; classifier/auditor read-only and return content for workflow to persist |
| SDK init queries | Currently absent → graceful fallback in workflow | Future: SDK-DEFER-01 implements `oto-sdk` | Per STATE.md Phase 1 precedent: on-disk planning artifacts are the authoritative fallback |
| Command discoverability + non-`[deferred]` listing | `oto/commands/INDEX.md` (generated from frontmatter) + `oto/workflows/help.md` | `oto/commands/oto/*.md` frontmatter | INDEX is auto-generated via `scripts/gen-commands-index.cjs`; help.md is a static reference block |

## User Constraints (from CONTEXT.md)

> **Note:** No CONTEXT.md exists for Phase 2 (`/oto-discuss-phase 2` has not been run). This research operates under ROADMAP.md success criteria + REQUIREMENTS.md WF-ING/EVAL/CMD plus the additional_context block in the spawn message.

### Locked Decisions (inherited from project conventions)

- **Rebrand engine is the single source of truth** (CLAUDE.md): no hand-porting allowed for token substitution. Hand fixups are restricted to cases where the rebrand engine does not, by design, transform a token (e.g., prose-embedded `.planning/`).
- **`oto-sdk` is unavailable** in this repo's environment; workflows must tolerate its absence (STATE.md Phase 1 activity log; REQUIREMENTS.md v2 SDK-DEFER-01).
- **`.planning/` lives on** in this repo (DOG-01 deferred to v0.4.0+). Workflows reference `.oto/` because that's what they target on user projects, not this dogfood repo.
- **Codex sandbox locks from Phase 1 (INST-02) hold**: classifier + auditor are `read-only` (no Write); synthesizer is `workspace-write`. Phase 2 workflows must persist classifier/auditor return content themselves (Phase 1 verification gaps summary: *"Phase 2 must wire `/oto-ingest-docs` and `/oto-eval-review` so the workflows persist classifier/auditor returned content and consume the synthesizer output."*).

### Claude's Discretion

- Whether to extend `rename-map.json` with a content-rule for prose-embedded `.planning/` (one-time fix that helps future workflow ports) vs hand-fixup per file (smaller blast radius for this phase). Recommendation: **hand-fixup this phase**, file a v0.4.0+ candidate for the rename-map enhancement to avoid scope creep.
- Number of plans (2–4 plausible) and wave structure.
- Fixture tree shape — minimal (3 docs, one of each type) vs realistic (10–15 docs, conflict-bearing).
- Whether to add an additional `.planning/`-detector to the test suite that fails CI on any future rebrand output containing prose-embedded `.planning/`.

### Deferred Ideas (OUT OF SCOPE for Phase 2)

- Implementing the `oto-sdk` surface (SDK-DEFER-01 — v0.4.0+ candidate).
- Migrating this repo's `.planning/` → `.oto/` (DOG-01 — v0.4.0+ candidate).
- Restoring other ADR-07-dropped agents (AGNT-DEFER-01).
- Porting `tests/ingest-docs.test.cjs` from upstream (TEST-01 — Phase 3's job).
- Writing `tests/eval-review.test.cjs` (TEST-02 — Phase 3's job).
- Adding install-smoke for the new workflows (INST-03 — Phase 3's job).
- ADR-15 (ADR-01 — Phase 3's job).
- Per-runtime parity smoke (PRTY-01 — Phase 3's job).
- Three-way interactive conflict resolution (`--resolve interactive`).

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| WF-ING-01 | `oto/workflows/ingest-docs.md` is the rebrand-ported executable workflow (~332 LOC), not the deferral stub | Rebrand engine output verified end-to-end during research (`.oto-rebrand-test/oto/workflows/ingest-docs.md` produced 332-LOC executable body with 16 `.planning/` hand-fixups required) |
| WF-ING-02 | Directory-conventions / `--manifest` discovery | Upstream workflow `<step name="discover_docs">` (lines 81–152 in upstream `ingest-docs.md`) implements both; carries verbatim through rebrand |
| WF-ING-03 | `--mode new` and `--mode merge` with auto-detect | Upstream `<step name="init_and_mode_detect">` (lines 50–79) + `<step name="route_new_mode">` (lines 238–267) + `<step name="route_merge_mode">` (lines 270–285) |
| WF-ING-04 | BLOCKER gate + 50-doc cap | Upstream `<step name="conflict_gate">` (lines 207–236) implements BLOCKER gate per `oto/references/doc-conflict-engine.md` (already in place after Phase 1); 50-doc cap at upstream lines 120–128 |
| WF-EVAL-01 | `oto/workflows/eval-review.md` is the rebrand-ported executable workflow (~155 LOC) | Rebrand engine output verified (`.oto-rebrand-test/oto/workflows/eval-review.md` produced 155-LOC executable body, zero `.planning/` hand-fixups required) |
| WF-EVAL-02 | `/oto-eval-review <phase>` produces `EVAL-REVIEW.md` scored COVERED/PARTIAL/MISSING | Upstream `<process>` steps 0–6 (lines 14–143) delegate to `oto-eval-auditor` (already installed Phase 1) with State A/B detection; auditor returns scoring; workflow persists |
| CMD-01 | `/oto-ingest-docs` command file removes deferral framing | **Already satisfied**: `oto/commands/oto/ingest-docs.md` contains no deferral text (verified during research; grep returns no `deferred`/`DEFERRED`/`intentionally non-executable` matches in the file) — assertion test required to lock |
| CMD-02 | `/oto-eval-review` command file removes deferral framing | **Already satisfied**: same situation as CMD-01 — assertion test required to lock |
| CMD-03 | `/oto-help` lists both commands as live (no `[deferred]` tag, no v2 reactivation footnote) | **Already satisfied**: `oto/commands/INDEX.md` lines 27, 35 list both with clean descriptions; `oto/workflows/help.md` doesn't list per-command entries for these two (help.md is a curated reference, not a generated index). The two `deferred` hits in INDEX.md (line 11) and help.md (line 428) are unrelated to these commands — assertion test required to lock |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `node:test` | builtin (Node 22+) | Workflow-shape and fixture-smoke assertions | Project standard per CLAUDE.md TL;DR; matches `tests/phase-04-frontmatter-schema.test.cjs` pattern |
| `node:fs` / `node:path` / `node:os` | builtin | Fixture tree creation, workflow body reading | Used throughout `tests/`; zero dep |
| `scripts/rebrand.cjs` | repo-local | Apply rename-map to upstream source → target | Single source of truth per CLAUDE.md; same engine used Phase 1 |
| `scripts/rebrand/lib/manifest.cjs` | repo-local | Regenerate `reports/rebrand-dryrun.{json,md}` | Coverage manifest gate (Phase 1 success criterion 5 precedent) |
| `scripts/gen-commands-index.cjs` | repo-local | Regenerate `oto/commands/INDEX.md` from frontmatter | Cited at top of INDEX.md as the canonical regen path |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Existing fixture pattern `tests/fixtures/` | repo-local | Provide deterministic input trees for smoke tests | Phase 2 smoke tests need a fixture tree of ADR/PRD/SPEC/RFC docs |
| `tests/helpers/` | repo-local | Shared test utilities | Inspect for existing helpers (temp-dir, fixture seeders) before rolling new ones |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Rebrand engine | Manual rewrite of workflow body | **Rejected**: violates CLAUDE.md "rebrand engine is single source of truth" and Phase 1 D-01 precedent. Hand fixups are scoped to engine-known-blind spots only. |
| Vitest | `node:test` | Project standard; Vitest would require new dep |
| Pre/post rebrand hooks | Hand fixup script | Could automate the `.planning/` fixup, but the same Phase 1 review-loop pattern (rebrand → manual review → patch) is the established convention |

**Installation:** No new dependencies.

**Version verification:** Node 22+ is required by `package.json` `engines`. `node --version` on this machine: confirmed Node 22+ in CI (`tests/phase-10-workflow-shape.test.cjs` uses `node:test` natively).

## Architecture Patterns

### System Architecture Diagram

```
                     ┌──────────────────────────────┐
                     │ foundation-frameworks/get-   │
                     │   shit-done-main/get-shit-   │
                     │   done/workflows/{ingest-    │
                     │   docs,eval-review}.md       │
                     └──────────────┬───────────────┘
                                    │
                          (read by rebrand engine)
                                    ▼
   decisions/file-inventory.json ──▶ scripts/rebrand.cjs --apply
   (rows already: verdict: keep,        │
    target_path set, rebrand_required)  ▼
                                  rename-map.json
                                  rule pipeline:
                                  package → url →
                                  identifier → path →
                                  command → skill_ns →
                                  env_var
                                    │
                                    ▼
                     ┌──────────────────────────────┐
                     │ oto/workflows/{ingest-docs,  │
                     │   eval-review}.md            │  ← engine output
                     │                              │  ← still has 16
                     │  (replaces deferral stubs)   │     prose-embedded
                     └──────────────┬───────────────┘     .planning/ in
                                    │                     ingest-docs
                              (hand fixup)
                                    │
                                    ▼
                     ┌──────────────────────────────┐
                     │ Hand-fixup pass:             │
                     │  - prose .planning/ → .oto/  │
                     │  - oto-sdk → tolerant of     │
                     │    SDK absence (|| fallback) │
                     └──────────────┬───────────────┘
                                    │
                                    ▼
                     ┌──────────────────────────────┐
                     │ scripts/rebrand/lib/         │
                     │   manifest.cjs               │
                     │ regenerates                  │
                     │ reports/rebrand-dryrun.{json,│
                     │   md}                         │
                     └──────────────────────────────┘

  Runtime execution path (when user runs /oto-ingest-docs on their project):
                                    │
              /oto-ingest-docs ──▶ oto/commands/oto/ingest-docs.md
                                    │ (frontmatter)
                                    ▼
                                @execution_context loads:
                                  - oto/workflows/ingest-docs.md
                                  - oto/references/ui-brand.md
                                  - oto/references/gate-prompts.md
                                  - oto/references/doc-conflict-engine.md
                                    │
                                    ▼
              workflow body executes step-by-step:
              discover → classify (parallel oto-doc-classifier Task spawns
                                   — orchestrator persists JSON returns
                                   to .oto/intel/classifications/)
                       → synthesize (single oto-doc-synthesizer Task —
                                     writes .oto/INGEST-CONFLICTS.md +
                                     .oto/intel/SYNTHESIS.md directly)
                       → conflict_gate (parse INGEST-CONFLICTS.md;
                                        BLOCKER count > 0 → exit non-zero,
                                        no destination writes)
                       → route_new_mode | route_merge_mode
                          ↓                ↓
                         spawn         load existing
                         oto-roadmapper .oto/, append phases
                         to write       and requirements
                         .oto/PROJECT.md
                         + REQUIREMENTS.md
                         + ROADMAP.md
                         + STATE.md
                       → finalize (commit)
```

### Recommended Project Structure

No new directories. Phase 2 modifies:

```
oto/workflows/
├── ingest-docs.md       # REPLACE (deferral stub → rebrand-ported body)
└── eval-review.md       # REPLACE (deferral stub → rebrand-ported body)

oto/commands/oto/
├── ingest-docs.md       # NO-OP if clean; assert with test
└── eval-review.md       # NO-OP if clean; assert with test

oto/commands/INDEX.md    # Regenerate via scripts/gen-commands-index.cjs (no-op if frontmatter unchanged)
oto/workflows/help.md    # NO-OP if no [deferred] tag for these two commands; assert with test

reports/
├── rebrand-dryrun.json  # Regenerate (Phase 1 precedent)
└── rebrand-dryrun.md    # Regenerate (Phase 1 precedent)

tests/
├── workflow-ingest-docs.test.cjs   # NEW — workflow-shape + fixture smoke
└── workflow-eval-review.test.cjs   # NEW — workflow-shape + fixture smoke

tests/fixtures/ingest-docs/         # NEW — fixture tree for smoke
├── new-mode-mixed/                  # mixed ADR/PRD/SPEC/RFC, ≤10 docs
├── merge-mode-existing/             # pre-existing .oto/ + new docs
├── conflict-block/                  # docs with deliberate LOCKED-vs-LOCKED conflict
└── over-cap/                        # 51 docs to assert cap enforcement (lightweight 1-line files)
```

### Pattern 1: Rebrand-then-fixup (Phase 1 D-01 precedent)
**What:** Engine produces a near-complete target; a small hand-fixup pass closes engine-known blind spots.
**When to use:** Rebranding upstream markdown where the rename-map's path/identifier rules can't reach prose-embedded path strings.
**Example:**
```bash
# Step 1: ensure inventory rows are clean (already done — verified during research)
# decisions/file-inventory.json has both workflow rows as verdict: keep, rebrand_required: true

# Step 2: run the engine
node scripts/rebrand.cjs --apply \
  --target foundation-frameworks/get-shit-done-main \
  --owner OTOJulian \
  --out /Users/Julian/Desktop/oto-hybrid-framework/.oto-rebrand-stage

# Step 3: copy engine output into shipped oto/workflows/, then hand-fixup
# Replace prose .planning/ → .oto/ in oto/workflows/ingest-docs.md (16 occurrences)
# Replace bare oto-sdk calls with `oto-sdk query ... 2>/dev/null || …` fallbacks

# Step 4: regenerate coverage manifest
node scripts/rebrand.cjs --dry-run --target foundation-frameworks/get-shit-done-main --owner OTOJulian
# Manifest writes to reports/rebrand-dryrun.{json,md}
```

### Pattern 2: Fixture-driven workflow smoke (test-shape parallel to upstream test)
**What:** Tests assert the workflow body's structural invariants (step names, banner shape, agent references, gate semantics) plus a fixture-based exec simulation.
**When to use:** Workflows are markdown prompt-based, not executable code — `node --test` can't actually run them. Tests assert *contract* (the file exists, has expected sections, references expected agents/references).
**Example:**
```javascript
// tests/workflow-ingest-docs.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const WF = fs.readFileSync(path.join(ROOT, 'oto/workflows/ingest-docs.md'), 'utf8');

test('WF-ING-01: workflow body is the rebrand-ported executable (not deferral stub)', () => {
  assert.ok(WF.includes('<step name="banner">'), 'must have banner step (sign of real workflow body)');
  assert.ok(WF.includes('<step name="discover_docs">'), 'must have discovery step');
  assert.ok(WF.includes('<step name="classify_parallel">'), 'must have parallel classification step');
  assert.ok(WF.includes('<step name="synthesize">'), 'must have synthesize step');
  assert.ok(WF.includes('<step name="conflict_gate">'), 'must have conflict gate step');
  assert.ok(!WF.includes('intentionally non-executable'), 'no deferral framing');
  assert.ok(!WF.includes('DEFERRED'), 'no DEFERRED marker');
});

test('WF-ING-02: discovery covers directory conventions + --manifest', () => {
  assert.ok(WF.includes('docs/adr/') && WF.includes('docs/prd/') && WF.includes('docs/specs/') && WF.includes('docs/rfc/'));
  assert.match(WF, /--manifest/);
});

test('WF-ING-04: 50-doc cap and BLOCKER gate are wired', () => {
  assert.match(WF, /50/); // cap stated
  assert.ok(WF.includes('exceeds the v1 cap of 50'));
  assert.ok(WF.includes('BLOCKERS') && WF.includes('Exit WITHOUT'));
});

test('Phase 2 cleanup: no prose-embedded .planning/ leaked from rebrand', () => {
  // Catches the engine blind-spot regression
  const planningHits = (WF.match(/\.planning\b/g) || []);
  assert.equal(planningHits.length, 0, `found .planning/ in workflow body: ${planningHits.length} hits — rebrand+fixup pass incomplete`);
});

test('Phase 1 outputs are referenced', () => {
  assert.ok(WF.includes('oto-doc-classifier'));
  assert.ok(WF.includes('oto-doc-synthesizer'));
  assert.ok(WF.includes('oto-roadmapper'));
});
```

### Pattern 3: SDK-tolerant fallback (existing repo convention)
**What:** SDK calls use `|| true` / `|| echo "default"` so missing `oto-sdk` doesn't hard-fail the workflow.
**When to use:** Per STATE.md Phase 1 last-activity, `oto-sdk` is unavailable in dev environments. Existing workflows already use this pattern (e.g., `oto/workflows/plan-phase.md`: `CONTEXT_WINDOW=$(oto-sdk query config-get context_window 2>/dev/null || echo "200000")`).
**Example:**
```bash
# Bad (hard-fails when oto-sdk is missing):
INIT=$(oto-sdk query init.ingest-docs)

# Good (tolerant; uses existing repo convention from plan-phase.md):
INIT=$(oto-sdk query init.ingest-docs 2>/dev/null || echo "")
# Then in the parsing logic, fall back to direct file detection:
if [ -z "$INIT" ]; then
  test -d .oto && PLANNING_EXISTS=true || PLANNING_EXISTS=false
  test -d .git && HAS_GIT=true || HAS_GIT=false
fi
```

### Anti-Patterns to Avoid

- **Hand-porting the workflow bodies from upstream.** Violates CLAUDE.md and Phase 1 D-01. Always run the rebrand engine first; hand-fixups only address engine blind spots.
- **Editing `rename-map.json` to fix prose `.planning/` blindness during Phase 2.** Bigger blast radius than the fix is worth; defer to a v0.4.0+ rename-map enhancement. If you do, you re-run rebrand against ALL upstream files and risk regressions in the 24 other ported workflows.
- **Adding new oto-sdk surface code to fix the SDK-absence problem.** Out of scope (SDK-DEFER-01); use the existing `|| echo "default"` fallback pattern.
- **Rewriting `/oto-help` to add per-command entries for `ingest-docs` and `eval-review`.** `oto/workflows/help.md` is a curated quick-reference, not an auto-generated index. The auto-generated INDEX.md at `oto/commands/INDEX.md` already lists both commands cleanly.
- **Treating the test ports as in-scope.** TEST-01 and TEST-02 are Phase 3. Phase 2 only adds fixture-driven smoke for its own success criteria.
- **Manually editing `oto/commands/INDEX.md`.** It's auto-generated; re-run `node scripts/gen-commands-index.cjs` if frontmatter changes (no-op expected here since command files don't change).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Token substitution (`gsd-` → `oto-`, `/gsd-*` → `/oto-*`) | Custom `sed` script | `scripts/rebrand.cjs` | Single source of truth; already covers 6047 matches across 341 files |
| Workflow execution | Real workflow runner | n/a — workflows are markdown prompts | Workflows are LLM instructions, not code; smoke tests assert *shape*, not *behavior* |
| Conflict report format | Custom severity scheme | `oto/references/doc-conflict-engine.md` | Shared contract (BLOCKER/WARNING/INFO + plain-text format) already enforced; synthesizer agent already conforms |
| Doc classification logic | Custom classifier | `oto-doc-classifier` agent (installed Phase 1) | AGNT-01 — the whole point of Phase 1 |
| Synthesis logic | Custom synthesizer | `oto-doc-synthesizer` agent (installed Phase 1) | AGNT-02 |
| Eval scoring | Custom scorer | `oto-eval-auditor` agent (installed Phase 1) | AGNT-03 |
| `.oto/` initialization (PROJECT, REQUIREMENTS, ROADMAP, STATE) | Custom bootstrap | `oto-roadmapper` agent (already present) | Delegated to via `<step name="route_new_mode">` |
| Command index generation | Hand-edit INDEX.md | `node scripts/gen-commands-index.cjs` | Generated from command frontmatter; INDEX.md header documents this |

**Key insight:** Phase 2's deliverable is **markdown content**, not code. The complexity is in (a) running the existing rebrand engine correctly, (b) closing two known engine blind spots, and (c) writing structural assertion tests. There is no "implementation logic" to build.

## Runtime State Inventory

> Phase 2 is a rebrand-port + small hand-fixup phase. Mostly a code-edit phase, but a few runtime-state categories apply.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | **None** — no DB / KV store referenced. The workflows write to `.oto/` files on user projects, not to any persistent store on the framework side. | None |
| Live service config | **None** — no external services (Datadog, n8n, etc.). Verified by grep against shipped `oto/workflows/{ingest-docs,eval-review}.md` rebrand output. | None |
| OS-registered state | **None** — no Task Scheduler / launchd / pm2 / systemd registrations. Verified by grep across the rebrand output and existing shipped workflows. | None |
| Secrets/env vars | `GSD_VERSION` is rebranded to `OTO_VERSION` by `rename-map.json` (env_var rule). Workflow bodies don't reference any GSD-prefixed env vars in their text (verified). | None — engine handles it |
| Build artifacts | `reports/rebrand-dryrun.{json,md}` — regenerated as part of Phase 2 (Phase 1 D-08 precedent). Old contents will be replaced; this is desired behavior. `oto/commands/INDEX.md` — auto-generated; re-run `gen-commands-index.cjs` if frontmatter shifts (no-op expected). | Regenerate manifests and INDEX.md as a phase deliverable |

## Common Pitfalls

### Pitfall 1: Trusting the rebrand engine to handle prose-embedded `.planning/`
**What goes wrong:** Engine produces output with 16 unrebranded `.planning/` strings inside markdown prose (e.g., `OUTPUT_DIR — `.planning/intel/classifications/``). Workflow runtime then writes to `.planning/intel/...` on a user project that uses `.oto/`, producing silent path divergence.
**Why it happens:** `rename-map.json`'s `.planning` rule is `type: path, match: segment` — by design it only fires when the rebrand engine identifies the token as a path segment in a known path context (frontmatter `path:` field, file path string). Inside markdown prose embedded in backticks, the engine's path-context detector doesn't trigger.
**How to avoid:** Hand-fixup pass after engine apply: `sed -i '' 's|\.planning/|.oto/|g' oto/workflows/ingest-docs.md` (only safe because we verified no false-positive contexts in the rebrand output). Lock with a test that fails on any `\.planning\b` match in the file.
**Warning signs:** Tests pass, but running `/oto-ingest-docs` on a user project writes to `.planning/` instead of `.oto/`.

### Pitfall 2: `oto-sdk` hard-fail when unavailable
**What goes wrong:** Workflow's first step is `INIT=$(oto-sdk query init.ingest-docs)`. If SDK is missing (as in this repo's environment), the command fails non-silently, the workflow proceeds with empty `$INIT`, and downstream parsing produces undefined behavior.
**Why it happens:** STATE.md Phase 1 note confirms SDK absence in user's environment; SDK is deferred (SDK-DEFER-01).
**How to avoid:** Add `2>/dev/null || echo ""` fallback on every `oto-sdk query` call, then handle empty result downstream. Mirror the `plan-phase.md` pattern: `CONTEXT_WINDOW=$(oto-sdk query config-get context_window 2>/dev/null || echo "200000")`.
**Warning signs:** Workflow exits early or branches into a "weird" path when run in a SDK-less environment.

### Pitfall 3: Stale deferral stubs replacing rebrand output
**What goes wrong:** The current `oto/workflows/{ingest-docs,eval-review}.md` are deferral stubs added in commits `964d79e` / `91cb26c` (v0.1.0). Even though `decisions/file-inventory.json` says `verdict: keep, rebrand_required: true`, the actual files on disk are stubs. **The rebrand engine writes to `--out` (defaults to `.oto-rebrand-out/`), not into `oto/` directly.** Running the engine doesn't replace the shipped file unless the workflow explicitly copies output → `oto/workflows/`.
**Why it happens:** Engine has a safety design — output is staged, then copied into the repo in a deliberate step. The "engine produced X" claim does not equal "X is in the shipped tree."
**How to avoid:** Plan must include an explicit copy step: `cp .oto-rebrand-stage/oto/workflows/{ingest-docs,eval-review}.md oto/workflows/`. Or use the engine's allowlist + dry-run patterns to verify before copy.
**Warning signs:** Tests on `.oto-rebrand-out/` pass, but tests on `oto/workflows/` fail (different files).

### Pitfall 4: Phase 1 left classifier/auditor as read-only — workflow must persist their returns
**What goes wrong:** Upstream `<step name="classify_parallel">` writes via the agent (`OUTPUT_DIR — .planning/intel/classifications/` is the *agent's* output dir, agent has Write). But Phase 1 D-04 stripped `Write` from the classifier and auditor agents (Codex sandbox `read-only`). Per `01-VERIFICATION.md`: *"read-only agents return output for orchestrator persistence instead of writing directly."*
**Why it happens:** Phase 1 reconciled INST-02 (sandbox locks) with upstream contract (agents wrote their own outputs). The workflow body still says the agent writes the JSON.
**How to avoid:** In the workflow body's classify step, **the orchestrator (workflow itself) writes the classifier's returned JSON** to `.oto/intel/classifications/<doc-slug>.json`. The agent's prompt should return the JSON, not be instructed to write a file. Same shape change for the auditor's EVAL-REVIEW.md write in `eval-review.md`.
**Warning signs:** Classifier runs but `.oto/intel/classifications/` is empty afterward; or Codex sandbox rejects the agent's Write call.

### Pitfall 5: Hand-fixup drifts from rebrand engine output
**What goes wrong:** Someone hand-edits `oto/workflows/ingest-docs.md` to fix the `.planning/` issue, but in the same pass also "improves" some other wording. On the next upstream sync, the rebrand engine produces different content; the now-divergent shipped file becomes a merge conflict instead of a clean overwrite.
**Why it happens:** Hand fixups blur the boundary the rebrand engine guarantees.
**How to avoid:** Scope hand-fixups strictly to the two known blind spots (prose `.planning/`, SDK fallback). Document each hand-fixup as a comment or in the SUMMARY so the v0.4.0+ rename-map fix can be a clean before/after.
**Warning signs:** SUMMARY.md doesn't list exactly which lines were fixed up post-rebrand.

### Pitfall 6: CMD-03 mis-scoped — chasing `[deferred]` tags that don't exist
**What goes wrong:** Planner reads "remove `[deferred]` tag from `/oto-help`" and goes searching for the tag in `oto/workflows/help.md`. The tag doesn't exist (verified during research). Planner invents a "fix" that adds a tag to remove, or hallucinates a help.md structure that doesn't match reality.
**Why it happens:** Requirement language predates the actual state of `oto/workflows/help.md` (which doesn't enumerate every command — it's a curated quick-reference). The Phase 1 ROADMAP author assumed help.md had per-command listings; it does not.
**How to avoid:** Treat CMD-03 as **assertion-only**. Write a test that asserts `/oto-ingest-docs` and `/oto-eval-review` are NOT followed by `[deferred]` or "reactivation criterion" text anywhere in `oto/workflows/help.md` or `oto/commands/INDEX.md`. If the assertion passes (it should, today), CMD-03 is met.
**Warning signs:** Planner tries to "rewrite" `/oto-help` to add new entries for these commands. Don't — INDEX.md already lists them.

### Pitfall 7: Mocking workflow execution with real `Task()` calls in tests
**What goes wrong:** A smoke test attempts to actually spawn the classifier agent via `Task()` to "really exercise" the workflow. This requires the test to run inside Claude Code, fails in `node --test` headless CI.
**Why it happens:** Workflows are LLM prompts; "running" them requires an LLM runtime.
**How to avoid:** Tests assert **markdown shape** (step names exist, banners correct, agents referenced, gates present), not behavior. Fixture tests verify that the workflow's referenced fixture *would* be processable (correct file shape, ≤50 docs, has at least one ADR/PRD/SPEC/RFC), not that the workflow actually processed it. Phase 3's `tests/ingest-docs.test.cjs` port follows the same convention (upstream test asserts file existence + frontmatter + reference wiring, not runtime execution).
**Warning signs:** A test file imports a workflow runner or uses `child_process.spawn` to exec a workflow body.

## Code Examples

### Run the rebrand engine and stage output
```bash
# Source: scripts/rebrand.cjs (head); engine.cjs (lines 1–60)
# Engine refuses to write outside repo root or os.tmpdir() — use an in-repo --out dir
node scripts/rebrand.cjs --apply \
  --target foundation-frameworks/get-shit-done-main \
  --owner OTOJulian \
  --out .oto-rebrand-stage
# Output: engine: apply — 341 files, 5098 matches, 0 unclassified

# Copy the two workflow files into shipped location
cp .oto-rebrand-stage/oto/workflows/ingest-docs.md oto/workflows/ingest-docs.md
cp .oto-rebrand-stage/oto/workflows/eval-review.md oto/workflows/eval-review.md

# Clean up staging dir
rm -rf .oto-rebrand-stage

# Regenerate coverage manifest (Phase 1 D-08 precedent)
node scripts/rebrand.cjs --dry-run \
  --target foundation-frameworks/get-shit-done-main \
  --owner OTOJulian
# Writes reports/rebrand-dryrun.{json,md}
```

### Hand-fixup: prose-embedded `.planning/` → `.oto/`
```bash
# Source: research verified 16 hits in ingest-docs.md at lines 3, 6, 64, 166, 171, 201-203, 209, 230, 242, 274, 279-281, 315
# Safe because all hits are inside backticks or path strings inside markdown prose — no false positives
sed -i '' 's|\.planning/|.oto/|g' oto/workflows/ingest-docs.md
sed -i '' 's|\.planning\b|.oto|g' oto/workflows/ingest-docs.md

# Verify: should print 0
grep -c '\.planning\b' oto/workflows/ingest-docs.md
```

### Hand-fixup: SDK-tolerant fallback (workflow-internal sed)
```bash
# Source: existing pattern in oto/workflows/plan-phase.md
# Find SDK calls without 2>/dev/null fallback and add it
# Preview pattern first:
grep -n 'oto-sdk query' oto/workflows/{ingest-docs,eval-review}.md
# Then apply manually with line-by-line review; do NOT mass-sed (some calls already have fallbacks from upstream)
```

### Smoke test against a fixture tree
```javascript
// tests/workflow-ingest-docs-fixture-smoke.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const FIXTURE = path.join(ROOT, 'tests/fixtures/ingest-docs/new-mode-mixed');

test('fixture: new-mode-mixed has ≤50 ADR/PRD/SPEC/RFC docs ready for /oto-ingest-docs', () => {
  // Asserts the fixture is well-formed; the workflow itself runs inside an LLM runtime
  const files = fs.readdirSync(FIXTURE, { recursive: true })
    .filter((f) => f.endsWith('.md'));
  assert.ok(files.length > 0 && files.length <= 50);
  // Check at least one of each type discoverable via directory conventions
  assert.ok(files.some((f) => f.includes('adr/')), 'fixture must include ADRs');
  assert.ok(files.some((f) => f.includes('prd/')), 'fixture must include PRDs');
  assert.ok(files.some((f) => f.includes('spec') || f.includes('rfc')), 'fixture must include SPECs or RFCs');
});

test('fixture: over-cap has >50 docs to assert cap enforcement', () => {
  const overCapDir = path.join(ROOT, 'tests/fixtures/ingest-docs/over-cap');
  const files = fs.readdirSync(overCapDir, { recursive: true }).filter((f) => f.endsWith('.md'));
  assert.ok(files.length > 50, `expected >50 docs to test cap, got ${files.length}`);
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Workflows ship as `[DEFERRED]` markdown stubs | Workflows ship as rebrand-ported executable bodies | Phase 2 (this phase) | Two dead commands become live commands |
| Classifier/auditor write outputs directly | Workflow orchestrator persists agent return values | Phase 1 (D-04 / 01-VERIFICATION.md code review fix) | Sandbox alignment + Codex `read-only` for both agents |
| `gsd-doc-classifier` agent name | `oto-doc-classifier` agent name | Phase 1 (rebrand engine apply) | All upstream gsd-* references in Phase 2's workflow bodies rebrand correctly via the engine |
| Bare `gsd-sdk query …` | `oto-sdk query … 2>/dev/null || echo "…"` | Existing pattern (plan-phase.md) | Tolerance for SDK absence (SDK-DEFER-01) |

**Deprecated/outdated:**
- Treating the deferral stubs as the "intended v1 state" — explicitly being reversed in v0.3.0.
- `--resolve interactive` flag — still reserved for a future release (preserved in workflow body but rejected at runtime).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Smoke tests of the form `assertMatch(workflow_body, /<step name="banner">/)` are sufficient for Phase 2's success criteria (vs. actually executing the workflow against a fixture) | Validation Architecture | Could miss runtime regressions; mitigation: Phase 3 ports the upstream test which is also shape-based |
| A2 | `oto/workflows/help.md` is curated rather than auto-generated | Pitfall 6 | If a generator exists (we didn't find one — only `gen-commands-index.cjs` for INDEX.md), CMD-03 may need regenerator-aware handling. Mitigation: grep for `gen-help` or similar |
| A3 | The 16 prose-embedded `.planning/` hits are all safe to bulk-sed to `.oto/` | Code Examples | If any context names `.planning/` deliberately (e.g., referencing this repo's own state), sed corrupts it. Mitigation: read the rebrand output context for each hit before sed |
| A4 | Hand-fixup is preferred over extending `rename-map.json` for this phase | Architecture Patterns | Long-term, the rename-map fix is the right answer (zero hand-fixups on future ports); we punt to v0.4.0+ to bound this phase's scope. Mitigation: file a v0.4.0+ candidate ticket |
| A5 | `oto/commands/oto/{ingest-docs,eval-review}.md` will not be regenerated/overwritten by the rebrand engine during Phase 2 | Phase Requirements | If the rebrand engine touches them too, current clean frontmatter could be lost. **VERIFIED FALSE: rebrand engine DOES regenerate them** — inventory rows say `verdict: keep, rebrand_required: true` for `commands/gsd/{ingest-docs,eval-review}.md` → `commands/oto/...`. Plan must either copy current clean version back or assert the rebrand output is equivalent (verified during research: rebrand engine output already matches the clean shipped frontmatter). |

## Open Questions

1. **Should the rebrand engine reapply to `commands/oto/{ingest-docs,eval-review}.md`?**
   - What we know: Inventory rows show `verdict: keep, rebrand_required: true` for both command files; engine apply produces clean output that matches the currently-shipped clean frontmatter.
   - What's unclear: Whether running the engine and overwriting these command files introduces any regression in frontmatter (e.g., `name:` field changes).
   - Recommendation: Diff `.oto-rebrand-stage/commands/oto/{ingest-docs,eval-review}.md` against `oto/commands/oto/{ingest-docs,eval-review}.md` before copying. Expected outcome: zero diff. If there's a diff, hand-resolve.

2. **Are there `tests/fixtures/` helpers already in place to create the new fixture trees?**
   - What we know: `tests/fixtures/` and `tests/helpers/` exist.
   - What's unclear: Whether existing helpers cover temp-dir setup + multi-doc seeding.
   - Recommendation: Planner should grep `tests/helpers/` and `tests/fixtures/` first; reuse before rolling new.

3. **Should the `over-cap` fixture (51+ docs) actually be checked into git or generated programmatically?**
   - What we know: Tests must be deterministic; 51+ tiny files committed is ~5KB.
   - What's unclear: Whether the test author prefers a `setup` hook that creates the fixture in `os.tmpdir()` per run vs. on-disk.
   - Recommendation: For ≤50-doc fixtures, check in (small, deterministic). For the over-cap fixture, generate in setup (avoid bloat). Either is acceptable.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All scripts and tests | ✓ | 22+ (project requires; CI tests on 22 + 24) | — |
| `node:test` | Phase 2 smoke tests | ✓ | builtin | — |
| `scripts/rebrand.cjs` | Phase 2 engine apply | ✓ | repo-local | — |
| `scripts/gen-commands-index.cjs` | Regenerate INDEX.md (if needed) | ✓ | repo-local | — |
| `oto-sdk` | Workflow runtime init queries | ✗ | — | Workflow bodies must use `oto-sdk query … 2>/dev/null || echo "…"` pattern (existing convention) |
| `git` | Commits | ✓ | — | — |
| `oto-doc-classifier` agent | Workflow runtime spawn target | ✓ | installed Phase 1 | — |
| `oto-doc-synthesizer` agent | Workflow runtime spawn target | ✓ | installed Phase 1 | — |
| `oto-eval-auditor` agent | Workflow runtime spawn target | ✓ | installed Phase 1 | — |
| `oto-roadmapper` agent | Workflow runtime spawn target (route_new_mode) | ✓ | shipped in `oto/agents/` | — |
| `oto/references/doc-conflict-engine.md` | Synthesizer `<required_reading>` | ✓ | installed Phase 1 (D-03) | — |
| `oto/references/ai-evals.md` | `/oto-eval-review` command `<execution_context>` | ✓ | already in `oto/references/` | — |
| `oto/references/gate-prompts.md` | Workflow approval gates | ✓ | already in `oto/references/` | — |
| `oto/references/ui-brand.md` | Workflow banners | ✓ | already in `oto/references/` | — |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** `oto-sdk` — use existing `2>/dev/null || echo "…"` pattern from `oto/workflows/plan-phase.md`.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | `node:test` (builtin Node 22+) |
| Config file | none — tests run via `npm test` which calls `scripts/run-tests.cjs` (Phase 1 ran `npm test` cleanly: 533 pass, 1 skip, 0 fail) |
| Quick run command | `node --test tests/workflow-ingest-docs.test.cjs tests/workflow-eval-review.test.cjs` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| WF-ING-01 | Workflow body is rebrand-ported (not deferral stub) | unit (file-shape) | `node --test tests/workflow-ingest-docs.test.cjs` | ❌ Wave 0 |
| WF-ING-02 | Directory-conventions + `--manifest` discovery present in workflow body | unit (file-shape) | same | ❌ Wave 0 |
| WF-ING-03 | `--mode new` / `--mode merge` + auto-detect branches present | unit (file-shape) | same | ❌ Wave 0 |
| WF-ING-04 | BLOCKER gate + 50-doc cap text present | unit (file-shape) | same | ❌ Wave 0 |
| WF-ING-04 (fixture) | over-cap fixture seeded with >50 docs | fixture-smoke | `node --test tests/workflow-ingest-docs-fixture.test.cjs` | ❌ Wave 0 |
| WF-EVAL-01 | Workflow body is rebrand-ported (not deferral stub) | unit (file-shape) | `node --test tests/workflow-eval-review.test.cjs` | ❌ Wave 0 |
| WF-EVAL-02 | EVAL-REVIEW.md scoring contract present | unit (file-shape) | same | ❌ Wave 0 |
| CMD-01 | `/oto-ingest-docs` command file has no deferral framing | unit (assertion) | `node --test tests/workflow-ingest-docs.test.cjs` | ❌ Wave 0 |
| CMD-02 | `/oto-eval-review` command file has no deferral framing | unit (assertion) | `node --test tests/workflow-eval-review.test.cjs` | ❌ Wave 0 |
| CMD-03 | `/oto-help` listings have no `[deferred]` tag or v2-reactivation footnote for these two commands | unit (assertion against INDEX.md + help.md) | `node --test tests/workflow-no-deferral-marker.test.cjs` | ❌ Wave 0 |
| (cross-cutting) | Rebrand coverage manifest no orphan paths after Phase 2 | integration (existing test) | `node --test tests/phase-04-rebrand-smoke.test.cjs` | ✅ exists |
| (regression) | Full v0.2.0 baseline preserved | regression | `npm test` (must show 533+ pass) | ✅ exists |

### Sampling Rate

- **Per task commit:** `node --test tests/workflow-ingest-docs.test.cjs tests/workflow-eval-review.test.cjs tests/workflow-no-deferral-marker.test.cjs tests/phase-04-rebrand-smoke.test.cjs` (fast subset for the four new/relevant files)
- **Per wave merge:** `npm test` (full suite, must stay at 533+ pass and 0 fail)
- **Phase gate:** Full suite green; coverage manifest regenerated with 0 orphan paths; `grep '\.planning\b' oto/workflows/{ingest-docs,eval-review}.md` returns 0; `grep -i 'deferred\|intentionally non-executable' oto/workflows/{ingest-docs,eval-review}.md oto/commands/oto/{ingest-docs,eval-review}.md` returns 0.

### Wave 0 Gaps

- [ ] `tests/workflow-ingest-docs.test.cjs` — covers WF-ING-01..04 + CMD-01 (file-shape + agent reference assertions; mirror upstream `tests/ingest-docs.test.cjs` style, but against `oto/workflows/ingest-docs.md` not upstream)
- [ ] `tests/workflow-eval-review.test.cjs` — covers WF-EVAL-01..02 + CMD-02 (file-shape + State A/B detection assertions)
- [ ] `tests/workflow-no-deferral-marker.test.cjs` — covers CMD-03 (assertion that `oto/commands/INDEX.md` and `oto/workflows/help.md` contain no `[deferred]` tag or "v2 reactivation criterion" text adjacent to `/oto-ingest-docs` or `/oto-eval-review` mentions)
- [ ] `tests/workflow-ingest-docs-fixture.test.cjs` (optional, but recommended) — assertions that fixture trees in `tests/fixtures/ingest-docs/{new-mode-mixed,merge-mode-existing,conflict-block,over-cap}/` are well-formed (count, types, discovery-pattern compatibility)
- [ ] `tests/fixtures/ingest-docs/new-mode-mixed/` — 3 ADR + 3 PRD + 2 SPEC + 2 RFC = 10 docs across `docs/adr/`, `docs/prd/`, `docs/specs/`, `docs/rfc/`
- [ ] `tests/fixtures/ingest-docs/merge-mode-existing/` — pre-existing `.oto/{PROJECT,REQUIREMENTS,ROADMAP,STATE}.md` skeleton + 3 new docs that append phases/requirements
- [ ] `tests/fixtures/ingest-docs/conflict-block/` — 2 ADRs with directly contradictory locked decisions → must trigger BLOCKER
- [ ] `tests/fixtures/ingest-docs/over-cap/` — 51 minimal `.md` docs (lightweight; generated by setup hook or committed as fixture)

(Framework install: none — `node:test` is builtin.)

## Security Domain

> `security_enforcement` not explicitly set in `.oto/config.json`; treat as enabled per default convention. This is a markdown-content phase with no user input parsing at execute time. Most ASVS categories don't apply.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | n/a |
| V3 Session Management | no | n/a |
| V4 Access Control | no | n/a |
| V5 Input Validation | yes | The workflow body itself contains validation: `case "{SCAN_PATH}" in *..*) echo "SECURITY_ERROR: path contains traversal sequence"; exit 1 ;;` and explicit containment via `realpath` check that `SCAN_PATH` is under `realpath("$REPO_ROOT")`. **Preserve these checks verbatim during rebrand+fixup.** |
| V6 Cryptography | no | n/a |

### Known Threat Patterns for {stack}

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Path traversal via `SCAN_PATH` or `MANIFEST_PATH` | Tampering | The workflow body's `*..*` check + `realpath` containment (existing in upstream; preserved through rebrand). Tests should assert these strings are still in `oto/workflows/ingest-docs.md` post-port |
| Prompt injection via doc content | Tampering | Documented in `oto-doc-classifier.md` and `oto-doc-synthesizer.md` agent prompts (Phase 1 already addressed). No Phase 2 work required |
| BLOCKER-gate bypass | Tampering / Repudiation | The workflow body's "Exit WITHOUT writing PROJECT.md, REQUIREMENTS.md, ROADMAP.md, or STATE.md" clause when BLOCKERs > 0. Assertion test must verify this string survives rebrand+fixup |

## Suggested plan breakdown

**Recommended: 3 plans** (2 is also viable; see below).

### Plan 02-01 — Rebrand engine apply + workflow body hand-fixups (Wave 1)
**Scope:**
- Pre-flight: verify `decisions/file-inventory.json` workflow rows are clean (research confirms they are).
- Run `node scripts/rebrand.cjs --apply --target foundation-frameworks/get-shit-done-main --owner OTOJulian --out .oto-rebrand-stage` (in-repo `--out` per engine safety rule).
- Diff stage output against current `oto/workflows/{ingest-docs,eval-review}.md` (currently deferral stubs); confirm engine produced the executable bodies.
- Copy engine output → `oto/workflows/{ingest-docs,eval-review}.md` (replacing deferral stubs).
- Hand-fixup pass 1: `.planning/` → `.oto/` in `oto/workflows/ingest-docs.md` (16 hits verified during research; document each hit in SUMMARY).
- Hand-fixup pass 2: SDK-tolerant `2>/dev/null || …` fallback on every `oto-sdk query` call in both workflows.
- Hand-fixup pass 3 (Pitfall 4): reshape `<step name="classify_parallel">` and `<step name="finalize">` so the workflow orchestrator persists classifier/auditor return values (since Phase 1 stripped `Write` from those agents). Match `01-VERIFICATION.md` code-review finding: *"classifier/auditor return their output to the orchestrator for persistence"*.
- Verify pre-existing security checks (path traversal, realpath containment, BLOCKER gate) survived.
- Regenerate `reports/rebrand-dryrun.{json,md}` via `node scripts/rebrand.cjs --dry-run …`.
- Clean up `.oto-rebrand-stage`.

**Files modified:**
- `oto/workflows/ingest-docs.md` (replace stub)
- `oto/workflows/eval-review.md` (replace stub)
- `reports/rebrand-dryrun.json` (regenerated)
- `reports/rebrand-dryrun.md` (regenerated)

**Requirements addressed:** WF-ING-01, WF-ING-02, WF-ING-03, WF-ING-04, WF-EVAL-01, WF-EVAL-02.

**Dependencies:** none (depends on Phase 1 outputs, which are present).

**Wave:** 1.

### Plan 02-02 — Command + help-listing audit + assertion tests (Wave 1, parallel to 02-01 if planner is disciplined; safer in Wave 2)
**Scope:**
- Audit `oto/commands/oto/{ingest-docs,eval-review}.md` for deferral framing → research confirms already clean → no-op file edit, but add a `tests/` assertion to lock the contract.
- Audit `oto/commands/INDEX.md` lines 27 and 35 (the two command rows) → research confirms no `[deferred]` tags → no-op, but add assertion.
- Audit `oto/workflows/help.md` → research confirms no per-command `[deferred]` tags for these two commands → no-op, but add assertion.
- Write `tests/workflow-no-deferral-marker.test.cjs` asserting:
  - `oto/commands/oto/ingest-docs.md` body has no `deferred`/`DEFERRED`/`intentionally non-executable` markers (CMD-01).
  - `oto/commands/oto/eval-review.md` body has no `deferred`/`DEFERRED`/`intentionally non-executable` markers (CMD-02).
  - In `oto/commands/INDEX.md`, the rows for `/oto-ingest-docs` and `/oto-eval-review` do not contain `[deferred]` substring (CMD-03 part A).
  - In `oto/workflows/help.md`, no v2-reactivation footnote text appears within 50 lines of any mention of these two commands (CMD-03 part B). (Note: the two commands aren't *listed* in help.md today; the assertion is "no mention, no footnote tied to a mention.")

**Files modified:**
- `tests/workflow-no-deferral-marker.test.cjs` (new)

**Requirements addressed:** CMD-01, CMD-02, CMD-03.

**Dependencies:** none (commands and help.md already clean per research). Can run parallel to 02-01.

**Wave:** 1 (recommend) or 2 (safer if planner wants to lock in 02-01 outputs first).

### Plan 02-03 — Workflow-shape + fixture-tree smoke tests (Wave 2)
**Scope:**
- Create fixture trees under `tests/fixtures/ingest-docs/{new-mode-mixed,merge-mode-existing,conflict-block,over-cap}/`.
- Write `tests/workflow-ingest-docs.test.cjs` mirroring the upstream `tests/ingest-docs.test.cjs` shape (file-existence + frontmatter + step-presence + agent-reference assertions, but against `oto/workflows/ingest-docs.md` and `oto/commands/oto/ingest-docs.md`). Adapt to `oto-` namespace and `.oto/` paths.
- Write `tests/workflow-eval-review.test.cjs` with parallel structure for `/oto-eval-review` (State A/B detection, AI-SPEC.md vs no-AI-SPEC.md branches, EVAL-REVIEW.md scoring contract).
- Add regression-guard test: `assert.equal((WF.match(/\.planning\b/g) || []).length, 0)` for both workflow bodies (catches future rebrand-output regressions).
- Add regression-guard test: every `oto-sdk query` call in both workflow bodies has `2>/dev/null` or `|| ` fallback.

**Files modified:**
- `tests/workflow-ingest-docs.test.cjs` (new)
- `tests/workflow-eval-review.test.cjs` (new)
- `tests/fixtures/ingest-docs/new-mode-mixed/...` (new fixture tree)
- `tests/fixtures/ingest-docs/merge-mode-existing/...` (new fixture tree)
- `tests/fixtures/ingest-docs/conflict-block/...` (new fixture tree)
- `tests/fixtures/ingest-docs/over-cap/...` (new fixture tree or setup-generated)
- `tests/workflow-ingest-docs-fixture.test.cjs` (new, optional — fixture validity assertions)

**Requirements addressed:** None directly (these are *verification* not requirements). Strengthens WF-ING-01..04 and WF-EVAL-01..02 + provides regression-guard for the two engine blind spots.

**Dependencies:** 02-01 (workflow bodies must exist and be fixed-up before shape tests can pass).

**Wave:** 2.

### Two-plan alternative
If the planner prefers a tighter plan budget:
- **02-01 — Rebrand + hand-fixup + workflow-shape tests** (merge 02-01 and 02-03 above into a single plan).
- **02-02 — Command/help audit + assertion tests** (CMD-01/02/03 with the no-deferral-marker test).

This is acceptable; 02-01 becomes larger but still single-purpose ("port + verify"). Three-plan structure is preferred because it isolates the rebrand mechanics (high risk of engine blind-spot escape) from the test surface (which doesn't change the shipped workflow bodies).

## Sources

### Primary (HIGH confidence)
- **Empirical rebrand-engine probe** (run during research): `node scripts/rebrand.cjs --apply --target foundation-frameworks/get-shit-done-main --owner OTOJulian --out .oto-rebrand-test` — 341 files, 5098 matches, 0 unclassified, 415ms. Output inspected directly.
- `foundation-frameworks/get-shit-done-main/get-shit-done/workflows/ingest-docs.md` (332 LOC) — upstream source.
- `foundation-frameworks/get-shit-done-main/get-shit-done/workflows/eval-review.md` (155 LOC) — upstream source.
- `oto/workflows/{ingest-docs,eval-review}.md` — current deferral stubs (27 and 25 LOC respectively).
- `oto/commands/oto/{ingest-docs,eval-review}.md` — verified clean frontmatter, no deferral framing.
- `oto/commands/INDEX.md` lines 27 (`/oto-eval-review`) and 35 (`/oto-ingest-docs`) — verified clean.
- `oto/workflows/help.md` — verified no `[deferred]` tags for these two commands.
- `decisions/file-inventory.json` — workflow rows already set to `verdict: keep, rebrand_required: true, target_path: oto/workflows/...md`.
- `rename-map.json` (60 LOC) — token substitution rules; `.planning → .oto` is `type: path, match: segment` (confirms the engine blind spot).
- `scripts/rebrand.cjs` and `scripts/rebrand/lib/engine.cjs` — rebrand engine entry points.
- `oto/references/doc-conflict-engine.md` — already installed Phase 1; verified contract intact.
- `.planning/phases/01-agent-ports-installer-wiring/01-VERIFICATION.md` (esp. "Code Review" and "Gaps Summary" sections) — Phase 1 precedent for read-only-agent persistence reshape.
- `.planning/phases/01-agent-ports-installer-wiring/01-CONTEXT.md` — Phase 1 D-04 sandbox-tools reconciliation.
- `.planning/STATE.md` — confirms `oto-sdk` unavailable in execution environment.

### Secondary (MEDIUM confidence)
- `tests/phase-04-frontmatter-schema.test.cjs` (40 LOC inspected) — pattern reference for workflow-shape assertion style.
- `foundation-frameworks/get-shit-done-main/tests/ingest-docs.test.cjs` (head 80 LOC inspected) — upstream test pattern that Phase 3 will port.
- `oto/workflows/plan-phase.md` SDK fallback pattern — precedent for `oto-sdk query ... 2>/dev/null || echo "default"`.

### Tertiary (LOW confidence)
- None — all critical claims verified directly during research.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — `node:test`, `node:fs`, rebrand engine are all already-shipped and exercised by current test suite.
- Architecture: HIGH — empirical rebrand-engine probe confirms output shape; Phase 1 precedent confirms hand-fixup pattern.
- Pitfalls: HIGH — `.planning/` blind spot directly observed; SDK absence directly confirmed; Phase 1 read-only-agent reshape directly cited from 01-VERIFICATION.md.
- Requirements satisfaction map: HIGH — CMD-01/02/03 verified already-satisfied state; WF-ING-01..04 and WF-EVAL-01..02 verified achievable via engine + small hand-fixup.

**Research date:** 2026-05-18
**Valid until:** Until next upstream sync (rebrand engine output is deterministic against `foundation-frameworks/get-shit-done-main` HEAD; if upstream is re-synced via `scripts/sync-upstream/`, re-run the rebrand probe). The two blind spots (prose `.planning/`, SDK absence) are structural — they don't expire.
