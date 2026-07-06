# App Shell Permission Mode Audit v0.34

The App Shell shows a read-only `Permission Mode Audit` panel next to the
Execution Mode preview. The panel summarizes permission mode audit previews and
replay status without writing events.

## What The Panel Shows

- Latest mode preview.
- Latest session lease preview.
- Permission policy event preview count.
- Blocked capability count.
- Future high-risk capability count.
- Kill switch visibility and triggered state.
- Replay status and summary hash.
- Disabled readiness flags.

## Boundaries

- No EventStore write.
- No Tauri command.
- No filesystem write.
- No apply or rollback.
- No approval execution.
- No arbitrary shell.
- No recursive delete.
- No Git push.
- No autonomous loop.
- No raw transcript or raw output persistence.

The panel only updates React state. It does not create real audit events and
does not enable any high-privilege capability.

## Relation To Runtime

The panel uses the runtime `PermissionModeAuditReport` helper and displays only
summary fields. Every event preview remains `notWritten: true` and
`summaryOnly: true`.
