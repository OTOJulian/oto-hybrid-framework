# Phase 5: Hooks Port & Consolidation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in 05-CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-30
**Phase:** 05-hooks-port-consolidation
**Mode:** auto (recommended defaults selected without interactive Q&A)
**Areas discussed:** Hook source tree & build layout, SessionStart consolidation, Stale-hook detection, Hook registration in settings.json, Statusline content, Hook source language policy, Test surface

---

## Hook Source Tree & Build Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Use `oto/hooks/` as canonical source, build to `oto/hooks/dist/` | Aligns with already-populated Phase 4 baseline and `runtime-claude.cjs` source path | ✓ |
| Move sources to top-level `hooks/`, keep `oto/hooks/` as build output | Matches GSD's repo layout but requires Phase 4 redo | |
| Symlink `oto/hooks/dist/` to `oto/hooks/` (no separate build) | Simpler but breaks token substitution, vm validation | |

**User's choice:** [auto] Option 1 — already aligned with runtime adapter contract.
**Notes:** Update `scripts/build-hooks.js` to read from `oto/hooks/`; leave legacy top-level `hooks/` alone for now.

---

## Token Substitution Timing

| Option | Description | Selected |
|--------|-------------|----------|
| Build-time (in `scripts/build-hooks.js`) | Substitute when copying to `dist/` | |
| Install-time (in `bin/lib/copy-files.cjs` or sibling) | Substitute when installing into `~/.claude/hooks/` | ✓ |
| Runtime (read at hook invocation) | No substitution; hook reads version from filesystem | |

**User's choice:** [auto] Option 2 — install-time substitution keeps build artifact stable and lets the marker JSON carry the resolved version for stale-hook detection.

---

## SessionStart Consolidation Shape

| Option | Description | Selected |
|--------|-------------|----------|
| Single bash hook (`oto-session-start`, no extension) | Inline GSD state-reminder + Superpowers identity block; preserves runtime cascade | ✓ |
| Two hooks chained (oto-identity + oto-session-state) | Easier to disable parts, but violates ADR-04 single-block contract | |
| Convert to Node.js hook | Cleaner JSON escaping but balloons rewrite scope | |

**User's choice:** [auto] Option 1 — locked by ADR-04 single-block contract.
**Notes:** Identity block always-on; STATE.md reminder opt-in via `.oto/config.json` `hooks.session_state: true`.

---

## Identity Block Content

| Option | Description | Selected |
|--------|-------------|----------|
| Reference `oto:using-oto` skill (read SKILL.md from disk) | Symmetric with Superpowers shape; defers depth to Phase 6 skill content | ✓ |
| Inline static identity text | Simpler but Phase 6 skill duplicates content | |
| Just version string | Minimal but loses bootstrap value | |

**User's choice:** [auto] Option 1 with defensive fallback when SKILL.md is absent (Phase 5 ships before Phase 6).

---

## Runtime Detection Cascade

| Option | Description | Selected |
|--------|-------------|----------|
| Preserve upstream Cursor → Claude → Copilot/SDK cascade | Future-proofs `--all` install scenarios | ✓ |
| Strip to Claude-only (since v0.1.0 happy path is Claude) | Smaller surface area but breaks if Cursor is later installed | |

**User's choice:** [auto] Option 1 — Cursor branch retained even though out of project scope, because removing it could silently break a future `--all` install.

---

## Stale-Hook Detection on Upgrade

| Option | Description | Selected |
|--------|-------------|----------|
| Overwrite silently (record prior version in marker JSON) | Single-owner project, explicit upgrade gesture | ✓ |
| Warn-and-keep loop (GSD-style) | Useful for shared installs; overkill for personal use | |
| Hash-based integrity (sign and verify) | Stronger but adds maintenance | |

**User's choice:** [auto] Option 1 — fits personal-use cost ceiling.

---

## Settings.json Hook Registration

| Option | Description | Selected |
|--------|-------------|----------|
| Single oto-marker block via `mergeSettings` (preserve user entries) | Idempotent, round-tripable, matches existing oto marker convention | ✓ |
| Replace entire `settings.json` on install | Simpler logic but destroys user customization | |
| Per-hook separate marker blocks | Granular but multiplies merge complexity | |

**User's choice:** [auto] Option 1 — JSON-aware `_oto` top-level key (since `settings.json` is JSON not Markdown).

---

## Hook Source Language Policy

| Option | Description | Selected |
|--------|-------------|----------|
| Keep upstream choice (bash for `.sh`, Node for `.js`) | Lowest churn, matches upstream sync expectations | ✓ |
| Convert all to Node.js | Single language but balloons rewrite scope | |
| Convert all to bash | Easier shell-out but loses validation | |

**User's choice:** [auto] Option 1 — mixed-language fleet has been stable across 23+ upstream releases.

---

## Statusline Content

| Option | Description | Selected |
|--------|-------------|----------|
| Preserve upstream shape (`model | task | dir | context`) | Parity with GSD; `task` derives from `.oto/STATE.md` `stopped_at` | ✓ |
| Add phase / progress fields | Nice-to-have but defer until personal-use need surfaces | |
| Minimal (just current phase) | Loses useful at-a-glance info | |

**User's choice:** [auto] Option 1.

---

## Test Surface in Phase 5

| Option | Description | Selected |
|--------|-------------|----------|
| Focused 4-test suite (session-start output, build-hooks copy, token sub, mergeSettings round-trip) | Enough to lock the contract; defers CI rebuild to Phase 10 | ✓ |
| Full CI snapshot enforcement now | Pulls Phase 10 work forward; bloats Phase 5 | |
| No tests, manual verification only | Violates the "production-grade" bar even for personal use | |

**User's choice:** [auto] Option 1.

---

## Claude's Discretion

- Test filenames within the `05-NN-*.test.cjs` convention
- Whether the SessionStart fixture writer is folded into the verification test or stays standalone
- Whether `scripts/build-hooks.js` migrates to `bin/lib/build-hooks.cjs`
- Whether Codex/Gemini `mergeSettings` stubs land in Phase 5 (no-op) or Phase 8 (full implementation)

## Deferred Ideas

- Codex/Gemini hook parity — Phase 8
- Skill-auto-load deferral logic — Phase 6 (ships in `oto:using-oto` SKILL.md)
- CI snapshot enforcement of SessionStart output — Phase 10
- `--portable-hooks` flag for WSL/Docker — out of scope (Windows out-of-scope)
- Hook signing/hash integrity — deferred until threat justifies
