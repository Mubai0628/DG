# Runtime Cross-surface Workflow Planner v0.27

The P1F workflow planner builds a deterministic, summary-only plan from a
validated cross-surface workflow scenario. It is a state-machine preview. It
does not execute any surface.

## Scope

- Consume the P1F-002 cross-surface workflow scenario result.
- Build a fixed step order:
  - objective
  - proposal generation
  - agent route
  - knowledge recall
  - MCP evidence
  - plugin / skill metadata
  - desktop observer
  - desktop proposal
  - optional desktop action approval
  - workspace apply approval
  - verification
  - rollback optional
  - replay audit
- Derive a deterministic plan hash and state hash.
- Warn on missing evidence or later-stage refs.
- Block raw fields, dynamic bidding, and execution claims.

## Non-goals

- No DeepSeek call.
- No MCP call.
- No desktop command.
- No apply or rollback.
- No Git or shell execution.
- No EventStore write.
- No agent execution.
- No raw file read.
- No plugin or skill runtime execution.
- No native bridge or desktop action expansion.

## State Machine

`buildCrossSurfaceWorkflowPlan()` returns the fixed step timeline and the
current state. `advanceCrossSurfaceWorkflowState()` projects the state from the
same summary-only plan. Missing stages create warnings unless a stage claims
execution or a scenario is blocked.

`summarizeCrossSurfaceWorkflowPlan()` returns only ids, counts, status, hashes,
readiness flags, and next action.

## Safety

All execution readiness flags remain false. A plan being ready means it can
enter a preview surface, not that App execution, agent execution, MCP
invocation, desktop action execution, apply, rollback, Git, shell, EventStore
write, PermissionLease issuance, or native bridge behavior is available.

Raw prompt, raw response, reasoning content, raw source, raw diff, raw
screenshot, raw OCR, API key markers, dynamic bidding fields, arbitrary tool
fields, and execution fields are blocked and are not echoed in output.

## Relation to P1F

P1F-003 feeds P1F-004 App Cross-surface Workflow Composer / Preview Surface. It
reuses the P1F-002 scenario schema and keeps all behavior summary-only.
