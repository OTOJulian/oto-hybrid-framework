'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const OTO_TOOLS = path.join(REPO_ROOT, 'oto/bin/lib/oto-tools.cjs');
const WORKFLOW = path.join(REPO_ROOT, 'oto/workflows/settings-integrations.md');

function seedFixture(t, configuredSkills) {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-agent-skills-project-'));
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-agent-skills-home-'));
  t.after(() => fs.rmSync(project, { recursive: true, force: true }));
  t.after(() => fs.rmSync(home, { recursive: true, force: true }));

  fs.mkdirSync(path.join(project, '.oto'), { recursive: true });
  fs.writeFileSync(
    path.join(project, '.oto/config.json'),
    JSON.stringify({ agent_skills: { 'oto-executor': configuredSkills } }, null, 2) + '\n',
  );
  for (const skill of ['skill-a', 'skill-b']) {
    fs.mkdirSync(path.join(project, skill), { recursive: true });
    fs.writeFileSync(path.join(project, skill, 'SKILL.md'), `# ${skill}\n`);
  }
  return { project, home };
}

function runAgentSkills(fixture) {
  const result = spawnSync(process.execPath, [OTO_TOOLS, 'agent-skills', 'oto-executor'], {
    cwd: fixture.project,
    env: { ...process.env, HOME: fixture.home },
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
}

function assertTwoSkills(output) {
  assert.match(output, /- @skill-a\/SKILL\.md/);
  assert.match(output, /- @skill-b\/SKILL\.md/);
}

test('injects two SKILL.md references from a two-element config array', (t) => {
  assertTwoSkills(runAgentSkills(seedFixture(t, ['skill-a', 'skill-b'])));
});

test('self-heals a legacy comma-joined agent_skills string at read time', (t) => {
  assertTwoSkills(runAgentSkills(seedFixture(t, 'skill-a,skill-b')));
});

test('trims whitespace around legacy comma-joined skill names', (t) => {
  const output = runAgentSkills(seedFixture(t, 'skill-a, skill-b '));
  assertTwoSkills(output);
  assert.doesNotMatch(output, /@\s|\s\/SKILL\.md/);
});

test('settings workflow persists validated agent skills as a JSON array', () => {
  const content = fs.readFileSync(WORKFLOW, 'utf8');
  assert.doesNotMatch(content, /"<skill-a,skill-b,skill-c>"/);
  assert.match(content, /agent_skills\.<slug> '\["skill-a","skill-b"\]'/);
});
