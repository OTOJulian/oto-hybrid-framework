# Plan 03-02 Summary: install-smoke restored-agent coverage

## Outcome

Completed.

## Changes

- Updated `oto/bin/lib/model-profiles.cjs` so `EXPECTED_AGENTS` contains 26 retained agents, including:
  - `oto-doc-classifier`
  - `oto-doc-synthesizer`
  - `oto-eval-auditor`
- Extended `tests/phase-04-mr01-install-smoke.test.cjs` to assert the Claude install includes:
  - `commands/oto/ingest-docs.md`
  - `commands/oto/eval-review.md`
  - no `intentionally non-executable` deferral framing in either installed command file
- Extended `scripts/install-smoke.cjs` to assert the three restored agents install across Claude, Codex, and Gemini; Codex also checks per-agent `sandbox_mode`.
- Extended `.github/workflows/install-smoke.yml` so both tarball and unpacked smoke jobs assert restored-agent installation for all three runtimes, including Codex sandbox checks.
- Added `oto/agents/**` to the install-smoke pull request path filter.

## Verification

- `node -e "const a = require('./oto/bin/lib/model-profiles.cjs').EXPECTED_AGENTS; ..."` — passed, `OK 26`.
- `node --test tests/phase-04-mr01-install-smoke.test.cjs` — passed.
- `node -c scripts/install-smoke.cjs` — passed.
- Workflow content checks for `oto/agents/**`, restored-agent names, and `sandbox_mode` assertions — passed.
- Local installer assertion loop over `node bin/install.js install --claude/--codex/--gemini --config-dir <tmp>` — passed, including Codex TOML sandbox modes.
- `npm test` — passed, 611 tests, 610 pass, 1 skipped, 0 fail.

## Direct `scripts/install-smoke.cjs` Attempt

- Initial sandboxed run failed with local npm cache permission (`EPERM`).
- Escalated run reached GitHub but failed with `404` because the script installs `https://github.com/OTOJulian/oto-hybrid-framework/archive/<current local commit>.tar.gz`, and commit `359358595b4147b102132fb8db35d7055b0ec3f1` is local-only at execution time.
- The current-workspace tarball smoke and local three-runtime installer loop verified the Plan 03-02 behavior without depending on a pushed commit.

## Deviations from Plan

- The authored checklist used `require('./oto/bin/lib/model-profiles')`; this repo's file is `.cjs`, and the existing tests import it as `model-profiles.cjs`. Verification used the extension-bearing import.
- `EXPECTED_AGENTS` insertion preserved the existing retained-agent fixture order rather than reordering unrelated entries.

## Self-Check: PASSED
