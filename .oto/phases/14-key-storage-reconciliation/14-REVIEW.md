---
phase: "14-key-storage-reconciliation"
reviewed: "2026-07-13T02:06:46Z"
depth: standard
diff_base: "6347bde6436d281732e00ca1b3fb3390b50ca888"
files_reviewed: 46
files_reviewed_list:
  - oto/bin/lib/config.cjs
  - oto/bin/lib/core.cjs
  - oto/bin/lib/secrets.cjs
  - oto/commands/oto/settings-integrations.md
  - oto/workflows/settings-integrations.md
  - sdk/dist/cli.js
  - sdk/dist/config.js
  - sdk/dist/query/config-mutation.js
  - sdk/dist/query/index.js
  - sdk/dist/query/secret-commands.js
  - sdk/dist/query/secrets.js
  - sdk/src/cli.test.ts
  - sdk/src/cli.ts
  - sdk/src/config-loader-parity.test.ts
  - sdk/src/config.test.ts
  - sdk/src/config.ts
  - sdk/src/query/config-mutation-failclosed.test.ts
  - sdk/src/query/config-mutation.test.ts
  - sdk/src/query/config-mutation.ts
  - sdk/src/query/config-newproject-shape.test.ts
  - sdk/src/query/config-query.test.ts
  - sdk/src/query/config-query.ts
  - sdk/src/query/index.ts
  - sdk/src/query/migration-lock.test.ts
  - sdk/src/query/registry.test.ts
  - sdk/src/query/secret-commands.test.ts
  - sdk/src/query/secret-commands.ts
  - sdk/src/query/secret-input-failclosed.test.ts
  - sdk/src/query/secrets-empty-keyfile.test.ts
  - sdk/src/query/secrets-symlink.test.ts
  - sdk/src/query/secrets.test.ts
  - sdk/src/query/secrets.ts
  - sdk/src/query/utils.ts
  - tests/14-config-boolean.test.cjs
  - tests/14-configget-guard.test.cjs
  - tests/14-empty-keyfile.test.cjs
  - tests/14-keyfile-symlink.test.cjs
  - tests/14-loader-credential-survival.test.cjs
  - tests/14-loader-scrub.test.cjs
  - tests/14-migration-hardening.test.cjs
  - tests/14-migration-lock.test.cjs
  - tests/14-newproject-boolean.test.cjs
  - tests/14-newproject-shape-guard.test.cjs
  - tests/14-no-plaintext-guard.test.cjs
  - tests/14-secrets-keyfile.test.cjs
  - tests/14-settings-workflow-contract.test.cjs
findings:
  critical: 3
  warning: 6
  info: 1
  total: 10
status: issues_found
convergence:
  unresolved_critical: 3
  historical_findings_reviewed: 15
  historical_warnings_dispositioned: 10
  new_warnings_dispositioned: 0
---

# Phase 14: Code Review Report

**Reviewed:** 2026-07-13T02:06:46Z
**Depth:** standard
**Files reviewed:** 46
**Status:** issues_found

## Verdict

Phase 14 has not reached review convergence. The original three Critical
reproductions are closed, the focused tests pass, and the six reviewed SDK
distribution files match fresh TypeScript emission. This fresh review found
three unresolved Critical issues and six new Warnings. None of the new Warnings
has a FIX / ACCEPT / DEFER row in `14-DISPOSITIONS.md`, so convergence contract
items 2 and 3 are both unmet.

The most important failures are observable through shipped command surfaces:

1. Malformed config can disclose secret bytes in parser errors.
2. The settings workflow defaults to a Claude-only executable path and breaks
   on normal Codex, Gemini, and custom-config-directory installs.
3. Workstream `secret-status` ignores inherited root config and root migration,
   leaving root plaintext in place while reporting the wrong effective state.

## Critical Findings

### CR-01 — Malformed-config errors disclose secret bytes

**Severity:** Critical
**Evidence:** `oto/bin/lib/config.cjs:493-495` appends `err.message` to the CJS
`config-get` error. `sdk/src/config.ts:256-261,271-277` does the same for both
the selected and inherited root SDK config. The shipped mirror is present at
`sdk/dist/config.js:191-209`. This conflicts with the sanitized parse handling
already used by `oto/bin/lib/config.cjs:337-341` and
`sdk/src/query/config-mutation.ts:105-118`.

