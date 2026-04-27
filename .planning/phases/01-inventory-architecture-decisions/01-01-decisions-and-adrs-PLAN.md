---
phase: 01-inventory-architecture-decisions
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - tests/phase-01-adr-structure.test.cjs
  - tests/phase-01-decisions-dir.test.cjs
  - tests/phase-01-agent-audit.test.cjs
  - tests/helpers/load-schema.cjs
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
autonomous: true
requirements_addressed:
  - ARCH-01
  - ARCH-02
  - ARCH-03
  - ARCH-04
  - ARCH-05
  - AGT-01
  - DOC-05
validation_refs:
  - 01-VALIDATION.md task 1-01-W0-01
  - 01-VALIDATION.md task 1-01-W0-02
  - 01-VALIDATION.md task 1-02-W0-02
must_haves:
  truths:
    - "Every architectural decision in CONTEXT.md (D-01..D-23) is documented in exactly one numbered ADR file in decisions/"
    - "ADR files all share the same six-section ADR template (Status, Date, Context, Decision, Rationale, Consequences) and are grep-verifiable as such"
    - "decisions/skill-vs-command.md contains a 14-row overlap routing table plus a v1-active callout (Q2 option c)"
    - "decisions/agent-audit.md lists all 33 GSD agents with explicit verdict (KEEP/DROP/MERGE) and rationale per agent, totaling 23 keeps + 10 drops"
    - "Test scaffolding (3 test files + 1 helper) exists in tests/ and runs to red-then-green as ADRs are written"
  artifacts:
    - path: "decisions/ADR-01-state-root.md"
      provides: "ARCH-01 — locks `.oto/` as canonical state root, `.planning/` → `.oto/` is a path rule"
      contains: "## Decision"
    - path: "decisions/ADR-02-env-var-prefix.md"
      provides: "Locks GSD_* → OTO_* prefix rebrand, documents 37-name env-var surface"
      contains: "GSD_"
    - path: "decisions/ADR-03-skill-vs-command.md"
      provides: "ARCH-02 — skill-vs-command routing policy"
      contains: "## Decision"
    - path: "decisions/ADR-04-sessionstart.md"
      provides: "ARCH-03 — single consolidated SessionStart hook"
      contains: "## Decision"
    - path: "decisions/ADR-05-agent-collisions.md"
      provides: "ARCH-04 — drop Superpowers' code-reviewer in favor of oto-code-reviewer"
      contains: "code-reviewer"
    - path: "decisions/ADR-06-skill-namespace.md"
      provides: "ARCH-05 — internal namespace `oto:<skill-name>`"
      contains: "oto:"
    - path: "decisions/ADR-07-agent-trim.md"
      provides: "AGT-01 trim depth — 23 keeps + 10 drops"
      contains: "23"
    - path: "decisions/ADR-08-inventory-format.md"
      provides: "ARCH-06 file-inventory.json + .md format"
      contains: "## Decision"
    - path: "decisions/ADR-09-adr-format.md"
      provides: "DOC-05 — the ADR template itself"
      contains: "Status"
    - path: "decisions/ADR-10-rename-map-schema.md"
      provides: "REB-02 — rename-map.json schema reference"
      contains: "## Decision"
    - path: "decisions/ADR-11-distribution.md"
      provides: "GitHub owner + bin command"
      contains: "{{GITHUB_OWNER}}"
    - path: "decisions/ADR-12-sdk-strategy.md"
      provides: "Drop SDK from v1, fork CJS path; v2 deferral"
      contains: "Deferred"
    - path: "decisions/ADR-13-license-attribution.md"
      provides: "FND-06 — LICENSE + THIRD-PARTY-LICENSES.md policy"
      contains: "Lex Christopherson"
    - path: "decisions/ADR-14-inventory-scope.md"
      provides: "D-23 inventory scope (translated docs, OpenCode, deprecation policy)"
      contains: "## Decision"
    - path: "decisions/skill-vs-command.md"
      provides: "Operational overlap-routing reference (14-row table + v1-active callout)"
      min_lines: 30
    - path: "decisions/agent-audit.md"
      provides: "AGT-01 deliverable — per-agent verdict table for all 33 GSD agents"
      contains: "gsd-planner"
    - path: "tests/phase-01-adr-structure.test.cjs"
      provides: "Validates each ADR file has all 6 required sections"
      min_lines: 30
    - path: "tests/phase-01-decisions-dir.test.cjs"
      provides: "Validates decisions/ has ≥18 files"
      min_lines: 15
    - path: "tests/phase-01-agent-audit.test.cjs"
      provides: "Validates all 33 agent names + verdict per row"
      min_lines: 25
    - path: "tests/helpers/load-schema.cjs"
      provides: "Hand-rolled zero-dep JSON validator (used by Plans 02/03)"
      min_lines: 40
  key_links:
    - from: "Each ADR file"
      to: "the canonical D-XX entry in 01-CONTEXT.md it implements"
      via: "explicit `Implements: D-NN[, D-NN]` line in Context section"
      pattern: "Implements: D-"
    - from: "decisions/skill-vs-command.md"
      to: "ADR-03 + ADR-06"
      via: "explicit cross-reference link"
      pattern: "ADR-03"
    - from: "decisions/agent-audit.md"
      to: "ADR-05 (collision) + ADR-07 (trim)"
      via: "cross-reference + verdict counts match ADR-07"
      pattern: "ADR-07"
    - from: "tests/phase-01-adr-structure.test.cjs"
      to: "every decisions/ADR-NN-*.md file"
      via: "fs.readdirSync + per-file regex assertions"
      pattern: "Status:|## Status"
threat_model:
  trust_boundaries: []
  threats:
    - id: "T-01-01"
      category: "Repudiation"
      component: "decisions/ADR-13-license-attribution.md + agent-audit.md"
      disposition: "mitigate"
      mitigation: "ADR-13 names Lex Christopherson + Jesse Vincent verbatim; agent-audit.md cross-references ADR-05 collision verdict; future grep tests in Plan 03 verify both copyright lines persist."
---

<objective>
Lock all 23 architectural decisions (D-01..D-23) from CONTEXT.md as 14 numbered ADR files, plus the two non-ADR routing/audit reference documents. This is the contract every downstream phase reads — Phases 2–10 are forbidden from re-litigating these decisions.

Purpose: ARCH-01..05, AGT-01 (the audit table itself), and DOC-05 are all "lock decisions in writing" requirements. By the end of this plan there is exactly one searchable file per decision cluster, every ADR has the same six-section shape, and an automated grep test enforces that shape.

Output:
- 14 ADR files in decisions/ (ADR-01..ADR-14)
- decisions/skill-vs-command.md (operational reference, 14-row overlap table + v1 callout)
- decisions/agent-audit.md (33-row table — all GSD agents with verdict + rationale)
- 3 test files + 1 helper that enforce ADR structure and validate the agent audit
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md
@.planning/STATE.md
@.planning/phases/01-inventory-architecture-decisions/01-CONTEXT.md
@.planning/phases/01-inventory-architecture-decisions/01-RESEARCH.md
@.planning/phases/01-inventory-architecture-decisions/01-VALIDATION.md
@CLAUDE.md

<interfaces>
<!-- The ADR template is the contract every decision file must satisfy. -->
<!-- This is what tests/phase-01-adr-structure.test.cjs grep-validates. -->

ADR template (per D-14):

