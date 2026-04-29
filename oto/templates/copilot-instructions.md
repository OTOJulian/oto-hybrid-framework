# Instructions for OTO

- Use the oto skill when the user asks for OTO or uses a `oto-*` command.
- Treat `/oto-...` or `oto-...` as command invocations and load the matching file from `.github/skills/oto-*`.
- When a command says to spawn a subagent, prefer a matching custom agent from `.github/agents`.
- Do not apply OTO workflows unless the user explicitly asks for them.
- After completing any `oto-*` command (or any deliverable it triggers: feature, bug fix, tests, docs, etc.), ALWAYS: (1) offer the user the next step by prompting via `ask_user`; repeat this feedback loop until the user explicitly indicates they are done.
