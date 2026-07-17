/**
 * Web search query handler — Brave Search API integration.
 *
 * Provides web search for researcher agents. Resolves Brave credentials from
 * BRAVE_API_KEY first, then ~/.oto/brave_api_key, and returns
 * { available: false } gracefully when neither is available so agents can
 * fall back to built-in WebSearch tools.
 *
 * @example
 * ```typescript
 * import { websearch } from './websearch.js';
 *
 * await websearch(['typescript generics'], '/project');
 * // { data: { available: true, query: 'typescript generics', count: 10, results: [...] } }
 * ```
 */
import type { QueryHandler } from './utils.js';
/**
 * Search the web via Brave Search API.
 * Uses BRAVE_API_KEY when set, otherwise ~/.oto/brave_api_key.
 *
 * Args: query [--limit N] [--freshness day|week|month]
 */
export declare const websearch: QueryHandler;
//# sourceMappingURL=websearch.d.ts.map