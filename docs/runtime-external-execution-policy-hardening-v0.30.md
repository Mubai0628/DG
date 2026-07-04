# Runtime External Execution Policy Hardening v0.30

`runtime/src/capabilities/external-execution-policy-hardening.ts` validates
summary-only external capability descriptors, policies, approval receipts,
PermissionLease summaries, and replay summaries.

## Scope

- Runtime helper only.
- No new external capability execution lane.
- No mutating MCP tools.
- No arbitrary MCP invocation.
- No plugin code execution.
- No skill runtime execution.
- No broad native bridge.
- No broad desktop automation.
- No arbitrary Git/shell.
- No broad PermissionLease.
- No raw EventStore payload.

## Checks

The helper blocks missing descriptors, unknown risk, mutating capabilities
marked read-only, MCP mutating tools marked read-only, plugin/skill runtime
execution, lease scope mismatch, expired leases, approval receipt mismatch,
descriptor id mismatch, source type mismatch, policy risk violations, AUTO on
mutating/high-risk capabilities, missing replay summaries, raw args/output,
API key, Authorization, Bearer, token, secret markers, and readiness flags that
claim broad execution.

It warns on missing leases for approval-required capabilities, manual-only
capabilities, disabled capabilities, missing provenance, non-critical replay
stage gaps, and missing redaction audit evidence.

## Output

The output is summary-only:

- `policy_ready | warning | blocked`
- descriptor, policy, approval, lease, and replay counts
- risk summary
- lease / receipt match summary
- gate summaries
- blocker and warning counts
- deterministic policy hash
- readiness flags that keep broad execution disabled

The helper never returns raw args, raw output, raw package content, command
payloads, API keys, Authorization headers, Bearer tokens, or secret values.

## Relation to P1H

This is the runtime implementation for `DW-P1H-002`. It feeds later MCP
read-only consistency, plugin/skill sandbox, replay completeness, redaction
audit, and App read-only audit surfaces without enabling execution.
