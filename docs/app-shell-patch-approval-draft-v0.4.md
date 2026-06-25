# App Shell Patch Approval Draft v0.4

The App Shell Patch Approval Draft panel is a local draft-only surface. It uses
the runtime Patch Approval Draft helper to build a read-only approval request
draft from Patch Proposal Creation Preview, Patch Proposal Validation Preview,
and Patch Diff Audit Preview summaries.

No approval, rejection, PermissionLease issuing, virtual apply, patch apply,
filesystem read/write, EventStore write, DeepSeek call, native bridge, or desktop
action is performed.

## UI Behavior

The panel shows:

- draft status
- approval draft id
- proposal, validation, and audit ids
- declared and derived risk levels
- required approval reason codes
- blocker, warning, and finding counts
- disabled decision options
- suggested conditions
- scope summary
- expiry preview
- readiness flags
- next action

The `Preview Approval Draft` button only updates local React state. It does not
call Tauri, write events, issue leases, approve/reject, read files, or apply
patches.

## Surface Integration

- Approval Surface displays the approval draft as a dry, read-only patch ref.
- Diff Surface displays a summary-only approval draft item.
- Audit Surface displays warning and finding count codes.
- Context Assembly Preview places the approval draft ref in `no_compress_zone`.
- Capability Plan Preview may see the patch surface summary as display-only
  evidence. No capability is invoked.

## Safety

The App adapter keeps only summary fields from the runtime helper. It does not
display raw source, raw diff, raw patch body, raw prompt, raw DOM, raw CSV, API
keys, Authorization values, environment values, stdout/stderr, or file content.
In short: no raw source, no raw diff, and no API key display.

Decision options are not rendered as executable controls. They are labels with
`enabled: false` and explain that approval execution is disabled in this phase.

## Current Non-goals

- no approval execution
- no reject execution
- no PermissionLease issuing
- no patch apply
- no virtual apply
- no filesystem read or write
- no Git or shell execution
- no DeepSeek call
- no EventStore write
- no MCP/plugin/skills runtime
- no native bridge
- no desktop action

Real approval review, lease issuance, virtual apply, and real apply remain
deferred to later phases.
