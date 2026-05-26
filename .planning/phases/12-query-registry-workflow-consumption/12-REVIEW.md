---
phase: 12-query-registry-workflow-consumption
reviewed: 2026-05-26T03:16:02Z
depth: standard
files_reviewed: 30
files_reviewed_list:
  - sdk/src/planning-root.ts
  - sdk/src/workstream-utils.ts
  - sdk/src/config.ts
  - sdk/src/context-engine.ts
  - sdk/src/query/helpers.ts
  - sdk/src/query/helpers.test.ts
  - sdk/src/ws-flag.test.ts
  - sdk/src/query/init.ts
  - sdk/src/query/init-complex.ts
  - sdk/src/query/commit.ts
  - sdk/src/query/phase.ts
  - sdk/src/query/progress.ts
  - sdk/src/query/state-mutation.ts
  - sdk/src/query/summary.ts
  - sdk/src/query/intel.ts
  - sdk/src/query/skill-manifest.ts
  - sdk/src/query/phase-lifecycle.ts
  - sdk/src/query/workspace.ts
  - sdk/src/query/workstream.ts
  - sdk/src/query/profile-output.ts
  - sdk/src/golden/oto-query-smoke.integration.test.ts
  - sdk/src/golden/fixtures/oto-project/.oto/STATE.md
  - sdk/src/golden/fixtures/oto-project/.oto/config.json
  - sdk/src/golden/fixtures/oto-project/.oto/ROADMAP.md
  - sdk/src/golden/fixtures/oto-project/.oto/REQUIREMENTS.md
  - sdk/src/golden/fixtures/oto-project/.oto/phases/01-sample/01-01-PLAN.md
  - oto/workflows/lib/sdk-require.md
  - oto/workflows/execute-phase.md
  - oto/workflows/autonomous.md
  - tests/sdk-fallback-policy.test.cjs
findings:
  critical: 1
  warning: 3
  info: 0
  total: 4
status: fixed
---

# Phase 12: Code Review Report

**Reviewed:** 2026-05-26T03:16:02Z
**Depth:** standard
**Files Reviewed:** 30
**Status:** fixed

## Summary

Reviewed the scoped Phase 12 source, test, fixture, and workflow files at standard depth, excluding generated `sdk/dist/` output as requested. The `.oto` golden fixture and workflow hard-require policy are consistent with the stated resolver contract, but the source review found one path traversal/data-loss issue and three workstream consumption regressions where `--ws` is accepted but root planning state/config is still used.

## Resolution

All review findings were fixed after the initial review:

- CR-01: `todoComplete` now resolves source/destination paths and rejects filenames that escape the pending/completed todo directories.
- WR-01: `commit` and `checkCommit` now scope default staging and staged-file checks to `planningPaths(projectDir, workstream).planning`.
- WR-02: workstream-aware init handlers now forward `workstream` into `loadConfig`, model resolution, and verify-work phase lookup.
- WR-03: phase lifecycle current-milestone extraction now forwards `workstream` in add, add-batch, insert, and completion paths.

Fresh regression checks passed for the four fixes, and the root `npm test` suite passed after running unrestricted for install-smoke coverage.

## Critical Issues

### CR-01: Todo completion accepts path traversal filenames

**File:** `sdk/src/query/progress.ts:550`

**Issue:** `todoComplete` takes `args[0]` as a filename, joins it directly under `.oto/todos/pending`, then writes to `.oto/todos/completed` and unlinks the source. A value such as `../../STATE.md` escapes the pending/completed todo directories. That can overwrite and then delete planning files under the planning root instead of moving a todo item.

**Fix:**
```ts
import { isAbsolute, relative, resolve } from 'node:path';

function assertPathInside(baseDir: string, targetPath: string): void {
  const rel = relative(baseDir, targetPath);
  if (rel === '' || rel.startsWith('..') || isAbsolute(rel)) {
    throw new GSDError('invalid todo filename', ErrorClassification.Validation);
  }
}

const sourcePath = resolve(pendingDir, filename);
const destPath = resolve(completedDir, filename);
assertPathInside(pendingDir, sourcePath);
assertPathInside(completedDir, destPath);

writeFileSync(destPath, content, 'utf-8');
unlinkSync(sourcePath);
```

## Warnings

### WR-01: Workstream commits stage the root planning tree by default

**File:** `sdk/src/query/commit.ts:136`

**Issue:** `commit` reads workstream config through `planningPaths(projectDir, workstream)`, but when no explicit `--files` are supplied it stages `planningRootName(projectDir) + '/'`. In a `--ws <name>` command this can stage `.oto/` root files and other workstreams even though the command is operating from `.oto/workstreams/<name>/`.

**Fix:**
```ts
import { relative } from 'node:path';

const paths = planningPaths(projectDir, workstream);
const defaultStagePath = toPosixPath(relative(projectDir, paths.planning)) + '/';
const filesToStage = filePaths.length > 0 ? filePaths : [defaultStagePath];
```

### WR-02: Init query handlers ignore workstream config and model profile

**File:** `sdk/src/query/init.ts:280`

**Issue:** Workstream-aware init handlers accept `workstream` and resolve workstream phase paths, but still call `loadConfig(projectDir)` and `getModelAlias(..., projectDir)` without forwarding `workstream`. `init.execute-phase`, `init.plan-phase`, and `init.phase-op` therefore ignore workstream-specific `commit_docs`, workflow flags, branch templates, model profile, and model overrides. `init.verify-work` also omits the `workstream` parameter entirely and resolves phase info from the root planning tree.

**Fix:**
```ts
async function getModelAlias(agentType: string, projectDir: string, workstream?: string): Promise<string> {
  const result = await resolveModel([agentType], projectDir, workstream);
  // existing extraction logic...
}

const config = await loadConfig(projectDir, workstream);
const executorModel = await getModelAlias('gsd-executor', projectDir, workstream);

export const initVerifyWork: QueryHandler = async (args, projectDir, workstream) => {
  const config = await loadConfig(projectDir, workstream);
  const { phaseInfo } = await getPhaseInfoForVerifyWork(phase, projectDir, workstream);
};
```

### WR-03: Phase lifecycle roadmap mutations bypass workstream ROADMAP.md

**File:** `sdk/src/query/phase-lifecycle.ts:220`

**Issue:** Phase lifecycle handlers accept `workstream` and use it for config/phase directory paths, but roadmap mutation calls omit it. `readModifyWriteRoadmapMd` supports a `workstream` argument, and `extractCurrentMilestone` does too, yet `phase.add`, `phase.add-batch`, `phase.insert`, `phase.remove`, and `phase.complete` call those helpers without `workstream`. A workstream operation can therefore create/rename files under the workstream phases directory while inserting/removing/completing entries in the root `.oto/ROADMAP.md`.

**Fix:**
```ts
await readModifyWriteRoadmapMd(projectDir, async (rawContent) => {
  const content = await extractCurrentMilestone(rawContent, projectDir, workstream);
  // existing mutation logic...
}, workstream);
```

Apply the same forwarding to each lifecycle roadmap mutation site at `phase-lifecycle.ts:220`, `phase-lifecycle.ts:372`, `phase-lifecycle.ts:476`, `phase-lifecycle.ts:887`, and `phase-lifecycle.ts:1227`.

---

_Reviewed: 2026-05-26T03:16:02Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
