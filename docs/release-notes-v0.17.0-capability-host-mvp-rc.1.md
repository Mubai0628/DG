# v0.17.0-capability-host-mvp-rc.1

Capability Host MVP, read-only descriptors and no external execution.

Recommended tag: `v0.17.0-capability-host-mvp-rc.1`

## Scope

This RC closes the v0.17 Capability Host MVP line. It builds on the v0.16
Project Knowledge release and adds descriptor-first handling for MCP, plugin,
and skill metadata without enabling external execution.

Included P0U work:

- Capability Host ADR, threat model, and implementation gate.
- External capability manifest schema.
- MCP read-only discovery model.
- Plugin / skill metadata scanner.
- External Capability Broker preview integration.
- App Capability Host read-only surface.
- External Capability Redaction / Boundary Audit.
- Manual QA and RC checklist for release validation.

## Current Working Flow

- `web_table_to_csv` Convert remains the real conversion flow.
- App-side approved execution remains human-approved and rollbackable.
- Git/shell verification safe lanes remain fixed and summary-only.
- Project Knowledge remains human-reviewed and summary-only.
- Capability Host can parse and preview MCP/plugin/skill descriptors.
- External descriptors map to Capability Broker previews.
- App Capability Host is read-only.
- No external capability execution is enabled.

## Explicit Non-Goals

- no MCP tool invocation
- no MCP server connection
- no plugin installation
- no plugin code execution
- no skill runtime execution
- no native bridge
- no desktop action
- no arbitrary Git/shell
- no broad PermissionLease
- no auto-run of external capabilities

## Safety

- descriptor-first capability model
- read-only discovery
- metadata-only scanner
- risk classification
- manual-only / disabled policies
- lease preview only
- redaction audit
- boundary checker coverage
- no raw args, raw prompt, raw source, raw diff, raw response, or secret output
- App disabled controls for connect, install, run skill, invoke, issue lease,
  and external audit execution

## Checks

Scoped P0U checks:

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
[`docs/capability-host-manual-qa.md`](https://github.com/Mubai0628/DG/blob/v0.17.0-capability-host-mvp-rc.1/docs/capability-host-manual-qa.md).

The RC checklist is
[`docs/capability-host-rc-checklist.md`](https://github.com/Mubai0628/DG/blob/v0.17.0-capability-host-mvp-rc.1/docs/capability-host-rc-checklist.md).

## Known Limitations

- Capability Host is descriptor preview only.
- MCP server connection and MCP tool invocation remain disabled.
- Plugin installation and plugin code execution remain disabled.
- Skill runtime execution remains disabled.
- External capability broker output is a preview, not an execution grant.
- PermissionLease output is preview-only and not production lease issuance.
- Native bridge, desktop action, arbitrary Git/shell, and external process
  execution remain out of scope.
