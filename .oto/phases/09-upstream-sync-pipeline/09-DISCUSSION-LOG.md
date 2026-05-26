# Phase 9: Upstream Sync Pipeline - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-04
**Phase:** 09-upstream-sync-pipeline
**Areas discussed:** Snapshot architecture, Conflict detection model, Conflict file format, Allowlist & inventory drift

---

## Snapshot architecture

### Q1: Where should upstream pulls land relative to `foundation-frameworks/`?

| Option | Description | Selected |
|--------|-------------|----------|
| Separate `.oto-sync/upstream/` | Pulls write to `.oto-sync/upstream/{gsd,superpowers}/<tag>/`; `foundation-frameworks/` stays immutable | ✓ |
| Overwrite `foundation-frameworks/` | Each pull replaces the committed baseline | |
| Replace foundation-frameworks/ but version it | Move foundation-frameworks/ content under .oto-sync/upstream/<tag>/ | |

**User's choice:** Separate `.oto-sync/upstream/` (Recommended)

### Q2: Should the prior snapshot be retained for 3-way detection?

| Option | Description | Selected |
|--------|-------------|----------|
| Keep prior + current | Rotate on each sync — enables 3-way detection | ✓ |
| Current only (2-way) | Smaller footprint, simpler, noisier conflicts | |
| Full history per sync | Keep every tag forever (explosive disk) | |

**User's choice:** Keep prior + current (Recommended)

### Q3: Where should the rebranded version of the upstream snapshot live?

| Option | Description | Selected |
|--------|-------------|----------|
| `.oto-sync/rebranded/` | On-disk separate from raw snapshot | ✓ |
| In-place on the snapshot | Mutate the snapshot dir | |
| Streamed during merge | No on-disk rebranded tree; rebrand in-memory | |

**User's choice:** `.oto-sync/rebranded/` (Recommended)

### Q4: Should `.oto-sync/` be committed to the repo or gitignored?

| Option | Description | Selected |
|--------|-------------|----------|
| Gitignore all, commit metadata only | `.oto-sync/upstream/` and `/rebranded/` gitignored; only metadata files committed | ✓ |
| Commit upstream snapshots as baseline | Repo grows with each sync; bulletproof reproducibility | |
| Gitignore everything including metadata | Loses the per-upstream change log | |

**User's choice:** Gitignore all, commit metadata only (Recommended)

---

## Conflict detection model

### Q1: How should `merge.cjs` decide what counts as a conflict in v1?

| Option | Description | Selected |
|--------|-------------|----------|
| 3-way detection, no merge UX | Use prior-snapshot baseline; auto-apply pure-upstream changes; emit conflicts when both edited | ✓ |
| Strict 2-way (every diff = conflict) | Compare rebranded-new to oto-current; any byte difference → conflict | |
| 3-way with auto-merge | Out of scope per SYN-07 — listed for completeness | |

**User's choice:** 3-way detection, no merge UX (Recommended)

**Notes:** Subsequently reinterpreted during the conflict-file-format discussion. User asked "if I don't want to manually edit files ever, would Option 2 [`--accept` helper] be best? Why would I want manual?" Discussion led to checking how GSD handles upstream sync (answer: GSD has none — neither does Superpowers — neither is a fork). Conclusion: `git merge-file` is the right delegation — it auto-merges non-overlapping line edits and only surfaces same-line clashes. Recorded as D-08 in CONTEXT.md. The "3-way detection, no merge UX" option label remains correct (no oto-built merge UX); the implementation specifically shells out to `git merge-file -p`.

### Q2: How should added/deleted files be handled?

| Option | Description | Selected |
|--------|-------------|----------|
| Surface added files for review; never silent-delete | `.added.md` for adds, `.deleted.md` for deletions; user confirms each | ✓ |
| Auto-add, surface deletions only | New upstream files auto-flow if rename map produces unambiguous target | |
| Surface every change (add/modify/delete) uniformly | One file format with `kind:` header | |

**User's choice:** Surface added files for review; never silent-delete (Recommended)

### Q3: What scope of files does merge.cjs compare?

| Option | Description | Selected |
|--------|-------------|----------|
| Inventory-tracked files only | Walk inventory entries with verdict=keep|merge | ✓ |
| Full upstream tree | Walk every file in rebranded snapshot | |
| Inventory + drift report for unknowns | Inventory-tracked + side report for unknowns | |

**User's choice:** Inventory-tracked files only (Recommended)

### Q4: Are renames detected, or treated as delete+add?

| Option | Description | Selected |
|--------|-------------|----------|
| Treat as delete+add for v1 | Sync emits .deleted.md + .added.md; user manually pairs | ✓ |
| Heuristic rename detection | Similarity-based pairing | |
| Inventory-driven rename declaration | User pre-declares renames in JSON before sync | |

