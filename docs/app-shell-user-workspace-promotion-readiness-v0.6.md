# App Shell User Workspace Promotion Readiness v0.6

The App Shell exposes a read-only User Workspace Promotion Readiness panel for
P0K. It calls the pure runtime readiness helper with summary-only view models
and displays the gate result. It does not execute promotion.

The panel does not read files, write files, create backups, capture preimage
content, apply patches, rollback changes, call Tauri, write EventStore events,
invoke Git or shell, call DeepSeek, issue a PermissionLease, or enable native
bridge or desktop action.

## Panel

The panel title is:

`User Workspace Promotion Readiness`

The badge is:

`Readiness only / no write`

The panel copy states that it checks whether sandbox apply/rollback summaries
and user workspace metadata are sufficient for a future promotion gate, and
that no files are read or written.

The button is:

`Preview Promotion Readiness`

The button only updates React state. It does not call Tauri, write EventStore,
read files, write files, apply patches, execute rollback, or start a run.

## Displayed Summary

The panel shows:

- status
- readiness id and chain id
- gate counts
- artifact counts
- blocker, warning, and finding counts
- readiness flags
- readiness hash
- gate summaries
- finding summaries
- next action

All execution flags remain visibly disabled.

## Integrations

- Context Assembly Preview places the promotion readiness ref in
  `no_compress_zone`.
- Audit Surface can display summary-only readiness finding counts.
- Capability Plan Preview may use the readiness ref as display-only evidence.
- Control Projection may show a summary only.

These integrations do not create a run, do not assemble a real prompt, do not
invoke a capability, do not issue a permission lease, and do not write events.

## Non-goals

- No user workspace read/write
- No backup file creation
- No preimage capture
- No user workspace apply
- No user workspace rollback
- No EventStore write
- No Tauri command
- No Git or shell execution
- No DeepSeek call
- No native bridge
- No desktop action

## Future Path

This panel prepares for the future P0K-004 User Workspace Apply Prototype,
which remains disabled by default. A ready checker result is not an enabled
apply path; it only confirms that the summary chain can proceed to later design
and runtime prototype work.
