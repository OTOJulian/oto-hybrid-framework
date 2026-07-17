# Search Integrations

oto gives research agents a fallback ladder across three search integrations:

1. Exa semantic search through the optional `exa` MCP server.
2. Brave search through `oto-sdk query websearch` when Brave is configured.
3. The runtime's built-in search as the always-present floor.

Agents choose the highest available rung for the query and fall back without
turning an unavailable optional integration into a user-facing error.

## Exa setup

Get an Exa API key from the Exa dashboard, then run
`/oto-settings-integrations` and choose the Exa integration. oto collects the
key through a hidden terminal prompt; the key never passes through chat or a
tracked project configuration file.

The prompt stores the key only in `~/.oto/exa_api_key` with mode `0600`. You
can instead supply the key through the `EXA_API_KEY` environment variable.
Never put the key in `.oto/config.json` or another tracked file.

When a usable key is detected, oto asks for explicit consent before it
registers the `exa` MCP server. The default answer is No. A consented install
adds an oto-managed entry only for each runtime targeted by that install:

- Claude Code: `~/.claude.json` at `mcpServers.exa`
- Codex: `~/.codex/config.toml` in an OTO-marked `[mcp_servers.exa]` block
- Gemini CLI: `~/.gemini/settings.json` at `mcpServers.exa`

Each registration launches the shipped stdio wrapper and exposes exactly
these tools:

- `web_search_exa`
- `web_fetch_exa`
- `web_search_advanced_exa`

## Brave setup

Run `/oto-settings-integrations` and choose the Brave integration. The key can
come from the `BRAVE_API_KEY` environment variable or the
`~/.oto/brave_api_key` keyfile. As with Exa, do not store the key in tracked
configuration.

Agents use Brave through `oto-sdk query websearch`. Brave is the next rung
when Exa is unavailable or unsuitable for a query.

## Fallback behavior

Research flows do not require Exa or Brave. If no usable Exa key is detected,
the MCP server is not registered, or an Exa tool is unavailable, agents move
to Brave when configured. If Brave is also unavailable, they use the
runtime's built-in search. Missing optional keys or servers therefore produce
no user-facing errors in normal research flows.

After an Exa rate-limit response, agents stop using Exa for the rest of the
session. They do not retry the same request or another Exa tool; they continue
with Brave or built-in search instead.

## Rate limits

Exa's free tier is rate-limited. When Exa returns a rate-limit (429) error,
oto's agents switch to Brave or built-in search for the remainder of the
session rather than retrying. Check Exa's pricing page for current limits.

## Uninstall

`oto uninstall` removes only `exa` registrations whose stored fingerprint
still matches the entry oto created. User-owned entries and entries modified
after registration are left in place and reported, so uninstall does not
overwrite or delete runtime configuration that oto does not own.
