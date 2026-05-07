---
phase: 01
slug: add-oto-migrate-a-command-that-converts-a-gsd-era-project-s-
status: verified
threats_open: 0
asvs_level: 1
created: 2026-05-07
---

# Phase 01 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail for the `/oto-migrate` command (v0.1.0 milestone). State-B audit: PLAN.md did not ship a `<threat_model>` block covering the implementation surface, so the register below was derived from the observed code surface in `oto/bin/lib/migrate.cjs`, `oto/commands/oto/migrate.md`, and the dispatch case in `oto/bin/lib/oto-tools.cjs`. Personal-use Node CLI; all writes are local under the user's project tree. Default mode is dry-run; the user must opt-in with `--apply`. No network surface.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| oto-tools dispatch → migrate.cjs | Same-process `require()` of `./migrate.cjs` from `case 'migrate'` (`oto/bin/lib/oto-tools.cjs:1278-1283`); awaits `migrate.main(args.slice(1), cwd)` then exits with the returned code. Same trust domain. | argv slice, cwd string. |
| User project tree → migrate apply | Migrate WRITES into the user's project (`projectDir`) during `--apply`: `.planning/STATE.md` rewrite, root-level `CLAUDE.md`/`AGENTS.md`/`GEMINI.md` marker rewrite, optional `.planning → .oto` rename, runtime surface dir renames under `.claude/.codex/.gemini`, backup at `.oto-migrate-backup/<timestamp>/`. Default mode is dry-run with zero writes. | Markdown bodies, YAML frontmatter, JSON config. |
| Runtime config dirs (`~/.claude`, `~/.codex`, `~/.gemini`) | EXPLICITLY out of scope. `assertNotRuntimeConfigDir` (`oto/bin/lib/migrate.cjs:44-53`) refuses to operate when the resolved `projectDir` equals or is under any home-relative runtime config dir. | (refused at boundary) |
| Rebrand engine staging tree | `_applyToStaging` (`migrate.cjs:310-365`) creates a tmpdir via `fs.mkdtemp(os.tmpdir(), 'oto-migrate-out-')` and runs the engine into it; engine reports go to a separate `os.tmpdir()` scratch dir (`reportsDir`); both cleaned up in `finally`. No engine writes into the install dir or user's project. | File contents staged for atomic copy-back. |
| `git ls-files --others --ignored --exclude-standard` subprocess | `listIgnoredUntrackedPaths` (`migrate.cjs:178-197`) shells out to `git` with array-args (`spawnSync`), bounded `maxBuffer: 50MB`, output filtered to drop `../` and absolute paths. | Local git index → in-process string list. |
| Backup directory `.oto-migrate-backup/<timestamp>/` | Excluded from copy-back walks via `MIGRATE_SKIP_PATTERNS` (`migrate.cjs:42`) so subsequent runs do not recurse into prior backups. Timestamp from `isoTimestamp()` (`migrate.cjs:271-273`) — `Date.now()`-based, not user-controlled. | Pre-apply file copies. |
| Rename-map JSON (canonical) | Read from package-relative path resolved by `resolveRenameMapPath` (`migrate.cjs:33-38`) — tries pre-install (3-up) and post-install (2-up) layouts. The canonical map is in-package, NOT user-controlled. | Trusted package data. |
| Migrate-derived rename map (temp) | `buildMigrateMapPath` (`migrate.cjs:163-176`) writes a derived map to `os.tmpdir()` named `oto-migrate-map-<pid>-<ts>-<uuid>.json`; cleanup is invoked in `finally`. The `.planning → .oto` path rule is filtered out so the directory rename is opt-in via `--rename-state-dir`. | Trusted derived JSON. |
| Markdown command body (`/oto-migrate`) | `oto/commands/oto/migrate.md` `<process>` block instructs the Claude agent to run `oto migrate --dry-run` first via the Bash tool. `allowed-tools` frontmatter constrains the surface. | Drafting context for `/oto-migrate` invocations. |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-01-01 | T (Tampering) | Plan 01 fixture build (`tests/fixtures/gsd-project-{minimal,full}/`) | accept | Fixtures are static markdown / JSON committed to git; reviewable by diff; no executable bits. Tests copy them into `os.tmpdir()` before any mutation. | closed |
| T-01-02 | I (Information disclosure) | RED-scaffold tests on tmpdir fixtures | mitigate | Defer-require pattern (`tests/migrate-*.test.cjs` require `migrate.cjs` INSIDE each test body, not at file top — confirmed by 01-01-SUMMARY); `fs.mkdtempSync` (POSIX 0700) and `t.after` cleanup are the canonical fixture pattern reused from prior phases. | closed |
| T-01-03 | D (Denial of service) | Wave 0 RED tests blocking CI | accept | Wave 0 is intentionally RED; Wave 1 (Plan 02) and Wave 2 (Plan 03) turn the 10 migrate-*.test.cjs files green within the same phase (01-03-SUMMARY: full repo `node --test tests/*.test.cjs` exits 0). | closed |
| T-01-04 | T (Tampering) — path traversal via crafted `--project-dir` or relative paths | `safeJoin`, all `safeJoin`-anchored reads/writes | mitigate | `oto/bin/lib/migrate.cjs:55-63` — `safeJoin` calls `fs.realpathSync(projectDir)` then `path.resolve(root, relPath)`, then `path.relative` and refuses if it starts with `..` or is absolute. Used by every detect/apply/dryRun helper that joins relative paths to projectDir. | closed |
| T-01-05 | E (Elevation) — migrate operating against runtime config dirs (`~/.claude`, `~/.codex`, `~/.gemini`) | `assertNotRuntimeConfigDir` | mitigate | `oto/bin/lib/migrate.cjs:44-53` — refuses any `projectDir` whose absolute path equals or is under `path.join(os.homedir(), '.claude'|'.codex'|'.gemini')`. Called from `detectGsdProject` and `_applyToStaging` (so both dry-run and apply paths enforce the guard before any read). Command markdown reinforces in prose: "It does not touch the user's runtime config dirs in their home directory" (`oto/commands/oto/migrate.md:18`). | closed |
| T-01-06 | T (Tampering) — engine writing coverage manifests into a non-writable global-install dir (B-04) | `engine.run` `skipReports`/`reportsDir` extension | mitigate | `scripts/rebrand/lib/engine.cjs` accepts `reportsDir` (engine summary at 01-02-SUMMARY: lines 259-265 dry-run path, 322-330 apply path, 405-417 thread-through). `migrate.cjs:324, 660` builds a per-invocation `os.tmpdir()/oto-migrate-reports-<pid>-<ts>-<uuid>` and passes it as `reportsDir`; cleaned up in `finally` (`migrate.cjs:594-595, 700`). No writes into package install dir. | closed |
| T-01-07 | T (Tampering) — non-atomic file rewrites leaving torn writes on crash | `writeFileAtomic` | mitigate | `oto/bin/lib/migrate.cjs:296-308` — writes to `.<basename>.<pid>.<ts>.<uuid>.tmp` then `fsp.rename` (POSIX-atomic on same filesystem); `tmpPath` removed in catch on failure. Used by every staging marker rewrite and final instruction-body rewrite. | closed |
| T-01-08 | T (Tampering) — apply mid-run crash leaves project half-rewritten | Tmpdir staging + atomic copy-back + backup | mitigate | `_applyToStaging` (`migrate.cjs:310-365`) runs the engine into `os.tmpdir()` first; `apply` (`migrate.cjs:535-598`) creates `.oto-migrate-backup/<timestamp>/` BEFORE copy-back (unless `--no-backup`). `finally` block cleans up staging dir + reports dir on any throw. Post-apply, `detectGsdProject` re-checks for residual signals; non-zero exit (code 6) if any GSD signals remain. | closed |
| T-01-09 | T (Tampering) — half-migrated tree (mixed `<!-- GSD: -->` and `<!-- OTO: -->` markers) clobbered without consent | Conflict guard | mitigate | `detectGsdProject` (`migrate.cjs:218-248`) sets `conflicts: ['oto-markers-present']` when both marker classes exist alongside actual content GSD signals; sets `conflicts: ['both-state-dirs']` when both `.planning/` and `.oto/` directories are present; sets `conflicts: ['runtime-path-collision']` when a runtime surface rename target already exists with different content. `_applyToStaging` (`migrate.cjs:316-320`) throws `Error('half-migrated state detected: ...')` with `exitCode = 2` unless `opts.force`. Verified by `tests/migrate-conflict.test.cjs` (passing per 01-02-SUMMARY). | closed |
| T-01-10 | T (Tampering) — runtime surface rename collision overwrites user content | `moveFileIfSafe` byte-equality check | mitigate | `oto/bin/lib/migrate.cjs:443-462` — when destination exists and `preferDestination` is not set, throws `runtime path collision: <from> -> <to>` with `exitCode = 2` unless `filesEqual(fromAbs, toAbs)` shows byte-identical content (no-op overwrite). | closed |
| T-01-11 | E (Elevation) — `spawnSync('git', ...)` shell injection | `listIgnoredUntrackedPaths` | mitigate | `oto/bin/lib/migrate.cjs:178-197` — `spawnSync('git', [...flags], {encoding:'utf8', maxBuffer:50MB})` uses array args (no shell), passes `-C projectDir` rather than chdir, and post-filters output to drop `../` prefixes and absolute paths. Same trust posture as Phase 02's accepted T-02-10 (`git` is trusted system tooling). | closed |
| T-01-12 | I (Information disclosure) — temp rename map with project paths leaks via tmpdir permissions | `os.tmpdir()` map file lifecycle | mitigate | `oto/bin/lib/migrate.cjs:163-176` — file written to `os.tmpdir()` (POSIX 0700 user-private on Linux/macOS) with a UUID-suffixed name; `cleanup()` callback `fs.rmSync(mapPath, {force:true})` invoked in every caller's `finally`. The derived map only contains rename rules (no project content). | closed |
| T-01-13 | D (Denial of service) — recursive walks following symlinks or scratch dirs causing fork-bomb | `MIGRATE_SKIP_PATTERNS` + walker hardcode | mitigate | `oto/bin/lib/migrate.cjs:42` — `MIGRATE_SKIP_PATTERNS = ['.oto-migrate-backup', '.git', 'node_modules', ...RUNTIME_WORKTREE_DIRS]`. `listFiles` (`:382-392`) and `copyTreeAtomic` (`:429-436`) honor the pattern. The engine's walker hardcodes `SCRATCH_DIRS = ['node_modules', '.git', '.oto-rebrand-out', 'reports']` (per Plan 02 interfaces block); migrate explicitly adds `.oto-migrate-backup` so a fresh apply does not recurse into a prior backup. | closed |
| T-01-14 | I (Information disclosure) — gitignored content read or copied into backup | `listIgnoredUntrackedPaths` exclusion | mitigate | `oto/bin/lib/migrate.cjs:199-201` — `listEngineSkipRelPaths` unions `MIGRATE_SKIP_PATTERNS` with whatever the user's `.gitignore` ignores; passed to `engine.run` via `skipRelPaths` so the engine staging pass does not visit ignored content. Backup uses the same skip filter (`listFilesToBackup` `:394-427` invokes `listFiles(..., MIGRATE_SKIP_PATTERNS)` and post-filters). Command markdown documents this (`oto/commands/oto/migrate.md:18`: "skips … untracked files ignored by the target project's gitignore rules"). | closed |
| T-01-15 | T (Tampering) — `node:util.parseArgs` accepting unknown flags as positionals → ambiguous user intent | CLI strict mode | mitigate | `oto/bin/lib/migrate.cjs:603-618` — `parseArgs({...,strict:true, allowPositionals:false})` rejects any unrecognized flag or positional arg; surfaces `migrate: error: ...` on stderr and returns exit 1. Tested via `tests/migrate-cli.test.cjs` (passing per 01-03-SUMMARY). | closed |
| T-01-16 | E (Elevation) — `/oto-migrate` Claude command surface escalating beyond migrate scope | `allowed-tools` frontmatter | mitigate | `oto/commands/oto/migrate.md:5-12` — `allowed-tools` array limited to `Read`, `Write`, `Edit`, `Bash`, `Glob`, `Grep`, `AskUserQuestion`. No `Task` tool, no `WebFetch`. Matches the Phase 02 baseline for project-scoped commands (cf. T-02-16). | closed |
| T-01-17 | T (Tampering) — `$ARGUMENTS` substitution in command body smuggling unintended flags into apply | Process block + dry-run-first | mitigate | `oto/commands/oto/migrate.md:33-39` — `<process>` block instructs the agent to run `--dry-run` first (step 2), present the report, and ask explicit user approval before `--apply` (step 4). The CLI itself enforces `strict:true` parsing (T-01-15). Same trust posture as Phase 02's accepted T-02-11 baseline (`$ARGUMENTS` is a Claude-CLI-managed substitution; identical pattern across `/oto-*` commands). | closed |
| T-01-18 | T (Tampering) — case insertion regressing adjacent oto-tools dispatch | `oto/bin/lib/oto-tools.cjs` edit | mitigate | `case 'migrate'` is positioned at `oto-tools.cjs:1278-1283`, between `case 'from-oto2':` (1272-1276) and `case 'log':` (1285-1290). 01-03-SUMMARY records `node --test --test-concurrency=4 --test-reporter=dot tests/*.test.cjs` exits 0 across the full repo suite — baseline 418 + 10 new migrate tests + Phase 02 log tests + generated-doc gate all green. | closed |
| T-01-19 | I (Information disclosure) — generated runtime matrix doc leaking project-internal paths | `decisions/runtime-tool-matrix.md` regen | accept | 01-03-SUMMARY notes the matrix and `oto/commands/INDEX.md` were regenerated to add `/oto-migrate`; both files are intentional, committed, public docs. The Phase 4 planning-leak gate (`tests/phase-04-planning-leak.test.cjs`) passes — it specifically forbids path-like `.planning` literals leaking into shipped command markdown. | closed |
| T-01-20 | D (Denial of service) — `markdownFilesUnder` / `listFiles` scanning a huge user project | Scope flag + skip patterns | accept | `--scope` defaults to `planning` so the apply walk is bounded to `.planning/`, root instruction files, and runtime surface dirs. `MIGRATE_SKIP_PATTERNS` excludes `.git`, `node_modules`, runtime worktrees, and prior backups. Personal-use cost ceiling (CLAUDE.md): user controls the projectDir; not a server-side input. | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-01-01 | T-01-01 | Fixtures are static, source-controlled, reviewed by diff; no executable bits. Tests always copy them into `os.tmpdir()` before any mutation, so the on-disk fixture cannot be tampered by the test run itself. | Phase planner | 2026-05-07 |
| AR-01-03 | T-01-03 | Wave 0 RED is the spec-driven planning method; closed within the same phase via Plans 02 and 03. Defer-require pattern (01-01-SUMMARY) keeps RED structured (no node:test runner crash). | Phase planner | 2026-05-07 |
| AR-01-19 | T-01-19 | `decisions/runtime-tool-matrix.md` and `oto/commands/INDEX.md` are intentional, public, in-repo docs that advertise the command surface; they do not contain user project content. The phase-04 planning-leak gate enforces that path-like `.planning` literals never leak into shipped command markdown. | Phase planner | 2026-05-07 |
| AR-01-20 | T-01-20 | Personal-use CLI: the user supplies `projectDir`; not a server-side input. `--scope=planning` default plus `MIGRATE_SKIP_PATTERNS` (`.git`, `node_modules`, runtime worktrees, `.oto-migrate-backup`) bound the walk. Per CLAUDE.md "personal-use cost ceiling" constraint. | Phase planner | 2026-05-07 |

Note on T-01-11 (`spawnSync('git', ...)`): mitigated rather than accepted because the array-arg invocation, bounded `maxBuffer`, and post-output `../`/absolute-path filter constitute concrete code-level controls beyond pure trust assumptions. The trust-in-`git`-binary stance itself is the same as Phase 02 AR-02-10 and is implicit here.

---

## Unregistered Threat Flags

None. All three plan SUMMARYs (01-01, 01-02, 01-03) report no `## Threat Flags` section / no new attack surface emerged during implementation that lacked a registered threat. Two implementation-time discoveries (B-01 `.planning` rule filtering and B-04 reports-dir EACCES on global install) were captured during planning and surfaced as engine extensions (T-01-06) — already in the register.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-05-07 | 20 | 20 | 0 | gsd-security-auditor (Claude Opus 4.7, 1M context) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-05-07
