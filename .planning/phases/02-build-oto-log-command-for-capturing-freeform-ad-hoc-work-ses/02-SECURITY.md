---
phase: 02
slug: build-oto-log-command-for-capturing-freeform-ad-hoc-work-ses
status: verified
threats_open: 0
asvs_level: 1
created: 2026-05-07
---

# Phase 02 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail for the `/oto-log` command (post-v0.1.0 milestone). Personal-use Node CLI; all writes are local under `.oto/logs/`. No network surface.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Test fixture file writes | All writes occur under `tests/fixtures/log/...` (in-repo, source-controlled) and `os.tmpdir()/oto-log-*` (test scratch). Never against the user's real `.oto/`. | Static markdown / JSON fixtures; tmp scratch files. |
| User input → log frontmatter | Title text and `--body` content are user-controlled and become file content. Slug derivation strips non-`[\w\s-]` chars; frontmatter values are YAML-quoted by `reconstructFrontmatter`. | Free-form user title + transcript-derived body. |
| `git diff` output → log body | Diff content can contain attacker-controlled text (e.g., a malicious dependency string in tracked file). Wrapped in `<DATA_START>`/`<DATA_END>` markers (D-05). | Git output bytes; raw diff/status/log. |
| `.oto/logs/.active-session.json` → ephemeral state | Local-only file, gitignored. Reading is via `JSON.parse` of trusted file path; tampering is local-user-only. | `{start_ref, start_time, title}` JSON. |
| Filesystem writes | All writes use `core.atomicWriteFileSync` (tmpfile + rename) and `fs.openSync('wx')` for exclusive creation in collision loop. Paths constructed from `planningDir(cwd)` + computed filename only (no traversal). | Markdown log entries, quick PLAN.md, todo entries. |
| Markdown command body → Claude inference | Drafting prompt instructs the model to treat content between `<DATA_START>`/`<DATA_END>` as data. `allowed-tools` frontmatter constrains tool surface. | Drafting context for /oto-log invocations. |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-02-01 | T (Tampering) | Fixture build (Plan 01) | accept | Fixtures are static markdown/JSON committed to git, reviewable by diff. No executable bits. | closed |
| T-02-02 | I (Information disclosure) | Tests on tmpdir fixtures | mitigate | `fs.mkdtempSync` (POSIX 0700) + `t.after` cleanup — verified in 10/12 log-*.test.cjs files (the 2 pure-helper test files do no fs writes). | closed |
| T-02-03 | D (Denial of service) | RED tests blocking CI | accept | Wave 0 intentionally RED; Wave 1+2 (Plans 02 + 03) turned all 12 test files GREEN within the same phase. | closed |
| T-02-04 | T (Tampering) | DATA_START/DATA_END marker tests | mitigate | `tests/log-frontmatter.test.cjs:37,49-54` and `tests/log-command-md.test.cjs:46-56` assert literal markers exist; tests passing forces Wave 1+2 to retain them. | closed |
| T-02-05 | T (Tampering) | Slug derivation from user title | mitigate | `oto/bin/lib/log.cjs:134,138` — `.replace(/[^\w\s-]/g, ' ')` and `STOP_WORDS` set strip filesystem-unsafe chars before constructing slug. | closed |
| T-02-06 | I (Information disclosure) | Diff content in log body | mitigate | `oto/bin/lib/log.cjs:48` `DIFF_CAP = 8192`; `:229` wraps cap'd diff in DATA markers. | closed |
| T-02-07 | T (Tampering) | Prompt-injection via diff content | mitigate | `oto/bin/lib/log.cjs:224-229` — `escapeDataMarkers` neutralises any embedded `<DATA_START>`/`<DATA_END>` literals in diff body, plus wrapping markers added at outer layer. | closed |
| T-02-08 | T (Tampering) | Race condition: same-minute parallel log writes | mitigate | `oto/bin/lib/log.cjs:209` `fs.openSync(filePath, 'wx')` exclusive-create with EEXIST retry loop (`:213`). | closed |
| T-02-09 | I (Information disclosure) | `.active-session.json` accidentally committed | mitigate | `.gitignore:4` line `.oto/logs/.active-session.json`. | closed |
| T-02-10 | E (Elevation of privilege) | spawnSync('git', ...) | accept | `oto/bin/lib/log.cjs:161` invokes `spawnSync('git', gitArgs, {cwd, encoding:'utf8'})` with array args (no shell interpolation); gitArgs constructed from internal helpers only. Git binary trusted. | closed |
| T-02-11 | D (Denial of service) | Massive diff blowing memory | mitigate | `oto/bin/lib/log.cjs:233-234` — 8KB cap with `... <truncated>` marker on overflow. | closed |
| T-02-12 | T (Tampering) | promote --to plan bypass | mitigate | `oto/bin/lib/log.cjs:555-557` — `if (target === 'plan') throw` runs BEFORE any file read or write side effects (resolveCwd / showLog called only after). | closed |
| T-02-13 | T (Tampering) | Diff content reaching drafting model unwrapped | mitigate | `oto/commands/oto/log.md:61-65` literal `<DATA_START>`/`<DATA_END>` block; `:68` instructs model to treat block as data. | closed |
| T-02-14 | I (Information disclosure) | `.active-session.json` accidentally committed (gitignore) | mitigate | `.gitignore:4` literal `.oto/logs/.active-session.json` line present. | closed |
| T-02-15 | T (Tampering) | progress.md routing logic depends on `recent` step output shape | mitigate | `oto/workflows/progress.md:118` defines `RECENT_ACTIVITY=`; `:127` references downstream consumer; `:156` rendered "Recent Activity" panel header. Golden-render assertion at `tests/log-surfaces.test.cjs:96-103`. | closed |
| T-02-16 | E (Elevation of privilege) | Markdown command escalating beyond log scope | mitigate | `oto/commands/oto/log.md:5-12` — `allowed-tools` array limited to Read, Write, Edit, Bash, Glob, Grep, AskUserQuestion. **No `Task` tool**, no general-shell capability beyond Bash for `oto log`/`oto-tools commit`. | closed |
| T-02-17 | D (Denial of service) | Massive globs in resume-project.md scanning every log file | accept | `.oto/logs/` is personal-scale (<1000 entries expected); `ls -1 | sort -r | head -1` is acceptable per RESEARCH.md cost ceiling. | closed |
| T-02-18 | T (Tampering) | Per-runtime parity break (Codex/Gemini adapter not picking up new file) | mitigate | `bin/lib/runtime-claude.cjs:169`, `bin/lib/runtime-codex.cjs:58`, `bin/lib/runtime-gemini.cjs:174` all source `commands: 'oto/commands'`; per-runtime install smoke verified for all three runtimes (per Plan 03 SUMMARY). | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-02-01 | T-02-01 | Fixtures are static, source-controlled, reviewed by diff. Tampering is in-repo authoring; covered by ordinary code review. No executable bits. | Phase planner | 2026-05-07 |
| AR-02-03 | T-02-03 | Wave 0 RED is the spec-driven planning method; closed within the same phase via Plans 02 and 03. Defer-require pattern keeps RED structured (no runner crash). | Phase planner | 2026-05-07 |
| AR-02-10 | T-02-10 | `git` binary is trusted system tooling; arg arrays are constructed from internal helpers only (no user-supplied flag interpolation, no shell). Personal-use CLI on local filesystem. | Phase planner | 2026-05-07 |
| AR-02-17 | T-02-17 | Personal-use scale (<1000 logs); `ls | sort | head` is O(n log n) and acceptable for local CLI. Per CLAUDE.md "personal-use cost ceiling" constraint. | Phase planner | 2026-05-07 |

---

## Unregistered Threat Flags

None. All three plan SUMMARYs (02-01, 02-02, 02-03) report `Threat Flags: None`. No new attack surface emerged during implementation that lacked a registered threat.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-05-07 | 18 | 18 | 0 | oto-security-auditor (Claude Opus 4.7) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-05-07
