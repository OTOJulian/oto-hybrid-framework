---
phase: 01-inventory-architecture-decisions
plan: 02
type: execute
wave: 1
depends_on:
  - "01-01"
files_modified:
  - schema/file-inventory.json
  - tests/phase-01-inventory.test.cjs
  - scripts/gen-inventory.cjs
  - decisions/file-inventory.json
  - decisions/file-inventory.md
autonomous: true
requirements_addressed:
  - ARCH-06
validation_refs:
  - 01-VALIDATION.md task 1-02-W0-01
  - 01-VALIDATION.md task 1-02-XX (ARCH-06 row)
must_haves:
  truths:
    - "Every file under foundation-frameworks/get-shit-done-main/ AND foundation-frameworks/superpowers-main/ appears as exactly one row in decisions/file-inventory.json"
    - "Every row has a verdict ∈ {keep, drop, merge} with no 'unclassified' entries"
    - "Every keep/merge row has a target_path field"
    - "Every merge row has merge_source_files array with ≥1 element"
    - "Row count in file-inventory.json equals output of `find foundation-frameworks/{get-shit-done-main,superpowers-main} -type f | wc -l`"
    - "decisions/file-inventory.md is auto-generated from the JSON and grouped by category"
  artifacts:
    - path: "schema/file-inventory.json"
      provides: "JSON Schema 2020-12 specification for file-inventory entries"
      contains: "$defs"
    - path: "tests/phase-01-inventory.test.cjs"
      provides: "Validates file-inventory.json against schema, asserts row count matches filesystem"
      min_lines: 40
    - path: "scripts/gen-inventory.cjs"
      provides: "Mechanical filesystem walker that classifies files via deterministic ruleset; emits both JSON and MD outputs"
      min_lines: 150
    - path: "decisions/file-inventory.json"
      provides: "ARCH-06 — single source of truth for keep/drop/merge per file"
      contains: '"version": "1"'
    - path: "decisions/file-inventory.md"
      provides: "Human-readable inventory index grouped by category"
      contains: "# File Inventory"
  key_links:
    - from: "scripts/gen-inventory.cjs"
      to: "schema/file-inventory.json"
      via: "load + validate-on-emit (uses tests/helpers/load-schema.cjs from Plan 01)"
      pattern: "require.*load-schema"
    - from: "scripts/gen-inventory.cjs"
      to: "decisions/agent-audit.md"
      via: "the 10 DROP agents and 23 KEEP agents in the ruleset MUST match the audit table"
      pattern: "gsd-(ai-researcher|eval-auditor|eval-planner|framework-selector|doc-classifier|doc-synthesizer|pattern-mapper|intel-updater|user-profiler|debug-session-manager)"
    - from: "tests/phase-01-inventory.test.cjs"
      to: "decisions/file-inventory.json"
      via: "fs.readFileSync + JSON.parse + validate against schema"
      pattern: "file-inventory\\.json"
threat_model:
  trust_boundaries: []
  threats:
    - id: "T-01-02-01"
      category: "Tampering"
      component: "scripts/gen-inventory.cjs ruleset (the keep/drop classifier)"
      disposition: "mitigate"
      mitigation: "Ruleset is deterministic Node code committed to git. Output JSON is committed; regeneration produces a stable diff (sorted by path). Test asserts row count + no unclassified rows. Accidental drift caught by re-running the script + git diff."
    - id: "T-01-02-02"
      category: "Information disclosure"
      component: "decisions/file-inventory.{json,md}"
      disposition: "accept"
      mitigation: "All file paths are public upstream. No secrets, no PII. Risk: none."
---

<objective>
Produce the canonical file-inventory artifact (ARCH-06): every file in both upstreams classified as keep / drop / merge, with target paths for keeps/merges. This unblocks Phase 2 (rebrand engine consults file-inventory to skip non-rebrand files), Phase 4 (bulk port iterates the keep/merge rows), and Phase 9 (sync pipeline diffs new upstream against the classified set).

Purpose: Without this artifact, Phases 4 and 9 must reinvent the keep/drop decision per file at execution time, leading to scope drift. The inventory is the contract.

Output:
- `schema/file-inventory.json` — JSON Schema (Wave 0)
- `tests/phase-01-inventory.test.cjs` — schema + count + completeness test (Wave 0)
- `scripts/gen-inventory.cjs` — deterministic classifier walker (Wave 1)
- `decisions/file-inventory.json` — generated SoT (Wave 1)
- `decisions/file-inventory.md` — generated human index (Wave 1)
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

<interfaces>
<!-- Inventory entry contract — what scripts/gen-inventory.cjs must emit, what tests/phase-01-inventory.test.cjs validates. -->

```typescript
type InventoryEntry = {
  path: string;                                                    // relative to upstream root
  upstream: 'gsd' | 'superpowers';
  verdict: 'keep' | 'drop' | 'merge';
  reason: string;                                                  // free-text, ≥1 char
  target_path?: string;                                            // required when verdict ∈ {keep, merge}
  deprecation_status?: 'active' | 'deprecated' | 'removed-upstream';
  rebrand_required: boolean;                                       // false for binary/license files
  merge_source_files?: string[];                                   // required when verdict === 'merge'
  phase_owner: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
  category: 'agent' | 'command' | 'workflow' | 'reference' | 'template' | 'context'
          | 'hook' | 'lib' | 'script' | 'test' | 'sdk' | 'manifest' | 'doc'
          | 'license' | 'asset' | 'config' | 'installer' | 'skill' | 'meta';
};

type InventoryFile = {
  version: '1';
  generated_at: string;            // ISO 8601
  upstream_versions: { gsd: string; superpowers: string };
  entries: InventoryEntry[];
};
```

