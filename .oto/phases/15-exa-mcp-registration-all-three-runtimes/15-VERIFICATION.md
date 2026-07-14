---
phase: 15-exa-mcp-registration-all-three-runtimes
verified: "2026-07-14T20:43:06.279Z"
verified_at: "2026-07-14T20:43:06.279Z"
verifier: "Codex (authorized local Phase 15 verifier retry)"
status: gaps_found
score: "5/10"
blocker_count: 3
head: "e4c661bd94bc2407ed5c4f892ed7f807e26962a4"
requirements:
  MCP-01: passed
  MCP-02: passed
  MCP-03: passed
  MCP-04: gaps_found
  MCP-05: gaps_found
  MCP-06: passed
  MCP-07: gaps_found
  MCP-08: gaps_found
  MCP-09: gaps_found
  HARD-02: passed
blockers:
  - id: CR-01
    requirements: [MCP-04, MCP-07, MCP-09]
    summary: "Codex collision and status scanners miss valid quoted and dotted Exa definitions, allowing a duplicate logical table and false not-registered status."
  - id: CR-02
    requirements: [MCP-05, MCP-08]
    summary: "Gemini's regex JSONC fallback deletes block-comment-shaped text inside strings during registration and unregistration."
  - id: WR-01
    requirements: [MCP-08]
    summary: "A Gemini pre-commit settings failure leaves copied payload and an instruction marker without install state, so normal uninstall cannot discover the partial install."
review_adjudication:
  CR-01: confirmed_blocking
  CR-02: confirmed_blocking
  WR-01: confirmed_blocking
  WR-02: confirmed_non_blocking
progress_log_lines: 10
---

# Phase 15: Exa MCP Registration Across All Three Runtimes — Verification Report

## Verdict

**Status:** `gaps_found`
**Score:** **5/10 requirements passed**
**Blocking gaps:** **3**

Phase 15 does not yet achieve its safety goal. Consent, the transport decision, Claude registration, the exact three-tool launcher, and the required HARD-02 test families are verified. The authorized local retry independently reproduced two configuration-corruption Criticals and one ownership-safe-uninstall blocker:

1. Codex can append an OTO `[mcp_servers.exa]` block beside a logically identical user-owned Exa definition written with valid quoted or dotted TOML syntax.
2. Gemini registration and unregistration can delete literal `/* ... */` text from unrelated JSON strings.
3. A Gemini settings-root failure can leave copied oto files and an instruction marker without `.install.json`, preventing normal state-driven cleanup.

The settings status surface is also not truthful for the missed Codex spellings: both CJS and the shipped SDK reported `not-registered` for a live quoted Exa table.

## Requirement-by-Requirement Verification

