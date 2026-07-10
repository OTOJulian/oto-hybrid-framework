# Phase 14: Key Storage Reconciliation - Context

**Gathered:** 2026-07-10
**Status:** Ready for planning

<domain>
## Phase Boundary

**This phase delivers:** Integration API keys (Exa, Brave, Firecrawl) live only in `~/.oto/<integration>_api_key` (mode 0600) or their env vars (`EXA_API_KEY`, `BRAVE_API_KEY`, `FIRECRAWL_API_KEY`); committed `.oto/config.json` holds booleans only. Boolean-only validation is enforced in BOTH write paths (SDK `sdk/src/query/config-mutation.ts` and CJS `oto/bin/lib/config.cjs`), legacy key strings self-heal migrate to the keyfile on config load, and `/oto-settings-integrations` gets a rewritten Set/Replace/Clear flow with stdin-only key entry and masked (`****<last-4>`) status display.

**Scouting findings that scope this phase:**
- `oto/bin/lib/secrets.cjs` is masking-only today (33 lines: `SECRET_CONFIG_KEYS`, `isSecretKey`, `maskSecret`) — keyfile CRUD helpers are net-new and live here.
- Detection already derives `exa_search`/`brave_search`/`firecrawl` from env-or-keyfile presence in `oto/bin/lib/config.cjs:58-92`.
- **Path divergence discovered:** `sdk/src/query/config-mutation.ts:358` checks `~/.gsd/` for keyfiles while the CJS path checks `~/.oto/` — the SDK path must be corrected as part of this phase (D-08).
- This machine currently has NO `~/.oto/` dir and no keyfiles anywhere (`~/.gsd/` holds only `defaults.json`); this repo's `.oto/config.json` currently holds clean booleans (`false` × 3). The migration path must still exist and be tested (SECR-03) — it just has no live string to heal here right now.

**Out of scope:**
- MCP registration in any runtime (Phase 15), agent guidance/frontmatter (Phase 16).
- The adapter merge/unmerge round-trip test family (lands with Phase 15 code; this phase writes the boolean-validation and no-plaintext families, confirmed under HARD-02 in Phase 15).
- Keyless/unauthenticated Exa tier, doctor live ping (v0.5.x+ deferred requirements).

</domain>

<decisions>
## Implementation Decisions

### Self-heal migration (SECR-03)
- **D-01:** Migration runs **on config load** in BOTH loaders (CJS `config.cjs` and the SDK read path). Any oto command that reads config detects a string value on the three integration keys, writes it to `~/.oto/<integration>_api_key` (0600), rewrites `config.json` with a boolean, and prints a one-line notice. Truly self-healing — no user action required. (Rejected: write-path-only and explicit-flows-only — both leave key material sitting in a git-tracked file.)
- **D-02:** Conflict policy — legacy config string AND an existing keyfile with different contents: **keyfile wins**. The config string is dropped (boolean `true` left in place) with a one-line masked notice showing both (`****abcd` vs `****wxyz`) and pointing at `/oto-settings-integrations` to re-set if wrong. Rationale: a keyfile only exists if the user deliberately created it; never destroy it.
- **D-03:** After migrating a string out of git-tracked `config.json`, print a **one-time git-history exposure warning with rotation advice** ("this key may exist in git history — consider rotating it at the provider"). No automated history scanning or rewriting.
- **D-04:** No-plaintext regression test scope: assert the three integration config keys are boolean-typed AND run a **key-shaped-string scan of tracked `.oto/` files** (provider prefixes / high-entropy tokens on known key fields). Not whole-repo (fixture false positives), not config-only (blind to key material in planning files).

### Boolean-only enforcement (SECR-02)
- **D-05:** A string value written to `exa_search`/`brave_search`/`firecrawl` through either write path is **hard-rejected with a pointer**: "booleans only — to set your API key use `/oto-settings-integrations` (or `oto-sdk query secret-set <integration>`)". Nothing is written anywhere. No auto-divert — by the time a key string reaches config-set it has already touched argv/shell history, and silent redirection is surprising behavior. (Read-time migration D-01 handles pre-existing/hand-edited strings; rejection keeps new ones from entering.)
- **D-06:** Setting a boolean `true` with no detected key: **warn but allow**. Print "no Exa API key detected (EXA_API_KEY or ~/.oto/exa_api_key) — set one via /oto-settings-integrations or this flag has no effect." Flags stay pure user intent; Phase 15 registration gates on `detectExaKey()`, and the fallback ladder (HARD-01) covers the no-tools case.

