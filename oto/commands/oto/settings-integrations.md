---
name: oto:settings-integrations
description: Configure third-party API keys, code-review CLI routing, and agent-skill injection
allowed-tools:
  - Read
  - Write
  - Bash
  - AskUserQuestion
---

<objective>
Interactive configuration of OTO's third-party integration surface:
- Search API keys: `brave_search`, `firecrawl`, `exa_search`, and
  the `search_gitignored` toggle
- Code-review CLI routing: `review.models.{claude,codex,gemini,opencode}`
- Agent-skill injection: `agent_skills.<agent-type>`

API keys are stored ONLY in `~/.oto/<integration>_api_key` (mode 0600) or
their environment variables — never in `.oto/config.json`, which holds
boolean enable flags only. Keys are entered via
`oto-sdk query secret-set <slug>` at a hidden terminal prompt (stdin/TTY,
never argv) and every display is masked (`****<last-4>`). The workflow never
echoes plaintext to stdout, stderr, or any log.

This command is deliberately distinct from `/oto-settings` (workflow toggles)
and any `/oto-settings-advanced` tuning surface. It handles *connectivity*,
not pipeline shape.
</objective>

<execution_context>
@~/.claude/oto/workflows/settings-integrations.md
</execution_context>

<process>
**Follow the settings-integrations workflow** from
`@~/.claude/oto/workflows/settings-integrations.md`.

The workflow handles:
1. Resolving the active workstream and ensuring config exists via idempotent
   `oto-sdk query config-new-project` (threaded with `--ws` when a
   workstream is active)
2. Reading current integration values (masked for display)
3. Section 1 — Search Integrations: Brave / Firecrawl / Exa / search_gitignored
4. Section 2 — Review CLI Routing: review.models.{claude,codex,gemini,opencode}
5. Section 3 — Agent Skills Injection: agent_skills.<agent-type>
6. Writing search API keys via `oto-sdk query secret-set` / `secret-clear`
   (0600 keyfiles, boolean flags); non-secret settings via
   `oto-sdk query config-set` (which merges, preserving unrelated keys)
7. Masked confirmation display
</process>
