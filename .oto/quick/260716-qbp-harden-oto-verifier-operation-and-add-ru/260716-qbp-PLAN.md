---
phase: quick-260716-qbp
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - oto/agents/oto-verifier.md
  - oto/workflows/execute-phase.md
  - scripts/check-runtime-sync.cjs
  - tests/check-runtime-sync.test.cjs
  - CLAUDE.md
autonomous: true
requirements: [QUICK-260716-QBP]

must_haves:
  truths:
    - "oto-verifier.md carries an operational_requirements section: per-requirement heartbeat log line, non-interactive command execution with per-command timeout, and human_needed fallback for non-runnable gates"
    - "execute-phase.md verify_phase_goal spawn prompt states an explicit verification_scope (full sweep on first verification; closure-changed files + prior-blocker reproductions on re-verification)"
    - "execute-phase.md defines the verifier liveness policy: external 30-min timeout, 10-min progress-log silence = stall, kill+respawn at most once, second stall = inline verification, never a third verifier"
    - "node scripts/check-runtime-sync.cjs exits 0 on this machine and exits 0 with skip notices when no runtime roots exist (CI-safe)"
    - "npm test exits 0 including the new runtime-sync test"
    - "Both edited files are synced to ~/.claude and ~/.codex (verifier per runtime-conditional pattern incl. .toml sidecar; execute-phase.md straight copy); Gemini skipped with a SUMMARY note (no oto install)"
    - "Repo CLAUDE.md carries the runtime-sync rule"
  artifacts:
    - path: "oto/agents/oto-verifier.md"
      provides: "operational_requirements section between </core_principle> and <verification_process>"
      contains: "VERIFICATION-progress"
    - path: "oto/workflows/execute-phase.md"
      provides: "verification_scope in verifier spawn instructions + liveness policy"
      contains: "verification_scope"
    - path: "scripts/check-runtime-sync.cjs"
      provides: "repo vs installed-root drift guard for oto/workflows/ and oto/references/ plus agent .md adversarial_stance→model-calibration invariant"
    - path: "tests/check-runtime-sync.test.cjs"
      provides: "node:test that runs the script and asserts exit 0"
    - path: "CLAUDE.md"
      provides: "runtime-sync guardrail rule"
      contains: "check-runtime-sync"
  key_links:
    - from: "oto/workflows/execute-phase.md"
      to: "{phase-dir}/{phase}-VERIFICATION-progress.log"
      via: "liveness policy monitors the heartbeat file the verifier appends to"
      pattern: "VERIFICATION-progress"
    - from: "tests/check-runtime-sync.test.cjs"
      to: "scripts/check-runtime-sync.cjs"
      via: "spawnSync(process.execPath, [script])"
      pattern: "check-runtime-sync"
---

<objective>
Harden oto-verifier operation (progress heartbeat, non-interactive command discipline, human_needed fallback), add verification-scope and liveness-policy rules to the execute-phase verifier spawn instructions, ship a runtime-sync drift guard (script + test + CLAUDE.md rule), and sync the two edited files to all installed runtime roots.

Purpose: Phase 15 P10 showed a verifier can stall for hours with no external signal (13h 31m plan duration). The heartbeat + liveness policy makes stalls observable and bounded; the scope rule keeps re-verifications cheap; the drift guard makes "repo edited but runtime roots not synced" a detectable, test-enforced failure instead of silent divergence.

Output: 5 repo files edited/created + installed copies under ~/.claude and ~/.codex brought byte-current.

**SCOPE DISCIPLINE (user-locked):** Repo commits touch ONLY: oto/agents/oto-verifier.md, oto/workflows/execute-phase.md, scripts/check-runtime-sync.cjs, tests/check-runtime-sync.test.cjs, CLAUDE.md, and .oto/ tracking files. Installed-root writes (~/.claude, ~/.codex) are outside the repo and are never committed. If any step needs elevated permissions or an expected file is missing, STOP and report — do not work around it.

