# App Approved Execution Flow v0.11

Status: implemented for DW-P0O-006.

This document describes the narrow App-side approved apply and rollback flow
for the v0.11 App-side Approved Execution MVP. It wires the P0O-004 apply
command and the P0O-005 rollback command into an App panel, then records
summary-only execution events for replay. It is not a generic command runner.

## Scope

The App can enable `Apply Approved Patch` only when all of these gates are
satisfied:

- A workspace root is present.
- An App approved execution receipt is ready.
- The receipt has exact typed confirmation.
- The proposal, validation, diff audit, and approval summaries are not blocked.
- Allowed relative paths are present and pass the safe path policy.
- Create and update operations have explicit user-provided content.
- Content stays under the receipt byte limit and does not contain raw or secret
  markers.

The App can enable `Rollback Approved Patch` only when:

- A prior approved apply result exists.
- The apply result includes checkpoint metadata.
- A rollback receipt is ready.
- The rollback receipt checkpoint matches the apply result checkpoint.
- The same path and summary guards remain satisfied.

## Summary Events

After successful apply or rollback, the App records one summary-only event in
the workspace event log:

- `user_workspace.patch_apply.app_executed`
- `user_workspace.patch_rollback.app_executed`

The event payload includes ids, checkpoint refs, operation/file counts, path
summaries, hashes, warning codes, and explicit safety booleans. It does not
include raw content, raw diff, raw source, raw prompt, raw response, API keys,
or checkpoint preimages.

Event Log / Replay counts approved apply and rollback events and shows the
latest approved execution summary. Replay remains a projection surface; it does
not re-execute apply or rollback.

## Boundaries

- No generic command UI.
- No Git or shell execution.
- No native bridge or desktop action.
- No production PermissionLease issuing.
- No EventStore writer beyond the local summary event log path.
- No raw content or preimage in App state summaries or replay projections.
- No model call, API key read, or network request.

## Relation to P0O

- P0O-003 defines the App approved execution receipt.
- P0O-004 provides the fixed approved apply command.
- P0O-005 provides the fixed approved rollback command.
- P0O-006 wires the App flow, summary event writer, and replay projection.
- P0O-007 is expected to harden the end-to-end smoke path.
