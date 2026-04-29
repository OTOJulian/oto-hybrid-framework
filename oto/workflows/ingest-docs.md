# ingest-docs (DEFERRED in oto v0.1.0)

<!-- DEFERRED: this workflow's pipeline depended on the doc classifier and doc synthesizer agents which were dropped in ADR-07. The retained doc writer and doc verifier agents do not cleanly absorb the classification-plus-synthesis pipeline semantics. -->

## Status

The `/oto-ingest-docs` command remains discoverable in `/oto-help` per D-12, because every installed command must point to an existing workflow file. Its executable body is deferred for v0.1.0.

This file is intentionally non-executable. It should not scan document trees, spawn classification or synthesis Tasks, write project planning artifacts, or commit generated ingest output.

## What this workflow was meant to do

Walk a bounded set of ADR, PRD, SPEC, RFC, and generic documentation files; classify each source document; synthesize a consolidated project context; surface unresolved conflicts; then bootstrap or merge the project's `.oto/` planning files.

That pipeline is materially different from the retained documentation authoring flow. `/oto-docs-update` can write and verify project documentation, but it is not a replacement for multi-document intake, conflict detection, and roadmap synthesis.

## Manual approximation (until v2)

1. Use `/oto-docs-update` when the goal is to author or refresh documentation from the current codebase.
2. For a small set of imported docs, manually read each source and tag it as ADR, PRD, SPEC, RFC, or DOC in your project notes.
3. Manually compare any conflicting locked decisions before updating PROJECT.md, REQUIREMENTS.md, ROADMAP.md, or STATE.md.
4. For larger doc sets, create a focused follow-up phase instead of trying to treat this deferred workflow as executable.

## Tracking

- ADR-07 (`decisions/ADR-07-agent-trim.md`)
- Reactivation criterion: a v2 milestone restores document intake agents or designs a retained successor workflow for classification, synthesis, and conflict handling.
