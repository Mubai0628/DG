# P1J-001 Packaging / Update / Migration Gate Plan

## Scope

P1J-001 creates the ADR, threat model, and implementation gate for packaging,
update, and data migration hardening.

## Non-goals

- No runtime feature implementation in P1J-001.
- No App feature implementation in P1J-001.
- No migration implementation.
- No updater implementation.
- No data writes.
- No destructive migration.
- No silent data deletion.
- No cloud sync.
- No telemetry upload.
- No new native bridge.
- No arbitrary Git/shell execution.

## Design Questions

- Which app/project data directories are expected to exist?
- Which schema versions need explicit registry entries?
- Which migration plan fields can be summary-only and safe?
- Which backup / restore plans are required before future migration?
- Which release channels are valid?
- Which generated artifacts must stay ignored?
- Which cross-platform path risks must block?

## Required Documents

- `docs/adr/0013-packaging-update-data-migration.md`
- `docs/packaging-update-data-migration-threat-model-v0.31.md`
- `docs/packaging-update-data-migration-implementation-gate-v0.31.md`
- `docs/p1j-002-app-data-inventory-schema-plan.md`

## Gate Categories

- Data inventory safety.
- Schema registry safety.
- Migration dry-run safety.
- Backup / restore safety.
- Release channel safety.
- Artifact hygiene.
- Cross-platform path safety.
- App UI safety.
- CI / release safety.

## Test Strategy

P1J-001 is docs-only. Run:

- `pnpm lint`
- `pnpm app:test`
- `git diff --check`
- `git diff --cached --check`

## Completion Report

Report:

- files changed
- docs-lock tests
- scoped checks
- local commit hash
- confirmation that P1J-001 did not implement migration or updater behavior

## Next Task

DW-P1J-002 App Data Directory Inventory / Schema Version Registry.
