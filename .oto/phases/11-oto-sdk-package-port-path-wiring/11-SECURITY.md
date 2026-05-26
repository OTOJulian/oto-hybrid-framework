---
phase: 11-oto-sdk-package-port-path-wiring
phase_number: 11
status: verified
threats_open: 0
asvs_level: 1
verified: 2026-05-25T23:05:21Z
auditor: Codex security auditor
---

# Phase 11 Security Verification

Per-phase security contract: verify the PLAN.md threat registers for Phase 11 and record accepted risks. Scope is limited to the declared Phase 11 threats and the user-requested checks for PATH self-link safety, unmanaged executable preservation, stale PATH shadowing, dependency-resolution safety, shell-free process execution, package allowlist behavior, and no install-time TypeScript build.

## Result

| Metric | Count |
|--------|-------|
| Threats reviewed | 11 |
| Closed | 11 |
| Open | 0 |
| Unregistered summary flags | 0 |

Security enforcement is treated as enabled. `.planning/config.json` does not disable security enforcement, and prior project convention defaults Phase security gates to ASVS Level 1 unless a stricter config is present.

## Threat Verification

| Threat ID | Category | Component | Disposition | Status | Evidence |
|-----------|----------|-----------|-------------|--------|----------|
| T-11-01 | Tampering | committed `sdk/dist/` | mitigate | CLOSED | `11-01-SUMMARY.md:60-63` records SDK source port, tsc build, committed dist, and structured slug verification. Current direct check passed: `node bin/oto-sdk.js query generate-slug "Phase Eleven"` returned `slug: phase-eleven`. `find sdk/dist -name '*.test.js' -o -name '*.integration.test.js'` returned no files. |
| T-11-02 | Tampering | SDK dependency tree | accept | CLOSED | Accepted risk AR-11-01. Dependency surface is explicitly declared in `package.json:6-8` and `sdk/package.json:42-45`; lock metadata and faithful-port rationale are documented in `11-01-SUMMARY.md:16-18` and `11-02-SUMMARY.md:72-80`. |
| T-11-03 | Information disclosure | `@file:` / `--project-dir` path handling | accept | CLOSED | Accepted risk AR-11-02. Existing bounded path handling remains present: `sdk/src/query/helpers.ts:571-584` resolves real project root and rejects paths escaping it. `sdk/src/cli.ts:272-277` uses that helper before reading `@file:` query output. |
| T-11-04 | Tampering | package `files` allowlist | mitigate | CLOSED | `package.json:14-30` allows only `sdk/dist/`, `sdk/package.json`, and `sdk/prompts/` for SDK payload, not bare `sdk/`, `sdk/src/`, or `sdk/node_modules/`. `npm --cache /private/tmp/oto-npm-cache pack --dry-run --json` check found required SDK payload present, forbidden SDK files count 0, total packed files 794. |
| T-11-05 | Tampering | top-level runtime dependencies | accept | CLOSED | Accepted risk AR-11-03. Top-level dependency versions match the locked plan: `package.json:6-8`. Clean-install dependency-resolution guard is implemented in `scripts/install-smoke.cjs:67-72` and `scripts/install-smoke.cjs:109-115`. |
| T-11-06 | Elevation of Privilege | `bin/oto-sdk.js` shim delegation | accept | CLOSED | Accepted risk AR-11-04. Shim resolves package-internal CLI by `__dirname` and delegates through `spawnSync(process.execPath, [cliPath, ...process.argv.slice(2)])` with no shell: `bin/oto-sdk.js:17-25`. Syntax check `node -c bin/oto-sdk.js` passed. |
| T-11-07 | Elevation of Privilege | self-link write target | mitigate | CLOSED | `trySelfLinkOtoSdk` is POSIX-only, considers `~/.local/bin` and PATH directories under `os.homedir()`, and returns null on failure: `bin/lib/install.cjs:106-125`, `bin/lib/install.cjs:127-159`. Unit test asserts HOME-bounded target: `tests/sdk-wiring.test.cjs:86-113`. |
| T-11-08 | Tampering | stale or poisoned prior `oto-sdk` target | mitigate | CLOSED | Managed stale targets are replaced only after recognition: `bin/lib/install.cjs:52-75`, `bin/lib/install.cjs:131-147`. Regression coverage confirms managed replacement at `tests/sdk-wiring.test.cjs:115-145` and unmanaged executable/non-executable preservation at `tests/sdk-wiring.test.cjs:147-197`. |
| T-11-09 | Spoofing | false `OTO SDK ready` message | mitigate | CLOSED | Readiness is based on a current-install PATH match, not file presence: `bin/lib/install.cjs:186-214`. Shadowed PATH returns `reason: 'shadowed'`: `bin/lib/install.cjs:188-199`. Regression test refuses stale PATH readiness at `tests/sdk-wiring.test.cjs:199-229`. |
| T-11-10 | Tampering | regressed dist or dropped dependency silently shipping | mitigate | CLOSED | Smoke gate checks installed `oto-sdk`, JSON output, and `ERR_MODULE_NOT_FOUND` absence for both pure and `.planning`-backed queries: `scripts/install-smoke.cjs:56-91`, `scripts/install-smoke.cjs:93-132`. Local direct query and packlist checks passed in this audit. |
| T-11-11 | Denial of Service | smoke temp directories | accept | CLOSED | Accepted risk AR-11-05. Cleanup is implemented for install prefix and planning project: `scripts/install-smoke.cjs:131-138`, and per-runtime temp dirs are removed at `scripts/install-smoke.cjs:207`. |

