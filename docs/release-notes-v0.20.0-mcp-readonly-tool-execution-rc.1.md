# v0.20.0-mcp-readonly-tool-execution-rc.1 - Controlled MCP read-only tool execution MVP

Release title:
`v0.20.0-mcp-readonly-tool-execution-rc.1 — Controlled MCP read-only tool execution MVP`

This release candidate closes the P0X MCP read-only tool execution stage. It
keeps the App Shell on a fixed, allowlisted, explicitly approved read-only MCP
tool path with bounded output, summary-only event projection, replay, and
redaction audit coverage.

## Current Working Flow

- `web_table_to_csv` Convert remains the real conversion flow.
- App-side approved execution remains human-approved and rollbackable.
- Git/shell verification safe lanes remain fixed and summary-only.
- MCP read-only discovery remains metadata-only.
- MCP read-only tools can be called only with explicit approval, allowlisted
  contract, bounded output, and summary-only replay.
- No mutating MCP tools are enabled.

## Included Scope

- P0X MCP read-only tool execution roadmap and design gate.
- Runtime MCP read-only tool contract schema and validation.
- Runtime fixed MCP read-only tool call wrapper.
- Fixed App/Tauri command for read-only MCP tool calls.
- Capability Broker descriptor and summary event integration.
- App Shell MCP Read-only Tool Execution surface.
- MCP read-only tool redaction audit.
- MCP read-only tool fake smoke coverage.

## Explicit Non-goals

- no mutating MCP tools
- no arbitrary MCP tool call
- no plugin code execution
- no skill runtime execution
- no arbitrary process spawn
- no arbitrary shell
- no native bridge
- no desktop action
- no broad PermissionLease
- no autonomous agent tool execution
- no raw tool output in events

## Safety

- read-only allowlist
- input schema validation
- risk classifier
- typed confirmation
- approval receipt
- fixed Tauri command
- bounded timeout/output
- redaction audit
- summary-only events
- replay

## Checks

The RC gate for this release uses:

- scoped checks before release polish
- full stage-end gates
- GitHub Actions on pushed `main`
- tag workflow verification
- release smoke
- manual GUI QA

Manual GUI QA should follow
[`docs/mcp-readonly-tool-execution-manual-qa.md`](https://github.com/Mubai0628/DG/blob/v0.20.0-mcp-readonly-tool-execution-rc.1/docs/mcp-readonly-tool-execution-manual-qa.md).

The RC checklist is
[`docs/mcp-readonly-tool-execution-rc-checklist.md`](https://github.com/Mubai0628/DG/blob/v0.20.0-mcp-readonly-tool-execution-rc.1/docs/mcp-readonly-tool-execution-rc-checklist.md).

## Known Limitations

- No mutating MCP tools.
- No generic MCP invocation UI.
- No plugin or skill runtime execution.
- No raw MCP tool output persistence.
- No native bridge or desktop action.
- No broad PermissionLease.
- Manual visual QA is separate from automated smoke and QA commands.
