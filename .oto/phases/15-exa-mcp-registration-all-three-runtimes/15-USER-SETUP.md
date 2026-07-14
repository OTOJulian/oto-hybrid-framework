# Phase 15: User Setup Required

**Generated:** 2026-07-14
**Phase:** 15-exa-mcp-registration-all-three-runtimes
**Status:** Complete

The Exa credential and live Claude MCP registration were configured and verified during Plan 15-10's human checkpoint.

## Environment Variables

| Status | Variable | Source | Add to |
|--------|----------|--------|--------|
| [x] | `EXA_API_KEY` | Exa Dashboard → API Keys | Verification shell or `~/.oto/exa_api_key` through `/oto-settings-integrations` |

## Verification Completed

- [x] Consent prompt shown and explicitly accepted.
- [x] Claude registration exposes exactly `web_search_exa`, `web_fetch_exa`, and `web_search_advanced_exa`.
- [x] Re-install is prompt-free and does not duplicate the `exa` entry.
- [x] Custom `CLAUDE_CONFIG_DIR=/tmp/ccd` registration/uninstall round-trip is clean.
- [x] Fixed-string key scan found no credential bytes in runtime configuration or git-tracked `.oto` files.

## Ongoing Secret Handling

Keep the key in `EXA_API_KEY` or the mode-0600 `~/.oto/exa_api_key` file. Never place the credential in `.oto/config.json` or any runtime MCP configuration.

