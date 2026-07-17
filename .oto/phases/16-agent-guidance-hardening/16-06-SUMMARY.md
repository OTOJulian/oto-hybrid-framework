---
phase: 16-agent-guidance-hardening
plan: 06
subsystem: verification
tags: [exa, mcp, fallback, upstream-sync, baseline-delta]

requires:
  - phase: 16-agent-guidance-hardening
    provides: Plans 16-01 through 16-05 search guidance, keyfile-aware fallback, generated docs, and agent tool grants
provides:
  - HARD-04 live proof that the wildcard grant exposes all three Exa tools to a restricted subagent
  - HARD-01 live proof that keyless research falls through without user-facing errors or retry loops
  - HARD-05 milestone-close upstream conflict inventory and milestone-touched dispositions
  - Final repository and SDK baseline-relative regression evidence
affects: [milestone-close, upstream-sync, WR-02, planning-root-migration]

tech-stack:
  added: []
  patterns: [fail-loud upstream sync, baseline-relative inherited-debt gate, bounded disposition]

key-files:
  created: [.oto/phases/16-agent-guidance-hardening/16-06-SUMMARY.md]
  modified:
    - .oto/phases/16-agent-guidance-hardening/16-VALIDATION.md
    - .oto/phases/16-agent-guidance-hardening/16-SDK-BASELINE-DELTA.txt
    - bin/lib/sync-pull.cjs
    - bin/lib/sync-merge.cjs
    - bin/lib/sync-cli.cjs
    - rename-map.json
    - scripts/rebrand/lib/engine.cjs

key-decisions:
  - "Keep the mcp__exa__* wildcard: the developer's fresh live probe enumerated all three exact tools and completed a real call without an unrecognized warning."
  - "Treat the full SDK red result only through the developer-approved amended baseline: 268 inherited failures, zero new files, and zero files over maxima."
  - "Record HARD-05 findings without applying upstream content; planning-root migration and new sdk/src/query/secrets.ts collisions require separately bounded follow-up."

patterns-established:
  - "Milestone-close sync checks compare milestone-touched paths against a pre-milestone byte baseline before assigning dispositions."
  - "--upstream all completes both upstream inspections and retains a nonzero aggregate status when either side has findings."

requirements-completed: [HARD-04, HARD-05, HARD-01]

duration: 3h 12m
completed: 2026-07-17
---

# Phase 16 Plan 06: Live and Milestone-Close Verification Summary

**Live Exa access and keyless fallback both passed, the final repository gate is green, the amended SDK delta has no new failures, and the complete two-upstream conflict surface is recorded without applying upstream content.**

## Performance

- **Duration:** 3h 12m
- **Started:** 2026-07-17T18:08:00Z
- **Completed:** 2026-07-17T21:20:28Z
- **Tasks:** 3
- **Files modified:** 12

## Accomplishments

- Confirmed in a fresh live session that the wildcard grant reaches every intended Exa MCP tool and a real search returns current results.
- Confirmed the keyless fallback floor completes through WebSearch with zero user-facing errors, no Exa retry loop, and exit 0; the keyfile was restored.
- Completed the final repository gate at 967 tests / 964 pass / 0 fail / 3 skipped and the SDK amended-baseline gate at `NO NEW FAILURES: PASS`.
- Ran the exact HARD-05 all-upstream dry-run, fixed four blockers in that documented path with regression coverage, and recorded all 269 same-line conflicts plus milestone-touched dispositions.

## Task Commits

1. **Task 1: Pre-checkpoint gate and approved SDK disposition** — `f3ca03e`, `55de184`
2. **Task 2: HARD-04 live subagent e2e** — developer checkpoint; no repository commit
3. **Task 3: HARD-05 dry-run and phase close** — `ef5d6bc`, `4dd0b0a`, `f927ed3`, `5a01308`

The plan metadata and final evidence are committed with this summary.

