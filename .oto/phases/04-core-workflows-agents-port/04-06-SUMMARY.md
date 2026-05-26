---
phase: 04-core-workflows-agents-port
plan: 06
subsystem: runtime-adapter
tags: [codex, agents, sandbox, adapter]

requires:
  - phase: 03-installer-fork-claude-adapter
    provides: per-runtime adapter descriptors
  - phase: 04-core-workflows-agents-port
    provides: retained-agent fixture and Phase 4 research sandbox map
provides:
  - Codex adapter agentSandboxes descriptor map for all 23 retained oto agents
  - AGT-04 static data required by the future Codex TOML writer
affects: [phase-05-hooks-port-consolidation, phase-08-codex-gemini-runtime-parity, codex-runtime]

tech-stack:
  added: []
  patterns:
    - Static runtime descriptor data lives in bin/lib/runtime-*.cjs adapters
    - Codex sandbox modes are explicit per retained agent, not inferred at install time

key-files:
  created:
    - .planning/phases/04-core-workflows-agents-port/04-06-SUMMARY.md
  modified:
    - bin/lib/runtime-codex.cjs

key-decisions:
  - "04-06: Keep Codex sandbox data on runtime-codex.cjs as a descriptor field; do not modify bin/install.js or TOML writing behavior."
  - "04-06: Enumerate all 23 retained agents so Codex sandbox fallback behavior is never used for retained agents."

patterns-established:
  - "AGT-04 sandbox provenance: upstream gsd-* map entries are renamed to oto-*; remaining retained agents are inferred from tools and role."

requirements-completed: [AGT-04]

duration: 2 min
completed: 2026-04-29
---

# Phase 04 Plan 06: Codex Agent Sandbox Map Summary

**Codex adapter descriptor now exposes explicit read-only/workspace-write sandbox modes for all 23 retained oto agents.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-29T23:22:47Z
- **Completed:** 2026-04-29T23:24:46Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments

- Added `agentSandboxes` as a peer descriptor field in `bin/lib/runtime-codex.cjs`.
- Populated exactly 23 retained agents, matching `tests/fixtures/phase-04/retained-agents.json`.
- Kept all values limited to `read-only` or `workspace-write`.
- Confirmed `bin/install.js` and the upstream fixture copy of `install.js` have no diff.

## Task Commits

1. **Task 1: Add agentSandboxes descriptor field to bin/lib/runtime-codex.cjs** - `5eed8a3` (feat)

## Files Created/Modified

- `bin/lib/runtime-codex.cjs` - Added the static Codex `agentSandboxes` descriptor map.
- `.planning/phases/04-core-workflows-agents-port/04-06-SUMMARY.md` - Captures plan output, verification evidence, provenance, and tracking metadata.

## Sandbox Provenance

### Upstream-Preserved Entries

These 11 entries pass through from upstream `CODEX_AGENT_SANDBOX` in `foundation-frameworks/get-shit-done-main/bin/install.js:26-38`, with `gsd-*` renamed to `oto-*`:

| Agent | Sandbox |
|-------|---------|
| `oto-codebase-mapper` | `workspace-write` |
| `oto-debugger` | `workspace-write` |
| `oto-executor` | `workspace-write` |
| `oto-integration-checker` | `read-only` |
| `oto-phase-researcher` | `workspace-write` |
| `oto-plan-checker` | `read-only` |
| `oto-planner` | `workspace-write` |
| `oto-project-researcher` | `workspace-write` |
| `oto-research-synthesizer` | `workspace-write` |
| `oto-roadmapper` | `workspace-write` |
| `oto-verifier` | `workspace-write` |

### Inferred Entries

These 12 entries are inferred from the retained agents' tools and roles in `04-RESEARCH.md` and `decisions/agent-audit.md`: Write/Edit or file-writing role gets `workspace-write`; pure-read agents get `read-only`.

