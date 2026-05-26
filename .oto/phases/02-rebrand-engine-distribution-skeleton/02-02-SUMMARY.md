---
phase: 02-rebrand-engine-distribution-skeleton
plan: 02
subsystem: rebrand-rules
tags: [rebrand, walker, schema, node-test, zero-deps]
requires:
  - phase: 01-inventory-architecture-decisions
    provides: rename-map schema, allowlist inputs, rule taxonomy
  - phase: 02-01-distribution-skeleton
    provides: package skeleton and Node test harness
provides:
  - Hand-rolled schema validator in engine library
  - Recursive walker with allowlist and binary skips
  - Seven per-rule rebrand modules with focused tests
  - Synthetic fixture corpus for rule edge cases
affects: [phase-02-03-engine-cli, phase-04-core-port, phase-09-upstream-sync]
tech-stack:
  added: []
  patterns: [CommonJS modules, node:test, extensionless require shims]
key-files:
  created:
    - scripts/rebrand/lib/validate-schema.cjs
    - scripts/rebrand/lib/validate-schema.js
    - scripts/rebrand/lib/walker.cjs
    - scripts/rebrand/lib/rules/identifier.cjs
    - scripts/rebrand/lib/rules/path.cjs
    - scripts/rebrand/lib/rules/command.cjs
    - scripts/rebrand/lib/rules/skill_ns.cjs
    - scripts/rebrand/lib/rules/package.cjs
    - scripts/rebrand/lib/rules/url.cjs
    - scripts/rebrand/lib/rules/env_var.cjs
    - tests/fixtures/rebrand/
    - tests/phase-02-schema-validate.test.cjs
    - tests/phase-02-walker.test.cjs
    - tests/phase-02-rules-*.test.cjs
  modified:
    - schema/rename-map.json
    - tests/helpers/load-schema.cjs
    - .planning/ROADMAP.md
    - .planning/STATE.md
    - .planning/phases/02-rebrand-engine-distribution-skeleton/02-VALIDATION.md
key-decisions:
  - "Schema now requires deprecated_drop, matching the Phase 2 D-16 contract."
  - "Canonical implementation files remain .cjs; tiny .js shims support extensionless require() probes and future callers."
  - "Rule modules stay isolated and zero-dependency so Phase 02-03 can compose them without changing their matching semantics."
patterns-established:
  - "Rule modules export classify/apply/listMatches; package rules also export applies; path rules also export applyToFilename."
  - "Walker yields allowlisted files with an allowlisted flag instead of silently dropping them."
requirements-completed: [REB-01, REB-03]
duration: 15 min
completed: 2026-04-28
---

# Phase 02 Plan 02: Rebrand Rules and Walker Summary

**Rule-typed rebrand primitives, schema validation, walker contract, and fixture-backed unit coverage**

## Performance

- **Duration:** 15 min
- **Completed:** 2026-04-28
- **Tasks:** 3
- **Test files:** 10 total in the wave regression command, including Phase 1 schema regression

## Accomplishments

- Moved the JSON Schema validator into `scripts/rebrand/lib/validate-schema.cjs` and made `tests/helpers/load-schema.cjs` a thin re-export.
- Fixed schema parity by requiring `deprecated_drop` at the top level.
- Added `scripts/rebrand/lib/walker.cjs` with allowlist bucketing, binary/NUL skips, file-class lookup, scratch-dir skips, and `fs.readdirSync({ recursive: true })`.
- Added nine synthetic rebrand fixtures covering identifiers, paths, commands, namespaces, licenses, URLs, env vars, hook version tokens, multi-rule lines, and package metadata.
- Added seven rule modules: identifier, path, command, skill namespace, package, URL, and env var.
- Added extensionless `.js` shims beside `.cjs` modules for Node resolver compatibility.
- Added focused `node:test` coverage for every rule module plus walker/schema tests.

## Task Commits

1. **Task 1: validator, schema parity, walker, fixtures** - `36e76d8` (feat)
2. **Task 2: identifier/path/command/skill_ns rules** - `a9311a5` (feat)
3. **Task 3: package/url/env_var rules** - `c77ce69` (feat)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Schema did not require `deprecated_drop`**
- **Found during:** Task 1 startup
- **Issue:** `schema/rename-map.json` defined `deprecated_drop` but omitted it from the top-level `required` list, while the plan and D-16 require validator parity.
- **Fix:** Added `deprecated_drop` to the schema required list and added a negative schema-validation test.
- **Verification:** `node -e` probe deleting `deprecated_drop` returned invalid; Phase 1 rename-map regression stayed green.
- **Committed in:** `36e76d8`

**2. [Rule 3 - Blocking] Extensionless `require()` probes do not resolve `.cjs` files**
- **Found during:** Task 1 and Task 2 acceptance probes
- **Issue:** Node does not resolve `.cjs` when a caller uses `require('./path/to/module')`.
- **Fix:** Added tiny `.js` shims that re-export the canonical `.cjs` files.
- **Verification:** Extensionless probes for validator, identifier, URL, and env-var modules passed.
- **Committed in:** `36e76d8`, `a9311a5`, `c77ce69`

## Self-Check: PASSED

- `node --test --test-concurrency=4 tests/phase-02-walker.test.cjs tests/phase-02-schema-validate.test.cjs tests/phase-02-rules-identifier.test.cjs tests/phase-02-rules-path.test.cjs tests/phase-02-rules-command.test.cjs tests/phase-02-rules-skill_ns.test.cjs tests/phase-02-rules-package.test.cjs tests/phase-02-rules-url.test.cjs tests/phase-02-rules-env_var.test.cjs tests/phase-01-rename-map.test.cjs` passed.
- Pitfall 1 substring regression (`stagsd gsdfoo megsd`) produced zero replacements.
- D-14 owner substitution produced `github.com/OTOJulian/oto-hybrid-framework` by default and honored an override owner.
- Walker source uses `fs.readdirSync({ recursive: true })` and does not use `fs.promises.glob`.

## Next Phase Readiness

Plan 02-03 can now compose the rule modules into `engine.cjs`, `manifest.cjs`, report generation, and `scripts/rebrand.cjs`. The remaining Phase 2 risk is integration behavior against the real `foundation-frameworks/` tree, especially zero unclassified matches and no source-tree mutation.

---
*Phase: 02-rebrand-engine-distribution-skeleton*
*Completed: 2026-04-28*
