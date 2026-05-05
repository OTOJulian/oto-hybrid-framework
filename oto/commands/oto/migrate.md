---
name: oto:migrate
description: Convert a GSD-era project's planning artifacts to oto's command surface. Dry-run by default; pass --apply to write.
argument-hint: "[--dry-run | --apply] [--rename-state-dir] [--scope planning|all|minimal] [--no-backup] [--force] [--project-dir <path>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

<objective>
Migrate a project that was previously set up by Get Shit Done (GSD) so its planning artifacts and instruction files speak oto's command surface.

Migrate is a project-level converter, not an installer. It operates on the user's project tree, including planning state, roadmap, project docs, phase directories, and root-level `CLAUDE.md` / `AGENTS.md` / `GEMINI.md`. It does not touch the user's runtime config dirs (`~/.claude/`, `~/.codex/`, `~/.gemini/`); those remain owned by `oto install`.

Default behavior is dry-run: produce a classified report and write nothing. The user must pass `--apply` for migrate to make changes. A timestamped backup is created at `.oto-migrate-backup/<timestamp>/` unless `--no-backup` is given.

Migrate is idempotent: running `--apply` on an already migrated project is a zero-change no-op. Migrate refuses to operate on a half-migrated tree, where both `<!-- GSD:* -->` and `<!-- OTO:* -->` markers exist, unless `--force` is passed.
</objective>

<execution_context>
No dedicated workflow file is required for this command surface; call the local `oto-tools migrate` implementation directly.
</execution_context>

<context>
$ARGUMENTS
</context>

<process>
1. Resolve the project directory from `$ARGUMENTS`; default to the current project root when `--project-dir` is not supplied.
2. Run `oto-tools migrate --dry-run` first unless the user explicitly supplied `--apply`.
3. Present the dry-run summary, including changed file count, detected GSD-era signals, conflicts, and whether the legacy planning state directory will remain in place.
4. Ask for explicit user approval before running `oto-tools migrate --apply` unless the original arguments already included `--apply`.
5. When applying, pass through `--rename-state-dir`, `--scope`, `--no-backup`, `--force`, and `--project-dir` exactly as supplied.
6. Report the final exit status and backup directory, then recommend reviewing the project diff before continuing with other workflow commands.
</process>
