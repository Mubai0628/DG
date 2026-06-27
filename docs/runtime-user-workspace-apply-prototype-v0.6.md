# Runtime User Workspace Apply Prototype v0.6

The User Workspace Apply Prototype is disabled by default. It is a runtime-only
prototype for explicit user workspace fixture roots created by tests or a
similarly controlled caller. It is not connected to the App Shell.

The helper can write only when `applyMode` is
`explicit_user_workspace_apply_prototype`, the caller supplies a canonical
`userWorkspaceRoot`, promotion readiness is complete, the user workspace
snapshot / backup contract is ready, and a summary-only approval receipt is in
scope. The approval receipt is not a production PermissionLease.

## Required Inputs

- Promotion Readiness summary
- User Workspace Snapshot / Backup Contract summary
- Disposable Patch Apply Result summary
- Disposable Patch Rollback Result summary
- Sandbox Apply / Rollback Event Projection summary
- Patch Proposal Creation Preview
- Patch Proposal Validation Preview
- Patch Diff Audit Preview
- Patch Approval Draft
- Patch Virtual Apply Preview
- Patch Rollback Checkpoint Preview
- Approval receipt scoped to `user_workspace_apply_prototype`
- Backup entries for update/delete prototype operations
- Explicit create/update/delete operations

Create/update operation content and backup preimage content may be supplied to
the runtime helper because this is a prototype writer. That content is scanned
for secret and raw markers and is never returned in output, event previews,
logs, or docs examples.

## Write Boundary

The helper may write only under the canonical `userWorkspaceRoot` supplied by
the caller. It rejects:

- missing or non-canonical roots
- repository root, drive root, home/profile root, or OS temp root itself
- roots that match the disposable root ref
- absolute, drive-letter, UNC, traversal, query-like, control-character, or
  shell-metacharacter operation paths
- target paths that escape the canonical root
- symlink, junction, or reparse-like parent/target paths where detectable
- `.git`, `.env`, secret-like, dependency, generated, `node_modules`, `dist`,
  `target`, and `.tmp` paths
- recursive delete and directory delete

The helper does not change chmod or executable bits, does not touch Git index,
does not execute shell, does not use network, and does not write EventStore.

## Output

The result is summary-only:

- status
- apply id
- user workspace root ref
- readiness and approval receipt ids
- proposal / validation / audit / approval / virtual apply / checkpoint refs
- operation counts
- created / updated / deleted counts
- byte estimates
- operation result hashes
- blocker / warning / finding counts
- input and output snapshot hashes
- event preview with `notWritten: true`
- readiness flags fixed false for Git, shell, EventStore, and App execution

It never includes raw source, raw diff, raw patch, operation content, preimage
content, backup content, raw prompt, or API keys.

## Non-goals

- No App-side apply
- No Tauri command
- No EventStore write
- No raw output
- No Git commit or push
- No shell execution
- No DeepSeek call
- No production PermissionLease issuance
- No native bridge
- No desktop action
- No user workspace rollback in this task

## Future Path

P0K-005 may add a disabled-by-default User Workspace Rollback Prototype. That
future work must preserve the same explicit fixture-root and summary-only output
boundaries.
