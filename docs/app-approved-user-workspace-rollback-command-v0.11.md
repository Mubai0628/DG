# App Approved User Workspace Rollback Command v0.11

Status: implemented for DW-P0O-005.

This document describes the narrow Tauri command that rolls back an approved user workspace apply from a private checkpoint. It is part of the v0.11 App-side Approved Execution MVP and follows the local specification in `docs/v0.11 - App-side Approved Execution MVP.md`.

## Scope

The command is fixed-name only:

```text
rollback_approved_user_workspace_patch
```

It accepts only:

- `workspaceRoot`
- `workspaceRootRef`
- `receipt`
- `applyId`
- `checkpointId`
- `checkpointRef`

The command is not a generic filesystem API. It cannot run Git, shell, agent capabilities, native bridge actions, desktop actions, or EventStore writes.

## Safety Gates

Rollback is allowed only when all of these checks pass:

- `workspaceRoot` is an existing non-root workspace directory.
- `receipt.source` is `runtime_app_approved_execution_receipt`.
- `receipt.kind` and `receipt.scope.kind` are `rollback`.
- `receipt.summaryOnly` is true.
- `receipt.scope.typedConfirmation` is exactly `ROLLBACK USER WORKSPACE`.
- `workspaceRootRef` matches the receipt and checkpoint.
- `checkpointId` matches the receipt and checkpoint.
- `checkpointRef` matches the checkpoint content hash.
- All receipt execution readiness flags are false.
- All checkpoint entry paths are relative and remain inside the workspace.
- Generated/private directories, secret-like paths, absolute paths, Windows drive paths, UNC-like paths, traversal, symlinks, reparse points, and directories are blocked.

## Checkpoint Boundary

Read checkpoint only from:

```text
<workspaceRoot>/.deepseek-workbench/checkpoints/<checkpointId>.json
```

The checkpoint file path is canonicalized and must stay inside the private checkpoint directory. The checkpoint can contain preimage content because rollback needs it, but that content remains local checkpoint data only.

## Rollback Behavior

- `create` rollback removes the created file only. It never deletes directories.
- `update` rollback restores the preimage content from checkpoint.
- `delete` rollback recreates the deleted file from checkpoint preimage content.
- Existing symlinks, reparse points, directories, path escapes, and mismatched checkpoint hashes fail closed.

## Result

The command returns a summary-only result:

- `rollbackId`
- `applyId`
- `checkpointId`
- `checkpointHash`
- operation counts
- files removed/restored counts
- `restoredSnapshotHash`
- `resultHash`
- warning codes
- `eventPreview.notWritten: true`

The result and event preview do not contain raw source, raw diff, raw prompt, raw response, API keys, checkpoint preimage content, before content, after content, or file contents.

## Non-goals

- No generic rollback command.
- No App UI execution flow in DW-P0O-005.
- No EventStore write.
- No raw content event payload.
- No recursive delete.
- No App approval/rejection execution.
- No PermissionLease issuing.
- No Git/shell execution.
- No native bridge.
- No desktop action.

DW-P0O-006 wires the approved apply/rollback flow and summary replay surfaces on top of these fixed commands.
