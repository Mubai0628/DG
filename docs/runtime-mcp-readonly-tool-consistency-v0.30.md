# Runtime MCP Read-only Tool Consistency v0.30

`runtime/src/capabilities/mcp-readonly-tool-consistency.ts` checks that an
MCP read-only tool result is consistent with its contract, allowlist,
approval receipt, redaction summary, event summary, and replay projection.

## Scope

- Runtime helper only.
- Summary-only consistency report.
- No new MCP tool execution capability.
- No mutating MCP tools.
- No arbitrary MCP invocation.
- No plugin code execution.
- No skill runtime execution.
- No native bridge.
- No desktop action.
- No raw EventStore write.

## Checks

The helper blocks missing contracts, missing result summaries, non-read-only
contracts, tools outside the allowlist, mutating tool claims, descriptor id
mismatch, MCP profile mismatch, tool id mismatch, typed confirmation mismatch,
missing or unapproved approval receipts, approval mismatch, timeout over the
configured bound, output bytes over the configured bound, missing redaction
summary, redaction summaries that detect raw output, missing event summaries,
missing replay projections, event/replay descriptor mismatch, raw args, raw
output, command fields, EventStore write fields, API key markers,
Authorization/Bearer markers, secret markers, and any readiness flag that
claims MCP/App/Git/shell execution.

## Output

The output remains summary-only:

- `consistency_ready | warning | blocked`
- deterministic consistency id and hash
- hashed tool id and descriptor id
- MCP profile ref
- hashed approval receipt summary
- output byte count and output summary hash
- redaction counts
- event/replay evidence counts
- safe finding codes and counts
- readiness flags with execution disabled

The helper never returns raw tool args, raw tool output, raw stdout/stderr,
raw EventStore payload, commands, API keys, Authorization headers, Bearer
tokens, or secret values.

## Relation to P1H

This is the runtime implementation for `DW-P1H-003`. It narrows the existing
MCP read-only lane to consistency checks between contracts, approvals,
redaction evidence, events, and replay projections. It feeds later replay
completeness, redaction audit, and App read-only audit surfaces without
enabling mutating MCP tools or arbitrary external capability execution.
