---
phase: 16-agent-guidance-hardening
status: executing
updated: "2026-07-17"
decision: developer_approved_defer
---

# Phase 16 Developer-Approved Dispositions

## WR-02 SDK Planning-Root Fixture Debt

| ID | Source | Disposition | Result | Evidence |
|---|---|---|---|---|
| WR-02 | `.oto/phases/15-exa-mcp-registration-all-three-runtimes/15-DISPOSITIONS.md` | **DEFER** | **TRACKED DEBT** | The current full-SDK failure set is compared against the amended Plan 14-16 two-run union in `16-SDK-BASELINE-DELTA.txt`. The only approved baseline increase is `src/golden/read-only-parity.integration.test.ts` from 19 to 21 failures. |

The developer approved this disposition on 2026-07-17. The +2 baseline amendment covers exactly the `list.todos` and `todo.match-phase` parity failures caused by the tracked planning-root divergence: legacy CJS scans `.planning`, while the SDK reads the real `.oto/todos`. Pre-Phase-16 commit `e4c661b` exposed the divergence by adding a pending todo; `16-SDK-BASELINE-DELTA.txt` records the causal proof that Phase 16 production changes did not create it.

The two todo golden rows remain unchanged, failing, and counted. The baseline amendment is not a claim that the full SDK suite is green; it permits only a baseline-relative `NO NEW FAILURES: PASS` when every current failing file and count remains within the amended union.

No planning-root migration is authorized inside Plan 16-06. That migration remains a separately planned, bounded work item and must be scheduled before milestone close if the milestone hard gates require the full SDK suite to be green.
