---
status: issues_found
phase: 01
phase_name: inventory-architecture-decisions
depth: standard
files_reviewed: 32
files_reviewed_list:
  - decisions/ADR-01-state-root.md
  - decisions/ADR-02-env-var-prefix.md
  - decisions/ADR-03-skill-vs-command.md
  - decisions/ADR-04-sessionstart.md
  - decisions/ADR-05-agent-collisions.md
  - decisions/ADR-06-skill-namespace.md
  - decisions/ADR-07-agent-trim.md
  - decisions/ADR-08-inventory-format.md
  - decisions/ADR-09-adr-format.md
  - decisions/ADR-10-rename-map-schema.md
  - decisions/ADR-11-distribution.md
  - decisions/ADR-12-sdk-strategy.md
  - decisions/ADR-13-license-attribution.md
  - decisions/ADR-14-inventory-scope.md
  - decisions/skill-vs-command.md
  - decisions/agent-audit.md
  - tests/helpers/load-schema.cjs
  - tests/helpers/load-schema.js
  - tests/phase-01-adr-structure.test.cjs
  - tests/phase-01-agent-audit.test.cjs
  - tests/phase-01-decisions-dir.test.cjs
  - schema/file-inventory.json
  - tests/phase-01-inventory.test.cjs
  - scripts/gen-inventory.cjs
  - decisions/file-inventory.json
  - decisions/file-inventory.md
  - schema/rename-map.json
  - tests/phase-01-rename-map.test.cjs
  - tests/phase-01-licenses.test.cjs
  - rename-map.json
  - LICENSE
  - THIRD-PARTY-LICENSES.md
findings:
  critical: 0
  warning: 2
  info: 0
  total: 2
---

# Phase 01: Code Review Report

**Reviewed:** 2026-04-27T23:19:40Z
**Depth:** standard
**Files Reviewed:** 32
**Status:** issues_found

## Summary

Reviewed the Phase 01 ADRs, decision references, schema contracts, generated inventory outputs, inventory generator, rename map, license artifacts, and Phase 01 tests. The ADR structure, agent audit, generated inventory count, JSON parsing, license assertions, and current rename-map tests all pass.

Two warning-level schema/contract issues remain. Both are maintainability and downstream correctness risks: current tests pass, but a future consumer that trusts only the machine-readable contracts can silently accept incomplete rename rules or mis-handle consolidated license targets.

Verification run:

```text
node --test tests/phase-01-*.test.cjs
# tests 34
# pass 34
# fail 0
```

## Warnings

### WR-01: Rename-map schema does not require the seven rule families

**File:** `schema/rename-map.json:9`

**Issue:** `rules` declares `identifier`, `path`, `command`, `skill_ns`, `package`, `url`, and `env_var` properties, but does not require any of them or require non-empty arrays. `tests/phase-01-rename-map.test.cjs:29` catches this for the current checked-in `rename-map.json`, but Phase 2's rebrand engine is supposed to validate the map before applying transformations. If that engine trusts the schema alone, a map missing `command` or `env_var` still validates and can skip an entire rename class.

I confirmed this by deleting `rules.command` in-memory and validating with `tests/helpers/load-schema`; validation returned `valid: true`.

**Fix:** Move the invariant into `schema/rename-map.json` so every validator sees it, and keep the test as a regression check:

```json
"rules": {
  "type": "object",
  "required": ["identifier", "path", "command", "skill_ns", "package", "url", "env_var"],
  "additionalProperties": false,
  "properties": {
    "identifier": { "type": "array", "minItems": 1, "items": { "$ref": "#/$defs/identifier_rule" } },
    "path": { "type": "array", "minItems": 1, "items": { "$ref": "#/$defs/path_rule" } },
    "command": { "type": "array", "minItems": 1, "items": { "$ref": "#/$defs/command_rule" } },
    "skill_ns": { "type": "array", "minItems": 1, "items": { "$ref": "#/$defs/skill_ns_rule" } },
    "package": { "type": "array", "minItems": 1, "items": { "$ref": "#/$defs/package_rule" } },
    "url": { "type": "array", "minItems": 1, "items": { "$ref": "#/$defs/url_rule" } },
    "env_var": { "type": "array", "minItems": 1, "items": { "$ref": "#/$defs/env_var_rule" } }
  }
}
```

Also extend `tests/helpers/load-schema.cjs` to support `minItems`, otherwise the local validator will ignore that part of the schema.

### WR-02: Consolidated license inventory entries are marked as independent keeps with a non-path target

**File:** `scripts/gen-inventory.cjs:68`

**Issue:** Both upstream `LICENSE` files are emitted as `verdict: "keep"` with `target_path: "THIRD-PARTY-LICENSES.md (consolidated)"`, producing duplicate KEEP targets in `decisions/file-inventory.json:316` and `decisions/file-inventory.json:9372`. This is not a real target path because it includes the explanatory suffix ` (consolidated)`, and `keep` implies each source maps independently. A downstream bulk porter that consumes `decisions/file-inventory.json` can treat both entries as copy operations to the same pseudo-path or miss that these files must be merged into the existing attribution file.

**Fix:** Model the upstream license files as an explicit consolidation contract. Use a real target path and `merge_source_files`, for example:

```js
return {
  verdict: 'merge',
  reason: 'Consolidated into THIRD-PARTY-LICENSES.md per ADR-13',
  target_path: 'THIRD-PARTY-LICENSES.md',
  rebrand_required: false,
  merge_source_files: [
    'foundation-frameworks/get-shit-done-main/LICENSE',
    'foundation-frameworks/superpowers-main/LICENSE',
  ],
  phase_owner: 1,
  category: 'license',
};
```

If each upstream license row must remain source-specific, keep `target_path: 'THIRD-PARTY-LICENSES.md'` and add a separate machine-readable `consolidation_group` field after updating `schema/file-inventory.json`; do not encode notes inside `target_path`.

## Executor Resolution

Both warning-level findings were fixed after review:

- `WR-01`: `schema/rename-map.json` now requires all seven rule families with `minItems: 1`; the local zero-dependency schema helper supports `minItems`; `tests/phase-01-rename-map.test.cjs` now rejects missing or empty rule families.
- `WR-02`: `scripts/gen-inventory.cjs` now emits upstream license files as explicit `merge` entries targeting the real path `THIRD-PARTY-LICENSES.md`; `decisions/file-inventory.json` and `decisions/file-inventory.md` were regenerated; `tests/phase-01-inventory.test.cjs` now asserts the license consolidation contract.

Resolution verification:

```text
node --test tests/phase-01-*.test.cjs
# tests 36
# pass 36
# fail 0
```

## Residual Risks And Test Gaps

- No unresolved critical or warning findings remain after executor resolution. The review frontmatter preserves the original finding count for audit history.
- `scripts/gen-inventory.cjs` was rerun after the license consolidation fix; generated files were validated by tests and targeted consistency checks.
- Unrelated local changes were present before review (`.planning/config.json`, `.DS_Store`, `foundation-frameworks/`). They were left untouched.

---

_Reviewed: 2026-04-27T23:19:40Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
