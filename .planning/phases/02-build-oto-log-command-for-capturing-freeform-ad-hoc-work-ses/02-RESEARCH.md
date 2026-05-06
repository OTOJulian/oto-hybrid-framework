# Phase 2: Build /oto-log command - Research

**Researched:** 2026-05-06
**Domain:** New oto slash-command (CJS library + markdown surface + per-runtime parity), append-only artifact store, drafted-from-evidence body capture, integration with `/oto-progress` and `/oto-resume-work`
**Confidence:** HIGH (every recommendation is grounded in code already in this repo; no external library research required)

## Summary

This phase ships a brand-new `oto-*` command following the **exact** pattern established by Phase 01 (`/oto-migrate`) and the existing `/oto-note`, `/oto-quick` commands. Every required helper, dispatch hook, installer mechanism, frontmatter store, slug derivation rule, and atomic-commit primitive **already exists in the repo**. The work is composition, not invention.

The five concrete deliverables — `oto/commands/oto/log.md`, `oto/bin/lib/log.cjs`, dispatch case in `oto/bin/lib/oto-tools.cjs`, public-CLI dispatch in `bin/install.js`, and edits to `oto/workflows/progress.md` + `oto/workflows/resume-project.md` — map 1:1 to where Phase 01 added the same set for `migrate`. Adding `oto/commands/oto/log.md` is sufficient to reach Claude/Codex/Gemini parity because all three installer adapters at `bin/lib/runtime-{claude,codex,gemini}.cjs` already point at `oto/commands` as their command source; new files are picked up automatically at install time.

**Primary recommendation:** Mirror Phase 01's three-wave structure exactly. Wave 0 = test scaffolds + fixtures (RED). Wave 1 = `oto/bin/lib/log.cjs` library closing the unit/integration tests. Wave 2 = `oto/commands/oto/log.md` + dispatch wiring + workflow surface edits closing the cross-command tests.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Capture model**

- **D-01:** Hybrid capture model. `/oto-log <title>` is fire-and-forget by default — one invocation produces one durable entry computed from "since the last log or last commit". `/oto-log start <title>` and `/oto-log end` open and close a bookmarked session whose diff is bounded by the recorded start ref. Both modes write the same artifact shape; session mode adds a `diff_from` git ref recorded at start.
- **D-02:** No real-time keystroke-level edit logging. Edit content is recovered at log-time via `git diff`/`git status` against the bounded ref — a snapshot, not a stream. The hybrid lets the user choose whether the boundary is "since I called `start`" or "since the last log/commit".

**Body source and structure**

- **D-03:** Body is Claude-drafted from observable evidence — recent conversation transcript + `git diff` + `git log` over the bounded range. User always provides a title; the title is required. `--body "..."` flag substitutes a verbatim body and skips drafting.
- **D-04:** Body follows a light structured template with six named sections, each tied to a specific evidence source: **Summary**, **What changed**, **What was discussed**, **Outcome**, **Files touched**, **Open questions / follow-ups**.
- **D-05:** Drafting guardrails: stay on observable facts. Do not editorialize on motive unless the motive is quoted from the user's own messages. Wrap diff content in DATA_START/DATA_END markers when fed to the drafting pass.

**Title and slug**

