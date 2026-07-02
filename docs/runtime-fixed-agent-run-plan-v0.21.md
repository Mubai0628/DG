# Runtime Fixed Agent Run Plan v0.21

The fixed agent run plan schema is a runtime data contract for P0Z. It creates summary-only plans for fixed multi-agent routes and handoff dossiers. It does not execute agents.

## Scope

- Defines fixed roles: `orchestrator`, `coder`, `reviewer`, and `verifier`.
- Defines fixed routes for `code_change`, `documentation`, `code_review`, and `verification`.
- Validates summary-only handoff dossiers.
- Blocks dynamic bidding, arbitrary agent ids, raw prompt/source/diff/API key fields, direct command fields, direct tool execution fields, apply/rollback fields, hidden context, and raw memory content.
- Produces deterministic plan ids and hashes.

## Non-Goals

- No runtime orchestrator state machine.
- No dynamic agent bidding.
- No arbitrary agent creation.
- No hidden raw prompt sharing.
- No direct file write.
- No direct Git/shell execution.
- No MCP tool execution.
- No plugin or skill runtime execution.
- No apply/rollback.
- No EventStore write.
- No App execution.
- No native bridge.
- No desktop action.

## Fixed Routes

- `code_change`: orchestrator -> coder -> reviewer -> verifier
- `documentation`: orchestrator -> coder -> reviewer
- `code_review`: orchestrator -> reviewer -> verifier
- `verification`: orchestrator -> verifier

The explicit `unknown` intent is treated as a clarification state. Unsupported intents are blocked.

## Summary-Only Handoff Dossiers

Each dossier contains role order, objective summary, evidence refs, capability plan refs, context refs, memory refs, warning codes, blocker codes, and hashes. It must not carry raw prompt, raw source, raw diff, raw model response, reasoning content, file contents, command output, API keys, Authorization headers, bearer tokens, secrets, or executable instructions.

## Readiness

The schema can mark a plan ready for future preview/orchestrator consumption, but every execution readiness flag remains false:

- no agent execution
- no capability invocation
- no file write
- no apply/rollback
- no EventStore write
- no Git/shell execution
- no MCP tool invocation
- no plugin/skill runtime execution
- no PermissionLease issuing
- no App execution

## Relation to P0Z

P0Z-002 only defines and validates the run-plan contract. P0Z-003 may add a state machine that consumes this summary-only plan, but it must still preserve the no-execution boundary.
