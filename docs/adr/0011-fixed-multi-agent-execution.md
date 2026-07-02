# ADR 0011: Fixed Multi-Agent Execution

## Status

Proposed / Accepted for P0Z design gate.

## Context

P0Y completed the plugin and skill sandbox MVP with governance, read-only metadata surfaces, and explicit limits around arbitrary execution. The next stage is a fixed multi-agent execution MVP for coding tasks, but it must not reintroduce dynamic agent behavior, hidden prompt sharing, or direct tool execution by agents.

The system already has preview and approval chains for patch proposals, diff audit, validation, apply/rollback prototypes, Git/shell safe lanes, MCP read-only flows, and plugin/skill governance. P0Z must route agent work into those existing gates instead of bypassing them.

## Decision

Fixed multi-agent execution will use only these roles:

- `orchestrator`
- `coder`
- `reviewer`
- `verifier`

Fixed multi-agent execution will use only these routes:

- `code_change`: orchestrator -> coder -> reviewer -> verifier
- `documentation`: orchestrator -> coder -> reviewer
- `code_review`: orchestrator -> reviewer -> verifier
- `verification`: orchestrator -> verifier

Dynamic bidding is not allowed. Arbitrary agent creation is not allowed. Hidden raw prompt sharing is not allowed.

Every handoff is a summary-only dossier. A dossier may contain objective summaries, scoped evidence refs, capability plan refs, validation refs, warning codes, hashes, and next-action summaries. It must not contain raw prompt, raw source, raw diff, preimage content, command output, API keys, Authorization headers, bearer tokens, raw model responses, or reasoning content.

Agents can only request capabilities through the Capability Broker. Agents cannot directly execute file writes, Git/shell commands, MCP tools, plugin runtime, skill runtime, native bridge calls, desktop actions, apply, or rollback. Apply and rollback still require the existing human approval and typed confirmation gates.

Agent events must be summary-only and replayable. Event projections must be sufficient to audit role, route, dossier refs, finding counts, readiness flags, and handoff order without persisting raw private content.

## Non-Goals

- No dynamic agent bidding.
- No arbitrary agent creation.
- No hidden raw prompt sharing.
- No direct agent file writes.
- No direct Git/shell execution by agents.
- No direct MCP tool invocation by agents.
- No plugin or skill runtime execution by agents.
- No native bridge.
- No desktop action.
- No broad PermissionLease issuing.
- No App-side apply/rollback enablement.
- No bypass of existing approval, diff, validation, rollback, replay, or safe-lane gates.

## Required Gates Before Implementation

- Role safety tests prove only fixed roles are accepted.
- Route safety tests prove only fixed routes are accepted for each intent.
- Dossier safety tests prove handoffs are summary-only and raw fields are blocked.
- Evidence ref tests prove stale or missing refs produce warnings or blockers.
- Capability safety tests prove agents can only request broker-gated capabilities.
- Approval safety tests prove agents cannot approve, reject, issue PermissionLease, apply, or rollback.
- Event/replay tests prove summary-only agent events can be replayed deterministically.
- Boundary checks prove no App live execution path, no native bridge, no desktop action, no arbitrary Git/shell, and no plugin/skill runtime execution were added.

## Consequences

This decision makes the first multi-agent path less flexible than a marketplace or bidding model, but it keeps the execution story auditable. The system gains a deterministic route graph and replayable handoff dossiers while preserving the existing patch proposal, approval, apply/rollback, and safe-lane boundaries.
