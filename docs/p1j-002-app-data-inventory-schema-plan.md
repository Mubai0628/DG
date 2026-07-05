# P1J-002 App Data Inventory / Schema Plan

## Scope

P1J-002 adds a runtime metadata model for app data directory inventory and
schema version registry, plus an App read-only preview surface.

## Non-goals

- No migration execution.
- No updater implementation.
- No data writes.
- No file content reads.
- No destructive migration.
- No silent data deletion.
- No cloud sync.
- No telemetry upload.
- No broad native bridge.
- No arbitrary Git/shell execution.

## Runtime Direction

Create a pure runtime helper that accepts summary-only refs for:

- app config directory
- EventStore directory
- Project Knowledge directory
- cache directory
- logs directory
- backup directory
- release artifact directory
- migration staging directory

The helper should produce a schema registry summary for known components such
as EventStore, Project Knowledge, replay projections, approval receipts,
desktop operator recovery summaries, and release metadata.

## Safety Rules

- Inventory is metadata-only.
- Paths are refs and hashes, not raw filesystem dumps.
- Raw prompt/source/diff/response/API key fields are forbidden.
- File contents are forbidden.
- Generated artifact paths are warnings or blockers according to policy.
- All execution readiness flags remain false.

## Tests

Add focused runtime tests for:

- safe inventory parses
- missing roots warn
- unknown schema blocks or warns according to required/optional policy
- raw fields block
- unsafe paths block
- generated artifacts are detected
- all execution readiness flags false

Add App docs-lock/source-boundary tests for:

- panel renders read-only
- no migration/run/update/delete controls
- no Tauri invoke
- no EventStore write
- docs mention metadata-only inventory and schema registry

## Scoped Command Policy

Run only scoped checks:

- runtime build/typecheck if runtime source changes
- explicit Vitest file paths
- `pnpm app:typecheck`
- `pnpm app:test`
- `pnpm check:boundaries`
- `pnpm check:secrets`
- `git diff --check`
- `git diff --cached --check`

## Completion Report

Report:

- runtime inventory/schema helper
- App read-only surface
- docs
- tests
- local commit hash

## Next Task

DW-P1J-003 Migration Dry-run Validator / Plan Model.
