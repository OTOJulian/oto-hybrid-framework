#!/usr/bin/env node
'use strict';

// Runtime-sync drift guard.
//
// Verifies that the repo's oto/workflows/ and oto/references/ trees are
// byte-identical in every installed runtime root (~/.claude, ~/.codex,
// ~/.gemini), and that installed agent .md files satisfy the
// adversarial_stance -> model-calibration invariant.
//
// One-directional (repo -> installed): every repo file must have a
// byte-identical installed counterpart. Extra installed files are NOT drift.
// Agent files are deliberately NOT content-compared: installed agent copies
// legitimately carry runtime-specific adaptations (quoted frontmatter,
// <codex_agent_role> blocks, runtime-rooted paths).
//
// Roots without an oto install are skipped with a notice, so the script is
// CI-safe (exits 0 on machines with no runtime installs at all).

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..');
const SYNCED_DIRS = ['oto/workflows', 'oto/references'];

const RUNTIME_ROOTS = [
  { name: '~/.claude', dir: path.join(os.homedir(), '.claude') },
  { name: '~/.codex', dir: path.join(os.homedir(), '.codex') },
  { name: '~/.gemini', dir: path.join(os.homedir(), '.gemini') },
];

/** Recursively list files under dir, returning paths relative to base. */
function listFiles(dir, base) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listFiles(abs, base));
    } else if (entry.isFile()) {
      out.push(path.relative(base, abs));
    }
  }
  return out;
}

function checkRoot(root) {
  const drift = [];

  // Repo -> installed byte comparison for workflows/ and references/.
  for (const relDir of SYNCED_DIRS) {
    const repoDir = path.join(REPO_ROOT, relDir);
    if (!fs.existsSync(repoDir)) continue;
    for (const relFile of listFiles(repoDir, repoDir)) {
      const repoFile = path.join(repoDir, relFile);
      const installedFile = path.join(root.dir, relDir, relFile);
      const displayPath = `${root.name}/${relDir}/${relFile.split(path.sep).join('/')}`;
      if (!fs.existsSync(installedFile)) {
        drift.push(`DRIFT: ${displayPath} (missing)`);
        continue;
      }
      const repoBuf = fs.readFileSync(repoFile);
      const installedBuf = fs.readFileSync(installedFile);
      if (!repoBuf.equals(installedBuf)) {
        drift.push(`DRIFT: ${displayPath} (differs)`);
      }
    }
  }

  // Agent invariant: any installed agent .md containing "adversarial_stance"
  // must also reference "model-calibration".
  //
  // .toml sidecars are deliberately EXCLUDED: Codex .toml sidecars carry no
  // required_reading references by prior decision (quick tasks 260713-in8 /
  // 260714-nzr received deletion-only .toml edits), so the invariant applies
  // to agent .md files only.
  const agentsDir = path.join(root.dir, 'agents');
  if (fs.existsSync(agentsDir)) {
    for (const entry of fs.readdirSync(agentsDir, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
      const content = fs.readFileSync(path.join(agentsDir, entry.name), 'utf8');
      if (content.includes('adversarial_stance') && !content.includes('model-calibration')) {
        drift.push(
          `DRIFT: ${root.name}/agents/${entry.name} (contains adversarial_stance without model-calibration)`
        );
      }
    }
  }

  return drift;
}

function main() {
  const allDrift = [];
  const summary = [];

  for (const root of RUNTIME_ROOTS) {
    const otoDir = path.join(root.dir, 'oto');
    if (!fs.existsSync(root.dir) || !fs.existsSync(otoDir)) {
      summary.push(`skip: ${root.name} (no oto install)`);
      continue;
    }
    const drift = checkRoot(root);
    if (drift.length > 0) {
      allDrift.push(...drift);
      summary.push(`FAIL: ${root.name} (${drift.length} drift item${drift.length === 1 ? '' : 's'})`);
    } else {
      summary.push(`ok: ${root.name}`);
    }
  }

  for (const line of allDrift) console.log(line);
  for (const line of summary) console.log(line);

  if (allDrift.length > 0) {
    console.error(
      `\nruntime-sync drift detected (${allDrift.length} item${allDrift.length === 1 ? '' : 's'}). ` +
        'Sync the repo files to the installed runtime roots and re-run.'
    );
    process.exit(1);
  }
  process.exit(0);
}

main();
