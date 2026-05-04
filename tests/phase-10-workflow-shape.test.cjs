'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..');
const WORKFLOWS = path.join(REPO_ROOT, '.github', 'workflows');

function readWorkflow(t, name) {
  const filePath = path.join(WORKFLOWS, name);
  if (!fs.existsSync(filePath)) {
    t.todo(`Wave 1 must create ${name}`);
    return null;
  }
  return fs.readFileSync(filePath, 'utf8');
}

test('CI-01: test.yml present and matrix shape is correct', (t) => {
  const body = readWorkflow(t, 'test.yml');
  if (!body) return;

  assert.match(body, /runs-on:\s*\$\{\{\s*matrix\.os\s*\}\}/);
  assert.ok(body.includes('os: [ubuntu-latest]'));
  assert.ok(body.includes('node-version: [22, 24]'));
  assert.ok(body.includes('- os: macos-latest'));
  assert.ok(body.includes('node-version: 24'));
  assert.ok(body.includes('npm test'));
});

test('CI-02: install-smoke.yml present and unpacked smoke job is represented', (t) => {
  const body = readWorkflow(t, 'install-smoke.yml');
  if (!body) return;

  assert.ok(body.includes('npm pack'));
  assert.ok(body.includes('npm install -g'));
  assert.ok(body.includes('smoke-unpacked'));
  assert.ok(body.includes('$GITHUB_WORKSPACE'));
});

test('CI-03: release.yml present and tag release shape is correct', (t) => {
  const body = readWorkflow(t, 'release.yml');
  if (!body) return;

  assert.ok(body.includes("tags: ['v*"));
  assert.ok(body.includes('gh release create'));
  assert.ok(body.includes('--generate-notes'));
  assert.ok(body.includes('package.json'));
});
