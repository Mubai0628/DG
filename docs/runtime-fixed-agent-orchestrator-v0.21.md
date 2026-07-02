# Runtime Fixed Agent Orchestrator v0.21

The fixed agent orchestrator is a runtime state-machine helper for P0Z. It consumes a validated fixed agent run plan and summary refs, then reports the next expected state. It does not execute agents or tools.

## States

- `idle`
- `planned`
- `orchestrator_ready`
- `coder_ready`
- `reviewer_ready`
- `verifier_ready`
- `waiting_for_human_approval`
- `completed`
- `blocked`
- `failed`

## Inputs

The helper accepts a fixed run plan plus summary-only refs for model proposal, validation, diff audit, approval draft, verification, apply result, and rollback result. It records hashes, statuses, and counts only.

## Safety Boundaries

- No model call.
- No tool execution.
- No file write.
- No apply/rollback.
- No Git/shell execution.
- No MCP tool call.
- No plugin or skill runtime invocation.
- No EventStore write.
- No App execution.
- No native bridge.
- No desktop action.

## Validation

The orchestrator blocks invalid routes, unexpected role transitions, skipped reviewer for `code_change`, skipped verifier for `code_change`, raw prompt/source/diff/API key fields, dynamic bidding, direct command execution fields, apply/rollback execution requests, and App execution flags set to true.

## Human Approval Boundary

After the fixed route completes, the state is `waiting_for_human_approval` unless an already-existing external apply or rollback summary is supplied. The orchestrator itself never performs apply or rollback; it only reports the summary-only state.

## Relation to P0Z

P0Z-003 adds state tracking only. Future P0Z role adapters and App surfaces must consume the state-machine report without enabling dynamic bidding, arbitrary agent creation, hidden raw prompt sharing, direct tool execution, App execution, native bridge, or desktop action.
