'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { parseArgs } = require('node:util');
const frontmatterLib = require('./frontmatter.cjs');
const core = require('./core.cjs');

installFrontmatterCompat(frontmatterLib);

const { extractFrontmatter, spliceFrontmatter, reconstructFrontmatter } = frontmatterLib;
const {
  atomicWriteFileSync,
  normalizeMd,
  planningDir,
  findProjectRoot,
  generateSlugInternal,
} = core;

const STOP_WORDS = new Set([
  'a',
  'an',
  'the',
  'of',
  'to',
  'in',
  'for',
  'on',
  'at',
  'by',
  'with',
  'from',
  'and',
  'or',
  'but',
  'is',
  'was',
  'are',
  'were',
  'i',
  'we',
  'my',
  'our',
]);
const SUBCOMMANDS = new Set(['start', 'end', 'list', 'show', 'promote']);
const ARTICLE_WORDS = new Set(['a', 'an', 'the']);
const DIFF_CAP = 8192;
const COLLISION_LIMIT = 99;
const HINT_EMPTY_TITLE = '/oto-log requires a title. Try: /oto-log "what you did"\n';
const USAGE_TEXT = [
  'Usage: /oto-log <title>',
  '       /oto-log start <title>',
  '       /oto-log end [notes]',
  '       /oto-log list',
  '       /oto-log show <slug>',
  '       /oto-log promote <slug> --to quick|todo',
  '',
  'Flags: --body <markdown> --phase <phase> --since <ref>',
  '',
].join('\n');

void reconstructFrontmatter;

function installFrontmatterCompat(lib) {
  if (lib.__otoLogCompatInstalled) return;
  const originalExtract = lib.extractFrontmatter;

  lib.extractFrontmatter = function extractFrontmatterCompat(content) {
    const raw = originalExtract(content);
    const frontmatter = coerceFrontmatterValues(raw);
    const result = { ...frontmatter };
    Object.defineProperty(result, 'frontmatter', {
      value: frontmatter,
      enumerable: false,
    });
    Object.defineProperty(result, 'body', {
      value: stripFrontmatterBlock(content),
      enumerable: false,
    });
    return result;
  };

  Object.defineProperty(lib, '__otoLogCompatInstalled', {
    value: true,
    enumerable: false,
  });
}

function coerceFrontmatterValues(value) {
  if (Array.isArray(value)) return value.map((item) => coerceFrontmatterValues(item));
  if (value && typeof value === 'object') {
    const result = {};
    for (const [key, child] of Object.entries(value)) {
      result[key] = coerceFrontmatterValues(child);
    }
    return result;
  }
  if (value === 'null') return null;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
}

function stripFrontmatterBlock(content) {
  if (typeof content !== 'string') return '';
  const match = content.match(/^---\r?\n[\s\S]+?\r?\n---\r?\n?/);
  if (!match) return content;
  return content.slice(match[0].length).replace(/^\r?\n/, '');
}

function resolveCwd(cwd) {
  return path.resolve(findProjectRoot(cwd || process.cwd()));
}

