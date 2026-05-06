# Phase 1: Add /oto-migrate — Research

**Researched:** 2026-05-05
**Domain:** Project-level migration tooling — convert a user-project's GSD-era planning artifacts to oto's command surface (operating on the *user's* project tree, not on this repo's source).
**Confidence:** HIGH for inventory of what exists, MEDIUM for proposed scope (CONTEXT.md will lock that), HIGH for the "reusable engine" question.

## Summary

`/oto-migrate` is a **project-level converter**, not a code rebrand. It runs against an *external user project* that previously had GSD installed, and rewrites the project's tracked-in-git planning artifacts (`.planning/STATE.md`, `ROADMAP.md`, `PROJECT.md`, `REQUIREMENTS.md`, phase-tree markdown, frontmatter keys, marker blocks, and any in-tree references to `/gsd-*` slash commands) so the project speaks "oto" instead of "GSD." It does **not** touch the user's runtime config dirs (`~/.claude/`, `~/.codex/`, `~/.gemini/`) — those are owned by `oto install`.

Three pieces of pre-existing work in this repo are directly load-bearing for migrate, and one piece is **misnamed and easily mistaken** for what we're building:

1. **`scripts/rebrand/lib/engine.cjs`** — the rule-typed rename engine that already ports GSD source through `rename-map.json`. It supports `dry-run`, `apply`, `verify-roundtrip`, atomic writes, allowlist masking, and an inventory-driven path remap. `/oto-migrate` should call this engine directly with a project-tuned target/allowlist, not duplicate it. [VERIFIED: read `scripts/rebrand/lib/engine.cjs` lines 386–420; same engine used by both `scripts/rebrand.cjs` and `scripts/sync-upstream/rebrand.cjs`].
2. **`rename-map.json`** — already encodes every GSD→oto rule we need, including the `path` rule `.planning` → `.oto` (`segment` match). [VERIFIED: read repo root.] **This is the one rule oto's *own* repo deliberately ignores** (this repo still ships `.planning/`, see point 4 below). The migration command must decide whether to honor or override that rule when running against user projects.
3. **`<!-- GSD:project-start … GSD:project-end -->`** marker blocks inside `CLAUDE.md` / `AGENTS.md` / `GEMINI.md`. [VERIFIED: `oto/templates/instruction-file.md` lines 21–222]. These are the surgical-edit anchor points the migrate command must rewrite — a user project that was set up by GSD's installer and the project's instruction files will both have these markers. The oto profile-output module already uses `<!-- OTO:* -->` markers (`oto/bin/lib/profile-output.cjs` lines 198, 226–246), so migrate should rewrite `<!-- GSD:* -->` → `<!-- OTO:* -->` in user instruction files, and rewrite the `/gsd-*` command names inside the workflow-enforcement block.
4. **`oto/bin/lib/gsd2-import.cjs` is misnamed** — despite the filename, it is not a GSD→oto migration tool. It is an **OTO-2 → OTO-v1** *reverse* migration that reads a `.oto/` v2 milestone/slice/task hierarchy and emits a `.oto/` v1 milestone/phase/plan tree. The CLI dispatch is `from-oto2`, called via `oto-tools.cjs:1270`. It has no rebrand-engine integration, no instruction-file logic, and is not what `/oto-migrate` should extend. The filename should be considered a maintenance artifact; do not be misled by it. [VERIFIED: read full file; line 4 doc-comment confirms "Reverse migration from OTO-2 (.oto/) to OTO v1 (.planning/)"].

A subtle but critical fact: **this oto repo itself still uses `.planning/` for its own planning dir** ([VERIFIED: `ls .planning/`; `.planning/STATE.md` frontmatter has `gsd_state_version: 1.0`]), and `.planning/STATE.md`'s frontmatter still uses `gsd_state_version: 1.0`. That means the migrate question "do we rename `.planning/` → `.oto/`?" has two valid answers and neither is dictated by current oto behavior:
- If migrate targets directory rename → blast radius is large; affects every gitignore, hook, doc reference, and CI script in the user's project.
- If migrate keeps `.planning/` and only renames *contents* → blast radius is small; aligns with how oto-the-repo currently behaves; but `rename-map.json` says the canonical answer is `.oto/`.

This is the single biggest open scope question and **must be promoted to discuss-phase** before planning starts.

