---
name: oto:set-profile
description: Switch model profile for OTO agents (quality/balanced/budget/inherit)
argument-hint: <profile (quality|balanced|budget|inherit)>
model: haiku
allowed-tools:
  - Bash
---

Show the following output to the user verbatim, with no extra commentary:

!`if ! command -v oto-sdk >/dev/null 2>&1; then printf '⚠ oto-sdk not found in PATH — /oto-set-profile requires it.\n\nInstall the OTO SDK:\n  npm install -g @oto-build/sdk\n\nOr update OTO to get the latest packages:\n  /oto-update\n'; exit 1; fi; oto-sdk query config-set-model-profile $ARGUMENTS --raw`
