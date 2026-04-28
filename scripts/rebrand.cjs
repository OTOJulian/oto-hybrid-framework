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
      target: { type: 'string', default: 'foundation-frameworks/' },
      out: { type: 'string', default: '.oto-rebrand-out/' },
      force: { type: 'boolean', default: false },
      owner: { type: 'string', default: 'OTOJulian' },
      map: { type: 'string', default: 'rename-map.json' }
    },
    strict: true
  });

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
