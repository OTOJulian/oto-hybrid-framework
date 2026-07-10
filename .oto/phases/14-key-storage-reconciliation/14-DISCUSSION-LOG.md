# Phase 14: Key Storage Reconciliation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-10
**Phase:** 14-key-storage-reconciliation
**Areas discussed:** Migration trigger & conflicts, Reject vs auto-divert on string writes, Secret CRUD command surface, Settings status & masking UX

---

## Migration trigger & conflicts

**Q1 — When should self-heal migration run?**

| Option | Description | Selected |
|--------|-------------|----------|
| On config load (Recommended) | Both loaders detect string values at read time, migrate to keyfile, rewrite boolean; any oto command self-heals | ✓ |
| On write paths only | Migration fires only when config-set touches an integration key; poisoned config waits for a mutation | |
| Explicit flows only | Migration only inside /oto-settings-integrations (and doctor); predictable but key sits in tracked config | |

**Q2 — Conflict: legacy config string AND existing keyfile with different contents?**

| Option | Description | Selected |
|--------|-------------|----------|
| Keyfile wins (Recommended) | Keep keyfile, drop config string, masked one-line notice pointing at settings to re-set | ✓ |
| Config string wins | Overwrite keyfile with the config string (most recent explicit action); destructive to manual keyfile | |
| Halt and ask | Leave the string, require manual resolution; undermines self-heal | |

**Q3 — Warn about git-history exposure after migration?**

| Option | Description | Selected |
|--------|-------------|----------|
| Warn + rotation advice (Recommended) | One-time notice: key may exist in git history, consider rotating; no history scanning/rewriting | ✓ |
| Warn only if repo has a remote | Smarter but adds logic for marginal benefit | |
| Silent migration | No exposure warning | |

**Q4 — Breadth of the no-plaintext regression test?**

| Option | Description | Selected |
|--------|-------------|----------|
| Key-shaped scan of tracked .oto/ (Recommended) | Boolean assertion on the three keys + key-shaped-string grep over tracked .oto/ files | ✓ |
| Config keys only | Boolean assertion only; blind to key material in other planning files | |
| Whole-repo scan | Maximum coverage but growing exclusion list (fixtures, docs) | |

---

## Reject vs auto-divert on string writes

**Q1 — String written to an integration key via config-set?**

| Option | Description | Selected |
|--------|-------------|----------|
| Hard reject + pointer (Recommended) | Error naming /oto-settings-integrations and secret-set; nothing written | ✓ |
| Reject key-shaped, coerce truthy strings | 'true'/'false' strings coerce; key-shaped strings reject | |
| Auto-divert to keyfile | Key-shaped string treated as implicit secret-set; key already hit argv by then | |

**Q2 — Boolean true set with no detected key?**

| Option | Description | Selected |
|--------|-------------|----------|
| Warn but allow (Recommended) | Accept the write, note the missing key; Phase 15 gates on detectExaKey(), fallback ladder covers no-tools | ✓ |
| Allow silently | Zero feedback; flag/registration mismatch is research Pitfall 2 | |
| Reject without a key | Couples config-set to key state; breaks flag-first-key-later ordering | |

---

## Secret CRUD command surface

**Q1 — SDK command shape?**

| Option | Description | Selected |
|--------|-------------|----------|
| secret-set/clear/status (Recommended) | Top-level query commands mirroring config-set/config-get; helpers in secrets.cjs | ✓ |
| Namespaced integrations.* | Groups by feature; breaks the flat registry convention | |
| Overload config-set | Fewest commands but blurs the config/secret boundary | |

**Q2 — Legacy ~/.gsd/ keyfile path in config-mutation.ts:358?**

| Option | Description | Selected |
|--------|-------------|----------|
| Fix to ~/.oto/ only (Recommended) | Correct the SDK path; no fallback, no migration; zero keyfiles verified in either dir | ✓ |
| Read-fallback to ~/.gsd/ | Permanent dual path for a scenario the install base doesn't have | |
| One-time ~/.gsd/ migration | Duplicates secret material; mutates a dir owned by GSD | |

**Q3 — How the key is physically entered?**

| Option | Description | Selected |
|--------|-------------|----------|
| TTY prompt via ! command (Recommended) | Silent no-echo prompt; user runs `! oto-sdk query secret-set exa`; key never in argv/history/transcript | ✓ |
| Paste into chat, pipe via stdin | Key lands in conversation transcript and Bash command string | |
| Both, prompt preferred | TTY documented, pipe for scripting/tests | |

*Note recorded: piped stdin support is still needed for node:test coverage — kept as a non-suggested capability under the TTY-first choice.*

---

## Settings status & masking UX

**Q1 — Per-integration status display?**

| Option | Description | Selected |
|--------|-------------|----------|
| Flag + source + masked key (Recommended) | e.g. 'Exa: enabled — key from env EXA_API_KEY (****4f2a)'; shows env-over-keyfile shadowing | ✓ |
| Flag + masked key only | Hides the env-vs-keyfile source that explains rotation confusion | |
| Flag + source, no key chars | No masked chars at all; SECR-04 explicitly calls for ****<last-4> | |

**Q2 — What happens to the boolean flag on secret-clear?**

| Option | Description | Selected |
|--------|-------------|----------|
| Clear key + flip flag false (Recommended) | One action, coherent state; env-still-set case noted explicitly | ✓ |
| Clear key only, warn | Leaves an inert flag behind by default | |
| Ask each time | Extra prompt for an almost-always-same intent | |

**Q3 — Enforce keyfile permissions in status/load paths?**

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-fix to 0600 + notice (Recommended) | chmod loose keyfiles with a one-line notice; matches self-healing theme | ✓ |
| Warn only | Leaves a known-bad state the tool could trivially fix | |
| Ignore permissions | World-readable manual keyfiles silently persist | |

---

## Claude's Discretion

- Exact notice/warning wording (one-liners, masked values only)
- Placement of shared validation/migration helpers to keep GSD-shared-file diffs small
- Key-shaped-string heuristics for the .oto/ scan; masking edge cases for short keys
- TTY prompt implementation and stdin-vs-TTY detection details
- Test file placement within the existing node:test layout

## Deferred Ideas

- Keyless/unauthenticated Exa tier (EXA-F-01, v0.5.x+)
- Live doctor ping against a registered server (EXA-F-02, v0.5.x+)
- Reading or migrating ~/.gsd/ keyfiles (rejected — dir belongs to the separate GSD install)
- Whole-repo key-shaped-string scanning (rejected — fixture false positives vs personal-use ceiling)
