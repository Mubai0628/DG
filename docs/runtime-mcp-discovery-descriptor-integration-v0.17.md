# Runtime MCP Discovery Descriptor Integration v0.17

`runtime/src/capabilities/mcp-discovery-descriptor-integration.ts` converts
MCP read-only discovery summaries into Capability Broker descriptor previews.

This is metadata projection only. It does not register descriptors for
execution, issue leases, invoke tools, read resources, execute prompts, mutate
state, write EventStore records, spawn processes, run Git/shell, or call a
native bridge.

## Inputs

The helper accepts a read-only MCP discovery result from either:

- the metadata-only discovery summarizer, or
- the injected-transport read-only discovery client.

Optional profile summary and risk policy metadata may be supplied as safe
summary refs only.

## Descriptor Categories

The projection creates descriptor previews with these categories:

- `mcp_resource`
- `mcp_prompt`
- `mcp_tool_metadata`

Resource and prompt metadata descriptors use `READ_ONLY_METADATA`.
Tool metadata descriptors always use `DISABLED`.

Every descriptor uses:

- `sourceType: "mcp"`
- `executionMode: "METADATA_ONLY"`
- `canInvoke: false`
- `canIssueLease: false`

## Risk Rules

The helper infers risk from safe names and descriptions. Mutating-looking tool
metadata such as write, delete, mutate, apply, rollback, commit, push, shell,
command, or exec is marked high risk and remains disabled.

## Blockers

The integration fails closed for:

- raw args
- raw prompt/source/diff/response fields
- secret-like markers
- tool call availability
- mutating tools marked enabled
- unknown source
- duplicate descriptor ids
- invocation/execution/mutation readiness set to true

Blocked results return no descriptor previews.

## Output

The result is summary-only:

- descriptor counts
- category counts
- risk mapping
- policy mapping
- warning/blocker codes
- integration hash
- readiness flags

All execution readiness flags remain false. A ready descriptor preview does not
enable invocation, lease issuance, App execution, Git/shell, native bridge, or
desktop action.

## Relation to P0V

P0V-005 prepares MCP metadata for broker surfaces before the App displays the
connection surface. It intentionally stops at descriptor preview and does not
connect to invocation or PermissionLease issuance.

## Non-goals

- No capability invocation.
- No PermissionLease issuance.
- No MCP `tools/call`.
- No resource content read.
- No prompt execution.
- No EventStore write.
- No App execution.
- No Git or shell execution.
- No native bridge or desktop action.
