# Runtime Backup / Restore Plan v0.32

P1J-004 adds dry-run-only backup, restore, and rollback package plan models.
They do not create archives, restore backups, delete data, or write files.

## Scope

- `buildBackupPlan()` validates backup package metadata.
- `buildRestorePlan()` validates restore package metadata.
- `buildRollbackPackagePlan()` validates rollback package metadata.
- `summarizeBackupRestorePlan()` returns summary counts, directory kinds,
  schema versions, manual verification counts, warning codes, and a hash.

Allowed plan fields are summary-only:

- `packageId`
- item counts
- byte counts
- schema versions
- included directory kinds
- excluded directory kinds
- hash prefixes
- manual verification steps

## Safety Rules

Validation blocks:

- backup plans that include `node_modules`, `dist`, or `target` by default
- backup plans that include `.env`
- backup plans that include `.git`
- restore plans targeting a different workspace root without manual review
- rollback package plans missing schema registry summary metadata
- restore plans with delete steps
- raw file content
- archive binary content
- checkpoint preimage content
- raw events
- raw memory entries
- command, Tauri, EventStore, apply, rollback, Git, shell, native bridge, tools,
  and `tool_choice` fields

## Non-goals

- no archive creation
- no restore execution
- no data deletion
- no filesystem write
- no EventStore write
- no App execution
- no Git/shell execution
- no native bridge
- no desktop action

All readiness flags for archive creation, restore, deletion, filesystem writes,
EventStore writes, apply/rollback, Git, shell, and App execution remain false.
