---
phase: 02-build-oto-log-command-for-capturing-freeform-ad-hoc-work-ses
fixed_at: 2026-05-06T20:06:07Z
review_path: .planning/phases/02-build-oto-log-command-for-capturing-freeform-ad-hoc-work-ses/02-REVIEW.md
iteration: 1
findings_in_scope: 7
fixed: 7
skipped: 0
status: all_fixed
---

# Phase 02: Code Review Fix Report

**Fixed at:** 2026-05-06T20:06:07Z
**Source review:** .planning/phases/02-build-oto-log-command-for-capturing-freeform-ad-hoc-work-ses/02-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 7
- Fixed: 7
- Skipped: 0

## Fixed Issues

### CR-01: Fixed DATA markers can be escaped by untrusted diff content

**Files modified:** `oto/bin/lib/log.cjs`, `tests/log-frontmatter.test.cjs`
**Commit:** 153155f
**Status:** fixed
**Applied fix:** Escaped literal `<DATA_START>` and `<DATA_END>` strings inside captured diff text before wrapping, with a regression test asserting raw markers only appear as wrapper boundaries.

### WR-01: `oto log --help` exits as an empty-title error

**Files modified:** `oto/bin/lib/log.cjs`, `oto/bin/lib/oto-tools.cjs`, `tests/log-subcommand.test.cjs`, `tests/log-cli.test.cjs`
**Commit:** 82fd086
**Status:** fixed
**Applied fix:** Routed `--help` and `-h` to log help, allowed log help through the compatibility dispatcher, and added public plus compatibility CLI coverage.

### WR-02: `oto log end --body` ignores the body and logs it as closing notes

**Files modified:** `oto/bin/lib/log.cjs`, `tests/log-cli.test.cjs`
**Commit:** 11e59fe
**Status:** fixed
**Applied fix:** Passed parsed `values.body` into `endSession()` and used parsed positionals for closing notes, with a CLI regression test for verbatim drafted session bodies.

### WR-03: Collision-suffixed entries are not addressable by their advertised slug

**Files modified:** `oto/bin/lib/log.cjs`, `tests/log-frontmatter.test.cjs`
**Commit:** 6731b5e
**Status:** fixed: requires human verification
**Applied fix:** Persisted the collision suffix into frontmatter slugs and returned API slugs, then verified suffixed entries can be shown by the suffixed slug.

### WR-04: Progress/resume surfaces hardcode `.oto` instead of the resolved planning root

**Files modified:** `oto/workflows/progress.md`, `oto/workflows/resume-project.md`, `tests/log-surfaces.test.cjs`
**Commit:** 760bfac
**Status:** fixed
**Applied fix:** Derived `PLANNING_ROOT` from `state_path` and used it for recent log activity, summary activity, active-session checks, incomplete plan scans, and latest-log summary lookup.

### WR-05: Fire-and-forget capture never uses the prior log boundary

**Files modified:** `oto/bin/lib/log.cjs`, `tests/log-evidence.test.cjs`
**Commit:** 77623dc
**Status:** fixed: requires human verification
**Applied fix:** Read the latest concrete prior log `diff_to` before falling back to current `HEAD`, persisted concrete `HEAD` SHA values as `diff_to`, and added a regression test for prior-boundary oneshot capture.

### WR-06: Top-level public help omits the new `oto log` command

**Files modified:** `bin/install.js`, `tests/log-cli.test.cjs`
**Commit:** fdd427c
**Status:** fixed
**Applied fix:** Added the public `oto log <title>|start|end|list|show|promote` help row and top-level help coverage.

## Skipped Issues

None -- all in-scope findings were fixed.

## Verification

Per-fix Tier 1/Tier 2 checks:
- Re-read every modified section after patching.
- Ran `node -c` for each touched JavaScript/CommonJS source and test file.
- Markdown workflow files used Tier 1 structure verification.

Targeted review tests:

```text
$ node --test tests/log-frontmatter.test.cjs tests/log-subcommand.test.cjs tests/log-cli.test.cjs tests/log-evidence.test.cjs tests/log-surfaces.test.cjs
TAP version 13
...
1..34
# tests 34
# suites 0
# pass 34
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 2115.264334
```

Full log suite:

```text
$ node --test tests/log-*.test.cjs
TAP version 13
...
1..69
# tests 69
# suites 0
# pass 69
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 2129.278708
```

## Residual Risks

WR-03 and WR-05 changed behavior rather than only syntax or static structure. They are covered by targeted regression tests, but remain marked `fixed: requires human verification` per review-fix logic-bug policy.

---

_Fixed: 2026-05-06T20:06:07Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
