'use strict';

const fs = require('node:fs');
const fsp = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { resolveConfigDir } = require('./args.cjs');
const { copyTree, removeTree, sha256File, walkTree, tokenReplace, shouldSubstitute } = require('./copy-files.cjs');
const {
  CLOSE_MARKER,
  OPEN_MARKER,
  injectMarkerBlock,
  removeMarkerBlock,
} = require('./marker.cjs');
const { readState, writeState } = require('./install-state.cjs');
const { buildLauncherPath, buildMcpStateRecord } = require('./mcp-register.cjs');
const { detectPresentRuntimes } = require('./runtime-detect.cjs');
const { version: OTO_VERSION } = require('../../package.json');

const SRC_KEYS = [
  'commands',
  'agents',
  'skills',
  'hooks',
  'workflows',
  'references',
  'templates',
  'contexts',
];
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

function isExecutableFile(stat) {
  if (!stat.isFile()) return false;
  if (process.platform === 'win32') return true;
  return (stat.mode & 0o111) !== 0;
}

function isManagedOtoSdkTarget(target, shimSrc) {
  try {
    const stat = fs.lstatSync(target);
    if (stat.isSymbolicLink()) {
      // FIRST: try resolved comparison (works for live links).
      try {
        return fs.realpathSync(target) === fs.realpathSync(shimSrc);
      } catch {
        // realpathSync threw — likely a dangling link. Fall through to raw readlink check.
      }
      // SECOND: for dangling symlinks, inspect the raw link target textually.
      // A dangling managed link has basename 'oto-sdk.js' (the shim filename).
      // This covers the "repo was moved" case without false-positives on user-owned links.
      try {
        const rawTarget = fs.readlinkSync(target);
        return path.basename(rawTarget) === 'oto-sdk.js';
      } catch {
        return false;
      }
    }

    if (!stat.isFile()) return false;

    try {
      if (fs.realpathSync(target) === fs.realpathSync(shimSrc)) return true;
    } catch {
      // Fall through to wrapper-content detection.
    }

    const contents = fs.readFileSync(target, 'utf8');
    return contents.includes(`require(${JSON.stringify(shimSrc)})`);
  } catch {
    return false;
  }
}

function findOtoSdkOnPath(expectedShim) {
  const pathEnv = process.env.PATH || '';
  const exts = process.platform === 'win32' ? ['.cmd', '.exe', '.bat', ''] : [''];
  for (const seg of pathEnv.split(path.delimiter)) {
    if (!seg) continue;
    for (const ext of exts) {
      const candidate = path.join(seg, `oto-sdk${ext}`);
      try {
        const st = fs.statSync(candidate);
        if (isExecutableFile(st)) {
          const result = { path: candidate };
          if (expectedShim) {
            result.matchesCurrentInstall = isManagedOtoSdkTarget(candidate, expectedShim);
          }
          return result;
        }
      } catch {
        // Missing or unreadable PATH segment; keep scanning.
      }
    }
  }
  return null;
}

function isOtoSdkOnPath() {
  return Boolean(findOtoSdkOnPath());
}

function trySelfLinkOtoSdk(shimSrc) {
  if (process.platform === 'win32') return null;

  const home = os.homedir();
  if (!home) return null;

  const localBin = path.join(home, '.local', 'bin');
  const pathCandidates = [];
  const pathEnv = process.env.PATH || '';
  for (const seg of pathEnv.split(path.delimiter)) {
    if (!seg) continue;
    const abs = path.resolve(seg);
    if (abs.startsWith(home + path.sep) && !pathCandidates.includes(abs)) {
      pathCandidates.push(abs);
    }
  }

  const candidates = pathCandidates.includes(localBin)
    ? [localBin, ...pathCandidates.filter((dir) => dir !== localBin)]
    : [...pathCandidates, localBin];

  for (const dir of candidates) {
    try {
      fs.mkdirSync(dir, { recursive: true });
      const target = path.join(dir, 'oto-sdk');
      try {
        fs.lstatSync(target);
        if (!isManagedOtoSdkTarget(target, shimSrc)) {
          continue;
        }
        fs.unlinkSync(target);
      } catch {
        // No stale target to replace.
      }

      try {
        fs.symlinkSync(shimSrc, target);
      } catch {
        fs.writeFileSync(
          target,
          `#!/usr/bin/env node\nrequire(${JSON.stringify(shimSrc)});\n`,
        );
        try {
          fs.chmodSync(target, 0o755);
        } catch {
          // Non-fatal: the caller verifies PATH callability afterward.
        }
      }
      return target;
    } catch {
      // Permission or read-only filesystem; try the next HOME-owned candidate.
    }
  }
  return null;
}

