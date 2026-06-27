# App Shell User Workspace Apply / Rollback Event Writer v0.6

The App Shell exposes a disabled-only panel for the P0K-006 runtime writer. The
panel is a status summary, not an execution surface.

## App Behavior

- Shows `User Workspace Apply / Rollback Event Writer`.
- Badge: `Runtime only / App write disabled`.
- Disabled placeholder: `Write Apply/Rollback Events (disabled)`.
- No enabled write button.
- No event payload input.
- No raw content input.
- No approval receipt input.
- No Tauri invoke.
- No App-side EventStore write.
- No apply or rollback execution.

The panel text says runtime tests can persist summary-only apply/rollback
events, while the App Shell cannot write these events or execute apply/rollback.

## Safety Boundary

The App Shell must not import or call the runtime writer. It may display refs and
status from local view-model state only. It must not write events, read files,
write files, apply patches, rollback patches, run Git, run shell commands, issue
PermissionLease objects, call DeepSeek, use a native bridge, or trigger desktop
actions.

## Event Preview vs Persisted Event

P0K-004 and P0K-005 produce `notWritten: true` event previews. P0K-006 can
persist summary-only events only from runtime tests or explicit runtime calls.
The App panel does not convert previews into persisted events.

## Non-Goals

- No App-side event writer.
- No Tauri command.
- No user workspace apply.
- No user workspace rollback.
- No Git commit or push.
- No shell execution.
- No DeepSeek call.
- No native bridge.
- No desktop action.

## Future Work

P0K-007 may design App approval execution, but it remains disabled by default.
This document does not enable App execution or production PermissionLease
issuance.
