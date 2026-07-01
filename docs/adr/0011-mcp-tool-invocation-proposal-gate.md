# ADR 0011: MCP Tool Invocation Proposal Gate

## Status

Accepted for P0W design gate.

## Context

v0.18 introduced MCP read-only connection and discovery metadata. It can list
resources, prompts, and tools metadata through fixed profiles and typed
confirmation, then route metadata into Capability Broker descriptors and App
read-only summaries.

The next step is not execution. P0W defines how MCP tools may be represented as
invocation proposals, risk classifications, approval drafts, and simulated
results. This keeps MCP tool planning visible while preserving the hard v0.19
boundary: no real MCP `tools/call`.

## Decision

- MCP tools may enter the system only as invocation proposals.
- P0W does not execute MCP `tools/call`.
- Tool args must be schema-validated and summary-only in UI/events.
- Mutating tools are disabled.
- Read-only tools still require proposal, risk, and approval draft.
- Capability Broker owns risk classification and invoke policy.
- Approval draft is not a production PermissionLease.
- Simulated result is not real tool output.
- App must not execute MCP tool.

## Non-Goals

- no real MCP `tools/call`
- no mutating MCP tool execution
- no MCP resource content read by default
- no plugin code execution
- no skill runtime execution
- no arbitrary process spawn
- no arbitrary shell command
- no App hidden MCP invocation
- no App automatic tool invocation
- no production PermissionLease issuing
- no native bridge
- no desktop action
- no autonomous agent tool execution

## Required Gates Before Implementation

- Metadata safety test proves malicious tool descriptions cannot become
  invocation authority.
- Input schema safety test proves schemas are summarized and bounded.
- Argument redaction test proves raw args and secret-like args are blocked.
- Risk classification test proves mutating, credential, filesystem, command,
  network, desktop, and unknown risk categories are disabled or manual-only.
- Approval draft test proves no production PermissionLease is issued.
- Simulation boundary test proves simulated results are never real tool output.
- Broker integration test proves no AUTO invocation policy exists.
- App UI safety test proves the App exposes only read-only proposal state.
- Boundary / CI safety test proves no `tools/call`, resource content read,
  EventStore raw write, native bridge, desktop action, arbitrary process spawn,
  arbitrary shell, or hidden App invocation was added.

## Consequences

- MCP tool planning becomes inspectable before execution exists.
- Risk and approval semantics are designed before any live invocation path.
- The system gains more proposal surface area, but every execution readiness
  flag remains false.
- Later execution work must start from this proposal-first contract instead of
  bypassing it.
