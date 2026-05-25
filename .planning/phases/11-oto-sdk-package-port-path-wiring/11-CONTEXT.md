# Phase 11: oto-sdk package port + PATH wiring - Context

**Gathered:** 2026-05-25
**Status:** Ready for planning
**Source:** Targeted decisions captured during /gsd-plan-phase (no full discuss-phase)

<domain>
## Phase Boundary

**This phase delivers:** A clean GitHub-archive install (`npm install -g github:OTOJulian/oto-hybrid-framework`) yields a working `oto-sdk` on PATH — `oto-sdk query <key>` resolves and returns structured output instead of `command not found`, with no separate manual build step.

**In scope (Phase 11):**
- A top-level `sdk/` subpackage ported from GSD's `sdk/` (own `package.json`, `tsconfig.json`, ESM, `type: module`), rebranded gsd→oto.
- A top-level `bin/oto-sdk.js` shim that resolves `../sdk/dist/cli.js` and delegates via `node`.
- `package.json` bin entry `oto-sdk` → `bin/oto-sdk.js`, and `files` allowlist updated to ship the prebuilt SDK.
- Prebuilt `sdk/dist/` committed to git and shipped in the package — NO install-time TypeScript build.
- The live installer (`bin/install.js` → `bin/lib/install.cjs`) gains the #2775 PATH-wiring: a PATH-callability check, a `~/.local/bin` self-link fallback, and a "✓ OTO SDK ready" message gated on real PATH resolution.
- Runtime dependencies (`@anthropic-ai/claude-agent-sdk`, `ws`) resolve on a clean install so `oto-sdk query` starts without a missing-module crash.

**Out of scope — deferred to Phase 12 (SDK-03, SDK-05):**
- Re-pathing the query registry to `.oto/` paths and oto namespaces.
- Making every key (`init.*`, `agent-skills`, `commit`, `state.*`, `phases.*`) answer correctly against oto namespaces.
- Wiring workflows to consume `oto-sdk query` output (with graceful manual fallback).

**Out of scope — deferred to Phase 13 (DOG-*):**
- The `.planning/` → `.oto/` migration of this repo.

The Phase 11 bar is: the binary **resolves and returns structured output**. Full registry correctness against oto namespaces/`.oto/` paths is Phase 12's job. Phase 11 keeps the registry answering against the current repo layout (`.planning/`); a surface rebrand of identifiers and user-facing strings is enough — deep re-pathing is explicitly Phase 12.
</domain>

<decisions>
## Implementation Decisions

### Port scope — Faithful full port + deps (LOCKED, user decision)
- Port GSD's entire `sdk/` source faithfully (including the programmatic runner: `phase-runner`, `session-runner`, `ws-transport`, `event-stream`, `init-runner`, the `GSD` class, transports), not a query-only trim.
- Rationale: lowest port effort, preserves clean future upstream syncs, and keeps the programmatic runner available. The runner is not used by oto's slash-command workflows today (those use Claude Code's native Task tool), but fidelity-to-upstream was chosen over trimming.

### Dependency strategy (LOCKED, user decision)
- Declare `@anthropic-ai/claude-agent-sdk` (^0.2.84) and `ws` (^8.20.0) as **regular dependencies** so the full SDK — including the programmatic runner — works out of the box on a clean install.
- **Critical constraint:** `cli.ts` statically imports `index.ts` (→ `session-runner`/`event-stream` → Agent SDK) and `ws-transport` (→ `ws`). At module load, `node sdk/dist/cli.js` transitively requires both deps. Therefore **both deps MUST be resolvable at runtime for `oto-sdk query` to even start** — a missing-module crash would fail success criterion #1 just as surely as `command not found`. The planner must ensure the dependency-resolution mechanism (see Research Questions) actually places these where Node resolves them from `sdk/dist/cli.js` on a `npm install -g github:…` install, given we ship prebuilt `dist/` and do NOT run the SDK's own `npm install`.

