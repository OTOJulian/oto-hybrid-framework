---
phase: 15-exa-mcp-registration-all-three-runtimes
verified: "2026-07-14T16:11:29Z"
verified_at: "2026-07-14T16:11:29Z"
verifier: "Codex (oto-verifier, independent fresh verification)"
status: gaps_found
score: "7/10"
head: "03355843242b8484c13dbe28c7ac31e15553f57d"
requirements:
  MCP-01: passed
  MCP-02: passed
  MCP-03: gaps_found
  MCP-04: passed
  MCP-05: gaps_found
  MCP-06: passed
  MCP-07: passed
  MCP-08: passed
  MCP-09: gaps_found
  HARD-02: passed
blockers:
  - id: CR-01
    requirements: [MCP-03, MCP-05]
    summary: "Claude and Gemini do not fail closed when the parsed root or mcpServers container is not a plain object."
  - id: WR-01
    requirements: [MCP-09]
    summary: "SDK mcp-status trusts fingerprints from install-state JSON that the CJS ownership path rejects as schema-invalid."
review_adjudication:
  CR-01: confirmed
  WR-01: confirmed
---

# Phase 15: Exa MCP Registration (All Three Runtimes) — Verification Report

**Phase goal:** With explicit user consent and a detected key, the Exa MCP server is registered as `exa` in Claude Code, Codex, and Gemini through oto's adapter machinery — idempotent, fingerprint-tracked, and cleanly removable on uninstall.

**Status:** `gaps_found`  
**Score:** **7/10 requirements passed**  
**Verified at:** HEAD `0335584`

## Verdict

The normal supported path is substantially implemented and the developer-approved live checkpoint confirms the real Claude integration: explicit consent, exactly the three pinned tools, idempotent re-install, truthful normal-state status, custom-directory install/uninstall symmetry, and no key bytes in runtime configs or tracked `.oto` files. Fresh focused automation also passes 140/140 assertions.

The phase cannot pass yet because both unresolved review findings reproduce against the current code. CR-01 permits destructive replacement, false success, or exceptions for valid JSON with incompatible root/container shapes in the Claude and Gemini adapters. WR-01 makes the SDK-backed settings surface claim `oto-managed` from schema-invalid install state while the CJS installer/doctor path correctly says `user-owned`. These defects violate the preservation/refusal and ownership-truth guarantees at the center of MCP-03, MCP-05, and MCP-09.

## Review Finding Adjudication

### CR-01 — CONFIRMED (blocking)

Current source still contains the unsafe behavior:

- `bin/lib/runtime-claude.cjs:218-238` reads `claudeState.mcpServers?.exa`, then replaces any falsey/non-object/array `mcpServers` value with `{}` and returns `registered: true`. The parsed root itself is not validated as a plain object.
- `bin/lib/runtime-gemini.cjs:55-80` likewise assumes an object root and uses `settings.mcpServers = settings.mcpServers || {}` without a plain-object guard.

Fresh temp-directory probes on HEAD produced:

| Runtime / fixture | Result | File preservation |
|---|---|---|
| Claude `{"mcpServers":["user-entry"],"keep":true}` | `registered: true` | **Array destroyed and replaced by Exa object** |
| Claude `{"mcpServers":"user-entry","keep":true}` | `registered: true` | **String destroyed and replaced** |
| Claude root `null` | Throws reading `mcpServers` | Bytes unchanged, but no safe refusal |
| Claude root `[]` | `registered: true` | Bytes serialize unchanged, creating a phantom success/fingerprint risk |
| Gemini array `mcpServers` | `registered: true` | Exa property is not serialized; user array remains but success is false |
| Gemini string `mcpServers` | Throws assigning `exa` | Bytes unchanged, but no safe refusal |
| Gemini root `null` | Throws reading `mcpServers` | Bytes unchanged, but no safe refusal |
| Gemini root `[]` | `registered: true` | Rewrites bytes to `[]\n`; Exa is absent despite reported success |

The installer trusts `registered: true` and records the returned entry, so the false-success cases can persist ownership state for a registration that is absent. Passing happy-path round-trip tests do not close this gap.

**Required closure:** Validate both the parsed root and an existing `mcpServers` container as plain objects before mutation. Incompatible shapes must return a refusal, preserve bytes exactly, and never create `state.mcp`. Add adapter and lifecycle regressions for array, string, `null`, and primitive-root inputs for both Claude and Gemini.

### WR-01 — CONFIRMED (blocking MCP-09 truthfulness)

The implementations remain divergent:

- CJS `bin/lib/mcp-register.cjs:90-112` calls `readState`, which applies the full schema in `bin/lib/install-state.cjs` before trusting `state.mcp.exa`.
- SDK `sdk/src/query/mcp-status.ts:123-149` directly parses JSON and trusts `state.mcp.exa.entry` without validating `version`, `oto_version`, `installed_at`, `runtime`, `config_dir`, `files`, `instruction_file`, or the MCP record fields.

A fresh parity probe seeded a live Claude Exa entry plus an incomplete `.install.json` containing only `mcp.exa`. On the same files:

- CJS classifier: `user-owned`
- SDK classifier: `oto-managed`

Because `/oto-settings-integrations` consumes the SDK query, it can present ownership guidance that disagrees with installer/uninstall and doctor behavior.