**Reproduction:** With config bytes
`{"exa_search": SYNTHETICSECRET1234567890}`, CJS `config-get exa_search`
exited 1 and printed a V8 parse excerpt containing `SYNTHETICS`. SDK
`resolve-model` did the same through `loadConfig`.

**Impact:** A malformed config containing a legacy or manually entered API key
can copy secret bytes into stderr, agent context, CI logs, or session logs. The
command wrapper's statement that plaintext is never echoed is therefore false
on this error path.

**Recommendation:** Replace parser-detail interpolation with fixed, path-only
messages on both loaders and the CJS getter. Add real-process tests using a
synthetic bare-token marker and assert that no marker substring reaches stdout
or stderr through CJS `config-get`, SDK `config-get`, and an SDK `loadConfig`
consumer. Rebuild SDK dist after the source fix.

### CR-02 — Settings workflow is wired to a Claude-only tool path

**Severity:** Critical
**Evidence:** `oto/workflows/settings-integrations.md:54-64` defaults
`OTO_TOOLS` to `$HOME/.claude/oto/bin/oto-tools.cjs`. The workflow itself is
shared by all runtimes, while `tests/14-settings-workflow-contract.test.cjs:72-85`
always supplies an `OTO_TOOLS` override and therefore never exercises the
installed default.

**Impact:** A normal Codex-only (`~/.codex`) or Gemini-only (`~/.gemini`)
installation, and a Claude installation using a non-default config directory,
cannot complete the entry block. Workstream detection degrades to `none`, then
the unguarded `config-path` call fails with `MODULE_NOT_FOUND`. The Phase 14
integration workflow is unusable on supported runtimes and the historical
WR-02 `FIX` disposition is runtime-incomplete.

**Recommendation:** Resolve the current runtime config directory through an
installer-provided/runtime-neutral mechanism, or route workstream/config-path
through the already-on-PATH `oto-sdk` surface. Add install-smoke contract tests
that execute the unmodified installed workflow entry block for Claude, Codex,
Gemini, and an overridden config directory without injecting `OTO_TOOLS`.

### CR-03 — Workstream status bypasses root inheritance and root self-healing

**Severity:** Critical
**Evidence:** `sdk/src/query/secret-commands.ts:291-305` migrates and reads only
`planningPaths(projectDir, workstream).config`. The effective loader contract at
`sdk/src/config.ts:228-287` instead merges root config beneath the workstream.
`oto/workflows/settings-integrations.md:72-92,173-175,272-275` relies on the
leaf-only `secret-status` result for decisions and confirmation. Existing
status tests in `sdk/src/query/secret-commands.test.ts` do not pass a workstream.

**Reproductions:**

- Root `{exa_search:true}`, workstream `{}`, and a valid keyfile produced
  `Exa: disabled — key from ~/.oto/exa_api_key`, although the effective SDK
  config inherits `true`.
- A root legacy Exa string with workstream `{}` produced
  `disabled — no key detected`; the root file remained string-typed and no
  keyfile was created.

**Impact:** The primary management workflow can misreport an integration's
effective state and leave a tracked plaintext root credential unmigrated. This
violates self-healing and safe-status requirements even though `loadConfig`
itself has correct inheritance.

**Recommendation:** Migrate both root and workstream layers, then compute flag
state through the same root-to-workstream effective merge used by `loadConfig`.
Add workstream status tests for inherited booleans, explicit overrides, and
root legacy strings, including disk/keyfile post-state assertions.

## Warning Findings

### WR-01 — CJS and SDK writers use different locks for the same config

**Severity:** Warning
**Evidence:** CJS mutation uses `<planning-dir>/.lock` at
`oto/bin/lib/core.cjs:862-890`; its tests pin that path at
`tests/14-migration-lock.test.cjs:31-37`. SDK mutation locks
`paths.config` at `sdk/src/query/config-mutation.ts:301-325`, producing
`config.json.lock` as pinned by `sdk/src/query/migration-lock.test.ts:85-127`.

**Impact:** A CJS writer and SDK writer can enter read-modify-write sections
simultaneously and lose one another's unrelated updates. A live CJS `.lock` did
not block SDK `config-set`, and a live `config.json.lock` did not block CJS
`config-set`; both commands returned success.

