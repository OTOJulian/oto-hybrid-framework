# Phase 9: Upstream Sync Pipeline - Research

**Researched:** 2026-05-04
**Domain:** Upstream sync pipeline (snapshot pull → rebrand → 3-way merge → conflict surfacing) for an oto fork of GSD + Superpowers
**Confidence:** HIGH (most claims live-verified against the local environment)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

The 22 D-XX decisions in `09-CONTEXT.md` are all binding. Quoted verbatim from the source-of-truth context document:

- **D-01:** Pulls land at `.oto-sync/upstream/{gsd,superpowers}/<tag>/`. `foundation-frameworks/get-shit-done-main/` (v1.38.5) and `superpowers-main/` (v5.0.7) stay as immutable, committed reference baselines.
- **D-02:** Retain prior + current snapshots for 3-way detection. On each sync run, rotate `current → prior, new → current`. Layout: `.oto-sync/upstream/{name}/{prior,current}/` + `last-synced-commit.json`; mirrored under `.oto-sync/rebranded/{name}/{prior,current}/`.
- **D-03:** Rebranded snapshots live at `.oto-sync/rebranded/{gsd,superpowers}/{prior,current}/`. Separate from raw upstream so the user can inspect both forms; `merge.cjs` can re-run without re-pulling.
- **D-04:** `.oto-sync/` is gitignored except for two metadata files per upstream (`last-synced-commit.json`, `BREAKING-CHANGES-{gsd,superpowers}.md`). `.oto-sync-conflicts/**` is gitignored — working files only.
- **D-05:** Tag-pin by default. `--main` permitted but emits a Pitfall-12 warning. Numeric SHA via `--to <sha>` accepted for forensics. `last-synced-commit.json` always stores both the human ref and the resolved 40-char SHA.
- **D-06:** Fetch via `git clone --depth 1 --branch <ref>`. Falls back gracefully if `--branch` doesn't accept a SHA: full clone + `git checkout <sha>`. Tarball download was rejected.
- **D-07:** Pullers are thin wrappers over `git clone` differing only in upstream URL constant; both delegate to a shared `bin/lib/sync-pull.cjs::pullUpstream(name, url, ref, destDir)`.
- **D-08:** 3-way merge via `git merge-file -p` subprocess delegation (NOT a re-implementation in JS). Exit code 0 → write directly to `oto/<target_path>`. Exit code N>0 → write conflict file with `<<<<<<<`/`=======`/`>>>>>>>` markers + YAML header.
- **D-09:** Override of SYN-07's literal "merge UX deferred to v2" is justified because `git merge-file` collapses that work to one subprocess call. The deferred-to-v2 piece becomes (a) bidirectional sync, (b) rename-map auto-evolution, (c) any conflict-resolution wizard beyond `--accept`.
- **D-10:** Add/delete/rename = surface explicitly, never silent-delete. Adds → `.added.md` sidecar; deletes → `.deleted.md` sidecar; rename = delete+add (no heuristic detection in v1). Sync exits non-zero if any unclassified adds remain.
- **D-11:** Diff scope = `decisions/file-inventory.json` entries with `verdict in {keep, merge}` (361 keep + 7 merge = 368 inventoried target paths in the current inventory). `verdict: drop` ignored. Files in upstream but not in inventory and not in allowlist → "added" path.
- **D-12:** Modified-file conflicts use git-style merge markers + YAML header in `.oto-sync-conflicts/<inventory-target-path>.md`. Header lists `kind`, `upstream`, `prior_tag/sha`, `current_tag/sha`, `target_path`, `inventory_entry`.
- **D-13:** Added/deleted files use suffix-marked sidecars in the same dir: `.oto-sync-conflicts/<path>.added.md`, `.deleted.md`.
- **D-14:** Each sync emits `.oto-sync-conflicts/REPORT.md` with summary + per-section listing. Identical content also appended as a dated section to `.oto-sync/BREAKING-CHANGES-{gsd,superpowers}.md` (committed).
- **D-15:** Resolve UX = `oto sync --accept <path>` helper. Validates no markers remain; drops YAML header; writes content to oto/ target; deletes the sidecar. Companions: `--accept-deletion`, `--keep-deleted`. Lives in `bin/lib/sync-accept.cjs`.
- **D-16:** Allowlist tracked in new `decisions/sync-allowlist.json` with the 32-entry `oto_owned_globs` list quoted in the context. `oto_diverged_paths` reserved for future use (empty in v1). Schema lives at `schema/sync-allowlist.json` (hand-rolled validator per Phase 2 D-16 pattern).
- **D-17:** Inventory drift handling = fail-loud. Unknown paths neither in inventory nor allowlist → emit `.added.md` AND warn to stderr. Sync exits non-zero if any unclassified-added paths remain.
- **D-18:** Inventory updates are user-driven, not auto-generated. Sync prints suggested entries to stderr but does NOT modify `file-inventory.json`.
- **D-19:** Single `oto sync` subcommand dispatched from `bin/install.js` into `bin/lib/sync-cli.cjs`. Shape:
  ```
  oto sync --upstream {gsd|superpowers|all} --to {<tag>|<sha>|main} [--dry-run] [--apply]
  oto sync --accept <target-path>
  oto sync --accept-deletion <target-path>
  oto sync --keep-deleted <target-path>
  oto sync --status
  ```
  Default mode is `--dry-run` (preview only); `--apply` required to actually write.
- **D-20:** Sub-stage scripts also runnable independently for advanced use: `node scripts/sync-upstream/pull-gsd.cjs --to v1.39.0`; `node scripts/sync-upstream/rebrand.cjs --upstream gsd`; `node scripts/sync-upstream/merge.cjs --upstream gsd [--apply]`.
- **D-21:** Phase 9 ships 8 named `tests/phase-09-*.test.cjs` files (pull-puller, rebrand-sync, merge-3way, merge-add-delete, allowlist, accept-helper, report, cli.integration) using `node:test`, hand-rolled assertions, fixture upstream via `git init --bare` (no network), `os.tmpdir()/oto-sync-test-<random>/` + `t.after()` cleanup. Zero new dependencies.
- **D-22 (implicit, from Pitfall 12):** `last-synced-commit.json` always records the resolved 40-char SHA so re-runs are reproducible even if branches move.

### Claude's Discretion (research and recommend)

Listed in `09-CONTEXT.md` <decisions> "Claude's Discretion" subsection. Items the planner is empowered to decide:

1. Exact filenames within the `tests/phase-09-*` namespace (the 8 listed are starting points).
2. Whether to factor `bin/lib/sync-{pull,merge,accept,cli}.cjs` as a `bin/lib/sync/` subdirectory or keep flat under `bin/lib/`.
3. Whether `--dry-run` for the orchestrator skips the pull stage (no network calls in dry-run) or only the merge writes.
4. Whether `oto sync --status` is implemented in v1 or deferred.
5. Exact YAML header field shape in conflict sidecars (D-12) — names listed are starting points.
6. Whether to emit a per-conflict `.resolved-suggestion.md` file showing `git merge-file --diff3` output (common ancestor between markers).
7. Whether `git clone --depth 1` covers SHA pinning fully or whether a fallback `git fetch <sha>` is needed.

This research deepens each of these in `## Open Questions` and `## Code Examples`.

### Deferred Ideas (OUT OF SCOPE)

Quoted verbatim from `09-CONTEXT.md` <deferred>:

