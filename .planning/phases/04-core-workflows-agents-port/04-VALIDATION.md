---
phase: 4
slug: core-workflows-agents-port
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-29
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Source: `04-RESEARCH.md` § Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `node:test` (Node 22+ built-in) — same harness as Phase 1/2/3 |
| **Config file** | none (built-in runner needs no config) |
| **Quick run command** | `node --test --test-concurrency=4 tests/phase-04-*.test.cjs` |
| **Full suite command** | `npm test` (runs all phases) |
| **Estimated runtime** | ~10–15s for Phase 4 quick run; full suite under 60s |

---

## Sampling Rate

- **After every task commit:** Run `node --test --test-concurrency=4 tests/phase-04-*.test.cjs`
- **After every plan wave:** Run `npm test`
- **Before `/oto-verify-work`:** Full suite must be green AND `04-HUMAN-UAT.md` must contain the MR-01 dogfood transcript summary
- **Max feedback latency:** 15 seconds (quick run)

---

## Per-Task Verification Map

> Tasks are placeholders with stable IDs (`{phase}-{plan}-{task}`); planner will refine in PLAN.md frontmatter and may reflow IDs. Test commands target `tests/phase-04-*.test.cjs` files defined in Wave 0.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 0 | (scaffolds) | — | N/A | unit | `node --test tests/phase-04-rebrand-smoke.test.cjs` | ❌ W0 | ⬜ pending |
| 04-02-01 | 02 | 1 | WF-01..25, WF-28..30 | — | Engine output produces all expected target paths | unit | `node --test tests/phase-04-rebrand-smoke.test.cjs` | ❌ W0 | ⬜ pending |
| 04-02-02 | 02 | 1 | WF-01..25, WF-28..30 (D-12) | — | Every installed `oto/commands/oto-*.md` resolves to a workflow file | unit | `node --test tests/phase-04-command-to-workflow.test.cjs` | ❌ W0 | ⬜ pending |
| 04-03-01 | 03 | 2 | AGT-03 (no dropped) / D-09 | — | `gsd-pattern-mapper` reference removed from `oto/workflows/plan-phase.md`; `gsd-debug-session-manager` references rewritten in `oto/commands/oto/debug.md` | unit | `node --test tests/phase-04-no-dropped-agents.test.cjs` | ❌ W0 | ⬜ pending |
| 04-04-01 | 04 | 2 | WF-28 / D-17, D-18, D-20 | — | `oto/commands/oto/ai-integration-phase.md` + matching workflow reference only retained agents or carry explicit deferred markers | unit | `node --test tests/phase-04-no-dropped-agents.test.cjs` + `tests/phase-04-task-refs-resolve.test.cjs` | ❌ W0 | ⬜ pending |
| 04-05-01 | 05 | 2 | AGT-03 (no dropped) | — | `eval-review.md`, `ingest-docs.md`, `profile-user.md` either rewritten to retained agents or marked deferred per D-11 | unit | `node --test tests/phase-04-no-dropped-agents.test.cjs` | ❌ W0 | ⬜ pending |
| 04-06-01 | 06 | 2 | AGT-04 | — | `bin/lib/runtime-codex.cjs` exports `agentSandboxes` covering all 23 retained agents | unit | `node --test tests/phase-04-codex-sandbox-coverage.test.cjs` | ❌ W0 | ⬜ pending |
| 04-07-01 | 07 | 3 | AGT-03 (frontmatter) | — | Every retained agent has `name:` + `description:` + `tools:`; `name:` matches `oto-<file-stem>` | unit | `node --test tests/phase-04-frontmatter-schema.test.cjs` | ❌ W0 | ⬜ pending |
| 04-07-02 | 07 | 3 | AGT-03 (Task refs) / D-09 | — | Every `subagent_type=` resolves to a file in `oto/agents/oto-*.md` or generic allowlist | unit | `node --test tests/phase-04-task-refs-resolve.test.cjs` | ❌ W0 | ⬜ pending |
| 04-07-03 | 07 | 3 | AGT-03 (generic allowlist) / D-10 | — | All `subagent_type="general-purpose"`-class refs are explicitly allowlisted | unit | `node --test tests/phase-04-generic-agent-allowlist.test.cjs` | ❌ W0 | ⬜ pending |
| 04-07-04 | 07 | 3 | AGT-02 | — | Superpowers `code-reviewer` agent absent in `oto/agents/` | unit | `node --test tests/phase-04-superpowers-code-reviewer-removed.test.cjs` | ❌ W0 | ⬜ pending |
| 04-07-05 | 07 | 3 | D-13..D-16 (`.planning/` leak) | — | Zero path-like `.planning/` references in shipped runtime payload (`oto/`, `commands/`, `agents/`, `bin/`, `hooks/`, `skills/`) | unit | `node --test tests/phase-04-planning-leak.test.cjs` | ❌ W0 | ⬜ pending |
| 04-08-01 | 08 | 3 | MR-01 (auto) | — | `oto install --claude --config-dir <tmp>` succeeds against a built tarball; install-marker present | integration | `node --test tests/phase-04-mr01-install-smoke.test.cjs` | ❌ W0 | ⬜ pending |
| 04-09-01 | 09 | 4 | MR-01 (manual) / D-05..D-08 | — | One disposable Claude Code session executes the core spine end-to-end without falling back to GSD/Superpowers | manual UAT | (transcript summary in `04-HUMAN-UAT.md`; technical evidence in `04-VERIFICATION.md`) | ❌ W4 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*
*"❌ W0" = test file does not exist yet, scheduled for Wave 0 scaffolds.*
*"❌ W4" = manual artifact captured in Wave 4.*