```
# ADR-NN: <Title>

Status: Accepted | Deferred | Superseded by ADR-MM
Date: 2026-04-27
Implements: D-NN[, D-NN]

## Context

<why this decision is needed, what's at stake>

## Decision

<the chosen option, stated as a fact>

## Rationale

<why this option over alternatives>

## Consequences

<what this commits us to, what costs we accept>
```

Required regex patterns the structure test enforces (per file):
- `^# ADR-\d{2}: ` (top-line)
- `^Status: (Accepted|Deferred|Superseded by ADR-\d{2})$`
- `^Date: \d{4}-\d{2}-\d{2}$`
- `^Implements: D-\d{2}` (at least one D-NN reference)
- `^## Context$`
- `^## Decision$`
- `^## Rationale$`
- `^## Consequences$`

Final ADR list (14 ADRs — collapsing SDK Strategy + SDK Deferred into one ADR-12 per Q3):

| # | Slug | Title | D-XX | Status |
|---|------|-------|------|--------|
| 01 | state-root | State root: `.oto/` | D-01, D-02 | Accepted |
| 02 | env-var-prefix | Env-var prefix: `GSD_*` → `OTO_*` (full rebrand) | D-03, D-04 | Accepted |
| 03 | skill-vs-command | Skill-vs-command routing policy | D-05, D-06 | Accepted |
| 04 | sessionstart | Single consolidated SessionStart hook | D-08, D-09 | Accepted |
| 05 | agent-collisions | Drop Superpowers' code-reviewer; canonical-version policy | D-10, D-11 | Accepted |
| 06 | skill-namespace | Internal skill namespace `oto:<skill-name>` | D-07 | Accepted |
| 07 | agent-trim | Moderate trim — 23 retained agents | D-12 | Accepted |
| 08 | inventory-format | Dual-format file inventory (JSON SoT + MD index) | D-13 | Accepted |
| 09 | adr-format | Six-section ADR template | D-14 | Accepted |
| 10 | rename-map-schema | rename-map.json rule-typed schema | D-15 | Accepted |
| 11 | distribution | GitHub owner + bin name (`oto`) | D-16, D-17 | Accepted |
| 12 | sdk-strategy | Drop SDK from v1; v2 path documented | D-18, D-19 | Accepted |
| 13 | license-attribution | LICENSE (oto) + THIRD-PARTY-LICENSES.md | D-20, D-21, D-22 | Accepted |
| 14 | inventory-scope | Inventory scope + drop policy + deprecation handling | D-23 | Accepted |
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Wave 0 — Create ADR-structure test scaffolding + zero-dep JSON validator helper</name>
  <files>
    tests/phase-01-adr-structure.test.cjs,
    tests/phase-01-decisions-dir.test.cjs,
    tests/phase-01-agent-audit.test.cjs,
    tests/helpers/load-schema.cjs
  </files>
  <read_first>
    - .planning/phases/01-inventory-architecture-decisions/01-VALIDATION.md (Wave 0 Requirements §)
    - .planning/phases/01-inventory-architecture-decisions/01-RESEARCH.md §"Validation Architecture" (lines 757–805)
    - .planning/phases/01-inventory-architecture-decisions/01-CONTEXT.md §"Decision File Format (DOC-05)" (D-14)
    - CLAUDE.md §"Test framework: node:test (built-in, zero-deps)"
  </read_first>
  <behavior>
    - Test 1 (phase-01-adr-structure): for each `decisions/ADR-*.md`, the file MUST contain the patterns `^# ADR-\d{2}: `, `^Status: (Accepted|Deferred|Superseded by ADR-\d{2})$`, `^Date: \d{4}-\d{2}-\d{2}$`, `^Implements: D-\d{2}`, `^## Context$`, `^## Decision$`, `^## Rationale$`, `^## Consequences$`. Initially red — `decisions/` is empty.
    - Test 2 (phase-01-decisions-dir): asserts `decisions/` exists and has ≥18 files (14 ADRs + skill-vs-command.md + agent-audit.md + 2 inventory files from Plan 02). Initially red.
    - Test 3 (phase-01-agent-audit): asserts `decisions/agent-audit.md` exists, contains exactly 33 lines matching `^- \`gsd-[a-z-]+\`` (one per GSD agent), each line contains `KEEP|DROP|MERGE`, count of KEEP rows == 23, count of DROP rows == 10. Initially red.
    - Helper (load-schema.cjs): exports `validate(data, schema)` returning `{ valid: boolean, errors: string[] }`. Implements only the JSON-Schema subset used in this phase: `type`, `required`, `enum`, `pattern`, `const`, `properties.additionalProperties: false`, `items` ($ref resolved via `$defs`), and `allOf` with `if`/`then` clauses. Zero deps — no AJV.
  </behavior>
  <action>
Create exactly four files. All test files use Node 22+'s built-in `node:test` and `node:assert/strict`. No npm dependencies.

**File 1: `tests/helpers/load-schema.cjs`** (~80 LOC, exports `validate`):

```js
'use strict';
// Hand-rolled subset of JSON Schema 2020-12. Zero deps per CLAUDE.md.
// Supports: type, required, enum, pattern, const, properties+additionalProperties:false,
// items ($ref into $defs), allOf with if/then, integer min/max, array items, oneOf
// (string-or-object only, used by rename-map do_not_rename).

function resolveRef(ref, root) {
  if (!ref.startsWith('#/$defs/')) throw new Error(`Unsupported $ref: ${ref}`);
  const key = ref.slice('#/$defs/'.length);
  if (!root.$defs || !root.$defs[key]) throw new Error(`Missing $defs entry: ${key}`);
  return root.$defs[key];
}

function check(data, schema, root, path, errors) {
  if (!root) root = schema;
  if (schema.$ref) schema = resolveRef(schema.$ref, root);

  if (schema.const !== undefined && data !== schema.const) {
    errors.push(`${path}: expected const ${JSON.stringify(schema.const)}, got ${JSON.stringify(data)}`);
    return;
  }
  if (schema.enum && !schema.enum.includes(data)) {
    errors.push(`${path}: value ${JSON.stringify(data)} not in enum ${JSON.stringify(schema.enum)}`);
    return;
  }
  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    const actual = Array.isArray(data) ? 'array' : (data === null ? 'null' : typeof data);
    const okType = actual === 'number' && types.includes('integer') ? Number.isInteger(data) : types.includes(actual);
    if (!okType) {
      errors.push(`${path}: expected type ${types.join('|')}, got ${actual}`);
      return;
    }
  }
  if (schema.pattern && typeof data === 'string') {
    if (!new RegExp(schema.pattern).test(data)) errors.push(`${path}: pattern /${schema.pattern}/ failed for ${JSON.stringify(data)}`);
  }
  if (schema.minLength !== undefined && typeof data === 'string' && data.length < schema.minLength) {
    errors.push(`${path}: minLength ${schema.minLength} not met (length ${data.length})`);
  }
  if (schema.minimum !== undefined && typeof data === 'number' && data < schema.minimum) errors.push(`${path}: minimum ${schema.minimum} not met`);
  if (schema.maximum !== undefined && typeof data === 'number' && data > schema.maximum) errors.push(`${path}: maximum ${schema.maximum} exceeded`);

  if (schema.required && typeof data === 'object' && data !== null) {
    for (const key of schema.required) if (!(key in data)) errors.push(`${path}: missing required field "${key}"`);
  }
  if (schema.properties && typeof data === 'object' && data !== null && !Array.isArray(data)) {
    for (const [key, sub] of Object.entries(schema.properties)) {
      if (key in data) check(data[key], sub, root, `${path}.${key}`, errors);
    }
    if (schema.additionalProperties === false) {
      const allowed = new Set(Object.keys(schema.properties));
      for (const key of Object.keys(data)) if (!allowed.has(key)) errors.push(`${path}: additional property "${key}" not allowed`);
    }
  }
  if (schema.items && Array.isArray(data)) {
    data.forEach((el, i) => check(el, schema.items, root, `${path}[${i}]`, errors));
  }
  if (schema.oneOf) {
    const matches = schema.oneOf.filter(s => {
      const e = []; check(data, s, root, path, e); return e.length === 0;
    });
    if (matches.length !== 1) errors.push(`${path}: oneOf matched ${matches.length} schemas (expected 1)`);
  }
  if (schema.allOf) {
    for (const sub of schema.allOf) {
      if (sub.if && sub.then) {
        const condErrors = []; check(data, sub.if, root, path, condErrors);
        if (condErrors.length === 0) check(data, sub.then, root, path, errors);
      } else {
        check(data, sub, root, path, errors);
      }
    }
  }
}

function validate(data, schema) {
  const errors = [];
  check(data, schema, schema, '$', errors);
  return { valid: errors.length === 0, errors };
}

module.exports = { validate };
```