Cross-plan dependency: this plan consumes Plan 01's `tests/helpers/load-schema.cjs` (zero-dep validator). Importing from `../tests/helpers/load-schema.cjs` is permitted in `scripts/gen-inventory.cjs` and `tests/phase-01-inventory.test.cjs`.
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Wave 0 — Author schema/file-inventory.json + tests/phase-01-inventory.test.cjs</name>
  <files>
    schema/file-inventory.json,
    tests/phase-01-inventory.test.cjs
  </files>
  <read_first>
    - .planning/phases/01-inventory-architecture-decisions/01-RESEARCH.md §"file-inventory.json Schema Design" (lines 665–737) — schema body to copy
    - .planning/phases/01-inventory-architecture-decisions/01-RESEARCH.md §"Generation strategy" (lines 739–753) — for the 1,128 expected file count
    - .planning/phases/01-inventory-architecture-decisions/01-VALIDATION.md §"Per-Task Verification Map" (row 1-02-W0-01)
    - tests/helpers/load-schema.cjs (Plan 01 — the validator the test will use)
    - decisions/ADR-08-inventory-format.md (locks the format this schema implements)
  </read_first>
  <behavior>
    - Schema validates a top-level object with required `version: '1'`, `generated_at` (date-time), `upstream_versions`, `entries[]`. Each entry has required fields and the conditional rules `verdict ∈ {keep,merge} → target_path required`, `verdict === 'merge' → merge_source_files required`.
    - Test (initially red — `decisions/file-inventory.json` does not exist):
      - Loads `decisions/file-inventory.json` and parses as JSON.
      - Validates against `schema/file-inventory.json` using `tests/helpers/load-schema.cjs`. Expects zero validation errors.
      - Asserts `entries.length === count returned by find foundation-frameworks/{get-shit-done-main,superpowers-main} -type f | wc -l`. (The exact number is computed at test time, not hardcoded.)
      - Asserts no entry has `verdict === 'unclassified'` (defensive — schema enum prevents this, but assert anyway).
      - Asserts every `keep`/`merge` entry has `target_path`.
      - Asserts every `merge` entry has `merge_source_files.length >= 1`.
      - Asserts `entries` are sorted by `path` ASC for stable diffs.
      - Asserts no duplicate `(upstream, path)` tuples.
  </behavior>
  <action>
**File 1: `schema/file-inventory.json`** — Write the schema VERBATIM from RESEARCH.md §"file-inventory.json Schema Design" lines 692–737, with `$id` updated to use the placeholder `{{GITHUB_OWNER}}` (the URL is not consumed by the validator; the placeholder is for documentation symmetry with rename-map's URL placeholder approach):

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://github.com/{{GITHUB_OWNER}}/oto-hybrid-framework/schema/file-inventory.json",
  "type": "object",
  "required": ["version", "generated_at", "entries"],
  "properties": {
    "version": { "type": "string", "const": "1" },
    "generated_at": { "type": "string", "pattern": "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}" },
    "upstream_versions": {
      "type": "object",
      "properties": {
        "gsd": { "type": "string" },
        "superpowers": { "type": "string" }
      }
    },
    "entries": {
      "type": "array",
      "items": { "$ref": "#/$defs/entry" }
    }
  },
  "$defs": {
    "entry": {
      "type": "object",
      "required": ["path", "upstream", "verdict", "reason", "rebrand_required", "phase_owner", "category"],
      "additionalProperties": false,
      "properties": {
        "path":            { "type": "string", "minLength": 1 },
        "upstream":        { "enum": ["gsd", "superpowers"] },
        "verdict":         { "enum": ["keep", "drop", "merge"] },
        "reason":          { "type": "string", "minLength": 1 },
        "target_path":     { "type": "string" },
        "deprecation_status": { "enum": ["active", "deprecated", "removed-upstream"] },
        "rebrand_required":{ "type": "boolean" },
        "merge_source_files":{ "type": "array", "items": { "type": "string" } },
        "phase_owner":     { "type": "integer", "minimum": 1, "maximum": 10 },
        "category":        { "enum": ["agent", "command", "workflow", "reference", "template", "context", "hook", "lib", "script", "test", "sdk", "manifest", "doc", "license", "asset", "config", "installer", "skill", "meta"] }
      },
      "allOf": [
        { "if": { "properties": { "verdict": { "enum": ["keep", "merge"] } }, "required": ["verdict"] }, "then": { "required": ["target_path"] } },
        { "if": { "properties": { "verdict": { "const": "merge" } }, "required": ["verdict"] }, "then": { "required": ["merge_source_files"] } }
      ]
    }
  }
}
```

**File 2: `tests/phase-01-inventory.test.cjs`** (~80 LOC):

```js
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');
const { validate } = require('./helpers/load-schema');

const REPO_ROOT = path.join(__dirname, '..');
const INVENTORY_PATH = path.join(REPO_ROOT, 'decisions', 'file-inventory.json');
const SCHEMA_PATH = path.join(REPO_ROOT, 'schema', 'file-inventory.json');

test('schema/file-inventory.json exists and is valid JSON', () => {
  assert.ok(fs.existsSync(SCHEMA_PATH), 'schema missing');
  const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));
  assert.equal(schema.version || schema.$schema && schema.$schema.includes('json-schema'), true, 'schema malformed');
});

test('decisions/file-inventory.json exists and is valid JSON', () => {
  assert.ok(fs.existsSync(INVENTORY_PATH), 'inventory missing — run scripts/gen-inventory.cjs');
  JSON.parse(fs.readFileSync(INVENTORY_PATH, 'utf8'));
});

