---
phase: 15-exa-mcp-registration-all-three-runtimes
verified: "2026-07-14T20:58:53Z"
verified_at: "2026-07-14T20:58:53Z"
verifier: "Codex (disposition-authorized scoped closure re-verification)"
status: passed
score: "10/10"
blocker_count: 0
head: "802052797cbe3be65cbf764b8f40b1b73bc6185b"
verification_scope: "closure-changed files plus CR-01, CR-02, and WR-01 reproductions only"
requirements:
  MCP-01: passed
  MCP-02: passed
  MCP-03: passed
  MCP-04: passed
  MCP-05: passed
  MCP-06: passed
  MCP-07: passed
  MCP-08: passed
  MCP-09: passed
  HARD-02: passed
review_adjudication:
  CR-01: fixed
  CR-02: fixed
  WR-01: fixed
  WR-02: deferred_non_blocking
progress_log_lines: 10
---

# Phase 15: Exa MCP Registration Across All Three Runtimes — Verification Report

## Verdict

**Status:** `passed`
**Score:** **10/10 requirements passed**
**Blocking gaps:** **0**

The developer authorized a bounded closure for CR-01, CR-02, and WR-01 while explicitly deferring WR-02 fixture debt. Re-verification was deliberately limited to the files changed by commit `8020527` and the specific failure reproductions in the prior report. The five requirements previously blocked by those findings now pass; the five requirements already verified as passing retain their earlier evidence. No full phase re-sweep was performed.

## Scoped Requirement Re-verification

| Requirement | Verdict | Fresh closure evidence |
|---|---|---|
| **MCP-04** — Codex marker block and external-duplicate refusal | **PASSED** | Bare, quoted-child, quoted-parent, dotted-assignment, and inline-table Exa definitions are recognized as user-owned. Registration refuses without changing input bytes; malformed/ambiguous relevant TOML refuses as `unparseable`. |
| **MCP-05** — Gemini registration with safe stdio shape | **PASSED** | Gemini registration now refuses ambiguous block-comment JSONC before a write; the original bytes remain identical. The same fail-closed helper is used by the Claude settings path. |
| **MCP-07** — idempotent and key-conditional | **PASSED** | Codex lifecycle tests for all four alternate logical-key spellings skip registration and record no MCP ownership, preventing duplicate logical Exa entries. |
| **MCP-08** — fingerprint-only, ownership-safe uninstall | **PASSED** | Gemini unregistration refuses ambiguous JSONC byte-identically. Gemini settings preflight occurs before payload/marker mutation; null and primitive roots leave no payload, instruction marker, or install state. |
| **MCP-09** — truthful per-runtime settings status | **PASSED** | CJS and freshly built SDK probes classify all four Codex logical-key spellings as `user-owned`; ambiguous Gemini JSONC reports `detail: unparseable`. |

Previously passing MCP-01, MCP-02, MCP-03, MCP-06, and HARD-02 retain the evidence recorded by the authorized local verifier at `e4c661b`.

## Fresh Test and Probe Evidence

| Evidence | Fresh result |
|---|---|
| Closure CJS files: `15-codex-mcp-block`, `15-gemini-mcp-merge`, `15-claude-mcp-merge`, `15-mcp-status`, `15-mcp-state` | 135 passed, 0 failed |
| Adjacent changed-file installer/runtime tests | 27 passed, 0 failed |
| `sdk` TypeScript build | passed |
| Direct `sdk/dist/query/mcp-status.js` probe | Codex: 4/4 `user-owned`; Gemini ambiguous JSONC: `not-registered`, `detail: unparseable` |
| Focused SDK Vitest | did not start: deferred WR-02 environment debt, missing `@rollup/rollup-darwin-x64` |
| `git diff --check` before artifact update | passed |

The focused SDK Vitest runner failure occurred before test collection and is the same local optional-dependency defect already recorded under WR-02. It does not negate the successful TypeScript build or direct execution of the freshly built changed classifier, and the developer explicitly deferred WR-02.

All effectful tests used temporary directories. No real runtime configuration was mutated. The unrelated untracked `INTERVIEW-BRIEF-oto.md` was not touched.

## Closure History

- Prior independent verification at `0335584` scored 7/10.
- Gap Plans 15-11 and 15-12 closed the earlier incompatible-shape and invalid-state ownership findings.
- The authorized local verifier at `e4c661b` scored 5/10 and established CR-01, CR-02, WR-01, and non-blocking WR-02.
- The developer approved FIX/FIX/FIX/DEFER dispositions.
- Commit `8020527` implemented exactly the three authorized fixes.
- This scoped closure re-verification closes all three blockers without opening another gap cycle.

---

_Verified: 2026-07-14T20:58:53Z_
_Verifier: Codex (disposition-authorized scoped closure re-verification)_
