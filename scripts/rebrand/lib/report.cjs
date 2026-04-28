'use strict';

function renderDryrunMarkdown(dryrunJson) {
  const lines = [
    '# Rebrand Dry Run',
    '',
    `Files: ${dryrunJson.files.length}`,
    `Matches: ${dryrunJson.match_total}`,
    `Unclassified: ${dryrunJson.unclassified_total}`,
    '',
    '| Rule Type | Matches |',
    '|-----------|---------|'
  ];
  for (const [ruleType, count] of Object.entries(dryrunJson.summary_by_rule_type)) {
    lines.push(`| ${ruleType} | ${count} |`);
  }
  lines.push('', '| File | Class | Matches | Unclassified |', '|------|-------|---------|--------------|');
  for (const file of dryrunJson.files) {
    lines.push(`| ${file.path} | ${file.file_class} | ${file.matches.length} | ${file.unclassified_count} |`);
  }
  return `${lines.join('\n')}\n`;
}

function sumCounts(files, token) {
  return Object.values(files || {}).reduce((sum, entry) => sum + (entry.counts[token] || 0), 0);
}

function renderCoverageDeltaMarkdown(preJson, postJson, allowlist) {
  const manifest = require('./manifest.cjs');
  const failures = manifest.assertZeroOutsideAllowlist(postJson, allowlist);
  const lines = [
    '# Coverage Manifest Delta',
    '',
    `Assertion: ${failures.length === 0 ? 'PASS' : 'FAIL'}`,
    '',
    '| Token | Pre | Post | Delta |',
    '|-------|-----|------|-------|'
  ];
  for (const token of manifest.TOKENS) {
    const pre = sumCounts(preJson.files, token);
    const post = sumCounts(postJson.files, token);
    lines.push(`| ${token} | ${pre} | ${post} | ${post - pre} |`);
  }
  if (failures.length > 0) {
    lines.push('', '## Failures', '', '| File | Token | Count |', '|------|-------|-------|');
    for (const failure of failures) lines.push(`| ${failure.path} | ${failure.token} | ${failure.count} |`);
  }
  return `${lines.join('\n')}\n`;
}

module.exports = { renderDryrunMarkdown, renderCoverageDeltaMarkdown };
