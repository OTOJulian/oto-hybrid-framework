'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { validate } = require('../tests/helpers/load-schema');

const REPO_ROOT = path.join(__dirname, '..');
const GSD_ROOT = 'foundation-frameworks/get-shit-done-main';
const SP_ROOT = 'foundation-frameworks/superpowers-main';
const SCHEMA = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'schema', 'file-inventory.json'), 'utf8'));

const DROP_AGENTS = new Set([
  'gsd-ai-researcher',
  'gsd-eval-auditor',
  'gsd-eval-planner',
  'gsd-framework-selector',
  'gsd-doc-classifier',
  'gsd-doc-synthesizer',
  'gsd-pattern-mapper',
  'gsd-intel-updater',
  'gsd-user-profiler',
  'gsd-debug-session-manager',
]);

const HOOK_VERDICTS = {
  'gsd-check-update.js': { verdict: 'drop', reason: 'oto updates via npm install -g github:#vX.Y.Z' },
  'gsd-check-update-worker.js': { verdict: 'drop', reason: 'paired with check-update; dropped together' },
  'gsd-context-monitor.js': { verdict: 'keep', target: 'oto-context-monitor.js', reason: 'HK-03' },
  'gsd-statusline.js': { verdict: 'keep', target: 'oto-statusline.js', reason: 'HK-02' },
  'gsd-session-state.sh': {
    verdict: 'merge',
    target: 'oto-session-start',
    reason: 'HK-01 - D-08 consolidation',
    sources: [
      'foundation-frameworks/get-shit-done-main/hooks/gsd-session-state.sh',
      'foundation-frameworks/superpowers-main/hooks/session-start',
    ],
  },
  'gsd-prompt-guard.js': { verdict: 'keep', target: 'oto-prompt-guard.js', reason: 'HK-04' },
  'gsd-read-guard.js': { verdict: 'drop', reason: 'DROP (review) per hooks fleet; likely redundant for solo use' },
  'gsd-read-injection-scanner.js': { verdict: 'keep', target: 'oto-read-injection-scanner.js', reason: 'HK-05' },
  'gsd-validate-commit.sh': { verdict: 'keep', target: 'oto-validate-commit.sh', reason: 'HK-06' },
  'gsd-workflow-guard.js': { verdict: 'drop', reason: 'DROP (review) per hooks fleet; low-value for solo use' },
  'gsd-phase-boundary.sh': { verdict: 'drop', reason: 'DROP (review) per hooks fleet; redundant with statusline' },
};

const SKILL_VERDICTS = {
  'test-driven-development': { verdict: 'keep', target: 'test-driven-development', reason: 'SKL-01' },
  'systematic-debugging': { verdict: 'keep', target: 'systematic-debugging', reason: 'SKL-02' },
  'verification-before-completion': { verdict: 'keep', target: 'verification-before-completion', reason: 'SKL-03' },
  'dispatching-parallel-agents': { verdict: 'keep', target: 'dispatching-parallel-agents', reason: 'SKL-04' },
  'using-git-worktrees': { verdict: 'keep', target: 'using-git-worktrees', reason: 'SKL-05' },
  'writing-skills': { verdict: 'keep', target: 'writing-skills', reason: 'SKL-06' },
  'using-superpowers': { verdict: 'keep', target: 'using-oto', reason: 'SKL-07 - renamed per ADR-06' },
  'brainstorming': { verdict: 'drop', reason: 'Overlaps /oto-discuss-phase; workflow wins per ADR-03' },
  'writing-plans': { verdict: 'drop', reason: 'Overlaps /oto-plan-phase; workflow wins' },
  'executing-plans': { verdict: 'drop', reason: 'Overlaps /oto-execute-phase; workflow wins' },
  'subagent-driven-development': { verdict: 'drop', reason: 'Overlaps GSD wave engine; folded into oto-executor' },
  'requesting-code-review': { verdict: 'drop', reason: 'Overlaps /oto-code-review; workflow wins' },
  'receiving-code-review': { verdict: 'drop', reason: 'No v1 invocation point; v2 candidate' },
  'finishing-a-development-branch': { verdict: 'drop', reason: 'Overlaps /oto-ship; workflow wins' },
};

const DROPPED_RUNTIMES_PATTERN = /\.(opencode|kilo|cursor|windsurf|antigravity|augment|trae|qwen|codebuddy|cline|copilot)-?(plugin)?(\/|$)/i;

