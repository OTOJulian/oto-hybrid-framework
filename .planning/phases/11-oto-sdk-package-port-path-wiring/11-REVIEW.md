---
phase: 11-oto-sdk-package-port-path-wiring
reviewed: 2026-05-25T22:46:48Z
depth: standard
files_reviewed: 190
files_reviewed_list:
  - bin/install.js
  - bin/lib/install.cjs
  - bin/oto-sdk.js
  - package.json
  - scripts/install-smoke.cjs
  - sdk/package.json
  - sdk/prompts/templates/project.md
  - sdk/prompts/templates/requirements.md
  - sdk/prompts/templates/research-project/ARCHITECTURE.md
  - sdk/prompts/templates/research-project/FEATURES.md
  - sdk/prompts/templates/research-project/PITFALLS.md
  - sdk/prompts/templates/research-project/STACK.md
  - sdk/prompts/templates/research-project/SUMMARY.md
  - sdk/prompts/templates/roadmap.md
  - sdk/prompts/templates/state.md
  - sdk/src/assembled-prompts.test.ts
  - sdk/src/cli-transport.test.ts
  - sdk/src/cli-transport.ts
  - sdk/src/cli.test.ts
  - sdk/src/cli.ts
  - sdk/src/config.test.ts
  - sdk/src/config.ts
  - sdk/src/context-engine.test.ts
  - sdk/src/context-engine.ts
  - sdk/src/context-truncation.test.ts
  - sdk/src/context-truncation.ts
  - sdk/src/e2e.integration.test.ts
  - sdk/src/errors.ts
  - sdk/src/event-stream.test.ts
  - sdk/src/event-stream.ts
  - sdk/src/golden/capture.ts
  - sdk/src/golden/fixtures/generate-slug.golden.json
  - sdk/src/golden/fixtures/profile-sample-sessions/demo-project/sample.jsonl
  - sdk/src/golden/fixtures/summary-extract-sample.md
  - sdk/src/golden/fixtures/uat-render-checkpoint-sample.md
  - sdk/src/golden/golden-integration-covered.ts
  - sdk/src/golden/golden-mutation-covered.ts
  - sdk/src/golden/golden-policy.test.ts
  - sdk/src/golden/golden-policy.ts
  - sdk/src/golden/golden.integration.test.ts
  - sdk/src/golden/init-golden-normalize.ts
  - sdk/src/golden/read-only-golden-rows.ts
  - sdk/src/golden/read-only-parity.integration.test.ts
  - sdk/src/golden/registry-canonical-commands.ts
  - sdk/src/gsd-tools.test.ts
  - sdk/src/gsd-tools.ts
  - sdk/src/index.ts
  - sdk/src/init-e2e.integration.test.ts
  - sdk/src/init-runner.test.ts
  - sdk/src/init-runner.ts
  - sdk/src/lifecycle-e2e.integration.test.ts
  - sdk/src/logger.test.ts
  - sdk/src/logger.ts
  - sdk/src/milestone-runner.test.ts
  - sdk/src/phase-prompt.test.ts
  - sdk/src/phase-prompt.ts
  - sdk/src/phase-runner-types.test.ts
  - sdk/src/phase-runner.integration.test.ts
  - sdk/src/phase-runner.test.ts
  - sdk/src/phase-runner.ts
  - sdk/src/plan-parser.test.ts
  - sdk/src/plan-parser.ts
  - sdk/src/prompt-builder.test.ts
  - sdk/src/prompt-builder.ts
  - sdk/src/prompt-sanitizer.test.ts
  - sdk/src/prompt-sanitizer.ts
  - sdk/src/query/QUERY-HANDLERS.md
  - sdk/src/query/audit-open.ts
  - sdk/src/query/check-auto-mode.test.ts
  - sdk/src/query/check-auto-mode.ts
  - sdk/src/query/check-completion.test.ts
  - sdk/src/query/check-completion.ts
  - sdk/src/query/check-decision-coverage.test.ts
  - sdk/src/query/check-decision-coverage.ts
  - sdk/src/query/check-gates.test.ts
  - sdk/src/query/check-gates.ts
  - sdk/src/query/check-ship-ready.test.ts
  - sdk/src/query/check-ship-ready.ts
  - sdk/src/query/check-verification-status.test.ts
  - sdk/src/query/check-verification-status.ts
  - sdk/src/query/commit.test.ts
  - sdk/src/query/commit.ts
  - sdk/src/query/config-gates.test.ts
  - sdk/src/query/config-gates.ts
  - sdk/src/query/config-mutation.test.ts
  - sdk/src/query/config-mutation.ts
  - sdk/src/query/config-query.test.ts
  - sdk/src/query/config-query.ts
  - sdk/src/query/config-schema.ts
  - sdk/src/query/decisions.test.ts
  - sdk/src/query/decisions.ts
  - sdk/src/query/decomposed-handlers.test.ts
  - sdk/src/query/detect-custom-files.ts
  - sdk/src/query/detect-phase-type.test.ts
  - sdk/src/query/detect-phase-type.ts
  - sdk/src/query/docs-init.ts
  - sdk/src/query/frontmatter-array.test.ts
  - sdk/src/query/frontmatter-mutation.test.ts
  - sdk/src/query/frontmatter-mutation.ts
  - sdk/src/query/frontmatter.test.ts
  - sdk/src/query/frontmatter.ts
  - sdk/src/query/helpers.test.ts
  - sdk/src/query/helpers.ts
  - sdk/src/query/index.ts
  - sdk/src/query/init-complex.test.ts
  - sdk/src/query/init-complex.ts
  - sdk/src/query/init-progress-precedence.test.ts
  - sdk/src/query/init.test.ts
  - sdk/src/query/init.ts
  - sdk/src/query/intel.test.ts
  - sdk/src/query/intel.ts
  - sdk/src/query/normalize-query-command.test.ts
  - sdk/src/query/normalize-query-command.ts
  - sdk/src/query/phase-lifecycle.test.ts
  - sdk/src/query/phase-lifecycle.ts
  - sdk/src/query/phase-list-queries.test.ts
  - sdk/src/query/phase-list-queries.ts
  - sdk/src/query/phase-ready.test.ts
  - sdk/src/query/phase-ready.ts
  - sdk/src/query/phase.test.ts
  - sdk/src/query/phase.ts
  - sdk/src/query/pipeline.test.ts
  - sdk/src/query/pipeline.ts
  - sdk/src/query/plan-task-structure.test.ts
  - sdk/src/query/plan-task-structure.ts
  - sdk/src/query/profile-extract-messages.ts
  - sdk/src/query/profile-output.ts
  - sdk/src/query/profile-questionnaire-data.ts
  - sdk/src/query/profile-sample.ts
  - sdk/src/query/profile-scan-sessions.ts
  - sdk/src/query/profile.test.ts
  - sdk/src/query/profile.ts
  - sdk/src/query/progress.test.ts
  - sdk/src/query/progress.ts
  - sdk/src/query/registry.test.ts
  - sdk/src/query/registry.ts
  - sdk/src/query/requirements-extract-from-plans.test.ts
  - sdk/src/query/requirements-extract-from-plans.ts
  - sdk/src/query/roadmap-update-plan-progress.test.ts
  - sdk/src/query/roadmap-update-plan-progress.ts
  - sdk/src/query/roadmap.test.ts
  - sdk/src/query/roadmap.ts
  - sdk/src/query/route-next-action.test.ts
  - sdk/src/query/route-next-action.ts
  - sdk/src/query/schema-detect.ts
  - sdk/src/query/skill-manifest.ts
  - sdk/src/query/skills.test.ts
  - sdk/src/query/skills.ts
  - sdk/src/query/state-mutation.test.ts
  - sdk/src/query/state-mutation.ts
  - sdk/src/query/state-project-load.ts
  - sdk/src/query/state.test.ts
  - sdk/src/query/state.ts
  - sdk/src/query/sub-repos-root.integration.test.ts
  - sdk/src/query/summary.test.ts
  - sdk/src/query/summary.ts
  - sdk/src/query/template.test.ts
  - sdk/src/query/template.ts
  - sdk/src/query/uat.test.ts
  - sdk/src/query/uat.ts
  - sdk/src/query/utils.test.ts
  - sdk/src/query/utils.ts
  - sdk/src/query/validate.test.ts
  - sdk/src/query/validate.ts
  - sdk/src/query/verify.test.ts
  - sdk/src/query/verify.ts
  - sdk/src/query/websearch.test.ts
  - sdk/src/query/websearch.ts
  - sdk/src/query/workspace.test.ts
  - sdk/src/query/workspace.ts
  - sdk/src/query/workstream.test.ts
  - sdk/src/query/workstream.ts
  - sdk/src/research-gate.test.ts
  - sdk/src/research-gate.ts
  - sdk/src/session-runner.test.ts
  - sdk/src/session-runner.ts
  - sdk/src/tool-scoping.test.ts
  - sdk/src/tool-scoping.ts
  - sdk/src/types.ts
  - sdk/src/workflow-agent-skills-consistency.test.ts
  - sdk/src/workstream-utils.ts
  - sdk/src/ws-flag.test.ts
  - sdk/src/ws-transport.test.ts
  - sdk/src/ws-transport.ts
  - sdk/tsconfig.json
  - sdk/vitest.config.ts
  - tests/phase-02-bin-stub.test.cjs
  - tests/phase-02-package-json.test.cjs
  - tests/phase-04-mr01-install-smoke.test.cjs
  - tests/sdk-wiring.test.cjs
