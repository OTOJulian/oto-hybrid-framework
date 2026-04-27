---
phase: 01-inventory-architecture-decisions
plan: 03
type: execute
wave: 1
depends_on:
  - "01-01"
files_modified:
  - schema/rename-map.json
  - tests/phase-01-rename-map.test.cjs
  - tests/phase-01-licenses.test.cjs
  - rename-map.json
  - LICENSE
  - THIRD-PARTY-LICENSES.md
autonomous: true
requirements_addressed:
  - REB-02
  - FND-06
validation_refs:
  - 01-VALIDATION.md task 1-03-W0-01
  - 01-VALIDATION.md task 1-01-W0-03
  - 01-VALIDATION.md task 1-03-XX (REB-02 row)
  - 01-VALIDATION.md task 1-03-XX (FND-06 row)
must_haves:
  truths:
    - "rename-map.json at repo root validates against schema/rename-map.json"
    - "rename-map.json contains explicit rule entries for every rule type used by Phase 2 engine: identifier, path, command, skill_ns, package, url, env_var"
    - "rename-map.json's do_not_rename allowlist contains LICENSE*, THIRD-PARTY-LICENSES.md, foundation-frameworks/**, Lex Christopherson, Jesse Vincent, plus Claude/Codex/Gemini/Cursor/Copilot env-var names"
    - "URL rebrand rules use placeholder {{GITHUB_OWNER}} per Risk C — Phase 2 engine resolves at load time"
    - "LICENSE at repo root contains 'Copyright (c) 2026 Julian Isaac' verbatim"
    - "THIRD-PARTY-LICENSES.md at repo root contains both upstream MIT licenses verbatim, with 'Copyright (c) 2025 Lex Christopherson' AND 'Copyright (c) 2025 Jesse Vincent' both present"
  artifacts:
    - path: "schema/rename-map.json"
      provides: "JSON Schema 2020-12 spec for rename-map.json"
      contains: "$defs"
    - path: "tests/phase-01-rename-map.test.cjs"
      provides: "Validates rename-map.json against schema, asserts allowlist contents"
      min_lines: 50
    - path: "tests/phase-01-licenses.test.cjs"
      provides: "Asserts both copyright lines present in THIRD-PARTY-LICENSES.md verbatim"
      min_lines: 25
    - path: "rename-map.json"
      provides: "REB-02 — rule-typed rebrand specification consumed by Phase 2 engine"
      contains: "{{GITHUB_OWNER}}"
    - path: "LICENSE"
      provides: "FND-06 — oto's added work license (MIT)"
      contains: "Copyright (c) 2026 Julian Isaac"
    - path: "THIRD-PARTY-LICENSES.md"
      provides: "FND-06 — verbatim upstream MIT licenses"
      contains: "Lex Christopherson"
  key_links:
    - from: "rename-map.json url rule"
      to: "ADR-11 (distribution)"
      via: "{{GITHUB_OWNER}} placeholder matches the placeholder documented in ADR-11"
      pattern: "{{GITHUB_OWNER}}"
    - from: "rename-map.json do_not_rename"
      to: "decisions/ADR-13-license-attribution.md"
      via: "allowlist entries Lex Christopherson + Jesse Vincent + LICENSE* implement ADR-13"
      pattern: "Lex Christopherson"
    - from: "rename-map.json env_var rule"
      to: "ADR-02 (env-var-prefix)"
      via: "single prefix rule with apply_to_pattern; matches the policy locked in ADR-02"
      pattern: "apply_to_pattern"
    - from: "tests/phase-01-rename-map.test.cjs"
      to: "rename-map.json + schema/rename-map.json + tests/helpers/load-schema.cjs"
      via: "loads all three, validates"
      pattern: "rename-map\\.json"
threat_model:
  trust_boundaries: []
  threats:
    - id: "T-01-03-01"
      category: "Repudiation"
      component: "THIRD-PARTY-LICENSES.md attribution"
      disposition: "mitigate"
      mitigation: "License text copied verbatim from foundation-frameworks/{get-shit-done-main,superpowers-main}/LICENSE. Test phase-01-licenses.test.cjs grep-asserts both 'Copyright (c) 2025 Lex Christopherson' AND 'Copyright (c) 2025 Jesse Vincent' present at every commit. Phase 10 CI-06 re-validates."
    - id: "T-01-03-02"
      category: "Tampering"
      component: "rename-map.json (consumed by every downstream phase)"
      disposition: "mitigate"
      mitigation: "Schema validation enforces structure. Allowlist is exhaustive (license names + foundation-frameworks/** + 6 runtime env vars). do_not_rename uses explicit oneOf to allow {pattern, reason} entries with audit trail."
    - id: "T-01-03-03"
      category: "Spoofing"
      component: "rename-map.json url rule"
      disposition: "mitigate"
      mitigation: "Per Risk C, URL uses {{GITHUB_OWNER}} placeholder NOT a literal owner. If `julianisaac` proves wrong (A1), only one file edits — no ADR rewrite. Phase 2 engine validates placeholder is resolved before running."
