---
phase: quick-260714-nzr
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - oto/agents/oto-plan-checker.md
  - oto/agents/oto-security-auditor.md
  - oto/agents/oto-doc-verifier.md
  - oto/agents/oto-ui-auditor.md
  - oto/agents/oto-nyquist-auditor.md
  - oto/agents/oto-integration-checker.md
  - oto/agents/oto-eval-auditor.md
  - .oto/ROADMAP.md
autonomous: true
requirements: [QUICK-260714-NZR]

must_haves:
  truths:
    - "All 7 remaining review/audit agents load model-calibration.md via required_reading before working"
    - "No 'go soft' failure-mode bullet list remains in any oto agent file (repo, ~/.claude, ~/.codex — .md and .toml)"
    - "FORCE stance paragraphs and Required finding classification blocks survive intact in all 7 agents"
    - "ROADMAP.md Phase 14 milestone checkbox is checked with a completion date matching Phase 15's format"
    - "Installed copies under ~/.claude are byte-identical to repo; ~/.codex copies carry the same two edits with ~/.codex-rooted paths"
  artifacts:
    - path: "oto/agents/oto-plan-checker.md"
      provides: "model-calibration in existing required_reading block; adversarial_stance without 'go soft' bullets"
    - path: "oto/agents/oto-security-auditor.md"
      provides: "new required_reading block; adversarial_stance without 'go soft' bullets"
    - path: "oto/agents/oto-doc-verifier.md"
      provides: "new required_reading block; adversarial_stance without 'go soft' bullets"
    - path: "oto/agents/oto-ui-auditor.md"
      provides: "new required_reading block; adversarial_stance without 'go soft' bullets"
    - path: "oto/agents/oto-nyquist-auditor.md"
      provides: "new required_reading block; adversarial_stance without 'go soft' bullets"
    - path: "oto/agents/oto-integration-checker.md"
      provides: "new required_reading block; adversarial_stance without 'go soft' bullets"
    - path: "oto/agents/oto-eval-auditor.md"
      provides: "model-calibration prose line in existing required_reading block; adversarial_stance without 'go soft' bullets"
    - path: ".oto/ROADMAP.md"
      provides: "Phase 14 checkbox checked with completion date"
      contains: "[x] **Phase 14: Key Storage Reconciliation"
  key_links:
    - from: "oto/agents/oto-plan-checker.md"
      to: "oto/references/model-calibration.md"
      via: "required_reading @-reference"
      pattern: "model-calibration"
    - from: "~/.codex/agents/*.md"
      to: "~/.codex/oto/references/model-calibration.md"
      via: "required_reading reference rooted at ~/.codex (never cross-runtime)"
      pattern: "~/.codex/oto/references/model-calibration"
---

<objective>
Extend the review-machinery recalibration (quick 260713-ffa) to the remaining 7 review/audit agents: wire model-calibration.md into each via required_reading, delete each agent's "go soft" failure-mode bullet list, fix the stale Phase 14 milestone checkbox in ROADMAP.md, and sync to all installed runtime roots (~/.claude straight-copy, ~/.codex edit-in-place including .toml sidecar deletions; Gemini has no oto install — skip with a SUMMARY note).

Purpose: 260713-ffa recalibrated only oto-code-reviewer and oto-verifier; its SUMMARY explicitly deferred the same fix for these 7 agents. Without it, 7 of 9 review agents still carry the severity-inflating bullet lists and never load the calibration anchor.

Output: 7 surgically edited repo agent files + 1 ROADMAP checkbox fix, propagated to 7 ~/.claude copies and 14 ~/.codex files (7 .md + 7 .toml).

**SCOPE DISCIPLINE (user-locked):** Touch ONLY the 7 listed repo agent files, .oto/ROADMAP.md, their installed counterparts under ~/.claude and ~/.codex, and the .oto tracking artifacts the quick workflow maintains. Do NOT modify oto-code-reviewer.md, oto-verifier.md, any gsd-* file, or any workflow file. If any installed file is missing where expected or any step needs elevated permissions, STOP and report — do not work around it.
</objective>

<execution_context>
@~/.claude/oto/workflows/execute-plan.md
@~/.claude/oto/templates/summary.md
</execution_context>

