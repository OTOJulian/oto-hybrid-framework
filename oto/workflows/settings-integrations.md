<purpose>
Interactive configuration of third-party integrations for OTO — search API keys
(Brave / Firecrawl / Exa), code-review CLI routing (`review.models.<cli>`), and
agent-skill injection (`agent_skills.<agent-type>`). Search API keys are stored
in `~/.oto/<integration>_api_key` (mode 0600) via `oto-sdk query secret-*`
commands; `.oto/config.json` holds only their boolean enable flags. Review-model
routing and agent-skill injection still write `.oto/config.json` via
`oto-sdk query config-set`, preserving unrelated keys.

This command is deliberately separate from `/oto-settings` (workflow toggles)
and any `/oto-settings-advanced` tuning surface. It exists because API keys and
cross-tool routing are *connectivity* concerns, not workflow or tuning knobs.
</purpose>

<security>
**API keys are secrets.** They live ONLY in
`~/.oto/<integration>_api_key` (mode 0600) or their environment variables
(`EXA_API_KEY`, `BRAVE_API_KEY`, `FIRECRAWL_API_KEY`). They are NEVER written
to `.oto/config.json`: `exa_search`, `brave_search`, and `firecrawl` are
boolean-only, and both config write paths hard-reject strings.

- **Key entry is stdin/TTY-only.** For Set/Replace, direct the user to run
  `! oto-sdk query secret-set <slug>` themselves. The key travels directly
  from the terminal's hidden prompt to the process — never through argv, shell
  history, the conversation transcript, or Claude's context. Claude must NEVER
  ask for, receive, or echo a key value in chat.

- **Masking convention: `****<last-4>`** (e.g. `sk-abc123def456` → `****f456`).
  Strings shorter than 8 characters render as `****` with no tail so a short
  secret does not leak a meaningful fraction of its bytes. Unset values render
  as `(unset)`.
