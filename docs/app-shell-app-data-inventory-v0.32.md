# App Shell App Data Inventory / Schema Registry v0.32

The App Shell now includes a read-only `App Data Inventory / Schema Registry`
surface for P1J-002. It displays summary metadata only.

## Displayed Fields

The panel shows:

- inventory item counts
- existing and missing item counts
- schema version counts
- compatibility counts
- warning counts
- inventory and registry hash prefixes
- readiness flags
- next action

It does not display raw file contents, raw event payloads, raw memory entries,
raw checkpoint/preimage content, raw source, raw diff, API keys, Authorization
headers, stdout/stderr, or command output.

## App Boundary

The App panel is `Read-only / no migration`.

The App Shell does not:

- scan raw data directories
- run migration
- delete data
- run backup/restore
- invoke Tauri for inventory or schema registry
- write EventStore records
- apply patches
- rollback patches
- approve or reject execution
- issue PermissionLease
- execute Git or shell commands
- invoke native bridge
- perform desktop actions

## Relation to Runtime

The panel is backed by the P1J-002 runtime contracts:

- `runtime-app-data-inventory-schema-v0.32.md`
- `buildAppDataInventory()`
- `buildSchemaVersionRegistry()`

Those helpers validate caller-provided summary metadata only. They do not read
workspace files and do not perform migration.

## Future Work

P1J-003 may add a migration dry-run validator that consumes this metadata, but
the App Shell remains read-only and migration execution remains disabled.
