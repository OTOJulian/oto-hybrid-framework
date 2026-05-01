'use strict';
// Phase 5 Wave 0 scaffold - implemented in Wave 1 (plan 05-02).
// Covers: HK-07 token substitution.
// Will require a `tokenReplace` helper from `bin/lib/copy-files.cjs` (or sibling), feed it a fixture string containing `{{OTO_VERSION}}`, assert output substitutes the token to a semver string matching `^\d+\.\d+\.\d+(-[a-z0-9.]+)?$`. Will also assert allowlist exclusion: a fixture path containing `foundation-frameworks/` returns the input untouched. Round-trip: re-substitute the literal token back into the substituted output yields the original template (per 05-RESEARCH.md Pitfall D).
const test = require('node:test');
const path = require('node:path');
const REPO_ROOT = path.resolve(__dirname, '..');

test('phase-05 token-substitution: {{OTO_VERSION}} substitutes to package version', (t) => {
  t.todo('Implemented in Wave 1 (plan 05-02) once bin/lib/copy-files.cjs::tokenReplace exists');
});
