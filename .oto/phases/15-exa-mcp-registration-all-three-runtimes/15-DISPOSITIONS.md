---
phase: 15-exa-mcp-registration-all-three-runtimes
status: developer_decision_required
updated: "2026-07-14T20:45:15Z"
source:
  - 15-REVIEW.md
  - 15-VERIFICATION.md
verification_score: "5/10"
blocking_findings: 3
bounded_convergence: stopped
---

# Phase 15 Bounded-Convergence Dispositions

The authorized local verifier retry completed all ten requirement checks and independently reproduced the fresh review findings. The blocker count increased from two in the prior verification to three in the current `5/10` verification. Per the execute-phase bounded-convergence contract, Phase 15 is not complete and no further automatic gap or verification loop may start without a developer decision.

The dispositions below are proposed by severity and evidence. `FIX` and `DEFER` indicate the recommended route, but implementation remains stopped pending explicit developer approval.

| ID | Severity | Disposition | Requirements | Evidence | Required closure |
|---|---|---|---|---|---|
| CR-01 | Critical | **FIX** | MCP-04, MCP-07, MCP-09 | Valid quoted and dotted Codex Exa definitions are missed; OTO appends a duplicate logical table, Python `tomllib` rejects the result, and both CJS and shipped SDK report `not-registered`. | Detect logical TOML keys across quoted segments, dotted assignments, and inline tables; fail closed on ambiguity; add adapter, lifecycle, CJS-status, and SDK-status regressions. |
| CR-02 | Critical | **FIX** | MCP-05, MCP-08 | Gemini's regex JSONC fallback deletes literal `/* ... */` text inside unrelated strings during both registration and unregistration. | Replace regex stripping with a string-aware JSONC parser/tokenizer or refuse before writes; add semantic-preservation tests for register, unregister, and status. |
| WR-01 | Warning promoted to blocker | **FIX** | MCP-08 | A Gemini settings-root failure leaves copied payload and `GEMINI.md` without `.install.json`; state-driven uninstall cannot discover the partial installation. | Preflight Gemini settings before payload/marker mutation or roll back all pre-commit writes; test that failed installs leave no payload, marker, or state. |
| WR-02 | Warning | **DEFER** | Test/fixture debt | Scoped SDK workstream fixtures still construct unmarked `.planning/` roots and use `gsd_state_version`; production OTO-root behavior is coherent, but the scoped SDK gate remains red. | Repair fixtures in a separately authorized bounded task or include them explicitly in the approved Phase 15 closure scope; restore the local Rollup optional dependency before rerunning Vitest. |

## Developer Decision Required

Choose the authorized next route before any more Phase 15 work:

1. Approve the proposed dispositions and authorize targeted closure planning for CR-01, CR-02, and WR-01, with an explicit decision on whether WR-02 joins that scope.
2. Change one or more dispositions to ACCEPT or DEFER with rationale and evidence.
3. Stop Phase 15 and revise milestone scope.

Do not mark Phase 15 complete, start another verifier, or launch another blind gap cycle until this decision is recorded.
