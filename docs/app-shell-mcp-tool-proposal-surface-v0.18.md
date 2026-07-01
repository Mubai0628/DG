# App Shell MCP Tool Proposal Surface v0.18

P0W-006 adds an App Shell preview surface for MCP tool invocation proposals.
It is read-only and proposal-only: the App can display summary refs, but it
cannot invoke MCP tools.

## Scope

- Accept pasted summary-only MCP tool proposal JSON.
- Show server ref, tool name, risk level, input schema summary, argument
  summary hash, approval requirement, simulated result summary, broker planning
  summary, finding counts, readiness flags, and next action.
- Project safe proposal refs into the existing Approval, Audit, and Context
  Assembly preview surfaces.
- Place the MCP tool proposal summary in `no_compress_zone` as hash/count/code
  metadata only.

## Safety Boundary

- No real MCP `tools/call`.
- No App tool invocation.
- No approval execution.
- No mutating MCP tools.
- No MCP resource content read.
- No raw tool arguments.
- No raw tool output.
- No raw prompt, source, diff, DOM, CSV, or response.
- No API key, token, Authorization header, secret, or private key.
- No EventStore write.
- No PermissionLease issuing.
- No Tauri command for MCP tool calls.
- No apply or rollback.
- No Git or shell execution.
- No native bridge or desktop action.

## App Behavior

The `MCP Tool Invocation Proposal` panel has the badge
`Proposal only / no tool invocation`.

The `Preview MCP Tool Proposal` button only updates React state. It does not
call Tauri, MCP, fetch/network, EventStore, Git, shell, or any capability host
execution path.

The disabled placeholders are:

- `Invoke MCP Tool (disabled)`
- `Approve Tool Invocation (disabled)`

Blocked proposals display safe finding codes only. Raw arguments, raw outputs,
resource content, and model or tool payloads are never rendered.

## Relation To P0W

- P0W-002 defines the runtime MCP tool invocation proposal schema.
- P0W-003 classifies tool input schema and argument risk.
- P0W-004 provides simulated results without calling MCP tools.
- P0W-005 projects proposal summaries into Capability Broker planning.
- P0W-006 displays that chain in the App as read-only preview data.
- P0W-007 will audit redaction and boundary invariants for proposal surfaces.

## Non-Goals

- No real MCP tool invocation.
- No App approval execution.
- No broad PermissionLease.
- No EventStore writer.
- No plugin or skill runtime.
- No Git/shell execution.
- No native bridge.
- No desktop action.