### Secret CRUD surface (SECR-01, SECR-04)
- **D-07:** SDK commands are top-level: `oto-sdk query secret-set <integration>`, `secret-clear <integration>`, `secret-status [integration]`. Keyfile helpers (create 0600, read, delete, mask) live in `oto/bin/lib/secrets.cjs`. Parallels existing `config-set`/`config-get` naming; keeps secrets visibly separate from config (different rules: stdin-only, never logged, masked output). Requires sdk/dist rebuild.
- **D-08:** Legacy `~/.gsd/` keyfile path: **fix `config-mutation.ts:358` to `~/.oto/` only** — no read-fallback, no migration of `~/.gsd/`. Verified zero keyfiles exist in either location on this machine; `~/.gsd/` belongs to the separate GSD install and must not be touched. One canonical location (clean-cutover discipline from Phase 13).
- **D-09:** Key entry mechanics: `secret-set` with no piped stdin opens a **silent interactive TTY prompt** (no echo). The `/oto-settings-integrations` workflow instructs the user to run `! oto-sdk query secret-set exa` so the key travels terminal → process directly — never through argv, shell history, the conversation transcript, or Claude's context. Piped stdin still works (required for `node:test` coverage) but is never the suggested user path.

### Status & masking UX (SECR-04)
- **D-10:** Status display per integration shows **flag + key source + masked key**: e.g. `Exa: enabled — key from env EXA_API_KEY (****4f2a)` / `Brave: enabled — key from ~/.oto/brave_api_key (****9c1e)` / `Firecrawl: disabled — no key detected`. When env and keyfile both exist, show that env wins and note the shadowed keyfile.
- **D-11:** `secret-clear` deletes the keyfile **and flips the integration flag to `false`** with a one-line notice. If an env var still provides a key, say so: "keyfile removed; EXA_API_KEY still set — integration remains available."
- **D-12:** Keyfile permission self-heal: status and load paths **chmod existing keyfiles to 0600** with a one-line notice when looser permissions are found (e.g. a manually `echo >`-created 0644 file).

### Claude's Discretion
- Exact wording of notices/warnings (D-01/D-02/D-03/D-06/D-11/D-12) — keep each to one line, masked values only.
- Where the shared validation/migration helper lives so the CJS diff stays small (sync hygiene: `config.cjs` and `secrets.cjs` are GSD-shared — prefer new logic in oto-only files, small commented diffs in shared ones).
- Key-shaped-string heuristics for D-04's scan (provider prefixes, length/entropy thresholds) and masking edge cases (keys shorter than 8 chars mask entirely — reuse/extend `maskSecret`).
- TTY prompt implementation details (readline with muted echo vs `read -s`-equivalent) and stdin-vs-TTY detection.
- Test file placement within the existing `node:test` tooling-test layout.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope & requirements
- `.oto/ROADMAP.md` §Phase 14 — goal, 4 success criteria, scope notes (all three integrations, sync hygiene, standard-pattern/skip-research flag).
- `.oto/REQUIREMENTS.md` §Key Storage (SECR) — SECR-01..04 verbatim; also the Out of Scope table (no auto-registration, no CLI shell-outs, etc.).
- `.oto/research/SUMMARY.md` — milestone research: the defect diagnosis (dual-typing across both write paths, dead-CJS-masking finding), Phase 1 deliverables list, Pitfall 1 (committed key) and Pitfall 8 (upstream sync surface). Research pinpointed all four defect sites with line numbers; see also `.oto/research/ARCHITECTURE.md` and `.oto/research/PITFALLS.md` for the file:line evidence.

