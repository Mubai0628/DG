# Packaging / Update / Data Migration Threat Model v0.31

## Assets

- App data directory summaries.
- Project workspace configuration summaries.
- EventStore JSONL files.
- Project Knowledge / memory files.
- Replay projections and approval receipts.
- Backup, restore, and rollback package manifests.
- Release artifacts and installer outputs.
- User trust in explicit update and migration confirmation.

## Trust Boundaries

- App Shell UI to runtime dry-run helpers.
- Runtime helpers to local filesystem metadata.
- Release scripts to ignored/generated artifact directories.
- Installer/update metadata to local app state.
- Existing approved apply/rollback lanes to packaging/migration summaries.

## Threats

### Migration Data Loss

A migration plan might omit preimages, overwrite files, or treat generated
state as disposable user data. Mitigation: all migration output starts as
dry-run, requires backup refs, and forbids deletion in P1J.

### Silent Data Deletion

An updater or migration could remove files without explicit user approval.
Mitigation: destructive migration and silent data deletion are non-goals and
must be blocked by validators and App copy.

### Checkpoint / Preimage Loss

Rollback package plans can be incomplete or detached from the files they claim
to protect. Mitigation: backup/restore gates require package ids, hash refs,
source schema refs, and rollback coverage summaries.

### EventStore Corruption

EventStore replay can become incompatible with new schema versions. Mitigation:
schema registry must identify EventStore schema state before any future
migration plan is considered ready.

### Project Knowledge Schema Mismatch

Memory or Project Knowledge entries can be unreadable after upgrade. Mitigation:
schema version registry tracks Project Knowledge schema summaries and warns on
unknown versions.

### Replay Incompatibility

Replay projections can drift when event shapes change. Mitigation: migration
dry-run plans must include replay compatibility checks and summary-only
findings.

### Backup Corruption

A backup manifest can claim coverage without matching hashes. Mitigation:
backup plans must carry hash/count summaries and blocked readiness until
coverage is proven.

### Restore Mismatch

Restore plans can target a different app version, platform, or workspace.
Mitigation: restore package refs must include platform, schema, and source
state summaries.

### Partial Update Failure

An update may install code without compatible data state. Mitigation: release
channel and first-run upgrade checks remain explicit and dry-run in P1J.

### Installer Overwrite

Installer output might overwrite local app data or tracked source files.
Mitigation: artifact hygiene checks separate generated artifacts from data
directories and release assets.

### Rollback Package Failure

Rollback package metadata might be missing for migrated state. Mitigation:
rollback package plan readiness is false until coverage is complete.

### Path Traversal / Symlink / Junction / Reparse Points

Packaging or migration paths can escape the intended roots. Mitigation:
cross-platform path hardening must block traversal, absolute path surprises,
symlinks, junctions, and reparse point hazards.

### Cross-platform App Data Dir Differences

Windows, macOS, and Linux app data directories differ. Mitigation: inventory
must model platform-specific roots as refs, not raw filesystem dumps.

### Sensitive Data Leakage in Migration Logs

Migration logs can leak raw prompts, responses, source, diffs, API keys, or
private data. Mitigation: migration output is summary-only and redacted.

### Release Artifact Pollution

Build outputs or conformance artifacts can be committed or shipped
accidentally. Mitigation: artifact hygiene checks verify ignored directories and
release asset scopes.

### Malicious Update Source

Future updater metadata could point at untrusted release sources. Mitigation:
release channels are explicit; no auto-update or remote config execution is
enabled in P1J.

## Out of Scope

- Implementing updater downloads.
- Executing production migrations.
- Cloud sync.
- Telemetry upload.
- Broad native bridge.
- New arbitrary Git/shell execution.
