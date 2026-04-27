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

test('rules object contains all 7 required rule types and each has >=1 entry', () => {
  const data = JSON.parse(fs.readFileSync(MAP_PATH, 'utf8'));
  for (const k of ['identifier', 'path', 'command', 'skill_ns', 'package', 'url', 'env_var']) {
    assert.ok(Array.isArray(data.rules[k]) && data.rules[k].length >= 1, `rules.${k} missing or empty`);
  }
});

test('do_not_rename contains required allowlist entries', () => {
  const data = JSON.parse(fs.readFileSync(MAP_PATH, 'utf8'));
  const flat = data.do_not_rename.map((e) => typeof e === 'string' ? e : e.pattern);
  for (const required of ['LICENSE', 'LICENSE.md', 'THIRD-PARTY-LICENSES.md', 'Lex Christopherson', 'Jesse Vincent', 'foundation-frameworks/**']) {
    assert.ok(flat.includes(required), `do_not_rename missing: ${required}`);
  }
});

test('do_not_rename contains runtime-owned env vars', () => {
  const data = JSON.parse(fs.readFileSync(MAP_PATH, 'utf8'));
  const flat = data.do_not_rename.map((e) => typeof e === 'string' ? e : e.pattern);
  for (const env of ['CLAUDE_PLUGIN_ROOT', 'CLAUDE_CONFIG_DIR', 'CODEX_HOME', 'GEMINI_CONFIG_DIR']) {
    assert.ok(flat.includes(env), `do_not_rename missing env var: ${env}`);
  }
});

test('at least one url rule uses preserve_in_attribution', () => {
  const data = JSON.parse(fs.readFileSync(MAP_PATH, 'utf8'));
  assert.ok(data.rules.url.some((r) => r.preserve_in_attribution === true), 'No url rule has preserve_in_attribution: true');
});

test('at least one url rule uses {{GITHUB_OWNER}} placeholder', () => {
  const data = JSON.parse(fs.readFileSync(MAP_PATH, 'utf8'));
  assert.ok(data.rules.url.some((r) => r.to.includes('{{GITHUB_OWNER}}')), 'No url rule uses {{GITHUB_OWNER}} placeholder');
});

test('env_var rule uses GSD_ prefix matching', () => {
  const data = JSON.parse(fs.readFileSync(MAP_PATH, 'utf8'));
  const r = data.rules.env_var.find((x) => x.from === 'GSD_');
  assert.ok(r, 'env_var rule with from: "GSD_" missing');
  assert.equal(r.to, 'OTO_', 'env_var prefix rule should rewrite GSD_ -> OTO_');
  assert.ok(r.apply_to_pattern, 'GSD_ env_var rule should have apply_to_pattern bounding regex');
});

test('command rule maps /gsd- -> /oto-', () => {
  const data = JSON.parse(fs.readFileSync(MAP_PATH, 'utf8'));
  const r = data.rules.command.find((x) => x.from === '/gsd-');
  assert.ok(r, 'command rule from: "/gsd-" missing');
  assert.equal(r.to, '/oto-');
});

test('skill_ns rule maps superpowers: -> oto:', () => {
  const data = JSON.parse(fs.readFileSync(MAP_PATH, 'utf8'));
  const r = data.rules.skill_ns.find((x) => x.from === 'superpowers:');
  assert.ok(r, 'skill_ns rule from: "superpowers:" missing');
  assert.equal(r.to, 'oto:');
});
