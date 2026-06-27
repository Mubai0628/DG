# App Approval Execution Design v0.6

DW-P0K-007 defines the future App approval execution gate while keeping the App
Shell disabled by default. This is design only. It does not implement approval
execution, approve/reject actions, PermissionLease issuing, App apply, App
rollback, or App EventStore writes.

## Current App Boundary

- App execution disabled.
- No approve action.
- No reject action.
- No PermissionLease issuing.
- No App-side user workspace apply.
- No App-side user workspace rollback.
- No App-side apply/rollback EventStore write.
- No Tauri command.
- No Git commit or push.
- No shell execution.
- No DeepSeek call.
- No native bridge.
- No desktop action.

The App Shell may show a disabled-only panel named `App Approval Execution
Design`. The panel documents the future gate and may display summary refs, but
it cannot execute any action.

## Disabled Controls

The App panel may show these disabled placeholders:

- `Approve Apply (disabled)`
- `Reject Apply (disabled)`
- `Issue Permission Lease (disabled)`

There must be no enabled Approve, Reject, Apply, Rollback, Write Events, Commit,
or Execute button.

## Required Future Gates

Future App approval execution cannot be considered until all of these are
designed and testable:

- Promotion readiness passes.
- User workspace snapshot / backup contract passes.
- User workspace apply prototype remains runtime-only until a release gate.
- User workspace rollback prototype remains runtime-only until a release gate.
- Summary EventStore writer remains runtime-only until a release gate.
- Production PermissionLease design exists.
- Manual user confirmation is required.
- Replay projection can reconstruct apply, rollback, and event state.
- Approval, audit, and context summaries stay summary-only.

## Summary-Only Inputs

Allowed input refs are summary objects only:

- promotion readiness
- user workspace apply prototype view
- user workspace rollback prototype view
- user workspace apply/rollback event writer view
- approval draft
- capability plan
- context assembly
- audit surface

The design view must not accept or display raw source, raw diff, raw preimage,
file content, API key material, Authorization headers, env values, stdout, or
stderr.

## Non-Goals

- No approve/reject implementation.
- No production PermissionLease issuing.
- No App apply or rollback.
- No App EventStore writer.
- No Tauri command.
- No Git commit or push.
- No shell execution.
- No DeepSeek execution.
- No native bridge.
- No desktop action.

## Future Work

P0K-008 is the user workspace apply RC polish and release notes task. It should
keep App approval execution disabled unless an explicit later release gate
changes that boundary.
