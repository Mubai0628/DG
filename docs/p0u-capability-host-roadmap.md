# P0U Capability Host Roadmap

## Goal

P0U introduces a descriptor-first Capability Host MVP for MCP, plugin, and skill
ecosystem metadata. The goal is to let the Workbench discover, validate, map,
classify, and preview external capability descriptors through the existing
Capability Broker and Control Plane without executing any external capability.

## Scope

Allowed in P0U:

- MCP / plugin / skill metadata only.
- Read-only discovery and listing.
- Descriptor schema validation.
- Package and skill metadata scanning.
- Capability Broker descriptor mapping.
- Risk, policy, approval, and lease preview.
- App read-only Capability Host surface.
- Redaction and boundary audit.

Not allowed in P0U:

- MCP tool invocation.
- MCP stdio process launch.
- MCP HTTP/SSE/WebSocket connection.
- Plugin code loading, import, eval, or execution.
- Skill runtime execution.
- External process launch.
- Network fetch from App or runtime capability host.
- Native bridge.
- Desktop action.
- Arbitrary Git or shell.
- Broad PermissionLease.
- File mutation from capability metadata.
- EventStore writes that imply external execution occurred.

## MVP Preview Chain

```text
external capability metadata / manifest
-> schema validation
-> read-only discovery/listing
-> package/skill metadata scan
-> Capability Broker descriptor mapping
-> risk / policy / lease preview
-> App read-only Capability Host surface
-> redaction / boundary audit
-> RC release
```

## Recommended Tasks

1. P0U-001 Capability Host ADR / Threat Model / Implementation Gate
   - Design only.
   - Lock descriptor-first and no-execution policy.
2. P0U-002 Capability Descriptor Manifest Schema
   - Runtime schema, validator, normalizer, summarizer.
   - No external execution.
3. P0U-003 Read-only MCP Discovery / Listing
   - List configured descriptor metadata only.
   - No MCP stdio, HTTP, SSE, WebSocket, or tool invocation.
4. P0U-004 Plugin / Skill Package Metadata Scanner
   - Scan manifests and skill metadata only.
   - No plugin import/eval and no skill runtime execution.
5. P0U-005 Capability Broker Integration with External Descriptors
   - Map descriptors into broker preview structures.
   - Risk and invocation policy summary only.
6. P0U-006 App Capability Host Surface
   - Read-only App surface for descriptors, risks, and previewed leases.
   - No execution controls.
7. P0U-007 Redaction / Boundary Audit for External Capability Metadata
   - Summary-only audit over descriptors and broker previews.
   - Block raw args, secrets, command smuggling, and endpoint leakage.
8. P0U-008 v0.17 RC polish + release
   - Full gates, push, tag, GitHub prerelease.

## Deferred

- Real MCP execution.
- Plugin execution.
- Skill execution.
- Production PermissionLease issuing for external capability execution.
- Native bridge.
- Desktop action.
- Autonomous external tool use.
- Arbitrary Git or shell execution.

## Acceptance Invariants

- Capability descriptors are metadata contracts, not execution handles.
- All external capability entries default to disabled or manual-only preview.
- Capability Broker is the only integration boundary.
- App surfaces remain read-only.
- No external process, network connection, native bridge, desktop action,
  PermissionLease issuing, Git/shell command, or model-driven external tool
  execution is introduced.
