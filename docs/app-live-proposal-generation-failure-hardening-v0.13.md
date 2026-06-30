# App Live Proposal Generation Failure Hardening v0.13

P0Q-007 hardens the App live proposal generation UX around failure states and redaction. It does not add a new capability. The App Shell still cannot apply patches, rollback, approve, reject, issue leases, execute Git or shell, write EventStore entries directly from model output, or run a native bridge or desktop action.

## Scope

- App copy and state cleanup for live proposal generation.
- Safe summary-only failure reporting.
- Redaction checks for command failures, malformed responses, unsafe proposals, and event write failures.
- Manual QA preparation for the v0.13 RC.

## Failure States

The App treats these states as safe blockers or warnings:

- missing live proposal opt-in policy
- missing live proposal session receipt
- wrong typed confirmation
- command failure
- network timeout summary
- malformed response
- unsafe path
- secret marker
- reasoning_content dropped
- repair failed
- schema blocked
- event write failure

Every failure must be rendered as a safe summary. The App must not display raw prompt, raw response, raw source, raw diff, reasoning_content, API key values, Authorization headers, token values, or command text.

## Redaction Boundary

Live proposal generation surfaces only retain ids, hashes, status strings, warning codes, counts, safe messages, numeric usage summaries, and dropped-reasoning booleans. Event previews may show no-raw guard flags before writing, but persisted replay summaries remain summary-only.

## No Auto-Apply

Failure hardening does not make generated proposals executable. A generated proposal can only enter the model proposal import preview and chain projection. Apply, rollback, approval execution, EventStore writing, Git, shell, PermissionLease issuing, native bridge, and desktop action remain disabled from the App live proposal path.

## Manual QA Notes

- Trigger missing policy, missing receipt, and wrong confirmation states before generation.
- Confirm command failure and timeout messages are safe summaries.
- Confirm malformed, unsafe path, secret marker, repair failed, and schema blocked candidates do not enter apply.
- Confirm reasoning_content is shown only as dropped plus a length/count summary.
- Confirm event write failure does not lose the generated proposal preview and does not write raw output.
- Confirm Clear Live Proposal Result removes generated import and chain previews.

## Non-Goals

- No new runtime capability.
- No new live adapter behavior.
- No App-side apply or rollback.
- No App-side approval or rejection execution.
- No EventStore writer expansion.
- No Git or shell execution.
- No native bridge.
- No desktop action.
