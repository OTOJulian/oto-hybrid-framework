# Search Tools Reference

Runtime-neutral search guidance for all search-capable oto agents. This file ships byte-identical to every runtime root — never add runtime-specific tool namespace prefixes to this file.

## Availability Gates

Availability is runtime-observable — you never need a context flag to know what you can use:

- **Exa** — available when the Exa search tools (`web_search_exa`, `web_fetch_exa`, `web_search_advanced_exa`) appear in your tool list. If an Exa call fails with tool-not-found, treat Exa as unavailable for the rest of the session.
- **Brave** — probe by running the Brave command in the ladder below. It never throws when no key is configured: it exits 0 and returns structured JSON. A response containing `"available": false` means Brave is unavailable for the rest of the session; `"available": true` means use the `results` array.
- **Firecrawl** — available when a Firecrawl scrape or search tool appears in your tool list.

Never attempt a tool whose availability signal says it is unavailable.

## Fallback Ladder

Work down this ladder; each rung is used only when the rung above is unavailable or has failed for the session:

1. **Exa semantic search** — if the Exa tools appear in your tool list. Use the Exa search tool (`web_search_exa`) for semantic, research-heavy queries where keyword search fails: "best approaches to X", technical/academic content, niche library discovery. Exa is the semantic-query tier, not the default for every lookup — use built-in search or Brave for simple keyword lookups even when Exa is available.
2. **Brave web search** — probe with:

   ```bash
   oto-sdk query websearch "your query" --limit 10
   ```

   If the JSON response contains `"available": false` (no key configured, or an API error), fall to the next rung — the command itself never errors for a missing key. Options: `--limit N` (default 10), `--freshness day|week|month`. Independent index (not Google/Bing dependent), less SEO spam.
3. **Built-in web search** — always present. Use your runtime's built-in web search tool (WebSearch in Claude Code, or your runtime's equivalent).

## Exa Tools (when available)

Exactly three Exa tools are registered:

| Tool | Use For |
|------|---------|
| `web_search_exa` | Semantic web search — research questions, discovery |
| `web_fetch_exa` | Fetch full content from a specific URL |
| `web_search_advanced_exa` | Search with domain/date filters |

## Rate-Limit Rule (429)

On any Exa rate-limit/429 error, switch to Brave/WebSearch for the remainder of the session. Never retry Exa after a rate-limit error.

## Tool-Not-Found Rule

If an Exa tool call fails with tool-not-found, fall back immediately to the next rung — never retry.

## Firecrawl Deep Scraping (when a Firecrawl tool is present)

Use the Firecrawl scrape tool to extract clean markdown from a specific URL (documentation, blog posts, READMEs), or the Firecrawl search tool for web search with auto-scraped results. Use after finding a URL via Exa, Brave, or built-in search.

If no Firecrawl tool is present in your tool list, use your runtime's built-in URL fetch tool (WebFetch in Claude Code, or equivalent) instead.
