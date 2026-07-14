'use strict';

const path = require('node:path');

const EXA_SERVER_NAME = 'exa';

function buildLauncherPath(configDir) {
  return path.join(configDir, 'hooks', 'oto-exa-mcp.js');
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${stableStringify(value[key])}`
    ).join(',')}}`;
  }
  return JSON.stringify(value);
}

function buildMcpStateRecord({ target, entry }) {
  return {
    [EXA_SERVER_NAME]: {
      target,
      registered_at: new Date().toISOString(),
      entry,
    },
  };
}

module.exports = {
  EXA_SERVER_NAME,
  buildLauncherPath,
  stableStringify,
  buildMcpStateRecord,
};