## HARD-04 Live E2E Evidence

Developer approval received on 2026-07-17 for both required legs:

- **Leg A — keyed restricted-subagent run:** A fresh session's `oto-debugger` enumerated `mcp__exa__web_search_exa`, `mcp__exa__web_fetch_exa`, and `mcp__exa__web_search_advanced_exa`. A single `mcp__exa__web_search_exa` call returned 10 real results containing current Node LTS data. There was no unrecognized warning.
- **Leg B — keyless fallback:** With the keyfile moved aside and `EXA_API_KEY` unset, a fresh session completed the research request via WebSearch fallback with zero user-facing errors, no Exa retry loop, and exit 0.
- **Restoration:** The keyfile was restored and `secret-status` confirmed Exa enabled. No key bytes or masked suffix are recorded in phase artifacts.

The live evidence resolves the wildcard contingency in favor of preserving `mcp__exa__*`; the five agent files remain unchanged from their Plan 16-05 state.

## Final Regression Gates

- `npm test`: PASS — 967 tests, 964 passed, 0 failed, 3 skipped, 12 suites.
- `node scripts/check-runtime-sync.cjs`: PASS — Claude and Codex `ok`; Gemini skipped because no oto installation exists.
- Full SDK rerun: expected inherited-debt result — 40 files failed / 51 passed; 268 tests failed / 1334 passed.
- Amended 41-file comparison: 40 current failing files, 0 new files, 0 files over their maxima.
- Focus rows: `decomposed-handlers.test.ts=7/7`, `read-only-parity.integration.test.ts=21/21`, `state-mutation.test.ts=20/21`.
- Verdict: `NO NEW FAILURES: PASS`.

This does not claim a green full SDK suite. The two todo-parity rows remain failing and counted. The developer-approved WR-02 disposition remains DEFER, and the broader planning-root migration remains a separately planned bounded task required before milestone close if milestone hard gates require the full SDK suite green.

## HARD-05 Sync Dry-Run

The `oto` executable was not on PATH, so the documented fallback was used exactly:

`node bin/install.js sync --upstream all --to latest --dry-run`

Network access required an approved sandbox escalation. No upstream content was applied. Exit 1 is the sync command's designed fail-loud outcome because unclassified upstream additions were surfaced; it did not prevent inspection of the second upstream.

| Upstream | HEAD | Clean | Same-line conflicts | Added | Deleted | Unclassified additions | Binary |
|----------|------|------:|--------------------:|------:|--------:|-----------------------:|-------:|
| GSD | `bdcaab2c752d9a33a1a1ca9acf3a3c81fb991815` | 52 | 257 | 3 | 29 | 897 | 0 |
| Superpowers | `d884ae04edebef577e82ff7c4e143debd0bbec99` | 14 | 12 | 0 | 2 | 52 | 0 |
| **Combined** | — | **66** | **269** | **3** | **31** | **949** | **0** |

Added plus unclassified totals 952. Across clean, conflict, added/unclassified, and deleted categories, the command surfaced 1,252 findings.

### Milestone-touched dispositions

The pre-milestone comparison point was `6215f11cc9186b7719d02121b783f0d9adbc5c15`, the parent of the first Phase 14 plan commit.

- `oto/agents/oto-advisor-researcher.md` — **NEW, expected-and-block-shaped.** It was byte-equal to the then-current rebranded upstream before the milestone and now differs because Phase 16 intentionally added the shared search include/frontmatter grant.
- `sdk/src/query/secrets.ts` — **NEW same-path upstream addition, needs follow-up.** The local Phase 14 file and newly upstream file now collide. No merge was attempted in Plan 16-06.
- `sdk/src/query/secrets.test.ts` — **NEW same-path upstream addition, needs follow-up.** Same disposition as the implementation file.
- `oto/agents/oto-debugger.md`, `oto/agents/oto-phase-researcher.md`, `oto/agents/oto-project-researcher.md`, `oto/agents/oto-ui-researcher.md`, `oto/bin/lib/init.cjs`, `oto/bin/lib/config.cjs`, `oto/bin/lib/secrets.cjs`, and `oto/workflows/settings-integrations.md` — **pre-existing conflicts, noted only.** Each already differed from its rebranded upstream at the pre-milestone comparison point.

