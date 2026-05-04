#!/usr/bin/env node
'use strict';

const path = require('node:path');
const { parseArgs } = require('node:util');
const engine = require('../../scripts/rebrand/lib/engine.cjs');

async function main() {
  const { values } = parseArgs({
    options: {
      upstream: { type: 'string' },
      snapshot: { type: 'string', default: 'current' },
      target: { type: 'string' },
      out: { type: 'string' },
      owner: { type: 'string', default: 'OTOJulian' },
      map: { type: 'string', default: 'rename-map.json' },
      force: { type: 'boolean', default: true },
    },
    strict: true,
  });

  if (!values.upstream && !values.target) {
    process.stderr.write('sync-rebrand: --upstream {gsd|superpowers} or --target <dir> required\n');
    process.exit(2);
  }

  const target = values.target
    ? path.resolve(values.target)
    : path.resolve(`.oto-sync/upstream/${values.upstream}/${values.snapshot}`);
  const out = values.out
    ? path.resolve(values.out)
    : path.resolve(`.oto-sync/rebranded/${values.upstream}/${values.snapshot}`);

  const result = await engine.run({
    mode: 'apply',
    target,
    out,
    force: values.force,
    owner: values.owner,
    mapPath: path.resolve(values.map),
  });
  process.exit(result.exitCode);
}

main().catch((error) => {
  process.stderr.write(`sync-rebrand: ${error.message}\n`);
  process.exit(5);
});
