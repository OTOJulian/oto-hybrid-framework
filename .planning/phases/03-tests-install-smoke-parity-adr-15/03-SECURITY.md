---
phase: 03-tests-install-smoke-parity-adr-15
status: verified
threats_open: 0
asvs_level: 1
created: 2026-05-18
verified: 2026-05-18
---

# Phase 03 - Security

Per-phase security contract: threat register, accepted risks, and audit trail.

## Scope

Phase 3 covers restored command regression tests, install-smoke coverage, Codex/Gemini parity checks, and ADR-15. The phase adds tests, CI assertions, one retained-agent constant update, and a decision record. It does not add a new runtime input parser or long-running service surface.

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Test runner -> repo files | Tests read shipped agent, workflow, command, ADR, and inventory files. | Repo-local source files, read-only. |
| Rebrand engine -> tests | Engine output is staged and copied into `tests/` only after review and fixups. | Repo-local generated test content. |
| Inventory manifest -> rebrand engine | `decisions/file-inventory.json` controls keep/drop/rebrand decisions. | Repo-local metadata that can silently suppress generated coverage if wrong. |
| CI smoke step -> installed `oto` CLI | GitHub Actions installs the built package into temporary runtime config dirs. | Generated runtime files in isolated temp dirs. |
| Runtime adapter -> installed agent files | Installer writes runtime-specific command, skill, agent, and TOML files. | Generated runtime payload files. |
| Probe helpers -> external CLI | Codex/Gemini live probes run `--version` and may self-skip when unavailable or too old. | Local CLI version metadata only. |
| ADR-15 prose -> future reader interpretation | ADR text records the restored/dropped agent decision. | Project decision context. |
| ADR-15 -> ADR structure test | ADR auto-discovery enforces required structural fields and decision identifiers. | Repo-local markdown structure. |
| ADR-15 -> decision registry | ADR-15 mints D-24 and must not reuse an existing decision number. | Project decision namespace. |

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-3-01 | Tampering | `decisions/file-inventory.json` row edit | mitigate | `03-01-SUMMARY.md` records JSON parse verification and the `tests/ingest-docs.test.cjs` row ownership; focused `node --test tests/ingest-docs.test.cjs` passed. | closed |
| T-3-02 | Information disclosure | `tests/eval-review.test.cjs` SDK fallback assertion | mitigate | `tests/eval-review.test.cjs` asserts both `oto-sdk` fallback patterns with `2>/dev/null`; focused eval-review test passed. | closed |
| T-3-03 | Repudiation / silent test pass | Stale upstream `import command` block | mitigate | Absence check for `import command adopts shared conflict-engine` returned no hits; focused ingest-docs test passed. | closed |
| T-3-04 | Spoofing | False-pass classifier `Write` assertion | mitigate | `tests/ingest-docs.test.cjs` asserts `oto-doc-classifier` declares read-only tools and rejects `Write`; focused ingest-docs test passed. | closed |
| T-3-05 | Tampering | `EXPECTED_AGENTS` count drift | mitigate | `oto/bin/lib/model-profiles.cjs` exports 26 expected agents including the three restored agents; direct Node check returned `EXPECTED_AGENTS_OK 26`. | closed |
| T-3-06 | Repudiation / silent pass | Bash assertion without `exit 1` | mitigate | `.github/workflows/install-smoke.yml` restored-agent loops use `set -euo pipefail`, explicit missing-file branches, and `exit 1`; static workflow review confirmed both tarball and unpacked install jobs. | closed |
| T-3-07 | Information disclosure | `mktemp -d` temp dirs leak between runners | accept | Accepted risk: CI smoke uses temporary dirs, removes them with `rm -rf`, and carries no PII or secrets in install fixtures. | closed |
| T-3-08 | Tampering | Codex `sandbox_mode` regression | mitigate | `scripts/install-smoke.cjs`, `.github/workflows/install-smoke.yml`, and Codex parity tests assert classifier/auditor `read-only` and synthesizer `workspace-write`. | closed |
| T-3-09 | Tampering | Codex `.toml` sandbox mode drift | mitigate | `node --test tests/phase-08-smoke-codex.integration.test.cjs` passed with exact sandbox mode assertions for the three restored agents. | closed |
| T-3-10 | Spoofing | Codex installs `commands/oto/<name>.md` accidentally | mitigate | Codex parity test asserts `skills/oto-ingest-docs/SKILL.md` and `skills/oto-eval-review/SKILL.md` install, and `commands/oto/*` paths do not. | closed |
| T-3-11 | Repudiation | Missing Codex/Gemini CLI on CI runner causes silent skip | accept | Accepted risk: in-suite live invocation may self-skip, but install-smoke CI runs `oto install` directly and the non-live runtime parity assertions still run. | closed |
| T-3-12 | Tampering | Gemini file extension drift (`.md` vs `.toml`) | mitigate | `node --test tests/phase-08-smoke-gemini.integration.test.cjs` passed; PRTY-01 asserts Gemini command `.md` files and restored agent `.md` files install. | closed |
| T-3-W3 | Repudiation | Plan 03 regression check races Plan 02's `EXPECTED_AGENTS` bump | mitigate | Plan 03 includes `depends_on: ["03-02"]`, and the direct Node precondition check confirmed `EXPECTED_AGENTS_OK 26`. | closed |
| T-3-13 | Spoofing | Misnaming a restored agent in ADR-15 | mitigate | ADR-15 names `oto-doc-classifier`, `oto-doc-synthesizer`, and `oto-eval-auditor`; ADR structure test passed. | closed |
| T-3-14 | Repudiation | Forgetting to enumerate all seven still-dropped agents | mitigate | ADR-15 enumerates all seven remaining dropped agents and cites AGNT-DEFER-01; content review confirmed all seven names. | closed |
| T-3-15 | Information disclosure | Quoting nonexistent ADR-07 wording | mitigate | ADR-15 does not contain the forbidden `reactivation criterion` wording; absence check returned no hits. | closed |
| T-3-16 | Tampering | Wrong sandbox mode recorded in ADR-15 | mitigate | ADR-15 records classifier/auditor `read-only` and synthesizer `workspace-write`; Codex parity test verifies shipped TOML values. | closed |

