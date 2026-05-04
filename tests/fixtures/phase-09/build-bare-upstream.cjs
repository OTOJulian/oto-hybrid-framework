'use strict';

const path = require('node:path');
const fsp = require('node:fs/promises');
const { spawnSync } = require('node:child_process');

const GIT_ENV = {
  ...process.env,
  GIT_AUTHOR_NAME: 't',
  GIT_AUTHOR_EMAIL: 't@t.test',
  GIT_COMMITTER_NAME: 't',
  GIT_COMMITTER_EMAIL: 't@t.test',
};

function runGit(args, { cwd } = {}) {
  const result = spawnSync('git', args, {
    cwd,
    env: GIT_ENV,
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(' ')} failed: ${result.stderr || result.stdout}`);
  }
  return result.stdout;
}

async function writeFile(filePath, content) {
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  await fsp.writeFile(filePath, content);
}

async function buildBareUpstream({ rootDir }) {
  if (!rootDir) throw new Error('buildBareUpstream requires rootDir');

  const bareDir = path.join(rootDir, 'upstream.git');
  const workDir = path.join(rootDir, 'work');
  await fsp.mkdir(rootDir, { recursive: true });

  runGit(['init', '--bare', 'upstream.git'], { cwd: rootDir });
  runGit(['clone', `file://${bareDir}`, 'work'], { cwd: rootDir });
  runGit(['checkout', '-b', 'main'], { cwd: workDir });

  await writeFile(path.join(workDir, 'README.md'), 'line1\nline2\nline3\n');
  await writeFile(path.join(workDir, 'oto/workflows/sample.md'), '# sample\n\nbody\n');
  runGit(['add', '.'], { cwd: workDir });
  runGit(['commit', '-m', 'fixture: v1.0.0'], { cwd: workDir });
  runGit(['tag', 'v1.0.0'], { cwd: workDir });

  await writeFile(path.join(workDir, 'README.md'), 'line1\nline2 EDIT\nline3\n');
  await writeFile(path.join(workDir, 'oto/workflows/added.md'), '# added\n');
  runGit(['add', '.'], { cwd: workDir });
  runGit(['commit', '-m', 'fixture: v1.1.0'], { cwd: workDir });
  runGit(['tag', 'v1.1.0'], { cwd: workDir });

  await writeFile(path.join(workDir, 'README.md'), 'line1\nline2 EDIT\nline3 EDIT\n');
  await fsp.rm(path.join(workDir, 'oto/workflows/sample.md'), { force: true });
  await writeFile(path.join(workDir, 'oto/workflows/added.md'), '# added EDIT\n');
  runGit(['add', '.'], { cwd: workDir });
  runGit(['commit', '-m', 'fixture: v1.2.0'], { cwd: workDir });
  runGit(['tag', 'v1.2.0'], { cwd: workDir });

  runGit(['push', 'origin', 'main'], { cwd: workDir });
  runGit(['push', 'origin', '--tags'], { cwd: workDir });

  return {
    bareUrl: `file://${bareDir}`,
    workDir,
    tags: ['v1.0.0', 'v1.1.0', 'v1.2.0'],
  };
}

module.exports = { buildBareUpstream };
