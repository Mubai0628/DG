# App Shell Approved Execution Replay Timeline v0.15

P0S-005 hardens the approved execution replay and audit timeline. The App view
model reconstructs the approved execution chain from existing safe summaries:
proposal import or generation, validation, diff audit, approval receipt,
approved apply, checkpoint, fixed verification lanes, approved rollback, and
final task status.

This is a replay projection only. It does not write events, apply patches,
rollback, run Git, run shell commands, issue leases, invoke Tauri, or execute
recovery actions.

## Required Stages

The timeline uses the following summary-only stages:

- `proposal_imported_or_generated`
- `validation_result`
- `diff_audit`
- `approval_receipt_created`
- `apply_attempted`
- `apply_succeeded_or_failed`
- `checkpoint_created`
- `verification_run`
- `verification_passed_or_failed`
- `rollback_attempted`
- `rollback_succeeded_or_failed`
- `final_task_status`

Each stage contains only a label, status, safe summary, optional event id, hash
prefix, warning codes, and blocker codes. It does not contain raw source, raw
diff, raw preimage, raw stdout, raw stderr, raw prompt, raw response, or API
keys.

## Missing And Duplicate Events

Missing events produce warnings, not crashes. For example, if an approved apply
count exists but no apply timeline event is available, the projection reports
`APPROVED_REPLAY_TIMELINE_EVENT_MISSING` and keeps execution disabled.

Duplicate event ids are deduplicated deterministically by `id` and event type.
The projection reports `APPROVED_REPLAY_DUPLICATE_EVENT_DEDUPED` and uses the
same timeline hash for the same summary input.

## Fail-Closed Rules

The replay timeline blocks if any input includes raw, secret-like, or execution
fields or markers, including:

- raw prompt or response
- raw source, diff, patch, stdout, stderr, CSV, or preimage content
- API key, Authorization header, bearer token, password, or private key marker
- arbitrary Git or shell command fields
- EventStore write fields
- apply, rollback, PermissionLease, native bridge, or desktop action fields

Blocked timelines show only safe finding codes and generic guidance. They do not
echo the unsafe value.

## UI Boundary

The `Approved Execution Replay Timeline` panel shows:

- timeline status
- completed, missing, warning, and blocked stage counts
- persisted and duplicate event counts
- approved apply, rollback, and verification event counts
- stage list with safe summaries and hash prefixes
- deterministic timeline hash
- disabled placeholders for replay write and execution

The active `Preview Approved Replay Timeline` button updates React state only.
It does not call Tauri, write EventStore, apply, rollback, or execute commands.

## Non-Goals

- no new runtime execution capability
- no new App execution capability
- no EventStore write
- no file write
- no apply or rollback from the timeline
- no arbitrary Git or shell
- no PermissionLease issuing
- no native bridge
- no desktop action
- no raw content in timeline output

## Related Work

- P0S-003 hardens approved apply/rollback conflict handling.
- P0S-004 adds approved execution recovery UX.
- P0S-005 adds a stricter replay/audit timeline projection over the same
  summary-only chain.
