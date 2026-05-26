# Phase 6: Skills Port & Cross-System Integration - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-01
**Phase:** 06-skills-port-cross-system-integration
**Areas discussed:** Skill rebrand strategy, Workflow-gating for using-oto, Agent canonical invocation, Phase 6 test surface

---

## Gray Area Selection

| Option | Description | Selected |
|--------|-------------|----------|
| Skill rebrand strategy | How are the 7 skill bodies rebranded; voice adaptation depth for using-oto | ✓ |
| Workflow-gating for using-oto | How does oto:using-oto detect 'active workflow' and defer skill auto-load | ✓ |
| Agent canonical invocation | How do oto-executor / oto-verifier / oto-debugger invoke skills at canonical points (SKL-08) | ✓ |
| Phase 6 test surface | What ships as node:test in Phase 6 vs deferred to Phase 10 | ✓ |

**User's choice:** All four areas selected.

---

## Skill rebrand strategy

### Q1: How should the 7 skill bodies be rebranded from upstream Superpowers form?

| Option | Description | Selected |
|--------|-------------|----------|
| Engine + hand-fix using-oto (Recommended) | Run rebrand engine on all 7 skill trees; hand-fix using-oto/SKILL.md identity literals (mirrors Phase 5 D-05) | ✓ |
| Engine-only, no hand-fixes | Trust the engine end-to-end; risk of upstream-identity literal leakage in highest-visibility skill | |
| Full hand-port | Author each skill manually using upstream as reference; contradicts Phase 4 bulk-port philosophy | |

**User's choice:** Engine + hand-fix using-oto (Recommended).

**Notes:** User asked for full pros/cons of each option before answering. After discussion of leakage risk vs. drift cost vs. round-trip implications, picked the recommended option. Mirrors the proven Phase 5 SessionStart pattern.

### Q2: For using-oto specifically, how much should Superpowers' voice be adapted?

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal adaptation (Recommended) | Strip 'Superpowers' → 'oto', remove 94% PR / contributor framing; keep tuned content (Red Flags table, 1% rule, 'human partner' phrasing) verbatim | ✓ |
| Full voice rewrite to oto's tone | Rewrite framing in oto's voice; higher regression risk on tuned behavior with no eval harness | |
| Drop ambient-skill framing entirely | Make using-oto a passive 'how skills work' explainer; likely fails SC-5 (ambient 'fix this bug' → systematic-debugging auto-invocation) | |

**User's choice:** Minimal adaptation (Recommended).

**Notes:** Aligns with upstream's eval-evidence rule and personal-use cost ceiling (no eval harness available to verify a voice rewrite).

---

## Workflow-gating for using-oto

### Q3: How should oto:using-oto detect 'active workflow' and defer skill auto-load (SKL-07)?

| Option | Description | Selected |
|--------|-------------|----------|
| STATE.md inline + prose fallback (Recommended) | Skill body instructs the model to read .oto/STATE.md; check status: field; suppress ambient auto-fire when active phase detected | ✓ |
| SessionStart hook injects flag | Phase 5 hook reads STATE.md once and injects active-workflow marker; skill keys off the block | |
| Pure prose, no STATE.md read | Skill body says 'if you see active phase context, defer'; no mechanical check | |

**User's choice:** STATE.md inline + prose fallback (Recommended).

**Notes:** Matches ADR-03 routing rule precisely; verifiable via D-09 static-analysis test; per-turn check (not stale across mid-session STATE.md changes).

### Q4: When STATE.md shows an active workflow, what exactly does using-oto suppress?

| Option | Description | Selected |
|--------|-------------|----------|
| Ambient auto-fire only (Recommended) | Canonical agent invocations (SKL-08) and explicit user Skill() calls remain unaffected; only '1% suspicion' ambient pressure suppressed | ✓ |
| All skill loads except explicit user calls | Conflicts with SKL-08 (oto-executor MUST invoke TDD before writing code); rejecting | |
| Nothing — skills always free to fire | Skip the deferral entirely; fails SC-2 explicitly | |

**User's choice:** Ambient auto-fire only (Recommended).

---

## Agent canonical invocation

