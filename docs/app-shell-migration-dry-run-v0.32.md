# App Shell Migration Dry-run v0.32

The App Shell now includes a read-only `Migration Dry-run Plan` surface for
P1J-003.

Badge: `Plan only / no data migration`.

## Displayed Fields

The panel shows a plan summary only:

- status
- plan id
- step count
- manual review count
- backup required count
- replay compatibility check count
- item and byte counts
- blocker and warning counts
- plan hash prefix
- dry-run step timeline
- next action

## Disabled Controls

The panel includes disabled placeholders only:

- `Run Migration (disabled)`
- `Delete Old Data (disabled)`

These controls do not invoke Tauri, do not write EventStore records, and do not
perform migration.

## App Boundary

The App Shell does not:

- copy data
- delete data
- rewrite data
- run migration
- run backup/restore
- invoke Tauri for migration
- write EventStore records
- apply patches
- rollback patches
- approve or reject execution
- issue PermissionLease
- execute Git or shell commands
- invoke native bridge
- perform desktop actions

## Relation to Runtime

The panel is backed by `buildMigrationDryRunPlan()` and
`summarizeMigrationDryRunPlan()`. Those helpers validate summary-only dry-run
metadata and keep all execution readiness flags false.

Future P1J-004 backup/restore planning may consume dry-run output, but it must
remain dry-run only until a later explicitly approved task changes that
boundary.
