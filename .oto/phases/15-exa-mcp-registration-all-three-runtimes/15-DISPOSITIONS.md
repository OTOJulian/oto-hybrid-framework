---
phase: 15-exa-mcp-registration-all-three-runtimes
status: closure_verified
updated: "2026-07-14T20:58:53Z"
source:
  - 15-REVIEW.md
  - 15-VERIFICATION.md
verification_score: "10/10"
blocking_findings: 0
bounded_convergence: developer_authorized_closure
closure_commit: "802052797cbe3be65cbf764b8f40b1b73bc6185b"
---

# Phase 15 Bounded-Convergence Dispositions

The developer approved the bounded-convergence dispositions on 2026-07-14: CR-01 **FIX**, CR-02 **FIX**, WR-01 **FIX**, and WR-02 **DEFER** as tracked fixture debt. The authorized closure was implemented in `8020527` and re-verified only against the changed files and the three reproductions from `15-VERIFICATION.md`; no new gap cycle or full phase re-sweep was run.

| ID | Severity | Approved disposition | Result | Closure evidence |
|---|---|---|---|---|
| CR-01 | Critical | **FIX** | **CLOSED** | Conservative TOML-key inspection recognizes bare, quoted-parent, quoted-child, dotted-assignment, and inline-table Exa definitions. Ambiguous TOML returns `unparseable`; registration preserves input bytes and records no ownership. CJS lifecycle/status and built SDK status probes pass. |
| CR-02 | Critical | **FIX** | **CLOSED** | All three unsafe CJS block-comment regex sites now use one fail-closed JSONC helper. When strict JSON needs fallback and block-comment delimiters are present, merge, unmerge, and status refuse without writing. Claude, Gemini register/unregister, CJS status, and SDK status probes pass. |
| WR-01 | Warning promoted to blocker | **FIX** | **CLOSED** | Gemini dry-runs the exact settings transformation before payload copy or marker injection. Null/primitive-root failures leave no commands, hooks, `GEMINI.md`, or `.install.json`, and preserve `settings.json` bytes. |
| WR-02 | Warning | **DEFER** | **TRACKED DEBT** | The stale SDK workstream fixtures and missing local Rollup optional package remain outside this closure. The fresh Vitest attempt failed before collection on `@rollup/rollup-darwin-x64`; TypeScript build and direct built-SDK probes passed. |

## Scoped Closure Evidence

- RED gate before implementation: 16 focused CJS failures and 4 SDK status-mirror failures reproduced the approved findings.
- Fresh post-commit closure suite: 135 passed, 0 failed.
- Adjacent changed-file installer/runtime suite: 27 passed, 0 failed.
- SDK TypeScript build: passed.
- Direct freshly built SDK probe: all four Codex spellings reported `user-owned`; ambiguous Gemini JSONC reported `detail: unparseable`.
- Focused SDK Vitest: blocked before collection by the deferred WR-02 Rollup dependency defect; it was not repaired mid-phase.
- `INTERVIEW-BRIEF-oto.md` remained untouched.

No further Phase 15 gap work is authorized or required by these dispositions.
