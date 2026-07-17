---
status: issues_found
phase: 16-agent-guidance-hardening
reviewed: "2026-07-17T21:31:27Z"
depth: standard
files_reviewed: 31
findings:
  critical: 0
  warning: 3
  info: 0
  total: 3
---

# Phase 16 Code Review

## Scope and verification

Reviewed all 31 explicitly scoped Phase 16 source, generated SDK, agent, documentation, sync, rebrand, and test files, plus the Phase 16 plans/summaries and adjacent workflow/merge implementations needed to verify the shipped paths. The developer-approved WR-02 planning-root divergence was treated as inherited context, not a Phase 16 finding.

Fresh verification:

- Focused `node:test` run across the Phase 16, runtime-matrix, coverage, and sync suites: **84 passed, 0 failed**.
- Focused Vitest run for Brave keyfile fallback and secret-status inheritance: **9 passed, 0 failed**.
- `sdk/node_modules/.bin/tsc --noEmit`: **passed**.
- `node scripts/check-runtime-sync.cjs`: **passed** for Claude and Codex; Gemini skipped because no install exists.
- Focused first-sync reproduction confirmed that a second upstream overwrites the first upstream's same-path sidecar.
- Focused rebrand reproduction confirmed that the three new test-path allowlist entries preserve raw `gsd-*` and `.planning` tokens while the engine exits 0.

## Warning

### WR-01 — `--upstream all` overwrites the first upstream's conflict artifacts with the second upstream's results

**Files:** `bin/lib/sync-cli.cjs:128-136,139-155`, `bin/lib/sync-merge.cjs:160-165,279-300,323-325`, `tests/phase-09-cli.integration.test.cjs:129-138`

Phase 16 changed the all-upstream path to continue after a nonzero finding status, but both legs still invoke merge without an upstream-specific conflict directory. Both therefore write to the shared `.oto-sync-conflicts` tree, and sidecars are keyed only by target path; `REPORT.md` is also regenerated in place. Any target present in both upstreams is overwritten by the later Superpowers leg, and the root report retains only that second leg.

A focused reproduction ran `mergeAll` for GSD and then Superpowers against the same `shared/x.md`. The final sidecar declared `upstream: superpowers`, contained the Superpowers body, and no longer contained the GSD body. The new test only exercises `runUpstreamSequence` with a fake runner, so it proves both callbacks run but does not exercise or detect artifact loss.

**Impact:** The documented `--upstream all` command can discard actionable GSD conflict evidence and leave `oto sync --accept` operating on the wrong upstream's sidecar for overlapping paths. Terminal output from the original run may contain both counts, but the durable conflict surface does not.

**Required fix:** Namespace conflict artifacts by upstream when `all` is selected (for example `.oto-sync-conflicts/gsd/` and `.oto-sync-conflicts/superpowers/`) or build an aggregate format that preserves both provenance records without collisions. Add an end-to-end all-upstream test with one overlapping target and assert both sidecars/reports remain available after the second leg.

### WR-02 — New upstream regression tests are excluded wholesale from rebranding, so raw GSD paths and names can pass the coverage gate

**Files:** `rename-map.json:55-57`, `scripts/rebrand/lib/engine.cjs:316-323`, `tests/phase-02-coverage-manifest.test.cjs:43-52`

The three newly discovered upstream test files were added to `do_not_rename`. The engine's allowlisted-file branch copies those files byte-for-byte and skips every identifier/path/package transform. The accompanying regression only asserts that the path entries are present in the allowlist; it does not verify that the tests remain valid in the oto tree.

A focused engine reproduction at `tests/bug-2808-skill-hyphen-name.test.cjs` containing both `gsd-skill` and `.planning` exited 0 with zero matches and copied both raw tokens unchanged. This turns the coverage gate green by exempting the whole test rather than classifying or porting its semantics.

**Impact:** A later sync acceptance can import tests that exercise upstream GSD names/roots instead of oto behavior, or fail for reasons hidden by the rebrand coverage gate. These tests are executable regression assets, not attribution/license content that should remain byte-identical.

**Required fix:** Remove the three whole-file `do_not_rename` entries. Port their relevant identifiers and planning paths through precise rules or explicitly classify the files as drop/needs-manual-port in the sync inventory. Replace the allowlist-presence assertion with an applied-output test proving the accepted test uses oto names/roots and remains executable.

### WR-03 — The shared search reference requires availability booleans that the actual agent spawn paths do not provide

**Files:** `oto/references/search-tools.md:7-14,23,41-45`, `oto/bin/lib/init.cjs:438-441`, `tests/16-availability-coherence.test.cjs:49-78`, `tests/16-search-reference.test.cjs:11-29`; adjacent evidence: `oto/workflows/new-project.md:59-67,755-796`, `oto/workflows/plan-phase.md:30-50,349-390`, `oto/workflows/ui-phase.md:19-30,123-164`, `oto/workflows/diagnose-issues.md:86-104`, `oto/workflows/discuss-phase/modes/advisor.md:90-106`

The canonical reference says every init/orchestrator context carries `exa_search`, `brave_search`, and `firecrawl`, and tells agents to trust those fields before attempting a rung. The implemented init contract actually emits `exa_search_available`, `brave_search_available`, and `firecrawl_available`. The new-project workflow does not parse those three fields, and the reviewed researcher/debugger/advisor spawn prompts do not inject either spelling. Several of those workflows use init handlers that do not expose search availability at all.

The tests validate reference prose and init output independently, so they remain green without proving the key link from availability detection to the five consuming agents. The approved HARD-04 keyless leg demonstrates that the missing-tool/tool-not-found fallback works in one debugger session; it does not establish the reference's claimed boolean gate across the shipped spawn paths.

**Impact:** Agents cannot follow the canonical "never attempt an unavailable tool" instruction from the promised context. They may probe Brave without a key or reason about Exa/Firecrawl availability from tool absence rather than the defined gate, and configured Brave availability is not explicitly conveyed to workflows that are supposed to choose it.

**Required fix:** Define one canonical field spelling and thread those booleans into every consuming spawn prompt, or revise the reference to derive availability from the actual runtime tool list and structured Brave response. Add an end-to-end workflow-shape test that starts from init output and asserts the five agent prompts receive the exact availability contract they consume.

## Reviewed concerns with no finding

- Brave credential resolution remains environment-first, reads the canonical keyfile only as fallback, and does not log or return key bytes. Focused tests cover no-key, empty-keyfile, keyfile-only, and environment-precedence cases.
- `secretStatus` migrates the root layer before the selected workstream layer, reads the effective root-under-workstream config, and constructs only masked status data. Source and committed distribution behavior match for the reviewed changes.
- The five agent sources contain no deprecated Exa tool names; the production Codex/Gemini transforms preserve/filter namespaces according to the Phase 16 contract, and installed Claude/Codex copies pass the runtime drift guard.
- `latest` resolves remote default `HEAD`, the first-sync null-trio cases are explicit and non-destructive, and both upstream legs now execute after ordinary fail-loud finding statuses. WR-01 is specifically about preserving their durable outputs.
- The full SDK suite's remaining 268 failures stay within the developer-approved amended baseline: 40 current failing files, zero new files, and zero files over their maxima. The two todo-parity rows remain failing and counted; the separately bounded WR-02 planning-root migration was not started.

## REVIEW COMPLETE