---

## Wave 0 Requirements

Test scaffolds with `t.todo()` placeholders so downstream waves cannot forget tests:

- [ ] `tests/phase-04-rebrand-smoke.test.cjs` — invoke engine apply against a copy of `foundation-frameworks/get-shit-done-main`; assert expected target files appear under a temp `oto/` (counts: 78 commands, 23 agents, 88+ workflows, 3 contexts, 43 templates, 51 references — adjust to actual engine output)
- [ ] `tests/phase-04-frontmatter-schema.test.cjs` — covers AGT-03 frontmatter
- [ ] `tests/phase-04-task-refs-resolve.test.cjs` — covers AGT-03 Task refs
- [ ] `tests/phase-04-no-dropped-agents.test.cjs` — covers D-09 (no `oto-{pattern-mapper,doc-classifier,doc-synthesizer,debug-session-manager,ai-researcher,eval-auditor,eval-planner,framework-selector,intel-updater,user-profiler}` substrings in shipped payload)
- [ ] `tests/phase-04-generic-agent-allowlist.test.cjs` — covers D-10
- [ ] `tests/phase-04-codex-sandbox-coverage.test.cjs` — covers AGT-04
- [ ] `tests/phase-04-superpowers-code-reviewer-removed.test.cjs` — covers AGT-02
- [ ] `tests/phase-04-planning-leak.test.cjs` — covers D-13..D-16 (path-like `.planning/` regex; only scans shipped payload roots)
- [ ] `tests/phase-04-command-to-workflow.test.cjs` — covers D-12
- [ ] `tests/phase-04-mr01-install-smoke.test.cjs` — covers MR-01 automated portion (extends Phase 3 install-claude integration test pattern)
- [ ] `tests/fixtures/phase-04/retained-agents.json` — extracted from `decisions/agent-audit.md` KEEP rows (or inlined as a JS const)
- [ ] Framework install: not needed — `node:test` is built-in

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Disposable-project dogfood: install oto from packed tarball into a `mktemp -d` directory, then run `/oto-new-project` → `/oto-discuss-phase` → `/oto-plan-phase` → `/oto-execute-phase` → `/oto-verify-work` end-to-end inside Claude Code, capture transcript summary | MR-01 / D-05, D-06, D-07, D-08 | Validates daily-use stability claim; cannot be asserted by static checks. Operator presence required to drive Claude Code | 1. `cd $(mktemp -d)`; 2. install oto: `npm pack` in repo, then `npm install -g <tarball> --prefix <tmp>`; 3. `oto install --claude --config-dir <tmp>/.claude`; 4. open Claude Code with `CLAUDE_CONFIG_DIR=<tmp>/.claude`; 5. drive the core spine end-to-end; 6. summarize transcript in `04-HUMAN-UAT.md` and record technical evidence (paths inspected, commit SHAs, exit codes) in `04-VERIFICATION.md`. Blocking failures = core spine commands per D-07; secondary command issues become follow-up tasks. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify (manual MR-01 dogfood is gated by 9 automated tests in Waves 0–3)
- [ ] Wave 0 covers all MISSING references (10 test files + fixtures listed above)
- [ ] No watch-mode flags in test commands
- [ ] Feedback latency < 15s for quick run
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
