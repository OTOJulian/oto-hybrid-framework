---
status: issues_found
phase: 14-key-storage-reconciliation
reviewed: "2026-07-10T23:39:40Z"
depth: standard
files_reviewed: 21
files_reviewed_list:
  - oto/bin/lib/config.cjs
  - oto/bin/lib/core.cjs
  - oto/bin/lib/secrets.cjs
  - oto/workflows/settings-integrations.md
  - sdk/dist/query/secret-commands.js
  - sdk/src/cli.test.ts
  - sdk/src/cli.ts
  - sdk/src/config.ts
  - sdk/src/query/config-mutation.test.ts
  - sdk/src/query/config-mutation.ts
  - sdk/src/query/config-query.ts
  - sdk/src/query/index.ts
  - sdk/src/query/registry.test.ts
  - sdk/src/query/secret-commands.test.ts
  - sdk/src/query/secret-commands.ts
  - sdk/src/query/secrets.test.ts
  - sdk/src/query/secrets.ts
  - sdk/src/query/utils.ts
  - tests/14-config-boolean.test.cjs
  - tests/14-no-plaintext-guard.test.cjs
  - tests/14-secrets-keyfile.test.cjs
findings:
  critical: 4
  warning: 9
  info: 1
  total: 14
---

# Phase 14: Code Review Report

**Reviewed:** 2026-07-10T23:39:40Z  
**Depth:** standard  
**Files Reviewed:** 21  
**Status:** issues_found

## Summary

Phase 14 establishes the intended boolean-only and keyfile-based contract, but four paths can still disclose, retain, or destroy secret material: new-project configuration bypasses validation, failed migration can return plaintext, secret CRUD is not transactional, and workstream reads skip root migration. Nine additional warnings cover incomplete status migration, concurrent migration races, incorrect CJS masking, event/workstream routing, argv sanitization, TTY EOF behavior, keyfile durability/modes, environment-backed replacement UX, and gaps in the no-plaintext guard.

The focused Phase 14 tests pass, but the reproduced cases below are not covered by those suites.

## Critical Issues

### CR-01 (BLOCKER): New-project creation bypasses boolean-only validation

**Files:** `oto/bin/lib/config.cjs:143-168`, `oto/bin/lib/config.cjs:180-212`, `sdk/src/query/config-mutation.ts:411-443`  
**Issue:** Both new-project builders create boolean integration defaults and then allow global defaults or caller-supplied choices to overwrite them without `validateIntegrationValue`. Both implementations consequently accept an integration API key string and persist it verbatim to tracked config. This bypasses the Phase 14 write guard; the SDK CLI form also receives the value through argv.

**Impact:** A supported config creation path can reintroduce the exact plaintext-at-rest defect Phase 14 is intended to remove.

**Fix:** Validate the fully merged config before any write. Reject non-boolean integration values supplied by callers without echoing them, migrate legacy strings from trusted global defaults into keyfiles, and persist only booleans. Add CJS and SDK regression tests for choices and global-default inputs.

### CR-02 (BLOCKER): SDK config-get returns plaintext when best-effort migration fails

**File:** `sdk/src/query/config-query.ts:94-125`  
**Issue:** `configGet` suppresses every migration exception and then reads and returns the original config value. If keyfile creation or config rewrite fails, a legacy integration string is serialized by the handler and printed by the CLI. This was reproduced by making the keyfile base unusable: migration was swallowed, config remained string-typed, and `result.data` was the full original value.

**Impact:** A filesystem error converts a self-heal failure into direct secret disclosure on stdout, logs, or an agent transcript.

**Fix:** Fail closed for sensitive keys. If migration fails, throw a sanitized error and never read the legacy value into handler output. Add a post-read type gate so an integration string cannot leave this function even if migration is skipped or partially fails.

### CR-03 (BLOCKER): Secret set/clear can lose a key or leave split state on config failure

**File:** `sdk/src/query/secret-commands.ts:120-123`, `sdk/src/query/secret-commands.ts:149-152`  
**Issue:** `secretSet` writes or overwrites the keyfile before enabling config, and `secretClear` deletes the keyfile before disabling config. Neither path restores the prior keyfile if `configSet` fails. A forced config write failure left a failed set behind and irreversibly removed an existing key during clear.

**Impact:** A command that reports failure can destroy the user's working credential or leave keyfile and flag state inconsistent.

**Fix:** Treat the keyfile and flag update as one compensating transaction. Snapshot prior keyfile state, validate the config destination, perform both operations, and restore the original keyfile/config state on failure. Add fault-injection tests for create, replace, and clear.

