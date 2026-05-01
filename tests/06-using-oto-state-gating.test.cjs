'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..');
const SKILL_PATH = path.join(REPO_ROOT, 'oto/skills/using-oto/SKILL.md');
const STATE_FIXTURE = path.join(__dirname, 'skills/__fixtures__/STATE-active.md');

// Banned substrings - Pitfall 15 / T-15. Mirrors tests/05-session-start-fixture.test.cjs.
const BANNED_LITERALS = [
  'superpowers',
  'Superpowers',
  'using-superpowers',
  'You have superpowers',
  '94% PR rejection',
  'fabricated content',
  'protect your human partner from PR rejection',
];

// STATE.md status values the gating directive claims to recognize.
const RECOGNIZED_STATUSES = ['execute_phase', 'plan_phase', 'debug', 'verify'];

test('phase-06 D-09: using-oto/SKILL.md contains STATE.md gating directive marker', () => {
  const body = fs.readFileSync(SKILL_PATH, 'utf8');
  assert.ok(body.includes('<!-- oto:state-gating-directive -->'));
  assert.ok(body.includes('<!-- /oto:state-gating-directive -->'));
  assert.ok(body.includes('.oto/STATE.md'));
  assert.ok(body.toLowerCase().includes('suppress'));
  for (const status of RECOGNIZED_STATUSES) {
    assert.ok(body.includes(status), `missing recognized status: ${status}`);
  }
});

test('phase-06 Pitfall 15: using-oto/SKILL.md contains no upstream-identity literals', () => {
  const body = fs.readFileSync(SKILL_PATH, 'utf8');
  for (const banned of BANNED_LITERALS) {
    assert.equal(body.indexOf(banned), -1, `Pitfall 15: upstream identity leaked: ${banned}`);
  }
});

test('phase-06 D-09: using-oto/SKILL.md preserves Phase 5 D-05 locked identity sentence', () => {
  const body = fs.readFileSync(SKILL_PATH, 'utf8');
  assert.ok(body.includes('You are using oto.'));
});

test('phase-06 D-09: STATE-active fixture file is well-formed', () => {
  const body = fs.readFileSync(STATE_FIXTURE, 'utf8');
  assert.ok(body.startsWith('---\n'));
  assert.ok(body.includes('status: execute_phase'));
});
