---
phase: 14-key-storage-reconciliation
reviewed: "2026-07-11T02:48:23Z"
depth: standard
files_reviewed: 25
files_reviewed_list:
  - oto/bin/lib/config.cjs
  - oto/bin/lib/core.cjs
  - oto/bin/lib/secrets.cjs
  - oto/commands/oto/settings-integrations.md
  - oto/workflows/settings-integrations.md
  - sdk/src/cli.test.ts
  - sdk/src/cli.ts
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
  - tests/14-migration-hardening.test.cjs
  - tests/14-newproject-boolean.test.cjs
  - tests/14-no-plaintext-guard.test.cjs
  - tests/14-secrets-keyfile.test.cjs
  - tests/14-settings-workflow-contract.test.cjs
findings:
  critical: 3
  warning: 5
  info: 5
  total: 13
status: issues_found
---

# Phase 14: Code Review Report (Post-Gap-Closure Cycle)

**Reviewed:** 2026-07-11T02:48:23Z
**Depth:** standard
**Files Reviewed:** 25
**Status:** issues_found

## Summary

Fresh adversarial review of the current state of Phase 14 (key-storage
reconciliation) after gap-closure plans 14-05..14-09 closed the prior cycle's
CR-01..CR-04 and WR-01. The gap-closure work is largely sound: caller-supplied
strings are hard-rejected on both write paths, `secret-set`/`secret-clear` are
transactional with compensation, `config-get` in the SDK fails closed for
sensitive keys, and the test suites (CJS `node:test` + Vitest) genuinely
exercise the fault fixtures.

However, three Critical defects remain, **all empirically reproduced** during
this review (not speculative):

1. The CJS loader can **destroy the only stored copy of a credential** when
   self-heal migration fails, because the in-memory string scrub mutates the
   object that the loader's own dirty-write paths persist back to disk
   (CR-01). This directly violates the phase's fail-closed guarantee that
   tests/14-migration-hardening.test.cjs line 94 pins for the config-set path.
2. The SDK loader's pre-project fallback **returns a plaintext API key** from
   `~/.gsd/defaults.json`, breaking the SECR-01 boolean-only loader contract
   on the one path that received no scrub (CR-02) — the same defect class as
   the prior cycle's CR-04.
3. CJS `config-get` **crashes with an unhandled stack trace on ANY key** (not
   just integration keys) when a legacy string exists and `~/.oto` is
   unwritable — the only unguarded call site of the migration (CR-03).

Five Warnings cover a masked-boolean regression that makes the CJS read/echo
surface useless for integration flags, a contradictory warning ordering shared
by both write paths, a workflow command that relies on a `--default` flag the
SDK handler silently ignores, an interactive-prompt hang path in
`readSecretInput`, and unlocked read-modify-write in the migration itself.

## Critical Issues

### CR-01: loadConfig can destroy the only stored credential when migration fails (scrubbed `fileData` is persisted by dirty-write paths)

**File:** `oto/bin/lib/core.cjs:358` (scrub), `oto/bin/lib/core.cjs:361-366` (depth write), `oto/bin/lib/core.cjs:369-414` (sub_repos dirty writes)
**Issue:** `_scrubIntegrationStrings()` is applied directly to `fileData` — the
object the surrounding code documents as "the parsed content of the config.json
file on disk — used for migrations and writes so we never persist merged values
back to disk." When `migrateLegacyIntegrationKeys` at line 352 fails (e.g.
`~/.oto` unwritable/replaced by a file), the legacy string is still present in
config.json, the scrub flips it to `true` in `fileData`, and then any of the
loader's write-back paths — the `depth`→`granularity` migration (line 365), the
`multiRepo` migration, the top-level `sub_repos` strip, or the `sub_repos`
filesystem sync (`configDirty` write at line 413) — persists the scrubbed
object. The plaintext string is overwritten with `true` while **no keyfile was
ever created**: the credential is unrecoverable (except from git history).

Empirically reproduced: config `{"exa_search": "sk-…", "depth": "standard"}` +
`~/.oto` as a regular file → after one `loadConfig()` call, config.json reads
`{"exa_search": true, "granularity": "standard"}` and no keyfile exists.