---

<objective>
Ship the two highest-leverage Phase 1 artifacts for downstream consumers: `rename-map.json` (the rule-typed rebrand specification consumed by Phase 2 engine and Phase 9 sync pipeline) and the license pair (`LICENSE` + `THIRD-PARTY-LICENSES.md`). These three files are the only Phase-1 outputs that live at repo root, and they're the only ones that any external CI ever asserts presence/contents of.

Purpose:
- REB-02: rename-map.json with explicit before/after for every internal ID/command/agent/skill-namespace/env-var.
- FND-06: License attribution preserved (both upstream copyright lines verbatim) — protects oto's MIT-derivative status.

Output:
- `schema/rename-map.json` — JSON Schema (Wave 0)
- `tests/phase-01-rename-map.test.cjs` — schema + allowlist contents test (Wave 0)
- `tests/phase-01-licenses.test.cjs` — copyright-line presence test (Wave 0)
- `rename-map.json` — the actual rebrand spec (Wave 1)
- `LICENSE` — oto's MIT (Wave 1)
- `THIRD-PARTY-LICENSES.md` — verbatim upstream licenses (Wave 1)
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md
@.planning/phases/01-inventory-architecture-decisions/01-CONTEXT.md
@.planning/phases/01-inventory-architecture-decisions/01-RESEARCH.md
@.planning/phases/01-inventory-architecture-decisions/01-VALIDATION.md
@CLAUDE.md
@tests/helpers/load-schema.cjs
@foundation-frameworks/get-shit-done-main/LICENSE
@foundation-frameworks/superpowers-main/LICENSE

<interfaces>
<!-- The rename-map.json contract — what Phase 2 engine and Phase 9 sync pipeline consume. -->

```typescript
type RenameMap = {
  version: '1';
  rules: {
    identifier?: { from: string; to: string; boundary?: 'word'|'prefix'|'exact'; case_variants?: ('upper'|'lower'|'title'|'kebab'|'snake')[]; do_not_match?: string[] }[];
    path?:       { from: string; to: string; match?: 'segment'|'prefix'|'exact' }[];
    command?:    { from: string; to: string }[];
    skill_ns?:   { from: string; to: string }[];
    package?:    { from: string; to: string; fields: ('name'|'bin'|'main'|'exports'|'repository.url')[] }[];
    url?:        { from: string; to: string; preserve_in_attribution?: boolean }[];
    env_var?:    { from: string; to: string; apply_to_pattern?: string }[];
  };
  do_not_rename: (string | { pattern: string; reason: string })[];
  deprecated_drop?: string[];
};
```

