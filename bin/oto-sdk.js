#!/usr/bin/env node
'use strict';

const path = require('node:path');
const { spawnSync } = require('node:child_process');

const args = process.argv.slice(2);
const toolPath = path.resolve(__dirname, '..', 'oto', 'bin', 'lib', 'oto-tools.cjs');

function run(toolArgs) {
  const result = spawnSync(process.execPath, [toolPath, ...toolArgs], {
    stdio: 'inherit',
    env: process.env,
  });
  process.exit(result.status ?? 1);
}

if (args[0] === 'query') {
  const handler = args[1];
  if (!handler) {
    process.stderr.write('Usage: oto-sdk query <handler> [args]\n');
    process.exit(1);
  }
  const translated = handler.includes('.') ? handler.split('.') : [handler];
  run([...translated, ...args.slice(2)]);
}

run(args);
