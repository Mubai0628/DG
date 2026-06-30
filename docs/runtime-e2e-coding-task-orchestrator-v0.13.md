# Runtime E2E Coding Task Orchestrator v0.13

## Scope

`runtime/src/e2e-task/e2e-task-orchestrator.ts` is a pure state machine model
for the P0R End-to-End Coding Task MVP. It consumes summary refs from existing
stages and projects the current task state, stage timeline, blocker/warning
counts, next action, deterministic hash, and readiness flags.

It does not execute the App flow. It does not call DeepSeek. It does not read
API keys. It does not fetch network. It does not apply patches. It does not
rollback. It does not write EventStore. It does not run Git or shell.

## States

- `empty`
- `objective_ready`
- `proposal_requested`
- `proposal_generated`
- `proposal_imported`
- `proposal_validated`
- `approval_ready`
- `approved`
- `applied`
- `verification_requested`
- `verification_passed`
- `verification_failed`
- `rollback_ready`
- `rolled_back`
- `completed`
- `blocked`

## Accepted Summary Refs

- live proposal generation summary
- model proposal import summary
- chain integration summary
- validation/audit/approval summary
- approval receipt summary
- apply result summary
- verification result summary
- rollback result summary
- replay summary

## Safety Rules

The orchestrator blocks:

- raw prompt
- raw response
- reasoning_content
- API key or Authorization fields
- raw source
- raw diff
- checkpoint preimage
- raw event payload content
- inputs that claim App can auto-apply
- inputs that claim arbitrary Git execution
- inputs that claim arbitrary shell execution
- any execution readiness flag set to true

## Output

The output is summary-only:

- task run ID
- current state
- completed stage count
- missing stage count
- blocker/warning counts
- next action
- stage timeline
- deterministic orchestrator hash
- readiness flags

All execution readiness flags are always false. `canAdvanceStateMachine` means
only that the pure state projection can continue; it never means App execution,
apply, rollback, Git, shell, network, API key read, or EventStore write is
enabled.

## Verification Failure

A verification failure summary moves the state to `rollback_ready` unless a
rollback summary is already present. A rollback summary moves the state to
`rolled_back`. Neither state runs rollback; they only describe the next
human-approved action.

## Relation to P0R

P0R-003 prepares the runtime state projection for later App surfaces. The
orchestrator does not perform the live proposal call, approval, apply,
verification, rollback, or replay write. Future App tasks may display this state
timeline but must keep existing human approval and typed confirmation gates.

## Non-Goals

- No App execution.
- No live DeepSeek call.
- No API key read.
- No fetch/network.
- No apply.
- No rollback.
- No EventStore write.
- No arbitrary Git/shell.
- No native bridge.
- No desktop action.
