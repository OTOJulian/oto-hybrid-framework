---
phase: 04-core-workflows-agents-port
reviewed: 2026-04-30T22:50:00Z
depth: standard
files_reviewed: 25
files_reviewed_list:
  - bin/lib/runtime-codex.cjs
  - oto/bin/lib/core.cjs
  - oto/bin/lib/model-profiles.cjs
  - oto/commands/oto/ai-integration-phase.md
  - oto/references/agent-contracts.md
  - oto/references/ai-evals.md
  - oto/references/user-profiling.md
  - oto/templates/AI-SPEC.md
  - oto/workflows/ai-integration-phase.md
  - oto/workflows/eval-review.md
  - oto/workflows/ingest-docs.md
  - package.json
  - scripts/rebrand/lib/engine.cjs
  - tests/fixtures/phase-04/retained-agents.json
  - tests/phase-02-package-json.test.cjs
  - tests/phase-04-codex-sandbox-coverage.test.cjs
  - tests/phase-04-command-to-workflow.test.cjs
  - tests/phase-04-frontmatter-schema.test.cjs
  - tests/phase-04-generic-agent-allowlist.test.cjs
  - tests/phase-04-mr01-install-smoke.test.cjs
  - tests/phase-04-no-dropped-agents.test.cjs
  - tests/phase-04-planning-leak.test.cjs
  - tests/phase-04-rebrand-smoke.test.cjs
  - tests/phase-04-superpowers-code-reviewer-removed.test.cjs
  - tests/phase-04-task-refs-resolve.test.cjs
findings:
  critical: 0
  warning: 0
  info: 0
  total: 0
status: clean
---

# Phase 04: Code Review Report

**Reviewed:** 2026-04-30T22:50:00Z
**Depth:** standard
**Files Reviewed:** 25
**Status:** clean

## Summary

Reviewed the Phase 4 source scope derived from the plan summaries, including the runtime install validation fixups, retained-agent model/profile data, shipped workflow payload edits, rebrand engine behavior touched by the baseline port, package manifest changes, and all Phase 4 verification tests.

No open bugs, security issues, or code-quality defects remain.

## Review-Time Fix Applied

During review, one contract gap was found and fixed before this report was finalized:

- `checkAgentsInstalled()` used `MODEL_PROFILES` as its expected agent list. That omitted retained agents that intentionally inherit the runtime default model, such as `oto-code-reviewer`, `oto-code-fixer`, `oto-domain-researcher`, and `oto-security-auditor`.
- The fix added `EXPECTED_AGENTS` with all 23 retained agents and made install validation use that explicit roster.
- The MR-01 install smoke test now asserts every expected retained agent file exists after install.

This was committed as `15b1c08 fix(04-review): validate retained agent roster`.

## Checks Performed

### Runtime install validation

- `getAgentsDir()` now respects runtime config env vars such as `CLAUDE_CONFIG_DIR` before falling back to package-relative lookup.
- `EXPECTED_AGENTS` has 23 entries and exactly matches `tests/fixtures/phase-04/retained-agents.json`.
- Dropped `oto-pattern-mapper` is not expected by install validation.
- Missing-agent reporting includes retained unprofiled agents like `oto-code-reviewer`.

### Shipped payload references

- Dropped-agent substrings remain absent from shipped payload roots; matches appear only in the retained-agent fixture's dropped-agent test data.
- Path-like `.planning/` references remain absent from shipped payload roots.
- Command-to-workflow references resolve.
- `Task(subagent_type=...)` values resolve to retained agents or the generic allowlist.

### AI integration and deferred workflows

- `/oto:ai-integration-phase` stays bounded to retained live behavior and does not resurrect dropped AI/eval agents.
- `eval-review` and `ingest-docs` remain discoverable while marking unsupported internals as deferred, matching Phase 4's context decisions.
- Deferred comments avoid path-like `.planning/` leaks in shipped payload.

### Package and install smoke

- `package.json` includes the runtime payload required for tarball installs.
- MR-01 smoke packs the repo, installs to temp prefix/config/cache paths, validates support docs, validates every retained agent file, and then runs `oto-sdk query init.new-project` with `CLAUDE_CONFIG_DIR` set.
- Temp directories are cleaned in `finally`.

### Tests

```text
node --test --test-concurrency=4 tests/phase-04-*.test.cjs
1..14
# tests 14
# pass 14
# fail 0
```

Focused roster checks:

```text
retained=23
expected=23
expectedMissing=[]
expectedExtra=[]
profileExtra=[]
missing_includes_oto_code_reviewer=true
missing_includes_oto_pattern_mapper=false
```

## Residual Risk

- The review is scoped to Phase 4's summarized source files, not every generated file under the full `oto/` tree.
- The MR-01 human dogfood validated Claude Code only. Codex/Gemini runtime parity remains intentionally out of scope until Phase 8.

## Result

Clean. No follow-up fixes are required from code review.

---
_Reviewed: 2026-04-30T22:50:00Z_
_Reviewer: Codex inline review gate_
_Depth: standard_