**WORKTREE NOTE:** The executor runs in a git worktree isolated from the user's home directory syncing. Writes to ~/.claude, ~/.codex, ~/.gemini are absolute home paths OUTSIDE the repo — they work fine from a worktree. Do not be confused by the worktree cwd; always use absolute paths for installed-root reads/writes, and resolve repo files relative to the worktree root.
</objective>

<execution_context>
@~/.claude/oto/workflows/execute-plan.md
@~/.claude/oto/templates/summary.md
</execution_context>

<context>
@.oto/STATE.md
@CLAUDE.md
@.oto/quick/260713-in8-propagate-review-machinery-recalibration/260713-in8-SUMMARY.md (established runtime-sync pattern: straight-copy for runtime-neutral workflows/references; edit-in-place for Codex agent files with ~/.codex-rooted paths; .toml sidecar handling; Gemini skip)
@.oto/quick/260714-nzr-extend-review-machinery-recalibration-to/260714-nzr-SUMMARY.md (same pattern extended; single-atomic-commit precedent; path-locality rule)
</context>

<pre_verified_state>
Facts confirmed during planning (2026-07-16) — re-verify cheaply before editing and STOP if any no longer holds:

- **Repo oto/agents/oto-verifier.md** (824 lines): top-level XML sections in order: role, adversarial_stance, required_reading, project_context, core_principle (ends line 63), verification_process (starts line 65), output, critical_rules, stub_detection_patterns, success_criteria. Convention for rule sections: bold-led rule sentences (see critical_rules). Insert anchor: between `</core_principle>` and `<verification_process>`.
- **Repo oto/workflows/execute-phase.md** (1684 lines): `<step name="verify_phase_goal">` starts at line 1325; the `Task(...)` spawn block is at lines 1332-1358; the "ORCHESTRATOR RULE — CODEX RUNTIME" blockquote follows at line 1360. Gap-closure re-verification re-enters this same step (line ~1464), so both scope branches live here.
- **Phase 15 precedent for the scope key:** `.oto/phases/15-exa-mcp-registration-all-three-runtimes/15-VERIFICATION.md` line 10: `verification_scope: "closure-changed files plus CR-01, CR-02, and WR-01 reproductions only"`.
- **~/.claude**: full oto install. `diff -rq oto/workflows/ ~/.claude/oto/workflows/` and `diff -rq oto/references/ ~/.claude/oto/references/` both exit 0 (fully synced pre-change). `~/.claude/agents/oto-verifier.md` is byte-identical to repo → straight-copy branch applies after edit.
- **~/.codex**: full oto install, but with PRE-EXISTING WORKFLOW DRIFT (3 items): `autonomous.md` differs (stale — missing the oto-sdk PATH guard), `settings-integrations.md` differs (stale pre-Phase-14 version that still describes plaintext keys in .oto/config.json — repo version is the secure one), and `oto/workflows/lib/` (containing `sdk-require.md`) is missing entirely. References are fully synced. `~/.codex/agents/oto-verifier.md` carries Codex adaptations (quoted frontmatter, `<codex_agent_role>` block, `@~/.codex/...` paths) with the same section anchors: `</core_principle>` at line 62, `<verification_process>` at line 64 → edit-in-place branch. `~/.codex/agents/oto-verifier.toml` embeds the FULL agent body in `developer_instructions = '''...'''` including both anchors → the new section must be inserted there too.
- **~/.gemini**: exists but has NO oto install (`~/.gemini/oto` does not exist) → skip with SUMMARY note "gemini: no install, skipped".
- **Agent-invariant reality check:** all 9 `~/.codex/agents/*.toml` sidecars contain "adversarial_stance" but NOT "model-calibration" — a deliberate prior decision (260713-in8 / 260714-nzr: .toml sidecars received deletion-only edits, no required_reading references added). All installed agent `.md` files satisfy the invariant (0 fail candidates in ~/.claude and ~/.codex).
- **Test/script conventions:** `npm test` = `node --test --test-concurrency=4 tests/*.test.cjs` (currently 915 tests, 0 failures); tests are `'use strict'` CJS using `node:test` + `node:assert/strict` (see tests/260616-muv-doctor.test.cjs); scripts are plain `.cjs`/`.js` in scripts/ with no deps.
- Session shell is zsh with grep→ugrep aliasing in interactive mode; verification commands in Bash tool run fine, but prefer explicit loops/arrays over unquoted word-splitting.
</pre_verified_state>

