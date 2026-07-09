# Quick Task 260709-j0v: Remove vendored foundation-frameworks/ snapshots - Context

**Gathered:** 2026-07-09
**Status:** Ready for planning

<domain>
## Task Boundary

Remove the vendored `foundation-frameworks/` upstream snapshots (get-shit-done-main, superpowers-main — 13MB, 1,129 tracked files): rework the 18 dependent test files, delete the folder, update deny-list references in `rename-map.json` and `bin/lib/copy-files.cjs`, convert code-comment citations from local foundation-frameworks paths to upstream repo@tag references, and keep `npm test` plus license attribution green.

Out of scope: `THIRD-PARTY-LICENSES.md` (already independent of the folder, must remain untouched), the live sync pipeline behavior (`scripts/sync-upstream/`, `.oto-sync/` flow — already independent of the folder).

</domain>

<decisions>
## Implementation Decisions

### Full-corpus test fate (phase-09 sync/roundtrip tests)
- **Opt-in pinned clone.** Tests that need a real upstream tree clone a pinned upstream ref into `.oto-sync/` when an opt-in env var (e.g. `OTO_SYNC_CORPUS=1`) is set; they skip cleanly (node:test skip, not failure) when the var is unset or the network is unavailable. Full coverage preserved on demand, zero vendored bytes.

### Fixture corpus size
- **Curated edge cases.** A committed mini-fixture tree (~a few dozen files, target ~100–200KB) deliberately covering the tricky rename cases: commands, agents, skills, hooks, deny-listed paths, token-collision cases, and any file shapes the rebrand-engine tests assert on. Strong unit coverage, small footprint.

### Historical records (decisions/file-inventory.json, ADR-14)
- **Annotate as historical.** Add a short note that `foundation-frameworks/` was removed on 2026-07-09 and the inventory reflects the original vendored snapshot (retrievable via git history). Content otherwise untouched — do not rewrite decision history.

### Claude's Discretion
- Exact env-var name for the opt-in corpus clone.
- Which pinned upstream refs to use (should match the refs the vendored snapshots were taken from, if determinable; otherwise current upstream default-branch tags).
- Fixture directory location (e.g. `tests/__fixtures__/` following existing conventions if present).
- Per-test triage: which of the 18 tests move to fixtures vs. gate behind the opt-in clone vs. (if truly redundant) merge into another test.

</decisions>

<specifics>
## Specific Ideas

- The live sync pipeline already clones fresh upstream into `.oto-sync/upstream/{gsd,superpowers}` (`scripts/sync-upstream/pull-gsd.cjs`) — the opt-in corpus clone should reuse `bin/lib/sync-pull.cjs` rather than invent a new clone path.
- `copy-files.cjs:10` (`TOKEN_DENY_PATH_CONTAINS`) and `rename-map.json` (`foundation-frameworks/**` exclude) reference the folder; decide whether entries stay as harmless dead config or are removed — prefer removal only if no test asserts on them.
- Comment citations in `bin/lib/runtime-claude.cjs` and `bin/lib/runtime-codex.cjs` cite `foundation-frameworks/get-shit-done-main/bin/install.js:<line>` — convert to `get-shit-done@<tag> bin/install.js:<line>` form.
- Known dependent test files (18): 05-token-substitution, phase-01-{agent-audit,inventory,rename-map}, phase-02-{allowlist,coverage-manifest,engine-classify,dryrun-report,package-json,roundtrip-isolation,engine-no-source-mutation,roundtrip,summary-line,walker}, phase-03-no-unwanted-runtimes, phase-09-{allowlist,rebrand-sync}, phase-10-license-attribution.

</specifics>

<canonical_refs>
## Canonical References

- `decisions/ADR-14-inventory-scope.md` — inventory scope decision (to be annotated, not rewritten)
- `decisions/file-inventory.json` — derived inventory (to be annotated, not rewritten)
- `docs/upstream-sync.md` — sync pipeline flow (pull → rebrand → merge via `.oto-sync/`)

</canonical_refs>
