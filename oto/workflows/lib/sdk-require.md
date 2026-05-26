# SDK hard-require guard

Structural and stateful workflow operations require `oto-sdk` on `PATH`. Use this guard immediately before the first structural `oto-sdk query` call in a workflow:

```bash
if ! command -v oto-sdk >/dev/null 2>&1; then
  echo "ERROR: oto-sdk is required for this operation but is not on PATH." >&2
  echo "Install: npm install -g github:OTOJulian/oto-hybrid-framework" >&2
  exit 1
fi
```

Apply this hard-require tier to structural keys: `init.*`, `commit`, `phase.add`, `phase.insert`, `phase.remove`, `phase.complete`, state mutations such as `state.update`, `state.patch`, and `state.begin-phase`, plus `roadmap.update-plan-progress`, `requirements.mark-complete`, and `milestone.complete`.

Read-only queries degrade to sensible defaults with the existing idiom:

```bash
VALUE=$(oto-sdk query config-get workflow.skip_discuss 2>/dev/null || echo "false")
MODEL=$(oto-sdk query resolve-model oto-executor 2>/dev/null || echo "")
SKILLS=$(oto-sdk query agent-skills oto-executor 2>/dev/null || echo "")
```

Use the read-only tier for `config-get`, `resolve-model`, `agent-skills`, `state-snapshot`, `state.load`, and read-only `find-phase` calls.

Structural operations are not reimplemented in bash because the personal-use cost ceiling rejects duplicating registry handlers in shell, and Phase 11 already guarantees `oto-sdk` is installed on `PATH`; absence is an edge case that should fail fast with one clear actionable error.
