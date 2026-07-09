'use strict';

const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const GSD_REF = { name: 'gsd', url: 'https://github.com/gsd-build/get-shit-done', ref: 'v1.38.5' };
const SUPERPOWERS_REF = { name: 'superpowers', url: 'https://github.com/obra/superpowers', ref: 'v5.0.7' };

// NOTE on cross-file dedup (RESEARCH.md Open Question 1): node --test runs each test file in
// its own child process, so an in-memory cache is NEVER shared between the two corpus
// .integration.test.cjs files. Actual clone dedup comes from pullUpstream() itself: both files
// pass the same stable destDir (os.tmpdir()/oto-sync-corpus-<name>), and pullUpstream
// short-circuits (ls-remote probe only, no clone) when destDir/last-synced-commit.json's sha
// already matches the pinned ref. This per-process Map only avoids redundant short-circuit
// round-trips within a single file.
const cloneCache = new Map();

function probeCorpusClone(source = GSD_REF) {
  if (!process.env.OTO_SYNC_CORPUS) return { available: false, reason: 'OTO_SYNC_CORPUS not set' };
  const result = spawnSync('git', ['ls-remote', source.url, source.ref], { encoding: 'utf8', timeout: 10000 });
  if (result.error || result.status !== 0) return { available: false, reason: 'network/git unavailable' };
  return { available: true, reason: null };
}

async function cloneCorpus(source = GSD_REF) {
  if (cloneCache.has(source.name)) return cloneCache.get(source.name);
  const { pullUpstream } = require('../../bin/lib/sync-pull.cjs');
  // Destination MUST NOT contain the substring 'foundation-frameworks' (RESEARCH.md Pitfall 3 —
  // avoids accidentally re-triggering bin/lib/sync-merge.cjs's dead foundation-frameworks/ special case).
  const destDir = path.join(os.tmpdir(), `oto-sync-corpus-${source.name}`);
  await pullUpstream({ name: source.name, url: source.url, ref: source.ref, destDir });
  const currentDir = path.join(destDir, 'current');
  cloneCache.set(source.name, currentDir);
  return currentDir;
}

module.exports = { GSD_REF, SUPERPOWERS_REF, probeCorpusClone, cloneCorpus };
