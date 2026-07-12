---
phase: 14-key-storage-reconciliation
reviewed: "2026-07-12T02:16:40Z"
depth: standard
files_reviewed: 31
files_reviewed_list:
  - oto/bin/lib/config.cjs
  - oto/bin/lib/core.cjs
  - oto/bin/lib/secrets.cjs
  - oto/commands/oto/settings-integrations.md
  - oto/workflows/settings-integrations.md
  - sdk/dist/config.js
  - sdk/dist/query/config-mutation.js
  - sdk/dist/query/secret-commands.js
  - sdk/src/cli.test.ts
  - sdk/src/cli.ts
  - sdk/src/config.test.ts
  - sdk/src/config.ts
  - sdk/src/query/config-mutation.test.ts
  - sdk/src/query/config-mutation.ts
  - sdk/src/query/config-query.test.ts
  - sdk/src/query/config-query.ts
  - sdk/src/query/index.ts
  - sdk/src/query/registry.test.ts
  - sdk/src/query/secret-commands.test.ts
  - sdk/src/query/secret-commands.ts
  - sdk/src/query/secrets.test.ts
  - sdk/src/query/secrets.ts
  - sdk/src/query/utils.ts
  - tests/14-config-boolean.test.cjs
  - tests/14-configget-guard.test.cjs
  - tests/14-loader-credential-survival.test.cjs
  - tests/14-migration-hardening.test.cjs
  - tests/14-newproject-boolean.test.cjs
  - tests/14-no-plaintext-guard.test.cjs
  - tests/14-secrets-keyfile.test.cjs
  - tests/14-settings-workflow-contract.test.cjs
findings:
  critical: 3
  warning: 10
  info: 2
  total: 15
status: issues_found
---

# Phase 14: Code Review Report

**Reviewed:** 2026-07-12T02:16:40Z
**Depth:** standard
**Files Reviewed:** 31
**Status:** issues_found

## Summary

Fresh review of the current merged Phase 14 code after plans 14-10 through
14-12. The previous report's three blocking defects are closed: failed CJS
loader migration no longer destroys a credential during unrelated write-back,
SDK fallback loads scrub legacy strings, and CJS `config-get` now fails open
for unrelated keys while withholding sensitive values. Boolean display,
warning ordering, workflow fallback, and TTY EOF behavior are also fixed.

The current code still has three empirically reproduced Critical issues:

1. An empty keyfile wins a migration conflict and causes the only valid legacy
   credential to be discarded.
2. Both `config-new-project` implementations accept array-shaped choices that
   persist a plaintext integration key below a numeric property, bypassing the
   top-level boolean gate.
3. SDK config mutators silently replace malformed config with a new object,
   erasing every prior setting; the secret command path can trigger this too.

The focused CJS Phase 14 suite passed 54/54. TypeScript checking passed. The
seven reviewed SDK suites passed 211/212; the sole failure is the stale
two-argument spy expectation recorded as WR-10. Current source and the three
reviewed dist mirrors are in parity.

## Critical Issues

### CR-01: Empty keyfiles destroy the only valid legacy credential during migration

**File:** `oto/bin/lib/secrets.cjs:89-100,185-199`; `sdk/src/query/secrets.ts:89-100,291-305`

**Issue:** `readKeyfile` returns an object for a zero-byte or whitespace-only
file, with `value: ''`. Migration treats any returned object as an existing,
authoritative keyfile. Because the empty value differs from the legacy config
string, the keyfile-wins conflict branch sets the committed flag to `true` and
drops the valid string without replacing the empty file.

Reproduced in both implementations: an empty `exa_api_key` plus
`{"exa_search":"synthetic-credential-marker-1234"}` produced a masked
`(unset) kept` notice, rewrote config to `{"exa_search":true}`, and left the
keyfile empty. No usable copy of the credential remained.

**Fix:** Treat trimmed-empty keyfiles as absent or invalid. During migration,
overwrite an empty keyfile with the valid legacy value; in ordinary source
detection, report an empty keyfile as no source. Add CJS and SDK regressions for
zero-byte and whitespace-only files across migration, warning, and status paths.

### CR-02: Array-shaped new-project choices bypass boolean validation and persist plaintext

**File:** `oto/bin/lib/config.cjs:144-173,196-215`; `sdk/src/query/config-mutation.ts:363-371,438-479`

**Issue:** Both entry points cast `JSON.parse` output to an object without
rejecting arrays. Object spread then copies the array's numeric properties into
the config, while reconciliation checks only the three top-level integration
fields. A nested integration field therefore bypasses the Phase 14 gate.

Empirically reproduced in both write paths with
`JSON.stringify([{ exa_search: 'synthetic-credential-marker-1234' }])`:
the command succeeded, top-level `exa_search` remained boolean `false`, and the
config contained `"0":{"exa_search":"synthetic-credential-marker-1234"}`.
This violates D-05 and can place a credential in a committed config file.

