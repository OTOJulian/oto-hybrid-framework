---
phase: 01-agent-ports-installer-wiring
reviewed: 2026-05-18T00:00:00Z
status: passed
findings:
  critical: 0
  warning: 0
  info: 0
---

# Phase 01 Security Review

## Scope

Reviewed the restored agent files, inventory decisions, Codex sandbox map, and installer smoke evidence for Phase 1:

- `oto/agents/oto-doc-classifier.md`
- `oto/agents/oto-doc-synthesizer.md`
- `oto/agents/oto-eval-auditor.md`
- `bin/lib/runtime-codex.cjs`
- `oto/bin/install.js`
- `decisions/file-inventory.json`
- `decisions/agent-audit.md`

## Findings

No open security findings.

## Checks

| Risk | Result | Evidence |
|------|--------|----------|
| Read-only agents accidentally retain write capability. | PASS | `oto-doc-classifier` uses `Read, Grep, Glob`; `oto-eval-auditor` uses `Read, Bash, Grep, Glob`; both return output for orchestrator persistence rather than writing files directly. |
| Workspace-write granted to the wrong restored agent. | PASS | Only `oto-doc-synthesizer` gets `workspace-write`, matching its `.oto/INGEST-CONFLICTS.md` and synthesized-context responsibility. |
| Codex sandbox default masks a missing explicit entry. | PASS | Isolated Codex smoke checked each co-located `.toml` file, including `workspace-write` specifically for `oto-doc-synthesizer`. |
| Shipped restored agents leak upstream `.planning` / `gsd-*` references. | PASS | Restored-agent scan found no `.planning`, `gsd-`, `/gsd-`, `Get Shit Done`, or `get-shit-done` strings in the three agent files. |
| Rebrand restore accidentally expands the ADR-07 reversal beyond the three scoped agents. | PASS | Inventory and retained-agent fixtures show 26 retained agents; dropped-agent leak list still includes the remaining deferred agents. |

## Residual Risk

Phase 2 owns workflow-level persistence and conflict-output behavior. This review verifies the Phase 1 agent and installer boundary only.