test('inventory validates against schema', () => {
  const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));
  const data = JSON.parse(fs.readFileSync(INVENTORY_PATH, 'utf8'));
  const result = validate(data, schema);
  assert.ok(result.valid, `Schema errors:\n${result.errors.slice(0, 10).join('\n')}`);
});

test('entry count matches filesystem walk', () => {
  const data = JSON.parse(fs.readFileSync(INVENTORY_PATH, 'utf8'));
  const fsCount = parseInt(
    execSync('find foundation-frameworks/get-shit-done-main foundation-frameworks/superpowers-main -type f | wc -l', { cwd: REPO_ROOT }).toString().trim(),
    10
  );
  assert.equal(data.entries.length, fsCount, `Expected ${fsCount} entries, got ${data.entries.length}`);
});

test('every keep/merge has target_path', () => {
  const data = JSON.parse(fs.readFileSync(INVENTORY_PATH, 'utf8'));
  for (const e of data.entries) {
    if (e.verdict === 'keep' || e.verdict === 'merge') {
      assert.ok(e.target_path && e.target_path.length > 0, `${e.path}: ${e.verdict} but no target_path`);
    }
  }
});

test('every merge has merge_source_files', () => {
  const data = JSON.parse(fs.readFileSync(INVENTORY_PATH, 'utf8'));
  for (const e of data.entries) {
    if (e.verdict === 'merge') {
      assert.ok(Array.isArray(e.merge_source_files) && e.merge_source_files.length >= 1, `${e.path}: merge but no source files`);
    }
  }
});

test('entries sorted by path ASC', () => {
  const data = JSON.parse(fs.readFileSync(INVENTORY_PATH, 'utf8'));
  for (let i = 1; i < data.entries.length; i++) {
    const a = `${data.entries[i-1].upstream}/${data.entries[i-1].path}`;
    const b = `${data.entries[i].upstream}/${data.entries[i].path}`;
    assert.ok(a < b, `Out of order: ${a} >= ${b}`);
  }
});

test('no duplicate (upstream, path)', () => {
  const data = JSON.parse(fs.readFileSync(INVENTORY_PATH, 'utf8'));
  const seen = new Set();
  for (const e of data.entries) {
    const k = `${e.upstream}::${e.path}`;
    assert.ok(!seen.has(k), `Duplicate entry: ${k}`);
    seen.add(k);
  }
});

test('no unclassified verdicts', () => {
  const data = JSON.parse(fs.readFileSync(INVENTORY_PATH, 'utf8'));
  for (const e of data.entries) {
    assert.ok(['keep', 'drop', 'merge'].includes(e.verdict), `${e.path}: invalid verdict ${e.verdict}`);
  }
});
```

After creating both files, run `node --test tests/phase-01-inventory.test.cjs` and confirm RED (the inventory file doesn't yet exist). Commit `test(01-02): add file-inventory schema + validation test [Wave 0]`.
  </action>
  <verify>
    <automated>node --test tests/phase-01-inventory.test.cjs 2>&1 | grep -E '# fail|# pass'</automated>
  </verify>
  <acceptance_criteria>
    - File `schema/file-inventory.json` exists and is valid JSON: `node -e "JSON.parse(require('fs').readFileSync('schema/file-inventory.json'))"` exits 0.
    - Schema contains the literal string `additionalProperties": false`: `grep -c 'additionalProperties' schema/file-inventory.json` returns ≥1.
    - Schema enumerates all 19 categories: `grep -oE '"(agent|command|workflow|reference|template|context|hook|lib|script|test|sdk|manifest|doc|license|asset|config|installer|skill|meta)"' schema/file-inventory.json | sort -u | wc -l` returns `19`.
    - File `tests/phase-01-inventory.test.cjs` exists and has ≥40 lines.
    - Test file imports from `./helpers/load-schema`: `grep -c "helpers/load-schema" tests/phase-01-inventory.test.cjs` returns ≥1.
    - Running `node --test tests/phase-01-inventory.test.cjs` exits non-zero (RED — inventory file does not exist).
  </acceptance_criteria>
  <done>Schema + test scaffolding committed. Test runs (RED). Helper-import works.</done>
</task>

<task type="auto">
  <name>Task 2: Wave 1 — Build scripts/gen-inventory.cjs and emit decisions/file-inventory.{json,md}</name>
  <files>
    scripts/gen-inventory.cjs,
    decisions/file-inventory.json,
    decisions/file-inventory.md
  </files>
  <read_first>
    - .planning/phases/01-inventory-architecture-decisions/01-RESEARCH.md §"Concrete File Lists" (lines 184–344) — agent + command + workflow + lib + skill + hook enumerations
    - .planning/phases/01-inventory-architecture-decisions/01-RESEARCH.md §"Generation strategy" (lines 739–753)
    - .planning/phases/01-inventory-architecture-decisions/01-RESEARCH.md §"Risks & Pitfalls" (lines 809–841) — Risk B (8 workflow-only files), Risk D (translated docs), Risk E (gsd-tools.cjs deprecation)
    - decisions/ADR-14-inventory-scope.md (drop policy: translated docs, OpenCode, Cursor/Windsurf/etc.)
    - decisions/ADR-07-agent-trim.md (the 10 DROP agents)
    - decisions/agent-audit.md (cross-check the 10 drops match)
    - schema/file-inventory.json (the contract this script must satisfy)
    - tests/helpers/load-schema.cjs (used to validate output before write)
  </read_first>
  <action>
Create `scripts/gen-inventory.cjs` — a deterministic Node CJS walker that classifies every file under both upstream roots and emits the SoT JSON + a generated MD index.