This is exactly the data-loss class the phase promised to prevent —
tests/14-migration-hardening.test.cjs ("Byte-identical: the only stored
credential is never overwritten") pins it for `config-set` but the loader path
regressed it.
**Fix:** Scrub a copy used only for value extraction, never the object that is
written back:

```js
// keep fileData pristine for disk writes
const fileData = JSON.parse(raw);
...
// scrub only the effective (in-memory) view
const parsed = _scrubIntegrationStrings(
  rootParsed ? _deepMergeConfig(rootParsed, fileData) : { ...fileData }
);
```

(Equivalently: run the scrub after all `configDirty`/depth write-backs, on the
merged `parsed` object only.) Add a regression test: legacy string + broken
`~/.oto` + `depth` key → config.json must still contain the string after
`loadConfig()`.

### CR-02: SDK loadConfig pre-project fallback returns a plaintext API key (SECR-01 boolean-only loader contract broken)

**File:** `sdk/src/config.ts:193-204` (fallback paths), `sdk/src/config.ts:218-221` (scrub applied only to the project-config branch)
**Issue:** The Phase 14 scrub (`typeof parsed[k] === 'string' → true`) runs only
in the branch where a project config was found and parsed. The two fallback
paths — no project config found (line 193) and empty project config (line 199)
— return `mergeDefaults(userDefaults)` with **no migration and no scrub**.
`~/.gsd/defaults.json` is precisely where a legacy integration string persists
by design (D-08: that file is read-only for oto; `configNewProject`'s comment
in `sdk/src/query/secrets.ts:190-194` states the string "stays there and each
subsequent new-project run re-migrates"). So in any pre-project context the SDK
loader hands consumers `config.exa_search === "sk-…"` in plaintext.

Empirically reproduced against `sdk/dist/config.js`:
`~/.gsd/defaults.json` = `{"exa_search":"sk-leaky-…"}`, empty project dir →
`loadConfig(projectDir)` returns `exa_search = "sk-leaky-…"`.

This is the same defect class as the prior cycle's CR-04 (an unscrubbed loader
fallback layer), one layer over.
**Fix:** Scrub the fallback result too (do NOT write back to `~/.gsd` — D-08):

```typescript
function scrubIntegrationStrings(obj: Record<string, unknown>) {
  for (const k of ['exa_search', 'brave_search', 'firecrawl'] as const) {
    if (typeof obj[k] === 'string') obj[k] = true;
  }
  return obj;
}
// both fallback returns:
return mergeDefaults(scrubIntegrationStrings({ ...userDefaults }));
```

Add a Vitest case: string in `~/.gsd/defaults.json` + no project config →
`loadConfig` returns boolean.

### CR-03: CJS `config-get` crashes with an unhandled exception for ANY key when legacy migration throws

**File:** `oto/bin/lib/config.cjs:407`
**Issue:** `cmdConfigGet` calls `migrateLegacyIntegrationKeys(configPath)` bare
— the only unguarded call site in the codebase (`loadConfig` wraps it in
try/catch at core.cjs:339/352, `cmdConfigSet` wraps it at config.cjs:353-359,
SDK `configGet` implements fail-closed-for-sensitive / fail-open-for-others at
config-query.ts:97-105). If any integration key holds a legacy string and the
keyfile write fails (unwritable `~/.oto`), **every** `oto-tools config-get`
invocation crashes with a raw Node stack trace — including reads of completely
unrelated keys.

Empirically reproduced: `{"exa_search":"sk-…","model_profile":"quality"}` +
`~/.oto` as a regular file → `oto-tools config-get model_profile` dies with
`Error: EEXIST: file already exists, mkdir …/.oto` and a stack trace. Since
workflows and hooks call `config-get` constantly, one degraded `~/.oto` bricks
the CJS read surface project-wide.
**Fix:** Mirror the SDK's CR-02 semantics:

```js
let migrationFailed = false;
try { migrateLegacyIntegrationKeys(configPath); } catch { migrationFailed = true; }
if (migrationFailed && isSecretKey(keyPath)) {
  error(`${keyPath}: legacy key migration failed — value withheld (fix ~/.oto permissions and retry)`);
}
// non-sensitive keys: fail open, continue the read
```

## Warnings

### WR-01: CJS masks boolean integration flags as `****` — `config-get`/`config-set` output is useless and diverges from the SDK

**File:** `oto/bin/lib/config.cjs:447-451` (get), `oto/bin/lib/config.cjs:386-399` (set echo)
**Issue:** `maskSecret(true)` → `'true'`.length < 8 → `'****'`; `maskSecret(false)`
→ `'****'` as well. Pre-Phase-14 these keys held secret strings, so masking was
correct; post-Phase-14 they are boolean-only, and the retained unconditional
masking means `oto-tools config-get exa_search` prints `"****"` whether the
flag is true or false (empirically confirmed), and `config-set exa_search true`
echoes `exa_search=****`. Callers cannot read the flag through the CJS CLI at
all. The SDK mirror behaves differently (returns the boolean; throws only on a
string value) — a divergence in a module pair whose header mandates
"keep both implementations behavior-identical."
**Fix:** Mask only non-boolean values (defense-in-depth for unmigrated
legacies), pass booleans through:

```js
if (isSecretKey(keyPath) && typeof current !== 'boolean') {
  output(maskSecret(current), raw, maskSecret(current));
  return;
}
output(current, raw, String(current));
```

Apply the same `typeof parsedValue !== 'boolean'` condition to the
`cmdConfigSet` echo block.

### WR-02: "no API key detected — this flag has no effect" warning fires immediately before the migration that creates the key

**File:** `oto/bin/lib/config.cjs:346-359`, `sdk/src/query/config-mutation.ts:221-235`
**Issue:** Both write paths call `warnIfNoKeyDetected` BEFORE
`migrateLegacyIntegrationKeys`. When config holds a legacy string and no
keyfile/env exists, `config-set <key> true` emits the contradiction
(empirically confirmed stderr):

```text
no Exa API key detected (…) — set one via /oto-settings-integrations or this flag has no effect.
migrated exa_search API key from config.json to ~/.oto/exa_api_key (0600)
```

The flag does have effect — the key exists one line later. Misleading guidance
for exactly the migration cohort this phase targets.
**Fix:** Run the migration first, then `warnIfNoKeyDetected`, in both
`cmdConfigSet` and the SDK `configSet`.

### WR-03: Workflow relies on `--default` which the SDK `config-get` handler silently ignores, with no shell fallback

**File:** `oto/workflows/settings-integrations.md:75`
**Issue:** `SEARCH_GITIGNORED=$(oto-sdk query config-get search_gitignored --default false ${WS_ARGS…})`.
`--default` is a `gsd-tools.cjs`-only flag (oto-tools.cjs:313-316); the SDK's
native `configGet` handler reads only `args[0]` and never sees a fallback —
and because `config-get` is native-registered, the CJS bridge is never reached.
If the key is absent (hand-edited or pre-Phase-14 config), the command exits
non-zero with `Key not found` and `SEARCH_GITIGNORED` is silently empty. Every
other workflow that uses this pattern guards it (`… --default "" 2>/dev/null || true`
in execute-phase.md:1199, verify-phase.md:252, audit-fix.md:108;
`|| echo true` in plan-phase.md:1383); this new workflow is the only unguarded
call.
**Fix:** Either implement `--default` in the SDK `configGet` handler, or match
the established pattern:

```bash
SEARCH_GITIGNORED=$(oto-sdk query config-get search_gitignored ${WS_ARGS[@]+"${WS_ARGS[@]}"} 2>/dev/null || echo false)
```

### WR-04: `readSecretInput` hangs on TTY EOF and depends on a private readline API for echo suppression

**File:** `sdk/src/query/secret-commands.ts:49-73`
**Issue:** The interactive branch resolves only on `'line'`, rejects only on
`'SIGINT'` or a stdin `'error'`. When the user presses Ctrl-D at the hidden
prompt, readline emits `'close'` without ever emitting `'line'` — no handler is
attached, so the promise never settles and `oto-sdk query secret-set` hangs
until killed. Separately, echo suppression overrides the undocumented internal
`rl._writeToOutput`; if a Node release changes that internal, the typed API key
would echo to the terminal with no test catching it (tests only cover the piped
branch).
**Fix:** Add `rl.once('close', () => reject(new GSDError('API key entry cancelled', ErrorClassification.Interruption)))`
(and remove it on the `'line'` path). Consider guarding the mute:
`if (typeof muted._writeToOutput === 'function') muted._writeToOutput = () => {};`
plus a comment pinning the Node-internal dependency.

### WR-05: Legacy migration performs unlocked read-modify-write on config.json that races with locked `config-set`

**File:** `oto/bin/lib/secrets.cjs:165-214`, `sdk/src/query/secrets.ts:265-322`
**Issue:** `migrateLegacyIntegrationKeys` reads, mutates, and atomically
rewrites the entire config.json without acquiring the planning lock
(`withPlanningLock` in CJS, `acquireStateLock` in SDK). It is invoked from
read paths (`loadConfig`, `cmdConfigGet`, `secretStatus`) that run concurrently
with locked writers in multi-worktree setups — the exact scenario
`withPlanningLock` exists for (#1916). A migration write landing between a
locked writer's read and write (or vice versa) silently discards the other
side's update (whole-file last-write-wins).
**Fix:** Wrap the migration's config rewrite in the same lock the writers use
(CJS: `withPlanningLock(cwd, …)`; SDK: `acquireStateLock(paths.config)`), or
have `cmdConfigSet`/`configSet` run the migration inside their existing locked
section.

## Info

### IN-01: CJS/SDK `detectKeySource` return shapes diverge despite the mirror-discipline contract

**File:** `oto/bin/lib/secrets.cjs:110-130` vs `sdk/src/query/secrets.ts:118-151`
**Issue:** CJS returns `{ source, envVar?, masked, shadowedKeyfile? }` with a
`path` field in the keyfile branch and omits fields per-branch; the SDK always
returns the full five-field `KeySource` (`envVar`, `keyfile`, `shadowedKeyfile`
on every branch). Both module headers say to keep the implementations
behavior-identical.
**Fix:** Normalize the CJS return to the SDK's uniform shape.

### IN-02: CJS `migrateLegacyIntegrationKeys` early returns omit `conflicts`

**File:** `oto/bin/lib/secrets.cjs:170-174, 206`
**Issue:** Early-return branches yield `{ migrated: [] }` while the success
branch yields `{ migrated, conflicts }`; the SDK version always returns both.
Callers destructuring `conflicts` get `undefined` on the no-op paths (the
tests even pin the inconsistent shape).
**Fix:** `return { migrated: [], conflicts: [] };` in all branches.

### IN-03: `SECRET_CONFIG_KEYS` and `INTEGRATIONS` are dual sources of truth; drift causes a null dereference

**File:** `oto/bin/lib/secrets.cjs:16-20, 132-142`
**Issue:** `validateIntegrationValue` gates on `SECRET_CONFIG_KEYS.has(configKey)`
then calls `integrationForConfigKey(configKey).slug` without a null check. The
two collections currently agree, but adding a key to one and not the other
turns the rejection path into `TypeError: Cannot read properties of null`.
**Fix:** Derive the set: `const SECRET_CONFIG_KEYS = new Set(Object.values(INTEGRATIONS).map(i => i.configKey));`
(the SDK already effectively does this via `integrationForConfigKey`).

### IN-04: `writeKeyfile` writes the new secret before tightening a pre-existing loose-mode file

**File:** `oto/bin/lib/secrets.cjs:81-87`, `sdk/src/query/secrets.ts:76-82`
**Issue:** The `mode: 0o600` option only applies at file creation. When
replacing an existing keyfile that has drifted to e.g. 0644, the new secret is
written into the world-readable file first and `chmodSync` runs afterwards — a
brief exposure window.
**Fix:** `chmodSync` (guarded by existsSync) before the write, or open with
`fs.openSync(target, 'w', 0o600)` + `ftruncate`/write on the fd.

### IN-05: Workflow detects the active workstream from `.oto/active-workstream` only, ignoring session-scoped pointers

**File:** `oto/workflows/settings-integrations.md:53-61`
**Issue:** `core.cjs getActiveWorkstream` prioritizes tmpdir session-scoped
pointers and intentionally ignores the shared `.oto/active-workstream` file
when a session key exists — meaning a session-activated workstream leaves no
shared file and this workflow silently targets the ROOT config. This mirrors
the existing convention in settings.md/settings-advanced.md, so it is an
inherited limitation rather than a phase regression, but for a workflow whose
threading contract (`WS_ARGS`) is a tested success criterion the mismatch is
worth a follow-up (e.g. an `oto-sdk query`/`oto-tools` subcommand that emits
the resolved active workstream).
**Fix:** Resolve the workstream via a tool call that shares
`getActiveWorkstream`'s logic instead of reading the shared file directly.

---

_Reviewed: 2026-07-11T02:48:23Z_
_Reviewer: Claude (oto-code-reviewer)_
_Depth: standard_
