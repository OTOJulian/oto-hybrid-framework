'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { findOtoSdkOnPath, isManagedOtoSdkTarget } = require('./install.cjs');
const { loadConfig } = require('../../oto/bin/lib/core.cjs');
const { detectKeySource } = require('../../oto/bin/lib/secrets.cjs');
const {
  classifyExaRegistration,
  checkExaCoherence,
} = require('./mcp-register.cjs');

/**
 * checkOtoSdk(opts) → DoctorResult
 *
 * opts.repoRoot  — absolute path to the oto repo (default: __dirname/../..)
 *
 * DoctorResult:
 *   verdict: 'healthy' | 'missing' | 'stale' | 'shadowed'
 *   reason?: 'dangling' | 'wrong-repo'   (only when verdict === 'stale')
 *   sdkDistMissing?: boolean              (only when verdict === 'healthy')
 *   path?: string                         (PATH-resolved oto-sdk path, when found)
 *   shimSrc: string                       (expected shim path for this repo)
 *   sdkCliPath: string                    (expected sdk/dist/cli.js path)
 */
function checkOtoSdk(opts = {}) {
  const repoRoot = opts.repoRoot || path.join(__dirname, '..', '..');
  const shimSrc = path.join(repoRoot, 'bin', 'oto-sdk.js');
  const sdkCliPath = path.join(repoRoot, 'sdk', 'dist', 'cli.js');

  // findOtoSdkOnPath uses statSync (follows symlinks) so dangling links are
  // silently skipped — which means a dangling on-PATH link reports 'missing'.
  // To detect the stale/dangling case, we do a secondary lstat scan below.
  const found = findOtoSdkOnPath(shimSrc);

  if (!found) {
    // Secondary scan: look for a dangling managed symlink in PATH dirs.
    const pathEnv = process.env.PATH || '';
    for (const seg of pathEnv.split(path.delimiter)) {
      if (!seg) continue;
      const candidate = path.join(seg, 'oto-sdk');
      try {
        const lst = fs.lstatSync(candidate);
        if (lst.isSymbolicLink()) {
          const raw = fs.readlinkSync(candidate);
          if (path.basename(raw) === 'oto-sdk.js') {
            // Dangling managed link — realpathSync would throw here (target missing)
            try {
              fs.realpathSync(candidate);
              // If we get here the link is live but somehow statSync missed it — skip
            } catch {
              return { verdict: 'stale', reason: 'dangling', path: candidate, shimSrc, sdkCliPath };
            }
          }
        }
      } catch {
        // lstatSync failed (entry doesn't exist) — keep scanning
      }
    }
    return { verdict: 'missing', shimSrc, sdkCliPath };
  }

  // findOtoSdkOnPath succeeded — found.path is a live file.
  // matchesCurrentInstall === true means isManagedOtoSdkTarget confirmed it's ours.
  if (found.matchesCurrentInstall === true) {
    const sdkDistMissing = !fs.existsSync(sdkCliPath);
    return { verdict: 'healthy', path: found.path, shimSrc, sdkCliPath, sdkDistMissing };
  }

  // Not matching current install — distinguish shadowed vs stale.
  // Strategy:
  //   - If lstatSync says it's a symlink: check readlink basename.
  //     - basename === 'oto-sdk.js' → stale (points at a different repo's shim)
  //     - otherwise → shadowed (unrelated executable)
  //   - If it's a regular file: check wrapper content heuristic.
  //     - contains 'oto-sdk.js' in content → stale wrong-repo
  //     - otherwise → shadowed

  try {
    const lst = fs.lstatSync(found.path);
    if (lst.isSymbolicLink()) {
      const raw = fs.readlinkSync(found.path);
      if (path.basename(raw) === 'oto-sdk.js') {
        return { verdict: 'stale', reason: 'wrong-repo', path: found.path, shimSrc, sdkCliPath };
      }
      return { verdict: 'shadowed', path: found.path, shimSrc, sdkCliPath };
    }
    // Regular file: look for oto wrapper content.
    const contents = fs.readFileSync(found.path, 'utf8');
    if (contents.includes('oto-sdk.js')) {
      return { verdict: 'stale', reason: 'wrong-repo', path: found.path, shimSrc, sdkCliPath };
    }
    return { verdict: 'shadowed', path: found.path, shimSrc, sdkCliPath };
  } catch {
    // Defensive fallback.
    return { verdict: 'shadowed', path: found.path, shimSrc, sdkCliPath };
  }
}

