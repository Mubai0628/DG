# App Shell E2E Task Failure Recovery v0.13

The E2E Task Recovery surface is an App Shell summary panel for P0R-006. It
classifies common end-to-end coding task failures and shows the next safe
action without adding any execution path.

## Covered Failure Categories

- live proposal blocked
- schema or repair failed
- validation blocked
- approval missing
- typed confirmation mismatch
- stale snapshot
- apply conflict
- verification failure
- rollback failure
- EventStore write failure
- Convert FILE_EXISTS
- raw content blocked

## Display Contract

The panel shows:

- failure category
- safe summary
- recommended action
- retry allowed
- rollback available
- blocker and warning counts
- recovery hash

All recovery output is summary-only. It must not show raw prompt, raw response,
raw source, raw diff, checkpoint preimage, backup content, API key,
Authorization header, token-like value, raw stdout, or raw stderr.

## Recovery Boundaries

Retry means the user may manually return to the existing gated surface after
fixing inputs. It does not mean auto-retry execution is enabled.

Rollback available means the existing approved rollback flow has enough summary
state to be prepared. It does not create a new rollback command.

Verification failure recommends rollback only when the existing checkpoint and
rollback approval gates allow it.

Convert FILE_EXISTS remains safe: choose a new CSV filename or remove the
existing draft file before running Convert again.

## Non-Goals

- No auto-retry execution.
- No auto-apply.
- No new apply command.
- No new rollback command.
- No arbitrary Git.
- No arbitrary shell.
- No Git write.
- No raw event payload.
- No broad PermissionLease.
- No native bridge.
- No desktop action.

## Relation to P0R-005

P0R-005 sequences existing approved apply, fixed verification lanes, and
approved rollback. P0R-006 adds recovery guidance for blocked or failed states
around that sequence. It does not bypass approval, typed confirmation,
checkpoint, summary event, or replay boundaries.
