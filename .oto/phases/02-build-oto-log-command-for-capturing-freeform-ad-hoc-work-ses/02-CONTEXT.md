# Phase 2: Build /oto-log command for capturing freeform/ad-hoc work sessions - Context

**Gathered:** 2026-05-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Ship a new `/oto-log` command (Claude markdown + per-runtime equivalents + `oto-tools log` CLI dispatch) that captures ad-hoc work sessions — debugging, exploration, environment fixes, conversation-only investigations — as durable, listable, immutable artifacts in `.oto/logs/`. Surface those artifacts as first-class entries in `/oto-progress` and `/oto-resume-work` alongside plan SUMMARY.md and quick tasks.

Out of scope: real-time keystroke-level edit logging, IDE/editor hooks, cross-project log scopes, log mutation/editing, auto-promotion to plans.

</domain>

<decisions>
## Implementation Decisions

### Capture model

- **D-01:** Hybrid capture model. `/oto-log <title>` is fire-and-forget by default — one invocation produces one durable entry computed from "since the last log or last commit". `/oto-log start <title>` and `/oto-log end` open and close a bookmarked session whose diff is bounded by the recorded start ref. Both modes write the same artifact shape; session mode adds a `diff_from` git ref recorded at start.
- **D-02:** No real-time keystroke-level edit logging. Edit content is recovered at log-time via `git diff`/`git status` against the bounded ref — a snapshot, not a stream. The hybrid lets the user choose whether the boundary is "since I called `start`" or "since the last log/commit".

### Body source and structure

- **D-03:** Body is Claude-drafted from observable evidence — recent conversation transcript + `git diff` + `git log` over the bounded range. User always provides a title; the title is required. `--body "..."` flag substitutes a verbatim body and skips drafting.
- **D-04:** Body follows a light structured template with six named sections, each tied to a specific evidence source so drafting stays grounded:
  - **Summary** — one-liner derived from the title + diff scale.
  - **What changed** — from `git diff` (file list, scope, commits if any).
  - **What was discussed** — paraphrase or short quotes from the conversation transcript.
  - **Outcome** — current state: committed / uncommitted / blocked / resolved (from `git status` and final messages).
  - **Files touched** — machine-readable list extracted from the diff.
  - **Open questions / follow-ups** — extracted from transcript markers ("not sure", "should we", "TODO", "follow up", etc.).
- **D-05:** Drafting guardrails: stay on observable facts. Do not editorialize on motive unless the motive is quoted from the user's own messages. Wrap diff content in DATA_START/DATA_END markers when fed to the drafting pass to keep prompt-injection from diff content out of scope.

### Title and slug

