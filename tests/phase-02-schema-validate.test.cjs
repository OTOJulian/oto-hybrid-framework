'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { validate } = require('../scripts/rebrand/lib/validate-schema.cjs');

const REPO_ROOT = path.join(__dirname, '..');
const MAP_PATH = path.join(REPO_ROOT, 'rename-map.json');
const SCHEMA_PATH = path.join(REPO_ROOT, 'schema', 'rename-map.json');
const REQUIRED_RULE_TYPES = ['identifier', 'path', 'command', 'skill_ns', 'package', 'url', 'env_var'];

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

test('canonical rename-map validates against the schema', () => {
  const result = validate(loadJson(MAP_PATH), loadJson(SCHEMA_PATH));
  assert.ok(result.valid, result.errors.join('\n'));
});

test('schema rejects unknown rule classes', () => {
  const schema = loadJson(SCHEMA_PATH);
  const data = clone(loadJson(MAP_PATH));
  data.rules.unknown = [{ from: 'x', to: 'y' }];
  const result = validate(data, schema);
  assert.equal(result.valid, false);
  assert.match(result.errors.join('\n'), /additional property "unknown"/);
});

test('schema rejects missing required top-level fields', () => {
  const schema = loadJson(SCHEMA_PATH);
  for (const field of ['version', 'rules', 'do_not_rename', 'deprecated_drop']) {
    const data = clone(loadJson(MAP_PATH));
    delete data[field];
    assert.equal(validate(data, schema).valid, false, `schema accepted missing ${field}`);
  }
});

test('schema rejects missing required rule families', () => {
  const schema = loadJson(SCHEMA_PATH);
  for (const ruleType of REQUIRED_RULE_TYPES) {
    const data = clone(loadJson(MAP_PATH));
    delete data.rules[ruleType];
    assert.equal(validate(data, schema).valid, false, `schema accepted missing rules.${ruleType}`);
  }
});

test('schema rejects empty required rule families', () => {
  const schema = loadJson(SCHEMA_PATH);
  for (const ruleType of REQUIRED_RULE_TYPES) {
    const data = clone(loadJson(MAP_PATH));
    data.rules[ruleType] = [];
    assert.equal(validate(data, schema).valid, false, `schema accepted empty rules.${ruleType}`);
  }
});

test('tests helper re-exports the canonical validator', () => {
  const helper = require('./helpers/load-schema.cjs');
  const canonical = require('../scripts/rebrand/lib/validate-schema.cjs');
  assert.equal(helper.validate, canonical.validate);
});
