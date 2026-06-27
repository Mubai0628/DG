# App Shell User Workspace Apply Prototype v0.6

The App Shell shows a disabled-only User Workspace Apply Prototype panel. It
does not execute user workspace apply and does not call the runtime apply
prototype.

The panel badge is:

`Disabled by default / runtime prototype only`

The panel copy states:

`User workspace apply is only available to runtime tests with explicit fixtures. The App Shell cannot apply patches to the user workspace.`

The disabled placeholder button is:

`Apply to User Workspace (disabled)`

## App Boundary

The App Shell has no enabled apply button, no file content input, no preimage
input, no approval receipt input, no Tauri invoke, and no EventStore write for
this prototype. It only displays summary refs and a next action from a local
disabled view model.

The panel may show:

- status
- runtime helper availability
- runtime prototype only flag
- App execution connected flag
- user workspace mutation flag
- content / preimage input flags
- approval receipt input flag
- readiness and contract refs
- patch preview refs
- blocker and warning counts
- warning codes
- next action

All execution-facing flags remain disabled.

## Relation To P0K

This App panel follows P0K-003 Promotion Readiness and documents that P0K-004 is
runtime-test-only. A ready promotion chain does not enable App execution.

Future user workspace rollback remains deferred to P0K-005, and production
PermissionLease issuance remains deferred.

## Non-goals

- No App apply
- No Tauri command
- No EventStore write
- No Git commit or push
- No shell execution
- No DeepSeek call
- No native bridge
- No desktop action