**Implementation contract:**

The script is mechanical. It walks `foundation-frameworks/get-shit-done-main/` (982 expected files) and `foundation-frameworks/superpowers-main/` (146 expected files), applying ordered classification rules. First match wins per file. After classification, every file MUST have a verdict.

Rule order (FIRST match wins). Each rule returns either `null` (no match — try next rule) or an `{verdict, reason, target_path?, deprecation_status?, rebrand_required, merge_source_files?, phase_owner, category}` partial.

```js
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { validate } = require('../tests/helpers/load-schema');

const REPO_ROOT = path.join(__dirname, '..');
const GSD_ROOT = 'foundation-frameworks/get-shit-done-main';
const SP_ROOT = 'foundation-frameworks/superpowers-main';
const SCHEMA = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'schema', 'file-inventory.json'), 'utf8'));

// The 10 DROP agents (must match decisions/agent-audit.md)
const DROP_AGENTS = new Set([
  'gsd-ai-researcher','gsd-eval-auditor','gsd-eval-planner','gsd-framework-selector',
  'gsd-doc-classifier','gsd-doc-synthesizer',
  'gsd-pattern-mapper','gsd-intel-updater','gsd-user-profiler','gsd-debug-session-manager',
]);

// Hooks per RESEARCH §"Hooks Fleet"
const HOOK_VERDICTS = {
  'gsd-check-update.js': { verdict: 'drop', reason: 'oto has its own update mechanism via npm install -g github:#vX.Y.Z' },
  'gsd-check-update-worker.js': { verdict: 'drop', reason: 'paired with check-update; dropped together' },
  'gsd-context-monitor.js': { verdict: 'keep', target: 'oto-context-monitor.js', reason: 'HK-03' },
  'gsd-statusline.js': { verdict: 'keep', target: 'oto-statusline.js', reason: 'HK-02' },
  'gsd-session-state.sh': { verdict: 'merge', target: 'oto-session-start', reason: 'HK-01 — D-08 consolidation', sources: ['foundation-frameworks/get-shit-done-main/hooks/gsd-session-state.sh','foundation-frameworks/superpowers-main/hooks/session-start'] },
  'gsd-prompt-guard.js': { verdict: 'keep', target: 'oto-prompt-guard.js', reason: 'HK-04' },
  'gsd-read-guard.js': { verdict: 'drop', reason: 'DROP (review) per RESEARCH §Hooks Fleet — A7 user-confirm; recommended drop, redundant once Claude is daily-use stable' },
  'gsd-read-injection-scanner.js': { verdict: 'keep', target: 'oto-read-injection-scanner.js', reason: 'HK-05' },
  'gsd-validate-commit.sh': { verdict: 'keep', target: 'oto-validate-commit.sh', reason: 'HK-06' },
  'gsd-workflow-guard.js': { verdict: 'drop', reason: 'DROP (review) per RESEARCH §Hooks Fleet — A7 user-confirm' },
  'gsd-phase-boundary.sh': { verdict: 'drop', reason: 'DROP (review) per RESEARCH §Hooks Fleet — A7 user-confirm; redundant with statusline' },
};

// Skills per RESEARCH §"Superpowers Skills"
const SKILL_VERDICTS = {
  'test-driven-development': { verdict: 'keep', target: 'test-driven-development', reason: 'SKL-01' },
  'systematic-debugging': { verdict: 'keep', target: 'systematic-debugging', reason: 'SKL-02' },
  'verification-before-completion': { verdict: 'keep', target: 'verification-before-completion', reason: 'SKL-03' },
  'dispatching-parallel-agents': { verdict: 'keep', target: 'dispatching-parallel-agents', reason: 'SKL-04' },
  'using-git-worktrees': { verdict: 'keep', target: 'using-git-worktrees', reason: 'SKL-05' },
  'writing-skills': { verdict: 'keep', target: 'writing-skills', reason: 'SKL-06' },
  'using-superpowers': { verdict: 'keep', target: 'using-oto', reason: 'SKL-07 — renamed per ADR-06; bootstrap retuned per ADR-03' },
  'brainstorming': { verdict: 'drop', reason: 'Overlaps /oto-discuss-phase (FEATURES.md O1) — workflow wins per ADR-03' },
  'writing-plans': { verdict: 'drop', reason: 'Overlaps /oto-plan-phase — workflow wins; rigor folds into oto-planner agent prompt' },
  'executing-plans': { verdict: 'drop', reason: 'Overlaps /oto-execute-phase — workflow wins' },
  'subagent-driven-development': { verdict: 'drop', reason: 'Overlaps GSD wave engine — folded into oto-executor' },
  'requesting-code-review': { verdict: 'drop', reason: 'Overlaps /oto-code-review — workflow wins' },
  'receiving-code-review': { verdict: 'drop', reason: 'No v1 invocation point; v2 candidate' },
  'finishing-a-development-branch': { verdict: 'drop', reason: 'Overlaps /oto-ship — workflow wins' },
};

// Eleven dropped runtime branches in installer (Phase 3 INS-01)
const DROPPED_RUNTIMES_PATTERN = /\.(opencode|kilo|cursor|windsurf|antigravity|augment|trae|qwen|codebuddy|cline|copilot)-?(plugin)?(\/|$)/i;

function classify(upstream, relPath) {
  const lower = relPath.toLowerCase();
  const filename = path.basename(relPath);

  // 1. License files — keep, no rebrand
  if (/^LICENSE(\.md)?$/.test(filename) || filename === 'THIRD-PARTY-LICENSES.md') {
    return { verdict: 'keep', reason: 'License file preserved verbatim per ADR-13', target_path: `THIRD-PARTY-LICENSES.md (consolidated)`, rebrand_required: false, phase_owner: 1, category: 'license' };
  }

  // 2. foundation-frameworks/ self-references inside upstream — N/A (we ARE inside it). Skip.

  // 3. Translated READMEs/docs — drop per ADR-14
  if (/^(README\.(ja-JP|ko-KR|pt-BR|zh-CN)\.md|docs\/[a-z]{2}-[A-Z]{2}\/)/i.test(relPath)) {
    return { verdict: 'drop', reason: 'Translated doc — out of scope per ADR-14 (English only)', rebrand_required: false, phase_owner: 1, category: 'doc' };
  }

  // 4. OpenCode + 10 other dropped runtimes
  if (DROPPED_RUNTIMES_PATTERN.test(relPath)) {
    return { verdict: 'drop', reason: 'Runtime out of scope per ADR-14 (only Claude/Codex/Gemini supported)', rebrand_required: false, phase_owner: 1, category: 'manifest' };
  }

  // 5. Windows-only files (.cmd) — drop per PROJECT.md out-of-scope
  if (/\.cmd$/i.test(filename)) {
    return { verdict: 'drop', reason: 'Windows out of scope', rebrand_required: false, phase_owner: 1, category: 'script' };
  }

  // 6. SDK subpackage (gsd) — drop per ADR-12
  if (upstream === 'gsd' && /^sdk\//.test(relPath)) {
    return { verdict: 'drop', reason: 'SDK dropped from v1 per ADR-12 (D-18)', rebrand_required: false, phase_owner: 1, category: 'sdk' };
  }

  // 7. Tests in gsd — drop (oto re-derives in Phase 10)
  if (upstream === 'gsd' && /^tests\//.test(relPath)) {
    return { verdict: 'drop', reason: 'Upstream test harness; oto re-derives test surface in Phase 10', rebrand_required: false, phase_owner: 1, category: 'test' };
  }

  // 8. Tests in superpowers — drop (Superpowers' contributor-facing tests, per PROJECT.md out-of-scope)
  if (upstream === 'superpowers' && /^tests\//.test(relPath)) {
    return { verdict: 'drop', reason: 'Superpowers contributor-facing test harness; out of scope per PROJECT.md', rebrand_required: false, phase_owner: 1, category: 'test' };
  }

  // 9. Specific GSD anti-features (commands)
  if (upstream === 'gsd' && /^commands\/gsd\/(join-discord|from-gsd2|ultraplan-phase|node-repair|inbox|graphify|intel|thread|profile-user|reapply-patches)\.md$/.test(relPath)) {
    return { verdict: 'drop', reason: 'Anti-feature drop per PROJECT.md / NICH-V2 (community, BETA, GSD-2 migration, or v2-deferred command)', rebrand_required: false, phase_owner: 1, category: 'command' };
  }

  // 10. GSD agents — keep or drop based on DROP_AGENTS set
  if (upstream === 'gsd' && /^agents\/gsd-[a-z-]+\.md$/.test(relPath)) {
    const agentName = filename.replace(/\.md$/, '');
    if (DROP_AGENTS.has(agentName)) {
      return { verdict: 'drop', reason: `Agent dropped per ADR-07 (D-12 trim) — see decisions/agent-audit.md`, rebrand_required: false, phase_owner: 1, category: 'agent' };
    }
    const otoName = agentName.replace(/^gsd-/, 'oto-');
    return { verdict: 'keep', reason: 'Phase 4 agent port (AGT-03)', target_path: `agents/${otoName}.md`, rebrand_required: true, phase_owner: 4, category: 'agent' };
  }

  // 11. Superpowers agent collision — drop code-reviewer per ADR-05
  if (upstream === 'superpowers' && relPath === 'agents/code-reviewer.md') {
    return { verdict: 'drop', reason: 'Collision with oto-code-reviewer; resolved per ADR-05', rebrand_required: false, phase_owner: 1, category: 'agent' };
  }

  // 12. GSD commands — keep all surviving (Phase 4 maps to /oto-* equivalents per WF-*)
  if (upstream === 'gsd' && /^commands\/gsd\/[a-z-]+\.md$/.test(relPath)) {
    const cmd = filename.replace(/\.md$/, '');
    return { verdict: 'keep', reason: 'GSD command ported to /oto- equivalent per WF-*', target_path: `commands/oto/${cmd}.md`, rebrand_required: true, phase_owner: 4, category: 'command' };
  }

  // 13. GSD workflows — keep (8 workflow-only files retained per Risk B)
  if (upstream === 'gsd' && /^get-shit-done\/workflows\/.*\.md$/.test(relPath)) {
    const target = relPath.replace(/^get-shit-done\//, 'oto/');
    return { verdict: 'keep', reason: 'Phase 4 workflow port (WF-*); 8 workflow-only files retained per RESEARCH §Risk B', target_path: target, rebrand_required: true, phase_owner: 4, category: 'workflow' };
  }

  // 14. GSD bin/lib/*.cjs — keep all (Phase 4 bulk rebrand)
  if (upstream === 'gsd' && /^get-shit-done\/bin\/lib\/.*\.cjs$/.test(relPath)) {
    const target = relPath.replace(/^get-shit-done\//, 'oto/');
    return { verdict: 'keep', reason: 'Phase 4 lib port — bulk rebrand', target_path: target, rebrand_required: true, phase_owner: 4, category: 'lib' };
  }

  // 15. gsd-tools.cjs — merge, deprecation_status: deprecated per Pitfall 22 / Risk E
  if (upstream === 'gsd' && relPath === 'get-shit-done/bin/gsd-tools.cjs') {
    return { verdict: 'merge', reason: 'D-18 fork of deprecated gsd-tools.cjs (Pitfall 22 / Risk E); oto carries forward independently if upstream deletes', target_path: 'oto/bin/lib/oto-tools.cjs', deprecation_status: 'deprecated', rebrand_required: true, merge_source_files: ['foundation-frameworks/get-shit-done-main/get-shit-done/bin/gsd-tools.cjs'], phase_owner: 4, category: 'lib' };
  }

  // 16. GSD installer — merge (Phase 3 trims 11 runtime branches)
  if (upstream === 'gsd' && relPath === 'bin/install.js') {
    return { verdict: 'merge', reason: 'Phase 3 fork — trim 11 unwanted runtimes per INS-01', target_path: 'bin/install.js', rebrand_required: true, merge_source_files: ['foundation-frameworks/get-shit-done-main/bin/install.js'], phase_owner: 3, category: 'installer' };
  }

  // 17. GSD package.json — merge (Phase 2 reshape)
  if (upstream === 'gsd' && relPath === 'package.json') {
    return { verdict: 'merge', reason: 'Phase 2 — adapt package.json shape per FND-01..04', target_path: 'package.json', rebrand_required: true, merge_source_files: ['foundation-frameworks/get-shit-done-main/package.json'], phase_owner: 2, category: 'config' };
  }

  // 18. GSD hooks
  if (upstream === 'gsd' && /^hooks\/[^/]+$/.test(relPath)) {
    const v = HOOK_VERDICTS[filename];
    if (v) {
      const out = { verdict: v.verdict, reason: v.reason, rebrand_required: v.verdict !== 'drop', phase_owner: 5, category: 'hook' };
      if (v.target) out.target_path = `hooks/${v.target}`;
      if (v.sources) out.merge_source_files = v.sources;
      return out;
    }
  }

  // 19. Superpowers session-start hook — handled as part of merge in rule 18 (gsd-session-state.sh).
  // Mark superpowers/hooks/session-start with verdict: merge, target same as the GSD merge target.
  if (upstream === 'superpowers' && relPath === 'hooks/session-start') {
    return { verdict: 'merge', reason: 'Source for oto-session-start consolidation per HK-01 / ADR-04 (D-08)', target_path: 'hooks/oto-session-start', rebrand_required: true, merge_source_files: ['foundation-frameworks/get-shit-done-main/hooks/gsd-session-state.sh','foundation-frameworks/superpowers-main/hooks/session-start'], phase_owner: 5, category: 'hook' };
  }

  // 20. Superpowers hook config files — drop
  if (upstream === 'superpowers' && /^hooks\/(hooks\.json|hooks-cursor\.json|run-hook\.cmd)$/.test(relPath)) {
    return { verdict: 'drop', reason: 'Replaced by oto installer hook registration', rebrand_required: false, phase_owner: 1, category: 'config' };
  }

  // 21. Superpowers skills
  if (upstream === 'superpowers' && /^skills\/([^/]+)\//.test(relPath)) {
    const skillName = relPath.match(/^skills\/([^/]+)\//)[1];
    const v = SKILL_VERDICTS[skillName];
    if (v) {
      const subPath = relPath.replace(/^skills\/[^/]+\//, '');
      if (v.verdict === 'keep') {
        return { verdict: 'keep', reason: v.reason, target_path: `skills/${v.target}/${subPath}`, rebrand_required: true, phase_owner: 6, category: 'skill' };
      }
      return { verdict: 'drop', reason: v.reason, rebrand_required: false, phase_owner: 1, category: 'skill' };
    }
  }

  // 22. Generic catch-alls by extension/path
  if (/\.(png|jpg|jpeg|gif|svg|ico|webp|woff2?|ttf|otf)$/i.test(filename)) {
    return { verdict: 'drop', reason: 'Binary asset not relevant to oto fork', rebrand_required: false, phase_owner: 1, category: 'asset' };
  }
  if (/^CHANGELOG/.test(filename) || /^RELEASE-NOTES/.test(filename)) {
    return { verdict: 'drop', reason: 'Upstream changelog; oto maintains its own', rebrand_required: false, phase_owner: 1, category: 'doc' };
  }
  if (filename === 'README.md') {
    return { verdict: 'drop', reason: 'oto authors its own README per DOC-01 (Phase 10)', rebrand_required: false, phase_owner: 1, category: 'doc' };
  }
  if (/^docs\//.test(relPath)) {
    return { verdict: 'drop', reason: 'Upstream docs; oto authors its own per DOC-01..04', rebrand_required: false, phase_owner: 1, category: 'doc' };
  }
  if (/^scripts\//.test(relPath)) {
    return { verdict: 'drop', reason: 'Upstream tooling; oto re-derives needed scripts', rebrand_required: false, phase_owner: 1, category: 'script' };
  }
  if (/^get-shit-done\/(references|templates|contexts)\//.test(relPath)) {
    const cat = relPath.match(/^get-shit-done\/([a-z]+)\//)[1];
    const target = relPath.replace(/^get-shit-done\//, 'oto/');
    const catEnum = cat === 'references' ? 'reference' : cat === 'contexts' ? 'context' : 'template';
    return { verdict: 'keep', reason: `Phase 4 ${cat} port`, target_path: target, rebrand_required: true, phase_owner: 4, category: catEnum };
  }
  if (filename === 'AGENTS.md' || filename === 'CLAUDE.md' || filename === 'GEMINI.md') {
    return { verdict: 'drop', reason: 'oto generates instruction files from single source-of-truth template per MR-02 (Phase 8)', rebrand_required: false, phase_owner: 1, category: 'meta' };
  }

  // 23. Catch-all — meta/manifest at upstream root
  return { verdict: 'drop', reason: 'Upstream meta file not needed by oto fork (manifest, dotfile, etc.)', rebrand_required: false, phase_owner: 1, category: 'meta' };
}

function walk(rootRel) {
  const out = [];
  const abs = path.join(REPO_ROOT, rootRel);
  function recurse(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) recurse(full);
      else if (entry.isFile()) out.push(path.relative(abs, full).split(path.sep).join('/'));
    }
  }
  recurse(abs);
  return out.sort();
}

function main() {
  const entries = [];
  for (const [up, root] of [['gsd', GSD_ROOT], ['superpowers', SP_ROOT]]) {
    for (const rel of walk(root)) {
      const cls = classify(up, rel);
      entries.push({ path: rel, upstream: up, ...cls });
    }
  }
  entries.sort((a, b) => `${a.upstream}::${a.path}`.localeCompare(`${b.upstream}::${b.path}`));

  const output = {
    version: '1',
    generated_at: new Date().toISOString(),
    upstream_versions: { gsd: 'v1.38.5', superpowers: 'v5.0.7' },
    entries,
  };

  // Self-validate before write
  const result = validate(output, SCHEMA);
  if (!result.valid) {
    console.error('SCHEMA VALIDATION FAILED:');
    for (const e of result.errors.slice(0, 20)) console.error('  ' + e);
    process.exit(1);
  }

  fs.writeFileSync(path.join(REPO_ROOT, 'decisions', 'file-inventory.json'), JSON.stringify(output, null, 2) + '\n');

  // Generate MD index grouped by category
  const md = generateMarkdown(output);
  fs.writeFileSync(path.join(REPO_ROOT, 'decisions', 'file-inventory.md'), md);

  const summary = {};
  for (const e of entries) {
    summary[e.verdict] = (summary[e.verdict] || 0) + 1;
  }
  console.log(`Wrote ${entries.length} entries:`, summary);
}

function generateMarkdown(data) {
  let md = `# File Inventory\n\n`;
  md += `> Generated by \`scripts/gen-inventory.cjs\` from \`schema/file-inventory.json\`. Source of truth is \`decisions/file-inventory.json\`. Do not edit by hand.\n\n`;
  md += `**Generated:** ${data.generated_at}\n`;
  md += `**Upstream versions:** GSD ${data.upstream_versions.gsd}, Superpowers ${data.upstream_versions.superpowers}\n`;
  md += `**Entry count:** ${data.entries.length}\n\n`;

  const counts = { keep: 0, drop: 0, merge: 0 };
  for (const e of data.entries) counts[e.verdict]++;
  md += `## Summary\n\n`;
  md += `- KEEP: ${counts.keep}\n- DROP: ${counts.drop}\n- MERGE: ${counts.merge}\n\n`;

  const byCategory = {};
  for (const e of data.entries) {
    if (!byCategory[e.category]) byCategory[e.category] = [];
    byCategory[e.category].push(e);
  }
  for (const cat of Object.keys(byCategory).sort()) {
    md += `## ${cat}\n\n`;
    md += `| Path | Upstream | Verdict | Target | Reason |\n|------|----------|---------|--------|--------|\n`;
    for (const e of byCategory[cat]) {
      md += `| \`${e.path}\` | ${e.upstream} | ${e.verdict.toUpperCase()} | ${e.target_path ? '`'+e.target_path+'`' : '—'} | ${e.reason.replace(/\|/g,'\\|')} |\n`;
    }
    md += '\n';
  }
  return md;
}

