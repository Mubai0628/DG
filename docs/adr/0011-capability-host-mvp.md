# ADR 0011: Capability Host MVP

## Status

Proposed / Accepted for P0U design gate.

## Context

P0T completed the production memory and project knowledge MVP. The next phase
introduces a Capability Host MVP for MCP, plugin, and skill ecosystem metadata,
but the project is not ready to execute external tools. External capability
surfaces can carry prompt injection, secret leakage, command smuggling, path
traversal, dependency confusion, and approval-bypass risk before any runtime
tool call exists.

P0U therefore starts with a descriptor-first design. It lets the Workbench
discover, validate, normalize, classify, and preview external capability
metadata through existing broker and preview surfaces while preserving the
current execution boundary.

## Decision

- Capability Host is descriptor-first.
- MCP / plugin / skill sources are represented as metadata descriptors.
- No external capability execution in v0.17.
- No MCP stdio/http connection in v0.17.
- No MCP HTTP/SSE/WebSocket connection in v0.17.
- No plugin code loading, import, eval, or execution.
- No skill runtime execution.
- Capability Broker is the only integration boundary.
- External descriptors must map to risk / source type / invocation policy.
- External descriptors must also map to approval preview and lease preview.
- All external capabilities default to disabled or manual-only preview.
- App surface remains read-only.
- Descriptor summaries are safe metadata contracts, not execution handles.

## Descriptor Boundary

Allowed descriptor data:

- capability id, name, summary, source type, package identity, and version.
- MCP / plugin / skill kind as metadata only.
- declared input schema summary, output schema summary, and risk labels.
- invocation policy summary with disabled or manual-only preview defaults.
- approval and PermissionLease preview metadata.
- safe documentation refs, hash prefixes, warning codes, and provenance refs.

Forbidden descriptor data:

- raw arguments.
- API keys, tokens, Authorization headers, passwords, or env values.
- command, shellCommand, gitCommand, tauriCommand, desktopAction, nativeBridge,
  or process launch fields.
- MCP stdio command lines, HTTP/SSE/WebSocket endpoints that would enable a
  connection, or executable plugin entrypoints.
- raw prompt, raw source, raw diff, raw DOM, raw CSV, stdout, stderr, or file
  contents.

## Non-goals

- No runtime descriptor parser implementation in P0U-001.
- No App feature implementation in P0U-001.
- No MCP tool invocation.
- No MCP stdio process launch.
- No MCP HTTP/SSE/WebSocket connection.
- No plugin code loading.
- No skill runtime execution.
- No external capability execution.
- No App execution.
- No file write.
- No EventStore write that implies external execution.
- No apply or rollback.
- No arbitrary Git/shell.
- No production PermissionLease issuing for external capabilities.
- No native bridge.
- No desktop action.

## Required Gates Before Future Execution

- Descriptor schema safety exists and blocks command/execution/secret/raw fields.
- Source identity safety exists and handles id collisions, version spoofing, and
  dependency confusion.
- Path and URL metadata safety exists and blocks traversal, local file
  disclosure, private endpoints, and executable endpoint leakage.
- Command and execution field safety exists and is covered by tests.
- Secret and redaction safety exists and proves output is summary-only.
- Capability Broker mapping safety exists and keeps descriptors in preview-only
  policy states.
- App UI safety exists and has no enabled execution controls.
- CI and boundary checker safety exist for App/runtime no-execution guarantees.
- Docs and replay safety exist so descriptor previews cannot be confused with
  external execution events.

```text
Do not implement MCP/plugin/skill execution until descriptor, broker, audit, App UI, and redaction gates are complete.
```

## Consequences

- P0U moves slower toward external capability use, but avoids treating metadata
  as trusted code.
- Future runtime helpers can reuse the same descriptor schema, redaction audit,
  broker preview, and App read-only surface.
- App users can inspect external capability risk and policy posture without
  allowing MCP, plugin, skill, native bridge, desktop action, Git, shell, or
  arbitrary process execution.
