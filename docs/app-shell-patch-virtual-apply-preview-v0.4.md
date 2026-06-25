# App Shell Patch Virtual Apply Preview v0.4

The App Shell Patch Virtual Apply Preview is a local, in-memory, summary-only
surface. It consumes the runtime virtual apply preview helper and shows the
predicted metadata effects of a patch proposal.

## What It Shows

- preview status
- virtual apply id
- proposal, validation, audit, and approval draft ids
- input and output snapshot hash summaries
- predicted created, updated, and deleted file counts
- estimated line additions and removals
- missing path and protected path findings
- rollback checkpoint preview summary
- blocker, warning, and finding counts
- readiness for rollback checkpoint preview only

## App Shell Boundary

The panel is labeled `In-memory only / no filesystem write`. The `Preview
Virtual Apply` button only updates React state. It does not call Tauri, write
events, read files, write files, run git, run shell, execute capability, issue a
PermissionLease, approve, reject, rollback, or apply a patch.

The Diff, Approval, Audit, and Context Assembly surfaces receive only summary
refs. Virtual apply refs are placed in `no_compress_zone` so future prompt
assembly can preserve the summary boundary. No prompt is assembled in this
phase.

## Snapshot Policy

The current App Shell uses Workspace Index summary metadata as the in-memory
snapshot source when available. The accepted fields are safe path and file
summary metadata only. Raw file content, raw source, raw diff, raw patch body,
beforeContent, afterContent, rawPrompt, rawDom, rawCsv, clipboard content,
Authorization values, API keys, stdout, stderr, and env values are rejected or
withheld.

## Relation To Other Patch Previews

- Patch Proposal Creation Preview creates summary-only proposal refs.
- Patch Proposal Validation Preview validates those summaries.
- Patch Diff Audit Preview audits proposal and validation summaries without raw
  diff generation.
- Patch Approval Draft creates a read-only approval request draft.
- Patch Virtual Apply Preview predicts metadata effects against a summary
  snapshot.
- A future Rollback Checkpoint Preview may consume this summary. Real apply
  remains deferred.

## Non-goals

- no patch apply
- no real rollback
- no filesystem read or write
- no raw source or raw diff display
- no Git or shell execution
- no DeepSeek call
- no EventStore write
- no native bridge or desktop action
