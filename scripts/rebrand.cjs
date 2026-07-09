#!/usr/bin/env node
'use strict';

const { parseArgs } = require('node:util');
const path = require('node:path');
const engine = require('./rebrand/lib/engine.cjs');

async function main() {
  const { values } = parseArgs({
    options: {
      'dry-run': { type: 'boolean', default: false },
      apply: { type: 'boolean', default: false },
      'verify-roundtrip': { type: 'boolean', default: false },
      target: { type: 'string' },
      out: { type: 'string', default: '.oto-rebrand-out/' },
      force: { type: 'boolean', default: false },
      owner: { type: 'string', default: 'OTOJulian' },
      map: { type: 'string', default: 'rename-map.json' }
    },
    strict: true
  });

  if (!values.target) {
    console.error(
      "engine error: --target is required (no default — foundation-frameworks/ was removed 2026-07-09). " +
      "Pass --target <dir>: a fixture tree, a .oto-sync/upstream/{gsd,superpowers}/current snapshot, " +
      "or an OTO_SYNC_CORPUS=1 pinned clone."
    );
    process.exit(5);
  }

  let mode = 'dry-run';
  if (values.apply) mode = 'apply';
  else if (values['verify-roundtrip']) mode = 'verify-roundtrip';

  try {
    const result = await engine.run({
      mode,
      target: path.resolve(values.target),
      out: mode === 'apply' ? path.resolve(values.out) : undefined,
      force: values.force,
      owner: values.owner,
      mapPath: path.resolve(values.map)
    });
    process.exit(result.exitCode);
  } catch (error) {
    console.error(`engine error: ${error.message}`);
    process.exit(5);
  }
}

main();
