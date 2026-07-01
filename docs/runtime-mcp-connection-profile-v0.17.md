# Runtime MCP Connection Profile v0.17

`runtime/src/capabilities/mcp-connection-profile.ts` defines the schema,
validator, and summarizer for MCP read-only connection profiles.

This is a data contract only. It does not connect to an MCP server, spawn a
process, open a network transport, invoke a tool, read a resource, execute a
prompt, mutate state, write files, or write EventStore records.

## Profile Shape

The profile keeps only safe refs and limits:

- `profileId`
- `displayName`
- `serverKind: "mcp"`
- `transportKind: "injected_test_transport" | "stdio_fixed"`
- `serverRef`
- optional opaque refs for `commandRef`, `argvTemplateId`,
  `workingDirectoryRef`, and `allowedRootRef`
- `readOnlyPolicy`
- `timeoutMs`
- `maxMetadataBytes`
- `maxItems`

`commandRef` and `argvTemplateId` are refs only. They are not raw commands,
argv arrays, shell strings, paths, or user-supplied process instructions.

## Read-only Policy

The policy must keep discovery read-only:

- `allowInitialize: true`
- `allowListResources`, `allowListPrompts`, and `allowListTools` are explicit
  booleans.
- `allowReadResource: false`
- `allowCallTool: false`
- `allowPromptExecution: false`
- `allowMutation: false`

Any attempt to enable tool calls, resource reads, prompt execution, mutation,
or execution readiness fails closed.

## Blocked Inputs

The validator blocks:

- unknown transport kinds
- raw command fields
- raw argv fields
- shell metacharacters or executable paths in launch refs
- oversized timeouts or metadata limits
- missing safe profile ids
- secret-like markers
- raw prompt, raw response, raw source, or raw diff fields
- environment/stdout/stderr fields
- desktop action or native bridge fields

Blocked results do not echo raw command values, secret-like values, raw prompt
text, raw response text, raw source, or raw diff.

## Output

`summarizeMcpConnectionProfile()` returns summary-only profile metadata:

- profile id and display name
- transport kind
- hashed server/command/argv refs
- read-only policy booleans
- limit values
- profile hash

Readiness flags for connection, process spawn, tool invocation, resource read,
prompt execution, mutation, network, EventStore write, Git, shell, and App
execution are always false. A parsed profile only means it can feed a future
read-only discovery step.

## Relation to P0V

P0V-002 supplies the profile schema required before P0V-003 can build an
injected-transport discovery client. It intentionally does not implement MCP
transport, stdio spawning, tool invocation, resource reads, or App execution.

## Non-goals

- No MCP connection.
- No process spawn.
- No network.
- No MCP `tools/call`.
- No resource content read.
- No prompt execution.
- No mutation.
- No App execution.
- No Git or shell execution.
- No native bridge or desktop action.