**Fix:** Before any merge or side effect, require choices to be a non-null plain
object (not an array), validate its keys against the config schema, and reject
integration-key strings at any nested location. Add real-process CJS and SDK
tests for arrays, primitives, `null`, and nested integration fields, asserting
byte-identical/no-file behavior on rejection.

### CR-03: SDK config mutators erase malformed config instead of failing closed

**File:** `sdk/src/query/config-mutation.ts:253-263,315-327,505-517`; `sdk/dist/query/config-mutation.js:225-235,277-288,450-461`

**Issue:** `configSet`, `configSetModelProfile`, and `configEnsureSection` catch
all read/parse errors and continue from `{}`. A malformed but readable
`config.json` is therefore overwritten with only the requested mutation.
Reproduced with `{bad json`: `configSet(['model_profile','quality'])` returned
success and replaced the file with only `{"model_profile":"quality"}`.

This is a direct data-loss path. It is also reachable through `secret-set` and
`secret-clear`, which delegate flag mutation to `configSet`; a secret operation
against malformed config can erase unrelated project settings while appearing
successful. The CJS setter correctly errors on malformed JSON.

**Fix:** Distinguish `ENOENT` from parse/read failures. Start from `{}` only
when the file truly does not exist; reject malformed JSON and non-plain-object
roots without changing bytes. Apply the same helper to all three mutators,
rebuild dist, and add byte-preservation tests including the secret command path.

## Warnings

### WR-01: Legacy migration bypasses the config lock and can lose concurrent updates

**File:** `oto/bin/lib/secrets.cjs:165-207`; `oto/bin/lib/config.cjs:349-382`; `sdk/src/query/secrets.ts:265-314`; `sdk/src/query/config-mutation.ts:222-250`

**Issue:** Both migration helpers perform an unlocked whole-file
read/modify/write. Integration `config-set` invokes migration before acquiring
its normal planning/state lock, and load/status paths migrate without a lock at
all. A stale migration write can race a locked writer and silently remove the
writer's unrelated update. The CJS helper was confirmed to rewrite config even
while `.oto/.lock` existed.

**Fix:** Put migration and the subsequent mutation in one lock-protected
transaction, and make read-triggered migration acquire that same lock. Add a
multi-process regression that interleaves migration with an unrelated setting
update and asserts both changes survive.

### WR-02: Settings workflow misses session-scoped and migrated-root workstreams

**File:** `oto/workflows/settings-integrations.md:52-66`; `oto/bin/lib/core.cjs:1033-1059,1113-1120`

**Issue:** The workflow checks only `.oto/active-workstream`. Core routing uses
a tmpdir-backed session pointer whenever a stable session key exists and then
intentionally ignores the shared pointer. The workflow also hardcodes `.oto`,
so a migrated `.planning` root is missed. Reproduced with `CODEX_THREAD_ID`:
core resolved `ws1` while `.oto/active-workstream` did not exist; every workflow
command would therefore read or mutate root config.

**Fix:** Resolve the active workstream through one canonical query backed by
core's session-aware/root-aware resolver, then construct `WS_ARGS` from that
result. Extend the workflow contract test to cover session pointers and
migrated `.planning` roots.

### WR-03: Event-enabled registry wrappers discard the workstream argument

**File:** `sdk/src/query/index.ts:571-585`

**Issue:** Mutation wrappers registered when an event stream is present accept
only `(args, projectDir)` and call the original handler without its optional
`workstream`. Direct programmatic dispatch with an event stream therefore
mutates root config instead of the requested workstream. Reproduced by
dispatching workstream `config-set`: the root file changed and the workstream
file remained untouched. CLI registries without an event stream are unaffected.

**Fix:** Preserve the full handler signature:
`(args, projectDir, workstream) => original(args, projectDir, workstream)`.
Add an event-stream regression for `config-set`, `secret-set`, and
`secret-clear` with a workstream.

### WR-04: Comma-separated agent skills are persisted as one nonexistent skill

**File:** `oto/workflows/settings-integrations.md:259-264`

**Issue:** The workflow asks for a comma-separated list and writes it as one
quoted string. Current consumers treat a string as one skill path, so
`"skill-a,skill-b"` is resolved as one nonexistent
`skill-a,skill-b/SKILL.md`; neither valid skill is injected.

**Fix:** Parse, trim, and validate each skill name, then persist a JSON array
such as `["skill-a","skill-b"]`. Add an end-to-end test that creates two
valid skills and confirms both are returned by the agent-skills query.

### WR-05: Failed migration can let non-boolean integration values escape loaders

**File:** `oto/bin/lib/core.cjs:321-327,421,492-494`; `sdk/src/config.ts:157-165,228-233`

**Issue:** Both effective-view scrubbers normalize strings only. Migration
normally coerces other values, but if its rewrite fails, an object or number is
returned unchanged despite the loaders' boolean type contract. The CJS path
was reproduced returning an object and its embedded marker verbatim.

