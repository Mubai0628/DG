# Runtime MCP Tool Input Risk v0.18

`runtime/src/capabilities/mcp-tool-input-risk.ts` validates summary-only MCP
tool input schema descriptions and classifies their risk before any approval or
simulation surface.

## Scope

- Accept summary-only schema descriptions or JSON string inputs.
- Classify risk categories including read-only metadata, resource access,
  external network, filesystem read, filesystem write, command execution,
  credential access, user workspace mutation, desktop action, and unknown.
- Block schemas that request filesystem writes, command execution,
  credential/API key access, user workspace mutation, desktop action, raw
  schema fields, secret-like markers, or automatic invocation.
- Hash schema summaries and output counts, findings, risk level, approval
  requirement, manual-only status, and readiness flags.

## Boundaries

- No MCP `tools/call`.
- No mutating MCP tool execution.
- No raw input schema output.
- No raw args or raw tool output.
- No secret, API key, Authorization, bearer token, or env value output.
- No EventStore write.
- No apply or rollback.
- No Git or shell execution.
- No PermissionLease issuing.
- No native bridge or desktop action.

## Summary-Only Output

The risk report returns schema hash, byte and line counts, risk categories,
risk level, approval requirement, manual-only status, blocker/warning counts,
and readiness flags. Invocation readiness flags always remain false.

## Relation To P0W

- P0W-002 creates the MCP tool invocation proposal schema.
- P0W-003 classifies the tool input schema summary before approval.
- P0W-004 consumes proposal and risk summaries for simulated results without
  calling `tools/call`.
- P0W-005 maps these summaries into Capability Broker planning previews.
- P0W-006 displays the chain in App read-only surfaces.