| Requirement | Verdict | Plan must-haves and fresh evidence |
|---|---|---|
| **MCP-01** — explicit consent; default No | **PASSED** | Plans 15-08/10. All 17 consent/parser/non-TTY tests passed. An isolated keyless non-TTY install completed without prompting or registering; the decision function is called once before the runtime loop. |
| **MCP-02** — transport/auth ADR precedes implementation | **PASSED** | Plan 15-01. ADR-16 and repository ADR structure tests passed 7/7. Git ancestry proves ADR commit `6d138a6` precedes the Claude, Codex, and Gemini adapter implementation commits. |
| **MCP-03** — additive Claude user-scope registration | **PASSED** | Plans 15-05/11. Claude targets the environment-resolved `.claude.json`, uses strict JSON, performs additive merge, refuses incompatible shapes byte-identically, and has no `claude mcp add` shell-out. Claude plus lifecycle tests passed within a 51/51 run. |
| **MCP-04** — Codex marker block and external-duplicate refusal | **GAPS FOUND** | Plan 15-04. Ordinary block tests pass 10/10, but fresh probes showed `hasExternalMcpServer=false`, `refused=null`, and a new OTO block for `[mcp_servers."exa"]`, `["mcp_servers".exa]`, and `mcp_servers.exa = {...}`. Python `tomllib` rejected the merged result: `Cannot declare ('mcp_servers', 'exa') twice`. |
| **MCP-05** — Gemini registration with safe stdio shape | **GAPS FOUND** | Plans 15-06/11. The entry shape is correctly `{command,args}` with no URL keys and the focused adapter suite passed 25/25. However, registration of valid JSONC containing a real comment and `"literal /* keep this */ text"` returned `registered:true` while rewriting the value to `"literal  text"`. |
| **MCP-06** — exact three-tool surface | **PASSED** | Plan 15-03. Launcher tests passed 8/8. Fresh command inspection produced exactly `web_search_exa`, `web_fetch_exa`, and `web_search_advanced_exa` under `exa-mcp-server@3.2.1`; no deprecated or sales tools appeared. The previously approved live checkpoint remains supporting evidence. |
| **MCP-07** — idempotent and key-conditional | **GAPS FOUND** | Plans 15-02/07/08. Key-usability, consent, and normal lifecycle coverage passed 53/53, including keyless skip and ordinary re-install idempotence. CR-01 still permits a second logical Codex Exa definition beside valid quoted/dotted user syntax, violating the never-duplicate contract. |
| **MCP-08** — fingerprint-only, ownership-safe uninstall | **GAPS FOUND** | Plan 15-07. Ordinary matched-removal, drift, user-owned, carry-forward, and launcher cleanup tests passed 27/27. A fresh Gemini unmerge probe removed the fingerprinted Exa entry but also changed an unrelated string from `literal /* keep this */ text` to `literal  text`. A separate failure probe left payload and `GEMINI.md` present with no install state. |
| **MCP-09** — truthful per-runtime settings status | **GAPS FOUND** | Plans 15-09/10/12. CJS status tests passed 29/29 and the prior invalid-state CJS/SDK parity gap is closed. But on the same valid quoted Codex table, both current CJS and shipped SDK classifiers returned `not-registered` rather than `user-owned`, so the workflow can offer an unsafe Register action. |
| **HARD-02** — required node:test coverage | **PASSED** | Plans 15-04/05/06/07. The adapter round-trip, boolean validation, and tracked-file no-plaintext guard families exist and passed 74/74 in one fresh run. This literal coverage requirement passes even though the new Critical fixtures are not yet represented. |

## Fresh Review-Finding Adjudication

### CR-01 — confirmed, blocking

The current parser accepts only unquoted bracket headers matching `[A-Za-z0-9_.-]+` and checks the textual name `mcp_servers.exa`. Fresh probes independently reproduced the blind spots for:

- `[mcp_servers."exa"]`
- `["mcp_servers".exa]`
- `mcp_servers.exa = { command = "mine" }`

All three were treated as absent, and merge appended the OTO block. The quoted-table merged result was independently parsed with Python's standard `tomllib` and rejected as a duplicate declaration. The CJS and shipped SDK classifiers also both returned `not-registered` for the quoted-table fixture. This blocks MCP-04, MCP-07, and MCP-09.

### CR-02 — confirmed, blocking

The shared Gemini fallback strips block comments with `/\/\*[\s\S]*?\*\//g`, without tracking JSON string boundaries. Two fresh effectful probes against temporary settings files confirmed:

- `mergeMcp` returned `registered:true` but changed an unrelated JSON string from `literal /* keep this */ text` to `literal  text`.
- `unmergeMcp` returned `removed:true`, removed Exa, and made the same unrelated-string corruption.

This violates registration preservation and uninstall-only mutation guarantees, blocking MCP-05 and MCP-08. The status mirrors use equivalent stripping and therefore also parse a semantic object different from the user's file.

### WR-01 — confirmed, blocking for the phase goal

A temporary Gemini install seeded with a `null` settings root threw before the state commit. Fresh post-failure inspection found:

- `.install.json`: absent
- `GEMINI.md`: present
- `<configDir>/oto`: present with copied payload
- original `settings.json`: still byte-identical `null`

