'use strict';

const fs = require('node:fs');
const path = require('node:path');

const FENCE_OPEN = /<!--\s*runtime:(\w+)\s*-->/g;
const FENCE_CLOSE = /<!--\s*\/runtime:(\w+)\s*-->/g;
const RUNTIMES = ['claude', 'codex', 'gemini'];

function render(runtimeName, ctx = {}) {
  const tplPath = path.join(__dirname, '..', '..', 'oto', 'templates', 'instruction-file.md');
  const template = fs.readFileSync(tplPath, 'utf8');

  validateFencePairing(template);

  let out = stripWrongRuntimeBlocks(template, runtimeName);
  out = out.replace(new RegExp(`<!--\\s*runtime:${runtimeName}\\s*-->\\s*\\n?`, 'g'), '');
  out = out.replace(new RegExp(`<!--\\s*\\/runtime:${runtimeName}\\s*-->\\s*\\n?`, 'g'), '');

  for (const [key, value] of Object.entries(ctx)) {
    out = out.split(`{{${key}}}`).join(String(value));
  }

  return out;
}

function stripWrongRuntimeBlocks(template, keepRuntime) {
  let out = template;
  for (const runtime of RUNTIMES) {
    if (Object.is(runtime, keepRuntime)) continue;
    const re = new RegExp(`<!--\\s*runtime:${runtime}\\s*-->[\\s\\S]*?<!--\\s*\\/runtime:${runtime}\\s*-->\\s*\\n?`, 'g');
    out = out.replace(re, '');
  }
  return out;
}

function validateFencePairing(template) {
  FENCE_OPEN.lastIndex = 0;
  FENCE_CLOSE.lastIndex = 0;
  const opens = [...template.matchAll(FENCE_OPEN)];
  const closes = [...template.matchAll(FENCE_CLOSE)];

  const counts = {};
  for (const match of opens) counts[match[1]] = (counts[match[1]] || 0) + 1;
  for (const match of closes) counts[match[1]] = (counts[match[1]] || 0) - 1;
  for (const [runtime, count] of Object.entries(counts)) {
    if (count !== 0) {
      const direction = count > 0 ? `${count} unclosed` : `${-count} unopened`;
      throw new Error(`instruction-file.md: runtime "${runtime}" has ${direction} fence(s)`);
    }
  }

  if (opens.length !== closes.length) {
    throw new Error(`instruction-file.md: ${opens.length} open fences, ${closes.length} close fences`);
  }
}

module.exports = { render, validateFencePairing };
