# App Approved User Workspace Apply Command v0.11

P0O-004 adds the first narrow App-side user workspace write command:
`apply_approved_user_workspace_patch`.

The command is intentionally small. It accepts an approved execution receipt,
summary refs, and explicit operations, then writes only the allowed relative
paths under the selected user workspace.

## Boundaries

- Fixed Tauri command only; no generic command runner.
- Requires an App approved execution receipt with exact
  `APPLY TO USER WORKSPACE` confirmation.
- Requires proposal, validation, audit, and approval summary refs.
- Requires allowed relative paths and maxFiles / maxBytes limits.
- Blocks absolute paths, Windows drive paths, UNC paths, traversal, shell
  metacharacters, URL-like paths, `.git`, `.env`, `node_modules`, `dist`,
  `target`, `.tmp`, generated artifact paths, and secret-like filenames.
- Blocks symlink / reparse escape and directory delete.
- Blocks fake API keys, Bearer / Authorization markers, private key markers,
  raw prompt / DOM / CSV / screenshot markers, and binary-looking content.
- Writes a local rollback checkpoint under
  `.deepseek-workbench/checkpoints/`.
- Returns a summary-only result and an `eventPreview` with `notWritten: true`.

## Non-goals

- No EventStore write in P0O-004.
- Rollback is handled by the separate P0O-005 `rollback_approved_user_workspace_patch` command from checkpoint.
- No Git or shell execution.
- No PermissionLease issuing.
- No App-side model execution.
- No native bridge.
- No desktop action.
- No raw content, raw preimage, raw prompt, raw diff, or API key in the result.

## Checkpoint Safety

The command captures preimage content before update/delete and stores it in the
workspace-private checkpoint file. That file may contain raw preimage content so
rollback can be possible later, but the command result, App UI, and event
preview remain summary-only.

The `.deepseek-workbench/.gitignore` file is created with `checkpoints/` when
needed so local checkpoint artifacts are not accidentally promoted.

## Relation to P0O

- P0O-003 defines the receipt model.
- P0O-004 consumes the receipt and performs approved apply under strict guards.
- P0O-005 will consume the checkpoint for approved rollback.
- P0O-006 will wire summary events and replay surface.
