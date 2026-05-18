// tests/workflow-ingest-docs-fixture.test.cjs
// Asserts fixture-tree well-formedness for the three committed fixtures and
// generates an over-cap fixture (51 docs) in os.tmpdir() to verify the cap
// assertion can be made. Workflows themselves run inside an LLM runtime;
// these tests verify only that the fixtures the workflow would consume are
// shaped correctly.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const ROOT = path.resolve(__dirname, '..');
const FIXTURES = path.join(ROOT, 'tests/fixtures/ingest-docs');

function listMd(dir) {
  const out = [];
  function walk(d) {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && entry.name.endsWith('.md')) out.push(full);
    }
  }
  walk(dir);
  return out;
}

test('fixture new-mode-mixed: 10 docs distributed 3 ADR + 3 PRD + 2 SPEC + 2 RFC', () => {
  const base = path.join(FIXTURES, 'new-mode-mixed/docs');
  assert.equal(listMd(path.join(base, 'adr')).length, 3, 'expected 3 ADRs');
  assert.equal(listMd(path.join(base, 'prd')).length, 3, 'expected 3 PRDs');
  assert.equal(listMd(path.join(base, 'specs')).length, 2, 'expected 2 SPECs');
  assert.equal(listMd(path.join(base, 'rfc')).length, 2, 'expected 2 RFCs');
  assert.equal(listMd(base).length, 10, 'total 10 docs');
  for (const f of listMd(base)) {
    const head = fs.readFileSync(f, 'utf8').slice(0, 4);
    assert.equal(head, '---\n', `missing frontmatter: ${path.relative(ROOT, f)}`);
  }
  assert.ok(listMd(base).length <= 50, 'must be under 50-doc cap');
});

test('fixture merge-mode-existing: pre-existing .oto/ skeleton (4 files) + 3 new docs', () => {
  const base = path.join(FIXTURES, 'merge-mode-existing');
  assert.ok(fs.existsSync(path.join(base, '.oto/PROJECT.md')), 'PROJECT.md exists');
  assert.ok(fs.existsSync(path.join(base, '.oto/REQUIREMENTS.md')), 'REQUIREMENTS.md exists');
  assert.ok(fs.existsSync(path.join(base, '.oto/ROADMAP.md')), 'ROADMAP.md exists');
  assert.ok(fs.existsSync(path.join(base, '.oto/STATE.md')), 'STATE.md exists');
  const newDocs = listMd(path.join(base, 'docs'));
  assert.equal(newDocs.length, 3, 'expected 3 new docs to merge');
});

test('fixture conflict-block: 2 contradictory ADRs + 1 PRD', () => {
  const base = path.join(FIXTURES, 'conflict-block/docs');
  const adrs = listMd(path.join(base, 'adr'));
  assert.equal(adrs.length, 2, 'expected 2 ADRs');
  const prds = listMd(path.join(base, 'prd'));
  assert.equal(prds.length, 1, 'expected 1 PRD');
  const adrTexts = adrs.map((f) => fs.readFileSync(f, 'utf8'));
  const hasPostgres = adrTexts.some((t) => /PostgreSQL/i.test(t));
  const hasMongo = adrTexts.some((t) => /MongoDB/i.test(t));
  assert.ok(hasPostgres, 'one ADR must lock PostgreSQL');
  assert.ok(hasMongo, 'one ADR must lock MongoDB');
  const hasLocked = adrTexts.every((t) => /LOCKED/i.test(t));
  assert.ok(hasLocked, 'both ADRs must declare LOCKED status (BLOCKER trigger)');
});

test('over-cap fixture (tmpdir-generated): 51 minimal docs triggers cap enforcement', async (t) => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-over-cap-'));
  t.after(() => fs.rmSync(tmp, { recursive: true, force: true }));

  const adrDir = path.join(tmp, 'docs/adr');
  fs.mkdirSync(adrDir, { recursive: true });
  for (let i = 1; i <= 51; i += 1) {
    const id = String(i).padStart(3, '0');
    const body = `---\nid: ADR-${id}\ntitle: Decision ${id}\nstatus: accepted\n---\n\n# ADR-${id}\n\nMinimal fixture doc for over-cap test.\n`;
    fs.writeFileSync(path.join(adrDir, `ADR-${id}-minimal.md`), body);
  }

  const docs = listMd(path.join(tmp, 'docs'));
  assert.equal(docs.length, 51, `expected 51 docs in tmpdir, got ${docs.length}`);
  assert.ok(docs.length > 50, 'over-cap fixture must exceed the 50-doc cap');
});
