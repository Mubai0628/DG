# Runtime Live Proposal Validation Integration v0.8

Status: implemented as a summary-only integration helper for P0M-005.

The runtime live proposal validation integration helper consumes an already
returned P0M-004 live adapter result object. It checks the adapter status,
request refs, key redaction summary, dropped reasoning summary, repair summary,
schema validation summary, proposal summary, and execution-disabled readiness
flags.

## Boundary

- Integration helper only.
- No live call.
- No API key read.
- No fetch/network.
- No App call.
- No API key resolver call.
- No transport call.
- No file write.
- No apply or rollback.
- No EventStore write.
- No Git/shell.
- No native bridge.
- No desktop action.

The helper does not persist raw response data, raw prompt, raw source, raw diff,
raw proposal content, API keys, or `reasoning_content`.

## Gates

The integration report includes summary gates:

- live adapter status
- request boundary
- API key redaction
- reasoning content dropped
- repair result
- schema validation
- proposal summary
- execution disabled
- EventStore disabled
- App execution disabled

Blocked live adapter results, blocked schema validation, blocked repair
summaries, raw response fields, `reasoningContent` fields, secret markers, raw
usage fields, request/model mismatches, or execution readiness flags fail
closed.

Warnings cover dry-run or warning live adapter status, live network usage,
dropped reasoning content, missing usage summary, repair warnings, schema
warnings, content draft summaries, and the fact that live output remains
proposal-only.

## Output

`buildLiveProposalValidationIntegration()` returns:

- integration id
- generation/request/proposal/model refs
- gate statuses
- safe usage numbers
- dropped reasoning boolean and length summary
- repair summary
- validation summary
- proposal summary
- blocker/warning/finding counts
- integration hash
- readiness flags

All execution readiness flags remain false:

- `canApplyPatch: false`
- `canRollback: false`
- `canWriteFilesystem: false`
- `canWriteEventStore: false`
- `canExecuteGit: false`
- `canExecuteShell: false`
- `canIssuePermissionLease: false`
- `appCanExecute: false`

`canEnterPatchProposalPreview` means only that the summary can enter the
existing preview chain. It does not enable apply, rollback, EventStore write,
Git, shell, or App execution.

## Relation to P0M and P0L

- P0M-004 produces the live adapter result consumed by this helper.
- P0L-005 provides the repair summary contract.
- P0L-002 provides the schema validation summary contract.
- Future P0M-006 may add an App Live Proposal Preview Gate, still disabled by
  default.

## Non-goals

- No live DeepSeek call.
- No API key read.
- No fetch/network.
- No App execution.
- No Git/shell.
- No native bridge.
- No desktop action.
