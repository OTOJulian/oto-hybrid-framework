'use strict';

const fs = require('node:fs');
const path = require('node:path');

const RUNTIME_PROFILE_MAP = {
  codex: {
    opus: { model: 'gpt-5.4', reasoning_effort: 'xhigh' },
    sonnet: { model: 'gpt-5.3-codex', reasoning_effort: 'medium' },
    haiku: { model: 'gpt-5.4-mini', reasoning_effort: 'medium' },
  },
  gemini: {
    opus: { model: 'gemini-3-pro' },
    sonnet: { model: 'gemini-3-flash' },
    haiku: { model: 'gemini-2.5-flash-lite' },
  },
};

const RUNTIMES_WITH_REASONING_EFFORT = new Set(['codex']);
const KNOWN_RUNTIMES = new Set(['codex', 'gemini', 'claude']);

function assertPlainObject(value, label) {
  if (value === null || Array.isArray(value) || typeof value !== 'object') {
    throw new Error(`${label} must be an object`);
  }
}

function loadDefaults(homeDir = require('node:os').homedir()) {
  const defaultsPath = path.join(homeDir, '.oto', 'defaults.json');
  if (!fs.existsSync(defaultsPath)) return null;
  const parsed = JSON.parse(fs.readFileSync(defaultsPath, 'utf8'));
  assertPlainObject(parsed, '~/.oto/defaults.json');

  if (parsed.runtime !== undefined && (!KNOWN_RUNTIMES.has(parsed.runtime))) {
    throw new Error(`runtime must be one of: ${[...KNOWN_RUNTIMES].join(', ')}`);
  }
  if (parsed.model_profile !== undefined && !['opus', 'sonnet', 'haiku', 'inherit', 'balanced'].includes(parsed.model_profile)) {
    throw new Error('model_profile must be opus, sonnet, haiku, balanced, or inherit');
  }
  if (parsed.model_overrides !== undefined) {
    assertPlainObject(parsed.model_overrides, 'model_overrides');
    for (const [agentName, model] of Object.entries(parsed.model_overrides)) {
      if (typeof agentName !== 'string' || typeof model !== 'string') {
        throw new Error('model_overrides values must be strings');
      }
    }
  }

  return parsed;
}

function resolveAgentModel(agentName, projectConfig = {}, globalDefaults = null, runtimeName = 'codex') {
  const projectOverride = projectConfig?.model_overrides?.[agentName];
  if (projectOverride) return { model: projectOverride };

  const globalOverride = globalDefaults?.model_overrides?.[agentName];
  if (globalOverride) return { model: globalOverride };

  const profile = projectConfig?.model_profile || globalDefaults?.model_profile || 'sonnet';
  if (profile === 'inherit') return null;
  const normalized = profile === 'balanced' ? 'sonnet' : profile;
  const entry = RUNTIME_PROFILE_MAP[runtimeName]?.[normalized] || RUNTIME_PROFILE_MAP.codex[normalized] || null;
  if (!entry) return null;

  const out = { model: entry.model };
  if (RUNTIMES_WITH_REASONING_EFFORT.has(runtimeName) && entry.reasoning_effort) {
    out.reasoning_effort = entry.reasoning_effort;
  }
  return out;
}

module.exports = { resolveAgentModel, loadDefaults, RUNTIME_PROFILE_MAP };