- Bidirectional sync (push oto improvements upstream) — REQUIREMENTS SYN-V2-02.
- Automated rename-map evolution from upstream PR diffs — REQUIREMENTS SYN-V2-03.
- Heuristic rename detection — currently delete+add per D-10. Re-evaluate at first sync where this hurts.
- Conflict-resolution wizard / merge UX richer than `--accept` — v2 SYN-V2-01.
- CHANGELOG ingestion (auto-populate BREAKING-CHANGES.md from upstream's CHANGELOG.md) — v2 enhancement.
- CI promotion of sync tests — Phase 10 (CI-01..02) owns.
- Network-dependent integration tests — Phase 10 + ongoing CI candidate.
- `oto sync --status` — Convenience subcommand; Claude's discretion.
- Sync against forks or alternative upstream remotes — v1 hard-codes the two upstream URLs.
- Inventory schema additions surfaced by sync — Track as Phase-1-maintenance follow-ups.
- Bidirectional rebrand-engine evolution — Phase 2 maintenance work, not Phase 9.

The planner MUST NOT propose these as in-scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SYN-01 | `scripts/sync-upstream/pull-gsd.cjs` — fetch GSD `main`/tag/SHA, snapshot to `.oto-sync/upstream/gsd/` | "Fetch Mechanism: `git clone --depth 1 --branch`" + bare-repo fixture pattern (verified live) |
| SYN-02 | `scripts/sync-upstream/pull-superpowers.cjs` — same for Superpowers | Shared `bin/lib/sync-pull.cjs::pullUpstream(name, url, ref, destDir)` helper (D-07) |
| SYN-03 | `scripts/sync-upstream/rebrand.cjs` — apply rename map to upstream snapshot | `scripts/rebrand/lib/engine.cjs::run({mode:'apply', target, out, force})` reused verbatim (411 LOC, already shipped Phase 2) |
| SYN-04 | `scripts/sync-upstream/merge.cjs` — diff rebranded snapshot vs `oto/` tree, surface conflicts | `git merge-file -p` exit-code semantics (live-verified: 0 = clean, N = conflict hunks, 255 = error); `child_process.spawnSync` invocation (live-verified) |
| SYN-05 | Per-upstream `last-synced-commit.json` records last applied upstream SHA | JSON schema in `schema/sync-allowlist.json` companion + `last-synced-commit.json` schema; hand-rolled validator (Phase 2 D-16 pattern at `scripts/rebrand/lib/validate-schema.cjs` — 88 LOC) |
| SYN-06 | Per-upstream `BREAKING-CHANGES.md` log captures upstream removals/renames | Append-only log; one section per sync event, identical content as REPORT.md |
| SYN-07 | "Sync v1 = rename + conflict surfacing only; 3-way merge UX deferred to v2" — **OVERRIDDEN** by user-locked bar (D-08, D-09) | `git merge-file` is a subprocess delegation, not an oto-built merge UX; SYN-07's spirit (no oto-built UI) preserved while delivering the user's "no manual editing for non-conflicts" requirement |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

These are binding for every Phase 9 deliverable. The planner MUST verify compliance:

1. **Node 22+ CommonJS at the top level.** All Phase 9 code is `.cjs` (or `.js` shipped as raw — no transpilation).
2. **Zero new top-level dependencies.** Git is already required (used by `git merge-file` per D-08); no `npm install` is permitted in Phase 9. No `simple-git`, no `js-yaml`, no `ajv`.
3. **No top-level TypeScript.** Optional `sdk/` subpackage uses TypeScript; Phase 9 does NOT touch `sdk/`.
4. **No top-level build step.** Ship raw `.cjs`/`.js`/`.md` — Phase 9 adds no compile step.
5. **`node:test` for tests.** No Vitest, no Jest, no AVA. Hand-rolled `assert`-style assertions per Phase 5/6/8 precedent.
6. **`bin/lib/*.cjs` factoring** — every module independently `node:test`-able, exports plain functions. Phase 9 extends with `sync-pull.cjs`, `sync-merge.cjs`, `sync-accept.cjs`, `sync-cli.cjs` (or a `bin/lib/sync/` subdir per Claude's-discretion item).
7. **Hand-rolled JSON Schema validation** for any new schemas. Pattern: `scripts/rebrand/lib/validate-schema.cjs` (Phase 2 D-16). `schema/sync-allowlist.json` follows.
8. **Mac is primary; Windows is out of scope.** No CRLF normalization, no symlink-elevation logic. (Confirmed in REQUIREMENTS.md "Out of Scope".)
9. **GSD workflow enforcement is active** — file-changing tools in this repo must be invoked through a GSD command (planner runs `/oto-plan-phase`, executor runs `/oto-execute-phase`).

## Summary

Phase 9 is a **pull → rebrand → diff → surface** pipeline that operationalizes "track upstream" without forcing the user to merge text by hand. The single most important architectural decision (D-08) is to delegate the actual 3-way merge to `git merge-file -p` rather than re-implement diff/merge in JavaScript. Every other decision in the phase flows from this: it dictates the snapshot layout (we need a "prior rebranded" tree to use as the merge base), the failure modes (`git merge-file` exits with N = number of unmerged hunks), the conflict-file format (git's own marker syntax), and the test fixture shape (three trees per merge test).

**Live-verified facts about the load-bearing tooling on this machine** (Apple Git 2.39.3, Node 22.17.1):

1. `git merge-file -p A B C` returns exit code 0 for clean merge, 1+ for N conflict hunks, **255 for errors** (e.g., file missing). The phase must distinguish 0 / N / 255 — the CONTEXT's "exit code > 0" simplification glosses over the error case.
2. `git merge-file` requires `-L <name>` (not `--label <name>` as written informally in CONTEXT D-08); CONTEXT example must be corrected.
3. `git clone --depth 1 --branch <SHA>` **fails** ("Remote branch <sha> not found") even on git 2.39 — `--branch` accepts only refs, never raw SHAs. Fallback (full clone + `git checkout <sha>`) is mandatory, not optional. Confirms Claude's Discretion question 7.
4. `git clone --depth 1` against a local path emits a "--depth is ignored in local clones" warning; tests using bare-repo fixtures must use `file://$PWD/upstream.git` URLs to keep the depth flag honest.
5. `git merge-file --diff3` produces useful 5-section markers (`<<< cur / ||| base / === / other / >>>`) showing the common ancestor. Recommend emitting this **alongside** the standard 3-section format as a `.resolved-suggestion.md` only when the user explicitly opts in via flag — adds noise to the primary conflict file.
6. `git merge-file` refuses to merge binary files (output: `error: Cannot merge binary files`, exit 0 with stderr message — surprising). Phase 9 must detect binary content **before** invoking and route binary changes to the conflict surface as `.added.md`/`.deleted.md` style sidecars rather than passing them to merge-file.
7. CRLF differences are preserved verbatim (no auto-normalization). Mac is primary, so this is a non-issue per CLAUDE.md, but document it.
8. Marker size is configurable via `--marker-size=N` — useful only if upstream content already contains `<<<<<<<` markers (e.g., upstream docs that show merge conflict examples). Defer unless a real fixture surfaces it.

**Primary recommendation:** Build six new files: `bin/lib/sync-pull.cjs`, `bin/lib/sync-merge.cjs`, `bin/lib/sync-accept.cjs`, `bin/lib/sync-cli.cjs`, `decisions/sync-allowlist.json`, `schema/sync-allowlist.json`. Three sub-stage scripts (`scripts/sync-upstream/pull-{gsd,superpowers}.cjs`, `rebrand.cjs`, `merge.cjs`) each ~30-80 LOC delegating to the `bin/lib` modules. Wire `oto sync` as a new dispatch case in `bin/install.js` (currently only handles `install`/`uninstall`). Eight `phase-09-*.test.cjs` files per D-21, all using `git init --bare` fixtures so the suite runs offline.

## Standard Stack

### Core (already in repo, reused verbatim)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `node:child_process` | Node 22 builtin | Spawn `git merge-file`, `git clone`, `git checkout` | Zero-dep, already used in `tests/phase-08-smoke-codex.integration.test.cjs` `[VERIFIED: file at tests/phase-08-codex-toml.test.cjs]` |
| `node:fs` / `node:fs/promises` | Node 22 builtin | Snapshot rotation, conflict-file emission, JSON read/write | Used throughout `scripts/rebrand/lib/engine.cjs` `[VERIFIED]` |
| `node:path` | Node 22 builtin | Cross-platform path joining | Standard |
| `node:os` | Node 22 builtin | `os.tmpdir()` for test fixtures | D-21 mandates this; Phase 8 tests use it `[VERIFIED]` |
| `node:test` | Node 22 builtin | Test runner for all 8 `phase-09-*.test.cjs` files | CLAUDE.md mandate; Phase 5/6/8 precedent `[VERIFIED]` |
| `node:assert/strict` | Node 22 builtin | Hand-rolled assertions | Phase 8 pattern `[VERIFIED at tests/phase-08-codex-toml.test.cjs:3]` |
| `node:crypto` | Node 22 builtin | SHA hashing for snapshot dedup detection (optional) | Already used in `engine.cjs:339` `[VERIFIED]` |
| `node:util.parseArgs` | Node 22 builtin | CLI flag parsing in sub-stage scripts | Already the convention — `scripts/rebrand.cjs:4` `[VERIFIED]` |
| `git` (system binary) | ≥ 2.39 (verified on dev machine) | `git clone`, `git merge-file`, `git checkout`, `git rev-parse` | Already a hard requirement of the repo (used by D-08) |

### Reused oto code (NOT a dependency, just a call into existing modules)

| Module | Path | Used For |
|--------|------|----------|
| Rebrand engine | `scripts/rebrand/lib/engine.cjs::run({mode:'apply', target, out, force})` | SYN-03 — `scripts/sync-upstream/rebrand.cjs` is a 30-line wrapper that calls `engine.run()` with sync-specific paths `[VERIFIED at scripts/rebrand/lib/engine.cjs:375-409]` |
| Schema validator | `scripts/rebrand/lib/validate-schema.cjs::validate(data, schema)` | SYN-04/D-16 — validate `decisions/sync-allowlist.json` and `last-synced-commit.json` against their schemas. Hand-rolled, supports `const`, `enum`, `type`, `pattern`, `properties`, `required`, `oneOf`, `allOf`, `$ref` `[VERIFIED at scripts/rebrand/lib/validate-schema.cjs:1-88]` |
| Inventory loader | `scripts/rebrand/lib/engine.cjs::buildInventoryMap()` (or copy the 8-line pattern) | D-11 — read `decisions/file-inventory.json` and build a `Map<path, entry>` by `path` key (note: keyed by upstream `path`, not `target_path`) `[VERIFIED at scripts/rebrand/lib/engine.cjs:48-58]` |
| File walker | `scripts/rebrand/lib/walker.cjs::walk(target, allowlist, inventoryByPath)` | Could be reused for "what's in the rebranded snapshot vs inventory?" detection (D-17 unclassified-add path) |

### Alternatives Considered

| Instead of | Could Use | Why Rejected |
|------------|-----------|--------------|
| `git merge-file` subprocess | Pure-JS 3-way merge (`diff3` library, hand-rolled Myers diff) | D-08 locked. `diff3` is an npm dep; CLAUDE.md zero-deps policy bans it. Hand-rolled 3-way is multiple weeks of work for zero benefit when git ships the algorithm. |
| `git clone --depth 1 --branch <ref>` | `git fetch + git archive` (download tarball) | D-06 locked. Tarball requires HTTP auth handling for private upstreams; `git clone` reuses user's existing git credentials. |
| YAML front-matter via regex | `js-yaml` npm dep | Zero-dep policy. The YAML header is **only ever produced and consumed by oto** — full YAML compatibility unneeded. A 20-line regex extractor + a 30-line emitter handles the fixed shape exactly (see Code Examples below). |
| `simple-git` library | Direct `child_process.spawn` to git | Zero-dep policy. We use a tiny subset of git operations (clone, checkout, merge-file, rev-parse, ls-remote). A 60-line `bin/lib/sync-pull.cjs` is simpler than learning a wrapper API. |
| AJV validator | Existing hand-rolled `validate-schema.cjs` | Phase 2 D-16 lock — already shipping; reuse. |

**Installation:** No `npm install` required. Phase 9 adds zero dependencies.

**Version verification:** Not applicable — no new packages. Confirmed git 2.39.3 and Node 22.17.1 are present and adequate `[VERIFIED via Bash: git --version, node --version]`.

## Architecture Patterns

### Recommended Project Structure (Phase 9 additions)

```
bin/
  install.js                       # gains 'sync' subcommand dispatch (~10 LOC)
  lib/
    sync-pull.cjs                  # NEW: pullUpstream(name, url, ref, destDir) → {tag, sha}
    sync-merge.cjs                 # NEW: 3-way merge orchestration via git merge-file
    sync-accept.cjs                # NEW: --accept / --accept-deletion / --keep-deleted helpers
    sync-cli.cjs                   # NEW: oto sync flag parser + stage dispatcher
    # OR: bin/lib/sync/ subdirectory (Claude's-discretion item; recommendation in Open Questions)

scripts/
  sync-upstream/                   # NEW directory
    pull-gsd.cjs                   # SYN-01 thin wrapper (~30 LOC)
    pull-superpowers.cjs           # SYN-02 thin wrapper (~30 LOC)
    rebrand.cjs                    # SYN-03 thin wrapper around engine.run() (~50 LOC)
    merge.cjs                      # SYN-04 main work (~150-200 LOC)

decisions/
  sync-allowlist.json              # NEW: D-16 32-entry oto_owned_globs list

schema/
  sync-allowlist.json              # NEW: hand-rolled-validator-compatible schema
  last-synced-commit.json          # NEW: schema for the per-upstream pin record

.oto-sync/                         # NEW (gitignored except metadata)
  upstream/{gsd,superpowers}/{prior,current}/   # gitignored
  rebranded/{gsd,superpowers}/{prior,current}/  # gitignored
  last-synced-commit.json                       # COMMITTED (per-upstream merged)
  BREAKING-CHANGES-gsd.md                       # COMMITTED audit log
  BREAKING-CHANGES-superpowers.md               # COMMITTED audit log

.oto-sync-conflicts/               # NEW (gitignored — working files)
  REPORT.md                                     # regenerated each sync
  <inventory-target-path>.md                    # modified-file conflicts (D-12)
  <path>.added.md                               # added sidecars (D-13)
  <path>.deleted.md                             # deleted sidecars (D-13)

tests/
  phase-09-pull-puller.test.cjs        # SYN-01, SYN-02, SYN-05
  phase-09-rebrand-sync.test.cjs       # SYN-03
  phase-09-merge-3way.test.cjs         # SYN-04 happy path
  phase-09-merge-add-delete.test.cjs   # SYN-04 add/delete/unknown D-10/D-17
  phase-09-allowlist.test.cjs          # D-16/D-17
  phase-09-accept-helper.test.cjs      # D-15
  phase-09-report.test.cjs             # SYN-06/D-14
  phase-09-cli.integration.test.cjs    # D-19 end-to-end

  fixtures/phase-09/
    bare-upstream-gsd.tar             # OR a pre-canned bare repo dir
    bare-upstream-superpowers.tar
    sample-inventory.json             # subset for allowlist + drift tests
    three-version-trio/               # base+cur+other for merge tests
      base.txt
      current.txt
      other.txt
```

### Pattern 1: 3-Way Merge via `git merge-file` Subprocess

**What:** For each inventory-tracked file present in both prior-rebranded and current-rebranded snapshots, invoke `git merge-file -p` with `oto/<target>` as `<current-file>`, prior-rebranded version as `<base-file>`, current-rebranded version as `<other-file>`. Stdout is the merged content; exit code distinguishes outcomes.

**When to use:** D-08 mandates this for every modified-file diff in the sync pipeline.

**Live-verified exit code semantics:**
- Exit 0 + stdout = clean merge content → write directly to `oto/<target>`
- Exit 1..N + stdout containing `<<<<<<<`/`=======`/`>>>>>>>` markers = N conflict hunks → write to `.oto-sync-conflicts/<target>.md` with YAML header
- Exit 255 + stderr starting with `error: Could not stat` = a referenced file is missing → fail loud with diagnostics; do not write anything

**Important: binary file refusal.** When invoked on binary content, `git merge-file` exits 0 with stderr `error: Cannot merge binary files: <name>` and writes nothing useful. The merger MUST detect binary content before invocation (a simple `Buffer.indexOf(0)` check in the first 8KB is sufficient) and route binary changes to the `.added.md`/`.deleted.md` sidecar surface instead.

**Example invocation (live-verified via `child_process.spawnSync`):**

```javascript
// Source: hand-verified during Phase 9 research, 2026-05-04
// Equivalent CLI: git merge-file -p -L oto-current -L prior-rebranded -L upstream-rebranded \
//                                   <oto/target> <prior-snapshot> <current-snapshot>
const { spawnSync } = require('node:child_process');

function threeWayMerge(otoPath, basePath, otherPath) {
  const result = spawnSync('git', [
    'merge-file', '-p',
    '-L', 'oto-current',
    '-L', 'prior-rebranded',
    '-L', 'upstream-rebranded',
    otoPath, basePath, otherPath,
  ], { encoding: 'utf8' });

  if (result.status === null) {
    throw new Error(`git merge-file did not run: ${result.error?.message}`);
  }
  if (result.status === 255) {
    // File missing or other fatal error
    throw new Error(`git merge-file failed: ${result.stderr.trim()}`);
  }
  return {
    clean: result.status === 0,
    conflictHunks: result.status,  // 0 if clean, N if N hunks
    content: result.stdout,
    stderr: result.stderr,
  };
}
```

`[VERIFIED: live test on git 2.39.3, Apple Git-146]`

### Pattern 2: Snapshot Rotation (D-02)

**What:** On each sync, rename `current/` → `prior/` and clone the new ref into `current/`. The first-ever sync has no `prior/` — handle this case explicitly.

**When to use:** Every `pullUpstream()` invocation.

**Edge case (first sync):** If `prior/` doesn't exist after clone, the merger has no base for 3-way merge. Treat every inventory-tracked file as "modified" with the rebranded-current content; either auto-apply (file content equals `oto/`'s already) or surface as a conflict (any difference). This means the **first sync after Phase 9 ships will surface every drifting file** — expected, not a bug. Document this behavior in DOC-03 (Phase 10).

**Concrete implementation:**

```javascript
// bin/lib/sync-pull.cjs (sketch)
async function rotateSnapshots(syncDir) {
  const prior = path.join(syncDir, 'prior');
  const current = path.join(syncDir, 'current');
  if (await pathExists(prior)) await fsp.rm(prior, { recursive: true, force: true });
  if (await pathExists(current)) await fsp.rename(current, prior);
  // current/ is now empty; caller will clone into it.
}
```

**Recommendation:** Use `fs.rename` (atomic on same filesystem), NOT symlinks (CLAUDE.md OUT-OF-SCOPE: Windows symlink elevation; same-FS rename is also faster than symlink shuffle). Rejected the symlink option from CONTEXT D-02.

### Pattern 3: Tag-Pin with SHA Fallback (D-05, D-06)

**What:** `git clone --depth 1 --branch <ref>` works for tags and branches but **NOT raw SHAs** `[VERIFIED: returns "Remote branch <sha> not found"]`. SHA-pin requires full clone + `git checkout <sha>`.

**When to use:** Every `pullUpstream(name, url, ref, destDir)` call.

```javascript
// bin/lib/sync-pull.cjs (sketch)
function classifyRef(ref) {
  if (/^[0-9a-f]{40}$/.test(ref)) return 'sha';
  if (ref === 'main' || ref === 'master') return 'branch';
  // Tag heuristic: starts with 'v' and a digit, or 'release-', etc.
  // Or: try clone --branch first; on failure, check if it's a SHA.
  return 'tag-or-branch';
}

function cloneAtRef(url, ref, destDir) {
  const kind = classifyRef(ref);
  if (kind === 'sha') {
    runGit(['clone', url, destDir]);
    runGit(['checkout', ref], { cwd: destDir });
    return;
  }
  try {
    runGit(['clone', '--depth', '1', '--branch', ref, url, destDir]);
  } catch (err) {
    // Fallback: maybe ref looked like a tag but was a SHA in disguise
    runGit(['clone', url, destDir]);
    runGit(['checkout', ref], { cwd: destDir });
  }
}
```

After clone, **always** resolve the actual 40-char SHA via `git rev-parse HEAD` and persist it in `last-synced-commit.json` along with the human ref the user supplied (D-05/D-22 reproducibility requirement).

`[VERIFIED: live test 2026-05-04 — full clone + checkout SHA path works on git 2.39.3]`

### Pattern 4: YAML Header Without a YAML Dep

**What:** D-12's conflict-file YAML header is fixed-shape, oto-only, and never round-tripped through arbitrary YAML. Use a fixed regex to extract and a string template to emit.

**Emission (deterministic):**

```javascript
// bin/lib/sync-merge.cjs (sketch)
function emitYamlHeader(meta) {
  // meta has fixed keys: kind, upstream, prior_tag, prior_sha, current_tag,
  // current_sha, target_path, inventory_entry
  const lines = [
    '---',
    `kind: ${meta.kind}`,
    `upstream: ${meta.upstream}`,
    `prior_tag: ${meta.prior_tag}`,
    `prior_sha: ${meta.prior_sha}`,
    `current_tag: ${meta.current_tag}`,
    `current_sha: ${meta.current_sha}`,
    `target_path: ${meta.target_path}`,
    `inventory_entry: ${JSON.stringify(meta.inventory_entry)}`,
    '---',
    '',
  ];
  return lines.join('\n');
}
```

**Extraction (for `--accept` validation):**

```javascript
// bin/lib/sync-accept.cjs (sketch)
const HEADER_RE = /^---\n([\s\S]*?\n)---\n/;

function stripYamlHeader(content) {
  const match = HEADER_RE.exec(content);
  if (!match) throw new Error('Conflict file missing YAML header');
  // Optionally parse meta — for v1, just strip and continue
  return content.slice(match[0].length);
}

function refuseIfMarkersRemain(content) {
  if (/^<{7}|^={7}|^>{7}/m.test(content)) {
    throw new Error('Refusing to accept: <<<<<<< / ======= / >>>>>>> markers still present');
  }
}
```

**Recommendation:** Define a tight schema for `meta` (planner records final field names in PLAN.md per CONTEXT note on D-12) and validate via existing `validate-schema.cjs` before emit. `inventory_entry` should be JSON-stringified (one-line) since YAML's nested-object syntax adds parser cost we don't need.

### Pattern 5: Bare-Repo Test Fixture (D-21)

**What:** Use `git init --bare` to create a fixture upstream repo, scripted commits + tags drive deterministic test states. No network, no mocking — real subprocess calls exercise the real code path.

**Live-verified pattern:**

```javascript
// tests/phase-09-pull-puller.test.cjs (sketch)
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

function git(args, opts = {}) {
  return spawnSync('git', args, {
    encoding: 'utf8',
    env: { ...process.env, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t.test',
                            GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t.test' },
    ...opts,
  });
}

async function setupFixture() {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), 'oto-sync-test-'));
  const bare = path.join(root, 'upstream.git');
  git(['init', '--bare', bare]);
  const work = path.join(root, 'work');
  // IMPORTANT: file:// URL so --depth 1 actually applies; bare local paths trigger
  // "warning: --depth is ignored in local clones".
  git(['clone', `file://${bare}`, work]);
  await fsp.writeFile(path.join(work, 'README.md'), 'hello\n');
  git(['add', '.'], { cwd: work });
  git(['commit', '-m', 'init'], { cwd: work });
  git(['tag', 'v1.0.0'], { cwd: work });
  git(['push', 'origin', 'main', 'v1.0.0'], { cwd: work });
  return { root, bare, work };
}

test('pullUpstream clones at tag and records resolved SHA', async (t) => {
  const fixture = await setupFixture();
  t.after(() => fsp.rm(fixture.root, { recursive: true, force: true }));
  // ... call pullUpstream('gsd', `file://${fixture.bare}`, 'v1.0.0', destDir)
  // ... assert last-synced-commit.json has { tag: 'v1.0.0', sha: <40-char> }
});
```

`[VERIFIED: bare-repo + tag-pin clone path exercised live 2026-05-04]`

### Anti-Patterns to Avoid

- **Mocking `git`.** Real subprocess calls are zero-dep and catch git-version-specific quirks (the `--depth 1` warning was discovered live by NOT mocking). Mocking `child_process.spawnSync` makes the test green while the real code fails.
- **Network-dependent tests.** Phase 9 tests MUST run offline. Use `file://` URLs against `git init --bare` fixtures. CI machines may not have network; user might run tests on a plane.
- **Re-implementing `git merge-file` in JS.** Re-litigated by D-08; do not propose. The full Myers + diff3 algorithm is multiple thousand lines of correctness-critical code with edge cases git has decades of test coverage on.
- **Adding `js-yaml`/`simple-git`/`ajv`.** CLAUDE.md zero-deps policy. Hand-roll the 30-line equivalent.
- **Symlinking `prior` → `current`.** Same-FS `fs.rename` is atomic, simpler, and avoids Windows symlink-elevation issues (out of scope but the reasoning is "don't add complexity for zero benefit").
- **Trusting `--branch <SHA>` to work.** It doesn't `[VERIFIED]`. Always classify and dispatch.
- **Ignoring `git merge-file` exit code 255.** It's not a "conflict" — it's an error. Conflating it with N>0 will make the user think they have conflicts to resolve when really the merger crashed. Distinguish 0 / 1..N / 255 explicitly.
- **Passing binary files to `git merge-file`.** Detect and route to sidecar surface.
- **Hand-editing `last-synced-commit.json`.** It's machine-written; the user updates the inventory and re-runs sync, never the pin file directly.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 3-way text merge | Pure-JS diff/patch/merge | `git merge-file -p` subprocess | Decades of edge-case coverage; D-08 lock |
| Tag-pinned snapshot fetch | HTTP tarball download + extraction | `git clone --depth 1 --branch <ref>` | Reuses git credentials; D-06 lock |
| YAML parser | `js-yaml` | Fixed-shape regex extract + string-template emit | Header is oto-only and fixed-shape; zero-dep policy |
| JSON schema validator | `ajv` | Existing `scripts/rebrand/lib/validate-schema.cjs` | Phase 2 D-16 lock; already shipping |
| Glob matching for allowlist | `minimatch` | Hand-rolled glob → regex (already used in `scripts/rebrand/lib/walker.cjs::compileAllowlist`) | Zero-dep policy; existing pattern |
| Rebrand engine | New copy in `scripts/sync-upstream/` | `scripts/rebrand/lib/engine.cjs::run({mode:'apply'})` | Phase 2 ship; same engine, different `--target`/`--out` |
| Conflict marker syntax | Custom oto markers (`<<< OTO ...`) | Standard git markers (`<<<<<<<` etc.) | Every editor / tool understands these; emit via `git merge-file` directly |
| Diff visualization | Print-side-by-side renderer | git's own `<<<<<<<`/`>>>>>>>` markers (or `--diff3` 5-section) | Already in stdout from `git merge-file`; the planner gets prose for `BREAKING-CHANGES.md` for free |

**Key insight:** Phase 9's job is **plumbing**, not algorithms. Every algorithmic operation (text merge, glob match, JSON validation, rebrand transform) is already shipped or already a binary on PATH. Phase 9 wires them together.

## Runtime State Inventory

> Phase 9 introduces new runtime state but doesn't rename or migrate existing state. The "what's already on disk" question reduces to: what does Phase 9 produce that future syncs depend on?

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None pre-existing — Phase 9 creates `.oto-sync/last-synced-commit.json` (per upstream) and `BREAKING-CHANGES-{gsd,superpowers}.md` from empty initial state | First-run code path must handle "no prior pin" gracefully; first-run snapshot rotation must skip the "rename current → prior" step when `current/` doesn't exist yet |
| Live service config | None — sync is purely a local-filesystem operation. No external services, no database, no daemon | None |
| OS-registered state | None — no scheduled tasks, no launchd plists, no systemd units. Sync runs only when the user invokes `oto sync` | None |
| Secrets/env vars | None at v1 — both upstreams are public GitHub repos cloned over HTTPS without auth. (User's existing git credentials handle private clones if they ever swap upstream URLs in v2 — out of scope) | None |
| Build artifacts / installed packages | None — no compile, no transpile, no `npm install`. Phase 9 ships raw `.cjs` and reads `package.json` only to read `version` for stamping `BREAKING-CHANGES.md` headers | None |

**Nothing found in any category that requires migration or post-install cleanup.** Phase 9 is greenfield: every artifact it touches is born from this phase. The first-sync edge case (no `prior/` snapshot to rotate) is the only "pre-existing state" concern, and it's handled in `pullUpstream()` per Pattern 2 above.

## Common Pitfalls

### Pitfall 1: Conflating "exit > 0" with "conflict"

**What goes wrong:** Code reads `git merge-file -p` exit code, treats anything non-zero as "merge had conflicts," surfaces an `.oto-sync-conflicts/` file. User opens it. There are no conflict markers — the file is the unmerged base because git couldn't `stat` one of the input paths.

**Why it happens:** CONTEXT D-08 simplifies "exit code > 0 (N conflict hunks remain)." Live test `[VERIFIED]`: exit 255 means "error: Could not stat /path: No such file or directory" written to stderr and the input file written to stdout unchanged.

**How to avoid:** Distinguish three exit-code regions:
- 0 → clean merge → write to `oto/`
- 1..N (N typically < 100 in practice) → conflict → write to `.oto-sync-conflicts/` with header
- 255 (or any other value) → error → throw with stderr included

**Warning sign:** Conflict file with no `<<<<<<<` markers; stderr contains `error: Could not stat`.

### Pitfall 2: SHA passed as `--branch`

**What goes wrong:** User runs `oto sync --to <40-char-sha>`. Code uses `git clone --depth 1 --branch <sha>`. Git reports `Remote branch <sha> not found in upstream origin` and exits non-zero.

**Why it happens:** `--branch` accepts ref names (tags, branches), not commit SHAs `[VERIFIED]`.

**How to avoid:** Classify the ref before clone. Tag/branch → `--depth 1 --branch <ref>`; SHA (40-char hex) → full clone + `git checkout <sha>`.

**Warning sign:** "Remote branch ... not found" error in `oto sync` output.

### Pitfall 3: First-sync rotation crash

**What goes wrong:** `pullUpstream` tries to rename `.oto-sync/upstream/gsd/current` → `.../prior` on the first run, but `current/` doesn't exist. Code crashes; no atomic recovery.

**Why it happens:** Snapshot rotation pattern assumes prior state exists.

**How to avoid:** `if (await pathExists(current)) { rename(...) }` guard. First sync ends with `current/` populated and no `prior/` — explicitly document the merger's first-run behavior (every modified file looks like a divergence; user accepts or resolves).

**Warning sign:** `ENOENT: no such file or directory, rename ...` on first sync.

### Pitfall 4: Binary file fed to `git merge-file`

**What goes wrong:** A PNG, a SQLite file, or any binary in the inventory gets passed to `git merge-file -p`. Git writes `error: Cannot merge binary files: <name>` to stderr and exits 0 with empty stdout. Auto-apply path treats this as "clean merge" and overwrites `oto/<binary>` with empty content.

**Why it happens:** Live-verified `[VERIFIED]`: `git merge-file` refuses binary content but doesn't signal conflict via exit code.

**How to avoid:** Pre-flight binary detection. Read first 8KB of all three files; if any contains a NUL byte, route to `.added.md`/`.deleted.md` sidecar surface (binary diffs aren't text-mergeable; user must replace the file wholesale).

```javascript
function looksBinary(buf) {
  const slice = buf.subarray(0, Math.min(buf.length, 8192));
  return slice.indexOf(0) !== -1;
}
```

**Warning sign:** Empty `oto/<some-binary-path>` after sync; stderr has "Cannot merge binary files."

### Pitfall 5: `--depth 1` ignored on local clones

**What goes wrong:** Tests use `git clone --depth 1 /path/to/bare.git work`. Git emits warning "--depth is ignored in local clones; use file:// instead" and clones the full history. Tests still pass but no longer exercise the depth-1 production path.

**Why it happens:** Live-verified `[VERIFIED]`: git treats local file paths as "local clones" and disables depth optimization unless URL is `file://`.

**How to avoid:** All test fixtures use `file://${path}` URLs. Production code paths use real HTTPS URLs (already remote, depth-1 honored).

**Warning sign:** Warning text in test stderr; subtle behavior drift between test and prod.

### Pitfall 6: `git merge-file` reorders `-L` arguments unexpectedly

**What goes wrong:** Code passes `-L oto-current -L prior-rebranded -L upstream-rebranded` and assumes labels appear in `<<<<<<<`/`=======`/`>>>>>>>` markers in that order. Actual order: first `-L` labels the **current** file (oto), second `-L` labels the **base** file (prior-rebranded), third `-L` labels the **other** file (upstream-rebranded). The conflict marker order in stdout is `<<<<<<< current-label / ======= / >>>>>>> other-label`. The base label only shows up with `--diff3`.

**Why it happens:** Easy to confuse positional ordering of `git merge-file <current> <base> <other>` with label order.

**How to avoid:** Test fixture asserts explicit string matches on the conflict markers (`<<<<<<< oto-current`, `>>>>>>> upstream-rebranded`). Lock the convention in a comment at the top of `bin/lib/sync-merge.cjs`.

**Warning sign:** Conflict file labels swapped, user sees `<<<<<<< prior-rebranded` (which would be confusing — the base shouldn't appear in markers without `--diff3`).

### Pitfall 7: Allowlist drift — Phase 8 file added but not in `oto_owned_globs`

**What goes wrong:** A future phase adds `bin/lib/foo-transform.cjs`. Sync runs against an upstream with no equivalent, sees a file in `oto/bin/lib/` that's not in `decisions/file-inventory.json` (because it's oto-owned, not from an upstream), and `decisions/sync-allowlist.json::oto_owned_globs` doesn't list it either. Sync emits `bin/lib/foo-transform.cjs.added.md` and exits non-zero.

**Why it happens:** Allowlist requires manual maintenance every time oto adds an oto-owned file outside the inventory.

**How to avoid:** **Allowlist completeness regression test** (CONTEXT specifics §"Allowlist completeness is verifiable"). `phase-09-allowlist.test.cjs` runs sync against `foundation-frameworks/get-shit-done-main/` symlinked into `.oto-sync/upstream/gsd/current/` and asserts ZERO unclassified-add paths. Catches missing allowlist entries before they ship. Future phases that add oto-owned files MUST update the allowlist or this test fails.

**Warning sign:** Sync run on an unmodified upstream surfaces unclassified adds.

### Pitfall 8: Glob pattern subtlety in `oto_owned_globs`

**What goes wrong:** Allowlist contains `decisions/**` but also `decisions/file-inventory.json`. The glob matcher matches both, but the inventory IS read by sync — not skipped. User assumes `**` = "ignore everything under" but the merger needs to read inventory. Confusion ensues.

**Why it happens:** "Allowlist" semantically means "sync skips these for diff-vs-upstream comparison" not "sync ignores these entirely." The inventory file is consulted by sync to decide what's in scope.

**How to avoid:** Document the semantic clearly in `schema/sync-allowlist.json` description fields and in DOC-03 (Phase 10). The allowlist is "files where oto's copy is canonical and upstream changes are not surfaced for review." Files like `decisions/file-inventory.json` are oto-owned (allowlisted) AND read by sync code — these are different concerns.

**Warning sign:** None at runtime — confusion only manifests during DOC-03 authoring or first-sync user experience.

### Pitfall 9: `git --version` parsing fragility

**What goes wrong:** Code parses `git --version` output as `git version 2.39.3 (Apple Git-146)` and asserts `major >= 1 && minor >= 7` (per CONTEXT specifics). Some homebrew or Linux distributions emit different formats; parser breaks.

**Why it happens:** `git --version` output format is loosely standardized.

**How to avoid:** Use a lenient regex (`/git version (\d+)\.(\d+)/`) and only assert the absolute floor (`>= 2.0` is generous; git 1.7 from 2010 is the actual `git merge-file` floor but anyone running git that old has bigger issues). Fail loud with the literal output if the regex doesn't match: "Could not parse git version: '<output>'. oto sync requires git ≥ 2.0 on PATH."

**Warning sign:** `oto sync` aborts with "git version too old" on a machine that clearly has modern git.

### Pitfall 10: Re-pull of identical SHA wastes time + churns disk

**What goes wrong:** User runs `oto sync --upstream gsd --to v1.39.0` twice. Second run re-clones, re-rebrands, re-merges — all idempotent but expensive (multi-MB clone, 700+-file rebrand walk, 368-file merge loop).

**Why it happens:** Naive code always pulls.

**How to avoid:** Compare resolved SHA against `last-synced-commit.json::sha`. If equal AND `current/` snapshot exists AND no conflicts pending → short-circuit ("Already at v1.39.0; nothing to do."). Use `git ls-remote <url> <ref>` to resolve the SHA before clone — single network call.

```javascript
function resolveSha(url, ref) {
  // git ls-remote returns "<sha>\t<refname>\n"
  const r = spawnSync('git', ['ls-remote', url, ref], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`ls-remote failed: ${r.stderr}`);
  const line = r.stdout.split('\n').find(Boolean);
  return line && line.split('\t')[0];
}
```

**Warning sign:** None at runtime — perf complaint from user after first real-world sync.

## Code Examples

### Example 1: `bin/lib/sync-pull.cjs::pullUpstream`

```javascript
// Sketch — final implementation in plan
'use strict';
const path = require('node:path');
const fsp = require('node:fs/promises');
const { spawnSync } = require('node:child_process');

function git(args, opts = {}) {
  const r = spawnSync('git', args, { encoding: 'utf8', ...opts });
  if (r.status !== 0) {
    const cmd = `git ${args.join(' ')}`;
    throw new Error(`${cmd} failed (status ${r.status}):\n${r.stderr}`);
  }
  return r.stdout;
}

function isSha(ref) { return /^[0-9a-f]{40}$/i.test(ref); }

async function pullUpstream({ name, url, ref, destDir }) {
  // 1. Rotate
  const prior = path.join(destDir, 'prior');
  const current = path.join(destDir, 'current');
  if (await pathExists(prior)) await fsp.rm(prior, { recursive: true, force: true });
  if (await pathExists(current)) await fsp.rename(current, prior);

  // 2. Clone
  if (isSha(ref)) {
    git(['clone', url, current]);
    git(['checkout', ref], { cwd: current });
  } else {
    try {
      git(['clone', '--depth', '1', '--branch', ref, url, current]);
    } catch (err) {
      // Fallback: maybe ref is unusual; do a full clone + checkout
      git(['clone', url, current]);
      git(['checkout', ref], { cwd: current });
    }
  }

  // 3. Resolve SHA + persist pin
  const sha = git(['rev-parse', 'HEAD'], { cwd: current }).trim();
  const pinFile = path.join(destDir, 'last-synced-commit.json');
  const record = { upstream: name, ref_kind: isSha(ref) ? 'sha' : 'tag-or-branch',
                   ref, sha, timestamp: new Date().toISOString() };
  await fsp.writeFile(pinFile, JSON.stringify(record, null, 2) + '\n');

  // 4. Warn on branch pin (Pitfall 12)
  if (ref === 'main' || ref === 'master') {
    process.stderr.write(`oto sync: warning — branch pin '${ref}' drifts silently between syncs. Prefer a tag.\n`);
  }
  return record;
}

async function pathExists(p) { try { await fsp.access(p); return true; } catch { return false; } }

module.exports = { pullUpstream };
```

### Example 2: `bin/lib/sync-merge.cjs::mergeOneFile`

```javascript
'use strict';
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

function looksBinary(buf) {
  const slice = buf.subarray(0, Math.min(buf.length, 8192));
  return slice.indexOf(0) !== -1;
}

function readBuf(p) { try { return fs.readFileSync(p); } catch { return null; } }

async function mergeOneFile({ otoPath, basePath, otherPath, targetPath, meta }) {
  const otoBuf = readBuf(otoPath);
  const baseBuf = readBuf(basePath);
  const otherBuf = readBuf(otherPath);

  // Add: not in oto, not in base, present in other
  if (otoBuf == null && baseBuf == null && otherBuf != null) {
    return { kind: 'added', content: otherBuf };
  }
  // Delete: present in oto, present in base, not in other
  if (otoBuf != null && baseBuf != null && otherBuf == null) {
    return { kind: 'deleted', content: baseBuf };
  }
  // Modified-on-both: 3-way merge candidate
  if ([otoBuf, baseBuf, otherBuf].some((b) => b == null)) {
    throw new Error(`mergeOneFile: unexpected null trio for ${targetPath}`);
  }
  if (looksBinary(otoBuf) || looksBinary(baseBuf) || looksBinary(otherBuf)) {
    return { kind: 'binary', content: otherBuf };  // route to .added.md surface
  }

  const r = spawnSync('git', [
    'merge-file', '-p',
    '-L', 'oto-current',
    '-L', 'prior-rebranded',
    '-L', 'upstream-rebranded',
    otoPath, basePath, otherPath,
  ], { encoding: 'utf8' });

  if (r.status === null || r.status === 255 || r.status < 0) {
    throw new Error(`git merge-file errored on ${targetPath}: ${r.stderr.trim()}`);
  }

  if (r.status === 0) return { kind: 'clean', content: r.stdout };
  return { kind: 'conflict', content: r.stdout, hunks: r.status };
}

module.exports = { mergeOneFile, looksBinary };
```

### Example 3: `schema/sync-allowlist.json` (hand-rolled-validator-compatible)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://github.com/OTOJulian/oto-hybrid-framework/schema/sync-allowlist.json",
  "type": "object",
  "required": ["version", "oto_owned_globs", "oto_diverged_paths"],
  "additionalProperties": false,
  "properties": {
    "version": { "type": "string", "const": "1" },
    "oto_owned_globs": {
      "type": "array",
      "minItems": 1,
      "items": { "type": "string", "minLength": 1 }
    },
    "oto_diverged_paths": {
      "type": "array",
      "items": { "type": "string", "minLength": 1 }
    }
  }
}
```

### Example 4: `schema/last-synced-commit.json`

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://github.com/OTOJulian/oto-hybrid-framework/schema/last-synced-commit.json",
  "type": "object",
  "required": ["upstream", "ref_kind", "ref", "sha", "timestamp"],
  "additionalProperties": false,
  "properties": {
    "upstream": { "type": "string", "enum": ["gsd", "superpowers"] },
    "ref_kind": { "type": "string", "enum": ["tag", "branch", "sha", "tag-or-branch"] },
    "ref": { "type": "string", "minLength": 1 },
    "sha": { "type": "string", "pattern": "^[0-9a-f]{40}$" },
    "timestamp": { "type": "string", "minLength": 1 }
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom JS 3-way merge / `diff` libs | `git merge-file -p` subprocess | D-08 lock | Zero new deps; battle-tested algorithm; standard markers |
| `simple-git` wrapper for clone | Direct `child_process` to git | CLAUDE.md zero-deps | One fewer dep; tiny wrapper LOC |
| In-process YAML parser | Regex header extraction | Header is fixed-shape | Zero parser deps |
| Manual ref → SHA detection by trial | `git ls-remote` short-circuit | Pitfall 10 mitigation | Fast no-op syncs |

**Deprecated/outdated:**
- `--label` flag for `git merge-file` (CONTEXT D-08 informal text uses this; the actual flag is `-L` `[VERIFIED]`). Planner must correct in PLAN.md.
- "exit code > 0" simplification for `git merge-file` (CONTEXT D-08 doesn't distinguish 1..N from 255 `[VERIFIED]`). Planner must distinguish.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | All inventory entries with `verdict in {keep, merge}` have a `target_path` field present and well-formed | Pattern 1 / D-11 | If a `keep` entry has no `target_path`, merger must skip or fail-loud; planner should add a pre-flight inventory validation step that checks this invariant `[ASSUMED — verified for the first 3 keep entries via grep but not exhaustively]` |
| A2 | The 32-entry `oto_owned_globs` list in CONTEXT D-16 is complete vis-à-vis Phases 1–8 deliverables (i.e., no oto-owned file in the current repo would surface as an unclassified add when sync runs against `foundation-frameworks/get-shit-done-main/`) | D-16 / Pitfall 7 | If incomplete, the allowlist-completeness regression test will fail in Phase 9, forcing a CONTEXT amendment. Planner SHOULD run a preview check in Wave 0 (load `decisions/file-inventory.json`, walk `foundation-frameworks/get-shit-done-main/`, compute the would-be conflict set against the proposed allowlist, surface missing entries) `[ASSUMED]` |
| A3 | `git ls-remote` against the GSD/Superpowers public GitHub repos completes in < 5 seconds with the user's existing git credentials | Pitfall 10 / Open Q9 | If slow, `--status` and the dedup check feel sluggish. Mitigation: `--status` skips network call; main flow caches. `[ASSUMED — based on typical github.com latency]` |
| A4 | The user's `~/.gitconfig` doesn't set `merge.conflictStyle = diff3` globally (which would silently change `git merge-file` default output to 5-section markers) | Pattern 1 | If true, oto's marker-based logic still works (5-section markers contain `<<<<<<<`/`=======`/`>>>>>>>` superset). But test fixtures that grep for exact 3-section output may fail on the developer machine. Recommendation: pass `-c merge.conflictStyle=merge` explicitly in the `git merge-file` invocation to override user config. `[ASSUMED]` |
| A5 | None of the 368 inventory-tracked files (361 keep + 7 merge) are binary | Pattern 1 / Pitfall 4 | Most are markdown/JS/JSON, so this is highly likely. But if any binary slipped in (assets, screenshots), the binary-detection guard catches it gracefully. `[ASSUMED — high confidence, but not exhaustively grep-verified]` |
| A6 | The CONTEXT-listed `oto_owned_globs` glob `foundation-frameworks/**` is intentional and matches the project decision that `foundation-frameworks/` is the immutable reference baseline (Phase 2 ship state) | D-16 | If `foundation-frameworks/` is meant to track upstream automatically, the allowlist is wrong. CONTEXT D-01 confirms it stays immutable, so this is correct. `[VERIFIED via D-01]` |
| A7 | `git rev-parse HEAD` after `git checkout <sha>` (the SHA-pin fallback) returns the requested SHA, even in detached-HEAD state | Pattern 3 | Standard git behavior; very high confidence. Test asserts this in `phase-09-pull-puller.test.cjs`. `[ASSUMED — standard git semantics]` |

**If this table is empty:** All claims in this research were verified or cited — no user confirmation needed.

The above seven items are flagged for user/planner attention. None block the phase from being planned; A1 and A2 should be checked in Wave 0 as preflight assertions.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `git` (system binary) | D-06 (clone), D-08 (merge-file), D-22 (rev-parse) | ✓ | 2.39.3 (Apple Git-146) `[VERIFIED]` | None — fail loud at startup if `git --version` doesn't return cleanly. Min version: 2.0 (lenient; git 1.7 actually supports merge-file but anyone running 1.7 has bigger issues). |
| Node.js | All `.cjs` files | ✓ | 22.17.1 `[VERIFIED]` | None — `bin/install.js:4-8` already enforces Node ≥ 22 |
| Network access (HTTPS to github.com) | Production sync (puller) | Assumed at runtime; not at test time | — | Tests use `git init --bare` + `file://` URLs → fully offline. Production sync fails loud if network is down (`git clone` returns non-zero). |
| `node:test` runner | All 8 `phase-09-*.test.cjs` files | ✓ (built into Node 22) | — | None needed |
| `chmod +x` tooling | None — scripts are run via `node script.cjs`, not as bare executables | ✓ | — | N/A |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** None.

**Environmental notes:**
- The project's existing `tests/` directory has 79 `.test.cjs` files (`[VERIFIED]`) — Phase 9 adds 8 more. The 4-way concurrency setting in `scripts/run-tests.cjs` (per Phase 5/6/8 precedent) handles this fine.
- `foundation-frameworks/get-shit-done-main/CHANGELOG.md` (2609 lines `[VERIFIED]`) confirms Pitfall 4's "extremely volatile" characterization — recent versions show breaking SDK refactors, hook-source-format changes, and command-prefix migration (`/gsd:` → `/gsd-`). This is exactly the volatility class Phase 9 is built to absorb.

## Validation Architecture

> Phase config: `workflow.nyquist_validation = true` `[VERIFIED at .planning/config.json]`. This section is REQUIRED.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | `node:test` (built into Node 22.17.1) |
| Config file | None — runner is `scripts/run-tests.cjs` (per Phase 5/6/8 convention) |
| Quick run command | `node --test --test-concurrency=4 tests/phase-09-*.test.cjs` |
| Full suite command | `node scripts/run-tests.cjs` |
| Phase gate | All `tests/phase-09-*.test.cjs` files green AND full suite green before `/oto-verify-work` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| SYN-01 | `pull-gsd.cjs` clones GSD at requested ref into `.oto-sync/upstream/gsd/current/` | unit + integration | `node --test tests/phase-09-pull-puller.test.cjs` | ❌ Wave 0 |
| SYN-01 | Snapshot rotation: previous `current/` becomes `prior/`; first sync skips rotation | unit | `node --test tests/phase-09-pull-puller.test.cjs` | ❌ Wave 0 |
| SYN-01 | Tag-pin path uses `--depth 1 --branch <tag>` against `file://` bare-repo fixture | integration | `node --test tests/phase-09-pull-puller.test.cjs` | ❌ Wave 0 |
| SYN-01 | SHA-pin path falls back to full clone + `git checkout <sha>` | integration | `node --test tests/phase-09-pull-puller.test.cjs` | ❌ Wave 0 |
| SYN-02 | `pull-superpowers.cjs` differs from `pull-gsd.cjs` only in URL constant | unit | `node --test tests/phase-09-pull-puller.test.cjs` | ❌ Wave 0 |
| SYN-03 | `scripts/sync-upstream/rebrand.cjs` invokes engine with sync-specific paths and produces byte-identical output to direct `engine.run({mode:'apply'})` invocation | unit | `node --test tests/phase-09-rebrand-sync.test.cjs` | ❌ Wave 0 |
| SYN-03 | Sync rebrand never modifies `foundation-frameworks/` | invariant | `node --test tests/phase-09-rebrand-sync.test.cjs` | ❌ Wave 0 |
| SYN-04 | 3-way merge: non-overlapping line edits → exit 0, content auto-applied to `oto/` | unit | `node --test tests/phase-09-merge-3way.test.cjs` | ❌ Wave 0 |
| SYN-04 | 3-way merge: same-line clash → exit > 0, conflict file emitted with markers + YAML header | unit | `node --test tests/phase-09-merge-3way.test.cjs` | ❌ Wave 0 |
| SYN-04 | 3-way merge: file missing → exit 255 → throw with diagnostic stderr (Pitfall 1) | unit | `node --test tests/phase-09-merge-3way.test.cjs` | ❌ Wave 0 |
| SYN-04 | Binary file detection: route to sidecar surface, not `git merge-file` (Pitfall 4) | unit | `node --test tests/phase-09-merge-3way.test.cjs` | ❌ Wave 0 |
| SYN-04 / D-10 | Added file: not in inventory + not in allowlist → `.added.md` sidecar emitted | unit | `node --test tests/phase-09-merge-add-delete.test.cjs` | ❌ Wave 0 |
| SYN-04 / D-10 | Deleted file: present in prior, missing in current → `.deleted.md` sidecar emitted | unit | `node --test tests/phase-09-merge-add-delete.test.cjs` | ❌ Wave 0 |
| SYN-04 / D-17 | Unclassified-add path causes non-zero exit even if all other merges clean | integration | `node --test tests/phase-09-merge-add-delete.test.cjs` | ❌ Wave 0 |
| SYN-04 / D-16 | Allowlist completeness: sync against `foundation-frameworks/get-shit-done-main/` produces 0 unclassified adds (Pitfall 7) | regression | `node --test tests/phase-09-allowlist.test.cjs` | ❌ Wave 0 |
| SYN-04 / D-16 | Glob match: `bin/lib/codex-toml.cjs` (in allowlist) is never compared against upstream | unit | `node --test tests/phase-09-allowlist.test.cjs` | ❌ Wave 0 |
| SYN-04 / D-12 | Conflict file YAML header has all required fields (kind, upstream, prior_tag, prior_sha, current_tag, current_sha, target_path, inventory_entry) | unit | `node --test tests/phase-09-merge-3way.test.cjs` | ❌ Wave 0 |
| SYN-05 | `last-synced-commit.json` written after each pull with both ref and 40-char SHA | unit | `node --test tests/phase-09-pull-puller.test.cjs` | ❌ Wave 0 |
| SYN-05 | `last-synced-commit.json` validates against `schema/last-synced-commit.json` | unit | `node --test tests/phase-09-pull-puller.test.cjs` | ❌ Wave 0 |
| SYN-06 | `BREAKING-CHANGES-{gsd,superpowers}.md` appended (not overwritten) on each sync run | unit | `node --test tests/phase-09-report.test.cjs` | ❌ Wave 0 |
| SYN-06 / D-14 | `REPORT.md` regenerated each sync with auto-merged / conflict / added / deleted counts | unit | `node --test tests/phase-09-report.test.cjs` | ❌ Wave 0 |
| SYN-07 (override) | `oto sync --upstream gsd --to <fixture-tag>` end-to-end against bare-repo fixture: pull → rebrand → merge → REPORT.md emitted | integration | `node --test tests/phase-09-cli.integration.test.cjs` | ❌ Wave 0 |
| D-15 | `oto sync --accept <path>` strips YAML header, validates no markers remain, writes to oto/, deletes sidecar | unit | `node --test tests/phase-09-accept-helper.test.cjs` | ❌ Wave 0 |
| D-15 | `oto sync --accept <path>` refuses with non-zero exit if `<<<<<<<` markers still present | unit | `node --test tests/phase-09-accept-helper.test.cjs` | ❌ Wave 0 |
| D-15 | `oto sync --accept-deletion <path>` removes file from oto/ and updates inventory verdict | unit | `node --test tests/phase-09-accept-helper.test.cjs` | ❌ Wave 0 |
| D-19 | `oto sync` flag parser: `--upstream`, `--to`, `--apply`, `--dry-run`, `--accept`, `--status` parsed correctly | unit | `node --test tests/phase-09-cli.integration.test.cjs` | ❌ Wave 0 |
| D-19 | `bin/install.js` dispatches `oto sync ...` to `bin/lib/sync-cli.cjs` | unit | `node --test tests/phase-09-cli.integration.test.cjs` | ❌ Wave 0 |
| (Pitfall 12) | `--main` ref emits stderr warning before clone | unit | `node --test tests/phase-09-pull-puller.test.cjs` | ❌ Wave 0 |
| (Pitfall 9) | `git --version` parsing: lenient regex; fail-loud with literal output if unparseable | unit | `node --test tests/phase-09-cli.integration.test.cjs` | ❌ Wave 0 |
| (Pitfall 10) | Re-pull of identical SHA short-circuits via `git ls-remote` SHA comparison | unit (or defer to v2 if Claude's-discretion) | `node --test tests/phase-09-pull-puller.test.cjs` | ❌ Wave 0 |

### Falsifiable Assertions (per requirement)

- **SYN-01:** After `pullUpstream({name:'gsd', url, ref:'v1.0.0', destDir})` against bare-repo fixture, `destDir/current/README.md` exists AND `destDir/last-synced-commit.json` parses to `{upstream:'gsd', ref:'v1.0.0', sha:/^[0-9a-f]{40}$/, ...}`.
- **SYN-04 (clean merge):** Given `base="a\nb\nc\n"`, `cur="A\nb\nc\n"`, `other="a\nb\nC\n"`, `mergeOneFile()` returns `{kind:'clean', content:"A\nb\nC\n"}`.
- **SYN-04 (conflict):** Given `base="a\nb\nc\n"`, `cur="a\nX\nc\n"`, `other="a\nY\nc\n"`, `mergeOneFile()` returns `{kind:'conflict', content:/<<<<<<< oto-current\nX\n=======\nY\n>>>>>>> upstream-rebranded/, hunks:1}`.
- **SYN-05:** `last-synced-commit.json` validates against `schema/last-synced-commit.json` via `validate-schema.cjs::validate()`. Empty `errors` array is success.
- **SYN-06:** After two consecutive syncs with different tags, `BREAKING-CHANGES-gsd.md` length increases monotonically AND contains both tag refs.
- **D-12:** `extractYamlHeader(conflictFile)` returns object with all 8 required keys.
- **D-15 (refusal):** `acceptConflict('/tmp/has-markers.md')` throws Error with `/markers still present/` in message.
- **D-16 (allowlist completeness):** Running full sync pipeline with `foundation-frameworks/get-shit-done-main/` as upstream produces `unclassifiedAddCount === 0`.

### Sampling Rate

- **Per task commit:** `node --test tests/phase-09-*.test.cjs` (the 8 phase tests; ~30 sec)
- **Per wave merge:** `node scripts/run-tests.cjs` (full suite of 79+8 = 87 test files; should run under 60 sec at concurrency 4)
- **Phase gate:** Full suite green before `/oto-verify-work`

### Wave 0 Gaps

Eight test files MUST be created in Wave 0 with `t.todo()` scaffolds (per Phase 5/6/8 precedent at `tests/phase-08-*.test.cjs`). The orchestrator will fail any planner output that ships test bodies before scaffolds exist.

- [ ] `tests/phase-09-pull-puller.test.cjs` — covers SYN-01, SYN-02, SYN-05, Pitfalls 2/3/9/12
- [ ] `tests/phase-09-rebrand-sync.test.cjs` — covers SYN-03
- [ ] `tests/phase-09-merge-3way.test.cjs` — covers SYN-04 happy path + D-12 + Pitfalls 1/4/6
- [ ] `tests/phase-09-merge-add-delete.test.cjs` — covers SYN-04 + D-10 + D-17
- [ ] `tests/phase-09-allowlist.test.cjs` — covers D-16 + D-17 + Pitfall 7 (allowlist completeness)
- [ ] `tests/phase-09-accept-helper.test.cjs` — covers D-15
- [ ] `tests/phase-09-report.test.cjs` — covers SYN-06 + D-14
- [ ] `tests/phase-09-cli.integration.test.cjs` — covers D-19 end-to-end + Pitfalls 9/12

**Shared fixtures (Wave 0):**
- [ ] `tests/fixtures/phase-09/bare-upstream/` — script that builds a `git init --bare` repo with 3 tags (`v1.0.0`, `v1.1.0`, `v1.2.0`) demonstrating: a non-overlapping edit between v1.0.0→v1.1.0, a same-line conflict between v1.1.0→v1.2.0, and an added file at v1.2.0.
- [ ] `tests/fixtures/phase-09/sample-inventory.json` — minimal subset of `decisions/file-inventory.json` for unit tests (avoids loading the full 1128-entry production inventory in unit tests).
- [ ] `tests/fixtures/phase-09/sample-allowlist.json` — minimal `oto_owned_globs` for unit tests.
- [ ] `tests/fixtures/phase-09/three-version-trio/` — `base.txt`, `current.txt`, `other.txt` for direct `mergeOneFile` unit tests (parallels Phase 8's fixture pattern).

**Test framework install:** None — `node:test` is builtin.

### Behaviors Too Expensive to Test (Enforce at Runtime)

- **Network availability** — production sync fails loud if `git clone` exits non-zero. No unit test for "no network" — the `git clone` failure naturally surfaces.
- **Disk space** — production sync writes ~10-50 MB per upstream snapshot (×2 for prior+current). No unit test; user observes ENOSPC.
- **Concurrent sync invocations** — no lock file in v1; user is expected not to run two `oto sync` in parallel. Document in DOC-03; consider lock file in v2 if user reports issues.
- **Partial-clone resumption** — `git clone` is atomic-ish; if interrupted, the destination dir is half-populated. Production code MUST `fsp.rm(destDir, {recursive: true, force: true})` on caught error before retry. Tested by deliberately interrupting `pullUpstream` in `phase-09-pull-puller.test.cjs` (advanced, optional).

## Open Questions (RESOLVED)

1. **`bin/lib/sync/` subdirectory vs flat under `bin/lib/`?** (Claude's-discretion #2)
   - **What we know:** Existing `bin/lib/` has 15 modules, including 5 codex/gemini-prefixed (`codex-toml.cjs`, `codex-transform.cjs`, `codex-profile.cjs`, `gemini-transform.cjs`) and one `runtime-matrix.cjs`. The flat structure is the established convention.
   - **What's unclear:** Whether 4 new sync-prefixed modules tip the balance toward subdirectory grouping.
   - **Recommendation:** Keep flat. Four files isn't enough to justify a subdirectory; introducing `bin/lib/sync/` while keeping `bin/lib/codex-toml.cjs` flat creates inconsistency. Refactor when the count grows (e.g., v2 adds `sync-bidirectional.cjs`, `sync-rename-detector.cjs`).

2. **Does `--dry-run` for the orchestrator skip the pull stage?** (Claude's-discretion #3)
   - **What we know:** D-19 says default mode is `--dry-run`. Pull is a network call (slow) and writes to disk (`current/` snapshot); rebrand is local-CPU; merge is local-CPU.
   - **What's unclear:** Whether dry-run should preview "what would change" without actually pulling, or whether it should pull but not write to `oto/`.
   - **Recommendation:** Dry-run skips the pull's effect on `prior/`/`current/` rotation but DOES need the new snapshot to compute the diff preview. Compromise: dry-run pulls into a tmp dir (`os.tmpdir()/oto-sync-dryrun-<rand>/`) without rotating the persistent snapshot. `--apply` does the persistent rotation. This way `--dry-run` shows the user "what would happen" with full fidelity but doesn't churn disk between previews.

3. **Implement `oto sync --status` in v1?** (Claude's-discretion #4)
   - **What we know:** `--status` would read: `last-synced-commit.json` per upstream + walk `.oto-sync-conflicts/` for pending sidecars + count REPORT.md categories.
   - **Cost-benefit:** ~30-50 LOC. The user runs sync interactively, so seeing pending state is plausibly useful between invocations.
   - **Recommendation:** Ship in v1. Cheap, ergonomic, fits CONTEXT D-19 explicit list. Output format: tabular per-upstream summary (last synced ref, last synced timestamp, pending conflicts count by kind).

4. **Exact YAML header field shape (D-12)?** (Claude's-discretion #5)
   - **What we know:** CONTEXT lists 8 fields as starting points: `kind, upstream, prior_tag, prior_sha, current_tag, current_sha, target_path, inventory_entry`.
   - **Unclear:** Whether `inventory_entry` should be inlined (one-line JSON) or expanded YAML; whether `timestamp` and `oto_version` should be added.
   - **Recommendation:** Add `timestamp` (ISO-8601) and `oto_version` for forensic traceability. Inline `inventory_entry` as one-line JSON to avoid YAML nesting. Final 10-field shape: `kind, upstream, prior_tag, prior_sha, current_tag, current_sha, target_path, inventory_entry, timestamp, oto_version`. Lock in PLAN.md.

5. **Emit `--diff3` 5-section markers as `.resolved-suggestion.md`?** (Claude's-discretion #6)
   - **What we know:** `--diff3` shows the common ancestor between the conflict markers — sometimes useful for the user to see "what was the original?". Live-verified pattern: `<<<<<<< / ||||||| / ======= / >>>>>>>`.
   - **Cost:** One extra `git merge-file --diff3` invocation per conflict file; one extra sidecar.
   - **Recommendation:** Skip in v1. The user rarely wants four versions side-by-side; the standard 3-section markers + the YAML header that points to the prior tag are sufficient for forensic reconstruction. Re-evaluate if user reports wanting it. Saves ~20 LOC and one disk write per conflict.

6. **`git ls-remote` SHA dedup short-circuit (Pitfall 10)?**
   - **What we know:** Cheap (one network round-trip), 5-15 LOC.
   - **Recommendation:** Ship in v1. Don't litigate again.

7. **Should the sync stage scripts (`scripts/sync-upstream/*.cjs`) be `.js` or `.cjs`?**
   - **What we know:** All 33 GSD library files are `.cjs`; `scripts/rebrand.cjs` is `.cjs`. Top-level `scripts/build-hooks.js` and `scripts/install-smoke.cjs` show inconsistency (`.js` vs `.cjs`).
   - **Recommendation:** `.cjs` for all four sync scripts. Matches the `scripts/rebrand.cjs` precedent. The `.js` choice in `scripts/build-hooks.js` is pre-CLAUDE.md-stack-doc; treat `.cjs` as the canonical going-forward choice.

8. **Should `pull-gsd.cjs` and `pull-superpowers.cjs` actually exist as separate files, or be a single `pull.cjs --upstream <name>`?**
   - **What we know:** SYN-01 and SYN-02 explicitly call out two files. D-07 says they "differ only in the upstream URL constant."
   - **Recommendation:** Ship two files (per requirements). 30 LOC each is acceptable. Both delegate to `bin/lib/sync-pull.cjs::pullUpstream`. Keeps requirements 1:1 with deliverables; future v2 (per-upstream diverging logic) doesn't need a refactor.

9. **What's the minimum git version the production code asserts?**
   - **What we know:** CONTEXT specifies "≥ 1.7" (which is when `git merge-file` first shipped in 2010). Live-verified working on 2.39.3 today.
   - **Recommendation:** Lenient — assert `≥ 2.0` (enough to cover modern features and recent security patches; anyone running 1.x has bigger problems). Fail-loud with literal output of `git --version` if regex doesn't match.

10. **How do we handle the `foundation-frameworks/` directory in `oto_owned_globs` (D-16) given that's the immutable Phase 2 baseline?**
    - **Resolution:** Already explicit in CONTEXT D-16's listed glob: `foundation-frameworks/**`. This means sync NEVER tries to compare anything in `foundation-frameworks/` to upstream. Perfect — `foundation-frameworks/` is reference-only. `[VERIFIED via D-01 + D-16]`

## Sources

### Primary (HIGH confidence — verified live or read from repo)

- `git --version` (live: 2.39.3 Apple Git-146); `git merge-file --help` (live behavior verification)
- `node --version` (live: 22.17.1)
- `bin/install.js` (oto top-level dispatcher) — confirmed dispatch shape and Node 22+ guard
- `scripts/rebrand.cjs` + `scripts/rebrand/lib/engine.cjs` (411 LOC) + `scripts/rebrand/lib/validate-schema.cjs` (88 LOC) + `scripts/rebrand/lib/walker.cjs` (105 LOC) — engine reuse contract
- `tests/phase-08-codex-toml.test.cjs` and `tests/phase-08-instruction-file-render.test.cjs` — Phase 8 test pattern Phase 9 follows (D-21)
- `decisions/file-inventory.json` (1128 entries, 361 keep + 7 merge + 760 drop) — diff scope (D-11)
- `schema/rename-map.json` — schema pattern Phase 9 mirrors
- `.planning/phases/09-upstream-sync-pipeline/09-CONTEXT.md` — locked decisions
- `.planning/REQUIREMENTS.md` — SYN-01..07 source of truth
- `.planning/ROADMAP.md` — phase ordering and SYN-07 literal text
- `.planning/STATE.md` — 8 phases complete, Phase 9 ready
- `CLAUDE.md` (project root) — tech stack TL;DR, zero-deps mandate, node:test mandate
- `.planning/config.json` — Nyquist validation enabled (`true`)
- `foundation-frameworks/get-shit-done-main/CHANGELOG.md` — 2609 lines of volatility evidence

### Secondary (MEDIUM confidence)

- `git-merge-file(1)` man page — sourced via `git merge-file --help` on the dev machine. Standard tool; semantics stable across modern git versions.

### Tertiary (LOW confidence)

- None — all factual claims either live-verified or sourced from in-repo files.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every module is in-repo or builtin; live-verified
- Architecture: HIGH — D-XX decisions are locked, patterns derive directly from them, edge cases live-verified
- Pitfalls: HIGH — 7 of 10 pitfalls were discovered or confirmed live during research; 3 are derived from CONTEXT pitfall references that themselves cite shipped Phase 1–8 evidence
- Validation Architecture: HIGH — every phase requirement maps to ≥ 1 falsifiable assertion runnable in < 30 seconds via `node:test`; fixture pattern verified live

**Research date:** 2026-05-04
**Valid until:** 2026-06-04 (30 days; Phase 9 stack — git, Node, the project's own modules — is stable; no fast-moving libraries are involved)

## RESEARCH COMPLETE
