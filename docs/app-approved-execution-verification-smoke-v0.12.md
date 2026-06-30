# App Approved Execution Verification Smoke v0.12

Status: Implemented for P0P-007.

P0P-007 adds a deterministic smoke flow proving that the v0.11 approved
apply/rollback path can coexist with the v0.12 Git and shell verification safe
lanes. The flow remains summary-only and does not introduce arbitrary command
execution.

## Smoke Flow

The smoke uses a safe docs-only patch:

```text
create docs/app-approved-execution-verification-smoke.md
```

The test flow is:

```text
approved receipt
-> apply approved docs patch
-> write apply summary event
-> run Git status summary lane
-> write Git verification summary event
-> run shell verification lane through an injected fake executor
-> write shell verification summary event
-> refresh/replay summary
-> rollback approved patch
-> write rollback summary event
-> replay confirms apply, verification, and rollback summaries
```

## What It Proves

- Approved apply works only with a ready receipt and bounded docs path.
- Apply summary events are written without raw content.
- Git read lane produces a summary-only verification result.
- Shell verification lane produces a summary-only result through a fixed
  template and fake test executor.
- Verification summary events appear in replay.
- Approved rollback restores the docs-only create operation.
- Rollback summary events are written without preimage content.
- Event Log safety scan remains clean.

## Safety Boundary

The smoke must not persist or display:

- raw source
- raw diff
- raw stdout
- raw stderr
- raw preimage
- raw prompt or response
- API key, env value, token, or Authorization header

The smoke does not run Git write commands through product code and does not
expose arbitrary shell. The shell lane uses the same fixed template path as the
App command, but the test executor is injected and deterministic.

## Non-Goals

- No generic Git runner.
- No arbitrary shell command.
- No install, network, or destructive shell template.
- No App-side approval/rejection execution beyond the existing approved
  apply/rollback flow.
- No PermissionLease issuing.
- No native bridge or desktop action.

## Relation To P0P

- P0P-003 supplies Git read lanes.
- P0P-004 supplies shell verification lanes.
- P0P-005 writes summary-only verification events.
- P0P-006 projects those events into replay/evidence surfaces.
- P0P-007 proves the approved execution and verification summaries can be
  replayed together without raw output.
