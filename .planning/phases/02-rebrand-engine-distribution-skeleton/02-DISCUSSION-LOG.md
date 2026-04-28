# Phase 2: Rebrand Engine & Distribution Skeleton - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-28
**Phase:** 02-rebrand-engine-distribution-skeleton
**Areas discussed:** Engine modularity & CLI shape, Engine apply-mode scope, Reports & coverage manifest format, GitHub repo & install-smoke timing, Coverage manifest pre/post strategy, `files` allowlist, Round-trip & allowlist fixture strategy

---

## Gray-Area Selection

| Area | Description | Selected for discussion |
|------|-------------|-------------------------|
| Engine modularity & CLI shape | Single script vs library + thin CLI | ✓ |
| Engine apply-mode scope | Dry-run only vs all three modes vs apply-deferred | ✓ |
| Reports & coverage manifest format | JSON / markdown / both | ✓ |
| GitHub repo & install-smoke timing | Manual / scripted / local-only | ✓ |
| GitHub owner placeholder resolution | Hardcoded / env / config / flag | (locked upfront — hardcoded `OTOJulian` + `--owner` override) |
| `postinstall` / `build-hooks.js` stub | Stub now / defer to Phase 5 | (locked upfront — stub at Phase 2) |

User selected all four candidate areas (the first four). Decisions for the latter two were locked upfront with rationale shown in the gray-area-selection prompt.

---

## Engine modularity & CLI shape

| Option | Description | Selected |
|--------|-------------|----------|
| Rules-as-modules + thin CLI | One file per rule class under `lib/rules/`, thin CLI in `scripts/rebrand.cjs`. Each rule independently unit-testable. Mirrors CLAUDE.md `oto/bin/lib/*.cjs` precedent. | ✓ |
| Single-file engine + thin CLI | One `lib/engine.cjs` with all rule classes as internal functions. Smaller surface, harder to unit-test individual rules. | |
| Single script (no lib split) | Just `scripts/rebrand.cjs` (~600–1000 LOC). Simplest, hardest to test in isolation. | |

**User's choice:** Rules-as-modules + thin CLI (Recommended)
**Notes:** Round-trip and coverage logic want isolated tests; per-rule modules make `\b`-boundary identifier bugs (Pitfall 1) testable in isolation from path-segment matching.

---

## Engine apply-mode scope

| Option | Description | Selected |
|--------|-------------|----------|
| All three modes, out-of-place apply | `--dry-run`, `--apply --out <dir>`, `--verify-roundtrip` all working in Phase 2. Apply runs against `foundation-frameworks/` into `.oto-rebrand-out/` scratch dir. | ✓ |
| Dry-run + roundtrip only; apply deferred to Phase 4 | Phase 2 ships `--dry-run` + `--verify-roundtrip` (synthetic fixtures only). `--apply` wired but only fixture-tested. | |
| Dry-run only | Round-trip simulated without ever writing files. Apply added in Phase 4. | |

**User's choice:** All three modes, out-of-place apply (Recommended)
**Notes:** Round-trip needs apply to function. Single engine reused across Phase 2 (verification) and Phase 4 (real bulk port) prevents drift.

---

## Reports & coverage manifest format

| Option | Description | Selected |
|--------|-------------|----------|
| JSON canonical + thin generated `.md` | `reports/*.json` is source of truth; `.md` files auto-generated indexes. Matches Phase 1 D-13 `file-inventory` dual-format precedent. | ✓ |
| JSON only | `reports/*.json` only; human review = `jq` queries. | |
| Markdown only | `reports/*.md` only; CI parses markdown (fragile). | |

**User's choice:** JSON canonical + thin generated `.md` (Recommended)
**Notes:** CI consumption (Phase 10) wants JSON; ad-hoc human review wants markdown index. Generated markdown means single source of truth.

---

## GitHub repo & install-smoke timing

| Option | Description | Selected |
|--------|-------------|----------|
| Manual repo creation, phase verifies real clone | User creates `github.com/OTOJulian/oto-hybrid-framework` (public) by hand. Phase ships `install-smoke.cjs` that runs `npm install -g github:OTOJulian/oto-hybrid-framework#<sha>` against live remote. | ✓ |
| Local `npm pack` + tarball install only | Verify install via `npm pack` + `npm install -g <tarball>` locally. Real GitHub clone deferred. | |
| Phase scripts `gh repo create` | Scripted via `gh repo create` automatically. | |

