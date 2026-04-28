'use strict';
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const SUPPORTED_RUNTIMES = ['claude', 'codex', 'gemini'];
const DEFAULT_SEGMENTS = {
  claude: '.claude',
  codex: '.codex',
  gemini: '.gemini',
};

function detectPresentRuntimes(homeDir = os.homedir()) {
  const present = [];
  for (const runtime of SUPPORTED_RUNTIMES) {
    const dir = path.join(homeDir, DEFAULT_SEGMENTS[runtime]);
    try {
      if (fs.statSync(dir).isDirectory()) present.push(runtime);
    } catch {
      // Missing config dirs are normal when that runtime has not been installed.
    }
  }
  return present;
}

module.exports = { detectPresentRuntimes, SUPPORTED_RUNTIMES, DEFAULT_SEGMENTS };
