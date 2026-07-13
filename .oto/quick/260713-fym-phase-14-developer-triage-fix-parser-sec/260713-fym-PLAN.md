---
phase: quick-260713-fym
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - oto/bin/lib/config.cjs
  - tests/14-configget-guard.test.cjs
  - sdk/src/config.ts
  - sdk/src/config-parse-sanitization.test.ts
  - sdk/dist/config.js
  - sdk/dist/config.js.map
  - .oto/phases/14-key-storage-reconciliation/14-DISPOSITIONS.md
  - .oto/STATE.md
autonomous: true
requirements: [QUICK-260713-FYM]

must_haves:
  truths:
    - "CJS config-get and both SDK loadConfig JSON.parse branches emit only the relevant file path plus a generic malformed JSON message; no parser detail or config bytes reach stdout/stderr"
    - "A CJS node:test real-process probe and SDK Vitest real-process probes for selected-root and inherited-root workstream loading fail against the pre-fix implementation, then pass against rebuilt shipped dist"
    - "All three fresh Criticals and all six fresh Warnings have unambiguous FRESH-* rows in 14-DISPOSITIONS.md; the two developer-directed deferrals have Phase 15/16 owners"
    - "STATE.md uses oto_state_version, carries the two pre-task todos, preserves the existing tooling follow-up, and says developer triage is applied while fresh verification is pending"
    - "Focused Phase 14 CJS tests, the new SDK regression suite, SDK typecheck, rebuilt-dist parity, and the baseline-relative npm test gate all pass"
  artifacts:
    - path: "oto/bin/lib/config.cjs"
      provides: "Sanitized CJS config-get malformed JSON failure"
      contains: "malformed JSON"
    - path: "sdk/src/config.ts"
      provides: "Sanitized selected-config and inherited-root loadConfig failures"
      contains: "malformed JSON"
    - path: "tests/14-configget-guard.test.cjs"
      provides: "CJS real-process marker-absence regression"
    - path: "sdk/src/config-parse-sanitization.test.ts"
      provides: "SDK dist real-process selected-root and inherited-root marker-absence regressions"
    - path: ".oto/phases/14-key-storage-reconciliation/14-DISPOSITIONS.md"
      provides: "Developer triage matrix for the fresh three Criticals and six Warnings"
    - path: ".oto/STATE.md"
      provides: "Correct oto marker, owned deferral pre-tasks, and awaiting-verification position"
  key_links:
    - from: "sdk/src/config-parse-sanitization.test.ts"
      to: "bin/oto-sdk.js -> sdk/dist/config.js"
      via: "spawned resolve-model queries exercising loadConfig"
    - from: "sdk/src/config.ts"
      to: "sdk/dist/config.js"
      via: "cd sdk && npm run build; generated dist is committed"
    - from: ".oto/phases/14-key-storage-reconciliation/14-DISPOSITIONS.md"
      to: ".oto/STATE.md"
      via: "FRESH-CR-02/03 owner rows mirrored by Pending Todos"
---

<objective>
Apply the developer's bounded Phase 14 triage decision: fix only the malformed-config secret-fragment disclosure, defer the other two fresh Criticals to their named owners, disposition all six fresh Warnings against the personal single-user severity model, and repair the STATE marker/status/todos.

Purpose: remove the verified secret-bearing parser leak without reopening the stopped gap-plan loop, and leave a complete, reviewable disposition record for everything deliberately not changed.

Output: one atomic parser-sanitization code commit, one atomic disposition commit, OTO-managed STATE/SUMMARY tracking, and recorded verification including a pre-fix negative control.

**Locked scope and safety:**

- Use `apply_patch` for every hand edit. `npm run build` is the only permitted mechanical rewrite.
- Never use destructive git (`reset`, `checkout --`, clean, stash, or equivalents). Stage explicit paths only; never `git add .` or `git add -A`.
- Do not touch `oto/agents/`, `oto/workflows/`, or the separately tracked STATE-marker tooling follow-up in `.oto/STATE.md` Deferred Items.
- Do not run `--full` or `--validate`; do not create/revise gap-closure plans; do not modify ROADMAP.md.
- Preserve unrelated dirty files byte-for-byte and never stage them: `reports/rebrand-dryrun.json`, `reports/rebrand-dryrun.md`, and `INTERVIEW-BRIEF-oto.md`.
- The quick executor must not commit `PLAN.md`, `SUMMARY.md`, or `.oto/STATE.md`; the OTO orchestrator owns the final docs commit. The executor does commit the code/test/dist paths from Task 1 and `14-DISPOSITIONS.md` from Task 2.
</objective>