main();
```

After writing the script, run it: `node scripts/gen-inventory.cjs`. The script self-validates before writing, so any rule that produces a schema-invalid entry will fail loudly. If the script exits 0, both `decisions/file-inventory.json` and `decisions/file-inventory.md` are written.

Then run `node --test tests/phase-01-inventory.test.cjs` and confirm GREEN.

Then run a manual hand-classification spot-check against Risk B (8 workflow-only files in GSD): verify entries for `diagnose-issues.md`, `discovery-phase.md`, `execute-plan.md`, `graduation.md`, `node-repair.md`, `resume-project.md`, `transition.md`, `verify-phase.md` all exist with `verdict: keep` AND `phase_owner: 4` (rule 13 covers this — workflow-only files inherit the workflow keep rule).

Commit cadence (per Q4): one commit for the script (`feat(01-02): add gen-inventory.cjs walker`), one commit for the generated outputs (`docs(01-02): generate decisions/file-inventory.{json,md} (ARCH-06)`).
  </action>
  <verify>
    <automated>node scripts/gen-inventory.cjs && node --test tests/phase-01-inventory.test.cjs</automated>
  </verify>
  <acceptance_criteria>
    - File `scripts/gen-inventory.cjs` exists, ≥150 lines (`wc -l < scripts/gen-inventory.cjs` ≥ 150).
    - Running `node scripts/gen-inventory.cjs` exits 0 and prints a summary of the form `Wrote N entries: { keep: X, drop: Y, merge: Z }`.
    - File `decisions/file-inventory.json` exists and parses as valid JSON.
    - Row count equals filesystem count: `node -e "const j=require('./decisions/file-inventory.json'); const {execSync}=require('child_process'); const c=parseInt(execSync('find foundation-frameworks/get-shit-done-main foundation-frameworks/superpowers-main -type f | wc -l').toString()); console.log(j.entries.length === c ? 'MATCH' : 'MISMATCH:'+j.entries.length+'!='+c)"` prints `MATCH`.
    - Schema validation: `node --test tests/phase-01-inventory.test.cjs` exits 0 (all 8 sub-tests pass).
    - The 10 DROP agents from agent-audit.md all have entries with `verdict: 'drop'`: `node -e "const j=require('./decisions/file-inventory.json'); const drops=['gsd-ai-researcher','gsd-eval-auditor','gsd-eval-planner','gsd-framework-selector','gsd-doc-classifier','gsd-doc-synthesizer','gsd-pattern-mapper','gsd-intel-updater','gsd-user-profiler','gsd-debug-session-manager']; for(const a of drops){const e=j.entries.find(x=>x.path==='agents/'+a+'.md'&&x.upstream==='gsd');if(!e||e.verdict!=='drop')console.log('FAIL:'+a);}"` prints nothing.
    - Superpowers `agents/code-reviewer.md` is `verdict: drop`: `node -e "const j=require('./decisions/file-inventory.json'); const e=j.entries.find(x=>x.upstream==='superpowers'&&x.path==='agents/code-reviewer.md'); console.log(e&&e.verdict==='drop'?'OK':'FAIL')"` prints `OK`.
    - The 8 workflow-only files all have `verdict: keep`: `node -e "const j=require('./decisions/file-inventory.json'); const wo=['diagnose-issues.md','discovery-phase.md','execute-plan.md','graduation.md','node-repair.md','resume-project.md','transition.md','verify-phase.md']; for(const f of wo){const e=j.entries.find(x=>x.upstream==='gsd'&&x.path==='get-shit-done/workflows/'+f);if(!e||e.verdict!=='keep')console.log('FAIL:'+f);}"` prints nothing.
    - `gsd-tools.cjs` has `verdict: merge` and `deprecation_status: deprecated`: `node -e "const j=require('./decisions/file-inventory.json'); const e=j.entries.find(x=>x.path==='get-shit-done/bin/gsd-tools.cjs'); console.log(e.verdict==='merge'&&e.deprecation_status==='deprecated'?'OK':'FAIL')"` prints `OK`.
    - SessionStart consolidation has both source files as merge_source_files: `node -e "const j=require('./decisions/file-inventory.json'); const e=j.entries.find(x=>x.path==='hooks/gsd-session-state.sh'&&x.upstream==='gsd'); console.log(e.merge_source_files.length===2?'OK':'FAIL')"` prints `OK`.
    - File `decisions/file-inventory.md` exists, contains `# File Inventory` heading, and is grouped by category with the 19 categories appearing as `## ` headings: `grep -cE '^## (agent|command|workflow|reference|template|context|hook|lib|script|test|sdk|manifest|doc|license|asset|config|installer|skill|meta)$' decisions/file-inventory.md` returns ≥10 (some categories may have zero entries and be omitted; require ≥10 of the 19).
    - Plan 01's decisions-dir test now passes: `node --test tests/phase-01-decisions-dir.test.cjs` exits 0 (decisions/ now has 14 ADRs + skill-vs-command.md + agent-audit.md + file-inventory.{json,md} = 18 files).
  </acceptance_criteria>
  <done>Inventory script committed and run. Both output files committed. All 5 inventory tests pass. Plan 01's decisions-dir test now green.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

