# App / Tauri MCP Read-only Tool Command v0.19

## Scope

P0X-004 adds the fixed Tauri command `call_mcp_readonly_tool` plus the
TypeScript wrapper `callMcpReadonlyTool`.

This is not a generic MCP invocation bridge. The command accepts only a fixed
request shape with a fixed injected MCP profile, a read-only contract summary,
an approval receipt, safe argument summary, safe argument values, bounded output,
and bounded timeout.

## Command Boundary

The command requires:

- `connectionProfileRef`
- fixed `serverProfile` with `serverKind: "mcp"` and
  `transportKind: "injected_test_transport"`
- `toolContractSummary` with read-only declaration, allowlisted argument keys,
  approval requirement, output limit, and timeout
- `approvalReceipt` with exact typed confirmation:
  `CALL READONLY MCP TOOL`
- `argumentSummary`
- `argumentValues`
- `maxOutputBytes`
- `timeoutMs`

The command blocks raw API keys, Authorization or bearer values, arbitrary
commands, arbitrary server spawn, plugin code, skill runtime, mutating tools,
raw prompts, raw source, raw diffs, raw CSV, stdout, stderr, EventStore writes,
apply, rollback, PermissionLease, native bridge, and desktop action fields.

## Execution Boundary

The MVP uses a fixed injected summary transport. It does not spawn a server, run
shell, run Git, fetch network, load plugins, run skills, or expose arbitrary
MCP `tools/call`.

The fixed command may produce a summary-only read-only result when all gates
pass:

- contract says read-only
- allowlist summary passes
- approval receipt is valid
- typed confirmation matches exactly
- arguments are allowlisted
- timeout is bounded
- output size is bounded
- output redaction passes

## Output Boundary

The result includes only:

- call id
- tool id
- connection profile ref
- output hash
- output byte and line counts
- redaction counts
- warning codes
- `eventPreview.notWritten: true`
- false execution readiness flags

It does not include raw tool output or raw args. It does not write EventStore.

## App Wrapper

`app/src/desktop-flow.ts` exposes only the fixed wrapper
`callMcpReadonlyTool()`, which invokes `call_mcp_readonly_tool`. It does not
provide generic MCP invoke, generic server spawn, plugin runtime, skill runtime,
or hidden App invocation.

The App UI remains unwired for live read-only MCP execution until later P0X
surface work.

## Non-Goals

- no generic MCP invocation
- no mutating MCP tools
- no plugin or skill runtime
- no EventStore write
- no App hidden invocation
- no arbitrary process spawn
- no arbitrary shell command
- no Git write command
- no broad PermissionLease
- no native bridge
- no desktop action

## Relation to P0X

P0X-004 establishes the fixed App/Tauri command boundary. P0X-005 may integrate
summary-only events and replay, and P0X-006 may expose an explicit approval UI,
but neither may bypass this fixed command contract.
