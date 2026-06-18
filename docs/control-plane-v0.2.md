# Control Plane v0.2

Status: skeleton only. P0F-009 defines task/run lifecycle, state projection,
summary events, and an in-memory run registry. It does not execute agents,
tools, patches, Git commands, shell commands, MCP, plugins, skills, desktop
actions, native bridge transport, or live model calls.

## Purpose

The Control Plane provides a single state model for future App Shell workspaces:

- Chat
- Approval
- Diff
- Audit
- Memory

It describes the workflow:

1. user intent
2. task created
3. context assembled
4. route planned
5. capability planned
6. approval pending, approved, or rejected
7. execution planned or simulated
8. result summarized

The Control Plane is not an executor. It projects state from events and stores
in-memory task/run summaries for tests and future UI adapters.

## Task and Run Lifecycle

Run statuses:

- `created`
- `planned`
- `needs_clarification`
- `awaiting_approval`
- `approved`
- `rejected`
- `running`
- `completed`
- `failed`
- `cancelled`

Run phases:

- `intake`
- `context`
- `routing`
- `capability_planning`
- `approval`
- `execution_plan`
- `simulation`
- `result`
- `audit`

Allowed transitions are intentionally narrow. Completed, failed, rejected, and
cancelled runs are terminal.

## Event Projection

`projectControlPlaneStateFromEvents` can read new control events and existing
summary event families, including:

- task lifecycle events
- context assembly events
- agent routing events
- capability planning events
- patch audit events
- Git Safe Lanes summary events
- Shell Allowlist summary events
- memory events
- v0.1 draft/tool events

The projector tolerates missing optional event families. Duplicate event ids are
skipped with a safe warning.

## Summary-Only Policy

Control-plane event payloads may contain ids, statuses, phases, role names,
capability ids, memory ids, patch proposal ids, Git/Shell summary ids, hashes,
warning codes, error codes, token estimates, and timestamps.

They must not contain raw prompts, raw source code, raw DOM, raw CSV, raw
BrowserDomPayload, screenshots, clipboard data, API keys, authorization
headers, env values, full URL queries, raw stdout/stderr, or full memory
content.

## Plane Integrations

- Model Plane: model profile ids remain references.
- Context Plane: context report ids and hashes remain references.
- Capability Plane: invocation plans become capability refs.
- Agent Plane: static routes become route refs.
- Memory Plane: recall/commit events become memory refs.
- Patch Plane: audit reports become patch refs.
- Git Safe Lanes: parsed summaries become Git refs.
- Shell Allowlist: fixture summaries become Shell refs.

## v0.1 Compatibility

`webTableToCsvReplayToControlProjection` projects existing v0.1 event logs into
a control-plane summary without changing the web-table-to-CSV flow. Draft counts
and completed task status are derived from existing events.

## Non-Goals

- no real agent execution
- no dynamic agent bidding
- no live DeepSeek call
- no capability execution
- no patch apply
- no Git execution
- no shell execution
- no MCP/plugin/skills runtime
- no desktop action
- no native bridge
