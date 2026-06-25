# App Shell Patch Rollback Checkpoint Preview v0.4

The App Shell Patch Rollback Checkpoint Preview is a local, metadata-only
surface. It consumes the runtime rollback checkpoint preview helper and shows a
restore scope summary derived from the current Patch Virtual Apply Preview.

## What It Shows

- checkpoint preview status
- checkpoint preview id
- virtual apply, proposal, validation, audit, and approval draft ids
- input and output snapshot hash summaries
- affected file count
- restore scope summary
- operation summaries
- blocker, warning, and finding counts
- readiness for replay projection preview only

## App Shell Boundary

The panel is labeled `Checkpoint preview / no real rollback`. The `Preview
Rollback Checkpoint` button only updates React state. It does not call Tauri,
write events, read files, write files, write checkpoint files, execute rollback,
run Git, run shell, execute capability, issue a PermissionLease, approve,
reject, commit, or apply a patch.

The Diff, Approval, Audit, and Context Assembly surfaces receive only summary
refs. Rollback checkpoint refs are placed in `no_compress_zone` so future prompt
assembly can preserve the checkpoint summary boundary. No prompt is assembled
in this phase.

## Restore Scope Policy

The restore scope is metadata-only and can include safe path summaries for:

- files to restore
- files to remove if they were created by the proposal
- files to recreate if they were deleted by the proposal

Raw file content, raw source, raw diff, raw patch body, beforeContent,
afterContent, checkpoint file paths, rawPrompt, rawDom, rawCsv, clipboard
content, Authorization values, API keys, stdout, stderr, and env values are
rejected or withheld.

## Relation To Other Patch Previews

- Patch Proposal Creation Preview creates summary-only proposal refs.
- Patch Proposal Validation Preview validates those summaries.
- Patch Diff Audit Preview audits proposal and validation summaries without raw
  diff generation.
- Patch Approval Draft creates a read-only approval request draft.
- Patch Virtual Apply Preview predicts metadata effects against a summary
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