**File 2: `tests/phase-01-adr-structure.test.cjs`** (~50 LOC):

```js
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const DECISIONS_DIR = path.join(__dirname, '..', 'decisions');
const REQUIRED_PATTERNS = [
  /^# ADR-\d{2}: /m,
  /^Status: (Accepted|Deferred|Superseded by ADR-\d{2})$/m,
  /^Date: \d{4}-\d{2}-\d{2}$/m,
  /^Implements: D-\d{2}/m,
  /^## Context$/m,
  /^## Decision$/m,
  /^## Rationale$/m,
  /^## Consequences$/m,
];

test('decisions/ directory exists', () => {
  assert.ok(fs.existsSync(DECISIONS_DIR), `Expected ${DECISIONS_DIR} to exist`);
});

test('every ADR-NN-*.md has the 8 required structural patterns', () => {
  const files = fs.readdirSync(DECISIONS_DIR).filter(f => /^ADR-\d{2}-.*\.md$/.test(f));
  assert.ok(files.length >= 14, `Expected ≥14 ADR files, found ${files.length}`);
  for (const file of files) {
    const content = fs.readFileSync(path.join(DECISIONS_DIR, file), 'utf8');
    for (const pat of REQUIRED_PATTERNS) {
      assert.match(content, pat, `${file}: missing required pattern ${pat}`);
    }
  }
});

test('ADR numbers are sequential 01..14 with no gaps and no duplicates', () => {
  const files = fs.readdirSync(DECISIONS_DIR).filter(f => /^ADR-\d{2}-.*\.md$/.test(f)).sort();
  const numbers = files.map(f => parseInt(f.match(/^ADR-(\d{2})-/)[1], 10));
  for (let i = 0; i < 14; i++) assert.equal(numbers[i], i + 1, `ADR-${String(i+1).padStart(2,'0')} missing or out of order`);
});
```

**File 3: `tests/phase-01-decisions-dir.test.cjs`** (~25 LOC):

```js
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const DECISIONS_DIR = path.join(__dirname, '..', 'decisions');

test('decisions/ contains expected reference files', () => {
  assert.ok(fs.existsSync(path.join(DECISIONS_DIR, 'skill-vs-command.md')), 'skill-vs-command.md missing');
  assert.ok(fs.existsSync(path.join(DECISIONS_DIR, 'agent-audit.md')), 'agent-audit.md missing');
});

test('decisions/ has ≥18 files (14 ADRs + skill-vs-command.md + agent-audit.md + ≥2 inventory)', () => {
  const all = fs.readdirSync(DECISIONS_DIR);
  assert.ok(all.length >= 18, `Expected ≥18 files, found ${all.length}: ${all.join(', ')}`);
});
```

**File 4: `tests/phase-01-agent-audit.test.cjs`** (~45 LOC):

```js
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const AUDIT_FILE = path.join(__dirname, '..', 'decisions', 'agent-audit.md');
// Canonical 33 GSD agent names verified against foundation-frameworks/get-shit-done-main/agents/
const GSD_AGENTS = [
  'gsd-advisor-researcher','gsd-ai-researcher','gsd-assumptions-analyzer','gsd-code-fixer',
  'gsd-code-reviewer','gsd-codebase-mapper','gsd-debug-session-manager','gsd-debugger',
  'gsd-doc-classifier','gsd-doc-synthesizer','gsd-doc-verifier','gsd-doc-writer',
  'gsd-domain-researcher','gsd-eval-auditor','gsd-eval-planner','gsd-executor',
  'gsd-framework-selector','gsd-integration-checker','gsd-intel-updater','gsd-nyquist-auditor',
  'gsd-pattern-mapper','gsd-phase-researcher','gsd-plan-checker','gsd-planner',
  'gsd-project-researcher','gsd-research-synthesizer','gsd-roadmapper','gsd-security-auditor',
  'gsd-ui-auditor','gsd-ui-checker','gsd-ui-researcher','gsd-user-profiler','gsd-verifier',
];

test('agent-audit.md exists and references all 33 GSD agents', () => {
  assert.ok(fs.existsSync(AUDIT_FILE), 'agent-audit.md missing');
  const content = fs.readFileSync(AUDIT_FILE, 'utf8');
  for (const agent of GSD_AGENTS) {
    assert.match(content, new RegExp(`\\b${agent}\\b`), `agent-audit.md missing ${agent}`);
  }
});

test('agent-audit.md verdict counts: KEEP=23, DROP=10', () => {
  const content = fs.readFileSync(AUDIT_FILE, 'utf8');
  // Match table-row pattern: agent appears in a row with KEEP or DROP token after it
  const lines = content.split(/\r?\n/);
  let keep = 0, drop = 0;
  for (const line of lines) {
    const m = line.match(/^\|\s*`?gsd-[a-z-]+`?\s*\|\s*(KEEP|DROP|MERGE)\b/i)
            || line.match(/^- `gsd-[a-z-]+`.*\b(KEEP|DROP|MERGE)\b/i);
    if (m) { const v = m[1].toUpperCase(); if (v === 'KEEP') keep++; else if (v === 'DROP') drop++; }
  }
  assert.equal(keep, 23, `Expected 23 KEEP rows, got ${keep}`);
  assert.equal(drop, 10, `Expected 10 DROP rows, got ${drop}`);
});
```

