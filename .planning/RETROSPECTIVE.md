# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v0.1.0 - Release

**Shipped:** 2026-05-04
**Phases:** 10 | **Plans:** 50 | **Requirements:** 100/100

### What Was Built

- A GitHub-installable `oto` package with a Node/CommonJS installer and explicit release path.
- A schema-backed rebrand engine and archive-safe attribution model for GSD plus Superpowers.
- A ported `/oto-*` workflow spine with retained agents, hooks, skills, workstreams, and workspaces.
- Claude Code, Codex, and Gemini runtime outputs generated from shared source where practical.
- CI, docs, command index, upstream sync tooling, release tag, and clean install UAT.

### What Worked

- Locking decisions before implementation reduced rebrand ambiguity.
- The rebrand engine paid for itself once bulk porting began.
- Disposable dogfood projects caught issues that static tests would have missed.
- Generated root instruction files prevented runtime documentation drift.

### What Was Inefficient

- Helper-driven closeout still required manual state repair and human curation.
- Some older validation artifacts used draft metadata even after implementation passed.
- Runtime parity work had to correct earlier "best effort" assumptions about Codex/Gemini.

### Patterns Established

- Treat Claude, Codex, and Gemini as daily-peer runtime targets when a feature claims parity.
- Preserve generated output by default; hand-edit only the explicitly scoped high-visibility files.
- Use archive-before-delete for milestone requirements and roadmap state.
- Keep release gates grounded in real install or disposable-project dogfood, not just smoke file checks.

### Key Lessons

1. Personal-use rigor needs active scope control; production-grade should mean reliable daily flow, not broad community support.
2. `.planning` leak checks must stay path-sensitive: planning docs can live in the repo, but shipped runtime payloads should not expose legacy planning paths.
3. Milestone closeout should trust `audit-open` and milestone audit artifacts over progress percentage alone.
4. Generated helper summaries need curation before they become durable release history.

### Cost Observations

- The highest-value manual spend was dogfood and release verification.
- The highest-cost risk was broad runtime surface area; generator/test pipelines reduced that ongoing cost.

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Key Change |
|-----------|--------|------------|
| v0.1.0 | 10 | Moved from architecture/rebrand discovery to a tagged installable release. |

### Cumulative Quality

| Milestone | Tests | Release Gate |
|-----------|-------|--------------|
| v0.1.0 | `npm test` passed: 418 pass, 1 expected skip, 0 fail | GitHub Release plus clean install UAT |

### Top Lessons

1. Real dogfood is a required release gate for this project.
2. Archive and state files need a final sanity pass after helper-driven closeout.
