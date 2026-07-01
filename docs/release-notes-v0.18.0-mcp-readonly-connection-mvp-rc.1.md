# v0.18.0-mcp-readonly-connection-mvp-rc.1

MCP read-only connection MVP, no tool invocation.

Recommended tag: `v0.18.0-mcp-readonly-connection-mvp-rc.1`

## Scope

This RC closes the v0.18 MCP Read-only Connection MVP line. It builds on the
v0.17 Capability Host release and adds an explicit, typed-confirmation,
metadata-only MCP discovery path without enabling MCP execution.

Included P0V work:

- MCP Read-only Connection roadmap lock.
- MCP Read-only Connection ADR, threat model, and implementation gate.
- MCP Connection Profile Schema.
- Runtime MCP Read-only Discovery Client.
- Tauri fixed MCP read-only discovery command.
- Capability Broker integration with MCP read-only metadata.
- App MCP Read-only Connection surface.
- MCP Metadata Redaction / Boundary Audit.
- MCP Read-only Connection smoke and hardening coverage.

## Current Working Flow

- `web_table_to_csv` Convert remains the real conversion flow.
- App-side approved execution remains human-approved and rollbackable.
- Git/shell verification safe lanes remain fixed and summary-only.
- Project Knowledge remains human-reviewed and summary-only.
- Capability Host can now perform read-only MCP discovery under explicit
  profile/confirmation gates.
- MCP metadata enters Capability Broker as disabled/read-only descriptors.
- App MCP surface remains read-only.

## Explicit Non-Goals

- no MCP tool invocation
- no MCP resource content read by default
- no MCP mutating tools
- no plugin code execution
- no skill runtime execution
- no arbitrary process spawn
- no arbitrary shell
- no broad PermissionLease
- no native bridge
- no desktop action
- no autonomous agent tool execution

## Safety

- fixed profile
- typed confirmation
- no `callTool`
- no `resource/read`
- metadata-only summaries
- redaction audit
- broker risk classification
- App read-only
- summary-only release and smoke documentation
- no raw metadata, raw prompt, raw source, raw diff, raw response, API key,
  stdout, or stderr in events or App summaries

## Checks

Scoped P0V checks:

- `pnpm app:typecheck`
- `pnpm app:test`
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
[`docs/mcp-readonly-connection-manual-qa.md`](https://github.com/Mubai0628/DG/blob/v0.18.0-mcp-readonly-connection-mvp-rc.1/docs/mcp-readonly-connection-manual-qa.md).

The RC checklist is
[`docs/mcp-readonly-connection-rc-checklist.md`](https://github.com/Mubai0628/DG/blob/v0.18.0-mcp-readonly-connection-mvp-rc.1/docs/mcp-readonly-connection-rc-checklist.md).

The smoke hardening notes are
[`docs/mcp-readonly-connection-smoke-v0.17.md`](https://github.com/Mubai0628/DG/blob/v0.18.0-mcp-readonly-connection-mvp-rc.1/docs/mcp-readonly-connection-smoke-v0.17.md).

## Known Limitations

- MCP discovery is metadata-only.
- App discovery uses fixed profile and typed confirmation gates.
- MCP tool invocation remains disabled.
- MCP resource content reads remain disabled by default.
- MCP prompt execution remains disabled.
- MCP mutating tools remain disabled.
- Plugin code execution and skill runtime execution remain disabled.
- Arbitrary process spawn and arbitrary shell remain disabled.
- Broad PermissionLease issuance remains disabled.
- Native bridge, desktop action, and autonomous agent tool execution remain out
  of scope.
