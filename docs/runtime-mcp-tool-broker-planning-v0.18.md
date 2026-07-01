# Runtime MCP Tool Broker Planning v0.18

`runtime/src/capabilities/mcp-tool-broker-planning.ts` projects MCP tool
invocation proposals into Capability Broker planning previews without invoking
MCP tools.

## Scope

- Accept an MCP tool invocation proposal summary.
- Accept an MCP tool input risk report summary.
- Accept an MCP tool simulated result summary.
- Produce an external capability descriptor preview, invocation policy preview,
  risk classification, approval draft requirement, lease preview, and
  summary-only event preview.

## Policy

- Read-only MCP tools can only enter proposal, approval, and simulation preview.
- Mutating tools are disabled.
- High or unknown risk tools are disabled/manual-only.
- AUTO invocation is rejected.
- PermissionLease grants are never issued.
- EventStore writes are never performed.

## Summary-Only Output

The broker planning helper stores descriptor ids, risk levels, policies,
approval preview refs, lease preview refs, event preview hashes, findings, and
readiness flags. It does not store raw arguments, raw tool output, raw resource
content, secrets, prompts, responses, or execution evidence.

## Non-Goals

- No real MCP `tools/call`.
- No mutating MCP tool execution.
- No MCP resource content read.
- No EventStore write.
- No PermissionLease issuing.
- No App hidden invocation.
- No Git or shell execution.
- No native bridge or desktop action.

## Relation To P0W

- P0W-002 builds the MCP tool invocation proposal schema.
- P0W-003 classifies input schema risk.
- P0W-004 builds simulated result summaries.
- P0W-005 integrates the summaries into broker planning previews.
- P0W-006 displays this chain in a read-only App surface.
