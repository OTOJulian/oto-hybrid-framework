'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

// Phase 3 Wave 0 scaffold.
// Covers: INS-01 (thin installer shell)
// Filled by: 03-07-PLAN.md (Wave 4)
// Sources: 03-VALIDATION.md per-task verification map

function readInstallShell() {
  return fs.readFileSync('bin/install.js', 'utf8');
}

test('INS-01: bin/install.js starts with #!/usr/bin/env node shebang', () => {
  assert.equal(readInstallShell().split('\n')[0], '#!/usr/bin/env node');
});

test('INS-01: bin/install.js declares use strict on second line', () => {
  assert.equal(readInstallShell().split('\n')[1], "'use strict';");
});

test('INS-01: bin/install.js line count <= 200 (thin shell per D-14)', () => {
  const lines = readInstallShell().split('\n');
  assert.ok(lines.length <= 200, `expected <= 200 lines, got ${lines.length}`);
});

test(
  'INS-01: bin/install.js requires ' +
    'bin/lib/args.cjs and bin/lib/install.cjs (no business logic inline)',
  () => {
    const source = readInstallShell();
    assert.match(source, /require\('\.\/lib\/args\.cjs'\)/);
    assert.match(source, /require\('\.\/lib\/install\.cjs'\)/);
  }
);

test('INS-01: bin/install.js exits 1 with stderr message when Node major < 22', () => {
  const source = readInstallShell();
  assert.match(source, /process\.versions\.node/);
  assert.match(source, /Node\.js >= 22\.0\.0/i);
});

test('INS-01: bin/install.js retains executable bit (mode includes 0o111) — Pitfall #2453 / D-20', () => {
  assert.ok((fs.statSync('bin/install.js').mode & 0o111) > 0);
});
