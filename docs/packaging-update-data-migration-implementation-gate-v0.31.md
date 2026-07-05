# Packaging / Update / Data Migration Implementation Gate v0.31

Do not implement migration execution, updater execution, or data writes until
each gate below has test evidence.

## Data Inventory Safety

- Test inventories app/project data directories as metadata-only summaries.
- Test rejects raw file contents, raw prompt, raw source, raw diff, raw
  response, token, and API key fields.
- Test marks unsupported or missing data roots as warnings, not mutations.

## Schema Registry Safety

- Test registers known schema ids and versions.
- Test blocks unknown required schema ids.
- Test warns on future or deprecated schema states.
- Test keeps schema state summary-only.

## Migration Dry-run Safety

- Test produces dry-run migration plans without writing files.
- Test blocks destructive migration and silent data deletion.
- Test rejects plan steps that imply apply, rollback, shell, Git, Tauri,
  native bridge, or EventStore writes.
- Test keeps all execution readiness flags false.

## Backup / Restore Safety

- Test requires backup package refs before any future migration readiness.
- Test requires restore target compatibility summaries.
- Test requires rollback package coverage summaries.
- Test blocks raw backup/preimage content in output.

## Release Channel Safety

- Test allows only explicit release channels.
- Test blocks auto-update without confirmation.
- Test blocks remote config execution.
- Test keeps telemetry upload and cloud sync disabled.

## Artifact Hygiene

- Test confirms build outputs and generated artifacts remain ignored.
- Test blocks committing installer outputs, conformance results, runtime dist,
  app dist, target dirs, and node_modules.
- Test proves release notes reference generated artifacts only as ignored
  paths.

## Cross-platform Path Safety

- Test blocks parent traversal, unsafe absolute paths, symlink escape, junction
  escape, reparse point ambiguity, and platform app data dir mismatch.
- Test normalizes path refs without exposing raw file contents.

## App UI Safety

- Test proves App packaging/update/migration surfaces are read-only.
- Test proves no updater, migration, restore, delete, cloud sync, telemetry
  upload, native bridge, Git/shell, or broad PermissionLease control is enabled.
- Test proves App copy says dry-run / no data write where applicable.

## CI / Release Safety

- Test or script verifies release smoke matrix coverage.
- `pnpm check:boundaries` remains green.
- `pnpm check:secrets` remains green.
- Full gates are reserved for RC polish.

P1J-001 does not implement migration or updater behavior.
