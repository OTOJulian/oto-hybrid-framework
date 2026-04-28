'use strict';

const fs = require('node:fs');
const fsp = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { resolveConfigDir } = require('./args.cjs');
const { copyTree, removeTree, sha256File, walkTree } = require('./copy-files.cjs');
const {
  CLOSE_MARKER,
  OPEN_MARKER,
  injectMarkerBlock,
  removeMarkerBlock,
} = require('./marker.cjs');
const { readState, writeState } = require('./install-state.cjs');
const { detectPresentRuntimes } = require('./runtime-detect.cjs');
const { version: OTO_VERSION } = require('../../package.json');

const SRC_KEYS = ['commands', 'agents', 'skills', 'hooks'];
const TRANSFORM_KEY = {
  commands: 'transformCommand',
  agents: 'transformAgent',
  skills: 'transformSkill',
  hooks: 'transformSkill',
};

function assertWithin(configDir, relPath) {
  const joined = path.join(configDir, relPath);
  const resolvedJoined = path.resolve(joined);
  const resolvedRoot = path.resolve(configDir);
  if (!resolvedJoined.startsWith(resolvedRoot + path.sep) && resolvedJoined !== resolvedRoot) {
    throw new Error(`install.cjs: refusing path-traversal escape from ${configDir}: ${relPath}`);
  }
  return joined;
}

async function installRuntime(adapter, opts = {}) {
  const flags = opts.flags || {};
  const repoRoot = opts.repoRoot || path.join(__dirname, '..', '..');
  const configDir = resolveConfigDir(adapter, flags, process.env);
  await fsp.mkdir(configDir, { recursive: true });

  const statePath = path.join(configDir, 'oto', '.install.json');
  const priorState = readState(statePath);

  const preCtx = { configDir, priorState, otoVersion: OTO_VERSION };
  if (typeof adapter.onPreInstall === 'function') {
    await adapter.onPreInstall(preCtx);
  }

  const fileEntries = [];
  for (const srcKey of SRC_KEYS) {
    const srcAbs = path.join(repoRoot, adapter.sourceDirs[srcKey]);
    const dstAbs = path.join(configDir, adapter.targetSubdirs[srcKey]);
    const sourceRelPaths = new Set((await walkTree(srcAbs)).map((absPath) => path.relative(srcAbs, absPath)));
    const result = await copyTree(srcAbs, dstAbs);
    const transformFn = adapter[TRANSFORM_KEY[srcKey]];

    for (const file of result.files) {
      if (!sourceRelPaths.has(file.relPath)) {
        continue;
      }

      if (typeof transformFn === 'function') {
        const original = await fsp.readFile(file.absPath, 'utf8');
        const transformed = transformFn(original, { srcKey, relPath: file.relPath });
        if (transformed !== original) {
          await fsp.writeFile(file.absPath, transformed);
        }
      }

      const hex = await sha256File(file.absPath);
      fileEntries.push({ path: path.relative(configDir, file.absPath), sha256: hex });
    }
  }

  const newPaths = new Set(fileEntries.map((file) => file.path));
  for (const prior of (priorState?.files || [])) {
    if (!newPaths.has(prior.path)) {
      const safe = assertWithin(configDir, prior.path);
      await fsp.rm(safe, { force: true });
    }
  }

  const instructionPath = path.join(configDir, adapter.instructionFilename);
  const renderCtx = { runtime: adapter.name, configDir, statePath, otoVersion: OTO_VERSION };
  const body = adapter.renderInstructionBlock(renderCtx);
  injectMarkerBlock(instructionPath, OPEN_MARKER, CLOSE_MARKER, body);

  const settingsPath = path.join(configDir, adapter.settingsFilename);
  if (fs.existsSync(settingsPath) && typeof adapter.mergeSettings === 'function') {
    const existing = await fsp.readFile(settingsPath, 'utf8');
    const merged = adapter.mergeSettings(existing, '');
    if (merged !== existing) {
      await fsp.writeFile(settingsPath, merged);
    }
  }

  // COMMIT POINT: the state file is written only after all install I/O succeeds.
  writeState(statePath, {
    version: 1,
    oto_version: OTO_VERSION,
    installed_at: new Date().toISOString(),
    runtime: adapter.name,
    config_dir: configDir,
    files: fileEntries,
    instruction_file: {
      path: adapter.instructionFilename,
      open_marker: OPEN_MARKER,
      close_marker: CLOSE_MARKER,
    },
  });

  const ctx = { runtime: adapter.name, configDir, statePath, filesCopied: fileEntries.length };
  if (typeof adapter.onPostInstall === 'function') {
    await adapter.onPostInstall(ctx);
  }
  return ctx;
}

