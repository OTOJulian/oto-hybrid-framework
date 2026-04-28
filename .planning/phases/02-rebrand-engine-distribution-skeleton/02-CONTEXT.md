# Phase 2: Rebrand Engine & Distribution Skeleton - Context

**Gathered:** 2026-04-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Ship two things in Phase 2:

1. **The rule-typed rebrand engine** (`scripts/rebrand/`) that consumes `rename-map.json` and emits classified dry-run reports + applied trees + coverage manifests + round-trip assertions.
2. **The Node package skeleton** that makes `npm install -g github:OTOJulian/oto-hybrid-framework[#tag]` clone cleanly with all lifecycle hooks correctly wired (`postinstall`, `bin`, `files`, `engines`).

Phase 2 builds and exercises the engine against `foundation-frameworks/` (the upstream copy) into a scratch out-dir for verification. Phase 2 does **not** apply the rebrand into `oto/` to produce the actual ported workflows/agents/skills — that's Phase 4.

Out of scope (later phases): real installer logic that places files under `~/.claude/` (Phase 3), the actual bulk port (Phase 4), hooks contents (Phase 5), skills port (Phase 6), CI workflows (Phase 10).

</domain>

<decisions>
## Implementation Decisions

User selected the recommended path for every gray area discussed; D-08 and D-09 were locked upfront before discussion. Each decision is grounded in CLAUDE.md tech-stack guidance, `.planning/research/PITFALLS.md`, and the Phase 1 ADR set.

### Rebrand Engine Architecture (REB-01)

- **D-01:** Engine is structured as **rules-as-modules + thin CLI**:
  - `scripts/rebrand/lib/rules/identifier.cjs`, `path.cjs`, `command.cjs`, `skill_ns.cjs`, `package.cjs`, `url.cjs`, `env_var.cjs` — one file per rule class. Each module exports a uniform interface: `{ classify(token, rule) → 'match' | 'skip' | 'unclassified', apply(text, rule) → newText, listMatches(text, rule) → [{from, to, line, col}] }`.
  - `scripts/rebrand/lib/engine.cjs` — orchestrator. Loads `rename-map.json`, validates schema, walks the target tree, dispatches each token to the appropriate rule module, accumulates results.
  - `scripts/rebrand/lib/walker.cjs` — file/tree walker. Honors include/exclude globs and the `do_not_rename` allowlist (path globs + literal-string preserves + regex-pattern preserves from `rename-map.json`).
  - `scripts/rebrand/lib/manifest.cjs` — pre/post coverage manifest builder.
  - `scripts/rebrand/lib/report.cjs` — JSON-to-markdown index generator.
  - `scripts/rebrand.cjs` — CLI entry. Parses flags, dispatches to engine, writes reports.
- **D-01 rationale:** Per-rule modules are independently unit-testable (Pitfall 1 demands rule-typed precision; bugs in `identifier.cjs` `\b`-boundary handling must be isolatable from `path.cjs` segment matching). Mirrors CLAUDE.md `oto/bin/lib/*.cjs` precedent. Single-file engine was the runner-up; rejected because round-trip + coverage logic want isolated tests.

### Engine Apply-Mode Scope at Phase 2 (REB-04, REB-06)

- **D-02:** Phase 2 ships **all three engine modes**, with apply being **out-of-place**:
  - `--dry-run` (default): walk target, classify all matches, emit JSON + markdown reports, write nothing.
  - `--apply --out <dir>`: rebrand target tree out-of-place into `<dir>`. Refuses to overwrite a non-empty existing directory unless `--force` is given. **Never mutates the source tree.**
  - `--verify-roundtrip`: applies the engine forward to produce tree A in a temp dir, then re-runs the engine against tree A producing tree B, asserts B is byte-identical to A. Fails the run on any diff.
- **D-03:** Phase 2 actually invokes `--apply` against `foundation-frameworks/` into a scratch dir `.oto-rebrand-out/` (gitignored) so coverage manifests + round-trip assertions run against the real upstream copy, not just synthetic fixtures. Phase 4 reuses the same engine to apply against the in-repo `oto/` tree for the real bulk port — no engine code changes between phases.
- **D-02/D-03 rationale:** SC#4 (round-trip) requires apply working anyway. Out-of-place keeps the upstream copy under `foundation-frameworks/` pristine (Pitfall 6 license preservation, Pitfall 13 deprecated-feature traceability). Single-engine-multiple-callers prevents drift between Phase 2 and Phase 4.