function serializedFrontmatter(frontmatter) {
  const serialized = {};
  for (const [key, value] of Object.entries(frontmatter)) {
    if (value === null) {
      serialized[key] = 'null';
    } else if (['phase', 'diff_from', 'diff_to'].includes(key) && typeof value === 'string') {
      serialized[key] = `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
    } else {
      serialized[key] = value;
    }
  }
  return serialized;
}

function deriveLogSlug(title, { collisionSuffix } = {}) {
  const original = title == null ? '' : String(title);
  const words = original
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  while (words.length && STOP_WORDS.has(words[0])) words.shift();

  const slugWords = words.length > 4
    ? words.filter((word) => !ARTICLE_WORDS.has(word))
    : words;
  const meaningful = slugWords
    .slice(0, 4)
    .join('-');
  const fallback = generateSlugInternal(original) || 'untitled';
  const slug = meaningful || fallback;
  if (collisionSuffix > 1) return `${slug}-${collisionSuffix}`;
  return slug;
}

function routeSubcommand(args) {
  if (!args || args.length === 0) return { sub: 'help', rest: [] };
  const first = args[0];
  if (first === '--help' || first === '-h') return { sub: 'help', rest: args.slice(1) };
  if (SUBCOMMANDS.has(first)) return { sub: first, rest: args.slice(1) };
  return { sub: 'oneshot', rest: args };
}

function git(gitArgs, cwd) {
  const res = spawnSync('git', gitArgs, { cwd, encoding: 'utf8' });
  if (res.status !== 0) {
    const detail = (res.stderr || '').trim();
    const e = new Error(`git ${gitArgs.join(' ')}: ${detail}`);
    e.gitExitCode = res.status;
    throw e;
  }
  return res.stdout;
}

function timestampParts(date) {
  if (typeof date === 'string') {
    const frontmatterDate = date.slice(0, 16).replace('T', ' ');
    const compact = frontmatterDate.replace(/[-: ]/g, '').slice(0, 12);
    return {
      frontmatterDate,
      filenameStamp: `${compact.slice(0, 8)}-${compact.slice(8, 12)}`,
    };
  }

  const value = date instanceof Date ? date : new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const frontmatterDate = [
    value.getUTCFullYear(),
    '-',
    pad(value.getUTCMonth() + 1),
    '-',
    pad(value.getUTCDate()),
    ' ',
    pad(value.getUTCHours()),
    ':',
    pad(value.getUTCMinutes()),
  ].join('');
  const compact = frontmatterDate.replace(/[-: ]/g, '').slice(0, 12);
  return {
    frontmatterDate,
    filenameStamp: `${compact.slice(0, 8)}-${compact.slice(8, 12)}`,
  };
}

function writeWithCollisionSuffix(dir, baseName, ext, content) {
  fs.mkdirSync(dir, { recursive: true });

  for (let attempt = 1; attempt <= COLLISION_LIMIT; attempt += 1) {
    const suffix = attempt === 1 ? '' : `-${attempt}`;
    const filePath = path.join(dir, `${baseName}${suffix}${ext}`);
    let fd;
    try {
      fd = fs.openSync(filePath, 'wx');
      fs.writeSync(fd, content);
      return { path: filePath, suffix: attempt };
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
    } finally {
      if (fd !== undefined) fs.closeSync(fd);
    }
  }

  throw new Error(`Too many collisions for ${baseName}`);
}

function escapeDataMarkers(text) {
  return String(text || '')
    .replace(/<DATA_START>/g, '&lt;DATA_START&gt;')
    .replace(/<DATA_END>/g, '&lt;DATA_END&gt;');
}

function wrapData(text) {
  return `<DATA_START>\n${escapeDataMarkers(text)}\n<DATA_END>`;
}

function capDiff(text) {
  if (!text || text.length <= DIFF_CAP) return text || '';
  return `${text.slice(0, DIFF_CAP)}\n... <truncated>`;
}

function normalizeQuestion(question) {
  return String(question || '')
    .replace(/^\s*-\s*/, '')
    .trim();
}

function meaningfulQuestions(questions) {
  return (questions || [])
    .map(normalizeQuestion)
    .filter(Boolean)
    .filter((question) => !/^(none\.?|n\/a|no open questions\.?)$/i.test(question));
}

async function captureEvidence({ since, mode, cwd } = {}) {
  const projectDir = resolveCwd(cwd);
  const warnings = [];
  let head = null;

  try {
    head = git(['rev-parse', 'HEAD'], projectDir).trim();
  } catch {
    warnings.push('git unavailable');
  }

  if (!head) {
    return {
      diff_from: null,
      diff_to: 'HEAD',
      diff_text: '',
      files_touched: [],
      status_text: '',
      recent_commits: '',
      warnings,
    };
  }

  const resolvedSince = since || head;
  let rawDiff = '';
  let filesTouched = [];
  let statusText = '';
  let recentCommits = '';

  try {
    rawDiff = git(['diff', resolvedSince], projectDir);
  } catch {
    warnings.push('diff failed');
  }

  try {
    filesTouched = git(['diff', '--name-only', resolvedSince], projectDir)
      .split(/\r?\n/)
      .map((file) => file.trim())
      .filter(Boolean);
  } catch {
    filesTouched = [];
  }

  try {
    statusText = git(['status', '--porcelain'], projectDir);
  } catch {
    statusText = '';
  }

  try {
    recentCommits = git(['log', '--oneline', `${resolvedSince}..HEAD`], projectDir);
  } catch {
    recentCommits = '';
  }

  return {
    diff_from: resolvedSince,
    diff_to: 'HEAD',
    diff_text: wrapData(capDiff(rawDiff)),
    files_touched: filesTouched,
    status_text: statusText,
    recent_commits: recentCommits ? wrapData(recentCommits) : '',
    warnings,
    mode: mode || 'oneshot',
  };
}

async function writeLogEntry({
  title,
  body,
  mode = 'oneshot',
  phase = null,
  diff_from = null,
  diff_to = 'HEAD',
  files_touched = [],
  open_questions = [],
  cwd,
  date,
} = {}) {
  const normalizedTitle = title == null ? '' : String(title).trim();
  if (!normalizedTitle) throw new Error('title required');

  const projectDir = resolveCwd(cwd);
  const { frontmatterDate, filenameStamp } = timestampParts(date || new Date());
  const slug = deriveLogSlug(normalizedTitle);
  const logsDir = path.join(planningDir(projectDir), 'logs');
  const frontmatter = {
    date: frontmatterDate,
    title: normalizedTitle,
    slug,
    mode,
    phase: phase || null,
    diff_from: diff_from || null,
    diff_to: diff_to || 'HEAD',
    files_touched: files_touched || [],
    open_questions: open_questions || [],
    promoted: false,
  };
  const content = normalizeMd(spliceFrontmatter(body || '', serializedFrontmatter(frontmatter)));
  const result = writeWithCollisionSuffix(logsDir, `${filenameStamp}-${slug}`, '.md', content);
  if (result.suffix > 1) {
    frontmatter.slug = deriveLogSlug(normalizedTitle, { collisionSuffix: result.suffix });
    atomicWriteFileSync(result.path, normalizeMd(spliceFrontmatter(body || '', serializedFrontmatter(frontmatter))));
  }

  return {
    path: result.path,
    slug: frontmatter.slug,
    suffix: result.suffix,
    frontmatter,
  };
}

async function startSession({ title, cwd, date } = {}) {
  const normalizedTitle = title == null ? '' : String(title).trim();
  if (!normalizedTitle) throw new Error('title required');

  const projectDir = resolveCwd(cwd);
  const sessionPath = path.join(planningDir(projectDir), 'logs', '.active-session.json');
  const warnings = [];
  const resolvedDate = date || new Date();

  if (fs.existsSync(sessionPath)) {
    const priorSession = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
    await endSession({
      cwd: projectDir,
      date: resolvedDate,
      autoEnded: true,
      priorSession,
      body: '',
    });
    warnings.push(`auto-ended prior session: ${priorSession.title}`);
  }

  let startRef = null;
  try {
    startRef = git(['rev-parse', 'HEAD'], projectDir).trim();
  } catch {
    warnings.push('git unavailable; start_ref=null');
  }

  const { frontmatterDate } = timestampParts(resolvedDate);
  const sessionData = {
    start_ref: startRef,
    start_time: frontmatterDate,
    title: normalizedTitle,
  };
  fs.mkdirSync(path.dirname(sessionPath), { recursive: true });
  atomicWriteFileSync(sessionPath, `${JSON.stringify(sessionData, null, 2)}\n`);

  return {
    path: sessionPath,
    frontmatter: sessionData,
    warnings,
  };
}

async function endSession({
  closingNotes = '',
  body,
  cwd,
  date,
  autoEnded = false,
  priorSession = null,
} = {}) {
  const projectDir = resolveCwd(cwd);
  const sessionPath = path.join(planningDir(projectDir), 'logs', '.active-session.json');
  const session = priorSession || JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
  const resolvedDate = date || new Date();
  const evidence = await captureEvidence({
    since: session.start_ref,
    mode: 'session',
    cwd: projectDir,
  });
  const composedBody = body || composeSessionBody(session, evidence, closingNotes, autoEnded);
  const result = await writeLogEntry({
    title: session.title,
    body: composedBody,
    mode: 'session',
    diff_from: session.start_ref,
    diff_to: 'HEAD',
    files_touched: evidence.files_touched,
    open_questions: [],
    cwd: projectDir,
    date: resolvedDate,
  });

  if (fs.existsSync(sessionPath)) fs.unlinkSync(sessionPath);
  return {
    path: result.path,
    logPath: result.path,
    sessionEnded: true,
    autoEnded,
  };
}

async function listLogs({ cwd, limit = 10 } = {}) {
  const projectDir = resolveCwd(cwd);
  const logsDir = path.join(planningDir(projectDir), 'logs');
  if (!fs.existsSync(logsDir)) return [];

  const entries = fs.readdirSync(logsDir)
    .filter((name) => name.endsWith('.md') && !name.startsWith('.'))
    .map((name) => {
      const filePath = path.join(logsDir, name);
      const parsed = extractFrontmatter(fs.readFileSync(filePath, 'utf8'));
      return { path: filePath, frontmatter: parsed.frontmatter };
    });

  entries.sort((a, b) => (b.frontmatter.date || '').localeCompare(a.frontmatter.date || ''));
  return entries.slice(0, limit);
}

async function showLog({ slug, cwd } = {}) {
  if (!slug) throw new Error('show requires a slug');
  const projectDir = resolveCwd(cwd);
  const logsDir = path.join(planningDir(projectDir), 'logs');
  if (!fs.existsSync(logsDir)) throw new Error(`No log found for slug: ${slug}`);

  const candidates = fs.readdirSync(logsDir)
    .filter((name) => name.endsWith(`-${slug}.md`))
    .sort()
    .reverse();
  if (candidates.length === 0) throw new Error(`No log found for slug: ${slug}`);

  const filePath = path.join(logsDir, candidates[0]);
  const content = fs.readFileSync(filePath, 'utf8');
  const parsed = extractFrontmatter(content);
  const sections = parseSections(parsed.body);

  return {
    path: filePath,
    frontmatter: parsed.frontmatter,
    body: parsed.body,
    sections,
  };
}

function parseSections(body) {
  const sections = {};
  const parts = String(body || '').split(/^## (.+)$/m);

  for (let i = 1; i < parts.length; i += 2) {
    const heading = parts[i].trim();
    const content = (parts[i + 1] || '').trim();
    const key = heading.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

    if (key === 'open_questions') {
      sections[key] = meaningfulQuestions(content.split(/^- /m));
    } else if (key === 'files_touched') {
      sections[key] = content
        .split(/^- /m)
        .map((item) => item.trim())
        .filter(Boolean)
        .filter((item) => !/^(none\.?|\(none\))$/i.test(item));
    } else {
      sections[key] = content;
    }
  }

  return sections;
}

async function setLogPromoted(filePath, value) {
  const content = fs.readFileSync(filePath, 'utf8');
  const parsed = extractFrontmatter(content);
  const frontmatter = { ...parsed.frontmatter, promoted: value };
  const newContent = normalizeMd(spliceFrontmatter(parsed.body, serializedFrontmatter(frontmatter)));
  atomicWriteFileSync(filePath, newContent);
}

async function promoteLog({ slug, target, cwd } = {}) {
  if (target === 'plan') {
    throw new Error('promote --to plan is not supported; use --to quick first');
  }

  const projectDir = resolveCwd(cwd);
  const planningRoot = planningDir(projectDir);
  const source = await showLog({ slug, cwd: projectDir });

  if (target === 'quick') {
    const dateCompact = String(source.frontmatter.date || '').slice(0, 10).replace(/-/g, '');
    const quickDir = path.join(planningRoot, 'quick', `${dateCompact}-${source.frontmatter.slug}`);
    const planPath = path.join(quickDir, 'PLAN.md');
    const planFrontmatter = {
      type: 'quick',
      slug: source.frontmatter.slug,
      created: source.frontmatter.date,
      source_log: path.relative(planningRoot, source.path),
    };
    const planBody = [
      '## Goal',
      '',
      source.frontmatter.title,
      '',
      '## Seed (from log)',
      '',
      source.sections.summary || '',
      source.sections.what_changed || '',
      '',
    ].join('\n');
    fs.mkdirSync(quickDir, { recursive: true });
    atomicWriteFileSync(planPath, normalizeMd(spliceFrontmatter(planBody, planFrontmatter)));
    await setLogPromoted(source.path, true);
    return { created: [planPath] };
  }

  if (target === 'todo') {
    const questions = meaningfulQuestions(source.sections.open_questions);
    if (questions.length === 0) return { created: [] };

    const pendingDir = path.join(planningRoot, 'todos', 'pending');
    const completedDir = path.join(planningRoot, 'todos', 'completed');
    fs.mkdirSync(pendingDir, { recursive: true });
    const existingIds = [
      ...readTodoIds(pendingDir),
      ...readTodoIds(completedDir),
    ];
    let nextId = (existingIds.length ? Math.max(...existingIds) : 0) + 1;
    const created = [];

    for (const question of questions) {
      const id = String(nextId).padStart(3, '0');
      const todoSlug = deriveTodoSlug(question);
      const todoPath = path.join(pendingDir, `${id}-${todoSlug}.md`);
      const todoFrontmatter = {
        created: source.frontmatter.date,
        title: question,
        area: 'general',
        files: [],
        source: `promoted from /oto-log show ${source.frontmatter.slug}`,
      };
      const todoBody = `## Problem\n\n${question}\n\n## Solution\n\nTBD\n`;
      atomicWriteFileSync(todoPath, normalizeMd(spliceFrontmatter(todoBody, todoFrontmatter)));
      created.push(todoPath);
      nextId += 1;
    }

    await setLogPromoted(source.path, true);
    return { created };
  }

  throw new Error(`unknown promote target: ${target}`);
}

