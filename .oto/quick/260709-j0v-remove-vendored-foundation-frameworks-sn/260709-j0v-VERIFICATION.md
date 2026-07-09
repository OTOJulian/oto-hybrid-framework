---
phase: quick/260709-j0v-remove-vendored-foundation-frameworks-sn
verified: 2026-07-09T00:00:00Z
status: passed
score: 7/7 must-haves verified
overrides_applied: 0
---

# Quick Task 260709-j0v: Remove vendored foundation-frameworks/ Verification Report

**Task Goal:** Remove the vendored `foundation-frameworks/` upstream snapshots: rework dependent tests (fixtures / opt-in pinned-ref corpus clone), delete the folder, fix `scripts/rebrand.cjs --target` default, convert comment citations to `repo@tag` form, annotate historical records, keep `npm test` plus license attribution green offline.
**Verified:** 2026-07-09
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `git ls-files foundation-frameworks/` returns nothing | ✓ VERIFIED | `git ls-files foundation-frameworks/ \| wc -l` → `0`. `foundation-frameworks/` directory does not exist on disk. |
| 2 | `npm test` passes fully offline, two completeness/corpus tests reported as skipped, not failed | ✓ VERIFIED | Ran `npm test` (offline, `OTO_SYNC_CORPUS` unset): `tests 635, suites 12, pass 632, fail 0, cancelled 0, skipped 3`. The 3 skips are: `engine dry-run classifies the real upstream tree with zero unclassified matches # SKIP OTO_SYNC_CORPUS not set`, `D-17 / Pitfall 7: allowlist completeness ... # SKIP OTO_SYNC_CORPUS not set` (the two new opt-in corpus tests), and `D-17 gemini live invocation ... # SKIP gemini v0.26.0 < required v0.38` (pre-existing platform-probe skip, unrelated to this task). Zero failures. |
| 3 | `OTO_SYNC_CORPUS=1 npm test` actually clones get-shit-done@v1.38.5 and exercises the two completeness assertions against the real cloned tree | ✓ VERIFIED (not re-run per instructions) | Per task instructions, this network path was not re-executed by the verifier. SUMMARY.md documents 634 pass / 0 fail / 1 skipped (only the gemini platform-probe skip remaining) when actually run with network. Code inspection confirms this is plausible and correctly wired: `tests/helpers/corpus-clone.cjs`'s `probeCorpusClone()` gates on `process.env.OTO_SYNC_CORPUS`, `cloneCorpus()` calls the real `pullUpstream()` from `bin/lib/sync-pull.cjs` against the pinned `v1.38.5`/`v5.0.7` refs, and both new integration test files correctly reference `probeCorpusClone(...).reason \|\| false` as their `skip` condition — structurally this will run for-real when the env var is set and network/git succeeds. SUMMARY also documents a real bug found and fixed during this exact run (`.git` dir leaking into the merge classification, fixed by stripping `.git` after clone) — this specific, non-generic failure detail is strong evidence the network path was genuinely exercised, not just claimed. |
| 4 | `node scripts/rebrand.cjs --dry-run` with no `--target` fails fast with a clear, actionable stderr message | ✓ VERIFIED | Ran directly: `node scripts/rebrand.cjs --dry-run` → stderr: `engine error: --target is required (no default — foundation-frameworks/ was removed 2026-07-09). Pass --target <dir>: a fixture tree, a .oto-sync/upstream/{gsd,superpowers}/current snapshot, or an OTO_SYNC_CORPUS=1 pinned clone.`, `exit=5`. `scripts/rebrand/lib/engine.cjs`'s `run()` also has a defense-in-depth `if (!opts.target) throw ...` guard before `path.resolve`. |
| 5 | THIRD-PARTY-LICENSES.md byte-for-byte unchanged; license-attribution test passes from fixture LICENSE files | ✓ VERIFIED | `git status --porcelain THIRD-PARTY-LICENSES.md` → empty (no diff). `node --test tests/phase-10-license-attribution.test.cjs` → 3/3 pass, 0 fail. File reads from `tests/fixtures/rebrand-corpus/get-shit-done-main/LICENSE` and `tests/fixtures/rebrand-corpus/superpowers-main/LICENSE` (confirmed present, byte-copied from the original vendored files per Task 1 commit diff). |
| 6 | Code comments in runtime-claude.cjs, runtime-codex.cjs, build-hooks.js cite `get-shit-done@v1.38.5 <path>:<line>` instead of vendored path | ✓ VERIFIED | `grep -n "foundation-frameworks\|get-shit-done@" bin/lib/runtime-claude.cjs bin/lib/runtime-codex.cjs scripts/build-hooks.js` → all 6 matching comment lines now read `get-shit-done@v1.38.5 bin/install.js:<lines>` / `get-shit-done@v1.38.5 scripts/build-hooks.js`; zero remaining `foundation-frameworks` substrings in these 3 files. |
| 7 | decisions/file-inventory.json and ADR-14-inventory-scope.md carry a dated historical-removal note; original content otherwise untouched | ✓ VERIFIED | `file-inventory.json`: `git show cd8d211 -- decisions/file-inventory.json` shows a single additive line (`"historical_note": "..."`) inserted after `upstream_versions`; `entries` array untouched. Parses correctly: `node -e "JSON.parse(...).historical_note"` prints the note. `ADR-14-inventory-scope.md`: diff shows a single additive blockquote line inserted after the H1 heading, before `Status:`; `## Context`/`## Decision`/`## Rationale`/`## Consequences` sections untouched (diff shows 0 removed lines, 2 added — one note line + one blank line). `scripts/gen-inventory.cjs` also carries the required historical/non-runnable comment (bonus artifact, matches plan Task 3 Step 1). |

