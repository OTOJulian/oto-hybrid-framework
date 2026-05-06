'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const LOG_PATH = path.join(REPO_ROOT, 'oto/bin/lib/log.cjs');

test('D-07 deriveLogSlug strips leading articles', () => {
  let log;
  try {
    log = require(LOG_PATH);
  } catch (error) {
    assert.fail(`Cannot load log.cjs from ${LOG_PATH}: ${error.message}`);
  }
  assert.equal(log.deriveLogSlug('the quick brown fox'), 'quick-brown-fox', 'D-07 strips leading articles');
});

test('D-07 deriveLogSlug strips leading prepositions', () => {
  let log;
  try {
    log = require(LOG_PATH);
  } catch (error) {
    assert.fail(`Cannot load log.cjs from ${LOG_PATH}: ${error.message}`);
  }
  assert.equal(log.deriveLogSlug('of the cache miss issue'), 'cache-miss-issue', 'D-07 strips leading prepositions');
});

test('D-07 deriveLogSlug lowercases and limits to first 4 meaningful words', () => {
  let log;
  try {
    log = require(LOG_PATH);
  } catch (error) {
    assert.fail(`Cannot load log.cjs from ${LOG_PATH}: ${error.message}`);
  }
  assert.equal(
    log.deriveLogSlug('Investigating the Cache Miss In Production Today'),
    'investigating-cache-miss-in',
    'D-07 keeps only the first four meaningful words after leading stop-word removal'
  );
});

test('D-07 deriveLogSlug returns a fallback when all words are stripped', () => {
  let log;
  try {
    log = require(LOG_PATH);
  } catch (error) {
    assert.fail(`Cannot load log.cjs from ${LOG_PATH}: ${error.message}`);
  }
  assert.match(log.deriveLogSlug('the of to'), /[a-z0-9]/, 'D-07 fallback slug is non-empty');
});

test('D-08 deriveLogSlug handles edge input without producing an empty slug', () => {
  let log;
  try {
    log = require(LOG_PATH);
  } catch (error) {
    assert.fail(`Cannot load log.cjs from ${LOG_PATH}: ${error.message}`);
  }
  assert.match(log.deriveLogSlug(''), /[a-z0-9]|untitled/, 'D-08 helper edge input still returns a usable slug');
});

test('D-06 routeSubcommand recognizes start as first token only', () => {
  let log;
  try {
    log = require(LOG_PATH);
  } catch (error) {
    assert.fail(`Cannot load log.cjs from ${LOG_PATH}: ${error.message}`);
  }
  assert.deepEqual(log.routeSubcommand(['start', 'my title']), { sub: 'start', rest: ['my title'] });
});

test('D-06 routeSubcommand treats start in middle as title', () => {
  let log;
  try {
    log = require(LOG_PATH);
  } catch (error) {
    assert.fail(`Cannot load log.cjs from ${LOG_PATH}: ${error.message}`);
  }
  assert.deepEqual(log.routeSubcommand(['list of fixes I made']), {
    sub: 'oneshot',
    rest: ['list of fixes I made'],
  });
});

test('D-06 routeSubcommand recognizes all subcommands as first token', () => {
  let log;
  try {
    log = require(LOG_PATH);
  } catch (error) {
    assert.fail(`Cannot load log.cjs from ${LOG_PATH}: ${error.message}`);
  }
  for (const sub of ['start', 'end', 'list', 'show', 'promote']) {
    assert.deepEqual(log.routeSubcommand([sub, 'rest']), { sub, rest: ['rest'] }, `D-06 routes ${sub}`);
  }
});

test('D-06 routeSubcommand returns help for empty args', () => {
  let log;
  try {
    log = require(LOG_PATH);
  } catch (error) {
    assert.fail(`Cannot load log.cjs from ${LOG_PATH}: ${error.message}`);
  }
  assert.deepEqual(log.routeSubcommand([]), { sub: 'help', rest: [] });
});