No other milestone-touched `sdk/src/query/*` path appeared in the dry-run findings.

### Complete same-line conflict inventory

<details>
<summary>GSD — 257 paths</summary>

```text
agents/oto-advisor-researcher.md
agents/oto-code-fixer.md
agents/oto-code-reviewer.md
agents/oto-codebase-mapper.md
agents/oto-debugger.md
agents/oto-doc-classifier.md
agents/oto-doc-synthesizer.md
agents/oto-doc-verifier.md
agents/oto-doc-writer.md
agents/oto-domain-researcher.md
agents/oto-eval-auditor.md
agents/oto-executor.md
agents/oto-integration-checker.md
agents/oto-nyquist-auditor.md
agents/oto-phase-researcher.md
agents/oto-plan-checker.md
agents/oto-planner.md
agents/oto-project-researcher.md
agents/oto-research-synthesizer.md
agents/oto-roadmapper.md
agents/oto-security-auditor.md
agents/oto-ui-auditor.md
agents/oto-ui-checker.md
agents/oto-ui-researcher.md
agents/oto-verifier.md
bin/install.js
commands/oto/add-tests.md
commands/oto/ai-integration-phase.md
commands/oto/audit-fix.md
commands/oto/audit-milestone.md
commands/oto/autonomous.md
commands/oto/cleanup.md
commands/oto/code-review.md
commands/oto/complete-milestone.md
commands/oto/debug.md
commands/oto/discuss-phase.md
commands/oto/docs-update.md
commands/oto/eval-review.md
commands/oto/execute-phase.md
commands/oto/explore.md
commands/oto/fast.md
commands/oto/forensics.md
commands/oto/health.md
commands/oto/help.md
commands/oto/import.md
commands/oto/ingest-docs.md
commands/oto/manager.md
commands/oto/map-codebase.md
commands/oto/milestone-summary.md
commands/oto/new-milestone.md
commands/oto/new-project.md
commands/oto/pause-work.md
commands/oto/plan-phase.md
commands/oto/plan-review-convergence.md
commands/oto/pr-branch.md
commands/oto/progress.md
commands/oto/quick.md
commands/oto/resume-work.md
commands/oto/review-backlog.md
commands/oto/review.md
commands/oto/secure-phase.md
commands/oto/settings.md
commands/oto/ship.md
commands/oto/sketch.md
commands/oto/spec-phase.md
commands/oto/spike.md
commands/oto/stats.md
commands/oto/ui-phase.md
commands/oto/ui-review.md
commands/oto/undo.md
commands/oto/update.md
commands/oto/validate-phase.md
commands/oto/verify-work.md
commands/oto/workstreams.md
oto/bin/lib/oto-tools.cjs
oto/bin/lib/artifacts.cjs
oto/bin/lib/audit.cjs
oto/bin/lib/commands.cjs
oto/bin/lib/config-schema.cjs
oto/bin/lib/config.cjs
oto/bin/lib/core.cjs
oto/bin/lib/decisions.cjs
oto/bin/lib/docs.cjs
oto/bin/lib/drift.cjs
oto/bin/lib/frontmatter.cjs
oto/bin/lib/gap-checker.cjs
oto/bin/lib/graphify.cjs
oto/bin/lib/gsd2-import.cjs
oto/bin/lib/init.cjs
oto/bin/lib/install-profiles.cjs
oto/bin/lib/intel.cjs
oto/bin/lib/learnings.cjs
oto/bin/lib/milestone.cjs
oto/bin/lib/model-profiles.cjs
oto/bin/lib/phase.cjs
oto/bin/lib/profile-output.cjs
oto/bin/lib/profile-pipeline.cjs
oto/bin/lib/roadmap.cjs
oto/bin/lib/schema-detect.cjs
oto/bin/lib/secrets.cjs
oto/bin/lib/state.cjs
oto/bin/lib/template.cjs
oto/bin/lib/uat.cjs
oto/bin/lib/verify.cjs
oto/bin/lib/workstream.cjs
oto/contexts/review.md
oto/references/agent-contracts.md
oto/references/ai-evals.md
oto/references/ai-frameworks.md
oto/references/artifact-types.md
oto/references/checkpoints.md
oto/references/context-budget.md
oto/references/continuation-format.md
oto/references/decimal-phase-calculation.md
oto/references/doc-conflict-engine.md
oto/references/domain-probes.md
oto/references/gate-prompts.md
oto/references/git-integration.md
oto/references/git-planning-commit.md
oto/references/model-profiles.md
oto/references/planner-antipatterns.md
oto/references/planning-config.md
oto/references/scout-codebase.md
oto/references/sketch-theme-system.md
oto/references/tdd.md
oto/references/thinking-partner.md
oto/references/universal-anti-patterns.md
oto/references/user-profiling.md
oto/references/verification-overrides.md
oto/references/workstream-flag.md
oto/templates/AI-SPEC.md
oto/templates/DEBUG.md
oto/templates/UAT.md
oto/templates/VALIDATION.md
oto/templates/claude-md.md
oto/templates/codebase/architecture.md
oto/templates/codebase/concerns.md
oto/templates/codebase/conventions.md
oto/templates/codebase/integrations.md
oto/templates/codebase/stack.md
oto/templates/codebase/structure.md
oto/templates/codebase/testing.md
oto/templates/config.json
oto/templates/context.md
oto/templates/continue-here.md
oto/templates/debug-subagent-prompt.md
oto/templates/dev-preferences.md
oto/templates/discovery.md
oto/templates/discussion-log.md
oto/templates/milestone-archive.md
oto/templates/milestone.md
oto/templates/phase-prompt.md
oto/templates/planner-subagent-prompt.md
oto/templates/project.md
oto/templates/requirements.md
oto/templates/research-project/ARCHITECTURE.md
oto/templates/research-project/FEATURES.md
oto/templates/research-project/PITFALLS.md
oto/templates/research-project/STACK.md
oto/templates/research-project/SUMMARY.md
oto/templates/research.md
oto/templates/roadmap.md
oto/templates/spec.md
oto/templates/state.md
oto/templates/summary.md
oto/templates/user-setup.md
oto/templates/verification-report.md
oto/workflows/add-phase.md
oto/workflows/add-tests.md
oto/workflows/add-todo.md
oto/workflows/ai-integration-phase.md
oto/workflows/analyze-dependencies.md
oto/workflows/audit-fix.md
oto/workflows/audit-milestone.md
oto/workflows/audit-uat.md
oto/workflows/autonomous.md
oto/workflows/check-todos.md
oto/workflows/cleanup.md
oto/workflows/code-review-fix.md
oto/workflows/code-review.md
oto/workflows/complete-milestone.md
oto/workflows/diagnose-issues.md
oto/workflows/discovery-phase.md
oto/workflows/discuss-phase-assumptions.md
oto/workflows/discuss-phase-power.md
oto/workflows/discuss-phase.md
oto/workflows/discuss-phase/modes/advisor.md
oto/workflows/discuss-phase/modes/chain.md
oto/workflows/discuss-phase/modes/default.md
oto/workflows/discuss-phase/modes/text.md
oto/workflows/do.md
oto/workflows/docs-update.md
oto/workflows/edit-phase.md
oto/workflows/eval-review.md
oto/workflows/execute-phase.md
oto/workflows/execute-phase/steps/codebase-drift-gate.md
oto/workflows/execute-phase/steps/per-plan-worktree-gate.md
oto/workflows/execute-plan.md
oto/workflows/explore.md
oto/workflows/fast.md
oto/workflows/forensics.md
oto/workflows/graduation.md
oto/workflows/health.md
oto/workflows/help.md
oto/workflows/import.md
oto/workflows/inbox.md
oto/workflows/ingest-docs.md
oto/workflows/insert-phase.md
oto/workflows/list-phase-assumptions.md
oto/workflows/list-workspaces.md
oto/workflows/manager.md
oto/workflows/map-codebase.md
oto/workflows/milestone-summary.md
oto/workflows/new-milestone.md
oto/workflows/new-project.md
oto/workflows/new-workspace.md
oto/workflows/next.md
oto/workflows/note.md
oto/workflows/pause-work.md
oto/workflows/plan-milestone-gaps.md
oto/workflows/plan-phase.md
oto/workflows/plan-review-convergence.md
oto/workflows/plant-seed.md
oto/workflows/pr-branch.md
oto/workflows/progress.md
oto/workflows/quick.md
oto/workflows/remove-phase.md
oto/workflows/remove-workspace.md
oto/workflows/resume-project.md
oto/workflows/review.md
oto/workflows/scan.md
oto/workflows/secure-phase.md
oto/workflows/session-report.md
oto/workflows/settings-advanced.md
oto/workflows/settings-integrations.md
oto/workflows/settings.md
oto/workflows/ship.md
oto/workflows/sketch-wrap-up.md
oto/workflows/sketch.md
oto/workflows/spec-phase.md
oto/workflows/spike-wrap-up.md
oto/workflows/spike.md
oto/workflows/stats.md
oto/workflows/sync-skills.md
oto/workflows/transition.md
oto/workflows/ui-phase.md
oto/workflows/ui-review.md
oto/workflows/undo.md
oto/workflows/update.md
oto/workflows/validate-phase.md
oto/workflows/verify-phase.md
oto/workflows/verify-work.md
hooks/oto-context-monitor.js
hooks/oto-prompt-guard.js
hooks/oto-session-start
hooks/oto-statusline.js
hooks/oto-validate-commit.sh
```

