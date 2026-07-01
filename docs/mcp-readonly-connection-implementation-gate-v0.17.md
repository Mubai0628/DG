# MCP Read-only Connection Implementation Gate v0.17

Do not implement MCP read-only connection until each gate below has testable
coverage.

## Connection Profile Safety

- schema blocks missing profile id, unsafe transport, raw command fields, and
  unsupported endpoints
- profile id and display names are summary-safe
- Windows paths are normalized and checked when fixed stdio profiles are used

## Stdio / Transport Safety

- no shell interpreter
- no user-supplied argv
- no arbitrary process spawn
- fixed allowlist for stdio launch profiles
- injected fake transport tests cover discovery without real process launch

## Metadata Schema Safety

- server info, resources, prompts, and tools metadata have bounded summary
  schemas
- oversized metadata blocks
- malformed JSON-RPC blocks
- raw prompt/source/diff/API key markers block

## No Tool Invocation Safety

- `tools/call` is absent from request builders
- `tools/call` in input or output blocks
- mutating methods block
- prompt execution blocks

## No Resource Read Safety

- resource list metadata is allowed
- resource content read is not allowed by default
- content-like fields are redacted or blocked

## Process / Command Safety

- command, shell command, git command, and native bridge fields block
- stderr is summarized and redacted if later surfaced
- timeout and process exit summaries never include raw output

## Timeout / Size Limit Safety

- request timeout is bounded
- response size is bounded
- descriptor count is bounded
- hung transport fails closed

## Redaction Safety

- metadata redaction audit runs before App display
- secret markers block
- raw args, raw prompt, raw source, raw diff, raw response, and API key markers
  block

## Capability Broker Safety

- MCP discovery output enters broker as metadata descriptors only
- risk classification is required
- approval / lease output remains preview-only

## App UI Safety

- App surface is read-only
- no hidden connection
- no enabled tool invocation
- no enabled mutation
- no EventStore raw metadata write
- no App fetch/network

## CI / Boundary Safety

- scoped runtime tests use explicit Vitest paths
- App docs/source boundary tests cover disabled controls
- boundary checker keeps blocking fetch/network, process spawn, shell execution,
  native bridge, and desktop action
