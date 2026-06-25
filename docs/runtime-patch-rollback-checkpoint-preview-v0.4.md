# Runtime Patch Rollback Checkpoint Preview v0.4

`buildPatchRollbackCheckpointPreview()` is a pure, summary-only helper for
planning a rollback checkpoint from a patch virtual apply preview. It is not a
rollback executor and it does not create checkpoint files.

## Scope

- accepts a Patch Virtual Apply Preview summary
- accepts proposal, validation, audit, and approval draft refs
- summarizes input and output snapshot hashes
- summarizes affected paths and restore scope metadata
- emits blocker, warning, and finding counts
- returns readiness for a future replay projection preview only

## Restore Scope

The restore scope is metadata-only:

- filesToRestore for update, documentation, test, and delete operations
- filesToRemoveIfCreated for created files
- filesToRecreateIfDeleted for deleted files
- metadataOnly is always true

No file content, raw source, raw diff, raw patch body, or real checkpoint path is
accepted or emitted.

## Safety Boundary

The helper does not read files, write files, write checkpoint files, execute
rollback, apply patches, execute Git, execute shell, call DeepSeek, issue a
PermissionLease, write EventStore records, or perform desktop actions.

Readiness flags are fixed to non-executing values:

- canRollbackReal: false
- rollbackExecuted: false
- canWriteFilesystem: false
- canApplyPatch: false
- canExecuteGit: false
- canExecuteShell: false

Passing this preview means only that a rollback planning summary exists. It
does not mean rollback can execute.

## Relation To Other Patch Previews

- Patch Proposal Creation Preview creates summary-only proposal refs.
- Patch Proposal Validation Preview validates those summaries.
- Patch Diff Audit Preview audits proposal and validation summaries.
- Patch Approval Draft creates a read-only approval request draft.
- Patch Virtual Apply Preview predicts metadata effects against an in-memory
  snapshot.
- Patch Rollback Checkpoint Preview derives metadata-only restore scope from
  that virtual apply summary.
- A future Replay Projection Preview may consume this summary. Real rollback
  remains deferred.

## Non-goals

- no real rollback
- no checkpoint file write
- no patch apply
- no filesystem read
- no filesystem write
- no raw source or raw diff display
- no Git or shell execution
- no DeepSeek call
- no EventStore write
- no native bridge or desktop action
