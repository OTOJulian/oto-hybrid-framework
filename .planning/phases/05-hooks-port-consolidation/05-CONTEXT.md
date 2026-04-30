# Phase 5: Hooks Port & Consolidation - Context

**Gathered:** 2026-04-30
**Status:** Ready for planning
**Mode:** auto (recommended defaults selected)

<domain>
## Phase Boundary

Port and consolidate GSD's and Superpowers' hooks fleet into a single coherent surface under the runtime payload at `oto/hooks/`, with one SessionStart entrypoint, version-tagged hook sources, and Claude-side `settings.json` registration that the installer wires up at install time.

Bounded by ROADMAP Phase 5 and REQUIREMENTS HK-01..07. The retained hook set is locked in `decisions/file-inventory.json`:

- **Consolidated SessionStart** (HK-01) — `hooks/oto-session-start` (merge of GSD `gsd-session-state.sh` + Superpowers `hooks/session-start`)
- **Statusline** (HK-02) — `hooks/oto-statusline.js`
- **Context-monitor** (HK-03) — `hooks/oto-context-monitor.js`
- **Prompt-guard** (HK-04) — `hooks/oto-prompt-guard.js`
- **Read-injection-scanner** (HK-05) — `hooks/oto-read-injection-scanner.js`
- **Validate-commit** (HK-06) — `hooks/oto-validate-commit.sh`
- **Version token rewrite** (HK-07) — `# oto-hook-version: {{OTO_VERSION}}` substituted at install time, stale-hook detection on upgrade

