'use strict';
const fs = require('node:fs');
const path = require('node:path');

const CURRENT_SCHEMA_VERSION = 1;

function validateState(state) {
  const errors = [];
  if (!state || typeof state !== 'object') return ['state must be an object'];
  if (state.version !== CURRENT_SCHEMA_VERSION) errors.push(`unsupported state.version: ${state.version}`);
  if (typeof state.oto_version !== 'string') errors.push('state.oto_version must be a string');
  if (typeof state.installed_at !== 'string') errors.push('state.installed_at must be ISO-8601 string');
  if (!['claude', 'codex', 'gemini'].includes(state.runtime)) errors.push(`unknown runtime: ${state.runtime}`);
  if (typeof state.config_dir !== 'string') errors.push('state.config_dir must be a string');
  if (!Array.isArray(state.files)) {
    errors.push('state.files must be an array');
  } else {
    for (const [i, f] of state.files.entries()) {
      if (!f || typeof f !== 'object') {
        errors.push(`state.files[${i}] must be an object`);
        continue;
      }
      if (typeof f.path !== 'string') errors.push(`state.files[${i}].path must be a string`);
      else if (f.path.length === 0) errors.push(`state.files[${i}].path must be a non-empty string`);
      if (typeof f.path === 'string' && !isSafeRelativePath(f.path)) errors.push(`state.files[${i}].path must be relative to configDir: ${f.path}`);
      if (typeof f.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(f.sha256)) errors.push(`state.files[${i}].sha256 must be 64-hex string`);
    }
  }
  if (!state.instruction_file || typeof state.instruction_file !== 'object') {
    errors.push('state.instruction_file required');
  } else {
    const instructionPath = state.instruction_file.path;
    if (typeof instructionPath !== 'string') errors.push('state.instruction_file.path must be a string');
    else if (instructionPath.length === 0) errors.push('state.instruction_file.path must be a non-empty string');
    else if (!isSafeRelativePath(instructionPath)) errors.push(`state.instruction_file.path must be relative to configDir: ${instructionPath}`);
  }
  return errors;
}

function isSafeRelativePath(p) {
  return !path.isAbsolute(p) && !p.split(/[\\/]+/).includes('..');
}

function readState(statePath) {
  if (!fs.existsSync(statePath)) return null;
  const raw = fs.readFileSync(statePath, 'utf8');
  let state;
  try {
    state = JSON.parse(raw);
  } catch (error) {
    throw new Error(`state file corrupt: ${error.message}`);
  }
  const errors = validateState(state);
  if (errors.length) throw new Error(`state file invalid: ${formatErrors(errors)}`);
  return state;
}

function writeState(statePath, state) {
  const errors = validateState(state);
  if (errors.length) throw new Error(`refusing to write invalid state: ${formatErrors(errors)}`);
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2) + '\n');
}

function formatErrors(errors) {
  let output = '';
  for (const error of errors) {
    if (output) output += '; ';
    output += error;
  }
  return output;
}

module.exports = {
  CURRENT_SCHEMA_VERSION,
  readState,
  validateState,
  writeState,
};
