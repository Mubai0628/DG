# App / Tauri MCP Read-only Discovery Command v0.17

`mcp_readonly_discover` is a narrow Tauri command for MCP read-only metadata
discovery.

The command is fixed-name and confirmation-gated. It is not a generic MCP
runner, not a generic process runner, and not an App-side tool invocation path.

## Command

- Name: `mcp_readonly_discover`
- Confirmation: `DISCOVER MCP METADATA`
- Inputs: validated profile metadata, `maxItems`, and `timeoutMs`

The current command supports the fixed `injected_test_transport` profile path
only. Safe stdio launch remains deferred because this stage does not add a
production allowlisted process launcher.

## Allowed Actions

The command models read-only discovery metadata for:

- `initialize`
- `resources/list`
- `prompts/list`
- `tools/list`

It never performs:

- `tools/call`
- `resources/read`
- `prompts/get`
- mutating tools
- prompt execution

## Safety Boundary

The command rejects:

- missing or wrong typed confirmation
- non-MCP profiles
- non-injected transport profiles in this stage
- unsafe profile refs
- raw command fields
- raw stdout/stderr fields
- raw prompt, response, source, or diff fields
- secret-like markers
- read resource, call tool, prompt execution, or mutation policy flags
- oversized item limits
- oversized runtime timeout

Results are summary-only and include:

- `discoveryId`
- `profileId`
- server info summary
- resource, prompt, and tool metadata summaries
- warning codes
- result hash

Results do not include raw metadata, raw stdout, raw stderr, API keys, raw
prompt text, raw response text, raw source, or raw diff.

## App Wrapper

`app/src/desktop-flow.ts` exposes `runMcpReadonlyDiscovery()`. The wrapper calls
only the fixed `mcp_readonly_discover` Tauri command and normalizes only
summary-only responses.

The App Shell does not add a generic invoke helper, hidden MCP connection,
tool-call button, resource-read button, prompt execution, mutation, EventStore
write, apply/rollback, Git, shell, native bridge, or desktop action.

## Relation to P0V

P0V-004 introduces the first Tauri command boundary for MCP metadata discovery,
but stdio remains deferred to a future safe launcher task. P0V-005 can consume
the returned metadata summaries as capability descriptors without enabling
invocation.

## Non-goals

- No production stdio launch.
- No arbitrary command or argv.
- No network/fetch.
- No MCP tool invocation.
- No resource content read.
- No prompt execution.
- No mutation.
- No EventStore write.
- No App execution.
- No Git or shell execution.
- No native bridge or desktop action.