async function main(args = [], cwd = process.cwd()) {
  try {
    const { sub, rest } = routeSubcommand(args);
    if (sub === 'help') {
      process.stdout.write(USAGE_TEXT);
      return 0;
    }

    const parsed = parseArgs({
      args: rest,
      options: {
        body: { type: 'string' },
        phase: { type: 'string' },
        since: { type: 'string' },
        to: { type: 'string' },
      },
      allowPositionals: true,
      strict: false,
    });
    const { values, positionals } = parsed;

    if (sub === 'oneshot') {
      const title = positionals.join(' ').trim();
      if (!title) {
        process.stderr.write(HINT_EMPTY_TITLE);
        return 2;
      }
      const evidence = values.body ? null : await captureEvidence({ since: values.since, mode: 'oneshot', cwd });
      const body = values.body || composeDefaultBody(evidence);
      const result = await writeLogEntry({
        title,
        body,
        mode: 'oneshot',
        phase: values.phase || null,
        diff_from: evidence ? evidence.diff_from : null,
        diff_to: evidence ? evidence.diff_to : 'HEAD',
        files_touched: evidence ? evidence.files_touched : [],
        cwd,
      });
      process.stdout.write(`Wrote ${result.path}\n`);
      return 0;
    }

    if (sub === 'start') {
      const title = rest.join(' ').trim();
      if (!title) {
        process.stderr.write(HINT_EMPTY_TITLE);
        return 2;
      }
      const result = await startSession({ title, cwd });
      for (const warning of result.warnings || []) process.stderr.write(`warning: ${warning}\n`);
      process.stdout.write(`Session started: ${result.path}\n`);
      return 0;
    }

    if (sub === 'end') {
      const result = await endSession({
        closingNotes: positionals.join(' '),
        body: values.body,
        cwd,
      });
      process.stdout.write(`Wrote ${result.logPath}\n`);
      return 0;
    }

    if (sub === 'list') {
      const entries = await listLogs({ cwd, limit: 10 });
      for (const entry of entries) {
        process.stdout.write(`[${entry.frontmatter.date}] ${entry.frontmatter.title} (${path.basename(entry.path)})\n`);
      }
      return 0;
    }

    if (sub === 'show') {
      const slug = positionals[0];
      if (!slug) {
        process.stderr.write('show requires a slug\n');
        return 2;
      }
      const result = await showLog({ slug, cwd });
      process.stdout.write(fs.readFileSync(result.path, 'utf8'));
      return 0;
    }

    if (sub === 'promote') {
      const slug = positionals[0];
      const to = values.to;
      if (!slug || !to) {
        process.stderr.write('promote requires <slug> --to quick|todo\n');
        return 2;
      }
      const result = await promoteLog({ slug, target: to, cwd });
      for (const filePath of result.created) process.stdout.write(`Created ${filePath}\n`);
      return 0;
    }

    return 1;
  } catch (err) {
    process.stderr.write(`error: ${err.message}\n`);
    return 1;
  }
}