findings:
  critical: 0
  warning: 2
  info: 1
  total: 3
status: issues_found
---

# Phase 11: Code Review Report

**Reviewed:** 2026-05-25T22:46:48Z
**Depth:** standard
**Files Reviewed:** 190
**Status:** issues_found

## Summary

Reviewed the Phase 11 SDK packaging, installer PATH wiring, SDK entrypoints/query layer, prompt payload, and targeted tests. I treated `sdk/dist/` and lockfiles as generated artifacts and did not review them line-by-line.

The package and dependency wiring match the Phase 11 boundary: `sdk/dist` is tracked, top-level dependencies are present for Node's upward resolution, and the smoke now proves `oto-sdk query generate-slug` plus `roadmap.analyze`. I did not flag retained `get-shit-done` CJS bridge paths as defects because `11-CONTEXT.md` and `11-RESEARCH.md` explicitly defer full CJS bridge and `.oto` registry re-pathing to Phase 12.

The issues found are concentrated in the new PATH self-link behavior: the installer can report success for a stale executable and can overwrite an unmanaged `oto-sdk` file while trying to fix PATH.

## Warnings

### WR-01: PATH Readiness Can Succeed Against a Stale `oto-sdk`

**File:** `bin/lib/install.cjs:46`

**Issue:** `isOtoSdkOnPath()` returns only a boolean for the first executable named `oto-sdk` found anywhere on `PATH`, and `wireOtoSdk()` treats that as ready at lines 143-157. It never proves the callable binary is the shim for the package currently being installed. A stale or unrelated executable earlier on `PATH` can therefore produce the "OTO SDK ready" message while workflows continue to call the wrong SDK.

