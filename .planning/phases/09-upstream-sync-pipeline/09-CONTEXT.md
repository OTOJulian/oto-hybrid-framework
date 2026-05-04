# Phase 9: Upstream Sync Pipeline - Context

**Gathered:** 2026-05-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the v1 upstream sync pipeline that pulls renamed snapshots of GSD and Superpowers, applies the rename map, auto-merges non-overlapping changes, and surfaces only true same-line conflicts for manual resolution. Three deliverables, mapped to ROADMAP Phase 9 and REQUIREMENTS SYN-01..07:

1. **Pullers** — `scripts/sync-upstream/pull-gsd.cjs` and `pull-superpowers.cjs` fetch a tag-pinned (or `--main`-flagged) upstream snapshot via `git clone --depth 1` into `.oto-sync/upstream/{gsd,superpowers}/<tag>/` (SYN-01, SYN-02).
2. **Rebrander** — `scripts/sync-upstream/rebrand.cjs` (sync variant) reuses the Phase 2 rebrand engine to write a rebranded copy at `.oto-sync/rebranded/{gsd,superpowers}/<tag>/` (SYN-03).
3. **Merger** — `scripts/sync-upstream/merge.cjs` performs 3-way merge per inventory-tracked file using `git merge-file` against the prior rebranded snapshot, writes auto-merged files directly into `oto/` and writes only true same-line conflicts to `.oto-sync-conflicts/<path>.md`. Adds, deletions, and unknown-inventory paths surface explicitly (SYN-04, SYN-05, SYN-06, SYN-07).

