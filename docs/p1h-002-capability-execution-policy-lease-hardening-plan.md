# P1H-002 Capability Execution Policy / Lease Hardening Plan

## Scope

`DW-P1H-002` adds a pure runtime report that validates capability execution
policy, PermissionLease / approval receipt scope, expiry, descriptor risk, and
replay references across existing external capability summary lanes.

## Non-goals

- No new external capability execution lane.
- No mutating MCP tools.
- No arbitrary MCP invocation.
- No plugin code execution.
- No skill runtime execution.
- No broad native bridge.
- No broad desktop automation.
- No arbitrary Git/shell.
- No broad PermissionLease.
- No EventStore raw write.
- No App execution change.

## Inputs

The helper may consume summary-only refs for capability descriptors, Capability
Broker plan preview, MCP read-only tool contract/result, plugin/skill manifest
summary, approval receipt summary, PermissionLease preview, App approved
execution receipt, and replay summary.

## Blocking Checks

- Descriptor missing or descriptor risk unknown.
- Mutating capability marked read-only.
- MCP mutating tool marked read-only.
- Plugin/skill runtime execution enabled.
- Lease scope mismatch or expired lease.
- Approval receipt mismatch.
- Descriptor id mismatch or source type mismatch.
- Risk too high for policy.
- AUTO allowed on mutating/high-risk capability.
- Event result missing replay summary.
- Readiness claims arbitrary execution.
- Raw args/output/API key/Authorization/Bearer/secret markers.

## Warning Checks

- Missing lease for approval-required capability.
- Manual-only capability present.
- Disabled capability present.
- Descriptor lacks provenance.
- Replay summary missing non-critical stage.
- Output redaction audit missing.

## Tests

Use focused runtime tests:

```powershell
pnpm --filter @deepseek-workbench/runtime build
pnpm --filter @deepseek-workbench/runtime typecheck
pnpm exec vitest run runtime/test/external-execution-policy-hardening.test.ts
pnpm app:test
pnpm check:boundaries
pnpm check:secrets
git diff --check
git diff --cached --check
```

## Completion Report

Report the runtime module, docs, focused tests, boundary checks, local commit
hash, and the next task `DW-P1H-003`.
