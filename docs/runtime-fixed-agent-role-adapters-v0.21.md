# Runtime Fixed Agent Role Adapters v0.21

The fixed agent role adapters convert existing summary refs into role-specific outputs for the fixed P0Z roles. They do not call models, execute tools, or perform workspace mutations.

## Fixed Role Outputs

- Orchestrator output: route summary refs, task decomposition summary refs, and expected artifact refs.
- Coder output: model proposal/import summary refs and patch proposal summary refs.
- Reviewer output: validation, audit, approval summary refs, and risk notes.
- Verifier output: Git/shell safe lane summary refs, evidence refs, and pass/warn/block summary.

## Validation Blocks

- Unknown roles.
- Dynamic bidding.
- Hidden raw context.
- Raw prompt, raw source, raw diff, raw response, file content, preimage content, or reasoning content fields.
- API key, Authorization, bearer token, password, or secret fields.
- Direct execution commands.
- Claims that a role applied a patch.
- Claims that a role called Git, shell, MCP, tools, plugin runtime, or skill runtime directly.
- Any App execution readiness flag set to true.

## Summary-Only Boundary

Role outputs contain refs, hashes, status strings, warning codes, risk-note summaries, evidence refs, and count summaries only. They must not include raw prompt/source/diff/API key content or raw command output.

## Readiness

An output may enter future capability planning, but every execution readiness flag remains false:

- no model call
- no tool execution
- no file write
- no apply/rollback
- no EventStore write
- no Git/shell execution
- no MCP tool call
- no plugin/skill runtime execution
- no PermissionLease issuing
- no App execution

## Relation to P0Z

P0Z-004 prepares fixed role output contracts for later Capability Broker planning. It does not add dynamic bidding, arbitrary agent creation, hidden raw prompt sharing, direct tool execution, native bridge, or desktop action.
