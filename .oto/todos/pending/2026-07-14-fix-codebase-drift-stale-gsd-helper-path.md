---
created: 2026-07-14T20:34:53.945Z
title: Fix codebase-drift stale GSD helper path
area: tooling
files:
  - sdk/src/query/:codebase-drift handler
  - get-shit-done/bin/gsd-tools.cjs:stale removed target
---

## Problem

During the Phase 15 execute-phase verification gates, `oto-sdk query verify.codebase-drift` skipped with an SDK exception because it attempted to execute the removed path `get-shit-done/bin/gsd-tools.cjs`. The codebase-drift gate is non-blocking, so Phase 15 continued, but structural drift checks will remain silently unavailable until the OTO-native helper path is used.

## Solution

Handle as a post-phase `/oto-quick` task. Trace the SDK codebase-drift handler to its stale GSD-era command target, replace it with the live OTO-native implementation, add a regression test that runs `oto-sdk query verify.codebase-drift` in this repository layout, and verify the gate returns its documented JSON contract instead of `sdk-exception`. Do not change Phase 15 implementation scope while verification is active.