**User's choice:** Manual repo creation, phase verifies real clone (Recommended)
**Notes:** Repo creation is a one-time outside-tooling action (visibility, topics, description). Pitfall 5 (`prepublishOnly` vs install lifecycle) and Pitfall 16 (bin collisions) only manifest under real `npm install -g github:...`, not under `npm pack` tarball install.

---

## Coverage manifest pre/post strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Pre + post counts with delta | `coverage-manifest.pre.json` + `coverage-manifest.post.json` + auto-generated `delta.md`. Hard assertion: post outside allowlist == 0. | ✓ |
| Post-only with allowlist assertion | Only `post.json`. Cheaper but harder to prove the engine touched the right things. | |
| Aggregate per-file-class only | Single `coverage.json` keyed by file class. Loses per-file granularity. | |

**User's choice:** Pre + post counts with delta (Recommended)
**Notes:** SC#6 demands pre/post comparison literally. Per-file granularity is the diagnostic surface when Phase 4 bulk port surfaces issues.

---

## `files` allowlist: foundation-frameworks/ in tarball?

| Option | Description | Selected |
|--------|-------------|----------|
| Exclude `foundation-frameworks/` from tarball | `files` lists `bin/`, `scripts/rebrand/`, `rename-map.json`, `schema/`, `package.json`, `README.md`, licenses. Upstream copies stay in repo for sync/dev only. | ✓ |
| Include `foundation-frameworks/` in tarball | Bloats install ~20MB+. Only useful if installed `oto` runs the engine against bundled upstream. | |
| Include only minimal fixtures | Curated subset for offline tests. Compromise; adds curation cost. | |

**User's choice:** Exclude `foundation-frameworks/` from tarball (Recommended)
**Notes:** Phase 9 upstream sync clones fresh upstreams anyway. `oto` install footprint stays minimal.

---

## Round-trip & allowlist assertions: fixture strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Both: synthetic fixtures + real `foundation-frameworks/` snapshot | `tests/fixtures/rebrand/` for hand-crafted edge cases; full `foundation-frameworks/` for integration drift. | ✓ |
| Synthetic fixtures only | Faster, but Phase 4 finds integration issues late. | |
| Real `foundation-frameworks/` snapshot only | No synthetic fixtures; harder to diagnose specific rule failures. | |

**User's choice:** Both: synthetic fixtures + real `foundation-frameworks/` snapshot (Recommended)
**Notes:** Synthetic catches per-rule bugs in seconds; real catches integration drift Phase 4 would otherwise discover late. Both run via `node:test`; total budget < 10s.

---

## Claude's Discretion

Areas where the user accepted Claude's locked-upfront defaults or where planning details were left to downstream agents:

- **GitHub owner placeholder resolution** — locked to hardcoded `OTOJulian` per Phase 1 D-16 + `--owner` CLI override (no env var, no config file).
- **`postinstall` / `build-hooks.js` stub** — locked to "ship the stub at Phase 2 (no-op when `hooks/` empty)".
- Glob library fallback choice (only if `node:fs.glob` proves insufficient during execute).
- Synthetic fixture filenames and sub-structure (categories are locked in CONTEXT.md D-07; arrangement is at planner's discretion).
- Markdown report column ordering and table grouping.
- Engine exit-code conventions beyond "non-zero on unclassified match / round-trip diff / coverage assertion failure".
- README.md prose for Phase 2 (must include install command; rest is at planner's discretion).

## Deferred Ideas

Captured in CONTEXT.md `<deferred>` section. Highlights:

- Real installer logic — Phase 3
- Bulk port application — Phase 4
- Hook source files — Phase 5
- CI workflows — Phase 10
- `c8`, `ajv` — defer; Phase 2 is zero-dep
- GitHub repo topics/description/badges — Phase 10
- Windows support — out of scope

No additional ideas surfaced during discussion that fall outside Phase 2 scope.
