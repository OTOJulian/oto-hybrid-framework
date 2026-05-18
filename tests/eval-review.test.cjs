// tests/eval-review.test.cjs
// Structural assertions for /oto-eval-review (Phase 3 TEST-02).
'use strict';

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const COMMAND_PATH = path.join(ROOT, 'oto/commands/oto/eval-review.md');
const WORKFLOW_PATH = path.join(ROOT, 'oto/workflows/eval-review.md');
const AUDITOR_PATH = path.join(ROOT, 'oto/agents/oto-eval-auditor.md');
const EVALS_REF_PATH = path.join(ROOT, 'oto/references/ai-evals.md');

describe('eval-review file structure (TEST-02)', () => {
  test('required eval-review files exist', () => {
    for (const file of [COMMAND_PATH, WORKFLOW_PATH, AUDITOR_PATH, EVALS_REF_PATH]) {
      assert.ok(fs.existsSync(file), `${path.relative(ROOT, file)} must exist`);
    }
  });
});

describe('eval-review command frontmatter', () => {
  const content = fs.readFileSync(COMMAND_PATH, 'utf8');

  test('declares the oto:eval-review command name', () => {
    assert.match(content, /^name:\s*oto:eval-review$/m);
  });

  test('declares a phase argument hint', () => {
    const match = content.match(/^argument-hint:\s*"(.+)"$/m);
    assert.ok(match, 'argument-hint line must be present');
    assert.ok(match[1].includes('phase'), 'argument-hint must mention phase');
  });

  test('allows Task dispatch', () => {
    assert.ok(content.includes('- Task'));
  });

  test('references the workflow and ai-evals framework', () => {
    assert.ok(content.includes('@~/.claude/oto/workflows/eval-review.md'));
    assert.ok(content.includes('@~/.claude/oto/references/ai-evals.md'));
  });
});

describe('eval-review workflow content', () => {
  const content = fs.readFileSync(WORKFLOW_PATH, 'utf8');

  test('locks SDK-DEFER-01 fallback assertions', () => {
    assert.match(content, /oto-sdk query init\.phase-op[^\n]*2>\/dev\/null \|\| /);
    assert.match(content, /oto-sdk query resolve-model oto-eval-auditor[^\n]*2>\/dev\/null/);
  });

  test('detects all input states', () => {
    assert.ok(content.includes('State A'));
    assert.ok(content.includes('State B'));
    assert.ok(content.includes('State C'));
  });

  test('dispatches oto-eval-auditor with orchestrator persistence', () => {
    assert.ok(content.includes('oto-eval-auditor'));
    const lines = content.split('\n');
    let found = false;
    lines.forEach((line, idx) => {
      if (!line.includes('oto-eval-auditor')) return;
      const start = Math.max(0, idx - 12);
      const end = Math.min(lines.length, idx + 13);
      if (/orchestrator/i.test(lines.slice(start, end).join('\n'))) found = true;
    });
    assert.ok(found, 'orchestrator wording must appear near an oto-eval-auditor mention');
  });

  test('names output, scoring, and verdict vocabulary', () => {
    assert.ok(content.includes('EVAL-REVIEW.md'));
    assert.ok(content.includes('COVERED'));
    assert.ok(content.includes('PARTIAL'));
    assert.ok(content.includes('MISSING'));
    assert.ok(content.includes('PRODUCTION READY'));
    assert.ok(content.includes('NEEDS WORK'));
    assert.ok(content.includes('SIGNIFICANT GAPS'));
    assert.ok(content.includes('NOT IMPLEMENTED'));
  });

  test('contains no deferral markers or gsd auditor token leakage', () => {
    assert.ok(!/intentionally non-executable/i.test(content));
    assert.ok(!/\bDEFERRED\b/.test(content));
    assert.ok(!content.includes('gsd-eval-auditor'));
  });
});

describe('oto-eval-auditor agent (D-04 read-only locked)', () => {
  const content = fs.readFileSync(AUDITOR_PATH, 'utf8');

  test('declares Read but not Write', () => {
    assert.match(content, /^tools:\s*.*Read/m);
    const toolsLine = content.match(/^tools:.*$/m)?.[0] || '';
    assert.ok(!/\bWrite\b/.test(toolsLine), 'oto-eval-auditor must not declare Write (read-only sandbox per Phase 1 D-04)');
  });

  test('echoes scoring vocabulary', () => {
    assert.ok(content.includes('COVERED'));
    assert.ok(content.includes('PARTIAL'));
    assert.ok(content.includes('MISSING'));
  });
});
