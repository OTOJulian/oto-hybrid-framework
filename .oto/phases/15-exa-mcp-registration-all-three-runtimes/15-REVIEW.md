---
status: issues_found
phase: "15-exa-mcp-registration-all-three-runtimes"
reviewed: "2026-07-14T19:37:34Z"
depth: standard
files_reviewed: 40
findings:
  critical: 2
  warning: 2
  info: 0
  total: 4
---

# Phase 15 Code Review

## Scope and verification

Reviewed the 40 explicitly scoped Phase 15 source, generated SDK, workflow, ADR, and test files. The earlier incompatible-JSON-shape and SDK install-state ownership findings are fixed in the current tree.

Fresh verification:

- `node --test` across the 12 scoped CJS test files: **159 passed, 0 failed**.
- `npm test -- --run src/query/mcp-status.test.ts src/query/secrets-symlink.test.ts src/query/secrets.test.ts src/query/workstream.test.ts`: **52 passed, 2 failed**.
- `sdk/node_modules/.bin/tsc --noEmit`: **passed**.
- Focused valid-TOML and JSONC reproductions confirmed CR-01 and CR-02 below.

## Critical

### CR-01 — Codex registration misses valid quoted and dotted Exa definitions, then writes a duplicate TOML table

**Files:** `bin/lib/codex-toml.cjs:8-14,49-53,79-88`, `bin/lib/mcp-register.cjs:75-79`, `sdk/src/query/mcp-status.ts:89-96,110-112`, `tests/15-codex-mcp-block.test.cjs:69-74`

The Codex collision guard only recognizes unquoted bracket headers matching `[A-Za-z0-9_.-]+` and exactly named `mcp_servers.exa`. Valid TOML spellings of the same logical key are missed, including:

```toml
[mcp_servers."exa"]
command = "mine"
```

```toml
mcp_servers.exa = { command = "mine" }
```

For both forms, `hasExternalMcpServer()` returns false and `mergeMcpBlock()` appends `[mcp_servers.exa]`. Python's standard `tomllib` confirms the result is invalid TOML (`Cannot declare ('mcp_servers', 'exa') twice`). The adapter then reports `registered: true` and the lifecycle can record an oto ownership fingerprint for a configuration Codex cannot load. The CJS and SDK status classifiers share the same blind spot, so `/oto-settings-integrations` can label the runtime `not-registered` and actively offer the destructive registration path.

**Required fix:** Detect the logical TOML key rather than one textual spelling. Prefer a real TOML parser or a conservative scanner that understands quoted key segments and dotted assignments, and refuse without changing bytes whenever ownership cannot be established. Add adapter, lifecycle, CJS status, and SDK status regressions for quoted table segments, quoted parent segments, and dotted/inline definitions.

### CR-02 — Gemini's regex JSONC fallback silently deletes block-comment tokens inside user strings

**Files:** `bin/lib/runtime-gemini.cjs:16-29,60-92,189-203`, `bin/lib/mcp-register.cjs:55-63`, `sdk/src/query/mcp-status.ts:55-63`, `tests/15-gemini-mcp-merge.test.cjs`

`parseSettings()` removes `/\* ... \*/` with a regex that is unaware of JSON string boundaries. When a Gemini file needs JSONC fallback because it contains a real comment, any literal block-comment-shaped text in a string is removed too. A focused reproduction using:

```jsonc
{
  /* user comment */
  "note": "literal /* keep this */ text"
}
```

registered successfully but rewrote the value as `"literal  text"`. The same parser is used by both settings-hook mutation and MCP merge/unmerge, so install, registration, or unregistration can silently corrupt unrelated user settings. The status mirrors use the same unsafe stripping logic and can also interpret a different object than the file actually represents.

**Required fix:** Replace regex stripping with a JSONC parser or a string-aware tokenizer. If parsing cannot preserve semantic values, fail closed before any write. Add round-trip regressions with real comments plus `/*...*/` literals in unrelated fields, MCP entries, URLs/arguments, and escaped strings.

## Warning

### WR-01 — Gemini incompatible roots can leave an untracked partial installation

**Files:** `bin/lib/runtime-gemini.cjs:189-212`, `tests/15-mcp-state.test.cjs:206-209,269-280`

The new lifecycle tests explicitly pin `null` and primitive JSON roots as a known throw in `mergeSettings()`. That throw occurs after the shared installer has already copied the payload and injected the instruction marker, but before `.install.json` is written. The original `settings.json` bytes survive, yet the runtime can be left with hundreds of oto files and a marker that `oto uninstall` cannot discover or remove because there is no state file.

**Required fix:** Validate the Gemini settings root and owned containers before any install mutation, or add rollback for pre-commit failures. The lifecycle test should assert that no copied files or instruction marker remain after refusal, not only that settings bytes and state are unchanged.

### WR-02 — The scoped SDK workstream suite is red because fixtures no longer create a recognized planning root

**Files:** `sdk/src/query/workstream.test.ts:34-51,54-124`, `sdk/src/query/workstream.ts:221-249,310-332`

The focused SDK run fails two tests:

- `workstreamCreate > creates workstream directory tree`
- `workstreamSet root STATE.md mirror sync (#2618 gap 2)`

Both fixtures create an unmarked `.planning/` tree (the mirror fixture still writes `gsd_state_version`), while the current planning-root contract recognizes `.planning/` only when `STATE.md` carries `oto_state_version`. Production code correctly resolves these fixtures to `.oto`, so creation returns `created: false` and switching returns `not_found`. Phase 15 modified this test file for session-scoped pointer parity without bringing the existing fixtures forward, leaving the explicitly scoped test gate failing and masking future workstream regressions.

**Required fix:** Convert these fixtures to `.oto/` or add the migrated `.planning/STATE.md` marker required by the current resolver, then keep both flat `.oto` and migrated `.planning` coverage. Require the four-file scoped SDK command above to pass.

## Reviewed concerns with no finding

- Claude and Gemini now refuse array, string, null, and primitive MCP configuration shapes at the adapter boundary without recording ownership.
- SDK MCP fingerprint validation now matches the CJS install-state schema closely enough for the tested invalid-state matrix.
- Launcher command arguments contain only the pinned package/tool surface; resolved key bytes are passed through the child environment, not argv or runtime configuration.
- Regular keyfiles, password-manager symlinks to regular files, dangling links, directories, and FIFOs follow the documented D-15 behavior in both CJS and SDK implementations.
- Generated `sdk/dist/query` files expose the new MCP status handler and track the reviewed TypeScript implementation; TypeScript compilation succeeds.

## REVIEW COMPLETE