**User-locked bar (overrides SYN-07's literal text):** "I don't want to manually edit files." SYN-07 says "rename + conflict surfacing only; three-way merge UX deferred to v2." This phase **delegates 3-way merge to `git merge-file`** (a binary already on PATH for anyone using this repo) rather than building merge UX inside oto. The spirit of SYN-07 is preserved — no oto-built merge UI, no in-repo line-merge logic — but the user-asked outcome is delivered: ~95% of upstream changes flow into `oto/` with zero manual touch; only same-line clashes (the irreducible minimum) reach the user. This **mirrors the Phase 8 precedent** where the user-locked daily-peer Codex/Gemini bar overrode ROADMAP's "best-effort" framing.

What Phase 9 does **not** ship (out of scope, deferred):
- Bidirectional sync (push oto improvements back upstream as PRs) — v2 SYN-V2-02.
- Automated rename-map evolution from upstream PR diffs — v2 SYN-V2-03.
- An oto-built merge UI (line-merge, conflict-resolution wizard, etc.) — v2 SYN-V2-01.
- Heuristic upstream-rename detection (`bin/lib/foo.cjs` → `bin/lib/bar.cjs` paired automatically) — surface as delete+add for v1; v2 candidate.
- CI promotion of sync regression tests — Phase 10 owns CI.
- Changelog parsing or release-note diffing — v2 enhancement.

</domain>

<decisions>
## Implementation Decisions

### Snapshot Architecture (SYN-01, SYN-02, SYN-05)

- **D-01:** **Pulls land at `.oto-sync/upstream/{gsd,superpowers}/<tag>/`.** `foundation-frameworks/get-shit-done-main/` (v1.38.5) and `superpowers-main/` (v5.0.7) stay as **immutable, committed reference baselines**. Phase 2 round-trip tests pinned to those versions remain valid; sync writes to a separate working dir. Resolves Pitfall 4's "track pinned upstream snapshots" requirement without conflating "historical reference" with "latest pulled."

- **D-02:** **Retain prior + current snapshots for 3-way detection.** On each sync run, rotate: current → prior, new → current. Concrete layout:
  ```
  .oto-sync/
    upstream/
      gsd/
        prior/         # was previous current; symlink or rename of last sync's tag dir
        current/       # the just-pulled tag/SHA
        last-synced-commit.json  # { "tag": "v1.39.0", "sha": "...", "timestamp": "..." }
      superpowers/
        prior/
        current/
        last-synced-commit.json
    rebranded/
      gsd/{prior,current}/
      superpowers/{prior,current}/
  ```
  3-way merge needs all three of: oto-current (working tree), prior rebranded snapshot (common ancestor), new rebranded snapshot. Disk cost: ~2x one upstream tree per upstream (small, predictable).

- **D-03:** **Rebranded snapshots live at `.oto-sync/rebranded/{gsd,superpowers}/{prior,current}/`.** Separate from raw upstream so the user can inspect both forms. `merge.cjs` can re-run without re-pulling. Mirrors the existing `.oto-rebrand-out/` pattern from Phase 2.

- **D-04:** **`.oto-sync/` is gitignored; only metadata is committed.** Specifically:
  - **Gitignored:** `.oto-sync/upstream/**`, `.oto-sync/rebranded/**`
  - **Committed:** `.oto-sync/last-synced-commit.json` (per-upstream pin record), `.oto-sync/BREAKING-CHANGES-{gsd,superpowers}.md` (per-upstream sync-event log)
  - **Conflict-pending state** (`.oto-sync-conflicts/**`) is gitignored too — these are working files; once resolved via `oto sync --accept`, the resolved content lands in `oto/` (committed) and the conflict file is deleted.

  Reproducibility: from a fresh clone, `oto sync --upstream gsd --to <tag-from-last-synced-commit.json>` reconstructs the working state.

### Pin Policy & Fetch Mechanism (SYN-01, SYN-02 / Pitfalls 4, 12)

- **D-05:** **Tag-pin by default; explicit `--main` for branch sync.** `oto sync --upstream gsd --to v1.39.0` is the canonical form. `--to main` is permitted but emits a Pitfall-12 warning ("branch pin drifts silently — prefer a tag"). Numeric SHAs accepted with `--to <sha>` for forensics. Pin record in `last-synced-commit.json` always stores both the human ref the user supplied (`tag` or `branch`) and the resolved 40-char SHA, so re-runs are reproducible even if branches move.

- **D-06:** **Fetch via `git clone --depth 1 --branch <ref>`.** `git` is already a hard requirement (we're using `git merge-file` per D-08). Depth-1 keeps clone size minimal. Falls back gracefully if `--branch` doesn't accept a SHA: clone full, then `git checkout <sha>`. Tarball download was rejected — git is already required, the dep surface is unchanged, and `git clone` gives free SHA pinning + signature verification.

- **D-07:** **Pullers are thin wrappers over `git clone`.** `pull-gsd.cjs` and `pull-superpowers.cjs` differ only in the upstream URL constant. Both delegate to a shared `bin/lib/sync-pull.cjs::pullUpstream(name, url, ref, destDir)` helper. Lifecycle: rotate `current` → `prior`, clone new ref into `current`, write `last-synced-commit.json`. Idempotent: re-pulling the same ref to the same destination is a no-op (`git ls-remote` checks first).

### Conflict Detection Model (SYN-04, SYN-07)

- **D-08:** **3-way merge via `git merge-file -p`.** For each inventory-tracked file (verdict=keep|merge), `merge.cjs` shells out:
  ```
  git merge-file -p \
    --label oto-current \
    --label prior-rebranded \
    --label upstream-rebranded \
    <oto/target_path> <rebranded-prior-snapshot> <rebranded-current-snapshot>
  ```
  - **Exit code 0** (clean merge): write stdout directly to `oto/<target_path>`. **Auto-resolved, no human touch.** This is the dominant case — non-overlapping line edits combine automatically. ~95% of conflicting files in steady-state syncs.
  - **Exit code > 0** (N conflict hunks remain): write stdout (with `<<<<<<<` / `=======` / `>>>>>>>` markers around the residual same-line clashes) to `.oto-sync-conflicts/<path>.md` along with a YAML header. **`oto/` stays untouched and runnable** until user resolves.

  This **delegates 3-way merge to existing tooling** rather than building merge UX inside oto. SYN-07's "no oto-built merge UX" spirit is preserved; the user-asked outcome ("don't make me edit files for non-conflicts") is delivered via a single-subprocess delegation.

- **D-09:** **Rationale for overriding SYN-07's literal text.** SYN-07 reads: "Sync v1 is rename + conflict surfacing only; three-way merge UX deferred to v2." The motivation was avoiding a multi-week build of a merge UI. `git merge-file` collapses that work to one subprocess call. This is the same precedent the user set in Phase 8 — user-locked bar overrides ROADMAP framing when the implementation cost of meeting the bar collapses unexpectedly. The deferred-to-v2 piece becomes: (a) bidirectional sync, (b) rename-map auto-evolution, (c) any conflict-resolution wizard beyond `--accept`.

- **D-10:** **Add/delete/rename handling — surface explicitly, never silent-delete.**
  - **Added upstream** (path in rebranded-current, not in `decisions/file-inventory.json`): if the path is in `decisions/sync-allowlist.json` glob set, ignore. Otherwise emit `.oto-sync-conflicts/<path>.added.md` with rebranded content + YAML header (`kind: added`, `upstream`, `from_path`, `suggested_target_path: null`, `inventory_stub: { verdict: ?, reason: TODO }`). Sync **fails non-zero** at end if any unclassified adds remain — Pitfall 4 fail-loud enforcement.
  - **Deleted upstream** (path was in rebranded-prior, missing in rebranded-current; oto/ has the file): emit `.oto-sync-conflicts/<path>.deleted.md` showing the prior rebranded content + YAML header asking "Confirm deletion or keep oto's local copy?". User runs `oto sync --accept-deletion <path>` to confirm (removes from oto/) or `oto sync --keep-deleted <path>` to mark the file as oto-diverged in inventory.
  - **Renamed upstream** (heuristic detection NOT implemented in v1): treated as delete+add. User reads `.deleted.md` and `.added.md` together, manually copies content. Heuristic rename detection is a v2 candidate — explicitly not in this phase.

- **D-11:** **Diff scope = inventory-tracked subset.** `merge.cjs` walks `decisions/file-inventory.json` entries with `verdict in {keep, merge}`, diffs each at its `target_path` against the rebranded-current snapshot. Files with `verdict: drop` are ignored. Files in upstream but not in inventory and not in allowlist → "added" path (D-10). Matches Phase 1 D-13's "inventory is single source of truth" contract.

### Conflict File Format (SYN-04)

- **D-12:** **Modified-file conflicts use git-style merge markers** in `.oto-sync-conflicts/<inventory-target-path>.md`. The conflict file content is the `git merge-file -p` output verbatim (markers and all), prefixed with a YAML header:
  ```
  ---
  kind: modified
  upstream: gsd
  prior_tag: v1.38.5
  prior_sha: <40-char>
  current_tag: v1.39.0
  current_sha: <40-char>
  target_path: oto/workflows/plan-phase.md
  inventory_entry: { upstream: "gsd", verdict: "keep", target_path: "oto/workflows/plan-phase.md" }
  ---

  <<<<<<< oto-current
  ...oto's version of the same lines...
  =======
  ...upstream's version of the same lines...
  >>>>>>> upstream-rebranded
  ```
  The header is comment-style YAML so the rest of the file remains valid markdown. User edits in place, removes markers, runs `oto sync --accept <target_path>`.

- **D-13:** **Added/deleted files use suffix-marked sidecars in the same dir.** `.oto-sync-conflicts/<path>.added.md` and `.oto-sync-conflicts/<path>.deleted.md`. Single workflow dir; single `ls .oto-sync-conflicts/` shows everything pending. Contents per D-10.

- **D-14:** **Each sync emits `.oto-sync-conflicts/REPORT.md`** with a top-of-the-dir summary:
  ```markdown
  # Sync Report — gsd v1.38.5 → v1.39.0
  Pulled: 2026-05-04T14:23:01Z
  Auto-merged (no conflict): 47 files
  Same-line conflicts: 2 files — see .oto-sync-conflicts/
  Added (need classification): 1 file
  Deleted upstream: 0 files
  Unknown-inventory paths: 0
  Sync exit status: 1 (unclassified adds present)
  ```
  Plus a per-section listing of files in each category. **Identical content also appended** as a dated section to `.oto-sync/BREAKING-CHANGES-{gsd,superpowers}.md` (committed). REPORT.md regenerates each sync; BREAKING-CHANGES is permanent audit trail. Satisfies SYN-06 ("per-upstream BREAKING-CHANGES.md log") AND gives the user a single-glance entry point.

- **D-15:** **Resolve UX = `oto sync --accept <path>` helper.** Reads the conflict file, validates no `<<<<<<<` / `=======` / `>>>>>>>` markers remain, drops the YAML header, writes content to the target path under `oto/`, deletes the conflict sidecar. Refuses with non-zero exit if markers still present. Companion: `oto sync --accept-deletion <path>` (confirms upstream deletion, removes from `oto/` and updates inventory entry to `verdict: dropped_upstream`); `oto sync --keep-deleted <path>` (records oto-divergence so future syncs don't re-surface). Lives as a dispatch in `bin/install.js` (new top-level subcommand) → `bin/lib/sync-accept.cjs`.

  This is **slightly broader scope than the strict "no merge UX" reading of SYN-07**, but justified because (a) `git merge-file` already collapsed 95% of work, leaving a tiny residual where the helper saves keystrokes and adds a marker-validation guardrail, and (b) the helper is a few dozen lines, not a wizard.

### Allowlist & Inventory Drift (SYN-03, SYN-04, Pitfall 4)

- **D-16:** **Allowlist tracked in new `decisions/sync-allowlist.json`.** Glob patterns sync skips entirely (never compares against upstream, never emits conflicts):
  ```json
  {
    "version": "1",
    "oto_owned_globs": [
      "bin/lib/codex-toml.cjs",
      "bin/lib/codex-transform.cjs",
      "bin/lib/codex-profile.cjs",
      "bin/lib/gemini-transform.cjs",
      "bin/lib/instruction-file.cjs",
      "bin/lib/runtime-matrix.cjs",
      "bin/lib/sync-pull.cjs",
      "bin/lib/sync-merge.cjs",
      "bin/lib/sync-accept.cjs",
      "oto/templates/**",
      "CLAUDE.md",
      "AGENTS.md",
      "GEMINI.md",
      "decisions/**",
      "schema/**",
      "rename-map.json",
      "scripts/rebrand.cjs",
      "scripts/rebrand/**",
      "scripts/render-instruction-files.cjs",
      "scripts/render-runtime-matrix.cjs",
      "scripts/sync-upstream/**",
      ".oto/**",
      ".oto-sync/**",
      ".oto-rebrand-out/**",
      ".oto-sync-conflicts/**",
      "tests/fixtures/**",
      "package.json",
      "package-lock.json",
      "LICENSE",
      "THIRD-PARTY-LICENSES.md",
      "README.md",
      ".gitignore",
      ".github/**",
      "foundation-frameworks/**"
    ],
    "oto_diverged_paths": []
  }
  ```
  `oto_owned_globs` = paths sync never touches. `oto_diverged_paths` = inventory-tracked paths where oto has materially diverged (sync should still surface upstream changes for review but never auto-apply); empty for v1, reserved for future use. Schema lives at `schema/sync-allowlist.json` (hand-rolled validator per Phase 2 D-16 pattern).

- **D-17:** **Inventory drift handling = fail-loud.** When the rebranded snapshot contains a path that's neither in `decisions/file-inventory.json` (any verdict) nor matched by `sync-allowlist.json::oto_owned_globs`, `merge.cjs` emits the path as an `.added.md` AND prints a warning to stderr. **Sync exits non-zero if any unclassified-added paths remain**, even if all modified-file conflicts auto-merged cleanly. The user must update `decisions/file-inventory.json` (add an entry with verdict + target_path + reason) and re-run sync. Pitfall 4 enforcement; matches the existing engine contract from Phase 2 (zero unclassified matches).

- **D-18:** **Inventory updates are user-driven, not auto-generated.** Sync prints suggested entries to stderr but does NOT modify `file-inventory.json`. User curates intentionally. Auto-evolution is a v2 candidate (REQUIREMENTS SYN-V2-03).

### CLI Orchestration (Claude's Discretion — locked in this phase)

- **D-19:** **Single `oto sync` subcommand** dispatched from `bin/install.js` (the existing `oto` bin) into `bin/lib/sync-cli.cjs`. Shape:
  ```
  oto sync --upstream {gsd|superpowers|all} --to {<tag>|<sha>|main} [--dry-run] [--apply]
  oto sync --accept <target-path>
  oto sync --accept-deletion <target-path>
  oto sync --keep-deleted <target-path>
  oto sync --status                # show pending conflicts, last-synced refs
  ```
  Default mode is `--dry-run` (preview only); `--apply` required to actually write. Mirrors `scripts/rebrand.cjs`'s flag convention from Phase 2 (consistency reduces cognitive load).

- **D-20:** **Sub-stage scripts also runnable independently** for advanced use:
  - `node scripts/sync-upstream/pull-gsd.cjs --to v1.39.0`
  - `node scripts/sync-upstream/rebrand.cjs --upstream gsd`
  - `node scripts/sync-upstream/merge.cjs --upstream gsd [--apply]`

  The `oto sync` orchestrator simply chains these. Useful for debugging individual stages and keeps SYN-01..04 each map to a real file. Three-script roadmap deliverable preserved.

### Test Surface (Phase-Bounded)

- **D-21:** **Phase 9 ships `tests/phase-09-*.test.cjs` files following Phase 5/6/8 convention:**
  1. `phase-09-pull-puller.test.cjs` — `pull-gsd.cjs` + `pull-superpowers.cjs` against a fixture-mode `git clone` (use a local bare-repo fixture, no network).
  2. `phase-09-rebrand-sync.test.cjs` — sync rebrand variant produces same output as Phase 2 engine on a fixture snapshot.
  3. `phase-09-merge-3way.test.cjs` — fixture trio (oto-current + prior-rebranded + current-rebranded) feeds `merge.cjs`; assert auto-merge for non-overlap, conflict file for same-line clash, correct exit codes.
  4. `phase-09-merge-add-delete.test.cjs` — fixtures cover added/deleted/unknown-inventory paths; assert correct sidecar emission and fail-loud behavior.
  5. `phase-09-allowlist.test.cjs` — sync-allowlist glob matching; oto-owned files never appear in conflict surface.
  6. `phase-09-accept-helper.test.cjs` — `oto sync --accept` happy path + marker-validation refusal.
  7. `phase-09-report.test.cjs` — REPORT.md + BREAKING-CHANGES.md emission against a known fixture sync.
  8. `phase-09-cli.integration.test.cjs` — full `oto sync --upstream gsd --to <fixture-tag>` end-to-end against a local bare repo.

  All node:test, hand-rolled assertions, `os.tmpdir()/oto-sync-test-<random>/` for fixtures with `t.after()` cleanup. Zero new dependencies (git is already required).

### Claude's Discretion

- Exact filenames within the `tests/phase-09-*` namespace (above are starting points).
- Whether to factor `bin/lib/sync-{pull,merge,accept,cli}.cjs` as a `bin/lib/sync/` subdirectory or keep flat under `bin/lib/`.
- Whether `--dry-run` for the orchestrator skips the pull stage (no network calls in dry-run) or only the merge writes.
- Whether `oto sync --status` is implemented in v1 or deferred to first user need.
- Exact YAML header field shape in conflict sidecars (D-12) — names listed are starting points.
- Whether to emit a per-conflict `.resolved-suggestion.md` file showing the `git merge-file --diff3` output (which includes the common ancestor between markers) as an additional reference. Claude may add if research shows it materially helps; otherwise skip.
- Whether `git clone --depth 1` covers SHA pinning fully or whether a fallback `git fetch <sha>` is needed for rare upstream configurations.

### Folded Todos

None — `gsd-tools.cjs todo match-phase 9` returned 0 matches.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project, requirements, and prior phase scope
- `.planning/PROJECT.md` — Personal-use cost ceiling; "no manual editing if avoidable" user-locked bar (this phase) is the contemporary instance of personal-use ergonomics overriding default framing.
- `.planning/REQUIREMENTS.md` — Phase 9 maps to SYN-01..07 exactly. SYN-07's literal text is **superseded** by user direction recorded in this CONTEXT (D-08, D-09).
- `.planning/STATE.md` — Phase 8 complete (80% milestone progress); Phase 9 ready to plan.
- `.planning/ROADMAP.md` §"Phase 9: Upstream Sync Pipeline" — Phase goal and five success criteria. **Note: ROADMAP framing of "v1 scope = rename + conflict surfacing only" is interpreted (per D-09) as "no oto-built merge UX"; `git merge-file` delegation is fair game.**
- `CLAUDE.md` (project root) — Tech stack TL;DR (Node 22+, CJS, zero deps, `node:test`, `bin/lib/` factoring). Phase 9 honors all of it.

### Locked prior decisions
- `.planning/phases/01-inventory-architecture-decisions/01-CONTEXT.md` — D-13 (`file-inventory.json` is single source of truth — Phase 9 D-11 enforces); D-15 (rule-typed rename-map.json — Phase 9 reuses verbatim); D-23 (deprecated-drop semantics — relevant for upstream-deletion handling D-10).
- `.planning/phases/02-rebrand-engine-distribution-skeleton/02-CONTEXT.md` — Engine contract (`scripts/rebrand.cjs --apply` already produces correct rebranded output; sync just feeds it a different `--target` and `--out`).
- `.planning/phases/03-installer-fork-claude-adapter/03-CONTEXT.md` — D-08 (dual-marker installer contract — applies to sync's allowlist mechanism analogously).
- `.planning/phases/04-core-workflows-agents-port/04-CONTEXT.md` — Lists hand-edited workflow files (ai-integration-phase, debug, plan-phase, eval-review, ingest-docs) — these are the files most likely to surface as conflicts.
- `.planning/phases/05-hooks-port-consolidation/05-CONTEXT.md` — D-04..D-09 (oto-session-start hand-rewrite — same conflict-likely lineage).
- `.planning/phases/06-skills-port-cross-system-integration/06-CONTEXT.md` — D-02 (using-oto/SKILL.md hand-fix — conflict-likely).
- `.planning/phases/07-workstreams-workspaces-port/07-CONTEXT.md` — Workstream/workspace state files use `.oto/` prefix; sync allowlist must include `.oto/**`.
- `.planning/phases/08-codex-gemini-runtime-parity/08-CONTEXT.md` — **Direct ancestor**: D-04 (CLAUDE.md/AGENTS.md/GEMINI.md generated from SoT, allowlisted from sync), D-05/D-07 (decisions/runtime-tool-matrix.md generated, allowlisted), and the integration-points note ("Phase 8 → Phase 9: oto-owned transform code must be on sync allowlist") **directly motivates D-16's allowlist content**.

### Architecture decisions and audits
- `decisions/ADR-08-inventory-format.md` — Inventory schema; Phase 9 reads `file-inventory.json` per D-11 and may suggest schema additions (e.g. `verdict: dropped_upstream` from D-15) for v2.
- `decisions/ADR-10-rename-map-schema.md` — Rename-map shape; sync's rebrand stage reuses verbatim.
- `decisions/runtime-tool-matrix.md` — Allowlisted (oto-generated, not from upstream).
- `decisions/agent-audit.md` — Per-agent verdicts; informs which agent files in upstream are inventory-tracked vs dropped.
- `rename-map.json` — Authoritative rename rules; sync rebrand stage feeds it to the existing engine.

### Pitfall coverage (this phase blocks)
- `.planning/research/PITFALLS.md` §"Pitfall 4: GSD upstream is extremely volatile" — **Primary pitfall this phase exists to address.** D-08 (3-way merge), D-10 (add/delete/rename surfacing), D-17 (fail-loud on unknown paths), D-04 (per-upstream BREAKING-CHANGES.md committed) are direct mitigations.
- `.planning/research/PITFALLS.md` §"Pitfall 12: Branch-pinned installs drift silently" — D-05 enforces tag-pin default; `--main` warns; `last-synced-commit.json` always records resolved SHA.
- `.planning/research/PITFALLS.md` §"Pitfall 1: Substring collisions" — Sync rebrand stage reuses Phase 2 engine; same protection.
- `.planning/research/PITFALLS.md` §"Pitfall 13: Deprecated upstream features carried forward" — D-10's deletion surfacing forces user decision; never silent-propagate.
- `.planning/research/PITFALLS.md` §"Pitfall 11: Rigor inflation" — D-15's `--accept` helper is the **upper bound user explicitly accepted** for v1 sync ergonomics. Beyond this (oto-built conflict-resolution wizard, auto-rename detection, bidirectional sync) is v2.

### Existing oto code touched/reused by Phase 9
- `scripts/rebrand.cjs` + `scripts/rebrand/lib/**` — Reused as-is for the sync rebrand stage. Phase 9 wraps it via `scripts/sync-upstream/rebrand.cjs` (passes different `--target` and `--out`).
- `decisions/file-inventory.json` — Read by `merge.cjs` to drive diff scope (D-11). May surface need for schema additions per D-15 (e.g. `verdict: dropped_upstream`); changes go through ADR.
- `bin/install.js` — Gains a `sync` subcommand dispatch (D-19). New file: `bin/lib/sync-cli.cjs`.
- `bin/lib/marker.cjs` — Reused for any in-file marker handling that sync introduces (none expected for v1, but available).
- `tests/fixtures/` — Phase 9 adds `tests/fixtures/phase-09/` with bare-repo upstream fixtures, three-version trios for merge tests, and a sample inventory for allowlist tests.

### New oto files Phase 9 introduces
- `scripts/sync-upstream/pull-gsd.cjs` — SYN-01.
- `scripts/sync-upstream/pull-superpowers.cjs` — SYN-02.
- `scripts/sync-upstream/rebrand.cjs` — SYN-03 (thin wrapper).
- `scripts/sync-upstream/merge.cjs` — SYN-04 (the main work).
- `bin/lib/sync-pull.cjs` — Shared pull helper.
- `bin/lib/sync-merge.cjs` — Shared merge helper.
- `bin/lib/sync-accept.cjs` — `--accept` / `--accept-deletion` / `--keep-deleted` helpers.
- `bin/lib/sync-cli.cjs` — `oto sync` dispatcher.
- `decisions/sync-allowlist.json` — D-16.
- `schema/sync-allowlist.json` — D-16 (hand-rolled validator).
- `.oto-sync/BREAKING-CHANGES-gsd.md` — Initial empty file with header (SYN-06).
- `.oto-sync/BREAKING-CHANGES-superpowers.md` — Initial empty file (SYN-06).
- `.oto-sync/last-synced-commit.json` — Initial schema-conformant empty record per upstream (SYN-05).
- `tests/phase-09-*.test.cjs` (8 files per D-21).
- `.gitignore` — Add `.oto-sync/upstream/`, `.oto-sync/rebranded/`, `.oto-sync-conflicts/`.

### Upstream sources (read for fork reference)
- `foundation-frameworks/get-shit-done-main/CHANGELOG.md` — Volatility evidence informing D-05 (tag-pin) and D-04 (BREAKING-CHANGES log).
- `foundation-frameworks/get-shit-done-main/get-shit-done/workflows/sync-skills.md` — Confirms upstream has **no** upstream-sync tooling; sync-skills is sibling-runtime sync only. No prior art to crib from. (Verified during discuss-phase research.)
- `foundation-frameworks/superpowers-main/scripts/sync-to-codex-plugin.sh` — Confirms Superpowers also has no upstream-sync tool. (Verified during discuss-phase research.)
- `git merge-file(1)` man page — `git merge-file -p` writes merged content to stdout; non-zero exit count = number of unmerged conflict hunks. Standard tool, ships with git ≥ 1.7.

### Phase 9 deliverables (consumed by downstream phases)
- `scripts/sync-upstream/**` and `bin/lib/sync-*.cjs` → Phase 10 promotes the test suite into CI; sync regression coverage goes into `test.yml`.
- `decisions/sync-allowlist.json` → Phase 10 license-attribution check (CI-06) verifies `LICENSE` and `THIRD-PARTY-LICENSES.md` are present in the allowlist (defensive).
- `.oto-sync/BREAKING-CHANGES-{gsd,superpowers}.md` → Permanent audit trail; Phase 10 docs (DOC-03 `docs/upstream-sync.md`) reference these as the change-log surface.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **`scripts/rebrand.cjs` + `scripts/rebrand/lib/engine.cjs`** — Already does dry-run/apply/round-trip with rule-typed rules. Sync rebrand stage feeds it `--target=.oto-sync/upstream/<name>/current/`, `--out=.oto-sync/rebranded/<name>/current/`, `--apply`. Zero new rebrand code; thin wrapper script only.
- **`decisions/file-inventory.json`** — Already lists every upstream file with `verdict`, `target_path`, `phase_owner`. `merge.cjs` walks entries with `verdict in {keep, merge}` to drive diff scope (D-11).
- **`rename-map.json` + `schema/rename-map.json`** — Reused verbatim. Identifier/path/command/skill_ns/package/url/env_var rules apply to upstream snapshot the same way they applied during the original Phase 4 bulk port.
- **`bin/install.js` `oto` bin** — Already a top-level dispatcher; gains a `sync` subcommand alongside the existing `install` subcommand. Pattern matches Phase 3 D-04 lifecycle work.
- **`tests/` `node:test` fixture pattern** — `os.tmpdir()/oto-*-test-<random>/` + `t.after()` cleanup. Phase 9 follows this exactly.
- **`foundation-frameworks/`** — Stays as the immutable reference baseline; not touched by sync (it's in `oto_owned_globs` per D-16). Useful for first-sync regression testing: `oto sync --upstream gsd --to v1.38.5` against a fresh `.oto-sync/upstream/gsd/current/` should produce zero conflicts (matches the bulk port baseline).
- **`.oto-rebrand-out/`** — Naming/layout precedent for `.oto-sync/rebranded/`.
- **`scripts/build-hooks.js`** — Pattern precedent for `scripts/sync-upstream/*.cjs`: small, focused, exits clean, validates inputs.

### Established Patterns (carry forward from Phases 1–8)

- Top-level Node 22+ CommonJS, zero-dependency where practical, `node:test`, no top-level TypeScript, no top-level build (CLAUDE.md TL;DR).
- `bin/lib/*.cjs` factoring — every module independently `node:test`-able, exports plain functions, no DI framework. Phase 9 extends with `sync-pull.cjs`, `sync-merge.cjs`, `sync-accept.cjs`, `sync-cli.cjs`.
- Phase-scoped `node:test` files in `tests/` with `phase-NN-*.test.cjs` naming.
- Generated artifacts committed to repo + regen-diff test (Phase 5/8 pattern). Phase 9 has fewer generated artifacts (sync output is the user's working tree, not committed); regen-diff applies to fixture-driven test outputs only.
- Hand-rolled JSON Schema validation (Phase 2 D-16). `schema/sync-allowlist.json` follows this pattern; no `ajv` dep.
- `os.tmpdir()/oto-*-test-<random>/` for integration test fixtures with `t.after()` cleanup; tests run under `--test-concurrency=4`.
- Marker-bracketed merge regions for everything injected into shared files (D-12 YAML header is the analog: explicitly marks oto's annotation, leaves the file body as straight content).

### Integration Points

- **Phase 9 → Phase 10 (Tests, CI, Docs, Release):** Sync regression tests promote into CI matrix (`test.yml`). DOC-03 (`docs/upstream-sync.md`) consumes Phase 9's design — most of the prose can be lifted from this CONTEXT.md.
- **Phase 9 ← Phase 8:** Phase 8's oto-owned files (codex-toml.cjs, codex-transform.cjs, codex-profile.cjs, gemini-transform.cjs, instruction-file.cjs, runtime-matrix.cjs, oto/templates/instruction-file.md, the three generated runtime files) **must** be in `decisions/sync-allowlist.json::oto_owned_globs`. D-16 enumerates them; verify against the actual Phase 8 deliverables in `bin/lib/` and `oto/templates/` during planning.
- **Phase 9 ↔ Phase 1 (inventory):** Sync exposes inventory drift (D-17). The first real-world sync against an upstream tag bump will likely surface 5–20 unclassified-add paths. User updates `decisions/file-inventory.json`; this is expected ongoing maintenance, not a phase 9 bug.
- **Phase 9 ↔ Phase 2 (rebrand engine):** Sync rebrand stage exercises the engine on a fresh upstream tree. Any rebrand-engine bugs that the bulk Phase 4 port didn't surface may appear here; classified as engine fixes (Phase 2 maintenance), not Phase 9 scope.

</code_context>

<specifics>
## Specific Ideas

- **User's overriding constraint:** "I don't want to have to write code manually" — captured verbatim from the discuss-phase exchange. Operationalized as D-08 (`git merge-file` delegation) and D-15 (`--accept` helper). Implies: any future v2 scope decisions should similarly bias toward "more auto, less manual" as long as the cost stays bounded.

- **Phase 8 precedent for SYN-07 override:** Phase 8 explicitly recorded that user-locked bars override ROADMAP framing ("daily-peer Codex/Gemini" overrode "best-effort"). Phase 9 follows the same precedent: "no manual editing if avoidable" overrides "merge UX deferred to v2" — narrowed scope: no oto-built merge UI, but `git merge-file` delegation is in scope. Planner should treat this as the phase contract, not the literal SYN-07 text.

- **`git merge-file` is the load-bearing dependency.** Already required for any user of this repo (it's a core git binary, not a separate install). The sync pipeline silently degrades to "every file = conflict" if `git` is missing — `merge.cjs` should fail-loud at startup if `git --version` doesn't return cleanly, with a clear error message ("oto sync requires git ≥ 1.7 on PATH").

- **Conflict file YAML header field shape (D-12)** is the artifact downstream agents are most likely to debate. Starting shape lists `kind`, `upstream`, `prior_tag`, `prior_sha`, `current_tag`, `current_sha`, `target_path`, `inventory_entry`. Planner may propose a tighter schema; record changes in PLAN.md.

- **Allowlist completeness (D-16) is verifiable.** A sync against an unmodified upstream snapshot (e.g. re-pull v1.38.5 after we already shipped Phase 4 from it) should produce ZERO conflicts and ZERO unclassified adds. This is a regression-test fixture: `phase-09-allowlist-completeness.test.cjs` runs sync against `foundation-frameworks/get-shit-done-main/` symlinked into `.oto-sync/upstream/gsd/current/`, asserts clean output. Catches missing allowlist entries.

- **Heuristic rename detection (D-10)** is the most-likely v2 follow-up the user might want sooner. Indicator: if real-world syncs surface 5+ delete+add pairs that are clearly the same content under a new path, that's the trigger. Track in deferred ideas; revisit at first painful sync.

- **`oto sync --status`** is a plausible "obvious" addition that I left as Claude's discretion. Planner should add it if the cost is small (~30 LOC); skip if it complicates the dispatcher significantly.

- **CHANGELOG ingestion is explicitly out.** A future v2 enhancement could parse the upstream CHANGELOG.md between prior_tag and current_tag and auto-populate BREAKING-CHANGES.md with upstream's own change notes. v1 leaves BREAKING-CHANGES.md as a sync-event log only (auto-stamped REPORT.md content); user adds free-text notes manually if they want richer record.

- **Disposable-fixture upstream for tests:** Use `git init --bare` + scripted commits to build a tiny fixture upstream repo per test, rather than mocking `git clone`. Real subprocess calls are zero-dep and exercise the actual code path. Phase 9 tests run fully offline; CI doesn't need network access.

</specifics>

<deferred>
## Deferred Ideas

- **Bidirectional sync (push oto improvements upstream)** — REQUIREMENTS SYN-V2-02. v2 candidate; out of scope.
- **Automated rename-map evolution from upstream PR diffs** — REQUIREMENTS SYN-V2-03; v2 candidate. Sync v1 prints suggested entries to stderr but does not modify the map.
- **Heuristic rename detection** — Currently delete+add per D-10. Re-evaluate at first sync where this hurts (5+ obvious rename pairs in one sync).
- **Conflict-resolution wizard / merge UX** — `--accept` is the upper bound for v1. Anything richer (interactive 3-pane, in-IDE plugin, etc.) is v2 SYN-V2-01.
- **CHANGELOG ingestion** — Auto-populate BREAKING-CHANGES.md from upstream's CHANGELOG.md between sync points. v2 enhancement.
- **CI promotion of sync tests** — Phase 10 (CI-01..02) owns. Phase 9 ships local-runnable only.
- **Network-dependent integration tests** — Test against the real github.com upstreams, not just local fixtures. Phase 10 + ongoing CI candidate.
- **`oto sync --status`** — Convenience subcommand; Claude's discretion to ship in v1 or defer.
- **Sync against forks or alternative upstream remotes** — v1 hard-codes `github.com/gsd-build/get-shit-done` and `github.com/obra/superpowers` URLs in the pull scripts. v2 could parameterize.
- **Inventory schema additions surfaced by sync** (e.g. `verdict: dropped_upstream` per D-15) — Track as Phase-1-maintenance follow-ups; not phase 9 scope to ship.
- **Bidirectional rebrand-engine evolution** — If sync surfaces patterns that the engine mishandles on fresh upstream, those become Phase 2 maintenance work, not Phase 9.

### Reviewed Todos (not folded)

None — `gsd-tools.cjs todo match-phase 9` returned 0 matches.

</deferred>

---

*Phase: 09-upstream-sync-pipeline*
*Context gathered: 2026-05-04*
