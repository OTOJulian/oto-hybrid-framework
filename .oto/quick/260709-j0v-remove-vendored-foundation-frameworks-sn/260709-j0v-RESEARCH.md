# Quick Task 260709-j0v: Remove vendored foundation-frameworks/ — Research

**Researched:** 2026-07-09
**Domain:** Test-suite dependency surface on a vendored 13MB upstream snapshot (`foundation-frameworks/`, 1,129 tracked files: `get-shit-done-main` v1.38.5, `superpowers-main` v5.0.7)
**Confidence:** HIGH (all claims below verified by direct file reads / grep / `npm test` run in this session, unless tagged otherwise)

## Summary

`foundation-frameworks/` is read at runtime by exactly **8 of the 18** listed test files (directly or via a helper they call); the other 10 only mention the string in a comment, a test-name label, or an assertion about *rename-map/package.json content* (never touch the folder's bytes). One file (`phase-01-inventory.test.cjs`) has one sub-test that is genuinely **OBSOLETE** once the folder is gone — the rest of that file is independent. No test file needs the *entire* 13MB tree; every "corpus" need is satisfiable either by a small curated fixture or, for the two tests whose whole point is completeness-against-real-upstream (D-17 pitfall), by the opt-in pinned clone. `bin/lib/sync-pull.cjs` (`pullUpstream({name,url,ref,destDir})`) is reusable as-is for that opt-in clone, but it does **not** catch network failures on first clone — the corpus test wrapper must add its own probe/try-catch, following the exact pattern already used by `tests/phase-08-smoke-codex.integration.test.cjs` (`probeCodex()` + `{ skip: probe().reason || false }`). `tests/fixtures/` (no double underscore) is the existing fixture-directory convention; `__fixtures__/` only exists as a defensive dead-code string in the token-substitution deny-list, never as an actual directory. Both vendored snapshot versions map to real, verifiable upstream tags: `get-shit-done@v1.38.5` (sha `f3685d9...`) and `superpowers@v5.0.7` (sha `dd7a63a...`) — confirmed live via `git ls-remote`.

**Primary recommendation:** Split the 18 files into (a) 10 files needing zero or trivial edits (comment/string-literal only), (b) ~6 files whose vendored-path usage swaps to a small new `tests/fixtures/rebrand-corpus/` fixture tree, (c) 2 files (or 2 extracted sub-tests) that gate behind an opt-in `OTO_SYNC_CORPUS=1` env var reusing `sync-pull.cjs`, and (d) 1 sub-test in `phase-01-inventory.test.cjs` to delete as obsolete (with the other 8 sub-tests in that file kept as-is).

## Per-Test Classification

| # | Test file | Class | What it reads from `foundation-frameworks/` | Action |
|---|-----------|-------|-----------------------------------------------|--------|
| 1 | `tests/05-token-substitution.test.cjs` | INDEPENDENT | Nothing — asserts `shouldSubstitute('oto/hooks/foundation-frameworks/something.sh') === false`, a pure string-literal check against `bin/lib/copy-files.cjs`'s `TOKEN_DENY_PATH_CONTAINS` deny-list. Never touches the real dir. | None, or trivial: drop the assertion line only if the deny-list entry itself is removed (see Pitfall 1). |
| 2 | `tests/phase-01-agent-audit.test.cjs` | INDEPENDENT | Nothing — only a code comment on line 8 (`// Canonical 33 GSD agent names verified against foundation-frameworks/get-shit-done-main/agents/.`). Reads only `decisions/agent-audit.md`. | Comment-citation rewrite only: `get-shit-done@v1.38.5 agents/`. |
| 3 | `tests/phase-01-inventory.test.cjs` | MIXED (8 tests INDEPENDENT, 1 test OBSOLETE) | 8 of 9 tests only read `decisions/file-inventory.json` + `schema/file-inventory.json` (static JSON, no dir access) — one test (`'license entries use explicit consolidation contract'`) hardcodes the literal strings `'foundation-frameworks/get-shit-done-main/LICENSE'` / `'.../superpowers-main/LICENSE'` as **expected values inside `merge_source_files`**, not as a path it reads — that's fine to keep verbatim since it's checking historical JSON content, not the filesystem. The one genuinely broken test is `'entry count matches filesystem walk'` (line 31-38): it `execSync('find foundation-frameworks/... -type f | wc -l')` and asserts it equals `data.entries.length`. | **Delete** the filesystem-walk test (OBSOLETE — `file-inventory.json` becomes a frozen historical snapshot per CONTEXT.md decision; nothing to walk against post-removal). Keep the other 8 tests unchanged except comment/citation touch-ups. |
| 4 | `tests/phase-01-rename-map.test.cjs` | INDEPENDENT | Nothing — asserts `rename-map.json`'s `do_not_rename` array contains the literal string `'foundation-frameworks/**'`. Never reads the directory. | Edit only if the deny-list entry itself is removed from `rename-map.json` (see Pitfall 1); otherwise leave as-is. |
| 5 | `tests/phase-02-allowlist.test.cjs` | FIXTURE | Test 1 copies the **real** `foundation-frameworks/get-shit-done-main/LICENSE` file into a temp src tree and asserts the rebrand engine copies it byte-for-byte and preserves `Copyright (c) 2025 Lex Christopherson`. Needs one real, stable MIT LICENSE file with that exact copyright line. | Commit `tests/fixtures/licenses/get-shit-done-LICENSE` (verbatim copy of the real upstream LICENSE — same content already embedded in `THIRD-PARTY-LICENSES.md`). Swap the source path. |
| 6 | `tests/phase-02-coverage-manifest.test.cjs` | FIXTURE | `manifest.buildPre(...)` and `engine.run({mode:'apply', target: foundation-frameworks/...})` need *some* tree containing `gsd`/`GSD` tokens to prove pre-run counting works and post-run apply produces zero non-allowlisted matches. No dependency on specific upstream content — any tree with deliberate `gsd` tokens works. | Point `target` at the new curated fixture tree (see "Fixture Design" below); it must include at least one file with a lowercase `gsd` token outside the allowlist. |
| 7 | `tests/phase-02-engine-classify.test.cjs` | MIXED (1 CORPUS-flavored, 1 FIXTURE) | Test 1's stated purpose is "classifies **the real upstream tree** with zero unclassified matches" (comment: "real upstream tree") — this is the same completeness spirit as D-17 (Pitfall 7), just phrased narrower. Test 2 (rejects unknown rule classes) only needs *some* target dir to exist; content is irrelevant. | Test 1: move to opt-in corpus gate (reuses the same completeness guarantee as D-17 — see Open Question 1 on whether to keep both or consolidate). Test 2: point at fixture tree. |
| 8 | `tests/phase-02-dryrun-report.test.cjs` | MIXED (3 FIXTURE-compatible, 1 needs real paths) | Tests 1-3 (report exists, rule-type counts > 0, D-04 shape) work against any token-bearing fixture tree. Test 4 hardcodes real upstream paths `get-shit-done/workflows/ingest-docs.md` and `.../eval-review.md` and asserts their exact `target_path` projection. | Tests 1-3: fixture tree. Test 4: either add matching placeholder paths to the fixture tree (`get-shit-done/workflows/{ingest-docs,eval-review}.md`) so the target-path projection assertion still exercises the real path-rewrite rule, or move test 4 alone to the opt-in corpus gate. Fixture-with-matching-paths is simpler and keeps this file fully offline-safe — recommended. |
| 9 | `tests/phase-02-package-json.test.cjs` | INDEPENDENT | Nothing — asserts `pkg.files` array does **not** include `'foundation-frameworks/'`. Reads `package.json` only. | None (assertion remains true and meaningful post-removal — the folder should never re-appear in `files`). |
| 10 | `tests/phase-02-roundtrip-isolation.test.cjs` | FIXTURE | Runs `scripts/rebrand.cjs --verify-roundtrip --target foundation-frameworks/` twice to check scratch-dir isolation/cleanup. Generic engine-plumbing behavior, no content dependency. | Point `--target` at fixture tree. |
| 11 | `tests/phase-02-engine-no-source-mutation.test.cjs` | FIXTURE | `TARGET = path.join(REPO_ROOT, 'foundation-frameworks')`; hashes the tree before/after `engine.run({mode:'apply'/'dry-run'})` to prove no source mutation. Generic, content-agnostic. | Point `TARGET` at fixture tree. |
| 12 | `tests/phase-02-roundtrip.test.cjs` | FIXTURE | CLI `--verify-roundtrip --target foundation-frameworks/`; asserts exit 0 and a summary-line regex. Content-agnostic. | Point `--target` at fixture tree. |
| 13 | `tests/phase-02-summary-line.test.cjs` | FIXTURE | `engine.run({mode:'dry-run', target:'foundation-frameworks/'})`; asserts exactly one `console.log` line matching the summary-line format. Content-agnostic (only needs `0 unclassified` to hold, which any allowlist-clean fixture satisfies). | Point `target` at fixture tree; verify fixture produces `0 unclassified` under current `rename-map.json` rules. |
| 14 | `tests/phase-02-walker.test.cjs` | INDEPENDENT | `'foundation-frameworks/**'` appears only as an example glob-pattern **string literal** inside `compileAllowlist(...)` and `globToRegExp(...)` unit tests (lines 24, 35). No filesystem access to the real dir at all. | None required — could optionally swap the example string for realism, but not necessary; it's just exercising generic glob-matching logic. |
| 15 | `tests/phase-03-no-unwanted-runtimes.test.cjs` | INDEPENDENT | The test **name/description string** says "(excluding foundation-frameworks/, ...)" but `scanFiles()` only walks `bin/` and `scripts/install-smoke.cjs` — it never lists or reads `foundation-frameworks/` at all. Pure documentation artifact in the string. | Cosmetic only: update the test-name string to drop the now-inapplicable exclusion clause. |
| 16 | `tests/phase-09-allowlist.test.cjs` | MIXED (3 INDEPENDENT/temp-dir-based, 1 CORPUS) | Tests "D-16" (x2) and "Pitfall 8" use `tmpRoot()`/temp dirs only — no real-tree dependency. The **D-17 / Pitfall 7** test (line 47-54) is the canonical completeness check: `currentRebrandedDir = path.resolve('foundation-frameworks/get-shit-done-main')`, asserts `unclassifiedAdds === 0` against the **entire real upstream tree**. This is the test whose whole purpose is "does the allowlist cover 100% of real upstream file paths" — genuinely needs the full corpus, a curated fixture cannot prove this claim. | Keep 3 tests as-is. Extract the D-17 test into the opt-in corpus gate (see "Opt-in Corpus Design"). |
| 17 | `tests/phase-09-rebrand-sync.test.cjs` | FIXTURE | Test 1 (`SYN-03` byte-identical output) copies 4 specific real files (`package.json`, `README.md`, `get-shit-done/workflows/{execute-phase,plan-phase}.md`) via `copyFixtureSubset()` into a temp dir, then compares two invocation paths of the same engine — proves plumbing equivalence, not upstream-specific content. Test 2 (`SYN-03` never-modifies-source) hashes `FOUNDATION_GSD/package.json` before/after — generic no-mutation check, same as file #11. | Both: point `FOUNDATION_GSD` at the fixture tree; add matching `package.json`, `README.md`, `get-shit-done/workflows/{execute-phase,plan-phase}.md` placeholder files to the fixture set. |
| 18 | `tests/phase-10-license-attribution.test.cjs` | FIXTURE | Reads the **real** `get-shit-done-main/LICENSE` and `superpowers-main/LICENSE` as the reference text to assert `THIRD-PARTY-LICENSES.md` embeds them verbatim (`CI-06`). Small, stable, public MIT license text — not the vendored *codebase*, just two ~1KB license files. | Commit `tests/fixtures/licenses/get-shit-done-LICENSE` and `tests/fixtures/licenses/superpowers-LICENSE` (verbatim copies — same bytes already embedded inside `THIRD-PARTY-LICENSES.md`, so this is not new information, just relocating the reference copy). Out-of-scope note in CONTEXT.md says `THIRD-PARTY-LICENSES.md` itself stays untouched — only the *test's reference source* moves. |

**Tally:** INDEPENDENT-only: 6 files (#1, #2, #4, #9, #14, #15). FIXTURE (fully or in part): 9 files (#5, #6, #7\*, #8\*, #10, #11, #12, #13, #17). CORPUS (opt-in, extracted sub-tests): 2 sub-tests (one from #7, one from #16), plus optionally #8's test 4. OBSOLETE: 1 sub-test inside #3 (rest of #3 is INDEPENDENT). \* = file has a mix of FIXTURE-compatible and CORPUS-only sub-tests; see its row for the split.

## Fixture Design

Existing convention: `tests/fixtures/<topic>/` (confirmed via `tests/fixtures/rebrand/`, `tests/fixtures/phase-09/`, etc. — 11 topic dirs already committed, ~dozens of files each). `__fixtures__/` (double underscore) is **not** an existing directory anywhere in the repo — it only exists as a second, unrelated entry in `bin/lib/copy-files.cjs:10`'s `TOKEN_DENY_PATH_CONTAINS` array (a defense-in-depth deny rule for a naming convention that was never adopted here). Don't be misled by the CONTEXT.md brief's mention of `__fixtures__/` — it's describing that deny-list string, not an existing fixture dir. **Use `tests/fixtures/rebrand-corpus/`** (new dir) to keep the "curated edge-case corpus" distinct from the existing `tests/fixtures/rebrand/` (which holds small single-purpose snippet files for rule-unit-tests, not a directory tree).

Files the new fixture tree needs, driven directly by the FIXTURE rows above:
- A LICENSE file at a nested path (e.g. `get-shit-done-main/LICENSE`) — verbatim GSD MIT text, for #5.
- `gsd`/`GSD` tokens outside the allowlist in at least one file — for #6.
- `get-shit-done/workflows/ingest-docs.md` and `get-shit-done/workflows/eval-review.md` (or `execute-phase.md`/`plan-phase.md` for #17) with real-shaped path segments so target-path projection assertions keep meaning — for #8 test 4 and #17.
- `package.json`, `README.md` placeholders with identifier/url-rule-triggering content — for #17.
- Generic content for #10-13 (no specific shape needed beyond "some files exist, some contain rename-map-triggering tokens").

This directly matches CONTEXT.md's "Fixture corpus size" decision ("curated edge cases... commands, agents, skills, hooks, deny-listed paths, token-collision cases... ~100-200KB").

## Opt-in Corpus Design (`OTO_SYNC_CORPUS` env var — name is Claude's discretion per CONTEXT.md)

`bin/lib/sync-pull.cjs` exports `pullUpstream({ name, url, ref, destDir })` [VERIFIED: read full file]:
- Validates git ≥2.0 on PATH, validates `ref` against `^[A-Za-z0-9._/+-]+$`.
- `resolveSha(url, ref)` does `git ls-remote url ref` wrapped in try/catch — **network failure here is silently swallowed** (`resolvedSha = null`), so it does not throw at that step.
- If a cached `destDir/current` exists and its recorded sha matches the freshly resolved sha, it **short-circuits** (returns cached record, no network needed beyond the `ls-remote` probe) — good for repeat local runs.
- Otherwise it rotates `current`→`prior` and does `git clone` (shallow `--branch <ref>` for tags/branches, full clone+checkout for a 40-char sha). **This clone call is NOT wrapped in try/catch** — a network failure here throws an `Error` synchronously out of `pullUpstream`.
- Writes `destDir/last-synced-commit.json` validated against `schema/last-synced-commit.json`.

**Implication for the opt-in test wrapper:** cannot rely on `pullUpstream` to fail gracefully offline. Must add an explicit probe before calling it, mirroring the exact precedent already in the codebase:

```javascript
// Pattern already used in tests/phase-08-smoke-codex.integration.test.cjs
function probeCorpusClone() {
  if (!process.env.OTO_SYNC_CORPUS) return { available: false, reason: 'OTO_SYNC_CORPUS not set' };
  const result = spawnSync('git', ['ls-remote', 'https://github.com/gsd-build/get-shit-done', 'v1.38.5'], { encoding: 'utf8', timeout: 10000 });
  if (result.error || result.status !== 0) return { available: false, reason: 'network/git unavailable' };
  return { available: true, reason: null };
}

test('D-17 / Pitfall 7: ...', { skip: probeCorpusClone().reason || false }, async (t) => {
  const { pullUpstream } = require('../bin/lib/sync-pull.cjs');
  await pullUpstream({ name: 'gsd', url: 'https://github.com/gsd-build/get-shit-done', ref: 'v1.38.5', destDir: path.join(os.tmpdir(), 'oto-sync-corpus-gsd') });
  // ... rest of D-17 assertion against destDir/current
});
```

Recommend **new files** `tests/phase-09-allowlist-corpus.integration.test.cjs` and `tests/phase-02-engine-classify-corpus.integration.test.cjs` (the `.integration.test.cjs` naming convention already exists — `tests/phase-08-smoke-codex.integration.test.cjs`, `tests/phase-08-smoke-gemini.integration.test.cjs` — and both are still matched by the `npm test` glob `tests/*.test.cjs`). This keeps each remaining file's fixture-only tests fast and network-free, and isolates the 2 opt-in tests cleanly rather than sprinkling per-test skip conditions inside otherwise-fixture files.

`destDir` should NOT be named anything containing the literal substring `foundation-frameworks` (see Pitfall 3).

## Pinned Upstream Refs [VERIFIED: git ls-remote, live network check this session]

| Upstream | Vendored `package.json` version | Verified tag exists | Commit sha |
|----------|----------------------------------|----------------------|------------|
| get-shit-done | `1.38.5` | `v1.38.5` ✓ | `f3685d917396f1e8b5e5f7f19f4352d84fa9b1a9` |
| superpowers | `5.0.7` | `v5.0.7` ✓ | `dd7a63ac45233dce0a6c6222a77f205ee7c78750` (annotated tag; peeled commit `1f20bef3f59b85ad7b52718f822e37c4478a3ff5`) |

No `last-synced-commit.json` pin record exists anywhere in the repo (`.oto-sync/` only has empty `BREAKING-CHANGES-{gsd,superpowers}.md` audit logs — no `upstream/{gsd,superpowers}/last-synced-commit.json`) [VERIFIED: `find .oto-sync`]. The vendored snapshot's provenance is therefore **inferred, not recorded** — `package.json` version numbers are the only signal, and they resolve to real tags. Use `get-shit-done@v1.38.5` / `superpowers@v5.0.7` for both (a) comment-citation rewrites and (b) the opt-in corpus clone's default `ref`.

## Non-Test Runtime Files Referencing `foundation-frameworks/` [VERIFIED: grep sweep across bin/, oto/, scripts/, hooks/, schema/, package.json, decisions/]

| File | Reference | Runtime read? | Action needed |
|------|-----------|----------------|----------------|
| `bin/lib/runtime-claude.cjs:7,9,51` | Comment citations to `foundation-frameworks/get-shit-done-main/bin/install.js:<lines>` | No — comments only | Rewrite to `get-shit-done@v1.38.5 bin/install.js:<lines>` |
| `bin/lib/runtime-codex.cjs:78,174` | Same pattern | No | Same rewrite |
| `scripts/build-hooks.js:7` | Comment: "Pattern derived from foundation-frameworks/..." | No | Same rewrite |
| `bin/lib/copy-files.cjs:10` | `TOKEN_DENY_PATH_CONTAINS = ['foundation-frameworks/', '__fixtures__/']` | **Yes, structurally** — evaluated on every install-time file copy, but the copied source trees (`oto/`, `hooks/`) never contain a `foundation-frameworks/` sub-path in practice, so this is dead-but-harmless defense-in-depth. | See Pitfall 1 — recommend leaving as-is (2 tests assert on it; removal saves nothing functionally). |
| `rename-map.json:42` (`do_not_rename`) | `'foundation-frameworks/**'` glob entry | Only matters if the rebrand engine's `target` root itself contains a nested `foundation-frameworks/` dir — never happens in the real install/sync pipeline. | Same as above — leave, or remove alongside #1/#4 test edits together as one atomic change. Claude's discretion per CONTEXT.md. |
| `scripts/rebrand.cjs:14` | `target` CLI flag default: `'foundation-frameworks/'` | **Yes — this is a real bug-in-waiting.** `npm run rebrand`, `npm run rebrand:dry-run`, `npm run rebrand:roundtrip` all invoke this script with no `--target` override; once the folder is deleted these bare npm-script invocations will fail (ENOENT / 0 files walked) even though the 18 test files themselves always pass an explicit `--target`. | **Must fix** — see Pitfall 2. |
| `scripts/rebrand/lib/engine.cjs:401` | `opts.target \|\| path.join(repoRoot(), 'foundation-frameworks')` (engine's own internal default) | Only reachable if `engine.run()` is called programmatically without a `target` — `scripts/rebrand.cjs` always passes one explicitly, so this default is currently dead in the CLI path, but any other future caller (or a stray test) that omits `target` would hit it. | Update alongside `scripts/rebrand.cjs`'s default — see Pitfall 2. |
| `scripts/gen-inventory.cjs:7-8,34-35,74-75,150,157,161,181-182` | `GSD_ROOT`/`SP_ROOT` hardcoded to `foundation-frameworks/{get-shit-done-main,superpowers-main}`, used to regenerate `decisions/file-inventory.json` | **Yes** — this script is never invoked by any npm script or test (confirmed: not in `package.json` scripts, only referenced by name in `phase-01-inventory.test.cjs`'s failure message "run scripts/gen-inventory.cjs"), but it would throw immediately if run manually post-removal. | Not test-blocking. Recommend a top-of-file comment marking it historical/non-runnable post-2026-07-09 (mirrors the CONTEXT.md decision to annotate `decisions/file-inventory.json` itself as historical), rather than deleting the script (keeps regeneration possible if the corpus is ever re-vendored). |
| `bin/lib/sync-merge.cjs:42-44` | `matchAllowlist(relPath, globs, rootDir)`'s special-case branch: if `rootDir` contains the literal substring `/foundation-frameworks/`, also test glob matches with a `foundation-frameworks/` prefix | **This branch exists solely to support the D-17 test's non-standard argument** (`currentRebrandedDir = path.resolve('foundation-frameworks/get-shit-done-main')` — a raw, un-rebranded upstream path, not the normal `.oto-sync/rebranded/.../current` shape the real sync pipeline always passes). It is already dead code in production. | Out of scope per CONTEXT.md ("live sync pipeline behavior... already independent of the folder") — do not remove, but be aware: once D-17 moves to an opt-in corpus clone with a `destDir` that is **not** named `foundation-frameworks`, this branch becomes unreachable by any test too. Flag for the planner as an open question (see below), don't silently leave a dead branch nobody documents. |
| `decisions/sync-allowlist.json`, `decisions/ADR-05-agent-collisions.md`, `decisions/file-inventory.json`, `decisions/agent-audit.md`, `decisions/ADR-14-inventory-scope.md`, `docs/rebrand-engine.md`, `oto/templates/instruction-file.md`, `CLAUDE.md`, `AGENTS.md`, `GEMINI.md` | Prose/doc references | No runtime read | Out of scope per this quick task's boundary except `decisions/ADR-14-inventory-scope.md` and `decisions/file-inventory.json`, which CONTEXT.md already scopes to an "annotate as historical" note (not a rewrite). |

## Common Pitfalls

### Pitfall 1: Deny-list entries become dead-but-asserted-on
`bin/lib/copy-files.cjs:10` and `rename-map.json:42` both carry `foundation-frameworks/`-shaped entries that 2 tests (`05-token-substitution.test.cjs`, `phase-01-rename-map.test.cjs`) directly assert exist. Removing the folder does not make these entries wrong, just unreachable in practice (install/sync source trees never contain that sub-path). **Recommendation:** leave both deny-list entries in place — they're cheap, and removing them forces edits to 2 otherwise-untouched INDEPENDENT test files for zero functional gain. Only remove if the user explicitly wants zero "foundation-frameworks" string occurrences outside comments/citations.

### Pitfall 2: Bare npm scripts silently break
`npm run rebrand`, `rebrand:dry-run`, and `rebrand:roundtrip` all default `--target` to `'foundation-frameworks/'` (`scripts/rebrand.cjs:14`). None of the 18 test files exercise this default path (all pass explicit `--target` args), so `npm test` staying green will **not** catch this regression. Must independently fix: either require `--target` explicitly (breaking but honest), or point it at the post-removal replacement (opt-in corpus dir, once cloned) with a clear error if not cloned yet.

### Pitfall 3: Fixture/corpus dir naming must avoid the string "foundation-frameworks"
`bin/lib/sync-merge.cjs:42`'s special-case branch keys off the literal substring `/foundation-frameworks/` in a path. If the new opt-in corpus `destDir` (or the new fixture tree) is ever accidentally named something containing that substring, D-17-style tests could pass for the wrong reason (silently exercising 13-year-old dead-code compatibility branch) or fail confusingly. Name the fixture `tests/fixtures/rebrand-corpus/` and the opt-in clone dir something like `.oto-sync/corpus/gsd/` — both avoid the substring.

### Pitfall 4: `reports/rebrand-dryrun.json`/`.md` are regenerated, git-tracked, and will diff
`phase-02-dryrun-report.test.cjs` and `phase-02-engine-classify.test.cjs` (and the `npm run rebrand:dry-run` script) write to `reports/rebrand-dryrun.{json,md}` as a side effect. These files are currently git-tracked (both show as modified in `git status` at session start, from a prior run). Once the fixture tree replaces the real corpus as the `--target`, these report files' content will structurally change (different file counts/paths) on every subsequent test/CI run — expected, not a regression, but the PLAN should note this file diff is expected in the resulting commit.

## Test Runner / Skip Conventions [VERIFIED: read package.json, ran `npm test`]

- `package.json` `"test"` script: `node --test --test-concurrency=4 tests/*.test.cjs` — no separate runner script (no `scripts/run-tests.cjs` found in this repo; that path exists only inside the vendored `foundation-frameworks/get-shit-done-main/scripts/run-tests.cjs`, unrelated).
- Current baseline (`npm test` run this session): **636 tests, 635 pass, 0 fail, 1 skipped** — the skip is the platform-gated (`win32`) or tool-probe-gated (`codex`/`gemini` availability) integration tests in `260616-muv-doctor.test.cjs`, `sdk-wiring.test.cjs`, `phase-08-smoke-{codex,gemini}.integration.test.cjs`. This confirms the `{ skip: <expr> }` second-arg pattern (and `.integration.test.cjs` naming) is an established, glob-matched, already-working convention — reuse it verbatim for the new opt-in corpus tests rather than inventing a new mechanism.
- No existing `t.skip()` *dynamic* (in-body) calls found — all current skips are static option-object expressions evaluated at test-registration time. The `probeCorpusClone()` pattern above follows this same static-option style.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|----------------|
| A1 | Env var name `OTO_SYNC_CORPUS` for the opt-in gate (CONTEXT.md leaves this to Claude's discretion; used only as an illustrative example in this research, not a locked choice) | Opt-in Corpus Design | Low — purely a naming choice, easy to rename during planning. |
| A2 | The vendored snapshot was taken from exactly `v1.38.5`/`v5.0.7` (inferred from `package.json` version fields, not from a recorded sync-pin record) | Pinned Upstream Refs | Low-medium — if the actual vendoring predates or postdates a patch release with the same version string re-tagged, the pinned corpus clone would fetch a byte-diff from what's in git history. Tags were verified to exist and resolve; no stronger provenance signal exists in this repo. |
| A3 | `scripts/gen-inventory.cjs` is safe to leave as dead-but-documented rather than delete, since no test invokes it | Non-Test Runtime Files | Low — if a future contributor runs it manually expecting it to work, it throws immediately and loudly (ENOENT), which is a safe failure mode. |

## Open Questions

1. **Should `phase-02-engine-classify.test.cjs`'s "real upstream tree, zero unclassified" test be consolidated with `phase-09-allowlist.test.cjs`'s D-17 test, since both assert the same completeness property against the same corpus?**
   - What we know: both tests independently run a full-tree classify/merge and assert zero-unclassified/zero-unclassified-adds against `foundation-frameworks/get-shit-done-main`.
   - What's unclear: whether phase-02's engine-level check and phase-09's sync-merge-level check are meaningfully different enough to justify two opt-in corpus clones (double network/CI cost) vs. one shared corpus fixture reused by both.
   - Recommendation: keep both as separate opt-in tests but have them share one `pullUpstream()` call via a common `t.before`/module-level cache keyed by `destDir`, so `OTO_SYNC_CORPUS=1 npm test` only clones once.

2. **Does the plan want `bin/lib/sync-merge.cjs:42-44`'s dead special-case branch cleaned up, or left alone as explicitly out-of-scope "sync pipeline behavior"?**
   - What we know: CONTEXT.md marks the live sync pipeline out of scope; this branch technically lives in a sync-pipeline file but exists *only* to support a test's directory-naming coincidence, not any real pipeline behavior.
   - Recommendation: leave untouched, but the plan's task for the corpus-test extraction should explicitly note in its commit message that this branch becomes fully unreachable, so a future cleanup pass can find it via that note rather than rediscovering it from scratch.

## Sources

### Primary (HIGH confidence — verified this session via Read/Bash/grep)
- Direct reads of all 18 test files, `bin/lib/sync-pull.cjs`, `bin/lib/sync-merge.cjs`, `bin/lib/copy-files.cjs`, `scripts/rebrand.cjs`, `scripts/gen-inventory.cjs`, `rename-map.json`, `package.json`, `docs/upstream-sync.md`, `schema/last-synced-commit.json`.
- `npm test` run in this session: 636 tests / 635 pass / 1 skip / 0 fail (baseline, pre-change).
- `git ls-remote --tags https://github.com/gsd-build/get-shit-done` and `.../obra/superpowers` — live network verification of `v1.38.5` / `v5.0.7` tags.
- `find .oto-sync`, `find tests/fixtures` — confirmed no `last-synced-commit.json` pin record exists; confirmed `tests/fixtures/` (not `__fixtures__/`) is the live convention.

### Tertiary (LOW confidence)
- None — no unverified web claims were needed for this task; everything resolvable from the local repo and one live git remote check.

## Metadata

**Confidence breakdown:**
- Per-test classification: HIGH — every file was read in full, not grepped-and-guessed.
- Pinned upstream refs: HIGH — tags verified live via `git ls-remote`, not assumed from training data.
- Fixture design specifics: MEDIUM — the *shape* of needed fixture files is derived directly from test assertions (HIGH), but exact byte-for-byte fixture content is a planning-time authoring task, not yet written.

**Research date:** 2026-07-09
**Valid until:** Stable — no fast-moving external dependency; re-verify upstream tags only if the corpus clone is implemented weeks/months later.
