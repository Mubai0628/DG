# P1I-001 Desktop Operator Recovery Hardening Gate Plan

## Scope

`DW-P1I-001` is a docs/design-only gate for v0.31 Desktop Operator Recovery /
Action Hardening. It defines the ADR, threat model, implementation gate, and
next plan for desktop action mismatch recovery contracts.

## Non-goals

- No runtime feature implementation in P1I-001.
- No App feature implementation in P1I-001.
- No new desktop action lane.
- No retry execution.
- No undo execution.
- No replay re-execution.
- No broad desktop automation.
- No arbitrary click/type.
- No clipboard write by default.
- No file dialog automation by default.
- No screen recording.
- No hidden background desktop actions.
- No remote control.
- No arbitrary native bridge.
- No arbitrary Git/shell.
- No broad PermissionLease.

## Required Documents

- `docs/adr/0018-desktop-operator-recovery-hardening.md`
- `docs/desktop-operator-recovery-threat-model-v0.30.md`
- `docs/desktop-operator-recovery-implementation-gate-v0.30.md`
- `docs/p1i-002-desktop-action-mismatch-recovery-contract-plan.md`

## Design Questions

- Which target mismatch conditions are blockers versus warnings?
- Which stale screen and stale target signals must fail closed before action?
- How should interrupted action and focus loss ambiguity be summarized without
  automatic retry?
- Which compensation recommendations are safe to display without executing
  undo?
- What event references are required for replay completeness?
- Which privacy fields must be blocked before App display?
- How can App surfaces show recovery summaries without adding hidden desktop
  control?

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
checks, local commit hash, and the next task `DW-P1I-002`.