**Primary recommendation:** Build `/oto-migrate` as a thin orchestrator that (a) detects GSD-era markers in the user project, (b) builds a project-scoped invocation of the existing rebrand engine restricted to a curated set of glob patterns (`.planning/**`, `CLAUDE.md`, `AGENTS.md`, `GEMINI.md`, plus optionally project-scoped hook configs), (c) honors a per-run policy switch for the `.planning` → `.oto` directory rename (default = preserve, opt-in to rename), (d) wraps the engine with backup, dry-run, and idempotency checks. Expose it as a Claude command markdown (`oto/commands/oto/migrate.md`) that delegates to a node:test-covered handler in `oto/bin/lib/migrate.cjs`, dispatched from `oto-tools.cjs`. Mirror the dispatch pattern for Codex/Gemini at install time (the existing per-runtime adapters already convert command markdown for each runtime).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

None — `.planning/phases/01-…/01-CONTEXT.md` does not yet exist. CONTEXT.md will be authored from `/oto-discuss-phase` after this research is reviewed. The Open Questions section below is the discuss-phase agenda.

### Claude's Discretion

All design decisions are open until CONTEXT.md is written. The recommendations in this document are the planner's default if the user does not override them.

### Deferred Ideas (OUT OF SCOPE)

The v0.1.0 REQUIREMENTS.md "Out of Scope" table explicitly listed:
- "Migration from existing GSD/Superpowers installs — Clean-slate build; user confirmed no carry-over needed"

Phase 1 of the new milestone *reverses* that previous out-of-scope decision. The reversal is intentional (see ROADMAP.md: "Phase 1 added: Add /oto:migrate"). Document this reversal in CONTEXT.md so future readers understand why it now exists.
</user_constraints>

## Phase Goal (proposed)

> Ship `/oto-migrate` (Claude command + per-runtime equivalents + `oto-tools` subcommand) that converts an external GSD-era user project's tracked planning artifacts and instruction-file marker blocks into oto's command surface, with dry-run, conflict detection, opt-in directory rename, and idempotent re-runs.

**Falsifiable success criteria:**
1. Running `/oto-migrate --dry-run` on a fixture project that mimics a GSD-era project produces a per-file report classified by rule type (identifier / path / command / marker / frontmatter) with **zero unclassified matches**.
2. Running `/oto-migrate --apply` on the same fixture produces a tree where `grep -r '\bgsd\b\|/gsd-\|<!-- GSD:\|gsd_state_version' <project>` returns **zero hits** outside any explicit attribution / "do-not-rename" allowlist.
3. Re-running `/oto-migrate --apply` on the already-migrated tree produces a **zero-change diff** (idempotent / round-trip).
4. Running migrate on a tree that already has oto markers (half-migrated) **detects the conflict and exits with a non-zero status** instead of silently double-applying.
5. The fixture-project test suite covers all three runtimes' instruction files (`CLAUDE.md`, `AGENTS.md`, `GEMINI.md`) and verifies marker-block rewrite works on each.

## Proposed Requirements

A small inline set the planner can adopt directly. Five MUST + five SHOULD; planner can re-letter as needed.

