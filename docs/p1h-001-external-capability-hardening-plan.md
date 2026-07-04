# P1H-001 External Capability Hardening Gate Plan

## Scope

`DW-P1H-001` is a docs/design-only gate for v0.30 external capability
execution hardening. It defines the ADR, threat model, implementation gate, and
next plan for policy / lease consistency.

## Non-goals

- No runtime feature implementation in P1H-001.
- No App feature implementation in P1H-001.
- No MCP invocation changes.
- No mutating MCP tools.
- No arbitrary plugin code execution.
- No arbitrary skill runtime execution.
- No plugin installation with code execution.
- No broad native bridge.
- No broad desktop automation.
- No autonomous arbitrary tool execution.
- No arbitrary Git/shell.
- No broad PermissionLease.

## Required Documents

- `docs/adr/0011-external-capability-execution-hardening.md`
- `docs/external-capability-execution-hardening-threat-model-v0.30.md`
- `docs/external-capability-execution-hardening-implementation-gate-v0.30.md`
- `docs/p1h-002-capability-execution-policy-lease-hardening-plan.md`

## Design Questions

- Which descriptor, policy, and risk mismatches are hard blockers?
- Which approval receipt and PermissionLease mismatches must fail closed?
- Which MCP read-only consistency gaps are blockers versus warnings?
- Which plugin/skill sandbox escape signals block metadata readiness?
- Which redaction and replay completeness checks are required before an
  external capability result is considered auditable?
- Which App surfaces can display summary-only reports without creating a hidden
  execution path?

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
checks, local commit hash, and the next task `DW-P1H-002`.
