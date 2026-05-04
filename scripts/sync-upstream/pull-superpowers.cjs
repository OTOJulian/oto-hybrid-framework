#!/usr/bin/env node
'use strict';

const path = require('node:path');
const { parseArgs } = require('node:util');
const { pullUpstream } = require('../../bin/lib/sync-pull.cjs');

const SUPERPOWERS_URL = 'https://github.com/obra/superpowers.git';
const NAME = 'superpowers';
const DEFAULT_DEST = path.resolve('.oto-sync/upstream/superpowers');

async function main() {
  const { values } = parseArgs({
    options: {
      to: { type: 'string' },
      'dest-dir': { type: 'string', default: DEFAULT_DEST },
      url: { type: 'string', default: SUPERPOWERS_URL },
    },
    strict: true,
  });

  if (!values.to) {
    process.stderr.write('pull-superpowers: --to <tag|sha|main> is required\n');
    process.exit(2);
  }

  const record = await pullUpstream({
    name: NAME,
    url: values.url,
    ref: values.to,
    destDir: path.resolve(values['dest-dir']),
  });
  process.stdout.write(`${JSON.stringify(record, null, 2)}\n`);
  process.exit(0);
}

main().catch((error) => {
  process.stderr.write(`pull-superpowers: ${error.message}\n`);
  process.exit(1);
});
