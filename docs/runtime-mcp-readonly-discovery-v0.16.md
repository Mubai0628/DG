# Runtime MCP Read-only Discovery v0.16

## Summary

`runtime/src/capabilities/mcp-readonly-discovery.ts` lists MCP capability
metadata from explicit summaries only. It does not connect to an MCP server and
does not invoke tools.

Allowed inputs are:

- metadata object.
- JSON string.
- list of descriptor summaries.
- safe external MCP manifest output from the descriptor schema.

## Boundary

The helper is read-only and metadata-only:

- No MCP stdio spawn.
- No MCP HTTP/SSE/WebSocket connection.
- No live MCP transport.
- No tool invocation.
- No resource read.
- No prompt execution.
- No App execution.
- No Tauri command.
- No EventStore write.
- No Git/shell.
- No native bridge.
- No desktop action.

## Validation

The helper blocks:

- any transport mode other than `metadata_only`.
- stdio/http/websocket/sse transport declarations.
- tool invocation samples.
- command fields.
- raw tool args.
- raw tool result.
- MCP stdio command metadata.
- MCP HTTP endpoint secret metadata.
- server process args.
- Authorization, bearer token, API key, token, password, or env fields.
- prompt raw content.
- duplicate tool ids.
- `AUTO` invocation.
- unknown source attempting execution.

The helper warns for:

- network resource metadata.
- filesystem resource metadata.
- missing or unknown tool schema summaries.
- prompt template metadata without a safe template summary.
- high-risk tools that are not disabled.

## Output

The result is summary-only:

- server, tool, resource, and prompt counts.
- safe server summaries.
- safe tool summaries.
- safe resource summaries.
- safe prompt summaries.
- blocker and warning counts.
- discovery hash.
- readiness flags.

All execution readiness flags remain false:

- `canConnectServer`
- `canInvokeTool`
- `canReadResource`
- `canExecutePrompt`
- `appCanExecute`

`canList` only means the metadata can be listed. It does not mean the App or
runtime can connect to MCP or execute a tool.

## Relation to P0U

This is P0U-003. It consumes explicit metadata from P0U-002-compatible
descriptor summaries and prepares later broker/App preview work without
expanding execution authority.
