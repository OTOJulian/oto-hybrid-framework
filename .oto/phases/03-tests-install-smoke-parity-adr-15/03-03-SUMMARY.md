# Plan 03-03 Summary: Codex/Gemini Parity Regression Coverage

Date: 2026-05-18

## Scope

Added restored-agent parity smoke coverage for Codex and Gemini runtime installers.

## Changes

- Added Codex PRTY-01 coverage in `tests/phase-08-smoke-codex.integration.test.cjs`:
  - Verifies `skills/oto-ingest-docs/SKILL.md` and `skills/oto-eval-review/SKILL.md` install for Codex.
  - Verifies Codex does not install `commands/oto/ingest-docs.md` or `commands/oto/eval-review.md`, preserving the existing Codex skills surface.
  - Verifies `oto-doc-classifier`, `oto-doc-synthesizer`, and `oto-eval-auditor` install with per-agent `.toml` files.
  - Verifies Phase 1 D-04 sandbox modes:
    - `oto-doc-classifier`: `read-only`
    - `oto-doc-synthesizer`: `workspace-write`
    - `oto-eval-auditor`: `read-only`
- Added Gemini PRTY-01 coverage in `tests/phase-08-smoke-gemini.integration.test.cjs`:
  - Verifies `commands/oto/ingest-docs.md` and `commands/oto/eval-review.md` install for Gemini.
  - Verifies `oto-doc-classifier`, `oto-doc-synthesizer`, and `oto-eval-auditor` agent markdown files install.
  - Keeps Gemini coverage free of Codex `.toml` and `sandbox_mode` assertions.

## Verification

- `node --test tests/phase-08-smoke-codex.integration.test.cjs`
  - 5 pass, 0 fail, 0 skipped.
  - `codex --version`: `codex-cli 0.130.0`; live Codex invocation ran and passed.
- `node --test tests/phase-08-smoke-gemini.integration.test.cjs`
  - 4 pass, 0 fail, 1 skipped.
  - `gemini --version`: `0.26.0`; live Gemini invocation self-skipped because it requires `>= 0.38`.
- `! rg -q "sandbox_mode" tests/phase-08-smoke-gemini.integration.test.cjs && ! rg -q "ingest-docs\\.toml|eval-review\\.toml" tests/phase-08-smoke-gemini.integration.test.cjs`
  - Passed: `GEMINI_NEGATIVE_LOCKS_OK`.
- `node -e "if (require('./oto/bin/lib/model-profiles.cjs').EXPECTED_AGENTS.length !== 26) process.exit(1); console.log('EXPECTED_AGENTS_26')"`
  - Passed: `EXPECTED_AGENTS_26`.
- `npm test`
  - 613 tests, 612 pass, 1 skipped, 0 fail.

## Deviations

- Gemini live invocation did not run because the installed Gemini CLI is `0.26.0`, below the test gate of `>= 0.38`. The non-live Gemini install parity regression still ran and passed.
