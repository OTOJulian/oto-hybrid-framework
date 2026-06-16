'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// doctor.cjs is not yet created — require will throw during RED phase
const { checkOtoSdk } = require('../bin/lib/doctor.cjs');

// ---------------------------------------------------------------------------
// Helpers (same pattern as sdk-wiring.test.cjs)
// ---------------------------------------------------------------------------

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'oto-doctor-'));
}

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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test('doctor: healthy verdict when oto-sdk symlink matches current repo and sdk/dist/cli.js exists', { skip: process.platform === 'win32' }, () => {
  const root = makeTempDir();
  try {
    // Build a fake repo layout
    const repoRoot = path.join(root, 'repo');
    const shimSrc = path.join(repoRoot, 'bin', 'oto-sdk.js');
    const sdkCliPath = path.join(repoRoot, 'sdk', 'dist', 'cli.js');
    fs.mkdirSync(path.dirname(shimSrc), { recursive: true });
    fs.mkdirSync(path.dirname(sdkCliPath), { recursive: true });
    fs.writeFileSync(shimSrc, '#!/usr/bin/env node\n');
    fs.writeFileSync(sdkCliPath, '#!/usr/bin/env node\n');

    // Create a symlink in binDir → shimSrc
    const home = path.join(root, 'home');
    const binDir = path.join(home, 'bin');
    fs.mkdirSync(binDir, { recursive: true });
    const linkTarget = path.join(binDir, 'oto-sdk');
    fs.symlinkSync(shimSrc, linkTarget);
    fs.chmodSync(shimSrc, 0o755);

    withHomeAndPath(home, binDir, () => {
      const result = checkOtoSdk({ repoRoot });
      assert.equal(result.verdict, 'healthy');
      assert.ok(!result.sdkDistMissing, 'sdkDistMissing should be falsy');
      assert.equal(result.path, linkTarget);
    });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('doctor: healthy with sdkDistMissing when sdk/dist/cli.js is absent', { skip: process.platform === 'win32' }, () => {
  const root = makeTempDir();
  try {
    const repoRoot = path.join(root, 'repo');
    const shimSrc = path.join(repoRoot, 'bin', 'oto-sdk.js');
    fs.mkdirSync(path.dirname(shimSrc), { recursive: true });
    fs.writeFileSync(shimSrc, '#!/usr/bin/env node\n');
    // sdk/dist/cli.js intentionally NOT created

    const home = path.join(root, 'home');
    const binDir = path.join(home, 'bin');
    fs.mkdirSync(binDir, { recursive: true });
    const linkTarget = path.join(binDir, 'oto-sdk');
    fs.symlinkSync(shimSrc, linkTarget);
    fs.chmodSync(shimSrc, 0o755);

    withHomeAndPath(home, binDir, () => {
      const result = checkOtoSdk({ repoRoot });
      assert.equal(result.verdict, 'healthy');
      assert.equal(result.sdkDistMissing, true);
    });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('doctor: missing verdict when no oto-sdk on PATH', { skip: process.platform === 'win32' }, () => {
  const root = makeTempDir();
  try {
    const repoRoot = path.join(root, 'repo');
    const shimSrc = path.join(repoRoot, 'bin', 'oto-sdk.js');
    fs.mkdirSync(path.dirname(shimSrc), { recursive: true });
    fs.writeFileSync(shimSrc, '#!/usr/bin/env node\n');

    // Empty binDir — no oto-sdk present
    const binDir = path.join(root, 'emptybin');
    fs.mkdirSync(binDir, { recursive: true });

    withPath(binDir, () => {
      const result = checkOtoSdk({ repoRoot });
      assert.equal(result.verdict, 'missing');
    });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('doctor: stale/wrong-repo verdict when symlink points at a different repo', { skip: process.platform === 'win32' }, () => {
  const root = makeTempDir();
  try {
    // repoA has the installed link; repoB is the "current" repo
    const repoA = path.join(root, 'repoA');
    const repoB = path.join(root, 'repoB');
    const shimA = path.join(repoA, 'bin', 'oto-sdk.js');
    const shimB = path.join(repoB, 'bin', 'oto-sdk.js');
    fs.mkdirSync(path.dirname(shimA), { recursive: true });
    fs.mkdirSync(path.dirname(shimB), { recursive: true });
    fs.writeFileSync(shimA, '#!/usr/bin/env node\n');
    fs.chmodSync(shimA, 0o755);
    fs.writeFileSync(shimB, '#!/usr/bin/env node\n');

    // Symlink in binDir points at repoA's shim (a different repo)
    const binDir = path.join(root, 'bin');
    fs.mkdirSync(binDir, { recursive: true });
    const linkTarget = path.join(binDir, 'oto-sdk');
    fs.symlinkSync(shimA, linkTarget);

    // checkOtoSdk with repoRoot=repoB — symlink doesn't match
    withPath(binDir, () => {
      const result = checkOtoSdk({ repoRoot: repoB });
      assert.equal(result.verdict, 'stale');
      assert.equal(result.reason, 'wrong-repo');
    });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('doctor: shadowed verdict when non-oto executable precedes managed link', { skip: process.platform === 'win32' }, () => {
  const root = makeTempDir();
  try {
    const repoRoot = path.join(root, 'repo');
    const shimSrc = path.join(repoRoot, 'bin', 'oto-sdk.js');
    fs.mkdirSync(path.dirname(shimSrc), { recursive: true });
    fs.writeFileSync(shimSrc, '#!/usr/bin/env node\n');

    // An unmanaged executable named 'oto-sdk' (plain shell script, no oto-sdk.js reference)
    const binDir = path.join(root, 'bin');
    fs.mkdirSync(binDir, { recursive: true });
    const unmanaged = path.join(binDir, 'oto-sdk');
    fs.writeFileSync(unmanaged, '#!/bin/sh\necho unrelated\n');
    fs.chmodSync(unmanaged, 0o755);

    withPath(binDir, () => {
      const result = checkOtoSdk({ repoRoot });
      assert.equal(result.verdict, 'shadowed');
    });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
