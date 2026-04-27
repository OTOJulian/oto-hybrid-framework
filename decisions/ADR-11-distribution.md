# ADR-11: GitHub distribution and bin command

Status: Accepted
Date: 2026-04-27
Implements: D-16, D-17

## Context

Oto is installed from public GitHub, not the npm registry. The repo is `oto-hybrid-framework`. The GitHub owner is provisionally inferred as `julianisaac`, but that external fact should not be baked into every artifact.

## Decision

Install instruction template is `npm install -g github:{{GITHUB_OWNER}}/oto-hybrid-framework#vX.Y.Z`. The v1 bin command is `oto` only. There is no `oto-sdk` bin in v1.

## Rationale

The placeholder keeps Phase 1 independent from GitHub username confirmation. A single `oto` command avoids PATH collision with GSD's `get-shit-done-cc` and `gsd-sdk`, and matches the project goal of one command surface.

## Consequences

The Phase 2 engine resolves `{{GITHUB_OWNER}}` at load time from trusted local config or user confirmation. If the owner differs from `julianisaac`, only the URL rules need changing. SDK-related bins remain deferred under ADR-12.