- **Agent-type and CLI slug validation.** `agent_skills.<agent-type>` and
  `review.models.<cli>` keys are matched against `^[a-zA-Z0-9_-]+$`. Inputs
  containing path separators (`/`, `\`, `..`), whitespace, or shell
  metacharacters are rejected. This closes off skill-injection attacks.
</security>

<required_reading>
Read all files referenced by the invoking prompt's execution_context before starting.
</required_reading>

<process>

<step name="ensure_and_load_config">
Resolve the active workstream through the canonical session-aware resolver,
then resolve the root-aware config path and ensure config exists via the
idempotent `config-new-project` (returns `already_exists` when present). Never
read pointer files directly or assume a particular planning-root name. Every
subsequent oto-sdk command MUST include the guarded expansion
`${WS_ARGS[@]+"${WS_ARGS[@]}"}` (portable under bash 3.2 with `set -u` when
the array is empty — never expand the array without the `WS_ARGS[@]+` guard).
Flat vs workstream routing per #2282 and WR-02:

```bash
# OTO Phase 15: native SDK handlers return structured JSON even with --raw.
WS_RESULT=$(oto-sdk query workstream get --raw 2>/dev/null || printf '{"active":null}')
WS=$(printf '%s' "$WS_RESULT" | node -e '
let input = "";
process.stdin.on("data", chunk => input += chunk);
process.stdin.on("end", () => {
  try { process.stdout.write(JSON.parse(input).active || "none"); }
  catch { process.stdout.write("none"); }
});')
WS_ARGS=()
if [[ -n "$WS" && "$WS" != "none" ]]; then
  WS_ARGS=(--ws "$WS")
fi
OTO_CONFIG_RESULT=$(oto-sdk query config-path ${WS_ARGS[@]+"${WS_ARGS[@]}"})
OTO_CONFIG_PATH=$(printf '%s' "$OTO_CONFIG_RESULT" | node -e '
let input = "";
process.stdin.on("data", chunk => input += chunk);
process.stdin.on("end", () => process.stdout.write(JSON.parse(input).path));')
oto-sdk query config-new-project ${WS_ARGS[@]+"${WS_ARGS[@]}"}
```

Store `$OTO_CONFIG_PATH` and `WS_ARGS`. The tool resolves the project planning
root, including migrated roots, while every subsequent read/write is threaded
through `${WS_ARGS[@]+"${WS_ARGS[@]}"}` so it targets this config.
</step>

<step name="read_status">
Read the current integration status through the secret-aware command and read
the non-secret local-search flag from config:

```bash
oto-sdk query secret-status ${WS_ARGS[@]+"${WS_ARGS[@]}"}
SEARCH_GITIGNORED=$(oto-sdk query config-get search_gitignored ${WS_ARGS[@]+"${WS_ARGS[@]}"} 2>/dev/null || echo false)
```

Show the `secret-status` lines verbatim; they are already masked and include
the boolean flag plus key source. Examples of the exact output shape:

```text
Exa: enabled — key from env EXA_API_KEY (****4f2a)
Brave: enabled — key from ~/.oto/brave_api_key (****9c1e)
Firecrawl: disabled — no key detected
```

When an environment variable wins over a keyfile, preserve the command's
shadowed-keyfile note. Determine whether an integration is keyed from this
reported source, never from the config flag alone.

<!-- OTO Phase 15: live Exa MCP registration status (MCP-09 / D-11). -->
Then query every runtime's live registration state:

```bash
MCP_STATUS=$(oto-sdk query mcp-status ${WS_ARGS[@]+"${WS_ARGS[@]}"})
MCP_RUNTIMES=$(oto-sdk query mcp-status --pick runtimes ${WS_ARGS[@]+"${WS_ARGS[@]}"})
```

Show `$MCP_STATUS` verbatim. Its pre-formatted output contains one line for
each runtime and then any coherence warnings, for example:

```text
exa MCP [claude]: oto-managed (/Users/me/.claude.json)
exa MCP [codex]: not-registered (/Users/me/.codex/config.toml)
exa MCP [gemini]: not-installed (/Users/me/.gemini/settings.json)
oto: exa_search is enabled but the exa MCP server is not registered in any runtime — run /oto-settings-integrations
```

Use the structured `$MCP_RUNTIMES` array when constructing actions. Never
infer runtime availability from a directory path or from the Exa key alone.
</step>

<step name="section_1_search_integrations">

**Text mode (`workflow.text_mode: true` or `--text` flag):** Set
`TEXT_MODE=true` and replace every `AskUserQuestion` call with a plain-text
numbered list. Required for non-Claude runtimes.

Ask the user what they want to do for each search API key. Determine keyedness
from `secret-status`: when a source is reported, show its masked value and
offer Leave / Replace / Clear; when no key is detected, offer Skip / Set. A
boolean config flag by itself does not mean a key is present.

```text
AskUserQuestion([
  {
    question: "Brave Search API key — used for web research during plan/discuss phases",
    header: "Brave",
    multiSelect: false,
    options: [
      // When already set:
      { label: "Leave (**** already set)", description: "Keep the detected key source" },
      { label: "Replace", description: "Replace the key through a hidden terminal prompt" },
      { label: "Clear", description: "Remove the stored keyfile and disable the flag" }
      // When unset:
      // { label: "Skip", description: "Leave unset" },
      // { label: "Set", description: "Set a key through a hidden terminal prompt" }
    ]
  },
  {
    question: "Firecrawl API key — used for deep-crawl scraping",
    header: "Firecrawl",
    multiSelect: false,
    options: [ /* same Leave/Replace/Clear or Skip/Set */ ]
  },
  {
    question: "Exa Search API key — used for semantic search",
    header: "Exa",
    multiSelect: false,
    options: [ /* same Leave/Replace/Clear or Skip/Set */ ]
  },
  {
    question: "Include gitignored files in local code searches?",
    header: "Gitignored",
    multiSelect: false,
    options: [
      { label: "No (Recommended)", description: "Respect .gitignore. Safer — excludes secrets, node_modules, build artifacts." },
      { label: "Yes", description: "Include gitignored files. Useful when secrets/artifacts genuinely contain searchable intent." }
    ]
  }
])
```

For each "Set" or "Replace", NEVER ask for the key in chat and NEVER place it
in a command argument. Tell the user to run the integration's command
themselves using this exact prompt (substitute the selected slug):

Before **Replace**, display exactly (substitute the selected slug):

```text
This key is shared by the root project and all workstreams — replacing it affects every context that uses <slug>.
```

Then require an explicit confirmation with **No as the default**:

```text
AskUserQuestion([
  {
    question: "Replace this globally shared key?",
    header: "Confirm Replace",
    multiSelect: false,
    options: [
      { label: "No (default)", description: "Leave the global key unchanged" },
      { label: "Yes, replace", description: "Continue to the hidden terminal prompt" }
    ]
  }
])
```

Only a positive `Yes, replace` response may proceed to `secret-set`. A No
response or an empty/dismissed response returns to the integration menu
without running any secret command.

```text
Run this yourself (the ! prefix runs it in your terminal; the key is
entered at a hidden prompt and never appears in this conversation):

  ! oto-sdk query secret-set <slug>

Then reply "done" (or "skip") to continue.
```

When a workstream is active (WS non-empty), print the command WITH the flag
so the boolean lands in the active config:
`! oto-sdk query secret-set <slug> --ws <ws-name>` (substitute the actual
name; the key entry itself is unchanged — hidden prompt, never argv).

Use the exact command for the selected integration (append `--ws <ws-name>`
to each when a workstream is active):

```text
Brave:    ! oto-sdk query secret-set brave
Firecrawl: ! oto-sdk query secret-set firecrawl
Exa:      ! oto-sdk query secret-set exa
```

After the user replies `done`, run
`oto-sdk query secret-status <slug> ${WS_ARGS[@]+"${WS_ARGS[@]}"}` and
show its single masked line verbatim. After `skip`, leave the integration
unchanged.

For **Clear**, first display exactly (substitute the selected slug):

```text
This key is shared by the root project and all workstreams — clearing it affects every context that uses <slug>.
```

Require a separate explicit confirmation with **No as the default**:

```text
AskUserQuestion([
  {
    question: "Clear this globally shared key?",
    header: "Confirm Clear",
    multiSelect: false,
    options: [
      { label: "No (default)", description: "Leave the global key and flags unchanged" },
      { label: "Yes, clear", description: "Remove the global keyfile and reconcile enabled flags" }
    ]
  }
])
```

Only after `Yes, clear`, run
`oto-sdk query secret-clear <slug> ${WS_ARGS[@]+"${WS_ARGS[@]}"}`. Show the
command's one-line result verbatim, including its
`env still set — integration remains available` notice when an environment
variable continues to provide the key.

After a completed Clear, reconcile boolean enable flags without reading key
bytes. Check the root layer with
`oto-sdk query config-get <config_key>` and, when a workstream is active, its
layer with
`oto-sdk query config-get <config_key> ${WS_ARGS[@]+"${WS_ARGS[@]}"}`. Also
obtain the other detected workstream names from
`oto-sdk query workstream list --pick workstreams` and check each with
`oto-sdk query config-get <config_key> --ws <workstream>`. If any layer still
reports `true`, show the coherence warning from a fresh
`oto-sdk query mcp-status ${WS_ARGS[@]+"${WS_ARGS[@]}"}` and offer to disable
that layer with `oto-sdk query config-set <config_key> false` plus the matching
`--ws <workstream>` when applicable. Do not silently alter another layer.

Write the non-secret local-search choice as before:

```bash
oto-sdk query config-set search_gitignored true|false ${WS_ARGS[@]+"${WS_ARGS[@]}"}
```
</step>

<step name="section_1b_exa_mcp_registration">
<!-- OTO Phase 15: settings-driven register-later path (D-05 / D-11 / D-13). -->
Build this menu from the structured result of
`oto-sdk query mcp-status --pick runtimes ${WS_ARGS[@]+"${WS_ARGS[@]}"}`:

- For `not-installed`, show status only and **do not offer** Register or
  Unregister. OTO does not pre-register absent runtimes.
- For `user-owned`, display: `The existing exa entry is user-owned, not
  oto-managed; oto will not overwrite it — resolve manually before
  registering.` Do not offer Register or Unregister.
- For `not-registered`, offer Register.
- For `oto-managed`, `drifted`, or `missing-but-expected`, offer Unregister.
  For `drifted`, also explain that fingerprint protection may leave the
  modified entry in place.

For Register, run the selected detected runtime through the installer's shared
consent path (substitute only `claude`, `codex`, or `gemini`):

```bash
oto install --<runtime> --register-exa-mcp
```

For Unregister, run:

```bash
oto install --<runtime> --unregister-exa-mcp
```

After either action, re-run
`oto-sdk query mcp-status ${WS_ARGS[@]+"${WS_ARGS[@]}"}` and show every new
status/warning line verbatim before returning to the menu. Registration and
unregistration commands never carry API-key bytes.
</step>

<step name="section_2_review_models">

`review.models.<cli>` is a map that tells the code-review workflow which
shell command to invoke for a given reviewer flavor. Supported flavors:
`claude`, `codex`, `gemini`, `opencode`.

```text
AskUserQuestion([
  {
    question: "Which reviewer CLI do you want to configure?",
    header: "CLI",
    multiSelect: false,
    options: [
      { label: "Claude", description: "review.models.claude — defaults to session model when unset" },
      { label: "Codex", description: "review.models.codex — e.g. 'codex exec --model gpt-5'" },
      { label: "Gemini", description: "review.models.gemini — e.g. 'gemini -m gemini-2.5-pro'" },
      { label: "OpenCode", description: "review.models.opencode — e.g. 'opencode run --model claude-sonnet-4'" },
      { label: "Done", description: "Skip — finish this section" }
    ]
  }
])
```

For the selected CLI, show the current value (or `(unset)`) and offer
Leave / Replace / Clear, followed by a text-input prompt for the new command
string. Write via:

```bash
oto-sdk query config-set review.models.<cli> "<command string>" ${WS_ARGS[@]+"${WS_ARGS[@]}"}
```

Loop until the user selects "Done".

The `review.models.<cli>` key is validated by the dynamic pattern
`^review\.models\.[a-zA-Z0-9_-]+$`. Empty CLI slugs and path-containing slugs
are rejected by `config-set` before any write.
</step>

<step name="section_3_agent_skills">

`agent_skills.<agent-type>` injects extra skill names into an agent's spawn
frontmatter. The slug is user-extensible, so input is free-text validated
against `^[a-zA-Z0-9_-]+$`. Inputs with path separators, spaces, or shell
metacharacters are rejected.

```text
AskUserQuestion([
  {
    question: "Configure agent_skills for which agent type?",
    header: "Agent Type",
    multiSelect: false,
    options: [
      { label: "oto-executor", description: "Skills injected when spawning executor agents" },
      { label: "oto-planner", description: "Skills injected when spawning planner agents" },
      { label: "oto-verifier", description: "Skills injected when spawning verifier agents" },
      { label: "Custom…", description: "Enter a custom agent-type slug" },
      { label: "Done", description: "Skip — finish this section" }
    ]
  }
])
```

For "Custom…", prompt for a slug and validate it matches
`^[a-zA-Z0-9_-]+$`. If it fails validation, print:

```text
Rejected: agent-type '<slug>' must match [a-zA-Z0-9_-]+ (no path separators,
spaces, or shell metacharacters).
```

and re-prompt.

For a selected slug, prompt for the comma-separated skill list (text input).
Show the current value if any, offer Leave / Replace / Clear. After collecting
the text input, split on `,`, trim each entry, and drop empty entries. Validate
EACH resulting skill name against `^(global:)?[a-zA-Z0-9_-]+$`. If any entry
fails validation, print the existing rejection message naming the offending
entry and re-prompt; never write a partial list. Persist the validated names as
a JSON array via:

```bash
oto-sdk query config-set agent_skills.<slug> '["skill-a","skill-b"]' ${WS_ARGS[@]+"${WS_ARGS[@]}"}
```

Loop until "Done".
</step>

<step name="confirm">
Run a final `oto-sdk query secret-status ${WS_ARGS[@]+"${WS_ARGS[@]}"}` and
build the Search Integrations table only from those pre-masked lines. **No
plaintext API keys appear in this output under any circumstance.**

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 OTO ► INTEGRATIONS UPDATED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Config: $OTO_CONFIG_PATH

Search Integrations
| Integration | Enabled | Key source                         | Key          |
|-------------|---------|------------------------------------|--------------|
| Exa         | true    | env EXA_API_KEY                    | ****4f2a     |
| Brave       | true    | ~/.oto/brave_api_key               | ****9c1e     |
| Firecrawl   | false   | —                                  | (unset)      |

search_gitignored: true | false

Code Review CLI Routing
| CLI         | Command                              |
|-------------|--------------------------------------|
| claude      | <value or (session model default)>   |
| codex       | <value or (unset)>                   |
| gemini      | <value or (unset)>                   |
| opencode    | <value or (unset)>                   |

Agent Skills Injection
| Agent Type       | Skills                    |
|------------------|---------------------------|
| <slug>           | <skill-a, skill-b>        |
| ...              | ...                       |

Notes:
- API keys live in ~/.oto/<integration>_api_key (mode 0600) or env vars —
  never in .oto/config.json (boolean flags only).
- Keys are entered via a hidden terminal prompt (secret-set), never through
  this conversation, argv, or shell history; displays are always masked.

Quick commands:
- /oto-settings — workflow toggles and model profile
- /oto-set-profile <profile> — switch model profile
```
</step>

</process>

<success_criteria>
- [ ] Active workstream resolved once; the guarded `${WS_ARGS[@]+"${WS_ARGS[@]}"}` expansion threaded through every oto-sdk command; confirmation shows `$OTO_CONFIG_PATH`
- [ ] Entry uses idempotent `config-new-project` (never the argument-less legacy ensure-section call, which exits 10)
- [ ] User presented with three sections: Search Integrations, Review CLI Routing, Agent Skills Injection
- [ ] API keys written only to `~/.oto/<integration>_api_key` (0600) via secret-set stdin/TTY; config.json holds booleans only; nothing plaintext ever echoed, logged, or displayed
- [ ] Set/Replace guidance uses the `! oto-sdk query secret-set` flow; Clear uses `secret-clear`
- [ ] Masked confirmation table uses `****<last-4>` for set keys and `(unset)` for null
- [ ] `review.models.<cli>` and `agent_skills.<agent-type>` keys validated against `[a-zA-Z0-9_-]+`; each skill NAME is validated against `[a-zA-Z0-9_-]+` with an optional `global:` prefix before the JSON-array write
- [ ] Config merge preserves all keys outside the three sections this workflow owns
</success_criteria>