After creating the 4 files, run `node --test tests/phase-01-adr-structure.test.cjs tests/phase-01-decisions-dir.test.cjs tests/phase-01-agent-audit.test.cjs` and confirm RED (decisions/ does not yet exist). Commit with message `test(01-01): add ADR-structure + agent-audit test scaffolding [Wave 0]`.
  </action>
  <verify>
    <automated>node --test tests/phase-01-adr-structure.test.cjs tests/phase-01-decisions-dir.test.cjs tests/phase-01-agent-audit.test.cjs 2>&1 | grep -E '# fail|# pass'</automated>
  </verify>
  <acceptance_criteria>
    - File `tests/helpers/load-schema.cjs` exists; `node -e "console.log(typeof require('./tests/helpers/load-schema').validate)"` prints `function`.
    - File `tests/phase-01-adr-structure.test.cjs` exists and has ≥30 lines (`wc -l < tests/phase-01-adr-structure.test.cjs` returns ≥30).
    - File `tests/phase-01-decisions-dir.test.cjs` exists and has ≥15 lines.
    - File `tests/phase-01-agent-audit.test.cjs` exists, contains all 33 strings of form `'gsd-<name>'` (verifiable via `grep -c "'gsd-" tests/phase-01-agent-audit.test.cjs` returning ≥33).
    - Running `node --test tests/phase-01-adr-structure.test.cjs` exits non-zero (RED — `decisions/` does not yet exist).
    - The four files require zero npm packages: `grep -E "require\\('[^./]" tests/phase-01-*.test.cjs tests/helpers/load-schema.cjs` returns only Node built-ins (`node:test`, `node:assert/strict`, `node:fs`, `node:path`).
  </acceptance_criteria>
  <done>Four test/helper files committed. ADR-structure test runs (RED). Helper exports a working `validate` function used by Plans 02 and 03.</done>
</task>

<task type="auto">
  <name>Task 2: Wave 1 — Write all 14 ADR files in decisions/</name>
  <files>
    decisions/ADR-01-state-root.md,
    decisions/ADR-02-env-var-prefix.md,
    decisions/ADR-03-skill-vs-command.md,
    decisions/ADR-04-sessionstart.md,
    decisions/ADR-05-agent-collisions.md,
    decisions/ADR-06-skill-namespace.md,
    decisions/ADR-07-agent-trim.md,
    decisions/ADR-08-inventory-format.md,
    decisions/ADR-09-adr-format.md,
    decisions/ADR-10-rename-map-schema.md,
    decisions/ADR-11-distribution.md,
    decisions/ADR-12-sdk-strategy.md,
    decisions/ADR-13-license-attribution.md,
    decisions/ADR-14-inventory-scope.md
  </files>
  <read_first>
    - .planning/phases/01-inventory-architecture-decisions/01-CONTEXT.md (the FULL `<decisions>` block — D-01..D-23, all locked)
    - .planning/phases/01-inventory-architecture-decisions/01-RESEARCH.md §"Decision File Count Recommendation" (lines 447–486)
    - .planning/phases/01-inventory-architecture-decisions/01-RESEARCH.md §"Env-Var & Identifier Surface" (lines 346–419) — for ADR-02's 37-name list
    - .planning/phases/01-inventory-architecture-decisions/01-RESEARCH.md §"Hooks Fleet" + "License Source Texts" (lines 316–443)
    - .planning/research/PITFALLS.md — referenced by ADRs 01,02,04,07,12,13
    - tests/phase-01-adr-structure.test.cjs (so the executor knows the regex contract being enforced)
  </read_first>
  <action>
Write 14 ADR files in `decisions/` using the EXACT template below. All ADRs use `Date: 2026-04-27`, `Status: Accepted` (except ADR-12 which has `Status: Accepted` but its Consequences explicitly defer SDK to v2).

Every ADR MUST satisfy these regex patterns (enforced by `tests/phase-01-adr-structure.test.cjs`):
- `^# ADR-NN: <Title>` (line 1)
- `^Status: Accepted$` (no trailing whitespace)
- `^Date: 2026-04-27$`
- `^Implements: D-NN[, D-NN]*$` (at least one D-NN reference)
- Section headers `^## Context$`, `^## Decision$`, `^## Rationale$`, `^## Consequences$`

**ADR-01: state-root** (Implements: D-01, D-02). Decision: "Canonical state root is `.oto/`. The `.planning/` → `.oto/` rebrand is a `path` rule (matches `\.planning/`, `^\.planning$`, quoted variants), NOT a bare-word `planning` rule." Rationale: cites Pitfall 3 (path drift) and Pitfall 9 (state systems leak); single root subsumes Superpowers' parallel `docs/superpowers/specs/`. Consequences: every workflow/agent/lib path that currently references `.planning/` must be rewritten via the path rule in Phase 2 engine; word `planning` in prose stays untouched.

**ADR-02: env-var-prefix** (Implements: D-03, D-04). Decision: "Full rebrand depth — every `GSD_*` env var renames to `OTO_*` in lockstep. The rename engine uses ONE `env_var` rule with prefix matching: `from: 'GSD_'`, `to: 'OTO_'`, `apply_to_pattern: '^GSD_[A-Z][A-Z0-9_]*$'`. Hook version token `{{GSD_VERSION}}` → `{{OTO_VERSION}}`. Runtime-environment env vars owned by Claude/Codex/Gemini/Copilot/Cursor are NOT renamed and go on the do-not-rename allowlist." Include the verbatim 37-name `GSD_*` list from RESEARCH.md §"GSD_* Env Vars Found in Upstream" as a fenced code block inside Context. Rationale: Pitfall 1 (choose once and stick) — partial preservation leaks upstream identity through `--help`, error messages, hook injections; PROJECT.md key decision is "full rebrand depth"; prefix rule is one-line cheaper than enumerating 37 names. Consequences: 37 env-var names rename; 4 names (`GSD_CODEX_*` ×2, `GSD_COPILOT_*` ×2) survive in trimmed installer (Phase 3) only because Copilot is dropped — they become dead code; `GSD_SDK_SHIM` becomes dead code per ADR-12.

**ADR-03: skill-vs-command** (Implements: D-05, D-06). Decision: "`/oto-<cmd>` is the user-typed slash command surface (workflows). `oto:<skill-name>` is reserved for `Skill()` calls inside agents/orchestrator. No mixing. When workflows and skills overlap conceptually, the workflow wins for in-progress work: `oto:using-oto` defers when `.oto/STATE.md` shows an active phase; outside an active workflow, skills auto-fire normally." Rationale: confirms GSD #2697 fix; Pitfall 10 (skill auto-load conflict). Consequences: `oto:using-oto` SessionStart bootstrap must read `.oto/STATE.md` (Phase 5 wires); the operational overlap reference table lives in `decisions/skill-vs-command.md` (Task 3), not in this ADR.

**ADR-04: sessionstart** (Implements: D-08, D-09). Decision: "Single SessionStart entrypoint: `oto-session-start` consolidates GSD's `gsd-session-state.sh` and Superpowers' `hooks/session-start` into ONE hook that emits exactly one identity block per session. Two-hook approach is rejected because Claude Code does not deduplicate `additional_context` + `hookSpecificOutput.additionalContext`." Rationale: Pitfall 8 (hook ordering / double-injection). Consequences: Phase 5 implements consolidation + locks the SessionStart-output snapshot fixture as regression baseline; Superpowers' literal `<EXTREMELY_IMPORTANT>You have superpowers.` and the `using-superpowers` paths get hand-rebranded inside the hook (NOT via rename-map.json — they're content the consolidated hook owns).

**ADR-05: agent-collisions** (Implements: D-10, D-11). Decision: "Drop Superpowers' `agents/code-reviewer.md` example agent. Keep `gsd-code-reviewer` (rebranded to `oto-code-reviewer`). Any future collision discovered during inventory: keep one canonical version, drop the other; verdict logged in `decisions/agent-audit.md`." Rationale: GSD's version is integrated with the phase machine; Superpowers' is labeled "example only" upstream (Pitfall 21). Consequences: Phase 4's bulk agent port skips `superpowers/agents/code-reviewer.md`; AGT-02 in Phase 4 enforces the deletion.

