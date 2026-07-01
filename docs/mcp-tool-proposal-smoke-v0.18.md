# MCP Tool Proposal Smoke v0.18

P0W-008 adds focused smoke coverage for the MCP tool invocation proposal
preview chain.

## Flow

```text
MCP tool metadata
-> invocation proposal
-> input risk classifier
-> simulated result
-> broker planning
-> App read-only surface summary
-> redaction audit
```

The smoke flow never invokes MCP tools and never calls real `tools/call`.

## Fixtures

Fixtures live under `runtime/test/fixtures/mcp-tool-proposal-smoke/`:

- `safe-readonly-metadata.json`
- `mutating-tool-metadata.json`
- `unsafe-args.json`
- `secret-marker.json`
- `simulated-result.json`

They are summary-only test artifacts. Fake secret markers are obvious fake
values and are used only to prove fail-closed behavior.

## Covered Cases

- Safe read-only MCP tool metadata enters proposal, risk, simulation, broker,
  App surface summary, and redaction audit preview.
- Mutating tool metadata is blocked or disabled before any invocation.
- Raw args are blocked.
- Secret markers are blocked.
- Simulated result output remains summary-only.
- Broker policy remains `MANUAL_ONLY` or `DISABLED`.
- App surface refs remain read-only.
- Redaction audit detects unsafe summary fields and execution claims.

## Safety Boundary

- No real MCP `tools/call`.
- No mutating MCP tool execution.
- No MCP resource content read.
- No raw args or raw tool output persistence.
- No API key, Authorization, bearer token, or secret persistence.
- No EventStore write.
- No PermissionLease issuing.
- No App execution.
- No Git or shell execution.
- No native bridge.
- No desktop action.

## Relation To P0W

This smoke test hardens P0W-002 through P0W-007 before the v0.19 RC polish:

- P0W-002: proposal schema
- P0W-003: input risk classifier
- P0W-004: simulated result
- P0W-005: broker planning
- P0W-006: App read-only surface
- P0W-007: redaction audit

## Non-Goals

- No live MCP tool invocation.
- No App approval execution.
- No EventStore writer.
- No broad PermissionLease.
- No plugin or skill runtime.
- No Git/shell execution.
- No native bridge or desktop action.