Status values: `open` or `closed`.
Disposition values: `mitigate`, `accept`, or `transfer`.

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-03-01 | T-3-07 | CI temp-dir residue is bounded by ephemeral runners, explicit cleanup, and fixture-only data. | Phase 03 plan disposition | 2026-05-18 |
| AR-03-02 | T-3-11 | Runtime live probes may skip when local CLIs are missing or too old, but non-live install assertions and CI install-smoke remain load-bearing. | Phase 03 plan disposition | 2026-05-18 |

Accepted risks do not resurface in future audit runs unless the underlying assumptions change.

## Security Audit 2026-05-18

| Metric | Count |
|--------|-------|
| Threats found | 16 |
| Closed | 16 |
| Open | 0 |

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-05-18 | 16 | 16 | 0 | Codex |

## Verification Evidence

- `node --test tests/ingest-docs.test.cjs` - passed, 37 pass, 0 fail.
- `node --test tests/eval-review.test.cjs` - passed, 12 pass, 0 fail.
- `node --test tests/phase-04-mr01-install-smoke.test.cjs` - passed, 1 pass, 0 fail.
- `node --test tests/phase-08-smoke-codex.integration.test.cjs` - passed, 5 pass, 0 fail.
- `node --test tests/phase-08-smoke-gemini.integration.test.cjs` - passed, 4 pass, 1 skip, 0 fail.
- `node --test tests/phase-01-adr-structure.test.cjs` - passed, 3 pass, 0 fail.
- `node -e "const a=require('./oto/bin/lib/model-profiles.cjs').EXPECTED_AGENTS; ..."` - passed, `EXPECTED_AGENTS_OK 26`.
- `rg -q "import command adopts shared conflict-engine" tests/ingest-docs.test.cjs` - exited 1 as expected; stale upstream block absent.
- `rg -q "ADR-07-agent-rationalization|reactivation criterion" decisions/ADR-15-restore-doc-and-eval-agents.md` - exited 1 as expected; forbidden wording absent.

## Sign-Off

- [x] All threats have a disposition (`mitigate`, `accept`, or `transfer`).
- [x] Accepted risks documented in Accepted Risks Log.
- [x] `threats_open: 0` confirmed.
- [x] `status: verified` set in frontmatter.

Approval: verified 2026-05-18