### Q5: How should oto-executor / oto-verifier / oto-debugger invoke specific skills at canonical points?

| Option | Description | Selected |
|--------|-------------|----------|
| Inline Skill() instructions in agent body (Recommended) | Edit each agent prompt to include explicit Skill('oto:...') directives at the right point; grep-able; works on Claude Code natively today | ✓ |
| Frontmatter required_skills field | Cleaner declaratively, but Claude Code's agent runtime doesn't natively consume this field — requires net new mechanism | |
| Hooks-fired auto-load on tool events | Decouples from agent prompts but adds hook-fleet complexity; hooks don't have Skill() in their tool surface | |

**User's choice:** Inline Skill() instructions in agent body (Recommended).

### Q6: Which agents and at which points get the inline invocations?

| Option | Description | Selected |
|--------|-------------|----------|
| Three agents, four canonical points (Recommended) | oto-executor: TDD before / verification after; oto-verifier: verification at start; oto-debugger: systematic-debugging at start. Matches REQUIREMENTS SKL-08 + skill-vs-command.md verbatim | ✓ |
| Just executor + debugger (minimal) | Skip oto-verifier wiring; misses one of the explicit SKL-08 wiring points | |
| All retained agents at any plausible point | Scope creep; SKL-08 names exactly the three above; expanding risks behavioral churn without eval evidence | |

**User's choice:** Three agents, four canonical points (Recommended).

---

## Phase 6 test surface

### Q7: What node:test coverage ships in Phase 6 (before Phase 10 CI hardening)? (multi-select)

| Option | Description | Selected |
|--------|-------------|----------|
| Skill structure + name collision (Recommended) | Test all 7 SKILL.md exist, frontmatter parses, no oto:<name> collides with /oto-<name> command | ✓ |
| Installer skill copy smoke (Recommended) | Test runtime-claude.cjs copies oto/skills/* to <configDir>/skills/* with sha256 match; install marker records skill set | ✓ |
| STATE.md gating logic test (Recommended) | Static-analyze using-oto/SKILL.md for unambiguous deferral directive against fixture STATE.md | ✓ |
| Live skill-auto-trigger conversational test | Run real model session; assert systematic-debugging fires. Defer to Phase 10 (CI-08) | |

**User's choice:** Skill structure + name collision, Installer skill copy smoke, STATE.md gating logic test. Live conversational test deferred to Phase 10.

---

## Wrap-up

### Q8: Ready to write CONTEXT.md, or are there gray areas left to explore?

| Option | Description | Selected |
|--------|-------------|----------|
| Ready for context | Write 06-CONTEXT.md with decisions captured and proceed to plan-phase | ✓ |
| Explore more gray areas | Surface additional gray areas (cross-runtime tool refs, skill installer marker schema, frontmatter shape harmonization, scripts/ payload handling) | |

**User's choice:** Ready for context.

---

## Claude's Discretion

Captured in CONTEXT.md `<decisions>` section under "Claude's Discretion":
- Exact filenames for test files (`06-NN-*.test.cjs`)
- Exact regex/matcher pattern for the D-09 gating sentence
- Whether to consolidate D-07 (structure + collision) into one test file or split
- Specific edit points within agent prompt bodies for D-06 inline invocations
- Whether cross-runtime tool refs in `oto/skills/using-oto/references/` are kept in Phase 6 or trimmed to Claude-only
- Treatment of payload binaries / non-markdown in skills (`.sh`, `.ts`, `.dot`, `.js`)
- Whether to ship a `tests/skills/__fixtures__/STATE-active.md` fixture alongside the D-09 test

## Deferred Ideas

Captured in CONTEXT.md `<deferred>` section. Notable items raised during discussion:
- User asked about reversibility of the 7 dropped Superpowers skills (brainstorming et al.). Confirmed: low cost / low risk to revive each later via verdict flip + engine re-run; brainstorming specifically has scripts payload (server.cjs, frame-template.html) making it medium-effort. Captured in deferred.
- Cross-runtime tool refs (codex-tools.md, copilot-tools.md, gemini-tools.md) inside `using-oto/references/` — recommended kept as-is in Phase 6; documented as Claude's Discretion.