### Reports & Coverage Manifest Format (REB-04, REB-05)

- **D-04:** Reports follow the **JSON-canonical + thin generated `.md`** pattern (mirrors D-13's dual-format precedent for `file-inventory`):
  - `reports/rebrand-dryrun.json` (per-file array — see schema below) is the source of truth for the dry-run classified report (SC#3).
  - `reports/rebrand-dryrun.md` is auto-generated from the JSON; markdown grouped by rule type with per-file change counts.
  - `reports/coverage-manifest.pre.json`, `reports/coverage-manifest.post.json` are the source of truth for SC#6.
  - `reports/coverage-manifest.delta.md` is auto-generated; shows pre−post counts grouped by file class with the SC#6 assertion result (PASS / FAIL).
- **D-05:** Coverage manifest uses **pre + post counts with delta**:
  - `pre.json`: counts of `gsd`, `GSD`, `Get Shit Done`, `superpowers`, `Superpowers` per file in source tree (before rebrand) — keyed by file path with file-class tag.
  - `post.json`: same structure, computed from `--out` rebranded tree.
  - Hard assertion at the end of the engine run: every count in `post.json` outside the `do_not_rename` allowlist must be 0. If non-zero, exit non-zero with the offending file paths in stderr.
- **D-06:** Reports live under `reports/` at repo root. Add `reports/` to `.gitignore`. Phase 10 will publish them as CI artifacts.

`reports/rebrand-dryrun.json` per-file schema:
```
{
  "version": "1",
  "target": "foundation-frameworks/",
  "out_dir": ".oto-rebrand-out/",
  "files": [
    {
      "path": "...",
      "file_class": "workflow|agent|hook|skill|installer|doc|license|other",
      "matches": [
        { "rule_type": "identifier|path|command|skill_ns|package|url|env_var",
          "from": "...", "to": "...", "line": N, "col": N,
          "classification": "rename|preserve|deprecated_drop" }
      ],
      "unclassified_count": 0
    }
  ],
  "summary_by_rule_type": { "identifier": N, "path": N, ... },
  "unclassified_total": 0
}
```

### Round-Trip & Allowlist Test Strategy (REB-03, REB-06)

- **D-07:** Both **synthetic fixtures and real `foundation-frameworks/` snapshot** are exercised:
  - `tests/fixtures/rebrand/` covers hand-crafted edge cases:
    - Substring-collision negatives (`stagsd`, `gsdfile_does_not_exist` — must NOT match)
    - License-block preservation (`Copyright (c) 2025 Lex Christopherson`, `Copyright (c) 2025 Jesse Vincent` — never mutated)
    - URL preservation in attribution context (`github.com/gsd-build/get-shit-done` and `github.com/obra/superpowers` preserved when `preserve_in_attribution: true`)
    - Slash-command vs `Skill()` colon-namespace disambiguation (`/gsd-do` → `/oto-do` but `Skill(skill="gsd:do")` is also rebranded via the `skill_ns` rule)
    - Env-var word-boundary (`GSD_VERSION` → `OTO_VERSION` but `GSDFOO` left alone — `apply_to_pattern` matches)
    - Hook-version token substitution (`{{GSD_VERSION}}` and `# gsd-hook-version:` per Pitfall 20)
    - Multi-rule single line (e.g., `// see /gsd-plan-phase under .planning/STATE.md, env GSD_RUNTIME`)
  - Real-tree round-trip: full `foundation-frameworks/` apply → second-pass apply against the rebranded tree → byte-identical diff (zero-change assertion).
  - Real-tree allowlist: assert `LICENSE`, `THIRD-PARTY-LICENSES.md`, both copyright lines, both upstream URLs untouched after apply.
- **D-07 rationale:** Synthetic catches design bugs in seconds (per-rule unit test scope). Real snapshot catches integration drift Phase 4 would otherwise discover late. Both run via `node:test`; total runtime budget < 10s.

### GitHub Repo Creation & Install Smoke (FND-04, Pitfall 16)

- **D-08:** **Manual repo creation, phase verifies real clone**:
  - User creates `github.com/OTOJulian/oto-hybrid-framework` (public) by hand before phase declares complete. (Repo visibility: **public** — required by `npm install -g github:...` to work without PAT/SSH auth setup, and aligns with FND-04.)
  - Phase 2 ships `scripts/install-smoke.cjs` that runs `npm install -g github:OTOJulian/oto-hybrid-framework#<commit-sha> --prefix /tmp/oto-install-smoke-XXXX` against the live remote, asserts `oto` is on PATH and `oto --version` exits 0 (the `oto` bin in Phase 2 is a stub — see D-09).
  - Phase 2 success gate: install-smoke passes against the real remote (not just `npm pack`).
- **D-08 rationale:** Repo creation is a one-time manual op (visibility, topics, description) you'll want to control by hand. `gh repo create` scripted is overkill for a single repo. Local-only `npm pack` testing is insufficient — Pitfall 5 (`postinstall` vs `prepublishOnly`) and Pitfall 16 (bin collisions) only manifest under real `npm install -g github:...`.

### `package.json` Skeleton (FND-01, FND-02)

- **D-09:** `package.json` shape — exact fields:
  ```json
  {
    "name": "oto",
    "version": "0.1.0-alpha.1",
    "description": "Hybrid AI-CLI framework: GSD planning + Superpowers skills under /oto-* across Claude/Codex/Gemini",
    "engines": { "node": ">=22.0.0" },
    "bin": { "oto": "bin/install.js" },
    "files": [
      "bin/",
      "hooks/",
      "scripts/rebrand/",
      "scripts/build-hooks.js",
      "rename-map.json",
      "schema/",
      "package.json",
      "README.md",
      "LICENSE",
      "THIRD-PARTY-LICENSES.md"
    ],
    "scripts": {
      "postinstall": "node scripts/build-hooks.js",
      "test": "node --test --test-concurrency=4 tests/",
      "rebrand": "node scripts/rebrand.cjs",
      "rebrand:dry-run": "node scripts/rebrand.cjs --dry-run",
      "rebrand:roundtrip": "node scripts/rebrand.cjs --verify-roundtrip"
    },
    "repository": { "type": "git", "url": "git+https://github.com/OTOJulian/oto-hybrid-framework.git" },
    "license": "MIT",
    "author": "Julian Isaac"
  }
  ```
  - **No `"main"`, no `"exports"`, no `"type"`** at v1 (CJS default; oto isn't `require()`-ed as a library).
  - **No `prepublishOnly`** (Pitfall 5: `npm install -g github:...` does NOT run `prepublishOnly`; `postinstall` runs on both git-install AND publish).
  - **No top-level dependencies** at Phase 2. The engine and walker use only Node 22+ built-ins (`fs/promises`, `node:fs.glob`, `node:path`, `node:vm`).
  - `version: "0.1.0-alpha.1"` so tag-pinned installs are meaningful before v0.1.0 ships in Phase 10.

### Files Allowlist — `foundation-frameworks/` Excluded (FND-02)

- **D-10:** `foundation-frameworks/` is **NOT** in the npm tarball. The `files` allowlist (D-09) explicitly excludes it. Justification: ~20MB+ of upstream source bloats install for zero install-time benefit; Phase 9 sync clones fresh upstreams anyway.
- **D-11:** `tests/`, `decisions/`, `.planning/`, `reports/`, `.oto-rebrand-out/` excluded from tarball — internal artifacts. (Future phases may need to ship `decisions/skill-vs-command.md` if commands reference it at runtime; revisit in Phase 4. For Phase 2: out.)

### `postinstall` Lifecycle & `scripts/build-hooks.js` Stub (FND-03)

- **D-12:** Phase 2 ships a real `scripts/build-hooks.js` that scans `hooks/` for `.js`/`.cjs` files, validates each with `node:vm` `vm.Script(source, { filename })`, and copies validated sources to `hooks/dist/`. **In Phase 2 the `hooks/` directory is empty (or contains a `.gitkeep`)**, so the script is a verified no-op that exits 0. Phase 5 fills `hooks/`.
- **D-12 rationale:** The lifecycle contract must not regress between Phase 2 install (empty hooks) and Phase 5 install (filled hooks). Shipping the stub at Phase 2 means Phase 5's only delta is adding hook source files — the script is already wired and tested. Mirrors `foundation-frameworks/get-shit-done-main/scripts/build-hooks.js` (vm-validated copy pattern, per CLAUDE.md TL;DR row "Build step (top level)").

### `bin/install.js` Stub at Phase 2 (FND-02)

- **D-13:** Phase 2's `bin/install.js` is a **stub**: prints `oto vX.Y.Z` and a one-line `Run \`oto install --claude\` (Phase 3) to install for Claude Code` notice, then exits 0. Phase 3 turns this into the real installer (per ROADMAP Phase 3 SC#1). Phase 2's only requirement is that the bin is invokable post-install (so the install-smoke from D-08 has something to call).

### GitHub Owner Placeholder Resolution (locked upfront)

- **D-14:** `{{GITHUB_OWNER}}` placeholder in `rename-map.json` URL rules resolves to the literal string `OTOJulian` per the Phase 2 repo-creation checkpoint, with a `--owner <name>` CLI override on the rebrand engine for forks/test fixtures. No env var, no config file — simplest path consistent with personal-use scope (Pitfall 11). The engine substitutes the placeholder at apply time, not load time, so the on-disk `rename-map.json` keeps the placeholder for upstream-sync portability.

### Engine Implementation Constraints (cross-cutting)

- **D-15:** **Zero top-level dependencies** at Phase 2. Engine + walker + manifest + report use only Node 22+ built-ins. `node:fs.glob` (or `fs/promises.glob`) is the glob primitive — fall back to a hand-rolled minimatch only if `node:fs.glob` is missing edge-case support that blocks the do-not-rename allowlist (revisit during execute, not now).
- **D-16:** **JSON Schema validation of `rename-map.json`** is hand-rolled in `lib/engine.cjs` constructor — assert presence of `version`, `rules.{identifier,path,command,skill_ns,package,url,env_var}`, `do_not_rename`, `deprecated_drop`. Reject unknown rule classes (Pitfall 1: every match must be classified). No `ajv` dependency.
- **D-17:** **`.gitignore` additions in Phase 2:** `.oto-rebrand-out/`, `reports/`, `hooks/dist/`, `node_modules/`, `*.log`, `/tmp-*`. Reports + scratch dirs never enter git (Pitfall 1 evidence: post-rebrand search for `gsd` in committed code must be zero outside allowlist).
- **D-18:** **Test runner = `node --test --test-concurrency=4`**, mirrors GSD's `scripts/run-tests.cjs`. Coverage via `c8` is OPTIONAL at Phase 2 (Pitfall 11 caution) — defer to Phase 10 unless engine TDD demands it during execute.

### Claude's Discretion

The user picked recommended for every selected gray area; D-08, D-09, D-12 were locked upfront. The following implementation details are left to Claude during planning/execute (downstream agents have flexibility):

- Exact glob library fallback choice (only if `node:fs.glob` proves insufficient)
- Exact filename and structure of synthetic fixtures under `tests/fixtures/rebrand/` (only the categories from D-07 are locked)
- Markdown report layout details (column ordering, table grouping)
- Exit-code conventions (engine non-zero on any unclassified match, on round-trip diff, on coverage assertion failure — beyond that, Claude decides)
- README.md content for Phase 2 (must mention install command + `npm install -g github:OTOJulian/oto-hybrid-framework#<tag>`; everything else is at planner's discretion)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project intent and scope
- `.planning/PROJECT.md` — Vision, constraints, key decisions, personal-use cost ceiling, out-of-scope list
- `.planning/REQUIREMENTS.md` — All 100 v1 requirements; Phase 2 maps to FND-01..04, REB-01, REB-03..06
- `.planning/STATE.md` — Current project position, blockers (esp. Pitfall 11 "personal-use rigor inflation" cross-cutting blocker)
- `CLAUDE.md` — Tech-stack TL;DR + "Why These Choices" §1–7 + "What NOT to Use" + "Stack Patterns by Variant" (the prescription is opinionated; planner must honor it)
- `.planning/ROADMAP.md` §"Phase 2: Rebrand Engine & Distribution Skeleton" — Six concrete success criteria, all of which CONTEXT decisions trace back to

### Phase 1 ADRs (locked upstream of Phase 2)
- `decisions/ADR-10-rename-map-schema.md` — `rename-map.json` schema is a Phase 1 deliverable; Phase 2 builds the engine that consumes it
- `decisions/ADR-11-distribution.md` — GitHub install model, owner resolved at the Phase 2 checkpoint as `OTOJulian`, repo name `oto-hybrid-framework`, bin = `oto`, no `npm publish`
- `decisions/ADR-12-sdk-strategy.md` — SDK deferred to v2; Phase 2 has zero TS, zero `sdk/` subpackage, zero compiled artifacts
- `decisions/ADR-13-license-attribution.md` — `LICENSE` + `THIRD-PARTY-LICENSES.md` allowlist mechanics (engine must preserve)
- `decisions/ADR-14-inventory-scope.md` — Inventory verdicts (`keep|drop|merge`) drive what files Phase 4 ports; Phase 2 engine doesn't filter by verdict (it's a content rebrand tool, not a port tool)

### Phase 1 inventory + map (engine inputs)
- `rename-map.json` (repo root) — Engine's primary input. Rule-typed: `identifier`, `path`, `command`, `skill_ns`, `package`, `url`, `env_var` + `do_not_rename` + `deprecated_drop`
- `decisions/file-inventory.json` — Machine-readable inventory; informative for the engine's file-class tagging in coverage manifests
- `decisions/file-inventory.md` — Human index of file-inventory
- `schema/rename-map.json` — JSON Schema for rename-map (Phase 2 engine validates against this in `lib/engine.cjs` constructor)
- `schema/file-inventory.json` — JSON Schema for file-inventory

### Research artifacts (HIGH confidence, dated 2026-04-27)
- `.planning/research/SUMMARY.md` — Stack recommendations, build-order implications, expected feature counts
- `.planning/research/STACK.md` — Read alongside CLAUDE.md; Node 22, CJS, no top-level TS, `node:test`, `postinstall` hook, github-install model
- `.planning/research/PITFALLS.md` — 23 pitfalls with phase mapping. Phase 2 must address: **Pitfall 1** (substring collisions — D-01 rule-typed engine), **Pitfall 5** (`prepublishOnly` vs `postinstall` — D-09), **Pitfall 6** (license preservation — D-07 fixture, D-10 allowlist), **Pitfall 11** (rigor inflation — D-15 zero deps, D-16 hand-rolled validator, D-18 defer c8), **Pitfall 12** (branch-pinned drift — D-09 alpha tag), **Pitfall 13** (deprecated upstream — `deprecated_drop` field consumed by engine), **Pitfall 15** (literal-string identity — D-07 hook-injection fixtures), **Pitfall 16** (bin collision — D-09 `bin: oto` distinct from `get-shit-done-cc`), **Pitfall 18** (translated READMEs — drop list in inventory), **Pitfall 20** (hook version tokens — D-07 fixture)
- `.planning/research/ARCHITECTURE.md` — Option A (GSD spine + Superpowers skills as first-class peer); component boundaries; Phase 2 fits "rebrand-tooling" component
- `.planning/research/FEATURES.md` — Feature inventory (Phase 4 input; informational for Phase 2)

### Upstream sources (preserved, do-not-rebrand — read for engine reference only)
- `foundation-frameworks/get-shit-done-main/package.json` — Template for `package.json` shape (esp. `engines`, `bin`, `files`, `postinstall`, `scripts`); confirm CJS-style and zero-deps choice
- `foundation-frameworks/get-shit-done-main/scripts/build-hooks.js` — Canonical `vm`-validated copy pattern for D-12 stub
- `foundation-frameworks/get-shit-done-main/scripts/run-tests.cjs` — `node --test --test-concurrency=4` invocation pattern for D-18
- `foundation-frameworks/get-shit-done-main/.github/workflows/{test.yml,install-smoke.yml}` — Reference only; CI lands in Phase 10 not Phase 2
- `foundation-frameworks/get-shit-done-main/CHANGELOG.md` §1.38.5 — `gsd-hook-version` token substitution pattern (Pitfall 20)
- `foundation-frameworks/superpowers-main/hooks/session-start` — Reference for D-07 literal-string identity-injection fixture (Pitfall 15)

### Phase 2 deliverables (what Phase 2 produces; for downstream phases)
- `package.json` (root) → consumed by Phase 3 (installer fork extends `bin/install.js`)
- `bin/install.js` (stub at Phase 2) → grown into real installer in Phase 3
- `scripts/rebrand/` (engine library + CLI) → consumed by Phase 4 (bulk port) and Phase 9 (upstream sync)
- `scripts/build-hooks.js` (stub) → grown in Phase 5 (hooks port)
- `reports/` (gitignored) → CI artifacts in Phase 10
- `tests/fixtures/rebrand/` → maintained alongside engine, expanded in Phase 9 sync work

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **`rename-map.json` (repo root, Phase 1)** — Phase 2 engine's primary input. Rule-typed schema already locked; engine must consume it as-is, no schema migrations.
- **`schema/rename-map.json` + `schema/file-inventory.json` (Phase 1)** — JSON Schemas already on disk. D-16's hand-rolled validator can read these for reference, even if it doesn't pull in `ajv`.
- **`scripts/gen-inventory.cjs` (Phase 1)** — Existing CJS pattern in the repo: `#!/usr/bin/env node`, plain `require()`, `node:test`-friendly. Phase 2 engine modules should match this style exactly (no ESM, no TS, no Babel).
- **`tests/phase-01-*.test.cjs` + `tests/helpers/`** — Existing `node:test` test layout. Phase 2 tests live alongside; reuse helpers if any (read first, don't duplicate).
- **`LICENSE` + `THIRD-PARTY-LICENSES.md` (Phase 1)** — Existing fixtures for D-07 do-not-touch verification. Engine must preserve them byte-for-byte through any apply.
- **`decisions/file-inventory.json` (Phase 1)** — Provides per-file `verdict` (`keep|drop|merge`) and `file_class` tags. Phase 2 engine uses these tags to populate `file_class` in coverage manifest entries; verdicts themselves are not consumed by the engine (Phase 4 honors them).

### Established Patterns (carry forward)

- **`#!/usr/bin/env node` + `'use strict';` at the top of every CLI script** (per `scripts/gen-inventory.cjs`).
- **`node --test` with `.test.cjs` suffix** (per `tests/phase-01-*.test.cjs`).
- **CJS-only top-level** — every new file in Phase 2 is `.cjs` or plain `.js` with `require()`. No `import` syntax.
- **JSON Schema validation hand-rolled** when zero-dep is achievable (D-16 follows this).
- **Markdown-as-generated-output** — Phase 1 generates `file-inventory.md` from `file-inventory.json`; Phase 2 engine generates `rebrand-dryrun.md` from `rebrand-dryrun.json` the same way.
- **Reports under `reports/` (or `decisions/`) with stable JSON-first contract** — Phase 1 set this expectation; Phase 2 honors it for engine outputs.

### Integration Points (downstream phase consumption)

- Phase 2 produces **the rebrand engine library + CLI** → Phase 4 calls it via `node scripts/rebrand.cjs --apply --target foundation-frameworks/get-shit-done-main/get-shit-done --out oto/` (or similar) for the real bulk port. Same engine, different `--target`/`--out`.
- Phase 2 produces **the `package.json` shape + `bin/install.js` stub** → Phase 3 grows the stub into the real installer; the `package.json` `bin` declaration stays exactly the same.
- Phase 2 produces **`scripts/build-hooks.js`** (no-op-when-empty stub) → Phase 5 fills `hooks/` with source files; the build script does not change.
- Phase 2 produces **`tests/fixtures/rebrand/`** → Phase 9 upstream-sync work expands this fixture set when new edge cases surface.
- Phase 2 produces **`reports/coverage-manifest.{pre,post}.json`** → Phase 10 CI parses these for the SC#5 coverage-manifest CI check.
- Phase 2 does **NOT** produce any rebranded `oto/` directory contents — that's Phase 4. The scratch `.oto-rebrand-out/` is a verification artifact, not a deliverable tree.

</code_context>

<specifics>
## Specific Ideas

- The engine should be runnable as `npm run rebrand:dry-run` and `npm run rebrand:roundtrip` (D-09 scripts), not only as `node scripts/rebrand.cjs ...`. Discoverability via `npm run` is cheap.
- Engine should print a single-line summary at the end of every run: `engine: <mode> — <files> files, <matches> matches, <unclassified> unclassified, <duration>ms`. Makes failures obvious in CI logs (Phase 10 concern, but the line is free now).
- Round-trip mode's apply pass writes to a Node `os.tmpdir()` subdirectory, not `.oto-rebrand-out/` — keeps test runs from clobbering the user's last manual `--apply` snapshot.
- The engine must NEVER mutate the source tree. `--apply` always writes to `--out`. `--dry-run` writes nothing. `--verify-roundtrip` uses temp dirs. Pitfall 1 recovery says `git reset --hard` is the bailout — only works if source is untouched.
- Coverage manifest's `file_class` field comes from `decisions/file-inventory.json` (Phase 1 inventory tags). When a file isn't in the inventory (e.g., the engine itself, or `tests/fixtures/`), tag it `other`.
- The install-smoke (D-08) should accept a `--ref <sha-or-tag>` flag so it can be run against any commit, not just `HEAD`. Useful for verifying tagged releases in Phase 10.
- For the `hooks/` directory at Phase 2: include `hooks/.gitkeep` (empty file) so the directory exists in git, otherwise `scripts/build-hooks.js` would fail on a fresh clone with `ENOENT`.
- Per Pitfall 11 ("personal-use rigor inflation"), the planner should resist any urge to add: a logging library, a CLI argument-parser library (use Node 22+ `util.parseArgs`), a glob library beyond `node:fs.glob`, a JSON-Schema validator, a snapshot-test library, a coverage tool. Phase 2 is a frugal phase. Phase 10 adds CI rigor.
- The scratch `.oto-rebrand-out/` directory should be wiped at the start of every `--apply` run (with confirmation if non-empty), to prevent stale-output leak across runs.

</specifics>

<deferred>
## Deferred Ideas

- **Real installer logic** (`oto install --claude`, `--codex`, `--gemini`) — Phase 3. Phase 2's `bin/install.js` is a stub.
- **Bulk port application** (rebrand engine actually transforming `foundation-frameworks/` content into `oto/commands/`, `oto/agents/`, etc.) — Phase 4. Phase 2 only verifies the engine works against `foundation-frameworks/` into a scratch dir.
- **Hook source files** (`hooks/oto-session-start.js`, `oto-statusline.js`, etc.) — Phase 5. Phase 2 ships an empty `hooks/` and a verified-no-op build script.
- **Skill files** (`oto:test-driven-development`, etc.) — Phase 6.
- **Workstreams + workspaces** — Phase 7.
- **Codex/Gemini parity testing of the engine** — Phase 8 (engine itself doesn't depend on runtime; what depends on runtime is the bulk-port output).
- **Three-way merge** in upstream sync — v2 (deferred Phase 1).
- **CI workflows** (`test.yml`, `install-smoke.yml`, `release.yml`) — Phase 10. Phase 2's install-smoke is a local script, not a GitHub Actions workflow.
- **License-attribution CI check, coverage-manifest CI check, state-leak detection** — Phase 10.
- **`c8` coverage tool wiring** — Phase 10 unless engine TDD demands it during execute.
- **`ajv` JSON Schema validator** — Not in Phase 2; Phase 2 hand-rolls validation. Revisit if/when schema complexity exceeds hand-rolled capacity.
- **GitHub repo topics, description, README badges** — Decoration; Phase 10 polish task. Phase 2 just needs the repo to exist and clone publicly.
- **`oto-sdk` programmatic API** — v2 per ADR-12.
- **Windows support** — Out of scope per REQUIREMENTS.md.

### Reviewed Todos (not folded)

None — `gsd-tools.cjs todo match-phase 2` returned 0 matches.

</deferred>

---

*Phase: 02-rebrand-engine-distribution-skeleton*
*Context gathered: 2026-04-28*