**Recommendation:** Establish one cross-implementation config lock identity
and ownership protocol, including stale-lock semantics. Add a real-process test
that interleaves one CJS mutation with one SDK mutation and proves both updates
survive. Historical WR-01 is fixed only within each implementation, not across
the two shipped writers.

### WR-02 — SDK `configEnsureSection` remains an unlocked read-modify-write

**Severity:** Warning
**Evidence:** `sdk/src/query/config-mutation.ts:574-589` reads, mutates, and
writes config without `acquireStateLock`, unlike `configSet` at lines 301-325
and `configSetModelProfile` at lines 372-386. The fail-closed tests cover shape
and byte preservation but not concurrent mutation.

**Impact:** It ignores even the SDK's own live `config.json.lock` and can
overwrite a concurrent config update from a stale read. A live lock was present
during a reproduced `config-ensure-section`; the command still exited 0 and
wrote the file.

**Recommendation:** Wrap the entire read-modify-write in the shared config lock
and add an interleaving regression against `configSet`.

### WR-03 — CJS `config-set` accepts array-root config and falsely reports success

**Severity:** Warning
**Evidence:** `oto/bin/lib/config.cjs:331-359` parses an existing config but
never validates that the root is a plain object. It then assigns named
properties even when `config` is an array; JSON serialization drops those
properties. SDK correctly rejects this shape at
`sdk/src/query/config-mutation.ts:93-122`.

**Impact:** With `config.json` equal to `[]`, CJS
`config-set exa_search false --raw` exited 0 and printed
`exa_search=false`, while the file remained `[]`. This is a silent false-success
path and a source/behavior regression between the two write implementations.

**Recommendation:** Reuse the SDK's plain-object-root rule in CJS before any
mutation, with sanitized errors and byte-preservation tests for arrays, null,
numbers, and strings.

### WR-04 — New-project availability checks count unusable keyfile paths

**Severity:** Warning
**Evidence:** CJS uses raw existence checks at
`oto/bin/lib/config.cjs:87-93`; SDK mirrors this at
`sdk/src/query/config-mutation.ts:463-466` and
`sdk/dist/query/config-mutation.js:397-409`. The canonical reader at
`sdk/src/query/secrets.ts:120-150` treats empty and non-regular files as no
credential. Current new-project tests cover only a valid non-empty keyfile.

**Impact:** A zero-byte Exa keyfile caused new-project creation to persist
`exa_search:true`, after which status reported `Exa: enabled — no key detected`.
Whitespace-only files, symlinks, and other non-regular paths have the same
presence-versus-usability mismatch.

**Recommendation:** Derive new-project defaults from `detectKeySource` or
`readKeyfile`, not `existsSync`. Add mirrored CJS/SDK cases for empty,
whitespace-only, symlink, and non-regular keyfile paths.

### WR-05 — Workstream Replace/Clear silently changes the global credential

**Severity:** Warning
**Evidence:** `sdk/src/query/secret-commands.ts:170-173` snapshots and writes an
unscoped home keyfile, then scopes only the boolean `configSet`. Lines 220-223
scope the false flag but globally delete the keyfile. The workflow presents
these as active-workstream operations at
`oto/workflows/settings-integrations.md:159-181` without disclosing the
cross-config effect.

**Impact:** Replacing a key from one workstream changes the credential observed
by root and every other workstream. Clearing from one workstream deleted the
shared key and left root `{exa_search:true}` with no key. The canonical global
keyfile location may be intentional, but its destructive cross-scope behavior
is neither tested nor dispositioned.

**Recommendation:** Explicitly define Replace/Clear as global operations,
require confirmation, and reconcile or prominently warn about every other
enabled config. Add root-plus-multiple-workstream Set/Replace/Clear regressions.

### WR-06 — New-project rollback stops before the final config write

**Severity:** Warning
**Evidence:** Keyfile compensation covers only failures inside the keyfile loop
at `oto/bin/lib/secrets.cjs:404-433` and
`sdk/src/query/secrets.ts:342-369`. Project-directory and config writes happen
later, outside that rollback boundary, at `oto/bin/lib/config.cjs:251-265` and
`sdk/src/query/config-mutation.ts:542-557`. Existing rollback coverage at
`sdk/src/query/config-newproject-shape.test.ts:177-192` exercises a later
keyfile failure, not a final config failure.

