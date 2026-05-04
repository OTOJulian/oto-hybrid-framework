# Rebrand Engine

oto is built by transforming GSD and Superpowers source through a rule-typed
rebrand engine. The engine converts identifiers, paths, slash commands, skill
namespaces, package names, URLs, and environment variables according to
[`rename-map.json`](../rename-map.json). That is what makes oto a true fork
rather than a thin wrapper around upstream names.

The engine lives at [`scripts/rebrand/lib/engine.cjs`](../scripts/rebrand/lib/engine.cjs).
The CLI wrapper is [`scripts/rebrand.cjs`](../scripts/rebrand.cjs).

## Why rule-typed?

A naive `s/gsd/oto/g` corrupts legal text, attribution URLs, unrelated
substrings, and user-owned identifiers. For example, it could rewrite a
copyright notice, mutate `github.com/gsd-build/get-shit-done` in an attribution
paragraph, or change an unrelated token that merely contains `gsd`.

The engine routes each candidate through a specific rule class. Each class knows
what it is allowed to match, how to preserve surrounding context, and what the
replacement should be. Dry-run reports record those classifications before any
apply step writes output.

## Rule classes

| Rule class | Pattern shape | Example |
|------------|---------------|---------|
| `identifier` | Word- or exact-boundary identifier match | `gsdConfig` -> `otoConfig` |
| `path` | Path segment or prefix match | `.planning/STATE.md` -> `.oto/STATE.md` |
| `command` | Slash command prefix | `/gsd-plan-phase` -> `/oto-plan-phase` |
| `skill_ns` | Skill namespace prefix | `superpowers:tdd` -> `oto:tdd` |
| `package` | Parsed `package.json` fields | `"name": "get-shit-done-cc"` -> `"name": "oto"` |
| `url` | URL host/path fragment | `github.com/gsd-build/get-shit-done` in non-attribution text |
| `env_var` | Uppercase environment variable prefix | `GSD_RUNTIME` -> `OTO_RUNTIME` |

Each rule class lives in its own CommonJS module under
[`scripts/rebrand/lib/rules/`](../scripts/rebrand/lib/rules/):

- [`identifier.cjs`](../scripts/rebrand/lib/rules/identifier.cjs)
- [`path.cjs`](../scripts/rebrand/lib/rules/path.cjs)
- [`command.cjs`](../scripts/rebrand/lib/rules/command.cjs)
- [`skill_ns.cjs`](../scripts/rebrand/lib/rules/skill_ns.cjs)
- [`package.cjs`](../scripts/rebrand/lib/rules/package.cjs)
- [`url.cjs`](../scripts/rebrand/lib/rules/url.cjs)
- [`env_var.cjs`](../scripts/rebrand/lib/rules/env_var.cjs)

Every module exposes a small interface: classify candidate tokens, enumerate
dry-run matches, and apply replacements. The engine owns ordering and report
generation.

## Allowlist

The do-not-rename allowlist protects legal, upstream-reference, and local-only
surfaces that must remain stable:

- `LICENSE`, `LICENSE.*`, and `THIRD-PARTY-LICENSES.md`
- `foundation-frameworks/`
- Copyright lines for Lex Christopherson and Jesse Vincent
- Upstream URLs in attribution context
- Runtime-specific environment variables such as `CLAUDE_CONFIG_DIR`,
  `CODEX_HOME`, and `GEMINI_CONFIG_DIR`
- Explicit regex preserves for generic examples that are not framework IDs

The allowlist is declared in `rename-map.json`, compiled by the walker, and
checked before rule output is accepted. Attribution preservation is especially
important for URL rules: the same upstream URL can be preserved in credits but
rewritten in non-attribution text.

## Three modes

```sh
node scripts/rebrand.cjs --dry-run
node scripts/rebrand.cjs --apply --force
node scripts/rebrand.cjs --verify-roundtrip
```

`--dry-run` classifies matches and writes `reports/rebrand-dryrun.json` plus a
Markdown companion. It does not write rebranded source.

`--apply --force` writes a rebranded tree. The engine refuses to write into a
non-empty output directory unless `--force` is present.

`--verify-roundtrip` applies the rename map to a source tree, then applies it
again to the already-rebranded output. The two outputs must be byte-identical.
This catches rules that keep rewriting their own output.

## Coverage manifest

Coverage manifests count banned upstream literals before and after rebranding:
`gsd`, `GSD`, `Get Shit Done`, `superpowers`, and `Superpowers`.

The post-rebrand manifest must have zero non-allowlisted occurrences. The check
is enforced by `tests/phase-02-coverage-manifest.test.cjs` and runs in the Phase
10 CI matrix. Reports are written under `reports/coverage-manifest.*` during
apply runs.

This contract is separate from snapshot testing. Snapshot tests lock the
expected classification shape for small fixtures. The coverage manifest proves
the real rebranded tree does not leak upstream literals outside approved legal
and attribution contexts.

## Adding a new rule

1. Create `scripts/rebrand/lib/rules/<name>.cjs` with the same interface as the
   existing seven rule modules.
2. Register the rule in `scripts/rebrand/lib/engine.cjs` in the correct dry-run
   and apply order.
3. Add entries to `rename-map.json` and its schema if the rule needs new fields.
4. Add a focused fixture under `tests/fixtures/rebrand/`.
5. Add or extend a Phase 2 rule test that proves the matching and apply
   semantics.
6. Regenerate Phase 10 snapshots with
   `node tests/regen-rebrand-snapshots.cjs`.
7. Confirm `node --test tests/phase-10-rebrand-snapshot.test.cjs` passes with
   live assertions.
8. Document the new class in this file's rule table.

Snapshots use the D-10-07 locked projection shape:

```json
{
  "file": "example.md",
  "classifications": [
    { "rule": "command", "before": "/gsd-do", "after": "/oto-do", "line": 1 }
  ]
}
```

Do not change that shape without updating both the generator and the consumer
test in the same commit.

## Source-of-truth files

- Engine: [`scripts/rebrand/lib/engine.cjs`](../scripts/rebrand/lib/engine.cjs)
- Rule modules: [`scripts/rebrand/lib/rules/`](../scripts/rebrand/lib/rules/)
- Walker: [`scripts/rebrand/lib/walker.cjs`](../scripts/rebrand/lib/walker.cjs)
- Report renderer: [`scripts/rebrand/lib/report.cjs`](../scripts/rebrand/lib/report.cjs)
- Coverage manifest: [`scripts/rebrand/lib/manifest.cjs`](../scripts/rebrand/lib/manifest.cjs)
- Rename map: [`rename-map.json`](../rename-map.json)
- Schema: [`schema/rename-map.json`](../schema/rename-map.json)
- Phase 2 research:
  [`.planning/phases/02-rebrand-engine-distribution-skeleton/02-RESEARCH.md`](../.planning/phases/02-rebrand-engine-distribution-skeleton/02-RESEARCH.md)
