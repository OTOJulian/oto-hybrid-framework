'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  isOtoSdkOnPath,
  trySelfLinkOtoSdk,
  wireOtoSdk,
  isManagedOtoSdkTarget,
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

test('sdk wiring: trySelfLinkOtoSdk replaces a managed oto-sdk target before linking', { skip: process.platform === 'win32' }, () => {
  const root = makeTempDir();
  try {
    const home = path.join(root, 'home');
    const binDir = path.join(home, 'bin');
    fs.mkdirSync(binDir, { recursive: true });
    const staleTarget = path.join(binDir, 'oto-sdk');
    const shimSrc = path.join(root, 'real', 'oto-sdk.js');
    fs.mkdirSync(path.dirname(shimSrc), { recursive: true });
    fs.writeFileSync(shimSrc, '#!/usr/bin/env node\n');
    fs.writeFileSync(staleTarget, `#!/usr/bin/env node\nrequire(${JSON.stringify(shimSrc)});\n`);
    fs.chmodSync(staleTarget, 0o644);

    withHomeAndPath(home, binDir, () => {
      const linked = trySelfLinkOtoSdk(shimSrc);
      assert.equal(linked, staleTarget);

      const stat = fs.lstatSync(staleTarget);
      if (stat.isSymbolicLink()) {
        assert.equal(fs.readlinkSync(staleTarget), shimSrc);
      } else {
        const contents = fs.readFileSync(staleTarget, 'utf8');
        assert.match(contents, /require\(/);
        assert.match(contents, new RegExp(JSON.stringify(shimSrc).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
        assert.equal((fs.statSync(staleTarget).mode & 0o111) !== 0, true);
      }
    });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('sdk wiring: trySelfLinkOtoSdk preserves unmanaged oto-sdk targets', { skip: process.platform === 'win32' }, () => {
  const root = makeTempDir();
  try {
    const home = path.join(root, 'home');
    const binDir = path.join(home, 'bin');
    const localBin = path.join(home, '.local', 'bin');
    fs.mkdirSync(binDir, { recursive: true });
    fs.mkdirSync(localBin, { recursive: true });
    const unmanagedTarget = path.join(binDir, 'oto-sdk');
    fs.writeFileSync(unmanagedTarget, '#!/bin/sh\necho unmanaged\n');
    fs.chmodSync(unmanagedTarget, 0o755);

    const shimSrc = path.join(root, 'real', 'oto-sdk.js');
    fs.mkdirSync(path.dirname(shimSrc), { recursive: true });
    fs.writeFileSync(shimSrc, '#!/usr/bin/env node\n');

    withHomeAndPath(home, binDir, () => {
      const linked = trySelfLinkOtoSdk(shimSrc);
      assert.equal(linked, path.join(localBin, 'oto-sdk'));
      assert.equal(fs.readFileSync(unmanagedTarget, 'utf8'), '#!/bin/sh\necho unmanaged\n');
    });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('sdk wiring: trySelfLinkOtoSdk preserves non-executable unmanaged oto-sdk targets', { skip: process.platform === 'win32' }, () => {
  const root = makeTempDir();
  try {
    const home = path.join(root, 'home');
    const binDir = path.join(home, 'bin');
    const localBin = path.join(home, '.local', 'bin');
    fs.mkdirSync(binDir, { recursive: true });
    fs.mkdirSync(localBin, { recursive: true });
    const unmanagedTarget = path.join(binDir, 'oto-sdk');
    fs.writeFileSync(unmanagedTarget, 'user note or disabled shim\n');
    fs.chmodSync(unmanagedTarget, 0o644);

    const shimSrc = path.join(root, 'real', 'oto-sdk.js');
    fs.mkdirSync(path.dirname(shimSrc), { recursive: true });
    fs.writeFileSync(shimSrc, '#!/usr/bin/env node\n');

    withHomeAndPath(home, binDir, () => {
      const linked = trySelfLinkOtoSdk(shimSrc);
      assert.equal(linked, path.join(localBin, 'oto-sdk'));
      assert.equal(fs.readFileSync(unmanagedTarget, 'utf8'), 'user note or disabled shim\n');
    });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

// --- New tests for Task 1: dangling-symlink handling in isManagedOtoSdkTarget ---

test('sdk wiring: isManagedOtoSdkTarget: dangling symlink to oto-sdk.js basename returns true', { skip: process.platform === 'win32' }, () => {
  const root = makeTempDir();
  try {
    const shimSrc = path.join(root, 'bin', 'oto-sdk.js');
    fs.mkdirSync(path.dirname(shimSrc), { recursive: true });
    fs.writeFileSync(shimSrc, '#!/usr/bin/env node\n');

    // Create a dangling symlink whose target basename is oto-sdk.js
    const target = path.join(root, 'oto-sdk-link');
    const danglingPath = path.join(root, 'nonexistent', 'repo', 'bin', 'oto-sdk.js');
    fs.symlinkSync(danglingPath, target);

    // Confirm it is dangling (realpathSync should throw)
    assert.throws(() => fs.realpathSync(target));

    assert.equal(isManagedOtoSdkTarget(target, shimSrc), true);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('sdk wiring: isManagedOtoSdkTarget: dangling symlink to unrelated basename returns false', { skip: process.platform === 'win32' }, () => {
  const root = makeTempDir();
  try {
    const shimSrc = path.join(root, 'bin', 'oto-sdk.js');
    fs.mkdirSync(path.dirname(shimSrc), { recursive: true });
    fs.writeFileSync(shimSrc, '#!/usr/bin/env node\n');

    // Create a dangling symlink to an unrelated basename
    const target = path.join(root, 'oto-sdk-link');
    const danglingPath = path.join(root, 'nonexistent', 'path', 'some-other.js');
    fs.symlinkSync(danglingPath, target);

    // Confirm it is dangling
    assert.throws(() => fs.realpathSync(target));

    assert.equal(isManagedOtoSdkTarget(target, shimSrc), false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('sdk wiring: trySelfLinkOtoSdk heals a dangling managed symlink (basename oto-sdk.js)', { skip: process.platform === 'win32' }, () => {
  const root = makeTempDir();
  try {
    const home = path.join(root, 'home');
    const binDir = path.join(home, 'bin');
    fs.mkdirSync(binDir, { recursive: true });

    const shimSrc = path.join(root, 'new-repo', 'bin', 'oto-sdk.js');
    fs.mkdirSync(path.dirname(shimSrc), { recursive: true });
    fs.writeFileSync(shimSrc, '#!/usr/bin/env node\n');

    // Create a dangling managed symlink (old repo path no longer exists)
    const linkTarget = path.join(binDir, 'oto-sdk');
    const oldShimPath = path.join(root, 'old-repo', 'bin', 'oto-sdk.js');
    fs.symlinkSync(oldShimPath, linkTarget);

    // Verify it's dangling before healing
    assert.throws(() => fs.realpathSync(linkTarget));

    withHomeAndPath(home, binDir, () => {
      const linked = trySelfLinkOtoSdk(shimSrc);
      assert.equal(linked, linkTarget, 'should return the healed link path');

      // After healing, the link should resolve to shimSrc
      const resolved = fs.readlinkSync(linked);
      assert.equal(resolved, shimSrc, 'healed link must point at new shimSrc');
    });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('sdk wiring: wireOtoSdk refuses stale oto-sdk earlier on PATH', { skip: process.platform === 'win32' }, () => {
  const root = makeTempDir();
  try {
    const repoRoot = path.join(root, 'repo');
    const staleBin = path.join(root, 'stale-bin');
    fs.mkdirSync(path.join(repoRoot, 'sdk', 'dist'), { recursive: true });
    fs.mkdirSync(path.join(repoRoot, 'bin'), { recursive: true });
    fs.mkdirSync(staleBin, { recursive: true });
    fs.writeFileSync(path.join(repoRoot, 'sdk', 'dist', 'cli.js'), '#!/usr/bin/env node\n');
    fs.writeFileSync(path.join(repoRoot, 'bin', 'oto-sdk.js'), '#!/usr/bin/env node\n');
    const staleTarget = path.join(staleBin, 'oto-sdk');
    fs.writeFileSync(staleTarget, '#!/bin/sh\necho stale\n');
    fs.chmodSync(staleTarget, 0o755);

    const originalLog = console.log;
    const originalWarn = console.warn;
    const output = [];
    console.log = (...args) => output.push(args.join(' '));
    console.warn = (...args) => output.push(args.join(' '));
    try {
      withPath(staleBin, () => {
        const result = wireOtoSdk({ repoRoot });
        assert.equal(result.ready, false);
        assert.equal(result.reason, 'shadowed');
        assert.equal(result.path, staleTarget);
      });
    } finally {
      console.log = originalLog;
      console.warn = originalWarn;
    }
    assert.doesNotMatch(output.join('\n'), /OTO SDK ready/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
