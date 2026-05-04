'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..');
const { tokenReplace, shouldSubstitute } = require(path.join(REPO_ROOT, 'bin/lib/copy-files.cjs'));
const pkg = require(path.join(REPO_ROOT, 'package.json'));

test('phase-05 token-substitution: {{OTO_VERSION}} substitutes to package version', () => {
  assert.equal(
    tokenReplace('# oto-hook-version: {{OTO_VERSION}}', { OTO_VERSION: '0.1.0' }),
    '# oto-hook-version: 0.1.0',
  );
  assert.equal(tokenReplace('no tokens here', { OTO_VERSION: 'x' }), 'no tokens here');
  assert.equal(tokenReplace('{{OTO_VERSION}} {{OTO_VERSION}}', { OTO_VERSION: '1.2.3' }), '1.2.3 1.2.3');
  assert.equal(tokenReplace('{{OTHER}}', { OTO_VERSION: 'x' }), '{{OTHER}}');

  const original = '# oto-hook-version: {{OTO_VERSION}}\nbody';
  const substituted = tokenReplace(original, { OTO_VERSION: '0.1.0' });
  const reversed = substituted.split('0.1.0').join('{{OTO_VERSION}}');
  assert.equal(reversed, original);

  const withPackageVersion = tokenReplace('{{OTO_VERSION}}', { OTO_VERSION: pkg.version });
  assert.match(withPackageVersion, /^\d+\.\d+\.\d+(-[a-z0-9.]+)?$/);
});

test('phase-05 token-substitution: deny-list excludes foundation-frameworks, __fixtures__, LICENSE', () => {
  assert.equal(shouldSubstitute('oto/hooks/oto-session-start'), true);
  assert.equal(shouldSubstitute('oto/hooks/oto-statusline.js'), true);
  assert.equal(shouldSubstitute('oto/hooks/oto-validate-commit.sh'), true);
  assert.equal(shouldSubstitute('oto/hooks/foundation-frameworks/something.sh'), false);
  assert.equal(shouldSubstitute('oto/hooks/__fixtures__/golden.json'), false);
  assert.equal(shouldSubstitute('LICENSE'), false);
  assert.equal(shouldSubstitute('foo/LICENSE-MIT'), false);
  assert.equal(shouldSubstitute('README.md'), false);
});
