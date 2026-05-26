---
phase: 13-dogfood-migration-to-oto
status: passed
verified_at: 2026-05-26T15:58:30Z
requirements:
  DOG-01: passed
  DOG-02: passed
  DOG-03: passed
checks:
  automated: 7
  manual: 1
  failed: 0
---

# Phase 13 Verification: Dogfood Migration to `.oto/`

## Verdict

Phase 13 passed. This repo now manages itself from `.oto/`, `oto-sdk` and the local CJS tool resolve `.oto/` with no path override, and active live references no longer point agents at the removed `.planning/` root.

## Requirement Results

### DOG-01: Planning artifacts live under `.oto/` with history preserved

Status: passed

Evidence:

- `test -d .oto && test ! -d .planning` returned `cutover-ok`.
- `git log --follow --oneline -- .oto/ROADMAP.md` shows history before and after the rename, including the pure rename commit `f415007`.
- `.oto/STATE.md` declares `oto_state_version`, and the guard test enforces that `gsd_state_version` is absent.
- Plan 13-02 summary records the pure `git mv .planning .oto` commit and operator approval of the rename-only diff.

### DOG-02: oto commands operate on `.oto/` with no manual path override

Status: passed

Evidence:

- `realpath "$(which oto-sdk)"` resolved to `/Users/Julian/Desktop/oto-hybrid-framework/bin/oto-sdk.js`.
- `OTO_PROJECT` and `OTO_WORKSTREAM` were empty during the D-08 live probe.
- `oto-sdk query init.plan-phase 13` returned:
  - `phase_dir: ".oto/phases/13-dogfood-migration-to-oto"`
  - `state_path: ".oto/STATE.md"`
  - `roadmap_path: ".oto/ROADMAP.md"`
  - `requirements_path: ".oto/REQUIREMENTS.md"`
  - `context_path: ".oto/phases/13-dogfood-migration-to-oto/13-CONTEXT.md"`
- `oto-sdk query phases.list` returned the moved phase directory list including `13-dogfood-migration-to-oto`.
- `node oto/bin/lib/oto-tools.cjs init plan-phase 13` returned equivalent `.oto/...` paths.
- Operator approved the live-probe output in chat.

### DOG-03: Active self-references no longer point at stale `.planning/`

Status: passed

Evidence:

- `CLAUDE.md`, `AGENTS.md`, `GEMINI.md`, and `oto/templates/instruction-file.md` now present `OTO Workflow Enforcement` and `/oto-*` entry points.
- `rg` found no `.planning/` references in the live instruction files, `.oto/config.json`, or the instruction source template.
- Active path citations in `.oto/STATE.md`, `.oto/ROADMAP.md`, `.oto/PROJECT.md`, and `.oto/MILESTONES.md` were rewritten to `.oto/` during Plan 13-03.
- Remaining `.planning/` text in `.oto/STATE.md`, `.oto/ROADMAP.md`, `.oto/PROJECT.md`, and `.oto/REQUIREMENTS.md` is requirement, historical, or resolver-contract prose preserved by the D-10 allowlist rules. It is not a live path an agent should open for this repo.
- The new guard test intentionally mentions `.planning/` only to assert its absence.

## Automated Checks

```bash
node --test tests/13-oto-root-guard.test.cjs
```

Result:

```text
# tests 4
# pass 4
# fail 0
```

```bash
npm test
```

Result from the escalated rerun after the sandboxed install-smoke section hung:

```text
1..570
# tests 628
# suites 12
# pass 627
# fail 0
# cancelled 0
# skipped 1
# todo 0
```

```bash
oto-sdk query verify.schema-drift 13
```

Result:

```json
{
  "drift_detected": false,
  "blocking": false,
  "schema_files": [],
  "orms": [],
  "unpushed_orms": [],
  "skipped": false
}
```

## Review Gate

`13-REVIEW.md` is present with `status: clean` and `findings.total: 0`.

## Human Verification

The D-08 live-probe checkpoint required human review. The operator approved the output after confirming:

- repo-local `oto-sdk` binary identity,
- `.oto/` path resolution in SDK and CJS outputs,
- no `.planning/` directory,
- no `OTO_PROJECT` or `OTO_WORKSTREAM` override.

## Issues and Deviations

- `npm test` rewrote generated rebrand dry-run reports; they were restored after verification to keep commits scoped.
- The Plan 13-04 CJS probe text named `oto/bin/oto-tools.cjs`; the actual local path is `oto/bin/lib/oto-tools.cjs`, which was used for the passing probe.

## Conclusion

All Phase 13 success criteria are met:

1. Planning artifacts live under `.oto/` and `.planning/` is gone.
2. Tooling resolves `.oto/` without path overrides.
3. Active self-references point to `.oto/` or `/oto-*`.
4. The migration is a clean cutover with a durable regression guard in the standard test suite.