The Phase 2 rebrand engine (REB-01..06) loads this file at startup, validates against `schema/rename-map.json`, resolves the `{{GITHUB_OWNER}}` placeholder from env or config, and applies rules to source files. Order of rule application: `do_not_rename` always wins; otherwise more-specific rules win (exact > prefix > word).
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Wave 0 — Author schema/rename-map.json + tests/phase-01-rename-map.test.cjs + tests/phase-01-licenses.test.cjs</name>
  <files>
    schema/rename-map.json,
    tests/phase-01-rename-map.test.cjs,
    tests/phase-01-licenses.test.cjs
  </files>
  <read_first>
    - .planning/phases/01-inventory-architecture-decisions/01-RESEARCH.md §"rename-map.json Schema Design" (lines 488–662) — full schema body to copy verbatim
    - .planning/phases/01-inventory-architecture-decisions/01-RESEARCH.md §"License Source Texts" (lines 422–443)
    - .planning/phases/01-inventory-architecture-decisions/01-CONTEXT.md §"Rename Map Schema (REB-02)" + §"License & Attribution"
    - decisions/ADR-10-rename-map-schema.md (the policy this schema implements)
    - decisions/ADR-13-license-attribution.md (the license policy this test enforces)
    - tests/helpers/load-schema.cjs (Plan 01 — used by rename-map test)
  </read_first>
  <behavior>
    - Schema enforces: top-level `version: '1'`, `rules` object with keys `identifier|path|command|skill_ns|package|url|env_var` (additionalProperties false), `do_not_rename` array of (string OR {pattern, reason}). identifier_rule.boundary defaults to `word`. command_rule.from/to match `^/[a-z][a-z0-9-]*-?$`. env_var_rule.from/to match `^[A-Z][A-Z0-9_]*_?$`.
    - rename-map test (initially red — `rename-map.json` doesn't exist):
      - Loads `rename-map.json`, parses as JSON, validates against schema (zero errors).
      - Asserts `rules.identifier`, `rules.path`, `rules.command`, `rules.skill_ns`, `rules.url`, `rules.env_var` all present and non-empty.
      - Asserts `do_not_rename` contains the literal strings: `LICENSE`, `LICENSE.md`, `THIRD-PARTY-LICENSES.md`, `Lex Christopherson`, `Jesse Vincent`.
      - Asserts `do_not_rename` contains `foundation-frameworks/**` glob.
      - Asserts at least one `url_rule` has `preserve_in_attribution: true`.
      - Asserts at least one `url_rule` contains the literal `{{GITHUB_OWNER}}` placeholder.
      - Asserts `env_var` has at least one rule with `from === 'GSD_'` (prefix rule per ADR-02).
    - licenses test (initially red — files don't exist):
      - Asserts `LICENSE` exists at repo root.
      - Asserts `LICENSE` contains exact string `Copyright (c) 2026 Julian Isaac`.
      - Asserts `THIRD-PARTY-LICENSES.md` exists at repo root.
      - Asserts both `Copyright (c) 2025 Lex Christopherson` AND `Copyright (c) 2025 Jesse Vincent` present in THIRD-PARTY-LICENSES.md.
      - Asserts THIRD-PARTY-LICENSES.md contains the standard MIT permission paragraph (`Permission is hereby granted, free of charge`).
  </behavior>
  <action>
**File 1: `schema/rename-map.json`** — write verbatim from RESEARCH.md §"Top-level shape" (lines 494–600), with `$id` updated:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://github.com/{{GITHUB_OWNER}}/oto-hybrid-framework/schema/rename-map.json",
  "type": "object",
  "required": ["version", "rules", "do_not_rename"],
  "additionalProperties": false,
  "properties": {
    "version": { "type": "string", "const": "1" },
    "rules": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "identifier": { "type": "array", "items": { "$ref": "#/$defs/identifier_rule" } },
        "path":       { "type": "array", "items": { "$ref": "#/$defs/path_rule" } },
        "command":    { "type": "array", "items": { "$ref": "#/$defs/command_rule" } },
        "skill_ns":   { "type": "array", "items": { "$ref": "#/$defs/skill_ns_rule" } },
        "package":    { "type": "array", "items": { "$ref": "#/$defs/package_rule" } },
        "url":        { "type": "array", "items": { "$ref": "#/$defs/url_rule" } },
        "env_var":    { "type": "array", "items": { "$ref": "#/$defs/env_var_rule" } }
      }
    },
    "do_not_rename": {
      "type": "array",
      "items": {
        "oneOf": [
          { "type": "string" },
          { "type": "object", "required": ["pattern", "reason"], "properties": { "pattern": { "type": "string" }, "reason": { "type": "string" } }, "additionalProperties": false }
        ]
      }
    },
    "deprecated_drop": {
      "type": "array",
      "items": { "type": "string" }
    }
  },
  "$defs": {
    "identifier_rule": {
      "type": "object",
      "required": ["from", "to"],
      "additionalProperties": false,
      "properties": {
        "from": { "type": "string", "minLength": 1 },
        "to":   { "type": "string", "minLength": 1 },
        "boundary": { "enum": ["word", "prefix", "exact"] },
        "case_variants": { "type": "array", "items": { "enum": ["upper", "lower", "title", "kebab", "snake"] } },
        "do_not_match": { "type": "array", "items": { "type": "string" } }
      }
    },
    "path_rule": {
      "type": "object",
      "required": ["from", "to"],
      "additionalProperties": false,
      "properties": {
        "from": { "type": "string", "minLength": 1 },
        "to":   { "type": "string", "minLength": 1 },
        "match": { "enum": ["segment", "prefix", "exact"] }
      }
    },
    "command_rule": {
      "type": "object",
      "required": ["from", "to"],
      "additionalProperties": false,
      "properties": {
        "from": { "type": "string", "pattern": "^/[a-z][a-z0-9-]*-?$" },
        "to":   { "type": "string", "pattern": "^/[a-z][a-z0-9-]*-?$" }
      }
    },
    "skill_ns_rule": {
      "type": "object",
      "required": ["from", "to"],
      "additionalProperties": false,
      "properties": {
        "from": { "type": "string", "pattern": ":$" },
        "to":   { "type": "string", "pattern": ":$" }
      }
    },
    "package_rule": {
      "type": "object",
      "required": ["from", "to", "fields"],
      "additionalProperties": false,
      "properties": {
        "from":   { "type": "string", "minLength": 1 },
        "to":     { "type": "string", "minLength": 1 },
        "fields": { "type": "array", "items": { "enum": ["name", "bin", "main", "exports", "repository.url"] } }
      }
    },
    "url_rule": {
      "type": "object",
      "required": ["from", "to"],
      "additionalProperties": false,
      "properties": {
        "from": { "type": "string", "minLength": 1 },
        "to":   { "type": "string", "minLength": 1 },
        "preserve_in_attribution": { "type": "boolean" }
      }
    },
    "env_var_rule": {
      "type": "object",
      "required": ["from", "to"],
      "additionalProperties": false,
      "properties": {
        "from": { "type": "string", "pattern": "^[A-Z][A-Z0-9_]*_?$" },
        "to":   { "type": "string", "pattern": "^[A-Z][A-Z0-9_]*_?$" },
        "apply_to_pattern": { "type": "string" }
      }
    }
  }
}
```

**File 2: `tests/phase-01-rename-map.test.cjs`** (~70 LOC):

```js
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { validate } = require('./helpers/load-schema');