**Required closure:** Port or share install-state validation semantics before SDK fingerprint use. Add CJS/SDK parity fixtures for malformed JSON, incomplete state, invalid top-level schema, and invalid `mcp.exa` records across all three runtimes; pin the workflow-facing result to fail closed.

## Requirement Verdicts

| Requirement | Verdict | Evidence |
|---|---|---|
| **MCP-01** — explicit consent, default No | **PASSED** | `mcp-consent.cjs` gates all registration paths; focused consent matrix passed. The live install displayed the prompt and required `y`; repeat install honored recorded consent without another prompt. |
| **MCP-02** — transport ADR before code | **PASSED** | ADR-16 records launcher-stdio, exact `exa-mcp-server@3.2.1` pin, tool argument, key-usability rule, pre-warm, and remote HTTP alternative; ADR tests passed. |
| **MCP-03** — additive Claude user-scope merge | **GAPS FOUND** | Normal additive merge and live `~/.claude.json` registration work, but CR-01 proves incompatible valid JSON shapes can be destroyed or falsely reported as registered rather than safely refused. |
| **MCP-04** — Codex OTO marker block and duplicate refusal | **PASSED** | Fresh text/adapter tests pass byte-identical round-trip, idempotence, external table/array-table refusal, drift preservation, and exact one-block behavior. The implementation exists despite `.oto/REQUIREMENTS.md` still showing this row as Pending. |
| **MCP-05** — Gemini stdio registration | **GAPS FOUND** | Correct happy-path `{command,args}` shape avoids `url`/`httpUrl` and is independent of `enableAgents`, but CR-01 proves incompatible JSON shapes can throw or return false success. |
| **MCP-06** — exactly three pinned tools | **PASSED** | Launcher pins `tools=web_search_exa,web_fetch_exa,web_search_advanced_exa`; launcher tests passed and the approved live Claude tool list showed exactly those three. |
| **MCP-07** — idempotent and key-conditional | **PASSED** | D-15 key matrix, consent key gate, and three-runtime lifecycle tests passed; live repeat install created neither prompt nor duplicate. CR-01's malformed-shape false success is tracked under the affected adapter requirements above. |
| **MCP-08** — fingerprint-only uninstall | **PASSED** | Lifecycle tests pass matched removal, drift/user-owned preservation, state carry-forward, and launcher cleanup for all runtimes; live custom-dir round-trip removed registration and launcher cleanly. |
| **MCP-09** — per-runtime settings status | **GAPS FOUND** | Workflow and normal-state status render correctly, including the live `claude: oto-managed` result, but WR-01 proves the SDK ownership classifier is not authoritative on invalid install state. |
| **HARD-02** — required node:test families | **PASSED** | Adapter round-trip, boolean validation, and tracked-file plaintext guard families exist and passed in the fresh 140-assertion focused run. |

## Approved Live Evidence Incorporated

The developer explicitly approved all manual checks recorded in `15-10-SUMMARY.md`:

- consent prompt appeared and was answered `y`;
- `~/.claude.json` registration exposed exactly `web_search_exa`, `web_fetch_exa`, and `web_search_advanced_exa`;
- `mcp-status` reported Claude `oto-managed` and unconfigured Codex/Gemini `not-registered`;
- repeat install was idempotent with no prompt and no duplicate;
- `/tmp/ccd` register/uninstall round-trip was clean;
- settings workflow rendered per-runtime status and the global-scope warning;
- a fixed-string grep using the real key found no key bytes in any runtime config or git-tracked `.oto` file;
- `.oto/config.json` intentionally contains `"exa_search": true` and should remain in the final docs/config commit.

## Fresh Verification Evidence

| Command / probe | Result |
|---|---|
| Focused Phase 15 + HARD-02 node tests | **140 passed, 0 failed** |
| `cd sdk && npx tsc --noEmit` | **Passed** |
| SDK focused `mcp-status`, secrets, symlink, workstream run | 35 passed, 2 known-baseline workstream failures |
| CR-01 direct adapter probe | **Reproduced** for Claude and Gemini array/string/null/root-array fixtures |
| WR-01 CJS/SDK parity probe | **Reproduced**: `user-owned` vs `oto-managed` on identical invalid state |

The two `sdk/src/query/workstream.test.ts` failures are the pre-existing Phase 14 baseline pair (`workstreamCreate` and root mirror sync), explicitly recorded as `max_failed=2` in `14-SDK-BASELINE.txt`; no new SDK baseline regression is attributed to Phase 15.

## Required Gap-Closure Work

1. Fix CR-01 in Claude and Gemini with plain-object validation and byte-preserving refusal before any mutation or ownership write.
2. Add adapter plus full installer-lifecycle regressions covering incompatible root and `mcpServers` shapes and asserting no `.install.json` MCP fingerprint is recorded.
3. Fix WR-01 by enforcing CJS-equivalent install-state validity in SDK status.
4. Add cross-runtime CJS/SDK ownership parity fixtures, rebuild `sdk/dist`, rerun focused tests, then repeat independent verification.

---

_Verified: 2026-07-14T16:11:29Z_  
_Verifier: Codex (oto-verifier, independent fresh verification)_
