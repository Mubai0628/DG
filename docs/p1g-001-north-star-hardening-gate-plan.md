# P1G-001 North Star Hardening Gate Plan

## Scope

`DW-P1G-001` is a docs/design-only gate for v0.29 hardening. It defines the ADR,
threat model, implementation gate, and next plan for the failure recovery
contract.

## Non-goals

- No runtime feature implementation in P1G-001.
- No App execution change.
- No workflow execution change.
- No dynamic bidding.
- No mutating MCP tools.
- No arbitrary plugin/skill execution.
- No broad desktop action.
- No arbitrary Git/shell.
- No auto-apply.

## Required Documents

- `docs/adr/0011-north-star-demo-hardening.md`
- `docs/north-star-demo-hardening-threat-model-v0.28.md`
- `docs/north-star-demo-hardening-implementation-gate-v0.28.md`
- `docs/p1g-002-cross-surface-failure-recovery-contract-plan.md`

## Design Questions

- Which failures become explicit workflow states?
- Which approval/receipt mismatches must block readiness?
- Which policy drift checks are hard blockers?
- Which replay gaps are warnings versus blockers?
- Which freshness/drift signals require manual refresh?
- How should interrupted long-running workflow state be summarized?

## Test Policy

Use docs-lock tests only:

```powershell
pnpm lint
pnpm app:test
git diff --check
git diff --cached --check
```

No full gates run for this ordinary design task.

## Completion Report

Report the ADR, threat model, implementation gate, docs index updates, scoped
checks, local commit hash, and the next task `DW-P1G-002`.