**Score:** 7/7 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `tests/fixtures/rebrand-corpus/get-shit-done-main/` | Curated fixture subtree (LICENSE, package.json, README.md, 4 workflow .md files) | ✓ VERIFIED | All 7 files present at correct nested paths; `du -sh` reports 224K total (plan pre-approved the ~211-224KB deviation from the ~100-200KB CONTEXT.md guide). |
| `tests/fixtures/rebrand-corpus/superpowers-main/LICENSE` | Verbatim superpowers MIT LICENSE | ✓ VERIFIED | Present; consumed by `tests/phase-10-license-attribution.test.cjs` which passes. |
| `tests/helpers/corpus-clone.cjs` | Shared `probeCorpusClone()` + `cloneCorpus()` wrapping `bin/lib/sync-pull.cjs` | ✓ VERIFIED | File exists, exports `GSD_REF, SUPERPOWERS_REF, probeCorpusClone, cloneCorpus`; `cloneCorpus()` calls `require('../../bin/lib/sync-pull.cjs').pullUpstream(...)` — correctly wired, not a stub. Includes a documented post-clone `.git` strip fix (deviation, see below). |
| `tests/phase-02-engine-classify-corpus.integration.test.cjs` | Opt-in completeness test, gated on OTO_SYNC_CORPUS | ✓ VERIFIED | Present; uses `{ skip: probeCorpusClone(GSD_REF).reason \|\| false }`; observed as `ok ... # SKIP OTO_SYNC_CORPUS not set` in the offline run — correctly wired, not orphaned. |
| `tests/phase-09-allowlist-corpus.integration.test.cjs` | Opt-in D-17 allowlist-completeness test, gated on OTO_SYNC_CORPUS | ✓ VERIFIED | Present; same skip-gating pattern confirmed in offline test output. |
| `scripts/rebrand.cjs` | `--target` required, no silent foundation-frameworks/ default | ✓ VERIFIED | `target` option definition has no `default`; CLI-layer guard added before `path.resolve`; live-tested, exits 5 with correct message. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `tests/phase-02-*.test.cjs`, `phase-09-rebrand-sync.test.cjs`, `phase-10-license-attribution.test.cjs` | `tests/fixtures/rebrand-corpus/` | path literals | ✓ WIRED | `grep -l "tests/fixtures/rebrand-corpus" tests/phase-02-*.test.cjs tests/phase-09-rebrand-sync.test.cjs tests/phase-10-license-attribution.test.cjs` matches all 9 target files; a companion negative grep for `foundation-frameworks` across the same 9 files returns nothing. |
| `tests/phase-02-engine-classify-corpus.integration.test.cjs`, `phase-09-allowlist-corpus.integration.test.cjs` | `bin/lib/sync-pull.cjs pullUpstream` | `tests/helpers/corpus-clone.cjs cloneCorpus()` | ✓ WIRED | Both integration files `require('./helpers/corpus-clone.cjs')` and call `cloneCorpus(GSD_REF)`; helper's `cloneCorpus()` requires and calls `pullUpstream` from `bin/lib/sync-pull.cjs` directly (grep-confirmed call site at line 33). |
| `scripts/rebrand.cjs` | `scripts/rebrand/lib/engine.cjs run()` | CLI-layer required-target check + `opts.target` guard | ✓ WIRED | Both layers confirmed present and functionally verified: the CLI-layer guard fires first (live-tested, exit 5, correct message) before `path.resolve` would otherwise throw a raw `TypeError`; `engine.run()`'s own `if (!opts.target) throw ...` guard is present as defense-in-depth for programmatic callers. |

