# Runtime Controlled Creation Replay Projection v0.4

`buildControlledCreationReplayProjection()` is a pure, summary-only helper for
projecting controlled-creation preview stages into a replay timeline. It is not
an execution engine and it does not write EventStore records.

## Scope

- accepts a summary-only run draft event summary
- accepts local preview summaries for patch proposal creation, validation, diff
  audit, approval draft, virtual apply, and rollback checkpoint
- checks stage order and related IDs
- summarizes persisted event stages versus local preview stages
- emits blocker, warning, and finding counts
- returns a hash-chain summary for review
- places replay projection refs in `no_compress_zone`

## Replay Chain

The helper recognizes these stages:

1. run_draft_event_recorded
2. patch_proposal_creation_previewed
3. patch_proposal_validation_previewed
4. patch_diff_audit_previewed
5. patch_approval_draft_previewed
6. patch_virtual_apply_previewed
7. patch_rollback_checkpoint_previewed

The first stage may be a persisted summary event. Later stages are local
preview summaries. Missing earlier stages block the projection when a later
stage is present. Missing later stages produce a partial projection.

## Safety Boundary

The helper rejects or blocks raw-content fields and unsafe markers, including
raw source, raw diff, raw patch, raw prompt, raw DOM, raw CSV, screenshots,
clipboard text, Authorization values, API keys, stdout, stderr, env values,
beforeContent, and afterContent.

The helper does not read files, write files, write EventStore records, create or
execute a ControlPlaneRun, apply patches, execute rollback, execute Git,
execute shell, call DeepSeek, invoke capabilities, issue a PermissionLease,
use a native bridge, or perform desktop actions.

Readiness flags are fixed to non-executing values:

- canExecuteRun: false
- canApplyPatch: false
- canRollbackReal: false
- canWriteFilesystem: false
- canExecuteGit: false
- canExecuteShell: false

Passing this preview means only that a replay projection summary exists. It
does not mean that any controlled creation action can execute.

## Relation To Controlled Creation Previews

- Run Draft Event provides the persisted summary stage.
- Patch Proposal Creation Preview provides the proposal summary stage.
- Patch Proposal Validation Preview validates proposal summaries.
- Patch Diff Audit Preview audits proposal and validation summaries.
- Patch Approval Draft creates a read-only approval request draft.
- Patch Virtual Apply Preview predicts metadata effects against a summary
  snapshot.
- Patch Rollback Checkpoint Preview derives metadata-only restore scope.
- Controlled Creation Replay Projection links those summaries into a reviewable
  timeline.

A future stage may project this timeline into real control-plane event
projection. Real execution remains deferred.

## Non-goals

- no real ControlPlaneRun creation or execution
- no EventStore write
- no patch apply
- no real rollback
- no filesystem read
- no filesystem write
- no raw source or raw diff display
- no Git or shell execution
- no DeepSeek call
- no capability invocation or PermissionLease issuing
- no native bridge or desktop action