const REPO_ROOT = path.join(__dirname, '..');
const MAP_PATH = path.join(REPO_ROOT, 'rename-map.json');
const SCHEMA_PATH = path.join(REPO_ROOT, 'schema', 'rename-map.json');

test('schema/rename-map.json exists and is valid JSON', () => {
  assert.ok(fs.existsSync(SCHEMA_PATH));
  JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));
});

test('rename-map.json exists and is valid JSON', () => {
  assert.ok(fs.existsSync(MAP_PATH), 'rename-map.json missing at repo root');
  JSON.parse(fs.readFileSync(MAP_PATH, 'utf8'));
});

test('rename-map.json validates against schema', () => {
  const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));
  const data = JSON.parse(fs.readFileSync(MAP_PATH, 'utf8'));
  const result = validate(data, schema);
  assert.ok(result.valid, `Schema errors:\n${result.errors.join('\n')}`);
});

test('rules object contains all 7 required rule types and each has ≥1 entry', () => {
  const data = JSON.parse(fs.readFileSync(MAP_PATH, 'utf8'));
  for (const k of ['identifier', 'path', 'command', 'skill_ns', 'package', 'url', 'env_var']) {
    assert.ok(Array.isArray(data.rules[k]) && data.rules[k].length >= 1, `rules.${k} missing or empty`);
  }
});

test('do_not_rename contains required allowlist entries', () => {
  const data = JSON.parse(fs.readFileSync(MAP_PATH, 'utf8'));
  const flat = data.do_not_rename.map(e => typeof e === 'string' ? e : e.pattern);
  for (const required of ['LICENSE', 'LICENSE.md', 'THIRD-PARTY-LICENSES.md', 'Lex Christopherson', 'Jesse Vincent', 'foundation-frameworks/**']) {
    assert.ok(flat.includes(required), `do_not_rename missing: ${required}`);
  }
});

test('do_not_rename contains runtime-owned env vars', () => {
  const data = JSON.parse(fs.readFileSync(MAP_PATH, 'utf8'));
  const flat = data.do_not_rename.map(e => typeof e === 'string' ? e : e.pattern);
  for (const env of ['CLAUDE_PLUGIN_ROOT', 'CLAUDE_CONFIG_DIR', 'CODEX_HOME', 'GEMINI_CONFIG_DIR']) {
    assert.ok(flat.includes(env), `do_not_rename missing env var: ${env}`);
  }
});

test('at least one url rule uses preserve_in_attribution', () => {
  const data = JSON.parse(fs.readFileSync(MAP_PATH, 'utf8'));
  assert.ok(data.rules.url.some(r => r.preserve_in_attribution === true), 'No url rule has preserve_in_attribution: true');
});

test('at least one url rule uses {{GITHUB_OWNER}} placeholder', () => {
  const data = JSON.parse(fs.readFileSync(MAP_PATH, 'utf8'));
  assert.ok(data.rules.url.some(r => r.to.includes('{{GITHUB_OWNER}}')), 'No url rule uses {{GITHUB_OWNER}} placeholder');
});

test('env_var rule uses GSD_ prefix matching', () => {
  const data = JSON.parse(fs.readFileSync(MAP_PATH, 'utf8'));
  const r = data.rules.env_var.find(x => x.from === 'GSD_');
  assert.ok(r, 'env_var rule with from: "GSD_" missing');
  assert.equal(r.to, 'OTO_', 'env_var prefix rule should rewrite GSD_ → OTO_');
  assert.ok(r.apply_to_pattern, 'GSD_ env_var rule should have apply_to_pattern bounding regex');
});

