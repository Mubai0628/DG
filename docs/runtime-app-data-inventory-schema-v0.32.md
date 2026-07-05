# Runtime App Data Inventory / Schema Registry v0.32

P1J-002 adds a runtime-only App data inventory and schema version registry
contract. It is metadata-only and summary-only.

## Scope

- `buildAppDataInventory()` validates directory inventory summaries.
- `validateAppDataInventory()` fails closed on unsafe metadata.
- `summarizeAppDataInventory()` returns counts, schema versions, warning codes,
  and hashes.
- `buildSchemaVersionRegistry()` validates schema version summaries.
- `validateSchemaVersionRegistry()` reports compatibility without migration.
- `summarizeSchemaVersionRegistry()` returns compatibility counts and hashes.

Inventory items may describe only:

- `pathRef`
- `relativePath`
- `kind`
- `exists`
- `fileCount`
- `byteCount`
- `schemaVersion`
- `hashPrefix`
- `warningCodes`

The supported inventory kinds are:

- `project_workbench_dir`
- `event_log`
- `project_knowledge_store`
- `checkpoint_dir`
- `replay_cache`
- `app_settings`
- `capability_cache`
- `qa_artifact_dir`
- `unknown`

## Safety Boundary

The runtime helper does not read files, scan directories, migrate data, delete
data, restore backups, write EventStore records, or invoke Tauri. It only
validates caller-provided summary metadata.

The path guard blocks:

- absolute item paths unless represented as opaque root refs
- parent traversal
- Windows drive paths inside relative item paths
- UNC paths
- `.git`
- `.env`
- `node_modules`
- `dist`
- `target`
- `.tmp` unless the item kind is `qa_artifact_dir`
- secret-like path segments

The raw-field guard blocks raw file content, raw event payloads, raw memory
entries, raw checkpoint/preimage content, raw source, raw diff, API keys,
Authorization markers, stdout/stderr, command fields, Tauri fields, EventStore
write fields, apply/rollback fields, PermissionLease fields, native bridge
fields, tools, and `tool_choice`.

## Schema Registry

The schema registry records component ids, schema versions, supported versions,
latest known versions, compatibility status, and warning codes. Compatibility is
summary-only:

- `compatible`
- `upgrade_available`
- `unknown_schema`
- `incompatible`

Unknown schemas warn. Incompatible schemas block future migration planning.
Neither status enables migration execution.

## Non-goals

- no migration runner
- no data write
- no data deletion
- no backup/restore execution
- no EventStore write
- no App execution
- no Git/shell execution
- no native bridge
- no desktop action

All readiness flags for migration, deletion, filesystem writes, EventStore
writes, apply/rollback, Git, shell, and App execution remain false.