<tasks>

<task type="auto">
  <name>Task 1: Write red real-process regressions, sanitize all three parser paths, rebuild dist, and commit the code fix</name>
  <files>oto/bin/lib/config.cjs, tests/14-configget-guard.test.cjs, sdk/src/config.ts, sdk/src/config-parse-sanitization.test.ts, sdk/dist/config.js, sdk/dist/config.js.map (plus any additional sdk/dist artifact mechanically changed by the build)</files>
  <read_first>
    - .oto/phases/14-key-storage-reconciliation/14-VERIFICATION.md (Fresh Critical 1 exact bytes, commands, selected-root and inherited-root reproductions)
    - .oto/phases/14-key-storage-reconciliation/14-DISPOSITIONS.md (historical CR-03 sanitized CJS setConfigValue pattern)
    - .oto/phases/14-key-storage-reconciliation/14-19-PLAN.md (single SDK rebuild and generated-dist commit convention)
    - oto/bin/lib/config.cjs (`setConfigValueInLock` sanitized catch and `cmdConfigGet` leaking catch)
    - tests/14-configget-guard.test.cjs (existing isolated HOME/project and spawnSync conventions)
    - sdk/src/config.ts (`loadConfig`, both leaking JSON.parse catch blocks)
    - sdk/src/config-loader-parity.test.ts and sdk/src/query/config-query.test.ts (workstream layout and resolve-model consumer conventions)
    - bin/oto-sdk.js and sdk/package.json (real shipped wrapper and build/typecheck commands)
  </read_first>
  <action>
    1. Before any implementation/test edit, capture evidence needed for the final comparison:
       - Record `BASE_SHA=$(git rev-parse HEAD)`.
       - Run `npm test` once and save its exit code plus failing test-file/test-name set under `/tmp/260713-fym-npm-baseline.*`. This is the pre-existing baseline; a green baseline requires the final run to be green.
       - Record SHA-256 hashes for the three unrelated dirty files named in the locked scope, and record the initial `git status --short`. Do not alter or stage them.
    2. TDD RED — add the tests first, without changing either implementation:
       - In `tests/14-configget-guard.test.cjs`, add a real-process `config-get exa_search` case. Write malformed bytes containing `SYNTH_MARKER_do_not_echo_123456789` directly to `.oto/config.json`; do not JSON.stringify the fixture. Assert non-zero exit, assert `SYNTH_MARKER` and the full marker occur in neither `stdout` nor `stderr` (check the streams separately), then assert the generic `malformed JSON` text and exact config path are reported. Put marker-absence assertions before message-shape assertions so the negative control fails for the disclosure itself.
       - Create `sdk/src/config-parse-sanitization.test.ts` using Vitest plus `spawnSync(process.execPath, [<repo>/bin/oto-sdk.js, ...])`, isolated temporary HOME/project roots, blank provider-key env vars, and cleanup. It must run the shipped dist consumer `query resolve-model gsd-planner` twice: (a) malformed selected/root `.oto/config.json`; (b) valid workstream leaf plus malformed inherited root, invoked with `--ws ws1`. Each case asserts non-zero exit, marker/prefix absence independently in stdout and stderr, generic `malformed JSON`, and the exact selected/root file path. Do not substitute a direct `loadConfig()` unit test: the requirement is a real process against shipped dist.
       - Run `node --test tests/14-configget-guard.test.cjs` and, from `sdk/`, `npx vitest run src/config-parse-sanitization.test.ts` against the still-vulnerable implementation/dist. Both commands must be non-zero because the new marker-absence assertions fail; both SDK cases must fail. Record command, exit, and failing test names in `/tmp/260713-fym-negative-control.txt`, without pasting captured synthetic-marker output into tracked artifacts. If they do not fail for disclosure, strengthen the probe before implementing.
    3. GREEN — sanitize exactly the three verified paths:
       - In CJS `cmdConfigGet`, retain the existing missing-file behavior, but remove parser/read exception interpolation from the emitted error. The malformed-config error must contain only the config path and a fixed generic `malformed JSON` description. It must not append `err.message`, stringify the error, or include raw bytes.
       - In `sdk/src/config.ts`, change both `loadConfig` JSON.parse catches (selected config `rawPath`, inherited root `rootConfigPath`) to fixed path-only + generic `malformed JSON` errors. Remove the local `msg` derivations. Do not change SDK direct `config-get`, migration semantics, merging, or shape validation.
       - Use the same concise wording in all three paths, e.g. `Malformed JSON in config file at <path>`, so tests can pin the generic contract without exposing parser details.
    4. Rebuild once from SDK source with `cd sdk && npm run build`. Never hand-edit `sdk/dist`. Inspect `git diff -- sdk/dist`; include `sdk/dist/config.js`, `sdk/dist/config.js.map`, and every additional artifact actually changed by TypeScript emission in the same commit. A test-only TS file should not create a shipped dist artifact.
    5. Run the focused green chain before committing:
       - `node --test tests/14-configget-guard.test.cjs`
       - `cd sdk && npx vitest run src/config-parse-sanitization.test.ts src/config.test.ts src/config-loader-parity.test.ts`
       - `cd sdk && npx tsc --noEmit`
       - `git diff --check` for the Task 1 paths.
       Confirm the same tests that failed in step 2 now pass, both streams are clean, selected/root paths are correct, and source/dist wording matches.
    6. Atomic code commit: explicitly stage only the CJS source/test, SDK source/test, and mechanically generated SDK dist files. Inspect `git diff --cached --name-only`; abort if it contains `.oto/STATE.md`, planning docs, unrelated dirty paths, `oto/agents/`, or `oto/workflows/`. Commit with a focused message such as `fix(config): sanitize malformed JSON errors`.
  </action>
  <verify>
    <automated>node --test tests/14-configget-guard.test.cjs && cd sdk && npx vitest run src/config-parse-sanitization.test.ts src/config.test.ts src/config-loader-parity.test.ts && npx tsc --noEmit</automated>
  </verify>
  <acceptance_criteria>
    - The pre-fix negative control records non-zero CJS and SDK test runs; all three new real-process cases fail specifically on marker absence before implementation and pass after implementation/rebuild.
    - No affected catch interpolates `err.message`, `String(err)`, or raw config content; emitted malformed errors contain only a generic description and the relevant file path.
    - The SDK test exercises the selected config and the inherited root beneath a real workstream through `bin/oto-sdk.js`/dist, not only a direct source import.
    - `npm run build` is the sole dist writer, and every changed generated dist artifact is present in the Task 1 commit.
    - Task 1's commit contains only its listed implementation/test/dist scope.
  </acceptance_criteria>
  <done>The secret-fragment disclosure is fixed in CJS source, SDK source, and shipped dist, with mutation-sensitive real-process regressions in both test layers and one atomic code commit.</done>