async function uninstallRuntime(adapter, opts = {}) {
  const flags = opts.flags || {};
  const configDir = resolveConfigDir(adapter, flags, process.env);
  const statePath = path.join(configDir, 'oto', '.install.json');
  const state = readState(statePath);

  if (!state) {
    console.log(`uninstalled: ${adapter.name} — no install found at ${configDir}`);
    return { runtime: adapter.name, configDir, statePath, removed: false, filesRemoved: 0 };
  }

  let filesRemoved = 0;
  for (const file of state.files) {
    const safe = assertWithin(configDir, file.path);
    await fsp.rm(safe, { force: true });
    filesRemoved += 1;
  }

  const instruction = state.instruction_file || {};
  const instructionPath = assertWithin(configDir, instruction.path || adapter.instructionFilename);
  removeMarkerBlock(
    instructionPath,
    instruction.open_marker || OPEN_MARKER,
    instruction.close_marker || CLOSE_MARKER,
  );

  // Phase 3 mergeSettings is identity, so there is no reverse settings merge to apply.
  await removeTree(path.join(configDir, 'oto'));

  if (opts.purge) {
    for (const srcKey of SRC_KEYS) {
      const targetDir = assertWithin(configDir, adapter.targetSubdirs[srcKey]);
      const files = await walkTree(targetDir);
      for (const absPath of files) {
        const base = path.basename(absPath);
        if (base.startsWith('oto-') || base.startsWith('oto:')) {
          const safe = assertWithin(configDir, path.relative(configDir, absPath));
          await fsp.rm(safe, { force: true });
          filesRemoved += 1;
        }
      }
    }
  }

  console.log(`uninstalled: ${adapter.name} — ${filesRemoved} files removed, marker stripped, state cleared at ${configDir}`);
  return { runtime: adapter.name, configDir, statePath, removed: true, filesRemoved };
}

async function installAll(adapters, opts = {}) {
  const homeDir = opts.homeDir || os.homedir();
  const present = detectPresentRuntimes(homeDir);
  if (present.length === 0) {
    process.stderr.write('--all: no runtimes detected (none of ~/.claude, ~/.codex, ~/.gemini exist)\n');
    const err = new Error('no runtimes detected');
    err.exitCode = 4;
    throw err;
  }

  const results = [];
  for (const runtime of present) {
    const adapter = adapters.find((candidate) => candidate.name === runtime);
    if (!adapter) continue;
    results.push(await installRuntime(adapter, withHomeDirConfig(adapter, opts, homeDir)));
  }
  return results;
}

async function uninstallAll(adapters, opts = {}) {
  const homeDir = opts.homeDir || os.homedir();
  const results = [];
  for (const adapter of adapters) {
    results.push(await uninstallRuntime(adapter, withHomeDirConfig(adapter, opts, homeDir)));
  }
  return results;
}

function withHomeDirConfig(adapter, opts, homeDir) {
  if (!opts.homeDir || opts.flags?.configDir) {
    return opts;
  }
  return {
    ...opts,
    flags: {
      ...(opts.flags || {}),
      configDir: path.join(homeDir, adapter.defaultConfigDirSegment),
    },
  };
}

module.exports = { installRuntime, uninstallRuntime, installAll, uninstallAll };
