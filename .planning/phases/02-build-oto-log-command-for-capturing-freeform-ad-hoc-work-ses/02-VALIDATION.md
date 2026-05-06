---
phase: 2
slug: build-oto-log-command-for-capturing-freeform-ad-hoc-work-ses
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-06
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `node:test` (built-in, Node 22+) |
| **Config file** | none — `scripts/run-tests.cjs` runner pattern (per Phase 01 precedent) |
| **Quick run command** | `node --test --test-concurrency=4 tests/log-*.test.cjs` |
| **Full suite command** | `node scripts/run-tests.cjs` |
| **Estimated runtime** | ~10 seconds (matches Phase 01 migrate suite scale) |

---

## Sampling Rate

- **After every task commit:** Run `node --test --test-concurrency=4 tests/log-*.test.cjs`
- **After every plan wave:** Run `node scripts/run-tests.cjs`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

> Filled by planner during plan generation. Each task in PLAN.md must map to either an automated test or a Wave 0 fixture/scaffold dependency. No 3 consecutive tasks without automated verification.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 2-XX-XX | XX | X | D-XX | T-2-XX / — | {expected secure behavior or "N/A"} | unit/integration/e2e | `{command}` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Wave 0 lands all RED test scaffolds and fixtures before any production code.

### Test files (one per concern, RED on commit)

- [ ] `tests/log-slug.test.cjs` — `deriveLogSlug()` derivation rule (D-07): first ~4 meaningful words, articles/prepositions stripped, lowercase, hyphen-joined; same-minute collision suffix `-2`/`-3` (D-09); empty title rejected (D-08)
- [ ] `tests/log-frontmatter.test.cjs` — round-trip frontmatter shape (D-11): all required keys present, types correct, lists serialize cleanly; `mode: oneshot|session`, optional `phase: null`
- [ ] `tests/log-write.test.cjs` — atomic write to `.oto/logs/{YYYYMMDD-HHmm}-{slug}.md` (D-10), correct frontmatter, body section coverage (D-04)
- [ ] `tests/log-evidence.test.cjs` — evidence bundle: `git diff` / `git status` / `git log` over bounded ref, `files_touched` extraction, open-questions heuristic from transcript markers
- [ ] `tests/log-session.test.cjs` — `start` writes `.oto/logs/.active-session.json` with start ref + title + timestamp; `end` reads it, drafts entry, deletes the file; second `start` while one is open auto-ends prior + warns (D-12)
- [ ] `tests/log-subcommand.test.cjs` — argument parser disambiguates `start|end|list|show|promote` first-token vs freeform title (D-06); empty title errors with hint (D-08)
- [ ] `tests/log-list.test.cjs` — `list` returns newest-first, paged like `quick`/`note`
- [ ] `tests/log-show.test.cjs` — `show <slug>` resolves entry by suffix match, prints rendered content
- [ ] `tests/log-promote.test.cjs` — `promote --to quick` seeds `.oto/quick/{YYYYMMDD}-{slug}/PLAN.md` and sets `promoted: true`; `promote --to todo` writes one `.oto/todos/pending/{NNN}-{slug}.md` per Open Question and sets `promoted: true` (D-20)
- [ ] `tests/log-surfaces.test.cjs` — `progress.md` Recent Activity interleaves logs+summaries chronologically (D-13); `resume-project.md` surfaces `.active-session.json` if present (D-16); STATE.md untouched (D-14)

### Fixtures

- [ ] `tests/fixtures/log/git-repo/` — minimal git repo with seeded commits + uncommitted diff for evidence-bundle tests
- [ ] `tests/fixtures/log/transcript-samples/` — fixture transcripts containing open-question markers ("not sure", "should we", "TODO", "follow up")
- [ ] `tests/fixtures/log/existing-logs/` — pre-seeded `.oto/logs/` for list/show/promote tests
- [ ] `tests/fixtures/log/active-session.json` — fixture for resume-work surface test

### Framework install

- [x] `node --test` — built-in to Node 22+, no install needed

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Drafted-body quality (six-section coverage, no editorialization) | D-03, D-04, D-05 | Body is generated inside the Claude command markdown layer at runtime; quality of prose can't be asserted by a unit test, only that section headers exist | After implementing, run `/oto-log "test entry about phase 2 wiring"` in a real session; verify the produced `.oto/logs/{stamp}-test-entry-about-phase.md` contains all six sections, no invented motives, diff content correctly bounded |
| Per-runtime parity (Codex AGENTS.md + Gemini GEMINI.md surfaces) | D-22 | Installer adapters generate per-runtime command files at install time; verifying the install output requires running the installer against a clean target dir | After Wave 2, run `bin/install.js --codex --config-dir /tmp/codex-test` and `bin/install.js --gemini --config-dir /tmp/gemini-test`; confirm `oto-log` reaches the destination as the runtime's expected file shape |
| Prompt-injection defense (DATA_START/DATA_END wrapping in drafting pass) | D-05 | The wrapping is enforced in the markdown drafting prompt, not the library; can be lint-checked but a true behavior test requires a real model run | Inspect `oto/commands/oto/log.md` to confirm DATA_START/DATA_END markers wrap any diff/transcript content fed into the drafting block |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
