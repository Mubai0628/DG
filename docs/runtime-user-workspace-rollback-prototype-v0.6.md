# Runtime User Workspace Rollback Prototype v0.6

The user workspace rollback prototype is disabled by default and exists only for
runtime tests or explicit fixture calls. It is the P0K-005 counterpart to the
user workspace apply prototype: it can restore or remove files only inside an
explicit caller-provided `userWorkspaceRoot` fixture after checkpoint and
approval gates pass.

## Scope

- Runtime helper only.
- Explicit `rollbackMode: "explicit_user_workspace_rollback_prototype"` is
  required.
- The target root must be an absolute, canonicalized fixture root.
- The target root cannot be the repository root, drive root, user profile root,
  or OS temp root itself.
- Every rollback target must stay under `userWorkspaceRoot`.
- Result and event preview are summary-only.

## Required Inputs

- User Workspace Apply Prototype result with
  `status: "applied_to_user_workspace_prototype"`.
- User Workspace Snapshot / Backup Contract summary.
- Promotion Readiness summary.
- Rollback checkpoint summary with checkpoint entries.
- Approval receipt scoped to `user_workspace_rollback_prototype`.
- Rollback operations or checkpoint entries.

The approval receipt is a summary-only test/prototype input. It is not a
production PermissionLease and does not enable App execution.
It is not a production PermissionLease.

## Preimage Handling

Checkpoint entry `preimageContent` may be supplied to the runtime helper so
update and delete rollbacks can restore fixture files. Preimage content is
secret-scanned and must never appear in output, event previews, logs, docs
examples, or App UI.

The output includes only path summaries, counts, byte totals, hash prefixes,
warning codes, and `notWritten: true` event preview metadata.

## Safety Policy

The helper blocks absolute paths, drive-letter paths, UNC paths, traversal,
null bytes, newlines, shell metacharacters, URL/query-like paths, `.git`, `.env`,
`node_modules`, `dist`, `target`, `.tmp`, generated artifacts, and secret-like
filenames.

It rejects symlink targets and symlink parent paths where detectable. It does
not recursively delete directories, delete directories, chmod files, change
executable bits, touch Git indexes, execute shell commands, use the network, or
write EventStore events.

## Event Preview

The event preview type is:

- `user_workspace.patch_rollback.prototype_result`

It is not persisted. `notWritten` is always `true`.

## Non-goals

- No App rollback.
- No Tauri command.
- No EventStore write.
- No Git commit or push.
- No shell execution.
- No raw output.
- No DeepSeek call.
- No native bridge.
- No desktop action.

## Future Path

P0K-006 may design real apply/rollback EventStore writers for summary-only
events. This prototype does not add that writer.