**Fix:**
```javascript
function findOtoSdkOnPath(expectedShim) {
  // Return { ready, path, matchesCurrentInstall } instead of boolean.
  // For symlinks, compare fs.realpathSync(candidate) to fs.realpathSync(expectedShim).
  // For wrapper files, only accept a managed wrapper containing the expected shim path.
}

// In wireOtoSdk:
const found = findOtoSdkOnPath(shimSrc);
if (found.ready && found.matchesCurrentInstall) return { ready: true, ... };
// Otherwise attempt self-link, or warn with the stale path that is shadowing the current install.
```

Also add a regression test where `PATH` contains an older executable `oto-sdk` before the freshly installed bin dir and assert the installer does not print ready for the stale executable.

### WR-02: Self-Link Fallback Overwrites Any HOME-Owned `oto-sdk` Target

**File:** `bin/lib/install.cjs:91`

**Issue:** `trySelfLinkOtoSdk()` computes `target = path.join(dir, 'oto-sdk')`, then unconditionally calls `fs.unlinkSync(target)` at lines 92-94 before creating a symlink or wrapper. Because `dir` can be any HOME-owned directory already on `PATH`, this can delete an unmanaged user-created or third-party `oto-sdk` executable, not only a stale wrapper created by oto.

**Fix:**
```javascript
if (fs.existsSync(target)) {
  const stat = fs.lstatSync(target);
  const isManagedSymlink = stat.isSymbolicLink() && fs.realpathSync(target) === fs.realpathSync(shimSrc);
  const isManagedWrapper = !stat.isSymbolicLink() && fs.readFileSync(target, 'utf8').includes(`require(${JSON.stringify(shimSrc)})`);
  if (!isManagedSymlink && !isManagedWrapper) {
    // Skip this dir and warn instead of deleting user content.
    continue;
  }
  fs.unlinkSync(target);
}
```

Keep stale managed replacement, but preserve unmanaged files unless the installer has an explicit force/repair mode.

## Info

### IN-01: Smoke Tests Do Not Cover PATH Shadowing Or Unmanaged Target Preservation

**File:** `scripts/install-smoke.cjs:144`

**Issue:** The install smoke prepends the fresh package bin dir to `PATH` at lines 144-147, so it proves the happy path but cannot catch a stale earlier `oto-sdk`. The unit tests cover missing, executable, non-executable, and stale replacement cases, but there is no test for "executable but wrong install" or "unmanaged file should not be unlinked."

**Fix:** Add focused `tests/sdk-wiring.test.cjs` cases for stale executable shadowing and unmanaged target preservation, and keep the install smoke's happy path as the clean-install gate.

---

_Reviewed: 2026-05-25T22:46:48Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
