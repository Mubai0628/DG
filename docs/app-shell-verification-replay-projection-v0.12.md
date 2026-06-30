# App Shell Verification Replay Projection v0.12

Status: Implemented for P0P-006.

P0P-006 projects Git and shell verification summary events into App replay,
audit, control, and context evidence surfaces. It does not add new commands and
does not expand execution authority.

## Projection Inputs

The projection consumes only `WorkspaceEventSummary` data that is already
summary-only:

- `git.read_lane.executed`
- `shell.verification_lane.executed`
- verification event counts
- safe timeline summaries
- warning codes
- safety scan status

It does not consume raw stdout, raw stderr, raw diff, raw source, raw prompt,
raw response, workspace dumps, env values, or API keys.

## Projected Fields

The App projection derives:

- latest verification status
- Git changed file count from safe summary text
- shell pass/fail status from safe exit-code summary
- last verification timestamp
- warning counts
- evidence refs with hash prefixes
- projection hash

The projection output is summary-only and has all execution readiness flags set
to false.

## Surface Integration

The App Shell shows a Verification Replay Projection panel near the Git and
shell lane controls. It also feeds:

- Control Plane Projection with the latest verification summary.
- Audit Surface with verification event and evidence-ref counts.
- Context Assembly Preview as `volatile_tail` evidence refs.
- Event Log / Replay as safe timeline items.

These surfaces are read-only. They do not run Git, run shell commands, approve,
apply, rollback, write files, or write additional events.

## Safety

The projection fails closed if summary inputs contain raw-output or secret
markers. Raw-output names such as stdout/stderr/diff/source are allowed only as
negative UI copy and boundary documentation, not as persisted event payload
values.

## Non-Goals

- No arbitrary shell.
- No Git write commands.
- No new Tauri command.
- No new EventStore writer.
- No App-side apply or rollback enablement.
- No App approval/rejection execution.
- No PermissionLease issuing.
- No native bridge or desktop action.

## Relation To P0P

- P0P-003 added fixed read-only Git lanes.
- P0P-004 added fixed shell verification lanes.
- P0P-005 records lane results as summary-only events.
- P0P-006 projects those summaries into replay/control/evidence surfaces.
- P0P-007 can use this projection in an end-to-end smoke without adding raw
  output or general execution.
