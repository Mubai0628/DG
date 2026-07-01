# App Shell MCP Read-only Tool Execution v0.19

P0X-006 adds the App Shell surface for explicit MCP read-only tool execution.
The surface calls only the fixed `callMcpReadonlyTool()` wrapper backed by the
fixed Tauri command `call_mcp_readonly_tool`.

## Scope

- Show connection profile, tool id/name, read-only risk summary, schema summary,
  argument summary, approval receipt, typed confirmation, result summary,
  redaction summary, and replay summary.
- Enable `Call Read-only MCP Tool` only when:
  - the fixed connection profile is present
  - the tool contract is read-only
  - the risk level is safe read-only
  - the approval receipt is present
  - the typed confirmation exactly matches `CALL READONLY MCP TOOL`
  - arguments are safe summary refs
  - no blockers are present
- Display result and replay summaries only.

## Safety Boundary

The App Shell does not expose:

- raw MCP tool output
- raw MCP tool arguments
- API keys
- Authorization or Bearer values
- arbitrary server commands
- generic MCP tool invocation
- mutating MCP tool buttons
- EventStore writes
- Git or shell execution
- broad PermissionLease issuance
- native bridge
- desktop action

The App does not call plugin runtime, skill runtime, or arbitrary MCP
`tools/call`. The only enabled path is the fixed read-only command with exact
approval.

## Result Surface

The result surface shows:

- call status
- output hash prefix
- output byte and line counts
- redaction counts
- warning codes
- `mcp.readonly_tool.result` event preview with `notWritten: true`
- replay result count

Raw output and raw args remain hidden. Event writing is left disabled in the
App surface.

## Relation to P0X

- P0X-002 defines the read-only contract schema.
- P0X-003 defines the runtime wrapper with injected transport only.
- P0X-004 adds the fixed Tauri command.
- P0X-005 adds summary-only events and replay integration.
- P0X-006 wires the explicit approval App surface.
- P0X-007 will add broader output redaction audit and smoke coverage.

## Non-goals

- No mutating MCP tool execution.
- No arbitrary MCP tool invocation.
- No generic plugin or skill runtime.
- No App EventStore write.
- No Git/shell/native bridge/desktop action.
