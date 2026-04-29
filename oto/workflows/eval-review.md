# eval-review (DEFERRED in oto v0.1.0)

<!-- DEFERRED: this workflow's executable steps depended on the eval-tooling auditor agent which was dropped in ADR-07. No retained replacement exists in v0.1.0. -->

## Status

The `/oto-eval-review` command remains discoverable in `/oto-help` per D-12, because every installed command must point to an existing workflow file. Its executable audit body is deferred until evaluation-tooling agents return in v2.

This file is intentionally non-executable for v0.1.0. It should not spawn a Task, resolve an auditor model, write EVAL-REVIEW.md, or commit generated audit output.

## What this workflow was meant to do

Audit the evaluation coverage from a completed AI phase. The original flow inspected phase summaries, AI-SPEC.md when present, and evaluation reports under `.oto/evals/`, then produced a scored EVAL-REVIEW.md with gap analysis and remediation guidance.

## Manual approximation (until v2)

1. Inspect any eval reports your phase produced under `.oto/evals/`.
2. Compare pass rates, flaky cases, eval-set drift, and prompt-regression risk against the phase's intended AI-SPEC.md strategy.
3. Record findings in the phase VERIFICATION.md Eval Audit section.
4. If critical gaps remain, add a follow-up plan before treating the AI phase as ready to ship.

## Tracking

- ADR-07 (`decisions/ADR-07-agent-trim.md`)
- Reactivation criterion: a v2 milestone restores eval-tooling audit support or designs a retained successor workflow.
