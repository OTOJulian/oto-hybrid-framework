'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { maskSecret } = require('../oto/bin/lib/secrets.cjs');

const REPO_ROOT = path.resolve(__dirname, '..');
const CONFIG_PATH = path.join(REPO_ROOT, '.oto/config.json');
const INTEGRATION_CONFIG_KEYS = ['exa_search', 'brave_search', 'firecrawl'];
const BINARY_EXTENSIONS = new Set([
  '.bin', '.eot', '.gif', '.gz', '.ico', '.jpeg', '.jpg', '.mov', '.mp3',
  '.mp4', '.pdf', '.png', '.tar', '.ttf', '.webp', '.woff', '.woff2', '.zip',
]);

const STRING_TYPED_INTEGRATION_FIELD =
  /^\s*(?:\{\s*)?"(exa_search|brave_search|firecrawl)"\s*:\s*"([^"\r\n]*)"/g;
const KEY_SHAPED_FIELD =
  /(api[_-]?key|_key)["']?\s*[:=]\s*["']([A-Za-z0-9_-]{20,})["']/gi;
const PROVIDER_PREFIX_TOKEN = /\b(sk-[A-Za-z0-9_-]{20,}|fc-[A-Za-z0-9_-]{20,})\b/g;
// Planning artifacts document these exact synthetic controls. Keep the regex
// strict (and unit-test it directly), but do not report known non-secret fixture
// literals as repository disclosures.
const DOCUMENTED_SYNTHETIC_CONTROL_TOKENS = new Set([
  'AbC-123_def-4567890123',
  'fc-abc_123-XYZ7890123456789012345',
  'sk-ant-api03-XXXXXXXXXXXXXXXXXXXXXXXXXX',
  'sk-bad-brave-0123456789',
  'sk-default-exa-0123456789',
  'sk-existing-keyfile-9999wxyz',
  'sk-fault-test-0123456789',
  'sk-gap1-marker-0123456789',
  'sk-leaky-marker-0123456789',
  'sk-legacy-brave-0123456789',
  'sk-legacy-gap2-0123456789',
  'sk-legacy-lock-0123456789',
  'sk-parse-marker-0123456789',
  'sk-proj-AbC123_def-456789012345678901234567',
  'sk-synthetic-0000000000',
  'sk-test-brave-0123456789',
  'sk-test-guard-0123456789',
  'sk-test-root-0123456789',
  'sk-test-survival-0123456789',
]);

function trackedOtoTextFiles() {
  const result = spawnSync('git', ['ls-files', '-z', '--', '.oto'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, `git ls-files failed: ${result.stderr.trim()}`);

  return result.stdout
    .split('\0')
    .filter(Boolean)
    .filter((file) => !BINARY_EXTENSIONS.has(path.extname(file).toLowerCase()))
    .flatMap((file) => {
      const content = fs.readFileSync(path.join(REPO_ROOT, file));
      return content.includes(0) ? [] : [{ file, text: content.toString('utf8') }];
    });
}

function findSensitiveMatches(regex, tokenGroup, kind) {
  const findings = [];

  for (const { file, text } of trackedOtoTextFiles()) {
    const lines = text.split(/\r?\n/);
    for (let index = 0; index < lines.length; index += 1) {
      regex.lastIndex = 0;
      for (const match of lines[index].matchAll(regex)) {
        if (DOCUMENTED_SYNTHETIC_CONTROL_TOKENS.has(match[tokenGroup])) continue;
        findings.push({
          file,
          line: index + 1,
          kind,
          token: match[tokenGroup],
        });
      }
    }
  }

  return findings;
}

function assertNoSensitiveMatches(findings) {
  if (findings.length === 0) return;
  const first = findings[0];
  assert.fail(
    `${first.file}:${first.line} contains ${first.kind} (${maskSecret(first.token)}); ` +
      `${findings.length} tracked .oto finding(s) total`,
  );
}

function regexMatches(regex, value) {
  regex.lastIndex = 0;
  return regex.test(value);
}

test('token-shape regex controls', async (t) => {
  await t.test('provider prefixes accept separator-containing token bodies', () => {
    const tokens = [
      'sk-proj-AbC123_def-456789012345678901234567',
      'sk-ant-api03-XXXXXXXXXXXXXXXXXXXXXXXXXX',
      'fc-abc_123-XYZ7890123456789012345',
    ];

    for (const token of tokens) {
      assert.equal(
        regexMatches(PROVIDER_PREFIX_TOKEN, token),
        true,
        `${token} must match the provider-token guard`,
      );
    }
  });

  await t.test('provider prefixes reject short tokens and unrelated hyphenated prose', () => {
    const controls = [
      'sk-short_123',
      'task-123',
      'well-known-longer-than-twenty-chars-word',
    ];

    for (const control of controls) {
      assert.equal(
        regexMatches(PROVIDER_PREFIX_TOKEN, control),
        false,
        `${control} must not match the provider-token guard`,
      );
    }
  });

  await t.test('key-shaped fields accept separator-rich values but reject booleans', () => {
    assert.equal(
      regexMatches(KEY_SHAPED_FIELD, '"exa_api_key": "AbC-123_def-4567890123"'),
      true,
    );
    assert.equal(regexMatches(KEY_SHAPED_FIELD, '"api_key": "true"'), false);
  });
});

test('repo integration config keys are absent or boolean-typed', () => {
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));

  for (const configKey of INTEGRATION_CONFIG_KEYS) {
    const isAbsent = !Object.prototype.hasOwnProperty.call(config, configKey);
    assert.ok(
      isAbsent || typeof config[configKey] === 'boolean',
      `${configKey} must be absent or boolean-typed; found ${typeof config[configKey]}`,
    );
  }
});

test('tracked .oto files contain no string-typed integration fields', () => {
  assertNoSensitiveMatches(findSensitiveMatches(
    STRING_TYPED_INTEGRATION_FIELD,
    2,
    'a string-typed integration field',
  ));
});

test('tracked .oto files contain no key-shaped tokens', () => {
  const findings = [
    ...findSensitiveMatches(KEY_SHAPED_FIELD, 2, 'a key-shaped field value'),
    ...findSensitiveMatches(PROVIDER_PREFIX_TOKEN, 1, 'a provider-prefixed token'),
  ];
  assertNoSensitiveMatches(findings);
});
