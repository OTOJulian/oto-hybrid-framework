---
phase: 10
slug: tests-ci-docs-v0-1-0-release
date: 2026-05-04
status: ready_for_planning
confidence: HIGH
---

# Phase 10: Tests, CI, Docs & v0.1.0 Release — Research

**Researched:** 2026-05-04
**Domain:** GitHub Actions CI hardening, snapshot test promotion, public-facing docs, semver tag release for a zero-dep CommonJS Node 22+ npm package distributed via GitHub archive (no npm registry).
**Confidence:** HIGH (every gap is grounded in directly inspected repo state plus a verified GSD upstream reference workflow).

> **Note (no CONTEXT.md yet):** Phase 10 has not yet been through `/oto-discuss-phase`. There are no locked D-XX decisions for this phase. The "User Constraints" section below is therefore derived from immutable upstream constraints in `CLAUDE.md`, `REQUIREMENTS.md`, and `ROADMAP.md`. The discuss/plan loop owns the final lock-set.

## User Constraints (from CLAUDE.md + REQUIREMENTS.md + ROADMAP.md)

### Locked from CLAUDE.md (project-level invariants)

- Node ≥22.0.0; CI matrix is **Node 22 + 24 on Ubuntu, plus one macOS Node 24 runner**. No Windows.
- Top-level is **CommonJS `.cjs`** (no top-level TypeScript, no top-level build step).
- Test framework: **`node:test`**, run via `node --test --test-concurrency=4 tests/*.test.cjs`. Coverage via **`c8 ^11`** (single dev dep — currently absent from `package.json`).
- **No `npm publish`.** v0.1.0 ships exclusively as `npm install -g https://github.com/OTOJulian/oto-hybrid-framework/archive/v0.1.0.tar.gz`.
- **Mode-644 trap (#2453)**: install-smoke MUST cover both `npm pack` + tarball install AND raw unpacked-dir install.
- **Pin GitHub Actions by SHA**, never by tag (CI-10).
- License attribution must stay verbatim: copyright lines `Lex Christopherson` (GSD) and `Jesse Vincent` (Superpowers) preserved.
- Personal-use cost ceiling — Phase 10 must add only the CI / docs surface required to ship v0.1.0; no marketplace polish, no community automation, no codecov/snyk add-ons.

### Phase requirements MUST address (from REQUIREMENTS.md)

- **CI-01..CI-10** (10 reqs): test matrix, install-smoke, release, snapshot, coverage manifest, license check, skill auto-trigger, SessionStart snapshot, planning-leak, SHA-pinned actions.
- **DOC-01, DOC-02, DOC-03, DOC-04, DOC-06** (5 reqs): README, THIRD-PARTY-LICENSES, upstream-sync doc, rebrand-engine doc, auto-generated `commands/INDEX.md`.
- **FND-05**: First tagged release `v0.1.0` produces a clean Claude Code install.

### Claude's Discretion (recommend in plan)

- Workflow file naming and job decomposition (test.yml / install-smoke.yml / release.yml are mandated; sub-job structure is open).
- Whether `coverage-manifest`, `license-attribution`, `planning-leak`, and `commands-INDEX` checks live as standalone `tests/phase-10-*.test.cjs` files (recommended — mirrors phases 2/4/5/6/7/8/9 convention) or as inline workflow `run` steps. **Recommendation: tests, so they run locally too.**
- Whether `c8` is added in this phase or deferred. **Recommendation: add now**, gated only on `npm install` of the single dev dep — Phase 2 D-18 explicitly defers `c8` to Phase 10.
- How `commands/INDEX.md` is generated (script under `scripts/gen-commands-index.cjs` recommended; a regression test asserts it stays in sync with `oto/commands/oto/*.md` frontmatter).
- Exact release-notes template (auto-generated via GitHub's `generate-release-notes` action input is the lowest-overhead choice).

### Deferred Ideas (OUT OF SCOPE for v0.1.0)

- npm registry publish (project constraint; ADR-11).
- Codecov/Snyk/Dependabot integration (personal-use ceiling).
- Windows CI runner (REQUIREMENTS Out of Scope).
- Translated READMEs (REQUIREMENTS Out of Scope).
- Per-runtime CI smoke for Codex/Gemini (REQUIREMENTS RT-V2-03 = v2 scope; CI-02 mandates Claude install only).
- Three-way merge UX in sync (Phase 9 v2; SYN-V2-01).
- SDK/`oto-sdk` programmatic CI surface (ADR-12, v2). Note: `bin/oto-sdk.js` already exists as a stub that ships in the tarball — verify it does not break install-smoke; do NOT extend it in Phase 10.
- Marketplace / plugin manifests (`.claude-plugin/`, `.codex-plugin/`) — Superpowers-style distribution rejected per ADR-11.
- Hotfix / branch-cleanup / auto-label / pr-gate workflows (GSD has them; oto's personal-use scope rejects them).

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CI-01 | `test.yml` — Node 22+24 Ubuntu matrix + one macOS Node 24 runner | "Codebase Inventory § CI" + GSD `test.yml` reference at `foundation-frameworks/get-shit-done-main/.github/workflows/test.yml` |
| CI-02 | `install-smoke.yml` — `npm pack` + tarball install AND unpacked-dir install (mode-644 trap) | "Codebase Inventory § install-smoke" + GSD reference workflow + existing `scripts/install-smoke.cjs` |
| CI-03 | `release.yml` — tag-triggered, creates GitHub Release; no npm publish | "Recommended Approach § release.yml" |
| CI-04 | Rebrand-engine snapshot tests against golden fixtures | "Codebase Inventory § snapshot baseline" — Phase 2 already produces `reports/rebrand-dryrun.json` deterministic output; promote to golden-file regression |
| CI-05 | Coverage-manifest CI check fails build on non-allowlisted `gsd`/`superpowers` occurrences in rebranded source | "Codebase Inventory § coverage-manifest" — `tests/phase-02-coverage-manifest.test.cjs` already enforces this; Phase 10 just wires it to CI |
| CI-06 | License-attribution CI check — `THIRD-PARTY-LICENSES.md` exists with both upstreams' MIT verbatim | "Recommended Approach § license-attribution test" + existing `tests/phase-01-licenses.test.cjs` baseline |
| CI-07 | Skill-auto-trigger regression test — `oto:using-oto` defers when `.oto/STATE.md` shows in-progress phase | "Codebase Inventory § skill auto-trigger" — `tests/06-using-oto-state-gating.test.cjs` already covers structure; Phase 10 adds **runtime auto-trigger** assertion |
| CI-08 | SessionStart-output snapshot fixture | "Codebase Inventory § session-start fixture" — `tests/05-session-start-fixture.test.cjs` already locks the baseline; Phase 10 just guarantees it runs in CI |
| CI-09 | State-leak detection test — no `.planning/` references in shipped code | "Codebase Inventory § planning-leak" — `tests/phase-04-planning-leak.test.cjs` already covers this; Phase 10 just guarantees it runs in CI |
| CI-10 | Pin GitHub Actions by SHA, not major tag | "Recommended Approach § action-SHA pinning" + GSD precedent (every action in `foundation-frameworks/.../workflows/test.yml` is pinned by 40-char SHA) |
| DOC-01 | `README.md` — what oto is, install URL, attribution, command index | "Codebase Inventory § README" — current README is a 16-line Phase 2 stub; full rewrite required |
| DOC-02 | `THIRD-PARTY-LICENSES.md` — verbatim GSD + Superpowers MIT | "Codebase Inventory § THIRD-PARTY-LICENSES" — already complete (69 lines, both copyrights present); only verification needed |
| DOC-03 | `docs/upstream-sync.md` | "Recommended Approach § upstream-sync doc" — `docs/` directory does not exist yet |
| DOC-04 | `docs/rebrand-engine.md` | "Recommended Approach § rebrand-engine doc" |
| DOC-06 | Auto-generated `commands/INDEX.md` listing all `/oto-*` commands | "Recommended Approach § INDEX generator" — frontmatter is consistent across all 76 commands (`name:`, `description:`) |
| FND-05 | v0.1.0 tagged release produces a clean Claude Code install | "Recommended Approach § release.yml" + existing `scripts/install-smoke.cjs` already proves the install URL pattern |

---

## Summary

Phase 10 has the **lowest implementation surface** of any phase in oto's roadmap because almost every test it requires already exists — the work is **promotion** (move local-only tests behind a CI matrix), **sealing** (write three GitHub Actions workflows), **generation** (one `INDEX.md` script + two new docs + one README rewrite), and **release** (tag `v0.1.0` and let `release.yml` do the rest).

**The codebase inventory shows ~75% of the work is already done in tests.** Specifically: `tests/phase-02-coverage-manifest.test.cjs` enforces CI-05; `tests/phase-04-planning-leak.test.cjs` enforces CI-09; `tests/05-session-start-fixture.test.cjs` enforces CI-08 (with an in-line note that "Phase 10 promotes this to a CI snapshot check"); `tests/06-using-oto-state-gating.test.cjs` enforces the structural half of CI-07 (the runtime auto-trigger assertion is the only true gap); `tests/phase-01-licenses.test.cjs` partially enforces CI-06 (verify it asserts byte-equality of the MIT bodies, not just file existence — see Open Question 1). The Phase 2 rebrand engine already emits deterministic `reports/rebrand-dryrun.json` output, which means CI-04 reduces to "snapshot the dry-run JSON for representative fixtures and assert no drift." Phase 9 ships `scripts/sync-upstream/{pull-gsd,pull-superpowers,rebrand,merge}.cjs` with a `bin/lib/sync-cli.cjs` orchestrator — DOC-03 just narrates them.

**The new surface is small and well-precedented.** GSD's `test.yml` and `install-smoke.yml` (read in full above) are direct templates: copy the matrix shape, drop the SDK build step (oto has no top-level build), drop the `npm ci` step (oto has zero top-level dependencies), and adjust paths. The mode-644 trap in `install-smoke.yml` requires no adaptation — the `chmod 644` simulation step transfers verbatim. The `release.yml` is dramatically simpler than GSD's because oto does not publish to npm: a tag push triggers a `gh release create --generate-notes` call gated by the test + install-smoke workflows running green.

**The residual risk is documentation drift, not code.** Three failure modes the planner must defend against: (a) `commands/INDEX.md` auto-generated but not committed → CI must regenerate-and-diff to fail-loud on drift (mirroring the Phase 8 `runtime-tool-matrix.md` regen-diff pattern at `scripts/render-runtime-matrix.cjs`); (b) `THIRD-PARTY-LICENSES.md` byte-for-byte verbatim assertion must compare against the upstream `LICENSE` files in `foundation-frameworks/` (which are immutable per Phase 9 D-01) — string-grep for copyright lines is not enough; (c) the `npm pack` allowlist in `package.json` (`"files"` field, lines 10-23) does **not** include `docs/` — adding docs/ to the published tarball is a Phase 10 decision the planner must lock (see Open Question 2).

**Primary recommendation:** Plan three waves. Wave 0: write four new `tests/phase-10-*.test.cjs` (snapshot, license-attribution, commands-INDEX-sync, action-SHA-pin-lint) and the `scripts/gen-commands-index.cjs` they regress against. Wave 1: ship the three GitHub Actions workflows and the two docs files + README rewrite. Wave 2: tag `v0.1.0` against the live remote and verify the release artifact installs cleanly on a clean tmpdir. The MR-01 spirit (Claude daily-stable before declaring done) extends here as a UAT step: install from the tag URL onto a fresh `--config-dir` and run `/oto-help` end to end.

---

## Codebase Inventory (what exists today vs. what is needed)

> **Each row maps to one of the six success criteria from the phase description.** "Action" is what the planner must put in PLAN.md.

### SC-1: CI Matrix

| Artifact | Exists? | Path | Action Required |
|----------|---------|------|------------------|
| `.github/` directory | **NO** (missing) | — | **Create** |
| `.github/workflows/` | NO | — | **Create** |
| `test.yml` | NO | — | **Create** — Node 22+24 Ubuntu + macOS Node 24, runs `npm test`, no `npm ci` (zero deps), no SDK build |
| `install-smoke.yml` | NO | — | **Create** — two jobs: tarball install (`npm pack` → install) and unpacked-dir install with `chmod 644 bin/install.js` simulation |
| `release.yml` | NO | — | **Create** — `on: push: tags: ['v*']`, depends on test + install-smoke green, runs `gh release create --generate-notes` |
| `scripts/install-smoke.cjs` (local) | **YES** | `scripts/install-smoke.cjs` (94 LOC verified) | **Reuse in CI** as the actual smoke driver — workflow just invokes `node scripts/install-smoke.cjs --ref ${{ github.sha }}` |
| GSD reference workflows | YES | `foundation-frameworks/get-shit-done-main/.github/workflows/{test,install-smoke,release}.yml` | **Use as templates** — see "Recommended Approach" |

### SC-2: Rebrand-engine snapshot tests + coverage-manifest CI

| Artifact | Exists? | Path | Action Required |
|----------|---------|------|------------------|
| Coverage-manifest enforcement test | **YES** | `tests/phase-02-coverage-manifest.test.cjs` (verified — runs `engine.run` against `foundation-frameworks/`, calls `manifest.assertZeroOutsideAllowlist`) | **No change** — already pulled by `npm test`; Phase 10 wires it to CI matrix |
| Snapshot/golden-file fixtures | **PARTIAL** | `tests/fixtures/rebrand/` has 9 synthetic fixtures (`identifier-edge.txt`, `path-edge.txt`, `package-fixture.json`, `multi-rule-line.md`, `command-vs-skill_ns.md`, etc.); `reports/rebrand-dryrun.json` and `reports/coverage-manifest.{pre,post}.json` are deterministic Phase 2 output | **Add** golden snapshot test: capture canonical `engine.classify(fixture)` output per fixture into `tests/fixtures/rebrand/__snapshots__/*.json`, regression-assert. **Add** `reports/rebrand-dryrun.json` golden lock (`tests/fixtures/phase-10/rebrand-dryrun.golden.json`) recomputed against `foundation-frameworks/` and asserted byte-equal |
| Engine API (`engine.cjs`) | YES | `scripts/rebrand/lib/engine.cjs` (verified — exports `run({mode, target, out, force, owner, mapPath})`) | Use existing API; no engine changes |

### SC-3: License-attribution CI check

| Artifact | Exists? | Path | Action Required |
|----------|---------|------|------------------|
| `LICENSE` (oto's MIT) | **YES** | `LICENSE` (verified — `Copyright (c) 2026 Julian Isaac`) | No change |
| `THIRD-PARTY-LICENSES.md` | **YES** | `THIRD-PARTY-LICENSES.md` (verified — 69 lines, 2716 chars, both copyright lines `Lex Christopherson` and `Jesse Vincent` present, both MIT bodies verbatim) | No content change |
| Upstream LICENSE files (immutable reference) | YES | `foundation-frameworks/get-shit-done-main/LICENSE`, `foundation-frameworks/superpowers-main/LICENSE` | Use as comparison source |
| Existing license test | **PARTIAL** | `tests/phase-01-licenses.test.cjs` (1813 bytes — exists but Phase 1-scoped; verify it asserts byte-equality of MIT body, not just copyright-line presence) | **Promote or add** `tests/phase-10-license-attribution.test.cjs` that diffs the MIT bodies in `THIRD-PARTY-LICENSES.md` against the upstream `LICENSE` files in `foundation-frameworks/` (excluding the Markdown wrapping `\`\`\`` fences) |

### SC-4: Skill auto-trigger + SessionStart snapshot + state-leak

| Artifact | Exists? | Path | Action Required |
|----------|---------|------|------------------|
| SessionStart snapshot fixture | **YES** | `oto/hooks/__fixtures__/session-start-claude.json` + `tests/05-session-start-fixture.test.cjs` (file says `// Phase 10 promotes this to a CI snapshot check (CI-08)`) | **No code change** — Phase 10 just confirms `npm test` runs it on every CI invocation |
| Skill auto-trigger / state-gating structural test | **YES** | `tests/06-using-oto-state-gating.test.cjs` (4 sub-tests: gating-directive marker, banned-literal scan, locked identity sentence, fixture well-formed) | **Gap (CI-07 runtime assertion):** structural test only proves the *directive exists* in `SKILL.md`. CI-07 also asks for *behavioral* evidence — that an actual SessionStart with `.oto/STATE.md` → `status: execute_phase` does NOT auto-load `using-oto`. Add `tests/phase-10-skill-auto-trigger.test.cjs` that spawns `oto/hooks/oto-session-start` with a STATE-active fixture cwd and asserts `additionalContext` does NOT include the using-oto skill body. |
| State-leak (planning-leak) test | **YES** | `tests/phase-04-planning-leak.test.cjs` (verified — scans `oto/{commands,agents,workflows,contexts,templates,references,skills,hooks}` + `bin/` + `hooks/` for `.planning` literal with word-boundary regex) | **No change** — already enforced by `npm test`; Phase 10 wires to CI |
| Action SHA pinning lint | **NO** | — | **Add** `tests/phase-10-action-sha-pin.test.cjs` — walks `.github/workflows/*.yml`, parses `uses: <action>@<ref>`, asserts `<ref>` matches `^[0-9a-f]{40}$` (40-char hex SHA), not a tag like `v6.0.2`. Comment-style `# v6.0.2` after the SHA is allowed and recommended |

### SC-5: Public docs

| Artifact | Exists? | Path | Action Required |
|----------|---------|------|------------------|
| `README.md` | **YES (Phase 2 stub, 16 lines)** | `README.md` (verified — only mentions Phase 2/3 status, install URL is `vX.Y.Z` placeholder, no command index) | **Full rewrite** for v0.1.0 — what oto is, real `v0.1.0` install URL, attribution to GSD + Superpowers, command index excerpt or link to `commands/INDEX.md`, runtime-support matrix (Claude=primary, Codex/Gemini=best-effort), CI badge, license note |
| `docs/` directory | **NO** | — | **Create** |
| `docs/upstream-sync.md` | **NO** | — | **Create** — narrates the Phase 9 pipeline (`oto sync --upstream {gsd,superpowers,all} --to <tag> [--dry-run|--apply]`, `--accept`/`--accept-deletion`/`--keep-deleted`/`--status` subcommands, `.oto-sync-conflicts/` workflow). Source-of-truth = `bin/lib/sync-cli.cjs` + `09-RESEARCH.md` + `09-CONTEXT.md` D-01..D-22 |
| `docs/rebrand-engine.md` | **NO** | — | **Create** — narrates the rule-typed engine (7 rule classes: identifier/path/command/skill_ns/package/url/env_var), `--dry-run`/`--apply`/`--verify-roundtrip` modes, do-not-rename allowlist, coverage-manifest contract, how to add a new rule. Source-of-truth = `scripts/rebrand/lib/engine.cjs` + `02-RESEARCH.md` |
| `commands/INDEX.md` (auto-gen) | **NO** | — | **Create** generator + output. Frontmatter is uniform across all 76 commands (verified — every file has `name: oto:<slug>` and `description: <one-line>`). Generator: `scripts/gen-commands-index.cjs` walks `oto/commands/oto/*.md`, parses YAML frontmatter, emits a sorted Markdown table to `oto/commands/INDEX.md`. Regression test asserts re-running the generator produces zero-diff. |
| Existing INDEX precedent | YES | `decisions/runtime-tool-matrix.md` (auto-generated by `scripts/render-runtime-matrix.cjs` per Phase 8 — same regen-diff pattern) | **Reuse pattern** |

### SC-6: v0.1.0 tagged release

| Artifact | Exists? | Path | Action Required |
|----------|---------|------|------------------|
| `package.json` version | **`0.1.0-alpha.1`** | `package.json:3` | **Bump to `0.1.0`** as part of the tagging plan (last commit on the release branch / final commit on main before `git tag v0.1.0`) |
| Live install URL pattern verification | **YES** | `scripts/install-smoke.cjs` (verified — already installs from `https://github.com/OTOJulian/oto-hybrid-framework/archive/<ref>.tar.gz`, asserts `oto v<version>` on stdout, runs `oto install --claude --config-dir <tmp>` and asserts `<tmp>/oto/.install.json` exists) | **No code change** — the smoke script already proves the v0.1.0 install path; release workflow invokes it post-tag |
| Tag-triggered release workflow | NO | — | **Create** as part of `release.yml` (above) |
| `bin/oto-sdk.js` (stub from prior phases) | YES | `bin/oto-sdk.js` (in `package.json` `bin` map) | **Verify** the stub does not break install-smoke (mode-644 risk: confirm executable bit is preserved through `npm pack` + unpacked install). If it fails the unpacked install, mark it for chmod-644 simulation parity. |

---

## Recommended Approach for Each Gap

### test.yml (CI-01)

Mirror GSD's `test.yml` structure with **four divergences**:

1. **Drop `npm ci`** — oto has zero top-level dependencies (verified: `package.json` has no `dependencies` or `devDependencies` blocks). If `c8` is added (recommended), then `npm ci` is required and `package-lock.json` must be committed.
2. **Drop `npm run build:sdk`** — oto has no top-level build step; the only "build" is `postinstall: node scripts/build-hooks.js`, which a normal `npm install` already runs.
3. **Drop the `lint-tests` job** — GSD has a custom `scripts/lint-no-source-grep.cjs`; oto doesn't.
4. **Drop the rebase-check step** — GSD's `git fetch origin main && git merge` for stale-base detection adds complexity for a single-developer project. Personal-use ceiling: drop it.

```yaml
# .github/workflows/test.yml
name: Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  workflow_dispatch:

concurrency:
  group: ${{ github.workflow }}-${{ github.head_ref || github.run_id }}
  cancel-in-progress: true

jobs:
  test:
    runs-on: ${{ matrix.os }}
    timeout-minutes: 10
    strategy:
      fail-fast: true
      matrix:
        os: [ubuntu-latest]
        node-version: [22, 24]
        include:
          - os: macos-latest
            node-version: 24
    steps:
      - uses: actions/checkout@<40-char-SHA>  # v6.0.2
      - uses: actions/setup-node@<40-char-SHA>  # v6.3.0
        with:
          node-version: ${{ matrix.node-version }}
      - run: npm install --no-audit --no-fund    # only needed if c8 is added; otherwise `npm test` directly
      - run: npm test
```

### install-smoke.yml (CI-02)

Mirror GSD's `install-smoke.yml` two-job structure (tarball + unpacked-dir). The mode-644 trap simulation step requires the SAME shape as GSD: `chmod 644 bin/install.js` (or `bin/oto-sdk.js`) before `npm install -g $GITHUB_WORKSPACE`. Then assert `oto` exits 0 (not just resolves on PATH — the bin must execute).

Two jobs:

- **`smoke-tarball`** (matrix: ubuntu Node 22, ubuntu Node 24, macOS Node 24): `npm pack` → `npm install -g <tarball>` → `oto` exits 0.
- **`smoke-unpacked`** (ubuntu Node 22 only — single OS suffices for the failure class): `chmod 644 bin/install.js bin/oto-sdk.js` → `npm install -g $GITHUB_WORKSPACE` → `oto` exits 0.

Workflow may also invoke `node scripts/install-smoke.cjs --ref ${{ github.sha }}` as a third "live remote" sanity job (PR + main) — this exercises the actual `https://github.com/.../archive/<sha>.tar.gz` URL pattern, catching any `package.json` `files` allowlist regression that drops a critical path. **Recommendation: include it as a manually-dispatched job** (`workflow_dispatch` only, since it depends on the SHA being pushed — for tag releases this is exactly what `release.yml` runs).

### release.yml (CI-03, FND-05)

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    tags: ['v*.*.*']

permissions:
  contents: write    # required for gh release create

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@<SHA>
      - uses: actions/setup-node@<SHA>
        with: { node-version: 24 }
      - name: Assert package.json version matches tag
        run: |
          TAG="${GITHUB_REF#refs/tags/v}"
          PKG=$(node -p "require('./package.json').version")
          test "$TAG" = "$PKG" || { echo "::error::tag $TAG vs package.json $PKG"; exit 1; }

  test:
    needs: validate
    uses: ./.github/workflows/test.yml

  smoke:
    needs: validate
    uses: ./.github/workflows/install-smoke.yml

  release:
    needs: [test, smoke]
    runs-on: ubuntu-latest
    permissions: { contents: write }
    steps:
      - uses: actions/checkout@<SHA>
      - name: Create GitHub Release with auto-generated notes
        env:
          GH_TOKEN: ${{ github.token }}
        run: |
          gh release create "$GITHUB_REF_NAME" \
            --generate-notes \
            --title "$GITHUB_REF_NAME" \
            --verify-tag
```

`gh release create --generate-notes` uses GitHub's built-in autopopulated notes (PRs + commits since previous tag) — zero config, no template files needed. **No npm publish step** anywhere.

### License-attribution test (CI-06)

```js
// tests/phase-10-license-attribution.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const TPL = fs.readFileSync(path.join(ROOT, 'THIRD-PARTY-LICENSES.md'), 'utf8');
const GSD_LIC = fs.readFileSync(path.join(ROOT, 'foundation-frameworks/get-shit-done-main/LICENSE'), 'utf8');
const SUP_LIC = fs.readFileSync(path.join(ROOT, 'foundation-frameworks/superpowers-main/LICENSE'), 'utf8');

test('THIRD-PARTY-LICENSES contains GSD MIT verbatim with Lex Christopherson copyright', () => {
  assert.ok(TPL.includes(GSD_LIC.trim()), 'GSD LICENSE body not embedded verbatim');
  assert.ok(TPL.includes('Lex Christopherson'));
});
test('THIRD-PARTY-LICENSES contains Superpowers MIT verbatim with Jesse Vincent copyright', () => {
  assert.ok(TPL.includes(SUP_LIC.trim()), 'Superpowers LICENSE body not embedded verbatim');
  assert.ok(TPL.includes('Jesse Vincent'));
});
```

### Action SHA-pin lint (CI-10)

```js
// tests/phase-10-action-sha-pin.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const WORKFLOWS_DIR = path.resolve(__dirname, '..', '.github', 'workflows');
const SHA_RE = /uses:\s+([^@\s]+)@([^\s#]+)/g;

test('every "uses:" in workflows is pinned by 40-char SHA', () => {
  if (!fs.existsSync(WORKFLOWS_DIR)) return;  // workflows phase precedes test
  for (const file of fs.readdirSync(WORKFLOWS_DIR)) {
    if (!/\.ya?ml$/.test(file)) continue;
    const body = fs.readFileSync(path.join(WORKFLOWS_DIR, file), 'utf8');
    for (const [, action, ref] of body.matchAll(SHA_RE)) {
      // Allow local reusable-workflow refs (./.github/workflows/*.yml)
      if (action.startsWith('./')) continue;
      assert.match(ref, /^[0-9a-f]{40}$/, `${file}: ${action}@${ref} is not SHA-pinned`);
    }
  }
});
```

### Snapshot tests (CI-04)

The Phase 2 engine emits **deterministic** output (`reports/rebrand-dryrun.json` is sorted, hashed, allowlist-filtered). Two snapshot strategies:

- **Per-fixture classification snapshot** (preferred): for each `tests/fixtures/rebrand/*` file, run the engine in dry-run and capture `{file, rule, before, after}` tuples to `tests/fixtures/rebrand/__snapshots__/<fixture>.json`. Test re-runs and `assert.deepEqual` against the snapshot.
- **Real-tree dry-run snapshot** (defensive): pin a `reports/rebrand-dryrun.golden.json` from the current `foundation-frameworks/` (immutable per Phase 9 D-01 = `get-shit-done-main` v1.38.5 + `superpowers-main` v5.0.7). Any drift in engine output against the pinned upstream → loud failure.

**Note on `node:test` snapshot API:** Node 22.3+ exposes `t.assert.snapshot()` with `--test-update-snapshots` flag. **VERIFY** before using — if the API is still experimental, hand-rolled `assert.deepEqual` against committed JSON is safer (`[ASSUMED]` — `t.assert.snapshot()` is in Node 22 docs but stability-tagged "experimental"; recommend hand-rolled for v0.1.0 to avoid Node-version-fragility).

### Skill auto-trigger runtime test (CI-07 gap)

`tests/06-using-oto-state-gating.test.cjs` only proves the gating *directive* is present in `SKILL.md`. CI-07 wants behavioral proof — that an actual SessionStart with an active STATE does not load the using-oto body. Use the existing `oto/hooks/oto-session-start` and `tests/skills/__fixtures__/STATE-active.md` (verified: `STATE_FIXTURE = path.join(__dirname, 'skills/__fixtures__/STATE-active.md')`):

```js
// tests/phase-10-skill-auto-trigger.test.cjs (sketch)
test('CI-07: SessionStart with active STATE.md does NOT include using-oto skill body', () => {
  const cwd = fs.mkdtempSync(...);
  fs.mkdirSync(path.join(cwd, '.oto'), { recursive: true });
  fs.copyFileSync(STATE_ACTIVE_FIXTURE, path.join(cwd, '.oto', 'STATE.md'));
  const r = spawnSync('bash', [HOOK], { cwd, env: { PATH, HOME, CLAUDE_PLUGIN_ROOT: '/tmp/fake' }, encoding: 'utf8' });
  assert.equal(r.status, 0);
  const ctx = JSON.parse(r.stdout).hookSpecificOutput.additionalContext;
  // Body marker that would only appear if using-oto loaded ambiently:
  assert.equal(ctx.indexOf('<!-- oto:state-gating-directive -->'), -1, 'using-oto leaked into SessionStart despite active STATE');
});
```

### `commands/INDEX.md` generator (DOC-06)

```js
// scripts/gen-commands-index.cjs
const fs = require('node:fs');
const path = require('node:path');

const CMD_DIR = path.resolve(__dirname, '..', 'oto', 'commands', 'oto');
const OUT = path.resolve(__dirname, '..', 'oto', 'commands', 'INDEX.md');

function parseFrontmatter(body) {
  const m = body.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  const out = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^(\w[\w-]*):\s*(.*)$/);
    if (kv) out[kv[1]] = kv[2].replace(/^["']|["']$/g, '');
  }
  return out;
}

const entries = fs.readdirSync(CMD_DIR)
  .filter((f) => f.endsWith('.md'))
  .map((f) => {
    const fm = parseFrontmatter(fs.readFileSync(path.join(CMD_DIR, f), 'utf8'));
    return { name: fm?.name || `oto:${f.replace(/\.md$/, '')}`, description: fm?.description || '' };
  })
  .sort((a, b) => a.name.localeCompare(b.name));

const md = ['# /oto-* Command Index', '',
  `_Auto-generated from \`oto/commands/oto/*.md\` frontmatter. Re-run \`node scripts/gen-commands-index.cjs\` after adding/renaming commands._`,
  '', '| Command | Description |', '|---------|-------------|',
  ...entries.map((e) => `| \`/${e.name.replace(':', '-')}\` | ${e.description} |`),
  ''].join('\n');

fs.writeFileSync(OUT, md);
console.log(`wrote ${entries.length} commands → ${path.relative(process.cwd(), OUT)}`);
```

Regression test (`tests/phase-10-commands-index-sync.test.cjs`): re-run the generator, capture stdout, and `assert.equal(fs.readFileSync(OUT, 'utf8'), <regenerated content>)` to fail-loud on drift.

### `docs/upstream-sync.md` and `docs/rebrand-engine.md`

Both docs are descriptive — no new code. Source-of-truth pointers:

- **`docs/upstream-sync.md`**: cite `bin/lib/sync-cli.cjs`, `scripts/sync-upstream/{pull-gsd,pull-superpowers,rebrand,merge}.cjs`, `09-CONTEXT.md` D-01..D-22 (especially D-08 `git merge-file` delegation, D-12 conflict header schema, D-15 `--accept` UX). Sections: Overview, Quick start, How sync works (5-step pipeline), Conflict resolution, Adding a new upstream (v2 deferred).
- **`docs/rebrand-engine.md`**: cite `scripts/rebrand/lib/engine.cjs`, `scripts/rebrand/lib/rules/*.cjs` (7 rule modules), `rename-map.json`, `02-RESEARCH.md`. Sections: Why rule-typed (vs naive `s/gsd/oto/g`), 7 rule classes table, do-not-rename allowlist, three modes (`--dry-run`/`--apply`/`--verify-roundtrip`), coverage-manifest contract, adding a new rule.

### `README.md` rewrite

Sections: title + tagline; one-paragraph "what is oto"; install (`npm install -g https://github.com/OTOJulian/oto-hybrid-framework/archive/v0.1.0.tar.gz` then `oto install --claude`); supported runtimes table (Claude=primary, Codex/Gemini=best-effort); link to `oto/commands/INDEX.md`; attribution + link to THIRD-PARTY-LICENSES.md; CI badge (`![Tests](https://github.com/OTOJulian/oto-hybrid-framework/actions/workflows/test.yml/badge.svg)`); license note.

### Action-SHA-pinning workflow

GSD pins exclusively by SHA (verified — every `uses:` in `foundation-frameworks/get-shit-done-main/.github/workflows/test.yml` matches `[0-9a-f]{40}` followed by ` # vX.Y.Z` comment). For oto, pin three actions:

| Action | Latest stable | SHA reference |
|--------|---------------|---------------|
| `actions/checkout` | v6.0.2 | `de0fac2e4500dabe0009e67214ff5f5447ce83dd` (from GSD reference, verified) |
| `actions/setup-node` | v6.3.0 | `53b83947a5a98c8d113130e565377fae1a50d02f` (from GSD reference, verified) |
| (no third-party actions needed) | | |

**Recommendation:** copy the SHAs verbatim from `foundation-frameworks/get-shit-done-main/.github/workflows/test.yml` since those are the exact versions oto's CI is mirroring. The `tests/phase-10-action-sha-pin.test.cjs` lint catches future drift.

---

## Validation Architecture (Nyquist sampling rate per success criterion)

> Per `.planning/config.json` `workflow.nyquist_validation: true`. For each SC, this section answers: what is the *observable evidence* that proves the criterion is met, and at what minimum frequency must that evidence be re-sampled to detect regression?

### Test Framework

| Property | Value |
|----------|-------|
| Framework | `node:test` (built-in, Node 22+) |
| Config file | None — script field `"test": "node --test --test-concurrency=4 tests/*.test.cjs"` |
| Quick run command | `npm test -- tests/phase-10-*.test.cjs` |
| Full suite command | `npm test` (runs all 60+ test files) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CI-01 | `test.yml` matrix runs on push | workflow-presence + lint | `node scripts/lint-workflow-shape.cjs` (or hand-rolled in `tests/phase-10-workflow-shape.test.cjs`) | Wave 0 |
| CI-02 | install-smoke covers tarball + unpacked | workflow-presence + smoke replay | `node scripts/install-smoke.cjs` (existing) + `tests/phase-10-workflow-shape.test.cjs` | Smoke script ✅ / workflow ❌ Wave 1 |
| CI-03 | release.yml fires on tag push | workflow-presence | `tests/phase-10-workflow-shape.test.cjs` | ❌ Wave 1 |
| CI-04 | Rebrand engine output is byte-stable for golden fixtures | snapshot regression | `npm test -- tests/phase-10-rebrand-snapshot.test.cjs` | ❌ Wave 0 |
| CI-05 | Coverage manifest fails on stray gsd/superpowers | manifest-assert | `npm test -- tests/phase-02-coverage-manifest.test.cjs` | ✅ existing |
| CI-06 | THIRD-PARTY-LICENSES contains both MIT verbatim + copyright lines | byte-equality assert | `npm test -- tests/phase-10-license-attribution.test.cjs` | ❌ Wave 0 |
| CI-07 | using-oto deferred when STATE active | runtime hook spawn | `npm test -- tests/phase-10-skill-auto-trigger.test.cjs` | ❌ Wave 0 (structural test ✅) |
| CI-08 | SessionStart output matches locked baseline | snapshot diff | `npm test -- tests/05-session-start-fixture.test.cjs` | ✅ existing |
| CI-09 | No `.planning/` references in shipped payload | grep test | `npm test -- tests/phase-04-planning-leak.test.cjs` | ✅ existing |
| CI-10 | Workflow uses-clauses pinned by SHA | regex lint | `npm test -- tests/phase-10-action-sha-pin.test.cjs` | ❌ Wave 0 |
| DOC-01 | README sections present + install URL valid for v0.1.0 | content-presence assert | `npm test -- tests/phase-10-readme-shape.test.cjs` (recommend) | ❌ Wave 0 (optional but cheap) |
| DOC-02 | THIRD-PARTY-LICENSES verbatim | (same as CI-06) | (same) | ✅ existing content |
| DOC-03 | `docs/upstream-sync.md` exists + cites pipeline scripts | file-exists + grep | `tests/phase-10-docs-presence.test.cjs` | ❌ Wave 0 |
| DOC-04 | `docs/rebrand-engine.md` exists + cites engine + rules | file-exists + grep | (same test) | ❌ Wave 0 |
| DOC-06 | `commands/INDEX.md` matches generator output | regen-diff | `npm test -- tests/phase-10-commands-index-sync.test.cjs` | ❌ Wave 0 |
| FND-05 | `npm install -g <archive/v0.1.0.tar.gz>` produces working install | live install-smoke | `node scripts/install-smoke.cjs --ref v0.1.0` (manual UAT post-tag) | ✅ smoke script |

### Sampling Rate

- **Per task commit:** `npm test -- tests/phase-10-*.test.cjs` — quick subset, ~5s.
- **Per wave merge:** `npm test` — full suite, ~30-60s (already <60s on local; CI matrix parallelism brings wall-clock down).
- **Per push to main + per PR:** `test.yml` (matrix) + `install-smoke.yml` (tarball job for PR; full matrix on push to main).
- **Per tag push:** `release.yml` runs `test.yml` + `install-smoke.yml` as gating jobs, then creates the GitHub Release.
- **Phase gate (UAT):** Post-`v0.1.0` tag, manually run `npm install -g https://github.com/OTOJulian/oto-hybrid-framework/archive/v0.1.0.tar.gz --prefix /tmp/oto-uat` on a clean tmpdir, then `oto install --claude --config-dir /tmp/oto-uat-claude`, then `Read /tmp/oto-uat-claude/oto/.install.json` to assert the install marker exists. This is the FND-05 acceptance proof.

### Wave 0 Gaps

- [ ] `tests/phase-10-rebrand-snapshot.test.cjs` — covers CI-04 (with `tests/fixtures/rebrand/__snapshots__/*.json` fixtures captured)
- [ ] `tests/phase-10-license-attribution.test.cjs` — covers CI-06
- [ ] `tests/phase-10-skill-auto-trigger.test.cjs` — covers CI-07 (runtime gap)
- [ ] `tests/phase-10-action-sha-pin.test.cjs` — covers CI-10
- [ ] `tests/phase-10-workflow-shape.test.cjs` — covers CI-01/02/03 presence (asserts `.github/workflows/{test,install-smoke,release}.yml` exist with required jobs/triggers)
- [ ] `tests/phase-10-commands-index-sync.test.cjs` — covers DOC-06 regen-diff
- [ ] `tests/phase-10-docs-presence.test.cjs` — covers DOC-03/04 file presence + key citations
- [ ] `tests/phase-10-readme-shape.test.cjs` — covers DOC-01 (optional but recommended; cheap content-presence checks)
- [ ] `scripts/gen-commands-index.cjs` — generator referenced by DOC-06 test
- [ ] (Optional) `c8` install: `npm install --save-dev c8@^11` + `npm pkg set scripts.test:coverage="c8 npm test"`

---

## Risks and Unknowns

### R-1 — `bin/oto-sdk.js` mode-644 risk
The `package.json` already declares `"oto-sdk": "bin/oto-sdk.js"` in the `bin` map. Verified that `bin/oto-sdk.js` exists. The unpacked-dir install must succeed even after `chmod 644 bin/oto-sdk.js bin/install.js` — npm should chmod bin entries from a tarball but explicitly does NOT chmod from an unpacked directory (the GSD #2453 trap). If `bin/oto-sdk.js` lives outside the chmod-on-pack path, the unpacked-dir job will fail.
**Mitigation:** Wave 0 plan should include a quick local check: `chmod 644 bin/install.js bin/oto-sdk.js && npm install -g . --prefix /tmp/foo && /tmp/foo/bin/oto && /tmp/foo/bin/oto-sdk`. If oto-sdk fails, decide whether to (a) drop it from the v0.1.0 bin map (it's a Phase 2 stub) or (b) document the failure as expected and assert only on `oto`. Recommend (a) — `bin/oto-sdk.js` per ADR-12 is v2 scope.

### R-2 — `c8` adds first runtime dependency
oto currently has zero `dependencies` and zero `devDependencies`. Adding `c8` makes `npm install` non-empty and forces a `package-lock.json` commit. Personal-use cost is ~1 dep + ~700KB on disk + a new attack surface (low — `c8` is maintained by the Node TC).
**Decision needed in CONTEXT.md:** Is coverage required for v0.1.0? The phase description doesn't mention it. **Recommendation:** defer `c8` to v0.2 — cover what we test by hand (the tests themselves are the coverage proof). Phase 2 D-18's "c8 deferred to Phase 10" was permissive, not mandatory.

### R-3 — `package.json` `"files"` allowlist excludes `docs/`
Verified: `"files"` includes `bin/, oto/, hooks/, scripts/rebrand/, scripts/sync-upstream/, scripts/build-hooks.js, rename-map.json, schema/, package.json, README.md, LICENSE, THIRD-PARTY-LICENSES.md`. **`docs/` is not listed.** Two options:
1. Don't ship `docs/` in the published tarball — they live in the GitHub repo only (web users see them via GitHub's rendered Markdown). This is consistent with oto's "shipped payload is what runs, not what reads" stance.
2. Add `docs/` to the allowlist so `npm install` drops them into `~/.npm/.../oto/docs/`.
**Recommendation:** option 1 — don't ship docs in the tarball. Users read them on GitHub. Saves ~tens of KB and keeps the install footprint minimal.

### R-4 — Snapshot test approach (`t.assert.snapshot` vs hand-rolled)
Node 22's `node:test` runner exposes `t.assert.snapshot()` with `--test-update-snapshots`, but the API is marked experimental in some Node 22.x releases. **`[ASSUMED]`** — verify against `node --version` on CI runners before relying on it.
**Recommendation:** Hand-roll for v0.1.0. Pattern: write golden JSON to `tests/fixtures/phase-10/<name>.golden.json`, test reads + `assert.deepEqual`. Re-generation is a manual `node tests/regen-snapshots.cjs` step (similar to how Phase 5's `oto/hooks/__fixtures__/session-start-claude.json` was captured).

### R-5 — `node:fs.glob` Node-version availability
`scripts/rebrand/lib/walker.cjs` likely uses Node 22+ APIs. CI runs Node 22 + 24, both support `node:fs.glob` (Node 22+). No risk; called out for completeness.

### R-6 — Phase 10 CONTEXT.md not yet authored
There is no `10-CONTEXT.md`. The discussion-phase loop must generate one before planning. The 5 most critical D-XX decisions for the planner to lock are: (a) include `c8` or not (R-2); (b) include `docs/` in tarball or not (R-3); (c) snapshot strategy (R-4); (d) whether to drop `bin/oto-sdk.js` from v0.1.0 (R-1); (e) whether `tests/phase-10-readme-shape.test.cjs` is in scope or relegated to "review by eye."

### R-7 — Tag-creation procedure ambiguity
The phase description says "git tag v0.1.0 triggers release.yml." But `package.json` is currently `0.1.0-alpha.1`. The bump-to-`0.1.0` commit, the `git tag v0.1.0`, and the `git push origin v0.1.0` is a 3-step ritual that can be botched (e.g., tag pushed before bump committed → release.yml runs against alpha state, version-validate job fails). **Recommendation:** plan a `scripts/release-v0.1.0.cjs` helper or a documented checklist in `docs/release-process.md` (or inline in the `release.yml` README section). At minimum, the `validate` job in `release.yml` MUST assert tag matches `package.json.version` (sketch above).

### R-8 — Live network dependency in install-smoke
`scripts/install-smoke.cjs` does `npm install -g https://github.com/OTOJulian/oto-hybrid-framework/archive/<ref>.tar.gz`, which requires the ref to be **already pushed to GitHub**. For PR CI this is fine (GitHub has the SHA). For local execution before push, the script will 404. **Mitigation:** the `install-smoke.yml` workflow already runs after push (GitHub has the SHA by then). For local pre-push validation, use the workflow's tarball-job pattern (`npm pack` + `npm install -g <local tarball>`) — already supported by the GSD reference.

### R-9 — `gh release create` permissions
The `release.yml` job needs `permissions: contents: write` to create a release. Default `GITHUB_TOKEN` has this scope when explicitly granted in the workflow. **Verified pattern in GSD reference.** No personal-access-token needed.

### R-10 — package.json bin executable bit at pack time
Verified: `scripts/install-smoke.cjs` already asserts `(mode & 0o111) !== 0` on `bin/oto` after install — this catches the mode-644 trap from the **install** side. The `install-smoke.yml` unpacked-dir job adds the **build** side (chmod 644 → install → still must work). Both halves of the trap are covered.

---

## Required `read_first` Files for Downstream Planner & Executor

> Files the **planner** must read to author plans correctly, and the **executor** must read to implement tasks faithfully. Absolute paths.

### Mandatory (planner must read all)

- `/Users/Julian/Desktop/oto-hybrid-framework/.planning/REQUIREMENTS.md` — CI-01..CI-10, DOC-01..06, FND-05 verbatim
- `/Users/Julian/Desktop/oto-hybrid-framework/.planning/ROADMAP.md` — Phase 10 section (success criteria 1-6)
- `/Users/Julian/Desktop/oto-hybrid-framework/CLAUDE.md` — Tech Stack section (CI matrix shape, `c8`, mode-644, SHA pinning constraints)
- `/Users/Julian/Desktop/oto-hybrid-framework/package.json` — current version (`0.1.0-alpha.1`), `files` allowlist, scripts, bin map
- `/Users/Julian/Desktop/oto-hybrid-framework/README.md` — current Phase 2 stub (16 lines) — full rewrite target
- `/Users/Julian/Desktop/oto-hybrid-framework/THIRD-PARTY-LICENSES.md` — content already complete; verify byte-equality
- `/Users/Julian/Desktop/oto-hybrid-framework/scripts/install-smoke.cjs` — local smoke driver, reused by CI
- `/Users/Julian/Desktop/oto-hybrid-framework/scripts/build-hooks.js` — postinstall hook script

### High-priority reference (planner reads, executor reads on relevant tasks)

- `/Users/Julian/Desktop/oto-hybrid-framework/foundation-frameworks/get-shit-done-main/.github/workflows/test.yml` — template for oto's `test.yml`
- `/Users/Julian/Desktop/oto-hybrid-framework/foundation-frameworks/get-shit-done-main/.github/workflows/install-smoke.yml` — template for oto's `install-smoke.yml` (mode-644 trap simulation step is verbatim)
- `/Users/Julian/Desktop/oto-hybrid-framework/foundation-frameworks/get-shit-done-main/.github/workflows/release.yml` — template for oto's `release.yml` (drop npm publish parts; keep gh release create)
- `/Users/Julian/Desktop/oto-hybrid-framework/tests/phase-02-coverage-manifest.test.cjs` — CI-05 enforcement (already complete)
- `/Users/Julian/Desktop/oto-hybrid-framework/tests/phase-04-planning-leak.test.cjs` — CI-09 enforcement (already complete)
- `/Users/Julian/Desktop/oto-hybrid-framework/tests/05-session-start-fixture.test.cjs` — CI-08 enforcement (already complete; note explicit "Phase 10 promotes this to a CI snapshot check" comment)
- `/Users/Julian/Desktop/oto-hybrid-framework/tests/06-using-oto-state-gating.test.cjs` — CI-07 structural baseline (Phase 10 adds runtime test)
- `/Users/Julian/Desktop/oto-hybrid-framework/tests/phase-01-licenses.test.cjs` — CI-06 baseline (verify scope)
- `/Users/Julian/Desktop/oto-hybrid-framework/tests/skills/__fixtures__/STATE-active.md` — fixture for skill-auto-trigger test
- `/Users/Julian/Desktop/oto-hybrid-framework/oto/hooks/__fixtures__/session-start-claude.json` — locked SessionStart baseline
- `/Users/Julian/Desktop/oto-hybrid-framework/oto/hooks/oto-session-start` — hook executable spawned by snapshot + auto-trigger tests
- `/Users/Julian/Desktop/oto-hybrid-framework/scripts/rebrand/lib/engine.cjs` — engine API for snapshot tests (`engine.run({mode, target, mapPath, owner, ...})`)
- `/Users/Julian/Desktop/oto-hybrid-framework/scripts/rebrand/lib/manifest.cjs` — coverage-manifest API
- `/Users/Julian/Desktop/oto-hybrid-framework/tests/fixtures/rebrand/` — 9 synthetic rebrand fixtures (sources for snapshot test)
- `/Users/Julian/Desktop/oto-hybrid-framework/oto/commands/oto/help.md` — sample command frontmatter (template for INDEX generator)
- `/Users/Julian/Desktop/oto-hybrid-framework/decisions/ADR-11-distribution.md` — ADR for install URL pattern
- `/Users/Julian/Desktop/oto-hybrid-framework/decisions/ADR-13-license-attribution.md` — ADR for THIRD-PARTY-LICENSES requirement
- `/Users/Julian/Desktop/oto-hybrid-framework/.planning/phases/02-rebrand-engine-distribution-skeleton/02-RESEARCH.md` — rebrand engine architecture (source for `docs/rebrand-engine.md`)
- `/Users/Julian/Desktop/oto-hybrid-framework/.planning/phases/09-upstream-sync-pipeline/09-RESEARCH.md` — upstream sync pipeline (source for `docs/upstream-sync.md`)
- `/Users/Julian/Desktop/oto-hybrid-framework/.planning/phases/09-upstream-sync-pipeline/09-CONTEXT.md` — Phase 9 D-01..D-22 lock-set (cited in upstream-sync doc)
- `/Users/Julian/Desktop/oto-hybrid-framework/bin/lib/sync-cli.cjs` — sync CLI entry surface (cited in upstream-sync doc)

### Existing precedent the planner should mimic

- **Auto-generated doc + regen-diff test pattern:** `scripts/render-runtime-matrix.cjs` + `decisions/runtime-tool-matrix.md` + `tests/phase-08-runtime-matrix-render.test.cjs` (Phase 8). DOC-06 (`commands/INDEX.md`) follows exactly this pattern.
- **Hook output snapshot pattern:** `tests/05-session-start-fixture.test.cjs` (re-spawns hook in tmp cwd, deep-equals against committed JSON fixture, defense-in-depth substring scan for banned literals). CI-07 runtime test mirrors this shape.
- **Test scaffold-then-fill pattern (Wave 0 vs Wave N):** every prior phase opens with a Wave 0 test scaffold using `t.todo()` placeholders, then later waves implement bodies. Phase 10 should do the same — Wave 0 = 8 phase-10-*.test.cjs files (with t.todo() where the workflow files don't exist yet) + the generator script; Wave 1 = workflow YAMLs + docs + README + CI test bodies; Wave 2 = tag, push, verify.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `node:test`'s `t.assert.snapshot()` API is too experimental for v0.1.0; hand-rolled `assert.deepEqual` against committed JSON is safer | Recommended Approach § Snapshot tests / R-4 | Low — hand-rolled is explicitly safer; even if API is stable, hand-rolled still works. |
| A2 | `c8` should be deferred to v0.2 to keep zero-dep posture | R-2 | Medium — if user expects coverage gates in v0.1.0 CI, plan must add `c8`. Surface in discuss-phase. |
| A3 | `docs/` should NOT be in the npm tarball `files` allowlist | R-3 | Low — easy to flip; test would just need a re-allowlist entry. |
| A4 | `bin/oto-sdk.js` should be dropped from v0.1.0 bin map (ADR-12 = v2) | R-1 | Medium — if kept and chmod-644 simulation breaks it, install-smoke fails. Easy fix at plan time. |
| A5 | GitHub Actions `actions/checkout@<SHA>` v6.0.2 SHA = `de0fac2e4500dabe0009e67214ff5f5447ce83dd` (copied from GSD reference) | Recommended Approach § Action-SHA pinning | Low — verifiable against `gh api /repos/actions/checkout/git/refs/tags/v6.0.2`. SHA pinning means even if upstream rotates, oto's pin stays valid. |
| A6 | Local-network access to `https://github.com/OTOJulian/oto-hybrid-framework` is reachable from CI runners (no enterprise GHES restriction) | R-8 | None — public GitHub repo, public GHA runners. |
| A7 | `gh` CLI is preinstalled on `ubuntu-latest` and `macos-latest` runners (used in `release.yml`) | Recommended Approach § release.yml | None — `gh` is in the standard GitHub-hosted runner image. Verified in GSD's release.yml without explicit install step. |

---

## Open Questions (RESOLVED)

> Resolved 2026-05-04 by orchestrator + planner consensus during plan-phase. Recommendations adopted as locked decisions; rationale below per question. No CONTEXT.md was authored — this section serves as the decision log for Phase 10.

1. **Does `tests/phase-01-licenses.test.cjs` already cover CI-06's byte-equality requirement, or only file existence + copyright-line presence?**
   - **RESOLVED:** Author a NEW `tests/phase-10-license-attribution.test.cjs` (do NOT extend the Phase 1 test). Verified by planner: Phase 1 test only checks substrings, not byte-equality of full MIT bodies. Rationale: keeps phase-scoped test ownership; Phase 1 test stays a narrow existence check.

2. **Should the v0.1.0 release ship `docs/` in the npm tarball?** (R-3)
   - **RESOLVED: NO.** Keep `package.json` `files` allowlist as-is (no `docs/`). Plan 02 Task 2 explicitly verifies `docs/` is NOT in the allowlist. Rationale: lean install footprint; docs live on GitHub for users to read.

3. **Is `bin/oto-sdk.js` shipping in v0.1.0?** (R-1)
   - **RESOLVED: NO.** Plan 02 Task 1 deletes `bin/oto-sdk.js` and removes the bin map entry. Rationale: ADR-12 defers SDK to v0.2; mode-644 risk if unused bin target ships.

4. **Does `c8` enter v0.1.0 dev deps?** (R-2)
   - **RESOLVED: NO.** Defer to v0.2. Rationale: preserves zero-dep posture; coverage gates are gold-plating for personal-use v0.1.0 ship.

5. **Is the `tests/phase-10-readme-shape.test.cjs` content-presence check in scope?**
   - **RESOLVED: YES.** Plan 01 Task 2 ships the test. It MUST reject literal `vX.Y.Z` placeholder. Rationale: catches the "shipped v0.1.0 with `vX.Y.Z` in README" failure class for ~30 lines of test code. (Implementation note: per check-in feedback, the test must NOT silently bypass via README-stub detection — Wave 0 may run against the stub README and is expected to fail loud until Plan 02 Task 2's README rewrite lands. Use per-assertion `t.todo` only if individually justified.)

6. **Skill-auto-trigger runtime test mechanism: hook spawn vs simulated load?**
   - **RESOLVED: spawn the hook.** Mirror `tests/05-session-start-fixture.test.cjs` pattern. If the existing `tests/06-using-oto-state-gating.test.cjs` already provides this coverage by spawning the hook, no new test is needed; the planner's test inventory should not duplicate it. Rationale: hook-spawn is the same shape as our existing SessionStart fixture; runtime-simulation would be brittle.

### Locked Decisions (planner SHALL treat as constraints)

- **D-10-01:** New file `tests/phase-10-license-attribution.test.cjs` (NOT an extension of Phase 1 test).
- **D-10-02:** `docs/` is NOT in the `package.json` `files` allowlist for v0.1.0.
- **D-10-03:** `bin/oto-sdk.js` is deleted; bin map drops the entry. Single bin target = `oto`.
- **D-10-04:** No `c8` dev dep in v0.1.0. Coverage deferred to v0.2.
- **D-10-05:** `tests/phase-10-readme-shape.test.cjs` ships and asserts no `vX.Y.Z` placeholder. No whole-suite stub-bypass.
- **D-10-06:** Skill-auto-trigger CI-07 test = hook-spawn pattern. If `tests/06-using-oto-state-gating.test.cjs` already covers it, that's sufficient — do not duplicate.
- **D-10-07** (added during revision): Rebrand-snapshot projection shape is locked to `{ file: <relative-path>, classifications: [{ rule, before, after, line }, ...] }` — sorted by `file` ASC, `line` ASC, deterministic across runs. Both `tests/phase-10-rebrand-snapshot.test.cjs` (Plan 01) and `tests/regen-rebrand-snapshots.cjs` (Plan 02) MUST emit this exact shape. No abs paths, no SHAs, no temp-dir refs.

---

## Sources

### Primary (HIGH confidence)

- `/Users/Julian/Desktop/oto-hybrid-framework/foundation-frameworks/get-shit-done-main/.github/workflows/test.yml` — direct template for `test.yml`; SHA-pinned action references; matrix shape
- `/Users/Julian/Desktop/oto-hybrid-framework/foundation-frameworks/get-shit-done-main/.github/workflows/install-smoke.yml` — direct template for `install-smoke.yml`; mode-644 trap simulation step
- `/Users/Julian/Desktop/oto-hybrid-framework/foundation-frameworks/get-shit-done-main/.github/workflows/release.yml` — release-workflow shape (subtract npm publish parts)
- `/Users/Julian/Desktop/oto-hybrid-framework/CLAUDE.md` — locked tech-stack constraints
- `/Users/Julian/Desktop/oto-hybrid-framework/.planning/REQUIREMENTS.md` — CI-01..10, DOC-01..06, FND-05 verbatim
- `/Users/Julian/Desktop/oto-hybrid-framework/.planning/ROADMAP.md` Phase 10 success criteria
- `/Users/Julian/Desktop/oto-hybrid-framework/package.json` — version, files allowlist, bin map, scripts
- `/Users/Julian/Desktop/oto-hybrid-framework/THIRD-PARTY-LICENSES.md` — content (verified 2716 chars, both copyright lines present)
- `/Users/Julian/Desktop/oto-hybrid-framework/tests/05-session-start-fixture.test.cjs` — explicit "Phase 10 promotes this to a CI snapshot check (CI-08)" comment
- `/Users/Julian/Desktop/oto-hybrid-framework/tests/phase-04-planning-leak.test.cjs` — CI-09 enforcement (verified shipped-payload roots scan)
- `/Users/Julian/Desktop/oto-hybrid-framework/tests/phase-02-coverage-manifest.test.cjs` — CI-05 enforcement (verified post-rebrand zero-count assertion)
- `/Users/Julian/Desktop/oto-hybrid-framework/tests/06-using-oto-state-gating.test.cjs` — CI-07 structural baseline
- `/Users/Julian/Desktop/oto-hybrid-framework/decisions/ADR-11-distribution.md` — install URL ADR
- `/Users/Julian/Desktop/oto-hybrid-framework/decisions/ADR-13-license-attribution.md` — license attribution ADR
- `/Users/Julian/Desktop/oto-hybrid-framework/.planning/phases/02-rebrand-engine-distribution-skeleton/02-RESEARCH.md` — rebrand engine context for `docs/rebrand-engine.md`
- `/Users/Julian/Desktop/oto-hybrid-framework/.planning/phases/09-upstream-sync-pipeline/09-RESEARCH.md` — upstream sync context for `docs/upstream-sync.md`
- `/Users/Julian/Desktop/oto-hybrid-framework/.planning/phases/09-upstream-sync-pipeline/09-CONTEXT.md` — Phase 9 D-01..D-22 lock-set

### Secondary (MEDIUM confidence)

- `/Users/Julian/Desktop/oto-hybrid-framework/scripts/install-smoke.cjs` — proven install-URL pattern (verified locally; CI is just a wrapper)
- `/Users/Julian/Desktop/oto-hybrid-framework/scripts/build-hooks.js` — postinstall behavior (verified)
- All 76 files in `/Users/Julian/Desktop/oto-hybrid-framework/oto/commands/oto/*.md` — uniform `name:` + `description:` frontmatter (verified by grep)

### Tertiary (LOW confidence — flagged in Assumptions Log)

- `node:test` `t.assert.snapshot()` API stability (A1, R-4)
- `actions/checkout` v6.0.2 SHA verbatim from GSD (A5)
- `gh` CLI preinstall on hosted runners (A7)

---

## Metadata

**Confidence breakdown:**

- CI workflow shape (test/install-smoke/release): **HIGH** — direct upstream templates verified, only deletions/simplifications needed
- Snapshot strategy: **HIGH** for hand-rolled approach; **MEDIUM** for Node `t.assert.snapshot` API
- License-attribution check: **HIGH** — content already complete, byte-equality test is mechanical
- Skill auto-trigger runtime test: **MEDIUM** — depends on hook architecture (Open Question 6)
- Action SHA pinning: **HIGH** — pattern + SHAs available verbatim from GSD
- README + docs writing: **HIGH** — source-of-truth phase research already exists
- Auto-generated commands/INDEX.md: **HIGH** — frontmatter uniform across 76 commands; pattern precedent in `scripts/render-runtime-matrix.cjs`
- v0.1.0 release procedure: **MEDIUM** — needs CONTEXT.md to lock version-bump + tag-push ritual (R-7)

**Research date:** 2026-05-04
**Valid until:** 2026-06-04 (30 days for stable npm/GitHub Actions ecosystem; reduce to 7 days if `node:test` snapshot API status changes)

## RESEARCH COMPLETE