</details>

<details>
<summary>Superpowers — 12 paths</summary>

```text
hooks/oto-session-start
skills/dispatching-parallel-agents/SKILL.md
skills/systematic-debugging/CREATION-LOG.md
skills/systematic-debugging/SKILL.md
skills/systematic-debugging/root-cause-tracing.md
skills/test-driven-development/SKILL.md
skills/using-git-worktrees/SKILL.md
skills/using-oto/SKILL.md
skills/using-oto/references/codex-tools.md
skills/writing-skills/SKILL.md
skills/writing-skills/anthropic-best-practices.md
skills/writing-skills/persuasion-principles.md
```

</details>

## Files Created/Modified

- `.oto/phases/16-agent-guidance-hardening/16-06-SUMMARY.md` — live evidence, final gates, full sync inventory, and dispositions.
- `.oto/phases/16-agent-guidance-hardening/16-VALIDATION.md` — completed validation map and sign-off.
- `.oto/phases/16-agent-guidance-hardening/16-SDK-BASELINE-DELTA.txt` — appended the final close rerun without replacing prior causal evidence.
- `bin/lib/sync-pull.cjs` — resolves the documented `latest` selector to the upstream default HEAD.
- `rename-map.json` and `scripts/rebrand/lib/engine.cjs` — classify current upstream-only tests while preserving intentional regex transforms.
- `bin/lib/sync-merge.cjs` — handles first-sync comparisons with no prior upstream snapshot.
- `bin/lib/sync-cli.cjs` — completes both upstream legs for `--upstream all` while retaining aggregate nonzero status.
- Four focused test files — failing-first regression coverage for the dry-run blockers.

