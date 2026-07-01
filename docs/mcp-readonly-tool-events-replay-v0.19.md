# MCP Read-only Tool Events and Replay v0.19

P0X-005 integrates MCP read-only tool results with Capability Broker
descriptors, summary-only events, and replay projection. It does not add a new
App execution surface and does not broaden MCP invocation beyond the fixed
read-only wrapper.

## Scope

- Add summary-only event types for MCP read-only tool proposals, approvals,
  executions, results, and rejections.
- Add a fixed MCP read-only Capability Broker descriptor shape.
- Project event records into replay summaries with counts, output hashes,
  redaction counts, and warning counts.
- Keep payloads free of raw arguments, raw output, API keys, Authorization
  headers, Bearer tokens, raw prompts, raw source, raw diffs, and workspace file
  contents.

## Event Types

The runtime EventStore recognizes these event types:

- `mcp.readonly_tool.proposed`
- `mcp.readonly_tool.approved`
- `mcp.readonly_tool.executed`
- `mcp.readonly_tool.result`
- `mcp.readonly_tool.rejected`

Payloads contain summary fields only:

- `connectionProfileRef`
- `toolId`
- `contractId`
- `receiptId`
- `callId`
- `outputHash`
- `outputBytes`
- redaction counts
- warning count and warning codes
- `rawArgsIncluded: false`
- `rawOutputIncluded: false`
- `summaryOnly: true`

The event payload never contains raw MCP tool arguments or raw MCP tool output.
The helper rejects secret-like markers before appending events.

## Capability Broker

The allowed broker descriptor is narrow:

- `sourceType: "mcp"`
- id prefix `mcp.readonly_tool.`
- risk level `A0_observe` or `A1_read`
- invoke policy `ASK_FIRST` or `MANUAL_ONLY`
- execution mode `READ_ONLY`
- dry-run support required
- user elicitation required
- memory writes disabled
- event types limited to the MCP read-only summary event family

This does not enable AUTO invocation, mutating MCP tools, plugin runtime, skill
runtime, broad PermissionLease issuance, shell execution, Git execution, native
bridge, or desktop action.

## Replay

Replay projection shows:

- proposal count
- approval count
- execution count
- result count
- rejection count
- tool ids
- call ids
- output hashes
- redaction counts
- warning counts

Replay does not show raw output, raw args, raw prompts, raw source, raw diffs,
API keys, Authorization headers, Bearer tokens, stdout, or stderr.

## Non-goals

- No mutating MCP tool execution.
- No arbitrary MCP tool call.
- No generic plugin or skill runtime.
- No App hidden invocation.
- No new Tauri command.
- No App UI execution surface; P0X-006 handles explicit approval UI.
- No EventStore payload containing raw output or raw args.
- No Git/shell/native bridge/desktop action.

## Verification

Focused tests cover:

- summary-only MCP event payloads
- broker descriptor risk and invoke policy
- replay summary projection
- raw output absence
- rejected events for blocked tool calls
- mutating descriptor rejection
