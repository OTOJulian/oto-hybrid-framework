---
status: issues_found
phase: "15-exa-mcp-registration-all-three-runtimes"
reviewed: "2026-07-14T16:07:09Z"
depth: standard
diff_base: "3c55e5f460a52de4a6a23309a48ee07df228ea27"
files_reviewed: 39
files_reviewed_list:
  - bin/install.js
  - bin/lib/args.cjs
  - bin/lib/codex-toml.cjs
  - bin/lib/doctor.cjs
  - bin/lib/install-state.cjs
  - bin/lib/install.cjs
  - bin/lib/mcp-consent.cjs
  - bin/lib/mcp-register.cjs
  - bin/lib/runtime-claude.cjs
  - bin/lib/runtime-codex.cjs
  - bin/lib/runtime-gemini.cjs
  - decisions/ADR-16-exa-mcp-transport.md
  - oto/bin/lib/config.cjs
  - oto/bin/lib/secrets.cjs
  - oto/hooks/oto-exa-mcp.js
  - oto/workflows/settings-integrations.md
  - sdk/src/query/config-mutation.ts
  - sdk/src/query/index.ts
  - sdk/src/query/init-complex.ts
  - sdk/src/query/mcp-status.test.ts
  - sdk/src/query/mcp-status.ts
  - sdk/src/query/secrets-symlink.test.ts
  - sdk/src/query/secrets.test.ts
  - sdk/src/query/secrets.ts
  - sdk/src/query/workstream.test.ts
  - sdk/src/query/workstream.ts
  - tests/05-build-hooks.test.cjs
  - tests/14-keyfile-symlink.test.cjs
  - tests/14-settings-workflow-contract.test.cjs
  - tests/15-adr.test.cjs
  - tests/15-claude-mcp-merge.test.cjs
  - tests/15-codex-mcp-block.test.cjs
  - tests/15-consent.test.cjs
  - tests/15-gemini-mcp-merge.test.cjs
  - tests/15-key-usability.test.cjs
  - tests/15-launcher.test.cjs
  - tests/15-mcp-state.test.cjs
  - tests/15-mcp-status.test.cjs
  - tests/260616-muv-doctor.test.cjs
findings:
  critical: 1
  warning: 1
  info: 0
  total: 2
---

# Phase 15 Code Review

## Scope and verification

Reviewed every human-authored source and test file changed from `6d138a6^` through `HEAD`, plus all ten Phase 15 plans and summaries, `.oto/PROJECT.md`, `.oto/REQUIREMENTS.md`, and `AGENTS.md`. Generated `sdk/dist/**` artifacts were excluded from source review.

Fresh focused verification passed: `node --test tests/15-claude-mcp-merge.test.cjs tests/15-gemini-mcp-merge.test.cjs tests/15-mcp-status.test.cjs` reported 48 passed, 0 failed. The findings below exercise valid-but-unexpected JSON shapes and invalid install-state structure that the current suites do not cover.

## Critical

### CR-01 — Claude and Gemini MCP registration do not fail closed on non-object configuration shapes

**Files:** `bin/lib/runtime-claude.cjs:203-238`, `bin/lib/runtime-gemini.cjs:55-80`

Both adapters accept any syntactically valid JSON root and assume `mcpServers` is a plain object. That violates the phase's preservation and refusal guarantees for malformed or incompatible user configuration:

- Claude silently replaces an existing array or other non-object `mcpServers` value with `{}` at lines 233-235, destroying user content before writing the Exa entry.
- Gemini uses `settings.mcpServers = settings.mcpServers || {}` and then assigns `.exa` at lines 73-77. With an array, the property is not serialized, yet the adapter returns `registered: true`; with a truthy primitive or a non-object root, registration can throw instead of refusing safely.
- Because the caller trusts `registered: true`, the Gemini array case can persist an oto ownership fingerprint for a registration that is not present in the live runtime configuration.

Focused reproduction with `{"mcpServers":["user-entry"],"keep":true}` confirmed that Claude deletes the array content and Gemini returns success without serializing `mcpServers.exa`.

**Required fix:** Validate the parsed root and `mcpServers` container as plain objects (or absent according to an explicit policy) before mutation. Refuse incompatible shapes without changing file bytes or recording ownership. Add Claude and Gemini adapter/lifecycle regressions for array, string, null, and primitive-root inputs.

## Warning

### WR-01 — SDK MCP status trusts fingerprints that the CJS ownership path rejects

**Files:** `sdk/src/query/mcp-status.ts:123-151`, `bin/lib/mcp-register.cjs:90-119`, `sdk/src/query/mcp-status.test.ts:35-41`

The CJS status path reads `.install.json` through `readState`, so the install-state schema must validate before an MCP fingerprint can establish oto ownership. The SDK mirror directly parses JSON and trusts any nested `mcp.exa.entry`, even when the rest of the install state is missing or invalid. Its test fixture writes exactly such an incomplete state object.

Consequently, the SDK-backed `/oto-settings-integrations` workflow can label a live entry `oto-managed` while the installer/doctor path labels the same entry `user-owned`. This is misleading ownership guidance and breaks the intended SDK/CJS parity, though uninstall still fails closed because the mutation path uses validated state.

**Required fix:** Make the SDK status reader enforce the same install-state validity conditions as CJS before trusting a fingerprint. Add parity fixtures covering incomplete, malformed, and schema-invalid state for all three runtimes, and assert the settings workflow renders the fail-closed status.

## Reviewed concerns with no finding

- The split-literal construction of the consent refusal reason produces the intended runtime value and is covered by the consent contract tests.
- The Plan 15-10 workstream deviation preserves session-aware pointer behavior and has isolation coverage.
- Launcher and registration data contain paths and fingerprints only; API key material is passed through the child environment rather than argv or runtime configuration.
- Codex managed-block ownership, repeat-install idempotency, drift handling, and uninstall preservation are implemented consistently with the phase contract.

## REVIEW COMPLETE