<planning_decision flag="review-me">
**Agent invariant is scoped to `.md` files only — .toml sidecars excluded.** The task spec says "any installed agent file containing 'adversarial_stance' also references 'model-calibration'", but planning verified that all 9 ~/.codex .toml sidecars contain adversarial_stance WITHOUT model-calibration, by deliberate prior decision (in8/nzr: no required_reading lines in TOML). A literal all-files check would make the required exit-0 gate impossible without out-of-scope edits to 9 tomls that would contradict those decisions. The script therefore checks `<root>/agents/*.md` only, with a code comment documenting the exclusion and why. If the user wants the .toml sidecars brought under the invariant instead, that is a follow-up quick task.
</planning_decision>

<tasks>

<task type="auto">
  <name>Task 1: Repo edits — verifier operational_requirements, execute-phase scope + liveness, CLAUDE.md rule</name>
  <files>oto/agents/oto-verifier.md, oto/workflows/execute-phase.md, CLAUDE.md</files>
  <action>
**1a. oto/agents/oto-verifier.md** — insert a new top-level `<operational_requirements>` section between `</core_principle>` (line 63) and `<verification_process>` (line 65), following the file's bold-led rule convention (mirroring critical_rules style):

```markdown
<operational_requirements>

**Progress heartbeat.** Immediately after completing each requirement check, append ONE line to `{phase-dir}/{phase}-VERIFICATION-progress.log` in the format: `{ISO-8601 timestamp} {requirement ID} {verdict}` (e.g., `2026-07-16T14:02:11Z AUTH-01 SATISFIED`). This file is how an external observer distinguishes active work from a stall — never batch heartbeat lines for later.

**Non-interactive execution only.** Every spawned command MUST run non-interactively — pipe or close stdin (e.g., `< /dev/null`) and set a per-command timeout. Never wait on a TTY prompt. Consent-gated installers skipping registration on non-interactive stdin is expected and acceptable for verification purposes.

**Non-runnable gates become human_needed.** If a reproduction or gate cannot run non-interactively, record that item as `human_needed` rather than blocking the verification on it.

</operational_requirements>
```

**1b. oto/workflows/execute-phase.md, step `verify_phase_goal`** (starts line 1325) — two additions:

(i) **verification_scope.** Before the `Task(...)` block (after the VERIFIER_SKILLS bash snippet), add an orchestrator instruction to determine scope BEFORE spawning:
- If this is the phase's FIRST verification (no existing `{phase_dir}/*-VERIFICATION.md`): `verification_scope` = full sweep of all must_haves and requirement IDs.
- If this is a post-gap-closure or post-disposition re-verification: scope MUST be limited to closure-changed files plus the specific prior-blocker reproductions (mirroring the `verification_scope` frontmatter key used in Phase 15's final verification, e.g. `verification_scope: "closure-changed files plus CR-01, CR-02, and WR-01 reproductions only"`).

Then add a line inside the Task prompt template (alongside "Phase goal:" / "Phase requirement IDs:") requiring the spawn prompt to state it explicitly, e.g. `Verification scope: {verification_scope — full sweep | closure-changed files plus {prior blocker IDs} reproductions only}`.

(ii) **Verifier liveness policy.** After the `Task(...)` block (adjacent to the existing "ORCHESTRATOR RULE — CODEX RUNTIME" blockquote), add a policy block stating: the orchestrator enforces a timeout from OUTSIDE the verifier (default 30 minutes); absence of new lines in `{phase_dir}/{phase}-VERIFICATION-progress.log` for 10+ minutes is a stall signal; on stall, kill and respawn the verifier AT MOST once; a second stall means run the verification inline in the orchestrator session instead. Never spawn a third verifier.

**1c. CLAUDE.md** — insert a new section AFTER `## OTO Workflow Enforcement` and BEFORE `## Developer Profile` (the Developer Profile section is tool-managed — do not touch it):

```markdown
## Runtime Sync Guardrail

Any change to oto/agents/, oto/workflows/, or oto/references/ must be synced to every installed runtime root (~/.claude, ~/.codex, and ~/.gemini if present) and diff-verified in the same task. Run node scripts/check-runtime-sync.cjs to confirm.
```

Commit: `feat(quick-260716-qbp): harden verifier operation and verifier spawn contract` touching exactly these 3 files.
  </action>
  <verify>
    <automated>grep -c "VERIFICATION-progress" oto/agents/oto-verifier.md && grep -c "verification_scope" oto/workflows/execute-phase.md && grep -c "VERIFICATION-progress" oto/workflows/execute-phase.md && grep -c "check-runtime-sync" CLAUDE.md</automated>
  </verify>
  <done>operational_requirements section present with all three rules; verify_phase_goal states scope rule (first = full sweep, re-verification = closure-changed files + prior-blocker reproductions) in the spawn prompt; liveness policy present (30-min external timeout, 10-min log silence = stall, respawn at most once, second stall = inline, never a third); CLAUDE.md rule appended; commit contains exactly the 3 files.</done>
</task>

<task type="auto">
  <name>Task 2: Create scripts/check-runtime-sync.cjs and its test</name>
  <files>scripts/check-runtime-sync.cjs, tests/check-runtime-sync.test.cjs</files>
  <action>
**2a. scripts/check-runtime-sync.cjs** — plain CJS, zero deps, Node >=22. Behavior:

- Resolve repo root as `path.resolve(__dirname, '..')` (works from any cwd, including worktrees).
- Runtime roots: `~/.claude`, `~/.codex`, `~/.gemini` via `os.homedir()`.
- For each root: if the root directory is absent OR `<root>/oto` does not exist → print a skip notice (e.g., `skip: ~/.gemini (no oto install)`) and continue. This is the CI-safe path.
- For each root with an oto install, ONE-DIRECTIONAL recursive comparison (repo → installed) of `oto/workflows/` and `oto/references/` (including subdirectories like `workflows/lib/`, `workflows/execute-phase/`, `workflows/discuss-phase/`): every repo file must have an installed counterpart at `<root>/oto/workflows/...` / `<root>/oto/references/...` that is byte-identical (`fs.readFileSync` buffer compare). Missing counterpart or content mismatch → record a drift line (`DRIFT: <root>/<relpath> (missing|differs)`). Extra installed files not in the repo are NOT drift. **Agents are deliberately NOT content-compared** — installed agent files legitimately carry runtime-specific adaptations (quoted frontmatter, `<codex_agent_role>`, runtime-rooted paths).
- Agent invariant check instead: for each `<root>/agents/*.md` (if the agents dir exists) whose content contains `adversarial_stance`, require the content to also contain `model-calibration`; violation → drift line. `.toml` sidecars are EXCLUDED — add a code comment: Codex .toml sidecars deliberately carry no required_reading references (quick tasks 260713-in8 / 260714-nzr), so the invariant applies to agent .md files only.
- Print all drift lines, then exit 1 if any drift was found; otherwise print a per-root OK/skip summary and exit 0.

**2b. tests/check-runtime-sync.test.cjs** — `'use strict'` CJS using `node:test` + `node:assert/strict` (match tests/260616-muv-doctor.test.cjs conventions). Single test: `spawnSync(process.execPath, [path to scripts/check-runtime-sync.cjs], { encoding: 'utf8' })`; assert `result.status === 0`, including the script's stdout+stderr in the assertion message so a drift failure is self-explanatory. When no runtime roots exist (CI), the script exits 0 with skip notices and the test passes — no special skip logic needed in the test itself.

**2c. Sanity check of detection (do NOT run full npm test yet):** run `node scripts/check-runtime-sync.cjs` now and confirm it exits NON-zero, reporting exactly the expected current drift: `~/.claude` execute-phase.md differs (Task 1 edit not yet synced) and `~/.codex` execute-phase.md differs + `autonomous.md` differs + `settings-integrations.md` differs + `workflows/lib/sdk-require.md` missing, and `~/.gemini` skipped. This uses the real current state as a live fixture proving the guard detects drift. If the reported drift set differs materially from this list, STOP and report.

Commit: `feat(quick-260716-qbp): add runtime-sync drift guard script and test` touching exactly these 2 files. (npm test is deliberately deferred to Task 3 — the new test correctly fails until the roots are synced.)
  </action>
  <verify>
    <automated>node scripts/check-runtime-sync.cjs > /dev/null 2>&1; test $? -eq 1 && node -e "const r=require('child_process').spawnSync(process.execPath,['--test','tests/check-runtime-sync.test.cjs'],{encoding:'utf8'}); process.exit(r.status===0?1:0)"</automated>
  </verify>
  <done>Script exists, exits 1 on the known pre-sync drift with a readable per-file report, exits 0 with skip notices when roots lack an oto install; test file exists and (correctly) fails pre-sync; commit contains exactly the 2 files.</done>
</task>

<task type="auto">
  <name>Task 3: Sync to runtime roots, then full verification</name>
  <files>~/.claude/agents/oto-verifier.md, ~/.claude/oto/workflows/execute-phase.md, ~/.codex/agents/oto-verifier.md, ~/.codex/agents/oto-verifier.toml, ~/.codex/oto/workflows/execute-phase.md, ~/.codex/oto/workflows/autonomous.md, ~/.codex/oto/workflows/settings-integrations.md, ~/.codex/oto/workflows/lib/sdk-require.md</files>
  <action>
All writes in this task are OUTSIDE the repo (absolute home paths — fine from the worktree). No repo commits in this task. Path-locality rule (per 260713-in8): any path written into an installed copy must resolve under that runtime's own root — never write a `~/.claude` path into a `~/.codex` file. The new operational_requirements section contains no runtime-rooted paths, so its text is identical across runtimes.

**3a. ~/.claude (straight-copy branch — pre-verified byte-identical before Task 1):**
- Copy repo `oto/agents/oto-verifier.md` → `~/.claude/agents/oto-verifier.md`; verify `diff -q` identical.
- Copy repo `oto/workflows/execute-phase.md` → `~/.claude/oto/workflows/execute-phase.md`; verify `diff -q` identical.
- Before each copy, confirm the installed file still matches the PRE-Task-1 repo version (`git show HEAD~2:oto/agents/oto-verifier.md` etc. or equivalent); if an installed file drifted since planning, STOP and report instead of overwriting.

**3b. ~/.codex (edit-in-place branch for the agent; straight copy for workflows):**
- `~/.codex/agents/oto-verifier.md`: insert the SAME `<operational_requirements>` section between `</core_principle>` (line ~62) and `<verification_process>` (line ~64). Do not touch the Codex adaptations (quoted frontmatter, codex_agent_role block, `~/.codex` paths).
- `~/.codex/agents/oto-verifier.toml` (sidecar check — it embeds the full agent body in `developer_instructions`): insert the same section at the same anchor (`</core_principle>` → `<verification_process>`) inside the developer_instructions string. Touch no other TOML keys.
- Straight-copy repo `oto/workflows/execute-phase.md` → `~/.codex/oto/workflows/execute-phase.md`; verify `diff -q` identical (precedent: in8 straight-copied this exact file byte-identical to ~/.codex).
- **Resolve the pre-existing Codex drift** (required for the exit-0 gate; all three are runtime-neutral straight-copy files per the in8/nzr pattern, and the repo versions are the current/secure ones): copy repo `oto/workflows/autonomous.md` and `oto/workflows/settings-integrations.md` over the stale `~/.codex` copies; create `~/.codex/oto/workflows/lib/` and copy `oto/workflows/lib/sdk-require.md` into it. Verify each with `diff -q`.

**3c. ~/.gemini:** re-check at execution time: if `~/.gemini/oto` still does not exist, skip and record "gemini: no install, skipped" in the SUMMARY. If an oto install HAS appeared since planning, apply the same sync there (straight copies; agent edit only if a Gemini-adapted agent copy exists).

**3d. Full verification (spec step 5):**
1. grep "VERIFICATION-progress" present in: repo `oto/agents/oto-verifier.md`, `~/.claude/agents/oto-verifier.md`, `~/.codex/agents/oto-verifier.md`, `~/.codex/agents/oto-verifier.toml`.
2. grep "verification_scope" present in: repo `oto/workflows/execute-phase.md`, `~/.claude/oto/workflows/execute-phase.md`, `~/.codex/oto/workflows/execute-phase.md`.
3. Cross-runtime path check: zero `~/.claude` occurrences introduced into the edited `~/.codex` files (the copied execute-phase.md legitimately contains `@~/.claude/...` references as the runtime-neutral straight-copy precedent from in8 — only the EDIT-IN-PLACE agent files must not gain `~/.claude` paths).
4. `node scripts/check-runtime-sync.cjs` exits 0 (all roots synced or skipped).
5. `npm test` exits 0 (915 existing tests + the new one).
6. Commit-scope audit: `git log --name-only` for this task's commits shows ONLY: oto/agents/oto-verifier.md, oto/workflows/execute-phase.md, scripts/check-runtime-sync.cjs, tests/check-runtime-sync.test.cjs, CLAUDE.md, and .oto/ tracking files.

If any check fails, fix within scope or STOP and report — never widen the file set to make a gate pass.
  </action>
  <verify>
    <automated>node scripts/check-runtime-sync.cjs && npm test</automated>
  </verify>
  <done>All four grep gates pass across repo and installed copies; check-runtime-sync exits 0; npm test exits 0; ~/.codex pre-existing drift resolved; Gemini skip (or sync) recorded for the SUMMARY; commits touch only the allowed file set.</done>
</task>

</tasks>

<verification>
- `grep -c "VERIFICATION-progress" oto/agents/oto-verifier.md ~/.claude/agents/oto-verifier.md ~/.codex/agents/oto-verifier.md ~/.codex/agents/oto-verifier.toml` — every file ≥ 1
- `grep -c "verification_scope" oto/workflows/execute-phase.md ~/.claude/oto/workflows/execute-phase.md ~/.codex/oto/workflows/execute-phase.md` — every file ≥ 1
- `node scripts/check-runtime-sync.cjs` → exit 0
- `npm test` → exit 0
- Commits touch ONLY the 5 allowed repo files + .oto/ tracking files
</verification>

<success_criteria>
- Verifier agent operational_requirements shipped (heartbeat, non-interactive discipline, human_needed fallback) in repo and every installed copy including the Codex .toml sidecar
- execute-phase verifier spawn contract states verification_scope explicitly and carries the bounded liveness policy (30-min external timeout / 10-min heartbeat silence / one respawn max / inline on second stall / never a third verifier)
- Runtime-sync drift guard is executable (`node scripts/check-runtime-sync.cjs`), test-enforced via npm test, CI-safe (skips absent roots), and documented as a CLAUDE.md rule
- Pre-existing ~/.codex workflow drift (autonomous.md, settings-integrations.md, lib/sdk-require.md) resolved as a byproduct of the exit-0 gate
- Gemini handling recorded ("gemini: no install, skipped" expected)
</success_criteria>

<output>
After completion, create `.oto/quick/260716-qbp-harden-oto-verifier-operation-and-add-ru/260716-qbp-SUMMARY.md`
</output>