test('command rule maps /gsd- → /oto-', () => {
  const data = JSON.parse(fs.readFileSync(MAP_PATH, 'utf8'));
  const r = data.rules.command.find(x => x.from === '/gsd-');
  assert.ok(r, 'command rule from: "/gsd-" missing');
  assert.equal(r.to, '/oto-');
});

test('skill_ns rule maps superpowers: → oto:', () => {
  const data = JSON.parse(fs.readFileSync(MAP_PATH, 'utf8'));
  const r = data.rules.skill_ns.find(x => x.from === 'superpowers:');
  assert.ok(r, 'skill_ns rule from: "superpowers:" missing');
  assert.equal(r.to, 'oto:');
});
```

**File 3: `tests/phase-01-licenses.test.cjs`** (~35 LOC):

```js
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.join(__dirname, '..');

test('LICENSE exists at repo root', () => {
  assert.ok(fs.existsSync(path.join(REPO_ROOT, 'LICENSE')), 'LICENSE missing');
});

test('LICENSE contains "Copyright (c) 2026 Julian Isaac"', () => {
  const content = fs.readFileSync(path.join(REPO_ROOT, 'LICENSE'), 'utf8');
  assert.match(content, /Copyright \(c\) 2026 Julian Isaac/, 'oto copyright line missing');
});

test('LICENSE contains "MIT License" header', () => {
  const content = fs.readFileSync(path.join(REPO_ROOT, 'LICENSE'), 'utf8');
  assert.match(content, /^MIT License/m, 'MIT header missing');
});

test('THIRD-PARTY-LICENSES.md exists at repo root', () => {
  assert.ok(fs.existsSync(path.join(REPO_ROOT, 'THIRD-PARTY-LICENSES.md')), 'THIRD-PARTY-LICENSES.md missing');
});

test('THIRD-PARTY-LICENSES.md contains Lex Christopherson copyright verbatim', () => {
  const content = fs.readFileSync(path.join(REPO_ROOT, 'THIRD-PARTY-LICENSES.md'), 'utf8');
  assert.ok(content.includes('Copyright (c) 2025 Lex Christopherson'), 'GSD copyright line missing');
});

test('THIRD-PARTY-LICENSES.md contains Jesse Vincent copyright verbatim', () => {
  const content = fs.readFileSync(path.join(REPO_ROOT, 'THIRD-PARTY-LICENSES.md'), 'utf8');
  assert.ok(content.includes('Copyright (c) 2025 Jesse Vincent'), 'Superpowers copyright line missing');
});