function readTodoIds(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .map((name) => name.match(/^(\d{3})/))
    .filter(Boolean)
    .map((match) => Number.parseInt(match[1], 10));
}

function deriveTodoSlug(title) {
  const words = String(title || '')
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  while (words.length && STOP_WORDS.has(words[0])) words.shift();
  return words.slice(0, 5).join('-') || generateSlugInternal(title) || 'untitled';
}

function composeSessionBody(session, evidence, closingNotes, autoEnded) {
  return [
    '## Summary',
    '',
    `${session.title}${autoEnded ? ' (auto-ended)' : ''}`,
    '',
    '## What changed',
    '',
    evidence.diff_text,
    '',
    '## What was discussed',
    '',
    closingNotes || 'No conversation context captured.',
    '',
    '## Outcome',
    '',
    evidence.status_text || 'No git status available.',
    '',
    '## Files touched',
    '',
    formatBulletList(evidence.files_touched),
    '',
    '## Open questions',
    '',
    closingNotes ? '- See closing notes above' : '(none)',
    '',
  ].join('\n');
}

function composeDefaultBody(evidence) {
  return [
    '## Summary',
    '',
    '(auto-captured)',
    '',
    '## What changed',
    '',
    evidence.diff_text,
    '',
    '## What was discussed',
    '',
    'No conversation context captured (CLI invocation).',
    '',
    '## Outcome',
    '',
    evidence.status_text || '(no git status)',
    '',
    '## Files touched',
    '',
    formatBulletList(evidence.files_touched),
    '',
    '## Open questions',
    '',
    '(none)',
    '',
  ].join('\n');
}

function formatBulletList(items) {
  const normalized = (items || []).filter(Boolean);
  if (normalized.length === 0) return '(none)';
  return normalized.map((item) => `- ${item}`).join('\n');
}

module.exports = {
  deriveLogSlug,
  routeSubcommand,
  captureEvidence,
  writeLogEntry,
  startSession,
  endSession,
  listLogs,
  showLog,
  promoteLog,
  main,
};
