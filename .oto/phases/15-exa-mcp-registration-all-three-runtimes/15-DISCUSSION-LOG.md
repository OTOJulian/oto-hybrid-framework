# Phase 15: Exa MCP Registration (All Three Runtimes) - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-13
**Phase:** 15-exa-mcp-registration-all-three-runtimes
**Areas discussed:** Transport ADR direction, Consent & registration entry points, Per-runtime status & config-dir resolution, Conflict & edge-case UX

---

## Transport ADR direction

### Which transport should the ADR record?

| Option | Description | Selected |
|--------|-------------|----------|
| Launcher-stdio | Shipped launcher resolves key from env/keyfile, spawns npx exa-mcp-server; key never in any runtime config; npx cold-start cost | ✓ |
| Remote HTTP | Exa-hosted endpoint, zero child process; literal key in 2–3 user-private config files | |
| Defer to phase-time check | Planner runs the research flag's fresh verification and writes the ADR as first task | |

**User's choice:** Launcher-stdio (research's recommendation, locked now)

### Version pinning of the spawned server

| Option | Description | Selected |
|--------|-------------|----------|
| Exact pin | `npx -y exa-mcp-server@3.2.1`; deterministic tool surface; bump via oto releases | ✓ |
| Major-version range | `@3` — auto-patches, but a minor could shift the pinned tool set | |
| Floating latest | Zero maintenance; tool surface is whatever Exa ships that day | |

**User's choice:** Exact pin

### npx cold-start handling

| Option | Description | Selected |
|--------|-------------|----------|
| Pre-warm at registration | Run the npx download once after consent; failures surface at install time | ✓ |
| Plain npx, no pre-warm | First session eats the download; offline fails into the fallback ladder | |
| Vendor check at launch | Launcher checks cache and prints a notice — added complexity | |

**User's choice:** Pre-warm at registration

### ADR scope

| Option | Description | Selected |
|--------|-------------|----------|
| Document alternative | ADR records remote HTTP as evaluated alternative; anchors the v0.5.x keyless-tier deferral | ✓ |
| Single-path ADR | Launcher-stdio only; leaner but loses the keyless-tier anchor | |

**User's choice:** Document alternative

---

## Consent & registration entry points

### Where consent lives

| Option | Description | Selected |
|--------|-------------|----------|
| Installer + settings | Install prompts when key detected (default No); settings offers register/unregister anytime; one shared code path | ✓ |
| Settings only | Install never prompts | |
| Installer only | Adding a key later means re-running install | |

**User's choice:** Installer + settings

### Consent scope

| Option | Description | Selected |
|--------|-------------|----------|
| One consent, targeted runtimes | Single yes/no covers whichever runtime(s) the current command targets | ✓ |
| One consent, all three at once | First yes registers every runtime now and later | |
| Explicit per-runtime checklist | Individual toggles each time | |

**User's choice:** One consent, targeted runtimes

### Consent persistence

| Option | Description | Selected |
|--------|-------------|----------|
| Persist both answers | Yes/No recorded in ~/.oto state; installs honor silently; settings is the change surface | ✓ |
| Persist Yes, re-ask on No | Update installs nag a user who declined | |
| Ask every install | Maximum explicitness, maximum nagging | |

**User's choice:** Persist both answers

### Non-interactive installs

| Option | Description | Selected |
|--------|-------------|----------|
| Skip + explicit flag | Default No applies with one-line log; explicit opt-in flag for scripted bootstrap | ✓ |
| Skip silently, no flag | Bootstrap scripts can't wire Exa | |
| Honor persisted consent file | Requires syncing ~/.oto across machines | |

**User's choice:** Skip + explicit flag

---

## Per-runtime status & config-dir resolution

### Status truth source

| Option | Description | Selected |
|--------|-------------|----------|
| Live parse + fingerprint | Read actual runtime configs AND cross-check install-state; distinguishes oto-managed / user-owned / drift | ✓ |
| Live parse only | No ownership distinction | |
| Install-state only | Lies when the user hand-edits configs | |

**User's choice:** Live parse + fingerprint

### Coherence mismatch flagging

| Option | Description | Selected |
|--------|-------------|----------|
| Status + doctor, one helper | Settings summary warns AND oto doctor checks, via one shared helper | ✓ |
| Status warning only | Doctor untouched | |
| No mismatch logic | The "agents declare tools that don't exist" failure goes undetected | |

**User's choice:** Status + doctor, one helper

### Absent runtime handling

| Option | Description | Selected |
|--------|-------------|----------|
| Show as 'not installed', skip | Status lists all three with explicit state; registration offers only detected runtimes | ✓ |
| Omit absent runtimes | Cleaner but confusing later | |
| Allow pre-registration | Write config before the runtime exists — fragile | |

**User's choice:** Show as 'not installed', skip

---

## Conflict & edge-case UX

### External user-owned `exa` entry at registration (Claude/Gemini)

| Option | Description | Selected |
|--------|-------------|----------|
| Uniform refusal | All three runtimes refuse, report, point at manual resolution | ✓ |
| Offer takeover on JSON runtimes | Prompt to replace with oto-managed; asymmetric with Codex | |
| Skip silently | Hides that oto is not managing the entry | |

**User's choice:** Uniform refusal

### Drifted oto-fingerprinted entry at uninstall

| Option | Description | Selected |
|--------|-------------|----------|
| Skip + report as modified | Treat like user-owned; nothing the user touched gets deleted | ✓ |
| Remove anyway | Deletes user customizations without asking | |
| Prompt at uninstall | Uninstall flows are often non-interactive | |

**User's choice:** Skip + report as modified

### Keyfile usability rule (FRESH-WR-04)

| Option | Description | Selected |
|--------|-------------|----------|
| Follow symlinks, reject empty | Usable = resolves to regular readable file with non-empty trimmed content | ✓ |
| Regular files only | Breaks dotfiles-repo symlink setups | |
| Existence check only | Today's naive behavior — exactly what was flagged | |

**User's choice:** Follow symlinks, reject empty

### Global-credential guard (FRESH-WR-05)

| Option | Description | Selected |
|--------|-------------|----------|
| Disclose + confirm | Replace/Clear states global scope and requires explicit confirmation; flags reconciled after | ✓ |
| Root-only mutation | Blocks workstream rotation — clunky for a solo user | |
| Notice only | Muscle-memory Clear still nukes the shared credential | |

**User's choice:** Disclose + confirm

---

## Claude's Discretion

- Exact wording of consent prompts, refusal reports, drift notices, status lines (one-line masked-value convention).
- Status line formatting; placement of shared resolution/mismatch helpers (sync hygiene).
- Install-state fingerprint schema (hash vs stored-copy).
- Launcher error-output details on spawn failure.
- Consent-flag naming (`--register-exa-mcp` illustrative).
- Test file placement and fixture strategy for the round-trip family.

## Deferred Ideas

- Keyless/unauthenticated Exa tier (EXA-F-01, v0.5.x+) — anchored by the ADR's remote-HTTP alternative section.
- Live doctor `tools/list` ping (EXA-F-02, v0.5.x+).
- Takeover flow for user-owned `exa` entries — rejected for asymmetry; revisit if uniform refusal proves annoying.
- Uninstall-time prompting for drifted entries — rejected (non-interactive uninstall flows).
