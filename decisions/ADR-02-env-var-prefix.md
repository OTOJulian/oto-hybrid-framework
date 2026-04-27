# ADR-02: Env-var prefix `GSD_*` to `OTO_*`

Status: Accepted
Date: 2026-04-27
Implements: D-03, D-04

## Context

The project goal is a unified `/oto-*` command surface. Keeping upstream `GSD_*` variables would leak upstream identity through help text, errors, installer messages, and hook injection. Research found 37 upstream `GSD_*` names, including names not listed in the original context:

```text
GSD_AGENTS_DIR
GSD_ARGS
GSD_CACHE_FILE
GSD_CODEX_HOOKS_OWNERSHIP_PREFIX
GSD_CODEX_MARKER
GSD_CONFIG_PATH
GSD_COPILOT_INSTRUCTIONS_CLOSE_MARKER
GSD_COPILOT_INSTRUCTIONS_MARKER
GSD_GLOBAL_VERSION_FILE
GSD_HOME
GSD_INSTALL_DIR
GSD_LOG_UNUSED_HANDLERS
GSD_MANAGED_DIRS
GSD_MARKER
GSD_MODEL_PROFILES
GSD_PLUGIN_ROOT
GSD_PORTABLE_HOOKS
GSD_PROJECT
GSD_PROJECT_VERSION_FILE
GSD_QUERY_FALLBACK
GSD_ROOT
GSD_RUNTIME
GSD_RUNTIME_PROFILE_MAP
GSD_SDK_SHIM
GSD_SESSION_KEY
GSD_SKIP_SCHEMA_CHECK
GSD_TEMPLATES_DIR
GSD_TEMP_DIR
GSD_TEST_MODE
GSD_TOOLS
GSD_TOOLS_PATH
GSD_TOOLS_SRC
GSD_TTY_MARKER
GSD_VERSION
GSD_WORKSTREAM
GSD_WS
```

## Decision

Use full rebrand depth. Every `GSD_*` env var renames to `OTO_*` in lockstep. The rename engine uses one `env_var` rule with prefix matching: `from: "GSD_"`, `to: "OTO_"`, `apply_to_pattern: "^GSD_[A-Z][A-Z0-9_]*$"`. Hook token `{{GSD_VERSION}}` becomes `{{OTO_VERSION}}`. Runtime-owned names such as `CLAUDE_PLUGIN_ROOT`, `CLAUDE_CONFIG_DIR`, `CODEX_HOME`, and `GEMINI_CONFIG_DIR` are not renamed and belong in `do_not_rename`.

## Rationale

Pitfall 1 says to choose once and stick. A prefix rule covers the full inventory in one place and avoids stale enumerations. The `GSD_CODEX_*` names are oto-internal markers, not Codex-owned env vars, so they rebrand too. `GSD_SDK_SHIM` becomes dead code under ADR-12 but still follows the rule wherever retained input mentions it.

## Consequences

Phase 2 must implement the prefix env-var rule and preserve runtime-owned env vars through `do_not_rename`. Phase 3 may delete dead Copilot and SDK env-var branches while trimming unsupported runtimes. Future docs should describe `OTO_*` names only.
