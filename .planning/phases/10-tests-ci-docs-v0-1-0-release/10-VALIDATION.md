---
phase: 10
slug: tests-ci-docs-v0-1-0-release
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-04
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `node:test` (built-in, Node 22+), no external runner |
| **Config file** | `scripts/run-tests.cjs` (existing wrapper around `node --test`) |
| **Quick run command** | `node scripts/run-tests.cjs --test tests/<file>.test.cjs` (single file) |
| **Full suite command** | `node scripts/run-tests.cjs` (all `tests/*.test.cjs`) |
| **Estimated runtime** | ~30 seconds (full suite); <2 seconds per single-file run |

Coverage tool: deferred to v0.2 per RESEARCH.md R-2 (preserves zero-dep posture).

---

## Sampling Rate

- **After every task commit:** Run `node scripts/run-tests.cjs --test tests/<file-just-added>.test.cjs`
- **After every plan wave:** Run `node scripts/run-tests.cjs` (full suite)
- **Before `/gsd-verify-work`:** Full suite green AND `act` (or local CI smoke) on `test.yml`
- **Max feedback latency:** 35 seconds

---

## Per-Task Verification Map

> Task IDs use the convention `{phase}-{plan}-{task}`. Plans are not yet authored — this map is filled in by the planner. Rows below are the seed list derived from RESEARCH.md; the planner expands each plan into the matrix.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 10-01-* | 01 | 0 | CI-04 (rebrand snapshots) | — | Rebrand engine output is byte-stable | golden-file | `node scripts/run-tests.cjs --test tests/phase-10-rebrand-snapshots.test.cjs` | ❌ W0 | ⬜ pending |
| 10-01-* | 01 | 0 | CI-05 (coverage manifest) | — | No unallowlisted `gsd`/`superpowers` in shipped artifacts | scan | `node scripts/run-tests.cjs --test tests/phase-02-coverage-manifest.test.cjs` | ✅ | ⬜ pending |
| 10-01-* | 01 | 0 | CI-06 (license attribution) | T-LIC-01 | Both upstream MIT licenses present verbatim | byte-equality | `node scripts/run-tests.cjs --test tests/phase-10-licenses.test.cjs` | ❌ W0 | ⬜ pending |
| 10-01-* | 01 | 0 | CI-07 (skill auto-trigger) | — | `using-oto` SKILL.md auto-load preserved | snapshot | `node scripts/run-tests.cjs --test tests/06-using-oto-state-gating.test.cjs` | ✅ | ⬜ pending |
| 10-01-* | 01 | 0 | CI-08 (SessionStart fixture) | — | SessionStart hook emits expected stdout | snapshot | `node scripts/run-tests.cjs --test tests/05-session-start-fixture.test.cjs` | ✅ | ⬜ pending |
| 10-01-* | 01 | 0 | CI-09 (state leak) | T-LEAK-01 | No `.planning/` references in shipped tarball | scan | `node scripts/run-tests.cjs --test tests/phase-04-planning-leak.test.cjs` | ✅ | ⬜ pending |
| 10-01-* | 01 | 0 | CI-10 (action SHA pinning) | T-CI-01 | All `uses:` lines reference 40-char commit SHAs | regex scan | `node scripts/run-tests.cjs --test tests/phase-10-action-pins.test.cjs` | ❌ W0 | ⬜ pending |
| 10-02-* | 02 | 1 | CI-01 (test.yml) | — | Matrix runs on push: ubuntu × 22/24 + macos × 24 | YAML lint + smoke | `node scripts/run-tests.cjs --test tests/phase-10-test-yml.test.cjs` AND CI green on a pushed branch | ❌ W0 | ⬜ pending |
| 10-02-* | 02 | 1 | CI-02 (install-smoke.yml) | T-INST-01 (mode-644) | Tarball install AND unpacked-dir install both succeed; `oto` is on PATH and executable | end-to-end | CI run on pushed branch shows install-smoke green | ❌ W0 | ⬜ pending |
| 10-02-* | 02 | 1 | CI-03 (release.yml) | — | Tag-triggered run creates GitHub Release with auto notes | end-to-end | tag a `v0.0.0-test.N` rc on a throwaway branch and verify Release | ❌ W0 | ⬜ pending |
| 10-03-* | 03 | 1 | DOC-01 (README.md) | — | README contains: name, install command with `vX.Y.Z`, attribution, command index link | content scan | `node scripts/run-tests.cjs --test tests/phase-10-readme-shape.test.cjs` | ❌ W0 | ⬜ pending |
| 10-03-* | 03 | 1 | DOC-02 (upstream-sync docs) | — | `docs/upstream-sync.md` exists and references `/oto-update`, sync pipeline | content scan | grep-based assertion in `tests/phase-10-docs-shape.test.cjs` | ❌ W0 | ⬜ pending |
| 10-03-* | 03 | 1 | DOC-03 (rebrand-engine docs) | — | `docs/rebrand-engine.md` exists and explains rebrand passes + allowlist | content scan | grep-based assertion in `tests/phase-10-docs-shape.test.cjs` | ❌ W0 | ⬜ pending |
| 10-03-* | 03 | 1 | DOC-04 (commands/INDEX.md) | — | INDEX lists every `commands/oto/oto-*.md` with one-line description; regen idempotent | golden-diff | `node scripts/gen-commands-index.cjs --check` exits 0 | ❌ W0 | ⬜ pending |
| 10-03-* | 03 | 1 | DOC-06 (third-party attribution) | T-LIC-01 | `THIRD-PARTY-LICENSES.md` is referenced from README and ships in tarball | grep | covered by CI-06 + tarball file-list assertion | ✅ partial | ⬜ pending |
| 10-04-* | 04 | 2 | FND-05 (v0.1.0 release) | — | `package.json` version bumped to `0.1.0`; `git tag v0.1.0` triggers release.yml; `npm install -g github:owner/repo#v0.1.0` produces working Claude Code install on a clean machine | manual UAT | UAT script + post-release smoke documented in `docs/upstream-sync.md` | ❌ W0 | ⬜ pending |