Out of scope (locked by inventory drop verdicts and adjacent-phase boundaries):
- `gsd-check-update*`, `gsd-phase-boundary.sh`, `gsd-read-guard.js`, `gsd-workflow-guard.js` — dropped per inventory; do not resurrect
- Codex/Gemini hook registration parity — Phase 8 (`runtime-codex.cjs` / `runtime-gemini.cjs` `mergeSettings` may stub; Claude is the v0.1.0 happy path per MR-01 / D-12 from Phase 1)
- Skill auto-invocation gating from SessionStart (`oto:using-oto` defer logic) — Phase 6 (SessionStart hook only emits the bootstrap; the skill's deferral logic ships with the skill)
- CI snapshot enforcement and license-attribution checks — Phase 10
- Workspaces/workstreams hook integrations — Phase 7 (if any)

</domain>

<decisions>
## Implementation Decisions

### Hook Source Tree & Build Layout
- **D-01:** Canonical hook source location is `oto/hooks/` (already populated by Phase 4 rebrand baseline). Installer reads built hooks from `oto/hooks/dist/`. Top-level `hooks/` (with stub `hooks/dist/`) is the legacy upstream layout — leave it untouched for now (still referenced by `scripts/build-hooks.js` defaults) and update the build script to write to `oto/hooks/dist/`. The runtime adapter `bin/lib/runtime-claude.cjs` (`sourceDirs.hooks: 'oto/hooks/dist'`) is authoritative.
- **D-02:** `scripts/build-hooks.js` reads from `oto/hooks/` and writes validated copies to `oto/hooks/dist/`. JS hooks pass through `vm.Script` syntax validation (existing pattern); shell hooks are copied with executable bit preserved. `npm run prepare` (which runs on `npm install -g github:...` per Pitfall 5) invokes the build.
- **D-03:** Token substitution (`{{OTO_VERSION}}` → real semver) happens at **install time** inside the per-runtime adapter, not at build time. Rationale: the build runs once at package install; the version string is correct at that moment, but installing the same package into multiple runtimes with different lifecycle paths is cleaner if the install-time copy substitutes. Implementation: extend `bin/lib/copy-files.cjs` (or a sibling helper) with a `tokenReplace` pass keyed by file extension allowlist (`.js`, `.cjs`, `.sh`).

### SessionStart Consolidation (HK-01, ADR-04, Pitfall 8 + 15)
- **D-04:** Single SessionStart entrypoint named `oto-session-start` (no extension; mirrors Superpowers' shape; bash). It is the only hook registered on `SessionStart` by the Claude installer. GSD's session-state.sh logic is **inlined** into this hook; Superpowers' identity-block emission is **inlined and rebranded** into this hook. No companion SessionStart hook is shipped.
- **D-05:** Identity-block content (rebranded; literal-string scan per Pitfall 15):
  ```
  <EXTREMELY_IMPORTANT>
  You are using oto.

  Below is the full content of your 'oto:using-oto' skill — your introduction to using oto skills.
  For all other skills, use the Skill tool.

  {{contents of oto/skills/using-oto/SKILL.md, escaped for JSON}}
  </EXTREMELY_IMPORTANT>
  ```
  No reference to "superpowers" or "GSD" remains. The block is emitted unconditionally (always-on for the identity primer) — per ADR-04 Consequences, this is the regression baseline.
- **D-06:** The skill file `oto/skills/using-oto/SKILL.md` does not yet exist (it ships in Phase 6, SKL-07). Phase 5 SessionStart hook reads the file defensively: if missing, emit a placeholder identity block (`oto v{{OTO_VERSION}} is installed. The 'oto:using-oto' skill ships in Phase 6.`) so Phase 5 ships green and Phase 6 backfills the content. Phase 6 is not a hard precondition for Phase 5 closeout.
- **D-07:** Project-state reminder (GSD's session-state.sh contribution) is appended to the identity block, **opt-in** via `.oto/config.json` `hooks.session_state: true` (renamed from upstream `hooks.community: true` for cleaner semantics). Default off — most personal-use sessions don't want STATE.md head re-injected on every SessionStart. When opt-in is on, the head of `.oto/STATE.md` (first 20 lines) is concatenated after the identity block, separated by `\n\n## Project State Reminder\n\n`.
- **D-08:** Runtime-detection cascade preserved verbatim from upstream Superpowers session-start (Cursor → Claude Code → Copilot/SDK-default). Cursor branch is left in place even though oto's v0.1.0 happy path is Claude-only — removing it would silently break a Cursor user who installs from `--all`. The branches that are **removed** are OpenCode, Kilo, Windsurf, Augment, Trae, Qwen, CodeBuddy, Cline, Antigravity (these never had branches in upstream Superpowers — confirmed by re-reading the upstream hook).
- **D-09:** SessionStart-output snapshot fixture lives at `oto/hooks/__fixtures__/session-start-claude.json` (Claude-runtime variant — the v0.1.0 baseline). It captures the exact `hookSpecificOutput.additionalContext` JSON for a session where `using-oto` SKILL.md is the Phase-6 placeholder. The fixture is the regression baseline contract from ADR-04 / D-09 of Phase 1. Phase 10 promotes it to a CI check; Phase 5 ships it as a static file with a one-line note in `oto/hooks/README.md`.

### Stale-Hook Detection & Version Token (HK-07, Pitfall 20)
- **D-10:** Every hook source file (`.js`, `.cjs`, `.sh`, and the extensionless `oto-session-start`) carries `# oto-hook-version: {{OTO_VERSION}}` (or `// oto-hook-version: {{OTO_VERSION}}` for `.js`/`.cjs`) on line 2 (line 1 is the shebang). The installer's token substitution pass writes the real version on copy; no template engine — plain string replace on `{{OTO_VERSION}}` only.
- **D-11:** Stale-hook detection on upgrade: when `oto install --claude` runs and detects an existing oto hook in `~/.claude/hooks/<name>` whose version token does not match the package's current version, the installer overwrites it (no warning loop) and records the prior version in the marker JSON. Rationale: oto has a single owner (the user) and `npm install -g github:owner/repo#vX.Y.Z` is the explicit upgrade gesture — reaching the install path means the user wants the new version. The "warn-and-keep" behavior in upstream GSD is overkill for personal-use scope.

### Hook Registration in `~/.claude/settings.json` (the runtime contract)
- **D-12:** `runtime-claude.cjs::mergeSettings` registers exactly one entry per retained hook in `~/.claude/settings.json`, scoped to oto's marker block:
  - `SessionStart` → `<configDir>/hooks/oto-session-start`
  - `PreToolUse` → `<configDir>/hooks/oto-prompt-guard.js` (matchers: any tool call)
  - `PostToolUse` → `<configDir>/hooks/oto-read-injection-scanner.js` (matchers: `Read`)
  - `PostToolUse` → `<configDir>/hooks/oto-validate-commit.sh` (matchers: `Bash` with `git commit` pattern)
  - `Statusline` → `<configDir>/hooks/oto-statusline.js`
  - `Stop` (or per Claude Code's exact event name for context-monitor) → `<configDir>/hooks/oto-context-monitor.js`

  Exact Claude Code event names per hook are confirmed by reading the upstream GSD installer's hook registration section before writing the merge function — researcher should cite the line numbers.
- **D-13:** Marker block format follows the existing oto pattern (a single `<!-- oto:hooks v{{OTO_VERSION}} -->` … `<!-- /oto:hooks -->` JSON-aware fenced region or, since `settings.json` is JSON not Markdown, an `_oto` top-level key with a `version` field and a list of installed hook entries — chosen format aligns with how the runtime-claude adapter manages other settings markers; the installer must round-trip user-authored entries unchanged).
- **D-14:** Uninstall removes only the `_oto`-marked hook entries from `settings.json`; it does **not** remove user-authored entries even if they share an event name. Idempotent re-install preserves user content.

### Statusline (HK-02)
- **D-15:** Statusline reads from `.oto/STATE.md` (already correct in the rebranded source). Display shape preserved from upstream (`model | current task | directory | context usage`), with `current task` derived from `STATE.md` `stopped_at` field. No additional fields added in Phase 5 — keep parity with upstream behavior, then extend in later milestones if the personal-use flow warrants it.

### Hook Source Language Policy
- **D-16:** Keep upstream language choice per hook — bash for `oto-session-start` and `oto-validate-commit.sh`; Node.js for the four `.js` hooks. No conversion to a single language. Rationale: rewriting bash to Node would balloon Phase 5 scope, drift from upstream during sync, and create a Windows-portability burden that's already declared out of scope. The pattern matches GSD's mixed-language fleet, which has been stable across 23+ minor releases.

### Test Surface (Phase-Bounded)
- **D-17:** Phase 5 ships **focused** `node:test` files only — not a full CI rebuild (Phase 10 owns that):
  1. `oto-session-start` outputs a JSON document with exactly one `<EXTREMELY_IMPORTANT>` block, no `superpowers` or `gsd` substring (excluding the runtime-detection comments), and the correct top-level field per platform env var.
  2. The build-hooks script writes 6 files into `oto/hooks/dist/` (matching the inventory's keep set) and exits 0 on a clean tree.
  3. Token substitution on a fixture string produces a valid semver-shaped output and round-trips (substituted file with the version pattern replaced back yields the original template).
  4. `mergeSettings` round-trip: given a fixture `settings.json` with user-authored entries, oto's merge adds its block, a second merge is idempotent, an unmerge removes only oto's block.
- **D-18:** Phase 5 does **not** ship the runtime parity tests for Codex/Gemini hooks (Phase 8) nor full SessionStart fixture CI enforcement (Phase 10). It ships the Claude fixture as a static file with a TODO comment pointing at Phase 10.

### Claude's Discretion
- Exact filenames for test files (`05-NN-*.test.cjs` per phase convention)
- Whether to fold the SessionStart fixture writer into the test that verifies the hook output, or keep it as a standalone golden-file
- Whether to add a `--portable-hooks` style flag to the installer in Phase 5 (defaults: not in scope; revisit in Phase 8 parity work — D-12 above stays Claude-focused)
- Whether to refactor `scripts/build-hooks.js` into `bin/lib/build-hooks.cjs` (kept loose; planner can choose based on whether other adapter entry points need it)

### Folded Todos
None — todo cross-reference returned 0 matches relevant to hooks.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project, requirements, and prior phase scope
- `.planning/PROJECT.md` — Personal-use cost ceiling, runtime targets, out-of-scope list.
- `.planning/REQUIREMENTS.md` — HK-01..07 active in this phase; SKL-07 (`oto:using-oto`) is the Phase 6 dependency referenced by D-06.
- `.planning/STATE.md` — Phase 04 complete; Phase 05 ready to plan.
- `.planning/ROADMAP.md` §"Phase 5: Hooks Port & Consolidation" — Phase goal and 6 success criteria.

### Locked prior decisions
- `.planning/phases/01-inventory-architecture-decisions/01-CONTEXT.md` — D-01/D-02 (`.oto/` state root), D-04 (env-var rename: `GSD_VERSION` → `OTO_VERSION`; hook token `{{GSD_VERSION}}` → `{{OTO_VERSION}}`), D-08 (single SessionStart consolidation), D-09 (snapshot fixture as regression baseline).
- `.planning/phases/02-rebrand-engine-distribution-skeleton/02-CONTEXT.md` — Rebrand engine output contracts; Phase 5 hooks are downstream of the engine's apply pass.
- `.planning/phases/03-installer-fork-claude-adapter/03-CONTEXT.md` — Per-runtime adapter pattern; `mergeSettings` is the hook registration entry point; marker convention.
- `.planning/phases/04-core-workflows-agents-port/04-CONTEXT.md` — Generated baseline at `oto/hooks/` already exists; Phase 5 patches it (D-04 of Phase 4 says generated output yields to prior decisions).

### Architecture decisions and audits
- `decisions/ADR-02-env-var-prefix.md` — `OTO_*` env-var policy and `{{OTO_VERSION}}` substitution lockdown.
- `decisions/ADR-04-sessionstart.md` §Decision, §Consequences — Single hook, hand-rebrand of literal identity strings, snapshot baseline ownership.
- `decisions/file-inventory.json` — Authoritative keep/drop verdicts for every hook file in both upstreams (search for `"hooks/"` paths). Target paths use the `oto-` prefix.
- `decisions/file-inventory.md` — Human index of the same.
- `rename-map.json` — Identifier, path, command, env-var, and URL rules already applied by the Phase 4 baseline; Phase 5 fixups only patch what consolidation requires (no engine reruns expected).

### Pitfall coverage (this phase blocks)
- `.planning/research/PITFALLS.md` §"Pitfall 8: Hooks fire in unspecified order" — Addressed by D-04 (one entrypoint), D-12 (single registration block).
- `.planning/research/PITFALLS.md` §"Pitfall 15: Hook injection of literal strings exposes upstream identity" — Addressed by D-05 (rebranded identity block), D-09 (snapshot fixture).
- `.planning/research/PITFALLS.md` §"Pitfall 20: GSD bash hooks with `{{GSD_VERSION}}` token substitution" — Addressed by D-03 (install-time substitution pass), D-10 (token format).

### Upstream sources (read for inventory diff only — do not rebrand)
- `foundation-frameworks/superpowers-main/hooks/session-start` — Source for the identity-block emission, runtime-detection cascade, and JSON-escape function used in D-05/D-08.
- `foundation-frameworks/get-shit-done-main/hooks/gsd-session-state.sh` — Source for the project-state-reminder logic used in D-07.
- `foundation-frameworks/get-shit-done-main/hooks/gsd-statusline.js` — Source for the statusline content shape used in D-15.
- `foundation-frameworks/get-shit-done-main/hooks/gsd-context-monitor.js`, `gsd-prompt-guard.js`, `gsd-read-injection-scanner.js`, `gsd-validate-commit.sh` — Source bodies; rebrand engine already emitted oto/ versions, Phase 5 verifies them.
- `foundation-frameworks/get-shit-done-main/scripts/build-hooks.js` — Pattern for D-02 (vm.Script validation, allowlist, executable-bit preservation).
- `foundation-frameworks/get-shit-done-main/bin/install.js` (around lines 500–520 and the Claude `settings.json` merge section) — Reference for `mergeSettings` event registration shape; researcher should cite line numbers for the planner.

### Existing oto code touched by Phase 5
- `bin/lib/runtime-claude.cjs` — `mergeSettings` is currently a no-op; D-12/D-13 fill it in. `sourceDirs.hooks` is already correct (`oto/hooks/dist`).
- `bin/lib/copy-files.cjs` — D-03 token substitution pass attaches here (or sibling helper).
- `bin/lib/install-state.cjs` — D-11 marker JSON gains a `hooks.version` field for stale-hook detection.
- `scripts/build-hooks.js` — D-01/D-02 path retarget (top-level `hooks/` → `oto/hooks/`).
- `oto/hooks/oto-session-start` — Rewrite to consolidated form per D-04..D-09.
- `oto/hooks/oto-{statusline,context-monitor,prompt-guard,read-injection-scanner,validate-commit}.{js,sh}` — Verify rebrand correctness, ensure version token line is present.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`oto/hooks/` already populated by Phase 4 rebrand baseline** — 6 files exist with content rebranded from upstream. Phase 5 patches the SessionStart consolidation and fills the version-token line; the other four `.js` hooks and `.sh` validate-commit are likely production-ready as-is and only need verification.
- **`scripts/build-hooks.js`** — Existing vm.Script-validating copy script, ready to retarget to `oto/hooks/` source dir.
- **`bin/lib/copy-files.cjs`** — `copyTree` is the natural insertion point for the token-substitution pass (D-03).
- **`bin/lib/install.cjs`** — Already handles per-runtime payload copy and marker recording; Phase 5 extends the marker schema (D-11) and the post-copy hook-registration call.
- **`bin/lib/marker.cjs`** — Existing dual-marker convention (`bin/lib/runtime-claude.cjs::onPreInstall` already calls `findUpstreamMarkers`); `mergeSettings` (D-12/D-13) reuses the same pattern for `settings.json`.
- **Runtime adapters at `bin/lib/runtime-{claude,codex,gemini}.cjs`** — Codex/Gemini variants will get stub `mergeSettings` returning `existingText` until Phase 8 (no parity work in Phase 5).

### Established Patterns (carry forward from Phases 1-4)
- Top-level Node 22+ CommonJS, `node:test`, no top-level TypeScript, no top-level build (per CLAUDE.md and STACK.md).
- Markdown-with-frontmatter for agents/commands/skills; hooks are plain executables (`.js`, `.sh`, extensionless bash).
- Marker-bracketed merge regions for everything injected into runtime config files (`CLAUDE.md` instruction block, `settings.json` hook block).
- Rebrand-engine output is provisional; per Phase 4 D-04, prior decisions win when generated output conflicts — Phase 5 patches `oto/hooks/oto-session-start` (the rebrand engine couldn't have known about the consolidation).
- Phase-scoped tests (`node:test`) ship in `tests/` co-located with the area under test; Phase 10 owns the full CI matrix.

### Integration Points
- **Installer entry**: `bin/install.js` → `bin/lib/install.cjs` → per-runtime adapter (`runtime-claude.cjs::mergeSettings`, `onPostInstall`) → `~/.claude/settings.json` updated with hook registration.
- **Build entry**: `npm run prepare` (runs on `npm install -g github:...`) → `node scripts/build-hooks.js` → `oto/hooks/dist/` populated.
- **Runtime entry**: Claude Code reads `~/.claude/settings.json` on session start, fires `oto-session-start` hook, hook reads `oto/skills/using-oto/SKILL.md` (Phase 6 backfills) and `.oto/STATE.md` (if opt-in), emits identity block JSON.
- **Phase 6 dependency**: SessionStart hook references `oto:using-oto` skill content. Phase 5 ships defensive fallback (D-06) so Phase 6 absence does not break Phase 5 closeout.
- **Phase 8 dependency**: Codex/Gemini `mergeSettings` parity. Phase 5 stubs them to no-op (consistent with the runtime adapter contract) — installing oto on Codex still copies hook files; only the registration is deferred.
- **Phase 10 dependency**: SessionStart fixture promotes from static file (Phase 5) to CI-enforced snapshot (Phase 10).

</code_context>

<specifics>
## Specific Ideas

- The SessionStart fixture should be hand-eyeballed during Phase 5 closeout. The contract is "exactly one identity block, no upstream-identity leakage" — read the captured JSON and confirm by inspection before locking the file.
- `bin/lib/runtime-claude.cjs::mergeSettings` is the right place for the registration logic, but since `settings.json` is JSON-not-Markdown, the marker convention is a top-level `_oto` key (an object with `version`, `installed_at`, and `hooks: [...]` fields) rather than the `<!-- oto -->` HTML-comment markers used in `CLAUDE.md`. The implementer should match whichever pattern is already used by the rest of the runtime adapter for non-Markdown files; if no such precedent exists, the `_oto` key is the chosen shape.
- Token substitution should NOT touch files inside `foundation-frameworks/` (already in the do-not-rename allowlist) or `LICENSE*`. Reuse the rebrand engine's allowlist if convenient; otherwise an inline allowlist on the install-time pass.
- For HK-04 prompt-guard and HK-05 read-injection-scanner, the rebranded sources at `oto/hooks/` likely work as-is. Phase 5 verification is "the hook fires on the right event with the right matcher and returns the correct JSON shape" — no rewrite expected.
- For HK-06 validate-commit, the rebranded `.sh` already references `.oto/STATE.md`. Verify the matcher pattern in `mergeSettings` correctly scopes to `git commit` invocations only (not all `Bash` calls).

</specifics>

<deferred>
## Deferred Ideas

- **Codex hook parity** — Phase 8 (`runtime-codex.cjs::mergeSettings` and Codex-specific `[hooks]` TOML registration).
- **Gemini hook parity** — Phase 8 (Gemini's hook surface area, if any).
- **Skill-auto-load deferral when phase is active** — Phase 6 ships this as part of `oto:using-oto`'s skill body; Phase 5 SessionStart hook only injects the skill, it does not enforce gating.
- **CI snapshot enforcement of SessionStart output** — Phase 10 (CI-08 in REQUIREMENTS.md).
- **License-attribution CI check coverage of hook files** — Phase 10 (CI-06).
- **`--portable-hooks` style installer flag for WSL/Docker** — Out of scope (Windows is out-of-scope per PROJECT.md). If a personal-use need emerges, revisit in a v2 phase.
- **Hook signing / hash-based integrity** — Pitfall list mentions it; deferred until a real threat justifies the maintenance.
- **Runtime detection beyond Cursor/Claude/Copilot** — Out of scope (PROJECT.md scope is Claude/Codex/Gemini; Cursor branch retained only because removing it would silently break a `--all` install if Cursor ever gets installed).

### Reviewed Todos (not folded)
None — todo cross-reference returned 0 matches.

</deferred>

---

*Phase: 05-hooks-port-consolidation*
*Context gathered: 2026-04-30*
