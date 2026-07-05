# P1J Packaging / Update / Data Migration / QA Matrix Roadmap

P1J goal:

- make the app safer to package, upgrade, recover, and QA
- inventory app/project data directories
- introduce schema version registry
- add migration dry-run validators
- add backup / restore / rollback package plans
- define release channels and update policy
- harden packaging / artifact hygiene
- expand manual QA and release smoke matrix

## Non-expansion Rules

P1J does not expand execution scope. It keeps:

- no auto-update without confirmation
- no destructive migration
- no silent data deletion
- no cloud sync
- no telemetry upload
- no broad native bridge
- no arbitrary desktop automation
- no new Git/shell capability
- no new MCP/plugin/skill execution capability
- no new App apply/rollback capability beyond existing approved lanes

## Recommended Tasks

1. P1J-001 Packaging / Update / Migration ADR + Threat Model +
   Implementation Gate.
2. P1J-002 App Data Directory Inventory / Schema Version Registry.
3. P1J-003 Migration Dry-run Validator / Plan Model.
4. P1J-004 Backup / Restore / Rollback Package Plan, dry-run only.
5. P1J-005 Release Channel / Update Policy / First-run Upgrade State Checks.
6. P1J-006 Installer / Artifact Hygiene / Cross-platform Path Hardening.
7. P1J-007 Manual QA Matrix / Release Smoke Matrix Hardening.
8. P1J-008 v0.32 RC polish + full gates + push/tag/release.

## Explicitly Deferred

- auto-update without confirmation
- cloud sync
- telemetry upload
- destructive migration
- silent data deletion
- production auto migration
- new execution capability

## Acceptance Direction

Each runtime/App step must be metadata-only or dry-run only unless a later
dedicated phase explicitly approves mutation. Any future migration, update, or
restore feature must show a plan first, preserve backups, avoid raw sensitive
logs, and fail closed on unsafe paths, schema mismatch, or artifact pollution.
