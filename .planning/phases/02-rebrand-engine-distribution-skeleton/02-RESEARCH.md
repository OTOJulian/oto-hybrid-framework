---
phase: 2
slug: rebrand-engine-distribution-skeleton
date: 2026-04-28
status: complete
confidence: HIGH
---

# Phase 2: Rebrand Engine & Distribution Skeleton — Research

## User Constraints (from CONTEXT.md)

### Locked Decisions

Phase 2 ships **two artifacts in one phase**:

1. **Rule-typed rebrand engine** under `scripts/rebrand/` (one CLI + one engine + per-rule modules + walker + manifest + report).
2. **Node package skeleton** at repo root (`package.json`, `bin/install.js` stub, `scripts/build-hooks.js` real-but-no-op, `hooks/.gitkeep`, `.gitignore` updates) that makes `npm install -g github:OTOJulian/oto-hybrid-framework[#tag]` clone cleanly.

The full lock-set from CONTEXT.md:

- **D-01** Engine = rules-as-modules + thin CLI: `scripts/rebrand/lib/rules/{identifier,path,command,skill_ns,package,url,env_var}.cjs` + `engine.cjs` + `walker.cjs` + `manifest.cjs` + `report.cjs` + CLI at `scripts/rebrand.cjs`. Each rule module exports `{classify, apply, listMatches}`.
- **D-02** Three modes: `--dry-run` (default), `--apply --out <dir>` (refuses non-empty without `--force`), `--verify-roundtrip` (uses `os.tmpdir()`). Out-of-place apply only — never mutates the source tree.
- **D-03** Real-tree run: `npm run rebrand:dry-run` and `--apply` against `foundation-frameworks/` into `.oto-rebrand-out/` (gitignored).
- **D-04** Reports: JSON-canonical (`reports/rebrand-dryrun.json`, `reports/coverage-manifest.{pre,post}.json`) + auto-generated `.md` companions (`reports/rebrand-dryrun.md`, `reports/coverage-manifest.delta.md`).
- **D-05** Pre/post coverage manifests count `gsd|GSD|Get Shit Done|superpowers|Superpowers` per file; engine exits non-zero if any post-rebrand count outside `do_not_rename` is > 0.
- **D-06** `reports/` lives at repo root, gitignored.
- **D-07** Synthetic fixtures (`tests/fixtures/rebrand/`) + real-tree round-trip (`foundation-frameworks/` apply→re-apply must be byte-identical).
- **D-08** Manual repo creation; phase 2 ships `scripts/install-smoke.cjs` that does `npm install -g github:OTOJulian/oto-hybrid-framework#<sha> --prefix /tmp/...` and asserts `oto --version` exits 0.
- **D-09** Exact `package.json`: `engines.node >=22.0.0`, CJS default, `bin: { oto: "bin/install.js" }`, explicit `files` allowlist, `postinstall: node scripts/build-hooks.js`, version `0.1.0-alpha.1`. No `prepublishOnly`. No `main`. No `exports`. No `type`.
- **D-10** `foundation-frameworks/` excluded from npm tarball via `files` allowlist.
- **D-11** `tests/`, `decisions/`, `.planning/`, `reports/`, `.oto-rebrand-out/` all excluded from tarball.
- **D-12** `scripts/build-hooks.js` is a real `vm`-validated copy script (mirrors GSD), but in Phase 2 `hooks/` contains only `.gitkeep` so the build is a verified no-op exit 0.
- **D-13** `bin/install.js` is a stub: prints `oto v<version>` + Phase-3 hint, exits 0.
- **D-14** `{{GITHUB_OWNER}}` resolves to `OTOJulian`; CLI override `--owner <name>`. Substitution at apply time, not load time (so on-disk `rename-map.json` keeps the placeholder for upstream-sync portability).
- **D-15** Zero top-level dependencies. Node 22+ built-ins only (`fs`, `fs/promises`, `node:fs.glob`, `node:path`, `node:vm`, `node:util.parseArgs`, `node:os`, `node:crypto`).
- **D-16** Hand-rolled JSON Schema validator in `lib/engine.cjs` — reuse the pattern from `tests/helpers/load-schema.cjs`, no `ajv`. Reject unknown rule classes.
- **D-17** `.gitignore` adds: `.oto-rebrand-out/`, `reports/`, `hooks/dist/`, `node_modules/`, `*.log`, `/tmp-*`.
- **D-18** Test runner = `node --test --test-concurrency=4 tests/`. `c8` deferred to Phase 10.

### Claude's Discretion

- Glob library fallback choice (only if `node:fs.glob` is insufficient — this research shows it is sufficient).
- Synthetic fixture filenames/structure under `tests/fixtures/rebrand/` (only categories from D-07 are locked).
- Markdown report column ordering and grouping.
- Exit-code conventions beyond the three locked failure modes (unclassified match, round-trip diff, coverage assertion).
- README.md content for Phase 2 (must mention the install command).

### Deferred Ideas (OUT OF SCOPE)

- Real installer logic (Phase 3).
- Actual `oto/` content (Phase 4).
- Hook source files (Phase 5).
- Skills (Phase 6), workstreams/workspaces (Phase 7), Codex/Gemini parity (Phase 8).
- Three-way merge in upstream sync (v2).
- CI workflows — local install-smoke only at Phase 2 (Phase 10 lifts this to GH Actions).
- License-attribution / coverage-manifest CI checks (Phase 10).
- `c8` coverage tool (Phase 10).
- `ajv` dependency (Phase 2 hand-rolls).
- GitHub repo polish (topics/badges) — Phase 10.
- `oto-sdk` programmatic API (v2 per ADR-12).
- Windows support (out of scope per REQUIREMENTS.md).

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FND-01 | Repo as Node.js npm package: Node ≥22, CJS, no top-level TS, no top-level build step | "Distribution Skeleton Deep-Dive § package.json" + GSD precedent at `foundation-frameworks/get-shit-done-main/package.json:45-47` |
| FND-02 | `package.json` declares `bin: { oto: "bin/install.js" }` + explicit `files` allowlist | D-09 lock + GSD precedent at `foundation-frameworks/get-shit-done-main/package.json:5-22` |
| FND-03 | `scripts/build-hooks.js` runs in `postinstall` lifecycle; validates JS hooks via `vm.Script`; copies to `hooks/dist/` | "build-hooks.js stub design" — direct port of GSD pattern at `foundation-frameworks/get-shit-done-main/scripts/build-hooks.js:37-49` (vm validation) |
| FND-04 | Repo on public GitHub, installable via `npm install -g github:OTOJulian/oto-hybrid-framework[#vX.Y.Z]` | "install-smoke design" — `scripts/install-smoke.cjs` proves the install path against the live remote |
| REB-01 | Rule-typed rename engine (separate rule classes for identifier/path/command/skill_ns/package/url/env_var) | "Engine Architecture Deep-Dive § per-rule semantics" |
| REB-03 | Do-not-rename allowlist covers `LICENSE*`, `THIRD-PARTY-LICENSES.md`, `foundation-frameworks/`, copyright lines, upstream URLs in attribution context | "Walker contract § allowlist evaluation" + `rename-map.json:38-57` |
| REB-04 | Dry-run mode produces classified report (per-file, per-rule-type) | "Coverage manifest mechanics" + `reports/rebrand-dryrun.json` schema in CONTEXT D-04 |
| REB-05 | Pre/post coverage manifest with hard zero-count assertion outside allowlist | "Coverage manifest mechanics § post-assert" |
| REB-06 | Round-trip assertion: re-applying rename map to rebranded code produces zero changes | "Round-trip correctness" — verify-roundtrip mode |

---

## Summary

Phase 2 hands two interlocked artifacts to Phases 3+: a rule-typed text rewriter and the npm package shell that ships it.

