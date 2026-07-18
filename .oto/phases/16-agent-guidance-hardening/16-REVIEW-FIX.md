---
phase: 16-agent-guidance-hardening
fixed_at: 2026-07-18T14:20:31Z
review_path: .oto/phases/16-agent-guidance-hardening/16-REVIEW.md
iteration: 1
findings_in_scope: 1
fixed: 1
skipped: 0
status: all_fixed
---

# Phase 16: WR-03 Dispositions-Authorized Fix Report

**Fixed at:** 2026-07-18T14:20:31Z
**Source review:** `.oto/phases/16-agent-guidance-hardening/16-REVIEW.md`
**Iteration:** 1
**Authorization:** Developer-approved WR-03 FIX disposition; bounded closure, not a third gap cycle

## Summary

- Findings in scope: 1
- Fixed: 1
- Skipped: 0
- WR-02 remains DEFER and was not reopened.

## Fixed Issue

### WR-03: Markdown body provenance could authorize destructive deletion acceptance

**Files modified:** `tests/16-07-sync-all-provenance.test.cjs`, `bin/lib/sync-accept.cjs`

**RED commit:** `407baa983750dfa2a86b309934325357e5216a9b`

Added a real shipped-CLI regression with duplicate GSD/Superpowers inventory rows, no valid `upstream` field in the delimited YAML frontmatter, and an exact Markdown body line `upstream: superpowers`. The test snapshots inventory, legacy sidecar, and local target bytes before invocation and requires nonzero refusal plus byte-for-byte preservation of all three mutation surfaces. The pre-fix run failed as expected:

```text
$ node --test --test-name-pattern='WR-03' tests/16-07-sync-all-provenance.test.cjs
not ok 1 - WR-03: legacy flat deletion ignores body provenance and refuses before mutation
error: Expected "actual" to be strictly unequal to: 0
expected: 0
actual: 0
1 test, 0 passed, 1 failed
```

The existing real-CLI control `legacy flat deletion sidecar selects duplicate inventory provenance from its validated header` was retained to prove that a valid frontmatter `upstream: superpowers` field still authorizes the intended acceptance.

**GREEN commit:** `7a7acb7334330af39af48d0dcfdd501bac98f592`

Changed only `acceptDeletion` provenance extraction: it now applies the existing strict `upstream: gsd|superpowers` matcher to `HEADER_RE`'s delimited YAML frontmatter capture instead of the complete sidecar. With no valid header provenance, duplicate inventory rows follow the existing fail-before-mutation refusal path; Markdown body content cannot supply provenance. Explicit upstream selection, valid-header selection, and the unique-row legacy fallback are unchanged.

## Verification

```text
$ node --test tests/16-07-sync-all-provenance.test.cjs
1..12
# tests 12
# pass 12
# fail 0
```

```text
$ node --test tests/16-07-sync-all-provenance.test.cjs tests/phase-09-accept-helper.test.cjs tests/phase-09-cli.integration.test.cjs
1..26
# tests 26
# pass 26
# fail 0
```

- `node --check bin/lib/sync-accept.cjs`: passed.
- `git diff --check`: passed.
- RED commit changed only `tests/16-07-sync-all-provenance.test.cjs`.
- GREEN commit changed only `bin/lib/sync-accept.cjs`.
- Unrelated untracked `INTERVIEW-BRIEF-oto.md` remained untouched.

## Skipped Issues

None. WR-03 was the only finding in scope. WR-02 remains developer-approved DEFER.

---

_Fixed: 2026-07-18T14:20:31Z_

_Fixer: Codex (oto-code-fixer)_

_Iteration: 1_
