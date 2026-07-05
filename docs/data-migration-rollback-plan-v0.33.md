# Data Migration Rollback Plan v0.33

This plan defines how a future migration can be rolled back after an approved
release task. It does not run backup, restore, migration, deletion, sync, or
update operations.

## Rollback Principles

- Rollback planning is summary-only.
- Backup / restore dry-run evidence is required before any future migration.
- Checkpoints and preimages stay private/local and are never included raw in
  EventStore, docs, release notes, logs, or QA artifacts.
- Rollback cannot be triggered by the model.
- Rollback cannot be triggered by App Shell preview surfaces.
- No destructive migration.
- No silent data deletion.
- No cloud sync.
- No telemetry upload.
- No auto-update without confirmation.

## Store-specific Plan

| Store or surface                          | Rollback summary required                        | Restore boundary                                  | Blocker condition                               |
| ----------------------------------------- | ------------------------------------------------ | ------------------------------------------------- | ----------------------------------------------- |
| EventStore                                | Event count, schema version, last safe offset    | Append-only summary recovery plan                 | Raw payload rewrite or destructive compaction   |
| Project Knowledge store                   | Entry count, revoke/expire counts, trust summary | Human-reviewed restore summary                    | Raw memory body exposure or hidden policy write |
| Checkpoints / preimages                   | Checkpoint count, scope hash, expiry state       | Private checkpoint restore only                   | Missing checkpoint for approved mutation        |
| Replay summaries                          | Replay count and deterministic projection status | Recompute summary projection without mutation     | Replay side effect or raw payload output        |
| Workspace-local `.deepseek-workbench` dir | Directory class count and warning codes          | Workspace-root bounded restore plan               | Path escape or silent deletion                  |
| App settings if any                       | Presence flag and schema hash                    | Settings migration disabled until explicit review | Secret value exposure or hidden mutation        |
| Release channel metadata                  | Channel and tag summary                          | Manual channel correction only                    | Silent update or unexpected channel switch      |
| Migration version registry                | Current and target version labels                | Registry correction by explicit future task       | Unknown migration auto-applied                  |

## Manual Evidence

Manual QA must capture only counts, hashes, status labels, and warning codes.
Screenshots or logs used as evidence must be redacted and must not include raw
CSV, DOM, source, diff, prompt, response, checkpoint, preimage, API key, token,
or secret material.