Because normal uninstall is state-driven, this is an undiscoverable partial install. Although the code review rated it Warning, it blocks this phase's explicit ownership-safe uninstall and coherence goal.

### WR-02 — confirmed, non-blocking product warning

The two scoped workstream fixtures still create an unmarked `.planning/` root and use `gsd_state_version`. Direct calls to the shipped workstream handler reproduced `created:false` (`.oto/ directory not found`) and `not_found` for the switch fixture. The production resolver's behavior is coherent with the current OTO root contract; the test fixtures are stale and leave the scoped SDK gate red.

The local Vitest command could not start because this checkout's SDK dependencies lack `@rollup/rollup-darwin-x64`; this is separate from the fixture defect. TypeScript compilation passed. The fixture mismatch itself was independently reproduced through shipped compiled code.

## Test and Probe Evidence

| Evidence | Fresh result |
|---|---|
| Consent/parser/non-TTY suite | 17 passed, 0 failed |
| ADR-16 plus ADR structure | 7 passed, 0 failed |
| Claude adapter plus lifecycle run | 51 passed, 0 failed |
| Codex focused block/adapter suite | 10 passed, 0 failed |
| Gemini focused adapter suite | 25 passed, 0 failed |
| Key usability + consent + lifecycle | 53 passed, 0 failed |
| Lifecycle uninstall/state suite | 27 passed, 0 failed |
| CJS status suite | 29 passed, 0 failed |
| HARD-02 aggregate families | 74 passed, 0 failed |
| `sdk/node_modules/.bin/tsc -p sdk/tsconfig.json --noEmit` | passed |
| `git diff --check` before report write | passed |
| Focused SDK Vitest | did not start: missing local optional Rollup package |
| Orchestrator network-enabled root gate | 892 passed, 0 failed, 3 skipped — supporting evidence only |

All effectful verification used temporary directories. No real runtime configuration was mutated. The unrelated untracked `INTERVIEW-BRIEF-oto.md` was not touched.

## Required Gap Closure

1. Replace the Codex textual collision scan with logical TOML-key detection that handles quoted segments, quoted parents, dotted assignments, and inline tables; fail closed on ambiguity. Add adapter, lifecycle, CJS status, and SDK status regressions for each syntax.
2. Replace Gemini regex comment stripping with a string-aware JSONC parser/tokenizer or fail closed before writes. Add semantic-preservation regressions for unrelated strings, MCP entries, URLs/args, escaped strings, registration, unregistration, and status.
3. Preflight Gemini settings before any payload/marker mutation, or implement rollback on pre-commit failure. Assert failed installs leave no copied files, instruction marker, or state.
4. Update the scoped SDK workstream fixtures to use `.oto/` or a correctly marked migrated `.planning/` root, preserve both root variants as coverage, and restore the missing local Rollup optional dependency before rerunning the four-file SDK gate.

## Bounded-Convergence History and Routing

- Prior independent verification at `0335584` scored 7/10 and found incompatible JSON shape handling plus SDK install-state ownership divergence.
- Gap Plans 15-11 and 15-12 closed those two earlier findings with adapter guards and CJS/SDK schema parity.
- The fresh review at `2026-07-14T19:37:34Z` confirmed those closures but found the current two Criticals and two Warnings.
- This one authorized local verifier retry at `e4c661b` independently reproduced all four current findings and scored 5/10.

The verifier retry is exhausted. Do not mark Phase 15 complete and do not start another blind verification loop. Route to targeted gap planning/implementation for CR-01, CR-02, and WR-01; include WR-02 fixture repair in that closure scope or a separately authorized bounded task. Schema drift is false. The codebase-drift check remains skipped only because of the separately tracked stale `get-shit-done/bin/gsd-tools.cjs` path; that post-phase tooling defect was not modified here.

---

_Verified: 2026-07-14T20:43:06.279Z_
_Verifier: Codex (authorized local Phase 15 verifier retry)_
