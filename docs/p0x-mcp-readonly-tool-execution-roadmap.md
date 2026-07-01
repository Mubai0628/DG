# P0X MCP Read-only Tool Execution Roadmap

P0X moves from v0.19 proposal-only MCP tool design to a controlled MVP for
read-only MCP tool execution. The phase is intentionally narrow: only
allowlisted read-only MCP tools may run, and only after fixed profile
selection, schema validation, risk classification, explicit approval receipt,
typed confirmation, bounded runtime execution, redacted summary result, and
summary-only replay.

## Goal

- controlled read-only MCP tool execution
- only read-only MCP tools
- fixed profile / fixed command
- allowlist and input schema validation
- explicit approval receipt and exact typed confirmation
- bounded timeout and output size
- redacted summary-only result
- summary-only events and replay
- no mutating tools
- no raw output persistence
- no App hidden invocation

## Required Invariants

- no mutating MCP tool
- no arbitrary MCP tool call
- no plugin code execution
- no skill runtime execution
- no desktop action
- no native bridge
- no broad PermissionLease
- no autonomous agent tool execution
- no arbitrary process spawn
- no arbitrary shell
- no Git execution beyond existing fixed safe lanes
- no raw tool output in events or UI
- no raw arguments in events
- no API key, Authorization, bearer token, or secret persistence

## Recommended Tasks

1. `DW-P0X-001` - MCP Read-only Tool Execution ADR / Threat Model /
   Implementation Gate.
2. `DW-P0X-002` - Read-only MCP Tool Allowlist / Invocation Contract Schema.
3. `DW-P0X-003` - Runtime MCP Read-only Tool Call Wrapper, injected transport
   only.
4. `DW-P0X-004` - Tauri Fixed MCP Read-only Tool Execution Command, approval
   required.
5. `DW-P0X-005` - Capability Broker / Event / Replay Integration for MCP Tool
   Results.
6. `DW-P0X-006` - App MCP Read-only Tool Execution Surface, explicit approval.
7. `DW-P0X-007` - MCP Tool Output Redaction / Boundary Audit / Smoke.
8. `DW-P0X-008` - v0.20 RC polish + full gates + push/tag/release.

## Deferred

- mutating MCP tools
- generic MCP tool invocation UI
- plugin code execution
- skill runtime execution
- arbitrary process spawn
- arbitrary shell execution
- broad PermissionLease
- native bridge
- desktop action
- autonomous agent tool execution
