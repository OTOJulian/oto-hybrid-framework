import { afterEach, describe, expect, it } from 'vitest';
import { cpSync, existsSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { createRegistry, QUERY_MUTATION_COMMANDS } from '../query/index.js';
import { normalizeQueryCommand } from '../query/normalize-query-command.js';
import { resolveQueryArgv } from '../query/registry.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..', '..');
const FIXTURE_SOURCE = resolve(__dirname, 'fixtures', 'oto-project');

type MatchedQuery = {
  raw: string;
  cmd: string;
  args: string[];
};

const REQUIRED_FAMILIES = [
  'config-get',
  'agent-skills',
  'state-snapshot',
  'roadmap.get-phase',
  'phases.list',
  'find-phase',
  'commit',
  'init.execute-phase',
];

const DEFAULT_ARGS: Record<string, string[]> = {
  'agent-skills': ['oto-executor'],
  'check.decision-coverage-plan': ['.oto/phases/01-sample/01-01-PLAN.md'],
  'check.decision-coverage-verify': ['.oto/phases/01-sample/01-01-PLAN.md'],
  'commit': ['test: smoke fixture'],
  'config-get': ['commit_docs'],
  'current-timestamp': ['full'],
  'find-phase': ['1'],
  'frontmatter.get': ['.oto/phases/01-sample/01-01-PLAN.md'],
  'init.execute-phase': ['1'],
  'init.ingest-docs': ['1'],
  'init.map-codebase': ['1'],
  'init.plan-phase': ['1'],
  'init.phase-op': ['1'],
  'init.verify-work': ['1'],
  'phase-plan-index': ['1'],
  'phase.next-decimal': ['999'],
  'resolve-model': ['oto-executor'],
  'roadmap.get-phase': ['1'],
  'state.json': ['1'],
  'state.load': ['1'],
  'verify.codebase-drift': ['1'],
  'verify.schema-drift': ['1'],
};

let tempRoots: string[] = [];

afterEach(() => {
  for (const root of tempRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

function listMarkdownFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listMarkdownFiles(path));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(path);
    }
  }
  return files;
}

function extractWorkflowQueryTokens(): string[] {
  const roots = [join(REPO_ROOT, 'oto', 'workflows'), join(REPO_ROOT, 'oto', 'commands')];
  const found = new Set<string>();
  const pattern = /oto-sdk query\s+([a-zA-Z0-9._-]+)(?:\s+([a-zA-Z0-9._-]+))?/g;

  for (const root of roots) {
    for (const file of listMarkdownFiles(root)) {
      const content = readFileSync(file, 'utf-8');
      for (const match of content.matchAll(pattern)) {
        found.add([match[1], match[2]].filter(Boolean).join(' '));
      }
    }
  }

  return Array.from(found).sort();
}

function matchRegisteredQueries(tokens: string[]): MatchedQuery[] {
  const registry = createRegistry();
  const unique = new Map<string, MatchedQuery>();

  for (const token of tokens) {
    const parts = token.split(/\s+/).filter(Boolean);
    const [normCmd, normArgs] = normalizeQueryCommand(parts[0], parts.slice(1));
    const matched = resolveQueryArgv([normCmd, ...normArgs], registry);
    if (!matched || !registry.has(matched.cmd)) continue;
    const args = sampleArgs(matched.cmd, matched.args);
    unique.set(`${matched.cmd}\0${args.join('\0')}`, { raw: token, cmd: matched.cmd, args });
  }

  return Array.from(unique.values()).sort((a, b) => a.cmd.localeCompare(b.cmd));
}

function sampleArgs(cmd: string, extractedArgs: string[]): string[] {
  const invalid = extractedArgs.some((arg) => arg === 'if' || arg === '...' || arg === '.oto');
  if (extractedArgs.length > 0 && !invalid && !extractedArgs.some((arg) => arg.startsWith('--'))) {
    return extractedArgs;
  }
  return DEFAULT_ARGS[cmd] ?? extractedArgs;
}

function createFixtureProject(): string {
  expect(existsSync(join(FIXTURE_SOURCE, '.oto', 'STATE.md'))).toBe(true);
  expect(existsSync(join(FIXTURE_SOURCE, '.planning'))).toBe(false);

  const tempRoot = mkdtempSync(join(tmpdir(), 'oto-query-smoke-'));
  tempRoots.push(tempRoot);
  cpSync(FIXTURE_SOURCE, tempRoot, { recursive: true });
  execFileSync('git', ['init', '-q'], { cwd: tempRoot });
  return tempRoot;
}

function collectStrings(value: unknown, strings: string[] = []): string[] {
  if (typeof value === 'string') {
    strings.push(value);
  } else if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, strings);
  } else if (value && typeof value === 'object') {
    for (const item of Object.values(value as Record<string, unknown>)) {
      collectStrings(item, strings);
    }
  }
  return strings;
}

function assertNoPlanningAccess(value: unknown, fixtureRoot: string): void {
  const planningPath = `${fixtureRoot}${sep}.planning`;
  const otoPath = `${fixtureRoot}${sep}.oto`;
  for (const text of collectStrings(value)) {
    expect(text.includes(planningPath), text).toBe(false);
    if (text.includes(fixtureRoot)) {
      expect(text.includes(otoPath), text).toBe(true);
    }
  }
}

function isStructural(cmd: string): boolean {
  return QUERY_MUTATION_COMMANDS.has(cmd) || cmd.startsWith('init.');
}

describe('oto workflow query registry smoke', () => {
  it('enumerates workflow query keys and dispatches registered read-only keys against a .oto fixture', async () => {
    const registry = createRegistry();
    const fixtureRoot = createFixtureProject();
    const queries = matchRegisteredQueries(extractWorkflowQueryTokens());

    expect(queries.length).toBeGreaterThan(0);
    for (const family of REQUIRED_FAMILIES) {
      expect(
        queries.some((entry) => entry.cmd === family || entry.cmd.startsWith(`${family}.`)),
        `missing representative query family ${family}`,
      ).toBe(true);
    }

    const structuredReadResults = new Set<string>();
    const resolvedStructural = new Set<string>();

    for (const query of queries) {
      expect(registry.has(query.cmd), query.raw).toBe(true);

      if (isStructural(query.cmd)) {
        resolvedStructural.add(query.cmd);
        expect(query.cmd).not.toContain('.planning');
        continue;
      }

      try {
        const result = await registry.dispatch(query.cmd, query.args, fixtureRoot, undefined);
        expect(result).toHaveProperty('data');
        expect(result.data).not.toHaveProperty('error');
        assertNoPlanningAccess(result.data, fixtureRoot);
        structuredReadResults.add(query.cmd);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        expect(message).not.toContain('Unknown command');
        expect(message).not.toContain('.planning');
      }
    }

    for (const family of ['config-get', 'agent-skills', 'state-snapshot', 'roadmap.get-phase', 'phases.list', 'find-phase']) {
      expect(structuredReadResults.has(family), `expected structured read result for ${family}`).toBe(true);
    }
    expect(resolvedStructural.has('commit')).toBe(true);
    expect(resolvedStructural.has('init.execute-phase')).toBe(true);
  });

  it('keeps the checked-in fixture rooted only at .oto', () => {
    expect(existsSync(join(FIXTURE_SOURCE, '.oto'))).toBe(true);
    expect(existsSync(join(FIXTURE_SOURCE, '.planning'))).toBe(false);
    expect(statSync(join(FIXTURE_SOURCE, '.oto')).isDirectory()).toBe(true);
  });
});
