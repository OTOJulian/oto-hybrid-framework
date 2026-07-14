# ADR-16: Exa MCP transport — launcher-stdio

Status: Accepted
Date: 2026-07-13
Implements: D-01, D-02, D-03, D-04, D-15

## Context

Phase 15 registers the Exa MCP server in Claude Code, Codex, and Gemini CLI. Phase 14 established that the Exa credential lives only in `~/.oto/exa_api_key` with mode 0600 or in the `EXA_API_KEY` environment variable. The selected transport determines whether credential material must also appear in runtime configuration files and whether the three runtimes can share one launch contract.

## Decision

The transport is **launcher-stdio**. A shipped launcher at `oto/hooks/oto-exa-mcp.js`, distributed through the existing `scripts/build-hooks.js` channel, resolves the credential from the environment or keyfile at spawn time and starts the server. Runtime configuration files contain only the launcher command and arguments; no key material is written to any runtime configuration file (D-01).

The server command is pinned exactly to `npx -y exa-mcp-server@3.2.1` (D-02). A version bump is therefore a one-line reviewed diff rather than an implicit upstream change.

The exposed tool surface is pinned with the Smithery positional argument `tools=web_search_exa,web_fetch_exa,web_search_advanced_exa`. It is not expressed with `--tools` flags: the 3.2.1 stdio bundle parses positional `key=value` arguments only. `web_search_advanced_exa` is disabled by default, so this positional argument is required to provide MCP-06's exact three-tool surface.

Pre-warming uses an empty-stdin spawn with a timeout (D-03):

```js
spawnSync(
  'npx',
  ['-y', 'exa-mcp-server@3.2.1', 'tools=web_search_exa,web_fetch_exa,web_search_advanced_exa'],
  { input: '', timeout: 120000 },
);
```

The 3.2.1 binary does not handle `--version`; invoking that flag would leave it waiting on stdio. With empty stdin, the server exits successfully on EOF, as verified against the real bundle. A pre-warm failure produces an install-time warning but does not block registration: consent has already been given, the launcher reports the same failure when a session starts, and `npx` can succeed once connectivity returns.

The D-15 key-usability rule applies identically in the CJS helper `oto/bin/lib/secrets.cjs`, the SDK helper `sdk/src/query/secrets.ts`, and the launcher's inline copy:

| Step | Rule |
|------|------|
| 1 | `EXA_API_KEY` environment variable, trimmed — a non-empty value wins |
| 2 | Keyfile `~/.oto/exa_api_key`: `stat` (symlinks FOLLOWED) must report a regular file |
| 3 | Read UTF-8 and trim — a non-empty value is usable; empty or whitespace means "no key detected" |
| 4 | Non-regular targets, including directories, FIFOs, and dangling symlinks, mean "no key detected" |

This reconciles D-15 with Phase 14 WR-07. The read and detection path follows a symlink when its target is a regular file, supporting credentials managed by a password manager; reading through that link is disclosure-neutral for the same user. The write path retains its `lstat` plus `O_NOFOLLOW` refusal because WR-07 addressed write-through-symlink replacement, a distinct threat.

## Rationale

Launcher-based stdio provides uniform secret indirection across all three runtimes and preserves the Phase 14 keyfile as the single credential-rotation point. It also supplies one tool-pinning mechanism instead of three runtime-specific filters. The exact package pin and required positional tool argument keep the surface deterministic even as upstream has already deprecated more than five tools.

## Consequences

- Each MCP session includes one Node child-process hop through the launcher.
- Changing the server version requires an oto release with a reviewed pin update.
- Runtime configuration remains free of Exa key material, while key rotation happens once through the environment or Phase 14 keyfile.
- The evaluated alternative is remote HTTP at `https://mcp.exa.ai/mcp` with an `x-api-key` header. It eliminates the child process, is maintained by Exa, and offers a keyless free tier of approximately 150 calls per day; that tier anchors the EXA-F-01 deferral to the v0.5.x+ backlog.
- Remote HTTP is rejected because it would require a literal credential in two or three user-private configuration files, increasing rotation work. Gemini headers cannot expand environment variables (gemini-cli#5282), while Codex `bearer_token_env_var` sends a bearer authorization scheme instead of the required `x-api-key` header.