**User's choice:** Treat as delete+add for v1 (Recommended)

---

## Conflict file format

### Q1: What format for `.oto-sync-conflicts/<path>.md` modified-file conflicts?

| Option | Description | Selected |
|--------|-------------|----------|
| Git-style merge markers | `<<<<<<<` / `=======` / `>>>>>>>` markers around divergent hunks | ✓ |
| Side-by-side markdown table | Two-column table per hunk | |
| Unified diff + summary header | YAML header + `diff -u` output | |
| Three-pane structured doc | Sections for prior, upstream-new, oto-current, suggested resolution | |

**User's choice:** Git-style merge markers (Recommended)

### Q2: Where do `.added` and `.deleted` files go?

| Option | Description | Selected |
|--------|-------------|----------|
| Same dir, suffix-marked, ready-to-move | `.oto-sync-conflicts/<path>.added.md` / `.deleted.md` | ✓ |
| Subdirs by kind | `.oto-sync-conflicts/added/`, `/deleted/`, `/modified/` | |
| Single index file + content sidecar | One INDEX.md + raw sidecars | |

**User's choice:** Same dir, suffix-marked, ready-to-move (Recommended)

### Q3: Top-level summary report?

| Option | Description | Selected |
|--------|-------------|----------|
| `.oto-sync-conflicts/REPORT.md` | One summary per sync; map of the conflict dir | ✓ |
| No — per-file files only | User runs `ls .oto-sync-conflicts/` | |
| Yes, plus written into BREAKING-CHANGES.md | Summary AND appended to committed BREAKING-CHANGES log | (folded into recommendation per D-14) |

**User's choice:** Yes — `.oto-sync-conflicts/REPORT.md` (Recommended), with BREAKING-CHANGES.md append folded in per D-14.

### Q4: Resolve UX — how does user accept a resolved conflict?

| Option | Description | Selected |
|--------|-------------|----------|
| User hand-edits + deletes the conflict file | cp + rm | (initially recommended; superseded) |
| `oto sync --accept <path>` helper | Helper command does the cp + rm + marker validation | ✓ (auto-decided after user delegated) |
| Git-managed resolution only | Conflict files gitignored; user edits live oto/ tree directly | |

**User's choice:** Initially deferred — user asked for clarification ("explain pros and cons"), then "if I don't want to manually edit files ever, option 2 would be best?", then "do whatever option you think is best, all things considered" — delegating final call.

**Final decision (D-15 in CONTEXT.md):** `oto sync --accept <path>` helper, in combination with `git merge-file` delegation (D-08) which collapses 95% of conflicts away before the helper is ever invoked.

**Notes:** Discussion exposed that none of the three v1 options eliminate manual editing on their own — they only differ in cleanup steps. `git merge-file` (chosen as D-08) does eliminate manual editing for non-overlapping edits, leaving the helper to handle the residual same-line clashes ergonomically. Override of SYN-07's literal "merge UX deferred to v2" justified by Phase 8 precedent (user-locked bar overrides ROADMAP framing).

---

## Allowlist & inventory drift

**Auto-decided after user delegated final calls** ("do whatever option you think is best, all things considered").

### Q1: How is the do-not-sync allowlist tracked?

**Decision (D-16):** New `decisions/sync-allowlist.json` with `oto_owned_globs` (paths sync skips entirely) and `oto_diverged_paths` (inventory paths where oto has materially diverged; reserved for v2). Hand-rolled validator at `schema/sync-allowlist.json`.

### Q2: What happens when upstream contains paths not in inventory and not in allowlist?

**Decision (D-17):** Fail-loud — emit as `.added.md` AND exit non-zero. User must update `decisions/file-inventory.json` and re-run. Auto-evolution of inventory deferred to v2 (SYN-V2-03).

---

## Claude's Discretion (locked in this phase)

- **Pin policy & fetch (D-05/D-06/D-07):** Tag-pin default; `--main` warns; resolved SHA always recorded. `git clone --depth 1 --branch <ref>`.
- **CLI orchestration (D-19/D-20):** Single `oto sync` subcommand with sub-stage scripts also runnable independently.

## Deferred Ideas

(See CONTEXT.md `<deferred>` section for full list.)

- Bidirectional sync (v2 SYN-V2-02)
- Automated rename-map evolution (v2 SYN-V2-03)
- Heuristic rename detection (revisit at first painful sync)
- Conflict-resolution wizard beyond `--accept` (v2 SYN-V2-01)
- CHANGELOG ingestion
- Network-dependent integration tests
- `oto sync --status` (Claude's discretion to ship in v1 or defer)
- Sync against alternative upstream remotes