<context>
@.oto/STATE.md
@CLAUDE.md
@oto/agents/oto-code-reviewer.md (reference only — shows the finished 260713-ffa pattern; DO NOT MODIFY)
</context>

<pre_verified_state>
Facts confirmed during planning (2026-07-14) — the plan below assumes these; re-verify cheaply before editing and STOP if any no longer holds:

- All 7 repo agents share the same `<adversarial_stance>` shape: FORCE-stance paragraph, then a "**Common failure modes — how {X} go soft:**" heading + exactly 5 bullets + blank line, then a "**Required finding classification:**" block.
- Existing required_reading blocks: **oto-plan-checker.md** has `<required_reading>` (lines ~45-47) containing `@~/.claude/oto/references/gates.md`; **oto-eval-auditor.md** has `<required_reading>` (lines ~29-31) in prose style ("Read `~/.claude/oto/references/ai-evals.md` before auditing…"). The other 5 have NO static block.
- **oto-doc-verifier.md** contains a stray second `</role>` at end of file (~line 217) — insertions must anchor on the FIRST `</role>` (~line 25).
- All 7 `~/.claude/agents/oto-*.md` copies are byte-identical to repo → straight copy after repo edits.
- All 7 `~/.codex/agents/oto-*.md` copies DIFFER from repo (Codex adaptations; existing required_reading blocks there use `~/.codex/...` paths) → edit-in-place, never overwrite.
- All 7 `~/.codex/agents/oto-*.toml` sidecars embed exactly one "go soft" block inside developer_instructions → deletion-only edit (matches 260713-in8 handling).
- `~/.claude/oto/references/model-calibration.md` and `~/.codex/oto/references/model-calibration.md` both exist.
- `~/.gemini/` has no oto install (no `~/.gemini/oto/`, no `~/.gemini/agents/`) → skip Gemini, note in SUMMARY.
- ROADMAP.md line 30 is the Phase 14 milestone checkbox (unchecked); Phase 15's format is `- [x] **Phase 15: …** - … — completed 2026-07-14`.
</pre_verified_state>

<tasks>

<task type="auto">
  <name>Task 1: Apply the two recalibration edits to all 7 repo agent files + fix ROADMAP Phase 14 checkbox</name>
  <files>oto/agents/oto-plan-checker.md, oto/agents/oto-security-auditor.md, oto/agents/oto-doc-verifier.md, oto/agents/oto-ui-auditor.md, oto/agents/oto-nyquist-auditor.md, oto/agents/oto-integration-checker.md, oto/agents/oto-eval-auditor.md, .oto/ROADMAP.md</files>
  <action>
**1a. DELETE the "go soft" block in each of the 7 files.** In each file's `<adversarial_stance>` section, delete the heading line `**Common failure modes — how {X} go soft:**`, its 5 bullets, and ONE adjacent blank line so exactly one blank line separates the FORCE-stance paragraph from the `**Required finding classification**` block (mirror oto-code-reviewer.md's post-edit shape). Locate by heading text, not line number. Headings per file:

| File | Heading contains |
|------|-----------------|
| oto-plan-checker.md | "how plan checkers go soft" |
| oto-security-auditor.md | "how security auditors go soft" |
| oto-doc-verifier.md | "how doc verifiers go soft" |
| oto-ui-auditor.md | "how UI auditors go soft" |
| oto-nyquist-auditor.md | "how Nyquist auditors go soft" |
| oto-integration-checker.md | "how integration checkers go soft" |
| oto-eval-auditor.md | "how eval auditors go soft" |

KEEP untouched in every file: the FORCE-stance paragraph, the entire Required finding classification block, and all evidence/verify-against-actual-code instructions elsewhere in the file.

**1b. ADD the model-calibration required_reading reference, following each file's existing structural pattern:**

- **oto-plan-checker.md** (has @-style block): inside the existing `<required_reading>` block, add a line after `@~/.claude/oto/references/gates.md`:
  `@~/.claude/oto/references/model-calibration.md`

- **oto-eval-auditor.md** (has prose-style block): inside the existing `<required_reading>` block, add a line after the ai-evals.md sentence:
  ``Read `~/.claude/oto/references/model-calibration.md` before auditing. This is your severity and convergence anchor.``

