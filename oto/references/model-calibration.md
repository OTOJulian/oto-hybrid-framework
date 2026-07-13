# Model Calibration — Severity & Convergence Anchor

oto is a personal, single-user CLI framework run by one developer on their own machine. Calibrate ALL review and verification severity to that threat model.

**Critical/Blocker** = secret material written to git-tracked files or transmitted off-machine; destruction or loss of user project data; a broken core workflow (install, plan, execute) that blocks daily use.

**Warning** = issues requiring local same-user access (TOCTOU races, symlink attacks); hardening against hypothetical future API changes; defense-in-depth gaps; maintainability concerns.

**Info** = style, naming, minor cleanup.

A clean review of sound code is a correct and expected outcome, not a reviewer failure. Do not inflate severity to appear thorough. Findings must be proportionate to a personal tool, not a multi-tenant production service.

**Convergence rules:** Maximum 2 gap-closure cycles per phase, then STOP and present unresolved findings for developer triage — never auto-generate a third cycle. Gap-cycle re-reviews MUST read the phase's prior REVIEW.md and DISPOSITIONS.md, MUST NOT re-raise findings already dispositioned ACCEPT or DEFER, and MUST limit review scope to files changed by the gap-closure plans.
