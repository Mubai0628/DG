# Runtime Capability Policy Enforcement v0.28

`runtime/src/workflows/capability-policy-enforcement.ts` builds a
summary-only policy report for capability descriptors, broker plan previews,
MCP descriptors, plugin/skill descriptors, desktop action proposals, Git/shell
lane summaries, and approval consistency reports.

## Scope

- Runtime summary helper only.
- No capability execution.
- No approval execution.
- No apply or rollback.
- No PermissionLease issuing.
- No MCP tool invocation.
- No plugin or skill runtime execution.
- No desktop action execution.
- No Git/shell execution.
- No EventStore write.

## Blocking Rules

The report blocks disabled capabilities that claim execution, manual-only
capabilities without explicit approval, read-only capabilities that mutate, MCP
mutating tools, plugin/skill runtime execution, desktop action proposals outside
the allowlist, arbitrary Git/shell lanes, broad PermissionLease scopes, raw
args/output fields, command payloads, secret markers, and App readiness claims
that attempt to enable execution.

Key blocker categories include MCP mutating tools, plugin/skill runtime
execution, arbitrary Git/shell lanes, broad PermissionLease scopes, and App
readiness claims that attempt to enable execution.

## Output

The report is summary-only. It includes a policy id, allowed/blocked/warning
counts, capability category counts, risk counts, safe finding codes, summary
hashes, an enforcement hash, and readiness flags. All execution readiness flags
are false.

All execution readiness flags are false.