**Fix:** On a fresh effective-view copy, normalize every non-boolean integration
value to `Boolean(value)` (or fail closed), while keeping the disk-write object
pristine. Cover object, number, `null`, and array values with forced migration
failure in both loaders.

### WR-06: New-project reconciliation mutates before validating all choices and loses provenance

**File:** `oto/bin/lib/config.cjs:144-173`; `oto/bin/lib/secrets.cjs:238-269`; `sdk/src/query/config-mutation.ts:438-471`; `sdk/src/query/secrets.ts:207-245`

**Issue:** Defaults and caller choices are merged before reconciliation, and
the one-pass loop writes keyfiles as it encounters values. An explicit boolean
can hide a legacy default string so it is never migrated. Conversely, a valid
Exa default is written to a keyfile before a later invalid Brave caller value
causes the command to reject, leaving side effects from a failed operation.

**Fix:** First validate every caller-owned integration value without side
effects. Then reconcile raw defaults in a second pass, preserve the caller's
boolean enablement separately, and commit keyfile/config changes only after all
validation succeeds (with compensation on failure).

### WR-07: Keyfile operations follow symlinks and write before tightening mode

**File:** `oto/bin/lib/secrets.cjs:81-100`; `sdk/src/query/secrets.ts:76-100`

**Issue:** `writeFileSync`, `statSync`, `chmodSync`, and `readFileSync` all
follow pre-existing symlinks. Reproduced with `exa_api_key -> victim.txt`:
`writeKeyfile` overwrote the target and changed its mode to 0600. In addition,
the `mode: 0o600` create option does not tighten an existing 0644 file until
after the new secret bytes have been written.

**Fix:** Verify the base directory and target with `lstat`, reject symlinks and
non-regular files, and open/write with no-follow semantics and mode 0600 before
any secret bytes are transferred. Heal existing permissions before truncation.

### WR-08: Hidden input deliberately fails open to visible echo if a private API changes

**File:** `sdk/src/query/secret-commands.ts:49-58`; `sdk/dist/query/secret-commands.js:26-34`

**Issue:** Echo suppression depends on private readline member
`_writeToOutput`. The new capability guard explicitly degrades to visible echo
when that internal disappears, contradicting the workflow's guarantee that API
keys are never echoed. Current supported Node versions expose the member, so
this is a latent runtime-drift disclosure rather than a present leak.

**Fix:** Fail closed before accepting input if secure echo suppression cannot
be established, or replace the private hook with a terminal-mode implementation
whose behavior is under project control. Test the unavailable-hook branch.

### WR-09: SDK workstream config loading drops root inheritance

**File:** `sdk/src/config.ts:167-233`; `sdk/dist/config.js:101-168`; `oto/bin/lib/core.cjs:330-421`

**Issue:** CJS deep-merges root config with a present workstream config. SDK
`loadConfig` reads the root only when the workstream file is absent; when both
exist, root-only settings are replaced by hardcoded defaults. Reproduced with
root `commit_docs:false` and a workstream containing only
`model_profile:'quality'`: SDK returned `commit_docs:true`.

**Fix:** Parse and scrub both layers, deep-merge root then workstream, and only
then merge hardcoded defaults. Add parity tests for inherited top-level and
nested values plus workstream overrides.

### WR-10: Reviewed SDK test set is red because registry dispatch expectation is stale

**File:** `sdk/src/query/registry.test.ts:71-81`

**Issue:** `QueryRegistry.dispatch` correctly forwards the optional third
`workstream` argument, including `undefined`, but the spy assertion expects
only two arguments. The reviewed SDK command exited with 211 passes and this
single failure, so the focused gate is not green.

**Fix:** Expect `handler` to be called with `(['arg1'], '/tmp', undefined)` and
add a second assertion with a real workstream. That regression should also
exercise the event wrapper in WR-03.

## Info

### IR-01: No-plaintext token scan misses provider keys containing internal separators

**File:** `tests/14-no-plaintext-guard.test.cjs:20-22`

**Issue:** The provider-token regex allows only alphanumerics after `sk-` or
`fc-`; long tokens containing internal `-` or `_` are missed unless they happen
to occur in the narrower integration-field assignment pattern.

**Fix:** Expand the provider-specific character sets/prefixes and add positive
and negative-control fixtures, including separated `sk-proj-*`-style tokens.

### IR-02: Importing the CLI module runs the CLI and pollutes its unit tests

**File:** `sdk/src/cli.ts:694-696`; `sdk/src/cli.test.ts:1-2`

**Issue:** Unconditional `main()` execution means importing helpers from
`cli.ts` parses the host process argv, prints usage errors, and sets
`process.exitCode`. The CLI unit test currently emits this error block even
when all 45 assertions pass.

**Fix:** Guard auto-execution with a direct-entry check and have the executable
entrypoint call `main()` explicitly. Add an import-without-side-effects test.

---

_Reviewed: 2026-07-12T02:16:40Z_
_Reviewer: Codex (gsd-code-reviewer)_
_Depth: standard_
