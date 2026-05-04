#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const fsp = require('node:fs/promises');
const { parseArgs } = require('node:util');
const { mergeAll, writeReport, appendBreakingChanges } = require('../../bin/lib/sync-merge.cjs');
const { validate } = require('../../scripts/rebrand/lib/validate-schema.cjs');
const lastSyncedSchema = require('../../schema/last-synced-commit.json');
const pkg = require('../../package.json');

function loadPinFile(pinFilePath, fallback) {
  try {
    const parsed = JSON.parse(fs.readFileSync(pinFilePath, 'utf8'));
    const result = validate(parsed, lastSyncedSchema);
    if (!result.valid) {
      throw new Error(`pin file ${pinFilePath} failed schema validation: ${result.errors.join('; ')}`);
    }
    return parsed;
  } catch (error) {
    if (error.code === 'ENOENT') return fallback;
    throw error;
  }
}

async function main() {
  const { values } = parseArgs({
    options: {
      upstream: { type: 'string' },
      'oto-dir': { type: 'string', default: 'oto' },
      'conflicts-dir': { type: 'string', default: '.oto-sync-conflicts' },
      'sync-meta-dir': { type: 'string', default: '.oto-sync' },
      inventory: { type: 'string', default: 'decisions/file-inventory.json' },
      allowlist: { type: 'string', default: 'decisions/sync-allowlist.json' },
      apply: { type: 'boolean', default: false },
      'rebranded-dir': { type: 'string' },
      'prior-rebranded-dir': { type: 'string' },
      'pin-file': { type: 'string' },
      'prior-pin-file': { type: 'string' },
    },
    strict: true,
  });

  if (!values.upstream) {
    process.stderr.write('sync-merge: --upstream {gsd|superpowers} required\n');
    process.exit(2);
  }

  const upstream = values.upstream;
  const syncMetaDir = path.resolve(values['sync-meta-dir']);
  const currentRebrandedDir = values['rebranded-dir']
    ? path.resolve(values['rebranded-dir'])
    : path.resolve(`.oto-sync/rebranded/${upstream}/current`);
  const priorRebrandedDir = values['prior-rebranded-dir']
    ? path.resolve(values['prior-rebranded-dir'])
    : path.resolve(`.oto-sync/rebranded/${upstream}/prior`);
  const conflictsDir = path.resolve(values['conflicts-dir']);
  const pinPath = values['pin-file']
    ? path.resolve(values['pin-file'])
    : path.resolve(`.oto-sync/upstream/${upstream}/last-synced-commit.json`);
  const priorPinPath = values['prior-pin-file']
    ? path.resolve(values['prior-pin-file'])
    : path.resolve(`.oto-sync/upstream/${upstream}/prior-last-synced-commit.json`);

  await fsp.mkdir(conflictsDir, { recursive: true });

  const currentPin = loadPinFile(pinPath, { ref: 'unknown', sha: 'unknown' });
  const priorPin = loadPinFile(priorPinPath, { ref: 'first-sync', sha: 'first-sync' });
  const result = await mergeAll({
    inventoryPath: path.resolve(values.inventory),
    allowlistPath: path.resolve(values.allowlist),
    otoDir: path.resolve(values['oto-dir']),
    conflictsDir,
    priorRebrandedDir,
    currentRebrandedDir,
    upstream,
    priorTag: priorPin.ref,
    priorSha: priorPin.sha,
    currentTag: currentPin.ref,
    currentSha: currentPin.sha,
    otoVersion: pkg.version,
    apply: values.apply,
  });

  const summary = {
    upstream,
    priorTag: priorPin.ref,
    priorSha: priorPin.sha,
    currentTag: currentPin.ref,
    currentSha: currentPin.sha,
    timestamp: new Date().toISOString(),
    counts: result.counts,
    lists: result.lists || { clean: [], conflict: [], added: [], deleted: [], binary: [], unclassifiedAdds: [] },
  };
  await writeReport(conflictsDir, summary);
  await appendBreakingChanges(syncMetaDir, upstream, summary);
  process.stdout.write(`sync-merge: ${JSON.stringify(result.counts)}\n`);
  process.exit(result.exitCode);
}

main().catch((error) => {
  process.stderr.write(`sync-merge: ${error.message}\n`);
  process.exit(1);
});
