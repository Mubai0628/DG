# Runtime MCP Read-only Discovery v0.17

`runtime/src/capabilities/mcp-readonly-discovery.ts` now exposes
`runMcpReadOnlyDiscovery()` for metadata-only MCP discovery through an injected
transport.

This client is runtime-only and transport-injected. It does not spawn a process,
open a network connection, call `fetch`, connect from the App Shell, invoke MCP
tools, read MCP resources, execute prompts, mutate state, write files, or write
EventStore records.

## Allowed Methods

Only these JSON-RPC methods can be sent through the injected transport:

- `initialize`
- `resources/list`
- `prompts/list`
- `tools/list`

The client blocks `tools/call`, `resources/read`, `prompts/get`, and any
unknown method before the transport is called.

## Inputs

The client requires a validated MCP connection profile from P0V-002 and an
injected transport. The profile must keep `allowReadResource`,
`allowCallTool`, `allowPromptExecution`, and `allowMutation` false.

Timeout, item, and metadata byte limits cannot exceed the validated profile
limits. A profile or discovery request that attempts execution readiness fails
closed.

## Output

The discovery result is summary-only:

- discovery id
- profile id
- server info summary
- resource metadata summaries
- prompt metadata summaries
- tool metadata summaries
- counts
- warning/blocker codes
- discovery hash

The result never contains raw request args, raw prompt text, raw response text,
raw source, raw diff, API keys, Authorization headers, stdout, or stderr.

## Metadata Safety

The client blocks:

- malformed JSON-RPC responses
- oversized metadata
- secret-like markers
- raw prompt/source/diff/API-key fields
- mutating tool metadata that lacks a risk warning
- readiness flags that claim invocation, execution, resource read, mutation, or
  App execution

Transport errors are summarized without returning thrown error text, stderr, or
raw response bodies.

## Relation to P0V

P0V-003 connects the P0V-002 connection profile schema to a pure injected
runtime transport. P0V-004 may add a narrow Tauri command later, but this
runtime helper still does not launch stdio, call network, or execute tools by
itself.

## Non-goals

- No process spawn.
- No default stdio launch.
- No fetch/network.
- No App connection.
- No MCP `tools/call`.
- No resource content read.
- No prompt execution.
- No mutation.
- No EventStore write.
- No Git or shell execution.
- No native bridge or desktop action.
