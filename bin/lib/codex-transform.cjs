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

module.exports = {
  convertClaudeAgentToCodexAgent,
  generateCodexAgentToml,
  extractFrontmatterAndBody,
  extractFrontmatterField,
  toSingleLine,
  yamlQuote,
  convertClaudeToCodexMarkdown,
};