**ADR-06: skill-namespace** (Implements: D-07). Decision: "Internal namespace is `oto:<skill-name>` (colon separator). All `Skill()` invocations from agents and the SessionStart bootstrap use this namespace. Mirrors Superpowers' `superpowers:<skill>` shape, just rebranded." Rationale: gives agents a single grep-able invocation form; cross-runtime-portable. Consequences: Phase 6 ports skills under this namespace; rename-map.json's `skill_ns` rule in Plan 03 carries `from: "superpowers:", to: "oto:"`.

**ADR-07: agent-trim** (Implements: D-12). Include the FULL verdict table (verbatim from RESEARCH.md §"GSD Agents (33 total)" lines 203–217). Decision: "Moderate trim: 23 retained agents (10 dropped). DROP categories: AI/eval (4), redundant doc (2), niche/v2 (4). KEEP categories: phase spine (16), audits (2), researchers (2), UI subset (3)." Rationale: Mirrors REQUIREMENTS.md; AI agents deferred (research SUMMARY.md); doc agents consolidated into `oto-doc-writer`/`oto-doc-verifier`; niche agents map to NICH-V2-* requirements. Consequences: Phase 4 ports exactly 23 agents; Codex sandbox map (Phase 4 AGT-04) carries 23 entries; per-agent verdict + rationale recorded in `decisions/agent-audit.md` (Task 4).

**ADR-08: inventory-format** (Implements: D-13). Decision: "Dual format: `decisions/file-inventory.json` is the single source of truth (machine-readable, consumed by Phase 2 engine + Phase 9 sync); `decisions/file-inventory.md` is a generated human index grouped by category. Schema documented in `schema/file-inventory.json` (Plan 02). Entry shape: `{path, upstream, verdict, reason, target_path?, deprecation_status?, rebrand_required, merge_source_files?, phase_owner, category}`." Rationale: JSON gives downstream phases a queryable contract; Markdown gives a reader-friendly index; 4 added fields (`rebrand_required`, `merge_source_files`, `phase_owner`, `category`) each unblock a specific downstream phase per RESEARCH §"Why these additions matter". Consequences: Plan 02 ships the JSON schema + the generated outputs; Phase 2's rebrand engine validates against this schema before each run.

**ADR-09: adr-format** (Implements: D-14). Decision: "Lightweight ADR format. Filename: `ADR-NN-<kebab-slug>.md`. Each ADR has: H1 line `# ADR-NN: <Title>`, then body fields `Status: Accepted | Deferred | Superseded by ADR-MM`, `Date: YYYY-MM-DD`, `Implements: D-NN[, D-NN]`, then four `## Context | ## Decision | ## Rationale | ## Consequences` sections. ADRs numbered sequentially; Deferred ideas get their own ADR with `Status: Deferred`." Include the template verbatim inside the Decision section as a fenced markdown code block. Rationale: Lightweight (no frontmatter parser needed); grep-able by ADR-NN; Status field allows Deferred ADRs without a separate document type. Consequences: All 14 Phase-1 ADRs follow this format; future phases append ADR-15+ in the same shape; `tests/phase-01-adr-structure.test.cjs` is the structural enforcement.

**ADR-10: rename-map-schema** (Implements: D-15). Decision: "`rename-map.json` lives at repo root and validates against `schema/rename-map.json`. Top-level shape: `{version: '1', rules: {identifier[], path[], command[], skill_ns[], package[], url[], env_var[]}, do_not_rename: [string|{pattern, reason}], deprecated_drop: [string]}`. The schema enforces: (a) `identifier_rule.boundary` defaults to `'word'` (`\b` regex), (b) `command_rule.from`/`to` match `^/[a-z][a-z0-9-]*-?$`, (c) `env_var_rule.from`/`to` match `^[A-Z][A-Z0-9_]*_?$`, (d) `do_not_rename` accepts string-or-{pattern,reason} (oneOf), (e) `additionalProperties: false` on rules object." Cross-reference Plan 03 for the actual file. Rationale: Pitfall 1 (substring collision) is prevented at the schema layer — rule typing forces explicit boundary semantics; `apply_to_pattern` exists only on `env_var_rule` because that's the only rule using prefix matching. Consequences: Plan 03 ships `schema/rename-map.json` + `rename-map.json`; Phase 2's `scripts/rebrand.cjs` loads the schema at startup and refuses to run on a non-conformant map.

**ADR-11: distribution** (Implements: D-16, D-17). Decision: "GitHub owner is provisional `julianisaac` (inferred from user email). Repo name is `oto-hybrid-framework` (locked in PROJECT.md). Install instruction template: `npm install -g github:{{GITHUB_OWNER}}/oto-hybrid-framework#vX.Y.Z`. Bin command for v1 is `oto` only (no `oto-sdk`). The `{{GITHUB_OWNER}}` placeholder lives in `rename-map.json` URL rules and resolves at engine load time, NOT bake-time." Rationale: Pitfall 16 (no PATH collision with `get-shit-done-cc`/`gsd-sdk`); placeholder approach (Risk C in RESEARCH.md) decouples Phase 1 from the GitHub-username-correctness assumption. Consequences: User must confirm `julianisaac` before Phase 2 closes; if different, only `rename-map.json` URL rules need editing — no ADR rewrite.

**ADR-12: sdk-strategy** (Implements: D-18, D-19). Decision: "Drop the `sdk/` subpackage from the v1 fork. Fork GSD's pre-existing CJS path (`get-shit-done/bin/gsd-tools.cjs`) as `oto/bin/lib/oto-tools.cjs`. SDK is deferred to v2 (SDK-01..03 in REQUIREMENTS.md). When SDK is built in v2, follow GSD's pattern: isolated subpackage with own `package.json`, `tsconfig.json`, ESM, Vitest." Rationale: Pitfall 5 explicitly recommends this; eliminates the `prepare`-build-failure surface; matches CLAUDE.md "isolate TS to optional `sdk/` if/when needed"; zero TypeScript at top level for v1. Consequences: `gsd-tools.cjs` deprecation status (v1.38.5 marked deprecated) is accepted — oto carries forward independently if upstream deletes it (Pitfall 22); no SDK-related entries in v1 `package.json`; ADR is `Status: Accepted` but Consequences explicitly note SDK is deferred to v2 (per RESEARCH Q3 — single ADR consolidating D-18 and D-19, NOT a separate ADR-13-deferred).

**ADR-13: license-attribution** (Implements: D-20, D-21, D-22). Decision: "`LICENSE` at repo root: MIT for oto's added work, `Copyright (c) 2026 Julian Isaac`. `THIRD-PARTY-LICENSES.md` at repo root contains both upstream MIT licenses verbatim, with `Copyright (c) 2025 Lex Christopherson` (GSD) and `Copyright (c) 2025 Jesse Vincent` (Superpowers) preserved exactly. Inline upstream copyright comments in any ported source file: preserve unmodified. Both `LICENSE*` and `THIRD-PARTY-LICENSES.md` go on `do_not_rename` allowlist; `Lex Christopherson` and `Jesse Vincent` strings also on allowlist." Rationale: Pitfall 6 (license loss) — both upstreams are MIT; oto must preserve attribution to ship as a derivative work. Consequences: Plan 03 ships both license files + adds allowlist entries; Phase 10 CI-06 verifies both copyright strings present (Phase-1 test in Plan 03 covers this for now).