## Decisions Made

- Preserved the wildcard agent grant because the developer's actual installed-session evidence proves all three exact tools resolve and work.
- Preserved the SDK baseline amendment and DEFER disposition exactly as approved; no inherited failure, golden todo row, or gate threshold was changed during closeout.
- Classified the advisor-agent conflict as expected-and-block-shaped, while the two SDK secret-path additions require later reconciliation.
- Did not begin either the broader planning-root migration or any upstream merge.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Documented `latest` sync selector was unsupported**
- **Found during:** Task 3 HARD-05 dry-run.
- **Issue:** The documented command treated `latest` as a literal git ref.
- **Fix:** Resolve `latest` to the fetched remote's default HEAD.
- **Files modified:** `bin/lib/sync-pull.cjs`, `tests/phase-09-pull-puller.test.cjs`.
- **Verification:** Bare-repository regression passes; combined sync-focused gate passes 34/34.
- **Committed in:** `ef5d6bc`.

**2. [Rule 3 - Blocking] Current upstream coverage could not be classified**
- **Found during:** Task 3 HARD-05 dry-run.
- **Issue:** Three newly upstream-only tests and an intentional retained regex transform stopped the coverage gate.
- **Fix:** Explicitly allowlisted the three tests and recorded the retained transform in-process.
- **Files modified:** `rename-map.json`, `scripts/rebrand/lib/engine.cjs`, `tests/phase-02-coverage-manifest.test.cjs`.
- **Verification:** Coverage tests and combined sync-focused gate pass.
- **Committed in:** `4dd0b0a`.

