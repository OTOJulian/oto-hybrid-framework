'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  isOtoSdkOnPath,
  trySelfLinkOtoSdk,
} = require('../bin/lib/install.cjs');

function withPath(value, fn) {
  const originalPath = process.env.PATH;
  process.env.PATH = value;
  try {
    return fn();
  } finally {
    process.env.PATH = originalPath;
  }
}

function withHomeAndPath(home, pathValue, fn) {
  const originalHomedir = os.homedir;
  os.homedir = () => home;
  return withPath(pathValue, () => {
    try {
      return fn();
    } finally {
      os.homedir = originalHomedir;
    }
  });
}

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'oto-sdk-wiring-'));
}

test('sdk wiring: isOtoSdkOnPath returns false when oto-sdk is absent from PATH', () => {
  const root = makeTempDir();
  try {
    const binDir = path.join(root, 'bin');
    fs.mkdirSync(binDir);
    withPath(binDir, () => {
      assert.equal(isOtoSdkOnPath(), false);
    });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('sdk wiring: isOtoSdkOnPath returns true when an executable oto-sdk is on PATH', () => {
  const root = makeTempDir();
  try {
    const binDir = path.join(root, 'bin');
    fs.mkdirSync(binDir);
    const target = path.join(binDir, process.platform === 'win32' ? 'oto-sdk.cmd' : 'oto-sdk');
    fs.writeFileSync(target, '#!/usr/bin/env node\n');
    fs.chmodSync(target, 0o755);
    withPath(binDir, () => {
      assert.equal(isOtoSdkOnPath(), true);
    });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('sdk wiring: isOtoSdkOnPath returns false on POSIX when oto-sdk lacks execute bit', { skip: process.platform === 'win32' }, () => {
  const root = makeTempDir();
  try {
    const binDir = path.join(root, 'bin');
    fs.mkdirSync(binDir);
    const target = path.join(binDir, 'oto-sdk');
    fs.writeFileSync(target, '#!/usr/bin/env node\n');
    fs.chmodSync(target, 0o644);
    withPath(binDir, () => {
      assert.equal(isOtoSdkOnPath(), false);
    });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('sdk wiring: trySelfLinkOtoSdk creates oto-sdk under a writable HOME PATH dir', { skip: process.platform === 'win32' }, () => {
  const root = makeTempDir();
  try {
    const home = path.join(root, 'home');
    const binDir = path.join(home, 'bin');
    fs.mkdirSync(binDir, { recursive: true });
    const shimSrc = path.join(root, 'bin', 'oto-sdk.js');
    fs.mkdirSync(path.dirname(shimSrc), { recursive: true });
    fs.writeFileSync(shimSrc, '#!/usr/bin/env node\n');

    withHomeAndPath(home, binDir, () => {
      const linked = trySelfLinkOtoSdk(shimSrc);
      assert.equal(linked, path.join(binDir, 'oto-sdk'));
      assert.ok(linked.startsWith(home + path.sep), 'self-link target must stay under HOME');

      const stat = fs.lstatSync(linked);
      if (stat.isSymbolicLink()) {
        assert.equal(fs.readlinkSync(linked), shimSrc);
      } else {
        const contents = fs.readFileSync(linked, 'utf8');
        assert.match(contents, /require\(/);
        assert.match(contents, new RegExp(JSON.stringify(shimSrc).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
      }
    });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('sdk wiring: trySelfLinkOtoSdk replaces a stale oto-sdk target before linking', { skip: process.platform === 'win32' }, () => {
  const root = makeTempDir();
  try {
    const home = path.join(root, 'home');
    const binDir = path.join(home, 'bin');
    fs.mkdirSync(binDir, { recursive: true });
    const staleTarget = path.join(binDir, 'oto-sdk');
    fs.writeFileSync(staleTarget, 'stale install\n');

    const shimSrc = path.join(root, 'real', 'oto-sdk.js');
    fs.mkdirSync(path.dirname(shimSrc), { recursive: true });
    fs.writeFileSync(shimSrc, '#!/usr/bin/env node\n');

    withHomeAndPath(home, binDir, () => {
      const linked = trySelfLinkOtoSdk(shimSrc);
      assert.equal(linked, staleTarget);

      const stat = fs.lstatSync(staleTarget);
      if (stat.isSymbolicLink()) {
        assert.equal(fs.readlinkSync(staleTarget), shimSrc);
      } else {
        const contents = fs.readFileSync(staleTarget, 'utf8');
        assert.doesNotMatch(contents, /stale install/);
        assert.match(contents, /require\(/);
        assert.match(contents, new RegExp(JSON.stringify(shimSrc).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
      }
    });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