### Installer wiring — Bin entry + port #2775 verify into the live installer (LOCKED, Q2 = Option A)
- Add the `package.json` bin entry (`oto-sdk` → `bin/oto-sdk.js`); npm auto-links it on a github-archive global install.
- Port the #2775 machinery from the dead `oto/bin/install.js` (~lines 7267–7602) into the LIVE installer `bin/lib/install.cjs`, with paths corrected from `oto/bin/`+`oto/sdk/` to canonical top-level `bin/oto-sdk.js` + `sdk/dist/cli.js`:
  - `isOtoSdkOnPath()` — pure PATH walk for a callable `oto-sdk`.
  - `trySelfLinkOtoSdk()` — `~/.local/bin` (or first writable on-PATH HOME dir) self-link/wrapper fallback.
  - dist-presence verify + "✓ OTO SDK ready" gated on real PATH-callability (avoid the false-✓ #2775 was created to prevent).
- Rationale: success criterion #2 ("the installer's PATH-resolution check confirms it") and #4 ("the #2775 machinery finds the shim and bin entry") both reference a *live* PATH check. The live `bin/install.js` is the clean v0.1.0 adapter rewrite and currently has NO SDK-install step — so this adds a small, well-bounded SDK-wiring step sourced from the already-written upstream code. It also fixes a real failure mode (npm global bin not on PATH).

### Mechanics decided by Claude (per CLAUDE.md Technology Stack, low-stakes)
- **SDK location:** top-level `sdk/` subpackage with its own `package.json` (`type: module`, ESM) and `tsconfig.json`, mirroring GSD. TypeScript stays confined to `sdk/`.
- **Shim location:** top-level `bin/oto-sdk.js` (covered by the existing `bin/` `files` entry), resolving `path.resolve(__dirname, '..', 'sdk', 'dist', 'cli.js')`.
- **Build/ship:** commit `sdk/dist/` to git and ship it prebuilt. Do NOT add `tsc` to `postinstall`/`prepare` — CLAUDE.md explicitly warns against install-time TS toolchain risk. The existing `postinstall: build-hooks.js` stays untouched.
- **`files` allowlist:** add the SDK payload needed at runtime (e.g. `sdk/dist/`, `sdk/package.json`, and `sdk/prompts/` if present). `bin/oto-sdk.js` is already covered by `bin/`.
- **Rebrand depth:** surface rebrand only — package name, bin name (`gsd-sdk`→`oto-sdk`), shim, and user-facing CLI strings (help/usage/errors). Deep registry re-pathing (`.planning/`→`.oto/`, namespace semantics, `gsd-tools.cjs`/`core.cjs` resolution) is Phase 12.
</decisions>

<research_questions>
## Open questions for the researcher (resolve before planning)

1. **Dependency resolution (highest risk):** For a `npm install -g github:OTOJulian/oto-hybrid-framework` install where we ship prebuilt `sdk/dist/` and do NOT run the SDK subpackage's own `npm install`, where must `@anthropic-ai/claude-agent-sdk` and `ws` be declared so Node resolves them at runtime from `sdk/dist/cli.js`? Options to evaluate: (a) declare them in the TOP-LEVEL `package.json` `dependencies` (npm installs them into the install's `node_modules`; Node's upward resolution from `sdk/dist/cli.js` finds them); (b) ship `sdk/node_modules/`; (c) keep them in `sdk/package.json` and add an install step. Recommend the most robust option that needs no manual build and no separate sub-install. Verify by simulating the resolution path.
2. **Minimum rebrand for the binary to run:** What is the minimal gsd→oto rebrand so `oto-sdk query <key>` resolves and returns structured output without erroring (help text, bin name, package name, any self-referential `gsd-sdk` resolution), WITHOUT crossing into Phase 12's registry re-pathing? Identify which `.planning/`/`gsd-tools.cjs`/`core.cjs` references can stay as-is for Phase 11.
3. **What `query` keys are expected to return structured output in Phase 11** given the registry still targets the current `.planning/` layout — enough to satisfy "returns structured output instead of command not found" without Phase 12's full re-pathing.
4. **Clean-install simulation:** the exact command sequence to verify SC #1–#4 (e.g. `npm pack` → install the tarball into a temp prefix → `oto-sdk query <key>` resolves on PATH and emits structured output, with no manual build).
5. **`.test.ts` / vitest handling:** the GSD `tsconfig.json` excludes `*.test.ts` from the build; confirm the port keeps tests out of `dist/` and that the SDK's vitest config ports cleanly (or is scoped out) without blocking the prebuilt-dist ship.
</research_questions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Port source (GSD sdk subpackage)
- `foundation-frameworks/get-shit-done-main/sdk/` — the full port source (src/, query/, package.json, tsconfig.json, vitest.config.ts).
- `foundation-frameworks/get-shit-done-main/sdk/package.json` — build scripts, deps (`@anthropic-ai/claude-agent-sdk` ^0.2.84, `ws` ^8.20.0), `files` (`dist`, `prompts`), bin (`gsd-sdk` → `./dist/cli.js`).
- `foundation-frameworks/get-shit-done-main/sdk/tsconfig.json` — `outDir: dist`, excludes `*.test.ts`/`*.integration.test.ts`.
- `foundation-frameworks/get-shit-done-main/sdk/src/cli.ts` — CLI entry; the `query` dispatch path (statically imports `GSD`, `CLITransport`, `WSTransport`, `InitRunner`).
- `foundation-frameworks/get-shit-done-main/sdk/src/index.ts` — `GSD` class; statically imports `session-runner` and `event-stream` (→ Agent SDK).
- `foundation-frameworks/get-shit-done-main/sdk/HANDOVER-QUERY-LAYER.md` — query registry architecture, `createRegistry()`, `normalizeQueryCommand`, parity tiers.

### Shim to port
- `foundation-frameworks/get-shit-done-main/bin/gsd-sdk.js` — the shim to rebrand to top-level `bin/oto-sdk.js` (resolves `../sdk/dist/cli.js`, delegates via `spawnSync(process.execPath, ...)`).

### Installer wiring
- `oto/bin/install.js` (~lines 7267–7602) — the dead-but-authoritative #2775 machinery: `isGsdSdkOnPath()`, `trySelfLinkGsdSdk()`, `installSdkIfNeeded()`, dist-presence verify, PATH-gated "✓ ... ready". SOURCE to port into the live installer (correct paths to top-level).
- `bin/install.js` — the LIVE bin entry (package.json `bin.oto`); adapter-based, currently no SDK step.
- `bin/lib/install.cjs` — the live install library where the ported #2775 wiring lands.

### Project constraints
- `CLAUDE.md` → "Technology Stack" / "Stack Patterns by Variant" — `sdk/` subpackage pattern, `bin/oto-sdk.js` thin wrapper, ship prebuilt `dist/`, NO install-time TS build, `node:test` for tooling / Vitest only inside `sdk/`.
- `package.json` — current `bin` (`oto` only) and `files` allowlist to extend.
- `.planning/ROADMAP.md` (Phase 11 section) — goal + 4 success criteria.
- `.planning/REQUIREMENTS.md` — SDK-01, SDK-02, SDK-04 (and the Phase 12/13 boundary).
</canonical_refs>

<specifics>
## Specific Ideas

- The shim must resolve the CLI relative to its OWN location (`__dirname`) so the self-link wrapper fallback in `trySelfLinkOtoSdk()` keeps working — see the #2775 comment in `oto/bin/install.js` (~line 7565) about why `copyFileSync` breaks `__dirname` resolution and a `require()` wrapper is used instead.
- The "no manual build step" criterion = ship committed `sdk/dist/`. Verify the execute-bit handling for `dist/cli.js` (tsc emits 0o644; the installer chmods +x; the shim invokes via `node` so it works regardless).
- `npm install -g github:…` runs `prepare`/`postinstall` but NOT `prepublishOnly`; the SDK build must not depend on `prepublishOnly`. Since we ship committed `dist/`, no build runs on install at all.
</specifics>

<deferred>
## Deferred Ideas

- Query registry re-pathing to `.oto/` and oto namespaces → Phase 12 (SDK-03).
- Workflow consumption of `oto-sdk query` with graceful fallback → Phase 12 (SDK-05).
- `.planning/`→`.oto/` repo migration → Phase 13 (DOG-*).
- Trimming the programmatic runner / dropping heavy deps → explicitly rejected this phase (faithful full port chosen).
</deferred>

---

*Phase: 11-oto-sdk-package-port-path-wiring*
*Context gathered: 2026-05-25 via targeted decisions during /gsd-plan-phase*
