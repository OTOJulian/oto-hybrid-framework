# Gemini CLI Tool Mapping

Skills use Claude Code tool names. When you encounter these in a skill, use your platform equivalent:

| Skill references | Gemini CLI equivalent |
|-----------------|----------------------|
| `Read` (file reading) | `read_file` |
| `Write` (file creation) | `write_file` |
| `Edit` (file editing) | `replace` |
| `Bash` (run commands) | `run_shell_command` |
| `Grep` (search file content) | `grep_search` |
| `Glob` (search files by name) | `glob` |
| `TodoWrite` (task tracking) | `write_todos` |
| `Skill` tool (invoke a skill) | `activate_skill` |
| `WebSearch` | `google_web_search` |
| `WebFetch` | `web_fetch` |
| `Task` tool (dispatch subagent) | Subagents on Gemini CLI v0.38+: custom subagents are auto-discovered from `~/.gemini/agents/*.md`; each agent's `name:` is exposed as a tool to the main agent, and `@<agent-name>` can direct a prompt to that subagent. Parallel dispatch is supported in a single tool-use turn. |

## Subagent support

Gemini CLI v0.38+ supports subagents-as-tools. Skills that rely on subagent dispatch can instruct Gemini's main agent to call the agent-named tool, or use `@<agent-name>` at the start of a prompt when the desired target subagent is known.

## Additional Gemini CLI tools

These tools are available in Gemini CLI but have no Claude Code equivalent:

| Tool | Purpose |
|------|---------|
| `list_directory` | List files and subdirectories |
| `save_memory` | Persist facts to GEMINI.md across sessions |
| `ask_user` | Request structured input from the user |
| `tracker_create_task` | Rich task management (create, update, list, visualize) |
| `enter_plan_mode` / `exit_plan_mode` | Switch to read-only research mode before making changes |