function wireOtoSdk(opts = {}) {
  const repoRoot = opts.repoRoot || path.join(__dirname, '..', '..');
  const sdkCliPath = path.join(repoRoot, 'sdk', 'dist', 'cli.js');
  const shimSrc = path.join(repoRoot, 'bin', 'oto-sdk.js');

  if (!fs.existsSync(sdkCliPath)) {
    console.warn('');
    console.warn('  OTO SDK dist not found; runtime files were installed, but oto-sdk is not ready.');
    console.warn(`  Missing: ${sdkCliPath}`);
    console.warn('  For a development clone, run: cd sdk && npm install && npm run build');
    console.warn('  For an installed package, upgrade or reinstall from a version that ships sdk/dist/.');
    console.warn('');
    return { ready: false, reason: 'missing-dist', sdkCliPath, shimSrc };
  }

  try {
    const stat = fs.statSync(sdkCliPath);
    if ((stat.mode & 0o111) === 0) {
      fs.chmodSync(sdkCliPath, stat.mode | 0o111);
    }
  } catch {
    // The parent shim invokes node directly, so chmod failures are non-fatal.
  }

  let foundOnPath = findOtoSdkOnPath(shimSrc);
  let linked = null;
  if (foundOnPath && foundOnPath.matchesCurrentInstall === false) {
    console.warn('');
    console.warn(`  ⚠ OTO SDK files are present, but PATH resolves oto-sdk to a different executable: ${foundOnPath.path}`);
    console.warn('    Put this install\'s bin directory earlier on PATH, or remove the stale executable.');
    console.warn('');
    return {
      ready: false,
      reason: 'shadowed',
      path: foundOnPath.path,
      sdkCliPath,
      shimSrc,
    };
  }

  if (!foundOnPath) {
    linked = trySelfLinkOtoSdk(shimSrc);
    if (linked) {
      foundOnPath = findOtoSdkOnPath(shimSrc);
      if (foundOnPath && foundOnPath.matchesCurrentInstall) {
        console.log(`  ↪ linked oto-sdk → ${linked}`);
      }
    }
  }

  if (foundOnPath && foundOnPath.matchesCurrentInstall) {
    console.log('  ✓ OTO SDK ready (sdk/dist/cli.js)');
    return { ready: true, sdkCliPath, shimSrc, linked, path: foundOnPath.path };
  }

  console.warn('');
  console.warn('  ⚠ OTO SDK files are present but oto-sdk is not on your PATH.');
  console.warn('    Workflows that call `oto-sdk query ...` will fail with "command not found".');
  console.warn('    Add ~/.local/bin or another directory containing the shim to your PATH.');
  console.warn('');
  return { ready: false, reason: 'not-on-path', sdkCliPath, shimSrc, linked };
}

