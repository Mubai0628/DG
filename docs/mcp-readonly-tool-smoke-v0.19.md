# MCP Read-only Tool Smoke v0.19

This smoke path proves the controlled MCP read-only tool flow without requiring
a real external MCP server.

## Smoke Sequence

The safe fake smoke follows this sequence:

1. Profile discovery.
2. Tool contract validation.
3. Explicit approval with `CALL READONLY MCP TOOL`.
4. Fixed read-only tool call wrapper.
5. Summary event projection.
6. Replay summary projection.
7. Redaction audit.

## Boundaries

- No real external MCP is required.
- No mutating MCP tool is enabled.
- No arbitrary MCP tool call is allowed.
- No raw tool output is stored.
- No raw arguments are stored.
- No API key, Authorization, Bearer, token, raw prompt, raw source, or raw diff
  may enter summary output.
- No App EventStore write is performed.
- No Git/shell/native bridge/desktop action is performed.

## Expected Result

The smoke result is successful only when:

- the tool contract is read-only and allowlisted
- the typed confirmation matches exactly
- the call result is summary-only
- the summary events contain no raw output
- the replay summary contains no raw output
- the redaction audit is `audit_ready`
- every execution readiness flag remains false

## Non-goals

- No production MCP server dependency.
- No plugin runtime execution.
- No skill runtime execution.
- No broad PermissionLease.
- No mutating tool approval.
- No filesystem mutation.
- No App-side event write.
