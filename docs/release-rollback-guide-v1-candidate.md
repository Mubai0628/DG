# Release Rollback Guide v1 Candidate

This guide describes release rollback preparation. It does not delete files,
change tags, run migration, restore backups, or mutate a workspace.

## Rollback Release Tag

- Identify the published release tag and previous known-good tag.
- Prefer GitHub Release visibility changes or follow-up release notes over tag
  mutation unless the release owner explicitly chooses otherwise.
- Record only tag names, commit hashes, release URLs, and status summaries.

## Workspace Checkpoint Rollback

- Approved workspace apply uses private checkpoints and preimages.
- Rollback requires the existing approved rollback receipt and exact typed
  confirmation.
- Do not delete checkpoints manually during release rollback review.
- Do not expose raw preimage or backup content in EventStore, logs, screenshots,
  or release notes.

## EventStore Summary Replay

- Use Event Log / Replay to verify summary event counts and timelines.
- Replay must remain deterministic and non-mutating.
- Do not edit EventStore files manually as part of release rollback review.
- Do not persist raw event payloads in rollback evidence.

## Data Backup Guidance

- Keep backup / restore evidence summary-only.
- Review backup scope, hash prefix, warning codes, and restore target summary.
- Do not run destructive restore from the App Shell.
- Do not sync backups to cloud from this project.

## What Not To Delete

- Do not delete `workspace/.deepseek-workbench` during review.
- Do not delete approved execution checkpoints or preimages.
- Do not delete EventStore files to hide failures.
- Do not delete Project Knowledge records as a rollback substitute.
- Do not delete generated artifacts with an unreviewed cleanup script.

## Escalation

If rollback evidence shows raw content leakage, unknown migration state, or
checkpoint mismatch, stop the release and create a follow-up fix task. Do not
ship a release that depends on undocumented destructive cleanup.