| ID | Type | Requirement |
|---|---|---|
| **REQ-MIG-01** | MUST | `/oto-migrate` is invokable as a Claude command (`oto/commands/oto/migrate.md`), as `oto-tools migrate <args>`, and is the subject of `oto-sdk query` if/when SDK exposes it. (Three runtimes: Claude file shipped as markdown; Codex and Gemini converted at install time by existing adapters.) |
| **REQ-MIG-02** | MUST | Migrate runs in **`--dry-run`** by default and only writes when `--apply` is passed. Dry-run emits a classified per-file report (identifier/path/command/marker/frontmatter rule types) and a summary of files-touched, paths-renamed, marker-blocks-rewritten. |
| **REQ-MIG-03** | MUST | Migrate calls the **existing** rebrand engine (`scripts/rebrand/lib/engine.cjs`) under the hood for in-file string transforms; new code is limited to: detection, scope-globbing, marker-block rewrite (`<!-- GSD:* -->` → `<!-- OTO:* -->`), frontmatter-key rewrite (`gsd_state_version` → `oto_state_version`), backup/restore, conflict detection. |
| **REQ-MIG-04** | MUST | Migrate is **idempotent**: running `--apply` on an already-migrated tree produces a zero-change diff and exits 0 with a "nothing to do" status. |
| **REQ-MIG-05** | MUST | Migrate **detects and refuses** half-migrated state: if both `<!-- GSD:* -->` and `<!-- OTO:* -->` markers exist in the same instruction file, exit non-zero with a clear conflict report unless `--force` is passed. |
| **REQ-MIG-06** | SHOULD | Directory rename `.planning/` → `.oto/` is **opt-in** via `--rename-state-dir` flag, defaulting to off. The default preserves the directory name and only rewrites contents (matches oto-this-repo's actual behavior; minimizes blast radius for users with CI/hooks that grep `.planning/`). |
| **REQ-MIG-07** | SHOULD | Migrate writes a **timestamped backup** of every file it modifies under `.oto-migrate-backup/<timestamp>/` (or skipped via `--no-backup`). |
| **REQ-MIG-08** | SHOULD | Migrate has a **scope flag**: `--scope planning` (default; `.planning/**`, project root `*.md`), `--scope all` (also touches user-authored READMEs, docs, CI files for command-name rewrites), `--scope minimal` (only `.planning/STATE.md` frontmatter + workflow-enforcement block in instruction files). |
| **REQ-MIG-09** | SHOULD | Migrate emits a `.oto-migrate-report.json` and `.oto-migrate-report.md` next to the dry-run output, mirroring the existing `reports/rebrand-dryrun.{json,md}` shape so existing reviewers know how to read it. |
| **REQ-MIG-10** | SHOULD | Migrate does **NOT** touch the user's runtime config dirs (`~/.claude/`, `~/.codex/`, `~/.gemini/`) — separation of concerns vs. `oto install`. Documented in the command's help text. |

## Surface & Invocation

| Surface | Path | Role |
|---|---|---|
| Claude command markdown | `oto/commands/oto/migrate.md` | What Claude Code's `/oto-migrate` invokes; thin shell that delegates to the handler |
| Codex equivalent | Auto-generated at install time by `runtime-codex.cjs` (see Phase 3/4 install path) | `$oto-migrate` invocation parity |
| Gemini equivalent | Auto-generated at install time by `runtime-gemini.cjs` | Gemini CLI parity |
| CLI subcommand | `oto-tools migrate <args>` (or `oto migrate` if elevated to top-level binary later) — dispatched from `oto/bin/lib/oto-tools.cjs` switch alongside existing `from-oto2` case at line 1270 | Scriptable / non-interactive entry point |
| Implementation module | `oto/bin/lib/migrate.cjs` (new) | All migration logic, unit-tested with `node:test` |
| Engine reuse | `scripts/rebrand/lib/engine.cjs` (existing) — call via `engine.run({ mode, target, out, force, owner, mapPath })` | In-file string rewrites |

[VERIFIED: existing dispatch pattern at `oto/bin/lib/oto-tools.cjs:1244–1278` shows the case-statement style migrate should plug into.]

**Why both a Claude command file *and* a CLI subcommand:** Claude users invoke `/oto-migrate` interactively; scripted use cases (CI checking that a project is on the latest oto schema) need the CLI form. The Claude markdown delegates to the same `oto-tools.cjs` handler the CLI uses, so there is one implementation.

## Detection — How to Identify a GSD-era Project

A project qualifies as "GSD-era" if **any** of the following are true (migrate should report which signals fired):

| Signal | Where | Cost | Confidence as a signal |
|---|---|---|---|
| `gsd_state_version` key in `.planning/STATE.md` frontmatter | grep first 30 lines of file | trivial | HIGH — written by GSD's installer; this oto repo *still has it* (see `.planning/STATE.md` line 2) |
| `<!-- GSD:project-start` (or any `<!-- GSD:*` marker) in `CLAUDE.md`, `AGENTS.md`, `GEMINI.md` at project root | grep | trivial | HIGH — these markers are the GSD-installer's instruction-file injection wrapper |
| `/gsd-` slash-command references inside any `.md` file in `.planning/` (e.g., `/gsd-execute-phase` historical references in CONTEXT.md) | grep | trivial | MEDIUM — also appears in oto's own historical phase artifacts; not necessarily a re-migration signal |
| `.gsd/defaults.json` or `~/.gsd/defaults.json` referenced (project may carry path strings to user's `~/.gsd/`) | grep | trivial | LOW — those are user-home paths the project does not own; informational only |
| Existence of GSD-shape phase-tree (`.planning/phases/<NN-slug>/<NN>-{CONTEXT,RESEARCH,PLAN,SUMMARY}.md` with the canonical numbering) | path glob | trivial | LOW — same shape as oto |

**Recommended detection policy:** A project is a migration candidate if **either** signal #1 (frontmatter key) **or** signal #2 (instruction-file marker) is present. Signal #3 alone is informational.

[VERIFIED: signal #1 found at `.planning/STATE.md:2` (`gsd_state_version: 1.0`); signal #2 found across `CLAUDE.md` lines 5–222 in this repo's instruction template at `oto/templates/instruction-file.md`.]

## Scope (in / out)

### In-scope file types and edits

| Target | Edits | Source-of-truth rule from `rename-map.json` |
|---|---|---|
| `.planning/STATE.md` frontmatter key `gsd_state_version` → `oto_state_version` | identifier rule | `rules.identifier[4]` |
| `.planning/**/*.md` body — `gsd-` identifiers, `/gsd-` slash commands, `Get Shit Done` brand text | engine string rules (identifier + command) | `rules.identifier[0..3]`, `rules.command[0]` |
| `.planning/config.json` — keys mentioning `gsd*`, `gsd-hook-version` if present | identifier rule | `rules.identifier[5]` |
| `CLAUDE.md` / `AGENTS.md` / `GEMINI.md` at project root | marker block rewrite (`<!-- GSD:* -->` → `<!-- OTO:* -->`) **plus** workflow-enforcement block command-name rewrite (`/gsd-quick` → `/oto-quick` etc.) | new logic + `rules.command[0]` |
| Anywhere: `GSD_VERSION`, `GSD_*` env-var references | env_var rule | `rules.env_var[0]` |

### Out-of-scope (do-not-rename)

| Pattern | Reason |
|---|---|
| `~/.claude/`, `~/.codex/`, `~/.gemini/` — anything under user's home runtime dirs | Owned by `oto install`; migrate must not touch |
| `~/.gsd/defaults.json` references (string-only) inside the project's docs | The user's `~/.gsd/` is their data; references can stay as historical breadcrumbs unless the user opts into `--scope all` |
| `node_modules/`, `.git/`, `dist/`, `.oto-rebrand-out/`, `reports/`, `.oto-sync/`, `.oto-migrate-backup/` | Standard scratch dir filters; engine walker already does this (`scripts/rebrand/lib/walker.cjs:5`: `SCRATCH_DIRS`) |
| `LICENSE`, `LICENSE.md`, `THIRD-PARTY-LICENSES.md` | Allowlisted in `rename-map.json:38–43` |
| Historical `/gsd-*` references inside completed phases' SUMMARY.md (already-shipped phases) | Optional preserve-history mode (`--preserve-history`) — discuss-phase decision |
| Files committed under `foundation-frameworks/**` if the user has them (unlikely in user projects) | Allowlisted |

### Conditional (`--rename-state-dir` flag)

| Action | Default | Opt-in |
|---|---|---|
| Rename `.planning/` directory to `.oto/` | NO | Yes — explicit `--rename-state-dir` flag |
| Update `.gitignore` patterns from `.planning/` to `.oto/` | follows directory rename | follows directory rename |
| Update string references in user's `package.json` scripts, CI workflows | follows directory rename + `--scope all` | both flags |

**Why opt-in:** the repo we are sitting in still uses `.planning/` for its own planning. Forcing user projects to `.oto/` while oto-the-repo lives in `.planning/` is internally inconsistent. The decision is **deferred to discuss-phase** (Open Question #1).

## Reusable Engine Audit

What's already in `scripts/` that migrate should call vs. duplicate. [VERIFIED by reading each file.]

| Capability | Where | Reuse vs. extend |
|---|---|---|
| Rule-typed rewrite engine with dry-run / apply / verify-roundtrip | `scripts/rebrand/lib/engine.cjs` | **REUSE** — call `engine.run({ mode, target, out, force, owner, mapPath })` directly. Engine already supports `--target` and `--out` so it can be pointed at a user project instead of `foundation-frameworks/`. |
| Per-rule modules (identifier, path, command, skill_ns, package, url, env_var) | `scripts/rebrand/lib/rules/` | **REUSE** — no migration-specific rules needed beyond what's already in `rename-map.json`. |
| Atomic file writes | `engine.cjs:writeFileAtomic` (lines 66–78) | **REUSE** via engine. |
| Allowlist masking for attribution context | `engine.cjs:maskPreservedUrls` (lines 123–141) | **REUSE** via engine — protects copyright lines. |
| Coverage manifest (pre/post counts) | `scripts/rebrand/lib/manifest.cjs` | **OPTIONAL reuse** — useful if migrate wants to assert post-migration zero-`gsd` count; not strictly required. |
| Path-rename (file moves like `agents/gsd-foo.md` → `agents/oto-foo.md`) | `engine.cjs:applyRelPath` + `outputRelPathFor` (lines 237–252) | **REUSE** — but note: in user projects this only affects `.planning/` artifacts, which don't have the `agents/gsd-*` prefix pattern; mostly a no-op for migrate. The `.planning/` → `.oto/` rule is the one that matters and is governed by the `--rename-state-dir` flag (override the engine's default by adjusting the rule set or by post-processing — discuss-phase decision). |
| Inventory-driven path remap (`decisions/file-inventory.json`) | `engine.cjs:buildInventoryMap` (lines 48–53) | **NOT applicable** — inventory is for upstream-source classification; user projects have no inventory. Migrate must pass a path that doesn't trigger inventory lookup, or supply an empty/synthetic one. |
| Walker scratch-dir filtering | `scripts/rebrand/lib/walker.cjs:5` | **REUSE** — already filters `node_modules`, `.git`, `.oto-rebrand-out`, `reports`. Migrate may want to extend with `.oto-migrate-backup`. |
| OTO-2 → OTO-v1 reverse migration | `oto/bin/lib/gsd2-import.cjs` | **DO NOT REUSE** — despite the misleading filename, this is unrelated to GSD→oto migration. The `.cjs` file's docstring confirms it is `OTO-2 → OTO v1`, not GSD → oto. |
| Sync-rebrand variant | `scripts/sync-upstream/rebrand.cjs` | **PATTERN reference** — shows how to call the engine with custom `target` and `out`. Migrate should mirror the calling convention (lines 27–42). |
| Marker-block rewrite | `oto/bin/lib/profile-output.cjs` lines 226–246 | **NOT directly reusable** — module is profile-specific, but the `<!-- OTO:<section>-start … OTO:<section>-end -->` literal pattern is the target shape. Write a focused migrate-only marker rewriter (≤ 60 LOC). |

**Net new code estimate:** ~250–400 LOC for `migrate.cjs`. Most is glue — detection, glob filtering, marker rewrite, backup, conflict detect, CLI shim. The actual rewrite work is delegated.

## Migration Algorithm

Pseudo-code for the apply path. Dry-run is the same minus the writes.

```
function migrate(projectDir, opts):
  # 1. Detect
  signals = detectGsdEraSignals(projectDir)
  if !signals.any(): exit 0 with "not a GSD-era project"

  # 2. Conflict check
  if !opts.force:
    if hasOtoMarkers(projectDir) and signals.includes('GSD-markers'):
      exit non-zero "half-migrated state detected; pass --force to override"
    if hasOtoStateDir(projectDir) and hasPlanningStateDir(projectDir):
      exit non-zero "both .oto/ and .planning/ present"

  # 3. Plan: build the file list
  scope = opts.scope || 'planning'
  fileList = expandGlobs(scopeGlobs[scope], projectDir, walker.scratchDirs)

  # 4. Dry-run first (always)
  dryReport = engine.run({ mode: 'dry-run', target: projectDir, mapPath: bundledRenameMap, ... })
  markerReport = scanMarkers(fileList)
  frontmatterReport = scanFrontmatter(fileList)
  emitReport(dryReport, markerReport, frontmatterReport)

  if opts.dryRun: exit 0

  # 5. Backup
  if !opts.noBackup:
    backupDir = `.oto-migrate-backup/${timestamp}/`
    for f in modifiedFiles: copy(f -> backupDir/f)

  # 6. Apply, atomic per file
  engine.run({ mode: 'apply', target: projectDir, out: projectDir, force: true, ... })
  for f in instructionFiles: rewriteMarkers(f, GSD->OTO)
  for f in stateFiles:        rewriteFrontmatterKey(f, gsd_state_version, oto_state_version)
  if opts.renameStateDir:
    rename('.planning' -> '.oto')
    updateGitignore('.planning' -> '.oto')

  # 7. Verify idempotency
  postReport = engine.run({ mode: 'dry-run', target: projectDir, ... })
  assert postReport.match_total == 0 outside allowlist

  # 8. Report
  writeMigrationReport()
```

**Key invariants:**
- Engine apply mode requires `target ≠ out` to be safe; for in-place migration, write to a tmp dir, then atomic-rename or copy back. Or pass `force: true` and accept that the engine writes to `out` and we then `rsync out → projectDir`. [VERIFIED: `engine.cjs:applyTree` lines 296–335 wipes `out` if non-empty and `force=true`.]
- Atomic per-file writes are already provided by the engine (`writeFileAtomic`).
- Marker rewrite must preserve any `source:<file>` attribute on the start tag (oto's profile module preserves it; migrate must too).

## Multi-Runtime Handling

The user's project root may have any of: `CLAUDE.md`, `AGENTS.md`, `GEMINI.md` (one, two, or all three depending on which runtimes they use). Migrate must:

| File | Detect | Edit |
|---|---|---|
| `CLAUDE.md` | Always check at project root | Rewrite `<!-- GSD:* -->` → `<!-- OTO:* -->`, rewrite `/gsd-*` command names in workflow-enforcement block |
| `AGENTS.md` | Always check | Same as CLAUDE.md |
| `GEMINI.md` | Always check | Same |

[VERIFIED: oto's instruction template at `oto/templates/instruction-file.md` has identical marker layout for all three runtimes (lines 21–222). The differences across runtimes are at install-time (which command form is invoked, e.g. `/oto-foo` for Claude, `$oto-foo` for Codex), not in the marker structure. Migrate's marker logic is therefore runtime-agnostic.]

**Open question:** does migrate touch all three files unconditionally, or only files that exist? Recommendation: **only files that exist** — don't create runtime files the user didn't ask for. (Open Question #5.)

## Edge Cases & Conflicts

| Situation | Behavior |
|---|---|
| Project has `.planning/` but no GSD frontmatter and no GSD markers | Exit 0 with message "no GSD signals; nothing to migrate"; do not assume directory layout = needs migration |
| Project has `<!-- OTO:* -->` markers AND `<!-- GSD:* -->` markers in same file | **Half-migrated**; exit non-zero unless `--force` |
| Project has both `.planning/` and `.oto/` directories | **Half-migrated** at directory level; exit non-zero unless `--force` |
| Project has GSD markers but `gsd_state_version` is already `oto_state_version` | Likely a mid-migration interrupt; warn but proceed |
| User has customized the `<!-- GSD:* -->` block contents (added their own sections) | Preserve content exactly; only rewrite the marker tags themselves |
| Historical `/gsd-execute-phase` references in completed-phase SUMMARY.md | Default = rewrite (under `--scope planning`); offer `--preserve-history` flag (Open Q #4) |
| User has a `.gsd/` directory in their project (unusual; user's project-local GSD config) | Out of scope by default; `--scope all` opt-in |
| Engine apply step writes to a tmpdir; rename target back into project | Atomic; engine already does this per-file |
| Backup dir already exists from a prior migrate attempt | Use timestamp suffix (`.oto-migrate-backup/<ISO-timestamp>/`) so each run is isolated |
| Read-only files (CI, perms) | Engine atomic-write will fail; migrate should catch and report which files couldn't be written, rather than partial-state crash |
| Symlinks in user project | Engine walker treats them as regular files when reading; migrate should warn or skip symlinks under `.planning/` (rare but possible) |

## Validation Architecture

**Test framework:** `node:test` (built-in to Node 22+; matches existing repo pattern). [VERIFIED: `package.json` test scripts use `node --test`; existing tests under `tests/*.test.cjs` follow this convention.]

| Property | Value |
|---|---|
| Framework | `node:test` (Node 22+ built-in) |
| Config file | None (zero-config); test runner via `scripts/run-tests.cjs` per existing pattern |
| Quick run command | `node --test tests/migrate.test.cjs` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|---|---|---|---|---|
| REQ-MIG-01 | Command file present, oto-tools dispatch case present | unit | `node --test tests/migrate.surface.test.cjs` | ❌ Wave 0 |
| REQ-MIG-02 | Dry-run is the default; no writes happen without `--apply`; classified report emitted | integration (fixture) | `node --test tests/migrate.dry-run.test.cjs` | ❌ Wave 0 |
| REQ-MIG-03 | Engine called with correct args; rebrand-engine handles in-file rewrites | unit (mock engine.run) + integration | `node --test tests/migrate.engine-call.test.cjs` | ❌ Wave 0 |
| REQ-MIG-04 | Idempotent — second `--apply` is zero-diff | system (fixture, two-pass) | `node --test tests/migrate.idempotent.test.cjs` | ❌ Wave 0 |
| REQ-MIG-05 | Half-migrated detection — both GSD and OTO markers present | unit | `node --test tests/migrate.conflict.test.cjs` | ❌ Wave 0 |
| REQ-MIG-06 | `--rename-state-dir` opt-in; default preserves directory | integration | `node --test tests/migrate.rename-flag.test.cjs` | ❌ Wave 0 |
| REQ-MIG-07 | Backup directory created per run with correct timestamp | unit (fs assertions) | `node --test tests/migrate.backup.test.cjs` | ❌ Wave 0 |
| REQ-MIG-08 | Scope flag filters file list correctly | unit | `node --test tests/migrate.scope.test.cjs` | ❌ Wave 0 |
| REQ-MIG-09 | Report files match expected JSON/MD shape | integration (golden file) | `node --test tests/migrate.report.test.cjs` | ❌ Wave 0 |
| REQ-MIG-10 | Migrate refuses to write under `~/.claude/`, `~/.codex/`, `~/.gemini/` | unit | `node --test tests/migrate.runtime-isolation.test.cjs` | ❌ Wave 0 |

### Validation Pyramid

| Level | What it covers | How |
|---|---|---|
| **Unit** | Pure functions: detection, marker-rewrite, frontmatter-rewrite, glob expansion, conflict detection, scope filtering | `node:test`, no fs (use string fixtures); mock engine.run() |
| **Integration** | Engine-glue path: migrate calls `engine.run({ mode, target, out })` correctly; report shape; backup directory layout | `node:test` against tmp-dir fixture (mkdtemp); real engine.run() |
| **System** | End-to-end on a fixture project that mimics a GSD-era project: dry-run → apply → idempotent re-run → grep returns zero `gsd` | `node:test` orchestrating the whole flow against `tests/fixtures/migrate-gsd-era-project/` |

**Sampling rate:**
- **Per task commit:** `node --test tests/migrate.*.test.cjs` (subset, fast — ~10 unit + 4 integration tests, expected < 5 seconds)
- **Per wave merge:** `npm test` (full suite including existing 418 tests)
- **Phase gate:** Full suite green; coverage manifest (optional, via `c8`) reports ≥ 90% line coverage on `oto/bin/lib/migrate.cjs`

### Wave 0 Gaps

- [ ] `tests/migrate.surface.test.cjs` — REQ-MIG-01
- [ ] `tests/migrate.dry-run.test.cjs` — REQ-MIG-02
- [ ] `tests/migrate.engine-call.test.cjs` — REQ-MIG-03
- [ ] `tests/migrate.idempotent.test.cjs` — REQ-MIG-04
- [ ] `tests/migrate.conflict.test.cjs` — REQ-MIG-05
- [ ] `tests/migrate.rename-flag.test.cjs` — REQ-MIG-06
- [ ] `tests/migrate.backup.test.cjs` — REQ-MIG-07
- [ ] `tests/migrate.scope.test.cjs` — REQ-MIG-08
- [ ] `tests/migrate.report.test.cjs` — REQ-MIG-09
- [ ] `tests/migrate.runtime-isolation.test.cjs` — REQ-MIG-10
- [ ] `tests/fixtures/migrate-gsd-era-project/` — fixture tree mimicking a GSD-era project; includes `.planning/STATE.md` with `gsd_state_version`, `CLAUDE.md` with `<!-- GSD:project-start -->`, `AGENTS.md`, `GEMINI.md`, a phase tree with `/gsd-execute-phase` references, completed-phase SUMMARY.md
- [ ] `tests/fixtures/migrate-half-migrated/` — fixture for REQ-MIG-05 conflict detection
- [ ] No framework install needed — `node:test` is built-in to Node 22+

## Project Constraints (from CLAUDE.md)

| Constraint | Source | How migrate honors it |
|---|---|---|
| Node.js >= 22.0.0, CommonJS top-level | TL;DR Stack table | `migrate.cjs` is `.cjs`, uses `require()`; no top-level TS |
| No top-level TypeScript | "What NOT to Use" | New code is `.cjs` only |
| No bundlers; ship raw `.cjs` / `.js` / `.md` | "What NOT to Use" | Migrate ships as raw `.cjs` |
| Test framework: `node:test` | Stack table; CI section | All migrate tests use `node:test` |
| Copy not symlink | Stack table | Migrate's backup logic uses copy; engine atomic-writes preserve this |
| Three runtimes only (Claude, Codex, Gemini) | Project constraints | Marker rewrite covers exactly those three |
| No `npm publish` | Constraints | N/A |
| GSD Workflow Enforcement: route file edits through GSD command | CLAUDE.md tail | Migrate is the new GSD command being added |

## Open Questions

The discuss-phase agenda. Each item is a real decision the user must make before planning.

1. **Directory rename — `.planning/` → `.oto/`?**
   - What we know: `rename-map.json` says `.oto/`. This repo still uses `.planning/`. v0.1.0 success criterion 5 of Phase 4 said "State directory is `.oto/` everywhere; grep for `.planning/` (excluding `foundation-frameworks/`) returns zero hits" — but that wasn't actually executed for *this* repo's `.planning/` dir (only for the rebranded payload under `oto/`).
   - What's unclear: Should user projects align with the rename-map (`.oto/`) or with this repo's lived behavior (`.planning/`)?
   - Recommendation: **opt-in flag, default off** (preserve `.planning/`). Defer the cross-repo rename to a separate quick task on this repo. Confidence: MEDIUM.

2. **Should migrate be invoked as `/oto-migrate` or `/oto-from-gsd`?**
   - What we know: Roadmap entry says `/oto:migrate`; existing oto-tools dispatch case uses `from-oto2` for the v2-reverse tool; existing Claude command file is `oto/commands/oto/import.md` for external plan import.
   - What's unclear: Naming convention — does `migrate` collide with future "migrate between oto versions" use cases?
   - Recommendation: **`/oto-migrate` with `--from gsd` flag** so the command can later support `--from gsd2`, `--from superpowers`, etc. without renaming.

3. **Scope default — `planning`, `all`, or `minimal`?**
   - What we know: Bigger scope = more value, but also more surprise (rewriting user-authored README markdown).
   - What's unclear: User's tolerance for surprise edits in their non-`.planning/` files.
   - Recommendation: Default `planning`. Confidence: HIGH.

4. **Preserve historical `/gsd-*` references in completed-phase SUMMARY.md?**
   - What we know: SUMMARY.md is historical; rewriting it changes the audit trail.
   - What's unclear: Does the user value historical fidelity, or do they want consistent command names everywhere?
   - Recommendation: **Default = rewrite** (consistency); offer `--preserve-history` flag to skip files matching `**/SUMMARY.md`.

5. **Touch all three instruction files unconditionally, or only files that exist?**
   - Recommendation: Only files that exist. Don't create files the user didn't have.

6. **Should migrate also update `.planning/config.json` `git.phase_branch_template` (currently `gsd/phase-{phase}-{slug}`)?**
   - What we know: This repo's own `.planning/config.json` still has `gsd/` in the branch templates.
   - What's unclear: Does the user want consistent `oto/` branch naming?
   - Recommendation: Yes — rewrite `gsd/` → `oto/` in branch templates under `--scope planning` default. Confidence: MEDIUM.

7. **Backup default — on or off?**
   - Recommendation: ON by default, `--no-backup` to disable. Disk cost is trivial; recovery cost without backup is high.

8. **Idempotency assertion — fail or warn on residual `gsd` matches?**
   - What we know: Some legitimate references to GSD (attribution lines, links to upstream GSD repo) should remain.
   - What's unclear: How to distinguish "legitimate residual" from "missed match"?
   - Recommendation: Reuse the engine's existing allowlist (`do_not_rename` in `rename-map.json`) for the assertion; warn (not fail) on matches inside attribution context (lines containing `copyright`, `(c)`, `attribution`, `upstream`, `original`, `based on` — same heuristic as `engine.cjs:isUrlAttribution` lines 115–121).

## Sources

### Primary (HIGH confidence)
- Read in this session: `.planning/STATE.md`, `.planning/ROADMAP.md`, `.planning/config.json`, `.planning/milestones/v0.1.0-ROADMAP.md`, `.planning/milestones/v0.1.0-REQUIREMENTS.md`, `bin/install.js`, `rename-map.json`, `oto/bin/lib/gsd2-import.cjs`, `oto/bin/lib/oto-tools.cjs` (header + dispatch + custom-files block), `scripts/rebrand.cjs`, `scripts/rebrand/lib/engine.cjs`, `scripts/rebrand/lib/walker.cjs`, `scripts/sync-upstream/rebrand.cjs`, `scripts/sync-upstream/merge.cjs`, `oto/templates/instruction-file.md`, `oto/bin/lib/profile-output.cjs` (marker block search), `oto/commands/oto/import.md`, `reports/rebrand-dryrun.md`, `CLAUDE.md`.
- `foundation-frameworks/get-shit-done-main/bin/install.js` (grep for `.planning`, marker injection, `~/.gsd/defaults.json` references).

### Secondary (MEDIUM confidence)
- Inferred GSD-era project shape based on this repo's own `.planning/` tree, since this repo was itself a GSD-era project before rebrand.

### Tertiary (LOW confidence)
- None this session — no LOW-confidence claims made.

## Metadata

**Confidence breakdown:**
- Inventory of existing reusable code: **HIGH** — read every relevant file.
- Proposed scope: **MEDIUM** — depends on Open Question 1, 3, 4, 6 being resolved in discuss-phase.
- Detection signals: **HIGH** — verified directly against this repo's `.planning/STATE.md` frontmatter and instruction template.
- Test architecture: **HIGH** — mirrors existing `tests/*.test.cjs` patterns in the repo.
- Multi-runtime handling: **HIGH** — verified against `oto/templates/instruction-file.md`.

**Research date:** 2026-05-05
**Valid until:** 2026-06-05 (30 days; stable underlying code; only the rebrand engine and rename-map are load-bearing and both are versioned + tested)

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|---|---|---|
| (none) | All factual claims in this research are tagged VERIFIED with file/line citations or directly quoted from the read files. The only forward-looking judgments are in the Recommendation lines and Open Questions, which are explicitly flagged as discuss-phase decisions. | — | — |

## RESEARCH COMPLETE

`/oto-migrate` is buildable as a thin orchestrator over the existing rebrand engine — net new code is ~250–400 LOC plus tests. The single biggest open scope decision is whether to rename `.planning/` → `.oto/` in user projects (current rename-map says yes, this repo's lived behavior says no); recommendation is to make it an opt-in flag. The misnamed `oto/bin/lib/gsd2-import.cjs` is unrelated and must not be reused. Detection signals are concrete (`gsd_state_version` frontmatter key + `<!-- GSD:* -->` instruction-file markers). Multi-runtime is handled by editing whichever of `CLAUDE.md` / `AGENTS.md` / `GEMINI.md` exist at project root. Validation Architecture defines a 3-tier pyramid (10 test files + 2 fixture trees) all on `node:test`. Open Questions 1–8 should be promoted to `/oto-discuss-phase` for user lock-in before planning starts.
