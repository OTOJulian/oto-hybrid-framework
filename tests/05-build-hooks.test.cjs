'use strict';
// Phase 5 Wave 0 scaffold - implemented in Wave 1 (plan 05-02).
// Covers: HK-07 build leg.
// Will cover HK-07 build leg + Pitfall F (build reads correct dir) + Pitfall G (executable bit on bash hooks). Will spawn `node scripts/build-hooks.js` from a clean working tree, assert exit 0; assert `oto/hooks/dist/` contains exactly 6 files matching the inventory keep set: `oto-session-start`, `oto-statusline.js`, `oto-context-monitor.js`, `oto-prompt-guard.js`, `oto-read-injection-scanner.js`, `oto-validate-commit.sh`; assert `(fs.statSync('oto/hooks/dist/oto-session-start').mode & 0o111) !== 0` (executable); same for `oto-validate-commit.sh`; assert `oto-session-start` content begins with `#!` shebang on line 1 and `# oto-hook-version: ` on line 2.
const test = require('node:test');
const path = require('node:path');
const REPO_ROOT = path.resolve(__dirname, '..');

test('phase-05 build-hooks: emits 6 files into oto/hooks/dist with exec bits intact', (t) => {
  t.todo('Implemented in Wave 1 (plan 05-02) once scripts/build-hooks.js is retargeted to oto/hooks/');
});
