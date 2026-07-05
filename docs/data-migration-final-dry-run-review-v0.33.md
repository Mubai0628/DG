# Data Migration Final Dry-run Review v0.33

This v1 candidate review covers the v0.32 data inventory, schema registry, and
migration dry-run plan. It is documentation-only and does not perform migration,
file deletion, workspace mutation, cloud sync, telemetry upload, or auto-update.

## Reviewed Stores

| Store or surface                          | Current dry-run behavior                                 | Required summary evidence                         | Release blocker if missing                       |
| ----------------------------------------- | -------------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------ |
| EventStore                                | Inventory and migration plan are summary-only            | Event type counts, schema version, warning codes  | Raw event payload or destructive rewrite         |
| Project Knowledge store                   | Lifecycle entries remain human-reviewed and summary-only | Entry counts, trust policy, revoke/expire counts  | Raw memory body or model-direct policy write     |
| Checkpoints / preimages                   | Checkpoint and preimage review remains private/local     | Count, scope, expiry, hash prefix                 | Raw preimage content or uncheckpointed mutation  |
| Replay summaries                          | Replay remains deterministic and non-mutating            | Replay count, skipped/corrupt count, warning code | Replay re-execution or raw payload display       |
| Workspace-local `.deepseek-workbench` dir | Workspace-local data stays under explicit workspace root | Directory summary, known file classes             | Silent deletion or write outside app-owned paths |
| App settings if any                       | Settings are reviewed only if present                    | Presence flag, schema version, summary hash       | Hidden setting mutation or secret persistence    |
| Release channel metadata                  | Release channel remains explicit and review-only         | Channel label, tag recommendation, status         | Silent update or channel switch without approval |
| Migration version registry                | Version registry is compared without mutation            | Known version list and pending migration count    | Unknown migration applying by default            |
| Backup / restore dry-run plan             | Backup/restore remains dry-run reviewed                  | Backup scope, restore target, warning codes       | Destructive restore or missing rollback path     |

## Required Safety Statements

- No destructive migration.
- No silent data deletion.
- No cloud sync.
- No telemetry upload.
- No auto-update without confirmation.
- No raw EventStore payload persistence in release artifacts.
- No raw Project Knowledge body persistence in release artifacts.
- No raw checkpoint/preimage content in docs, events, logs, or release notes.

## Review Outcome

The v1 candidate can proceed only when migration evidence is summary-only,
backup/restore dry-run evidence exists, and all mutation remains explicitly
gated by future release tasks. This review does not enable real migration.
