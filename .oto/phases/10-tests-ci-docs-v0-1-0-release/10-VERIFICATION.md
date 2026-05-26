---
phase: 10-tests-ci-docs-v0-1-0-release
verified: 2026-05-04T21:15:00Z
status: passed
score: 6/6 roadmap success criteria verified
requirements_completed:
  - CI-01
  - CI-02
  - CI-03
  - CI-04
  - CI-05
  - CI-06
  - CI-07
  - CI-08
  - CI-09
  - CI-10
  - DOC-01
  - DOC-02
  - DOC-03
  - DOC-04
  - DOC-06
  - FND-05
must_haves:
  total: 6
  verified: 6
  failed: 0
  uncertain: 0
findings:
  blockers: 0
  warnings: 0
human_verification:
  - "2026-05-04: fresh-terminal release UAT returned BIN_OK + FND-05_PASS; install marker showed oto_version 0.1.0 and runtime claude."
gaps: []
---

# Phase 10: Tests, CI, Docs & v0.1.0 Release Verification Report

**Phase Goal:** Lock the test surface, harden CI, write the public docs, and tag v0.1.0, the first installable release that creates a clean install for Claude Code.

**Status:** passed

## Goal Achievement

Phase 10 achieved the roadmap goal. The repo now has a live Phase 10 test surface, pinned GitHub Actions workflows, public release documentation, release automation, a stable `0.1.0` package version, an annotated `v0.1.0` tag, and a published GitHub Release. The release archive was validated by automated install smoke and by human fresh-terminal UAT.

One release-gate defect was found before tagging: the upstream fixture tree was present locally but untracked, which made clean CI checkouts fail. The fix was to track `foundation-frameworks/` as immutable test/source evidence while keeping it excluded from the npm package allowlist.

## Roadmap Success Criteria

| Criterion | Status | Evidence |
|---|---|---|
| CI matrix runs on every push, install smoke covers package install modes, and release workflow creates GitHub Release. | VERIFIED | `.github/workflows/test.yml`, `.github/workflows/install-smoke.yml`, `.github/workflows/release.yml`; main `test.yml` run `25343376890` success, install-smoke run `25343376855` success, release run `25343460823` success. |
| Rebrand snapshot tests pass and coverage-manifest check fails on non-allowlisted upstream identity residue. | VERIFIED | `tests/phase-10-rebrand-snapshot.test.cjs`, `tests/phase-02-coverage-manifest.test.cjs`, and full `npm test` passed. |
| License-attribution CI confirms both upstream MIT licenses remain preserved. | VERIFIED | `tests/phase-10-license-attribution.test.cjs`, `THIRD-PARTY-LICENSES.md`, and tracked `foundation-frameworks/*/LICENSE` fixtures; full `npm test` passed. |
| Skill auto-trigger regression, SessionStart fixture, state-leak detection, and action SHA pinning all pass. | VERIFIED | `tests/phase-10-skill-auto-trigger.test.cjs`, `tests/05-session-start-fixture.test.cjs`, `tests/phase-04-planning-leak.test.cjs`, `tests/phase-10-action-sha-pin.test.cjs`; full `npm test` passed. |
| Public docs are present and command index is generated/idempotent. | VERIFIED | `README.md`, `docs/upstream-sync.md`, `docs/rebrand-engine.md`, `commands/INDEX.md`, `scripts/gen-commands-index.cjs`, `tests/phase-10-readme-shape.test.cjs`, `tests/phase-10-docs-presence.test.cjs`, `tests/phase-10-commands-index-sync.test.cjs`. |
| `v0.1.0` tagged release creates a clean Claude Code install. | VERIFIED | Annotated tag `v0.1.0`; GitHub Release https://github.com/OTOJulian/oto-hybrid-framework/releases/tag/v0.1.0; `node scripts/install-smoke.cjs --ref v0.1.0` passed; human UAT returned `BIN_OK + FND-05_PASS`. |

## Requirement Verification

