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
import { readKeyfile } from './secrets.js';
/**
 * Search the web via Brave Search API.
 * Uses BRAVE_API_KEY when set, otherwise ~/.oto/brave_api_key.
 *
 * Args: query [--limit N] [--freshness day|week|month]
 */
export const websearch = async (args) => {
    // oto: HARD-01 — Brave rung must honor the Phase-14 keyfile story, env-first (D-15 ordering)
    const envKey = process.env.BRAVE_API_KEY;
    const apiKey = typeof envKey === 'string' && envKey.trim() !== ''
        ? envKey
        : readKeyfile('brave')?.value;
    if (!apiKey) {
        return { data: { available: false, reason: 'No Brave key: set BRAVE_API_KEY or ~/.oto/brave_api_key' } };
    }
    const query = args[0];
    if (!query) {
        return { data: { available: false, error: 'Query required' } };
    }
    const limitIdx = args.indexOf('--limit');
    const freshnessIdx = args.indexOf('--freshness');
    const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : 10;
    const freshness = freshnessIdx !== -1 ? args[freshnessIdx + 1] : null;
    const params = new URLSearchParams({
        q: query,
        count: String(limit),
        country: 'us',
        search_lang: 'en',
        text_decorations: 'false',
    });
    if (freshness)
        params.set('freshness', freshness);
    try {
        const response = await fetch(`https://api.search.brave.com/res/v1/web/search?${params}`, {
            headers: {
                'Accept': 'application/json',
                'X-Subscription-Token': apiKey,
            },
        });
        if (!response.ok) {
            return { data: { available: false, error: `API error: ${response.status}` } };
        }
        const body = await response.json();
        const results = (body.web?.results || []).map(r => ({
            title: r.title,
            url: r.url,
            description: r.description,
            age: r.age || null,
        }));
        return { data: { available: true, query, count: results.length, results } };
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { data: { available: false, error: msg } };
    }
};
//# sourceMappingURL=websearch.js.map