**The engine** (`scripts/rebrand/`) is the only piece of code in the project that can corrupt the entire codebase if wrong (Pitfall 1 — naive `s/gsd/oto/g` is the canonical disaster). Defense-in-depth therefore comes from four orthogonal mechanisms: (1) **typed rules** so each match site has exactly one classification path; (2) a **do-not-rename allowlist** of paths, literal strings, and regex patterns evaluated _before_ rule dispatch; (3) **out-of-place apply** so the source tree is byte-immutable across runs; (4) **round-trip + coverage assertions** that catch any rule that under- or over-matches against the real upstream snapshot. Every Phase 2 failure mode the user could see (Phase 4 bulk port corrupts something; Phase 9 upstream sync misses a deletion; CI license check fails) traces back to a class of bug the engine's three-mode contract was designed to surface in seconds.

**The distribution skeleton** is a separate concern that piggybacks on the same phase because both are zero-dep tooling. The `package.json` shape is locked by D-09 and traced cell-for-cell to GSD's `package.json` (which CLAUDE.md documents as the prescription). The crucial divergences from GSD are: no `prepublishOnly` (Pitfall 5 — GitHub-install skips it), no `dependencies` block (Pitfall 11 — personal-use ceiling), no SDK build (ADR-12 deferral), and `bin: oto` distinct from `get-shit-done-cc` (Pitfall 16 — collision avoidance). The `postinstall` script wires the empty `hooks/` to `scripts/build-hooks.js` which is a verified no-op at this phase, so Phase 5's only delta is filling the source list — the lifecycle plumbing is already proven by install-smoke.

