# v0.21.0-plugin-skill-sandbox-mvp-rc.1 - Plugin and skill sandbox MVP, no arbitrary execution

Release title:
`v0.21.0-plugin-skill-sandbox-mvp-rc.1 — Plugin and skill sandbox MVP, no arbitrary execution`

This release candidate closes the P0Y Plugin / Skill Sandbox MVP stage. It
adds manifest-first and descriptor-first plugin/skill governance without
enabling arbitrary plugin code execution, arbitrary skill runtime execution,
plugin installation with execution, native bridge, desktop action, or broad
PermissionLease issuance.

## Current Working Flow

- `web_table_to_csv` Convert remains the real conversion flow.
- App-side approved execution remains limited to the existing human-approved
  apply/rollback lane.
- MCP read-only tool execution remains fixed-profile and allowlisted.
- Plugin and skill manifests can be parsed and risk-classified.
- Package metadata can be scanned summary-only.
- Capability Broker can preview plugin/skill descriptors.
- App can display plugin/skill metadata read-only.
- Built-in safe skill simulation is summary-only and non-mutating.
- No arbitrary plugin code is executed.
- No arbitrary skill runtime is executed.

## Included Scope

- Plugin / Skill Sandbox ADR.
- Plugin Manifest Schema.
- Skill Manifest Schema.
- Package Metadata Scanner.
- Sandbox Contract.
- Built-in Safe Skill Simulation.
- Capability Broker Integration.
- App Plugin / Skill Host Surface.
- Redaction / Boundary Audit.

## Explicit Non-goals

- no arbitrary plugin code execution
- no arbitrary skill runtime execution
- no plugin installation with code execution
- no mutating plugin/skill tools
- no desktop action
- no native bridge
- no arbitrary process spawn
- no arbitrary shell
- no broad PermissionLease
- no autonomous agent tool execution
- no raw plugin/skill package content in events
- no raw plugin/skill args or outputs in events

## Safety

- manifest schema validation
- package metadata scan
- lifecycle script detection
- native/binary detection
- redaction audit
- Capability Broker risk classification
- disabled/manual-only policies
- App read-only surface
- summary-only reports
- no API key, Authorization, bearer token, or secret persistence
- no raw metadata, raw prompt, raw args, raw output, or raw package content

## Checks

The RC gate for this release uses:

- scoped P0Y checks before release polish
- full stage-end gates
- GitHub Actions on pushed `main`
- tag workflow verification
- release smoke
- manual GUI QA

Manual GUI QA should follow
[`docs/plugin-skill-sandbox-manual-qa.md`](https://github.com/Mubai0628/DG/blob/v0.21.0-plugin-skill-sandbox-mvp-rc.1/docs/plugin-skill-sandbox-manual-qa.md).

The RC checklist is
[`docs/plugin-skill-sandbox-rc-checklist.md`](https://github.com/Mubai0628/DG/blob/v0.21.0-plugin-skill-sandbox-mvp-rc.1/docs/plugin-skill-sandbox-rc-checklist.md).

## Known Limitations

- No arbitrary plugin code execution.
- No arbitrary skill runtime execution.
- No plugin installation flow with code execution.
- No mutating plugin/skill tools.
- No App plugin/skill execution button.
- No native bridge or desktop action.
- No arbitrary process spawn or arbitrary shell.
- No broad PermissionLease.
- Manual visual QA is separate from automated smoke and QA commands.
