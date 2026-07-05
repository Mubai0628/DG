# Runtime Migration Dry-run v0.32

P1J-003 adds a runtime migration dry-run plan model. It is plan-only and does
not execute migration.

## Scope

- `buildMigrationDryRunPlan()` builds a summary-only dry-run plan.
- `validateMigrationDryRunPlan()` fails closed on unsafe plan metadata.
- `summarizeMigrationDryRunPlan()` returns step counts, item counts, byte
  counts, warning codes, and a plan hash.

Supported step kinds:

- `schema_check`
- `copy_plan`
- `backup_required`
- `index_rebuild_plan`
- `replay_cache_invalidation`
- `project_knowledge_schema_upgrade_plan`
- `event_log_schema_check`
- `checkpoint_compatibility_check`
- `manual_review_required`

## Summary-only Output

Dry-run steps may include only:

- step ids
- source schema version
- target schema version
- item counts
- byte counts
- hash prefixes
- warnings
- manual review requirements
- backup requirements
- replay compatibility check markers

The helper blocks actual copy, actual delete, actual rewrite, raw data, raw
event payloads, raw memory, raw checkpoint/preimage content, raw source, raw
diff, API keys, Authorization markers, command fields, Tauri fields, EventStore
write fields, apply/rollback fields, PermissionLease fields, native bridge
fields, tools, and `tool_choice`.

## Validation Rules

Validation blocks:

- a step attempting delete
- a step attempting write
- a step attempting rewrite
- raw content in any step
- unknown source schema version without manual review
- target schema downgrade unless the step is already marked blocked
- checkpoint migration planning without backup required
- event log migration planning without replay compatibility check

## Non-goals

- no migration execution
- no file write
- no data deletion
- no actual copy
- no actual rewrite
- no EventStore write
- no App execution
- no Git/shell execution
- no native bridge
- no desktop action

All readiness flags for migration, copy, deletion, rewrite, filesystem writes,
EventStore writes, apply/rollback, Git, shell, and App execution remain false.
