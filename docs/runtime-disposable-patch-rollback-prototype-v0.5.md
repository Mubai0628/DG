# Runtime Disposable Patch Rollback Prototype v0.5

Status: prototype helper, disabled by default.

## Scope

`runtime/src/execution/sandbox/disposable-patch-rollback.ts` introduces a narrowly scoped runtime helper for rolling back an explicit disposable patch apply result inside a caller-provided disposable workspace root. It is the rollback counterpart to the disposable apply prototype.

The helper is not connected to the App Shell, Tauri, EventStore, git, shell, agents, capabilities, PermissionLease, native bridge, desktop action, or DeepSeek.

## Required Inputs

- `rollbackMode: "explicit_disposable_rollback"`
- canonicalizable `disposableRoot`
- opaque `disposableRootRef`
- Disposable Patch Apply Result summary with `status: "applied_to_disposable"`
- Disposable Workspace Snapshot Contract summary
- Patch Proposal Creation Preview summary
- Patch Proposal Validation Preview summary
- Patch Diff Audit Preview summary
- Patch Approval Draft summary
- Patch Virtual Apply Preview summary
- Patch Rollback Checkpoint Preview summary
- explicit checkpoint summary with `applyId`, `checkpointHash`, and entries

`rollbackMode: "disabled"` and `rollbackMode: "dry_run"` do not write.

## Rollback Boundary

All rollback targets must resolve under the canonical disposable root. The helper rejects:

- missing or non-canonical disposable roots
- drive roots, repository root, home root, and OS temp root itself
- target paths that escape the disposable root
- absolute, drive-letter, UNC, traversal, URL/query, control-character, and shell-metacharacter paths
- symlink, junction, or reparse-point parents/targets where detectable
- `.git`, `.env`, `node_modules`, `dist`, `target`, `.tmp`, generated artifact, and secret-like paths
- recursive delete and directory delete
- checkpoint apply id or disposable root ref mismatches
- current disposable file hash mismatches when an applied hash is provided

Parent directories may be created only under the disposable root when recreating a file that was deleted by the disposable apply.

## Checkpoint Preimage Handling

Checkpoint entries may include UTF-8 `preimageContent` for update/delete rollback operations. Preimage content is secret-scanned and rejected for API-key, bearer-token, authorization-header, private-key, raw prompt, raw DOM, raw CSV, raw screenshot, clipboard, and URL-query secret markers.

Returned results never include checkpoint preimage content, raw source, raw patch, or raw diff. Outputs are limited to paths, counts, byte totals, hash prefixes, findings, and readiness flags.

## Event Preview

The helper returns a summary-only `eventPreview` with `notWritten: true`. It is not written to EventStore.

## Non-Goals

- no user workspace rollback
- no Git commit or push
- no shell command execution
- no DeepSeek call
- no raw output
- no agent or capability execution
- no PermissionLease issuing
- no App Shell execution path
- no native bridge or desktop action

## Future Path

P0J-005 may add apply / rollback event projection for these sandbox summaries. Real user workspace apply and rollback remain deferred.