- **D-06:** Title is the first positional arg in `$ARGUMENTS`. Subcommand keywords (`start`, `end`, `list`, `show`, `promote`) disambiguate only when they are the first token; anything else is treated as the title (mirrors `/oto-note`'s rule).
- **D-07:** Slug derivation: first ~4 meaningful words of the title, lowercase, hyphen-separated, articles/prepositions stripped from the start. Same algorithm `/oto-note` uses.
- **D-08:** Empty title is an error with a one-line hint (`/oto-log requires a title. Try: /oto-log "what you did"`). No silent default — a titleless entry breaks the `/oto-progress` Recent Activity feed.
- **D-09:** Same-minute collisions append `-2`, `-3` to the slug (rare because filename includes `HHmm`).

### Storage

- **D-10:** Flat-file layout: `.oto/logs/{YYYYMMDD-HHmm}-{slug}.md`. One file per entry. No per-log directory (rejected: `/oto-quick`-style nesting is overkill — there's no PLAN/SUMMARY pair to colocate). No rolling daily file (rejected: structured frontmatter per entry doesn't concatenate cleanly).
- **D-11:** Frontmatter:
  ```yaml
  ---
  date: "YYYY-MM-DD HH:mm"
  title: "..."
  slug: "..."
  mode: oneshot      # or "session"
  phase: null        # or roadmap phase number string ("02")
  diff_from: <ref>   # session start ref, or last-log/last-commit ref for oneshot
  diff_to: HEAD-or-commit
  files_touched: [list]
  open_questions: [list]
  promoted: false
  ---
  ```
- **D-12:** Session active-state lives at `.oto/logs/.active-session.json` (records start ref, start time, title). Exactly one active session per project. Calling `/oto-log start` while one is open emits a warning and auto-ends the prior session. The `.active-session.json` is gitignored — it is ephemeral local state, not a tracked artifact.

### Surfacing in /oto-progress

- **D-13:** `/oto-progress` replaces the existing "Recent Work" (summaries-only) block with a **Recent Activity** section that interleaves the latest 3–5 log and summary entries chronologically. Render each as a one-liner: `[YYYY-MM-DD HH:mm] [log|summary] <title> [(phase NN)]`.
- **D-14:** No new STATE.md section for logs. Logs are discoverable via `.oto/logs/`; duplicating into STATE.md would create a sync hazard. STATE.md "Last Verified" / "Quick Tasks Completed" surfaces stay as-is.

### Surfacing in /oto-resume-work

- **D-15:** Status panel surfaces the most recent log's **Summary** line as a "where were we?" hint, drawn from the latest entry by `date` field.
- **D-16:** If `.oto/logs/.active-session.json` exists, surface it as a resumption hint alongside the existing `HANDOFF.json` and `.continue-here.md` checks: `Found open log session: <title> started at <time>. Run /oto-log end to close it, or continue working.` This catches sessions that were started but never ended.

### CLI surface and lifecycle

- **D-17:** Subcommand surface:
  - `/oto-log <title>` — fire-and-forget (default)
  - `/oto-log start <title>` — open a session, record start ref + write `.active-session.json`
  - `/oto-log end [<closing notes>]` — close the active session, draft entry, delete `.active-session.json`
  - `/oto-log list` — show recent logs (newest first, paged similar to `/oto-note list`)
  - `/oto-log show <slug>` — render one log entry
  - `/oto-log promote <slug> [--to quick|todo]` — convert a log into downstream work
- **D-18:** Flags: `--body "..."` (verbatim body, skip drafting), `--phase N` (write phase to frontmatter — informational, does not move file), `--since <ref>` (override diff start ref for fire-and-forget mode).
- **D-19:** Entries are immutable once written. No `edit` subcommand. Re-running with the same title produces a new entry with `-2`/`-3` slug collision suffix.
- **D-20:** Promotion semantics:
  - `promote --to quick` seeds a new `.oto/quick/{YYYYMMDD}-{slug}/PLAN.md` from the log's title + body and sets the source log's `promoted: true`.
  - `promote --to todo` creates one `.oto/todos/pending/{NNN}-{slug}.md` per entry in the **Open Questions** section and sets the source log's `promoted: true`.
  - `--to plan` is intentionally not supported — promote to quick first, let `/oto-quick --discuss/--full` route into planning if needed.
- **D-21:** Phase association via `--phase N` is optional and informational. Logs stay at `.oto/logs/`; they are never moved into `.oto/phases/XX/`. Co-locating ad-hoc work inside phase dirs would muddy the boundary between formal planned work and ad-hoc work.

### Runtime parity

- **D-22:** Must reach Claude Code, Codex, and Gemini CLI parity — same bar as `/oto-migrate`. Ship as `oto/commands/oto/log.md` (Claude markdown source), `oto/bin/lib/log.cjs` (CLI library), `oto-tools log` dispatch case (the public CLI path used by Codex/Gemini transforms), and let the existing installer adapters convert into per-runtime command files.

### Claude's Discretion

- Exact wording/headings of the drafted-body template — required is the six-section coverage from D-04, not specific section titles.
- How the diff boundary is computed in fire-and-forget mode when no prior log or commit exists in a reasonable window (likely "since N hours ago" with N configurable, default 24h).
- Regex/heuristic set used to extract Open Questions markers from the transcript.
- Whether the implementation calls `oto-sdk query` vs direct file IO — pick whatever matches existing `oto/bin/lib/*.cjs` patterns.
- Test fixture shape and the specific edge cases enumerated in `*.test.cjs` files.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project constraints
- `.planning/PROJECT.md` — runtime targets (Claude/Codex/Gemini), tech stack (Node CJS, no top-level TS), personal-use cost ceiling.
- `.planning/ROADMAP.md` — Phase 2 goal statement.
- `CLAUDE.md` — installed `oto` version, repo location, tech-stack prescription (Node 22+, CJS, `node:test`, no bundlers).

### Patterns to mirror
- `oto/commands/oto/note.md` — argument parsing pattern, subcommand-vs-text disambiguation rule.
- `oto/workflows/note.md` — slug derivation algorithm, frontmatter discipline, append/list/promote subcommand structure (we mirror the structural pattern, not the content).
- `oto/commands/oto/quick.md` — list/status/resume subcommand surface, slug sanitization rules, security notes for filesystem-derived slugs.
- `oto/workflows/quick.md` — promotion target shape (PLAN.md frontmatter for `promote --to quick`).
- `oto/workflows/add-todo.md` — promotion target shape (`{NNN}-{slug}` naming, todo frontmatter) for `promote --to todo`.
- `oto/commands/oto/migrate.md` and `oto/bin/lib/migrate.cjs` — Phase 01 precedent for command markdown + CLI dispatch + per-runtime parity. Closest structural template for `/oto-log`.

### Surfaces to extend
- `oto/workflows/progress.md` §`recent` — "Recent Work" block becomes "Recent Activity" (D-13).
- `oto/workflows/resume-project.md` §`check_incomplete_work` — add `.active-session.json` check alongside `HANDOFF.json` and `.continue-here.md` (D-16).

### Phase 01 precedent
- `.planning/phases/01-add-oto-migrate-a-command-that-converts-a-gsd-era-project-s-/` — wave-based plan structure (test scaffolds → library → command markdown + CLI dispatch). Apply the same shape to this phase.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable assets
- **Slug derivation logic** — `oto/workflows/note.md` step `append` describes the "first ~4 meaningful words, articles/prepositions stripped" rule. Reuse verbatim, do not reinvent.
- **Frontmatter helper** — `oto-sdk query frontmatter.get` and `frontmatter.set` already exist (used in `/oto-quick` list logic). Use these for reading/writing log frontmatter; do not parse YAML by hand.
- **Atomic commit helper** — `oto-tools commit --files <files>` (or `oto-sdk` equivalent) for any state change. Required for the new log file write so the artifact lands as a tracked commit.
- **Init JSON pattern** — `oto-sdk query init.<workflow>` resolves paths and project state; `/oto-log` should add an `init.log` resolver if existing init resolvers don't fit.
- **Promotion targets** — `.oto/quick/{date-slug}/PLAN.md` shape and `.oto/todos/pending/{NNN-slug}.md` shape are documented in `oto/workflows/quick.md` and `oto/workflows/add-todo.md`.

### Established patterns
- **Markdown payload + thin CLI dispatch** — every command ships as `oto/commands/oto/{name}.md` (Claude markdown) backed by `oto/bin/lib/{name}.cjs` (CJS library) reachable from `oto-tools {name}` for Codex/Gemini transforms. No top-level TypeScript.
- **Per-runtime install-time conversion** — installer adapters generate Codex AGENTS.md / Gemini GEMINI.md command surfaces from the Claude markdown source. New commands inherit this for free as long as they live in `oto/commands/oto/`.
- **Atomic commits per state change** — every workflow that writes artifacts commits via `oto-tools commit`. Logs are state changes; same rule applies.
- **Subcommand disambiguation** — first token matched against reserved set; anything else is freeform input. Pattern is consistent across `/oto-note` and `/oto-quick`.

### Integration points
- **`oto/workflows/progress.md`** — "Recent Work" / "Recent Activity" surface (D-13).
- **`oto/workflows/resume-project.md`** — checkpoint detection block (D-16).
- **`oto/bin/lib/`** — new `log.cjs` lives here, alongside `migrate.cjs`, `note.cjs`, etc.
- **`oto/commands/oto/`** — new `log.md` lives here, follows the Phase 01 migrate.md template.
- **`oto-tools` dispatch** — new `log` case mirroring how `migrate` was added in Phase 01 (`fix(migrate): rename runtime command paths` and earlier commits in this branch's history).
- **`.gitignore`** — must add `.oto/logs/.active-session.json` (ephemeral local state).

</code_context>

<specifics>
## Specific Ideas

- **User on edit-tracking**: "if its just the conversation i think fire and forget is probably best. But, if we can track and log inline edits or diffs in real time, like if I went in a made line edits, etc, then the hybrid would be better for tracking that." → Drove the hybrid choice. The `git diff`-based capture (whether bounded by `start` ref or "since last log/commit") covers both Claude-driven edits and direct editor edits at log-time, even though it's a snapshot rather than a stream.
- **User on lifecycle preference**: "I feel like having both options feels best." → Explicit confirmation that hybrid (oneshot default + session lifecycle) is preferred over either pure model.
- **Title-driven UX is required**: entries must be human-scannable in the `/oto-progress` Recent Activity feed; auto-titled-by-timestamp was rejected for this reason.

</specifics>

<deferred>
## Deferred Ideas

- **Real-time keystroke-level edit logging.** Requires a filesystem hook or IDE plugin that fires on save and writes to an append-only log. Significantly larger surface than this phase. Add to backlog as a follow-on phase.
- **Cross-project `--global` log scope.** Logs are inherently project-scoped (they reference git refs and roadmap phases). If a use case for cross-project notes emerges, route it through `/oto-note --global` instead.
- **Per-phase log filtering in `/oto-progress`.** The frontmatter `phase` field enables it; the Recent Activity surface stays unfiltered for v1. Add a flag later if filtering proves valuable.
- **`/oto-log edit` to amend entries.** Entries are immutable. If you need to fix one, write a new entry and let the chronology reflect reality.
- **`promote --to plan`.** Skipping the quick-task layer would conflate ad-hoc capture with formal planning. Promote to quick first; `/oto-quick --discuss` / `--full` already routes into planning when needed.
- **Auto-suggestion to run `/oto-log` after large uncommitted diffs sit unlogged for >X minutes.** A hook concern, not a slash-command concern. Future hook phase.
- **`.continue-here.md` ↔ `.active-session.json` unification.** Two ephemeral session-state files now exist. Worth revisiting whether they should be one in a future consolidation phase.

</deferred>

---

*Phase: 02-build-oto-log-command-for-capturing-freeform-ad-hoc-work-ses*
*Context gathered: 2026-05-06*