### Code under change
- `oto/bin/lib/config.cjs` (lines 58-92) — env/keyfile detection for all three integrations; the CJS load path that gains migration (D-01) and the CJS write path that gains rejection (D-05). GSD-shared: keep diffs small and commented.
- `sdk/src/query/config-mutation.ts` — the live SDK write path (currently NO masking, and line 358 checks the wrong `~/.gsd/` keyfile dir — fix per D-08); gains boolean validation (D-05) and hosts/uses the SDK-side migration hook (D-01). Requires sdk/dist rebuild.
- `oto/bin/lib/secrets.cjs` — masking helpers today (`SECRET_CONFIG_KEYS`, `isSecretKey`, `maskSecret`); gains keyfile CRUD (D-07). GSD-shared: same hygiene rule.
- `oto/workflows/settings-integrations.md` — the workflow being rewritten (Set/Replace/Clear via keyfile, TTY-prompt instruction per D-09, status display per D-10, corrected `<security>` block).

### Constraints
- `docs/upstream-sync.md` — sync hygiene contract for GSD-shared files (HARD-05 verified at milestone close).
- `CLAUDE.md` §Technology Stack — `node:test` for tooling tests, no install-time build additions, personal-use cost ceiling.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `oto/bin/lib/secrets.cjs` `maskSecret`/`isSecretKey`/`SECRET_CONFIG_KEYS` — the masking convention to reuse in status displays, migration notices, and conflict warnings.
- `oto/bin/lib/config.cjs:58-92` detection block — the env-or-keyfile derivation already encodes the canonical keyfile paths (`~/.oto/<x>_api_key`) and env var names; migration and secret-status reuse these exact paths.
- `sdk/src/query/config-mutation.ts` value-coercion machinery (line ~128) — existing type handling that the boolean-only validation slots into.
- Existing `node:test` tooling-test suite — home for the boolean-validation and no-plaintext test families.

### Established Patterns
- Both-write-paths discipline: every config mutation rule must exist in the SDK TS path AND the CJS path (they are independent implementations; Phase 12/13 established the SDK as the live orchestration surface).
- Sync hygiene (standing v0.5.0 constraint): `config.cjs`, `secrets.cjs`, `settings-integrations.md` are GSD-shared — new logic goes in oto-only files where possible; shared-file diffs stay small and commented; `oto sync --dry-run` checked at milestone close.
- Self-healing precedent: oto already self-heals PATH wiring (quick task 260616-muv); read-time config healing (D-01) and permission healing (D-12) extend the same philosophy.

### Integration Points
- `oto-sdk query` registry — the three new `secret-*` commands register alongside existing `config-set`/`config-get` handlers; `/usr/local/bin/oto-sdk` symlinks to this repo's live `bin/oto-sdk.js`, so changes are live immediately after sdk/dist rebuild.
- `/oto-settings-integrations` workflow markdown is the only user-facing surface; it shells to the SDK commands and never handles raw key material itself (D-09).
- Phase 15 consumes this phase's output: `detectExaKey()`-style helpers and the keyfile location are the contract registration reads.

</code_context>

<specifics>
## Specific Ideas

- The `!`-prefix TTY flow is the centerpiece of the settings rewrite: the workflow prints the exact command (`! oto-sdk query secret-set exa`), the user runs it themselves, and the key never enters the conversation. This is deliberate — the defect being fixed leaked keys into a tracked file, and the fix must not introduce a transcript-side channel instead.
- Notices are one-liners with masked values only — the phase's tone is "quiet self-healing with honest warnings", not interactive ceremony.
- SECR-03's "including this repo's own config" is currently moot in the live tree (booleans already present) — the success criterion is satisfied by the migration mechanism + tests, plus the git-history rotation advice covering any historical exposure.

</specifics>

<deferred>
## Deferred Ideas

- Keyless/unauthenticated Exa tier registration (~150 calls/day) — EXA-F-01, v0.5.x+.
- Live doctor ping (`tools/list` against a registered server) — EXA-F-02, v0.5.x+.
- Reading or migrating `~/.gsd/` keyfiles — rejected in D-08 (no keyfiles exist there; dir belongs to the separate GSD install).
- Whole-repo key-shaped-string scanning — rejected in D-04 (fixture/docs false positives against the personal-use maintenance ceiling); revisit only if key material ever surfaces outside `.oto/`.

</deferred>

---

*Phase: 14-key-storage-reconciliation*
*Context gathered: 2026-07-10*
