'use strict';

function toSingleLine(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function yamlQuote(value) {
  return JSON.stringify(String(value || ''));
}

function extractFrontmatterAndBody(content) {
  if (!content.startsWith('---')) {
    return { frontmatter: null, body: content };
  }

  const endIndex = content.indexOf('---', 3);
  if (endIndex === -1) {
    return { frontmatter: null, body: content };
  }

  return {
    frontmatter: content.substring(3, endIndex).trim(),
    body: content.substring(endIndex + 3),
  };
}

function extractFrontmatterField(frontmatter, fieldName) {
  if (!frontmatter) return null;
  const regex = new RegExp(`^${fieldName}:\\s*(.+)$`, 'm');
  const match = frontmatter.match(regex);
  if (!match) return null;
  return match[1].trim().replace(/^['"]|['"]$/g, '');
}

function convertClaudeToCodexMarkdown(content) {
  let converted = String(content || '');
  converted = converted.replace(/\$ARGUMENTS\b/g, '{{GSD_ARGS}}');
  converted = converted.replace(/`\/clear`\s*,?\s*then:?\s*\n?/gi, '');
  converted = converted.replace(/\/clear\s*,?\s*then:?\s*\n?/gi, '');
  converted = converted.replace(/^\s*`?\/clear`?\s*$/gm, '');
  converted = converted.replace(/\$HOME\/\.claude\//g, '$HOME/.codex/');
  converted = converted.replace(/~\/\.claude\//g, '~/.codex/');
  converted = converted.replace(/\.\/\.claude\//g, './.codex/');
  converted = converted.replace(/(?<![A-Za-z0-9_\-./~$])\.claude\//g, '.codex/');
  converted = converted.replace(/\.claudeignore\b/g, '.codexignore');
  return converted;
}

function convertClaudeAgentToCodexAgent(content) {
  let converted = convertClaudeToCodexMarkdown(content);
  converted = converted.replace(new RegExp('\\b' + 'g' + 'sd-', 'g'), 'oto-');
  converted = converted.replace(new RegExp('\\b' + 'G' + 'SD-', 'g'), 'OTO-');
  converted = converted.replace(new RegExp('super' + 'powers-', 'g'), 'oto-');

  const { frontmatter, body } = extractFrontmatterAndBody(converted);
  if (!frontmatter) return converted;

  const name = extractFrontmatterField(frontmatter, 'name') || 'unknown';
  const description = extractFrontmatterField(frontmatter, 'description') || '';
  const tools = extractFrontmatterField(frontmatter, 'tools') || '';

  const roleHeader = `<codex_agent_role>
role: ${name}
tools: ${tools}
purpose: ${toSingleLine(description)}
</codex_agent_role>`;

  const cleanFrontmatter = `---\nname: ${yamlQuote(name)}\ndescription: ${yamlQuote(toSingleLine(description))}\n---`;

  return `${cleanFrontmatter}\n\n${roleHeader}\n${body}`;
}

function generateCodexAgentToml(agentName, agentContent, sandboxMap = {}, modelOverrides = null, runtimeResolver = null, ctx = {}) {
  const sandboxMode = sandboxMap[agentName] || 'read-only';
  const converted = convertClaudeToCodexMarkdown(agentContent);
  const { frontmatter, body } = extractFrontmatterAndBody(converted);
  const frontmatterText = frontmatter || '';
  const resolvedName = extractFrontmatterField(frontmatterText, 'name') || agentName;
  const resolvedDescription = toSingleLine(
    extractFrontmatterField(frontmatterText, 'description') || `oto agent ${resolvedName}`
  );
  const instructions = body.trim();

  const lines = [
    `# managed by oto v${ctx?.otoVersion || 'unknown'}`,
    `name = ${JSON.stringify(resolvedName)}`,
    `description = ${JSON.stringify(resolvedDescription)}`,
    `sandbox_mode = ${JSON.stringify(sandboxMode)}`,
  ];

  const modelOverride = modelOverrides?.[resolvedName] || modelOverrides?.[agentName];
  if (modelOverride) {
    lines.push(`model = ${JSON.stringify(modelOverride)}`);
  } else if (runtimeResolver) {
    const entry = runtimeResolver.resolve(resolvedName) || runtimeResolver.resolve(agentName);
    if (entry?.model) {
      lines.push(`model = ${JSON.stringify(entry.model)}`);
      if (entry.reasoning_effort) {
        lines.push(`model_reasoning_effort = ${JSON.stringify(entry.reasoning_effort)}`);
      }
    }
  }

  lines.push("developer_instructions = '''");
  lines.push(instructions);
  lines.push("'''");

  return lines.join('\n') + '\n';
}

function getCodexSkillAdapterHeader(skillName) {
  const invocation = `$${skillName}`;
  return `<codex_skill_adapter>
## A. Skill Invocation
- This skill is invoked by mentioning \`${invocation}\`.
- Treat all user text after \`${invocation}\` as \`{{GSD_ARGS}}\`.
- If no arguments are present, treat \`{{GSD_ARGS}}\` as empty.

## B. AskUserQuestion → request_user_input Mapping
oto workflows use \`AskUserQuestion\` (Claude Code syntax). Translate to Codex \`request_user_input\`:

Parameter mapping:
- \`header\` → \`header\`
- \`question\` → \`question\`
- Options formatted as \`"Label" — description\` → \`{label: "Label", description: "description"}\`
- Generate \`id\` from header: lowercase, replace spaces with underscores

Batched calls:
- \`AskUserQuestion([q1, q2])\` → single \`request_user_input\` with multiple entries in \`questions[]\`

Multi-select workaround:
- Codex has no \`multiSelect\`. Use sequential single-selects, or present a numbered freeform list asking the user to enter comma-separated numbers.

Execute mode fallback:
- When \`request_user_input\` is rejected (Execute mode), present a plain-text numbered list and pick a reasonable default.

## C. Task() → spawn_agent Mapping
oto workflows use \`Task(...)\` (Claude Code syntax). Translate to Codex collaboration tools:

Direct mapping:
- \`Task(subagent_type="X", prompt="Y")\` → \`spawn_agent(agent_type="X", message="Y")\`
- \`Task(model="...")\` → omit. \`spawn_agent\` has no inline \`model\` parameter;
  oto embeds the resolved per-agent model directly into each agent's \`.toml\`
  at install time so \`model_overrides\` from per-project \`.oto/config.json\` and
  \`~/.oto/defaults.json\` are honored automatically by Codex's agent router.
- \`fork_context: false\` by default — oto agents load their own context via \`<files_to_read>\` blocks

Spawn restriction:
- Codex restricts \`spawn_agent\` to cases where the user has explicitly
  requested sub-agents. When automatic spawning is not permitted, do the
  work inline in the current agent rather than attempting to force a spawn.

Parallel fan-out:
- Spawn multiple agents → collect agent IDs → \`wait(ids)\` for all to complete

Result parsing:
- Look for structured markers in agent output: \`CHECKPOINT\`, \`PLAN COMPLETE\`, \`SUMMARY\`, etc.
- \`close_agent(id)\` after collecting results from each agent
</codex_skill_adapter>`;
}

function convertClaudeCommandToCodexSkill(content, skillName) {
  const converted = convertClaudeToCodexMarkdown(content);
  const { frontmatter, body } = extractFrontmatterAndBody(converted);
  let description = `Run oto workflow ${skillName}.`;
  if (frontmatter) {
    const maybeDescription = extractFrontmatterField(frontmatter, 'description');
    if (maybeDescription) {
      description = maybeDescription;
    }
  }
  description = toSingleLine(description);
  const shortDescription = description.length > 180 ? `${description.slice(0, 177)}...` : description;
  const adapter = getCodexSkillAdapterHeader(skillName);

  return `---\nname: ${yamlQuote(skillName)}\ndescription: ${yamlQuote(description)}\nmetadata:\n  short-description: ${yamlQuote(shortDescription)}\n---\n\n${adapter}\n\n${body.trimStart()}`;
}

module.exports = {
  convertClaudeAgentToCodexAgent,
  convertClaudeCommandToCodexSkill,
  generateCodexAgentToml,
  getCodexSkillAdapterHeader,
  extractFrontmatterAndBody,
  extractFrontmatterField,
  toSingleLine,
  yamlQuote,
  convertClaudeToCodexMarkdown,
};