function classify(upstream, relPath) {
  const filename = path.basename(relPath);

  if (/^LICENSE(\.md)?$/.test(filename) || filename === 'THIRD-PARTY-LICENSES.md') {
    return {
      verdict: 'merge',
      reason: 'Consolidated into THIRD-PARTY-LICENSES.md per ADR-13',
      target_path: 'THIRD-PARTY-LICENSES.md',
      merge_source_files: [
        'foundation-frameworks/get-shit-done-main/LICENSE',
        'foundation-frameworks/superpowers-main/LICENSE',
      ],
      rebrand_required: false,
      phase_owner: 1,
      category: 'license',
    };
  }

  if (/^(README\.(ja-JP|ko-KR|pt-BR|zh-CN)\.md|docs\/[a-z]{2}-[A-Z]{2}\/)/i.test(relPath)) {
    return { verdict: 'drop', reason: 'Translated doc out of scope per ADR-14', rebrand_required: false, phase_owner: 1, category: 'doc' };
  }

  if (DROPPED_RUNTIMES_PATTERN.test(relPath)) {
    return { verdict: 'drop', reason: 'Runtime out of scope per ADR-14', rebrand_required: false, phase_owner: 1, category: 'manifest' };
  }

  if (/\.cmd$/i.test(filename)) {
    return { verdict: 'drop', reason: 'Windows out of scope', rebrand_required: false, phase_owner: 1, category: 'script' };
  }

  if (upstream === 'gsd' && /^sdk\//.test(relPath)) {
    return { verdict: 'drop', reason: 'SDK dropped from v1 per ADR-12', rebrand_required: false, phase_owner: 1, category: 'sdk' };
  }

  if (upstream === 'gsd' && /^tests\//.test(relPath)) {
    return { verdict: 'drop', reason: 'Upstream test harness; oto re-derives tests in Phase 10', rebrand_required: false, phase_owner: 1, category: 'test' };
  }

  if (upstream === 'superpowers' && /^tests\//.test(relPath)) {
    return { verdict: 'drop', reason: 'Superpowers contributor tests out of scope', rebrand_required: false, phase_owner: 1, category: 'test' };
  }

  if (upstream === 'gsd' && /^commands\/gsd\/(join-discord|from-gsd2|ultraplan-phase|node-repair|inbox|graphify|intel|thread|profile-user|reapply-patches)\.md$/.test(relPath)) {
    return { verdict: 'drop', reason: 'Anti-feature, beta, migration, community, or v2-deferred command', rebrand_required: false, phase_owner: 1, category: 'command' };
  }

  if (upstream === 'gsd' && /^agents\/gsd-[a-z-]+\.md$/.test(relPath)) {
    const agentName = filename.replace(/\.md$/, '');
    if (DROP_AGENTS.has(agentName)) {
      return { verdict: 'drop', reason: 'Agent dropped per ADR-07 trim; see decisions/agent-audit.md', rebrand_required: false, phase_owner: 1, category: 'agent' };
    }
    return {
      verdict: 'keep',
      reason: 'Phase 4 agent port',
      target_path: `agents/${agentName.replace(/^gsd-/, 'oto-')}.md`,
      rebrand_required: true,
      phase_owner: 4,
      category: 'agent',
    };
  }

  if (upstream === 'superpowers' && relPath === 'agents/code-reviewer.md') {
    return { verdict: 'drop', reason: 'Collision with oto-code-reviewer; resolved per ADR-05', rebrand_required: false, phase_owner: 1, category: 'agent' };
  }

  if (upstream === 'gsd' && /^commands\/gsd\/[a-z-]+\.md$/.test(relPath)) {
    const cmd = filename.replace(/\.md$/, '').replace(/^gsd-/, 'oto-');
    return { verdict: 'keep', reason: 'GSD command ported to /oto- equivalent', target_path: `commands/oto/${cmd}.md`, rebrand_required: true, phase_owner: 4, category: 'command' };
  }

  if (upstream === 'gsd' && /^get-shit-done\/workflows\/.*\.md$/.test(relPath)) {
    return { verdict: 'keep', reason: 'Phase 4 workflow port; includes workflow-only files from Risk B', target_path: relPath.replace(/^get-shit-done\//, 'oto/'), rebrand_required: true, phase_owner: 4, category: 'workflow' };
  }

  if (upstream === 'gsd' && /^get-shit-done\/bin\/lib\/.*\.cjs$/.test(relPath)) {
    return { verdict: 'keep', reason: 'Phase 4 lib port - bulk rebrand', target_path: relPath.replace(/^get-shit-done\//, 'oto/'), rebrand_required: true, phase_owner: 4, category: 'lib' };
  }

  if (upstream === 'gsd' && relPath === 'get-shit-done/bin/gsd-tools.cjs') {
    return {
      verdict: 'merge',
      reason: 'D-18 fork of deprecated gsd-tools.cjs; oto carries forward independently if upstream deletes',
      target_path: 'oto/bin/lib/oto-tools.cjs',
      deprecation_status: 'deprecated',
      rebrand_required: true,
      merge_source_files: ['foundation-frameworks/get-shit-done-main/get-shit-done/bin/gsd-tools.cjs'],
      phase_owner: 4,
      category: 'lib',
    };
  }

  if (upstream === 'gsd' && relPath === 'bin/install.js') {
    return { verdict: 'merge', reason: 'Phase 3 fork - trim unwanted runtimes', target_path: 'bin/install.js', rebrand_required: true, merge_source_files: ['foundation-frameworks/get-shit-done-main/bin/install.js'], phase_owner: 3, category: 'installer' };
  }

  if (upstream === 'gsd' && relPath === 'package.json') {
    return { verdict: 'merge', reason: 'Phase 2 package shape adaptation', target_path: 'package.json', rebrand_required: true, merge_source_files: ['foundation-frameworks/get-shit-done-main/package.json'], phase_owner: 2, category: 'config' };
  }

  if (upstream === 'gsd' && /^hooks\/[^/]+$/.test(relPath)) {
    const v = HOOK_VERDICTS[filename];
    if (v) {
      const out = { verdict: v.verdict, reason: v.reason, rebrand_required: v.verdict !== 'drop', phase_owner: 5, category: 'hook' };
      if (v.target) out.target_path = `hooks/${v.target}`;
      if (v.sources) out.merge_source_files = v.sources;
      return out;
    }
  }

  if (upstream === 'superpowers' && relPath === 'hooks/session-start') {
    return {
      verdict: 'merge',
      reason: 'Source for oto-session-start consolidation per HK-01 / ADR-04',
      target_path: 'hooks/oto-session-start',
      rebrand_required: true,
      merge_source_files: [
        'foundation-frameworks/get-shit-done-main/hooks/gsd-session-state.sh',
        'foundation-frameworks/superpowers-main/hooks/session-start',
      ],
      phase_owner: 5,
      category: 'hook',
    };
  }

  if (upstream === 'superpowers' && /^hooks\/(hooks\.json|hooks-cursor\.json|run-hook\.cmd)$/.test(relPath)) {
    return { verdict: 'drop', reason: 'Replaced by oto installer hook registration', rebrand_required: false, phase_owner: 1, category: 'config' };
  }

  if (upstream === 'superpowers' && /^skills\/([^/]+)\//.test(relPath)) {
    const skillName = relPath.match(/^skills\/([^/]+)\//)[1];
    const v = SKILL_VERDICTS[skillName];
    if (v) {
      const subPath = relPath.replace(/^skills\/[^/]+\//, '');
      if (v.verdict === 'keep') {
        return { verdict: 'keep', reason: v.reason, target_path: `skills/${v.target}/${subPath}`, rebrand_required: true, phase_owner: 6, category: 'skill' };
      }
      return { verdict: 'drop', reason: v.reason, rebrand_required: false, phase_owner: 1, category: 'skill' };
    }
  }

  if (/\.(png|jpg|jpeg|gif|svg|ico|webp|woff2?|ttf|otf)$/i.test(filename)) {
    return { verdict: 'drop', reason: 'Binary asset not relevant to oto fork', rebrand_required: false, phase_owner: 1, category: 'asset' };
  }

  if (/^CHANGELOG/.test(filename) || /^RELEASE-NOTES/.test(filename)) {
    return { verdict: 'drop', reason: 'Upstream changelog; oto maintains its own', rebrand_required: false, phase_owner: 1, category: 'doc' };
  }

  if (filename === 'README.md') {
    return { verdict: 'drop', reason: 'oto authors its own README in Phase 10', rebrand_required: false, phase_owner: 1, category: 'doc' };
  }

  if (/^docs\//.test(relPath)) {
    return { verdict: 'drop', reason: 'Upstream docs; oto authors its own docs in Phase 10', rebrand_required: false, phase_owner: 1, category: 'doc' };
  }

  if (/^scripts\//.test(relPath)) {
    return { verdict: 'drop', reason: 'Upstream tooling; oto re-derives needed scripts', rebrand_required: false, phase_owner: 1, category: 'script' };
  }

  if (/^get-shit-done\/(references|templates|contexts)\//.test(relPath)) {
    const cat = relPath.match(/^get-shit-done\/([a-z]+)\//)[1];
    const catEnum = cat === 'references' ? 'reference' : cat === 'contexts' ? 'context' : 'template';
    return { verdict: 'keep', reason: `Phase 4 ${cat} port`, target_path: relPath.replace(/^get-shit-done\//, 'oto/'), rebrand_required: true, phase_owner: 4, category: catEnum };
  }

  if (filename === 'AGENTS.md' || filename === 'CLAUDE.md' || filename === 'GEMINI.md') {
    return { verdict: 'drop', reason: 'oto generates instruction files from one template in Phase 8', rebrand_required: false, phase_owner: 1, category: 'meta' };
  }

  return { verdict: 'drop', reason: 'Upstream meta file not needed by oto fork', rebrand_required: false, phase_owner: 1, category: 'meta' };
}

function walk(rootRel) {
  const out = [];
  const abs = path.join(REPO_ROOT, rootRel);
  function recurse(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) recurse(full);
      else if (entry.isFile()) out.push(path.relative(abs, full).split(path.sep).join('/'));
    }
  }
  recurse(abs);
  return out.sort();
}

function generateMarkdown(data) {
  let md = '# File Inventory\n\n';
  md += '> Generated by `scripts/gen-inventory.cjs` from `schema/file-inventory.json`. Source of truth is `decisions/file-inventory.json`. Do not edit by hand.\n\n';
  md += `**Generated:** ${data.generated_at}\n`;
  md += `**Upstream versions:** GSD ${data.upstream_versions.gsd}, Superpowers ${data.upstream_versions.superpowers}\n`;
  md += `**Entry count:** ${data.entries.length}\n\n`;

  const counts = { keep: 0, drop: 0, merge: 0 };
  for (const e of data.entries) counts[e.verdict]++;
  md += '## Summary\n\n';
  md += `- KEEP: ${counts.keep}\n- DROP: ${counts.drop}\n- MERGE: ${counts.merge}\n\n`;

  const byCategory = {};
  for (const e of data.entries) {
    if (!byCategory[e.category]) byCategory[e.category] = [];
    byCategory[e.category].push(e);
  }

  for (const cat of Object.keys(byCategory).sort()) {
    md += `## ${cat}\n\n`;
    md += '| Path | Upstream | Verdict | Target | Reason |\n|------|----------|---------|--------|--------|\n';
    for (const e of byCategory[cat]) {
      const target = e.target_path ? `\`${e.target_path}\`` : '-';
      md += `| \`${e.path}\` | ${e.upstream} | ${e.verdict.toUpperCase()} | ${target} | ${e.reason.replace(/\|/g, '\\|')} |\n`;
    }
    md += '\n';
  }
  return md;
}

function main() {
  const entries = [];
  for (const [upstream, root] of [['gsd', GSD_ROOT], ['superpowers', SP_ROOT]]) {
    for (const rel of walk(root)) {
      entries.push({ path: rel, upstream, ...classify(upstream, rel) });
    }
  }
  entries.sort((a, b) => {
    const ka = `${a.upstream}/${a.path}`;
    const kb = `${b.upstream}/${b.path}`;
    return ka < kb ? -1 : ka > kb ? 1 : 0;
  });

  const output = {
    version: '1',
    generated_at: new Date().toISOString(),
    upstream_versions: { gsd: 'v1.38.5', superpowers: 'v5.0.7' },
    entries,
  };

  const result = validate(output, SCHEMA);
  if (!result.valid) {
    console.error('SCHEMA VALIDATION FAILED:');
    for (const e of result.errors.slice(0, 20)) console.error(`  ${e}`);
    process.exit(1);
  }

  fs.writeFileSync(path.join(REPO_ROOT, 'decisions', 'file-inventory.json'), JSON.stringify(output, null, 2) + '\n');
  fs.writeFileSync(path.join(REPO_ROOT, 'decisions', 'file-inventory.md'), generateMarkdown(output));

  const summary = {};
  for (const e of entries) summary[e.verdict] = (summary[e.verdict] || 0) + 1;
  console.log(`Wrote ${entries.length} entries:`, summary);
}

main();
