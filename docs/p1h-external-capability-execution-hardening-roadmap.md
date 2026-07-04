# P1H External Capability Execution Hardening Roadmap

## Goal

P1H goal: harden external capability execution boundaries without adding a new
broad capability.

The phase focuses on consistency, replay completeness, redaction, policy
enforcement, and golden smoke for MCP, plugin, and skill surfaces that already
exist in descriptor, metadata, safe simulation, or fixed read-only execution
lanes.

## Principles

- No new broad capability.
- No mutating MCP tools.
- No arbitrary MCP invocation.
- No arbitrary plugin/skill execution.
- No broad PermissionLease.
- No broad native bridge.
- No broad desktop automation.
- No autonomous arbitrary tool execution.
- No arbitrary Git/shell.
- No raw tool args/output or secrets in events, replay, telemetry, or App
  surfaces.

## Hardening Focus

- MCP read-only tool execution consistency.
- Plugin / Skill sandbox escape checks.
- Capability Broker enforcement hardening.
- PermissionLease / approval receipt consistency.
- External capability replay completeness.
- External tool / metadata redaction audit.
- App read-only audit surface.
- Golden regression / safety smoke.

## Tasks

1. `DW-P1H-001` - External capability hardening ADR.
2. `DW-P1H-002` - Execution policy / lease consistency.
3. `DW-P1H-003` - MCP read-only tool consistency.
4. `DW-P1H-004` - Plugin / Skill sandbox escape checks.
5. `DW-P1H-005` - External result replay completeness.
6. `DW-P1H-006` - External output redaction / boundary audit.
7. `DW-P1H-007` - App audit surface.
8. `DW-P1H-008` - Golden regression / smoke.
9. `DW-P1H-009` - v0.30 RC polish + full gates + push/tag/release.

## Deferred

- Mutating MCP tools.
- Arbitrary MCP invocation.
- Arbitrary plugin code execution.
- Arbitrary skill runtime execution.
- Plugin installation with code execution.
- Broad native bridge.
- Broad desktop automation.
- Autonomous arbitrary tool execution.
- Arbitrary Git/shell.
- Broad PermissionLease.

## Acceptance

P1H is complete when external capability summaries can prove policy, lease,
read-only MCP consistency, plugin/skill sandbox safety, replay completeness,
and redaction boundaries through runtime reports, App read-only audit surfaces,
golden smoke, and release documentation without adding a new execution path.
