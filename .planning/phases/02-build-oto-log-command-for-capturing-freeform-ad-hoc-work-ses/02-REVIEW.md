---
phase: 02-build-oto-log-command-for-capturing-freeform-ad-hoc-work-ses
reviewed: 2026-05-06T19:51:34Z
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
  warning: 6
  info: 0
  total: 7
status: issues_found
---

# Phase 02: Code Review Report

**Reviewed:** 2026-05-06T19:51:34Z
**Depth:** standard
**Files Reviewed:** 21
**Status:** issues_found

## Summary

Reviewed the `/oto-log` library, public and compatibility CLI dispatch, command markdown, progress/resume workflow surfaces, command indexes, runtime matrix, and Phase 02 log tests. The phase-local tests pass, but the implementation still has contract gaps around prompt-injection boundaries, documented CLI flags, same-minute collision addressability, planning-root-aware surfaces, and fire-and-forget diff boundaries.

Verification run:

```bash
node --test tests/log-*.test.cjs
node --test tests/phase-08-runtime-matrix-render.test.cjs
```

## Critical Issues

### CR-01: Fixed DATA markers can be escaped by untrusted diff content

**File:** `oto/bin/lib/log.cjs:221`

**Issue:** `wrapData()` places untrusted git diff text between literal `<DATA_START>` / `<DATA_END>` markers without escaping those same marker strings if they appear inside the diff. A changed file can include `<DATA_END>` and move following diff text outside the protected data block, defeating the command markdown guardrail at `oto/commands/oto/log.md:58`.

**Fix:**

```js
function escapeDataMarkers(text) {
  return String(text || '')
    .replace(/<DATA_START>/g, '&lt;DATA_START&gt;')
    .replace(/<DATA_END>/g, '&lt;DATA_END&gt;');
}

function wrapData(text) {
  return `<DATA_START>\n${escapeDataMarkers(text)}\n<DATA_END>`;
}
```

Also add a test with a diff containing `<DATA_END>` and assert the raw marker appears only as the wrapper terminator.

## Warnings

### WR-01: `oto log --help` exits as an empty-title error

**File:** `oto/bin/lib/log.cjs:152`

**Issue:** The public dispatcher in `bin/install.js:73` routes `oto log --help` directly to `log.main()`, but `routeSubcommand()` treats `--help` as a oneshot title token. The result is exit code 2 with `/oto-log requires a title`, while the Phase 02 CLI contract expects help to exit 0 and show `start|end|list|show|promote`. The compatibility path `oto-tools log --help` is also blocked by the global forbidden-flag check in `oto/bin/lib/oto-tools.cjs:330`.

**Fix:**

```js
function routeSubcommand(args) {
  if (!args || args.length === 0) return { sub: 'help', rest: [] };
  const first = args[0];
  if (first === '--help' || first === '-h') return { sub: 'help', rest: args.slice(1) };
  if (SUBCOMMANDS.has(first)) return { sub: first, rest: args.slice(1) };
  return { sub: 'oneshot', rest: args };
}
```

Then let `oto-tools.cjs` pass `--help` through for `command === 'log'`, or handle `log --help` before the global forbidden flag loop.

### WR-02: `oto log end --body` ignores the body and logs it as closing notes

**File:** `oto/bin/lib/log.cjs:640`

**Issue:** `main()` parses `--body`, but the `end` branch calls `endSession({ closingNotes: rest.join(' '), cwd })` and never passes `values.body`. This contradicts `oto/commands/oto/log.md:112`, which tells the command layer to close drafted sessions with `oto log end --body "<drafted six-section body>"`. In practice the drafted body is embedded under "What was discussed" as literal `--body ...`, while the Summary remains auto-composed from the session title.

**Fix:**

```js
if (sub === 'end') {
  const result = await endSession({
    closingNotes: positionals.join(' '),
    body: values.body,
    cwd,
  });
  process.stdout.write(`Wrote ${result.logPath}\n`);
  return 0;
}
```