Legend — File Exists column:
- ✅ = test file exists today (no Wave 0 work needed)
- ✅ partial = exists but assertion needs extension
- ❌ W0 = must be created in Wave 0 of this phase

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

> Test files / scripts that MUST exist before downstream waves can be verified. Authored as the first plan ("01-test-surface").

- [ ] `tests/phase-10-rebrand-snapshots.test.cjs` — golden-file snapshots for rebrand engine (CI-04). Fixtures live under `tests/fixtures/rebrand/{input,golden}/`.
- [ ] `tests/phase-10-licenses.test.cjs` — byte-equality check that `THIRD-PARTY-LICENSES.md` contains both upstream MIT licenses verbatim, plus copyright lines for `Lex Christopherson` and `Jesse Vincent` (CI-06, DOC-06).
- [ ] `tests/phase-10-action-pins.test.cjs` — scan all `.github/workflows/*.yml`, fail if any `uses:` line references a tag/branch instead of a 40-char SHA (CI-10).
- [ ] `tests/phase-10-test-yml.test.cjs` — YAML lint + matrix shape assertion (CI-01).
- [ ] `tests/phase-10-readme-shape.test.cjs` — README structural shape (DOC-01).
- [ ] `tests/phase-10-docs-shape.test.cjs` — verifies `docs/upstream-sync.md` and `docs/rebrand-engine.md` exist and contain required headings (DOC-02, DOC-03).
- [ ] `tests/fixtures/rebrand/input/*.md` and `tests/fixtures/rebrand/golden/*.md` — snapshot inputs and expected outputs.
- [ ] `scripts/gen-commands-index.cjs` — generator + `--check` mode for `commands/INDEX.md` (DOC-04).

*Existing infrastructure that does NOT need Wave 0:*
- `tests/phase-02-coverage-manifest.test.cjs` (CI-05)
- `tests/05-session-start-fixture.test.cjs` (CI-08)
- `tests/phase-04-planning-leak.test.cjs` (CI-09)
- `tests/06-using-oto-state-gating.test.cjs` (CI-07 structural part)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `npm install -g github:owner/oto-hybrid-framework#v0.1.0` on a clean machine produces a working Claude Code install | FND-05, CI-02 | Requires a clean OS install; `install-smoke.yml` covers tarball + unpacked-dir but not "clean machine global install" | (a) on a fresh shell with no existing `~/.claude/`, run the install command; (b) launch Claude Code; (c) run `/oto-help` and confirm the command index renders |
| GitHub Release created by `release.yml` contains correct auto-generated notes | CI-03, FND-05 | Auto-generated notes depend on tag annotation + linked PRs/commits; visual inspection only | After `git push --tags`, open the GitHub Releases page and confirm the v0.1.0 entry exists with non-empty notes |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 35s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
