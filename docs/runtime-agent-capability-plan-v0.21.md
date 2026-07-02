# Runtime Agent Capability Plan v0.21

The agent capability plan maps fixed agent role outputs to Capability Broker planning refs. It does not invoke capabilities.

## Scope

- Accepts a fixed agent run plan.
- Accepts a fixed agent role output.
- Maps the role to allowed capability descriptor refs.
- Produces summary-only allowed refs, blocked refs, risk levels, approval requirements, and disabled reasons.

## Role Boundaries

Orchestrator may plan context, routing, and evidence capabilities.

Coder may plan model proposal and patch proposal preview capabilities. Coder may not apply patches.

Reviewer may plan validation, diff audit, and approval draft capabilities. Reviewer may not approve execution.

Verifier may plan Git read lanes and shell verification safe lanes. Verifier may not run arbitrary commands.

## Blocked Capabilities

- mutating MCP tools
- arbitrary plugin or skill runtime
- desktop action
- native bridge
- Git write
- arbitrary shell command
- direct apply/rollback
- PermissionLease issuing
- dynamic capability escalation

## Summary-Only Output

The plan contains capability ids, risk levels, source types, categories, invoke policies, execution modes, approval requirements, disabled reasons, warning codes, hashes, and counts. It must not include raw prompt/source/diff/API key material or raw tool output.

## Readiness

The plan may enter Capability Broker preview, but every invocation/execution flag remains false:

- no capability invocation
- no MCP tool call
- no plugin/skill runtime execution
- no Git/shell execution
- no file write
- no apply/rollback
- no EventStore write
- no PermissionLease issuing
- no App execution

## Relation to P0Z

P0Z-005 connects fixed agent role outputs to capability planning without expanding execution. Later App surfaces can display this plan as a controlled preview only.