Add a CLI-level test that starts a session, runs `oto-tools log end --body <body>`, and asserts the written markdown body equals the supplied body.

### WR-03: Collision-suffixed entries are not addressable by their advertised slug

**File:** `oto/bin/lib/log.cjs:328`

**Issue:** Same-minute collisions append `-2`, `-3`, etc. only to the filename in `writeWithCollisionSuffix()`, while frontmatter `slug` remains the original slug. `showLog()` only matches filenames ending exactly with `-${slug}.md` at `oto/bin/lib/log.cjs:459`, so `show fix-the-thing` ignores `20260506-1430-fix-the-thing-2.md`, and `show fix-the-thing-2` opens a file whose frontmatter still says `slug: fix-the-thing`. This makes colliding entries hard to show or promote correctly.

**Fix:** Make the collision suffix part of the persisted slug and returned slug, or teach `showLog()` to match both base and suffixed filenames deterministically. The cleaner fix is to rewrite the collision path with suffixed frontmatter:

```js
const result = writeWithCollisionSuffix(logsDir, `${filenameStamp}-${slug}`, '.md', content);
if (result.suffix > 1) {
  frontmatter.slug = deriveLogSlug(normalizedTitle, { collisionSuffix: result.suffix });
  atomicWriteFileSync(result.path, normalizeMd(spliceFrontmatter(body || '', serializedFrontmatter(frontmatter))));
}
return { path: result.path, slug: frontmatter.slug, suffix: result.suffix, frontmatter };
```

### WR-04: Progress/resume surfaces hardcode `.oto` instead of the resolved planning root

**File:** `oto/workflows/progress.md:87`

**Issue:** `log.cjs` writes through `planningDir(projectDir)`, which can route logs under `.oto`, migrated `.planning`, `OTO_PROJECT`, or `OTO_WORKSTREAM`. The new progress and resume snippets only scan `.oto/logs` and `.oto/phases`, so logs and active sessions written to a routed planning root will not surface in Recent Activity or resume status.

**Fix:**

```bash
PLANNING_ROOT=$(dirname "$state_path")
LOG_GLOB="$PLANNING_ROOT/logs/*.md"
SUMMARY_GLOB="$PLANNING_ROOT/phases/*/*-SUMMARY.md"
ACTIVE_SESSION="$PLANNING_ROOT/logs/.active-session.json"
```

Use those derived paths in `progress.md` and `resume-project.md` instead of hardcoded `.oto/...`.

### WR-05: Fire-and-forget capture never uses the prior log boundary

**File:** `oto/bin/lib/log.cjs:266`

**Issue:** D-01 defines oneshot capture as "since the last log or last commit", but `captureEvidence()` defaults `resolvedSince` to the current `HEAD` every time no `--since` is supplied. It never inspects the most recent log entry, and `diff_to` is persisted as literal `HEAD`, so a later run cannot reconstruct the previous boundary after commits advance.

**Fix:** Resolve the prior log before falling back to current `HEAD`, and persist the concrete `HEAD` SHA as `diff_to`:

```js
const head = git(['rev-parse', 'HEAD'], projectDir).trim();
const priorBoundary = since ? null : readLatestConcreteLogBoundary(projectDir);
const resolvedSince = since || priorBoundary || head;

return {
  diff_from: resolvedSince,
  diff_to: head,
  // ...
};
```

Add a test with an existing log whose `diff_to` is a commit SHA and assert a subsequent oneshot uses that SHA as `diff_from`.

### WR-06: Top-level public help omits the new `oto log` command

**File:** `bin/install.js:21`

**Issue:** `bin/install.js` now supports `oto log`, but `HELP_TEXT` lists sync and migrate and does not mention log. Users running `oto --help` cannot discover the public command surface added in this phase.

**Fix:** Add a help row near `oto migrate`:

```text
  oto log <title>|start|end|list|show|promote
      capture and manage ad-hoc work logs
```

---

_Reviewed: 2026-05-06T19:51:34Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