**Impact:** A global-default legacy key can be migrated into a durable 0600
keyfile even when `config-new-project` later fails to create/write the project
config. The command reports failure but has modified global secret state, so
the historical WR-06 claim of compensated two-phase behavior is incomplete.

**Recommendation:** Include directory/config creation in the transaction and
restore attempted keyfiles if the final durable config commit fails. Add
ENOTDIR/EACCES and injected rename/write-failure regressions in both layers.

## Info Finding

### IR-01 — The no-plaintext guard scans only tracked `.oto` files

**Severity:** Info
**Evidence:** `tests/14-no-plaintext-guard.test.cjs:48-68` enumerates only
`git ls-files -- .oto`, despite the broader repository/no-tracked-key wording
used by Phase 14 evidence. Provider-token and key-shaped regexes therefore do
not inspect `oto/`, `sdk/`, `tests/`, or other tracked roots.

**Impact:** The guard is useful for committed planning config, but it cannot
detect an accidental real key elsewhere in the repository. A green result is
weaker than the report name and prior disposition imply.

**Recommendation:** Scan all tracked text files with narrowly scoped fixture
exemptions, or rename/split the test so its `.oto`-only guarantee is explicit.

## Historical Disposition Audit

The original Critical IDs and the historical IDs below refer to the superseded
review dated 2026-07-12T02:16:40Z, not the fresh IDs above.

| Historical finding | Current assessment |
|---|---|
| CR-01 empty keyfile | **Closed on original reproduction.** Empty/whitespace migration and status tests pass. |
| CR-02 array-shaped new-project input | **Closed on original reproduction.** Both real-process paths reject before project writes. |
| CR-03 malformed SDK mutators | **Closed on original reproduction.** SDK mutation/secret byte-preservation tests pass. |
| WR-01 migration lock | **Partially closed.** Same-layer tests pass; fresh WR-01 identifies cross-layer lock divergence. |
| WR-02 workstream routing | **Partially closed.** Session/root resolution passes in-repo, but fresh CR-02 shows the installed runtime path is not portable. |
| WR-03 event wrapper | **Closed.** Workstream forwarding regression passes. |
| WR-04 comma-separated skills | **DEFER remains evidence-backed.** Phase 16 owner/prerequisite is recorded in `.oto/STATE.md`. |
| WR-05 loader scrub | **Closed.** Both effective-view scrub suites pass. |
| WR-06 new-project transaction | **Partially closed.** Validation and intra-keyfile compensation pass; fresh WR-06 covers the unhandled final write. |
| WR-07 keyfile symlinks/mode | **Closed for documented threat model.** Symlink/non-regular tests pass; accepted regular-file TOCTOU remains documented. |
| WR-08 hidden input | **Closed.** Unavailable suppression hook fails before prompting. |
| WR-09 root inheritance | **Closed in `loadConfig`; fresh CR-03 identifies a separate status consumer that bypasses it.** |
| WR-10 registry test | **Closed.** Registry suite passes. |
| IR-01 token regex | **Partially closed.** Regex breadth improved; fresh IR-01 records scan-scope limits. |
| IR-02 CLI import | **Closed.** Import side-effect test passes. |

All ten historical Warnings have a disposition row, including the concrete
WR-04 deferral. The six fresh Warnings do not. Therefore the current answer to
the convergence question is **no**: every remaining Warning is not yet
FIX / ACCEPT / DEFER with evidence.

## Verification Evidence

- `node --test --test-reporter=dot tests/14-*.test.cjs`: exit 0; rerun with
  default reporter showed **99/99 passed**.
- Enumerated Phase 14 SDK gate: **14/14 files, 271/271 tests passed**.
- `cd sdk && npx tsc --noEmit`: exit 0.
- Fresh TypeScript emission compared against the six scoped SDK JavaScript
  artifacts: semantic content identical; only source-map trailer differences
  were expected from the no-source-map comparison build.
- `git diff --check` for the 46-file scope: clean.
- Plan 14-19's recorded full-SDK baseline comparison remains
  `NO NEW FAILURES: PASS`; this standard-depth review did not repeat the full
  flaky baseline run.

---

_Reviewer: Codex (oto-code-reviewer)_
_Fresh convergence review; no source files changed and no commit created._