**ADR-14: inventory-scope** (Implements: D-23). Decision: "File inventory covers every file under `foundation-frameworks/get-shit-done-main/` and `foundation-frameworks/superpowers-main/` (no exclusions). Translated READMEs (`README.{ja-JP,ko-KR,pt-BR,zh-CN}.md`) and any path matching `^docs/[a-z]{2}-[A-Z]{2}/` → `verdict: drop, reason: 'Translated docs out of scope per personal-use ceiling'`. OpenCode artifacts (`.opencode/`, `.opencode-plugin/`) → drop. Cursor/Windsurf/Antigravity/Augment/Trae/Qwen/CodeBuddy/Cline/Copilot/Kilo plugin manifests → drop. Upstream-deprecated surfaces: hand-curated via `grep -i 'deprecat' CHANGELOG.md` and Superpowers `RELEASE-NOTES.md` (per Q1 option a, ~30 min effort), with `deprecation_status` field populated in inventory." Rationale: Personal-use English-only; matches PROJECT.md out-of-scope list; manual curation gives most accurate result with minimal tooling. Consequences: Plan 02 inventory generation script applies these as deterministic rules; the 8 workflow-only files (Risk B) are hand-classified; CHANGELOG deprecation pass is a Plan 02 manual subtask.

After all 14 files exist, run `node --test tests/phase-01-adr-structure.test.cjs` and confirm GREEN. Commit per ADR (15 commits per Q4 cadence: 14 ADR commits + 1 close-out commit).
  </action>
  <verify>
    <automated>node --test tests/phase-01-adr-structure.test.cjs</automated>
  </verify>
  <acceptance_criteria>
    - 14 files exist matching pattern `decisions/ADR-*.md`: `ls decisions/ADR-*.md | wc -l` returns `14`.
    - File names are exactly: `ADR-01-state-root.md`, `ADR-02-env-var-prefix.md`, `ADR-03-skill-vs-command.md`, `ADR-04-sessionstart.md`, `ADR-05-agent-collisions.md`, `ADR-06-skill-namespace.md`, `ADR-07-agent-trim.md`, `ADR-08-inventory-format.md`, `ADR-09-adr-format.md`, `ADR-10-rename-map-schema.md`, `ADR-11-distribution.md`, `ADR-12-sdk-strategy.md`, `ADR-13-license-attribution.md`, `ADR-14-inventory-scope.md`.
    - Each ADR contains all 8 required structural patterns: `node --test tests/phase-01-adr-structure.test.cjs` exits 0.
    - ADR-02 contains the literal string `GSD_PLUGIN_ROOT` (verifiable via `grep -l GSD_PLUGIN_ROOT decisions/ADR-02-env-var-prefix.md`) AND the literal string `apply_to_pattern` (proves prefix-rule rationale is documented).
    - ADR-07 contains `23` (keep count) AND `10` (drop count): `grep -E '23|10' decisions/ADR-07-agent-trim.md | wc -l` returns ≥2.
    - ADR-11 contains the literal token `{{GITHUB_OWNER}}`: `grep -c '{{GITHUB_OWNER}}' decisions/ADR-11-distribution.md` returns ≥1.
    - ADR-12 contains both `Accepted` (Status) AND `Deferred` (in Consequences regarding v2): `grep -c 'Deferred\|deferred' decisions/ADR-12-sdk-strategy.md` returns ≥1.
    - ADR-13 contains BOTH `Lex Christopherson` AND `Jesse Vincent`: `grep -c 'Lex Christopherson\|Jesse Vincent' decisions/ADR-13-license-attribution.md` returns ≥2.
    - Every ADR contains the `Implements: D-` line: `grep -L '^Implements: D-' decisions/ADR-*.md` returns empty (no files missing the line).
  </acceptance_criteria>
  <done>14 ADR files committed. `tests/phase-01-adr-structure.test.cjs` passes. All D-XX entries from CONTEXT.md mapped to exactly one ADR.</done>
</task>

<task type="auto">
  <name>Task 3: Wave 1 — Write decisions/skill-vs-command.md (overlap routing reference) + decisions/agent-audit.md (33-row verdict table)</name>
  <files>
    decisions/skill-vs-command.md,
    decisions/agent-audit.md
  </files>
  <read_first>
    - .planning/phases/01-inventory-architecture-decisions/01-CONTEXT.md §"Skill-vs-Command Routing (ARCH-02)" + §"Agent Trim Depth (AGT-01)"
    - .planning/phases/01-inventory-architecture-decisions/01-RESEARCH.md §"GSD Agents (33 total — verified)" (lines 186–217) — exact agent list + verdict mapping
    - .planning/phases/01-inventory-architecture-decisions/01-RESEARCH.md §"Superpowers Skills (14 total)" (lines 285–314)
    - .planning/research/FEATURES.md §4 (overlap pairs — input to skill-vs-command.md table) — IF this file exists; otherwise reconstruct from RESEARCH.md skill verdict table
    - decisions/ADR-03-skill-vs-command.md, decisions/ADR-05-agent-collisions.md, decisions/ADR-07-agent-trim.md (cross-references)
    - tests/phase-01-agent-audit.test.cjs (so executor knows the expected pattern: `^- \`gsd-...\``-style or table-row form, 33 rows, KEEP=23, DROP=10)
  </read_first>
  <action>
Create exactly two files.

**File 1: `decisions/skill-vs-command.md`** (the operational overlap reference per Q2 option c — full table + v1-active callout). Required structure:

```markdown
# Skill ↔ Command Routing Reference

> Operational reference for ADR-03 (skill-vs-command routing) and ADR-06 (internal skill namespace).
> When workflows and skills overlap, the workflow wins for in-progress work. `oto:using-oto`
> defers when `.oto/STATE.md` shows an active phase; outside an active workflow, skills auto-fire
> normally.

## v1-active subset (5 overlaps wired in v0.1.0)

These overlaps are wired in v0.1.0 — both surfaces ship and the routing rule applies.

| Skill | Workflow / Agent | Routing |
|-------|------------------|---------|
| `oto:test-driven-development` | `oto-executor` agent | Agent invokes skill before writing implementation code (SKL-08) |
| `oto:systematic-debugging` | `/oto-debug` workflow + `oto-debugger` agent | Inside `/oto-debug`: workflow wins. Outside any workflow: skill auto-fires. |
| `oto:verification-before-completion` | `oto-verifier` agent | Agent invokes skill after writing implementation code (SKL-08) |
| `oto:dispatching-parallel-agents` | `/oto-execute-phase` wave engine | Workflow's wave logic IS the operational form; skill is the agent-prompt invocation when running outside the wave engine |
| `oto:using-git-worktrees` | `/oto-new-workspace` | Workflow wins when invoked; skill is the standalone form when no workspace command is active |

## Full overlap table (14 rows — all skill ↔ workflow pairs surveyed)

For traceability across future planning. Rows marked `v2/dropped` were considered and resolved.

| # | Skill | Workflow / Agent | v1 status | Resolution |
|---|-------|------------------|-----------|------------|
| 1 | `test-driven-development` | `oto-executor` | active | Keep skill; agent invokes at canonical point |
| 2 | `systematic-debugging` | `/oto-debug`, `oto-debugger` | active | Keep skill; workflow wins when active |
| 3 | `verification-before-completion` | `oto-verifier` | active | Keep skill; agent invokes after writes |
| 4 | `dispatching-parallel-agents` | `/oto-execute-phase` | active | Keep skill; folds into wave engine for in-workflow use |
| 5 | `using-git-worktrees` | `/oto-new-workspace` | active | Keep skill; standalone form |
| 6 | `using-superpowers` → `using-oto` | SessionStart bootstrap | active | Renamed per ADR-06; defers to STATE.md |
| 7 | `writing-skills` | (none — meta-skill) | active | Keep skill; no workflow overlap |
| 8 | `brainstorming` | `/oto-discuss-phase` | dropped | Workflow wins (FEATURES.md O1); skill not ported |
| 9 | `writing-plans` | `/oto-plan-phase` | dropped | Workflow wins (O2); rigor folded into `oto-planner` agent prompt |
| 10 | `executing-plans` | `/oto-execute-phase` | dropped | Workflow wins (O3) |
| 11 | `subagent-driven-development` | wave engine | dropped | Folded into `oto-executor` |
| 12 | `requesting-code-review` | `/oto-code-review` | dropped | Workflow wins (O4) |
| 13 | `receiving-code-review` | (none) | dropped (v2 candidate) | No v1 invocation point; revisit in v2 |
| 14 | `finishing-a-development-branch` | `/oto-ship` | dropped | Workflow wins (O8) |

## Routing rule (formal)

```
IF .oto/STATE.md shows an active phase:
  IF the user-typed command is a /oto-<cmd> workflow:
    workflow wins; skill auto-load is suppressed
  ELSE the agent's prompt explicitly invokes oto:<skill>:
    skill fires (canonical-invocation case — SKL-08)
  ELSE:
    skill auto-load is suppressed (using-oto bootstrap defers)
