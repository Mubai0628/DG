# P0W MCP Tool Invocation Proposal Roadmap

## Goal

P0W defines MCP tool invocation proposal / approval design after the v0.18 MCP
read-only connection MVP. The goal is to let MCP tool metadata become
schema-validated invocation proposals, risk classifications, approval drafts,
simulated results, Capability Broker planning previews, and App read-only
proposal summaries without executing real MCP `tools/call`.

## Non-Negotiable Boundaries

- no real MCP tool invocation
- no MCP `tools/call`
- no mutating MCP tools
- no MCP resource content read by default
- no plugin code execution
- no skill runtime execution
- no arbitrary process spawn
- no arbitrary shell command
- no App hidden MCP invocation
- no App automatic tool invocation
- no broad PermissionLease
- no native bridge
- no desktop action
- no autonomous agent tool execution
- no raw tool args, raw output, raw prompt, raw response, raw source, raw diff,
  or API key in events or App summaries

## Allowed Direction

- MCP tool invocation proposal model
- tool input schema validation
- risk classification
- approval draft preview
- simulated result only
- Capability Broker planning integration
- App read-only proposal surface
- redaction / boundary audit
- summary-only smoke and hardening checks

## Recommended Tasks

1. `DW-P0W-001` - MCP Tool Invocation Proposal ADR / Threat Model /
   Implementation Gate.
2. `DW-P0W-002` - MCP Tool Invocation Proposal Schema.
3. `DW-P0W-003` - MCP Tool Input Schema Validation / Risk Classifier.
4. `DW-P0W-004` - MCP Tool Dry-run / Simulated Result Model, no `callTool`.
5. `DW-P0W-005` - Capability Broker Planning Integration for MCP Tool
   Proposals.
6. `DW-P0W-006` - App MCP Tool Proposal Surface, read-only / no invocation.
7. `DW-P0W-007` - Redaction / Boundary Audit for MCP Tool Proposals.
8. `DW-P0W-008` - MCP Tool Proposal Smoke / Hardening.
9. `DW-P0W-009` - v0.19 RC polish + full gates + push/tag/release.

## Deferred Work

- real MCP `tools/call`
- mutating MCP tool execution
- MCP resource content reads by default
- plugin installation or code execution
- skill runtime execution
- arbitrary Git/shell execution
- native bridge
- desktop action
- broad PermissionLease issuing
- autonomous agent tool execution

## Success Criteria

P0W succeeds when MCP tool invocation can be represented as proposal-first,
schema-validated, risk-classified, approval-drafted, simulated, broker-planned,
App-previewed, and redaction-audited summaries while every execution readiness
flag remains false and no real MCP tool is invoked.
