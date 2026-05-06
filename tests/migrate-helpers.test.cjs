'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..');
const MIGRATE_PATH = path.join(REPO_ROOT, 'oto/bin/lib/migrate.cjs');

test('rewriteMarkers rewrites GSD start markers while preserving source attributes', () => {
  const { rewriteMarkers } = require(MIGRATE_PATH);
  assert.equal(
    rewriteMarkers('<!-- GSD:project-start source:PROJECT.md -->'),
    '<!-- OTO:project-start source:PROJECT.md -->'
  );
});

test('rewriteMarkers rewrites GSD end markers', () => {
  const { rewriteMarkers } = require(MIGRATE_PATH);
  assert.equal(rewriteMarkers('<!-- GSD:project-end -->'), '<!-- OTO:project-end -->');
});

test('rewriteMarkers is idempotent', () => {
  const { rewriteMarkers } = require(MIGRATE_PATH);
  const once = rewriteMarkers('<!-- GSD:workflow-start source:GSD defaults -->');
  assert.equal(rewriteMarkers(once), once);
});

test('rewriteFrontmatterKey rewrites only leading YAML frontmatter', () => {
  const { rewriteFrontmatterKey } = require(MIGRATE_PATH);
  const input = [
    '---',
    'gsd_state_version: 1.0',
    'milestone: test',
    '---',
    '',
    'body gsd_state_version: should stay'
  ].join('\n');
  const output = rewriteFrontmatterKey(input);
  assert.match(output, /^---\noto_state_version: 1\.0\nmilestone: test\n---/);
  assert.match(output, /body gsd_state_version: should stay/);
});

test('rewriteFrontmatterKey is idempotent', () => {
  const { rewriteFrontmatterKey } = require(MIGRATE_PATH);
  const once = rewriteFrontmatterKey('---\ngsd_state_version: 1.0\n---\n');
  assert.equal(rewriteFrontmatterKey(once), once);
});

test('rewriteFrontmatterKey ignores body-only state keys', () => {
  const { rewriteFrontmatterKey } = require(MIGRATE_PATH);
  const input = '# State\n\ngsd_state_version: 1.0\n';
  assert.equal(rewriteFrontmatterKey(input), input);
});
