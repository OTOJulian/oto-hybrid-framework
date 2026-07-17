# Search Tools Reference

Runtime-neutral search guidance for all search-capable oto agents. This file ships byte-identical to every runtime root — never add runtime-specific tool namespace prefixes to this file.

## Availability Gates

Your provided context (init or orchestrator) carries three booleans: `exa_search`, `brave_search`, `firecrawl`. Trust these booleans — never attempt a tool your context says is unavailable.

## Fallback Ladder

Work down this ladder; each rung is used only when the rung above is unavailable or has failed for the session:

1. **Exa semantic search** — if `exa_search` is `true`. Use the Exa search tool (`web_search_exa`) for semantic, research-heavy queries where keyword search fails: "best approaches to X", technical/academic content, niche library discovery. Exa is the semantic-query tier, not the default for every lookup — use built-in search or Brave for simple keyword lookups even when Exa is available.
2. **Brave web search** — if `brave_search` is `true`. Run:

   ```bash
   oto-sdk query websearch "your query" --limit 10
   ```

   Options: `--limit N` (default 10), `--freshness day|week|month`. Independent index (not Google/Bing dependent), less SEO spam.
3. **Built-in web search** — always present. Use your runtime's built-in web search tool (WebSearch in Claude Code, or your runtime's equivalent).

## Exa Tools (when `exa_search` is true)

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

## Firecrawl Deep Scraping (when `firecrawl` is true)

Use the Firecrawl scrape tool to extract clean markdown from a specific URL (documentation, blog posts, READMEs), or the Firecrawl search tool for web search with auto-scraped results. Use after finding a URL via Exa, Brave, or built-in search.

If `firecrawl` is `false` (or unset), use your runtime's built-in URL fetch tool (WebFetch in Claude Code, or equivalent) instead.
