#!/usr/bin/env node
'use strict';

/**
 * oto build-hooks: vm-validates JS hook sources and copies to hooks/dist/.
 * Phase 2: hooks/ contains only .gitkeep; this is a verified no-op.
 * Phase 5 fills hooks/ with real source files.
 * Pattern derived from foundation-frameworks/get-shit-done-main/scripts/build-hooks.js.
 */

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const HOOKS_DIR = path.join(__dirname, '..', 'hooks');
const DIST_DIR = path.join(HOOKS_DIR, 'dist');

function validateSyntax(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  try {
    new vm.Script(content, { filename: path.basename(filePath) });
    return null;
  } catch (e) {
    if (e instanceof SyntaxError) return e.message;
    throw e;
  }
}

function build() {
  if (!fs.existsSync(HOOKS_DIR)) {
    console.error('hooks/ missing');
    process.exit(1);
  }

  fs.mkdirSync(DIST_DIR, { recursive: true });

  const entries = fs.readdirSync(HOOKS_DIR)
    .filter((name) => /\.(js|cjs|sh)$/.test(name));
  let count = 0;
  let hasErrors = false;

  for (const name of entries) {
    const src = path.join(HOOKS_DIR, name);
    const dest = path.join(DIST_DIR, name);

    if (name.endsWith('.js') || name.endsWith('.cjs')) {
      const syntaxError = validateSyntax(src);
      if (syntaxError) {
        console.error(`${name}: SyntaxError - ${syntaxError}`);
        hasErrors = true;
        continue;
      }
    }

    fs.copyFileSync(src, dest);
    if (name.endsWith('.sh')) {
      try {
        fs.chmodSync(dest, 0o755);
      } catch {
        // Windows may not support POSIX mode bits.
      }
    }
    count += 1;
  }

  if (hasErrors) {
    console.error('Build failed.');
    process.exit(1);
  }

  console.log(`Build complete (${count} hooks).`);
  process.exit(0);
}

build();
