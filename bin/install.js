#!/usr/bin/env node
'use strict';

const { version } = require('../package.json');

console.log(`oto v${version}`);
console.log('');
console.log('Run `oto install --claude` (Phase 3) to install for Claude Code.');
console.log('Repo: https://github.com/julianisaac/oto-hybrid-framework');

process.exit(0);
