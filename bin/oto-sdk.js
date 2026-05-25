#!/usr/bin/env node
/**
 * bin/oto-sdk.js — shim exposing the oto-sdk CLI from the parent package.
 *
 * When oto is installed globally (npm install -g github:OTOJulian/oto-hybrid-framework)
 * npm creates an `oto-sdk` symlink in the global bin dir pointing at this file
 * (via package.json bin."oto-sdk"). npm chmods bin entries from a tarball, so the
 * execute-bit problem (#2453) cannot occur here.
 *
 * Resolves sdk/dist/cli.js relative to its OWN location (__dirname) so the #2775
 * self-link fallback can create a require() wrapper (not a copy) and keep
 * resolution pointing at the real sdk/dist/. Delegates via `node` so the dist
 * execute-bit is irrelevant.
 */
'use strict';

const path = require('path');
const { spawnSync } = require('child_process');

const cliPath = path.resolve(__dirname, '..', 'sdk', 'dist', 'cli.js');

const result = spawnSync(process.execPath, [cliPath, ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: process.env,
});

process.exit(result.status ?? 1);
