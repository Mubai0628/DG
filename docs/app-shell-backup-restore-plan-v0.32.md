# App Shell Backup / Restore Plan v0.32

The App Shell now includes a read-only `Backup / Restore Plan` surface for
P1J-004.

Badge: `Dry-run only / no archive created`.

## Displayed Fields

The panel shows:

- package count
- item and byte counts
- schema version count
- manual verification count
- blocker and warning counts
- package hash prefixes
- package summaries
- next action

It does not display raw file content, archive binaries, raw events, raw memory
entries, checkpoint preimage content, raw source, raw diff, API keys,
Authorization headers, stdout/stderr, or command output.

## Disabled Controls

The panel includes disabled placeholders only:

- `Create Backup Archive (disabled)`
- `Restore Backup (disabled)`
- `Delete Data (disabled)`

These controls do not invoke Tauri, do not write EventStore records, do not
create archives, do not restore backups, and do not delete data.

## App Boundary

The App Shell does not:

- create backup archives
- restore backups
- delete data
- write files
- run migration
- invoke Tauri for backup or restore
- write EventStore records
- apply patches
- rollback patches
- approve or reject execution
- issue PermissionLease
- execute Git or shell commands
- invoke native bridge
- perform desktop actions

Future P1J-005 update policy work may reference these plans, but App execution
and destructive operations remain disabled.