No runtime trust boundaries — Plan 02 is build-time generation that runs locally on user's machine. The script has filesystem read access to `foundation-frameworks/` (already on disk) and write access to `decisions/`. No network, no user input, no external code execution.

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-01-02-01 | Tampering | scripts/gen-inventory.cjs ruleset drift | mitigate | Output is committed JSON; regeneration produces a deterministic diff (sorted by `(upstream, path)`). The 10-agent DROP set is a literal `Set` constant — drift detected by comparing to `decisions/agent-audit.md` (cross-referenced in the script's read_first). |
| T-01-02-02 | Information disclosure | decisions/file-inventory.{json,md} | accept | All file paths are public upstream content. No secrets surfaced. |
| T-01-02-03 | DoS | filesystem walk with `withFileTypes: true` | accept | ~1,128 files, sub-second walk. No symlink loops in upstream snapshots (verified absent). |
</threat_model>

<verification>
- `node scripts/gen-inventory.cjs` exits 0 and produces both output files.
- `node --test tests/phase-01-inventory.test.cjs` exits 0 with all 8 sub-tests passing.
- Row count equals filesystem count.
- All 10 DROP agents from `decisions/agent-audit.md` have matching `verdict: drop` entries in inventory.
- Plan 01's `tests/phase-01-decisions-dir.test.cjs` now passes (decisions/ reaches 18 files).
</verification>

<success_criteria>
- ROADMAP success criterion 3 satisfied: file-inventory categorizes every file as keep/drop/merge with reason; no unclassified rows.
- ARCH-06 requirement closed.
- Inventory is reproducible: anyone running `node scripts/gen-inventory.cjs` produces a byte-identical output (sorted, deterministic timestamps notwithstanding).
- Cross-plan invariant: the 10 DROP agents in inventory match the 10 DROP rows in `decisions/agent-audit.md`.
</success_criteria>

<output>
Create `.planning/phases/01-inventory-architecture-decisions/01-02-SUMMARY.md` per template. Include:
- Final entry counts (keep / drop / merge) from the script run
- Validation status (all 8 inventory tests green)
- Cross-references confirmed (agent-audit ↔ inventory drop set)
- Handoff to Plan 03 (the rename-map.json `deprecated_drop` field can now be populated from `entries.filter(e => e.verdict === 'drop' && e.deprecation_status === 'deprecated')` if the rebrand engine ever needs it; for v1 it stays empty per RESEARCH §"Concrete entries")
</output>
