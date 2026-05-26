---
phase: 9
slug: upstream-sync-pipeline
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-05-04
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Source of truth: `09-RESEARCH.md` § Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `node:test` (Node 22.17.1 builtin) |
| **Config file** | None — runner is `scripts/run-tests.cjs` (Phase 5/6/8 convention) |
| **Quick run command** | `node --test --test-concurrency=4 tests/phase-09-*.test.cjs` |
| **Full suite command** | `node scripts/run-tests.cjs` |
| **Estimated runtime** | ~30 sec (phase suite); ~60 sec (full suite) |

---

## Sampling Rate

- **After every task commit:** Run `node --test --test-concurrency=4 tests/phase-09-*.test.cjs`
- **After every plan wave:** Run `node scripts/run-tests.cjs`
- **Before `/oto-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

> Pre-populated from `09-RESEARCH.md`. Plan/Wave/Task IDs assigned by gsd-planner; rows below are the binding behavior set the planner must allocate to tasks.

| Req ID | Behavior | Test Type | Automated Command | File Exists | Status |
|--------|----------|-----------|-------------------|-------------|--------|
| SYN-01 | `pull-gsd.cjs` clones GSD at requested ref into `.oto-sync/upstream/gsd/current/` | unit + integration | `node --test tests/phase-09-pull-puller.test.cjs` | ❌ W0 | ⬜ pending |
| SYN-01 | Snapshot rotation: previous `current/` becomes `prior/`; first sync skips rotation | unit | `node --test tests/phase-09-pull-puller.test.cjs` | ❌ W0 | ⬜ pending |
| SYN-01 | Tag-pin path uses `--depth 1 --branch <tag>` against `file://` bare-repo fixture | integration | `node --test tests/phase-09-pull-puller.test.cjs` | ❌ W0 | ⬜ pending |
| SYN-01 | SHA-pin path falls back to full clone + `git checkout <sha>` | integration | `node --test tests/phase-09-pull-puller.test.cjs` | ❌ W0 | ⬜ pending |
| SYN-02 | `pull-superpowers.cjs` differs from `pull-gsd.cjs` only in URL constant | unit | `node --test tests/phase-09-pull-puller.test.cjs` | ❌ W0 | ⬜ pending |
| SYN-03 | `scripts/sync-upstream/rebrand.cjs` produces byte-identical output to direct `engine.run({mode:'apply'})` | unit | `node --test tests/phase-09-rebrand-sync.test.cjs` | ❌ W0 | ⬜ pending |
| SYN-03 | Sync rebrand never modifies `foundation-frameworks/` | invariant | `node --test tests/phase-09-rebrand-sync.test.cjs` | ❌ W0 | ⬜ pending |
| SYN-04 | 3-way merge: non-overlapping line edits → exit 0, content auto-applied | unit | `node --test tests/phase-09-merge-3way.test.cjs` | ❌ W0 | ⬜ pending |
| SYN-04 | 3-way merge: same-line clash → exit > 0, conflict file emitted with markers + YAML header | unit | `node --test tests/phase-09-merge-3way.test.cjs` | ❌ W0 | ⬜ pending |
| SYN-04 | 3-way merge: file missing → exit 255 → throw with diagnostic stderr (Pitfall 1) | unit | `node --test tests/phase-09-merge-3way.test.cjs` | ❌ W0 | ⬜ pending |
| SYN-04 | Binary file detection: route to sidecar surface, not `git merge-file` (Pitfall 4) | unit | `node --test tests/phase-09-merge-3way.test.cjs` | ❌ W0 | ⬜ pending |
| SYN-04 / D-10 | Added file: not in inventory + not in allowlist → `.added.md` sidecar emitted | unit | `node --test tests/phase-09-merge-add-delete.test.cjs` | ❌ W0 | ⬜ pending |
| SYN-04 / D-10 | Deleted file: present in prior, missing in current → `.deleted.md` sidecar emitted | unit | `node --test tests/phase-09-merge-add-delete.test.cjs` | ❌ W0 | ⬜ pending |
| SYN-04 / D-17 | Unclassified-add path causes non-zero exit even if all merges clean | integration | `node --test tests/phase-09-merge-add-delete.test.cjs` | ❌ W0 | ⬜ pending |
| SYN-04 / D-16 | Allowlist completeness: sync against `foundation-frameworks/get-shit-done-main/` produces 0 unclassified adds | regression | `node --test tests/phase-09-allowlist.test.cjs` | ❌ W0 | ⬜ pending |
| SYN-04 / D-16 | Glob match: oto-owned path is never compared against upstream | unit | `node --test tests/phase-09-allowlist.test.cjs` | ❌ W0 | ⬜ pending |
| SYN-04 / D-12 | Conflict file YAML header contains all required fields | unit | `node --test tests/phase-09-merge-3way.test.cjs` | ❌ W0 | ⬜ pending |
| SYN-05 | `last-synced-commit.json` written after each pull with both ref and 40-char SHA | unit | `node --test tests/phase-09-pull-puller.test.cjs` | ❌ W0 | ⬜ pending |
| SYN-05 | `last-synced-commit.json` validates against `schema/last-synced-commit.json` | unit | `node --test tests/phase-09-pull-puller.test.cjs` | ❌ W0 | ⬜ pending |
| SYN-06 | `BREAKING-CHANGES-{gsd,superpowers}.md` appended (not overwritten) on each sync run | unit | `node --test tests/phase-09-report.test.cjs` | ❌ W0 | ⬜ pending |
| SYN-06 / D-14 | `REPORT.md` regenerated each sync with auto-merged / conflict / added / deleted counts | unit | `node --test tests/phase-09-report.test.cjs` | ❌ W0 | ⬜ pending |
| SYN-07 (override) | `oto sync --upstream gsd --to <fixture-tag>` end-to-end against bare-repo fixture | integration | `node --test tests/phase-09-cli.integration.test.cjs` | ❌ W0 | ⬜ pending |
| D-15 | `oto sync --accept <path>` strips YAML header, validates no markers, writes to oto/, deletes sidecar | unit | `node --test tests/phase-09-accept-helper.test.cjs` | ❌ W0 | ⬜ pending |
| D-15 | `oto sync --accept <path>` refuses with non-zero exit if `<<<<<<<` markers still present | unit | `node --test tests/phase-09-accept-helper.test.cjs` | ❌ W0 | ⬜ pending |
| D-15 | `oto sync --accept-deletion <path>` removes file from oto/ and updates inventory verdict | unit | `node --test tests/phase-09-accept-helper.test.cjs` | ❌ W0 | ⬜ pending |
| D-19 | `oto sync` flag parser parses `--upstream`, `--to`, `--apply`, `--dry-run`, `--accept`, `--status` | unit | `node --test tests/phase-09-cli.integration.test.cjs` | ❌ W0 | ⬜ pending |
| D-19 | `bin/install.js` dispatches `oto sync ...` to `bin/lib/sync-cli.cjs` | unit | `node --test tests/phase-09-cli.integration.test.cjs` | ❌ W0 | ⬜ pending |
| Pitfall 12 | `--main` ref emits stderr warning before clone | unit | `node --test tests/phase-09-pull-puller.test.cjs` | ❌ W0 | ⬜ pending |
| Pitfall 9 | `git --version` parsing: lenient regex; fail-loud on unparseable output | unit | `node --test tests/phase-09-cli.integration.test.cjs` | ❌ W0 | ⬜ pending |
| Pitfall 10 | Re-pull of identical SHA short-circuits via `git ls-remote` SHA comparison | unit | `node --test tests/phase-09-pull-puller.test.cjs` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/phase-09-pull-puller.test.cjs` — stubs for SYN-01, SYN-02, SYN-05, Pitfalls 9/12
- [ ] `tests/phase-09-rebrand-sync.test.cjs` — stubs for SYN-03
- [ ] `tests/phase-09-merge-3way.test.cjs` — stubs for SYN-04 happy path + D-12 + Pitfalls 1/4/6
- [ ] `tests/phase-09-merge-add-delete.test.cjs` — stubs for SYN-04 + D-10 + D-17
- [ ] `tests/phase-09-allowlist.test.cjs` — stubs for D-16 + D-17 + Pitfall 7 (allowlist completeness)
- [ ] `tests/phase-09-accept-helper.test.cjs` — stubs for D-15
- [ ] `tests/phase-09-report.test.cjs` — stubs for SYN-06 + D-14
- [ ] `tests/phase-09-cli.integration.test.cjs` — stubs for D-19 end-to-end + Pitfall 9
- [ ] `tests/fixtures/phase-09/bare-upstream/` — script that builds `git init --bare` repo with 3 tags (`v1.0.0`, `v1.1.0`, `v1.2.0`) covering non-overlapping edit, same-line conflict, added file
- [ ] `tests/fixtures/phase-09/sample-inventory.json` — minimal inventory subset for unit tests
- [ ] `tests/fixtures/phase-09/sample-allowlist.json` — minimal `oto_owned_globs` for unit tests
- [ ] `tests/fixtures/phase-09/three-version-trio/` — `base.txt`, `current.txt`, `other.txt` for `mergeOneFile` unit tests
- [ ] Framework install — N/A (`node:test` is built into Node 22)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Network availability — `git clone` against real `github.com` upstream | SYN-01, SYN-02 | Requires live network and DNS; CI may run offline | One-shot: `node scripts/sync-upstream/pull-gsd.cjs --to v1.38.5`; assert exit 0 and `.oto-sync/upstream/gsd/current/` populated |
| Disk space exhaustion behavior | SYN-01, SYN-02 | Cannot reliably simulate `ENOSPC` in unit tests | Verified by user observation if encountered |
| Concurrent `oto sync` invocations | SYN-04 | No lock file in v1; expected single-user constraint | Documented in `docs/upstream-sync.md` (Phase 10 DOC-03) |
| Partial-clone resumption after interrupt | SYN-01, SYN-02 | Hard to simulate process interruption deterministically in unit tests | Optional advanced test (`phase-09-pull-puller.test.cjs`) using `child_process.kill` mid-clone; otherwise enforced at runtime via `fsp.rm(destDir, {recursive:true,force:true})` on caught error before retry |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (8 test files + fixtures)
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s for phase suite
- [ ] `nyquist_compliant: true` set in frontmatter (after planner allocates rows to tasks)

**Approval:** pending
