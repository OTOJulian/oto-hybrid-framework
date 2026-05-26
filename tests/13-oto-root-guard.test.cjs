'use strict';
// Phase 13 (D-09): durable guard that this repo self-manages via .oto/.
// Regression protection against an accidental .planning/ reintroduction and
// against the resolver ever resolving away from .oto/ for THIS repo.
// Asserts the EXPORTED resolver surface (planningRoot / planningDir) so it never
// depends on internal helpers and core.cjs stays untouched.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { planningRoot, planningDir } = require('../oto/bin/lib/core.cjs');

const REPO_ROOT = path.resolve(__dirname, '..');

test('phase-13 guard: this repo has NO .planning/ directory (clean cutover)', () => {
  const planningDirPath = path.join(REPO_ROOT, '.planning');
  assert.equal(
    fs.existsSync(planningDirPath),
    false,
    `.planning/ must not exist after the Phase 13 dogfood migration (clean cutover, no shim)`,
  );
});

test('phase-13 guard: this repo HAS an .oto/ directory with STATE.md', () => {
  assert.equal(fs.existsSync(path.join(REPO_ROOT, '.oto')), true, '.oto/ must exist');
  assert.equal(
    fs.existsSync(path.join(REPO_ROOT, '.oto', 'STATE.md')),
    true,
    '.oto/STATE.md must exist (migrated state file)',
  );
});

test('phase-13 guard: oto resolves this repo to .oto/ with no path override', () => {
  // planningRoot is the exported resolver; for THIS repo it must return a
  // path whose final segment is `.oto` (NOT `.planning`).
  const resolvedRoot = planningRoot(REPO_ROOT);
  assert.equal(path.basename(resolvedRoot), '.oto', 'planningRoot must resolve to the .oto root for this repo');
  assert.equal(resolvedRoot, path.join(REPO_ROOT, '.oto'), 'planningRoot must point at <repo>/.oto');
  assert.doesNotMatch(resolvedRoot, /\.planning(\/|$)/, 'resolved root must never be .planning for this repo');

  // planningDir (no workstream/project) resolves to the same .oto root.
  const resolvedDir = planningDir(REPO_ROOT);
  assert.equal(resolvedDir, path.join(REPO_ROOT, '.oto'), 'planningDir must resolve to <repo>/.oto with no override');
});

test('phase-13 guard: moved STATE.md declares oto_state_version (D-06)', () => {
  const state = fs.readFileSync(path.join(REPO_ROOT, '.oto', 'STATE.md'), 'utf8');
  assert.match(state, /^oto_state_version\s*:/m, 'STATE.md must declare oto_state_version');
  assert.doesNotMatch(state, /^gsd_state_version\s*:/m, 'STATE.md must not retain gsd_state_version');
});