- **The other 5** (oto-security-auditor.md, oto-doc-verifier.md, oto-ui-auditor.md, oto-nyquist-auditor.md, oto-integration-checker.md — no static block): insert a new block between the FIRST `</role>` and `<adversarial_stance>`, exactly as done for oto-code-reviewer.md in 260713-ffa (blank line, block, blank line):

  ```
  <required_reading>
  @~/.claude/oto/references/model-calibration.md
  </required_reading>
  ```

  CAUTION (oto-doc-verifier.md): anchor on the FIRST `</role>` (~line 25), not the stray one at EOF. After every insertion, confirm no duplicate/orphan tags were introduced (260713-ffa hit a duplicated `</role>` doing the same insertion).

**1c. FIX ROADMAP checkbox.** In `.oto/ROADMAP.md` line 30, change `- [ ] **Phase 14: Key Storage Reconciliation**` to `- [x] **Phase 14: Key Storage Reconciliation**` and append ` — completed 2026-07-13` at the end of the line, matching Phase 15's format. Touch nothing else in ROADMAP.md (do NOT touch the `### Phase 14:` detail section at line ~86).
  </action>
  <verify>
    <automated>test "$(grep -l "model-calibration" oto/agents/oto-plan-checker.md oto/agents/oto-security-auditor.md oto/agents/oto-doc-verifier.md oto/agents/oto-ui-auditor.md oto/agents/oto-nyquist-auditor.md oto/agents/oto-integration-checker.md oto/agents/oto-eval-auditor.md | wc -l)" -eq 7 && ! grep -rn "go soft" oto/agents/ && test "$(grep -c "FORCE stance" oto/agents/oto-plan-checker.md oto/agents/oto-security-auditor.md oto/agents/oto-doc-verifier.md oto/agents/oto-ui-auditor.md oto/agents/oto-nyquist-auditor.md oto/agents/oto-integration-checker.md oto/agents/oto-eval-auditor.md | grep -c ":1")" -eq 7 && grep -q '\[x\] \*\*Phase 14: Key Storage Reconciliation\*\*' .oto/ROADMAP.md && grep "Phase 14: Key Storage Reconciliation" .oto/ROADMAP.md | head -1 | grep -q "completed 2026-07-13"</automated>
  </verify>
  <done>All 7 repo agents reference model-calibration via required_reading; "go soft" appears nowhere under oto/agents/; FORCE stance and finding-classification blocks intact in all 7; ROADMAP line 30 checked with completion date; oto-code-reviewer.md and oto-verifier.md untouched (git diff shows no changes to them).</done>
</task>

<task type="auto">
  <name>Task 2: Sync installed runtime roots (~/.claude copy, ~/.codex edit-in-place incl. .toml sidecars, Gemini skip)</name>
  <files>oto/agents/oto-plan-checker.md, oto/agents/oto-security-auditor.md, oto/agents/oto-doc-verifier.md, oto/agents/oto-ui-auditor.md, oto/agents/oto-nyquist-auditor.md, oto/agents/oto-integration-checker.md, oto/agents/oto-eval-auditor.md</files>
  <action>
**2a. ~/.claude — straight copy.** Planning verified all 7 installed .md copies were byte-identical to the repo pre-change state, so copy each edited repo file over its installed counterpart, then `diff -q` each pair (must exit 0):

```bash
for f in oto-plan-checker oto-security-auditor oto-doc-verifier oto-ui-auditor oto-nyquist-auditor oto-integration-checker oto-eval-auditor; do
  cp "oto/agents/$f.md" ~/.claude/agents/"$f.md" && diff -q "oto/agents/$f.md" ~/.claude/agents/"$f.md" || exit 1
done
```

If any pre-copy `diff -q` against the repo's PRE-change state would have failed (i.e., the installed file drifted since planning), apply the two edits in-place instead of copying — but planning found no drift, so copy is expected for all 7.

**2b. ~/.codex — edit-in-place, NEVER overwrite.** All 7 `.md` copies carry Codex adaptations. For each of the 7 `~/.codex/agents/{name}.md`:
- Apply the SAME "go soft" deletion as Task 1a (locate by heading text).
- Apply the SAME required_reading addition as Task 1b, but every path must be rooted at `~/.codex` — i.e. `@~/.codex/oto/references/model-calibration.md` (plan-checker's existing block already uses `@~/.codex/oto/references/gates.md`; eval-auditor's prose line becomes ``Read `~/.codex/oto/references/model-calibration.md` …``). NEVER write a `~/.claude` path into a `~/.codex` file.

