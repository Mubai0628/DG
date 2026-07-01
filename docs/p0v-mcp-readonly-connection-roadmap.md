# P0V MCP Read-only Connection Roadmap

## Goal

P0V introduces an MCP read-only connection / discovery MVP after the v0.17
Capability Host descriptor preview. The goal is to discover MCP server
resources, prompts, and tools metadata, then route that metadata through the
Capability Broker and App read-only surfaces without enabling tool invocation
or external mutation.

## Non-Negotiable Boundaries

- no MCP tool invocation
- no MCP mutating tools
- no MCP resource content read by default
- no arbitrary process spawn
- no user-supplied command execution
- no App hidden MCP connection
- no external mutation
- no plugin code execution
- no skill runtime execution
- no native bridge
- no desktop action
- no broad PermissionLease
- no autonomous agent tool execution

## Allowed Direction

- profile-gated MCP read-only discovery
- injected transport / fake transport tests
- fixed allowlist for stdio server launch if a Tauri bridge is added
- metadata-only resources/prompts/tools listing
- Capability Broker integration with read-only MCP metadata
- App read-only connection surface
- metadata redaction / boundary audit
- summary-only events only when explicitly specified and raw-safe

## Recommended Tasks

1. `DW-P0V-001` - MCP Read-only Connection ADR / Threat Model /
   Implementation Gate.
2. `DW-P0V-002` - MCP Connection Profile Schema.
3. `DW-P0V-003` - Runtime MCP Read-only Discovery Client, injected transport
   only.
4. `DW-P0V-004` - Tauri Fixed MCP Read-only Discovery Command, no tool
   invocation.
5. `DW-P0V-005` - Capability Broker Integration with MCP Read-only Metadata.
6. `DW-P0V-006` - App MCP Read-only Connection Surface.
7. `DW-P0V-007` - MCP Metadata Redaction / Boundary Audit.
8. `DW-P0V-008` - MCP Read-only Connection Smoke / Hardening.
9. `DW-P0V-009` - v0.18 RC polish + full gates + push/tag/release.

## Deferred Work

- MCP `tools/call`
- mutating MCP operations
- resource content reads by default
- plugin installation or code execution
- skill runtime execution
- arbitrary Git/shell execution
- native bridge
- desktop action
- autonomous agent tool execution
- broad PermissionLease

## Success Criteria

P0V succeeds when MCP read-only metadata can be discovered through explicit,
bounded, testable paths and can be previewed in broker/App surfaces while every
execution readiness flag remains false.