| Agent | Sandbox | Inference |
|-------|---------|-----------|
| `oto-advisor-researcher` | `read-only` | Pure read/research tools; no Write/Edit |
| `oto-assumptions-analyzer` | `read-only` | Pure read/audit role; emits text only |
| `oto-code-fixer` | `workspace-write` | Edit/Write tools; edits code |
| `oto-code-reviewer` | `workspace-write` | Write tool; writes review docs |
| `oto-doc-verifier` | `workspace-write` | Write tool; writes verification reports |
| `oto-doc-writer` | `workspace-write` | Write tool; authors docs |
| `oto-domain-researcher` | `workspace-write` | Write tool; writes research fragments |
| `oto-nyquist-auditor` | `workspace-write` | Broad/default tools and validation report role |
| `oto-security-auditor` | `workspace-write` | Broad/default tools and security report role |
| `oto-ui-auditor` | `workspace-write` | Write tool; writes UI audit output |
| `oto-ui-checker` | `read-only` | Pure read/check tools |
| `oto-ui-researcher` | `workspace-write` | Write tool; writes UI research output |

## Verification

- `node -e "const a = require('./bin/lib/runtime-codex.cjs'); console.log(Object.keys(a.agentSandboxes).length)"` -> `23`
- `node -e "const a = require('./bin/lib/runtime-codex.cjs'); const vals = new Set(Object.values(a.agentSandboxes)); console.log([...vals].sort().join(','))"` -> `read-only,workspace-write`
- `grep -c "agentSandboxes:" bin/lib/runtime-codex.cjs` -> `1`
- `grep -c "'oto-planner': 'workspace-write'" bin/lib/runtime-codex.cjs` -> `1`
- `grep -c "'oto-ui-checker': 'read-only'" bin/lib/runtime-codex.cjs` -> `1`
- `node -c bin/lib/runtime-codex.cjs` -> passed
- `node -e "console.log(Object.keys(require('./bin/lib/runtime-codex.cjs')).length)"` -> `16`
- Plan automated verification command passed.
- Retained-agent fixture equality check passed.
- `git diff --name-only -- bin/install.js foundation-frameworks/get-shit-done-main/bin/install.js` -> no output.
- `node --test tests/phase-04-codex-sandbox-coverage.test.cjs` -> 1 TODO test, 0 failures. The TODO body is planned for 04-07; the explicit 04-06 equality check above covers this plan.
- `node --test --test-concurrency=4 tests/*.test.cjs` -> 220 passed, 9 TODO, 0 failed.

## Decisions Made

- Kept the change data-only in `runtime-codex.cjs`.
- Did not add TOML manipulation, Codex frontmatter conversion, or installer conditionals because Phase 5 and Phase 8 own those behaviors.

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

| File | Line | Reason |
|------|------|--------|
| `bin/lib/runtime-codex.cjs` | 64 | Existing Phase 8 TODO for Codex frontmatter parity; intentionally outside 04-06. |
| `bin/lib/runtime-codex.cjs` | 67 | Existing Phase 5 TODO for real TOML manipulation; intentionally outside 04-06. |

## Issues Encountered

- Git staging required elevated filesystem permission for `.git/index.lock`; task staging and commit completed after approval.
- `gsd-sdk query roadmap.update-plan-progress 04` could not match the Phase 4 roadmap row, so the 04-06 checkbox and `6/8` progress row were updated manually.
- `gsd-sdk query requirements.mark-complete AGT-04` marked the requirement but split the markdown emphasis across lines; the AGT-04 checkbox line and traceability row were corrected manually.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready for 04-07. The Codex adapter now exposes the AGT-04 data that 04-07 can assert with real sandbox coverage tests and that later Codex TOML writing work can consume.

## Self-Check: PASSED

- Found summary file at `.planning/phases/04-core-workflows-agents-port/04-06-SUMMARY.md`.
- Found task commit `5eed8a3`.
- Confirmed summary copies `AGT-04` from the plan frontmatter.
- Confirmed `bin/lib/runtime-codex.cjs` still exposes 23 sandbox entries.

---
*Phase: 04-core-workflows-agents-port*
*Completed: 2026-04-29*
