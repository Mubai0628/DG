# App Shell Verification Summary Events v0.12

Status: Implemented for P0P-005.

P0P-005 connects the fixed Git read lanes from P0P-003 and fixed shell
verification lanes from P0P-004 to summary-only EventStore records. The App
Shell records lane metadata after a lane finishes, refreshes the Event Log, and
shows a Verification Summary panel without exposing raw command output.

## Event Types

The App records these summary-only event types:

- `git.read_lane.executed`
- `shell.verification_lane.executed`

The verification surface also projects these records through Event Log, Replay,
and Control Projection summaries. The events are evidence-style summaries only;
they are not an execution approval and do not enable apply or rollback.

## Payload Boundary

Verification events may contain:

- lane or template id
- workspace root reference
- command hash
- result hash
- duration in milliseconds
- shell exit code when available
- Git changed, added, and deleted counts
- shell stdout/stderr byte counts
- warning codes
- truncation flag
- `summaryOnly: true`

Verification events must not contain:

- raw stdout
- raw stderr
- raw diff
- raw source
- raw prompt
- raw response
- raw DOM or raw CSV
- API keys, env values, tokens, or Authorization headers
- file preimages, file contents, or workspace dumps

The Event Log safety scan treats raw-output markers as blockers. If a preview
contains raw output or secret-like fields, `record_verification_lane_event`
fails closed instead of writing an event.

## App Surface

The App Shell adds a read-only Verification Summary section near the Git and
shell lane controls. It shows:

- latest Git lane event id
- latest shell verification event id
- verification event count from Event Log / Replay
- latest verification summary
- safety scan state
- raw-output presence as a negative flag

The panel does not display raw stdout, stderr, diffs, source, prompts, or API
keys. The buttons remain the controlled Git read lane and fixed shell
verification lane buttons only.

## Replay And Control Projection

Event Log / Replay can show the verification timeline using the summary string
for each event. Control Projection can reference the latest verification summary
and count verification events, but it still cannot execute commands, approve
patches, write files, or write apply/rollback events.

## Non-Goals

- No arbitrary shell.
- No Git write commands.
- No install, network, destructive, or user-defined command templates.
- No App-side apply or rollback enablement.
- No App approval/rejection execution.
- No PermissionLease issuing.
- No native bridge or desktop action.

## Relation To P0P

- P0P-003 added fixed read-only Git lanes and event previews.
- P0P-004 added fixed shell verification lanes and event previews.
- P0P-005 records those previews as summary-only events.
- P0P-006 can deepen replay/control/evidence projection without adding raw
  output or execution authority.