ELSE (no active phase):
  skill auto-load fires normally on suspicion (Superpowers-default behavior)
```

## Cross-references

- ADR-03 (skill-vs-command routing policy) — locks the rule above
- ADR-06 (internal skill namespace) — `oto:<skill-name>` form
- ADR-07 (agent trim depth) — agents invoking skills are in the keep set
- REQUIREMENTS.md SKL-01..SKL-08 — the 7 ported skills + cross-system integration spec
```

**File 2: `decisions/agent-audit.md`** — the AGT-01 deliverable. MUST be parseable by `tests/phase-01-agent-audit.test.cjs` which expects rows of form either:
- `| \`gsd-<name>\` | KEEP\|DROP\|MERGE | <reason> |` (table row), OR
- `- \`gsd-<name>\`: KEEP\|DROP\|MERGE — <reason>` (bullet form)

Use the table form throughout. The test counts: 33 distinct gsd-* names, 23 KEEP, 10 DROP, 0 MERGE (the table reflects the trim verdict, not the rebrand action — every keep is later renamed to `oto-<name>` in Phase 4 but that's a port action, not an audit verdict). Required structure:

```markdown
# Agent Audit (AGT-01)

> All 33 GSD v1.38.5 agents with KEEP/DROP verdict and rationale per agent.
> Source enumeration: `foundation-frameworks/get-shit-done-main/agents/gsd-*.md`.
> Verdict policy locked in ADR-07 (Agent trim depth).
> Collision policy locked in ADR-05 (Agent collisions).
>
> Implements: D-12 (trim), D-10 (collision resolution), D-11 (general collision policy).
>
> Rebrand action (KEEP rows) → file renamed to `agents/oto-<name>.md` in Phase 4 (AGT-03).
> Drop action (DROP rows) → file deleted in Phase 4 bulk port (no port).

## Verdict counts

- KEEP: 23
- DROP: 10
- MERGE: 0
- Total: 33

## Per-agent verdicts

| Agent | Verdict | Category | Rationale |
|-------|---------|----------|-----------|
| `gsd-advisor-researcher` | KEEP | researcher | Phase research advisor; carried forward. Rebrands to `oto-advisor-researcher`. |
| `gsd-ai-researcher` | DROP | AI/eval | AI/eval-specific agents deferred per research/SUMMARY.md; no v1 invocation point. |
| `gsd-assumptions-analyzer` | KEEP | audit | Phase audit role; carried forward. |
| `gsd-code-fixer` | KEEP | phase spine | Pairs with code-reviewer for review-fix loop. |
| `gsd-code-reviewer` | KEEP | phase spine | Phase machine integration; collision with Superpowers' `code-reviewer` resolved by dropping the latter (ADR-05). |
| `gsd-codebase-mapper` | KEEP | phase spine | Brownfield exploration support (`/oto-map-codebase`, `/oto-scan`). |
| `gsd-debug-session-manager` | DROP | niche/v2 | Consolidated into `oto-debugger` per ADR-07; standalone session manager unnecessary for solo dev. |
| `gsd-debugger` | KEEP | phase spine | `/oto-debug` workflow agent; absorbs debug-session-manager responsibilities. |
| `gsd-doc-classifier` | DROP | redundant doc | Consolidated into `oto-doc-writer` per ADR-07. |
| `gsd-doc-synthesizer` | DROP | redundant doc | Consolidated into `oto-doc-writer` per ADR-07. |
| `gsd-doc-verifier` | KEEP | phase spine | Verifies docs against codebase claims; pairs with `oto-doc-writer`. |
| `gsd-doc-writer` | KEEP | phase spine | `/oto-docs-update` workflow agent. |
| `gsd-domain-researcher` | KEEP | researcher | Domain-specific research; complements project/phase researchers. |
| `gsd-eval-auditor` | DROP | AI/eval | AI/eval workflow deferred. |
| `gsd-eval-planner` | DROP | AI/eval | AI/eval workflow deferred. |
| `gsd-executor` | KEEP | phase spine | Core execution agent; invokes TDD + verification skills (SKL-08). |
| `gsd-framework-selector` | DROP | AI/eval | AI/eval workflow deferred. |
| `gsd-integration-checker` | KEEP | phase spine | Cross-feature integration validation. |
| `gsd-intel-updater` | DROP | niche/v2 | `/oto-intel` is v2 (NICH-V2-02). |
| `gsd-nyquist-auditor` | KEEP | phase spine | Validation-architecture enforcement (per `01-VALIDATION.md` policy). |
| `gsd-pattern-mapper` | DROP | niche/v2 | Codebase intelligence overlap with `intel-updater`; deferred. |
| `gsd-phase-researcher` | KEEP | phase spine | `/oto-discuss-phase` research arm. |
| `gsd-plan-checker` | KEEP | phase spine | Validates plans before execution (per `/oto-plan-phase` workflow). |
| `gsd-planner` | KEEP | phase spine | Core planning agent. |
| `gsd-project-researcher` | KEEP | phase spine | `/oto-new-project` research arm. |
| `gsd-research-synthesizer` | KEEP | phase spine | Multi-agent research synthesis. |
| `gsd-roadmapper` | KEEP | phase spine | Roadmap construction. |
| `gsd-security-auditor` | KEEP | audit | Security review (`/oto-secure-phase`). |
| `gsd-ui-auditor` | KEEP | UI | UI review (`/oto-ui-review`); UI hint = yes from Phase 3+. |
| `gsd-ui-checker` | KEEP | UI | UI verification. |
| `gsd-ui-researcher` | KEEP | UI | UI research arm. |
| `gsd-user-profiler` | DROP | niche/v2 | `/oto-profile-user` is v2 (NICH-V2-03). |
| `gsd-verifier` | KEEP | phase spine | `/oto-verify-work` agent; invokes verification skill (SKL-08). |

## Hooks subject to user confirmation (A7)

The following hooks are inventoried as `DROP (review)` in 01-RESEARCH.md §"Hooks Fleet" and need user confirmation before Plan 02 finalizes their inventory verdicts:

- `gsd-read-guard.js` — recommended DROP (redundant once Claude is daily-use stable). User-confirm.
- `gsd-workflow-guard.js` — recommended DROP (low-value for solo dev). User-confirm.
- `gsd-phase-boundary.sh` — recommended DROP (redundant with statusline). User-confirm.

## Cross-references

- ADR-05 (Agent collision resolution) — resolves Superpowers `code-reviewer` collision (the row above is KEEP because it's the canonical version that survives).
- ADR-07 (Agent trim depth) — drop categories + counts.
- REQUIREMENTS.md AGT-01..04 — AGT-01 is satisfied by this file; AGT-02..04 are Phase 4 deliverables.
```

After writing both files, run `node --test tests/phase-01-agent-audit.test.cjs` and `node --test tests/phase-01-decisions-dir.test.cjs` and confirm GREEN. Commit `docs(01-01): add skill-vs-command routing reference + agent audit (AGT-01)`.
  </action>
  <verify>
    <automated>node --test tests/phase-01-agent-audit.test.cjs tests/phase-01-decisions-dir.test.cjs</automated>
  </verify>
  <acceptance_criteria>
    - File `decisions/skill-vs-command.md` exists with ≥30 lines (`wc -l < decisions/skill-vs-command.md` ≥ 30).
    - skill-vs-command.md contains both heading patterns: `^## v1-active subset` AND `^## Full overlap table`: `grep -cE '^## (v1-active subset|Full overlap table)' decisions/skill-vs-command.md` returns `2`.
    - skill-vs-command.md cross-references ADR-03 AND ADR-06: `grep -cE 'ADR-0[36]' decisions/skill-vs-command.md` returns ≥2.
    - File `decisions/agent-audit.md` exists.
    - All 33 GSD agent names appear: `for a in gsd-advisor-researcher gsd-ai-researcher gsd-assumptions-analyzer gsd-code-fixer gsd-code-reviewer gsd-codebase-mapper gsd-debug-session-manager gsd-debugger gsd-doc-classifier gsd-doc-synthesizer gsd-doc-verifier gsd-doc-writer gsd-domain-researcher gsd-eval-auditor gsd-eval-planner gsd-executor gsd-framework-selector gsd-integration-checker gsd-intel-updater gsd-nyquist-auditor gsd-pattern-mapper gsd-phase-researcher gsd-plan-checker gsd-planner gsd-project-researcher gsd-research-synthesizer gsd-roadmapper gsd-security-auditor gsd-ui-auditor gsd-ui-checker gsd-ui-researcher gsd-user-profiler gsd-verifier; do grep -q "$a" decisions/agent-audit.md || echo MISSING:$a; done` produces NO output.
    - KEEP count is 23 and DROP count is 10: `node --test tests/phase-01-agent-audit.test.cjs` exits 0.
    - Three "DROP (review)" hook names surfaced for user confirmation: `grep -c 'gsd-read-guard\|gsd-workflow-guard\|gsd-phase-boundary' decisions/agent-audit.md` returns ≥3.
    - decisions-dir test passes (≥18 files in decisions/ — 14 ADRs from Task 2 + skill-vs-command.md + agent-audit.md = 16; will reach 18 once Plan 02 adds file-inventory.{json,md}).
  </acceptance_criteria>
  <done>Both reference files committed. Agent-audit test green. Routing reference cross-references its ADRs. User-confirmation hooks surfaced.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

Phase 1 is a documentation-only phase. No source code is touched, no network access, no external user input, no database, no secrets handling. There are no runtime trust boundaries crossed by Plan 01's deliverables.

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-01-01-01 | Repudiation | ADR-13 (license-attribution) | mitigate | ADR-13 names `Lex Christopherson` and `Jesse Vincent` verbatim with the exact 2025 copyright lines. Plan 03 ships THIRD-PARTY-LICENSES.md verbatim and adds `phase-01-licenses.test.cjs` that grep-asserts both names persist; loss of attribution is detected at next test run. |
| T-01-01-02 | Information disclosure | decisions/agent-audit.md | accept | The audit lists agent names + KEEP/DROP rationale. Names are public upstream (`agents/gsd-*.md` in foundation-frameworks). No secrets. Risk: none. |
</threat_model>

<verification>
- All 14 ADRs exist with the 8 required structural patterns (`tests/phase-01-adr-structure.test.cjs` passes).
- decisions/agent-audit.md contains all 33 agent names with KEEP=23, DROP=10 (`tests/phase-01-agent-audit.test.cjs` passes).
- decisions/ has ≥16 files at end of Plan 01 (will reach ≥18 after Plan 02 adds inventory files; `tests/phase-01-decisions-dir.test.cjs` will be GREEN once Plan 02 lands).
- Every D-XX from CONTEXT.md (D-01..D-23) is referenced in at least one ADR's `Implements:` line: `for n in 01 02 03 04 05 06 07 08 09 10 11 12 13 14 15 16 17 18 19 20 21 22 23; do grep -l "D-$n" decisions/ADR-*.md > /dev/null || echo MISSING:D-$n; done` produces no output.
</verification>

<success_criteria>
- ROADMAP success criterion 1 satisfied (decisions/ directory exists with one ADR per architectural choice).
- ROADMAP success criterion 2 satisfied (agent-audit.md lists all 33 agents with verdict + rationale).
- All requirements ARCH-01..05, AGT-01, DOC-05 are documentation-complete.
- Wave 0 test scaffolding is reusable by Plans 02 and 03 (the `load-schema.cjs` helper).
- User can grep `decisions/ -rE '^Implements: D-NN'` to find which ADR implements any given D-XX from CONTEXT.md.
</success_criteria>

<user_confirmations>
The following items in this plan defer to user confirmation but do NOT block plan execution. They become surfacing items in `/oto-verify-work` UAT at phase close:

- A1 (D-16): GitHub username `julianisaac` is provisional. ADR-11 documents the assumption; rename-map (Plan 03) uses `{{GITHUB_OWNER}}` placeholder. Confirm before Phase 2 closes.
- A2 (D-04): `GSD_PLUGIN_ROOT` is renamed to `OTO_PLUGIN_ROOT` (treated as oto-internal). Spot-check it is not a Claude/Codex/Gemini-owned name before Phase 2 starts.
- A7 (Hooks): Three hooks marked DROP-review (`gsd-read-guard`, `gsd-workflow-guard`, `gsd-phase-boundary`) — surfaced in agent-audit.md §"Hooks subject to user confirmation". User confirms drop or flips to keep before Phase 5 starts.
</user_confirmations>

<output>
After completion, create `.planning/phases/01-inventory-architecture-decisions/01-01-SUMMARY.md` per `templates/summary.md`. Include:
- Files created (14 ADRs + 2 references + 4 test/helper files)
- Test status (`tests/phase-01-adr-structure.test.cjs` GREEN, `tests/phase-01-agent-audit.test.cjs` GREEN, `tests/phase-01-decisions-dir.test.cjs` PARTIAL — needs Plan 02 inventory)
- Decision coverage (D-01..D-23 → ADR-01..ADR-14)
- User confirmations needed (A1, A2, A7)
- Handoff to Plan 02 (the `tests/helpers/load-schema.cjs` helper is the contract)
</output>
