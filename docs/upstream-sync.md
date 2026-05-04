# Upstream Sync

oto is a downstream fork of two upstream projects:
[Get Shit Done (GSD)](https://github.com/gsd-build/get-shit-done) and
[Superpowers](https://github.com/obra/superpowers). New upstream commits are
pulled into a scratch area, rebranded through `rename-map.json`, compared
against the current `oto/` tree, and surfaced as either automatic merges or
operator-visible conflicts.

The v1 goal is narrow: keep the fork current without asking the operator to
manually edit files for non-conflicting upstream changes. Rich merge UI,
bidirectional sync, and automatic rename-map evolution are deferred.

## Quick start

```sh
oto sync --upstream all --to latest --dry-run
oto sync --upstream all --to latest --apply
oto sync --status
oto sync --accept oto/skills/foo/SKILL.md
oto sync --keep-deleted oto/agents/old.md
```

Use `--dry-run` to preview. Use `--apply` only when you want the pipeline to
write rebranded snapshots, auto-merge safe files, and surface conflict sidecars.
Use `--status` to inspect last-synced refs and pending conflict counts.

The CLI entrypoint is [`bin/lib/sync-cli.cjs`](../bin/lib/sync-cli.cjs). It
parses the `oto sync` flags, dispatches the stage scripts, and routes conflict
resolution helpers:

- `oto sync --accept <target-path>`
- `oto sync --accept-deletion <target-path>`
- `oto sync --keep-deleted <target-path>`
- `oto sync --status`

## How sync works

1. **Pull** - [`scripts/sync-upstream/pull-gsd.cjs`](../scripts/sync-upstream/pull-gsd.cjs)
   and [`pull-superpowers.cjs`](../scripts/sync-upstream/pull-superpowers.cjs)
   fetch the requested upstream ref and write snapshots under
   `.oto-sync/upstream/{gsd,superpowers}/`.
2. **Rotate** - Current snapshots are retained as `prior` before the new pull is
   promoted to `current`. This gives the merge stage a stable common ancestor.
3. **Rebrand** - [`scripts/sync-upstream/rebrand.cjs`](../scripts/sync-upstream/rebrand.cjs)
   applies the Phase 2 rebrand engine to the upstream snapshot, producing a
   rebranded tree under `.oto-sync/rebranded/{gsd,superpowers}/`.
4. **Diff and merge** - [`scripts/sync-upstream/merge.cjs`](../scripts/sync-upstream/merge.cjs)
   compares prior rebranded, current rebranded, and the live `oto/` tree. It
   delegates modified-file merge work to `git merge-file` so non-overlapping
   changes land automatically.
5. **Surface and accept** - Same-line conflicts, upstream adds, and upstream
   deletions are written to `.oto-sync-conflicts/`. After review, the operator
   resolves them through `oto sync --accept`, `--accept-deletion`, or
   `--keep-deleted`.

The stage scripts are intentionally runnable on their own for debugging:

```sh
node scripts/sync-upstream/pull-gsd.cjs --to v1.39.0
node scripts/sync-upstream/pull-superpowers.cjs --to v5.1.0
node scripts/sync-upstream/rebrand.cjs --upstream gsd
node scripts/sync-upstream/merge.cjs --upstream gsd --apply
```

## Conflict resolution

Modified-file conflicts are written as Markdown sidecars under
`.oto-sync-conflicts/<target-path>.md`. Each file starts with a small YAML
header that records the conflict kind, upstream name, prior ref, current ref,
target path, and inventory entry. The body is the `git merge-file` result with
standard conflict markers.

Added files use `.added.md` sidecars. Deleted files use `.deleted.md` sidecars.
These are deliberate review gates: oto never silently deletes local files, and
new upstream paths that are not in the inventory are fail-loud until classified.

After resolving a modified conflict, remove all merge markers and run:

```sh
oto sync --accept oto/workflows/plan-phase.md
```

For an upstream deletion, choose one of:

```sh
oto sync --accept-deletion oto/agents/old.md
oto sync --keep-deleted oto/agents/old.md
```

`--accept-deletion` confirms the upstream removal. `--keep-deleted` preserves
oto's local copy and records that the path diverged.

## Source-of-truth files

- CLI entry: [`bin/lib/sync-cli.cjs`](../bin/lib/sync-cli.cjs)
- Pull helper: [`bin/lib/sync-pull.cjs`](../bin/lib/sync-pull.cjs)
- Merge helper: [`bin/lib/sync-merge.cjs`](../bin/lib/sync-merge.cjs)
- Accept helper: [`bin/lib/sync-accept.cjs`](../bin/lib/sync-accept.cjs)
- Pullers: [`scripts/sync-upstream/pull-gsd.cjs`](../scripts/sync-upstream/pull-gsd.cjs),
  [`pull-superpowers.cjs`](../scripts/sync-upstream/pull-superpowers.cjs)
- Rebrand stage: [`scripts/sync-upstream/rebrand.cjs`](../scripts/sync-upstream/rebrand.cjs)
- Merge stage: [`scripts/sync-upstream/merge.cjs`](../scripts/sync-upstream/merge.cjs)
- Phase 9 context:
  [`.planning/phases/09-upstream-sync-pipeline/09-CONTEXT.md`](../.planning/phases/09-upstream-sync-pipeline/09-CONTEXT.md)

## Adding a new upstream

Adding another upstream is deferred to v2. The current pipeline is intentionally
hardcoded for GSD and Superpowers. A third upstream would need:

1. A new puller script under `scripts/sync-upstream/`.
2. A new upstream URL constant and ref policy.
3. Rename-map entries for that upstream's command, path, env var, URL, and skill
   surfaces.
4. Inventory classifications for all retained files.
5. Merge/report updates so `.oto-sync-conflicts/REPORT.md` can identify the new
   source.
6. Regression tests covering pull, rebrand, merge, and accept behavior.

That is real architecture work, not release polish, so v0.1.0 keeps the sync
surface focused on the two upstreams oto already incorporates.
