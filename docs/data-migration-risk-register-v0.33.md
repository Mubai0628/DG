# Data Migration Risk Register v0.33

This register lists known migration risks for v1 candidate release readiness.
It is a review artifact only and does not enable migration.

| Risk                             | Affected area                              | Severity | Current mitigation                                       | Release status        |
| -------------------------------- | ------------------------------------------ | -------- | -------------------------------------------------------- | --------------------- |
| Destructive migration            | EventStore, workspace-local data           | High     | Dry-run review only; no destructive migration            | Blocker if introduced |
| Silent data deletion             | EventStore, Project Knowledge, checkpoints | High     | No silent data deletion; explicit future approval needed | Blocker if introduced |
| Cloud sync                       | All local stores                           | High     | No cloud sync                                            | Blocker if introduced |
| Telemetry upload                 | Logs, events, QA evidence                  | High     | No telemetry upload                                      | Blocker if introduced |
| Auto-update without confirmation | Release channel metadata                   | High     | No auto-update without confirmation                      | Blocker if introduced |
| Raw EventStore payload leak      | Event Log / Replay                         | High     | Summary-only replay and redaction checks                 | Blocker if detected   |
| Raw Project Knowledge body leak  | Project Knowledge store                    | High     | Human-reviewed summary lifecycle only                    | Blocker if detected   |
| Raw checkpoint/preimage leak     | Approved apply/rollback checkpoints        | High     | Private checkpoints and summary-only events              | Blocker if detected   |
| Replay side effect               | Replay summaries                           | High     | Replay is deterministic and non-mutating                 | Blocker if detected   |
| Version registry drift           | Migration version registry                 | Medium   | Compare labels in dry-run review                         | Must be resolved      |
| Settings schema ambiguity        | App settings if any                        | Medium   | Presence flag and schema hash only                       | Must be reviewed      |
| Backup/restore evidence gap      | Backup / restore dry-run plan              | High     | Manual dry-run evidence required                         | Blocker if missing    |

## Required Release Statements

- No destructive migration.
- No silent data deletion.
- No cloud sync.
- No telemetry upload.
- No auto-update without confirmation.

## Known Limit

This risk register does not perform backup, restore, migration, update,
deletion, or workspace mutation. Real migration promotion remains deferred.