</task>

<task type="auto">
  <name>Task 2: Record all fresh dispositions and repair STATE marker, deferral todos, and current position</name>
  <files>.oto/phases/14-key-storage-reconciliation/14-DISPOSITIONS.md, .oto/STATE.md</files>
  <read_first>
    - .oto/phases/14-key-storage-reconciliation/14-REVIEW.md (fresh review at 2026-07-13T02:06:46Z / developer's 2026-07-12 22:09 run; exactly 3 Criticals and 6 Warnings)
    - .oto/phases/14-key-storage-reconciliation/14-VERIFICATION.md (fresh 2026-07-13 reproductions and owner context)
    - .oto/phases/14-key-storage-reconciliation/14-DISPOSITIONS.md (six-column table format and historical duplicate IDs)
    - /Users/Julian/.claude/oto/references/model-calibration.md (authoritative personal single-user severity tiers)
    - .oto/ROADMAP.md Phase 15/16 goals (owner fit only; do not edit ROADMAP.md)
    - .oto/STATE.md Current Position, Pending Todos, Deferred Items, and frontmatter
  </read_first>
  <action>
    1. Append nine rows to the existing six-column `Disposition Matrix`; do not add a second table or reuse historical `CR-*`/`WR-*` IDs. Use `FRESH-CR-01..03` and `FRESH-WR-01..06`, and cite the fresh review timestamp so the ID namespace is unmistakable. Add a fresh-source metadata line above the matrix while preserving the historical source metadata.
    2. Record these locked Critical dispositions:

       | Fresh finding | Disposition | Required Where / evidence / note |
       |---|---|---|
       | FRESH-CR-01 — malformed-config errors disclose secret bytes | **FIX** | Quick 260713-fym Task 1; cite both regression files, the pre-fix negative control, rebuilt `sdk/dist/config.js`, and the focused passing commands. Note fixed path-only generic malformed JSON in all three branches. |
       | FRESH-CR-02 — shared settings workflow hardcodes Claude default tool path | **DEFER** | **Owner: Phase 15 (Exa MCP Registration)**. State verbatim that Phase 15 owns per-runtime config-dir resolution and the `/oto-settings-integrations` per-runtime status surface; cite its STATE pre-task and the fresh installed-path matrix. |
       | FRESH-CR-03 — workstream secret-status bypasses inherited root flags/migration | **DEFER** | **Owner: Phase 16 (Agent Guidance + Hardening)**, alongside the existing historical WR-04 pre-task; cite its STATE pre-task and the fresh root-true/root-legacy reproductions. |

    3. Record these model-calibrated Warning dispositions. None meets the Critical definition: none writes a secret to tracked files/off-machine, destroys irreplaceable project/source data, or blocks install/plan/execute under normal use. Preserve the specific residual risk in each Notes cell rather than claiming the behavior is ideal.

       | Fresh finding | Disposition | Concrete justification / owner |
       |---|---|---|
       | FRESH-WR-01 — CJS/SDK writers use different locks | **ACCEPT** | Requires deliberately concurrent same-user CJS+SDK mutations; normal single-developer command flow is serialized, any lost config setting is reconstructible/re-runnable, and no secret leaves the machine or source/project contents are destroyed. This is the rubric's local-race/defense-in-depth class. |
       | FRESH-WR-02 — `configEnsureSection` is unlocked | **ACCEPT** | Same-user concurrent invocation only; section creation is idempotent and re-runnable, with no secret disclosure or core install/plan/execute blocker. Treat as bounded concurrency hardening, not a blocker. |
       | FRESH-WR-03 — CJS `config-set` false-success on array root | **ACCEPT** | Requires an already schema-invalid hand-authored `[]` root; the bytes remain unchanged (no additional corruption/data loss), SDK already rejects it, and normal oto writers never create this shape. The confusing exit status is a maintainability/parity defect below the personal-tool blocker threshold. |
       | FRESH-WR-04 — new-project counts unusable keyfile paths | **DEFER** | **Owner: Phase 15 (Exa MCP Registration)** because MCP-01/MCP-07 registration is conditional on a detected usable key and Phase 15 owns the integration readiness/status surface. It must reuse canonical key-source detection and cover empty/whitespace/non-regular paths. |
       | FRESH-WR-05 — workstream Replace/Clear changes the global credential | **DEFER** | **Owner: Phase 15 (Exa MCP Registration)** because the canonical keyfile is intentionally global while Phase 15 owns `/oto-settings-integrations` per-runtime status/consent UX. It must disclose global scope and require clear confirmation/reconcile enabled configs; do not silently redefine keyfile scope in Phase 14 triage. |
       | FRESH-WR-06 — rollback ends before final project config write | **ACCEPT** | On the reproduced final-write failure the credential is retained in a mode-0600 global keyfile and the command reports failure; no key is lost, tracked plaintext created, or data sent off-machine. The safe migration is reusable on retry, so residual cross-resource atomicity is defense in depth. |

       If implementation evidence contradicts any justification, do not silently choose a different row: mark the finding **FIX**, put an `ESCALATION` block at the top of SUMMARY, and stop before claiming triage complete. Do not implement an extra Warning fix in this locked quick-task scope.
    4. Apply exactly these STATE changes with `apply_patch`:
       - Frontmatter: replace only `gsd_state_version: 1.0` with `oto_state_version: 1.0`.
       - Under `### Pending Todos`, keep historical WR-04 and add one bullet for FRESH-CR-02: `Phase 15 pre-task` owning per-runtime config-dir resolution plus the `/oto-settings-integrations` per-runtime status surface.
       - Add one bullet for FRESH-CR-03: `Phase 16 pre-task`, alongside WR-04, owning effective root-to-workstream secret-status flags and root-layer legacy migration.
       - In `## Current Position`, set the `Status:` line exactly to: `developer triage applied 2026-07-13: parser-leak fixed, 2 Criticals deferred with owners, warnings dispositioned; awaiting fresh verification.`
       - Preserve the existing Deferred Items follow-up describing tooling that regresses `gsd_state_version`; do not edit the SDK/CJS tooling.
    5. Verify the table has exactly nine `FRESH-` rows (3 CR + 6 WR), every Warning is FIX/ACCEPT/DEFER, both DEFER Criticals have named owners and matching STATE todos, the exact Current Position status exists, and `rg '^gsd_state_version:' .oto/STATE.md` has no match while `rg '^oto_state_version: 1.0$'` has one. Run `node --test tests/13-oto-root-guard.test.cjs`.
    6. Atomic disposition commit: stage and commit only `14-DISPOSITIONS.md` (suggested message: `docs(phase-14): record developer triage dispositions`). Leave `.oto/STATE.md` unstaged for the OTO orchestrator's final docs commit, per quick-workflow policy. Never stage the unrelated dirty files.
  </action>
  <verify>
    <automated>node --test tests/13-oto-root-guard.test.cjs && test "$(grep -c '^| FRESH-' .oto/phases/14-key-storage-reconciliation/14-DISPOSITIONS.md)" -eq 9 && grep -q '^oto_state_version: 1.0$' .oto/STATE.md && ! grep -q '^gsd_state_version:' .oto/STATE.md</automated>
  </verify>
  <acceptance_criteria>
    - The existing table format and all historical rows remain intact; the fresh ID prefix removes CR/WR ambiguity.
    - FRESH-CR-01 is FIX with code/test/dist evidence; FRESH-CR-02/03 are DEFER with the developer-specified Phase 15/16 ownership and reasons.
    - All six fresh Warnings are prominent and concretely justified as four ACCEPTs and two Phase-15 DEFERs; no finding is silently omitted.
    - STATE contains the exact marker and Current Position wording, both new pre-task lines, and the untouched separate tooling follow-up.
    - The root-guard focused test passes, and the only executor-created commit in this task contains `14-DISPOSITIONS.md` alone.
  </acceptance_criteria>
  <done>The fresh review has a complete nine-row disposition record, STATE reflects the developer decision and correct marker, and docs/code commit ownership remains atomic.</done>
</task>

<task type="auto">
  <name>Task 3: Run the required terminal gate, audit commit/scope integrity, and create the developer-review SUMMARY</name>
  <files>.oto/quick/260713-fym-phase-14-developer-triage-fix-parser-sec/260713-fym-SUMMARY.md, .oto/STATE.md (verification/readback only; orchestrator commits both)</files>
  <read_first>
    - /tmp/260713-fym-npm-baseline.* and /tmp/260713-fym-negative-control.txt (Task 1 evidence)
    - Task 1 and Task 2 commits via `git log --stat` and `git diff --name-only`
    - .oto/phases/14-key-storage-reconciliation/14-DISPOSITIONS.md (final nine fresh rows)
    - .oto/STATE.md (final marker, todos, Current Position, preserved Deferred Items)
  </read_first>
  <action>
    1. Run the required final verification in this order and record command, exit code, and concise counts in SUMMARY:
       - `node --test tests/14-*.test.cjs` — must exit 0, including the new CJS regression.
       - `cd sdk && npx vitest run src/config-parse-sanitization.test.ts` — must exit 0 with both selected-root and inherited-root real-process tests passing.
       - `cd sdk && npx tsc --noEmit` — must exit 0.
       - `cd sdk && npm run build`, followed from repo root by `git diff --exit-code -- sdk/dist` — must exit 0, proving committed dist is exactly current source emission.
       - `npm test` — compare its failure file/test-name set with the pre-change baseline. If baseline was green, final must be green. If baseline was red, final may have no failing identifier absent from baseline and no baseline failure-count increase; report resolved baseline failures separately. Any new failure blocks completion.
    2. Explicitly document negative-control strength in SUMMARY: the CJS probe and both SDK probes were added and run before implementation against the leaking pre-fix HEAD/dist, all failed on marker-absence, and the identical probes pass after sanitization/rebuild. Include commands, non-zero/zero transitions, and test names; do not paste captured marker-bearing stderr. This is the required demonstration that reverting the sanitization makes the regressions fail.
    3. Audit exact scope and atomicity:
       - `git log --stat` / `git show --name-only` must show one Task 1 code/test/dist commit and one Task 2 disposition-only commit.
       - Compare `git diff --name-only "$BASE_SHA"..HEAD` to the allowed Task 1 paths plus `14-DISPOSITIONS.md`; account separately for a pre-dispatch PLAN commit if the orchestrator created one.
       - `git diff --check` must pass.
       - Confirm SHA-256 hashes for `reports/rebrand-dryrun.json`, `reports/rebrand-dryrun.md`, and `INTERVIEW-BRIEF-oto.md` match Task 1's snapshot; confirm none is staged or present in quick-task commits.
       - Confirm no quick-task commit/path touches `oto/agents/`, `oto/workflows/`, ROADMAP.md, or any gap-closure plan.
       - Working-tree status may contain the three preserved unrelated files plus expected OTO docs (`STATE.md`, SUMMARY, and possibly PLAN before the orchestrator commit), but no unexplained file.
    4. Create `260713-fym-SUMMARY.md`. Near the top, before implementation detail, add `## Developer Triage Dispositions` with a table listing **every** `FRESH-CR-01..03` and `FRESH-WR-01..06` decision, owner (where deferred), and one-line rationale/evidence. State prominently: `No fresh Warning meets model-calibration.md's Critical definition; no Warning escalation was required.` If Task 2 found contrary evidence, replace that sentence with a prominent `## ESCALATION` section and do not claim clean closure.
    5. SUMMARY must also include: changed files by atomic commit; the exact generic error contract; the pre-fix negative-control evidence; focused SDK/CJS/typecheck/dist results; npm baseline vs final comparison; root-guard result; preserved unrelated-dirty-file audit; and the exact Current Position status. The handoff must say `awaiting fresh verification` and must not suggest `--full`, `--validate`, another gap-plan loop, execution, or secure-phase.
    6. Do not commit SUMMARY/STATE/PLAN. Return them to the OTO orchestrator for its one final docs commit and Quick Tasks Completed/Last activity bookkeeping.
  </action>
  <verify>
    <automated>node --test tests/14-*.test.cjs && cd sdk && npx vitest run src/config-parse-sanitization.test.ts && npx tsc --noEmit && npm run build && cd .. && git diff --exit-code -- sdk/dist</automated>
  </verify>
  <acceptance_criteria>
    - Required CJS suite exits 0; both SDK real-process probes and SDK typecheck exit 0; a repeat build leaves dist clean.
    - Final npm test has no new failures relative to the recorded pre-change baseline (green remains green; red has no new/increased failing identifiers).
    - SUMMARY explains the before-fix failing probes and after-fix passing probes without reproducing marker-bearing stderr.
    - SUMMARY prominently lists all nine fresh dispositions, including all six Warning judgments and both owner deferrals.
    - Commit and hash audits prove atomic scope and preservation of the user's unrelated dirty work.
    - SUMMARY and STATE remain for the orchestrator's final OTO docs commit; no executor code commit includes them.
  </acceptance_criteria>
  <done>The exact requested gates pass with mutation-sensitive evidence, atomic commits and dirty-worktree preservation are proven, and the developer receives a complete prominent triage summary awaiting fresh verification.</done>
</task>

</tasks>

<verification>
- `node --test tests/14-*.test.cjs` exits 0 and includes the new config-get leak regression.
- `cd sdk && npx vitest run src/config-parse-sanitization.test.ts` exits 0 for selected and inherited-root consumers; the same cases failed before the fix.
- `cd sdk && npx tsc --noEmit` exits 0; a fresh SDK build leaves committed dist unchanged.
- `npm test` has no new failures relative to the pre-change baseline.
- `node --test tests/13-oto-root-guard.test.cjs` exits 0 after the marker correction.
- Nine fresh disposition rows, two STATE owner todos, exact Current Position wording, atomic commit boundaries, and unrelated dirty-file hashes are all audited.
</verification>

<success_criteria>
- The only implementation change is the developer-authorized parser-leak fix across live CJS, SDK source, and rebuilt dist.
- The other two fresh Criticals are explicitly deferred to Phase 15 and Phase 16 with STATE pre-tasks; the six Warnings are completely and proportionately dispositioned.
- STATE uses `oto_state_version: 1.0` without changing the known regressing tooling.
- All required verification and negative-control evidence is present, and the project is left in `awaiting fresh verification` state without opening another gap cycle.
</success_criteria>

<output>
After execution, create `.oto/quick/260713-fym-phase-14-developer-triage-fix-parser-sec/260713-fym-SUMMARY.md` and leave it plus `.oto/STATE.md` for the OTO orchestrator's final docs commit.
</output>