test('THIRD-PARTY-LICENSES.md contains MIT permission paragraph', () => {
  const content = fs.readFileSync(path.join(REPO_ROOT, 'THIRD-PARTY-LICENSES.md'), 'utf8');
  assert.ok(content.includes('Permission is hereby granted, free of charge'), 'MIT permission paragraph missing');
});
```

After creating all three files, run `node --test tests/phase-01-rename-map.test.cjs tests/phase-01-licenses.test.cjs` and confirm RED. Commit `test(01-03): add rename-map + license test scaffolding [Wave 0]`.
  </action>
  <verify>
    <automated>node --test tests/phase-01-rename-map.test.cjs tests/phase-01-licenses.test.cjs 2>&1 | grep -E '# fail|# pass'</automated>
  </verify>
  <acceptance_criteria>
    - File `schema/rename-map.json` exists, parses as JSON, has `$defs` with all 7 rule types: `node -e "const s=require('./schema/rename-map.json'); console.log(['identifier_rule','path_rule','command_rule','skill_ns_rule','package_rule','url_rule','env_var_rule'].every(k=>s.$defs[k])?'OK':'FAIL')"` prints `OK`.
    - File `tests/phase-01-rename-map.test.cjs` ≥50 lines and imports `./helpers/load-schema`.
    - File `tests/phase-01-licenses.test.cjs` ≥25 lines.
    - Running the tests exits non-zero (RED — neither rename-map.json nor LICENSE files exist yet).
    - Schema's `command_rule` enforces the `^/[a-z]` pattern: `grep -c "\\^/" schema/rename-map.json` returns ≥1.
  </acceptance_criteria>
  <done>Schema + 2 test files committed. Both tests run RED (target files don't exist).</done>
</task>

<task type="auto">
  <name>Task 2: Wave 1 — Write rename-map.json + LICENSE + THIRD-PARTY-LICENSES.md at repo root</name>
  <files>
    rename-map.json,
    LICENSE,
    THIRD-PARTY-LICENSES.md
  </files>
  <read_first>
    - foundation-frameworks/get-shit-done-main/LICENSE (full content — must be copied verbatim)
    - foundation-frameworks/superpowers-main/LICENSE (full content — must be copied verbatim)
    - .planning/phases/01-inventory-architecture-decisions/01-RESEARCH.md §"Concrete entries" (lines 610–660) — sample rename-map content to expand
    - .planning/phases/01-inventory-architecture-decisions/01-RESEARCH.md §"GSD_* Env Vars Found in Upstream" (lines 348–376) — env-var prefix-rule justification
    - .planning/phases/01-inventory-architecture-decisions/01-RESEARCH.md §"Internal Identifier Patterns" (lines 386–407)
    - decisions/ADR-10-rename-map-schema.md (locks the schema this file conforms to)
    - decisions/ADR-11-distribution.md (locks the {{GITHUB_OWNER}} placeholder)
    - decisions/ADR-13-license-attribution.md (locks the LICENSE/THIRD-PARTY-LICENSES policy)
    - schema/rename-map.json (Wave 0 — the contract this file must validate against)
    - tests/phase-01-rename-map.test.cjs + tests/phase-01-licenses.test.cjs (target tests this task makes green)
  </read_first>
  <action>
Write three files at the repo root.

**File 1: `rename-map.json`** — the rebrand spec. Use this exact content (expanded from RESEARCH.md §"Concrete entries" with full coverage of identifier patterns, do_not_rename allowlist, and the {{GITHUB_OWNER}} placeholder per ADR-11):

```json
{
  "version": "1",
  "rules": {
    "identifier": [
      { "from": "gsd", "to": "oto", "boundary": "word", "case_variants": ["lower", "upper", "title"] },
      { "from": "get-shit-done", "to": "oto", "boundary": "word" },
      { "from": "get-shit-done-cc", "to": "oto", "boundary": "exact" },
      { "from": "Get Shit Done", "to": "oto", "boundary": "exact" },
      { "from": "gsd_state_version", "to": "oto_state_version", "boundary": "word" },
      { "from": "gsd-hook-version", "to": "oto-hook-version", "boundary": "word" },
      { "from": "GSD_VERSION", "to": "OTO_VERSION", "boundary": "exact" },
      { "from": "superpowers", "to": "oto", "boundary": "word", "case_variants": ["lower", "title"], "do_not_match": ["Superpowers (the upstream framework)"] }
    ],
    "path": [
      { "from": ".planning", "to": ".oto", "match": "segment" },
      { "from": "get-shit-done/", "to": "oto/", "match": "prefix" },
      { "from": "commands/gsd/", "to": "commands/oto/", "match": "prefix" },
      { "from": "agents/gsd-", "to": "agents/oto-", "match": "prefix" }
    ],
    "command": [
      { "from": "/gsd-", "to": "/oto-" }
    ],
    "skill_ns": [
      { "from": "superpowers:", "to": "oto:" }
    ],
    "package": [
      { "from": "get-shit-done-cc", "to": "oto", "fields": ["name", "bin"] },
      { "from": "gsd-sdk", "to": "oto-sdk", "fields": ["bin"] }
    ],
    "url": [
      { "from": "github.com/gsd-build/get-shit-done", "to": "github.com/{{GITHUB_OWNER}}/oto-hybrid-framework", "preserve_in_attribution": true },
      { "from": "github.com/obra/superpowers", "to": "github.com/{{GITHUB_OWNER}}/oto-hybrid-framework", "preserve_in_attribution": true }
    ],
    "env_var": [
      { "from": "GSD_", "to": "OTO_", "apply_to_pattern": "^GSD_[A-Z][A-Z0-9_]*$" }
    ]
  },
  "do_not_rename": [
    "LICENSE",
    "LICENSE.md",
    "THIRD-PARTY-LICENSES.md",
    "foundation-frameworks/**",
    "Lex Christopherson",
    "Jesse Vincent",
    "github.com/gsd-build/get-shit-done",
    "github.com/obra/superpowers",
    "Copyright (c) 2025 Lex Christopherson",
    "Copyright (c) 2025 Jesse Vincent",
    "CLAUDE_PLUGIN_ROOT",
    "CLAUDE_CONFIG_DIR",
    "CODEX_HOME",
    "GEMINI_CONFIG_DIR",
    "CURSOR_PLUGIN_ROOT",
    "COPILOT_CLI",
    { "pattern": "subagent_type=\"(general-purpose|generalPurpose|general|X|general_purpose_task)\"", "reason": "Generic agent-type values in install.js examples — not gsd-* identifiers" },
    { "pattern": "Superpowers \\(the upstream framework\\)", "reason": "Attribution context — preserve upstream name when explicitly attributed in docs/THIRD-PARTY-LICENSES.md" }
  ],
  "deprecated_drop": []
}
```

Note on entries:
- Two extra `path` rules (`commands/gsd/` and `agents/gsd-`) ensure path renames win before identifier rules touch them — defense-in-depth against Pitfall 1.
- `do_not_match` on the `superpowers` identifier rule preserves the literal phrase "Superpowers (the upstream framework)" used in attribution prose.
- `deprecated_drop` is intentionally `[]` for v1 — populated by Phase 9 sync pipeline if/when upstream removals need explicit drop tracking.

**File 2: `LICENSE`** — oto's MIT, exact content (verbatim except copyright line):

```
MIT License

