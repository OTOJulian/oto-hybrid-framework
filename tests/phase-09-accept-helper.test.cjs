'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

void assert;

test('D-15: oto sync --accept <path> strips YAML header, validates no <<<<<<< markers, writes to oto/<target>, deletes sidecar', { todo: 'plan-04' }, () => {});
test('D-15: oto sync --accept <path> refuses with non-zero exit if <<<<<<< markers still present', { todo: 'plan-04' }, () => {});
test('D-15: oto sync --accept-deletion <path> removes file from oto/ and updates inventory verdict to dropped_upstream', { todo: 'plan-04' }, () => {});
test('D-15: oto sync --keep-deleted <path> records oto-divergence and deletes sidecar without removing oto/<target>', { todo: 'plan-04' }, () => {});
test('Path traversal guard (T-09-04): --accept <path> outside oto/ rejected', { todo: 'plan-04' }, () => {});