### CR-04 (BLOCKER): Workstream config loads do not migrate inherited root secrets

**Files:** `oto/bin/lib/core.cjs:327-341`, `oto/bin/lib/core.cjs:405-480`, `sdk/src/config.ts:157-174`  
**Issue:** The CJS loader parses the root config before migrating only the active workstream config. The SDK loader likewise migrates the requested workstream path before deciding to fall back to the root path. In both reproduced cases, a legacy root integration string remained on disk, no keyfile was created, and the effective loader returned a string where its public contract says boolean.

**Impact:** Enabling a workstream silently defeats read-time reconciliation and leaves plaintext in the tracked root config.

**Fix:** Resolve every config layer first, migrate each actual file before parsing it, then reread and merge/fallback. Add root-plus-workstream tests for an existing workstream config and a missing workstream config.

## Warnings

### WR-01: secret-status bypasses migration and masks config read errors as disabled state

**File:** `sdk/src/query/secret-commands.ts:183-203`  
**Issue:** `secretStatus` reads JSON directly, never calls migration, and converts missing, malformed, or unreadable config into an empty object. A legacy integration string therefore remains tracked while status reports the integration as disabled; malformed config is indistinguishable from a legitimate false flag.

**Impact:** The user-facing settings workflow can present a false clean status without reconciling the secret or surfacing a broken config.

**Fix:** Use a shared secret-aware config loader, migrate the effective path before status calculation, and surface sanitized parse/read failures. Cover legacy, malformed, and workstream-root cases.

### WR-02: Legacy migration is an unlocked read-modify-write with colliding temp names

**Files:** `oto/bin/lib/secrets.cjs:152-207`, `sdk/src/query/secrets.ts:181-247`  
**Issue:** Migration reads and rewrites config outside the lock used by config mutation. Its temp name is only target plus process ID, so concurrent SDK migrations in one process also collide. Concurrent migration and `configSet` were reproduced with both promises succeeding while one update was lost or the legacy string remained.

**Impact:** Concurrent OTO activity can overwrite unrelated settings, falsely report successful migration, or leave plaintext in config.

**Fix:** Acquire the same config lock around the complete migration read-modify-write, use a unique per-operation same-directory temp file, preserve the target mode, and remove the unsafe direct-write fallback. Add deterministic concurrency tests.

### WR-03: CJS config set/get masks booleans as indistinguishable secret values

**File:** `oto/bin/lib/config.cjs:371-384`, `oto/bin/lib/config.cjs:430-435`  
**Issue:** The integration fields are now booleans, but both CJS command paths still apply `maskSecret`. `config-get` prints the same `****` value for true and false, while the SDK returns the actual boolean.

**Impact:** CJS callers cannot use config-get as a feature gate, and the two supported config surfaces disagree on their output contract.

**Fix:** Emit boolean values normally. Mask only an unexpected legacy string or legacy `previousValue`, and refuse plaintext if migration failed. Add true/false raw-output tests.

### WR-04: Event-enabled secret commands silently ignore the requested workstream

**File:** `sdk/src/query/index.ts:129-143`, `sdk/src/query/index.ts:571-578`  
**Issue:** Phase 14 adds all three secret commands to `QUERY_MUTATION_COMMANDS`. The event wrapper accepts only `(args, projectDir)` and invokes the original handler without `workstream`. With an event stream attached, a dispatch targeting a workstream mutated/read the root config instead; `secret-status` is also incorrectly classified as a durable mutation.

**Impact:** Programmatic SDK use can modify the wrong configuration while reporting success and can emit mutation events for a read-only status command.

**Fix:** Preserve the complete `QueryHandler` signature and forward `workstream`. Remove `secret-status` from the mutation set, and add event-enabled workstream tests for set, clear, and status.

### WR-05: Secret argv rejection is incomplete and can copy a key into errors/events

**Files:** `sdk/src/query/secret-commands.ts:93-115`, `sdk/src/query/secret-commands.ts:136-169`, `sdk/src/query/secret-commands.ts:197-203`, `sdk/src/query/index.ts:256-263`  
**Issue:** An invalid first argument is interpolated verbatim into the unknown-integration error before the set command's extra-argv gate runs. Clear and status accept surplus arguments, and successful mutation event construction retains the first two arguments. Reproductions showed a key-like first argument copied into stderr and a surplus argument copied into an emitted event.

