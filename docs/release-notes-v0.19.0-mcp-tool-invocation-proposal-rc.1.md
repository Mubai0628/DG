# v0.19.0-mcp-tool-invocation-proposal-rc.1

MCP tool invocation proposal and approval design, no tool execution.

Recommended tag: `v0.19.0-mcp-tool-invocation-proposal-rc.1`

## Scope

This RC closes the v0.19 MCP Tool Invocation Proposal / Approval Design line.
It builds on v0.18 MCP read-only metadata discovery and adds proposal-first
runtime and App previews for MCP tools without invoking any tool.

Included P0W work:

- v0.18 post-release review and P0W roadmap lock.
- MCP Tool Invocation Proposal ADR, threat model, and implementation gate.
- Runtime MCP Tool Invocation Proposal schema.
- Runtime MCP Tool Input Schema Risk Classifier.
- Runtime MCP Tool Simulated Result model.
- Capability Broker planning integration.
- App MCP Tool Invocation Proposal read-only surface.
- Runtime MCP Tool Proposal Redaction / Boundary Audit.
- MCP Tool Proposal Smoke / Hardening fixtures and tests.

## Current Working Flow

- `web_table_to_csv` Convert remains the real conversion flow.
- App-side approved execution remains human-approved and rollbackable.
- Git/shell verification safe lanes remain fixed and summary-only.
- MCP read-only discovery remains metadata-only.
- MCP tool invocation proposals can be modeled, risk-classified,
  approval-drafted, simulated, and displayed.
- No MCP tool is invoked.
- No mutating MCP tool is executed.

## Explicit Non-Goals

- no MCP `tools/call`
- no mutating MCP tools
- no resource content read by default
- no plugin code execution
- no skill runtime execution
- no arbitrary shell/process spawn
- no native bridge
- no desktop action
- no broad PermissionLease
- no auto tool invocation
- no raw args/output in events
- no App hidden invocation
- no approval execution
- no EventStore write for MCP tool invocation

## Safety

- proposal-first
- schema validation
- risk classification
- manual-only/disabled broker policy
- simulated result only
- read-only App surface
- redaction audit
- summary-only events/previews
- no raw arguments
- no raw tool output
- no API key, Authorization, bearer token, or secret persistence
- disabled execution readiness flags

## Checks

Scoped P0W checks:

- `pnpm app:typecheck`
- `pnpm app:test`
- `pnpm exec vitest run runtime/test/mcp-tool-proposal-smoke.test.ts runtime/test/mcp-tool-proposal-redaction-audit.test.ts runtime/test/mcp-tool-broker-planning.test.ts runtime/test/mcp-tool-simulated-result.test.ts runtime/test/mcp-tool-input-risk.test.ts runtime/test/mcp-tool-invocation-proposal.test.ts`
- `pnpm check:boundaries`
- `pnpm check:secrets`
- `git diff --check`

Stage-end full gates:

- `pnpm install`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm test:conformance:dry`
- `pnpm test:conformance:live`
- `pnpm app:typecheck`
- `pnpm app:test`
- `pnpm app:smoke`
- `pnpm app:preflight`
- `pnpm app:qa:check`
- `pnpm app:build`
- `cargo check --manifest-path app/src-tauri/Cargo.toml`
- `pnpm --filter @deepseek-workbench/browser-extension build`
- `pnpm --filter @deepseek-workbench/browser-extension test`
- `pnpm eval:web-table-to-csv`
- `pnpm verify:v0.1-slice`
- `pnpm release:smoke`
- `pnpm check:boundaries`
- `pnpm check:secrets`
- `pnpm verify:ci`

Manual GUI QA should follow
[`docs/mcp-tool-invocation-proposal-manual-qa.md`](https://github.com/Mubai0628/DG/blob/v0.19.0-mcp-tool-invocation-proposal-rc.1/docs/mcp-tool-invocation-proposal-manual-qa.md).

The RC checklist is
[`docs/mcp-tool-invocation-proposal-rc-checklist.md`](https://github.com/Mubai0628/DG/blob/v0.19.0-mcp-tool-invocation-proposal-rc.1/docs/mcp-tool-invocation-proposal-rc-checklist.md).

The smoke hardening notes are
[`docs/mcp-tool-proposal-smoke-v0.18.md`](https://github.com/Mubai0628/DG/blob/v0.19.0-mcp-tool-invocation-proposal-rc.1/docs/mcp-tool-proposal-smoke-v0.18.md).

## Known Limitations

- MCP tool invocation remains disabled.
- Mutating MCP tools remain disabled.
- MCP resource content reads remain disabled by default.
- App MCP tool proposal surface is read-only.
- Approval draft is not a production PermissionLease.
- Simulated result is not real MCP tool output.
- Plugin code execution and skill runtime execution remain disabled.
- Arbitrary process spawn and arbitrary shell remain disabled.
- Native bridge, desktop action, and autonomous agent tool execution remain out
  of scope.
