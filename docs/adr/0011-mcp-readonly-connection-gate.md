# ADR 0011: MCP Read-only Connection Gate

## Status

Accepted for the P0V design gate.

## Context

v0.17 completed the Capability Host descriptor preview. It can parse MCP,
plugin, and skill metadata descriptors, route safe summaries into Capability
Broker previews, and show read-only App surfaces. It does not connect to MCP
servers or invoke external capabilities.

v0.18 opens a narrower path: explicit MCP read-only discovery for server,
resources, prompts, and tools metadata. This is not a general MCP runtime. The
goal is metadata discovery only.

## Decision

- v0.18 only supports read-only MCP discovery.
- Discovery may include initialize / server info, resources metadata list,
  prompts metadata list, and tools metadata list.
- Discovery must not include `tools/call`.
- Discovery must not read resource content by default.
- Discovery must not execute prompts.
- Discovery must not perform mutating operations.
- MCP connection must be explicit.
- Stdio launch must be fixed profile / allowlisted only.
- User-supplied arbitrary commands are not allowed.
- Shell execution is not allowed.
- App surfaces remain read-only.
- Capability Broker receives metadata descriptors only.
- Risk classification is required before App display.
- Redaction audit is required before App display.

## Non-Goals

- no MCP tool invocation
- no mutating MCP operation
- no resource content read by default
- no prompt execution
- no arbitrary process spawn
- no user-supplied command execution
- no App hidden connection
- no external mutation
- no plugin code execution
- no skill runtime execution
- no native bridge
- no desktop action
- no broad PermissionLease

## Required Gates

- Connection profiles must validate fixed safe transport metadata.
- Stdio launch, if later implemented, must use allowlisted fixed profiles only.
- JSON-RPC request construction must be limited to read-only metadata methods.
- `tools/call` and mutating methods must fail closed.
- Resource content reads must be absent by default.
- Metadata must pass size, timeout, schema, and redaction gates.
- Capability Broker must treat MCP output as metadata descriptors only.
- App UI must not contain enabled connect, invoke, mutate, install, or run
  controls.
- Boundary checks must keep blocking App fetch/network, arbitrary process
  spawn, shell execution, native bridge, and desktop action.

## Consequences

The path to richer MCP support remains slower, but the boundary is testable:
metadata can enter broker/App preview surfaces without granting execution
authority.