// OTO Phase 15 (D-10): MCP coherence — shared helper with the settings status surface.
function checkExaMcp(opts = {}) {
  const statuses = ['claude', 'codex', 'gemini'].map((runtime) =>
    classifyExaRegistration(runtime, opts)
  );
  let exaSearchEnabled = opts.exaSearchEnabled;
  if (exaSearchEnabled === undefined) {
    try {
      exaSearchEnabled = loadConfig(opts.cwd || process.cwd()).exa_search === true;
    } catch {
      exaSearchEnabled = false;
    }
  }
  const keySource = opts.keySource !== undefined
    ? opts.keySource
    : detectKeySource('exa', opts.keyfileBase).source;
  const warnings = checkExaCoherence({ exaSearchEnabled, keySource, statuses });
  const lines = statuses.map(({ runtime, status, target }) =>
    `exa MCP [${runtime}]: ${status} (${target})`
  );
  return { kind: 'exa-mcp', ok: warnings.length === 0, statuses, warnings, lines };
}

function printResult(result) {
  if (result.kind === 'exa-mcp') {
    for (const line of result.lines) process.stdout.write(`${line}\n`);
    for (const warning of result.warnings) process.stderr.write(`${warning}\n`);
    return;
  }
  const { verdict, reason, path: sdkPath, shimSrc, sdkCliPath, sdkDistMissing } = result;

  if (verdict === 'healthy') {
    process.stdout.write('oto doctor: oto-sdk OK\n');
    process.stdout.write(`  PATH entry : ${sdkPath}\n`);
    process.stdout.write(`  shim source: ${shimSrc}\n`);
    if (sdkDistMissing) {
      process.stderr.write(`  WARNING: sdk/dist/cli.js not found at ${sdkCliPath}\n`);
      process.stderr.write('  Run: cd sdk && npm install && npm run build\n');
    } else {
      process.stdout.write(`  sdk dist   : ${sdkCliPath} (present)\n`);
    }
    return;
  }

  if (verdict === 'missing') {
    process.stderr.write('oto doctor: MISSING — oto-sdk not found on PATH\n');
    process.stderr.write(`  Expected shim: ${shimSrc}\n`);
    process.stderr.write('  Fix: oto install --claude  (re-runs wireOtoSdk to create the link)\n');
    return;
  }

  if (verdict === 'stale') {
    const detail = reason === 'dangling' ? 'dangling symlink' : 'points at a different repo';
    process.stderr.write(`oto doctor: STALE — oto-sdk is ${detail}\n`);
    process.stderr.write(`  Found at   : ${sdkPath}\n`);
    process.stderr.write(`  Expected   : ${shimSrc}\n`);
    process.stderr.write('  Fix: oto install --claude  (re-runs wireOtoSdk to recreate the link)\n');
    return;
  }

  if (verdict === 'shadowed') {
    process.stderr.write('oto doctor: SHADOWED — a non-oto oto-sdk appears first on PATH\n');
    process.stderr.write(`  Shadowing  : ${sdkPath}\n`);
    process.stderr.write(`  Expected   : ${shimSrc}\n`);
    process.stderr.write(`  Fix: move ${path.dirname(shimSrc)} earlier on PATH, or remove the shadowing executable\n`);
  }
}

async function main(argv, repoRoot) {
  if (process.platform === 'win32') {
    process.stdout.write('oto doctor: PATH self-link check is not supported on Windows.\n');
    return 0;
  }
  const result = checkOtoSdk({ repoRoot: repoRoot || path.join(__dirname, '..', '..') });
  printResult(result);
  const exaResult = checkExaMcp();
  printResult(exaResult);
  return result.verdict === 'healthy' && exaResult.ok ? 0 : 1;
}

module.exports = { checkOtoSdk, checkExaMcp, main };