## Accepted Risks

| Risk ID | Threat ID | Rationale | Owner | Date |
|---------|-----------|-----------|-------|------|
| AR-11-01 | T-11-02 | Faithful SDK port intentionally adds `@anthropic-ai/claude-agent-sdk` and `ws`. Versions are caret-pinned to the planned ranges and npm integrity applies on install. | Codex security audit | 2026-05-25 |
| AR-11-02 | T-11-03 | Phase 11 preserves upstream path indirection behavior. Existing helper bounds resolved paths to the project root; deeper CJS bridge path rewiring is assigned to later phases. | Codex security audit | 2026-05-25 |
| AR-11-03 | T-11-05 | Top-level runtime dependency declaration is required for clean installed `sdk/dist` resolution. The smoke gate now fails if dependency resolution regresses. | Codex security audit | 2026-05-25 |
| AR-11-04 | T-11-06 | The shim executes the current Node binary with an argument array and package-internal CLI path. No shell interpolation or user-controlled executable selection is introduced. | Codex security audit | 2026-05-25 |
| AR-11-05 | T-11-11 | The smoke harness uses temporary directories for local install simulation and removes them in `finally` or immediately after use. Residual cleanup risk is acceptable for a developer-side test harness. | Codex security audit | 2026-05-25 |

## Supplemental Checks

| Check | Status | Evidence |
|-------|--------|----------|
| PATH self-link safety | CLOSED | HOME-bounded candidates and POSIX skip in `bin/lib/install.cjs:106-125`; unit coverage in `tests/sdk-wiring.test.cjs:86-113`. |
| Unmanaged executable preservation | CLOSED | Unmanaged targets are skipped instead of overwritten at `bin/lib/install.cjs:131-135`; tests cover executable and non-executable unmanaged targets at `tests/sdk-wiring.test.cjs:147-197`. |
| Stale PATH shadowing | CLOSED | `findOtoSdkOnPath(shimSrc)` records current-install match, and `wireOtoSdk` refuses shadowed executables at `bin/lib/install.cjs:186-199`; test coverage at `tests/sdk-wiring.test.cjs:199-229`. |
| Dependency-resolution safety | CLOSED | Top-level dependencies in `package.json:6-8`; smoke negative guards in `scripts/install-smoke.cjs:67-72` and `scripts/install-smoke.cjs:109-115`. |
| No shell interpolation | CLOSED | Shim and smoke use `spawnSync`/`execFile` with argument arrays: `bin/oto-sdk.js:22-25`, `scripts/install-smoke.cjs:28-30`, `scripts/install-smoke.cjs:67`, `scripts/install-smoke.cjs:109`, `scripts/install-smoke.cjs:148-152`, `sdk/src/cli.ts:298-303`. `rg "shell\\s*:"` found no shell option in the scoped files. |
| Package allowlist behavior | CLOSED | `package.json:14-30`; pack dry-run with temp npm cache found required SDK payload present and no `sdk/src/`, `sdk/node_modules/`, or SDK test files. |
| No install-time TypeScript build | CLOSED | Top-level scripts contain no `prepare`; `postinstall` is only `node scripts/build-hooks.js` at `package.json:31-36`. The SDK subpackage retains author/publish build scripts at `sdk/package.json:35-40`, but they are not wired into the parent install path. |

## Summary Threat Flags

No unregistered threat flags were reported in the Phase 11 summaries:

| Summary | Threat Flags |
|---------|--------------|
| `11-01-SUMMARY.md` | None (`11-01-SUMMARY.md:110-112`) |
| `11-02-SUMMARY.md` | None (`11-02-SUMMARY.md:123-125`) |
| `11-03-SUMMARY.md` | None; filesystem write surface mapped to T-11-07 through T-11-09 (`11-03-SUMMARY.md:125-127`) |
| `11-04-SUMMARY.md` | None; smoke harness surface mapped to T-11-10/T-11-11 (`11-04-SUMMARY.md:104-106`) |

## Verification Commands

| Command | Result |
|---------|--------|
| `node --test tests/sdk-wiring.test.cjs` | PASS, 8 tests |
| `node -c bin/oto-sdk.js` | PASS |
| `node -c bin/install.js` | PASS |
| `node -c bin/lib/install.cjs` | PASS |
| `node bin/oto-sdk.js query generate-slug "Phase Eleven"` | PASS, JSON slug `phase-eleven` |
| `node -e "<package metadata assertion>"` | PASS, bin/deps/files/no-prepare/no-postinstall-build checks |
| `npm --cache /private/tmp/oto-npm-cache pack --dry-run --json` via parser | PASS, required payload present, forbidden SDK files count 0 |
| `find sdk/dist -name '*.test.js' -o -name '*.integration.test.js'` | PASS, no output |
| `git check-ignore sdk/dist/cli.js sdk/node_modules` | PASS, only `sdk/node_modules` is ignored |

Note: a first `npm pack --dry-run --json` attempt using the default `~/.npm` cache failed with an existing npm cache permission error. The equivalent packlist assertion passed with npm cache set to `/private/tmp/oto-npm-cache`.

## Audit Trail

| Date | Threats | Closed | Open | Auditor |
|------|---------|--------|------|---------|
| 2026-05-25 | 11 | 11 | 0 | Codex security auditor |
