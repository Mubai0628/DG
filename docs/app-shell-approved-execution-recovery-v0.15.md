# App Shell Approved Execution Recovery v0.15

P0S-004 adds a read-only App recovery surface for approved apply and rollback
failures. It does not add a new execution path. The panel summarizes the latest
safe failure state, checkpoint status, rollback availability, event summary
status, and next action after the existing approved execution flow reports a
failure or partial result.

## Recovery States

- `idle`
- `apply_failed_no_write`
- `apply_partial_checkpoint_available`
- `apply_partial_checkpoint_missing`
- `rollback_available`
- `rollback_failed`
- `rollback_completed`
- `manual_recovery_required`
- `revalidate_required`

These states are App view-model states only. They do not retry apply, run
rollback, write files, write events, issue leases, or execute Git or shell.

## Summary Fields

The recovery report includes only safe summary fields:

- failure code
- affected path count
- checkpoint id when it is already a safe summary id
- checkpoint status
- rollback availability
- summary event status
- rollback guidance
- manual recovery guidance
- blocker and warning counts
- recovery hash
- next action

The report does not include raw prompt, raw response, raw source, raw diff, raw
patch, preimage content, checkpoint content, API keys, authorization headers,
tokens, stdout, stderr, or arbitrary command text.

## UX Boundary

The `Approved Execution Recovery` panel appears near the existing approved
execution controls. It provides:

- latest failure summary
- checkpoint status
- rollback guidance
- manual recovery guidance
- disabled unsafe buttons for retry, recovery rollback, and recovery event write

The only active button is `Preview Approved Recovery`, which updates React
state from existing App summaries. It does not invoke Tauri and it does not call
the approved apply or rollback commands.

## Fail-Closed Rules

The view model blocks the recovery preview when input contains raw, secret-like,
or execution fields such as `rawPrompt`, `rawResponse`, `rawSource`, `rawDiff`,
`preimageContent`, `apiKey`, `Authorization`, `token`, `shellCommand`,
`gitCommand`, `eventStoreWrite`, `applyNow`, `rollbackNow`,
`permissionLease`, `nativeBridge`, or `desktopAction`.

Conflict and stale snapshot states return `revalidate_required`; the user must
refresh workspace summaries, re-run validation/audit previews, and rebuild the
approval receipt before retrying through the existing approved gates.

## Non-Goals

- no new Tauri command
- no automatic retry
- no rollback from the recovery panel
- no file write from the recovery panel
- no EventStore write from the recovery panel
- no Git or shell execution
- no PermissionLease issuing
- no native bridge
- no desktop action
- no raw content display

## Related Work

- P0S-003 hardened approved execution conflict and rollback hash handling.
- P0S-004 exposes those failures as summary-only recovery guidance.
- Future P0S-005 hardens replay and audit timeline projection for the approved
  execution chain.