- **D-06:** Title is the first positional arg in `$ARGUMENTS`. Subcommand keywords (`start`, `end`, `list`, `show`, `promote`) disambiguate only when they are the first token; anything else is treated as the title (mirrors `/oto-note`'s rule).
- **D-07:** Slug derivation: first ~4 meaningful words of the title, lowercase, hyphen-separated, articles/prepositions stripped from the start. Same algorithm `/oto-note` uses.
- **D-08:** Empty title is an error with one-line hint. No silent default.
- **D-09:** Same-minute collisions append `-2`, `-3` to the slug.

**Storage**

- **D-10:** Flat-file layout: `.oto/logs/{YYYYMMDD-HHmm}-{slug}.md`. One file per entry. No per-log directory. No rolling daily file.
- **D-11:** Frontmatter (locked shape): `date`, `title`, `slug`, `mode` (oneshot|session), `phase` (null or string), `diff_from`, `diff_to`, `files_touched`, `open_questions`, `promoted`.
- **D-12:** Session active-state at `.oto/logs/.active-session.json`. Exactly one active session per project; calling `start` while one is open emits a warning and auto-ends the prior. The file is gitignored.

**Surfacing in /oto-progress**

- **D-13:** Replace existing "Recent Work" with "Recent Activity" section interleaving the latest 3–5 log and summary entries chronologically. One-liner format: `[YYYY-MM-DD HH:mm] [log|summary] <title> [(phase NN)]`.
- **D-14:** No new STATE.md section for logs. Discoverable via `.oto/logs/`.

**Surfacing in /oto-resume-work**

- **D-15:** Status panel surfaces the most recent log's **Summary** line as a "where were we?" hint.
- **D-16:** If `.oto/logs/.active-session.json` exists, surface as resumption hint alongside `HANDOFF.json` and `.continue-here.md`.

**CLI surface and lifecycle**

- **D-17:** Subcommands: `<title>`, `start <title>`, `end [<closing notes>]`, `list`, `show <slug>`, `promote <slug> [--to quick|todo]`.
- **D-18:** Flags: `--body "..."`, `--phase N`, `--since <ref>`.
- **D-19:** Entries immutable. No `edit`. Re-running with same title gets `-2`/`-3` collision suffix.
- **D-20:** Promotion: `--to quick` seeds `.oto/quick/{YYYYMMDD}-{slug}/PLAN.md`; `--to todo` creates one `.oto/todos/pending/{NNN}-{slug}.md` per Open Questions item; both set source `promoted: true`. `--to plan` is intentionally unsupported.
- **D-21:** `--phase N` is informational; logs stay at `.oto/logs/`.

**Runtime parity**

- **D-22:** Claude/Codex/Gemini parity via `oto/commands/oto/log.md` + `oto/bin/lib/log.cjs` + `oto-tools log` dispatch + public `oto log` CLI path. Existing installer adapters convert per-runtime.

### Claude's Discretion

- Exact wording/headings of the drafted-body template (six-section coverage required, specific titles open).
- Diff boundary computation in fire-and-forget mode when no prior log/commit exists in a reasonable window (default 24h, configurable).
- Regex/heuristic set used to extract Open Questions markers from transcript.
- Whether the implementation calls `oto-sdk query` vs direct file IO — pick whatever matches existing `oto/bin/lib/*.cjs` patterns. **Research recommendation:** direct CJS calls (the `migrate.cjs` precedent does not use `oto-sdk query` from inside the library; see Architecture §Pattern 2 below).
- Test fixture shape and the specific edge cases enumerated in `*.test.cjs` files.

### Deferred Ideas (OUT OF SCOPE)

- Real-time keystroke/IDE edit logging.
- Cross-project `--global` log scope.
- Per-phase log filtering in `/oto-progress`.
- `/oto-log edit` to amend entries (immutable).
- `promote --to plan`.
- Auto-suggestion to run `/oto-log` after large uncommitted diffs sit unlogged.
- `.continue-here.md` ↔ `.active-session.json` unification.
</user_constraints>

<phase_requirements>
## Phase Requirements

The CONTEXT.md decisions D-01 through D-22 act as the requirement set for this phase (no `REQ-LOG-NN` IDs were assigned in REQUIREMENTS.md — that file does not exist for the post-v0.1.0 milestone). Below maps each decision to the research findings that enable implementation.

| Decision | Description | Research Support |
|----------|-------------|------------------|
| D-01, D-02 | Hybrid capture model with git-diff snapshot | `git diff <ref>..HEAD` + `git log <ref>..HEAD` + `git status --porcelain`; `node:child_process.spawnSync` with `git` binary verified present at `/usr/bin/git`. See `## Code Examples §git-helper`. |
| D-03 | Claude-drafted body from evidence | Drafting happens **inside the Claude command markdown** (process step), not inside the CJS library. Library returns the structured evidence bundle (diff text, file list, status); markdown formats the prompt. See `## Architecture Patterns §Pattern 3`. |
| D-04, D-05 | Six-section template + DATA_START/DATA_END guardrails | Pure markdown convention; documented in `oto/commands/oto/log.md` process steps. No library work. |
| D-06 | First-token subcommand disambiguation | Mirror `oto/workflows/note.md` step `parse_subcommand` (table-driven match on entire-token). See `## Code Examples §subcommand-disambiguation`. |
| D-07 | Slug derivation (first ~4 meaningful words, articles stripped) | **Two existing helpers, neither does articles-stripping precisely:** (a) `oto-tools generate-slug` → `commands.cmdGenerateSlug` → `core.generateSlugInternal` (URL-safe slugify, no stop-word filter); (b) the verbatim algorithm in `oto/workflows/note.md` step `append`. **Recommendation:** add a small `deriveLogSlug(title)` helper inside `log.cjs` that implements the note rule, with a `STOP_WORDS` set (a, an, the, of, to, in, for, on, at, by, with, from). Do NOT extend `core.generateSlugInternal` — its consumers expect URL-safe behavior, not stop-word stripping. See `## Code Examples §slug-derivation`. |
| D-08 | Empty title error | Library throws; markdown handles user-facing message. |
| D-09 | `-2`/`-3` collision suffix | `fs.existsSync` loop in `writeLogEntry()`. See `## Code Examples §collision-suffix`. |
| D-10 | Flat-file layout `.oto/logs/{YYYYMMDD-HHmm}-{slug}.md` | `path.join(planningRoot, 'logs', `${stamp}-${slug}.md`)`. `mkdir -p` via `fs.mkdirSync(dir, { recursive: true })`. |
| D-11 | Frontmatter shape | Use `oto/bin/lib/frontmatter.cjs` `extractFrontmatter` / `reconstructFrontmatter` / `spliceFrontmatter` directly (these are exported, see `module.exports` line 378). For the **initial write**, emit YAML by hand using the documented shape OR call `frontmatter.spliceFrontmatter('', { date, title, ... })`. For `promoted: true` updates, call `frontmatter.cmdFrontmatterSet` or splice via the lib. See `## Code Examples §frontmatter-write`. |
| D-12 | `.active-session.json` ephemeral state | `fs.writeFileSync(JSON.stringify({ start_ref, start_time, title }, null, 2))`. Add `.oto/logs/.active-session.json` to `.gitignore`. |
| D-13 | Recent Activity in `/oto-progress` | Edit `oto/workflows/progress.md` step `recent` (lines 84-93). Replace SUMMARY-only glob with two globs (logs + summaries) merged by date. Use `oto-sdk query frontmatter.get` for log titles + dates and `oto-sdk query summary-extract --fields one_liner` for summary one-liners. See `## Code Examples §progress-recent-activity`. |
| D-14 | No STATE.md section | Confirmed; do not edit `oto/bin/lib/state.cjs`. |
| D-15 | Resume "where were we?" hint | Edit `oto/workflows/resume-project.md` step `present_status` (lines 114-153). Read the most recent log file, extract Summary section. |
| D-16 | `.active-session.json` checkpoint detection | Edit `oto/workflows/resume-project.md` step `check_incomplete_work` (lines 62-112). Add a sibling check after the `.continue-here` block. |
| D-17, D-18 | Subcommand surface and flags | `node:util.parseArgs` (already used in `migrate.cjs:600-618`). |
| D-19 | Immutability | No `edit` dispatch case — enforced by absence. |
| D-20 | Promotion to quick / todo | Use `oto-tools generate-slug` for slug, `path.join` for targets. Quick PLAN.md frontmatter shape: documented in `oto/workflows/quick.md` (planner output spec). Todo frontmatter shape: documented in `oto/workflows/add-todo.md` step `create_file` (lines 92-112). See `## Code Examples §promotion-target-shapes`. |
| D-21 | `--phase N` informational only | Frontmatter only; no file movement. |
| D-22 | Runtime parity | Verified via inspection of `bin/lib/runtime-claude.cjs:169`, `bin/lib/runtime-codex.cjs:58,175`, `bin/lib/runtime-gemini.cjs:174` — all three adapters source from `oto/commands`. **Adding `oto/commands/oto/log.md` requires zero installer changes.** Public CLI parity needs the new dispatch case in `bin/install.js` (mirrors lines 67-71 for `migrate`). See `## Architecture Patterns §Pattern 4`. |

### Project Constraints (from CLAUDE.md)

- Node.js >= 22 only; no top-level TypeScript; CJS for all `oto/bin/lib/*` and tests.
- Test framework: built-in `node:test` only. Test files: `tests/*.test.cjs`. Run: `npm test` (`node --test --test-concurrency=4 tests/*.test.cjs`).
- No bundlers, no transpilers, ship raw `.cjs`/`.md`.
- Atomic commits per state change via `oto-tools commit --files <files>` (per CLAUDE.md "Conventions" and `oto/bin/lib/commands.cjs:cmdCommit`). The new log artifact is a state change — Wave 1 must add a commit step or the workflow must invoke `oto-tools commit` after writing.
- License attribution: this code is wholly original (no upstream port), so no `Source: github:obra/superpowers` or `Source: github:gsd-build/get-shit-done` headers required.
- GSD workflow enforcement: this phase is being delivered through `/gsd-execute-phase`, satisfying the directive.
- Personal-use cost ceiling: no new runtime dependencies allowed; all primitives reuse existing `oto/bin/lib/*` modules (frontmatter, core, commands).
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js | >= 22.0.0 | Runtime | Locked in `package.json` engines + CLAUDE.md `[VERIFIED: package.json line 4-ish, node --version → v22.17.1]` |
| `node:test` | built-in | Test framework | Project standard (CLAUDE.md TL;DR row 8). All 13 existing migrate tests use it. `[VERIFIED: tests/migrate-cli.test.cjs:3]` |
| `node:assert/strict` | built-in | Assertions | Used by every test in `tests/`. `[VERIFIED: tests/migrate-cli.test.cjs:4]` |
| `node:util.parseArgs` | built-in | CLI flag parsing inside `log.cjs` | Phase 01 precedent. `[VERIFIED: oto/bin/lib/migrate.cjs:604]` |
| `node:child_process.spawnSync` | built-in | Run `git diff`/`git status`/`git log` synchronously | Used throughout existing tests. `[VERIFIED: tests/migrate-cli.test.cjs:7]` |
| `node:fs`, `node:fs/promises`, `node:path`, `node:os`, `node:crypto` | built-in | File/path/tmp/uuid primitives | Phase 01 imports identical set. `[VERIFIED: oto/bin/lib/migrate.cjs:11-16]` |

### Supporting (in-repo, already shipped)
| Module | Path | Purpose | When to Use |
|--------|------|---------|-------------|
| `frontmatter.cjs` | `oto/bin/lib/frontmatter.cjs` | YAML frontmatter parse/serialize/splice | Write log entries with structured frontmatter; flip `promoted: true` on promotion. `[VERIFIED: file exists, exports `extractFrontmatter`, `reconstructFrontmatter`, `spliceFrontmatter`, `cmdFrontmatterSet`]` |
| `commands.cjs` | `oto/bin/lib/commands.cjs` | Slug helper (`cmdGenerateSlug` → `core.generateSlugInternal`), commit (`cmdCommit`), timestamps (`cmdCurrentTimestamp`) | Reuse existing slug helper as a fallback / sanity step; reuse commit for atomic write. `[VERIFIED: grep oto/bin/lib/commands.cjs lines 38, 53, 250]` |
| `core.cjs` | `oto/bin/lib/core.cjs` | `findProjectRoot`, `planningRoot`, `planningDir`, `safeReadFile`, `atomicWriteFileSync`, `error`, `output`, `generateSlugInternal` | Path resolution, atomic write, slug primitive. `[VERIFIED: oto/bin/lib/oto-tools.cjs:177, 263; frontmatter.cjs:7]` |
| `init.cjs` | `oto/bin/lib/init.cjs` | Init resolvers for workflows | **No new init resolver required**: `init progress` and `init resume` already exist (lines 1271, 565) and the log workflow can read its own state inline. Adding `init log` is optional polish, not a blocker. |
| `migrate.cjs` | `oto/bin/lib/migrate.cjs` | **Reference template** — same module shape we want | Read as the canonical example for `main()`, `parseArgs`, exit codes, helper layout. `[VERIFIED: file exists, 705 lines]` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff | Decision |
|------------|-----------|----------|----------|
| Inline `node:child_process` for git | Wrapper helper in `core.cjs` | Cleaner abstraction, more files to touch | Inline; no existing project git wrapper, Phase 01 precedent inlines `spawnSync('git', ...)` |
| Hand-rolled YAML serializer | `frontmatter.reconstructFrontmatter` | Reuse the in-repo serializer | **Use `reconstructFrontmatter` / `spliceFrontmatter`** — already has quote-escaping for `:`, `#`, list handling, edge cases (frontmatter.cjs:120-191). Hand-rolled YAML risks subtle escape bugs that break `oto-sdk query frontmatter.get` consumers. |
| New `init log` resolver | Inline path computation in `log.cjs` | Symmetry vs. minimum surface | **Inline.** None of the existing single-file commands (`note`, `migrate`) added init resolvers. Following precedent. |
| `oto-sdk query` from CJS library | Direct require of `frontmatter.cjs` | Cleaner subprocess boundary vs. simpler call graph | **Direct require.** The `migrate.cjs` library does not invoke `oto-sdk query` from itself; it imports `engine.cjs` directly via `require('../../../scripts/rebrand/lib/engine.cjs')` (migrate.cjs:17). `oto-sdk query` is for **markdown workflows** to call in bash; library code calls modules directly. |
| Vitest for new tests | `node:test` | Vitest is ESM-first; this project is CJS | Use `node:test`. CLAUDE.md row 8 + existing tests/ all use it. |

**Installation:** No new packages. All deps in-repo and stdlib.

**Version verification:** `node --version` → `v22.17.1`, `npm --version` → `10.9.2`, `git --version` → `git version 2.39.3 (Apple Git-146)`. Test runner: `npm test` invokes `node --test --test-concurrency=4 tests/*.test.cjs` `[VERIFIED: package.json scripts.test]`.

## Architecture Patterns

### Recommended File Layout (deliverables)
```
oto/
├── commands/
│   └── oto/
│       └── log.md                 # NEW — Claude markdown command surface
├── bin/
│   └── lib/
│       ├── log.cjs                # NEW — CLI library (mirrors migrate.cjs shape)
│       └── oto-tools.cjs          # EDIT — add 'log' dispatch case (~10 lines)
├── workflows/
│   ├── progress.md                # EDIT — step `recent` becomes "Recent Activity" (D-13)
│   └── resume-project.md          # EDIT — steps `check_incomplete_work` + `present_status` (D-15, D-16)
bin/
└── install.js                     # EDIT — add public `oto log` dispatch (~5 lines, mirrors migrate at lines 67-71)
tests/
├── log-slug.test.cjs              # NEW — slug derivation unit tests
├── log-frontmatter.test.cjs       # NEW — write + read frontmatter round-trip
├── log-oneshot.test.cjs           # NEW — fire-and-forget end-to-end
├── log-session.test.cjs           # NEW — start/end lifecycle
├── log-list.test.cjs              # NEW — list/show subcommands
├── log-promote.test.cjs           # NEW — promote --to quick / --to todo
├── log-cli.test.cjs               # NEW — oto-tools log + public oto log dispatch
├── log-command-md.test.cjs        # NEW — oto/commands/oto/log.md frontmatter shape
├── log-progress-surface.test.cjs  # NEW — Recent Activity surface in progress.md
└── log-resume-surface.test.cjs    # NEW — active-session.json detection in resume-project.md
.gitignore                         # EDIT — add `.oto/logs/.active-session.json`
```

### Pattern 1: Markdown command + thin CLI dispatch + public CLI alias

**What:** Every `/oto-*` command has three layers — Claude-facing markdown, internal `oto-tools` dispatch, public `oto` binary alias.

**When to use:** Always for new commands.

**Phase 01 precedent (migrate):**
- Markdown: `oto/commands/oto/migrate.md` (40 lines)
- Library: `oto/bin/lib/migrate.cjs` (705 lines)
- Internal dispatch: `oto/bin/lib/oto-tools.cjs:1277-1282` (case `'migrate'` → `migrate.main(args.slice(1), cwd)`)
- Public dispatch: `bin/install.js:67-71` (`if (argv[0] === 'migrate')` → same call)

For `/oto-log`, replicate exactly. The new dispatch case in `oto-tools.cjs`:
```javascript
case 'log': {
  const log = require('./log.cjs');
  const exitCode = await log.main(args.slice(1), cwd);
  process.exit(typeof exitCode === 'number' ? exitCode : 0);
  break;
}
```
And in `bin/install.js`, before the `let parsed` block:
```javascript
if (argv[0] === 'log') {
  const log = require('../oto/bin/lib/log.cjs');
  const code = await log.main(argv.slice(1), process.cwd());
  process.exit(code);
}
```

### Pattern 2: Library-internal direct requires, not `oto-sdk query`

**What:** CJS libraries call other CJS libraries by `require()`, not by spawning `oto-sdk query`.

**Why:** `oto-sdk query` is for **markdown workflows** (which are bash-shell environments) to call. Inside a Node library, we already have the modules in-process; spawning a subprocess to call them back is an unnecessary cost.

**Evidence:** `migrate.cjs` requires `engine.cjs` directly (line 17). `frontmatter.cjs` exports both `cmdFrontmatterGet` (the CLI command) and `extractFrontmatter` (the function). Library code uses the function; CLI dispatch uses the command.

**Application:** `log.cjs` will:
```javascript
const { extractFrontmatter, spliceFrontmatter, reconstructFrontmatter } = require('./frontmatter.cjs');
const { generateSlugInternal, atomicWriteFileSync, planningDir } = require('./core.cjs');
```

Markdown workflows still use `oto-sdk query` for the same operations.

### Pattern 3: Body drafting happens in markdown, not in the library

**What:** The CJS library returns the **evidence bundle** (raw diff text, file list, status, recent commits, conversation transcript handle). The Claude-facing markdown turns that bundle into the six-section body.

**Why:**
- The library cannot draft prose — it has no LLM. Any "drafting" inside `log.cjs` would degrade to a hand-rolled string template.
- The markdown command runs inside Claude's context, where conversation transcript is implicitly available (the model sees its own history).
- Splitting at this seam means non-Claude runtimes (Codex/Gemini) get the same evidence and use their own drafting; the library stays runtime-agnostic.

**Evidence:** `oto/workflows/note.md` step `append` does its own work in the markdown layer (slug, file write) — the heavy capture logic lives in the workflow, not in a `note.cjs` (which doesn't exist; notes are pure markdown). For `/oto-log` we go further: the **library** writes the file, but the **drafted body** is composed by the markdown command and passed in.

**API shape:**
```javascript
// log.cjs
async function captureEvidence({ since, mode, cwd }) {
  return {
    diff_from: <ref>,
    diff_to: 'HEAD',
    diff_text: <git diff output, possibly truncated>,
    files_touched: <array from --name-only>,
    status_text: <git status --porcelain>,
    recent_commits: <git log --oneline output>,
  };
}

async function writeLogEntry({ title, body, frontmatter, cwd }) {
  // Composes file path, applies collision suffix, writes file, returns path
}
```

The markdown command:
1. Calls `oto-tools log evidence --since <ref>` → JSON evidence bundle
2. Drafts body sections from that bundle + transcript context
3. Calls `oto-tools log write --title "..." --body-file <tmp>` → writes file, prints path
4. Calls `oto-tools commit "log: <title>" --files <path>`

### Pattern 4: Per-runtime parity is FREE for new markdown commands

**What:** Adding `oto/commands/oto/log.md` is sufficient for Claude/Codex/Gemini.

**Why:** All three installer adapters point at the same `oto/commands` source dir:
- `bin/lib/runtime-claude.cjs:169` — `commands: 'oto/commands'`
- `bin/lib/runtime-codex.cjs:58, 175` — `commands: 'oto/commands'`
- `bin/lib/runtime-gemini.cjs:174` — `commands: 'oto/commands'`

`[VERIFIED: grep output above]`

**Confirms:** No installer changes needed. The transforms (Codex skill conversion, Gemini frontmatter dialect) read whatever lives in `oto/commands/oto/*.md` at install time.

**Testing parity:** `tests/log-command-md.test.cjs` should assert that:
1. `oto/commands/oto/log.md` exists.
2. Its frontmatter has `name: oto:log`, `description`, `argument-hint`, `allowed-tools` (mirror migrate.md frontmatter shape).
3. The markdown body contains the locked subcommand surface (D-17).

This guarantees a regression in any of the three runtime adapters cannot silently break `/oto-log` because the markdown source is the contract.

### Anti-Patterns to Avoid

- **Don't write a `.oto/logs/INDEX.md` file.** D-10 chose flat-file storage; an index is sync-burden Claude/git can't keep clean. List-time globbing is fast enough for personal-scale use (<1000 entries).
- **Don't extend `core.generateSlugInternal` to strip articles.** It has many consumers (todos, scaffolding, milestone slugs) that expect URL-safe behavior, not stop-word filtering. Add a local `deriveLogSlug()` in `log.cjs`.
- **Don't put drafted-body composition in the library.** See Pattern 3.
- **Don't spawn `oto-sdk query` from inside `log.cjs`.** See Pattern 2.
- **Don't add `git` as a process-level dep precondition.** Phase 01 inlines `spawnSync('git', ...)` and handles non-git directories gracefully. Match that style.
- **Don't move logs into phase dirs even when `--phase N` is set.** D-21 locks this; the test suite must enforce it.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| YAML frontmatter parsing/writing | Custom YAML parser | `frontmatter.cjs` (`extractFrontmatter`, `reconstructFrontmatter`, `spliceFrontmatter`, `cmdFrontmatterSet`) | The in-repo parser handles inline arrays, nested objects, quote-escaping for `:` and `#`, and is round-trip safe with `cmdFrontmatterGet` consumers. `[VERIFIED: oto/bin/lib/frontmatter.cjs:43-191]` |
| URL-safe slug from arbitrary string | Regex slugifier | `core.generateSlugInternal` (via `oto-tools generate-slug`) — for promotion targets only | The note-style slug (with article stripping) is its own concern; layer that on top, don't replace the URL-safe primitive. |
| Atomic file write | `fs.writeFileSync` directly | `core.atomicWriteFileSync` | Project convention for any state-change write; avoids partial writes on crash. `[VERIFIED: frontmatter.cjs:347, 361]` |
| Git commit of new artifact | `spawnSync('git', ['commit', ...])` inline | `oto-tools commit "msg" --files <path>` | Honors atomic-commit-per-state-change convention; CONTEXT.md `code_context` flags this as a hard requirement. `[VERIFIED: oto/bin/lib/commands.cjs:cmdCommit at line 250]` |
| Project-root resolution | `process.cwd()` | `core.findProjectRoot(cwd)` | Walks up from cwd to find `.oto/`. Already wrapped at `oto-tools.cjs:348`. |
| Planning-dir path | `path.join(cwd, '.oto')` | `core.planningDir(cwd)` / `core.planningRoot(cwd)` | Honors workstream resolution and migrate-without-rename projects (see `progress.md:24-31`). |
| CLI flag parsing in `log.cjs` | Hand-rolled `args.indexOf('--flag')` loops | `node:util.parseArgs` | Phase 01 uses it (migrate.cjs:600-618); strict mode catches typos at parse-time. |

**Key insight:** Every primitive `/oto-log` needs already exists in `oto/bin/lib/`. The reason this phase is small (3 plans, ~700 lines of code total estimated) is that `migrate.cjs` already proved out the pattern and the helpers are reusable. **The risk in this phase is over-engineering — the temptation to build "just one more" abstraction.** Resist; ship the thinnest layer that closes the tests.

## Common Pitfalls

### Pitfall 1: Drafting heuristics that depend on conversation transcript inside the CJS library

**What goes wrong:** Tempted to make `log.cjs` "smart" about extracting open questions or summarizing changes.
**Why it happens:** Drafted-from-evidence (D-03) reads like a library responsibility.
**How to avoid:** Library returns evidence bundle (raw text); markdown command does the drafting. See Pattern 3.
**Warning signs:** A `log.cjs` function with a name like `extractOpenQuestions(transcript)` that returns prose. That belongs in the markdown.

### Pitfall 2: Slug collision suffix race condition

**What goes wrong:** Two log entries written within the same minute by two parallel agents could both compute `{stamp}-{slug}.md` see "no collision", and both write the same file.
**Why it happens:** `fs.existsSync` followed by `fs.writeFileSync` is not atomic.
**How to avoid:** Use `fs.openSync(path, 'wx')` (exclusive create) inside the collision loop — fail fast on race, retry with next suffix. Acceptable here because the personal-use cost ceiling means parallel-log is rare.
**Warning signs:** Tests that don't exercise rapid same-minute writes will not catch this.

### Pitfall 3: `git diff` truncation and prompt injection

**What goes wrong:** A massive diff (e.g., 50KB of generated lockfile changes) gets stuffed verbatim into the body, blowing context budget. Worse, diff content can contain text like `Ignore previous instructions and...`.
**Why it happens:** The library captures raw `git diff` output.
**How to avoid:**
- Cap diff text to N KB (suggest 8KB by default; configurable later) and append `... <truncated>` marker.
- D-05 already specifies DATA_START/DATA_END markers wrapping diff content in the drafting prompt. The library should put those markers into the evidence bundle so the markdown command never forgets.
**Warning signs:** No size cap on `evidence.diff_text`. Direct interpolation of `diff_text` into prompts without the markers.

### Pitfall 4: `.active-session.json` not in `.gitignore` ⇒ ephemeral state committed accidentally

**What goes wrong:** `oto-tools commit` wraps `git add` patterns; if a developer runs `git add -A`, the active-session JSON gets tracked.
**Why it happens:** Easy to forget the gitignore line.
**How to avoid:** Wave 1 PLAN.md must include the `.gitignore` edit as a `files_modified` entry, and `tests/log-session.test.cjs` should assert that `.gitignore` contains the pattern.
**Warning signs:** Test fixtures with a tracked `.active-session.json` file in any test snapshot.

### Pitfall 5: Replacing "Recent Work" in `progress.md` breaks routing

**What goes wrong:** `progress.md` step `recent` (lines 84-93) feeds into the rendered report at step `report` (lines 104-149). If the new "Recent Activity" interleaving changes the JSON shape that downstream steps expect, routing logic could silently degrade.
**Why it happens:** The `recent` block currently uses `summary-extract` + `one_liner` field. Logs don't have a SUMMARY-shaped frontmatter; they have a `Summary` markdown section.
**How to avoid:** Keep two extraction paths in the workflow markdown (one for SUMMARY.md via `summary-extract`, one for log files via reading the body's first `## Summary` block). Render both as one-liners but parse them differently. Test in `tests/log-progress-surface.test.cjs` by golden-stringing the rendered "Recent Activity" block from a fixture with both kinds of artifacts.
**Warning signs:** Single-path extraction logic in the new workflow markdown. No fixture covering "no logs yet, only summaries" and "no summaries yet, only logs".

### Pitfall 6: Cross-platform timestamp format

**What goes wrong:** D-11 specifies `date: "YYYY-MM-DD HH:mm"` (local time, with space). `commands.cmdCurrentTimestamp` may emit a different format.
**Why it happens:** Multiple timestamp formats in the codebase (`full`, `date`, `filename`).
**How to avoid:** Verify the existing helper supports `YYYY-MM-DD HH:mm` or add a small inline formatter in `log.cjs` using `Date.toISOString().slice(0, 16).replace('T', ' ')`. Filename uses `YYYYMMDD-HHmm` (no separators) — same `Date` object, two `String.prototype.replace` calls.
**Warning signs:** Tests that pass with a stubbed clock but fail under real system time because of TZ/format mismatch.

### Pitfall 7: Promotion `--to todo` ID numbering collisions across `pending/` and `completed/`

**What goes wrong:** `add-todo.md` step `create_file` step 6 says scan **both** `pending/` and `completed/` for the highest ID. If `/oto-log promote --to todo` only scans `pending/`, two IDs could collide.
**Why it happens:** The pattern is documented in workflow markdown, not encoded in a single helper.
**How to avoid:** Either reuse `oto-tools` (if a helper exists) or replicate the scan-both rule in `log.cjs:promoteToTodo`. Test with a fixture that has 2 pending + 2 completed and assert next ID = 5.
**Warning signs:** `globSync('.oto/todos/pending/*.md')` without a parallel scan of `completed/`.

## Code Examples

Verified patterns from this repo:

### subcommand-disambiguation
```javascript
// log.cjs main() — pattern from migrate.cjs:600-650 + note.md step `parse_subcommand`
const SUBCOMMANDS = new Set(['start', 'end', 'list', 'show', 'promote']);

function routeSubcommand(args) {
  if (args.length === 0) return { sub: 'help', rest: [] };
  const first = args[0];
  if (SUBCOMMANDS.has(first)) {
    return { sub: first, rest: args.slice(1) };
  }
  // Title is everything; the title can start with words that look like subcommands
  // ONLY when they're the first token. /oto-log "list of fixes I made" → sub: 'oneshot', title: 'list of fixes...'
  return { sub: 'oneshot', rest: args };
}
```

### slug-derivation
```javascript
// log.cjs — local helper, NOT a core.cjs change
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'of', 'to', 'in', 'for', 'on', 'at', 'by', 'with', 'from',
  'and', 'or', 'but', 'is', 'was', 'are', 'were', 'i', 'we', 'my', 'our',
]);

function deriveLogSlug(title) {
  const words = title
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  // Strip leading stop-words only (per note.md rule: "articles/prepositions stripped from the start")
  while (words.length && STOP_WORDS.has(words[0])) words.shift();
  const meaningful = words.slice(0, 4).join('-');
  if (!meaningful) {
    // Fallback: use core.generateSlugInternal on the original title to guarantee non-empty
    const core = require('./core.cjs');
    return core.generateSlugInternal(title) || 'untitled';
  }
  return meaningful;
}
```

### collision-suffix
```javascript
// log.cjs — exclusive-create write loop
const fs = require('node:fs');
const path = require('node:path');

function writeWithCollisionSuffix(dir, baseName, ext, content) {
  fs.mkdirSync(dir, { recursive: true });
  let attempt = 1;
  while (true) {
    const suffix = attempt === 1 ? '' : `-${attempt}`;
    const filePath = path.join(dir, `${baseName}${suffix}${ext}`);
    try {
      const fd = fs.openSync(filePath, 'wx'); // 'wx' = create-only, fail if exists
      fs.writeSync(fd, content);
      fs.closeSync(fd);
      return filePath;
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
      attempt += 1;
      if (attempt > 99) throw new Error(`Too many collisions for ${baseName}`);
    }
  }
}
```

### frontmatter-write
```javascript
// log.cjs — initial entry write using existing frontmatter helpers
const { spliceFrontmatter } = require('./frontmatter.cjs');
const { atomicWriteFileSync, normalizeMd } = require('./core.cjs');

function buildLogContent({ title, body, mode, phase, diff_from, diff_to, files_touched, open_questions, date, slug }) {
  const fm = {
    date,
    title,
    slug,
    mode,
    phase: phase || null,
    diff_from,
    diff_to,
    files_touched: files_touched || [],
    open_questions: open_questions || [],
    promoted: false,
  };
  return spliceFrontmatter(body, fm); // body is the drafted six-section markdown
}

function writeLogFile(filePath, content) {
  atomicWriteFileSync(filePath, normalizeMd(content));
}
```

### git-helper
```javascript
// log.cjs — minimal git wrapper. No new dep; spawnSync is stdlib.
const { spawnSync } = require('node:child_process');

function git(args, cwd) {
  const res = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (res.status !== 0) {
    const e = new Error(`git ${args.join(' ')}: ${res.stderr.trim()}`);
    e.gitExitCode = res.status;
    throw e;
  }
  return res.stdout;
}

function gitDiffSinceRef(ref, cwd) {
  return git(['diff', `${ref}..HEAD`], cwd);
}

function gitFilesChangedSinceRef(ref, cwd) {
  return git(['diff', '--name-only', `${ref}..HEAD`], cwd).split('\n').filter(Boolean);
}

function gitLastCommitRef(cwd) {
  return git(['rev-parse', 'HEAD'], cwd).trim();
}

function gitStatus(cwd) {
  return git(['status', '--porcelain'], cwd);
}
```

### promotion-target-shapes
```javascript
// log.cjs — promote --to quick
function promoteToQuick({ logPath, planningRoot }) {
  const log = readLogFile(logPath); // returns { frontmatter, body, sections }
  const dateCompact = log.frontmatter.date.slice(0, 10).replace(/-/g, ''); // YYYYMMDD
  const slug = log.frontmatter.slug;
  const dir = path.join(planningRoot, 'quick', `${dateCompact}-${slug}`);
  fs.mkdirSync(dir, { recursive: true });
  // Quick PLAN.md frontmatter shape — see oto/workflows/quick.md and the planner output spec.
  // Minimum fields: type: quick, status: pending, plus the title and seed body.
  const planContent = spliceFrontmatter(
    `## Goal\n\n${log.frontmatter.title}\n\n## Seed (from log)\n\n${log.sections.summary}\n${log.sections.what_changed || ''}\n`,
    {
      type: 'quick',
      slug,
      created: log.frontmatter.date,
      source_log: path.relative(planningRoot, logPath),
    }
  );
  atomicWriteFileSync(path.join(dir, 'PLAN.md'), normalizeMd(planContent));
  // Mark source promoted
  setLogPromoted(logPath, true);
  return path.join(dir, 'PLAN.md');
}

// log.cjs — promote --to todo (one todo per Open Question)
// Todo frontmatter shape per oto/workflows/add-todo.md step `create_file` lines 95-110:
//   created, title, area, files (array)
function promoteToTodo({ logPath, planningRoot }) {
  const log = readLogFile(logPath);
  const questions = log.sections.open_questions || []; // array of strings
  const pending = path.join(planningRoot, 'todos', 'pending');
  const completed = path.join(planningRoot, 'todos', 'completed');
  fs.mkdirSync(pending, { recursive: true });
  // Scan BOTH dirs for highest existing ID — replicates add-todo.md rule
  const existingIds = [
    ...fs.readdirSync(pending, { withFileTypes: true }),
    ...(fs.existsSync(completed) ? fs.readdirSync(completed, { withFileTypes: true }) : []),
  ]
    .filter(d => d.isFile() && d.name.endsWith('.md'))
    .map(d => parseInt(d.name.match(/^(\d{3})/)?.[1] || '0', 10));
  let nextId = (existingIds.length ? Math.max(...existingIds) : 0) + 1;
  const created = [];
  for (const q of questions) {
    const slug = deriveLogSlug(q);
    const id = String(nextId).padStart(3, '0');
    const fm = {
      created: log.frontmatter.date,
      title: q,
      area: 'general',
      files: [],
      source: `promoted from /oto-log show ${log.frontmatter.slug}`,
    };
    const content = spliceFrontmatter(
      `## Problem\n\n${q}\n\n## Solution\n\nTBD\n`,
      fm
    );
    const filePath = path.join(pending, `${id}-${slug}.md`);
    atomicWriteFileSync(filePath, normalizeMd(content));
    created.push(filePath);
    nextId += 1;
  }
  setLogPromoted(logPath, true);
  return created;
}
```

### progress-recent-activity
```bash
# oto/workflows/progress.md step `recent` — replacement
# Pattern: list both kinds of artifacts, decorate with date+kind, sort, take last N.

# Logs (newest 10, frontmatter has date + title + phase)
LOG_FILES=$(ls -1 .oto/logs/*.md 2>/dev/null | tail -10)
LOG_ENTRIES=()
for f in $LOG_FILES; do
  date=$(oto-sdk query frontmatter.get "$f" date --raw)
  title=$(oto-sdk query frontmatter.get "$f" title --raw)
  phase=$(oto-sdk query frontmatter.get "$f" phase --raw 2>/dev/null || echo "null")
  LOG_ENTRIES+=("[$date] [log] $title$([[ $phase != null ]] && echo \" (phase $phase)\")")
done

# Summaries (newest 10, frontmatter has phase, completed; one_liner via summary-extract)
SUMMARIES=$(ls -1t .oto/phases/*/*-SUMMARY.md 2>/dev/null | head -10)
SUM_ENTRIES=()
for f in $SUMMARIES; do
  one_liner=$(oto-sdk query summary-extract "$f" --fields one_liner)
  date=$(oto-sdk query frontmatter.get "$f" completed --raw)
  phase=$(oto-sdk query frontmatter.get "$f" phase --raw)
  SUM_ENTRIES+=("[$date] [summary] $one_liner (phase $phase)")
done

# Merge, sort by date desc, take 5
RECENT_ACTIVITY=$(printf '%s\n' "${LOG_ENTRIES[@]}" "${SUM_ENTRIES[@]}" | sort -r | head -5)
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `progress.md` "Recent Work" — summaries only | "Recent Activity" — interleaved logs + summaries | This phase (D-13) | Single source of truth for "what just happened"; ad-hoc work no longer invisible |
| Ad-hoc work disappears unless committed with a meaningful message | Captured as durable log artifact in `.oto/logs/` | This phase | First-class artifact, queryable via `/oto-log list`, surfaced in resume |
| `/oto-pause-work` was the only pre-stop checkpoint | `/oto-log start` adds a lightweight session boundary | This phase | Multiple capture modes for different workflows |

**Deprecated/outdated:** Nothing in this phase deprecates existing surface. `/oto-note` continues for cross-project ideas; `/oto-quick` continues for planned ad-hoc tasks. `/oto-log` fills the gap between them: in-project work that isn't a planned task.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The "Recent Activity" interleave keeps the existing routing logic in `progress.md` step `route` working untouched | Pattern 5 / Pitfall 5 | If routing reads downstream artifacts of the `recent` block, routing might break. **Mitigation:** Wave 2 test (`log-progress-surface.test.cjs`) must run a full `/oto-progress` golden render against a fixture and diff. |
| A2 | The Claude markdown command can implicitly access recent conversation transcript without an explicit tool call | Pattern 3 | If conversation transcript access requires a specific API (which Anthropic has not documented for slash commands), the body draft might omit the "What was discussed" section. **Mitigation:** The command markdown should explicitly instruct the model "use your context window's recent turns to fill the 'What was discussed' section; if uncertain, write 'No conversation context captured.'" — falls back gracefully. |
| A3 | `node:test` `--test-concurrency=4` is safe for filesystem-heavy log tests (each test uses its own tmp dir) | Standard Stack | Phase 01 ran 13 migrate tests in parallel without flakes. Pattern is proven. **Mitigation:** Use `fs.mkdtempSync(path.join(os.tmpdir(), 'oto-log-'))` per test, exactly like `tests/migrate-cli.test.cjs:22`. |
| A4 | The default 24h "since" window for fire-and-forget mode is right when no prior log/commit exists | CONTEXT.md Claude's Discretion | If 24h is too long, drafted bodies could span unrelated work. **Mitigation:** Configurable via `.oto/config.json` later; ship 24h, document the knob, defer the config wiring to a future phase. |
| A5 | The existing `oto-tools commit` helper handles new-file-only commits without staged changes elsewhere | Don't Hand-Roll table | `cmdCommit` (commands.cjs:250) takes `--files` explicitly, so it should stage and commit only the listed files. **Mitigation:** Wave 1 test should run `oto-tools log` followed by `git status` and assert the working tree is clean except for the new log file (and that the commit landed). |

## Open Questions

1. **Should `/oto-log show <slug>` accept a partial slug match?**
   - What we know: D-17 says `show <slug>`. `quick status <slug>` does prefix-match against `*-{SLUG}/` (quick.md line 110).
   - What's unclear: Logs don't have leading numbering, just `{stamp}-{slug}.md`. Suffix match (`*-{SLUG}.md`) would mirror quick.
   - Recommendation: Match `*-{SLUG}.md` with the most recent file winning if multiple; print all candidates if more than one matches.

2. **What happens when `/oto-log start` is called without git available (e.g., test fixtures without a repo)?**
   - What we know: `git rev-parse HEAD` fails outside a git repo; D-01 requires `diff_from` to be set on `start`.
   - What's unclear: Should we degrade to a timestamp-based "start" with `diff_from: null`, or refuse?
   - Recommendation: Degrade — write `diff_from: null` and emit a warning. Test in `log-session.test.cjs` with a no-git fixture.

3. **`oto-sdk query log.<resolver>` — does the SDK want first-class log support?**
   - What we know: SDK is the optional `sdk/` subpackage; nothing requires log integration today.
   - What's unclear: Long-term, is `oto-sdk query log.recent` something other workflows want?
   - Recommendation: Defer. Adding SDK surface is a follow-up phase. Today's scope is the slash command + library + dispatch + workflow surface edits.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All `.cjs` library + tests | ✓ | v22.17.1 | — (engines field enforces) |
| npm | Test runner | ✓ | 10.9.2 | — |
| git | `git diff`/`git log`/`git status` for evidence capture | ✓ | 2.39.3 (Apple Git-146) | Degrade: write log with `diff_from: null` and a warning |
| `node:test` | Test framework | ✓ | built-in (Node 22) | — |
| `node:util.parseArgs` | CLI flag parsing | ✓ | built-in (Node 22+) | — |
| In-repo modules: `frontmatter.cjs`, `core.cjs`, `commands.cjs`, `init.cjs` | Library composition | ✓ | n/a (in repo) | — |
| `oto-tools` binary on PATH | Markdown command + workflow shell calls | ✓ | n/a (in repo at `oto/bin/lib/oto-tools.cjs`, exposed by installer) | — |
| `oto-sdk query` binary on PATH | Workflow shell calls in `progress.md` / `resume-project.md` edits | ✓ | n/a (already used throughout existing workflows; see `progress.md:14-17`) | — |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** `git` is required for full evidence capture; the library degrades gracefully when absent (write the log with empty diff fields + warning).

## Validation Architecture

> Project config has `workflow.nyquist_validation: true` `[VERIFIED: .planning/config.json]`.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | `node:test` (built-in, Node 22+) |
| Config file | none (driven by `package.json` script) |
| Quick run command | `node --test tests/log-*.test.cjs` |
| Full suite command | `npm test` (`node --test --test-concurrency=4 tests/*.test.cjs`) |
| Phase gate | Full suite green before `/gsd-verify-work` |

### Phase Requirements → Test Map

Each row maps a CONTEXT.md decision to a falsifiable automated check.

| Decision | Behavior | Test Type | Automated Command | File Exists? |
|----------|----------|-----------|-------------------|-------------|
| D-01 / D-02 | Hybrid model: oneshot writes one entry per call; session bounds diff to start ref | integration | `node --test tests/log-oneshot.test.cjs tests/log-session.test.cjs` | ❌ Wave 0 |
| D-03 | `--body "..."` substitutes verbatim body, skips drafting | integration | `node --test tests/log-oneshot.test.cjs` (assert body bytes equal flag value) | ❌ Wave 0 |
| D-04 | Six section headers present in default body | integration | `node --test tests/log-oneshot.test.cjs` (regex assertions on rendered body) | ❌ Wave 0 |
| D-05 | DATA_START / DATA_END markers wrap diff content in evidence bundle | unit | `node --test tests/log-frontmatter.test.cjs` (test of `captureEvidence` output) | ❌ Wave 0 |
| D-06 | `start`, `end`, `list`, `show`, `promote` only disambiguate as first token; otherwise treated as title | unit | `node --test tests/log-slug.test.cjs` (test `routeSubcommand`) | ❌ Wave 0 |
| D-07 | Slug derivation strips leading articles, lowercases, hyphenates first ~4 meaningful words | unit | `node --test tests/log-slug.test.cjs` (parameterized test cases) | ❌ Wave 0 |
| D-08 | Empty title → non-zero exit + helpful one-line stderr | integration | `node --test tests/log-cli.test.cjs` (spawnSync, assert exit + stderr) | ❌ Wave 0 |
| D-09 | Same-minute duplicate slug appends `-2`, `-3` | unit | `node --test tests/log-frontmatter.test.cjs` (call writeWithCollisionSuffix in loop) | ❌ Wave 0 |
| D-10 | Output path matches `.oto/logs/{YYYYMMDD-HHmm}-{slug}.md` regex | integration | `node --test tests/log-oneshot.test.cjs` | ❌ Wave 0 |
| D-11 | Frontmatter has all 10 required keys with correct types | unit | `node --test tests/log-frontmatter.test.cjs` (parse with extractFrontmatter, assert keys) | ❌ Wave 0 |
| D-12 | Session active-state lives at `.oto/logs/.active-session.json`; double-start auto-ends prior; file gitignored | integration | `node --test tests/log-session.test.cjs` (assert json file shape, .gitignore content) | ❌ Wave 0 |
| D-13 | `/oto-progress` Recent Activity interleaves logs and summaries chronologically | E2E | `node --test tests/log-progress-surface.test.cjs` (golden-render against fixture with both kinds) | ❌ Wave 0 |
| D-14 | STATE.md is NOT modified by `/oto-log` operations | integration | `node --test tests/log-oneshot.test.cjs` (md5 of STATE.md before == after) | ❌ Wave 0 |
| D-15 | `/oto-resume-work` shows latest log's Summary as a hint | E2E | `node --test tests/log-resume-surface.test.cjs` | ❌ Wave 0 |
| D-16 | `/oto-resume-work` surfaces `.active-session.json` when present | E2E | `node --test tests/log-resume-surface.test.cjs` | ❌ Wave 0 |
| D-17 | All six subcommands route correctly | integration | `node --test tests/log-cli.test.cjs` (one assertion per subcommand) | ❌ Wave 0 |
| D-18 | `--body`, `--phase`, `--since` flags parsed and applied | integration | `node --test tests/log-cli.test.cjs` | ❌ Wave 0 |
| D-19 | No `edit` subcommand exists; re-running same title produces new file with `-2` suffix | integration | `node --test tests/log-oneshot.test.cjs` + grep dispatch table for absence of 'edit' | ❌ Wave 0 |
| D-20 | `promote --to quick` writes `.oto/quick/{date-slug}/PLAN.md`; `--to todo` writes one `.oto/todos/pending/{NNN}-{slug}.md` per Open Question; both flip `promoted: true` | integration | `node --test tests/log-promote.test.cjs` | ❌ Wave 0 |
| D-21 | `--phase N` writes frontmatter only; file location stays `.oto/logs/` | integration | `node --test tests/log-oneshot.test.cjs` | ❌ Wave 0 |
| D-22 | `oto/commands/oto/log.md` exists with correct frontmatter; `oto-tools log` and `oto log` (public) both dispatch | integration | `node --test tests/log-command-md.test.cjs tests/log-cli.test.cjs` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `node --test tests/log-*.test.cjs` (~10 files, runs in <5s under `node:test` concurrency=4)
- **Per wave merge:** `npm test` (~470 tests including new log suite)
- **Phase gate:** Full suite green before `/gsd-verify-work`; explicit assertion that the existing 453+ tests still pass (no regression in migrate, frontmatter, etc.)

### Wave 0 Gaps

All test files below are NEW (do not exist yet); Wave 0 of this phase will create them as RED scaffolds, mirroring how Phase 01 did it.

- [ ] `tests/log-slug.test.cjs` — covers D-06, D-07
- [ ] `tests/log-frontmatter.test.cjs` — covers D-05, D-09, D-11
- [ ] `tests/log-oneshot.test.cjs` — covers D-01, D-03, D-04, D-10, D-14, D-19, D-21
- [ ] `tests/log-session.test.cjs` — covers D-01, D-02, D-12
- [ ] `tests/log-list.test.cjs` — covers D-17 (list, show)
- [ ] `tests/log-promote.test.cjs` — covers D-20
- [ ] `tests/log-cli.test.cjs` — covers D-08, D-17, D-18, D-22 (dispatch through oto-tools and bin/install.js)
- [ ] `tests/log-command-md.test.cjs` — covers D-22 (command markdown frontmatter shape)
- [ ] `tests/log-progress-surface.test.cjs` — covers D-13
- [ ] `tests/log-resume-surface.test.cjs` — covers D-15, D-16
- [ ] `tests/fixtures/log-mixed-history/` — fixture: project with 3 SUMMARY.md files + 5 log entries spanning 2 days, used by surface tests

### Per-Runtime Parity Test Approach

`tests/log-command-md.test.cjs` asserts the markdown source contract; the existing per-runtime test fixtures (`tests/fixtures/runtime-parity/`) and the install-smoke CI workflow already validate that `oto/commands/*` files reach all three runtimes after install. **No new per-runtime test is needed** because the installer code path is already covered by `install-smoke.yml` and the runtime-claude/codex/gemini test suites — adding a new file to `oto/commands/oto/` does not exercise any new install branch.

If the install-smoke matrix doesn't include `/oto-log` invocation, **add a single smoke check** in the existing `install-smoke.cjs` script that asserts `oto/commands/oto/log.md` exists in each runtime's installed dir. That is a 3-line addition, not a new test file.

## Sources

### Primary (HIGH confidence, in-repo evidence)
- `oto/commands/oto/migrate.md` — Phase 01 markdown command template
- `oto/bin/lib/migrate.cjs` (705 lines) — Phase 01 CJS library template, including `main()`, `parseArgs`, exit code conventions
- `oto/bin/lib/oto-tools.cjs:1277-1282` — `migrate` dispatch case (template for log dispatch)
- `bin/install.js:67-71` — public `oto migrate` dispatch (template for public `oto log`)
- `bin/lib/runtime-{claude,codex,gemini}.cjs` lines 169 / 58, 175 / 174 — installer source dirs all point at `oto/commands` (proves D-22 parity is free)
- `oto/bin/lib/frontmatter.cjs` — exported `extractFrontmatter`, `reconstructFrontmatter`, `spliceFrontmatter`, `cmdFrontmatterSet`
- `oto/bin/lib/commands.cjs:250` `cmdCommit` — atomic commit helper
- `oto/bin/lib/core.cjs` — `findProjectRoot`, `planningDir`, `atomicWriteFileSync`, `generateSlugInternal`
- `oto/workflows/note.md` step `append` — slug derivation rule (verbatim)
- `oto/workflows/quick.md` — list/status/resume subcommand pattern; promotion target shape for PLAN.md
- `oto/workflows/add-todo.md` step `create_file` lines 92-112 — todo frontmatter shape; ID numbering rule (scan both pending and completed)
- `oto/workflows/progress.md` step `recent` lines 84-93 — site of D-13 surface change
- `oto/workflows/resume-project.md` step `check_incomplete_work` lines 62-112 + `present_status` lines 114-153 — site of D-15 / D-16 surface changes
- `tests/migrate-cli.test.cjs` — test pattern (spawnSync subprocess, tmp fixture, node:test+assert/strict)
- `.planning/phases/01-add-oto-migrate-.../01-01-PLAN.md` — Wave 0 test scaffold convention (RED first, deferred require)
- `.planning/config.json` — `nyquist_validation: true`, no brave/exa/firecrawl
- `package.json scripts.test` — `node --test --test-concurrency=4 tests/*.test.cjs`
- `node --version` → v22.17.1, `git --version` → 2.39.3 (verified shell)

### Secondary (MEDIUM confidence)
- None required — every recommendation has direct in-repo evidence.

### Tertiary (LOW confidence)
- A2 (transcript implicit access) — flagged in Assumptions Log; mitigation built into the command markdown.
- A4 (24h default since-window) — heuristic, not validated; flagged for future config knob.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every dependency is stdlib or already in this repo, versions verified.
- Architecture: HIGH — Phase 01 (`migrate`) is a 1:1 structural template proven shipped (Phase 01 complete 2026-05-05, 453 tests passing).
- Pitfalls: HIGH — derived from concrete code paths (frontmatter parser, gitignore patterns, progress.md routing logic) inspected in this research.
- Drafted-body integration with Claude transcript: MEDIUM — flagged as A2 with a graceful fallback in the command markdown.

**Research date:** 2026-05-06
**Valid until:** 2026-06-05 (30 days; in-repo patterns are stable, but the existing files this phase edits — `progress.md`, `resume-project.md`, `oto-tools.cjs`, `install.js` — could shift if other phases modify them, in which case re-verify line numbers).