Copyright (c) 2026 Julian Isaac

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

**File 3: `THIRD-PARTY-LICENSES.md`** — verbatim concatenation of both upstream LICENSE files.

Read both upstream LICENSE files first (`Read` tool on `foundation-frameworks/get-shit-done-main/LICENSE` and `foundation-frameworks/superpowers-main/LICENSE`) and copy their content BYTE-FOR-BYTE into the corresponding sections below. Do not paraphrase, do not adjust whitespace, do not change line endings. The exact 1075-byte (GSD) and 1070-byte (Superpowers) contents must appear verbatim.

Structure:

```markdown
# Third-Party Licenses

This file preserves verbatim the licenses of the upstream projects that `oto`
incorporates as a derivative work. Both upstreams are MIT-licensed.

`oto` adds its own work under a separate MIT license — see [`LICENSE`](./LICENSE).

The text below is preserved exactly as it appears in each upstream's `LICENSE`
file, with copyright lines unmodified per ADR-13 (license attribution).

---

## get-shit-done (GSD)

Source: https://github.com/gsd-build/get-shit-done

```
<paste verbatim contents of foundation-frameworks/get-shit-done-main/LICENSE here>
```

---

## superpowers

Source: https://github.com/obra/superpowers

```
<paste verbatim contents of foundation-frameworks/superpowers-main/LICENSE here>
```
```

After writing all three files, run:
1. `node --test tests/phase-01-rename-map.test.cjs` — must be GREEN (all 11 sub-tests pass)
2. `node --test tests/phase-01-licenses.test.cjs` — must be GREEN (all 7 sub-tests pass)
3. Sanity check: `node -e "const m=require('./rename-map.json'); console.log('rules:', Object.keys(m.rules).join(','), 'allowlist size:', m.do_not_rename.length)"` — should print all 7 rule types and ≥17 allowlist entries.

Commit cadence (per Q4): `feat(01-03): add rename-map.json (REB-02)`, `docs(01-03): add LICENSE + THIRD-PARTY-LICENSES.md (FND-06)`.
  </action>
  <verify>
    <automated>node --test tests/phase-01-rename-map.test.cjs tests/phase-01-licenses.test.cjs</automated>
  </verify>
  <acceptance_criteria>
    - File `rename-map.json` exists at repo root and is valid JSON: `node -e "JSON.parse(require('fs').readFileSync('rename-map.json'))"` exits 0.
    - rename-map test suite passes: `node --test tests/phase-01-rename-map.test.cjs` exits 0 with all 11 sub-tests green.
    - rename-map.json contains the literal `{{GITHUB_OWNER}}` token: `grep -c '{{GITHUB_OWNER}}' rename-map.json` returns ≥2 (both URL rules use it).
    - rename-map.json has all 7 rule types non-empty: `node -e "const m=require('./rename-map.json'); for(const k of ['identifier','path','command','skill_ns','package','url','env_var']) if(!m.rules[k] || m.rules[k].length===0) {console.log('FAIL:'+k); process.exit(1)}"` exits 0 with no output.
    - File `LICENSE` exists at repo root and contains the exact string `Copyright (c) 2026 Julian Isaac`: `grep -c 'Copyright (c) 2026 Julian Isaac' LICENSE` returns ≥1.
    - File `THIRD-PARTY-LICENSES.md` exists and contains BOTH copyright lines: `grep -c 'Copyright (c) 2025 Lex Christopherson' THIRD-PARTY-LICENSES.md` returns ≥1 AND `grep -c 'Copyright (c) 2025 Jesse Vincent' THIRD-PARTY-LICENSES.md` returns ≥1.
    - License test suite passes: `node --test tests/phase-01-licenses.test.cjs` exits 0 with all 7 sub-tests green.
    - Verbatim copy is byte-identical for the GSD LICENSE: `diff <(awk '/```$/{p=0} p; /^```$/{p=1}' THIRD-PARTY-LICENSES.md | head -22) foundation-frameworks/get-shit-done-main/LICENSE` produces no significant output (allow for trailing-blank line differences); a softer check: `grep -c 'THE SOFTWARE IS PROVIDED' THIRD-PARTY-LICENSES.md` returns ≥2 (one for each upstream).
    - All Phase 1 tests now pass cumulatively: `node --test tests/phase-01-*.test.cjs` exits 0 with every test green.
  </acceptance_criteria>
  <done>Three repo-root files committed. All Wave 0 tests for Plan 03 are now GREEN. Combined with Plans 01 + 02, every Phase 1 test passes.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

