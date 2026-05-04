#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CMD_DIR = path.resolve(__dirname, '..', 'oto', 'commands', 'oto');
const OUT = path.resolve(__dirname, '..', 'oto', 'commands', 'INDEX.md');

function parseFrontmatter(body) {
  const match = body.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;

  const frontmatter = {};
  for (const line of match[1].split('\n')) {
    const pair = line.match(/^(\w[\w-]*):\s*(.*)$/);
    if (!pair) continue;
    frontmatter[pair[1]] = pair[2].replace(/^["']|["']$/g, '');
  }
  return frontmatter;
}

function escapeTableCell(value) {
  return String(value).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

function scanCommands() {
  return fs.readdirSync(CMD_DIR)
    .filter((file) => file.endsWith('.md'))
    .map((file) => {
      const body = fs.readFileSync(path.join(CMD_DIR, file), 'utf8');
      const frontmatter = parseFrontmatter(body);
      return {
        name: frontmatter?.name || `oto:${file.replace(/\.md$/, '')}`,
        description: frontmatter?.description || '',
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

function renderIndex(entries) {
  return [
    '# /oto-* Command Index',
    '',
    '_Auto-generated from `oto/commands/oto/*.md` frontmatter. Re-run `node scripts/gen-commands-index.cjs` after adding or renaming commands._',
    '',
    '| Command | Description |',
    '|---------|-------------|',
    ...entries.map((entry) => `| \`/${entry.name.replace(':', '-')}\` | ${escapeTableCell(entry.description)} |`),
    '',
  ].join('\n');
}

function main() {
  const entries = scanCommands();
  const markdown = renderIndex(entries);
  const checkMode = process.argv.includes('--check');

  if (checkMode) {
    const existing = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
    if (existing === markdown) return;
    console.error('drift: oto/commands/INDEX.md out of sync. Run `node scripts/gen-commands-index.cjs` and commit.');
    process.exit(1);
  }

  fs.writeFileSync(OUT, markdown);
  console.log(`wrote ${entries.length} commands -> ${path.relative(process.cwd(), OUT)}`);
}

main();