For each of the 7 `~/.codex/agents/{name}.toml` sidecars (all confirmed to embed the "go soft" block in developer_instructions): apply the DELETION-ONLY edit — remove the heading + 5 bullets + one adjacent blank line. Do NOT add required_reading lines to .toml files, do NOT touch any other TOML key (matches 260713-in8 handling).

**2c. Gemini — skip.** Planning confirmed `~/.gemini` contains no oto install (no `~/.gemini/oto/`, no `~/.gemini/agents/`). Re-check with `ls ~/.gemini/oto ~/.gemini/agents 2>/dev/null`; if still absent, record "gemini: no install, skipped" for the SUMMARY. If an oto install HAS appeared, apply the same sync there with Gemini-rooted paths.

If any expected installed file is missing, or any write fails for permissions, STOP and report — do not work around it. Do not touch any gsd-* file, oto-code-reviewer.*, or oto-verifier.* in any root.
  </action>
  <verify>
    <automated>for f in oto-plan-checker oto-security-auditor oto-doc-verifier oto-ui-auditor oto-nyquist-auditor oto-integration-checker oto-eval-auditor; do diff -q "oto/agents/$f.md" ~/.claude/agents/"$f.md" && grep -q "~/.codex/oto/references/model-calibration" ~/.codex/agents/"$f.md" || exit 1; done && ! grep -rn "go soft" ~/.claude/agents/oto-plan-checker.md ~/.claude/agents/oto-security-auditor.md ~/.claude/agents/oto-doc-verifier.md ~/.claude/agents/oto-ui-auditor.md ~/.claude/agents/oto-nyquist-auditor.md ~/.claude/agents/oto-integration-checker.md ~/.claude/agents/oto-eval-auditor.md && ! grep -rn "go soft" ~/.codex/agents/oto-plan-checker.md ~/.codex/agents/oto-plan-checker.toml ~/.codex/agents/oto-security-auditor.md ~/.codex/agents/oto-security-auditor.toml ~/.codex/agents/oto-doc-verifier.md ~/.codex/agents/oto-doc-verifier.toml ~/.codex/agents/oto-ui-auditor.md ~/.codex/agents/oto-ui-auditor.toml ~/.codex/agents/oto-nyquist-auditor.md ~/.codex/agents/oto-nyquist-auditor.toml ~/.codex/agents/oto-integration-checker.md ~/.codex/agents/oto-integration-checker.toml ~/.codex/agents/oto-eval-auditor.md ~/.codex/agents/oto-eval-auditor.toml && ! grep -rn '~/.claude' ~/.codex/agents/oto-plan-checker.md ~/.codex/agents/oto-security-auditor.md ~/.codex/agents/oto-doc-verifier.md ~/.codex/agents/oto-ui-auditor.md ~/.codex/agents/oto-nyquist-auditor.md ~/.codex/agents/oto-integration-checker.md ~/.codex/agents/oto-eval-auditor.md</automated>
  </verify>
  <done>All 7 ~/.claude copies byte-identical to repo; all 7 ~/.codex .md copies reference ~/.codex-rooted model-calibration with no cross-runtime (~/.claude) paths; "go soft" absent from all 21 synced files (7 ~/.claude .md + 7 ~/.codex .md + 7 ~/.codex .toml); Gemini skip (or sync) recorded.</done>
</task>

<task type="auto">
  <name>Task 3: Full verification and atomic commit</name>
  <files>oto/agents/oto-plan-checker.md, oto/agents/oto-security-auditor.md, oto/agents/oto-doc-verifier.md, oto/agents/oto-ui-auditor.md, oto/agents/oto-nyquist-auditor.md, oto/agents/oto-integration-checker.md, oto/agents/oto-eval-auditor.md, .oto/ROADMAP.md</files>
  <action>
