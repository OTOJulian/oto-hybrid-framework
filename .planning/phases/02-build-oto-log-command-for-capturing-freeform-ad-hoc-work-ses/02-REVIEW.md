---
phase: 02-build-oto-log-command-for-capturing-freeform-ad-hoc-work-ses
reviewed: 2026-05-06T20:11:42Z
depth: standard
files_reviewed: 21
files_reviewed_list:
  - bin/install.js
  - oto/bin/lib/oto-tools.cjs
  - oto/bin/lib/log.cjs
  - oto/commands/oto/log.md
  - oto/workflows/progress.md
  - oto/workflows/resume-project.md
  - .gitignore
  - oto/commands/INDEX.md
  - decisions/runtime-tool-matrix.md
  - tests/log-cli.test.cjs
  - tests/log-command-md.test.cjs
  - tests/log-evidence.test.cjs
  - tests/log-frontmatter.test.cjs
  - tests/log-list.test.cjs
  - tests/log-promote.test.cjs
  - tests/log-session.test.cjs
  - tests/log-show.test.cjs
  - tests/log-slug.test.cjs
  - tests/log-subcommand.test.cjs
  - tests/log-surfaces.test.cjs
  - tests/log-write.test.cjs
findings:
  critical: 1
  warning: 0
  info: 0
  total: 1
status: issues_found
---

# Phase 02: Code Review Report

**Reviewed:** 2026-05-06T20:11:42Z
**Depth:** standard
**Files Reviewed:** 21
**Status:** issues_found

## Summary

Re-reviewed the Phase 02 `/oto-log` implementation, command markdown, progress/resume surfaces, command indexes, runtime matrix, and log test suite after `02-REVIEW-FIX.md`.

The previous CR-01 and WR-01..WR-06 are resolved:
- Prior CR-01: diff DATA markers are escaped before wrapping.
- Prior WR-01: `oto log --help` and `oto-tools log --help` exit 0 and list subcommands.
- Prior WR-02: `oto log end --body` passes the parsed body into `endSession()`.
- Prior WR-03: collision suffixes are persisted into returned and frontmatter slugs.
- Prior WR-04: log-related progress/resume surfaces derive log/session paths from `state_path`'s planning root.
- Prior WR-05: oneshot capture uses the latest concrete prior log boundary and persists concrete `HEAD` as `diff_to`.
- Prior WR-06: top-level `oto --help` lists `oto log`.

Verification run:

```bash
node --test tests/log-*.test.cjs
node --test tests/phase-08-runtime-matrix-render.test.cjs
```

Both commands passed.

## Critical Issues

### CR-01: Re-promoting a log can overwrite an edited quick plan

**File:** `oto/bin/lib/log.cjs:585`

**Issue:** `promoteLog({ target: 'quick' })` writes a deterministic `.oto/quick/{YYYYMMDD}-{slug}/PLAN.md` path with `atomicWriteFileSync()` and does not check whether the source log is already promoted or whether the target plan already exists. If a user promotes a log, edits the seeded quick `PLAN.md`, and accidentally runs the same promote command again, the edited plan is overwritten.

**Fix:**

```js
const source = await showLog({ slug, cwd: projectDir });
if (source.frontmatter.promoted === true) {
  throw new Error(`log already promoted: ${source.frontmatter.slug}`);
}

if (target === 'quick') {
  const dateCompact = String(source.frontmatter.date || '').slice(0, 10).replace(/-/g, '');
  const quickDir = path.join(planningRoot, 'quick', `${dateCompact}-${source.frontmatter.slug}`);
  const planPath = path.join(quickDir, 'PLAN.md');
  if (fs.existsSync(planPath)) {
    throw new Error(`quick plan already exists: ${path.relative(planningRoot, planPath)}`);
  }
  // existing write follows
}
```

Add a regression test that promotes a log to quick, edits the generated `PLAN.md`, runs the same promotion again, and asserts the second command fails without changing the edited file.

---

_Reviewed: 2026-05-06T20:11:42Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
