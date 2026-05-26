# Phase 2: Build /oto-log command - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-06
**Phase:** 02-build-oto-log-command-for-capturing-freeform-ad-hoc-work-ses
**Areas discussed:** Capture model & content shape, Storage location & on-disk format, Surfacing in /oto-progress and /oto-resume-work, CLI surface and lifecycle relationships
**Format:** Conversational prose (user request); AskUserQuestion options presented as plain prose with recommendations.

---

## Capture model & content shape

### Q1 — How heavy should /oto-log be at the moment of capture?

| Option | Description | Selected |
|--------|-------------|----------|
| Fire-and-forget retrospective | One invocation = one durable entry. No lifecycle. Simplest mental model. | |
| Session lifecycle (start/append/end) | Stateful: open session, accumulate, finalize. Models real-time progression. | |
| Hybrid (fire-and-forget default + optional session) | Both modes coexist. Maximum flexibility. | ✓ |

**User's choice:** Hybrid.
**Rationale captured from user:** "if its just the conversation i think fire and forget is probably best. But, if we can track and log inline edits or diffs in real time, like if I went in a made line edits, etc, then the hybrid would be better for tracking that." After Claude clarified that real-time keystroke tracking isn't possible without a filesystem hook (out of scope), but `git diff` at log-time captures all edits — Claude's and the user's — as a bounded snapshot, the user confirmed: "I feel like having both options feels best."

### Q2 — Where does the entry's body come from?

| Option | Description | Selected |
|--------|-------------|----------|
| User-provided text only | Verbatim from $ARGUMENTS. Mirrors /oto-note. | |
| Claude-drafted from conversation + git | User provides title; Claude drafts body from transcript + diff. | ✓ |
| User text default + --auto flag | Two parallel content modes. | |

**User's choice:** Claude-drafted from evidence; user provides title; `--body "..."` flag overrides with verbatim text.
**Notes:** Drafting must stay grounded — observable facts only, no editorializing on motive unless quoted from user messages. DATA_START/DATA_END markers around diff content to neutralize prompt-injection from diff payloads.

### Q3 — How structured is the body?

| Option | Description | Selected |
|--------|-------------|----------|
| Free-form prose, frontmatter only | Minimum schema. | |
| Lightly structured template (6 sections, evidence-bound) | Summary / What changed / What was discussed / Outcome / Files touched / Open questions. | ✓ |
| SUMMARY.md-shaped (rich) | Full Goal/Approach/Decisions/Files/Outcome/Follow-ups. | |

**User's choice:** Lightly structured template.
**Notes:** Each section is bound to a specific evidence source (diff, transcript, git status). "Open Questions / Follow-ups" is the highest-value section because it turns ad-hoc work into a promotion candidate for `/oto-add-todo`.

### Q4 — Title and slugging

**User's choice:** Accepted Claude's proposal — title is first positional arg (subcommand keywords disambiguate as first token), slug = first ~4 meaningful words mirroring `/oto-note`, empty title is an error, same-minute collisions append `-2`/`-3`.

---

## Storage location & on-disk format

**Presented in batched prose with recommendation:** Flat-file `.oto/logs/{YYYYMMDD-HHmm}-{slug}.md`. Frontmatter includes date/title/slug/mode/phase/diff_from/diff_to/files_touched/open_questions/promoted. Active-session state at `.oto/logs/.active-session.json` (gitignored). Rejected: per-log directory (overkill, no PLAN/SUMMARY pair); rolling daily file (structured frontmatter doesn't concatenate cleanly).

**User's choice:** Accepted as-is.

---

## Surfacing in /oto-progress and /oto-resume-work

**Presented in batched prose with recommendation:**
- `/oto-progress` replaces "Recent Work" with "Recent Activity" — interleaved chronological feed of latest 3–5 logs and summaries.
- `/oto-resume-work` surfaces most-recent log Summary line in status panel, plus an active-session hint when `.active-session.json` is present.
- STATE.md gets no new section — logs are discoverable via `.oto/logs/`, duplicating creates a sync hazard.

**User's choice:** Accepted as-is.

---

## CLI surface, subcommands, and lifecycle relationships

**Presented in batched prose with recommendation:**
- Subcommands: `<title>` (default), `start <title>`, `end [<notes>]`, `list`, `show <slug>`, `promote <slug> [--to quick|todo]`.
- Flags: `--body "..."`, `--phase N`, `--since <ref>`.
- Entries are immutable (no edit subcommand).
- `promote --to quick` seeds `.oto/quick/{date}-{slug}/PLAN.md`; `promote --to todo` creates one todo per Open Questions item.
- `--phase N` is informational frontmatter only; logs do not move into phase dirs.
- `promote --to plan` intentionally not supported — route through quick first.

**User's choice:** Accepted as-is.

---

## Claude's Discretion

- Drafted-body template wording and section headings (six-section coverage required, exact wording flexible).
- Diff-boundary computation in fire-and-forget mode when no recent log/commit exists (likely "since N hours, default 24h").
- Regex/heuristic set for Open Questions extraction.
- Implementation choice: `oto-sdk query` vs direct file IO — match existing `oto/bin/lib/*.cjs` patterns.
- Test fixture shape and edge-case enumeration.

## Deferred Ideas

- Real-time keystroke-level edit logging (filesystem hook / IDE plugin — separate phase).
- Cross-project `--global` log scope.
- Per-phase log filtering in `/oto-progress`.
- `/oto-log edit` for amending entries.
- `promote --to plan`.
- Auto-suggesting `/oto-log` after large uncommitted diffs sit unlogged.
- Unifying `.continue-here.md` and `.active-session.json` into a single ephemeral-session-state file.