**3a. VERIFY (all four spec gates):**
1. `grep -l "model-calibration"` lists all 7 repo agent files, all 7 ~/.claude copies, and all 7 ~/.codex .md copies (21 files).
2. `grep -rn "go soft"` returns NOTHING under `oto/agents/`, nothing across the 7 ~/.claude oto agent .md files, and nothing across the 14 ~/.codex oto agent files (.md + .toml). (Scope installed-root greps to the oto-* review agents synced here — gsd-* files are out of scope and must remain untouched.)
3. `npm test` exits 0. Known side effect from 260713-ffa: npm test may regenerate `reports/rebrand-dryrun.{json,md}`; if `git status` shows them modified afterward, restore with `git checkout -- reports/rebrand-dryrun.json reports/rebrand-dryrun.md`.
4. `git status --porcelain` shows ONLY the 7 repo agent files, `.oto/ROADMAP.md`, and .oto quick-workflow tracking artifacts (this PLAN.md / SUMMARY.md / STATE.md entry). Confirm `git diff --name-only` includes neither `oto/agents/oto-code-reviewer.md` nor `oto/agents/oto-verifier.md` nor any workflow file.

**3b. COMMIT** — single atomic commit touching only in-scope repo files:

```bash
git add oto/agents/oto-plan-checker.md oto/agents/oto-security-auditor.md oto/agents/oto-doc-verifier.md oto/agents/oto-ui-auditor.md oto/agents/oto-nyquist-auditor.md oto/agents/oto-integration-checker.md oto/agents/oto-eval-auditor.md .oto/ROADMAP.md
```

Commit message: `feat(quick): extend review-machinery recalibration to remaining 7 review agents`. Files under ~/.claude and ~/.codex are outside the repo and are not committed. After committing, `git status` must be clean apart from .oto tracking artifacts the orchestrator commits.
  </action>
  <verify>
    <automated>npm test && ! grep -rn "go soft" oto/agents/ && test "$(grep -rl "model-calibration" oto/agents/ | wc -l)" -ge 9 && git diff --quiet -- oto/agents/oto-code-reviewer.md oto/agents/oto-verifier.md oto/workflows/</automated>
  </verify>
  <done>npm test green; all greps pass across repo and both synced runtime roots; commit contains only the 7 agent files + ROADMAP.md; out-of-scope files (oto-code-reviewer, oto-verifier, workflows, gsd-*) show zero diff.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| repo → ~/.claude and ~/.codex installed copies | Prompt text written into live agent config; a bad edit silently changes reviewer behavior across runtimes |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-quick-01 | Tampering | ~/.claude sync | mitigate | `diff -q` after every copy proves installed == repo |
| T-quick-02 | Tampering | ~/.codex edit-in-place | mitigate | Deletion/insertion anchored on exact heading text; post-edit greps prove "go soft" gone, calibration path present, and no `~/.claude` path leaked into `~/.codex` files |
| T-quick-03 | Elevation of privilege | writes outside repo | accept | Writes limited to user-owned dotdirs; executor STOPs on any permission error per locked scope rule |
</threat_model>

<verification>
- `grep "model-calibration"` present in all 7 repo agent files, all 7 `~/.claude/agents/oto-*.md` copies, and all 7 `~/.codex/agents/oto-*.md` copies.
- `grep -r "go soft"` empty under `oto/agents/` and across all synced oto agent files in both runtime roots (.md and .toml).
- FORCE stance + Required finding classification blocks intact in all 7 agents (repo and installed).
- Reference paths in `~/.codex` files resolve under `~/.codex` only — zero `~/.claude` occurrences in edited Codex files.
- ROADMAP.md line 30: `- [x] **Phase 14: Key Storage Reconciliation** - … — completed 2026-07-13`.
- Gemini: "no install, skipped" recorded in SUMMARY (unless an install appeared and was synced).
- `npm test` exits 0; `git status` clean; commit touches only the 7 agent files + ROADMAP.md + .oto tracking artifacts.
</verification>

<success_criteria>
- All 9 oto review/audit agents (the 2 from 260713-ffa plus these 7) now load model-calibration.md before working, in every installed runtime root.
- Severity-inflating "go soft" bullet lists are fully eradicated from the framework — repo and all runtime copies, .md and .toml alike — while evidence requirements and finding classification survive.
- Phase 14 milestone checkbox reflects reality.
- oto-code-reviewer.md, oto-verifier.md, workflow files, and all gsd-* files untouched.
</success_criteria>

<output>
After completion, create `.oto/quick/260714-nzr-extend-review-machinery-recalibration-to/260714-nzr-SUMMARY.md`
</output>