No runtime trust boundaries. The rename-map.json is consumed by Phase 2 engine (build-time tooling, no network). LICENSE files are static text. The {{GITHUB_OWNER}} placeholder is resolved at engine load-time from a trusted local config.

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-01-03-01 | Repudiation | THIRD-PARTY-LICENSES.md | mitigate | Both upstream copyright strings asserted by `tests/phase-01-licenses.test.cjs` at every commit. Phase 10 CI-06 re-asserts. Loss of attribution would be detected immediately on next test run. |
| T-01-03-02 | Tampering | rename-map.json | mitigate | Schema-validated against `schema/rename-map.json`. Validation enforced by `tests/phase-01-rename-map.test.cjs`. Phase 2 engine re-validates at startup before applying any rules — refuses to run on a non-conformant map. |
| T-01-03-03 | Spoofing | rename-map.json url rule (GitHub owner) | mitigate | Per Risk C, `{{GITHUB_OWNER}}` placeholder used instead of literal `julianisaac`. If A1 assumption is wrong, only `rename-map.json` URL rules need editing — no ADR rewrite, no test rewrite. Phase 2 engine documents that placeholder must be resolved before run. |
| T-01-03-04 | Information disclosure | rename-map.json | accept | All renamed identifiers are public upstream content. No secrets. |
</threat_model>

<verification>
- `node --test tests/phase-01-*.test.cjs` exits 0 with every Phase 1 test passing (cumulatively across all three plans).
- All 10 Phase 1 requirement IDs (ARCH-01..06, AGT-01, REB-02, DOC-05, FND-06) are addressed:
  - ARCH-01..05 + DOC-05: covered by Plan 01 ADRs + structure tests.
  - AGT-01: covered by Plan 01 agent-audit.md + agent-audit test.
  - ARCH-06: covered by Plan 02 file-inventory.{json,md} + inventory test.
  - REB-02: covered by Plan 03 rename-map.json + rename-map test.
  - FND-06: covered by Plan 03 LICENSE + THIRD-PARTY-LICENSES.md + license test.
</verification>

<success_criteria>
- ROADMAP success criteria 4 (rename-map.json exists with explicit before/after for every internal ID/command/agent/skill-namespace/env-var/path-segment) and 5 (LICENSE + THIRD-PARTY-LICENSES.md present, rebrand-allowlisted) both satisfied.
- All 6 Phase-1 test files (phase-01-adr-structure, phase-01-decisions-dir, phase-01-agent-audit, phase-01-inventory, phase-01-rename-map, phase-01-licenses) run GREEN.
- The {{GITHUB_OWNER}} placeholder is the ONLY user-confirmation block before Phase 2 — Phase 2 engine resolves it once at load and the rest of the rebrand spec is locked.
- Phase 10's CI-06 license-attribution check has its specification implemented now (Phase 1's `tests/phase-01-licenses.test.cjs` is the prototype Phase 10 carries forward).
</success_criteria>

<user_confirmations>
Surfaces for `/oto-verify-work` UAT at phase close:

- A1 (D-16): GitHub username assumption. Rename-map uses `{{GITHUB_OWNER}}` placeholder — no value baked in. User confirms `julianisaac` (or supplies actual username) before Phase 2 engine load. If different, only `rename-map.json` edits — no other Phase 1 file touched.
- A2 (D-04): `GSD_PLUGIN_ROOT` is renamed by the prefix env_var rule. Confirm before Phase 2 starts that `OTO_PLUGIN_ROOT` does not collide with any Claude/Codex/Gemini-owned env var.
</user_confirmations>

<output>
Create `.planning/phases/01-inventory-architecture-decisions/01-03-SUMMARY.md` per template. Include:
- Files committed (3 schema/test files + 3 repo-root deliverables)
- Test status (rename-map test 11/11 green, license test 7/7 green)
- Cumulative Phase 1 test status (all 6 test files green)
- Requirement closure (REB-02 + FND-06)
- {{GITHUB_OWNER}} placeholder location for Phase 2 engine to consume
- Cross-plan summary: every Phase 1 requirement ID is now closed; phase ready for `/oto-verify-work`
</output>
