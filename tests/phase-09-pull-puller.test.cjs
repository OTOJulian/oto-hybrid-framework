'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fsp = require('node:fs/promises');
const os = require('node:os');
const { buildBareUpstream } = require('./fixtures/phase-09/build-bare-upstream.cjs');

void assert;
void path;
void fsp;
void os;
void buildBareUpstream;

test('SYN-01: pullUpstream clones at tag into .oto-sync/upstream/gsd/current/', { todo: 'plan-02' }, () => {});
test('SYN-01: snapshot rotation - current/ becomes prior/ on second pull', { todo: 'plan-02' }, () => {});
test('SYN-01: snapshot rotation - first sync skips rotation when prior/ does not exist', { todo: 'plan-02' }, () => {});
test('SYN-01: tag-pin uses --depth 1 --branch <tag> against file:// URL', { todo: 'plan-02' }, () => {});
test('SYN-01: SHA-pin falls back to full clone + git checkout <sha>', { todo: 'plan-02' }, () => {});
test('SYN-02: pullUpstream parameterized - gsd vs superpowers differ only in URL', { todo: 'plan-02' }, () => {});
test('SYN-05: writes last-synced-commit.json with both ref and 40-char SHA', { todo: 'plan-02' }, () => {});
test('SYN-05: last-synced-commit.json validates against schema/last-synced-commit.json', { todo: 'plan-02' }, () => {});
test('Pitfall 12: --main ref emits stderr warning before clone', { todo: 'plan-02' }, () => {});
test('Pitfall 10: re-pull of identical SHA short-circuits via git ls-remote', { todo: 'plan-02' }, () => {});
