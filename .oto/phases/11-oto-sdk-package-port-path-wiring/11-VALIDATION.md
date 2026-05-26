---
phase: 11
slug: oto-sdk-package-port-path-wiring
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-25
---

# Phase 11 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Central check: the **clean-install simulation** proving `oto-sdk query <key>` resolves + returns structured output with no manual build and no missing-module crash.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework (top-level)** | `node:test` (built-in) |
| **Framework (sdk subpackage)** | `vitest ^3.1.1` — runs in `sdk/`, NOT part of top-level `npm test`; scoped out of Phase 11's ship/gate |
| **Config file** | top-level: none (CLI flags); sdk: `sdk/vitest.config.ts` |
| **Quick run command** | `node --test tests/sdk-wiring.test.cjs` |
| **Full suite command** | `npm test` |
| **Clean-install sim** | `node scripts/install-smoke.cjs` (EXTENDED) |
| **Estimated runtime** | ~30–90 seconds (install-smoke dominates) |

---

## Sampling Rate

- **After every task commit:** `node --test tests/sdk-wiring.test.cjs` when touching the installer; `cd sdk && npm run build` when touching SDK source (proves dist still compiles).
- **After every plan wave:** `npm test` + `node scripts/install-smoke.cjs`.
- **Before `/gsd-verify-work`:** `node scripts/install-smoke.cjs` green (SC #1–#4 end-to-end) AND `npm test` green.
- **Max feedback latency:** ~90 seconds.

---

## Per-Task Verification Map

> Filled by the planner. Anchors below derive from research; planner assigns Task IDs/waves.

| Req | Behavior | Test Type | Automated Command | File Exists |
|-----|----------|-----------|-------------------|-------------|
| SDK-01 | `oto-sdk query generate-slug "Phase Eleven"` resolves + emits JSON `"slug":"phase-eleven"`; no `ERR_MODULE_NOT_FOUND` | install-smoke (integration) | extend `scripts/install-smoke.cjs` | ❌ W0 |
| SDK-01 | `.planning/`-backed key returns structured output | install-smoke (integration) | `oto-sdk query roadmap.analyze` (or `state.json`) → parseable JSON | ❌ W0 |
| SDK-02 | `oto-sdk` callable on PATH via bin entry; installer "OTO SDK ready" PATH-gated | install-smoke (integration) | assert `<prefix>/bin/oto-sdk` exists + `mode & 0o111`; installer stdout contains "OTO SDK ready" | ❌ W0 |
| SDK-02 | `isOtoSdkOnPath()` / `trySelfLinkOtoSdk()` behave (PATH walk, self-link, require-wrapper fallback) | unit (node:test) | NEW `tests/sdk-wiring.test.cjs` | ❌ W0 |
| SDK-04 | Clean github-archive install yields working `oto-sdk`, NO manual build | install-smoke (integration) | `npm pack` → `npm install -g <tarball> --prefix <tmp>`; assert `sdk/dist/cli.js` present + runs with no `tsc` step | ❌ W0 |
| SDK-04 | `files` allowlist ships the SDK payload | unit (node:test) | `npm pack --dry-run --json` includes `sdk/dist/cli.js`, `sdk/package.json` | ❌ W0 |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `scripts/install-smoke.cjs` — EXTEND to run `oto-sdk query generate-slug` + a `.planning/` key + the `ERR_MODULE_NOT_FOUND` negative guard (SDK-01, SDK-04).
- [ ] `tests/sdk-wiring.test.cjs` — NEW node:test for `isOtoSdkOnPath()` / `trySelfLinkOtoSdk()` (SDK-02 unit).
- [ ] `sdk/dist/` — NEW committed build artifact (the "no manual build" enabler for SDK-04).
- [ ] (Optional) packlist assertion that `sdk/dist/cli.js` is in `npm pack` output.

*SDK subpackage's own vitest suite ports along with the source but is NOT wired into top-level `npm test` (runs via `cd sdk && npm test` for authors). No top-level framework install needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `~/.local/bin` self-link fallback on a host where npm's global bin is off-PATH | SDK-02 | CI runners keep the global bin on PATH; the off-PATH branch is hard to exercise hermetically | On a machine where npm global bin is not on PATH, run `oto install --claude`, confirm `↪ linked oto-sdk → ~/.local/bin` and `oto-sdk query generate-slug x` resolves |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 90s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