### Anti-Patterns Found

None. Scanned all new/modified files in this task (`tests/helpers/corpus-clone.cjs`, both new integration test files, `scripts/rebrand.cjs`, `scripts/rebrand/lib/engine.cjs`) for TODO/FIXME/XXX/HACK/PLACEHOLDER markers — zero matches.

### No-Op Files Confirmed Untouched

Per the plan's explicit no-op decision, `rename-map.json`, `bin/lib/copy-files.cjs`, `bin/lib/sync-merge.cjs`, `tests/05-token-substitution.test.cjs`, `tests/phase-01-rename-map.test.cjs`, `tests/phase-02-package-json.test.cjs`, and `tests/phase-02-walker.test.cjs` were required to stay completely untouched. `git log --oneline -1 -- <these 7 files>` shows their last-touching commit is `d3e3a8f` (pre-dates this task's 3 commits `3ef9f00`/`353b9a4`/`cd8d211`) — confirmed untouched.

### Deviations Noted (documented in SUMMARY, verified as legitimate)

- `tests/helpers/corpus-clone.cjs` strips the clone's `.git` directory post-clone (a bug found and fixed during Task 3's real `OTO_SYNC_CORPUS=1` verification run, per SUMMARY's "Auto-fixed Issues" section). This is in-scope (confined to a file this plan created) and does not affect any must-have.

### Pre-Existing / Out-of-Scope Dirty State (confirmed, not caused by this task)

`git status --porcelain` shows only `reports/rebrand-dryrun.{json,md}` (modified — generated report artifacts rewritten by every dry-run CLI invocation, pre-existing per the task's own scope note) and `INTERVIEW-BRIEF-oto.md` (untracked, unrelated). No other working-tree drift.

### Human Verification Required

None. All must-haves are mechanically verifiable and were verified via direct command execution and code inspection.

### Gaps Summary

No gaps. All 7 must-have observable truths verified against the actual codebase: the vendored folder is fully removed from git, the offline test suite is green (632 pass / 0 fail / 3 skipped, with the correct 2 new opt-in skips plus 1 pre-existing platform skip), the rebrand CLI fails loudly and correctly on a missing `--target`, THIRD-PARTY-LICENSES.md is untouched and the license-attribution test passes from the new fixture files, all required citation comments were converted to `repo@tag` form, and both historical decision records carry additive-only annotations with original content intact. The `OTO_SYNC_CORPUS=1` network path was not re-run by the verifier per explicit task instructions, but the wiring is structurally sound (correct skip-gating, correct `pullUpstream` call, correct pinned refs) and the SUMMARY's specific, non-generic bug-fix narrative (`.git` dir leak into merge classification) is strong circumstantial evidence the path was genuinely exercised rather than merely claimed.

---

_Verified: 2026-07-09_
_Verifier: Claude (oto-verifier)_
