'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fsp = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { writeReport, appendBreakingChanges } = require('../bin/lib/sync-merge.cjs');

async function makeTempRoot(t) {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), 'oto-sync-report-test-'));
  t.after(() => fsp.rm(root, { recursive: true, force: true }));
  return root;
}

function summary({ timestamp, clean, conflict, added, deleted, unclassifiedAdds = 0 }) {
  return {
    upstream: 'gsd',
    priorTag: 'v1.0.0',
    currentTag: timestamp.endsWith('02Z') ? 'v1.2.0' : 'v1.1.0',
    timestamp,
    counts: { clean, conflict, added, deleted, binary: 0, unclassifiedAdds },
    lists: {
      clean: [`clean-${clean}.md`],
      conflict: conflict > 0 ? [`conflict-${conflict}.md`] : ['None'],
      added: added > 0 ? [`added-${added}.md`] : ['None'],
      deleted: deleted > 0 ? [`deleted-${deleted}.md`] : ['None'],
      unclassifiedAdds: unclassifiedAdds > 0 ? [`unknown-${unclassifiedAdds}.md`] : ['None'],
    },
  };
}

test('SYN-06 / D-14: REPORT.md regenerated each sync with auto-merged + conflict + added + deleted counts', async (t) => {
  const root = await makeTempRoot(t);
  const conflictsDir = path.join(root, 'conflicts');
  const first = summary({ timestamp: '2026-05-04T10:00:01Z', clean: 1, conflict: 2, added: 3, deleted: 4 });
  const second = summary({ timestamp: '2026-05-04T10:00:02Z', clean: 9, conflict: 8, added: 7, deleted: 6 });

  await writeReport(conflictsDir, first);
  const firstReport = await fsp.readFile(path.join(conflictsDir, 'REPORT.md'), 'utf8');
  assert.match(firstReport, /Auto-merged \(no conflict\): 1 files/);
  assert.match(firstReport, /Same-line conflicts: 2 files/);

  await writeReport(conflictsDir, second);
  const secondReport = await fsp.readFile(path.join(conflictsDir, 'REPORT.md'), 'utf8');
  assert.match(secondReport, /Auto-merged \(no conflict\): 9 files/);
  assert.match(secondReport, /Same-line conflicts: 8 files/);
  assert.match(secondReport, /Added \(need classification\): 7 files/);
  assert.match(secondReport, /Deleted upstream: 6 files/);
  assert.doesNotMatch(secondReport, /clean-1\.md/);
});

test('SYN-06: BREAKING-CHANGES-{gsd,superpowers}.md appended (not overwritten) on each sync run', async (t) => {
  const root = await makeTempRoot(t);
  const syncMetaDir = path.join(root, 'sync');
  const logPath = path.join(syncMetaDir, 'BREAKING-CHANGES-gsd.md');
  await fsp.mkdir(syncMetaDir, { recursive: true });
  await fsp.writeFile(logPath, '# Existing Header\n');

  const first = summary({ timestamp: '2026-05-04T10:00:01Z', clean: 1, conflict: 0, added: 0, deleted: 0 });
  const second = summary({ timestamp: '2026-05-04T10:00:02Z', clean: 2, conflict: 1, added: 1, deleted: 1 });
  await appendBreakingChanges(syncMetaDir, 'gsd', first);
  await appendBreakingChanges(syncMetaDir, 'gsd', second);

  const log = await fsp.readFile(logPath, 'utf8');
  assert.match(log, /# Existing Header/);
  assert.match(log, /2026-05-04T10:00:01Z/);
  assert.match(log, /2026-05-04T10:00:02Z/);
  assert.match(log, /Auto-merged \(no conflict\): 1 files/);
  assert.match(log, /Auto-merged \(no conflict\): 2 files/);
  assert.match(log, /conflict-1\.md/);
  assert.match(log, /added-1\.md/);
});

test('D-14: REPORT.md and BREAKING-CHANGES section share identical content for that sync event', async (t) => {
  const root = await makeTempRoot(t);
  const conflictsDir = path.join(root, 'conflicts');
  const syncMetaDir = path.join(root, 'sync');
  const event = summary({ timestamp: '2026-05-04T10:00:01Z', clean: 3, conflict: 2, added: 1, deleted: 4, unclassifiedAdds: 1 });

  await writeReport(conflictsDir, event);
  await appendBreakingChanges(syncMetaDir, 'gsd', event);

  const report = await fsp.readFile(path.join(conflictsDir, 'REPORT.md'), 'utf8');
  const breaking = await fsp.readFile(path.join(syncMetaDir, 'BREAKING-CHANGES-gsd.md'), 'utf8');
  const reportBody = report.split('\n').slice(1).join('\n').trim();
  const sectionBody = breaking.slice(breaking.indexOf('\n\nPulled:')).trim();
  assert.equal(sectionBody, reportBody);
});