**Where the residual risk lives:** (a) the env-var word-boundary semantics (`GSD_VERSION` matches, `GSDFOO` doesn't, `MY_GSD_VAR` is unclear) need an explicit semantic for `apply_to_pattern`; (b) the round-trip byte-identity assertion needs a precise spec for "byte-identical" against trees with thousands of files (sha256-of-file-list is cheaper than full content diff but loses content drift signal — recommendation below); (c) the JSON-Schema mini-validator already exists at `tests/helpers/load-schema.cjs` and should be extracted/re-used, not re-implemented.

---

## Engine Architecture Deep-Dive

### Module layout (D-01 lock; reproduced for planner reference)

```
scripts/
├── rebrand.cjs                     # CLI entry — parseArgs, dispatches to engine
└── rebrand/
    └── lib/
        ├── engine.cjs              # orchestrator: load+validate map, walk, dispatch, write reports
        ├── walker.cjs              # tree walk with include/exclude + do_not_rename allowlist
        ├── manifest.cjs            # pre/post coverage manifest builder
        ├── report.cjs              # JSON→markdown report generator
        └── rules/
            ├── identifier.cjs
            ├── path.cjs
            ├── command.cjs
            ├── skill_ns.cjs
            ├── package.cjs
            ├── url.cjs
            └── env_var.cjs
```

Every rule module exports a uniform interface:

```js
module.exports = {
  /** Classify a candidate token. Used by the dryrun report's `unclassified_count` invariant. */
  classify(token, rule, context) { /* → 'match' | 'skip' | 'unclassified' */ },

  /** Rewrite `text` according to `rule`, returning the rewritten string + count. */
  apply(text, rule, context) { /* → { text, replacements: Number } */ },

  /** Enumerate every match in `text` for the dryrun report (no rewriting). */
  listMatches(text, rule, context) { /* → [{from, to, line, col, classification}] */ }
};
```

`context` carries shared state: the resolved `--owner`, the `do_not_rename` allowlist (compiled), the per-file `file_class` lookup, the current file path. This avoids passing 6+ args to every function.

### Per-rule matching+rewriting algorithms

#### `identifier.cjs`

| Rule field | Semantics |
|---|---|
| `from: "gsd"`, `boundary: "word"`, `case_variants: ["lower","upper","title"]` | For each variant, build pattern `\b<variant>\b` where the variant is the case-shifted `from`. So `gsd` → `\bgsd\b`, `GSD` → `\bGSD\b`, `Gsd` → `\bGsd\b`. Each variant compiles to a separate regex; rewrite preserves the matched case (lower→lower target, upper→upper target). |
| `from: "get-shit-done-cc"`, `boundary: "exact"` | `(^|[^A-Za-z0-9_-])<from>([^A-Za-z0-9_-]|$)` — i.e., not preceded/followed by an identifier char. The hyphen is part of the identifier surface; `\b` regex `\b` does NOT treat hyphen as a boundary, so we need a custom non-identifier lookaround. |
| `from: "GSD_VERSION"`, `boundary: "exact"` | Same as above; `_` IS a word char in `\b`, so `\b` works for this case but `boundary: "exact"` is the safe default. |
| `do_not_match: ["Superpowers (the upstream framework)"]` | Per-rule literal-skip list. After regex match, check the surrounding context (e.g., the captured neighborhood ±32 chars) for any of these literals; if found, skip. Implemented via post-match filter, not regex alternation, to keep negative-lookbehind complexity out of the engine. |

**Critical: how `identifier` distinguishes `gsd` from `stagsd`.**
The `\b` regex word-boundary is defined at the transition between `\w` and `\W`. `s` and `g` are both `\w`, so `\bgsd\b` does NOT match inside `stagsd`. **Verified via `node -e "console.log(/\\bgsd\\b/.test('stagsd'))" → false`.** The risk lives in tokens like `gsd-tools.cjs` — there `gsd` is bounded by start-of-string and `-`. `-` is `\W`, so `\bgsd\b` matches. That's intentional (we want it rebranded). Similarly `GSDFOO`: `G,S,D,F,O,O` all `\w`, no boundary, no match — also intentional (the env-var word-boundary is delegated to `env_var.cjs`).

**Critical: `case_variants` interaction with `do_not_match`.**
The `do_not_match` strings are matched literally (no case folding). If the user wants to exclude both "Superpowers" and "superpowers" attribution, both must be listed. Document this explicitly in the engine's JSDoc on `identifier.cjs`.

#### `path.cjs`

| Rule field | Semantics |
|---|---|
| `from: ".planning"`, `match: "segment"` | Match path-shaped occurrences only: `(^|[/"'\s])<from>([/"'\s]|$)`. Rewrites the segment, preserves the surrounding delimiter. Example: `'.planning/STATE.md'` → `'.oto/STATE.md'`. |
| `from: "get-shit-done/"`, `match: "prefix"` | Match path prefix at start-of-line, after whitespace, or after a quote: `(^|[\s"'])<from>`. Non-greedy because directory names don't span across delimiters. |
| `from: "agents/gsd-"`, `match: "prefix"` | Same prefix mechanic; targets path segments like `agents/gsd-planner.md` → `agents/oto-planner.md`. |

**Path rules also rewrite filenames.** The walker emits both `(filePath, fileContent)` AND a separate `path.cjs` apply-to-filename pass when `--apply` rebrands a file like `agents/gsd-planner.md` to `agents/oto-planner.md`. The engine writes the file at the rewritten destination path.

#### `command.cjs`

| Rule field | Semantics |
|---|---|
| `from: "/gsd-"`, `to: "/oto-"` | Match `/gsd-` followed by `[a-z][a-z0-9-]*` and a non-identifier char (or end of string). Pattern: `/gsd-([a-z][a-z0-9-]*)\b`. Replace with `/oto-$1`. |

**Critical: `command` does NOT rewrite `Skill(skill="gsd:foo")`.**
That path is owned by `skill_ns.cjs`. The disambiguation: `command` matches a literal `/gsd-` prefix at a slash-command position; `skill_ns` matches the `gsd:` (colon-namespace) form. Per `rename-map.json`, the `command` rule is `from: "/gsd-"` and the `skill_ns` rule is `from: "superpowers:"` — there is NO `gsd:` skill_ns rule (because GSD doesn't use `Skill()` namespacing internally; only Superpowers does). So `gsd:` strings in upstream files (if any) need to be classified — they would hit `identifier.cjs` (`gsd` word match) followed by a literal `:`. This is correct per ADR-02 routing.

#### `skill_ns.cjs`

| Rule field | Semantics |
|---|---|
| `from: "superpowers:"`, `to: "oto:"` | Match `superpowers:` followed by `[a-z][a-z0-9-]*` (skill name). The trailing `\b` is implicit (next char is `[a-z]`). Pattern: `\bsuperpowers:([a-z][a-z0-9-]*)\b`. Replace with `oto:$1`. |

The `\b` before `superpowers:` matters: prevents matching `unsuperpowers:foo` (none in the corpus, but defense-in-depth).

#### `package.cjs`

Operates on JSON-shaped data, not free text. The engine parses `package.json` files (and only those — recognized by basename), looks up the keys in `fields: ["name","bin","main","exports","repository.url"]`, and rewrites the value if it equals (or — for `bin` — has a key equal to) `from`.

| Rule field | Semantics |
|---|---|
| `from: "get-shit-done-cc"`, `fields: ["name","bin"]` | If `pkg.name === from`, rewrite to `to`. If `pkg.bin` is an object, rename the key from `from` to `to`. If `pkg.bin` is a string, rewrite the string value. |
| `from: "gsd-sdk"`, `fields: ["bin"]` | Same as above, but bin-only. |

**Critical:** `package.cjs` runs ONLY on files named `package.json`. Any `gsd-sdk` literal appearing in markdown or `.cjs` source is handled by `identifier.cjs` (word-boundary match). The walker tags `package.json` files specifically and routes them to `package.cjs` first, then to `identifier.cjs` for any leftover plain-text references in `description`/`keywords` (which `identifier` will catch with `\bgsd\b` etc.).

#### `url.cjs`

| Rule field | Semantics |
|---|---|
| `from: "github.com/gsd-build/get-shit-done"`, `to: "github.com/{{GITHUB_OWNER}}/oto-hybrid-framework"`, `preserve_in_attribution: true` | Match the literal URL fragment. Before rewriting, scan the surrounding line (or the previous N lines if context is needed) for an attribution marker — defined as: occurrence inside `THIRD-PARTY-LICENSES.md`, OR a line containing `(c)`, `Copyright`, or `attribution`, OR the URL is wrapped in markdown bracket text containing "upstream"/"original"/"based on". If `preserve_in_attribution: true` AND attribution context detected, classify as `preserve` and skip rewrite. Otherwise rewrite, substituting `{{GITHUB_OWNER}}` with the `--owner` (default `OTOJulian`). |

**`{{GITHUB_OWNER}}` substitution timing (D-14):** the placeholder is resolved at apply time inside `url.cjs.apply()`, not when the rename-map is loaded. The `engine.cjs` constructor receives the owner (CLI flag or default) and threads it through `context.owner`. This keeps the on-disk `rename-map.json` portable for upstream sync.

#### `env_var.cjs`

| Rule field | Semantics |
|---|---|
| `from: "GSD_"`, `to: "OTO_"`, `apply_to_pattern: "^GSD_[A-Z][A-Z0-9_]*$"` | Build a regex `\bGSD_[A-Z][A-Z0-9_]*\b` (the leading `\b` prevents matching `MY_GSD_VAR` even though uppercase env-var names rarely appear inside another identifier). For each match, rewrite `GSD_` to `OTO_`, preserve the rest. The `apply_to_pattern` is used to validate the match against the schema's pattern (`^GSD_[A-Z][A-Z0-9_]*$` ensures the matched token is a valid env-var name). |

**Word-boundary nuance:** `\b` between `_` (or letter) and the start-of-string is satisfied if the preceding char is non-`\w`. So `GSD_VERSION` at start-of-line matches; `MY_GSD_VAR` does NOT match because `_` is `\w` so there's no boundary between `_` and `G`. **Verified:** `node -e "console.log('MY_GSD_VAR'.match(/\\bGSD_[A-Z]+\\b/))" → null`. This is the correct semantics — `MY_GSD_VAR` would be a user-defined env var that happens to contain "GSD"; rewriting it would corrupt user code.

### Walker contract (`walker.cjs`)

**Primitive:** Node 22+ `fs.promises.glob` (verified available on `node v22.17.1`: `typeof require('node:fs').promises.glob === 'function'`).

**API surface used:**

```js
const { glob } = require('node:fs/promises');
for await (const entry of glob('**/*', { cwd: target, withFileTypes: true })) {
  // entry has .name, .parentPath; isFile() / isDirectory() etc.
}
```

`glob` accepts `{ cwd, withFileTypes, exclude }`. The `exclude` option takes a function `(path) => boolean` — return true to skip. We use it to filter out `.oto-rebrand-out/`, `node_modules/`, `.git/`, `reports/`, and any path matching a `do_not_rename` glob.

**Symlinks:** `glob` does NOT follow symlinks by default in Node 22 (`AsyncIterator` walks file-tree only via `readdir`, not following symbolic links into other directories). For `foundation-frameworks/` there are no symlinks (verified by inventory walk in `scripts/gen-inventory.cjs:241-249`). Document this in `walker.cjs` as a known limit; revisit only if Phase 9 sync introduces symlinks.

**Dot-files:** included by default in `**/*`. We rely on this for `.gitignore`, `.github/`, etc.

**Binary files:** the walker reads everything as UTF-8. Binary files (PNG, woff, etc.) are filtered by extension allowlist OR by content sniff (`if buffer contains a NUL byte in the first 512 bytes, skip`). Recommendation: maintain a hard skip list of binary extensions: `png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf|otf|pdf|zip|tar|gz|bin`. The inventory in `scripts/gen-inventory.cjs:205` already uses this regex; reuse it.

**Walk performance:** synchronous `fs.readdirSync` recursion (as `gen-inventory.cjs:241-249`) is acceptable for `foundation-frameworks/` (~1700 files) and runs in <1s. Async `glob` is preferred for the engine because it composes with the rule pipeline naturally; sync recursion is fine if simpler. Either works under D-15.

**Allowlist evaluation order (`do_not_rename`):**

1. **Path globs** (entries like `"foundation-frameworks/**"`, `"LICENSE"`, `"LICENSE.md"`, `"THIRD-PARTY-LICENSES.md"`) — checked against the file path before reading content. Hand-rolled minimatch (D-15 zero-dep): handle `*`, `**`, exact match. The patterns in `rename-map.json:38-57` are simple enough that ~30 lines of regex-conversion code suffices.
2. **Literal preserves** (`"Lex Christopherson"`, `"Jesse Vincent"`, the two upstream URLs, env-var names like `CLAUDE_PLUGIN_ROOT`) — checked against each match's surrounding context (the matched substring + ±N chars). If any literal appears AT or OVERLAPPING the match site, classify as `preserve`.
3. **Regex preserves** (object form: `{ pattern: "...", reason: "..." }`) — compile the pattern, test against the match neighborhood, classify as `preserve` if it matches.

The order matters: path globs short-circuit per-file work; literal/regex preserves fire per-match. The current `rename-map.json` has 11 string entries and 2 object entries — small, fast.

### Round-trip mechanics (`--verify-roundtrip`)

**Algorithm:**

```
1. tmp_a = os.tmpdir() / oto-rebrand-rt-A-<rand>
2. tmp_b = os.tmpdir() / oto-rebrand-rt-B-<rand>
3. apply(target, tmp_a)             # forward pass
4. apply(tmp_a, tmp_b)               # second pass on already-rebranded tree
5. assert byte_identical(tmp_a, tmp_b)
6. cleanup tmp_a, tmp_b
```

**`byte_identical` definition:** for two trees A and B,
- enumerate all files via `fs.readdirSync` recursive,
- assert the two sorted relative-path lists are equal (catches added/missed files),
- for each path, assert `crypto.createHash('sha256').update(fs.readFileSync(...)).digest('hex')` matches.

`sha256` is in Node built-ins, fast (<200ms for the entire `foundation-frameworks/` after the second pass on a modern Mac). Full-content diff is overkill; sha256 catches every byte difference and emits a small diff list (the failing paths) that the planner can investigate.

**Exit code policy:**
- `0` — clean: no diff between A and B, all classifications resolved, coverage assertion passed.
- `1` — round-trip diff: list the diverging paths, exit 1.
- `2` — unclassified match (engine couldn't classify a candidate token).
- `3` — coverage assertion failure (post-rebrand non-zero count outside allowlist).
- `4` — schema validation failure.
- `5` — IO/filesystem error.

The CLI parses these via numeric exit code; CI surfaces them with `::error` annotations in Phase 10.

### Coverage manifest mechanics (`manifest.cjs`)

**Pre-manifest:** walk the source tree (`foundation-frameworks/`); for each file (excluding binary skip list), count occurrences of each of the five canonical strings: `gsd`, `GSD`, `Get Shit Done`, `superpowers`, `Superpowers`. Use literal substring count (not regex word-bounded), because the manifest measures _raw textual contamination_, not classified matches. Emit JSON keyed by file path with the per-token counts and a `file_class` tag.

**Post-manifest:** same, but against the `--out` tree.

**`file_class` lookup:**
- Try `decisions/file-inventory.json` — match by `relPath` against `entries[i].path`. The inventory's `category` field maps directly to the manifest's `file_class` (e.g., `agent`, `command`, `workflow`, `hook`, `skill`, `installer`, `doc`, `license`, `other`).
- If not found in inventory: tag as `"other"`.
- The inventory keys files by `relPath` relative to the upstream root (e.g., `agents/gsd-planner.md`); the engine works against `foundation-frameworks/get-shit-done-main/` so a path translation is needed: strip the upstream root prefix to get the relPath that joins to the inventory.

**Multi-line behavior:** counts are multi-line — a single `String.matchAll(/Get Shit Done/g)` over the full file contents handles multi-line files transparently. No need to split by line.

**Binary files:** skip per the binary-extension allowlist. They contribute `0` counts but appear in the manifest with a `binary: true` tag (helpful for forensics).

**Hard zero-count assertion (D-05):**

```
post.json for each file:
  for each token in {gsd, GSD, Get Shit Done, superpowers, Superpowers}:
    if count > 0:
      if file path matches any do_not_rename glob → ignore (allowed)
      elif file is foundation-frameworks/** → ignore (preserved upstream)
      else → ASSERTION FAILURE: list the file + token
exit 3 if any failures
```

Output failures to stderr; the JSON manifest has `assertion_failures: [{path, token, count}]` for machine-readable inspection.

### Hand-rolled JSON Schema validator (D-16)

`tests/helpers/load-schema.cjs` already implements a hand-rolled JSON Schema 2020-12 subset (`type`, `enum`, `const`, `pattern`, `minLength`, `minItems`, `required`, `properties`, `additionalProperties`, `items`, `oneOf`, `allOf`, `$ref` to `$defs`). It validates `rename-map.json` against `schema/rename-map.json` in `tests/phase-01-rename-map.test.cjs:27-32` and the inventory schema in `scripts/gen-inventory.cjs:302-306`.

**Recommendation:** _do not duplicate_. Move `tests/helpers/load-schema.cjs` to a new home accessible to both tests AND engine — e.g., `scripts/rebrand/lib/validate-schema.cjs`, then have `tests/helpers/load-schema.cjs` re-export from there (or vice versa). One implementation, two callers.

**Failure mode on unknown rule classes (Pitfall 1):** The schema declares `rules` as an object with `additionalProperties: false` and `required: [identifier, path, command, skill_ns, package, url, env_var]`. The validator already rejects unknown properties (`additionalProperties: false` path at `load-schema.cjs:53-56`). So a rename-map with `rules.weird_class: [...]` fails validation at engine startup, before any walking begins. **Verified semantics in `phase-01-rename-map.test.cjs:34-47` (already exercised).**

**Engine startup checks (in addition to schema validation):**
- Assert `version === "1"` (schema enforces this via `const`).
- Assert each rule array has ≥1 entry (schema enforces).
- Assert `do_not_rename` is an array (schema enforces).
- Sanity assert the seven rule modules exist on disk (`require.resolve` each rule file at startup so missing modules fail loudly).

---

## Distribution Skeleton Deep-Dive

### `package.json` (D-09 — locked verbatim)

The exact shape from CONTEXT.md is the spec. Per-field rationale (cross-referenced to evidence):

| Field | Value | Source |
|---|---|---|
| `name` | `"oto"` | D-16 ADR-11; distinct from `"get-shit-done-cc"` (Pitfall 16) |
| `version` | `"0.1.0-alpha.1"` | D-09 — pre-v0.1.0 alpha so tag-pinned installs are meaningful |
| `engines.node` | `">=22.0.0"` | CLAUDE.md TL;DR row "Runtime"; matches GSD `package.json:45-47` |
| `bin` | `{ "oto": "bin/install.js" }` | D-09; FND-02 |
| `files` | (allowlist) | D-09, D-10, D-11 |
| `scripts.postinstall` | `node scripts/build-hooks.js` | D-09; runs on `npm install -g github:...` AND `npm publish` (Pitfall 5) |
| `scripts.test` | `node --test --test-concurrency=4 tests/` | D-18; mirrors `foundation-frameworks/get-shit-done-main/scripts/run-tests.cjs:25-30` |
| `scripts.rebrand` | `node scripts/rebrand.cjs` | discoverability per CONTEXT specifics |
| Missing fields | `main`, `exports`, `type`, `prepublishOnly`, top-level `dependencies` | D-09 explicitly omits each |

**`files` allowlist (D-09 + D-10 + D-11):**
```
"bin/", "scripts/rebrand/", "scripts/build-hooks.js",
"rename-map.json", "schema/", "package.json",
"README.md", "LICENSE", "THIRD-PARTY-LICENSES.md"
```
Excludes (by omission): `foundation-frameworks/`, `tests/`, `decisions/`, `.planning/`, `reports/`, `.oto-rebrand-out/`. Verified Phase 1 evidence: GSD's allowlist at `foundation-frameworks/get-shit-done-main/package.json:9-22` is structurally identical (one entry per top-level dir/file).

### `postinstall` lifecycle behavior

**Verified from npm docs (CITED: docs.npmjs.com/cli/v10/using-npm/scripts) + GSD precedent:**

| Trigger | Runs `postinstall`? | Runs `prepublishOnly`? | Runs `postinstall`? |
|---|---|---|---|
| `npm install -g github:owner/repo` | **YES** | NO | YES (after `postinstall`) |
| `npm install -g github:owner/repo#vX.Y.Z` | **YES** | NO | YES |
| `npm install -g <tarball>` | NO¹ | NO | YES |
| `npm install -g <unpacked-dir>` | NO¹ | NO | YES |
| `npm publish` | YES | YES | (n/a) |
| `npm install` (in repo root, dev) | YES | NO | YES |

¹ For tarball/unpacked installs, `postinstall` runs only when installing from a directory that contains a `.git` AND has no `node_modules` — i.e., a git checkout. For an actual tarball it does not. This means the install-smoke MUST exercise the github-install path specifically (D-08) — a `npm pack` smoke would not catch a `postinstall`-script regression.

**Edge cases:**
- `npm install --ignore-scripts`: skips `postinstall` entirely. The user's environment must NOT use this for first install. Document in README.
- npm 10+: `postinstall` runs in a separate child process; failures abort the install with the script's exit code.
- If `postinstall` fails: install fails, no `bin/` symlink created, user sees the error from build-hooks.js. Phase 2's `postinstall` is a no-op (empty `hooks/`), so the only ways it can fail are: missing `hooks/` dir → solved by `hooks/.gitkeep`; missing `scripts/build-hooks.js` → caught by smoke test.

**Pitfall 5 mitigation:** `prepublishOnly` is omitted entirely (D-09). Anything that needs to happen on github-install must live in `postinstall`. This is why `scripts/build-hooks.js` is wired to `postinstall` from day one even though Phase 2 doesn't ship any hook source files.

### `bin/install.js` stub design (D-13)

```js
#!/usr/bin/env node
'use strict';

const { version } = require('../package.json');

console.log(`oto v${version}`);
console.log('');
console.log('Run `oto install --claude` (Phase 3) to install for Claude Code.');
console.log('Repo: https://github.com/OTOJulian/oto-hybrid-framework');

process.exit(0);
```

**Cross-platform shebang concerns:**
- macOS: `/usr/bin/env node` works. POSIX standard.
- The shebang requires the executable bit. npm sets `0o755` on `bin` targets when installing from `github:`, BUT `npm install -g <unpacked-dir>` does NOT chmod (Pitfall 16; GSD CHANGELOG #2453). The Phase 2 install-smoke must exercise the github-install path (D-08), not unpacked-dir, so this is not a Phase 2 concern. However: when committing `bin/install.js`, the file in git should have the executable bit set (`git update-index --chmod=+x bin/install.js`). Document in the plan as a one-time fixup step.
- Windows is out of scope (REQUIREMENTS.md "Out of Scope" — Windows support).

**Why `require('../package.json')` works:** `bin/install.js` is invoked from the install location (e.g., `~/.npm/lib/node_modules/oto/bin/install.js`); `../package.json` resolves to `~/.npm/lib/node_modules/oto/package.json` because `__dirname` is set correctly. CJS auto-includes JSON via `require`. Verified pattern from GSD's `bin/install.js`.

### `scripts/build-hooks.js` stub design (D-12)

Direct port of `foundation-frameworks/get-shit-done-main/scripts/build-hooks.js:1-95` with three differences:

1. `HOOKS_TO_COPY` is an empty array at Phase 2 (or the script reads `hooks/` and dynamically picks `.js`/`.cjs`/`.sh` files — both work; static list is GSD's choice and is more explicit).
2. The script must handle "no source files" cleanly: if `HOOKS_TO_COPY` is empty OR `hooks/` contains only `.gitkeep`, exit 0 with `console.log('Build complete (no hooks).')`. **Verified:** GSD's loop at `build-hooks.js:60-85` has a `continue` on missing source — empty `HOOKS_TO_COPY` simply doesn't iterate, prints "Build complete.", exits 0.
3. The `DIST_DIR` (`hooks/dist/`) is created via `fs.mkdirSync(DIST_DIR, { recursive: true })` — works on a fresh clone where `hooks/dist/` doesn't exist. If `hooks/` itself is missing, `fs.existsSync(HOOKS_DIR)` should be added as a guard before recursing. **Recommendation:** add this guard explicitly, OR keep `hooks/.gitkeep` so `hooks/` always exists.

**vm.Script syntax-validation pattern:** Lifted verbatim from `foundation-frameworks/get-shit-done-main/scripts/build-hooks.js:37-49`:

```js
function validateSyntax(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  try {
    new vm.Script(content, { filename: path.basename(filePath) });
    return null;
  } catch (e) {
    if (e instanceof SyntaxError) return e.message;
    throw e;
  }
}
```

This catches duplicate-`const`, missing brackets, unclosed strings, etc., before shipping a broken hook to users (GSD issue #1107/1109/1125/1161 — the rationale is documented at the head of GSD's `build-hooks.js`). Phase 2 ships the validator, Phase 5 fills the source files; the validator catches Phase 5 bugs at install time on every machine.

### `hooks/.gitkeep` + `postinstall` UX

**Why it's needed:** `git` doesn't track empty directories. Without `.gitkeep`, a fresh `git clone` would not have `hooks/` at all, and `scripts/build-hooks.js` would fail on `fs.existsSync(HOOKS_DIR) === false → fs.readdirSync(HOOKS_DIR)` throws ENOENT.

**Content:** empty file. Just the existence in git is what matters.

**What the script writes to `hooks/dist/` at Phase 2:** nothing. The dist dir is created (per `mkdirSync({ recursive: true })`), the loop iterates over an empty list, the script prints success and exits. `hooks/dist/` ends up as an empty directory; `.gitignore` D-17 already excludes it, so no commit pollution.

### `install-smoke design` (D-08)

**File:** `scripts/install-smoke.cjs` — runs locally (Phase 10 lifts to GH Actions).

**Algorithm:**

```
1. Parse args: --ref <sha-or-tag> (default: HEAD's commit sha via `git rev-parse HEAD`)
2. tmpdir = fs.mkdtempSync(os.tmpdir() + '/oto-install-smoke-')
3. exec: npm install -g github:OTOJulian/oto-hybrid-framework#${ref} --prefix ${tmpdir}
4. Resolve the bin path: ${tmpdir}/bin/oto (POSIX prefix layout)
5. Assert fs.existsSync of bin and it's executable (fs.statSync.mode & 0o111 !== 0)
6. exec: ${tmpdir}/bin/oto  (no flags — stub prints version, exits 0)
7. Assert exit code 0 and stdout contains "oto v0.1.0-alpha.1"
8. Cleanup: rm -rf ${tmpdir}
```

**`--prefix` semantics:** `npm install -g <pkg> --prefix /tmp/foo` installs into `/tmp/foo/lib/node_modules/oto/`, with the bin shim at `/tmp/foo/bin/oto`. Confirmed via npm docs and reproducible locally. This isolates from the user's global npm root; cleanup is just `rm -rf /tmp/foo`.

**PATH:** the smoke script can either use the absolute bin path (recommended — no PATH munging) OR prepend `${tmpdir}/bin` to PATH for the smoke command. Absolute path is simpler.

**Failure modes the smoke catches:**
- Repo doesn't exist or isn't public → `npm install` fails with 404
- `postinstall` script fails → `npm install` fails (this catches Phase 2 bug where `hooks/` is missing without `.gitkeep`)
- `bin/install.js` not chmod'd → bin not on PATH
- `package.json` malformed → install fails
- `files` allowlist missing `bin/` → bin not in tarball
- `bin/install.js` requires a missing module → exec fails
- Stub doesn't print version → assertion fails

**`--ref` flag rationale:** Phase 10 release flow tags commits; install-smoke can verify a tagged release end-to-end. Phase 2 just runs against `HEAD`.

**Pre-condition:** the repo has been pushed to `github.com/OTOJulian/oto-hybrid-framework` and the commit being tested is on a public branch. Phase 2 plan must include a `git push` step before running install-smoke.

---

## Validation Architecture

> Required by `nyquist_validation: true` in `.planning/config.json`.

### Test Framework

| Property | Value |
|---|---|
| Framework | `node:test` (Node 22+ built-in) |
| Config file | none — test runner is `node --test --test-concurrency=4 tests/` (D-18) |
| Quick run command | `node --test --test-concurrency=4 tests/phase-02-*.test.cjs` |
| Full suite command | `npm test` (resolves to `node --test --test-concurrency=4 tests/`) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|---|---|---|---|---|
| FND-01 | `package.json` declares `engines.node >=22.0.0`, no top-level deps, CJS default | unit | `node --test tests/phase-02-package-json.test.cjs` | Wave 0 |
| FND-02 | `bin: { oto: "bin/install.js" }`, explicit `files` allowlist matching D-09 | unit | `node --test tests/phase-02-package-json.test.cjs` | Wave 0 |
| FND-03 | `postinstall` script runs `scripts/build-hooks.js`; build-hooks.js validates JS hooks via `vm.Script` and exits 0 with empty `hooks/` | unit + integration | `node --test tests/phase-02-build-hooks.test.cjs` | Wave 0 |
| FND-04 | `npm install -g github:OTOJulian/oto-hybrid-framework#<sha>` succeeds; `oto --version` exits 0 (Phase 2 stub: just prints version) | integration | `node scripts/install-smoke.cjs --ref <sha>` | Wave 0 |
| REB-01 | Each of 7 rule classes has its own module with `{classify, apply, listMatches}` interface; engine dispatches per token type; rejects unknown rule classes | unit (per rule) | `node --test tests/phase-02-rules-*.test.cjs` | Wave 0 |
| REB-03 | `do_not_rename` allowlist preserves `LICENSE`, `THIRD-PARTY-LICENSES.md`, `foundation-frameworks/**`, `Lex Christopherson`, `Jesse Vincent`, the two upstream URLs (in attribution context), runtime env vars | unit + integration | `node --test tests/phase-02-allowlist.test.cjs` | Wave 0 |
| REB-04 | `--dry-run` produces `reports/rebrand-dryrun.json` matching D-04 schema; per-file matches grouped by rule_type; `unclassified_count: 0` for all files | integration | `node --test tests/phase-02-dryrun-report.test.cjs` (uses `foundation-frameworks/`) | Wave 0 |
| REB-05 | Pre/post coverage manifest counts `gsd|GSD|Get Shit Done|superpowers|Superpowers` per file; post.json has zero counts outside allowlist; assertion failure exits 3 | integration | `node --test tests/phase-02-coverage-manifest.test.cjs` | Wave 0 |
| REB-06 | `--verify-roundtrip` produces byte-identical trees (sha256 match per file) | integration | `node --test tests/phase-02-roundtrip.test.cjs` | Wave 0 |

### Sampling Rate

- **Per task commit:** unit tests for the rule module(s) touched: `node --test tests/phase-02-rules-<rule>.test.cjs` (<2s).
- **Per wave merge:** full suite quick run: `node --test tests/phase-02-*.test.cjs` (<10s budget per D-07).
- **Phase gate:** full suite green + `node scripts/install-smoke.cjs` green + `node scripts/rebrand.cjs --verify-roundtrip` green against `foundation-frameworks/`.

### Wave 0 Gaps (test scaffolding before implementation)

- [ ] `tests/phase-02-package-json.test.cjs` — covers FND-01, FND-02
- [ ] `tests/phase-02-build-hooks.test.cjs` — covers FND-03 (no-op + syntax-validation behavior)
- [ ] `tests/phase-02-rules-identifier.test.cjs` — covers REB-01 identifier semantics + Pitfall 1 substring collisions (`stagsd` negative)
- [ ] `tests/phase-02-rules-path.test.cjs` — covers REB-01 path semantics
- [ ] `tests/phase-02-rules-command.test.cjs` — covers REB-01 command semantics + `/gsd-` vs `gsd:` disambiguation
- [ ] `tests/phase-02-rules-skill_ns.test.cjs` — covers REB-01 skill_ns semantics
- [ ] `tests/phase-02-rules-package.test.cjs` — covers REB-01 package.json field rewrite
- [ ] `tests/phase-02-rules-url.test.cjs` — covers REB-01 url semantics + `preserve_in_attribution`
- [ ] `tests/phase-02-rules-env_var.test.cjs` — covers REB-01 env_var word-boundary
- [ ] `tests/phase-02-walker.test.cjs` — covers walker include/exclude + binary skip
- [ ] `tests/phase-02-allowlist.test.cjs` — covers REB-03
- [ ] `tests/phase-02-dryrun-report.test.cjs` — covers REB-04
- [ ] `tests/phase-02-coverage-manifest.test.cjs` — covers REB-05
- [ ] `tests/phase-02-roundtrip.test.cjs` — covers REB-06
- [ ] `tests/phase-02-engine-validation.test.cjs` — covers schema validation + unknown-rule-class rejection
- [ ] `tests/fixtures/rebrand/` — synthetic fixture tree (D-07 categories)
- [ ] Test framework install: none (Node 22+ built-in)
- [ ] `scripts/install-smoke.cjs` — runs locally; integration tested manually post-push

---

## Pitfall Mitigation Map

| Pitfall | Concrete Phase 2 Artifact / Action |
|---|---|
| **1. `gsd` substring collisions** | (a) Rule modules `identifier.cjs`/`env_var.cjs` use `\b`-bounded regex per case variant. (b) `tests/phase-02-rules-identifier.test.cjs` asserts `stagsd`, `gsdfile_does_not_exist`, `MY_GSD_VAR` do NOT match. (c) Engine emits `unclassified_count` per file in dryrun report; engine exits 2 if any > 0. (d) Schema rejects unknown rule classes — `additionalProperties: false` at `schema/rename-map.json:13`. |
| **5. `prepublishOnly` vs `postinstall`** | `package.json` D-09 omits `prepublishOnly` entirely; uses `postinstall: node scripts/build-hooks.js`. `scripts/install-smoke.cjs` runs the github-install path (not `npm pack`) — proves `postinstall` actually runs. |
| **6. License preservation** | (a) `do_not_rename` lists `LICENSE`, `LICENSE.md`, `THIRD-PARTY-LICENSES.md`, `Lex Christopherson`, `Jesse Vincent`, both upstream URLs (already in `rename-map.json:38-57`). (b) Walker checks path globs first. (c) `tests/phase-02-allowlist.test.cjs` asserts a fixture LICENSE survives apply byte-for-byte. (d) Real-tree D-07 round-trip on `foundation-frameworks/` includes the LICENSE preservation check explicitly. |
| **11. Personal-use rigor inflation** | (a) D-15 zero top-level deps. (b) D-16 hand-rolled validator (no `ajv`). (c) D-18 defer `c8` to Phase 10. (d) Phase 2 install-smoke is local script, not GH Actions (CI deferred to Phase 10). (e) No snapshot library — fixtures live in `tests/fixtures/rebrand/` as plain files. |
| **12. Branch-pinned drift** | `package.json` ships `version: "0.1.0-alpha.1"` so tag-pinned installs (`#v0.1.0-alpha.1`) are meaningful. README documents the install-with-tag form. Phase 2's install-smoke accepts `--ref <sha-or-tag>`. |
| **13. Deprecated upstream features** | `rename-map.json:58` has `"deprecated_drop": []` (empty at Phase 2 — Phase 1 inventory found none to drop yet). Engine reads this field and, when populated in future phases, skips classified-as-deprecated tokens entirely (no rebrand, no preserve — they get dropped from the apply output). Schema enforces array shape. |
| **15. Literal-string identity injection** | (a) Synthetic fixture under `tests/fixtures/rebrand/identity-injection/` reproduces the `<EXTREMELY_IMPORTANT>You have superpowers.` block (per `foundation-frameworks/superpowers-main/hooks/session-start:35`). (b) Test asserts after apply, the block reads `You have oto.` (or whatever the agreed identity becomes — Phase 5 finalizes; Phase 2 just verifies the `superpowers` token is rewritten). (c) The `superpowers` identifier rule with `case_variants: ["lower", "title"]` covers the case forms. |
| **16. `bin` collision** | `package.json` declares `bin: { oto: ... }` — distinct from `get-shit-done-cc` and `gsd-sdk`. Verified by `tests/phase-02-package-json.test.cjs`. install-smoke uses isolated `--prefix` to prove no collision with a hypothetical pre-existing GSD install. |
| **18. Translated READMEs** | Already classified `verdict: drop` in `decisions/file-inventory.json` (per `scripts/gen-inventory.cjs:83-84`). Phase 2 engine's coverage manifest counts contamination in those files but they're never rebranded (handled by D-07 — translated READMEs are dropped, not ported). They live under `foundation-frameworks/` which is in the allowlist; no special engine handling needed. |
| **20. Hook version tokens** | (a) Synthetic fixture under `tests/fixtures/rebrand/hook-version-tokens/` reproduces `# gsd-hook-version: {{GSD_VERSION}}` and `{{GSD_VERSION}}` (per `rename-map.json:9-11`). (b) `gsd-hook-version` is an `identifier` rule entry mapping to `oto-hook-version`. (c) `GSD_VERSION` is an `identifier` rule entry (boundary `exact`) mapping to `OTO_VERSION`. (d) Test asserts post-apply the file contains `# oto-hook-version: {{OTO_VERSION}}`. |

---

## Test Plan

### Layout

```
tests/
├── helpers/
│   ├── load-schema.cjs       # existing — re-exported by engine
│   ├── load-schema.js        # existing
│   └── rebrand.cjs           # NEW: shared helpers (mkTempDir, sha256Tree, makeFixture)
├── fixtures/
│   └── rebrand/
│       ├── substring-collisions/
│       │   ├── input.txt     # contains: stagsd, gsdfile_does_not_exist, MY_GSD_VAR, regular gsd, GSD_VERSION
│       │   └── expected.txt  # what should result after apply
│       ├── license-preservation/
│       │   ├── LICENSE
│       │   └── THIRD-PARTY-LICENSES.md
│       ├── url-preservation/
│       │   ├── attribution-context.md   # has both upstream URLs in attribution form (preserved)
│       │   └── plain-link.md            # has them in non-attribution form (rewritten)
│       ├── command-vs-skill_ns/
│       │   └── input.md       # has /gsd-do AND Skill(skill="gsd:do") OR Skill(skill="superpowers:do")
│       ├── env-var-boundary/
│       │   └── input.cjs      # has GSD_VERSION, GSD_RUNTIME, MY_GSD_VAR, GSDFOO
│       ├── hook-version-tokens/
│       │   └── input.sh       # has # gsd-hook-version: {{GSD_VERSION}}
│       └── multi-rule-line/
│           └── input.md       # one line containing identifier + path + command + env_var
├── phase-01-*.test.cjs        # existing
├── phase-02-package-json.test.cjs            # FND-01, FND-02
├── phase-02-build-hooks.test.cjs             # FND-03
├── phase-02-engine-validation.test.cjs       # D-16 schema + unknown-class rejection
├── phase-02-rules-identifier.test.cjs        # REB-01 identifier
├── phase-02-rules-path.test.cjs              # REB-01 path
├── phase-02-rules-command.test.cjs           # REB-01 command
├── phase-02-rules-skill_ns.test.cjs          # REB-01 skill_ns
├── phase-02-rules-package.test.cjs           # REB-01 package
├── phase-02-rules-url.test.cjs               # REB-01 url + preserve_in_attribution
├── phase-02-rules-env_var.test.cjs           # REB-01 env_var
├── phase-02-walker.test.cjs                  # walker contract
├── phase-02-allowlist.test.cjs               # REB-03
├── phase-02-dryrun-report.test.cjs           # REB-04
├── phase-02-coverage-manifest.test.cjs       # REB-05
├── phase-02-roundtrip.test.cjs               # REB-06 (synthetic + real-tree)
└── phase-02-fixtures-snapshot.test.cjs       # apply each fixture, diff against expected
```

**Naming:** all Phase 2 tests use `phase-02-` prefix per the existing `phase-01-` pattern. The runner picks them up automatically via the `tests/*.test.cjs` glob in `package.json` D-09 scripts.

### Key Test Cases (representative; planner will expand)

- **identifier.test.cjs**:
  - `\bgsd\b` matches `gsd-tools`, `gsd_state_version` neighborhood, but NOT `stagsd`, `agsdb`, `xgsdy`.
  - Case variants: `gsd` → `oto`, `GSD` → `OTO`, `Gsd` → `Oto`.
  - `do_not_match` literal `"Superpowers (the upstream framework)"` skipped even when `superpowers` would otherwise match.
- **command.test.cjs**:
  - `/gsd-plan-phase` → `/oto-plan-phase`; `/gsd-plan-phase` inside `\`backticks\`` and after whitespace both match; `gsd-plan-phase` (no leading `/`) does NOT match (would be caught by identifier).
- **env_var.test.cjs**:
  - `GSD_VERSION` → `OTO_VERSION`. `MY_GSD_VAR` unchanged. `GSDFOO` unchanged. `GSD_` (alone) does NOT match (no trailing capital).
- **roundtrip.test.cjs**:
  - Synthetic: 3 files with mixed rules → apply A → apply B → assert sha256-tree(A) === sha256-tree(B).
  - Real-tree: `foundation-frameworks/` → tmp_a → tmp_b → assert sha256 equality. Time budget: <8s per D-07 total runtime budget of 10s.
- **install-smoke**: integration script runs locally, asserts exit 0 + version output.

### Runtime Budget

Per D-07: total Phase 2 test runtime < 10s. With concurrency=4 and ~17 test files of <1s each, this is achievable. The roundtrip-against-foundation-frameworks test is the dominant cost (~3-5s for ~1700-file tree); rest are sub-second.

---

## Code Examples (verified patterns)

### Walker with `fs.promises.glob` (Node 22+)

```js
// scripts/rebrand/lib/walker.cjs
'use strict';
const { glob } = require('node:fs/promises');
const path = require('node:path');

async function* walkFiles(target, exclusions) {
  for await (const entry of glob('**/*', { cwd: target, withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const full = path.join(entry.parentPath, entry.name);
    const rel = path.relative(target, full);
    if (exclusions.some(p => p(rel))) continue;
    yield { absPath: full, relPath: rel };
  }
}

module.exports = { walkFiles };
```

Source: Node 22 `fs/promises.glob` — verified locally on `node v22.17.1` (`typeof require('node:fs').promises.glob === 'function'` returned `function`).

### CLI argument parsing with `node:util.parseArgs`

```js
// scripts/rebrand.cjs
const { parseArgs } = require('node:util');
const { values, positionals } = parseArgs({
  options: {
    'dry-run':         { type: 'boolean', default: true },
    'apply':           { type: 'boolean', default: false },
    'verify-roundtrip':{ type: 'boolean', default: false },
    'out':             { type: 'string' },
    'target':          { type: 'string',  default: 'foundation-frameworks/' },
    'owner':           { type: 'string',  default: 'OTOJulian' },
    'force':           { type: 'boolean', default: false },
  },
  allowPositionals: false,
});
```

Source: Node 22 `util.parseArgs` — built-in, zero-dep, sufficient for the engine's CLI surface. CLAUDE.md "Specifics" explicitly endorses this over `commander`/`yargs`.

### sha256-tree comparator for round-trip

```js
const { createHash } = require('node:crypto');
const { readFileSync, readdirSync } = require('node:fs');
const path = require('node:path');

function sha256Tree(root) {
  const out = {};
  function walk(dir) {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.isFile()) {
        const rel = path.relative(root, full);
        out[rel] = createHash('sha256').update(readFileSync(full)).digest('hex');
      }
    }
  }
  walk(root);
  return out;
}

function diffTrees(a, b) {
  const diffs = [];
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    if (a[k] !== b[k]) diffs.push({ path: k, a: a[k] || '<missing>', b: b[k] || '<missing>' });
  }
  return diffs;
}
```

Source: Node `crypto` + `fs` built-ins. Pattern reused from inventory walker at `scripts/gen-inventory.cjs:241-249`.

---

## Open Questions / Residual Risks

1. **Round-trip "byte-identical" definition — sha256-tree vs full diff.**
   - What we know: sha256-of-file-list catches every byte difference cheaply.
   - What's unclear: whether the planner wants the engine to also emit a content diff for failing paths (helpful for debugging but a bit more code).
   - Recommendation: emit sha256 mismatch as the primary signal; add a `--verbose` flag that reads the two files and emits a unified diff for the first N (default 5) failures. Tradeoff is ~30 lines of code for big debug payoff.

2. **File encoding handling.**
   - What we know: `foundation-frameworks/` content sample shows UTF-8 throughout. No BOM observed in spot checks.
   - What's unclear: whether some files (especially the Japanese/Korean/Portuguese/Chinese READMEs) might have BOMs or non-UTF-8 encodings.
   - Recommendation: read all files as UTF-8 (`fs.readFileSync(p, 'utf8')`); preserve any leading BOM by re-emitting it on write. The translated READMEs are dropped from the port (per inventory) but DO appear in the coverage manifest pre-pass — a BOM would not affect literal-substring counts. Phase 2 ships with UTF-8 + BOM-preserve-on-write; revisit only if a real-tree run errors.

3. **Large-file thresholds.**
   - What we know: largest file in `foundation-frameworks/` is the GSD CHANGELOG.md at ~150KB. Largest binary is sub-MB.
   - What's unclear: nothing actionable.
   - Recommendation: no threshold needed; standard `readFileSync` handles up to several MB easily. Document in the engine: files >10MB log a warning but proceed.

4. **Walker parallelism.**
   - What we know: synchronous walking of `foundation-frameworks/` (~1700 files, ~30MB) takes <1s on a modern Mac. Async `for await` of `fs.promises.glob` is similar.
   - What's unclear: whether the planner wants to parallelize per-file rule application across worker threads.
   - Recommendation: NO worker threads at Phase 2. Per Pitfall 11 — premature parallelism is rigor inflation. If real-tree runs exceed 5s per pass, revisit; current sync expectation is <2s per pass which is well under the 10s budget.

5. **Error aggregation strategy.**
   - What we know: D-15/D-16 don't lock this.
   - What's unclear: whether unclassified matches halt the run after first error or accumulate to end-of-run.
   - Recommendation: ACCUMULATE during a run, report ALL errors at end (so the planner/user can fix many bugs in one pass, not whack-a-mole). Engine still exits non-zero; the JSON report has the full list.

6. **`--force` exact semantics for non-empty `--out`.**
   - What we know: D-02 says `--apply --out` refuses non-empty existing dir without `--force`.
   - What's unclear: does `--force` (a) wipe `--out` first, or (b) overwrite files in place leaving stale entries from previous runs?
   - Recommendation: `--force` MUST `rm -rf <out>` before writing. CONTEXT specifics line "scratch `.oto-rebrand-out/` directory should be wiped at the start of every `--apply` run" supports this. Stale leftover files from a prior run could pollute the post-coverage manifest and cause the assertion to misfire.

7. **`{{GITHUB_OWNER}}` substitution edge case in fixtures.**
   - What we know: D-14 says substitute at apply time, default `OTOJulian`, CLI override `--owner`.
   - What's unclear: if the synthetic fixture deliberately includes a literal `{{GITHUB_OWNER}}` to test substitution, the test must pass `--owner OTOJulian` (or a fixture-specific value). Not a risk, just a note for the planner: the round-trip test against `foundation-frameworks/` uses default `OTOJulian`; the fixture-specific tests can override.
   - Recommendation: document that round-trip stability is guaranteed with the SAME `--owner` on both passes (otherwise pass 2 sees `OTOJulian` and finds nothing to rewrite — a no-op — which is fine, still byte-identical).

---

## Code Provenance & Citations

| Claim | Provenance |
|---|---|
| `engines.node >=22.0.0` is the GSD prescription | [VERIFIED: `foundation-frameworks/get-shit-done-main/package.json:45-47`] |
| `node:fs.glob` and `fs.promises.glob` exist on Node 22.17 | [VERIFIED: `node -e "console.log(typeof require('node:fs').promises.glob)" → function`] |
| `node:util.parseArgs` exists on Node 22 | [VERIFIED: `node -e "console.log(typeof require('node:util').parseArgs)" → function`] |
| `\bgsd\b` does not match inside `stagsd` | [VERIFIED: regex semantics — `\b` is at `\w`/`\W` boundary; `s,g,s,d` are all `\w`] |
| `postinstall` runs on `npm install -g github:...` but `prepublishOnly` does NOT | [CITED: docs.npmjs.com/cli/v10/using-npm/scripts; corroborated by GSD CHANGELOG 1.38.2 history of dropping `prepublishOnly`-only-build approach] |
| GSD's `build-hooks.js` is the canonical vm-validated copy pattern | [VERIFIED: `foundation-frameworks/get-shit-done-main/scripts/build-hooks.js:37-49`] |
| Hand-rolled JSON Schema validator already exists in repo | [VERIFIED: `tests/helpers/load-schema.cjs:1-89`; used by `tests/phase-01-rename-map.test.cjs:27-32` and `scripts/gen-inventory.cjs:302-306`] |
| `foundation-frameworks/` has no symlinks | [VERIFIED: `scripts/gen-inventory.cjs:241-249` walks via `readdirSync({withFileTypes})` and processes only files/directories — would have errored on broken symlinks; inventory ran clean per `decisions/file-inventory.json`] |
| Superpowers `<EXTREMELY_IMPORTANT>You have superpowers.` literal | [VERIFIED: `foundation-frameworks/superpowers-main/hooks/session-start:35`] |
| `gsd-hook-version: {{GSD_VERSION}}` token pattern | [VERIFIED: per Pitfall 20 + `rename-map.json:9-11` (`gsd-hook-version` and `GSD_VERSION` rules)] |
| All 7 rule classes are present in `rename-map.json` | [VERIFIED: `rename-map.json:3-37`] |
| `do_not_rename` lists licenses, copyrights, upstream URLs, runtime env vars | [VERIFIED: `rename-map.json:38-57`] |
| `decisions/file-inventory.json` provides per-file `category` for manifest `file_class` tagging | [VERIFIED: `scripts/gen-inventory.cjs:111-235` shows `category` tag for every entry] |
| GSD ships `bin: { "get-shit-done-cc": ..., "gsd-sdk": ... }` — collision risk if oto reuses any of those | [VERIFIED: `foundation-frameworks/get-shit-done-main/package.json:5-8`] |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|---|---|---|
| A1 | `npm install -g <github-url>` triggers `postinstall` script in npm 10+ | "postinstall lifecycle" | If npm changes the lifecycle behavior, install-smoke would catch it immediately (Phase 2 has no fallback). This is well-documented npm behavior, but worth re-verifying in Phase 10 against the latest npm version on the CI runner. |
| A2 | macOS `git` preserves the executable bit on `bin/install.js` after `git update-index --chmod=+x` | "bin/install.js stub design" | If the bit is lost, install-smoke fails with "permission denied"; the planner adds `chmod +x` at install time as a fallback. Low risk on Mac; verified pattern. |
| A3 | The walker's binary-extension skip list (`png|jpg|jpeg|gif|svg|...`) covers all binary files in `foundation-frameworks/` | "Walker contract § Binary files" | If a binary file slips through (e.g., a `.dat` extension), the engine would attempt UTF-8 decode and either error or produce garbage. NUL-byte content sniff is recommended as a backstop. |
| A4 | `os.tmpdir()` always has enough space for two full copies of `foundation-frameworks/` (~60MB) | "Round-trip mechanics" | Modern Macs have multi-GB temp dirs; not a concern. CI runners may be constrained — Phase 10 to verify. |

The following are NOT assumptions (verified above): all rule semantics, all schema constraints, all `package.json` field choices, all rename-map content shapes, all foundation-framework precedents.

---

## RESEARCH COMPLETE
