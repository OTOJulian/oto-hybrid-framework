#!/usr/bin/env node
'use strict';

/**
 * oto build-hooks: vm-validates JS hook sources and copies to oto/hooks/dist/.
 * Phase 5 retargets the build from the legacy top-level hooks/ tree to oto/hooks/.
 * Pattern derived from foundation-frameworks/get-shit-done-main/scripts/build-hooks.js.
 */

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const HOOKS_DIR = path.join(__dirname, '..', 'oto', 'hooks');
const DIST_DIR = path.join(HOOKS_DIR, 'dist');
const KEEP_NAME = new Set(['oto-session-start']);

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

  fs.rmSync(DIST_DIR, { recursive: true, force: true });
  fs.mkdirSync(DIST_DIR, { recursive: true });

  const entries = fs.readdirSync(HOOKS_DIR, { withFileTypes: true })
    .filter((d) => d.isFile())
    .map((d) => d.name)
    .filter((name) => /\.(js|cjs|sh)$/.test(name) || KEEP_NAME.has(name));
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
    const shebang = fs.readFileSync(src, 'utf8').slice(0, 64).split('\n')[0];
    const isBash = name.endsWith('.sh') || /^#!\/(usr\/)?bin\/(env\s+)?bash\b/.test(shebang) || KEEP_NAME.has(name);
    if (isBash) {
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