**3. [Rule 3 - Blocking] First-sync merge comparisons assumed a prior snapshot**
- **Found during:** Task 3 HARD-05 dry-run.
- **Issue:** Null prior content caused identical files, real conflicts, and local-only deletions to be misclassified or fail.
- **Fix:** Added explicit no-prior semantics for all three cases.
- **Files modified:** `bin/lib/sync-merge.cjs`, `tests/phase-09-merge-3way.test.cjs`.
- **Verification:** Merge tests pass 13/13; combined sync-focused gate passes 34/34.
- **Committed in:** `f927ed3`.

**4. [Rule 3 - Blocking] `--upstream all` stopped after the first nonzero leg**
- **Found during:** Task 3 HARD-05 dry-run.
- **Issue:** A GSD finding prevented the required Superpowers inspection.
- **Fix:** Run both legs and retain the first nonzero aggregate status.
- **Files modified:** `bin/lib/sync-cli.cjs`, `tests/phase-09-cli.integration.test.cjs`.
- **Verification:** CLI integration and combined sync-focused gate pass.
- **Committed in:** `5a01308`.

---

**Total deviations:** 4 auto-fixed blocking issues.
**Impact on plan:** Each fix was limited to making the already-documented HARD-05 command complete and faithfully report both upstreams. No upstream content was applied and no deferred migration was started.

## Issues Encountered

- `oto` was not on PATH; the plan's documented Node fallback was used.
- Initial upstream network access was blocked by the sandbox; the exact command was rerun with approved network escalation.
- The isolated worktree lacked SDK dependencies, so its ignored `sdk/node_modules` path temporarily linked to the parent checkout's installed dependencies for the final read-only Vitest run.
- The HARD-05 command exited 1 by design because it surfaced unclassified additions; complete results for both upstreams were still recorded.

## User Setup Required

None. The developer restored the Exa keyfile after the live keyless leg.

## Next Phase Readiness

- Plan 16-06 is ready for phase code review and independent phase verification.
- Reconcile the two new `sdk/src/query/secrets{.test,}.ts` upstream same-path additions in a separately bounded sync task.
- Schedule the WR-02 planning-root migration as its own bounded task before milestone close if the milestone's hard gates require a fully green SDK suite.

---
*Phase: 16-agent-guidance-hardening*
*Completed: 2026-07-17*