async function installRuntime(adapter, opts = {}) {
  const flags = opts.flags || {};
  const repoRoot = opts.repoRoot || path.join(__dirname, '..', '..');
  const configDir = resolveConfigDir(adapter, flags, process.env);
  await fsp.mkdir(configDir, { recursive: true });

  const statePath = path.join(configDir, 'oto', '.install.json');
  const priorState = readState(statePath);
  if (priorState && priorState.runtime !== adapter.name) {
    const err = new Error(
      `state runtime mismatch: found ${priorState.runtime} at ${configDir}, refusing to install ${adapter.name}`
    );
    err.exitCode = 1;
    throw err;
  }

  const preCtx = { configDir, priorState, otoVersion: OTO_VERSION };
  if (typeof adapter.onPreInstall === 'function') {
    await adapter.onPreInstall(preCtx);
  }
  if (typeof adapter.preflightInstall === 'function') {
    await adapter.preflightInstall(preCtx);
  }

  const fileEntries = [];
  for (const srcKey of SRC_KEYS) {
    // QUICK-260505-bxx-01: adapter-level override for the commands install branch.
    // Codex emits skills/oto-<name>/SKILL.md instead of commands/oto/<name>.md.
    if (srcKey === 'commands' && typeof adapter.installCommandsOverride === 'function') {
      const overrideEntries = await adapter.installCommandsOverride({
        repoRoot,
        configDir,
        otoVersion: OTO_VERSION,
      });
      for (const entry of overrideEntries || []) fileEntries.push(entry);
      continue;
    }

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

      if (srcKey === 'hooks' && shouldSubstitute(file.relPath)) {
        const original = await fsp.readFile(file.absPath, 'utf8');
        const replaced = tokenReplace(original, { OTO_VERSION });
        if (replaced !== original) {
          await fsp.writeFile(file.absPath, replaced);
        }
      }

      const hex = await sha256File(file.absPath);
      fileEntries.push({ path: path.relative(configDir, file.absPath), sha256: hex });
    }
  }

  if (typeof adapter.emitDerivedFiles === 'function') {
    const derivedEntries = await adapter.emitDerivedFiles({
      configDir,
      repoRoot,
      otoVersion: OTO_VERSION,
      projectRoot: opts.projectRoot || process.cwd(),
    });
    for (const entry of derivedEntries || []) {
      fileEntries.push(entry);
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
  if (typeof adapter.mergeSettings === 'function') {
    const existing = fs.existsSync(settingsPath) ? await fsp.readFile(settingsPath, 'utf8') : '';
    const merged = adapter.mergeSettings(existing, {
      otoVersion: OTO_VERSION,
      configDir,
      runtime: adapter.name,
      installedAt: new Date().toISOString(),
    });
    if (merged !== existing) {
      await fsp.writeFile(settingsPath, merged);
    }
  }

  // OTO Phase 15 (MCP-07/08): MCP registration dispatch — see decisions/ADR-16.
  let mcpState = priorState && priorState.mcp ? priorState.mcp : undefined;
  const exaMcpAction = opts.exaMcp || null;
  const mcpEnv = opts.env || process.env;
  if (exaMcpAction === 'register' && typeof adapter.mergeMcp === 'function') {
    const result = await adapter.mergeMcp({
      configDir,
      env: mcpEnv,
      otoVersion: OTO_VERSION,
      launcherPath: buildLauncherPath(configDir),
      priorEntry: priorState?.mcp?.exa?.entry ?? null,
    });
    if (result.registered) {
      mcpState = buildMcpStateRecord({ target: result.target, entry: result.entry });
      console.log(`oto: registered exa MCP server for ${adapter.name} (${result.target})`);
    } else if (result.refused) {
      console.log(
        `oto: exa MCP registration skipped for ${adapter.name} — existing entry is not oto-managed ` +
        `(${result.refused.reason}); resolve manually or run /oto-settings-integrations`
      );
    }
  } else if (exaMcpAction === 'unregister' && typeof adapter.unmergeMcp === 'function') {
    const result = await adapter.unmergeMcp({
      configDir,
      env: mcpEnv,
      otoVersion: OTO_VERSION,
      priorEntry: priorState?.mcp?.exa?.entry ?? null,
    });
    if (result.removed || result.skipped?.reason === 'absent') mcpState = undefined;
    console.log(
      result.removed
        ? `oto: unregistered exa MCP server for ${adapter.name}`
        : `oto: exa MCP entry left in place for ${adapter.name} (${result.skipped?.reason})`
    );
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
    hooks: { version: OTO_VERSION },
    ...(mcpState ? { mcp: mcpState } : {}),
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

  if (state.runtime !== adapter.name) {
    const err = new Error(
      `state runtime mismatch: found ${state.runtime} at ${configDir}, refusing to uninstall ${adapter.name}`
    );
    err.exitCode = 2;
    throw err;
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

  // Phase 5 (D-14): remove only oto-marked entries from settings.json; preserve user content.
  if (typeof adapter.unmergeSettings === 'function') {
    const settingsPath = path.join(configDir, adapter.settingsFilename);
    if (fs.existsSync(settingsPath)) {
      const existing = await fsp.readFile(settingsPath, 'utf8');
      const unmerged = adapter.unmergeSettings(existing, {
        otoVersion: state.oto_version,
        configDir,
        runtime: adapter.name,
      });
      if (unmerged !== existing) {
        await fsp.writeFile(settingsPath, unmerged);
      }
    }
  }

  // OTO Phase 15 (MCP-08): consume the stored fingerprint before removeTree deletes install state.
  if (state.mcp?.exa && typeof adapter.unmergeMcp === 'function') {
    const result = await adapter.unmergeMcp({
      configDir,
      env: opts.env || process.env,
      otoVersion: state.oto_version,
      priorEntry: state.mcp.exa.entry,
    });
    if (result.removed) {
      console.log(`oto: unregistered exa MCP server for ${adapter.name}`);
    } else if (result.skipped?.reason === 'drifted') {
      console.log('oto: exa entry was modified since oto registered it — left in place.');
    } else {
      console.log(`oto: exa MCP entry left in place for ${adapter.name} (${result.skipped?.reason})`);
    }
  }

  // QUICK-260505-bxx-03: adapter-level legacy cleanup hook (e.g. Codex commands/oto/ leftovers
  // from pre-skill-adapter installs that were never tracked in state.files).
  if (typeof adapter.uninstallCommandsOverride === 'function') {
    await adapter.uninstallCommandsOverride({ configDir });
  }

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

module.exports = {
  installRuntime,
  uninstallRuntime,
  installAll,
  uninstallAll,
  isOtoSdkOnPath,
  trySelfLinkOtoSdk,
  wireOtoSdk,
  isManagedOtoSdkTarget,
  findOtoSdkOnPath,
};
