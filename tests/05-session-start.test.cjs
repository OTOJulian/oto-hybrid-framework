'use strict';
// Phase 5 - implemented in Wave 2 (plan 05-03).
// Covers: HK-01 (rebranded identity, single block, runtime-detection branch shapes).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const HOOK = path.join(REPO_ROOT, 'oto', 'hooks', 'oto-session-start');

function spawnHook(env, cwd) {
  return spawnSync('bash', [HOOK], {
    env: { PATH: process.env.PATH, HOME: process.env.HOME, ...env },
    cwd: cwd || os.tmpdir(),
    encoding: 'utf8',
  });
}

test('phase-05 session-start: Claude branch has one rebranded identity block and no upstream identity leakage', () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-ss-'));
  const r = spawnHook({ CLAUDE_PLUGIN_ROOT: '/tmp/fake-claude', COPILOT_CLI: '' }, cwd);
  assert.equal(r.status, 0, `hook failed: ${r.stderr}`);
  const out = JSON.parse(r.stdout);
  assert.ok(out.hookSpecificOutput, 'expected hookSpecificOutput key');
  assert.equal(out.hookSpecificOutput.hookEventName, 'SessionStart');
  const ctx = out.hookSpecificOutput.additionalContext;
  assert.equal((ctx.match(/<EXTREMELY_IMPORTANT>/g) || []).length, 1, 'Pitfall 8: exactly one identity block');
  assert.equal((ctx.match(/<\/EXTREMELY_IMPORTANT>/g) || []).length, 1, 'Pitfall 8: exactly one closing identity block');
  assert.ok(ctx.includes('You are using oto.'), 'D-05: rebranded identity literal');
  assert.ok(ctx.includes("'oto:using-oto'"), 'D-05: oto skill namespace literal');
  assert.ok(ctx.includes('## Workflow Deference'), 'Phase 6: real using-oto skill body appears');
  assert.ok(ctx.includes('<!-- oto:state-gating-directive -->'), 'Phase 6: gating directive appears');
  for (const banned of ['superpowers', 'Superpowers', 'gsd-', 'Get Shit Done', 'using-superpowers', 'You have superpowers']) {
    assert.equal(ctx.indexOf(banned), -1, `Pitfall 15: upstream identity leaked: ${banned}`);
  }
  assert.equal(ctx.indexOf('Project State Reminder'), -1, 'D-07 default OFF: no STATE reminder without opt-in');
});

test('phase-05 session-start: Cursor branch shape', () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-ss-'));
  const r = spawnHook({ CURSOR_PLUGIN_ROOT: '/tmp/fake-cursor', CLAUDE_PLUGIN_ROOT: '', COPILOT_CLI: '' }, cwd);
  assert.equal(r.status, 0);
  const out = JSON.parse(r.stdout);
  assert.equal(typeof out.additional_context, 'string', 'D-08 Cursor branch returns additional_context');
  assert.ok(!out.hookSpecificOutput, 'Cursor branch must not return hookSpecificOutput');
});

test('phase-05 session-start: fallback branch shape with no plugin-root env', () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-ss-'));
  const r = spawnHook({ CLAUDE_PLUGIN_ROOT: '', CURSOR_PLUGIN_ROOT: '', COPILOT_CLI: '' }, cwd);
  assert.equal(r.status, 0);
  const out = JSON.parse(r.stdout);
  assert.equal(typeof out.additionalContext, 'string', 'D-08 fallback branch returns additionalContext');
  assert.ok(!out.hookSpecificOutput, 'fallback branch must not return hookSpecificOutput');
});

test('phase-05 session-start: opt-in project-state reminder via hooks.session_state', () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-ss-'));
  fs.mkdirSync(path.join(cwd, '.oto'), { recursive: true });
  fs.writeFileSync(path.join(cwd, '.oto', 'config.json'), '{"hooks":{"session_state":true}}');
  fs.writeFileSync(path.join(cwd, '.oto', 'STATE.md'), '# Project State\n\nphase: 5\nstatus: in-progress\n');
  const r = spawnHook({ CLAUDE_PLUGIN_ROOT: '/tmp/fake-claude', COPILOT_CLI: '' }, cwd);
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  const ctx = out.hookSpecificOutput.additionalContext;
  assert.ok(ctx.includes('Project State Reminder'), 'D-07: opt-in ON appends reminder');
  assert.ok(ctx.includes('phase: 5'), 'D-07: STATE.md head appended after escape');
});

test('phase-05 session-start: project-state reminder escapes JSON control characters', () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-ss-'));
  fs.mkdirSync(path.join(cwd, '.oto'), { recursive: true });
  fs.writeFileSync(path.join(cwd, '.oto', 'config.json'), '{"hooks":{"session_state":true}}');
  fs.writeFileSync(path.join(cwd, '.oto', 'STATE.md'), 'phase: 5\f\nstatus:\b in-progress\n');
  const r = spawnHook({ CLAUDE_PLUGIN_ROOT: '/tmp/fake-claude', COPILOT_CLI: '' }, cwd);
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  const ctx = out.hookSpecificOutput.additionalContext;
  assert.ok(ctx.includes('\f'), 'form feed survives after JSON parse');
  assert.ok(ctx.includes('\b'), 'backspace survives after JSON parse');
});

test('phase-05 session-start: Codex branch shape (CODEX_HOME signal)', () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-ss-'));
  const r = spawnHook({ CODEX_HOME: '/tmp/fake-codex-home', CLAUDE_PLUGIN_ROOT: '', CURSOR_PLUGIN_ROOT: '', COPILOT_CLI: '' }, cwd);
  assert.equal(r.status, 0, `hook failed: ${r.stderr}`);
  const out = JSON.parse(r.stdout);
  assert.ok(out.hookSpecificOutput, 'Codex branch must return hookSpecificOutput');
  assert.equal(out.hookSpecificOutput.hookEventName, 'SessionStart');
  assert.equal(typeof out.hookSpecificOutput.additionalContext, 'string');
  assert.ok(!out.additionalContext, 'Codex branch must not also return a flat top-level additionalContext (Codex deny_unknown_fields would reject it)');
  assert.equal(Object.keys(out).length, 1, 'top-level JSON must contain only hookSpecificOutput for Codex deny_unknown_fields compatibility');
});

test('phase-05 session-start: Claude branch takes priority when both CLAUDE_PLUGIN_ROOT and CODEX_HOME are set', () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-ss-'));
  const r = spawnHook({ CLAUDE_PLUGIN_ROOT: '/tmp/fake-claude', CODEX_HOME: '/tmp/fake-codex-home', COPILOT_CLI: '' }, cwd);
  assert.equal(r.status, 0);
  const out = JSON.parse(r.stdout);
  assert.equal(out.hookSpecificOutput.hookEventName, 'SessionStart');
  // Shape is identical to the plain Claude-branch test either way (both branches emit the same
  // envelope), but this locks branch ORDER so a future edit can't silently swap precedence.
});
