<purpose>
List all OTO workspaces found in ~/oto-workspaces/ with their status.
</purpose>

<required_reading>
Read all files referenced by the invoking prompt's execution_context before starting.
</required_reading>

<process>

## 1. Setup

```bash
INIT=$(oto-sdk query init.list-workspaces)
if [[ "$INIT" == @file:* ]]; then INIT=$(cat "${INIT#@file:}"); fi
```

Parse JSON for: `workspace_base`, `workspaces`, `workspace_count`.

## 2. Display

**If `workspace_count` is 0:**

```
No workspaces found in ~/oto-workspaces/

Create one with:
  /oto-new-workspace --name my-workspace --repos repo1,repo2
```

Done.

**If workspaces exist:**

Display a table:

```
OTO Workspaces (~/oto-workspaces/)

| Name | Repos | Strategy | OTO Project |
|------|-------|----------|-------------|
| feature-a | 3 | worktree | Yes |
| feature-b | 2 | clone | No |

Manage:
  cd ~/oto-workspaces/<name>     # Enter a workspace
  /oto-remove-workspace <name>   # Remove a workspace
```

For each workspace, show:
- **Name** — directory name
- **Repos** — count from init data
- **Strategy** — from WORKSPACE.md
- **OTO Project** — whether `.oto/PROJECT.md` exists (Yes/No)

</process>