**Impact:** A user mistake can extend an argv exposure into logs, transports, or agent-visible output.

**Fix:** Enforce exact arity before slug resolution, never echo an invalid secret-command token, reject surplus args for clear/status, and emit only allowlisted metadata rather than raw argv.

### WR-06: Ctrl-D at the hidden TTY prompt exits successfully without setting a key

**File:** `sdk/src/query/secret-commands.ts:47-71`  
**Issue:** Interactive input handles `line`, `SIGINT`, and stream errors but not readline `close`. Pressing Ctrl-D closes the interface without settling the promise. Through the real CLI this reproduced as an immediate exit code 0 with no key written and no error.

**Impact:** Cancellation can be mistaken for a successful secret update, and embedding callers may retain an unresolved promise.

**Fix:** Add a settled guard and a `close` handler that rejects with a sanitized interruption/validation error when no line was received. Remove listeners on every completion path and add a pseudo-TTY EOF regression test.

### WR-07: Keyfile replacement is neither atomic nor fully mode-safe

**Files:** `oto/bin/lib/secrets.cjs:81-100`, `sdk/src/query/secrets.ts:76-100`  
**Issue:** Both writers truncate the final pathname directly and chmod only after content is written. Existing permissive files expose the new bytes during that window, interruption can leave partial content, and an existing base directory is not repaired to 0700. The read-time check only tests group/other bits, so a 0700 keyfile is reported secure and remains executable instead of being normalized to 0600.

**Impact:** Key replacement can leave a partial or briefly exposed credential, and the stated mode invariants are not reliably enforced.

**Fix:** Secure the base directory, reject symlink/non-regular destinations, write to an exclusively created same-directory 0600 temp file, flush and atomically rename it, then verify exact mode 0600. Add interruption, chmod-failure, existing-directory, and 0700-file tests.

### WR-08: Replace does not replace the effective key when the source is an environment variable

**Files:** `oto/workflows/settings-integrations.md:91-105`, `oto/workflows/settings-integrations.md:136-159`, `sdk/src/query/secrets.ts:118-140`  
**Issue:** The workflow offers Replace whenever any source exists. For an environment-sourced key, `secret-set` only writes a keyfile, but environment precedence remains in force; the credential OTO actually uses is unchanged and the new file is merely shadowed.

**Impact:** The workflow can confirm a replacement that did not replace the effective credential.

**Fix:** Make choices source-aware. For environment sources, instruct the user to update or unset the environment variable, or explicitly label keyfile replacement as staged and shadowed until that happens. Verify the effective source after completion.

### WR-09: The no-plaintext guard misses common tracked-file representations

**File:** `tests/14-no-plaintext-guard.test.cjs:18-22`  
**Issue:** The integration-field detector accepts only double-quoted JSON syntax, the known-key detector requires a quoted value, and provider detection covers only two narrow token shapes. YAML/Markdown fields and unquoted environment assignments with long key values pass all three detectors.

**Impact:** A plaintext key can enter a tracked `.oto` artifact while the permanent guard remains green.

**Fix:** Parse JSON structurally, add YAML and unquoted-assignment detectors, cover the supported providers' actual token variants, and add positive/negative fixtures for every representation. Keep failure output masked.

## Info

### IN-01: Empty key sources are treated as present

**Files:** `sdk/src/query/secrets.ts:89-150`, `sdk/src/query/config-mutation.ts:364-367`  
**Issue:** An empty keyfile is returned as a keyfile source with an unset mask, while new-project detection enables flags for any existing keyfile path and for whitespace-only environment values. This suppresses the no-key warning and creates enabled-but-unusable integrations.

**Fix:** Treat trimmed-empty keyfiles and environment values as absent, and reuse `detectKeySource` as the canonical availability check.

## Verification

- `node --test tests/14-secrets-keyfile.test.cjs tests/14-config-boolean.test.cjs tests/14-no-plaintext-guard.test.cjs` — 22/22 passed.
- Focused SDK suites for secrets, secret commands, config mutation, and CLI — 119/119 passed.
- Secret registry contract — 1/1 passed.
- `node --check` passed for all three reviewed CJS implementation files.
- A broader scoped SDK run also hit the pre-existing `registry.test.ts:80` two-argument spy assertion; both the dispatch behavior and assertion are unchanged at the configured diff base, so it is not reported as a Phase 14 finding.

---

_Reviewed: 2026-07-10T23:39:40Z_  
_Reviewer: Codex (oto-code-reviewer)_  
_Depth: standard_
