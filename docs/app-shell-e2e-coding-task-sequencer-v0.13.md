# App Shell E2E Coding Task Sequencer v0.13

The End-to-End Apply / Verify / Rollback Sequencer is an App Shell summary
surface for P0R-005. It sequences only existing safe capabilities:

- approved apply from v0.11
- Git read and shell verification lanes from v0.12
- approved rollback from v0.11
- live proposal import and chain preview from v0.13

It does not create a new arbitrary execution path.

## Sequencer Stages

- proposal_ready
- approval_required
- apply_ready
- apply_executed
- verification_ready
- verification_passed
- verification_failed
- rollback_ready
- rollback_executed
- done

## Apply Rule

Apply is available only when the existing approved execution flow says
`canApplyApprovedPatch` is true. That requires:

- imported proposal summary
- validation and audit summaries without blockers
- human approval receipt
- exact typed confirmation
- safe allowed relative paths
- existing approved apply command availability

The sequencer never auto-applies. The button only reuses the existing fixed
approved apply handler.

## Verification Rule

Verification is available only after approved apply succeeds. The sequencer
uses fixed Git read and shell verification lanes only.

There is no arbitrary shell command input, no Git write lane, no install or
network command, and no raw stdout/stderr event payload.

## Rollback Rule

Rollback is available only when:

- approved apply succeeded
- checkpoint metadata exists
- rollback receipt is valid
- exact rollback typed confirmation is present
- verification failed or the user explicitly requested rollback

The sequencer only reuses the existing approved rollback handler.

## Event Boundary

The sequencer relies on existing summary event write paths:

- approved apply summary event
- approved rollback summary event
- Git read lane summary event
- shell verification lane summary event

No raw prompt, raw response, raw source, raw diff, checkpoint preimage, raw
stdout, raw stderr, API key, Authorization header, or token-like value may be
stored in the sequencer summary.

## Non-Goals

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

## Current Limitations

The sequencer is a guided App Shell surface over existing gates. It does not
replace the dedicated approved execution, verification lane, rollback, event
log, or replay surfaces. Future P0R work adds conflict/stale snapshot recovery
UX and E2E regression coverage around these same gates.
