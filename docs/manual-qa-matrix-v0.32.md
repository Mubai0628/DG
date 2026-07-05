# Manual QA Matrix v0.32

This matrix is the P1J-007 manual QA planning artifact. It adds no execution
capability and does not enable App-side update, migration, apply, rollback, Git,
shell, native bridge, or desktop action flows.

## Coverage Matrix

| Area                                             | Manual QA coverage                                                                                     | Boundary                                                                     |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| Convert baseline                                 | Run web table conversion with a safe demo workspace and verify CSV output.                             | Real conversion flow only; no raw DOM/CSV display beyond existing safe flow. |
| App approved apply/rollback                      | Verify approved apply/rollback surfaces retain explicit approvals and summary events.                  | No broad App execution beyond existing approved lanes.                       |
| Git/shell safe lanes                             | Verify read/verification lanes show fixed templates and summary-only output.                           | No arbitrary Git/shell execution.                                            |
| Project Knowledge                                | Verify candidate review, commit, recall, revoke, and expire surfaces remain summary-only.              | No raw prompt/source/diff persistence.                                       |
| MCP read-only connection/tool                    | Verify connection discovery and read-only tool call previews.                                          | No mutating MCP/plugin/skill execution.                                      |
| Plugin/skill metadata                            | Verify metadata and redaction audit surfaces.                                                          | No plugin/skill runtime execution.                                           |
| Fixed multi-agent                                | Verify fixed sequencer and replay projections.                                                         | No dynamic agent bidding or arbitrary tool use.                              |
| Desktop Observer                                 | Verify observation metadata surfaces.                                                                  | No desktop action execution.                                                 |
| Desktop Action Proposal                          | Verify proposal-only surface and disabled execution unless approved lane applies.                      | No broad native bridge or arbitrary desktop automation.                      |
| Approved Desktop Action                          | Verify approved click/type lanes remain receipt-gated.                                                 | No background or unapproved desktop action.                                  |
| Expanded Desktop Action click/type lanes         | Verify expanded action receipts and summaries.                                                         | No clipboard/file-dialog/drag-drop expansion in this phase.                  |
| Desktop recovery                                 | Verify recovery recommendations are read-only.                                                         | No retry, compensation execution, or desktop replay.                         |
| Cross-surface workflow                           | Verify workflow, evidence, approval consistency, and replay timelines.                                 | Summary-only projections unless a previously approved lane explicitly runs.  |
| Data inventory / migration dry-run / backup plan | Verify inventory, migration dry-run, backup/restore, release/update policy, and artifact hygiene docs. | No auto-update, migration execution, archive creation, restore, or delete.   |

## Required Manual Checks

1. Confirm existing v0.1 `web_table_to_csv` Convert still works.
2. Confirm Event Log / Replay surfaces still show events, drafts, and timeline.
3. Confirm Record Draft Event still writes only the existing App/Tauri local
   summary-event path.
4. Confirm P1J data inventory, migration dry-run, backup/restore, and
   release/update surfaces are read-only.
5. Confirm no App UI offers enabled update, install, migration, restore, delete,
   apply, rollback, approve/reject, PermissionLease, Git, shell, native bridge,
   or desktop action controls outside existing approved lanes.

## Current Limitations

- No App-side auto-update.
- No App-side migration execution.
- No App-side backup archive creation.
- No App-side restore or data deletion.
- No generated artifacts committed.
- No new native bridge or desktop action scope.
