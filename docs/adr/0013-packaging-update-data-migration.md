# ADR 0013: Packaging / Update / Data Migration

## Status

Proposed / Accepted for P1J design gate.

## Context

The app now has a wide set of local preview, approval, replay, memory,
capability, and desktop operator surfaces. P1J is not about expanding execution
scope. It is about making the existing app safer to package, upgrade, recover,
and QA.

Packaging and migration work is risky because it can accidentally delete user
data, corrupt EventStore or Project Knowledge files, publish generated
artifacts, or imply updater behavior that the app cannot safely perform yet.

## Decision

- All migrations start as dry-run plans.
- Data deletion is forbidden unless explicitly approved in a later dedicated
  phase.
- App must show schema/version state before any future migration.
- Backups/restore plans must be summary-first.
- No auto-update without explicit user confirmation.
- No cloud sync.
- No telemetry upload.
- Generated artifacts must stay ignored.
- Release channels must be explicit.

P1J may introduce metadata-only inventories, schema registries, dry-run
migration validators, backup/restore package plans, release channel policy, and
QA matrices. Those artifacts must not mutate user data or enable new execution
paths.

## Non-goals

- No migration execution.
- No updater implementation.
- No production auto migration.
- No destructive migration.
- No silent data deletion.
- No cloud sync.
- No telemetry upload.
- No remote config execution.
- No broad native bridge.
- No arbitrary desktop automation.
- No new Git/shell capability.
- No new MCP/plugin/skill execution capability.
- No new App apply/rollback capability beyond existing approved lanes.

## Required Gates

Before any future implementation can mutate data, tests must prove:

- App/project data directories are inventoried as metadata-only refs.
- Schema version registry rejects unknown, missing, or unsafe schema states.
- Migration dry-run plans do not write files and never delete data.
- Backup/restore plans are summary-first and include rollback package refs.
- Release channels are explicit and cannot silently auto-update.
- Generated artifacts and build outputs remain ignored.
- Cross-platform paths reject traversal, symlink, junction, reparse point, and
  unsafe app data dir differences.
- App UI surfaces are read-only until a later explicit approval phase.
- CI/release checks cover artifact hygiene, boundary checks, secret checks, and
  manual QA matrix coverage.

## Consequences

P1J makes packaging and upgrade work slower, but it prevents release polish from
quietly becoming a destructive data migration or updater feature. Future
upgrades can build from these dry-run contracts with clearer safety evidence.
