# Runtime MCP Tool Simulated Result v0.18

`runtime/src/capabilities/mcp-tool-simulated-result.ts` models dry-run MCP tool
results for approval preview without calling MCP `tools/call`.

## Scope

- Accept an MCP tool invocation proposal summary.
- Accept an MCP tool input risk report summary.
- Accept a summary-only simulated result fixture.
- Produce a simulated result summary with result hash, byte count, warning
  codes, readiness flags, and safe findings.

## Hard Blocks

- Raw tool output.
- Raw MCP resource content.
- Raw prompt, raw response, raw source, raw diff, raw DOM, raw CSV, or file
  content fields.
- Secret-like markers, API key values, Authorization values, bearer tokens, or
  env values.
- Binary or oversized output summaries.
- Claims that a real tool was called.
- Claims that workspace mutation happened.
- Claims that EventStore writes happened.

## Boundaries

- No real `tools/call`.
- No mutating MCP tool execution.
- No MCP resource content read.
- No EventStore write.
- No apply or rollback.
- No Git or shell execution.
- No PermissionLease issuing.
- No native bridge or desktop action.

## Summary-Only Output

The model stores result hash, result byte and line counts, warning codes,
proposal/risk refs, simulated-only flags, findings, and readiness flags. It does
not store raw output or any evidence of real execution.

## Relation To P0W

- P0W-002 builds the invocation proposal schema.
- P0W-003 classifies input schema risk.
- P0W-004 produces simulated result summaries only.
- P0W-005 maps proposal, risk, and simulated result summaries into Capability
  Broker planning previews.