| Requirement | Status | Evidence |
|---|---|---|
| CI-01 | VERIFIED | `test.yml` exists and ran green on GitHub Actions for `18b077c`. |
| CI-02 | VERIFIED | `install-smoke.yml` exists and ran green on GitHub Actions for `18b077c`; local tag smoke also passed. |
| CI-03 | VERIFIED | `release.yml` ran green for tag `v0.1.0` and created the GitHub Release. |
| CI-04 | VERIFIED | Rebrand projection snapshots are committed and asserted by the Phase 10 snapshot tests. |
| CI-05 | VERIFIED | Coverage manifest test runs in the full suite and passed. |
| CI-06 | VERIFIED | License-attribution tests passed against upstream fixture licenses and `THIRD-PARTY-LICENSES.md`. |
| CI-07 | VERIFIED | Skill/session auto-trigger regression tests passed. |
| CI-08 | VERIFIED | SessionStart fixture snapshot test passed. |
| CI-09 | VERIFIED | Planning-leak detection test passed. |
| CI-10 | VERIFIED | Action SHA-pin test passed. |
| DOC-01 | VERIFIED | README shape test passed and README references concrete `v0.1.0` install URL. |
| DOC-02 | VERIFIED | `THIRD-PARTY-LICENSES.md` exists, ships in `package.json` files allowlist, and passed attribution tests. |
| DOC-03 | VERIFIED | `docs/upstream-sync.md` exists and passed docs-presence tests. |
| DOC-04 | VERIFIED | `docs/rebrand-engine.md` exists and passed docs-presence tests. |
| DOC-06 | VERIFIED | `commands/INDEX.md` exists and generator check passed. |
| FND-05 | VERIFIED | Published `v0.1.0` archive installed successfully and produced Claude install marker `.install.json` with `oto_version` `0.1.0`. |

## Automated Checks

| Check | Result |
|---|---|
| Focused version/render tests | 12 pass, 0 fail |
| `npm test` after version bump | 419 tests, 418 pass, 1 skipped, 0 fail, 0 TODO |
| Clean clone `/private/tmp/oto-ci-repro` `npm test` | 419 tests, 418 pass, 1 skipped, 0 fail, 0 TODO |
| `node scripts/install-smoke.cjs` on pushed main SHA | PASS, `oto v0.1.0` |
| GitHub Actions `test.yml` on `18b077c` | success |
| GitHub Actions `install-smoke.yml` on `18b077c` | success |
| `git cat-file -t v0.1.0` | `tag` |
| `git show v0.1.0:package.json` | version `0.1.0` |
| GitHub Actions `release.yml` run `25343460823` | success |
| GitHub Release API for `v0.1.0` | release exists, published |
| `node scripts/install-smoke.cjs --ref v0.1.0` | PASS |

## Human UAT

Fresh terminal UAT was provided by screenshot and accepted as:

```text
BIN_OK + FND-05_PASS
```

Evidence shown:

- `npm install -g https://github.com/OTOJulian/oto-hybrid-framework/archive/v0.1.0.tar.gz --prefix "$TMPDIR_PREFIX"` added one package.
- `$TMPDIR_PREFIX/bin/oto` existed and was executable (`BIN_OK`).
- `oto install --claude --config-dir "$TMPDIR_CLAUDE"` reported 331 files copied, marker injected, and state path written.
- `$TMPDIR_CLAUDE/oto/.install.json` existed (`FND-05_PASS`).
- `.install.json` contained `"oto_version": "0.1.0"` and `"runtime": "claude"`.

## Residual Notes

- The one skipped full-suite test is the pre-existing Gemini live invocation version gate (`gemini v0.26.0 < required v0.38`), not a Phase 10 failure.
- `reports/rebrand-dryrun.*` and older Phase 4/5 planning files remain dirty from pre-existing unrelated work and were not staged for Phase 10.
- `foundation-frameworks/` is now tracked as CI fixture source, but it is not included in the npm package `files` allowlist.

## Gaps Summary

No phase-blocking gaps remain.

---

_Verified: 2026-05-04_
_Verifier: Codex_
